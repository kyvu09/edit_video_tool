const { GoogleGenAI } = require('@google/genai');
const geminiKeyManager = require('../../services/geminiKeyManager');

// Retry delays in ms: 1s, 2s — for transient errors (500, 503)
const RETRY_DELAYS = [1000, 2000];
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
    return `Quota hết – model image generation yêu cầu bật billing trên Google Cloud hoặc đổi sang API key khác.`;
  }

  // Rate limited (temporary)
  if (err.status === 429) {
    const retryMatch = msg.match(/retry in ([\d.]+)s/i);
    const wait = retryMatch ? ` (thử lại sau ${Math.ceil(parseFloat(retryMatch[1]))}s)` : '';
    return `Gọi API quá nhanh (rate limit)${wait}. Đang tự động đổi key dự phòng...`;
  }

  if (err.status === 404) {
    return `Model không tồn tại hoặc chưa được hỗ trợ. Kiểm tra lại GEMINI_IMAGE_MODEL trong .env.`;
  }

  if (err.status === 400) {
    return `Prompt bị từ chối (có thể vi phạm chính sách nội dung) hoặc API key không hợp lệ.`;
  }

  if (err.status === 403) {
    return `API key không có quyền dùng model này.`;
  }

  return msg.length > 200 ? msg.slice(0, 200) + '...' : msg;
}

function getImageCandidateModels(overrideModel) {
  if (overrideModel) return [overrideModel];
  const list = [];
  if (process.env.GEMINI_IMAGE_MODEL) list.push(process.env.GEMINI_IMAGE_MODEL.trim());
  for (let i = 1; i <= 5; i++) {
    const fb = process.env[`GEMINI_IMAGE_MODEL_FALLBACK_${i}`];
    if (fb && fb.trim()) list.push(fb.trim());
  }
  if (process.env.GEMINI_IMAGE_MODEL_FALLBACK) {
    list.push(...process.env.GEMINI_IMAGE_MODEL_FALLBACK.split(/[,;\n]/).map(m => m.trim()).filter(Boolean));
  }
  list.push('gemini-2.5-flash-image', 'gemini-3.1-flash-lite-image', 'gemini-3.1-flash-image');
  return list.filter((m, i, arr) => arr.indexOf(m) === i);
}

/**
 * Generate a single image from a text prompt using Gemini Image model.
 * Automatically rotates and falls back to backup keys and models if rate limited or on error.
 *
 * @param {string} prompt  - The image generation prompt
 * @param {object} options - Optional overrides
 * @param {string} options.model - Gemini model name
 * @returns {Promise<{ imageBuffer: Buffer, mimeType: string, text: string }>}
 */
async function generateImage(prompt, options = {}) {
  const candidateModels = getImageCandidateModels(options.model);

  return await geminiKeyManager.executeWithFallback(async (apiKey, meta) => {
    const ai = new GoogleGenAI({ apiKey });
    let lastError = null;

    for (const model of candidateModels) {
      console.log(`[GeminiImageProvider] Thử tạo ảnh với Key #${meta.keyIndex}/${meta.totalKeys} (${meta.maskedKey}) — model: ${model}`);

      for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
        try {
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

          // Nếu hết quota (429 limit: 0) hoặc dính rate limit hoặc 403: ném lỗi để Fallback sang key tiếp theo ngay lập tức
          const isQuotaExhausted = statusCode === 429 && err.message && err.message.includes('limit: 0');
          if (isQuotaExhausted || statusCode === 403 || statusCode === 429) {
            console.warn(`[GeminiImageProvider] Key #${meta.keyIndex} gặp lỗi [${statusCode}]. Chuyển sang key dự phòng tiếp theo...`);
            throw err;
          }

          // Nếu model quá tải (503) hoặc model không khả dụng (404): Chuyển sang model ảnh dự phòng tiếp theo
          if (statusCode === 503 || statusCode === 404) {
            console.warn(`[GeminiImageProvider] Model ảnh ${model} gặp lỗi [${statusCode}]. Đang thử model ảnh dự phòng tiếp theo...`);
            break; // Thoát retry loop để thử model tiếp theo trong candidateModels
          }

          // Lỗi tạm thời khác: thử lại nhanh 1-2 lần
          const isTransient = TRANSIENT_STATUS.has(statusCode);
          if (isTransient && attempt < RETRY_DELAYS.length) {
            const delay = RETRY_DELAYS[attempt];
            console.warn(`[GeminiImageProvider] Lỗi tạm thời ${statusCode}. Thử lại trong ${delay}ms...`);
            await sleep(delay);
            continue;
          }

          throw err;
        }
      }
    }

    throw lastError;
  }, { context: 'geminiImageProvider.generateImage' });
}

module.exports = { generateImage };

