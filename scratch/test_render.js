const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
require('dotenv').config();

const whisperService = require('../src/services/whisperService');
const scriptParser = require('../src/services/scriptParser');
const timelineGenerator = require('../src/services/timelineGenerator');

const uploadsDir = path.resolve(__dirname, '../uploads');
const files = fs.readdirSync(uploadsDir);

// Dynamically find files for the 1780939348 session
const audioFile = files.find(f => f.startsWith('1780939348232-ElevenLabs') && f.endsWith('.mp3'));
const scriptFile = files.find(f => f.startsWith('1780939348236-script') && f.endsWith('.txt'));

if (!audioFile || !scriptFile) {
  console.error('Failed to find dynamic files!', { audioFile, scriptFile });
  process.exit(1);
}

const audioPath = path.join(uploadsDir, audioFile);
const scriptPath = path.join(uploadsDir, scriptFile);

const imagePrefixes = ['1780939348236', '1780939348238', '1780939348239', '1780939348240', '1780939348241', '1780939348242', '1780939348243'];
const imageFiles = files
  .filter(f => imagePrefixes.some(pref => f.startsWith(pref)) && (f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png')))
  .map(f => ({ path: path.join(uploadsDir, f) }));

imageFiles.sort((a, b) => a.path.localeCompare(b.path));

async function run() {
  console.log('Loading script...');
  const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
  const scenes = scriptParser.parseScript(scriptContent);
  const sceneTexts = scenes.map(s => s.text);

  console.log('Running Faster-Whisper local transcribe with .env...');
  const timestamps = await whisperService.processAudio(audioPath, sceneTexts);

  console.log('Generating timeline...');
  const timeline = timelineGenerator.generateTimeline(scenes, timestamps, imageFiles);

  console.log('Timeline items:');
  timeline.forEach((item, i) => {
    console.log(`  Scene ${i}: duration=${item.duration}s, start=${item.start}s, end=${item.end}s, image=${path.basename(item.image)}`);
  });

  const testDir = path.resolve(__dirname, 'test_run_real');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  const sceneVideos = [];
  const FPS = 30;

  for (let idx = 0; idx < timeline.length; idx++) {
    const item = timeline[idx];
    const imagePath = path.resolve(item.image);
    const tempVideo = path.join(testDir, `scene_${idx}.mp4`);
    sceneVideos.push(tempVideo);

    const vf = buildSceneFilter(item.duration, '9:16', FPS);
    const cmd = `ffmpeg -y -framerate ${FPS} -loop 1 -i "${imagePath}" -vf "${vf}" -t ${item.duration} -r ${FPS} -c:v libx264 -preset fast -pix_fmt yuv420p "${tempVideo}"`;
    execSync(cmd);

    const probeCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempVideo}"`;
    const dur = execSync(probeCmd).toString().trim();
    console.log(`  Rendered scene_${idx}.mp4: probed duration = ${dur}s (expected ${item.duration}s)`);
  }

  // Concatenate
  const concatFile = path.join(testDir, 'concat.txt');
  const concatContent = sceneVideos.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
  fs.writeFileSync(concatFile, concatContent);

  const concatOut = path.join(testDir, 'concat_video.mp4');
  const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c copy "${concatOut}"`;
  execSync(concatCmd);

  const concatDur = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${concatOut}"`).toString().trim();
  console.log(`Probed concatenated video duration: ${concatDur}s`);

  // Final mix
  const finalOut = path.join(testDir, 'final_output.mp4');
  const mixCmd = `ffmpeg -y -i "${concatOut}" -i "${audioPath}" -c:v copy -c:a aac -shortest "${finalOut}"`;
  execSync(mixCmd);

  const finalDur = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalOut}"`).toString().trim();
  console.log(`Probed final mixed video duration: ${finalDur}s`);
}

function buildSceneFilter(duration, aspectRatio = '16:9', fps = 30) {
  const frames     = Math.max(30, Math.round(duration * fps));
  const zoomInc    = (0.06 / frames).toFixed(6);
  const fadeDur    = Math.min(0.4, duration / 3).toFixed(3);
  const fadeOutSt  = Math.max(0, duration - parseFloat(fadeDur)).toFixed(3);

  const size = aspectRatio === '9:16' ? '1080x1920' : '1920x1080';

  const normFilters = aspectRatio === '9:16'
    ? ['scale=1080:1920:force_original_aspect_ratio=increase', 'crop=1080:1920']
    : ['scale=1920:1080:force_original_aspect_ratio=decrease', 'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black'];

  const anim = `zoompan=z='max(1.06-${zoomInc}*on,1.0)':x='(iw-ow)/2':y='(ih-oh)/2':d=${frames}:s=${size}:fps=${fps}`;

  return [
    ...normFilters,
    anim,
    `fade=t=in:st=0:d=${fadeDur}`,
    `fade=t=out:st=${fadeOutSt}:d=${fadeDur}`
  ].join(',');
}

run().catch(console.error);
