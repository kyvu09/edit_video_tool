const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Load env variables
dotenv.config();

// Import modules
const whisperService = require('./src/services/whisperService');
const scriptParser = require('./src/services/scriptParser');
const timelineGenerator = require('./src/services/timelineGenerator');
const subtitleGenerator = require('./src/services/subtitleGenerator');
const ffmpegRenderer = require('./src/services/ffmpegRenderer');
const bgRemovalService = require('./src/services/bgRemovalService');
const geminiService = require('./src/services/geminiService');
const youtubeService = require('./src/services/youtubeService');
const imageQueue = require('./src/services/imageQueue');
const sessionManager = require('./src/services/sessionManager');


const app = express();

// In-memory store for session progress
const sessions = {};

async function processVideoBackground(sessionId, files, sessionDir, backgroundMode = 'whitekey', aspectRatio = '16:9', bgmVolume = 30, videoSpeed = 1.0, enableKaraokeEffect = true) {
  const timeout = setTimeout(() => {
    console.error(`[Session ${sessionId}] ⏱️ Processing timeout (>12 hours)`);
    sessions[sessionId].status = 'failed';
    sessions[sessionId].statusMessage = 'Processing timeout - operation took too long';
  }, 12 * 60 * 60 * 1000); // 12 hours timeout

  try {
    const { audio, script, images, backgroundImage, bgm } = files;
    const audioPath = audio[0].path;
    const scriptPath = script[0].path;
    const bgPath = backgroundImage && backgroundImage.length > 0 ? backgroundImage[0].path : null;
    const bgmPath = bgm && bgm.length > 0 ? bgm[0].path : null;

    // Step 0: Background removal and compositing (rembg / whitekey)
    console.log(`[Session ${sessionId}] Step 0: Processing backgrounds in mode ${backgroundMode}...`);
    sessions[sessionId].currentStep = 'step-rembg';
    sessions[sessionId].progress = 2;
    
    if (bgPath) {
      sessions[sessionId].statusMessage = 'Tách nền các ảnh scene...';
      const imagePaths = images.map(img => img.path);
      const processedPaths = await bgRemovalService.processBackgrounds(
        imagePaths,
        bgPath,
        sessionDir,
        backgroundMode,
        aspectRatio,
        (curr, tot) => {
          const pct = Math.round((curr / tot) * 15); // scales 0 to 15%
          sessions[sessionId].progress = 2 + pct;
          sessions[sessionId].statusMessage = `Tách nền ảnh scene ${curr + 1} / ${tot}...`;
        }
      );
      // Update image paths in Multer objects to point to composited images
      images.forEach((img, idx) => {
        img.path = processedPaths[idx];
      });
      sessions[sessionId].statusMessage = 'Tách & ghép nền hoàn tất.';
    } else {
      sessions[sessionId].statusMessage = 'Bỏ qua tách nền (Không upload ảnh background).';
    }
    sessions[sessionId].progress = 20;

    // Parse the script first (very fast) so we have scene texts available for the Whisper fallback
    const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
    const scenes = scriptParser.parseScript(scriptContent);
    const sceneTexts = scenes.map(s => s.text);

    // Auto-generate YouTube metadata in the background
    sessions[sessionId].metadata = null;
    geminiService.generateVideoMetadata(scriptContent).then(result => {
        try {
            const cleanedStr = result.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanedStr);
            sessions[sessionId].metadata = parsed;
            console.log(`[Session ${sessionId}] YouTube metadata auto-generated via AI.`);
        } catch (e) {
            console.warn(`[Session ${sessionId}] Failed to parse auto metadata as JSON`, e);
            sessions[sessionId].metadata = { title: "AI Generated Video", description: result };
        }
    }).catch(err => {
        console.error(`[Session ${sessionId}] Gemini auto-metadata generation failed:`, err);
    });

    // Step 1: Extract timestamps from audio
    console.log(`[Session ${sessionId}] Step 1: Extracting timestamps...`);
    sessions[sessionId].currentStep = 'step-whisper';
    sessions[sessionId].progress = 22;
    
    const apiKey = process.env.OPENAI_API_KEY;
    const isPlaceholder = !apiKey || apiKey.startsWith('sk-test-key') || apiKey === '';
    if (isPlaceholder) {
      sessions[sessionId].statusMessage = 'OpenAI API key missing. Simulating timeline locally (Offline Mode)...';
    } else {
      sessions[sessionId].statusMessage = 'Extracting timestamps from audio using Whisper AI...';
    }
    
    const timestamps = await whisperService.processAudio(audioPath, sceneTexts);
    
    if (isPlaceholder || timestamps._simulated) {
      sessions[sessionId].statusMessage = 'Audio timeline simulated locally (Offline Mode).';
    } else {
      sessions[sessionId].statusMessage = 'Timestamps extracted successfully.';
    }
    sessions[sessionId].progress = 40;

    // Step 2: Parse script (already parsed, just update progress and UI)
    console.log(`[Session ${sessionId}] Step 2: Parsing scenes...`);
    sessions[sessionId].currentStep = 'step-parse';
    sessions[sessionId].progress = 42;
    sessions[sessionId].statusMessage = `Identified ${scenes.length} scenes from script.`;
    sessions[sessionId].progress = 45;

    // Step 3: Generate timeline
    console.log(`[Session ${sessionId}] Step 3: Generating timeline...`);
    sessions[sessionId].currentStep = 'step-timeline';
    sessions[sessionId].progress = 47;
    sessions[sessionId].statusMessage = 'Generating matching scene timeline...';
    
    const timeline = timelineGenerator.generateTimeline(scenes, timestamps, images);
    
    // Extract word timestamps
    let wordTimestamps = timestamps._wordTimestamps || null;

    // Scale timeline according to video speed
    if (videoSpeed && videoSpeed !== 1.0) {
      console.log(`[Session ${sessionId}] Scaling timeline by speed ${videoSpeed}x...`);
      timeline.forEach(item => {
        item.start = Math.round((item.start / videoSpeed) * 100) / 100;
        item.end = Math.round((item.end / videoSpeed) * 100) / 100;
        item.duration = Math.round((item.duration / videoSpeed) * 100) / 100;
      });

      if (wordTimestamps) {
        wordTimestamps = wordTimestamps.map(w => ({
          ...w,
          start: w.start / videoSpeed,
          end: w.end / videoSpeed
        }));
      }
    }

    sessions[sessionId].progress = 50;

    // Step 4: Generate subtitles
    console.log(`[Session ${sessionId}] Step 4: Generating subtitles...`);
    sessions[sessionId].currentStep = 'step-subtitle';
    sessions[sessionId].progress = 52;
    sessions[sessionId].statusMessage = 'Creating subtitle track...';
    
    const assPath = path.join(sessionDir, 'subtitle.ass');
    subtitleGenerator.generateASS(timeline, assPath, wordTimestamps, aspectRatio, enableKaraokeEffect);
    sessions[sessionId].progress = 55;

    // Step 5: Render video
    console.log(`[Session ${sessionId}] Step 5: Rendering video with FFmpeg...`);
    sessions[sessionId].currentStep = 'step-ffmpeg';
    sessions[sessionId].statusMessage = 'Rendering final video with FFmpeg...';
    
    const outputPath = path.join(sessionDir, 'output.mp4');
    await ffmpegRenderer.renderVideo(timeline, audioPath, assPath, outputPath, aspectRatio, bgmPath, bgmVolume / 100, videoSpeed, (ffmpegProgress) => {
      if (ffmpegProgress.step === 'rendering_scene') {
        const percent = Math.round((ffmpegProgress.current / ffmpegProgress.total) * 35); // scales from 0 to 35% (from 55% to 90%)
        sessions[sessionId].progress = 55 + percent;
        sessions[sessionId].statusMessage = `Rendering scene ${ffmpegProgress.current + 1} of ${ffmpegProgress.total}...`;
      } else if (ffmpegProgress.step === 'concatenating') {
        sessions[sessionId].progress = 92;
        sessions[sessionId].statusMessage = 'Concatenating scenes with audio track...';
      } else if (ffmpegProgress.step === 'adding_subtitles') {
        sessions[sessionId].progress = 96;
        sessions[sessionId].statusMessage = 'Burning subtitles into video...';
      }
    });

    sessions[sessionId].progress = 100;
    sessions[sessionId].status = 'completed';
    sessions[sessionId].videoUrl = `/download/${sessionId}/output.mp4`;
    sessions[sessionId].previewUrl = `/api/video/${sessionId}`;
    sessions[sessionId].statusMessage = 'Video created successfully!';
    console.log(`[Session ${sessionId}] Video created successfully!`);
  } catch (error) {
    console.error(`[Session ${sessionId}] Error:`, error);
    sessions[sessionId].status = 'failed';
    sessions[sessionId].error = error.message;
    sessions[sessionId].statusMessage = `Error: ${error.message}`;
  } finally {
    clearTimeout(timeout);
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve generated assets (scene images) as static files
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
app.use('/assets', express.static(assetsDir));

// Setup upload directories
const uploadDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'output');

[uploadDir, outputDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Setup multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// Routes
app.post('/api/upload', upload.any(), async (req, res) => {
  try {
    const audioFiles = req.files ? req.files.filter(f => f.fieldname === 'audio') : [];
    const scriptFiles = req.files ? req.files.filter(f => f.fieldname === 'script') : [];
    const imageFiles = req.files ? req.files.filter(f => f.fieldname === 'images') : [];
    const bgFiles = req.files ? req.files.filter(f => f.fieldname === 'backgroundImage') : [];
    const bgmFiles = req.files ? req.files.filter(f => f.fieldname === 'bgm') : [];
    const backgroundMode = req.body.backgroundMode || 'whitekey';
    const aspectRatio = req.body.aspectRatio || '16:9';
    const bgmVolume = req.body.bgmVolume !== undefined ? parseFloat(req.body.bgmVolume) : 30;
    const videoSpeed = req.body.videoSpeed !== undefined ? parseFloat(req.body.videoSpeed) : 1.0;
    const enableKaraokeEffect = req.body.enableKaraokeEffect !== '0'; // default true

    if (audioFiles.length === 0 || scriptFiles.length === 0 || imageFiles.length === 0) {
      return res.status(400).json({ error: 'Missing required files: audio, script, or images' });
    }

    const sessionId = Date.now().toString();
    const sessionDir = path.join(outputDir, sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    sessions[sessionId] = {
      status: 'processing',
      progress: 0,
      currentStep: 'step-rembg',
      statusMessage: 'Starting video creation...',
      error: null,
      videoUrl: null
    };

    const files = {
      audio: audioFiles,
      script: scriptFiles,
      images: imageFiles,
      backgroundImage: bgFiles,
      bgm: bgmFiles
    };

    // Start background processing
    processVideoBackground(sessionId, files, sessionDir, backgroundMode, aspectRatio, bgmVolume, videoSpeed, enableKaraokeEffect)
      .catch((err) => {
        console.error(`[Session ${sessionId}] Unhandled error in background processing:`, err);
        sessions[sessionId].status = 'failed';
        sessions[sessionId].statusMessage = `Error: ${err.message}`;
      });

    res.status(202).json({
      sessionId,
      message: 'Video creation started',
      statusUrl: `/api/progress/${sessionId}`
    });
  } catch (error) {
    console.error('Error in /api/upload:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to generate scenes and split script via Gemini
app.post('/api/generate-scenes', async (req, res) => {
  try {
    const { rawScriptText } = req.body;
    if (!rawScriptText || rawScriptText.trim() === '') {
      return res.status(400).json({ error: 'Script text cannot be empty.' });
    }

    const result = await geminiService.generateScenes(rawScriptText);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/generate-scenes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to generate video metadata via Gemini
app.post('/api/generate-metadata', async (req, res) => {
  try {
    const { rawScriptText } = req.body;
    if (!rawScriptText || rawScriptText.trim() === '') {
      return res.status(400).json({ error: 'Script text cannot be empty.' });
    }

    const result = await geminiService.generateVideoMetadata(rawScriptText);
    
    try {
      // Try to parse the result as JSON
      const cleanedStr = result.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedStr);
      res.json(parsed);
    } catch (e) {
      console.warn('Failed to parse metadata as JSON, returning raw text', e);
      res.json({ rawText: result });
    }
  } catch (error) {
    console.error('Error in /api/generate-metadata:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to extract text content from a video URL via Gemini
app.post('/api/extract-video', async (req, res) => {
  try {
    const { videoUrl } = req.body;
    if (!videoUrl || videoUrl.trim() === '') {
      return res.status(400).json({ error: 'Video URL cannot be empty.' });
    }

    const result = await geminiService.extractVideoContent(videoUrl);
    res.json({ text: result });
  } catch (error) {
    console.error('Error in /api/extract-video:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to rewrite/create content from script via Gemini
app.post('/api/create-content', async (req, res) => {
  try {
    const { rawScriptText } = req.body;
    if (!rawScriptText || rawScriptText.trim() === '') {
      return res.status(400).json({ error: 'Script text cannot be empty.' });
    }

    const result = await geminiService.createContentFromScript(rawScriptText);
    res.json({ content: result });
  } catch (error) {
    console.error('Error in /api/create-content:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- YouTube API Endpoints ---
app.get('/api/youtube/auth', (req, res) => {
  try {
    const url = youtubeService.getAuthUrl();
    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('Missing code parameter');
  }
  try {
    await youtubeService.handleCallback(code);
    res.send(`
      <script>
        if (window.opener) {
          window.opener.postMessage('youtube_auth_success', '*');
          window.close();
        } else {
          window.location.href = '/';
        }
      </script>
    `);
  } catch (err) {
    console.error('OAuth Callback Error:', err);
    res.status(500).send('Authentication failed: ' + err.message);
  }
});

app.get('/api/youtube/status', (req, res) => {
  try {
    const isAuthenticated = youtubeService.checkAuthStatus();
    res.json({ authenticated: isAuthenticated });
  } catch (error) {
    res.json({ authenticated: false, error: error.message });
  }
});

app.post('/api/youtube/logout', (req, res) => {
  try {
    youtubeService.logout();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/youtube/upload', async (req, res) => {
  try {
    const { sessionId, title, description, tags, privacyStatus } = req.body;
    if (!sessionId || !title) {
      return res.status(400).json({ error: 'Missing required parameters (sessionId, title)' });
    }
    
    const videoPath = path.join(outputDir, sessionId, 'output.mp4');
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file not found for session ' + sessionId });
    }

    const result = await youtubeService.uploadVideo(videoPath, {
      title,
      description,
      tags,
      privacyStatus
    });

    res.json({ success: true, videoId: result.id });
  } catch (err) {
    console.error('YouTube Upload Error:', err);
    res.status(500).json({ error: err.message });
  }
});
// ------------------------------

const flowAutomator = require('./src/services/flowAutomator');
app.post('/api/flow-ai', async (req, res) => {
  try {
    const { prompt, isFirst, isLast } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Thiếu prompt' });
    await flowAutomator.pastePromptToFlow(prompt, isFirst, isLast);
    res.json({ success: true });
  } catch (err) {
    console.error('Flow Automation Error:', err);
    res.status(500).json({ error: err.message });
  }
});
const localTtsService = require('./src/services/localTtsService');
const viettelTtsService = require('./src/services/viettelTtsService');
const voiceManager = require('./src/services/voiceManager');

const ttsUpload = multer({
  dest: path.join(__dirname, 'uploads'),
  limits: { fileSize: 25 * 1024 * 1024 }
});

app.post('/api/tts', (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    ttsUpload.single('refAudioFile')(req, res, next);
  } else {
    next();
  }
}, async (req, res) => {
  try {
    const { text, provider, voice, speed } = req.body;
    if (!text) return res.status(400).json({ error: 'Thiếu text kịch bản' });
    
    let refAudio = req.file ? req.file.path : (req.body.refAudio || null);
    if (!refAudio && voice && voice.startsWith('custom_')) {
      refAudio = voiceManager.getVoicePathById(voice);
    }

    let audioBuffer;
    let contentType = 'audio/wav';
    let filename = 'audio.wav';

    if (provider === 'viettel') {
      audioBuffer = await viettelTtsService.generateSpeech(text);
      contentType = 'audio/mpeg';
      filename = 'audio.mp3';
    } else if (provider === 'kokoro') {
      // Kokoro TTS (English / Multilingual offline)
      audioBuffer = await localTtsService.generateSpeech(text, { engine: 'kokoro', voice, speed });
    } else {
      // Default: Local TTS (VieNeu - Tiếng Việt 48kHz, Offline 100%, with optional refAudio clone)
      audioBuffer = await localTtsService.generateSpeech(text, { engine: 'vieneu', voice, speed, refAudio });
    }

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, () => {});
    }
    
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': audioBuffer.length
    });
    res.send(audioBuffer);
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, () => {});
    }
    console.error('TTS Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Custom Cloned Voices Management Endpoints ─────────────────────────────────
app.get('/api/tts/custom-voices', (req, res) => {
  try {
    const voices = voiceManager.getCustomVoices();
    res.json({ success: true, voices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tts/custom-voices', ttsUpload.single('audioFile'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: 'Thiếu file âm thanh mẫu' });
    }
    const originalExt = path.extname(req.file.originalname) || '.wav';
    const newVoice = await voiceManager.saveCustomVoice(name || req.file.originalname, req.file.path, originalExt);
    if (fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, () => {});
    }
    res.json({ success: true, voice: newVoice });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, () => {});
    }
    console.error('Save custom voice error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tts/custom-voices/:id', async (req, res) => {
  try {
    const deleted = await voiceManager.deleteCustomVoice(req.params.id);
    res.json({ success: true, deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Image Generation Endpoints ─────────────────────────────────────────────

/**
 * POST /api/generate-images
 * Body: { videoId: string, scenes: [{ scene: number, prompt: string }] }
 * Returns: { sessionId: string, total: number }
 */
app.post('/api/generate-images', async (req, res) => {
  try {
    const { videoId, scenes } = req.body;

    if (!videoId || typeof videoId !== 'string' || videoId.trim() === '') {
      return res.status(400).json({ error: 'videoId is required and must be a non-empty string.' });
    }
    if (!Array.isArray(scenes) || scenes.length === 0) {
      return res.status(400).json({ error: 'scenes must be a non-empty array of { scene, prompt } objects.' });
    }

    // Validate scene items
    for (const item of scenes) {
      if (typeof item.scene !== 'number' || typeof item.prompt !== 'string' || item.prompt.trim() === '') {
        return res.status(400).json({ error: 'Each scene item must have a numeric scene index and a non-empty prompt string.' });
      }
    }

    const sessionId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sessionManager.createSession(sessionId, videoId.trim(), scenes.length);

    // Fire-and-forget: process scenes in background
    imageQueue.processScenes(sessionId, videoId.trim(), scenes).catch((err) => {
      console.error(`[/api/generate-images] Unhandled queue error for session ${sessionId}:`, err.message);
      sessionManager.failSession(sessionId, err.message);
    });

    res.status(202).json({ sessionId, total: scenes.length });
  } catch (error) {
    console.error('Error in POST /api/generate-images:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/image-session/:sessionId
 * Returns the current state of an image generation session.
 */
app.get('/api/image-session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessionManager.getSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }
  // Sort images by scene number before returning
  const sortedImages = [...session.images].sort((a, b) => a.scene - b.scene);
  res.json({
    sessionId: session.sessionId,
    videoId: session.videoId,
    status: session.status,
    progress: session.progress,
    completed: session.completed,
    total: session.total,
    images: sortedImages,
    error: session.error || null,
  });
});

// ──────────────────────────────────────────────────────────────────────────────

// Standalone endpoint for background removal debugging (returns binary image)
app.post('/api/debug-bg-remove', upload.any(), async (req, res) => {
  try {
    const fgFiles = req.files ? req.files.filter(f => f.fieldname === 'foreground') : [];
    const bgFiles = req.files ? req.files.filter(f => f.fieldname === 'background') : [];
    const mode = req.body.mode || 'whitekey';
    const threshold = req.body.threshold || '215';

    if (fgFiles.length === 0) {
      return res.status(400).json({ error: 'Missing foreground file' });
    }

    const fgPath = fgFiles[0].path;
    const bgPath = bgFiles.length > 0 ? bgFiles[0].path : null;

    // Create temporary output path in the upload directory
    const tempOutName = `debug_rembg_${Date.now()}.png`;
    const tempOutPath = path.join(uploadDir, tempOutName);

    const pythonPath = process.env.PYTHON_PATH || 'python';
    const scriptPath = path.resolve(__dirname, 'src', 'services', 'remove_bg.py');

    const args = [
      `"${pythonPath}"`,
      `"${scriptPath}"`,
      `"${path.resolve(fgPath)}"`,
      `"${path.resolve(tempOutPath)}"`,
      `"${mode}"`
    ];

    if (bgPath) {
      args.push(`"${path.resolve(bgPath)}"`);
    }

    if (mode === 'whitekey' && threshold) {
      args.push(`"${threshold}"`);
    }

    const cmd = args.join(' ');
    console.log(`[HTTP Debug BG] Running: ${cmd}`);

    const { exec } = require('child_process');
    exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      // Clean up uploaded temporary files immediately
      try {
        if (fs.existsSync(fgPath)) fs.unlinkSync(fgPath);
        if (bgPath && fs.existsSync(bgPath)) fs.unlinkSync(bgPath);
      } catch (e) {
        console.error('Error cleaning up temp upload files:', e.message);
      }

      if (error) {
        console.error('[HTTP Debug BG] Error:', error.message || stderr);
        return res.status(500).json({ error: error.message || stderr });
      }

      if (!fs.existsSync(tempOutPath)) {
        return res.status(500).json({ error: 'Output file was not generated.' });
      }

      // Send the processed file and delete it after sending is done
      res.sendFile(path.resolve(tempOutPath), {}, (sendErr) => {
        try {
          if (fs.existsSync(tempOutPath)) fs.unlinkSync(tempOutPath);
        } catch (e) {
          console.error('Error deleting temp output file:', e.message);
        }
      });
    });
  } catch (err) {
    console.error('Error in /api/debug-bg-remove:', err);
    res.status(500).json({ error: err.message });
  }
});

// Standalone endpoint for Gemini Image Generation debugging (Banana 2 Lite / models/gemini-3.1-flash-lite-image)
app.post('/api/debug-generate-image', async (req, res) => {
  try {
    const { prompt, model, apiKey, temperature, maxOutputTokens, topP, apiMode } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({ error: 'Prompt không được để trống' });
    }

    const effectiveApiKey = (apiKey && apiKey.trim()) || process.env.GEMINI_API_KEY;
    if (!effectiveApiKey || effectiveApiKey.trim() === '') {
      return res.status(400).json({
        error: 'GEMINI_API_KEY chưa được cấu hình. Vui lòng nhập API Key trên form hoặc trong file .env.'
      });
    }

    const rawModel = (model && model.trim()) || 'models/gemini-3.1-flash-lite-image';
    const effectiveModel = rawModel.startsWith('models/') ? rawModel : `models/${rawModel}`;
    const temp = temperature !== undefined && temperature !== null && temperature !== '' ? parseFloat(temperature) : 1.0;
    const maxTokens = maxOutputTokens ? parseInt(maxOutputTokens, 10) : 65536;
    const p = topP !== undefined && topP !== null && topP !== '' ? parseFloat(topP) : 0.95;
    const mode = apiMode || 'interactions';

    console.log(`[HTTP Debug Image] Generating image using ${mode} API with model: ${effectiveModel}`);
    console.log(`[HTTP Debug Image] Prompt: ${prompt.trim().slice(0, 100)}...`);

    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey: effectiveApiKey });

    let base64Data = null;
    let mimeType = 'image/png';
    let textResponse = '';

    if (mode === 'generateContent') {
      const response = await ai.models.generateContent({
        model: rawModel.replace(/^models\//, ''),
        contents: [{ role: 'user', parts: [{ text: prompt.trim() }] }],
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
          temperature: temp,
          topP: p
        }
      });

      const candidates = response.candidates || [];
      const parts = (candidates[0] && candidates[0].content && candidates[0].content.parts) || [];
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          base64Data = part.inlineData.data;
          mimeType = part.inlineData.mimeType || mimeType;
        } else if (part.text) {
          textResponse += (textResponse ? '\n' : '') + part.text;
        }
      }
    } else {
      // Default: Interactions API (matching user's Java code with Client & interactions.create)
      const interaction = await ai.interactions.create({
        model: effectiveModel,
        input: prompt.trim(),
        generation_config: {
          temperature: temp,
          max_output_tokens: maxTokens,
          top_p: p
        },
        response_modalities: ['image', 'text']
      });

      // Parse interaction steps (matching Java step.asModelOutput().content())
      if (interaction && Array.isArray(interaction.steps)) {
        for (const step of interaction.steps) {
          if (step.type === 'model_output' && Array.isArray(step.content)) {
            for (const item of step.content) {
              if (item.type === 'text' && item.text) {
                textResponse += (textResponse ? '\n' : '') + item.text;
              }
              if (item.type === 'image' && item.data) {
                base64Data = item.data;
                mimeType = item.mime_type || mimeType;
              }
            }
          }
        }
      }

      // Check SDK helper output_image / output_text properties
      if (!base64Data && interaction && interaction.output_image && interaction.output_image.data) {
        base64Data = interaction.output_image.data;
        mimeType = interaction.output_image.mime_type || mimeType;
      }
      if (!textResponse && interaction && interaction.output_text) {
        textResponse = interaction.output_text;
      }
    }

    if (!base64Data) {
      return res.status(500).json({
        error: 'Model không trả về dữ liệu hình ảnh (chỉ trả về text hoặc rỗng).',
        textResponse
      });
    }

    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    return res.json({
      success: true,
      imageUrl: dataUrl,
      rawBase64: base64Data,
      mimeType,
      text: textResponse,
      model: effectiveModel
    });

  } catch (err) {
    console.error('[HTTP Debug Image] Error:', err);
    let status = err.status || err.statusCode || 500;
    let errMsg = err.message || 'Lỗi khi gọi API Gemini';

    if (status === 429 && (errMsg.includes('limit: 0') || errMsg.includes('RESOURCE_EXHAUSTED'))) {
      errMsg = 'Quota hết hoặc dự án chưa bật billing: Model image generation yêu cầu Google Cloud Project bật Billing (Tier trả phí). Xem: https://console.cloud.google.com/billing';
    } else if (status === 429) {
      errMsg = 'Gọi API quá nhanh (Rate limit 429). Vui lòng thử lại sau giây lát.';
    } else if (status === 404) {
      errMsg = 'Model không tồn tại hoặc chưa được hỗ trợ trên API key này (404).';
    } else if (status === 403) {
      errMsg = 'API Key không có quyền truy cập model này (403 Forbidden).';
    }

    return res.status(status).json({
      error: errMsg,
      originalError: err.message,
      details: err.error || null
    });
  }
});


app.get('/api/progress/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions[sessionId];
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

app.get('/api/video/:sessionId', (req, res) => {
  const file = path.join(outputDir, req.params.sessionId, 'output.mp4');
  if (!fs.existsSync(file)) {
    return res.status(404).send('Video not found');
  }
  res.sendFile(file);
});

app.get('/download/:sessionId/:filename', (req, res) => {
  const file = path.join(outputDir, req.params.sessionId, req.params.filename);
  res.download(file);
});

app.get('/api/debug-openai', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const isPlaceholder = !apiKey || apiKey.startsWith('sk-test-key') || apiKey === '';

  // Check if local faster-whisper is installed
  const hasLocalWhisper = await new Promise((resolve) => {
    const { exec } = require('child_process');
    const pythonPath = process.env.PYTHON_PATH || 'python';
    exec(`"${pythonPath}" -c "import faster_whisper"`, (err) => {
      resolve(!err);
    });
  });

  if (isPlaceholder) {
    if (hasLocalWhisper) {
      return res.json({
        status: 'placeholder',
        message: 'Local Whisper (Offline)',
        details: 'OpenAI API key is missing, but local Faster-Whisper is installed and active! Voice recognition will run 100% locally on your computer with real timestamps.'
      });
    } else {
      return res.json({
        status: 'placeholder',
        message: 'Simulation (Offline Mode)',
        details: 'OpenAI API key is missing. Run "pip install faster-whisper" in your terminal to enable high-fidelity local voice recognition offline.'
      });
    }
  }

  try {
    const axios = require('axios');
    // Call the lightweight models endpoint to test API key validity and network reachability
    const response = await axios.get('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 8000 // 8s timeout
    });

    if (response.status === 200) {
      return res.json({
        status: 'active',
        message: 'Active (Whisper Online)',
        details: `Key is valid. OpenAI returned ${response.data.data ? response.data.data.length : 0} available models.`
      });
    }
  } catch (error) {
    let errMsg = error.message;
    let details = 'Failed to connect to OpenAI endpoints.';
    let is401 = false;

    if (error.response) {
      if (error.response.status === 401) {
        is401 = true;
        errMsg = 'Invalid API Key (401 Error)';
        details = 'The API key provided was rejected by OpenAI (401 Unauthorized). Please check your credentials in .env.';
      } else {
        errMsg = `OpenAI returned status ${error.response.status}`;
        details = JSON.stringify(error.response.data || {});
      }
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      errMsg = 'Connection Timed Out';
      details = 'Could not reach api.openai.com. Check your internet connection or firewall rules.';
    }

    if (hasLocalWhisper) {
      errMsg += ' (Local Backup Active)';
      details += ' [Note: Local Faster-Whisper is installed and will be used as a high-fidelity backup!]';
    } else {
      details += ' [Tip: Run "pip install faster-whisper" to enable high-fidelity local voice recognition when offline/error.]';
    }

    return res.json({
      status: 'error',
      message: errMsg,
      details: details,
      is401
    });
  }
});


app.get('/api/debug-gemini', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const isPlaceholder = !apiKey || apiKey.trim() === '';

  if (isPlaceholder) {
    return res.json({
      status: 'placeholder',
      message: 'Gemini Offline (No Key)',
      details: 'GEMINI_API_KEY is missing in your .env file. Please add your Gemini API Key to enable the AI Script Assistant.'
    });
  }

  try {
    const axios = require('axios');
    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await axios.get(testUrl, {
      timeout: 8000
    });

    if (response.status === 200) {
      return res.json({
        status: 'active',
        message: 'Active (Gemini Online)',
        details: `Key is valid. Google returned ${response.data.models ? response.data.models.length : 0} available models.`
      });
    }
  } catch (error) {
    let errMsg = error.message;
    let details = 'Failed to connect to Google Gemini API.';
    let is400 = false;

    if (error.response) {
      if (error.response.status === 400 || error.response.status === 403) {
        is400 = true;
        errMsg = 'Invalid API Key (400/403 Error)';
        details = 'The API key provided was rejected by Google Gemini. Please check your GEMINI_API_KEY in your .env file.';
      } else {
        errMsg = `Gemini returned status ${error.response.status}`;
        details = JSON.stringify(error.response.data || {});
      }
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      errMsg = 'Connection Timed Out';
      details = 'Could not reach generativelanguage.googleapis.com. Check your internet connection or firewall rules.';
    }

    return res.json({
      status: 'error',
      message: errMsg,
      details: details,
      is400
    });
  }
});

// ── YouTube Integration Endpoints ──────────────────────────────────────────

const youtubeUploadJobs = {};

app.get('/api/youtube/status', async (req, res) => {
  try {
    const authenticated = youtubeService.checkAuthStatus();
    let channel = null;
    if (authenticated) {
      channel = await youtubeService.getChannelInfo();
    }
    res.json({ authenticated, channel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Hỗ trợ cả /api/youtube/auth và /api/youtube/auth-url
const handleAuthUrl = (req, res) => {
  try {
    const url = youtubeService.getAuthUrl();
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
app.get('/api/youtube/auth', handleAuthUrl);
app.get('/api/youtube/auth-url', handleAuthUrl);

app.get('/oauth2callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    if (error) {
      return res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Lỗi OAuth</title></head><body style="background:#0f172a;color:#f87171;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>❌ Lỗi xác thực YouTube: ${error}</h2><p>Vui lòng thử lại.</p></div></body></html>`);
    }
    if (!code) {
      return res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Lỗi OAuth</title></head><body style="background:#0f172a;color:#f87171;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>❌ Không tìm thấy authorization code</h2></div></body></html>`);
    }
    await youtubeService.handleCallback(code);
    return res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Kết nối YouTube thành công</title></head><body style="background:#0f172a;color:#38bdf8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2 style="color:#4ade80;">✅ Kết nối tài khoản YouTube thành công!</h2><p style="color:#94a3b8;">Cửa sổ này sẽ tự động đóng sau giây lát...</p></div><script>if (window.opener) { window.opener.postMessage('youtube_auth_success', '*'); setTimeout(() => window.close(), 1200); } else { setTimeout(() => { window.location.href = '/?youtube=connected'; }, 1500); }</script></body></html>`);
  } catch (err) {
    console.error('OAuth Callback Error:', err);
    return res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Lỗi OAuth</title></head><body style="background:#0f172a;color:#f87171;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>❌ Lỗi: ${err.message}</h2></div></body></html>`);
  }
});

app.post('/api/youtube/logout', (req, res) => {
  try {
    youtubeService.logout();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/youtube/videos', (req, res) => {
  try {
    if (!fs.existsSync(outputDir)) {
      return res.json({ videos: [] });
    }
    const entries = fs.readdirSync(outputDir, { withFileTypes: true });
    const videos = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const videoFile = path.join(outputDir, entry.name, 'output.mp4');
        if (fs.existsSync(videoFile)) {
          const stats = fs.statSync(videoFile);
          const session = sessions[entry.name];
          let title = `Video ${entry.name}`;
          let metadata = null;
          if (session && session.metadata) {
            metadata = session.metadata;
            if (metadata.title) title = metadata.title;
          }

          videos.push({
            sessionId: entry.name,
            title: title,
            filename: 'output.mp4',
            videoUrl: `/download/${entry.name}/output.mp4`,
            sizeMb: (stats.size / (1024 * 1024)).toFixed(1),
            createdAt: stats.mtime.toISOString(),
            metadata: metadata
          });
        }
      }
    }

    videos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ videos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/youtube/upload', async (req, res) => {
  try {
    const { sessionId, title, description, tags, privacyStatus, publishAt } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Thiếu sessionId của video.' });
    }

    const videoPath = path.join(outputDir, sessionId, 'output.mp4');
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Không tìm thấy file output.mp4 của session này.' });
    }

    const jobId = `yt-upload-${Date.now()}`;
    youtubeUploadJobs[jobId] = {
      id: jobId,
      sessionId,
      title: title || 'Video AI',
      progress: 0,
      status: 'uploading',
      error: null,
      result: null,
      publishAt: publishAt || null,
      createdAt: new Date().toISOString()
    };

    youtubeService.uploadVideo(videoPath, {
      title,
      description,
      tags,
      privacyStatus,
      publishAt
    }, (progress) => {
      if (youtubeUploadJobs[jobId]) {
        youtubeUploadJobs[jobId].progress = progress;
      }
    }).then((result) => {
      if (youtubeUploadJobs[jobId]) {
        youtubeUploadJobs[jobId].status = 'completed';
        youtubeUploadJobs[jobId].progress = 100;
        youtubeUploadJobs[jobId].result = result;
        youtubeUploadJobs[jobId].videoId = result.id;
      }
    }).catch((err) => {
      console.error(`[YouTube Upload Job ${jobId}] Failed:`, err);
      if (youtubeUploadJobs[jobId]) {
        youtubeUploadJobs[jobId].status = 'failed';
        youtubeUploadJobs[jobId].error = err.message;
      }
    });

    res.status(202).json({
      success: true,
      jobId,
      message: 'Upload video lên YouTube đã bắt đầu.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/youtube/upload-progress/:jobId', (req, res) => {
  const job = youtubeUploadJobs[req.params.jobId];
  if (!job) {
    return res.status(404).json({ error: 'Không tìm thấy job upload.' });
  }
  res.json(job);
});

app.get('/api/youtube/history', (req, res) => {
  try {
    const history = youtubeService.getHistory();
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

// Global error handlers to prevent server crash
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Optionally restart or log to external service
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📍 SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});
