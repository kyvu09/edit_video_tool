const fs = require('fs');
const path = require('path');
const axios = require('axios');

const PROMPT_DIR = path.resolve(__dirname, '..', '..', 'prompt');
const PROMPT_CREATE_PATH = path.join(PROMPT_DIR, 'prompt-create-scenes.md');
const PROMPT_SEPARATE_PATH = path.join(PROMPT_DIR, 'prompt-separate-scenes.md');

/**
 * Call the Gemini API via Axios REST request
 */
async function callGemini(systemInstruction, userPrompt) {
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
    systemInstruction: {
      parts: [
        {
          text: systemInstruction
        }
      ]
    }
  };

  const response = await axios.post(url, payload, {
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 30000 // 30s timeout
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

module.exports = { generateScenes };
