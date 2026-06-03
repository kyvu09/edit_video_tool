# Edit Video Tool 🎬

An AI-powered video editor that automatically creates videos from images, audio, and scripts.

## Features

✨ **Intelligent Scene Matching** - Automatically synchronizes images with audio using AI
🎤 **Whisper AI Integration** - Extracts accurate timestamps from audio
📝 **Smart Script Parsing** - Parses scene-based scripts automatically
🎥 **FFmpeg Rendering** - Produces high-quality MP4 videos
📋 **Auto-Subtitles** - Generates SRT subtitle files
🎨 **Beautiful UI** - Modern, responsive web interface

## Architecture

```
AUDIO (MP3)
    ↓
Whisper AI → Timestamps
    ↓
SCRIPT (TXT) → Scene Mapper ← IMAGES (PNG/JPG)
    ↓
Timeline Generator
    ↓
Subtitle Generator (SRT)
    ↓
FFmpeg Renderer
    ↓
VIDEO (MP4)
```

## Installation

### Prerequisites
- Node.js 16+
- FFmpeg & FFprobe (ffmpeg.org)
- OpenAI API Key (platform.openai.com)

### Steps

1. **Clone and install**
```bash
cd editVideoTool
npm install
```

2. **Install FFmpeg** (if not already installed)
```bash
# Windows (using Chocolatey)
choco install ffmpeg

# macOS
brew install ffmpeg

# Linux
sudo apt-get install ffmpeg
```

3. **Setup environment**
```bash
cp .env.example .env
# Edit .env and add your OpenAI API key
```

4. **Run the server**
```bash
npm start
# Server runs on http://localhost:3000
```

## Usage

1. Open http://localhost:3000 in your browser
2. Upload:
   - **Audio**: MP3 file with narration
   - **Script**: TXT file with SCENE format
   - **Images**: PNG/JPG files (scene1.png, scene2.png, etc.)

### Script Format

```
SCENE 1
Người thành công không phải là người thông minh nhất,

SCENE 2
mà là người nỗ lực nhiều nhất.

SCENE 3
Thông minh có thể giúp bạn bắt đầu nhanh hơn,
```

3. Click "Create Video"
4. Wait for processing (usually 2-5 minutes for a 1-minute video)
5. Download the generated MP4 file

## How It Works

### Step 1: Audio Processing
- Whisper AI transcribes audio and extracts timestamps for each sentence
- Returns segments with accurate start/end times

### Step 2: Script Parsing
- Reads the TXT script and extracts SCENE blocks
- Maps each scene to corresponding text

### Step 3: Timeline Generation
- Matches script text with audio transcription using similarity scoring
- Creates timeline with images, timestamps, and durations

### Step 4: Subtitle Creation
- Generates SRT file with timestamps and transcribed text
- Burned into the final video

### Step 5: Video Rendering
- FFmpeg combines:
  - Images (with fade/zoom effects)
  - Audio track
  - Subtitles
- Exports as H.264 MP4 video

## Project Structure

```
editVideoTool/
├── server.js                 # Express server & main routes
├── src/
│   └── services/
│       ├── whisperService.js      # Whisper AI integration
│       ├── scriptParser.js         # Script text parser
│       ├── timelineGenerator.js    # Scene-timestamp mapping
│       ├── subtitleGenerator.js    # SRT file creation
│       └── ffmpegRenderer.js       # FFmpeg video rendering
├── public/
│   ├── index.html            # Main UI
│   ├── style.css             # Styling
│   └── app.js                # Frontend logic
├── uploads/                  # Temp uploaded files
├── output/                   # Generated videos
├── package.json
└── .env                      # Environment variables
```

## API Endpoints

### POST /api/upload
Upload files and create video

**Request:**
```
Form data:
- audio (file): MP3 audio file
- script (file): TXT script file
- images (files): PNG/JPG image files
```

**Response:**
```json
{
  "sessionId": "1234567890",
  "message": "Video created successfully",
  "videoUrl": "/download/1234567890/output.mp4"
}
```

### GET /download/:sessionId/:filename
Download generated video

## Environment Variables

```
OPENAI_API_KEY     # Your OpenAI API key (required)
PORT               # Server port (default: 3000)
FFMPEG_PATH        # Path to ffmpeg binary (default: ffmpeg)
FFPROBE_PATH       # Path to ffprobe binary (default: ffprobe)
```

## Performance Tips

1. **Image Preparation**
   - Use 1920x1080 PNG/JPG images
   - Keep images 500KB-1MB each
   - Number images to match scenes (scene1.png, scene2.png...)

2. **Script Tips**
   - Keep sentences short (5-8 words)
   - Match script text closely with audio narration
   - Use clear "SCENE" headers

3. **Audio Tips**
   - Use clear narration
   - Consistent audio level
   - No background music (will be mixed with video)

## Troubleshooting

### FFmpeg Not Found
```bash
# Set full path in .env
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe
```

### Whisper API Errors
- Verify OPENAI_API_KEY in .env
- Check OpenAI quota and billing
- Audio file should be < 25MB

### Video Rendering Issues
- Ensure all images exist
- Check FFmpeg installation
- Try with smaller test images first

## Roadmap

- [ ] WebSocket progress updates
- [ ] Video effects (zoom, fade, pan)
- [ ] Multi-language support
- [ ] Music/background audio mixing
- [ ] Video templates
- [ ] Batch processing
- [ ] Cloud storage integration

## License

MIT

## Contributing

Pull requests welcome!

## Support

For issues and questions, please open an GitHub issue.

---

**Made with ❤️ using Whisper AI & FFmpeg**
