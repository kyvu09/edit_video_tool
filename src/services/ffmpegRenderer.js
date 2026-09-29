const path = require('path');
const fs = require('fs');
const os = require('os');
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
  const upscaleW = aspectRatio === '9:16' ? 2160 : 3840;
  const upscaleH = aspectRatio === '9:16' ? 3840 : 2160;
  const upscaleSize = `${upscaleW}x${upscaleH}`;

  // 1. Normalization filters (scale and crop/pad)
  const normFilters = aspectRatio === '9:16'
    ? ['scale=1080:1920:force_original_aspect_ratio=increase', 'crop=1080:1920']
    : ['scale=1920:1080:force_original_aspect_ratio=decrease', 'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black'];

  // 2. Define the animations
  // Zoom out (1.06 -> 1.0) with 2x supersampling and center crop anchoring to prevent jitter & drift
  const anim = `scale=${upscaleW}:${upscaleH},zoompan=z='max(1.06-${zoomInc}*on,1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${upscaleSize}:fps=${fps},scale=${size.replace('x', ':')}`;

  // 3. Combine into final filter chain with fade transitions
  return [
    ...normFilters,
    anim,
    `fade=t=in:st=0:d=${fadeDur}`,
    `fade=t=out:st=${fadeOutSt}:d=${fadeDur}`
  ].join(',');
}

// Helper to construct chained atempo filters for any speed range
function getAtempoFilter(speed) {
  if (speed === 1.0) return 'atempo=1.0';
  const filters = [];
  let tempSpeed = speed;
  while (tempSpeed > 2.0) {
    filters.push('atempo=2.0');
    tempSpeed /= 2.0;
  }
  while (tempSpeed < 0.5) {
    filters.push('atempo=0.5');
    tempSpeed /= 0.5;
  }
  if (tempSpeed !== 1.0) {
    filters.push(`atempo=${tempSpeed.toFixed(4)}`);
  }
  return filters.join(',');
}

// ── Main render function ──────────────────────────────────────────────────────
/**
 * Chạy tối đa `concurrency` tasks cùng lúc.
 * Dùng để render các scene FFmpeg song song.
 */
async function runParallel(tasks, concurrency) {
  const results = new Array(tasks.length);
  let index = 0;
  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function renderVideo(timeline, audioPath, subtitlePath, outputPath, aspectRatio = '16:9', bgmPath = null, bgmVolume = 0.3, speed = 1.0, onProgress, fixedBgPath = null) {
  // Gracefully handle dynamic arguments to keep backward compatibility
  let finalAspectRatio = aspectRatio;
  let finalBgmPath = bgmPath;
  let finalBgmVolume = bgmVolume;
  let finalSpeed = speed;
  let finalOnProgress = onProgress;
  let finalFixedBgPath = fixedBgPath;

  if (typeof finalAspectRatio === 'function') {
    finalOnProgress = finalAspectRatio;
    finalAspectRatio = '16:9';
    finalBgmPath = null;
    finalBgmVolume = 0.3;
    finalSpeed = 1.0;
  } else if (typeof finalBgmPath === 'function') {
    finalOnProgress = finalBgmPath;
    finalBgmPath = null;
    finalBgmVolume = 0.3;
    finalSpeed = 1.0;
  } else if (typeof finalBgmVolume === 'function') {
    finalOnProgress = finalBgmVolume;
    finalBgmVolume = 0.3;
    finalSpeed = 1.0;
  } else if (typeof finalSpeed === 'function') {
    finalOnProgress = finalSpeed;
    finalSpeed = 1.0;
  }

  const speedVal = parseFloat(finalSpeed) || 1.0;
  onProgress = finalOnProgress;
  aspectRatio = finalAspectRatio;
  bgmPath = finalBgmPath;
  bgmVolume = finalBgmVolume;
  fixedBgPath = finalFixedBgPath ? path.resolve(finalFixedBgPath) : null;

  if (!timeline || timeline.length === 0) {
    throw new Error('Empty timeline');
  }

  const FPS     = 30;
  const tempDir = path.join(path.dirname(outputPath), 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  // Collect paths for concat file (pre-sized so parallel tasks can write by index)
  const sceneVideos = new Array(timeline.length).fill(null);

  try {
    // ── Step A: Render each scene in parallel ───────────────────────────────
    const CONCURRENCY = Math.max(1, Math.floor(os.cpus().length / 2));
    console.log(`[FFmpeg] Rendering ${timeline.length} scenes (parallel, workers=${CONCURRENCY})`);

    const sceneTasks = timeline.map((item, idx) => async () => {
      const imagePath = path.resolve(item.image);
      const tempVideo = path.join(tempDir, `scene_${idx}.mp4`);

      if (fixedBgPath && fs.existsSync(fixedBgPath)) {
        // Mode: Fixed Background underneath + Transparent PNG scene with zoompan animation
        const frames = Math.max(30, Math.round(item.duration * FPS));
        const zoomInc = (0.06 / frames).toFixed(6);
        const fadeDur = Math.min(0.4, item.duration / 3).toFixed(3);
        const fadeOutSt = Math.max(0, item.duration - parseFloat(fadeDur)).toFixed(3);
        const size = aspectRatio === '9:16' ? '1080x1920' : '1920x1080';
        const upscaleW = aspectRatio === '9:16' ? 2160 : 3840;
        const upscaleH = aspectRatio === '9:16' ? 3840 : 2160;
        const upscaleSize = `${upscaleW}x${upscaleH}`;

        const anim = `scale=${upscaleW}:${upscaleH},zoompan=z='max(1.06-${zoomInc}*on,1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${upscaleSize}:fps=${FPS},scale=${size.replace('x', ':')}`;
        const filterComplex = [
          `[0:v]format=yuv420p[bg]`,
          `[1:v]format=rgba,${anim},fade=t=in:st=0:d=${fadeDur}:alpha=1,fade=t=out:st=${fadeOutSt}:d=${fadeDur}:alpha=1[fg]`,
          `[bg][fg]overlay=0:0[v]`
        ].join(';');
        const cmd = [
          `"${ffmpegPath}"`,
          `-y -framerate ${FPS} -loop 1 -t ${item.duration} -i "${fixedBgPath}"`,
          `-framerate ${FPS} -loop 1 -t ${item.duration} -i "${imagePath}"`,
          `-filter_complex "${filterComplex}"`,
          `-map "[v]"`,
          `-t ${item.duration} -r ${FPS}`,
          `-c:v libx264 -preset fast -pix_fmt yuv420p`,
          `"${tempVideo}"`
        ].join(' ');
        await execAsync(cmd);
      } else {
        // Mode: Original fallback (zoompan + crossfade on full image)
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

      if (onProgress) {
        onProgress({ step: 'rendering_scene', current: idx, total: timeline.length });
      }
      sceneVideos[idx] = tempVideo;
    });

    await runParallel(sceneTasks, CONCURRENCY);

    // ── Step B: Concatenate scenes + mix audio ────────────────────────────────
    if (onProgress) onProgress({ step: 'concatenating' });

    const concatFile    = path.join(path.dirname(outputPath), 'concat.txt');
    const concatContent = sceneVideos
      .map(p => `file '${p.replace(/\\/g, '/')}'`)
      .join('\n');
    fs.writeFileSync(concatFile, concatContent);

    const noSubOutput = outputPath.replace('.mp4', '_nosub.mp4');
    
    let audioInputArgs = '';
    let filterComplexArgs = '';
    let audioMapArgs = '';

    if (bgmPath && fs.existsSync(bgmPath)) {
      audioInputArgs = `-stream_loop -1 -i "${bgmPath}"`;
      const voiceoverAtempo = getAtempoFilter(speedVal);
      filterComplexArgs = `-filter_complex "[1:a]${voiceoverAtempo},volume=1.0[vover];[2:a]volume=${bgmVolume}[bgm];[vover][bgm]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]"`;
      audioMapArgs = `-map 0:v:0 -map "[a]"`;
    } else if (speedVal !== 1.0) {
      const voiceoverAtempo = getAtempoFilter(speedVal);
      filterComplexArgs = `-filter_complex "[1:a]${voiceoverAtempo}[a]"`;
      audioMapArgs = `-map 0:v:0 -map "[a]"`;
    } else {
      audioMapArgs = `-map 0:v:0 -map 1:a:0`;
    }

    const concatCmd = [
      `"${ffmpegPath}"`,
      `-y -f concat -safe 0 -i "${concatFile}"`,
      `-i "${audioPath}"`,
      audioInputArgs,
      filterComplexArgs,
      `-c:v copy -c:a aac`,
      audioMapArgs,
      `-shortest`,
      `"${noSubOutput}"`
    ].filter(Boolean).join(' ');
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
