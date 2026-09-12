# 🚀 Quickstart Guide - Edit Video Tool

Welcome to **Edit Video Tool**! This quickstart guide will get you up and running to render your very first AI video in **under 5 minutes**.

---

## ⚡ 1. Prerequisites

Ensure your machine has the following tools installed:
1. **Node.js 18+** (Download from [nodejs.org](https://nodejs.org/)).
2. **Python 3.10 – 3.12** (Python 3.12 recommended; ensure *"Add python.exe to PATH"* is checked during Windows setup).
3. **FFmpeg**: Installed and accessible in your system `PATH`.
   - Verify on Terminal / PowerShell:
     ```bash
     ffmpeg -version
     ```
   - On Windows, install via winget: `winget install Gyan.FFmpeg` or download from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/).
   - On macOS: `brew install ffmpeg` | On Ubuntu/Debian: `sudo apt install ffmpeg`.

---

## 📦 2. 3-Step Installation

### Step 1: Install Node Dependencies
Open a terminal in the project directory:
```bash
npm install
```

### Step 2: Create Python Virtual Environment & Install AI Packages
```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment:
# On Windows:
.venv\Scripts\activate
# On macOS / Linux:
source .venv/bin/activate

# Install AI models, audio processing, and Local TTS libraries:
pip install rembg pillow numpy scipy soundfile onnxruntime
pip install vieneu kokoro-onnx
pip install faster-whisper torch
```

### Step 3: Configure `.env` File
Create a `.env` file in the project root directory (or copy from `.env.example`):
```env
PORT=3000
NODE_ENV=development

# Python executable inside your virtual environment
PYTHON_PATH=.venv/Scripts/python.exe
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe

# Offline Whisper speech recognition model (tiny | base | small | medium)
LOCAL_WHISPER_MODEL=small

# Google Gemini API Key (for script breakdown, SEO metadata, and image generation)
GEMINI_API_KEY=your_gemini_api_key_here
```
> 💡 *Tip: Get a free Gemini API Key at [aistudio.google.com](https://aistudio.google.com/app/apikey)*

---

## 🎬 3. Start the Server

Launch the application:
```bash
npm start
```
Open your browser and visit: **[http://localhost:3000](http://localhost:3000)**

---

## 🎯 4. 4-Step Walkthrough to Your First Video

### 📝 Step 1: Create a Script (Tab 1: "Trợ Lý Kịch Bản")
1. Enter your topic idea or paste a draft in the **Raw Script** box.
2. Click **✨ Generate Scenes With AI**.
3. Gemini AI will automatically:
   - Split your story into scenes (`SCENE 1`, `SCENE 2`,...).
   - Produce photographer-grade English prompts for visual generation.
   - Click **📋 Generate Title & Description** to create YouTube SEO metadata.
4. Click **⚡ Fill into Video Form** to seamlessly transfer the script to subsequent tabs.

### 🎙️ Step 2: Generate AI Voiceover (Tab 2: "Tạo Audio AI")
1. Click **⟵ Load from Script Assistant** to populate the dialogue.
2. Choose your voice:
   - **Preset Voice**: Choose from 23 regional Vietnamese voices (e.g., *Minh Quân*, *Mai Anh*, *Thái Sơn*...).
   - **Clone Your Own Voice**:
     - Click **`🧬 Clone Giọng Mới (Tải audio 3–8s) ▼`**.
     - Drag and drop any 3–8s reference audio clip (supports `.m4a` from smartphones, `.mp3`, `.wav`).
     - Enter a name and click **`💾 Lưu Giọng`** to save it locally for future reuse.
3. Click **🎙️ Generate Audio Now** → Listen to the preview → Click **⚡ Use for Video Creation**.

### 🎨 Step 3: Prepare Scene Images
- Generate visuals using the prompts from Step 1 (via Midjourney, Leonardo, WhiskLab, or the built-in Gemini Image Generator).
- Name image files sequentially: `scene1.png`, `scene2.png`, `scene3.png`,...

### 🎥 Step 4: Render Your Video (Tab 3: "Render Video")
1. Audio and script files are pre-filled from Step 2.
2. Upload your scene images (`scene1.png`, `scene2.png`...).
3. Optional configurations:
   - Choose a background image and keying mode (`whitekey` for hand-drawn sketches / `rembg` for real-world photo cutouts).
   - Add background music (BGM) and adjust volume slider (~15% - 25%).
   - Select aspect ratio (**16:9** for standard YouTube or **9:16** for Shorts/TikTok).
   - Check **Enable Subtitle Karaoke Effect**.
4. Click **🚀 Start Creating Video**.
5. Within seconds, your final MP4 video with Ken Burns motion, crossfades, and synced Karaoke subtitles will be ready to preview and download!

---

## ❓ Need More Details?
- Read the in-depth user guide: [USAGE_GUIDE.md](USAGE_GUIDE.md)
- Interactive background removal debugger: [http://localhost:3000/debug.html](http://localhost:3000/debug.html)
