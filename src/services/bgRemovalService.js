const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Promisified child_process.exec helper
 */
function execAsync(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error(error.message || stderr));
      else resolve(stdout);
    });
  });
}

/**
 * Process all foreground images: remove their background and composite on background image
 *
 * @param {Array}  imagePaths     List of absolute paths to uploaded scene images
 * @param {string} backgroundPath  Path to the custom background image (optional)
 * @param {string} sessionDir      Directory where output files should be saved
 * @param {Function} onProgress    Callback for progress tracking (currentIndex, totalCount)
 * @returns {Promise<Array>}       List of absolute paths to the new composited images
 */
async function processBackgrounds(imagePaths, backgroundPath, sessionDir, mode = 'whitekey', aspectRatio = '16:9', onProgress) {
  // Handle fallback if onProgress is passed as 5th argument
  if (typeof aspectRatio === 'function') {
    onProgress = aspectRatio;
    aspectRatio = '16:9';
  }

  const pythonPath = process.env.PYTHON_PATH || 'python';
  const scriptPath = path.resolve(__dirname, 'remove_bg.py');
  
  const compositedPaths = [];
  const total = imagePaths.length;

  for (let idx = 0; idx < total; idx++) {
    const fgPath = path.resolve(imagePaths[idx]);
    const outPath = path.join(sessionDir, `composite_scene_${idx}.png`);
    compositedPaths.push(outPath);

    if (onProgress) {
      onProgress(idx, total);
    }

    // Command: python remove_bg.py <input_fg> <output> <mode> [<input_bg>] [<aspect_ratio>]
    const args = [
      `"${pythonPath}"`,
      `"${scriptPath}"`,
      `"${fgPath}"`,
      `"${outPath}"`,
      `"${mode}"`
    ];

    if (backgroundPath && fs.existsSync(backgroundPath)) {
      args.push(`"${path.resolve(backgroundPath)}"`);
    }

    // Append aspect ratio for layout resizing
    args.push(`"${aspectRatio}"`);

    const cmd = args.join(' ');
    console.log(`[Rembg Service] Processing scene ${idx + 1}/${total}: ${cmd}`);
    
    try {
      await execAsync(cmd);
    } catch (err) {
      console.error(`[Rembg Service] Failed to process scene ${idx + 1}:`, err.message);
      // Fallback: use original image if background removal fails
      compositedPaths[idx] = fgPath;
    }
  }

  return compositedPaths;
}

module.exports = { processBackgrounds };
