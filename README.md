<div align="center">
  <h1>🎬 Edit Video Tool - Trợ Lý AI Sản Xuất & Đăng Tải Video Toàn Diện</h1>
  <p><i>Quy trình tự động hóa khép kín: Trích xuất nội dung → Viết kịch bản phân cảnh → Tạo giọng đọc AI → Sinh ảnh AI → Tách nền thông minh → Đồng bộ phụ đề Karaoke → Render video điện ảnh → Tự động đăng tải YouTube chuẩn SEO.</i></p>

  <p>
    <img src="https://img.shields.io/badge/Node.js-16%2B-green.svg" alt="Node.js" />
    <img src="https://img.shields.io/badge/Python-3.10%2B-blue.svg" alt="Python" />
    <img src="https://img.shields.io/badge/FFmpeg-Enabled-orange.svg" alt="FFmpeg" />
    <img src="https://img.shields.io/badge/Gemini%20AI-Integrated-purple.svg" alt="Gemini AI" />
    <img src="https://img.shields.io/badge/OpenAI%20Whisper-Ready-teal.svg" alt="Whisper" />
    <img src="https://img.shields.io/badge/License-MIT-brightgreen.svg" alt="License" />
  </p>
</div>

---

## 📌 Giới Thiệu Tổng Quan

**Edit Video Tool** là giải pháp phần mềm all-in-one mạnh mẽ dành cho content creator, YouTuber, TikToker và các nhà sản xuất nội dung số. Công cụ tích hợp sâu các mô hình trí tuệ nhân tạo hàng đầu hiện nay (**Google Gemini**, **OpenAI Whisper**, **Viettel AI**, **ElevenLabs**) cùng bộ xử lý đồ họa **FFmpeg** và các thuật toán thị giác máy tính (**Rembg**, **Color-to-Alpha**) để tự động hóa hoàn toàn quy trình biên tập video từ kịch bản thô cho đến khi video sẵn sàng xuất bản trên YouTube.

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

### 3. 🎙️ Tạo Giọng Đọc AI Đa Nền Tảng (Text-to-Speech - TTS)
- **Chuyển văn bản thành giọng nói tức thì**: Lấy trực tiếp kịch bản thoại từ Trợ lý AI chỉ với 1 click.
- **Đa dạng nhà cung cấp (Providers)**:
  - 🇻🇳 **Viettel AI**: Giọng đọc Quỳnh Anh chuẩn tiếng Việt, truyền cảm, ngữ điệu tự nhiên.
  - ⚡ **ElevenLabs**: Giọng đọc studio cao cấp đạt chuẩn quốc tế (`eleven_multilingual_v2`), độ ổn định và chân thực vượt trội.
- **Trình phát nghe thử (Preview)**: Nghe thử file âm thanh ngay trên giao diện web, hỗ trợ tải về máy (`.mp3`) hoặc gắn trực tiếp vào pipeline Render Video.

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
  1. 🌐 **OpenAI Whisper API (`whisper-1`)**: Nhận diện âm thanh chuẩn xác, trích xuất mốc thời gian chi tiết đến từng từ (`word_timestamps`).
  2. 💻 **Faster-Whisper Offline**: Chạy mô hình Whisper cục bộ bằng Python (`faster-whisper`), hoạt động hoàn toàn **offline 100%** trên máy tính mà không cần kết nối internet hay OpenAI API key.
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

### 10. 🖥️ Giao Diện Hiện Đại & Giám Sát Hệ Thống
- Thiết kế Dark Mode hiện đại phong cách Glassmorphism, chuẩn responsive cho mọi độ phân giải màn hình.
- Widget kiểm tra tình trạng kết nối API (OpenAI API, Gemini API) trực tiếp trên thanh Sidebar.
- Trình phát Video HTML5 xem trước kết quả ngay lập tức sau khi render xong.

---

## 📐 Kiến Trúc Quy Trình Hoạt Động (Pipeline Architecture)

```
[ Nguồn Dữ Liệu ]
  ├─ Kịch bản thô / Link YouTube ──► [ Gemini AI ] ──► Phân chia Scene, Prompts & SEO Metadata
  ├─ Kịch bản phân cảnh ──────────► [ Viettel / ElevenLabs TTS ] ──► File Audio Thuyết Minh (.mp3)
  └─ Prompts hình ảnh ───────────► [ Gemini Image / Midjourney ] ─► Danh sách ảnh phân cảnh

                                           │
                                           ▼
[ Xử Lý Thị Giác & Âm Thanh ]
  ├─ Ảnh Scene + Nền ────────────► [ Rembg / White-key ] ────────► Ảnh Composited hoàn chỉnh
  └─ Audio Thuyết Minh ──────────► [ OpenAI / Faster-Whisper ] ──► Word-level Timestamps

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
- **Node.js**: Phiên bản 16 trở lên (khuyến nghị 18 hoặc 20 LTS).
- **Python**: Phiên bản 3.10 trở lên.
- **FFmpeg & FFprobe**: Đã cài đặt và thêm vào biến môi trường hệ thống (System PATH).
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

# Cài đặt các thư viện xử lý ảnh và âm thanh
pip install rembg pillow numpy scipy faster-whisper torch
```

---

### 3. Cấu Hình File Môi Trường (`.env`)

Tạo file `.env` tại thư mục gốc của dự án (tham khảo file `.env.example`):

```env
# ── Server Configuration ──
PORT=3000
NODE_ENV=development

# ── Đường dẫn Python & FFmpeg ──
# Windows ví dụ: C:\personal_kyvu\CODE\editVideoTool\.venv\Scripts\python.exe
PYTHON_PATH=.venv/Scripts/python.exe
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe

# ── OpenAI API (Dùng cho Whisper Online) ──
OPENAI_API_KEY=sk-your-openai-api-key-here

# ── Whisper Offline (Dùng khi không có OpenAI key) ──
# Các mức: tiny | base | small | medium | large-v3 (Khuyên dùng: small hoặc medium)
LOCAL_WHISPER_MODEL=small

# ── Google Gemini AI (Tạo kịch bản, metadata & sinh ảnh) ──
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-3.5-flash
# Model sinh ảnh: gemini-2.5-flash-image | gemini-3.1-flash-image | gemini-3.1-flash-lite-image
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image

# ── Text-to-Speech (TTS) Providers ──
# Viettel AI TTS (Giọng Quỳnh Anh)
VIETTEL_AI_TOKEN=your_viettel_ai_token_here

# ElevenLabs TTS
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=your_elevenlabs_voice_id_here

# ── Google OAuth 2.0 (Dùng cho tính năng Auto-Upload YouTube) ──
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
```

---

### 4. Khởi Chạy Ứng Dụng

```bash
# Chạy ở môi trường production:
npm start

# Hoặc chạy ở môi trường development (auto reload):
npm run dev
```

Mở trình duyệt và truy cập: **[http://localhost:3000](http://localhost:3000)**

---

## 📖 Hướng Dẫn Sử Dụng Chi Tiết Từng Bước

### Bước 1: Soạn Thảo Kịch Bản (Tab 1)
1. Dán link video YouTube cần tham khảo (hoặc dán văn bản ý tưởng thô vào ô **Kịch Bản Thô**).
2. Bấm **✨ Tạo Phân Cảnh Bằng AI**: Hệ thống sẽ sinh danh sách phân cảnh kèm prompt hình ảnh, và kịch bản phân đoạn thoại chuẩn.
3. Bấm **📋 Viết Tiêu Đề & Mô Tả**: Nhận ngay bộ Metadata tối ưu SEO.
4. Bấm **⚡ Điền vào Form Tạo Video** hoặc tải về file `.txt`.

### Bước 2: Tạo Giọng Đọc Thuyết Minh (Tab 2)
1. Bấm **⟵ Lấy từ Trợ Lý Kịch Bản** để tự động điền kịch bản thoại.
2. Chọn nhà cung cấp: **Viettel AI** (giọng đọc truyền cảm chuẩn Việt) hoặc **ElevenLabs** (giọng studio cao cấp).
3. Bấm **🎙️ Tạo Audio Ngay**: Sau vài giây, bạn có thể nghe thử và bấm **⚡ Dùng cho Tạo Video**.

### Bước 3: Tạo Ảnh Phân Cảnh (Tùy chọn)
- Sử dụng prompt ở Bước 1 để tạo ảnh từ các công cụ AI (Midjourney, WhiskLab, Google Flow) hoặc sử dụng chức năng tạo ảnh tích hợp bằng Gemini Image API.
- Đặt tên các file ảnh theo thứ tự phân cảnh (ví dụ: `scene1.png`, `scene2.png`,...).

### Bước 4: Render Video Hoàn Chỉnh (Tab 3)
1. **Nguồn dữ liệu**:
   - Tải lên file âm thanh giọng đọc (`.mp3`).
   - Tải lên file kịch bản phân đoạn (`.txt`).
   - Tải lên danh sách ảnh Scene (`.png`, `.jpg`).
2. **Nền & Hiệu ứng**:
   - *(Tùy chọn)* Tải lên ảnh nền chung và chọn chế độ tách nền:
     - `whitekey`: Dành cho tranh vẽ, phác thảo sketch, ảnh nền trắng.
     - `rembg`: Dành cho ảnh chụp người thật, vật thể.
   - *(Tùy chọn)* Tải lên file nhạc nền (`.mp3`, `.wav`) và kéo thanh chỉnh âm lượng BGM.
3. **Cài đặt xuất**:
   - Chọn tỷ lệ khung hình: **16:9** (ngang) hoặc **9:16** (dọc).
   - Tùy chỉnh tốc độ video (**0.5x - 2.0x**).
   - Bật/tắt hiệu ứng đọc **Subtitle Karaoke**.
4. Bấm **🚀 Bắt Đầu Tạo Video** và theo dõi thanh tiến độ thời gian thực.

### Bước 5: Xem Trước & Đăng Tải Lên YouTube
1. Xem trước video hoàn chỉnh ngay trên trình duyệt.
2. Tải video về máy tính với nút **⬇️ Tải Video**.
3. Tại phần **Upload lên YouTube**:
   - Bấm **🔗 Kết nối YouTube** và cấp quyền qua Google OAuth.
   - Tiêu đề, mô tả và tags sẽ tự động được điền sẵn từ bước tạo kịch bản AI.
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

- **Lỗi `redirect_uri_mismatch` khi kết nối YouTube**:
  - Truy cập Google Cloud Console -> APIs & Services -> Credentials.
  - Chọn Client ID của bạn và thêm chính xác URL sau vào mục **Authorized redirect URIs**:
    `http://localhost:3000/oauth2callback`
- **Lỗi không tìm thấy FFmpeg (`ffmpeg: command not found`)**:
  - Đảm bảo bạn đã cài đặt FFmpeg và đường dẫn thư mục `bin` chứa `ffmpeg.exe` đã được thêm vào biến môi trường `PATH`.
  - Bạn cũng có thể cấu hình đường dẫn trực tiếp trong `.env`: `FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe`.
- **Lỗi khi chạy tách nền hoặc Whisper offline**:
  - Đảm bảo biến `PYTHON_PATH` trong `.env` trỏ đúng vào file thực thi python của virtualenv (ví dụ: `.venv/Scripts/python.exe` trên Windows).
  - Kiểm tra xem bạn đã cài đặt các package: `pip install rembg faster-whisper torch`.

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