'use strict';

const { GoogleGenAI } = require('@google/genai');

// Retry delays in ms: 1s, 2s, 4s — only for transient errors (500, 503)
const RETRY_DELAYS = [1000, 2000, 4000];

// 429 with "limit: 0" = quota exhausted (billing required), NOT transient → don't retry
// 429 with "retryDelay" = rate limited → DO retry
const TRANSIENT_STATUS = new Set([500, 503]);

/**
 * Sleep helper
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse a friendly error message from Gemini API errors.
 * @param {Error} err
 * @returns {string}
 */
function friendlyError(err) {
  const msg = err.message || '';

  // Quota exhausted (billing required)
  if (msg.includes('RESOURCE_EXHAUSTED') || (err.status === 429 && msg.includes('limit: 0'))) {
    return `Quota hết – model image generation yêu cầu bật billing trên Google Cloud. Truy cập: https://console.cloud.google.com/billing`;
  }

  // Rate limited (temporary)
  if (err.status === 429) {
    const retryMatch = msg.match(/retry in ([\d.]+)s/i);
    const wait = retryMatch ? ` (thử lại sau ${Math.ceil(parseFloat(retryMatch[1]))}s)` : '';
    return `Gọi API quá nhanh (rate limit)${wait}. Vui lòng thử lại.`;
  }

  if (err.status === 404) {
    return `Model không tồn tại hoặc chưa được hỗ trợ. Kiểm tra lại GEMINI_IMAGE_MODEL trong .env.`;
  }

  if (err.status === 400) {
    return `Prompt bị từ chối (có thể vi phạm chính sách nội dung).`;
  }

  if (err.status === 403) {
    return `API key không có quyền dùng model này. Kiểm tra lại GEMINI_API_KEY.`;
  }

  return msg.length > 200 ? msg.slice(0, 200) + '...' : msg;
}

/**
 * Generate a single image from a text prompt using Gemini Image model.
 *
 * Model can be overridden via:
 *   - options.model parameter
 *   - GEMINI_IMAGE_MODEL env variable
 *   - Fallback: gemini-3.1-flash-lite-image
 *
 * @param {string} prompt  - The image generation prompt
 * @param {object} options - Optional overrides
 * @param {string} options.model - Gemini model name
 * @returns {Promise<{ imageBuffer: Buffer, mimeType: string, text: string }>}
 */
async function generateImage(prompt, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY is not defined in .env file.');
  }

  const ai = new GoogleGenAI({ apiKey });

  // Allow override via options, then env, then default
  const model = options.model || process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-lite-image';

  let lastError = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      console.log(`[GeminiImageProvider] Attempt ${attempt + 1} — model: ${model}`);

      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
          temperature: 1,
          topP: 0.95,
        },
      });

      let imageBuffer = null;
      let mimeType = 'image/png';
      let text = '';

      const candidates = response.candidates || [];
      const parts = (candidates[0] && candidates[0].content && candidates[0].content.parts) || [];

      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          imageBuffer = Buffer.from(part.inlineData.data, 'base64');
          mimeType = part.inlineData.mimeType || 'image/png';
        } else if (part.text) {
          text = part.text;
        }
      }

      if (!imageBuffer) {
        throw new Error('Gemini did not return image data in response. Model may not support image generation.');
      }

      return { imageBuffer, mimeType, text };

    } catch (err) {
      lastError = err;

      const statusCode = err.status;

      // ── Quota exhausted (limit: 0) — NEVER retry ──────────────
      const isQuotaExhausted = statusCode === 429 && err.message && err.message.includes('limit: 0');
      if (isQuotaExhausted) {
        console.error(`[GeminiImageProvider] Quota exhausted for model ${model} — billing required. Not retrying.`);
        break;
      }

      // ── Transient errors (500, 503) — retry with backoff ──────
      const isTransient = TRANSIENT_STATUS.has(statusCode);
      if (isTransient && attempt < RETRY_DELAYS.length) {
        const delay = RETRY_DELAYS[attempt];
        console.warn(`[GeminiImageProvider] Transient error ${statusCode}. Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      // ── Rate limited (429, not quota) — retry with longer wait ──
      const isRateLimited = statusCode === 429 && !isQuotaExhausted;
      if (isRateLimited && attempt < RETRY_DELAYS.length) {
        // Extract suggested retry delay from message if available
        const retryMatch = err.message && err.message.match(/retry in ([\d.]+)s/i);
        const suggestedDelay = retryMatch ? Math.min(parseFloat(retryMatch[1]) * 1000, 10000) : RETRY_DELAYS[attempt];
        console.warn(`[GeminiImageProvider] Rate limited (429). Waiting ${suggestedDelay}ms before retry...`);
        await sleep(suggestedDelay);
        continue;
      }

      // Not retryable or out of retries
      break;
    }
  }

  // Convert to user-friendly error
  const friendly = friendlyError(lastError);
  const error = new Error(friendly);
  error.originalError = lastError;
  throw error;
}

module.exports = { generateImage };
