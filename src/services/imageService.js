'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const geminiImageProvider = require('../providers/google/geminiImageProvider');

const ASSETS_DIR = path.resolve(__dirname, '..', '..', 'assets');
const CACHE_DIR = path.resolve(__dirname, '..', '..', 'cache');

// Ensure base directories exist
[ASSETS_DIR, CACHE_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/**
 * Compute SHA-256 hash of a string (used for cache keys).
 * @param {string} text
 * @returns {string} hex digest
 */
function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Extension from MIME type.
 * @param {string} mimeType
 * @returns {string}
 */
function extFromMime(mimeType) {
  const map = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
  };
  return map[mimeType] || '.png';
}

/**
 * Zero-pad scene number: 1 → "01", 12 → "12"
 * @param {number} n
 * @returns {string}
 */
function padScene(n) {
  return String(n).padStart(2, '0');
}

/**
 * Generate an image for a single scene with caching.
 *
 * @param {string} videoId
 * @param {{ scene: number, prompt: string }} sceneItem
 * @returns {Promise<{ scene: number, imagePath: string }>}
 *   imagePath is the public URL path, e.g. "/assets/abc123/scene01.png"
 */
async function generateSceneImage(videoId, sceneItem) {
  const { scene, prompt } = sceneItem;
  const cacheKey = sha256(prompt);

  // Ensure per-video assets directory exists
  const videoAssetsDir = path.join(ASSETS_DIR, videoId);
  if (!fs.existsSync(videoAssetsDir)) {
    fs.mkdirSync(videoAssetsDir, { recursive: true });
  }

  const sceneFilename = `scene${padScene(scene)}.png`;
  const sceneFilePath = path.join(videoAssetsDir, sceneFilename);
  const publicImagePath = `/assets/${videoId}/${sceneFilename}`;

  // ── Cache hit ────────────────────────────────────────────────
  const cachedPath = path.join(CACHE_DIR, `${cacheKey}.png`);
  if (fs.existsSync(cachedPath)) {
    console.log(`[ImageService] Cache hit for scene ${scene} (${cacheKey.slice(0, 8)}...)`);
    fs.copyFileSync(cachedPath, sceneFilePath);
    return { scene, imagePath: publicImagePath };
  }

  // ── Generate via Gemini ──────────────────────────────────────
  console.log(`[ImageService] Generating scene ${scene} via Gemini Image API...`);
  const { imageBuffer, mimeType } = await geminiImageProvider.generateImage(prompt);

  // Resolve extension (cache always stored as .png for simplicity)
  const ext = extFromMime(mimeType);
  const finalSceneFilename = `scene${padScene(scene)}${ext}`;
  const finalSceneFilePath = path.join(videoAssetsDir, finalSceneFilename);
  const finalPublicPath = `/assets/${videoId}/${finalSceneFilename}`;

  // Save to disk
  fs.writeFileSync(finalSceneFilePath, imageBuffer);
  console.log(`[ImageService] Saved scene ${scene} → ${finalSceneFilePath}`);

  // Save to cache (PNG regardless of original mime for consistency)
  fs.writeFileSync(cachedPath, imageBuffer);

  return { scene, imagePath: finalPublicPath };
}

module.exports = { generateSceneImage };
