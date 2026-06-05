# Edit Video Tool 🎬 - Công Cụ Tạo Video Tự Động Từ AI

Một công cụ tạo video mạnh mẽ được điều khiển bởi AI giúp tự động tạo video hoàn chỉnh từ hình ảnh, âm thanh (narrative audio) và kịch bản (script). Dự án đã tích hợp thành công **Thanh tiến độ thời gian thực (Real-time Progress Bar)** cho phép theo dõi chi tiết từng giai đoạn xử lý từ AI Whisper cho tới việc render video bằng FFmpeg.

## ✨ Tính Năng Nổi Bật

- 🎤 **Tích hợp Whisper AI** - Tự động nhận dạng giọng nói và trích xuất mốc thời gian chính xác từ file âm thanh.
- 📝 **Phân tích Kịch Bản Thông Minh** - Tự động nhận diện các phân cảnh (scenes) và nội dung thoại.
- 🎬 **Khớp Cảnh Thông Minh** - Đồng bộ hóa hình ảnh tải lên với mốc thời gian thoại tương ứng.
- 📋 **Tự Động Tạo Phụ Đề** - Tạo file phụ đề chuẩn SRT chuyên nghiệp.
- 🎥 **Bộ Render FFmpeg Đầy Đủ** - Ghép hình ảnh, âm thanh, và phụ đề thành video MP4 chất lượng cao.
- ⏳ **Thanh Tiến Độ Thời Gian Thực (Mới)** - Hiển thị tiến độ render chi tiết (từng phân cảnh, ghép nhạc, chèn sub) thông qua cơ chế Polling API không đồng bộ.
- 🎨 **Giao Diện Đẹp Mắt** - Giao diện Web hiện đại, dễ thao tác, hỗ trợ xem trước hình ảnh trước khi tạo.

## 📐 Kiến Trúc Hoạt Động

```
AUDIO (MP3)
    ↓
Whisper AI → Mốc thời gian (Timestamps)
    ↓
SCRIPT (TXT) → Bộ khớp phân cảnh ← HÌNH ẢNH (PNG/JPG)
    ↓
Tạo dòng thời gian (Timeline)
    ↓
Tạo Phụ đề (SRT)
    ↓
Trình Render FFmpeg (Báo cáo tiến độ thời gian thực)
    ↓
VIDEO CUỐI CÙNG (MP4)
```

## 🛠️ Cài Đặt

### Yêu Cầu Hệ Thống
- **Node.js** phiên bản 16 trở lên
- **FFmpeg & FFprobe** đã được cài đặt và thêm vào biến môi trường (PATH)
- **OpenAI API Key** (Sử dụng cho mô hình Whisper-1)

### Các Bước Cài Đặt

1. **Cài đặt thư viện**
   ```bash
   cd editVideoTool
   npm install
   ```

2. **Cài đặt FFmpeg** (Nếu chưa có)
   - **Windows** (Qua Chocolatey): `choco install ffmpeg`
   - **macOS** (Qua Homebrew): `brew install ffmpeg`
   - **Linux** (Debian/Ubuntu): `sudo apt-get install ffmpeg`

3. **Cấu hình môi trường**
   Sao chép file `.env.example` thành `.env`:
   ```bash
   cp .env.example .env
   ```
   Mở file `.env` lên và điền khóa OpenAI API:
   ```env
   OPENAI_API_KEY=sk-xxxxx...
   ```

4. **Khởi chạy ứng dụng**
   ```bash
   npm start
   ```
   Ứng dụng sẽ chạy tại địa chỉ: [http://localhost:3000](http://localhost:3000)

## 📖 Hướng Dẫn Sử Dụng

1. Truy cập vào [http://localhost:3000](http://localhost:3000) trên trình duyệt.
2. Tải lên các tệp tin yêu cầu:
   - **Audio (MP3)**: File thu âm giọng đọc/thuyết minh.
   - **Script (TXT)**: File kịch bản phân chia theo định dạng phân cảnh.
   - **Images**: Chọn đồng thời tất cả các bức ảnh minh họa cho các phân cảnh.
3. Nhấn nút **Create Video**.
4. Hệ thống sẽ ngay lập tức kích hoạt tiến trình xử lý ngầm và hiển thị **thanh tiến độ thực tế**:
   - 🎤 Đang trích xuất mốc thời gian từ giọng nói (Whisper)...
   - 📝 Đang phân tích kịch bản...
   - 🎬 Đang đồng bộ hóa timeline...
   - 📋 Đang tạo phụ đề srt...
   - 🎥 Đang render video từng cảnh (ví dụ: `Rendering scene 2 of 5...`), nối video, ghép phụ đề.
5. Khi tiến độ đạt 100%, nhấn **Download Video** để tải video MP4 về máy.

### Định Dạng File Kịch Bản (Script)
Tạo tệp `.txt` với cấu trúc phân cảnh mẫu như sau:
```text
SCENE 1
Người thành công không phải là người thông minh nhất,

SCENE 2
mà là người nỗ lực nhiều nhất.

SCENE 3
Thông minh có thể giúp bạn bắt đầu nhanh hơn,
```
*Lưu ý:* Hãy đặt tên file ảnh tương ứng là `scene1.png`, `scene2.png`, `scene3.jpg`... để bộ khớp phân cảnh hoạt động hoàn hảo nhất.

## 🔌 Hệ Thống API mới

### 1. Kích Hoạt Tạo Video (Asynchronous)
- **Endpoint:** `POST /api/upload`
- **Body (Multipart Form-Data):**
  - `audio`: File `.mp3`
  - `script`: File `.txt`
  - `images`: Tập hợp các tệp `.png`/`.jpg`
- **Phản hồi mẫu (HTTP 202):**
  ```json
  {
    "sessionId": "1717589632123",
    "message": "Video creation started",
    "statusUrl": "/api/progress/1717589632123"
  }
  ```

### 2. Kiểm Tra Tiến Độ Thời Gian Thực (Polling)
- **Endpoint:** `GET /api/progress/:sessionId`
- **Phản hồi mẫu (HTTP 200 - Đang xử lý):**
  ```json
  {
    "status": "processing",
    "progress": 60,
    "currentStep": "step-ffmpeg",
    "statusMessage": "Rendering scene 2 of 5...",
    "error": null,
    "videoUrl": null
  }
  ```
- **Phản hồi mẫu (HTTP 200 - Hoàn thành):**
  ```json
  {
    "status": "completed",
    "progress": 100,
    "currentStep": "step-ffmpeg",
    "statusMessage": "Video created successfully!",
    "error": null,
    "videoUrl": "/download/1717589632123/output.mp4"
  }
  ```

### 3. Tải Xuống Video Hoàn Thiện
- **Endpoint:** `GET /download/:sessionId/:filename`

## 📂 Cấu Trúc Thư Mục Dự Án
```
editVideoTool/
├── server.js                 # Express server & các endpoint API (Hỗ trợ xử lý bất đồng bộ)
├── src/
│   └── services/
│       ├── whisperService.js      # Tích hợp OpenAI Whisper API
│       ├── scriptParser.js         # Phân tích nội dung kịch bản
│       ├── timelineGenerator.js    # Khớp hình ảnh với giọng đọc
│       ├── subtitleGenerator.js    # Tạo phụ đề chuẩn SRT
│       └── ffmpegRenderer.js       # Render video qua FFmpeg (Hỗ trợ callback tiến độ)
├── public/
│   ├── index.html            # Giao diện người dùng
│   ├── style.css             # Định dạng giao diện
│   └── app.js                # Logic Frontend (Xử lý Polling nhận dữ liệu thời gian thực)
├── uploads/                  # Thư mục tạm chứa file tải lên
├── output/                   # Thư mục chứa các session video hoàn thành
├── package.json
└── .env                      # Các biến môi trường cấu hình ứng dụng
```

## 📝 Khắc Phục Sự Cố

### Lỗi Không Tìm Thấy FFmpeg
Nếu hệ thống báo lỗi không thể khởi chạy FFmpeg, bạn hãy cài đặt đường dẫn trực tiếp trong `.env`:
```env
FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe
FFPROBE_PATH=C:\ffmpeg\bin\ffprobe.exe
```

### Lỗi Whisper API
- Kiểm tra lại biến `OPENAI_API_KEY` trong file `.env`.
- Hãy chắc chắn tài khoản OpenAI của bạn còn đủ số dư và không bị giới hạn định mức (billing limit).
- File âm thanh tải lên nên nhỏ hơn 25MB.

## 🗺️ Kế Hoạch Phát Triển (Roadmap)

- [x] Thanh tiến độ xử lý thực tế (Polling API & Callbacks)
- [ ] Các hiệu ứng chuyển cảnh đẹp mắt (Zoom, fade, pan)
- [ ] Hỗ trợ đa ngôn ngữ
- [ ] Tự động trộn nhạc nền theo sở thích
- [ ] Giao diện quản lý thư viện các video đã tạo

## 📄 Bản Quyền
Dự án được phân phối dưới giấy phép **MIT**.

---
**Được xây dựng với ❤️ bằng cách kết hợp OpenAI Whisper & FFmpeg!**