const fs = require('fs');
const path = require('path');
const axios = require('axios');

const PROMPT_DIR = path.resolve(__dirname, '..', '..', 'prompt');
const PROMPT_CREATE_PATH = path.join(PROMPT_DIR, 'prompt-create-scenes.md');
const PROMPT_SEPARATE_PATH = path.join(PROMPT_DIR, 'prompt-separate-scenes.md');
const PROMPT_METADATA_PATH = path.join(PROMPT_DIR, 'video-metadata.md');
const PROMPT_EXTRACT_PATH = path.join(PROMPT_DIR, 'extract-content.md');

/**
 * Call the Gemini API via Axios REST request
 */
async function callGemini(systemInstruction, userPrompt, temperature = 0.7) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY is not defined in environment variables (.env file). Please update your configuration.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY is not defined in environment variables (.env file).');
  }

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

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Gửi video URL qua fileData để Gemini thực sự "xem" video
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
}

module.exports = { generateScenes, generateVideoMetadata, extractVideoContent };
