'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const VOICES_DIR = path.join(__dirname, '..', '..', 'uploads', 'cloned_voices');
const METADATA_FILE = path.join(VOICES_DIR, 'voices.json');

function ensureDir() {
    if (!fs.existsSync(VOICES_DIR)) {
        fs.mkdirSync(VOICES_DIR, { recursive: true });
    }
    if (!fs.existsSync(METADATA_FILE)) {
        fs.writeFileSync(METADATA_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
}

/**
 * Lấy danh sách toàn bộ custom voices đã lưu
 */
function getCustomVoices() {
    ensureDir();
    try {
        const raw = fs.readFileSync(METADATA_FILE, 'utf-8');
        return JSON.parse(raw);
    } catch (err) {
        console.error('[VoiceManager] Error reading voices.json:', err);
        return [];
    }
}

/**
 * Lưu một giọng clone mới từ file audio (tự động chuẩn hóa về WAV chất lượng cao)
 * @param {string} name - Tên người dùng đặt cho giọng
 * @param {string} tempFilePath - Đường dẫn file audio tạm
 * @param {string} [originalExt] - Đuôi file gốc (ví dụ: .wav, .mp3, .m4a)
 */
async function saveCustomVoice(name, tempFilePath, originalExt = '.wav') {
    ensureDir();
    const voices = getCustomVoices();
    const id = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const wavFilename = `${id}.wav`;
    const wavDestPath = path.join(VOICES_DIR, wavFilename);

    let converted = false;
    try {
        execFileSync('ffmpeg', [
            '-y', '-i', tempFilePath,
            '-vn', '-acodec', 'pcm_s16le', '-ar', '44100', '-ac', '1',
            wavDestPath
        ], { stdio: 'ignore' });
        converted = true;
    } catch (e) {
        console.warn('[VoiceManager] FFmpeg conversion failed, falling back to direct copy:', e.message);
    }

    let actualFilename = wavFilename;
    let actualDestPath = wavDestPath;

    if (!converted) {
        const ext = originalExt.startsWith('.') ? originalExt : `.${originalExt}`;
        actualFilename = `${id}${ext}`;
        actualDestPath = path.join(VOICES_DIR, actualFilename);
        await fs.promises.copyFile(tempFilePath, actualDestPath);
    }

    const newVoice = {
        id,
        name: name.trim() || 'Giọng mẫu chưa đặt tên',
        filename: actualFilename,
        createdAt: new Date().toISOString()
    };

    voices.unshift(newVoice); // Đưa lên đầu danh sách
    fs.writeFileSync(METADATA_FILE, JSON.stringify(voices, null, 2), 'utf-8');

    return {
        ...newVoice,
        filePath: actualDestPath
    };
}

/**
 * Xóa một giọng clone đã lưu
 * @param {string} id - ID của voice
 */
async function deleteCustomVoice(id) {
    ensureDir();
    const voices = getCustomVoices();
    const index = voices.findIndex(v => v.id === id);
    if (index === -1) {
        throw new Error('Không tìm thấy giọng cần xóa.');
    }

    const [deleted] = voices.splice(index, 1);
    const filePath = path.join(VOICES_DIR, deleted.filename);
    if (fs.existsSync(filePath)) {
        try {
            await fs.promises.unlink(filePath);
        } catch (e) {
            console.warn('[VoiceManager] Could not delete file:', filePath);
        }
    }

    fs.writeFileSync(METADATA_FILE, JSON.stringify(voices, null, 2), 'utf-8');
    return deleted;
}

/**
 * Lấy đường dẫn file âm thanh của custom voice theo ID
 * @param {string} id
 */
function getVoicePathById(id) {
    ensureDir();
    const voices = getCustomVoices();
    const found = voices.find(v => v.id === id);
    if (!found) return null;
    const filePath = path.join(VOICES_DIR, found.filename);
    return fs.existsSync(filePath) ? filePath : null;
}

module.exports = {
    getCustomVoices,
    saveCustomVoice,
    deleteCustomVoice,
    getVoicePathById
};
