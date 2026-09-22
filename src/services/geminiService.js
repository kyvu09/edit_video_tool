const fs = require('fs');
const path = require('path');
const axios = require('axios');
const geminiKeyManager = require('./geminiKeyManager');

const PROMPT_DIR = path.resolve(__dirname, '..', '..', 'prompt');
const PROMPT_CREATE_PATH = path.join(PROMPT_DIR, 'prompt-create-scenes.md');
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
          timeout: 300000 // 5 phut timeout
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

        // Nếu 503 (Google quá tải) hoặc 404 (Model không tồn tại trên tài khoản này): Chuyển sang model dự phòng
        if (status === 503 || status === 404) {
          console.warn(`[Gemini Service] Model ${model} gặp lỗi [${status}] (${err.response?.data?.error?.message || err.message}). Tự động đổi sang model dự phòng tiếp theo...`);
          continue;
        }

        throw err;
      }
    }

    throw lastErr;
  }, { context: 'geminiService.callGemini' });
}

/**
 * Executes the two-step script parsing pipeline:
 * Step 1: Generates scenes and image prompts
 * Step 2: Extracts dialogue script lines
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

  // 3. Read separate scenes prompt
  let separatePrompt = '';
  try {
    separatePrompt = fs.readFileSync(PROMPT_SEPARATE_PATH, 'utf8');
  } catch (err) {
    throw new Error(`Failed to read prompt file at ${PROMPT_SEPARATE_PATH}: ${err.message}`);
  }

  // 4. Call Gemini for Step 2
  console.log('[Gemini Service] Step 2: Separating scene dialogue lines...');
  const separatedScriptOutput = await callGemini(separatePrompt, scenesAndPromptsOutput);

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

  // Xoá dòng [VIDEO_URL] khỏi prompt vì video sẽ được gửi qua fileData
  const textPrompt = extractPrompt.replace('[VIDEO_URL]', '').trim();

  // Debug: lưu prompt cuối cùng
  fs.writeFileSync(
    path.join(__dirname, '..', '..', 'debug_prompt.txt'),
    `URL: ${videoUrl}\n\nPROMPT:\n${textPrompt}`,
    'utf8'
  );

  console.log('[Gemini Service] Sending video URL via fileData to Gemini for extraction...');
  console.log('[Gemini Service] Video URL:', videoUrl);

  return await geminiKeyManager.executeWithFallback(async (apiKey, meta) => {
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              fileData: {
                fileUri: videoUrl
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
          timeout: 300000 // 5 phút timeout
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

        if (status === 429 || status === 403) {
          throw err;
        }

        if (status === 503 || status === 404) {
          console.warn(`[Gemini Service] Model ${model} gặp lỗi [${status}]. Thử model dự phòng tiếp theo...`);
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
