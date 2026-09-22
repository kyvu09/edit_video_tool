'use strict';

const fs = require('fs');
const path = require('path');

class GeminiKeyManager {
  constructor() {
    this.keys = [];
    this.currentIndex = 0;
    this.keyStats = new Map(); // key -> { failCount, lastError, lastUsed }
    this.reloadKeys();
  }

  /**
   * Che giấu key để in ra log an toàn (VD: AQ.Ab8...-VA)
   * @param {string} key
   * @returns {string}
   */
  maskKey(key) {
    if (!key || typeof key !== 'string') return 'none';
    const trimmed = key.trim();
    if (trimmed.length <= 12) return '******';
    return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
  }

  /**
   * Nạp danh sách các API key từ process.env và file .env
   */
  reloadKeys() {
    const candidateKeys = [];

    // 1. Kiểm tra biến GEMINI_API_KEYS (dạng danh sách cách nhau bởi dấu phẩy hoặc xuống dòng)
    if (process.env.GEMINI_API_KEYS) {
      const splitKeys = process.env.GEMINI_API_KEYS.split(/[,;\n]/).map(k => k.trim()).filter(Boolean);
      candidateKeys.push(...splitKeys);
    }

    // 2. Kiểm tra các biến đánh số GEMINI_API_KEY_1, GEMINI_API_KEY_2, ...
    for (let i = 1; i <= 20; i++) {
      const numberedKey = process.env[`GEMINI_API_KEY_${i}`];
      if (numberedKey && numberedKey.trim()) {
        candidateKeys.push(numberedKey.trim());
      }
    }

    // 3. Kiểm tra biến GEMINI_API_KEY mặc định
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
      candidateKeys.push(process.env.GEMINI_API_KEY.trim());
    }

    // 4. Quét trực tiếp file .env để nạp thêm các key bị comment (dạng #GEMINI_API_KEY=...) nếu có
    try {
      const envPath = path.resolve(__dirname, '..', '..', '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split(/\r?\n/);
        for (const line of lines) {
          const match = line.match(/^#?\s*GEMINI_API_KEY(?:_\d+)?\s*=\s*(.+)$/i);
          if (match && match[1]) {
            const extracted = match[1].trim().replace(/^['"]|['"]$/g, '').trim();
            if (extracted && extracted.length > 15 && !extracted.includes('your-gemini-api-key')) {
              candidateKeys.push(extracted);
            }
          }
        }
      }
    } catch (e) {
      // Bỏ qua lỗi đọc file .env
    }

    // Làm sạch và loại bỏ trùng lặp giữ nguyên thứ tự
    const uniqueKeys = [];
    const seen = new Set();
    for (const k of candidateKeys) {
      const cleaned = k.trim();
      if (cleaned && !seen.has(cleaned)) {
        seen.add(cleaned);
        uniqueKeys.push(cleaned);
      }
    }

    this.keys = uniqueKeys;
    if (this.currentIndex >= this.keys.length) {
      this.currentIndex = 0;
    }

    // Khởi tạo stats cho các key
    for (const k of this.keys) {
      if (!this.keyStats.has(k)) {
        this.keyStats.set(k, { failCount: 0, lastError: null, lastUsed: null });
      }
    }

    console.log(`[GeminiKeyManager] Đã nạp ${this.keys.length} API key Gemini. Key hiện tại: #${this.currentIndex + 1} (${this.maskKey(this.getActiveKey())})`);
  }

  /**
   * Lấy danh sách tất cả các key
   * @returns {string[]}
   */
  getAllKeys() {
    if (this.keys.length === 0) {
      this.reloadKeys();
    }
    return [...this.keys];
  }

  /**
   * Lấy key hiện tại đang hoạt động
   * @returns {string|null}
   */
  getActiveKey() {
    if (this.keys.length === 0) {
      return process.env.GEMINI_API_KEY || null;
    }
    return this.keys[this.currentIndex];
  }

  /**
   * Lấy vị trí key hiện tại (1-based index)
   * @returns {number}
   */
  getActiveIndex() {
    return this.currentIndex + 1;
  }

  /**
   * Chuyển sang key dự phòng tiếp theo
   * @param {string} [reason]
   * @returns {string|null} Key mới sau khi chuyển
   */
  rotateKey(reason = 'Manual rotation') {
    if (this.keys.length <= 1) {
      return this.getActiveKey();
    }

    const prevIndex = this.currentIndex;
    const prevKey = this.keys[prevIndex];
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    const newKey = this.keys[this.currentIndex];

    console.warn(`[GeminiKeyManager] 🔄 Tự động chuyển từ Key #${prevIndex + 1} (${this.maskKey(prevKey)}) -> Key #${this.currentIndex + 1} (${this.maskKey(newKey)}). Lý do: ${reason}`);

    return newKey;
  }

  /**
   * Kiểm tra lỗi có thể thử lại với key khác hay không
   * @param {any} err
   * @returns {boolean}
   */
  isRetryableError(err) {
    if (!err) return false;

    const status = err.status || (err.response && err.response.status);
    const message = (err.message || '') + (err.response?.data?.error?.message || '');

    // 429 Rate limit hoặc Quota exhausted
    if (status === 429 || message.includes('RESOURCE_EXHAUSTED') || message.includes('429') || message.includes('rate limit') || message.includes('quota')) {
      return true;
    }

    // 403 / 400 Key không hợp lệ hoặc không có quyền
    if (status === 403 || status === 400 || message.includes('API_KEY_INVALID') || message.includes('API key not valid') || message.includes('PERMISSION_DENIED')) {
      return true;
    }

    // 500, 502, 503, 504 Lỗi tạm thời phía máy chủ Google
    if (status >= 500 && status <= 504) {
      return true;
    }

    // Lỗi mạng hoặc Timeout
    const code = err.code || '';
    if (code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ECONNABORTED' || message.includes('timeout')) {
      return true;
    }

    // Mặc định cho phép chuyển key đối với các lỗi gọi API
    return true;
  }

  /**
   * Thực thi một hàm gọi API Gemini với cơ chế tự động Fallback/Xoay vòng sang key khác khi gặp lỗi hoặc rate limit.
   *
   * @template T
   * @param {(apiKey: string, meta: { keyIndex: number, totalKeys: number, maskedKey: string }) => Promise<T>} apiFn
   * @param {object} [options]
   * @param {string} [options.context='Gemini API'] Tên context để ghi log (VD: 'generateScenes', 'generateImage')
   * @param {number} [options.maxAttempts] Số lần thử tối đa (mặc định bằng tổng số key)
   * @returns {Promise<T>}
   */
  async executeWithFallback(apiFn, options = {}) {
    const context = options.context || 'Gemini API';
    const keys = this.getAllKeys();

    if (keys.length === 0) {
      throw new Error('Không tìm thấy bất kỳ GEMINI_API_KEY nào trong file .env. Vui lòng cấu hình API key.');
    }

    const maxAttempts = options.maxAttempts || keys.length;
    let attemptsMade = 0;
    let lastError = null;

    while (attemptsMade < maxAttempts) {
      const activeKey = this.keys[this.currentIndex];
      const keyIndex = this.currentIndex + 1;
      const maskedKey = this.maskKey(activeKey);

      try {
        const stats = this.keyStats.get(activeKey) || { failCount: 0, lastError: null, lastUsed: null };
        stats.lastUsed = new Date();
        this.keyStats.set(activeKey, stats);

        // Thực thi gọi API
        const result = await apiFn(activeKey, {
          keyIndex,
          totalKeys: keys.length,
          maskedKey
        });

        // Thành công: reset failCount nếu trước đó có lỗi
        if (stats.failCount > 0) {
          stats.failCount = 0;
          stats.lastError = null;
        }

        return result;

      } catch (err) {
        attemptsMade++;
        lastError = err;

        const errStatus = err.status || err.response?.status || 'ERR';
        const errMsg = err.response?.data?.error?.message || err.message || 'Unknown error';

        const stats = this.keyStats.get(activeKey) || { failCount: 0, lastError: null, lastUsed: null };
        stats.failCount = (stats.failCount || 0) + 1;
        stats.lastError = `${errStatus}: ${errMsg}`;
        this.keyStats.set(activeKey, stats);

        console.warn(`[GeminiKeyManager] [${context}] ⚠️ Key #${keyIndex}/${keys.length} (${maskedKey}) gặp lỗi [${errStatus}]: ${errMsg}`);

        // Nếu còn key khác để thử
        if (attemptsMade < maxAttempts && keys.length > 1) {
          const reason = `Lỗi [${errStatus}] ở Key #${keyIndex}`;
          this.rotateKey(reason);
        } else {
          break;
        }
      }
    }

    // Nếu đã thử qua các key mà vẫn thất bại
    console.error(`[GeminiKeyManager] [${context}] ❌ Tất cả ${keys.length} API key Gemini đều thất bại sau ${attemptsMade} lần thử.`);
    const combinedError = new Error(`Tất cả ${keys.length} API key Gemini đều gặp lỗi hoặc bị rate limit. Lỗi gần nhất: ${lastError ? lastError.message : 'Unknown'}`);
    combinedError.originalError = lastError;
    throw combinedError;
  }

  /**
   * Lấy thông tin trạng thái các key để hiển thị giao diện kiểm tra
   */
  getKeyStatusList() {
    const keys = this.getAllKeys();
    return keys.map((k, idx) => {
      const stats = this.keyStats.get(k) || { failCount: 0, lastError: null, lastUsed: null };
      return {
        index: idx + 1,
        masked: this.maskKey(k),
        isCurrent: idx === this.currentIndex,
        failCount: stats.failCount,
        lastError: stats.lastError,
        lastUsed: stats.lastUsed
      };
    });
  }
}

// Export singleton instance
module.exports = new GeminiKeyManager();
