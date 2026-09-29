'use strict';

/**
 * Middleware rate limiting đơn giản — không cần thêm dependency.
 * Sử dụng sliding window counter trong bộ nhớ.
 *
 * Cách dùng:
 *   const { rateLimiter } = require('./middleware/rateLimiter');
 *   app.use('/api/upload', rateLimiter({ windowMs: 10 * 60 * 1000, max: 5 }));
 */

const store = new Map(); // ip -> [timestamps]

/**
 * Tạo middleware rate limiter cho một route.
 *
 * @param {object} options
 * @param {number} options.windowMs  - Cửa sổ thời gian tính bằng ms (VD: 60_000 = 1 phút)
 * @param {number} options.max       - Số request tối đa trong cửa sổ
 * @param {string} [options.message] - Thông báo lỗi tùy chỉnh
 */
function rateLimiter({ windowMs, max, message }) {
  const errMessage = message || `Quá nhiều yêu cầu. Vui lòng thử lại sau ${Math.round(windowMs / 1000)} giây.`;

  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const key  = `${ip}:${req.path}`;

    let timestamps = store.get(key) || [];
    // Xóa timestamps cũ hơn windowMs
    timestamps = timestamps.filter(t => now - t < windowMs);

    if (timestamps.length >= max) {
      res.status(429).json({ error: errMessage });
      return;
    }

    timestamps.push(now);
    store.set(key, timestamps);

    // Tự dọn Map để tránh memory leak khi nhiều IP
    if (store.size > 10000) {
      for (const [k, ts] of store.entries()) {
        if (ts.every(t => now - t >= windowMs)) store.delete(k);
      }
    }

    next();
  };
}

module.exports = { rateLimiter };
