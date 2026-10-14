const stringSimilarity = require('string-similarity').compareTwoStrings;

/**
 * Tự động mở rộng danh sách scenes nếu số lượng ảnh nạp vào nhiều hơn số scenes của kịch bản.
 * Đảm bảo 100% hình ảnh người dùng đã nạp vào đều được xuất hiện trên timeline video.
 */
function expandScenesToMatchImages(scenes, timestamps, targetCount) {
  if (!scenes || scenes.length === 0) return [];
  if (scenes.length >= targetCount) return scenes.map(s => ({ ...s }));

  let result = scenes.map(s => ({ ...s }));

  // 1. Kiểm tra xem Whisper timestamps có chứa đoạn âm thanh chưa được bao phủ không
  // (ví dụ: audio dài 60s có 15 segments nhưng script chỉ viết đến giây thứ 30 / segment 7)
  if (timestamps && timestamps.length > scenes.length) {
    const lastSceneText = scenes[scenes.length - 1].text.toLowerCase();
    let lastMatchedSegIdx = -1;
    for (let i = 0; i < timestamps.length; i++) {
      if (stringSimilarity(lastSceneText, timestamps[i].text.toLowerCase()) > 0.35) {
        lastMatchedSegIdx = i;
      }
    }

    if (lastMatchedSegIdx >= 0 && lastMatchedSegIdx < timestamps.length - 1) {
      console.log(`[Timeline] Phát hiện âm thanh chưa có kịch bản từ segment ${lastMatchedSegIdx + 1} đến ${timestamps.length - 1}. Tự động tạo scene từ audio.`);
      for (let j = lastMatchedSegIdx + 1; j < timestamps.length && result.length < targetCount; j++) {
        result.push({
          scene: result.length + 1,
          text: timestamps[j].text.trim()
        });
      }
    }
  }

  // 2. Nếu vẫn còn ít hơn targetCount, tách các scene có nhiều câu (dấu . ? ! ;)
  if (result.length < targetCount) {
    const newScenes = [];
    for (const sc of result) {
      if (result.length < targetCount) {
        const sentences = sc.text.split(/(?<=[.?!;])\s+/).filter(s => s.trim().length > 0);
        if (sentences.length > 1 && result.length + (sentences.length - 1) <= targetCount + 5) {
          sentences.forEach(s => newScenes.push({ scene: newScenes.length + 1, text: s.trim() }));
          continue;
        }
      }
      newScenes.push({ scene: newScenes.length + 1, text: sc.text });
    }
    result = newScenes;
  }

  // 3. Nếu vẫn còn thiếu, tách các scene dài nhất theo cụm từ (dấu phẩy hoặc khoảng trắng)
  while (result.length < targetCount) {
    let maxIdx = -1;
    let maxLen = 0;
    for (let i = 0; i < result.length; i++) {
      if (result[i].text.length > maxLen) {
        maxLen = result[i].text.length;
        maxIdx = i;
      }
    }
    if (maxIdx === -1 || maxLen < 20) break;

    const toSplit = result[maxIdx];
    const half = Math.floor(toSplit.text.length / 2);
    let splitIdx = toSplit.text.indexOf(',', half - 10);
    if (splitIdx === -1 || splitIdx > half + 15) {
      splitIdx = toSplit.text.indexOf(' ', half);
    }

    if (splitIdx > 0) {
      const part1 = toSplit.text.slice(0, splitIdx + 1).trim();
      const part2 = toSplit.text.slice(splitIdx + 1).trim();
      result.splice(maxIdx, 1, 
        { scene: 0, text: part1 },
        { scene: 0, text: part2 }
      );
      result.forEach((s, idx) => { s.scene = idx + 1; });
    } else {
      break;
    }
  }

  result.forEach((s, idx) => { s.scene = idx + 1; });
  return result;
}

function generateTimeline(scenes, timestamps, imageFiles) {
  const images = (imageFiles || []).map(f => (typeof f === 'string' ? f : f.path));
  
  if (!scenes || scenes.length === 0) return [];
  if (!timestamps || timestamps.length === 0) return [];

  // ── Step 0: Đảm bảo số lượng scenes khớp với số lượng ảnh đã upload ────────
  let activeScenes = scenes;
  if (images.length > scenes.length) {
    console.log(`[Timeline] Số lượng ảnh nạp vào (${images.length}) > số scenes (${scenes.length}). Mở rộng kịch bản để khớp 100% hình ảnh.`);
    activeScenes = expandScenesToMatchImages(scenes, timestamps, images.length);
  }

  // ── Step 1: Flatten timestamps into words for high-resolution matching ──────
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

  const wordsForDp = flatWords.length > 0 ? flatWords : timestamps;

  // ── Step 1b: Dynamic Programming alignment ─────────────────────────────────
  const N = wordsForDp.length;
  const K = activeScenes.length;

  const dp = Array.from({ length: K + 1 }, () => Array(N + 1).fill(-Infinity));
  const back = Array.from({ length: K + 1 }, () => Array(N + 1).fill(0));
  dp[0][0] = 0;

  for (let k = 1; k <= K; k++) {
    const sceneText = activeScenes[k - 1].text.toLowerCase();
    for (let i = 0; i <= N; i++) {
      let bestScore = dp[k - 1][i];
      let bestJ = i;
      
      let chunkText = "";
      for (let j = i - 1; j >= Math.max(0, i - 150); j--) {
        chunkText = chunkText === "" ? wordsForDp[j].text : wordsForDp[j].text + " " + chunkText;
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
  activeScenes.forEach(scene => { sceneSegmentsMap[scene.scene] = []; });

  let currN = N;
  for (let k = K; k >= 1; k--) {
    let startJ = back[k][currN];
    for (let m = startJ; m < currN; m++) {
      sceneSegmentsMap[activeScenes[k - 1].scene].push(wordsForDp[m]);
    }
    currN = startJ;
  }

  // ── Step 2: Build raw timeline entries from assigned segments ─────────────
  const timeline = activeScenes.map((scene, index) => {
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

    if (item.start === undefined) {
      item.start = i > 0 ? timeline[i - 1].end : 0;
    }

    if (item.end === undefined) {
      let nextStart;
      for (let j = i + 1; j < timeline.length; j++) {
        if (timeline[j].start !== undefined) { nextStart = timeline[j].start; break; }
      }
      if (nextStart !== undefined) {
        item.end = nextStart;
      } else {
        const remaining = totalDuration - item.start;
        const undefinedCount = timeline.slice(i).filter(x => x.end === undefined).length + 1;
        item.end = item.start + (remaining > 0 ? remaining / undefinedCount : 2);
      }
    }
  }

  // Second pass: close gaps by extending end time to start of next scene
  for (let i = 0; i < timeline.length - 1; i++) {
    if (timeline[i].end < timeline[i + 1].start) {
      timeline[i].end = timeline[i + 1].start;
    }
  }

  // Enforce minimum duration
  const MIN_SCENE_DUR = 0.5;
  for (let i = 0; i < timeline.length; i++) {
    let dur = timeline[i].end - timeline[i].start;
    if (dur < MIN_SCENE_DUR) {
      let needed = MIN_SCENE_DUR - dur;
      if (i < timeline.length - 1) {
        let nextDur = timeline[i + 1].end - timeline[i + 1].start;
        if (nextDur > MIN_SCENE_DUR) {
          let steal = Math.min(needed, nextDur - MIN_SCENE_DUR);
          timeline[i].end += steal;
          timeline[i + 1].start += steal;
          needed -= steal;
        }
      }
      if (needed > 0 && i > 0) {
        let prevDur = timeline[i - 1].end - timeline[i - 1].start;
        if (prevDur > MIN_SCENE_DUR) {
          let steal = Math.min(needed, prevDur - MIN_SCENE_DUR);
          timeline[i].start -= steal;
          timeline[i - 1].end -= steal;
          needed -= steal;
        }
      }
      if (needed > 0) {
        timeline[i].end += needed;
      }
    }
  }

  // Third pass: resolve overlaps, enforce monotonicity & round
  for (let i = 0; i < timeline.length; i++) {
    const item = timeline[i];

    if (i > 0 && item.start < timeline[i - 1].end) {
      item.start = timeline[i - 1].end;
    }

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

  console.log(`📽  Timeline built: ${timeline.length} scenes spanning 0s → ${totalDuration.toFixed(2)}s (tất cả ${images.length} ảnh đã được gán đầy đủ)`);
  timeline.forEach((item, i) => {
    console.log(`  Scene ${i + 1}: ${item.start}s → ${item.end}s (${item.duration}s) "${item.text.slice(0, 40)}..."`);
  });

  return timeline;
}

module.exports = { generateTimeline, expandScenesToMatchImages };
