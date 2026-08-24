'use strict';

/**
 * In-memory session store for image generation jobs.
 * Shape of a session:
 * {
 *   sessionId: string,
 *   videoId: string,
 *   status: 'running' | 'completed' | 'failed',
 *   progress: number (0-100),
 *   completed: number,
 *   total: number,
 *   images: Array<{ scene: number, imagePath: string }>,
 *   error: string | null,
 *   createdAt: Date,
 *   updatedAt: Date
 * }
 *
 * Can be swapped for Redis later by replacing this module.
 */

const store = new Map();

/**
 * Create a new session.
 * @param {string} sessionId
 * @param {string} videoId
 * @param {number} total - total number of scenes
 * @returns {object} session state
 */
function createSession(sessionId, videoId, total) {
  const session = {
    sessionId,
    videoId,
    status: 'running',
    progress: 0,
    completed: 0,
    total,
    images: [],
    error: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  store.set(sessionId, session);
  return session;
}

/**
 * Get session by ID.
 * @param {string} sessionId
 * @returns {object|null}
 */
function getSession(sessionId) {
  return store.get(sessionId) || null;
}

/**
 * Record a successfully generated image for a scene.
 * @param {string} sessionId
 * @param {{ scene: number, imagePath: string }} imageResult
 */
function addImage(sessionId, imageResult) {
  const session = store.get(sessionId);
  if (!session) return;

  session.images.push(imageResult);
  session.completed += 1;
  session.progress = Math.round((session.completed / session.total) * 100);
  session.updatedAt = new Date();

  // Auto-complete when all done
  if (session.completed >= session.total) {
    session.status = 'completed';
    session.progress = 100;
  }
}

/**
 * Mark session as failed.
 * @param {string} sessionId
 * @param {string} errorMessage
 */
function failSession(sessionId, errorMessage) {
  const session = store.get(sessionId);
  if (!session) return;
  session.status = 'failed';
  session.error = errorMessage;
  session.updatedAt = new Date();
}

/**
 * Mark session as completed manually.
 * @param {string} sessionId
 */
function completeSession(sessionId) {
  const session = store.get(sessionId);
  if (!session) return;
  session.status = 'completed';
  session.progress = 100;
  session.updatedAt = new Date();
}

/**
 * Remove old sessions to prevent memory leaks (TTL: 2 hours).
 */
function cleanupOldSessions() {
  const TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
  const now = Date.now();
  for (const [id, session] of store.entries()) {
    if (now - session.createdAt.getTime() > TTL_MS) {
      store.delete(id);
    }
  }
}

// Run cleanup every 30 minutes
setInterval(cleanupOldSessions, 30 * 60 * 1000);

module.exports = { createSession, getSession, addImage, failSession, completeSession };
