<div align="center">
  <h1>🎬 Edit Video Tool - Trợ Lý AI Sản Xuất & Đăng Tải Video</h1>
  <p><i>Tự động hóa hoàn toàn quy trình tạo video: từ giọng nói, hình ảnh, đến việc tự động đăng tải lên YouTube với chuẩn SEO.</i></p>
</div>

---

Một công cụ tạo video mạnh mẽ được điều khiển bởi AI giúp tự động tạo video hoàn chỉnh từ hình ảnh, âm thanh (narrative audio) và kịch bản (script). Không chỉ dừng lại ở việc tạo video, công cụ còn tích hợp AI Gemini để phân tích kịch bản, tự động viết siêu dữ liệu (Metadata) chuẩn SEO và đăng tải trực tiếp lên kênh YouTube của bạn!

## ✨ Tính Năng Nổi Bật

- 🎤 **Tích hợp Whisper AI**: Tự động nhận dạng giọng nói và trích xuất mốc thời gian chính xác từ file âm thanh.
- ✂️ **Tách Nền Tự Động (Rembg)**: Ứng dụng AI (Python Rembg) để tự động xóa phông xanh/tách nền ảnh nhân vật trước khi ghép vào video.
- 🤖 **Gemini AI SEO Metadata**: Tự động đọc hiểu kịch bản và sinh ra Tiêu đề, Mô tả, Tags và Hashtags tối ưu SEO nhất.
- 📺 **Auto-Upload YouTube**: Liên kết OAuth 2.0 an toàn giúp bạn đăng video trực tiếp lên YouTube ngay từ giao diện của Tool chỉ với 1 click.
- 📝 **Tạo Phụ Đề Chuyên Nghiệp**: Tạo file phụ đề chuẩn SRT có viền (outline) nổi bật, dễ đọc trên mọi nền tảng (Shorts, TikTok, YouTube).
- 🎥 **Bộ Render FFmpeg Mạnh Mẽ**: Ghép hình ảnh, âm thanh, và phụ đề thành video MP4 chất lượng cao một cách mượt mà.
- ⏳ **Thanh Tiến Độ Thời Gian Thực**: Theo dõi trực quan tiến trình xử lý từ lúc phân tích giọng nói đến khi upload thành công lên YouTube.

## 📐 Kiến Trúc Hoạt Động

```text
AUDIO (MP3) → Whisper AI → Mốc thời gian (Timestamps)
                                  ↓
SCRIPT (TXT) → Gemini AI (Tạo Title, Desc, Tags) → Kịch Bản
                                  ↓
HÌNH ẢNH (PNG/JPG) → Rembg (Tách nền xanh) → Khớp Phân Cảnh
                                  ↓
                           Trình Render FFmpeg 
                 (Ghép cảnh, âm thanh, tự động chèn sub)
                                  ↓
                        VIDEO CUỐI CÙNG (MP4)
                                  ↓
                        YouTube Data API v3 
                       (Tự động Đăng Video)
```

## 🛠️ Cài Đặt & Cấu Hình

### Yêu Cầu Hệ Thống
- **Node.js** phiên bản 16 trở lên.
- **Python 3.10+** (Dành cho tính năng tách nền tự động).
- **FFmpeg & FFprobe** đã được cài đặt và thêm vào biến môi trường (PATH).

### Các Bước Cài Đặt

**1. Cài đặt thư viện Node.js**
```bash
git clone https://github.com/kyvu09/edit_video_tool.git
cd edit_video_tool
npm install
```

**2. Cài đặt Python & Rembg (Cho tính năng tách nền)**
```bash
# Tạo môi trường ảo Python
python -m venv .venv

# Kích hoạt môi trường (Windows)
.venv\Scripts\activate

# Cài đặt thư viện tách nền
pip install rembg pillow
```

**3. Cấu hình môi trường (.env)**
Tạo file `.env` ở thư mục gốc và điền các thông tin sau:
```env
PORT=3000
NODE_ENV=development

# Đường dẫn đến môi trường Python
PYTHON_PATH=C:\edit_video_tool\.venv\Scripts\python.exe

# API Keys
OPENAI_API_KEY=sk-your-openai-api-key-here
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-3.5-flash

# Google OAuth 2.0 (Dùng cho tính năng upload YouTube)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
```

**4. Khởi chạy ứng dụng**
```bash
npm start
```
Truy cập: [http://localhost:3000](http://localhost:3000)

## 📖 Hướng Dẫn Sử Dụng

1. **Chuẩn bị file**:
   - `Audio`: File thu âm `.mp3`.
   - `Script`: File `.txt` chứa kịch bản theo phân đoạn (`SCENE 1`, `SCENE 2`,...).
   - `Images`: Các ảnh tương ứng với từng Scene (`scene1.png`, `scene2.jpg`,...).
2. **Tạo Video**: Vào giao diện web, upload 3 thành phần trên và bấm **Tạo Video**.
3. **Theo dõi quá trình**: Hệ thống sẽ tự động tách nền ảnh, nhận diện giọng nói, sinh metadata SEO và render video MP4.
4. **Upload lên YouTube**:
   - Tại màn hình Success, giao diện sẽ hiện sẵn Tiêu đề, Mô tả và Tags do AI Gemini sinh ra.
   - Bấm **Kết nối YouTube** (nếu chưa kết nối).
   - Chọn chế độ bảo mật (Public/Private/Unlisted) và bấm **Tải lên YouTube**.

## ☕ Ủng Hộ Tác Giả gói mì tôm (Donate)

Dự án này là hoàn toàn mã nguồn mở và miễn phí. Nếu công cụ này giúp bạn tiết kiệm hàng giờ đồng hồ edit video mỗi ngày, hãy cân nhắc mời tôi một ly cà phê để tôi có thêm động lực duy trì và phát triển những tính năng xịn xò hơn nhé! ❤️

* 
* **Ngân hàng (MBBank):** 
  - STK: `0338187302`
  - Chủ thẻ: `VU MANH KY`

## 📝 Khắc Phục Sự Cố (Troubleshooting)

- **Lỗi `redirect_uri_mismatch` khi kết nối YouTube**: Hãy chắc chắn bạn đã thêm `http://localhost:3000/oauth2callback` vào phần **Authorized redirect URIs** trên Google Cloud Console.
- **Lỗi không tìm thấy FFmpeg**: Đảm bảo bạn đã cài đặt FFmpeg và thêm vào biến môi trường PATH của hệ điều hành.

## 📄 Bản Quyền
Dự án được phân phối dưới giấy phép **MIT**. Mọi người đều có quyền sử dụng, sao chép và sửa đổi.

---
*Phát triển bởi **kyvu09** - Mang sức mạnh AI vào quy trình sáng tạo của bạn!*