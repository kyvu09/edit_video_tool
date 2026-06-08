const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const dotenv = require('dotenv');

dotenv.config();

const pythonPath = process.env.PYTHON_PATH || 'python';
const scriptPath = path.join(__dirname, 'src', 'services', 'transcribe_local.py');
const uploadsDir = path.join(__dirname, 'uploads');

// Find a suitable audio file in uploads/
const files = fs.readdirSync(uploadsDir);
const audioFile = files.find(f => f.endsWith('.mp3'));

if (!audioFile) {
  console.error("❌ No audio file (.mp3) found in uploads/ folder to run transcription on.");
  process.exit(1);
}

const audioPath = path.join(uploadsDir, audioFile);
console.log(`🎵 Using audio file for test: ${audioPath}`);

const cmd = `"${pythonPath}" "${scriptPath}" "${audioPath}"`;
console.log(`🚀 Running local transcriber: ${cmd}`);

exec(cmd, { maxBuffer: 20 * 1024 * 1024 }, (err, stdout, stderr) => {
  if (err) {
    console.error("❌ Execution error:", err.message);
    console.error("Stderr:", stderr);
    process.exit(1);
  }

  try {
    const data = JSON.parse(stdout.trim());
    if (data.error) {
      console.error("❌ Transcriber error response:", data.error);
      process.exit(1);
    }

    console.log("✅ Transcription completed successfully!");
    console.log(`Language: ${data.language}`);
    console.log(`Duration: ${data.duration}s`);
    console.log(`Segments: ${data.segments.length}`);
    console.log(`Words: ${data.words ? data.words.length : 0}`);

    if (data.words && data.words.length > 0) {
      console.log("\nFirst 5 words:");
      console.log(data.words.slice(0, 5));
    }

    // Now, run subtitleGenerator to generate subtitles
    const subtitleGenerator = require('./src/services/subtitleGenerator');
    
    // Create a mock timeline using the transcribed segments
    const timeline = data.segments.map(seg => ({
      text: seg.text,
      start: seg.start,
      end: seg.end
    }));

    const outputPath = path.join(__dirname, 'output', 'test_output.ass');
    if (!fs.existsSync(path.dirname(outputPath))) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }

    console.log(`\n📝 Generating ASS subtitles to: ${outputPath}`);
    subtitleGenerator.generateASS(timeline, outputPath, data.words, '16:9');

    console.log("✅ Subtitle file generated!");

    // Read and verify the ASS content
    const assContent = fs.readFileSync(outputPath, 'utf-8');
    const lines = assContent.split('\n');
    const dialogueLines = lines.filter(l => l.startsWith('Dialogue:'));

    console.log(`\n🔍 Verifying generated ASS content (${dialogueLines.length} Dialogue events):`);
    
    // Show a sample of Dialogue events, focusing on transition and colors
    console.log("--- Sample Dialogue Lines ---");
    dialogueLines.slice(0, 15).forEach((line, i) => {
      console.log(`[${i + 1}] ${line}`);
    });
    console.log("------------------------------");

    // Check for gap-aware structure: highlightIndex = -1 (no gold tags) vs active highlights
    const silenceLinesCount = dialogueLines.filter(l => !l.includes('\\c&H0000D7FF&')).length;
    const highlightLinesCount = dialogueLines.filter(l => l.includes('\\c&H0000D7FF&')).length;

    console.log(`Total silence/gap segments (no highlight): ${silenceLinesCount}`);
    console.log(`Total highlighted word segments: ${highlightLinesCount}`);

    if (silenceLinesCount > 0 && highlightLinesCount > 0) {
      console.log("\n🎉 SUCCESS: Both silence segments and word highlight segments exist and are correctly interleaved!");
    } else {
      console.log("\n⚠️ Warning: Did not find the expected mix of silence and highlighted segments. Please check the ASS format.");
    }

  } catch (parseErr) {
    console.error("❌ Failed to parse output JSON from python script. Stderr was:", stderr);
    console.error("Stdout was:", stdout.substring(0, 500) + (stdout.length > 500 ? "..." : ""));
    console.error(parseErr);
    process.exit(1);
  }
});
