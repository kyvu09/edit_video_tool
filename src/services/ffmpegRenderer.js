const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const ffmpegPath  = process.env.FFMPEG_PATH  || 'ffmpeg';
const ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';

/** Promisified child_process.exec */
function execAsync(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve({ stdout, stderr });
    });
  });
}

// ── Per-scene video filter chain ─────────────────────────────────────────────
// Applies three effects in sequence:
//   1. Scale + Pad  → normalise to 1920×1080 without stretching
//   2. Slow Zoom In → Ken Burns effect via zoompan (1.0× → 1.05× over scene)
//   3. Crossfade    → fade-in at start, fade-out at end of each clip
//      (adjacent fades create a smooth dissolve between consecutive scenes)
function buildSceneFilter(duration, aspectRatio = '16:9', fps = 30) {
  const frames     = Math.max(30, Math.round(duration * fps));
  const zoomInc    = (0.06 / frames).toFixed(6);          // smooth zoom rate (1.0 -> 1.06)
  const fadeDur    = Math.min(0.4, duration / 3).toFixed(3);
  const fadeOutSt  = Math.max(0, duration - parseFloat(fadeDur)).toFixed(3);

  const size = aspectRatio === '9:16' ? '1080x1920' : '1920x1080';

  // 1. Normalization filters (scale and crop/pad)
  const normFilters = aspectRatio === '9:16'
    ? ['scale=1080:1920:force_original_aspect_ratio=increase', 'crop=1080:1920']
    : ['scale=1920:1080:force_original_aspect_ratio=decrease', 'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black'];

  // 2. Define the animations
  // Removed other camera movements (zoom-in, pans, push-up) per user request to keep only zoom-out
  const anim = `zoompan=z='max(1.06-${zoomInc}*on,1.0)':x='(iw-ow)/2':y='(ih-oh)/2':d=${frames}:s=${size}:fps=${fps}`;

  // 3. Combine into final filter chain with fade transitions
  return [
    ...normFilters,
    anim,
    `fade=t=in:st=0:d=${fadeDur}`,
    `fade=t=out:st=${fadeOutSt}:d=${fadeDur}`
  ].join(',');
}

// ── Main render function ──────────────────────────────────────────────────────
async function renderVideo(timeline, audioPath, subtitlePath, outputPath, aspectRatio = '16:9', onProgress) {
  if (typeof aspectRatio === 'function') {
    onProgress = aspectRatio;
    aspectRatio = '16:9';
  }

  if (!timeline || timeline.length === 0) {
    throw new Error('Empty timeline');
  }

  const FPS     = 30;
  const tempDir = path.join(path.dirname(outputPath), 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  // Collect paths for concat file
  const sceneVideos = [];

  try {
    // ── Step A: Render each scene with zoom + crossfade ──────────────────────
    for (let idx = 0; idx < timeline.length; idx++) {
      const item      = timeline[idx];
      const imagePath = path.resolve(item.image);
      const tempVideo = path.join(tempDir, `scene_${idx}.mp4`);
      sceneVideos.push(tempVideo);

      if (onProgress) {
        onProgress({ step: 'rendering_scene', current: idx, total: timeline.length });
      }

      const vf = buildSceneFilter(item.duration, aspectRatio, FPS);
      // -framerate 30 on input ensures stable frame supply to zoompan
      const cmd = [
        `"${ffmpegPath}"`,
        `-y -framerate ${FPS} -loop 1 -i "${imagePath}"`,
        `-vf "${vf}"`,
        `-t ${item.duration} -r ${FPS}`,
        `-c:v libx264 -preset fast -pix_fmt yuv420p`,
        `"${tempVideo}"`
      ].join(' ');

      await execAsync(cmd);
    }

    // ── Step B: Concatenate scenes + mix audio ────────────────────────────────
    if (onProgress) onProgress({ step: 'concatenating' });

    const concatFile    = path.join(path.dirname(outputPath), 'concat.txt');
    const concatContent = sceneVideos
      .map(p => `file '${p.replace(/\\/g, '/')}'`)
      .join('\n');
    fs.writeFileSync(concatFile, concatContent);

    const noSubOutput = outputPath.replace('.mp4', '_nosub.mp4');
    const concatCmd = [
      `"${ffmpegPath}"`,
      `-y -f concat -safe 0 -i "${concatFile}"`,
      `-i "${audioPath}"`,
      `-c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest`,
      `"${noSubOutput}"`
    ].join(' ');
    await execAsync(concatCmd);

    // ── Step C: Burn subtitles (ASS → full style; SRT → basic) ───────────────
    if (subtitlePath && fs.existsSync(subtitlePath)) {
      if (onProgress) onProgress({ step: 'adding_subtitles' });

      // Escape the path for FFmpeg's subtitles/ass filter (Windows: swap \ → /, escape :)
      const escapedSub = path.resolve(subtitlePath)
        .replace(/\\/g, '/')
        .replace(/:/g, '\\:');

      const ext       = path.extname(subtitlePath).toLowerCase();
      const subFilter = ext === '.ass'
        ? `ass='${escapedSub}'`          // uses full ASS style (animations, karaoke)
        : `subtitles='${escapedSub}'`;   // basic SRT rendering

      const subCmd = [
        `"${ffmpegPath}"`,
        `-y -i "${noSubOutput}"`,
        `-vf "${subFilter}"`,
        `-c:a copy`,
        `"${outputPath}"`
      ].join(' ');
      await execAsync(subCmd);
      fs.unlinkSync(noSubOutput);
    } else {
      fs.renameSync(noSubOutput, outputPath);
    }

  } catch (error) {
    throw new Error(`FFmpeg rendering failed: ${error.message}`);
  } finally {
    // Cleanup temp scene clips + concat file
    try {
      const concatFile = path.join(path.dirname(outputPath), 'concat.txt');
      if (fs.existsSync(concatFile)) fs.unlinkSync(concatFile);
      if (fs.existsSync(tempDir))    fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.error('Cleanup error:', e.message);
    }
  }
}

module.exports = { renderVideo };
