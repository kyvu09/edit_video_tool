'use strict';

const fs   = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const DEFAULT_MAX_AGE_DAYS = parseInt(process.env.SESSION_MAX_AGE_DAYS || '7', 10);

/**
 * Xóa các session cũ hơn maxAgeDays trong output directory.
 * Chỉ xóa nếu session có status 'completed' hoặc 'failed'.
 *
 * @param {string} outputDir  - Thư mục output chứa các session
 * @param {object} sessions   - In-memory sessions object (để đồng bộ xóa)
 * @param {number} maxAgeDays - Số ngày tối đa giữ lại session (mặc định 7)
 */
async function cleanupOldSessions(outputDir, sessions, maxAgeDays = DEFAULT_MAX_AGE_DAYS) {
  if (!fs.existsSync(outputDir)) return;

  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  let deleted = 0;

  try {
    const entries = fs.readdirSync(outputDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const sessionId = entry.name;
      const sessionDir = path.join(outputDir, sessionId);

      // Kiểm tra mtime của thư mục
      const stat = fs.statSync(sessionDir);
      if (stat.mtimeMs > cutoff) continue; // còn mới, bỏ qua

      // Chỉ xóa session đã xong (không xóa session đang chạy)
      const inMemory = sessions[sessionId];
      if (inMemory && inMemory.status === 'processing') continue;

      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        delete sessions[sessionId];
        deleted++;
        logger.info(`[Cleanup] Đã xóa session cũ: ${sessionId}`);
      } catch (e) {
        logger.warn(`[Cleanup] Không thể xóa session ${sessionId}: ${e.message}`);
      }
    }
    if (deleted > 0) {
      logger.info(`[Cleanup] Đã dọn ${deleted} session cũ hơn ${maxAgeDays} ngày.`);
    } else {
      logger.debug(`[Cleanup] Không có session cũ cần dọn.`);
    }
  } catch (e) {
    logger.warn('[Cleanup] Lỗi khi cleanup sessions:', e.message);
  }
}

module.exports = { cleanupOldSessions };
