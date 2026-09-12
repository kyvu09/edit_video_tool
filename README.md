<div align="center">
  <h1>🎬 Edit Video Tool - End-to-End AI Video Production & YouTube Publishing Pipeline</h1>
  <p><i>A complete, automated workflow: Content Extraction → Scene Script Writing → AI Voice Synthesis (VieNeu 48kHz / Kokoro / Voice Cloning & Local Saving) → AI Image Generation → Smart Background Removal → Dynamic Karaoke Subtitles → Cinematic Video Rendering → SEO-Optimized YouTube Publishing.</i></p>

  <p>
    <img src="https://img.shields.io/badge/Node.js-18%2B-green.svg" alt="Node.js" />
    <img src="https://img.shields.io/badge/Python-3.10--3.12-blue.svg" alt="Python" />
    <img src="https://img.shields.io/badge/Local%20TTS-VieNeu%2048kHz-purple.svg" alt="VieNeu TTS" />
    <img src="https://img.shields.io/badge/Voice%20Cloning-Zero--shot%203--8s-indigo.svg" alt="Voice Cloning" />
    <img src="https://img.shields.io/badge/Kokoro%20TTS-English%20Offline-teal.svg" alt="Kokoro TTS" />
    <img src="https://img.shields.io/badge/FFmpeg-Enabled-orange.svg" alt="FFmpeg" />
    <img src="https://img.shields.io/badge/Gemini%20AI-Integrated-red.svg" alt="Gemini AI" />
    <img src="https://img.shields.io/badge/License-MIT-brightgreen.svg" alt="License" />
  </p>
</div>

---

## 📌 Overview

**Edit Video Tool** is a powerful all-in-one AI production suite built for content creators, YouTubers, TikTokers, and digital media producers. It seamlessly integrates cutting-edge AI models (**VieNeu-TTS 48kHz**, **Kokoro TTS**, **Google Gemini AI**, **Faster-Whisper**) with **FFmpeg** graphic processing and computer vision algorithms (**Rembg**, **Color-to-Alpha**) to fully automate video editing—from raw ideas to YouTube-ready videos.

Crucially, the system features a **100% Offline Local TTS Engine** (completely eliminating ElevenLabs API dependency), granting unlimited, studio-grade voice generation with zero ongoing API costs.

---

## ✨ Full Feature Highlights

### 1. ✍️ AI Script Assistant & YouTube Content Extractor
- **YouTube Transcript Extraction**: Paste any YouTube video URL to automatically extract its core transcript and content.
- **Automated Scene Breakdown**: Uses **Google Gemini** to intelligently partition raw text into structured scenes (`SCENE 1`, `SCENE 2`,...) with natural narrative pacing.
- **Detailed Image Prompts**: Automatically generates rich, photographer-grade English prompts for Midjourney, WhiskLab, Stable Diffusion, and DALL-E.
- **SEO Metadata Generation**: Generates high-CTR **video titles**, **compelling descriptions**, and trending **tags/hashtags** optimized for YouTube and TikTok algorithms.
- **Quick Export**: One-click copy for prompts and direct download of `.txt` structured scripts.

### 2. ⚡ Google Flow Automation
- **Flow Bot Integration**: Automates opening Google Flow (`labs.google/fx/vi/tools/flow/`), creating new canvas projects, pasting prompts via clipboard, and simulating keystrokes (`robotjs`) for rapid batch image generation.

### 3. 🎙️ 100% Offline Local TTS Engine & Voice Cloning
> *ElevenLabs API has been completely removed — Zero subscription fees, no character limits, runs directly on CPU via ONNX Runtime.*

- 💻 **Local TTS (VieNeu-TTS v3 Turbo - 48kHz Studio Quality)** `[Recommended for Vietnamese]`:
  - Trained on **10,000+ hours of Vietnamese speech data**, delivering 100% natural tones, intonation, and diacritics.
  - Default voice: **Minh Quân** (authoritative, warm Northern male voice, ideal for news/reviews).
  - **Dropdown Menu of 23 Regional Voices (North - Central - South)**:
    - *Northern*: Minh Quân, Minh Đức, Phạm Tuyên, Mai Anh, Quỳnh Anh, Trúc Ly, Thanh Bình, Anh Khôi, Mạnh Dũng...
    - *Southern*: Thái Sơn, Thùy Dung, Mỹ Duyên, Minh Triết, Đức Trí, Adam...
    - *Central*: Quang Sơn, Ngọc Trân.
  - **🧬 Toggle Button (`btn-toggle-clone`)**: Keeps the UI sleek and compact by default; expands only when requested, with an active badge indicator when an audio file is loaded.
  - **Instant Zero-shot Voice Cloning (3–8s Audio)**: Clones anyone's voice from a short 3–8 second sample.
  - **Universal Audio Decoding**: Automatically converts mobile voice notes (`.m4a`, `.aac`), `.mp3`, `.ogg`, `.webm`, and `.wav` into standard PCM WAV via FFmpeg before synthesis.
  - **💾 Local Voice Saving & Persistent Management**:
    - Assign custom names and save cloned voices permanently to `uploads/cloned_voices/`.
    - Saved voices automatically populate the top of the voice menu under **`⭐ Giọng Đã Lưu Của Bạn` (Your Saved Voices)**. Select it anytime without re-uploading sample audio.
    - Built-in **⚙️ Manage Saved Voices Modal**: View your saved voice library, select for instant use, or delete audio files with one click.
- 🌐 **Kokoro TTS (English / Multilingual)**:
  - High-speed, natural English voice generation (`af_heart`, `af_bella`, `am_adam`, `bf_emma`...).
  - Ultra-lightweight ONNX model, synthesizes long scripts in ~3 seconds offline.
- 🇻🇳 **Viettel AI**: Retained as an optional cloud-based fallback.
- **Built-in Audio Preview**: Real-time browser audio playback, download as `.wav`/`.mp3`, or attach directly to the Video Creation pipeline with one click.

### 4. 🖼️ AI Scene Image Generator
- **Prompt-to-Image Generation**: Directly integrates **Google Gemini Image API** (`gemini-2.5-flash-image`, `gemini-3.1-flash-image`, `gemini-3.1-flash-lite-image`).
- **Batch Queue Processing**: Sequentially queues and processes scene prompts with live progress updates.
- **Smart Image Caching**: Computes SHA-256 hashes of prompts; duplicate scenes reuse cached images instantly without unnecessary API calls.
- **Batch ZIP Download**: Export all generated scene images as a `.zip` archive via JSZip.

### 5. ✂️ Professional Background Removal & Compositing
- **Dual-Mode Background Keying**:
  - 🖌️ **White-key Mode (Color-to-Alpha)**: Proprietary algorithm with *Adaptive Illumination Correction* and *Two-Threshold Min-RGB Keying*, stripping pure white/drawing paper backgrounds while preserving pencil strokes and watercolor textures.
  - 🤖 **AI Mode (Rembg)**: Deep learning neural network for segmenting real human/object subjects, with *Erosion & Gaussian Feathering* to prevent fringe artifacts.
- **Automated Compositing**: Overlays transparent foreground subjects onto background images matching the target aspect ratio and safe title zones.
- **Visual Debugger Tool (`/debug.html`)**: Dedicated diagnostic page to upload foreground/background images, tune threshold sliders in real-time, inspect alpha channels, and preview on a transparent checkerboard grid.

### 6. ⏱️ Whisper AI Speech Recognition & Timeline Synchronization
- **Triple-layer Failover Architecture**:
  1. 💻 **Faster-Whisper Offline**: Runs locally using Python (`faster-whisper`), extracting millisecond-accurate word timestamps (`word_timestamps`) without API costs.
  2. 🌐 **OpenAI Whisper API (`whisper-1`)**: Cloud transcription fallback if configured.
  3. ⚙️ **Character Simulation Fallback**: Heuristic character-based timing ensuring video creation never fails under unexpected errors.

### 7. 📝 Dynamic Word-by-Word Karaoke Subtitles
- **Needleman-Wunsch Alignment**: Aligns original script punctuation and spelling with speech recognition timestamps.
- **Advanced SubStation Alpha (ASS) Format**: Crisp, anti-aliased rendering with customizable outlines, shadows, and screen margins.
- **Word-Level Highlighting**: Words dynamically illuminate (gold/orange) in sync with voice narration.
- **Responsive Layout**: Smart word-wrapping according to 16:9 and 9:16 aspect ratios.

### 8. 🎥 Cinematic FFmpeg Video Renderer
- **Multiple Aspect Ratios**:
  - 📺 **16:9 (1920x1080)**: Standard widescreen for YouTube, Facebook, and Web video.
  - 📱 **9:16 (1080x1920)**: Vertical orientation for TikTok, YouTube Shorts, and Instagram Reels.
- **Cinematic Visual Effects**:
  - Smooth **Ken Burns Zoom-out** motion across each scene.
  - Soft **Crossfade Dissolve** transitions between consecutive scenes.
- **Background Music (BGM)**:
  - Upload audio tracks (`.mp3`, `.wav`, `.ogg`, `.m4a`).
  - Audio mixing slider (0% - 100%) to balance background music under voiceover.
- **Speed Adjustment**: Scalable playback speed from **0.5x to 2.0x** using `atempo` and PTS scaling without audio pitch distortion or subtitle desynchronization.
- **Hardcoded Subtitles**: Burned in with `libass` for universal playback across all mobile and desktop devices.

### 9. 📺 Automated YouTube Publishing (SEO Optimized)
- **Secure Google OAuth 2.0**: One-click Google sign-in with automatic token refresh.
- **Automated SEO Fields**: Pre-fills video title, description, tags, and timestamps generated by Gemini.
- **Privacy Controls**: Choose Public, Unlisted, or Private status.
- **Real-Time Upload Progress**: Live percentage indicators during YouTube video transfer.

---

## 📐 Pipeline Architecture

```
[ Data Ingestion ]
  ├─ Raw Script / YouTube URL ───► [ Gemini AI ] ────────────► Scene Breakdown, Prompts & SEO Metadata
  ├─ Scene Dialogue Text ────────► [ Local TTS (VieNeu/Kokoro) ] ► 48kHz Audio / Cloned & Saved Voice (100% Offline)
  │                                       ▲
  │                                  [ 3-8s Sample (WAV/M4A/MP3) / Saved Local Voice ]
  └─ Visual Prompts ─────────────► [ Gemini Image / Midjourney ] ─► Scene Image List

                                           │
                                           ▼
[ Visual & Audio Processing ]
  ├─ Scene Images + Background ──► [ Rembg / White-key ] ────────► Composited Frames
  └─ Voiceover Audio ────────────► [ Faster-Whisper / OpenAI ] ──► Word-level Timestamps

                                           │
                                           ▼
[ Synchronization & Composition ]
  ├─ Script + Timestamps ────────► [ Needleman-Wunsch ] ─────────► Karaoke Subtitles (.ass)
  ├─ Images + Audio + BGM ───────► [ FFmpeg Engine ] ────────────► Ken Burns Zoom, Crossfade, Audio Mix
                                           │
                                           ▼
[ Delivery & Publishing ]
  ├─ Rendered MP4 Video ─────────► [ In-Browser Preview & Direct Download ]
  └─ OAuth 2.0 + SEO Metadata ──► [ YouTube Data API v3 ] ───────► Published to YouTube!
```

---

## 🛠️ Installation & Setup

### 1. Prerequisites
- **Node.js**: Version 18 or higher (v20 LTS recommended).
- **Python**: Version 3.10 – 3.12 (Python 3.12 recommended; ensure `python` is added to system `PATH`).
- **FFmpeg & FFprobe**: Installed and accessible in system `PATH`.
  - *Verify in Terminal*: `ffmpeg -version` and `ffprobe -version`.

---

### 2. Installation Steps

#### Step 1: Clone Repository & Install Node Dependencies
```bash
git clone https://github.com/kyvu09/edit_video_tool.git
cd edit_video_tool
npm install
```

#### Step 2: Set Up Python Virtual Environment & AI Packages
```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment:
# On Windows:
.venv\Scripts\activate
# On macOS / Linux:
source .venv/bin/activate

# Install AI models and audio/image processing libraries:
pip install rembg pillow numpy scipy soundfile onnxruntime
pip install vieneu kokoro-onnx
pip install faster-whisper torch
```

---

### 3. Environment Configuration (`.env`)

Create a `.env` file in the root directory (refer to `.env.example`):

```env
# ── Server Configuration ──
PORT=3000
NODE_ENV=development

# ── Python & FFmpeg Executable Paths ──
# Windows example: C:\personal_kyvu\CODE\editVideoTool\.venv\Scripts\python.exe
PYTHON_PATH=.venv/Scripts/python.exe
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe

# ── Local Faster-Whisper (Speech Recognition & Karaoke Timestamps) ──
# Model sizes: tiny | base | small | medium | large-v3 (Recommended: small)
LOCAL_WHISPER_MODEL=small

# ── OpenAI API (Optional: only needed if using Cloud Whisper API) ──
OPENAI_API_KEY=

# ── Google Gemini AI (Script breakdown, SEO metadata & image generation) ──
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-3.5-flash
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image

# ── Text-to-Speech (TTS) Providers ──
# Viettel AI TTS (Optional fallback)
VIETTEL_AI_TOKEN=your_viettel_ai_token_here

# Local TTS (VieNeu & Kokoro) runs 100% offline, NO API keys or tokens required!

# ── Google OAuth 2.0 (For YouTube Auto-Upload) ──
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
```

---

### 4. Running the Application

```bash
# Start server:
npm start

# Or in development mode (with auto-reload):
npm run dev
```

Open your browser and navigate to: **[http://localhost:3000](http://localhost:3000)**

---

## 📖 Step-by-Step Usage Guide

### Step 1: Draft Your Script (Tab 1)
1. Paste a reference YouTube video URL (or enter your raw topic idea into the **Raw Script** box).
2. Click **✨ Generate Scenes With AI**: The system breaks the text into scenes with visual prompts and natural narration.
3. Click **📋 Generate Title & Description**: Produces high-CTR SEO metadata.
4. Click **⚡ Fill into Video Form** or download the `.txt` script.

### Step 2: Generate Voiceover Audio (Tab 2)
1. Click **⟵ Load from Script Assistant** to auto-fill the script text.
2. Choose your voice provider:
   - **💻 Local TTS (VieNeu)**: Native Vietnamese 48kHz (100% Offline, $0 cost).
     - *Use preset voices*: Choose from 23 regional voices (Minh Quân, Mai Anh, Quỳnh Anh, Thái Sơn...).
     - *Use saved custom voices*: Select from the **`⭐ Giọng Đã Lưu Của Bạn`** category.
     - *Clone & save a new voice*: Click **`🧬 Clone Giọng Mới (Tải audio 3–8s) ▼`**, drop any sample audio (including phone `.m4a` recordings), enter a voice name, and click **`💾 Lưu Giọng`**.
   - **🌐 Kokoro TTS**: Selected for international English videos (natural US/UK voices like `af_heart`, `am_adam`).
   - **🇻🇳 Viettel AI**: Optional cloud fallback.
3. Click **🎙️ Generate Audio Now**: Listen to the preview and click **⚡ Use for Video Creation**.

### Step 3: Prepare Scene Images
- Generate images using the prompts from Step 1 (via external tools or the built-in Gemini Image Generator).
- Name image files matching scene order: `scene1.png`, `scene2.png`, etc.

### Step 4: Render Video (Tab 3)
1. **Inputs**:
   - Voiceover audio (`.wav` or `.mp3`).
   - Scene script (`.txt`).
   - Scene images (`.png`, `.jpg`).
2. **Background & Effects**:
   - Upload an optional background image and select keying mode:
     - `whitekey`: For hand-drawn sketches, doodles, and white-paper art.
     - `rembg`: For real-world photographs of people and objects.
   - Upload background music (BGM) and adjust volume slider.
3. **Render Settings**:
   - Choose aspect ratio: **16:9** (landscape) or **9:16** (vertical Shorts/TikTok).
   - Adjust video speed (**0.5x to 2.0x**).
   - Enable **Karaoke Subtitle Effect**.
4. Click **🚀 Start Creating Video** and monitor real-time progress.

### Step 5: Preview & Upload to YouTube (Tab 4)
1. Preview the rendered video in the browser.
2. Download the MP4 file via **⬇️ Download Video**.
3. In the YouTube upload panel:
   - Click **🔗 Connect YouTube** and authenticate with Google OAuth.
   - Set visibility (Public / Unlisted / Private) and click **▶️ Upload to YouTube**.

---

## 🔧 Visual Debugger Tool

The project includes an interactive background removal debugger at: **[http://localhost:3000/debug.html](http://localhost:3000/debug.html)**
- Upload foreground and background images.
- Toggle between `whitekey` and `rembg` algorithms.
- Tune the white-removal threshold slider in real-time.
- Inspect pixel borders against a transparent checkerboard background.

---

## 📝 Common Troubleshooting

- **`Warning: You are sending unauthenticated requests to the HF Hub`**:
  - This is an informative notice from Hugging Face Hub during first-time initialization. It is harmless and has been filtered out from application logs.
- **Phone audio recordings (`.m4a`) format error**:
  - The built-in audio normalizer uses FFmpeg to automatically convert all audio formats (`.m4a`, `.mp3`, `.aac`, `.webm`, `.wav`) to standard PCM WAV before feeding to VieNeu. Ensure FFmpeg is installed and added to `PATH`.
- **`faster-whisper is not installed`**:
  - Install it in your virtual environment: `.\.venv\Scripts\pip.exe install faster-whisper`.
- **`ffmpeg: command not found`**:
  - Ensure FFmpeg is installed and its `bin` folder is added to the system `PATH`. Alternatively, configure the direct executable path in `.env`: `FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe`.
- **Python virtualenv path issues**:
  - Confirm that `PYTHON_PATH` in `.env` points to the Python binary inside `.venv` (e.g. `PYTHON_PATH=C:\personal_kyvu\CODE\editVideoTool\.venv\Scripts\python.exe`).
- **`redirect_uri_mismatch` during YouTube OAuth**:
  - In your Google Cloud Console, add this exact redirect URI: `http://localhost:3000/oauth2callback`.

---

## ☕ Support the Developer (Donate)

This project is **100% open-source and free**. If this tool saves you hours of video production work, consider buying the author a coffee! ❤️

* **Military Commercial Joint Stock Bank (MBBank):**
  - **Account Number:** `0338187302`
  - **Account Name:** `VU MANH KY`

---

## 📄 License

Distributed under the **MIT License**. Free for personal and commercial use.

---
<div align="center">
  <i>Crafted with ❤️ by <b>kyvu09</b> — Empowering AI-driven video creation!</i>
</div>