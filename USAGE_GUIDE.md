# 📖 Complete User Guide - Edit Video Tool

This comprehensive handbook explains every feature, architectural data flow, and optimization technique in **Edit Video Tool**.

---

## 📑 Table of Contents
1. [Request Lifecycle & Architecture](#1-request-lifecycle--architecture)
2. [Tab 1: AI Script Assistant & Content Extractor](#2-tab-1-ai-script-assistant--content-extractor)
3. [Tab 2: AI Voice Generation, Voice Cloning & Local Voice Storage](#3-tab-2-ai-voice-generation-voice-cloning--local-voice-storage)
4. [Tab 3: Cinematic Video Editing & FFmpeg Rendering](#4-tab-3-cinematic-video-editing--ffmpeg-rendering)
5. [Tab 4: Automated YouTube Publishing](#5-tab-4-automated-youtube-publishing)
6. [Visual Background Keying Debugger (`/debug.html`)](#6-visual-background-keying-debugger-debughmtl)
7. [Pro Tips & Frequently Asked Questions (FAQ)](#7-pro-tips--frequently-asked-questions-faq)

---

## 1. Request Lifecycle & Architecture

The application is architected as a hybrid pipeline combining **Node.js Express**, **Python Subprocesses**, and **FFmpeg Native Media Composition**:

```
[ BROWSER UI (Client) ]
   │
   ├─► 1. Raw Idea / YouTube URL ──────► [ Google Gemini AI ]
   │                                           │ (Generates SCENE script, Visual prompts, SEO)
   │                                           ▼
   ├─► 2. Voiceover Generation ────────► [ POST /api/tts ] ──► [ python/tts_local.py ]
   │      - Script text                        │                   │
   │      - Preset voice (Minh Quân...)        │                   ├─► FFmpeg audio normalizer
   │      - Reference audio (WAV/M4A/MP3)      │                   └─► VieNeu-TTS 48kHz (ONNX)
   │      - Or saved custom voice ID           ▼                           │
   │                                  Saved to uploads/cloned_voices/      ▼
   │                                                                 audio.wav (48kHz)
   │
   ├─► 3. Video Rendering Request ─────► [ POST /api/upload-and-create ]
   │      - audio.wav                          │
   │      - script.txt                         ├─► Faster-Whisper: Word-level timestamps extraction
   │      - scenes/*.png                       ├─► Needleman-Wunsch: Dynamic alignment with script
   │      - background.png                     ├─► Rembg / White-key: Foreground subject isolation
   │      - bgm.mp3                            ├─► Subtitle Generator: Dynamic subtitle.ass (Karaoke)
   │                                           └─► FFmpeg Engine: Ken Burns Zoom, Crossfade, Audio Mix
   │                                                       │
   │                                                       ▼
   │                                                 output.mp4 ready
   ▼
   4. Video Publishing ────────────────► [ Google OAuth 2.0 ] ──► YouTube Data API v3
```

---

## 2. Tab 1: AI Script Assistant & Content Extractor

Turn raw ideas or reference YouTube videos into structured production-ready scripts.

### 2.1. YouTube Transcript Extraction
- Paste any YouTube link (e.g., `https://www.youtube.com/watch?v=...`) into the **YouTube Video Link** input.
- Click **🔍 Extract Script**.
- The system extracts the transcript and loads it directly into the script editor.

### 2.2. Automated Scene Breakdown
- Enter or edit your script in the **Raw Script** area.
- Click **✨ Generate Scenes With AI**:
  - **Google Gemini** parses narrative context into scenes formatted as:
    ```
    SCENE 1
    Spoken dialogue or narrative commentary for scene 1.

    SCENE 2
    Subsequent narrative commentary for scene 2.
    ```
  - Under each scene, Gemini produces a **photographer-grade English prompt** specifying artistic style, lighting, composition, and framing.
- Handy utilities:
  - **Copy**: Copy prompt for an individual scene to paste into Midjourney, Leonardo AI, or WhiskLab.
  - **Copy All Prompts**: Copy all prompts at once.
  - **Download Script (.txt)**: Export a clean, structured script file.

### 2.3. SEO Metadata Generation
- Click **📋 Generate Title & Description**:
  - Generates **3 high-CTR titles** designed to maximize click-through rate.
  - Generates an engaging **video description** with timestamp chapter placeholders.
  - Produces trending **tags and hashtags** for YouTube and TikTok.
- Click **⚡ Fill into Video Form** to auto-sync the script to Tabs 2 and 3.

---

## 3. Tab 2: AI Voice Generation, Voice Cloning & Local Voice Storage

Powered by an independent **100% Offline Local TTS Engine**, with no ElevenLabs subscription fees or monthly character quotas.

### 3.1. Available Voice Engines

| Engine | Primary Strength | Language | Runtime |
|---|---|---|---|
| **VieNeu-TTS (48kHz)** `[Default]` | Natural intonation, precise Vietnamese accents and diacritics | Vietnamese | 100% Offline ONNX, 23 regional voices + instant cloning |
| **Kokoro TTS** | Ultra-fast (~3s for long scripts), authentic accent | English / Multi | 100% Offline ONNX, popular voices: `af_heart`, `am_adam` |
| **Viettel AI** | Standard broadcast Vietnamese voice | Vietnamese | Cloud API fallback |

### 3.2. Selecting from 23 Preset Regional Voices
In the **🎙️ Select Voice** dropdown, pick the ideal voice profile for your niche:
- **News, commentary, tech reviews**: *Minh Quân (Northern Male)*, *Mai Anh (Northern Female)*, *Thùy Dung (Southern Female)*, *Minh Đức (Northern Male)*.
- **Storytelling, podcasts, audiobooks**: *Phạm Tuyên (Deep Warm Male)*, *Quỳnh Anh (Expressive Female)*, *Thái Sơn (Warm Southern Male)*, *Mỹ Duyên (Southern Female)*.
- **Vlogs, travel, casual**: *Minh Triết*, *Quang Sơn (Central Male)*, *Ngọc Trân (Central Female)*.

### 3.3. Instant Voice Cloning (3–8s) & Persistent Local Storage
Clone any target voice using a short **3–8 second audio sample**.

#### How to clone & save:
1. Click the **`🧬 Clone Giọng Mới (Tải audio 3–8s) ▼`** button to reveal the upload zone.
2. Drag and drop your audio file:
   - **Supported Formats**: Universal support for `.m4a` (smartphone voice notes), `.mp3`, `.wav`, `.aac`, `.ogg`, and `.webm`.
   - **File Requirements**: 3 to 8 seconds of clear speech with minimal background noise.
3. Once the file loads, the save dialog appears:
   - The voice name is automatically pre-filled from the filename (you can rename it, e.g., *"My Podcast Voice"*).
   - Click **`💾 Lưu Giọng`**: The system normalizes the audio to standard PCM WAV and saves it permanently in `uploads/cloned_voices/`.
4. After saving:
   - The voice instantly appears under **`⭐ Giọng Đã Lưu Của Bạn` (Your Saved Voices)** in the dropdown.
   - For all future sessions, select your saved voice from the dropdown without uploading reference clips again.

#### Managing & Deleting Saved Voices:
- Click **`⚙️ Quản lý giọng đã lưu`** (next to the Voice Select label).
- A management modal displays your saved voice library:
  - **Select (Chọn)**: Immediately activates this voice for synthesis.
  - **Delete (🗑️)**: Permanently removes the audio file from your disk.

### 3.4. Preview & Send to Pipeline
- Click **🎙️ Generate Audio Now**.
- In the audio preview card, listen to the output, download `.wav`, or click **⚡ Use for Video Creation** to send the audio to Tab 3.

---

## 4. Tab 3: Cinematic Video Editing & FFmpeg Rendering

Combines script, audio, and imagery into a high-production video with animated subtitles and motion effects.

### 4.1. Input Preparation
1. **Audio File (`audio.mp3` / `audio.wav`)**: Generated from Tab 2 or uploaded externally.
2. **Script File (`script.txt`)**: Text structured with `SCENE 1`, `SCENE 2` markers.
3. **Scene Images**:
   - Files **must** be named sequentially matching the scene index: `scene1.png`, `scene2.png`, `scene3.png`,... (both `.png` and `.jpg` supported).
   - Recommended resolution: 1920x1080 (horizontal) or 1080x1920 (vertical).

### 4.2. Background Removal & Compositing
When overlaying foreground character/subject images onto a shared background:
- Upload a background image in the **Background Image** slot.
- Choose the appropriate keying mode:
  - **`whitekey` (Recommended for sketches, doodles, and line art)**:
    - Uses *Adaptive Color-to-Alpha* to measure background luminance and dissolve white paper backgrounds while keeping delicate pencil and watercolor strokes intact.
  - **`rembg` (Recommended for real-world photos of people & objects)**:
    - Uses deep neural segmentation to cleanly extract subjects with edge feathering.

### 4.3. Render Configuration
- **Aspect Ratio**:
  - **16:9 (1920x1080)**: Standard horizontal format for YouTube and Facebook videos.
  - **9:16 (1080x1920)**: Vertical framing for TikTok, YouTube Shorts, and Instagram Reels.
- **Video Speed**:
  - Adjust from **0.5x to 2.0x**.
  - FFmpeg applies `atempo` and PTS scaling to adjust playback speed without pitch distortion or subtitle misalignment.
- **Background Music (BGM)**:
  - Upload an audio track (`.mp3`, `.wav`).
  - Set the BGM volume slider to **15% - 25%** for a balanced audio mix.
- **Karaoke Subtitle Effect**:
  - When enabled, words highlight dynamically (gold/orange) in sync with the narration.

### 4.4. Rendering Process
- Click **🚀 Start Creating Video**.
- The backend executes 5 synchronized steps:
  1. *Faster-Whisper extracts word-level timestamps*.
  2. *Needleman-Wunsch aligns timestamps with the original script*.
  3. *Background removal and canvas compositing*.
  4. *ASS dynamic subtitle compilation*.
  5. *FFmpeg renders Ken Burns zoom motion, crossfade transitions, and exports the final MP4*.

---

## 5. Tab 4: Automated YouTube Publishing

Publish directly to your YouTube channel with pre-populated SEO metadata:
1. **Connect Account**:
   - Click **🔗 Connect YouTube**.
   - Authenticate through the Google OAuth 2.0 dialog and authorize video upload permissions.
2. **Review SEO Metadata**:
   - Title, Description, and Tags are pre-filled from Step 1.
   - Make any final adjustments before uploading.
3. **Set Privacy Status**:
   - `Public`: Immediately visible to everyone.
   - `Unlisted`: Accessible only via direct URL.
   - `Private`: Visible only to you (ideal for scheduling).
4. Click **▶️ Upload to YouTube** and watch live upload percentage progress.

---

## 6. Visual Background Keying Debugger (`/debug.html`)

For complex artwork, transparent washes, or off-white paper, open:
👉 **[http://localhost:3000/debug.html](http://localhost:3000/debug.html)**

- Upload foreground and background sample images.
- Toggle between `whitekey` and `rembg` algorithms.
- Drag the **Threshold** slider to observe real-time keying changes.
- Inspect the Alpha channel to catch fringe artifacts before rendering.

---

## 7. Pro Tips & Frequently Asked Questions (FAQ)

### 💡 Tips for Best Voice Cloning Results:
- **Optimal Clip Length**: 5 to 7 seconds of steady speech works best.
- **Acoustic Environment**: Minimal background noise, no loud reverb, no background music.
- **Device**: Smartphone voice memos work well (the system automatically decodes `.m4a` files).

### 💡 Tips for Perfect Subtitle Synchronization:
- Keep the wording in `script.txt` identical to what is spoken in the audio.
- Write out abbreviations or numbers as words (e.g., write *"five hundred"* instead of *"500"* for tighter word-alignment).

### ❓ FAQ:
1. **How many videos can I generate per day?**
   - Unlimited. Local TTS and Faster-Whisper run entirely on your local machine with zero API quotas.
2. **Do I need a dedicated GPU?**
   - No. Both VieNeu-TTS v3 Turbo and Faster-Whisper are optimized for CPU execution via ONNX Runtime and perform smoothly on modern laptops.
3. **Where are my saved cloned voices stored?**
   - In the `uploads/cloned_voices/` directory of your project folder. You can easily back up this folder when moving machines.
