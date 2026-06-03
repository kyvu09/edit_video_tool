const fs = require('fs');

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

function generateSRT(timestamps, outputPath) {
  let srtContent = '';
  
  timestamps.forEach((ts, index) => {
    srtContent += `${index + 1}\n`;
    srtContent += `${formatTime(ts.start)} --> ${formatTime(ts.end)}\n`;
    srtContent += `${ts.text}\n\n`;
  });

  fs.writeFileSync(outputPath, srtContent.trim());
  return outputPath;
}

module.exports = { generateSRT };
