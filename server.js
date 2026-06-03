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

const app = express();

// In-memory store for session progress
const sessions = {};

async function processVideoBackground(sessionId, files, sessionDir) {
  try {
    const { audio, script, images } = files;
    const audioPath = audio[0].path;
    const scriptPath = script[0].path;

    // Parse the script first (very fast) so we have scene texts available for the Whisper fallback
    const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
    const scenes = scriptParser.parseScript(scriptContent);
    const sceneTexts = scenes.map(s => s.text);

    // Step 1: Extract timestamps from audio
    console.log(`[Session ${sessionId}] Step 1: Extracting timestamps...`);
    sessions[sessionId].currentStep = 'step-whisper';
    sessions[sessionId].progress = 5;
    
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
    sessions[sessionId].progress = 25;

    // Step 2: Parse script (already parsed, just update progress and UI)
    console.log(`[Session ${sessionId}] Step 2: Parsing scenes...`);
    sessions[sessionId].currentStep = 'step-parse';
    sessions[sessionId].progress = 28;
    sessions[sessionId].statusMessage = `Identified ${scenes.length} scenes from script.`;
    sessions[sessionId].progress = 30;

    // Step 3: Generate timeline
    console.log(`[Session ${sessionId}] Step 3: Generating timeline...`);
    sessions[sessionId].currentStep = 'step-timeline';
    sessions[sessionId].progress = 32;
    sessions[sessionId].statusMessage = 'Generating matching scene timeline...';
    
    const timeline = timelineGenerator.generateTimeline(scenes, timestamps, images);
    sessions[sessionId].progress = 35;

    // Step 4: Generate subtitles
    console.log(`[Session ${sessionId}] Step 4: Generating subtitles...`);
    sessions[sessionId].currentStep = 'step-subtitle';
    sessions[sessionId].progress = 38;
    sessions[sessionId].statusMessage = 'Creating subtitle track...';
    
    const srtPath = path.join(sessionDir, 'subtitle.srt');
    // Use timeline (scene-level) for SRT so subtitle transitions match image scene transitions exactly.
    subtitleGenerator.generateSRT(timeline, srtPath);
    sessions[sessionId].progress = 40;

    // Step 5: Render video
    console.log(`[Session ${sessionId}] Step 5: Rendering video with FFmpeg...`);
    sessions[sessionId].currentStep = 'step-ffmpeg';
    sessions[sessionId].statusMessage = 'Rendering final video with FFmpeg...';
    
    const outputPath = path.join(sessionDir, 'output.mp4');
    await ffmpegRenderer.renderVideo(timeline, audioPath, srtPath, outputPath, (ffmpegProgress) => {
      if (ffmpegProgress.step === 'rendering_scene') {
        const percent = Math.round((ffmpegProgress.current / ffmpegProgress.total) * 50); // scales from 0 to 50
        sessions[sessionId].progress = 40 + percent;
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
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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

    if (audioFiles.length === 0 || scriptFiles.length === 0 || imageFiles.length === 0) {
      return res.status(400).json({ error: 'Missing required files: audio, script, or images' });
    }

    const sessionId = Date.now().toString();
    const sessionDir = path.join(outputDir, sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    sessions[sessionId] = {
      status: 'processing',
      progress: 0,
      currentStep: 'step-whisper',
      statusMessage: 'Starting video creation...',
      error: null,
      videoUrl: null
    };

    const files = {
      audio: audioFiles,
      script: scriptFiles,
      images: imageFiles
    };

    // Start background processing
    processVideoBackground(sessionId, files, sessionDir);

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
