Hướng A trước, nhưng thiết kế theo kiểu có thể nâng cấp lên B

Tức là:

Nhúng trực tiếp một Local TTS Engine vào edit_video_tool bằng Python runner, tận dụng luôn kiến trúc .venv + child_process mà project của Kỳ đang có.

Đây là hướng hợp nhất với kiến trúc hiện tại của Kỳ.

1. Kiến trúc cuối cùng nên là
   edit_video_tool
   │
   ├── server.js
   │
   ├── src/
   │ └── services/
   │ ├── elevenlabsTtsService.js ❌ bỏ dần
   │ ├── viettelTtsService.js ✅ có thể giữ làm fallback
   │ ├── localTtsService.js 🆕
   │ └── whisperService.js
   │
   ├── python/
   │ ├── transcribe_local.py
   │ ├── remove_bg.py
   │ └── tts_local.py 🆕
   │
   ├── .venv/
   │
   └── outputs/
   └── audio/

Luồng:

Frontend
│
▼
POST /api/tts
│
▼
server.js
│
├── ElevenLabs ❌
│
├── Viettel API (optional fallback)
│
└── LocalTtsService.js ✅
│
│ spawn
▼
tts_local.py
│
▼
Local AI Model
│
▼
output.wav 2. Đừng bóc cả VoiceStudio

VoiceStudio nên đóng vai trò:

VoiceStudio
│
├── Nghiên cứu kiến trúc
├── Xem cách load engine
├── Xem inference flow
└── Chọn engine phù hợp

Sau đó:

edit_video_tool
│
└── Tích hợp engine upstream hoặc phần tối thiểu cần thiết

Không nên copy:

FastAPI
React UI
Tauri
ASR
Dubbing
MCP
Worker system
Database

Kỳ chỉ lấy ý tưởng/code tối thiểu cho:

Load model
↓
Receive text
↓
Inference
↓
Save audio 3. Engine nào nên làm đầu tiên?

Với máy của Kỳ:

Ryzen 7 7840HS
Radeon 780M
Windows
Python 3.12

Bro đề xuất thứ tự thử:

🥇 Engine đầu tiên: Kokoro

Lý do:

Nhẹ hơn
↓
Dễ chạy local
↓
Dễ test
↓
Tích hợp nhanh
↓
Ít phá project

Mục tiêu đầu tiên không phải là:

"Giọng AI tốt nhất thế giới"

Mà là:

Text → Audio chạy local thành công trong edit_video_tool.

Sau khi pipeline hoạt động:

Kokoro
↓
CosyVoice
↓
OmniVoice

Ta nâng cấp dần.

4. Tạo một chuẩn interface ngay từ đầu

Đây là phần quan trọng nhất.

Node.js không nên biết Kỳ đang dùng Kokoro hay CosyVoice.

Nó chỉ gọi:

generateSpeech({
text,
voice,
outputPath
})

Ví dụ:

server.js
│
▼
localTtsService.js
│
▼
Python TTS Runner

Sau này:

localTtsService.js
│
├── kokoro
├── cosyvoice
└── omnivoice

Frontend không phải sửa.

5. Python Runner chuẩn

Bro đề xuất thiết kế CLI như sau:

python tts_local.py \
 --text "Xin chào mọi người" \
 --voice "default" \
 --output "./outputs/audio.wav"

Node.js spawn:

Node.js
│
│ spawn()
▼
Python .venv
│
▼
tts_local.py
│
▼
Model inference
│
▼
audio.wav

Python trả JSON qua stdout:

{
"success": true,
"output": "outputs/audio.wav",
"duration": 3.42
}

Nếu lỗi:

{
"success": false,
"error": "Model failed to load"
}

Cách này rất hợp với kiến trúc Whisper hiện tại của Kỳ.

6. Roadmap thực hiện cụ thể
   PHASE 1 — Audit ElevenLabs

Tìm chính xác:

server.js
elevenlabsTtsService.js
/api/tts

Xác định contract hiện tại:

Request:

{
"text": "...",
"voice": "..."
}

Và response:

{
"audioUrl": "..."
}

⚠️ Local TTS phải cố gắng giữ nguyên contract này.

Như vậy frontend gần như không cần sửa.

PHASE 2 — Tạo Local TTS Service giả

Chưa cần AI.

Tạo:

localTtsService.js

Nó chỉ cần có interface:

generateSpeech(text, options)

Sau đó thay ElevenLabs bằng Local Service ở /api/tts.

PHASE 3 — Test Python bridge

Tạo:

tts_local.py

Ban đầu chưa cần model thật.

Ví dụ:

Input text
↓
Python nhận được
↓
Tạo dummy WAV
↓
Node nhận output

Mục tiêu:

Test Node ↔ Python communication trước.

PHASE 4 — Tích hợp Kokoro

Khi bridge chạy:

Node
↓
Python
↓
Kokoro
↓
WAV

Test:

"Hello world"

Sau đó:

Tiếng Việt

Nếu chất lượng tiếng Việt không đạt → không cố sửa Kokoro quá lâu.

Chuyển engine.

PHASE 5 — Chuẩn hóa Engine Adapter

Lúc này tạo:

python/
└── tts/
├── runner.py
│
└── engines/
├── base.py
├── kokoro.py
├── cosyvoice.py
└── omnivoice.py

Interface:

BaseTTSEngine
│
├── load()
├── synthesize()
└── unload()

Kiến trúc:

tts_local.py
│
▼
Engine Factory
│
┌────┼────────┐
▼ ▼ ▼
Kokoro Cosy OmniVoice 7. Sau đó mới quyết định có cần Hướng B không

Hướng B chỉ nên dùng khi Kỳ cần:

🔄 Đổi engine runtime
🎙️ Voice cloning phức tạp
👤 Quản lý nhiều voice profiles
🚀 Model chạy liên tục trong RAM
⚡ Không muốn load model mỗi lần gọi TTS

Lúc đó kiến trúc:

edit_video_tool
│ HTTP
▼
Local VoiceStudio Service
│
▼
Model luôn nằm trong RAM
Đây là ưu điểm lớn của B

Nếu dùng Python script:

Request 1
↓
Load model 😴
↓
Generate
↓
Python exit

Request 2
↓
Load model lại 😭

Còn FastAPI:

Start Server
↓
Load model 1 lần
↓
RAM giữ model
↓
Request liên tục ⚡
