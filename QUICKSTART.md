# 🎬 Edit Video Tool - Setup Complete!

Your AI-powered video editor is ready to use. Here's what's been built:

## 📦 What You Got

### Backend Services (Node.js + Express)
✅ **Whisper AI Integration** - Extracts timestamps from audio
✅ **Script Parser** - Parses scene-based scripts  
✅ **Timeline Generator** - Matches scenes with timestamps
✅ **Subtitle Generator** - Creates SRT subtitle files
✅ **FFmpeg Renderer** - Composes video with images, audio, subtitles

### Frontend UI
✅ Beautiful responsive web interface
✅ Drag-and-drop file upload
✅ Real-time progress tracking
✅ Video download capability

## 🚀 Quick Start

### 1. Setup OpenAI API Key
```bash
# Edit .env file and replace with your actual API key
OPENAI_API_KEY=sk-your-actual-key-here
```

Get your key from: https://platform.openai.com/api-keys

### 2. Verify FFmpeg Installation
```bash
ffmpeg -version
ffprobe -version
```

If not installed:
```bash
# Windows (Chocolatey)
choco install ffmpeg

# macOS
brew install ffmpeg

# Linux
sudo apt-get install ffmpeg
```

### 3. Start the Server
```bash
npm start
```

Server will run on: http://localhost:3000

### 4. Use the Tool
1. Open http://localhost:3000 in your browser
2. Upload audio, script, and images
3. Click "Create Video"
4. Download the generated MP4

## 📝 Script Format Example

Create a script.txt with this format:

```
SCENE 1
Người thành công không phải là người thông minh nhất,

SCENE 2
mà là người nỗ lực nhiều nhất.

SCENE 3
Thông minh có thể giúp bạn bắt đầu nhanh hơn,
```

**Rules:**
- Each scene starts with "SCENE N"
- Text below scene header will be matched with audio
- Number images to match: scene1.png, scene2.png, etc.

## 🎥 How It Works

```
┌─────────────┐
│  audio.mp3  │
└──────┬──────┘
       │ (Whisper AI)
       ▼
┌──────────────────┐
│ Get timestamps:  │
│ 0.0s - 4.5s      │
│ 4.5s - 7.2s      │
└──────┬───────────┘
       │
       ├──────────┬─────────────┬──────────┐
       │          │             │          │
   ┌───▼───┐ ┌───▼────┐ ┌────▼──┐ ┌────▼──┐
   │ Scene │ │ Images │ │ Script│ │ Match │
   │ Parser│ │ Upload │ │Parser │ │ Text  │
   └───┬───┘ └───┬────┘ └────┬──┘ └────┬──┘
       │          │           │        │
       └──────────┴───────────┴────────┘
              │ (Timeline Created)
              ▼
       ┌─────────────────┐
       │ Generate SRT    │
       │ Subtitles       │
       └────────┬────────┘
                │
                ▼
         ┌─────────────────┐
         │ FFmpeg Render:  │
         │ • Images        │
         │ • Audio         │
         │ • Subtitles     │
         └────────┬────────┘
                  │
                  ▼
            ┌──────────────┐
            │  video.mp4   │
            └──────────────┘
```

## 📂 Project Structure

```
editVideoTool/
│
├── server.js                          # Main Express app
├── package.json                       # Dependencies
├── .env                               # Configuration (keep secret!)
├── README.md                          # Full documentation
│
├── src/services/
│   ├── whisperService.js             # Whisper API integration
│   ├── scriptParser.js                # Parse SCENE format
│   ├── timelineGenerator.js           # Match scenes to timestamps
│   ├── subtitleGenerator.js           # Create SRT files
│   └── ffmpegRenderer.js              # Video composition
│
├── public/
│   ├── index.html                     # Web UI
│   ├── style.css                      # Styling
│   └── app.js                         # Frontend logic
│
├── uploads/                           # Temp storage for uploads
└── output/                            # Generated videos
```

## 🛠️ Development

### Available Scripts
```bash
npm start      # Start server (http://localhost:3000)
npm install    # Install dependencies
```

### Environment Variables
```
OPENAI_API_KEY     (Required) Your OpenAI API key
PORT               (Optional) Server port (default: 3000)
FFMPEG_PATH        (Optional) FFmpeg binary path
FFPROBE_PATH       (Optional) FFprobe binary path
```

## 📋 Features Implemented

- [x] Express backend with file upload handling
- [x] Whisper AI integration for audio transcription
- [x] Script parser for SCENE format
- [x] Timeline generator with text matching
- [x] SRT subtitle generation
- [x] FFmpeg video composition
- [x] Beautiful responsive UI
- [x] Real-time progress tracking
- [x] Video download capability

## 🔮 Future Enhancements

- WebSocket for real-time progress updates
- Video effects (zoom, fade, pan)
- Multi-language support
- Background music mixing
- Video templates
- Batch processing
- Cloud storage integration

## ⚠️ Important Notes

1. **API Costs**: Each upload uses OpenAI Whisper API (cheap but costs $)
2. **Processing Time**: 1-minute video takes 2-5 minutes depending on image size
3. **File Limits**: Audio < 25MB, images < 500KB each
4. **FFmpeg Required**: Must be installed on your system

## 🐛 Troubleshooting

### Server won't start
```bash
# Check if port 3000 is in use
netstat -ano | findstr :3000

# Use different port
PORT=3001 npm start
```

### Whisper API errors
- Verify API key is correct
- Check OpenAI account has credits
- Audio file should be clean MP3

### Video rendering fails
- Ensure FFmpeg is installed
- Check all image files exist
- Try with smaller test images

## 💡 Tips for Best Results

1. **Audio**: Clear narration, consistent volume, no background music
2. **Images**: 1920x1080 PNG, 500KB-1MB each, numbered sequentially
3. **Script**: Short sentences (5-8 words), match spoken text closely
4. **Timing**: Images should appear for duration of spoken sentence

## 📞 Support

For issues, check:
- FFmpeg documentation: https://ffmpeg.org/
- OpenAI Whisper: https://github.com/openai/whisper
- Express.js: https://expressjs.com/

---

**Ready to create amazing videos! 🎉**

Start the server with: `npm start`
