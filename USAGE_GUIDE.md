# 📚 Complete User Guide - Edit Video Tool

## 🎯 What This Tool Does

The Edit Video Tool automatically creates professional videos from:
- **Audio** (MP3 narration)
- **Images** (PNG/JPG scenes)
- **Script** (Text with SCENE markers)

**Output:** Synchronized video (MP4) with subtitles and effects.

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│                    Frontend (Web UI)                    │
│  HTML/CSS/JS - Upload files, monitor progress          │
└────────────────────┬─────────────────────────────────┘
                     │ HTTP POST /api/upload
                     ▼
┌────────────────────────────────────────────────────────┐
│              Backend (Node.js + Express)               │
│ ┌──────────────┬────────────────┬──────────────────┐  │
│ │  Whisper AI  │ Script Parser  │ Timeline Gen     │  │
│ │ (timestamps) │  (SCENE parse) │ (match scenes)   │  │
│ └──────────────┴────────────────┴──────────────────┘  │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Subtitle Gen (SRT) + FFmpeg Renderer (MP4)      │  │
│ └──────────────────────────────────────────────────┘  │
└────────────────────┬─────────────────────────────────┘
                     │ File download
                     ▼
                  video.mp4
```

## 📋 Step-by-Step Usage

### Step 1: Prepare Your Files

**Audio (audio.mp3):**
- Format: MP3
- Duration: 1-10 minutes recommended
- Content: Narration matching your script
- Quality: Clear, consistent volume

**Script (script.txt):**
```
SCENE 1
Text spoken in scene 1

SCENE 2
Text spoken in scene 2

SCENE 3
Text spoken in scene 3
```

**Images:**
- scene1.png
- scene2.png
- scene3.png
- ... (one per scene)
- Format: PNG or JPG
- Resolution: 1920x1080 recommended
- Size: 300KB-500KB each

### Step 2: Start the Server

```bash
npm start
```

Expected output:
```
✅ Server running on http://localhost:3000
```

### Step 3: Upload via Web UI

1. Open http://localhost:3000 in browser
2. Upload audio.mp3
3. Upload script.txt
4. Upload all images (scene1.png, scene2.png, etc.)
5. Click "Create Video"

### Step 4: Monitor Progress

The UI shows real-time progress:
- 🎤 Extracting timestamps from audio
- 📝 Parsing script scenes
- 🎬 Generating timeline
- 📋 Creating subtitles
- 🎥 Rendering final video

### Step 5: Download Video

Once complete:
- Click "Download Video"
- Save video.mp4

## 🔧 Configuration

### Environment Variables (.env)

```
# Required - Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-key-here

# Optional - Server port (default: 3000)
PORT=3000

# Optional - Path to FFmpeg binary
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe
```

### Recommended Settings

```env
OPENAI_API_KEY=sk-proj-xxxxx...
PORT=3000
NODE_ENV=production
```

## 🎬 Example Workflow

### Project: Vietnamese Motivational Video

**Input Files:**

script.txt:
```
SCENE 1
Người thành công không phải là người thông minh nhất

SCENE 2
Mà là người nỗ lực nhiều nhất

SCENE 3
Hãy cố gắng mỗi ngày
```

Audio: (3 sentences recorded as audio.mp3)

Images:
- scene1.png (success mindset)
- scene2.png (hard work)
- scene3.png (daily effort)

**Process:**
1. Whisper extracts: [0s-4.5s, 4.5s-7.2s, 7.2s-9.8s]
2. Timeline: [scene1→4.5s, scene2→2.7s, scene3→2.6s]
3. SRT generated with timestamps
4. FFmpeg composes video

**Output:**
- video.mp4 (10 seconds)
- Synced images with narration
- Embedded subtitles

## 🐛 Troubleshooting

### Problem: "FFmpeg not found"
**Solution:**
```bash
# Windows - Install via Chocolatey
choco install ffmpeg

# macOS
brew install ffmpeg

# Linux
sudo apt-get install ffmpeg

# Verify
ffmpeg -version
```

### Problem: "OPENAI_API_KEY not set"
**Solution:**
1. Get API key from https://platform.openai.com/api-keys
2. Edit .env file
3. Add: `OPENAI_API_KEY=sk-...`
4. Restart server

### Problem: "Upload failed - Invalid file"
**Solution:**
- Audio must be MP3
- Script must be TXT
- Images must be PNG/JPG
- File sizes: Audio < 25MB, Images < 1MB

### Problem: "Script text doesn't match audio"
**Solution:**
- Ensure script text closely matches narration
- Use short sentences (5-8 words)
- Check spelling and punctuation
- Use simple, clear language

### Problem: "Video rendering takes too long"
**Solution:**
- Use smaller images (< 500KB)
- Reduce duration
- Use lower resolution initially
- Check system resources

## 📊 Performance & Costs

### API Usage
- Whisper API: ~$0.01 per minute of audio
- Example: 5-minute video ≈ $0.05

### Processing Time
- Audio analysis: 1-2 minutes
- Image processing: 1 minute per minute of video
- Rendering: 2-5 minutes
- Total: 4-10 minutes per video

### System Requirements
- CPU: Dual-core minimum (4-core recommended)
- RAM: 4GB minimum (8GB recommended)
- Storage: 2GB free for uploads + output
- Network: Stable internet (for Whisper API)

## 🎨 Advanced Usage

### Custom Image Duration
Modify timelineGenerator.js to adjust:
```javascript
// Extend or shrink duration
timeline.push({
  duration: (bestMatch.end - bestMatch.start) * 1.2  // 20% longer
});
```

### Add Video Effects
Modify ffmpegRenderer.js to add FFmpeg filters:
```bash
ffmpeg ... -vf "fade=in:0:30" ...  # Fade in effect
```

### Multiple Audio Tracks
Extend server.js to handle background music:
```javascript
form.append('background', backgroundAudio);
```

## 📱 Browser Compatibility

Tested and working on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🔐 Security Notes

1. **API Keys:**
   - Never commit .env to git
   - Use environment-specific keys
   - Rotate keys regularly

2. **File Uploads:**
   - Validated on backend
   - Temporary files cleaned up
   - 25MB limit enforced

3. **Output Files:**
   - Generated videos stored securely
   - Accessible only via session ID
   - Auto-cleaned after download

## 📞 Support & Resources

**Official Docs:**
- FFmpeg: https://ffmpeg.org/documentation.html
- Whisper AI: https://github.com/openai/whisper
- Express.js: https://expressjs.com/

**Troubleshooting:**
- Check server logs for errors
- Enable DEBUG mode: `DEBUG=* npm start`
- Test with simple example files first

## ✅ Quality Checklist

Before creating final videos:

- [ ] Audio is clear, consistent volume
- [ ] Script text matches audio narration
- [ ] Images are high quality (1920x1080)
- [ ] Image filenames match scenes (scene1.png, etc.)
- [ ] No special characters in filenames
- [ ] All files are in recommended formats
- [ ] API key is valid and has credits
- [ ] FFmpeg is installed and accessible

## 🚀 Going Live

To deploy for production:

1. **Environment:**
   ```bash
   NODE_ENV=production npm start
   ```

2. **SSL/HTTPS:**
   - Use Nginx/Apache reverse proxy
   - Install SSL certificate
   - Configure for HTTPS

3. **Cloud Deployment:**
   - Use Node.js hosting (Heroku, Render, Railway)
   - Set environment variables via platform
   - Upload to cloud storage (S3, etc.)

4. **Monitoring:**
   - Setup error logging (Sentry, etc.)
   - Monitor API usage and costs
   - Track upload/download metrics

## 📝 License & Attribution

This tool uses:
- OpenAI Whisper (Speech Recognition)
- FFmpeg (Video Rendering)
- Express.js (Web Framework)

All open source and free to use.

---

**Happy video creating! 🎉**

For questions, check the examples folder or README.md file.
