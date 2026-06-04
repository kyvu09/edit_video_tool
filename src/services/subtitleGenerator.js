const fs = require('fs');

// ── ASS timestamp formatter: H:MM:SS.CS ─────────────────────────────────────
function formatASS(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.round((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '00')}.${String(cs).padStart(2, '0')}`;
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
  return text
    .replace(/\\/g, '\\\\')   // literal backslash → escaped
    .replace(/\{/g, '\\{')    // { is start of tag block → escape
    .replace(/\}/g, '\\}');   // } is end of tag block → escape
}

// ── Keyword Emphasis ─────────────────────────────────────────────────────────
// Highlights ALL-CAPS sequences of 3+ ASCII letters in gold + bold.
// ASS color format: &HAABBGGRR  →  Gold (R=255,G=215,B=0): &H0000D7FF
function applyKeywordEmphasis(text) {
  return text.replace(/\b[A-Z]{3,}\b/g, (match) => {
    return `{\\c&H0000D7FF&\\b1}${match}{\\c&H00FFFFFF&\\b0}`;
  });
}

// ── Karaoke word builder ──────────────────────────────────────────────────────
// Uses \kf{cs} ASS tags to fill each word as it is being spoken.
// Secondary color (gray) = unspoken, Primary color (white) = spoken.
function buildKaraokeText(wordTimestamps, sceneStart, sceneEnd) {
  if (!wordTimestamps || wordTimestamps.length === 0) return null;

  // Find words that fall within this scene's time window (±100ms tolerance)
  const sceneWords = wordTimestamps.filter(
    w => w.start >= sceneStart - 0.1 && w.start < sceneEnd
  );
  if (sceneWords.length === 0) return null;

  let karaokeText = '';
  sceneWords.forEach(word => {
    const durationCs = Math.max(1, Math.round((word.end - word.start) * 100));
    karaokeText += `{\\kf${durationCs}}${escapeASS(word.word)} `;
  });
  return karaokeText.trim();
}

// ── generateASS ───────────────────────────────────────────────────────────────
// Produces a rich .ass subtitle file with:
//   • Subtitle Pop    – fade-in (180ms) + scale bounce (108%→100%) on entry
//   • Karaoke         – per-word fill highlighting if wordTimestamps supplied
//   • Keyword Emphasis– ALL-CAPS words rendered in gold + bold
//
// @param {Array}  timeline       Scene timeline items [{text, start, end}, ...]
// @param {string} outputPath     Where to write the .ass file
// @param {Array}  wordTimestamps Flat list of {word, start, end} (optional)
// @param {Array}  timeline       Scene timeline items [{text, start, end}, ...]
// @param {string} outputPath     Where to write the .ass file
// @param {Array}  wordTimestamps Flat list of {word, start, end} (optional)
// @param {string} aspectRatio    Video aspect ratio: '16:9' | '9:16'
function generateASS(timeline, outputPath, wordTimestamps = null, aspectRatio = '16:9') {
  let playResX = 1920;
  let playResY = 1080;
  let fontSize = 72;
  let marginV = 110;
  let outline = 4;
  let shadow = 2;
  let bold = 0;
  let popAnimation = '{\\fad(180,120)\\t(0,250,\\fscx108\\fscy108)\\t(250,450,\\fscx100\\fscy100)}';

  if (aspectRatio === '9:16') {
    playResX = 1080;
    playResY = 1920;
    fontSize = 60;
    marginV = 150;  // Positioned at the bottom to avoid obscuring the center image
    outline = 4;
    shadow = 2;
    bold = 1;       // Bold font is standard for short videos
    popAnimation = '{\\fad(100,100)\\t(0,120,\\fscx115\\fscy115)\\t(120,240,\\fscx100\\fscy100)}';
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

  // ── Subtitle Pop animation tags ──
  const POP = popAnimation;

  let events = '';
  timeline.forEach((item) => {
    const start = formatASS(item.start);
    const end   = formatASS(item.end);

    let text;
    const karaokeText = buildKaraokeText(wordTimestamps, item.start, item.end);

    if (karaokeText) {
      // ── Karaoke mode: words light up as they are spoken ──
      // Pop tags precede the karaoke text; secondary color shows unspoken words in gray
      text = `${POP}${karaokeText}`;
    } else {
      // ── Standard mode: pop + keyword emphasis ──
      text = `${POP}${applyKeywordEmphasis(escapeASS(item.text))}`;
    }

    events += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}\n`;
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
