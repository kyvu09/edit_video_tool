const fs = require('fs');

// ── Word Normalization ──────────────────────────────────────────────────────
function normalizeWord(word) {
  return String(word)
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'–\[\]]/g, "")
    .trim();
}

// ── Edit Distance / Levenshtein ─────────────────────────────────────────────
function getEditDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function getMatchScore(sNorm, tNorm) {
  if (sNorm === tNorm) return 2.0;
  const maxLen = Math.max(sNorm.length, tNorm.length);
  if (maxLen === 0) return 2.0;
  const dist = getEditDistance(sNorm, tNorm);
  const sim = (maxLen - dist) / maxLen;
  if (sim >= 0.5) return sim * 1.5;
  return -1.0;
}

// ── Needleman-Wunsch Alignment ─────────────────────────────────────────────
function alignScriptWithTranscription(scriptWords, transcribedWords) {
  const M = scriptWords.length;
  const N = transcribedWords.length;

  if (M === 0 || N === 0) return [];

  const dp = Array.from({ length: M + 1 }, () => Array(N + 1).fill(-Infinity));
  const parent = Array.from({ length: M + 1 }, () => Array(N + 1).fill(''));

  dp[0][0] = 0;
  const GAP_PENALTY = -1.0;

  for (let i = 1; i <= M; i++) {
    dp[i][0] = dp[i - 1][0] + GAP_PENALTY;
    parent[i][0] = 'up';
  }
  for (let j = 1; j <= N; j++) {
    dp[0][j] = dp[0][j - 1] + GAP_PENALTY;
    parent[0][j] = 'left';
  }

  for (let i = 1; i <= M; i++) {
    const sNorm = normalizeWord(scriptWords[i - 1]);
    for (let j = 1; j <= N; j++) {
      const tNorm = normalizeWord(transcribedWords[j - 1].word);
      const matchScore = getMatchScore(sNorm, tNorm);
      const diagScore = dp[i - 1][j - 1] + matchScore;
      const upScore = dp[i - 1][j] + GAP_PENALTY;
      const leftScore = dp[i][j - 1] + GAP_PENALTY;

      const maxScore = Math.max(diagScore, upScore, leftScore);
      dp[i][j] = maxScore;

      if (maxScore === diagScore) parent[i][j] = 'diag';
      else if (maxScore === upScore) parent[i][j] = 'up';
      else parent[i][j] = 'left';
    }
  }

  let i = M, j = N;
  const alignment = Array(M).fill(null);

  while (i > 0 || j > 0) {
    const dir = parent[i][j];
    if (dir === 'diag') {
      alignment[i - 1] = j - 1;
      i--; j--;
    } else if (dir === 'up') {
      alignment[i - 1] = null;
      i--;
    } else if (dir === 'left') {
      j--;
    } else {
      break;
    }
  }

  return alignment;
}

// ── Word Alignment per Scene ───────────────────────────────────────────────
function getAlignedWordsForScene(scriptText, sceneWords, sceneStart, sceneEnd) {
  const scriptWords = String(scriptText).trim().split(/\s+/).filter(Boolean);
  if (scriptWords.length === 0) return [];

  // Fallback nếu không có Whisper words
  if (!sceneWords || sceneWords.length === 0) {
    const totalChars = scriptWords.reduce((sum, w) => sum + w.length, 0);
    const duration = sceneEnd - sceneStart;
    let currentStart = sceneStart;

    return scriptWords.map((word) => {
      const wordDuration = totalChars > 0 ? (word.length / totalChars) * duration : 0;
      const wObj = {
        word,
        start: Math.round(currentStart * 100) / 100,
        end: Math.round((currentStart + wordDuration) * 100) / 100
      };
      currentStart += wordDuration;
      return wObj;
    });
  }

  const alignment = alignScriptWithTranscription(scriptWords, sceneWords);
  const alignedWords = Array(scriptWords.length).fill(null);

  // 1. Gán timestamps cho từ đã khớp
  for (let i = 0; i < scriptWords.length; i++) {
    const tIdx = alignment[i];
    if (tIdx !== null && sceneWords[tIdx]) {
      alignedWords[i] = {
        word: scriptWords[i],
        start: sceneWords[tIdx].start,
        end: sceneWords[tIdx].end
      };
    }
  }

  // 2. Nội suy timestamps cho từ chưa khớp
  let idx = 0;
  const M = scriptWords.length;
  while (idx < M) {
    if (alignedWords[idx] === null) {
      const startNull = idx;
      while (idx < M && alignedWords[idx] === null) idx++;
      const endNull = idx - 1;

      let prevEnd = sceneStart;
      if (startNull > 0) {
        for (let k = startNull - 1; k >= 0; k--) {
          if (alignedWords[k] !== null) { prevEnd = alignedWords[k].end; break; }
        }
      }

      let nextStart = sceneEnd;
      if (endNull < M - 1) {
        for (let k = endNull + 1; k < M; k++) {
          if (alignedWords[k] !== null) { nextStart = alignedWords[k].start; break; }
        }
      }

      if (nextStart < prevEnd) nextStart = prevEnd;
      const gapDuration = nextStart - prevEnd;
      const blockWords = scriptWords.slice(startNull, endNull + 1);
      const totalChars = blockWords.reduce((a, w) => a + Math.max(w.length, 1), 0);

      let currentTime = prevEnd;
      for (let k = startNull; k <= endNull; k++) {
        const weight = Math.max(scriptWords[k].length, 1) / totalChars;
        const dur = gapDuration * weight;
        alignedWords[k] = {
          word: scriptWords[k],
          start: Math.round(currentTime * 100) / 100,
          end: Math.round((currentTime + dur) * 100) / 100
        };
        currentTime += dur;
      }
    } else {
      idx++;
    }
  }

  // 3. Đảm bảo tính đơn điệu không nhảy ngược thời gian trong phạm vi Scene
  for (let k = 0; k < alignedWords.length; k++) {
    if (alignedWords[k].start < sceneStart) alignedWords[k].start = sceneStart;
    if (alignedWords[k].end > sceneEnd) alignedWords[k].end = sceneEnd;
    if (alignedWords[k].end < alignedWords[k].start) alignedWords[k].end = alignedWords[k].start;

    if (k > 0 && alignedWords[k].start < alignedWords[k - 1].end) {
      alignedWords[k].start = alignedWords[k - 1].end;
      if (alignedWords[k].end < alignedWords[k].start) {
        alignedWords[k].end = alignedWords[k].start;
      }
    }
  }

  return alignedWords;
}

// ── ASS timestamp formatter: H:MM:SS.CS ─────────────────────────────────────
function formatASS(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.round((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

// ── SRT timestamp formatter: HH:MM:SS,mmm ───────────────────────────────────
function formatSRT(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

// ── Escape ASS special characters ──────────────────────────────────────────
function escapeASS(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}');
}

// ── Wrap text for ASS display ────────────────────────────────────────────────
function wrapText(text, maxCharsPerLine = 28, maxLines = 2) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines = [];
  let current = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = current ? `${current} ${word}` : word;

    if (testLine.length <= maxCharsPerLine || current === '') {
      current = testLine;
      continue;
    }

    lines.push(current);
    current = word;

    if (lines.length === maxLines - 1) {
      const rest = [current, ...words.slice(i + 1)].join(' ');
      lines.push(rest);
      return lines.slice(0, maxLines);
    }
  }

  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

// ── Per-Scene ASS Events Generator (Chống lệch và nhảy trước 100%) ──────────
function buildPerSceneEvents(timeline, wordTimestamps, aspectRatio = '16:9', enableKaraokeEffect = true) {
  const maxChars = aspectRatio === '9:16' ? 26 : 42;
  const maxCharsPerLine = maxChars;
  let allEvents = '';

  timeline.forEach((sceneItem, sIdx) => {
    const sceneStart = sceneItem.start;
    const sceneEnd = sceneItem.end;

    // Lọc danh sách từ của Whisper thuộc phạm vi thời gian của Scene này
    let sceneWords = [];
    if (wordTimestamps && wordTimestamps.length > 0) {
      const rawWords = wordTimestamps.filter(w => w.start >= sceneStart - 0.25 && w.end <= sceneEnd + 0.35);
      sceneWords = getAlignedWordsForScene(sceneItem.text, rawWords, sceneStart, sceneEnd);
    } else {
      sceneWords = getAlignedWordsForScene(sceneItem.text, [], sceneStart, sceneEnd);
    }

    if (sceneWords.length === 0) return;

    // Chia các từ trong Scene này thành các chunks hiển thị
    const chunks = [];
    let curChunk = [];
    let curLen = 0;

    for (let i = 0; i < sceneWords.length; i++) {
      const wObj = sceneWords[i];
      const space = curChunk.length > 0 ? 1 : 0;
      const wouldExceed = (curLen + space + wObj.word.length > maxChars) && (curChunk.length > 0);

      const prevWord = curChunk.length > 0 ? curChunk[curChunk.length - 1].word : '';
      const hasPausePunct = /[.?!,;:]$/.test(prevWord) && curLen >= 12;
      const hasTimeGap = (curChunk.length > 0) && (wObj.start - curChunk[curChunk.length - 1].end >= 0.35);

      if ((wouldExceed || hasPausePunct || hasTimeGap) && curChunk.length > 0) {
        chunks.push(curChunk);
        curChunk = [wObj];
        curLen = wObj.word.length;
      } else {
        curChunk.push(wObj);
        curLen += space + wObj.word.length;
      }
    }
    if (curChunk.length > 0) chunks.push(curChunk);

    // Sinh các dialogue ASS cho từng chunk của Scene này
    chunks.forEach((chunk, cIdx) => {
      const chunkStart = chunk[0].start;
      const rawChunkEnd = chunk[chunk.length - 1].end;
      const nextChunkStart = cIdx < chunks.length - 1 ? chunks[cIdx + 1][0].start : sceneEnd;
      // Padded end: giữ subtitle hiển thị thêm 0.2s sau khi dứt lời, không vượt quá sceneEnd và chunk tiếp theo
      const chunkEnd = Math.min(sceneEnd, Math.max(rawChunkEnd, Math.min(rawChunkEnd + 0.2, nextChunkStart)));

      const upperChunk = chunk.map((w, idx) => ({
        word: String(w.word).toUpperCase(),
        start: w.start,
        end: w.end,
        index: idx
      }));

      // Bố cục phân dòng (wrap text)
      const lines = [[]];
      let lineLen = 0;
      upperChunk.forEach((w) => {
        const space = lines[lines.length - 1].length > 0 ? 1 : 0;
        if (lineLen + space + w.word.length > maxCharsPerLine && lines[lines.length - 1].length > 0) {
          lines.push([w]);
          lineLen = w.word.length;
        } else {
          lines[lines.length - 1].push(w);
          lineLen += space + w.word.length;
        }
      });

      const renderTypewriterText = (activeIdx) => {
        return lines.map(line => {
          const vis = line.filter(w => w.index <= activeIdx).map(w => escapeASS(w.word));
          const hid = line.filter(w => w.index > activeIdx).map(w => escapeASS(w.word));
          let res = '';
          if (vis.length > 0) res += `{\\alpha&H00&}${vis.join(' ')}`;
          if (hid.length > 0) {
            if (vis.length > 0) res += ' ';
            res += `{\\alpha&HFF&}${hid.join(' ')}`;
          }
          return res;
        }).join('\\N');
      };

      if (!enableKaraokeEffect) {
        // Chế độ câu/dòng bình thường: hiển thị CHÍNH XÁC từ lúc từ đầu bắt đầu nói tới khi từ cuối nói xong
        const s = formatASS(chunkStart);
        const e = formatASS(chunkEnd);
        allEvents += `Dialogue: 0,${s},${e},Default,,0,0,0,,${renderTypewriterText(upperChunk.length - 1)}\n`;
        return;
      }

      // Chế độ Karaoke / Typewriter: Reveal từng từ đúng nhịp phát âm
      let curStepTime = chunkStart;
      upperChunk.forEach((wordObj, idx) => {
        const isLast = idx === upperChunk.length - 1;
        const nextWordStart = isLast ? chunkEnd : upperChunk[idx + 1].start;
        const stepStart = curStepTime;
        const stepEnd = Math.max(stepStart + 0.04, nextWordStart);

        const s = formatASS(stepStart);
        const e = formatASS(stepEnd);
        allEvents += `Dialogue: 0,${s},${e},Default,,0,0,0,,${renderTypewriterText(idx)}\n`;
        curStepTime = stepEnd;
      });

      if (chunkEnd > curStepTime + 0.04) {
        const s = formatASS(curStepTime);
        const e = formatASS(chunkEnd);
        allEvents += `Dialogue: 0,${s},${e},Default,,0,0,0,,${renderTypewriterText(upperChunk.length - 1)}\n`;
      }
    });
  });

  return allEvents;
}

// ── generateASS ─────────────────────────────────────────────────────────────
function generateASS(timeline, outputPath, wordTimestamps = null, aspectRatio = '16:9', enableKaraokeEffect = true) {
  let playResX = 1920;
  let playResY = 1080;
  let fontSize = 46;
  let marginV = 70;
  let outline = 2;
  let shadow = 1;
  let bold = 1;

  if (aspectRatio === '9:16') {
    playResX = 1080;
    playResY = 1920;
    fontSize = 46;
    marginV = 180;
    outline = 2;
    shadow = 1;
    bold = 1;
  }

  const header = `[Script Info]
Title: AI Video Creator
ScriptType: v4.00+
WrapStyle: 0
PlayResX: ${playResX}
PlayResY: ${playResY}
ScaledBorderAndShadow: yes
YCbCr Matrix: None

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,${fontSize},&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,${bold},0,0,0,100,100,1.5,0,1,${outline},${shadow},2,40,40,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  console.log(`[SubtitleGen] 🎬 Tạo subtitle theo từng scene (Per-Scene Bounded, Karaoke: ${enableKaraokeEffect}). Khắc phục triệt để lỗi nhảy trước và lệch cảnh.`);
  const events = buildPerSceneEvents(timeline, wordTimestamps, aspectRatio, enableKaraokeEffect);

  fs.writeFileSync(outputPath, header + events, { encoding: 'utf8' });
  console.log(`[SubtitleGen] ✅ Subtitle file đã ghi thành công vào: ${outputPath}`);
  return outputPath;
}

// ── generateSRT ─────────────────────────────────────────────────────────────
function generateSRT(timestamps, outputPath) {
  let srtContent = '';
  timestamps.forEach((ts, index) => {
    srtContent += `${index + 1}\n`;
    srtContent += `${formatSRT(ts.start)} --> ${formatSRT(ts.end)}\n`;
    srtContent += `${ts.text}\n\n`;
  });

  fs.writeFileSync(outputPath, srtContent.trim());
  return outputPath;
}

module.exports = { generateASS, generateSRT };