const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
const path = require('path');
const { exec } = require('child_process');

/** ffprobe duration helper */
function getAudioDuration(audioPath) {
  return new Promise((resolve) => {
    const ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';
    const cmd = `"${ffprobePath}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`;
    exec(cmd, (err, stdout) => {
      if (err) resolve(30);
      else {
        const d = parseFloat(stdout.trim());
        resolve(isNaN(d) ? 30 : d);
      }
    });
  });
}

/**
 * Offline simulation: distribute audio duration proportionally by character count.
 * No word-level timestamps are available in this mode (_wordTimestamps = null).
 */
async function generateMockTimestamps(audioPath, sceneTexts) {
  const duration  = await getAudioDuration(audioPath);
  const texts     = sceneTexts.length > 0 ? sceneTexts : [''];
  const charCounts = texts.map(t => Math.max(t.length, 1));
  const totalChars = charCounts.reduce((a, b) => a + b, 0);

  const mockSegments = [];
  let cursor = 0;
  texts.forEach((text, i) => {
    const weight = charCounts[i] / totalChars;
    const segDur = duration * weight;
    mockSegments.push({
      text,
      start: Math.round(cursor * 100) / 100,
      end:   Math.round((cursor + segDur) * 100) / 100
    });
    cursor += segDur;
  });

  mockSegments._simulated     = true;
  mockSegments._wordTimestamps = null;  // not available in simulation
  return mockSegments;
}

/**
 * Run the local Faster-Whisper python script.
 * Returns the segments array with _wordTimestamps attached.
 */
function runFasterWhisper(audioPath) {
  return new Promise((resolve, reject) => {
    const pythonPath = process.env.PYTHON_PATH || 'python';
    const scriptPath = path.join(__dirname, 'transcribe_local.py');
    const cmd = `"${pythonPath}" "${scriptPath}" "${audioPath}"`;

    console.log(`[Local Whisper] ${cmd}`);
    exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(err.message || stderr));
      try {
        const data = JSON.parse(stdout.trim());
        if (data.error) return reject(new Error(data.error));
        if (data.status === 'success' && Array.isArray(data.segments)) {
          const segments = data.segments.map(s => ({
            text:  s.text,
            start: s.start,
            end:   s.end
          }));
          // Attach flat word list for karaoke subtitle generation
          segments._wordTimestamps = Array.isArray(data.words) ? data.words : null;
          resolve(segments);
        } else {
          reject(new Error('Unexpected output from transcription script.'));
        }
      } catch (e) {
        reject(new Error(`JSON parse error: ${stdout || stderr}`));
      }
    });
  });
}

/**
 * Main entry point.  Priority order:
 *   1. OpenAI Whisper API  (online, accurate)
 *   2. Faster-Whisper      (offline, accurate – requires pip install faster-whisper)
 *   3. Char-weighted sim   (offline, approximate – always works)
 *
 * Return value is the segments array.
 * Word-level timestamps (for karaoke) are attached as segments._wordTimestamps.
 */
async function processAudio(audioPath, sceneTexts = []) {
  const apiKey       = process.env.OPENAI_API_KEY;
  const isPlaceholder = !apiKey || apiKey.startsWith('sk-test-key') || apiKey === '';

  // ── No API key: try local Faster-Whisper first ───────────────────────────
  if (isPlaceholder) {
    console.log('⚠️  No OpenAI key – attempting local Faster-Whisper...');
    try {
      const segs = await runFasterWhisper(audioPath);
      console.log(`✅ Faster-Whisper: ${segs.length} segments, ${(segs._wordTimestamps || []).length} words`);
      return segs;
    } catch (e) {
      console.warn(`⚠️  Faster-Whisper unavailable (${e.message}). Using char-weighted simulation.`);
      return generateMockTimestamps(audioPath, sceneTexts);
    }
  }

  // ── OpenAI API path ────────────────────────────────────────────────────────
  const form = new FormData();
  form.append('file',   fs.createReadStream(audioPath));
  form.append('model',  'whisper-1');
  form.append('response_format', 'verbose_json');
  // Request word-level timestamps for karaoke highlighting
  form.append('timestamp_granularities[]', 'segment');
  form.append('timestamp_granularities[]', 'word');

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      form,
      { headers: { ...form.getHeaders(), Authorization: `Bearer ${apiKey}` } }
    );

    const rawSegs = response.data.segments;
    if (!rawSegs || rawSegs.length === 0) {
      console.warn('⚠️  Whisper API returned no segments. Falling back to Faster-Whisper...');
      try { return await runFasterWhisper(audioPath); }
      catch (e) { return generateMockTimestamps(audioPath, sceneTexts); }
    }

    const segments = rawSegs.map(s => ({
      text:  s.text.trim(),
      start: Math.round(s.start * 100) / 100,
      end:   Math.round(s.end   * 100) / 100
    }));

    // Parse word-level timestamps returned by OpenAI (verbose_json with word granularity)
    const rawWords = response.data.words || [];
    segments._wordTimestamps = rawWords.length > 0
      ? rawWords.map(w => ({
          word:  w.word.trim(),
          start: Math.round(w.start * 100) / 100,
          end:   Math.round(w.end   * 100) / 100
        }))
      : null;

    return segments;

  } catch (error) {
    console.warn(`⚠️  Whisper API error: ${error.message}. Falling back to Faster-Whisper...`);
    try {
      const segs = await runFasterWhisper(audioPath);
      console.log(`✅ Faster-Whisper fallback: ${segs.length} segments`);
      return segs;
    } catch (e) {
      console.warn(`⚠️  Faster-Whisper failed: ${e.message}. Using char-weighted simulation.`);
      return generateMockTimestamps(audioPath, sceneTexts);
    }
  }
}

module.exports = { processAudio };
