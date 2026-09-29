'use strict';

const fs   = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const SESSION_FILENAME = 'session.json';

/**
 * Lưu session vào file để không mất khi server restart.
 */
function persistSession(sessionDir, data) {
  try {
    if (!fs.existsSync(sessionDir)) return;
    fs.writeFileSync(path.join(sessionDir, SESSION_FILENAME), JSON.stringify(data, null, 2));
  } catch (e) {
    logger.warn('[SessionPersist] Không thể ghi session.json:', e.message);
  }
}

/**
 * Khôi phục toàn bộ sessions từ disk vào `sessions` object khi server khởi động.
 * Chỉ đọc các session có status 'completed' hoặc 'failed' (đã xong).
 * Session đang 'processing' khi crash sẽ được đánh dấu là 'failed'.
 */
function restoreSessions(outputDir, sessions) {
  if (!fs.existsSync(outputDir)) return;
  try {
    const entries = fs.readdirSync(outputDir, { withFileTypes: true });
    let restored = 0;
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const sessionFile = path.join(outputDir, entry.name, SESSION_FILENAME);
      if (!fs.existsSync(sessionFile)) continue;
      try {
        const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
        // Session bị interrupt (crash khi đang processing) → đánh dấu failed
        if (data.status === 'processing') {
          data.status = 'failed';
          data.statusMessage = 'Server restarted during processing.';
        }
        sessions[entry.name] = data;
        restored++;
      } catch (e) {
        logger.warn(`[SessionPersist] Không thể đọc session ${entry.name}:`, e.message);
      }
    }
    if (restored > 0) logger.info(`[SessionPersist] Đã khôi phục ${restored} session từ disk.`);
  } catch (e) {
    logger.warn('[SessionPersist] Lỗi khi restore sessions:', e.message);
  }
}

module.exports = { persistSession, restoreSessions };
