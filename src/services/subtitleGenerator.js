const fs = require('fs');

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
      sceneWords = wordTimestamps.filter(
        w => w.start >= sceneStart - 0.1 && w.start < sceneEnd
      );
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
function generateASS(timeline, outputPath, wordTimestamps = null, aspectRatio = '16:9') {
  let playResX = 1920;
  let playResY = 1080;
  let fontSize = 72;
  let marginV = 160; // Increased to move subtitles higher
  let outline = 4;
  let shadow = 2;
  let bold = 0;
  let maxChars = 80;        // max chars per subtitle chunk
  let maxCharsPerLine = 42; // max chars per visible line in ASS
  let zoomScale = 115;

  if (aspectRatio === '9:16') {
    playResX = 1080;
    playResY = 1920;
    fontSize = 48;
    marginV = 140; // Increased to move subtitles higher
    outline = 3;
    shadow = 1;
    bold = 1;
    maxChars = 60;        // max chars per subtitle chunk
    maxCharsPerLine = 32; // max chars per visible line in ASS
    zoomScale = 112;
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

  const chunked = chunkTimeline(timeline, wordTimestamps, maxChars);

  let events = '';

  chunked.forEach((item) => {
    const words = getOrCreateWords(item);

    if (words.length > 0) {
      words.forEach((wordObj, i) => {
        const eventStart = i === 0 ? item.start : wordObj.start;
        const eventEnd = i === words.length - 1 ? item.end : words[i + 1].start;
        
        // Ensure positive duration and prevent overlap issues
        const duration = Math.max(0.05, eventEnd - eventStart);
        const start = formatASS(eventStart);
        const end = formatASS(eventStart + duration);

        const chunkDur = item.end - item.start;
        const progress = chunkDur > 0 ? (eventStart - item.start) / chunkDur : 0;
        const currentScale = zoomScale - (zoomScale - 100) * progress;
        
        const startOffset = Math.round((item.start - eventStart) * 1000);
        const endOffset = Math.round((item.end - eventStart) * 1000);
        
        const anim = `{\\fscx${Math.round(currentScale)}\\fscy${Math.round(currentScale)}\\t(${startOffset},${endOffset},\\fscx100\\fscy100)}`;

        // Consistent word-wrap per chunk
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
        if (currentLine.length > 0) {
          lines.push(currentLine);
        }

        const formattedLines = lines.map(line => {
          return line.map(wItem => {
            const escWord = escapeASS(wItem.word);
            if (wItem.index === i) {
              return `{\\c&H0000D7FF&\\b1}${escWord}{\\c&H00FFFFFF&\\b${bold}}`;
            }
            return escWord;
          }).join(' ');
        });

        const text = `${anim}${formattedLines.join('\\N')}`;
        events += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}\n`;
      });
    } else {
      // Fallback in case of empty text/words
      const start = formatASS(item.start);
      const end = formatASS(item.end);
      const durMs = Math.max(1, Math.round((item.end - item.start) * 1000));
      const anim = `{\\fscx${zoomScale}\\fscy${zoomScale}\\t(0,${durMs},\\fscx100\\fscy100)}`;
      const text = `${anim}${buildStyledAssText(item.text, maxCharsPerLine, 2)}`;
      events += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}\n`;
    }
  });

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