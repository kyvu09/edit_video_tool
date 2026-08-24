'use strict';

/**
 * Tạo file Audio từ Text bằng Viettel AI API
 * @param {string} text - Văn bản cần chuyển đổi
 * @returns {Promise<Buffer>} - Trả về audio buffer
 */
async function generateSpeech(text) {
    const token = process.env.VIETTEL_AI_TOKEN;
    if (!token) {
        throw new Error("Missing VIETTEL_AI_TOKEN in .env file.");
    }

    console.log(`[ViettelTTS] Sending request to Viettel AI...`);
    const response = await fetch("https://viettelai.vn/tts/speech_synthesis", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            text: text,
            voice: "hn-quynhanh",
            speed: 1,
            tts_return_option: 3,
            token: token,
            without_filter: false
        })
    });

    if (!response.ok) {
        throw new Error(`Viettel AI API error: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
}

module.exports = { generateSpeech };
