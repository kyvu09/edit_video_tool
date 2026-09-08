'use strict';

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

/**
 * Service sinh giọng nói cục bộ (Local TTS)
 * Không phụ thuộc vào API cloud (ElevenLabs, Viettel,...), hoàn toàn offline & miễn phí.
 * 
 * @param {string} text - Nội dung kịch bản cần chuyển thành giọng nói
 * @param {Object} [options] - Tùy chọn giọng, tốc độ, engine
 * @returns {Promise<Buffer>} - Audio buffer (WAV)
 */
async function generateSpeech(text, options = {}) {
    if (!text || typeof text !== 'string' || !text.trim()) {
        throw new Error('Vui lòng cung cấp văn bản hợp lệ để tạo audio.');
    }

    const voice = options.voice || 'default';
    const speed = options.speed || 1.0;
    const engine = options.engine || 'auto';

    // Tạo thư mục tạm lưu output audio
    const outputDir = path.join(__dirname, '..', '..', 'output', 'audio');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `tts_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.wav`;
    const outputPath = path.join(outputDir, filename);

    let pythonPath = process.env.PYTHON_PATH;
    if (!pythonPath) {
        const defaultVenvPython = path.join(__dirname, '..', '..', '.venv', 'Scripts', 'python.exe');
        if (fs.existsSync(defaultVenvPython)) {
            pythonPath = defaultVenvPython;
        } else {
            pythonPath = 'python';
        }
    }
    const scriptPath = path.join(__dirname, '..', '..', 'python', 'tts_local.py');

    console.log(`[LocalTTS] Generating speech with python='${pythonPath}', engine='${engine}', voice='${voice}'...`);

    const args = [
        scriptPath,
        '--text', text.trim(),
        '--output', outputPath,
        '--voice', voice,
        '--speed', String(speed),
        '--engine', engine
    ];

    if (options.refAudio) {
        args.push('--ref_audio', options.refAudio);
    }

    return new Promise((resolve, reject) => {
        const pyProc = spawn(pythonPath, args, {
            windowsHide: true,
            env: {
                ...process.env,
                PYTHONIOENCODING: 'utf-8'
            }
        });

        let stdoutData = '';
        let stderrData = '';

        pyProc.stdout.on('data', (data) => {
            stdoutData += data.toString('utf-8');
        });

        pyProc.stderr.on('data', (data) => {
            stderrData += data.toString('utf-8');
        });

        pyProc.on('error', (err) => {
            reject(new Error(`Failed to spawn Local TTS Python process: ${err.message}`));
        });

        pyProc.on('close', async (code) => {
            if (code !== 0) {
                console.error('[LocalTTS] Python script error:', stderrData || stdoutData);
                return reject(new Error(`Local TTS exited with code ${code}: ${stderrData || stdoutData}`));
            }

            try {
                // Parse stdout JSON
                const trimmed = stdoutData.trim();
                // Tìm đoạn JSON trong trường hợp có log phụ
                const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error(`Invalid response from Local TTS runner: ${stdoutData}`);
                }

                const result = JSON.parse(jsonMatch[0]);
                if (!result.success) {
                    return reject(new Error(result.error || 'Local TTS generation failed.'));
                }

                if (!fs.existsSync(outputPath)) {
                    return reject(new Error(`Output audio file not found at ${outputPath}`));
                }

                const audioBuffer = await fs.promises.readFile(outputPath);
                console.log(`[LocalTTS] Speech generated successfully (${audioBuffer.length} bytes, duration: ${result.duration || '?'}s)`);
                resolve(audioBuffer);
            } catch (err) {
                reject(new Error(`Failed to process Local TTS output: ${err.message}`));
            }
        });
    });
}

module.exports = {
    generateSpeech
};
