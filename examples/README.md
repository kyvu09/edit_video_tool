# Example Files for Edit Video Tool

This directory contains example files to help you get started.

## Files Included

### script.txt
Sample script with 8 scenes in Vietnamese. Shows the expected format:
```
SCENE 1
Your narration text here

SCENE 2
More narration text here
```

## How to Use Examples

1. **Prepare your media files:**
   - Record or find narration as audio.mp3
   - Create/find 8 images (scene1.png through scene8.png)
   - Use the provided script.txt

2. **Upload to the tool:**
   - Go to http://localhost:3000
   - Upload audio.mp3
   - Upload script.txt
   - Upload all scene images

3. **Create video:**
   - Click "Create Video"
   - Wait for processing
   - Download video.mp4

## Script Format Rules

Each scene starts with: `SCENE [number]`

Text below is matched with audio using Whisper AI.

Examples:
```
SCENE 1
This is the first sentence.

SCENE 2
This is the second sentence.
```

## Tips

- Keep sentences 5-10 words for best matching
- Record clear, consistent audio narration
- Use images that visually represent each scene
- Number images in order: scene1.png, scene2.png...
- Use PNG format, 1920x1080 resolution
- Keep file sizes reasonable (< 1MB per image)

## Testing

To test the tool locally:

1. Create simple audio narration matching the script
2. Find/create 8 images
3. Follow the usage instructions above

The tool will automatically synchronize images with the spoken narration using AI timestamps.
