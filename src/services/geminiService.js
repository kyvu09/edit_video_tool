const fs = require('fs');
const path = require('path');
const axios = require('axios');
const geminiKeyManager = require('./geminiKeyManager');

const PROMPT_DIR = path.resolve(__dirname, '..', '..', 'prompt');
const PROMPT_CREATE_PATH = path.join(PROMPT_DIR, 'prompt-create-scenes-02.md');
const PROMPT_SEPARATE_PATH = path.join(PROMPT_DIR, 'prompt-separate-scenes.md');
const PROMPT_METADATA_PATH = path.join(PROMPT_DIR, 'video-metadata.md');
const PROMPT_EXTRACT_PATH = path.join(PROMPT_DIR, 'extract-content.md');
const PROMPT_CONTENT_PATH = path.join(PROMPT_DIR, 'create-content.md');

/**
 * Lấy danh sách các model text từ file .env theo thứ tự ưu tiên
 */
function getTextCandidateModels() {
  const models = [];

  // 1. Model chính từ GEMINI_MODEL trong .env
  if (process.env.GEMINI_MODEL && process.env.GEMINI_MODEL.trim()) {
    models.push(process.env.GEMINI_MODEL.trim());
  }

  // 2. Các model dự phòng GEMINI_MODEL_FALLBACK_1, GEMINI_MODEL_FALLBACK_2,... trong .env
  for (let i = 1; i <= 10; i++) {
    const fallback = process.env[`GEMINI_MODEL_FALLBACK_${i}`];
    if (fallback && fallback.trim()) {
      models.push(fallback.trim());
    }
  }

  // 3. Biến GEMINI_FALLBACK_MODELS (dạng danh sách cách nhau bởi dấu phẩy)
  if (process.env.GEMINI_FALLBACK_MODELS) {
    const splitModels = process.env.GEMINI_FALLBACK_MODELS.split(/[,;\n]/).map(m => m.trim()).filter(Boolean);
    models.push(...splitModels);
  }

  // 4. Mặc định dự phòng nếu chưa cấu hình
  models.push('gemini-2.5-flash', 'gemini-3-flash-preview', 'gemini-3.5-flash-lite');

  return models.filter((m, idx, arr) => arr.indexOf(m) === idx);
}

// Timeout cấu hình từ .env hoặc giá trị mặc định hợp lý
const REQUEST_TIMEOUT_MS = parseInt(process.env.GEMINI_TIMEOUT_MS, 10) || 60000; // 60s cho text
const EXTRACT_TIMEOUT_MS = parseInt(process.env.GEMINI_EXTRACT_TIMEOUT_MS, 10) || 75000; // 75s cho video

/**
 * Kiểm tra xem lỗi có phải do model gặp sự cố (quá tải, timeout, lỗi mạng,...) để chuyển sang model dự phòng kế tiếp
 */
function isModelFallbackError(err) {
  if (!err) return false;
  const status = err.response?.status;
  // Lỗi từ máy chủ: 503 (quá tải), 504 (gateway timeout), 502 (bad gateway), 500 (server error), 404 (model không hỗ trợ), 408 (timeout)
  if (status === 503 || status === 504 || status === 502 || status === 500 || status === 404 || status === 408) {
    return true;
  }
  // Lỗi timeout hoặc đứt kết nối mạng phía client/axios
  const code = err.code || '';
  const message = (err.message || '').toLowerCase();
  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'ERR_BAD_RESPONSE' || message.includes('timeout')) {
    return true;
  }
  return false;
}

/**
 * Trích xuất chuỗi thông báo lỗi ngắn gọn, dễ hiểu
 */
function getErrorMessage(err) {
  const status = err.response?.status;
  const serverMsg = err.response?.data?.error?.message;
  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
    return `Timeout (${err.message})`;
  }
  if (serverMsg) {
    return `[${status || 'ERR'}] ${serverMsg}`;
  }
  return `[${status || err.code || 'ERR'}] ${err.message}`;
}

/**
 * Chuẩn hoá URL video YouTube (chuyển Shorts hoặc link có tracking params thành watch?v=...)
 */
function normalizeYouTubeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
  const trimmed = rawUrl.trim();
  const shortsMatch = trimmed.match(/(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/);
  if (shortsMatch && shortsMatch[1]) {
    return `https://www.youtube.com/watch?v=${shortsMatch[1]}`;
  }
  const youtuMatch = trimmed.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (youtuMatch && youtuMatch[1]) {
    return `https://www.youtube.com/watch?v=${youtuMatch[1]}`;
  }
  const watchMatch = trimmed.match(/(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/);
  if (watchMatch && watchMatch[1]) {
    return `https://www.youtube.com/watch?v=${watchMatch[1]}`;
  }
  return trimmed;
}

/**
 * Call the Gemini API via Axios REST request with automatic key rotation and model fallback
 */
async function callGemini(systemInstruction, userPrompt, temperature = 0.7) {
  const candidateModels = getTextCandidateModels();

  return await geminiKeyManager.executeWithFallback(async (apiKey, meta) => {
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: userPrompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: temperature
      }
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [
          {
            text: systemInstruction
          }
        ]
      };
    }

    let lastErr = null;
    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await axios.post(url, payload, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: REQUEST_TIMEOUT_MS
        });

        const candidates = response.data && response.data.candidates;
        if (candidates && candidates[0] && candidates[0].content && candidates[0].content.parts && candidates[0].content.parts[0]) {
          return candidates[0].content.parts[0].text;
        } else {
          console.error('[Gemini Service] API Error Response:', JSON.stringify(response.data));
          throw new Error('Invalid or empty response structure received from Gemini API.');
        }
      } catch (err) {
        lastErr = err;
        const status = err.response?.status;

        // Nếu 429 (Rate limit) hoặc 403 (Key sai): Ném lỗi để xoay API Key ngay lập tức
        if (status === 429 || status === 403) {
          throw err;
        }

        // Nếu model bị quá tải (503), timeout, hoặc không khả dụng: Chuyển sang model dự phòng kế tiếp
        if (isModelFallbackError(err)) {
          console.warn(`[Gemini Service] Model ${model} gặp sự cố: ${getErrorMessage(err)}. Đang tự động đổi sang model dự phòng tiếp theo...`);
          continue;
        }

        throw err;
      }
    }

    throw lastErr;
  }, { context: 'geminiService.callGemini' });
}

/**
 * Trích xuất trực tiếp kịch bản thoại sạch từ kết quả Step 1 (scenesAndPromptsOutput).
 * Đảm bảo 100% khớp số lượng scenes với số image prompts, không bị sót scene nào.
 */
function extractSeparatedScriptFromScenes(scenesText) {
  if (!scenesText || !scenesText.trim()) return '';

  const sceneBlocks = [];
  const sceneRegex = /SCENE\s+(\d+)[\s\S]*?(?=(?:\n\s*SCENE\s+\d+)|\n\s*[─\-—]{3,}\s*SCENE\s+\d+|$)/gi;
  let match;
  while ((match = sceneRegex.exec(scenesText)) !== null) {
    const block = match[0];
    const numMatch = block.match(/SCENE\s+(\d+)/i);
    const sceneNum = numMatch ? parseInt(numMatch[1], 10) : sceneBlocks.length + 1;

    const scriptMatch = block.match(/(?:Script|Lời thoại|Script line|Dialogue)[^:]*:\s*([\s\S]*?)(?=\n\s*(?:Image Prompt|Prompt|Thumbnail|Visual|Reason|─|-|—)|$)/i);
    let dialogue = '';
    if (scriptMatch) {
      dialogue = scriptMatch[1].trim();
    } else {
      const quoteMatch = block.match(/"([^"]+)"/);
      if (quoteMatch) dialogue = quoteMatch[1].trim();
    }

    dialogue = dialogue.replace(/\r?\n+/g, ' ').replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim();

    if (dialogue) {
      sceneBlocks.push({ scene: sceneNum, text: dialogue });
    }
  }

  if (sceneBlocks.length > 0) {
    sceneBlocks.sort((a, b) => a.scene - b.scene);
    console.log(`[Gemini Service] ✅ Đã trích xuất chính xác ${sceneBlocks.length} scenes trực tiếp từ output Step 1.`);
    return sceneBlocks.map(s => s.text).join('\n\n');
  }

  return '';
}

/**
 * Executes the script parsing pipeline:
 * Step 1: Generates scenes and image prompts
 * Step 2: Extracts dialogue script lines (direct extraction with Gemini fallback)
 */
async function generateScenes(rawScriptText) {
  if (!rawScriptText || rawScriptText.trim() === '') {
    throw new Error('Script text cannot be empty.');
  }

  // 1. Read create scenes prompt
  let createPrompt = '';
  try {
    createPrompt = fs.readFileSync(PROMPT_CREATE_PATH, 'utf8');
  } catch (err) {
    throw new Error(`Failed to read prompt file at ${PROMPT_CREATE_PATH}: ${err.message}`);
  }

  // 2. Call Gemini for Step 1
  console.log('[Gemini Service] Step 1: Generating scenes and image prompts...');
  const scenesAndPromptsOutput = await callGemini(createPrompt, rawScriptText);

  // 3. Extract separated script directly to guarantee 100% scene count matching
  let separatedScriptOutput = extractSeparatedScriptFromScenes(scenesAndPromptsOutput);

  // 4. Fallback: Call Gemini for Step 2 only if direct extraction found nothing
  if (!separatedScriptOutput) {
    console.log('[Gemini Service] Fallback: Calling Gemini for Step 2...');
    let separatePrompt = '';
    try {
      separatePrompt = fs.readFileSync(PROMPT_SEPARATE_PATH, 'utf8');
      separatedScriptOutput = await callGemini(separatePrompt, scenesAndPromptsOutput);
    } catch (err) {
      console.warn(`[Gemini Service] Step 2 fallback warning: ${err.message}`);
      separatedScriptOutput = rawScriptText;
    }
  }

  return {
    scenesAndPrompts: scenesAndPromptsOutput,
    separatedScript: separatedScriptOutput
  };
}

async function generateVideoMetadata(rawScriptText) {
  if (!rawScriptText || rawScriptText.trim() === '') {
    throw new Error('Script text cannot be empty.');
  }

  let metadataPrompt = '';
  try {
    metadataPrompt = fs.readFileSync(PROMPT_METADATA_PATH, 'utf8');
  } catch (err) {
    throw new Error(`Failed to read prompt file at ${PROMPT_METADATA_PATH}: ${err.message}`);
  }

  const finalPrompt = metadataPrompt.replace('{{SCRIPT}}', rawScriptText);

  console.log('[Gemini Service] Generating video metadata...');
  const metadataOutput = await callGemini('', finalPrompt);

  return metadataOutput;
}

async function extractVideoContent(videoUrl) {
  if (!videoUrl || videoUrl.trim() === '') {
    throw new Error('Video URL cannot be empty.');
  }

  const candidateModels = getTextCandidateModels();

  let extractPrompt = '';
  try {
    extractPrompt = fs.readFileSync(PROMPT_EXTRACT_PATH, 'utf8');
  } catch (err) {
    throw new Error(`Failed to read prompt file at ${PROMPT_EXTRACT_PATH}: ${err.message}`);
  }

  // Chuẩn hoá URL (nếu là Shorts hoặc link kèm tham số tracking thì chuyển về dạng chuẩn watch?v=...)
  const targetVideoUrl = normalizeYouTubeUrl(videoUrl);

  // Xoá dòng [VIDEO_URL] khỏi prompt vì video sẽ được gửi qua fileData
  const textPrompt = extractPrompt.replace('[VIDEO_URL]', '').trim();

  // Debug: lưu prompt cuối cùng
  fs.writeFileSync(
    path.join(__dirname, '..', '..', 'debug_prompt.txt'),
    `RAW URL: ${videoUrl}\nTARGET URL: ${targetVideoUrl}\n\nPROMPT:\n${textPrompt}`,
    'utf8'
  );

  console.log('[Gemini Service] Sending video URL via fileData to Gemini for extraction...');
  console.log('[Gemini Service] Video URL:', targetVideoUrl);

  return await geminiKeyManager.executeWithFallback(async (apiKey, meta) => {
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              fileData: {
                fileUri: targetVideoUrl
              }
            },
            {
              text: textPrompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1
      }
    };

    let lastErr = null;
    for (const model of candidateModels) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await axios.post(apiUrl, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: EXTRACT_TIMEOUT_MS
        });

        const candidates = response.data && response.data.candidates;
        if (
          candidates &&
          candidates[0] &&
          candidates[0].content &&
          candidates[0].content.parts &&
          candidates[0].content.parts[0]
        ) {
          return candidates[0].content.parts[0].text;
        } else {
          console.error('[Gemini Service] Extract API Error Response:', JSON.stringify(response.data));
          throw new Error('Invalid or empty response structure received from Gemini API.');
        }
      } catch (err) {
        lastErr = err;
        const status = err.response?.status;

        // Nếu 429 (Rate limit) hoặc 403 (Key sai): Ném lỗi để xoay API Key ngay lập tức
        if (status === 429 || status === 403) {
          throw err;
        }

        // Nếu model bị quá tải (503), timeout, hoặc lỗi máy chủ: Chuyển sang model dự phòng kế tiếp
        if (isModelFallbackError(err)) {
          console.warn(`[Gemini Service] Model ${model} gặp sự cố khi trích xuất video: ${getErrorMessage(err)}. Đang thử model dự phòng tiếp theo...`);
          continue;
        }

        throw err;
      }
    }

    throw lastErr;
  }, { context: 'geminiService.extractVideoContent' });
}

async function createContentFromScript(rawScriptText) {
  if (!rawScriptText || rawScriptText.trim() === '') {
    throw new Error('Script text cannot be empty.');
  }

  let promptTemplate = '';
  try {
    promptTemplate = fs.readFileSync(PROMPT_CONTENT_PATH, 'utf8');
  } catch (err) {
    throw new Error(`Failed to read prompt file at ${PROMPT_CONTENT_PATH}: ${err.message}`);
  }

  let finalPrompt = '';
  if (promptTemplate.includes('[PASTE CONTENT HERE]')) {
    finalPrompt = promptTemplate.replace('[PASTE CONTENT HERE]', rawScriptText);
  } else {
    finalPrompt = promptTemplate + '\n\n' + rawScriptText;
  }

  console.log('[Gemini Service] Creating rewritten content from script...');
  const result = await callGemini('', finalPrompt, 0.7);
  return result;
}

module.exports = { generateScenes, generateVideoMetadata, extractVideoContent, createContentFromScript };
