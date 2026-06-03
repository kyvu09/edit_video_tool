const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// Ensure ffmpeg is available
const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
const ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

/**
 * Helper to run a command line asynchronously.
 */
function execAsync(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function renderVideo(timeline, audioPath, subtitlePath, outputPath, onProgress) {
  if (!timeline || timeline.length === 0) {
    throw new Error('Empty timeline');
  }

  // Create concat file for image sequences
  const concatFile = path.join(path.dirname(outputPath), 'concat.txt');
  let concatContent = '';

  // Create intermediate video files for each image
  const tempDir = path.join(path.dirname(outputPath), 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  try {
    for (let idx = 0; idx < timeline.length; idx++) {
      const item = timeline[idx];
      const imagePath = path.resolve(item.image);
      const tempVideo = path.join(tempDir, `video_${idx}.mp4`);
      
      // FFmpeg concat file expects forward slashes on Windows
      const safeTempVideoPath = tempVideo.replace(/\\/g, '/');
      concatContent += `file '${safeTempVideoPath}'\n`;
      
      if (onProgress) {
        onProgress({ step: 'rendering_scene', current: idx, total: timeline.length });
      }

      // Create video from image asynchronously
      const cmd = `"${ffmpegPath}" -y -loop 1 -i "${imagePath}" -c:v libx264 -t ${item.duration} -pix_fmt yuv420p -vf "scale=1920:1080" "${tempVideo}"`;
      await execAsync(cmd);
    }

    fs.writeFileSync(concatFile, concatContent);

    if (onProgress) {
      onProgress({ step: 'concatenating' });
    }

    // Concatenate all videos and add audio asynchronously
    const ffmpegCmd = `"${ffmpegPath}" -y -f concat -safe 0 -i "${concatFile}" -i "${audioPath}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest "${outputPath}"`;
    await execAsync(ffmpegCmd);

    // Add subtitles if available
    if (fs.existsSync(subtitlePath)) {
      if (onProgress) {
        onProgress({ step: 'adding_subtitles' });
      }
      const finalOutput = outputPath.replace('.mp4', '_final.mp4');
      
      // Escape Windows specific backslashes and drive letter colons for FFmpeg subtitles filter
      const escapedSubPath = path.resolve(subtitlePath)
        .replace(/\\/g, '/')
        .replace(/:/g, '\\:');

      const subCmd = `"${ffmpegPath}" -y -i "${outputPath}" -vf "subtitles='${escapedSubPath}'" -c:a copy "${finalOutput}"`;
      await execAsync(subCmd);
      fs.renameSync(finalOutput, outputPath);
    }
  } catch (error) {
    throw new Error(`FFmpeg rendering failed: ${error.message}`);
  } finally {
    // Cleanup
    try {
      if (fs.existsSync(concatFile)) fs.unlinkSync(concatFile);
      if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('Cleanup error during FFmpeg rendering:', cleanupError);
    }
  }
}

module.exports = { renderVideo };

