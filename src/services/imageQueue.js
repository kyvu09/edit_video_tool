'use strict';

const imageService = require('./imageService');
const sessionManager = require('./sessionManager');

const DEFAULT_CONCURRENCY = 3;

/**
 * Promise Pool — runs tasks with bounded concurrency.
 *
 * @param {Array<() => Promise<any>>} tasks  - Array of async task factories
 * @param {number} concurrency               - Max simultaneous tasks
 * @returns {Promise<void>} Resolves when all tasks finish (settled, not rejected)
 */
async function promisePool(tasks, concurrency) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const taskIndex = index++;
      try {
        results[taskIndex] = await tasks[taskIndex]();
      } catch (err) {
        results[taskIndex] = { error: err };
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Process all scenes in parallel (bounded by concurrency).
 * Updates the session via sessionManager as each scene completes.
 *
 * @param {string} sessionId
 * @param {string} videoId
 * @param {Array<{ scene: number, prompt: string }>} scenes
 * @param {number} [concurrency=3]
 */
async function processScenes(sessionId, videoId, scenes, concurrency = DEFAULT_CONCURRENCY) {
  const tasks = scenes.map((sceneItem) => async () => {
    try {
      const result = await imageService.generateSceneImage(videoId, sceneItem);
      sessionManager.addImage(sessionId, result);
      console.log(`[ImageQueue] Session ${sessionId}: scene ${sceneItem.scene} done → ${result.imagePath}`);
      return result;
    } catch (err) {
      console.error(`[ImageQueue] Session ${sessionId}: scene ${sceneItem.scene} FAILED:`, err.message);
      // Record partial failure but don't abort the whole pool
      sessionManager.addImage(sessionId, {
        scene: sceneItem.scene,
        imagePath: null,
        error: err.message,
      });
    }
  });

  try {
    await promisePool(tasks, concurrency);
    // If any scene didn't record an error, session is complete
    const session = sessionManager.getSession(sessionId);
    if (session && session.status !== 'failed') {
      sessionManager.completeSession(sessionId);
    }
  } catch (fatalErr) {
    console.error(`[ImageQueue] Session ${sessionId}: fatal error`, fatalErr.message);
    sessionManager.failSession(sessionId, fatalErr.message);
  }
}

module.exports = { processScenes };
