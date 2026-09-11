'use strict';

const fs = require('fs');
const path = require('path');

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
 * Lưu một giọng clone mới từ file audio
 * @param {string} name - Tên người dùng đặt cho giọng
 * @param {string} tempFilePath - Đường dẫn file audio tạm
 * @param {string} [originalExt] - Đuôi file gốc (ví dụ: .wav, .mp3)
 */
async function saveCustomVoice(name, tempFilePath, originalExt = '.wav') {
    ensureDir();
    const voices = getCustomVoices();
    const id = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const ext = originalExt.startsWith('.') ? originalExt : `.${originalExt}`;
    const filename = `${id}${ext}`;
    const destPath = path.join(VOICES_DIR, filename);

    // Copy file vào thư mục lưu trữ vĩnh viễn
    await fs.promises.copyFile(tempFilePath, destPath);

    const newVoice = {
        id,
        name: name.trim() || 'Giọng mẫu chưa đặt tên',
        filename,
        createdAt: new Date().toISOString()
    };

    voices.unshift(newVoice); // Đưa lên đầu danh sách
    fs.writeFileSync(METADATA_FILE, JSON.stringify(voices, null, 2), 'utf-8');

    return {
        ...newVoice,
        filePath: destPath
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
