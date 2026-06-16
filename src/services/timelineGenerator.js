const stringSimilarity = require('string-similarity').compareTwoStrings;

function generateTimeline(scenes, timestamps, imageFiles) {
  const images = imageFiles.map(f => f.path);
  
  if (!scenes || scenes.length === 0) return [];
  if (!timestamps || timestamps.length === 0) return [];

  // ── Step 1: Flatten timestamps into words for high-resolution matching ──────
  // If Whisper outputs long sentences as single segments, DP forces the whole sentence
  // into one scene. Splitting by words ensures DP can cut exactly where it needs to.
  const flatWords = [];
  timestamps.forEach(seg => {
    const words = seg.text.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return;
    
    const totalChars = words.reduce((sum, w) => sum + w.length, 0);
    const segDur = seg.end - seg.start;
    
    let currentStart = seg.start;
    words.forEach(w => {
      const weight = w.length / totalChars;
      const wordDur = segDur * weight;
      flatWords.push({
        text: w,
        start: currentStart,
        end: currentStart + wordDur
      });
      currentStart += wordDur;
    });
  });
  timestamps = flatWords;

  // ── Step 1b: Assign each word segment to scenes using Dynamic Programming ──────
  // This guarantees monotonic (chronological) ordering of segments across scenes.
  const N = timestamps.length;
  const K = scenes.length;

  // dp[k][i] = max similarity using first k scenes and first i segments
  const dp = Array.from({ length: K + 1 }, () => Array(N + 1).fill(-Infinity));
  const back = Array.from({ length: K + 1 }, () => Array(N + 1).fill(0));
  dp[0][0] = 0;

  for (let k = 1; k <= K; k++) {
    const sceneText = scenes[k - 1].text.toLowerCase();
    for (let i = 0; i <= N; i++) {
      let bestScore = dp[k - 1][i]; // score if 0 segments assigned to this scene
      let bestJ = i;
      
      let chunkText = "";
      // Limit inner loop to max 150 words per scene to keep performance high
      for (let j = i - 1; j >= Math.max(0, i - 150); j--) {
        chunkText = chunkText === "" ? timestamps[j].text : timestamps[j].text + " " + chunkText;
        if (dp[k - 1][j] === -Infinity) continue;
        
        const sim = stringSimilarity(sceneText, chunkText.toLowerCase());
        
        if (dp[k - 1][j] + sim >= bestScore) {
          bestScore = dp[k - 1][j] + sim;
          bestJ = j;
        }
      }
      dp[k][i] = bestScore;
      back[k][i] = bestJ;
    }
  }

  const sceneSegmentsMap = {};
  scenes.forEach(scene => { sceneSegmentsMap[scene.scene] = []; });

  let currN = N;
  for (let k = K; k >= 1; k--) {
    let startJ = back[k][currN];
    for (let m = startJ; m < currN; m++) {
      sceneSegmentsMap[scenes[k - 1].scene].push(timestamps[m]);
    }
    currN = startJ;
  }

  // ── Step 2: Build raw timeline entries from assigned segments ─────────────
  const timeline = scenes.map((scene, index) => {
    const segments = sceneSegmentsMap[scene.scene];
    let start, end;
    if (segments && segments.length > 0) {
      start = segments[0].start;
      end = segments[segments.length - 1].end;
    }
    return {
      scene: scene.scene,
      image: images[index] || images[images.length - 1] || images[0],
      text: scene.text,
      start,
      end
    };
  });

  // ── Step 3: Post-processing – fill gaps, enforce continuity & round ────────
  const maxEnd = Math.max(...timestamps.map(t => t.end));
  const totalDuration = maxEnd > 0 ? maxEnd : 30;

  // Always pin first scene to 0
  if (timeline.length > 0 && (timeline[0].start === undefined || timeline[0].start > 0)) {
    timeline[0].start = 0;
  }

  // First pass: define start and end for all items
  for (let i = 0; i < timeline.length; i++) {
    const item = timeline[i];

    // Fill undefined start
    if (item.start === undefined) {
      item.start = i > 0 ? timeline[i - 1].end : 0;
    }

    // Fill undefined end
    if (item.end === undefined) {
      // Look ahead for the next scene with a defined start
      let nextStart;
      for (let j = i + 1; j < timeline.length; j++) {
        if (timeline[j].start !== undefined) { nextStart = timeline[j].start; break; }
      }
      if (nextStart !== undefined) {
        item.end = nextStart;
      } else {
        // Split remaining duration evenly among undefined-end scenes from here onward
        const remaining = totalDuration - item.start;
        const undefinedCount = timeline.slice(i).filter(x => x.end === undefined).length + 1;
        item.end = item.start + (remaining > 0 ? remaining / undefinedCount : 2);
      }
    }
  }

  // Second pass: close gaps by extending the end time of each scene to the start of the next scene.
  // This ensures there are no visual gaps/black frames and matches audio duration perfectly.
  for (let i = 0; i < timeline.length - 1; i++) {
    if (timeline[i].end < timeline[i + 1].start) {
      timeline[i].end = timeline[i + 1].start;
    }
  }

  // Second pass B: Enforce minimum duration by stealing time from adjacent scenes
  const MIN_SCENE_DUR = 2;
  for (let i = 0; i < timeline.length; i++) {
    let dur = timeline[i].end - timeline[i].start;
    if (dur < MIN_SCENE_DUR) {
      let needed = MIN_SCENE_DUR - dur;
      
      // 1. Try to steal from the next scene
      if (i < timeline.length - 1) {
        let nextDur = timeline[i + 1].end - timeline[i + 1].start;
        if (nextDur > MIN_SCENE_DUR) {
          let steal = Math.min(needed, nextDur - MIN_SCENE_DUR);
          timeline[i].end += steal;
          timeline[i + 1].start += steal;
          needed -= steal;
        }
      }
      
      // 2. Try to steal from the previous scene
      if (needed > 0 && i > 0) {
        let prevDur = timeline[i - 1].end - timeline[i - 1].start;
        if (prevDur > MIN_SCENE_DUR) {
          let steal = Math.min(needed, prevDur - MIN_SCENE_DUR);
          timeline[i].start -= steal;
          timeline[i - 1].end -= steal;
          needed -= steal;
        }
      }
      
      // 3. Force it (will be handled by overlap resolution)
      if (needed > 0) {
        timeline[i].end += needed;
      }
    }
  }

  // Third pass: resolve overlaps, enforce minimum duration and round
  for (let i = 0; i < timeline.length; i++) {
    const item = timeline[i];

    // Enforce strictly increasing order – no overlaps allowed
    if (i > 0 && item.start < timeline[i - 1].end) {
      item.start = timeline[i - 1].end;
    }

    // Fallback minimum scene duration
    if (item.end - item.start < MIN_SCENE_DUR) {
      item.end = item.start + MIN_SCENE_DUR;
    }

    item.start = Math.round(item.start * 100) / 100;
    item.end = Math.round(item.end * 100) / 100;
    item.duration = Math.round((item.end - item.start) * 100) / 100;
  }

  // ── Step 4: Snap last scene to exact end of audio ─────────────────────────
  if (timeline.length > 0) {
    const last = timeline[timeline.length - 1];
    let candidateEnd = Math.max(totalDuration, last.start + MIN_SCENE_DUR);
    last.end = Math.round(candidateEnd * 100) / 100;
    last.duration = Math.round((last.end - last.start) * 100) / 100;
  }

  console.log(`📽  Timeline built: ${timeline.length} scenes spanning 0s → ${totalDuration.toFixed(2)}s`);
  timeline.forEach((item, i) => {
    console.log(`  Scene ${i + 1}: ${item.start}s → ${item.end}s (${item.duration}s) "${item.text.slice(0, 40)}..."`);
  });

  return timeline;
}

module.exports = { generateTimeline };
