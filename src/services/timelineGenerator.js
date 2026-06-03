const stringSimilarity = require('string-similarity').compareTwoStrings;

function generateTimeline(scenes, timestamps, imageFiles) {
  const images = imageFiles.map(f => f.path);
  
  if (!scenes || scenes.length === 0) return [];
  if (!timestamps || timestamps.length === 0) return [];

  // ── Step 1: Assign each timestamp segment to its best-matching scene ──────
  const sceneSegmentsMap = {};
  scenes.forEach(scene => { sceneSegmentsMap[scene.scene] = []; });

  timestamps.forEach(ts => {
    let bestScene = null;
    let bestScore = -1;
    scenes.forEach(scene => {
      const score = stringSimilarity(scene.text.toLowerCase(), ts.text.toLowerCase());
      if (score > bestScore) { bestScore = score; bestScene = scene; }
    });
    if (bestScene) {
      sceneSegmentsMap[bestScene.scene].push(ts);
    }
  });

  // ── Step 2: Build raw timeline entries from assigned segments ─────────────
  const timeline = scenes.map((scene, index) => {
    const segments = sceneSegmentsMap[scene.scene];
    let start, end;
    if (segments && segments.length > 0) {
      segments.sort((a, b) => a.start - b.start);
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

    // Enforce strictly increasing order – no overlaps allowed
    if (i > 0 && item.start < timeline[i - 1].end) {
      item.start = timeline[i - 1].end;
    }

    // Enforce minimum scene duration of 0.5s
    if (item.end <= item.start) {
      item.end = item.start + 0.5;
    }

    item.start = Math.round(item.start * 100) / 100;
    item.end = Math.round(item.end * 100) / 100;
    item.duration = Math.round((item.end - item.start) * 100) / 100;
  }

  // ── Step 4: Snap last scene to exact end of audio ─────────────────────────
  if (timeline.length > 0) {
    const last = timeline[timeline.length - 1];
    last.end = Math.round(totalDuration * 100) / 100;
    last.duration = Math.round((last.end - last.start) * 100) / 100;
  }

  console.log(`📽  Timeline built: ${timeline.length} scenes spanning 0s → ${totalDuration.toFixed(2)}s`);
  timeline.forEach((item, i) => {
    console.log(`  Scene ${i + 1}: ${item.start}s → ${item.end}s (${item.duration}s) "${item.text.slice(0, 40)}..."`);
  });

  return timeline;
}

module.exports = { generateTimeline };
