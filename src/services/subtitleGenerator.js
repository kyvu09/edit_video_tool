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
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1  // deletion
          )
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function getWordSimilarity(a, b) {
  if (a === b) return 1.0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const dist = getEditDistance(a, b);
  return (maxLen - dist) / maxLen;
}

function getMatchScore(sNorm, tNorm) {
  if (sNorm === tNorm) {
    return 2.0;
  }
  const sim = getWordSimilarity(sNorm, tNorm);
  if (sim >= 0.6) {
    return sim * 1.5; // positive score for close match
  }
  return -1.0; // mismatch
}

// ── Needleman-Wunsch Alignment ─────────────────────────────────────────────
function alignScriptWithTranscription(scriptWords, transcribedWords) {
  const M = scriptWords.length;
  const N = transcribedWords.length;

  if (M === 0) return [];
  if (N === 0) return [];

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

      if (maxScore === diagScore) {
        parent[i][j] = 'diag';
      } else if (maxScore === upScore) {
        parent[i][j] = 'up';
      } else {
        parent[i][j] = 'left';
      }
    }
  }

  let i = M;
  let j = N;
  const alignment = Array(M).fill(null);

  while (i > 0 || j > 0) {
    const dir = parent[i][j];
    if (dir === 'diag') {
      alignment[i - 1] = j - 1;
      i--;
      j--;
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

// ── Script-to-Transcribed Word Alignment & Interpolation ───────────────────
function getAlignedWords(scriptText, sceneWords, sceneStart, sceneEnd) {
  const scriptWords = String(scriptText).trim().split(/\s+/).filter(Boolean);
  if (scriptWords.length === 0) return [];

  // If there are no transcribed words, fallback to char-weighted simulation
  if (!sceneWords || sceneWords.length === 0) {
    const totalChars = scriptWords.reduce((sum, w) => sum + w.length, 0);
    const duration = sceneEnd - sceneStart;
    let currentStart = sceneStart;

    return scriptWords.map((word) => {
      const wordDuration = totalChars > 0 ? (word.length / totalChars) * duration : 0;
      const wordStart = currentStart;
      const wordEnd = currentStart + wordDuration;
      currentStart = wordEnd;
      return {
        word,
        start: wordStart,
        end: wordEnd
      };
    });
  }

  const alignment = alignScriptWithTranscription(scriptWords, sceneWords);
  const alignedWords = Array(scriptWords.length).fill(null);

  // 1. Assign timestamps for matched words
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

  // 2. Interpolate timestamps for unmatched words
  let idx = 0;
  const M = scriptWords.length;
  while (idx < M) {
    if (alignedWords[idx] === null) {
      const startNull = idx;
      while (idx < M && alignedWords[idx] === null) {
        idx++;
      }
      const endNull = idx - 1;

      // Find bound times
      let prevEnd = sceneStart;
      if (startNull > 0) {
        for (let k = startNull - 1; k >= 0; k--) {
          if (alignedWords[k] !== null) {
            prevEnd = alignedWords[k].end;
            break;
          }
        }
      }

      let nextStart = sceneEnd;
      if (endNull < M - 1) {
        for (let k = endNull + 1; k < M; k++) {
          if (alignedWords[k] !== null) {
            nextStart = alignedWords[k].start;
            break;
          }
        }
      }

      // Enforce monotonically increasing bounds
      if (nextStart < prevEnd) {
        nextStart = prevEnd;
      }

      const gapDuration = nextStart - prevEnd;
      const blockWords = scriptWords.slice(startNull, endNull + 1);
      const charCounts = blockWords.map(w => Math.max(w.length, 1));
      const totalChars = charCounts.reduce((a, b) => a + b, 0);

      let currentTime = prevEnd;
      for (let k = startNull; k <= endNull; k++) {
        const weight = charCounts[k - startNull] / totalChars;
        const duration = gapDuration * weight;
        alignedWords[k] = {
          word: scriptWords[k],
          start: currentTime,
          end: currentTime + duration
        };
        currentTime = alignedWords[k].end;
      }
    } else {
      idx++;
    }
  }

  // Enforce monotonicity and non-overlap just in case
  for (let k = 0; k < alignedWords.length; k++) {
    // Keep within scene bounds
    if (alignedWords[k].start < sceneStart) alignedWords[k].start = sceneStart;
    if (alignedWords[k].end > sceneEnd) alignedWords[k].end = sceneEnd;
    if (alignedWords[k].end < alignedWords[k].start) alignedWords[k].end = alignedWords[k].start;
    
    // Ensure sequential progression relative to previous
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

// ── Escape ASS special characters in plain text ──────────────────────────────
function escapeASS(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}');
}

// ── Keyword Emphasis ─────────────────────────────────────────────────────────
// Highlights ALL-CAPS sequences of 3+ ASCII letters in gold + bold.
function applyKeywordEmphasis(text) {
  return text.replace(/\b[A-Z]{3,}\b/g, (match) => {
    return `{\\c&H0000D7FF&\\b1}${match}{\\c&H00FFFFFF&\\b0}`;
  });
}

// ── Split plain text into chunks ──────────────────────────────────────────────
function splitTextIntoChunks(text, maxChars = 40) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const chunks = [];
  let currentChunk = [];
  let currentLength = 0;

  for (const word of words) {
    const spaceNeeded = currentChunk.length > 0 ? 1 : 0;

    if (currentLength + spaceNeeded + word.length > maxChars) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [word];
        currentLength = word.length;
      } else {
        chunks.push(word);
        currentChunk = [];
        currentLength = 0;
      }
    } else {
      currentChunk.push(word);
      currentLength += spaceNeeded + word.length;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
}

// ── Wrap text for ASS display ────────────────────────────────────────────────
function wrapText(text, maxCharsPerLine = 18, maxLines = 2) {
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

function buildStyledAssText(text, maxCharsPerLine = 18, maxLines = 2) {
  return wrapText(text, maxCharsPerLine, maxLines)
    .map(line => applyKeywordEmphasis(escapeASS(line)))
    .join('\\N');
}

// ── Chunk the entire timeline to max characters per subtitle ────────────────
function chunkTimeline(timeline, wordTimestamps, maxChars = 40) {
  const newTimeline = [];

  timeline.forEach((item) => {
    const sceneStart = item.start;
    const sceneEnd = item.end;
    const duration = sceneEnd - sceneStart;

    let sceneWords = [];
    if (wordTimestamps && wordTimestamps.length > 0) {
      const rawSceneWords = wordTimestamps.filter(
        w => w.start >= sceneStart - 0.1 && w.start < sceneEnd
      );
      if (rawSceneWords.length > 0) {
        sceneWords = getAlignedWords(item.text, rawSceneWords, sceneStart, sceneEnd);
      }
    }

    if (sceneWords.length > 0) {
      let currentChunkWords = [];
      let currentLength = 0;
      const chunksOfWords = [];

      sceneWords.forEach((wordObj) => {
        const wordStr = wordObj.word;
        const spaceNeeded = currentChunkWords.length > 0 ? 1 : 0;

        if (currentLength + spaceNeeded + wordStr.length > maxChars) {
          if (currentChunkWords.length > 0) {
            chunksOfWords.push(currentChunkWords);
            currentChunkWords = [wordObj];
            currentLength = wordStr.length;
          } else {
            chunksOfWords.push([wordObj]);
            currentChunkWords = [];
            currentLength = 0;
          }
        } else {
          currentChunkWords.push(wordObj);
          currentLength += spaceNeeded + wordStr.length;
        }
      });

      if (currentChunkWords.length > 0) {
        chunksOfWords.push(currentChunkWords);
      }

      for (let i = 0; i < chunksOfWords.length; i++) {
        const chunk = chunksOfWords[i];
        const start = i === 0 ? sceneStart : chunk[0].start;
        const end = i === chunksOfWords.length - 1 ? sceneEnd : chunksOfWords[i + 1][0].start;

        newTimeline.push({
          text: chunk.map(w => w.word).join(' '),
          start,
          end,
          words: chunk
        });
      }
    } else {
      const textChunks = splitTextIntoChunks(item.text, maxChars);

      if (textChunks.length <= 1) {
        newTimeline.push({
          text: item.text,
          start: sceneStart,
          end: sceneEnd,
          words: null
        });
      } else {
        const totalChars = textChunks.reduce((sum, chunk) => sum + chunk.length, 0);
        let currentStart = sceneStart;

        textChunks.forEach((chunk, index) => {
          const chunkDuration = (chunk.length / totalChars) * duration;
          const end = index === textChunks.length - 1 ? sceneEnd : currentStart + chunkDuration;

          newTimeline.push({
            text: chunk,
            start: currentStart,
            end,
            words: null
          });

          currentStart = end;
        });
      }
    }
  });

  return newTimeline;
}

// ── Helper to retrieve or simulate word-level timestamps ────────────────────
function getOrCreateWords(item) {
  if (item.words && item.words.length > 0) {
    return item.words;
  }

  // Fallback: split text into words and simulate timestamps
  const wordsList = String(item.text).trim().split(/\s+/).filter(Boolean);
  if (wordsList.length === 0) return [];

  const totalChars = wordsList.reduce((sum, w) => sum + w.length, 0);
  const duration = item.end - item.start;
  let currentStart = item.start;

  return wordsList.map((word) => {
    const wordDuration = totalChars > 0 ? (word.length / totalChars) * duration : 0;
    const wordStart = currentStart;
    const wordEnd = currentStart + wordDuration;
    currentStart = wordEnd;
    return {
      word,
      start: wordStart,
      end: wordEnd
    };
  });
}

// ── generateASS ───────────────────────────────────────────────────────────────
function generateASS(timeline, outputPath, wordTimestamps = null, aspectRatio = '16:9', enableKaraokeEffect = true) {
  let playResX = 1920;
  let playResY = 1080;
  let fontSize = 48;
  let marginV = 50; // Increased to move subtitles higher
  let outline = 4;
  let shadow = 2;
  let bold = 0;
  let maxChars = 70;        // max chars per subtitle chunk (fit on 1 line)
  let maxCharsPerLine = 70; // prevent line wrapping
  let zoomScale = 105;

  if (aspectRatio === '9:16') {
    playResX = 1080;
    playResY = 1920;
    fontSize = 48;
    marginV = 140; // Increased to move subtitles higher
    outline = 3;
    shadow = 1;
    bold = 1;
    maxChars = 32;        // fit on 1 line for portrait
    maxCharsPerLine = 32; // prevent line wrapping
    zoomScale = 105;
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
Style: Default,Arial,${fontSize},&H00FFFFFF,&H00888888,&H00000000,&HC8000000,${bold},0,0,0,100,100,1.5,0,1,${outline},${shadow},2,80,80,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

// ── Global Alignment: align FULL script against ALL word timestamps at once ───
// This is the most accurate approach: timing comes 100% from Whisper,
// no scene-boundary filtering that could mismatch words to wrong time windows.
function buildEventsFromGlobalAlignment(allScriptText, wordTimestamps, maxChars, maxCharsPerLine, zoomScale, bold, enableKaraokeEffect) {
  if (!wordTimestamps || wordTimestamps.length === 0) return null;

  const audioStart = wordTimestamps[0].start;
  const audioEnd   = wordTimestamps[wordTimestamps.length - 1].end;

  // 1. Align the full script text to all word timestamps globally
  const alignedWords = getAlignedWords(allScriptText, wordTimestamps, audioStart, audioEnd);
  if (alignedWords.length === 0) return null;

  // 2. Split aligned words into display chunks by character count
  const chunks = [];
  let currentChunk = [];
  let currentLength = 0;

  for (const wordObj of alignedWords) {
    const space = currentChunk.length > 0 ? 1 : 0;
    if (currentLength + space + wordObj.word.length > maxChars && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [wordObj];
      currentLength = wordObj.word.length;
    } else {
      currentChunk.push(wordObj);
      currentLength += space + wordObj.word.length;
    }
  }
  if (currentChunk.length > 0) chunks.push(currentChunk);

  let events = '';

  chunks.forEach((chunk) => {
    const chunkStart = chunk[0].start;
    const chunkEnd   = chunk[chunk.length - 1].end;
    const chunkDur   = Math.max(0.05, chunkEnd - chunkStart);

    // ── Build line layout for consistent display within this chunk ────────────
    const lines = [[]];
    let lineLen = 0;
    chunk.forEach((w, idx) => {
      const space = lines[lines.length - 1].length > 0 ? 1 : 0;
      if (lineLen + space + w.word.length > maxCharsPerLine && lines[lines.length - 1].length > 0) {
        lines.push([{ word: w.word, index: idx }]);
        lineLen = w.word.length;
      } else {
        lines[lines.length - 1].push({ word: w.word, index: idx });
        lineLen += space + w.word.length;
      }
    });

    // Helper: render the chunk text with one word optionally highlighted,
    // and a zoom-out animation anchored to [chunkStart, chunkEnd].
    const renderChunkText = (eventStart, highlightIdx) => {
      const progress     = chunkDur > 0 ? (eventStart - chunkStart) / chunkDur : 0;
      const currentScale = zoomScale - (zoomScale - 100) * progress;
      const startOff     = Math.round((chunkStart - eventStart) * 1000);
      const endOff       = Math.round((chunkEnd   - eventStart) * 1000);
      const anim = `{\\fscx${Math.round(currentScale)}\\fscy${Math.round(currentScale)}\\t(${startOff},${endOff},\\fscx100\\fscy100)}`;

      const formattedLines = lines.map(line =>
        line.map(wItem => {
          const esc = escapeASS(wItem.word);
          if (enableKaraokeEffect && wItem.index === highlightIdx) {
            return `{\\c&H0000D7FF&\\b1}${esc}{\\c&H00FFFFFF&\\b${bold}}`;
          }
          return esc;
        }).join(' ')
      );
      return anim + formattedLines.join('\\N');
    };

    if (!enableKaraokeEffect) {
      // Static event for whole chunk — no word coloring
      const start  = formatASS(chunkStart);
      const end    = formatASS(chunkEnd);
      const durMs  = Math.max(1, Math.round(chunkDur * 1000));
      const anim   = `{\\fscx${zoomScale}\\fscy${zoomScale}\\t(0,${durMs},\\fscx100\\fscy100)}`;
      const textStr = anim + lines.map(line => line.map(wItem => escapeASS(wItem.word)).join(' ')).join('\\N');
      events += `Dialogue: 0,${start},${end},Default,,0,0,0,,${textStr}\n`;
      return;
    }

    // Karaoke: emit one ASS event per word (+ gap segments between words)
    let currentTime = chunkStart;

    chunk.forEach((wordObj, idx) => {
      // Gap before this word
      if (wordObj.start > currentTime + 0.04) {
        const s = formatASS(currentTime);
        const e = formatASS(wordObj.start);
        events += `Dialogue: 0,${s},${e},Default,,0,0,0,,${renderChunkText(currentTime, -1)}\n`;
        currentTime = wordObj.start;
      }

      // Word highlight segment
      const wStart = Math.max(currentTime, wordObj.start);
      const wEnd   = Math.max(wStart + 0.04, wordObj.end);
      const s      = formatASS(wStart);
      const e      = formatASS(wEnd);
      events += `Dialogue: 0,${s},${e},Default,,0,0,0,,${renderChunkText(wStart, idx)}\n`;
      currentTime = wEnd;
    });

    // Trailing silence at end of chunk
    if (chunkEnd > currentTime + 0.04) {
      const s = formatASS(currentTime);
      const e = formatASS(chunkEnd);
      events += `Dialogue: 0,${s},${e},Default,,0,0,0,,${renderChunkText(currentTime, -1)}\n`;
    }
  });

  return events;
}

  // ── Dispatch: use global alignment when word timestamps are available ────────
  // Global alignment is far more accurate because timing comes 100% from Whisper,
  // completely independent of scene-boundary matching errors.
  let events = '';

  if (wordTimestamps && wordTimestamps.length > 0) {
    const allScriptText = timeline.map(item => String(item.text).trim()).join(' ');
    const globalEvents = buildEventsFromGlobalAlignment(
      allScriptText, wordTimestamps, maxChars, maxCharsPerLine, zoomScale, bold, enableKaraokeEffect
    );
    if (globalEvents !== null) {
      console.log('[SubtitleGen] ✅ Using global word alignment for accurate subtitle sync.');
      events = globalEvents;
    } else {
      console.warn('[SubtitleGen] ⚠️ Global alignment returned null, falling back to per-scene mode.');
    }
  }

  // Fallback: per-scene chunking (used when no word timestamps available)
  if (!events) {
    console.log('[SubtitleGen] Using per-scene fallback (no word timestamps).');
    const chunked = chunkTimeline(timeline, wordTimestamps, maxChars);

    chunked.forEach((item) => {
      const words = getOrCreateWords(item);

      if (!enableKaraokeEffect) {
        const start = formatASS(item.start);
        const end = formatASS(item.end);
        const durMs = Math.max(1, Math.round((item.end - item.start) * 1000));
        const anim = `{\\fscx${zoomScale}\\fscy${zoomScale}\\t(0,${durMs},\\fscx100\\fscy100)}`;
        const text = `${anim}${buildStyledAssText(item.text, maxCharsPerLine, 2)}`;
        events += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}\n`;
        return;
      }

      if (words.length > 0) {
        const segments = [];
        let currentTime = item.start;

        words.forEach((wordObj, idx) => {
          if (wordObj.start > currentTime) {
            const gapDuration = wordObj.start - currentTime;
            if (gapDuration >= 0.05) {
              segments.push({ start: currentTime, end: wordObj.start, highlightIndex: -1 });
              segments.push({ start: wordObj.start, end: wordObj.end, highlightIndex: idx });
            } else {
              segments.push({ start: currentTime, end: wordObj.end, highlightIndex: idx });
            }
          } else {
            const start = Math.max(currentTime, wordObj.start);
            const end = Math.max(start, wordObj.end);
            if (end > start) segments.push({ start, end, highlightIndex: idx });
          }
          if (segments.length > 0) {
            currentTime = segments[segments.length - 1].end;
          } else {
            currentTime = wordObj.end;
          }
        });

        if (item.end > currentTime) {
          const gapDuration = item.end - currentTime;
          if (gapDuration >= 0.05) {
            segments.push({ start: currentTime, end: item.end, highlightIndex: -1 });
          } else if (segments.length > 0) {
            segments[segments.length - 1].end = item.end;
          }
        }

        segments.forEach((seg) => {
          const eventStart = seg.start;
          const duration = Math.max(0.05, seg.end - eventStart);
          const start = formatASS(eventStart);
          const end = formatASS(eventStart + duration);

          const chunkDur = item.end - item.start;
          const progress = chunkDur > 0 ? (eventStart - item.start) / chunkDur : 0;
          const currentScale = zoomScale - (zoomScale - 100) * progress;
          const startOffset = Math.round((item.start - eventStart) * 1000);
          const endOffset = Math.round((item.end - eventStart) * 1000);
          const anim = `{\\fscx${Math.round(currentScale)}\\fscy${Math.round(currentScale)}\\t(${startOffset},${endOffset},\\fscx100\\fscy100)}`;

          const lines = [];
          let currentLine = [];
          let currentLength = 0;
          words.forEach((w, idx) => {
            const spaceNeeded = currentLine.length > 0 ? 1 : 0;
            if (currentLength + spaceNeeded + w.word.length > maxCharsPerLine) {
              if (currentLine.length > 0) {
                lines.push(currentLine);
                currentLine = [{ word: w.word, index: idx }];
                currentLength = w.word.length;
              } else {
                lines.push([{ word: w.word, index: idx }]);
                currentLine = [];
                currentLength = 0;
              }
            } else {
              currentLine.push({ word: w.word, index: idx });
              currentLength += spaceNeeded + w.word.length;
            }
          });
          if (currentLine.length > 0) lines.push(currentLine);

          const formattedLines = lines.map(line =>
            line.map(wItem => {
              const escWord = escapeASS(wItem.word);
              if (enableKaraokeEffect && wItem.index === seg.highlightIndex) {
                return `{\\c&H0000D7FF&\\b1}${escWord}{\\c&H00FFFFFF&\\b${bold}}`;
              }
              return escWord;
            }).join(' ')
          );

          events += `Dialogue: 0,${start},${end},Default,,0,0,0,,${anim}${formattedLines.join('\\N')}\n`;
        });
      } else {
        const start = formatASS(item.start);
        const end = formatASS(item.end);
        const durMs = Math.max(1, Math.round((item.end - item.start) * 1000));
        const anim = `{\\fscx${zoomScale}\\fscy${zoomScale}\\t(0,${durMs},\\fscx100\\fscy100)}`;
        events += `Dialogue: 0,${start},${end},Default,,0,0,0,,${anim}${buildStyledAssText(item.text, maxCharsPerLine, 2)}\n`;
      }
    });
  }

  fs.writeFileSync(outputPath, header + events, { encoding: 'utf8' });
  return outputPath;
}

// ── generateSRT (kept for backward compatibility) ────────────────────────────
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