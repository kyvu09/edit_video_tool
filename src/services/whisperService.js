const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
const { exec } = require('child_process');

/**
 * Get duration of audio file asynchronously using ffprobe
 */
function getAudioDuration(audioPath) {
  return new Promise((resolve) => {
    const ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';
    const cmd = `"${ffprobePath}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`;
    exec(cmd, (err, stdout) => {
      if (err) {
        resolve(30); // Default to 30s if ffprobe fails
      } else {
        const duration = parseFloat(stdout.trim());
        resolve(isNaN(duration) ? 30 : duration);
      }
    });
  });
}

/**
 * Generate simulated timestamps weighted by character count to approximate real speech duration.
 * Longer text = more time, shorter text = less time.
 */
async function generateMockTimestamps(audioPath, sceneTexts) {
  const duration = await getAudioDuration(audioPath);
  const texts = sceneTexts.length > 0 ? sceneTexts : [''];

  // Calculate total character count across all scenes
  const charCounts = texts.map(t => Math.max(t.length, 1));
  const totalChars = charCounts.reduce((a, b) => a + b, 0);

  // Distribute time proportionally based on character count
  const mockSegments = [];
  let cursor = 0;
  texts.forEach((text, index) => {
    const weight = charCounts[index] / totalChars;
    const segDuration = duration * weight;
    const start = Math.round(cursor * 100) / 100;
    const end = Math.round((cursor + segDuration) * 100) / 100;
    mockSegments.push({ text, start, end });
    cursor += segDuration;
  });

  mockSegments._simulated = true;
  return mockSegments;
}

async function processAudio(audioPath, sceneTexts = []) {
  const apiKey = process.env.OPENAI_API_KEY;
  const isPlaceholder = !apiKey || apiKey.startsWith('sk-test-key') || apiKey === '';

  if (isPlaceholder) {
    console.log('⚠️ OPENAI_API_KEY is not configured or is a placeholder. Using local simulation fallback.');
    return generateMockTimestamps(audioPath, sceneTexts);
  }

  const form = new FormData();
  form.append('file', fs.createReadStream(audioPath));
  form.append('model', 'whisper-1');
  // verbose_json is required to receive segment-level timestamps.
  // Without it, the API only returns a plain text transcript with no timing data.
  form.append('response_format', 'verbose_json');

  try {
    const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const segments = response.data.segments;
    if (!segments || segments.length === 0) {
      console.warn('⚠️ Whisper API returned no segments. Falling back to character-weighted offline simulation.');
      return generateMockTimestamps(audioPath, sceneTexts);
    }
    return segments.map(seg => ({
      text: seg.text.trim(),
      start: Math.round(seg.start * 100) / 100,
      end: Math.round(seg.end * 100) / 100
    }));
  } catch (error) {
    console.warn(`⚠️ Whisper API error: ${error.message}. Falling back to local offline simulation.`);
    return generateMockTimestamps(audioPath, sceneTexts);
  }
}

module.exports = { processAudio };

