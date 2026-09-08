<div align="center">
  <h1>🎬 Edit Video Tool - Trợ Lý AI Sản Xuất & Đăng Tải Video Toàn Diện</h1>
  <p><i>Quy trình tự động hóa khép kín: Trích xuất nội dung → Viết kịch bản phân cảnh → Tạo giọng đọc AI (VieNeu 48kHz / Kokoro / Clone giọng) → Sinh ảnh AI → Tách nền thông minh → Đồng bộ phụ đề Karaoke → Render video điện ảnh → Tự động đăng tải YouTube chuẩn SEO.</i></p>

  <p>
    <img src="https://img.shields.io/badge/Node.js-16%2B-green.svg" alt="Node.js" />
    <img src="https://img.shields.io/badge/Python-3.10%2B-blue.svg" alt="Python" />
    <img src="https://img.shields.io/badge/Local%20TTS-VieNeu%2048kHz-purple.svg" alt="VieNeu TTS" />
    <img src="https://img.shields.io/badge/Kokoro%20TTS-English%20Offline-teal.svg" alt="Kokoro TTS" />
    <img src="https://img.shields.io/badge/FFmpeg-Enabled-orange.svg" alt="FFmpeg" />
    <img src="https://img.shields.io/badge/Gemini%20AI-Integrated-red.svg" alt="Gemini AI" />
    <img src="https://img.shields.io/badge/License-MIT-brightgreen.svg" alt="License" />
  </p>
</div>

---

## 📌 Giới Thiệu Tổng Quan

**Edit Video Tool** là giải pháp phần mềm all-in-one mạnh mẽ dành cho content creator, YouTuber, TikToker và các nhà sản xuất nội dung số. Công cụ tích hợp sâu các mô hình trí tuệ nhân tạo hàng đầu hiện nay (**VieNeu-TTS 48kHz**, **Kokoro TTS**, **Google Gemini**, **OpenAI Whisper / Faster-Whisper**) cùng bộ xử lý đồ họa **FFmpeg** và các thuật toán thị giác máy tính (**Rembg**, **Color-to-Alpha**) để tự động hóa hoàn toàn quy trình biên tập video từ kịch bản thô cho đến khi video sẵn sàng xuất bản trên YouTube.

Đặc biệt, hệ thống đã được nâng cấp **Local TTS Engine chạy 100% offline trên máy** (thay thế hoàn toàn ElevenLabs), giúp bạn tạo giọng đọc không giới hạn số lượng và **tiết kiệm 100% chi phí API**.

---

## ✨ Các Tính Năng Đầy Đủ & Nổi Bật

### 1. ✍️ Trợ Lý Kịch Bản AI & Trích Xuất Nội Dung (Script Assistant)
- **Trích xuất nội dung từ YouTube URL**: Dán bất kỳ link video YouTube nào, AI sẽ phân tích và trích xuất nội dung cốt lõi để làm nguyên liệu tạo kịch bản mới.
- **Tự động phân đoạn kịch bản (Scene Breakdown)**: Sử dụng mô hình **Google Gemini** để tự động chia nhỏ văn bản thô thành từng phân cảnh (`SCENE 1`, `SCENE 2`,...) mạch lạc, tự nhiên.
- **Viết Prompt vẽ hình AI chi tiết**: Mỗi phân cảnh đều được AI tạo sẵn prompt tiếng Anh chuẩn nhiếp ảnh/hội họa, tối ưu cho Midjourney, WhiskLab, Stable Diffusion, DALL-E.
- **Viết Siêu Dữ Liệu (Metadata) Chuẩn SEO**: Tự động sinh **Tiêu đề giật tít**, **Mô tả hấp dẫn** và hệ thống **Tags/Hashtags** chuẩn SEO cho YouTube và TikTok.
- **Sao chép linh hoạt**: Nút bấm sao chép nhanh toàn bộ prompt, từng prompt riêng lẻ, hoặc tải về file kịch bản `.txt` một chạm.

### 2. ⚡ Tự Động Hóa Google Flow (Flow Automation)
- **Tích hợp Google Flow Bot**: Tự động mở Google Flow (`labs.google/fx/vi/tools/flow/`), tự khởi tạo dự án mới và tự động paste prompt qua clipboard và mô phỏng phím bấm (`robotjs`), tiết kiệm thời gian vẽ ảnh hàng loạt.

### 3. 🎙️ Hệ Thống Giọng Đọc AI Độc Lập 100% Offline (Local TTS Engine)
> *Đã gỡ bỏ hoàn toàn ElevenLabs API — Không tốn phí, không giới hạn ký tự, chạy trực tiếp trên CPU bằng ONNX Runtime.*

- 💻 **Local TTS (VieNeu-TTS v3 Turbo - 48kHz Studio Quality)** `[Khuyên dùng số 1]`:
  - Huấn luyện trên **10.000+ giờ dữ liệu tiếng Việt**, chuẩn dấu (sắc, huyền, hỏi, ngã, nặng) và ngắt nghỉ tự nhiên 100%.
  - Giọng mặc định: **Minh Quân** (giọng nam miền Bắc đĩnh đạc, ấm áp, cực hợp làm video tin tức/review).
  - **Menu chọn nhanh 23 giọng đọc 3 miền (Bắc - Trung - Nam)**:
    - *Miền Bắc*: Minh Quân, Minh Đức, Phạm Tuyên, Mai Anh, Quỳnh Anh, Trúc Ly, Thanh Bình, Anh Khôi, Mạnh Dũng...
    - *Miền Nam*: Thái Sơn, Thùy Dung, Mỹ Duyên, Minh Triết, Đức Trí, Adam...
    - *Miền Trung*: Quang Sơn, Ngọc Trân.
  - **Instant Zero-shot Voice Cloning (3–8 giây)**: Hộp kéo thả file âm thanh mẫu cho phép bạn nhân bản giọng của bất kỳ ai (chính bạn, người nổi tiếng, diễn viên) chỉ từ một đoạn ghi âm ngắn 3–8s.
- 🌐 **Kokoro TTS (English / Đa Ngữ)**:
  - Dành riêng cho video tiếng Anh chuẩn quốc tế (chuẩn US/UK như `af_heart`, `af_bella`, `am_adam`, `bf_emma`...).
  - Siêu nhẹ, tốc độ sinh cực nhanh (~3 giây cho đoạn đọc dài), chạy 100% offline.
- 🇻🇳 **Viettel AI**:
  - Giọng đọc Quỳnh Anh giữ làm phương án dự phòng (fallback) qua Cloud API.
- **Trình phát nghe thử (Preview)**: Nghe thử audio ngay trên web, hỗ trợ tải về máy (`.wav`/`.mp3`) hoặc gắn trực tiếp vào quy trình Render Video với 1 click.

### 4. 🖼️ Tự Động Sinh Ảnh Phân Cảnh Bằng AI (AI Image Generator)
- **Tạo ảnh tự động theo Prompt**: Sử dụng **Google Gemini Image API** (hỗ trợ `gemini-2.5-flash-image`, `gemini-3.1-flash-image`, `gemini-3.1-flash-lite-image`).
- **Xử lý hàng loạt (Batch Queue Processing)**: Tự động xếp hàng sinh ảnh cho từng scene tuần tự, hiển thị tiến độ trực quan.
- **Bộ nhớ đệm thông minh (Image Caching)**: Áp dụng băm SHA-256 cho prompt; các phân cảnh có prompt trùng lặp sẽ tái sử dụng cache ngay lập tức mà không tốn chi phí gọi API.
- **Xuất file hàng loạt (ZIP Download)**: Tải toàn bộ ảnh các phân cảnh về máy dưới định dạng `.zip` chỉ với 1 click (sử dụng JSZip).

### 5. ✂️ Tách Nền & Ghép Cảnh Chuyên Nghiệp (Background Removal & Compositing)
- **Hai chế độ tách nền thông minh**:
  - 🖌️ **White-key Mode (Color-to-Alpha)**: Thuật toán độc quyền tích hợp *Adaptive Illumination Correction* (cân bằng ánh sáng thích ứng) và *Two-Threshold Min-RGB Keying*, giúp xóa sạch nền trắng/giấy vẽ mà giữ nguyên 100% nét vẽ phác thảo chì, màu nước nghệ thuật.
  - 🤖 **AI Mode (Rembg)**: Ứng dụng mạng nơ-ron học sâu để bóc tách chủ thể người/vật thể thực tế khỏi phông nền, kèm thuật toán hậu xử lý *Erosion & Gaussian Feathering* chống lem màu/viền răng cưa (defringe).
- **Tự động ghép nền (Compositing)**: Ghép chủ thể đã tách nền lên ảnh nền (Background) tùy chọn theo tỷ lệ khung hình với vùng an toàn (Safe Zone) chuẩn chỉnh.
- **Bộ công cụ gỡ lỗi chuyên sâu (`/debug.html`)**: Giao diện riêng giúp tải ảnh foreground/background lên test thuật toán tách nền, chỉnh thanh trượt threshold, soi kênh màu Alpha và xem trước trên nền caro trực quan.

### 6. ⏱️ Nhận Diện Âm Thanh & Đồng Bộ Mốc Thời Gian (Whisper AI Timeline)
- **Cơ chế dự phòng 3 cấp độ (Triple-layer Failover)**:
  1. 💻 **Faster-Whisper Offline**: Chạy mô hình Whisper cục bộ bằng Python (`faster-whisper`), hoạt động hoàn toàn **offline 100%** trên máy tính, trích xuất mốc thời gian chi tiết đến từng từ (`word_timestamps`) mà không tốn tiền API.
  2. 🌐 **OpenAI Whisper API (`whisper-1`)**: Nhận diện âm thanh qua Cloud API nếu cấu hình key.
  3. ⚙️ **Simulation Fallback**: Thuật toán tính toán mốc thời gian dựa trên độ dài ký tự kịch bản, đảm bảo ứng dụng luôn render thành công trong mọi trường hợp.

### 7. 📝 Phụ Đề Karaoke Động Đỉnh Cao (Dynamic ASS Subtitles)
- **Thuật toán Needleman-Wunsch Alignment**: Căn chỉnh kịch bản gốc với kết quả nhận dạng giọng nói, đảm bảo phụ đề giữ trọn vẹn từng dấu câu, chính tả của kịch bản gốc.
- **Định dạng chuẩn ASS (Advanced SubStation Alpha)**: Hiển thị phụ đề sắc nét, chống răng cưa, viền đen (outline) và bóng đổ (drop shadow) nổi bật trên mọi nền video.
- **Hiệu ứng chữ Karaoke (Word-by-word Highlighting)**: Chữ tự động chuyển màu nổi bật (vàng/cam) theo nhịp đọc của từng từ trong audio.
- **Tùy biến hiển thị**: Tự động ngắt dòng thông minh theo tỷ lệ video; có nút bật/tắt hiệu ứng karaoke ngay trên giao diện.

### 8. 🎥 Trình Render Video FFmpeg Chuyên Nghiệp
- **Tùy chọn tỷ lệ khung hình linh hoạt**:
  - 📺 **16:9 (1920x1080)**: Chuẩn ngang cho YouTube, Facebook, Web video.
  - 📱 **9:16 (1080x1920)**: Chuẩn dọc cho TikTok, YouTube Shorts, Facebook Reels.
- **Hiệu ứng chuyển động điện ảnh (Cinematic Motion)**:
  - Chuyển động **Ken Burns Zoom-out** chậm rãi, mượt mà trên từng phân cảnh.
  - Hiệu ứng chuyển cảnh hòa tan **Crossfade Dissolve** mềm mại giữa các scene liên tiếp.
- **Hỗ trợ Nhạc Nền (BGM - Background Music)**:
  - Tải lên file nhạc nền (`.mp3`, `.wav`, `.ogg`, `.m4a`).
  - Thanh trượt điều chỉnh âm lượng BGM (0% - 100%), tự động hòa âm (Audio Mixing) với giọng đọc thuyết minh.
- **Điều chỉnh tốc độ phát Video (Speed Adjustment)**: Tùy chỉnh tốc độ từ **0.5x đến 2.0x** (sử dụng chuỗi bộ lọc `atempo` và PTS scaling chuẩn xác, không bị méo tiếng hay lệch phụ đề).
- **Ghi phụ đề trực tiếp (Hardcode Subtitles)**: Ghép phụ đề cứng vào video bằng thư viện libass, hiển thị đồng bộ tuyệt đối trên mọi thiết bị.

### 9. 📺 Tự Động Đăng Video Lên YouTube Chuẩn SEO
- **Kết nối Google OAuth 2.0 an toàn**: Đăng nhập tài khoản Google chỉ với 1 click, lưu trữ token an toàn và tự động refresh token khi hết hạn.
- **Tự động điền dữ liệu SEO**: Tự động điền Tiêu đề, Mô tả và Tags do Gemini sinh ra.
- **Tùy chỉnh trạng thái đăng tải**: Công khai (Public), Không công khai (Unlisted), hoặc Riêng tư (Private).
- **Hiển thị tiến trình upload thời gian thực**: Theo dõi dung lượng phần trăm video được đẩy lên YouTube.

---

## 📐 Kiến Trúc Quy Trình Hoạt Động (Pipeline Architecture)

```
[ Nguồn Dữ Liệu ]
  ├─ Kịch bản thô / Link YouTube ──► [ Gemini AI ] ────────────► Phân chia Scene, Prompts & SEO Metadata
  ├─ Kịch bản phân cảnh ──────────► [ Local TTS (VieNeu/Kokoro) ] ► Audio 48kHz / Clone giọng (Miễn phí 100%)
  └─ Prompts hình ảnh ───────────► [ Gemini Image / Midjourney ] ─► Danh sách ảnh phân cảnh

                                           │
                                           ▼
[ Xử Lý Thị Giác & Âm Thanh ]
  ├─ Ảnh Scene + Nền ────────────► [ Rembg / White-key ] ────────► Ảnh Composited hoàn chỉnh
  └─ Audio Thuyết Minh ──────────► [ Faster-Whisper / OpenAI ] ──► Word-level Timestamps (Karaoke)

                                           │
                                           ▼
[ Đồng Bộ & Biên Soạn ]
  ├─ Kịch bản + Timestamps ──────► [ Needleman-Wunsch ] ─────────► Phụ đề Karaoke (.ass)
  ├─ Ảnh + Audio + BGM ──────────► [ FFmpeg Engine ] ────────────► Ken Burns Zoom, Crossfade, Audio Mix
                                           │
                                           ▼
[ Thành Phẩm & Xuất Bản ]
  ├─ Video Hoàn Chỉnh (.mp4) ────► [ Trình xem trước & Tải về ]
  └─ OAuth 2.0 + SEO Metadata ──► [ YouTube Data API v3 ] ───────► Video lên sóng YouTube!
```

---

## 🛠️ Cài Đặt & Cấu Hình

### 1. Yêu Cầu Môi Trường
- **Node.js**: Phiên bản 18 trở lên (khuyến nghị 20 LTS).
- **Python**: Phiên bản 3.10 - 3.12 (khuyến nghị 3.12).
- **FFmpeg & FFprobe**: Đã cài đặt và thêm vào biến môi trường hệ thống (`PATH`).
  - *Kiểm tra trên Terminal bằng lệnh*: `ffmpeg -version` và `ffprobe -version`.

---

### 2. Các Bước Cài Đặt

#### Bước 1: Clone Repository & Cài đặt Node Dependencies
```bash
git clone https://github.com/kyvu09/edit_video_tool.git
cd edit_video_tool
npm install
```

#### Bước 2: Thiết lập môi trường ảo Python & Cài thư viện AI
```bash
# Tạo virtual environment
python -m venv .venv

# Kích hoạt virtual environment
# Trên Windows:
.venv\Scripts\activate
# Trên Linux/macOS:
source .venv/bin/activate

# Cài đặt các thư viện AI xử lý ảnh, âm thanh và Local TTS
pip install rembg pillow numpy scipy soundfile onnxruntime
pip install vieneu kokoro-onnx
pip install faster-whisper torch
```

---

### 3. Cấu Hình File Môi Trường (`.env`)

Tạo file `.env` tại thư mục gốc của dự án:

```env
# ── Server Configuration ──
PORT=3000
NODE_ENV=development

# ── Đường dẫn Python & FFmpeg ──
# Windows ví dụ: C:\personal_kyvu\CODE\editVideoTool\.venv\Scripts\python.exe
PYTHON_PATH=.venv/Scripts/python.exe
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe

# ── Local Whisper Offline (Nhận diện giọng nói & tạo phụ đề Karaoke) ──
# Các mức mô hình: tiny | base | small | medium | large-v3 (Khuyên dùng: small)
LOCAL_WHISPER_MODEL=small

# ── OpenAI API (Tùy chọn: chỉ dùng nếu muốn dùng Whisper API Cloud) ──
OPENAI_API_KEY=

# ── Google Gemini AI (Tạo kịch bản, metadata & sinh ảnh) ──
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-3.5-flash
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image

# ── Text-to-Speech (TTS) Providers ──
# Viettel AI TTS (Tùy chọn dự phòng)
VIETTEL_AI_TOKEN=your_viettel_ai_token_here

# Local TTS (VieNeu & Kokoro) hoạt động 100% offline, KHÔNG cần API key hay token!

# ── Google OAuth 2.0 (Dùng cho tính năng Auto-Upload YouTube) ──
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
```

---

### 4. Khởi Chạy Ứng Dụng

```bash
# Chạy ứng dụng:
npm start

# Hoặc chế độ development (tự động reload khi sửa code):
npm run dev
```

Mở trình duyệt và truy cập: **[http://localhost:3000](http://localhost:3000)**

---

## 📖 Hướng Dẫn Sử Dụng Chi Tiết Từng Bước

### Bước 1: Soạn Thảo Kịch Bản (Tab 1)
1. Dán link video YouTube cần tham khảo (hoặc dán văn bản ý tưởng vào ô **Kịch Bản Thô**).
2. Bấm **✨ Tạo Phân Cảnh Bằng AI**: Hệ thống sẽ sinh danh sách phân cảnh kèm prompt hình ảnh và kịch bản phân đoạn thoại chuẩn.
3. Bấm **📋 Viết Tiêu Đề & Mô Tả**: Nhận ngay bộ Metadata tối ưu SEO.
4. Bấm **⚡ Điền vào Form Tạo Video** hoặc tải về file `.txt`.

### Bước 2: Tạo Giọng Đọc Thuyết Minh (Tab 2)
1. Bấm **⟵ Lấy từ Trợ Lý Kịch Bản** để tự động điền kịch bản thoại.
2. Chọn nhà cung cấp giọng nói:
   - **💻 Local TTS (VieNeu)**: Mặc định chuẩn tiếng Việt 48kHz (Offline 100%, 0đ).
     - *Chọn giọng dựng sẵn*: Chọn từ dropdown 23 giọng 3 miền (Minh Quân, Mai Anh, Quỳnh Anh, Thái Sơn, Thùy Dung...).
     - *Hoặc Clone giọng tức thì*: Kéo thả file ghi âm mẫu (3–8s) vào hộp kéo thả, AI sẽ nhái theo giọng mẫu.
   - **🌐 Kokoro TTS**: Chọn khi bạn làm video đọc tiếng Anh (giọng chuẩn US/UK như `af_heart`, `am_adam`...).
   - **🇻🇳 Viettel AI**: Tùy chọn Cloud dự phòng.
3. Bấm **🎙️ Tạo Audio Ngay**: Nghe thử và bấm **⚡ Dùng cho Tạo Video**.

### Bước 3: Tạo Ảnh Phân Cảnh (Tùy chọn)
- Sử dụng prompt ở Bước 1 để tạo ảnh từ công cụ ngoài hoặc sử dụng tính năng tạo ảnh tự động tích hợp bằng Gemini Image API.
- Đặt tên các file ảnh theo thứ tự phân cảnh (ví dụ: `scene1.png`, `scene2.png`,...).

### Bước 4: Render Video Hoàn Chỉnh (Tab 3)
1. **Nguồn dữ liệu**:
   - File âm thanh giọng đọc (`.wav` hoặc `.mp3`).
   - File kịch bản phân đoạn (`.txt`).
   - Danh sách ảnh Scene (`.png`, `.jpg`).
2. **Nền & Hiệu ứng**:
   - Tải lên ảnh nền chung và chọn chế độ tách nền:
     - `whitekey`: Dành cho tranh vẽ, phác thảo sketch, ảnh nền trắng.
     - `rembg`: Dành cho ảnh chụp người thật, vật thể.
   - Tải lên file nhạc nền (`.mp3`, `.wav`) và chỉnh âm lượng BGM.
3. **Cài đặt xuất**:
   - Chọn tỷ lệ khung hình: **16:9** (ngang) hoặc **9:16** (dọc Shorts/TikTok).
   - Tùy chỉnh tốc độ video (**0.5x - 2.0x**).
   - Bật hiệu ứng **Subtitle Karaoke**.
4. Bấm **🚀 Bắt Đầu Tạo Video** và theo dõi thanh tiến độ thời gian thực.

### Bước 5: Xem Trước & Đăng Tải Lên YouTube
1. Xem trước video hoàn chỉnh ngay trên trình duyệt.
2. Tải video về máy tính với nút **⬇️ Tải Video**.
3. Tại phần **Upload lên YouTube**:
   - Bấm **🔗 Kết nối YouTube** và cấp quyền qua Google OAuth.
   - Chọn chế độ bảo mật (Public / Unlisted / Private) và bấm **▶️ Tải lên YouTube**.

---

## 🔧 Công Cụ Hỗ Trợ & Debugger

Ứng dụng cung cấp sẵn trang gỡ lỗi tách nền tại: **[http://localhost:3000/debug.html](http://localhost:3000/debug.html)**
- Tải lên ảnh foreground và ảnh background bất kỳ.
- Chuyển đổi giữa chế độ `whitekey` và `rembg`.
- Tùy chỉnh ngưỡng lọc màu trắng (Threshold) theo thời gian thực để tìm thông số tối ưu nhất cho bộ tranh vẽ của bạn.
- Hiển thị kết quả trên lưới caro trong suốt để kiểm tra từng pixel viền.

---

## 📝 Khắc Phục Sự Cố (Troubleshooting)

- **Lỗi `faster-whisper is not installed`**:
  - Chạy lệnh cài đặt vào môi trường ảo: `.\.venv\Scripts\pip.exe install faster-whisper`.
- **Lỗi không tìm thấy FFmpeg (`ffmpeg: command not found`)**:
  - Đảm bảo bạn đã cài đặt FFmpeg và đường dẫn thư mục `bin` chứa `ffmpeg.exe` đã được thêm vào biến môi trường `PATH`.
  - Bạn cũng có thể cấu hình đường dẫn trực tiếp trong `.env`: `FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe`.
- **Lỗi đường dẫn Python khi chạy Local TTS hoặc Rembg**:
  - Đảm bảo biến `PYTHON_PATH` trong `.env` trỏ đúng vào file thực thi python của virtualenv (ví dụ: `PYTHON_PATH=C:\personal_kyvu\CODE\editVideoTool\.venv\Scripts\python.exe`).
- **Lỗi `redirect_uri_mismatch` khi kết nối YouTube**:
  - Thêm chính xác URL sau vào mục **Authorized redirect URIs** trên Google Cloud Console: `http://localhost:3000/oauth2callback`.

---

## ☕ Ủng Hộ Tác Giả (Donate)

Dự án này hoàn toàn là **mã nguồn mở và miễn phí**. Nếu công cụ này giúp bạn tiết kiệm hàng chục giờ đồng hồ biên tập video mỗi ngày, hãy cân nhắc mời tác giả một ly cà phê để có thêm động lực duy trì và phát triển thêm nhiều tính năng xịn xò hơn nhé! ❤️

* **Ngân hàng Quân Đội (MBBank):**
  - **STK:** `0338187302`
  - **Chủ tài khoản:** `VU MANH KY`

---

## 📄 Bản Quyền & Giấy Phép

Dự án được phân phối dưới giấy phép mã nguồn mở **MIT License**. Mọi người đều có quyền tự do sử dụng, tùy biến và tích hợp vào các dự án cá nhân hoặc thương mại.

---
<div align="center">
  <i>Phát triển với ❤️ bởi <b>kyvu09</b> — Mang sức mạnh AI vào từng khung hình của bạn!</i>
</div>