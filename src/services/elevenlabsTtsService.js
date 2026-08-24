'use strict';

/**
 * Tạo file Audio từ Text bằng ElevenLabs API
 * @param {string} text - Văn bản cần chuyển đổi
 * @returns {Promise<Buffer>} - Trả về audio buffer
 */
async function generateSpeech(text) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;
    
    if (!apiKey || !voiceId) {
        throw new Error("Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID in .env file.");
    }

    console.log(`[ElevenLabsTTS] Sending request to ElevenLabs API for voice ${voiceId}...`);
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": apiKey
        },
        body: JSON.stringify({
            text: text,
            model_id: "eleven_multilingual_v2", // Multilingual model is good for Vietnamese
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75
            }
        })
    });

    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorData}`);
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
}

module.exports = { generateSpeech };
