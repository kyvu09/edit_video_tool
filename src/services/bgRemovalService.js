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
 * Runs tasks in parallel with bounded concurrency.
 */
async function runParallel(tasks, concurrency) {
  const results = new Array(tasks.length);
  let index = 0;
  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()));
  return results;
}

/**
 * Process all foreground images: remove their background and save as transparent PNGs on canvas.
 * Also prepares a single fixed background image if provided.
 *
 * @param {Array}  imagePaths     List of absolute paths to uploaded scene images
 * @param {string} backgroundPath  Path to the custom background image (optional)
 * @param {string} sessionDir      Directory where output files should be saved
 * @param {string} mode            'whitekey' or 'rembg'
 * @param {string} aspectRatio     '16:9' or '9:16'
 * @param {Function} onProgress    Callback for progress tracking (currentIndex, totalCount)
 * @returns {Promise<Array<string> & { fixedBgPath: string|null }>} List of absolute paths to transparent PNG scene images with fixedBgPath property
 */
async function processBackgrounds(imagePaths, backgroundPath, sessionDir, mode = 'whitekey', aspectRatio = '16:9', onProgress) {
  // Handle fallback if onProgress is passed as 5th argument
  if (typeof aspectRatio === 'function') {
    onProgress = aspectRatio;
    aspectRatio = '16:9';
  }

  const venvPythonWin = path.resolve(__dirname, '../../.venv/Scripts/python.exe');
  const venvPythonUnix = path.resolve(__dirname, '../../.venv/bin/python');
  let defaultPython = 'python';
  if (fs.existsSync(venvPythonWin)) {
    defaultPython = venvPythonWin;
  } else if (fs.existsSync(venvPythonUnix)) {
    defaultPython = venvPythonUnix;
  }
  const pythonPath = process.env.PYTHON_PATH || defaultPython;
  const scriptPath = path.resolve(__dirname, 'remove_bg.py');
  
  let fixedBgPath = null;

  // Step 0a: If background image is provided, prepare the single fixed background canvas once
  if (backgroundPath && fs.existsSync(backgroundPath)) {
    fixedBgPath = path.join(sessionDir, 'fixed_background.png');
    const prepCmd = [
      `"${pythonPath}"`,
      `"${scriptPath}"`,
      `--prepare-bg`,
      `"${path.resolve(backgroundPath)}"`,
      `"${path.resolve(fixedBgPath)}"`,
      `"${aspectRatio}"`
    ].join(' ');

    console.log(`[Background Service] Preparing single fixed background: ${prepCmd}`);
    try {
      await execAsync(prepCmd);
    } catch (err) {
      console.error(`[Background Service] Failed to prepare fixed background:`, err.message);
      fixedBgPath = path.resolve(backgroundPath);
    }
  }

  const total = imagePaths.length;
  const activeMode = (mode === 'rembg' || mode === 'ai') ? 'ai' : 'whitekey';

  const nobgPaths = new Array(total).fill(null);
  const CONCURRENCY = Math.min(4, total); // max 4 Python processes to avoid RAM overload
  const tasks = imagePaths.map((imgPath, idx) => async () => {
    const fgPath = path.resolve(imgPath);
    const outPath = path.join(sessionDir, `scene_${idx}_nobg.png`);
    nobgPaths[idx] = outPath;

    const args = [
      `"${pythonPath}"`,
      `"${scriptPath}"`,
      `"${fgPath}"`,
      `"${outPath}"`,
      `"${activeMode}"`,
      `--nobg`,
      `"${aspectRatio}"`
    ];
    const cmd = args.join(' ');
    console.log(`[Rembg Service] Processing scene ${idx + 1}/${total}: ${cmd}`);
    try {
      await execAsync(cmd);
    } catch (err) {
      console.error(`[Rembg Service] Failed to process scene ${idx + 1}:`, err.message);
      nobgPaths[idx] = fgPath; // fallback to original
    }
    if (onProgress) onProgress(idx, total);
  });

  // Step 0b: Remove background from each scene image — run in parallel
  await runParallel(tasks, CONCURRENCY);

  // Attach fixedBgPath to returned array for convenience and backward compatibility
  nobgPaths.fixedBgPath = fixedBgPath;
  return nobgPaths;
}

module.exports = { processBackgrounds };

