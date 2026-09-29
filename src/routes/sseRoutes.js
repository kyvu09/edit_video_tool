'use strict';

/**
 * SSE Route: GET /api/progress-stream/:sessionId
 *
 * Thay thế cho polling /api/progress/:sessionId.
 * Client dùng EventSource để nhận cập nhật real-time từ server mà không cần gọi liên tục.
 *
 * Ví dụ client:
 *   const es = new EventSource(`/api/progress-stream/${sessionId}`);
 *   es.onmessage = e => { const data = JSON.parse(e.data); ... };
 *   es.onerror  = () => es.close();
 */

const express = require('express');
const router  = express.Router();

module.exports = function createSseRoutes(sessions) {
  /**
   * GET /api/progress-stream/:sessionId
   * Streams session progress as Server-Sent Events.
   * Closes automatically when status reaches 'completed' or 'failed'.
   */
  router.get('/api/progress-stream/:sessionId', (req, res) => {
    const { sessionId } = req.params;

    if (!sessions[sessionId]) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering if present
    res.flushHeaders();

    const INTERVAL_MS = 1000; // push mỗi 1 giây

    const send = () => {
      const session = sessions[sessionId];
      if (!session) {
        res.write('event: error\ndata: {"error":"Session not found"}\n\n');
        clearInterval(timer);
        res.end();
        return;
      }

      res.write(`data: ${JSON.stringify(session)}\n\n`);

      // Đóng stream khi xong
      if (session.status === 'completed' || session.status === 'failed') {
        clearInterval(timer);
        setTimeout(() => res.end(), 200); // delay nhỏ để client nhận được event cuối
      }
    };

    const timer = setInterval(send, INTERVAL_MS);
    send(); // gửi ngay lập tức lần đầu

    // Dọn dẹp khi client ngắt kết nối
    req.on('close', () => clearInterval(timer));
  });

  return router;
};
