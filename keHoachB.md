Vậy kiến trúc $0 của mình có thể thành
┌─────────────────┐
│ GitHub Pages │
│ React + Vite │
└────────┬────────┘
│
▼
┌─────────────────┐
│ Cloudflare R2 │
│ Video Storage │
└────────┬────────┘
│
scheduled time
│
▼
┌─────────────────┐
│ GitHub Actions │
│ Upload Worker │
└────────┬────────┘
│
▼
┌─────────────────┐
│ YouTube API │
│ OAuth 2.0 │
└─────────────────┘

Không cần GCS, Cloud Run, Cloud Tasks hay Cloud Storage nữa.

Một lưu ý: R2 hiện được tính theo usage và Cloudflare yêu cầu đăng ký R2 subscription; trang Cloudflare nói free usage được bao gồm nhưng việc vượt free allocation sẽ phát sinh billing. Vì vậy nếu tiêu chí của Kỳ là “không nhập thẻ + tuyệt đối không billing”, mình nên kiểm tra tiếp chính xác flow đăng ký R2 ở tài khoản Việt Nam trước khi quyết định dùng nó.

Nhưng về mặt kiến trúc kỹ thuật, câu trả lời là hoàn toàn được: cloud lưu video → GitHub Actions lấy video xuống → upload YouTube.

vậy kế hoạch từng bước là gì

Được bro. Nhưng sau khi kiểm tra lại tài liệu hiện tại, mình đính chính một điểm quan trọng: Cloudflare R2 không phù hợp với yêu cầu “không Billing / không thêm thẻ”, vì R2 yêu cầu tạo subscription và có payment method cho usage-based billing. Dù có free tier 10 GB/tháng, nó vẫn thuộc hệ thống billing.

Với yêu cầu của Kỳ, mình sẽ đổi sang Google Drive làm kho video. Google Drive API hiện cho phép upload/download miễn phí trong hạn mức tiêu chuẩn; Google công bố ngưỡng Drive API 1 TB/ngày/project và nói sử dụng tiêu chuẩn không mất phí.

Kế hoạch mới: $0 + không Cloud Billing
EDIT VIDEO TOOL
│
┌─────────┴─────────┐
▼ ▼
GitHub Pages Google Drive
React + Vite Video Storage
│ │
│ │
└────────┬──────────┘
▼
GitHub Actions
Scheduler
│
▼
Download video
│
▼
YouTube Data API
│
▼
YouTube
Giai đoạn 1 — Bỏ toàn bộ GCP infrastructure

Xóa khỏi plan:

❌ Cloud Run
❌ Cloud Storage
❌ Firestore
❌ Cloud Tasks
❌ Secret Manager
❌ Google Cloud Billing

Giữ:

✅ React + Vite
✅ GitHub Pages
✅ GitHub Actions
✅ Google OAuth
✅ YouTube Data API
Giai đoạn 2 — Google Drive làm Video Storage

Tạo một folder:

Google Drive
└── EditVideoTool/
├── videos/
│ ├── video_001.mp4
│ ├── video_002.mp4
│ └── ...
│
└── metadata/

App sẽ lưu trong database thông tin kiểu:

{
"id": "video_001",
"name": "video.mp4",
"driveFileId": "1AbCdEf...",
"status": "SCHEDULED",
"scheduledAt": "2026-09-20T18:30:00+07:00",
"youtubeTitle": "..."
}

Drive API hỗ trợ upload và download file trực tiếp; với video lớn hơn 5 MB, Google khuyến nghị resumable upload.

Giai đoạn 3 — Upload video

Flow mới:

User chọn video
↓
React
↓
Google OAuth
↓
Google Drive API
↓
Drive/videos/video.mp4
↓
lấy driveFileId
↓
lưu metadata

Không cần:

Frontend
↓
Cloud Run
↓
Signed URL
↓
GCS

nữa.

Điểm hay là Drive API cho phép app dùng OAuth của chính user để upload file vào My Drive, và file đó thuộc tài khoản của user.

Giai đoạn 4 — Database

Đây là phần mình sẽ chưa quyết định vội.

Ta có thể bắt đầu bằng một file JSON/SQLite để test:

videos.json

Ví dụ:

[
{
"id": "abc123",
"driveFileId": "1xxx",
"title": "Test video",
"scheduledAt": "2026-09-20T18:30:00+07:00",
"status": "SCHEDULED"
}
]

Sau khi worker chạy ổn mới quyết định database cloud miễn phí.

Không nên dùng GitHub repo làm database chính.

Giai đoạn 5 — GitHub Actions Worker

Đây là phần thay thế Cloud Tasks + Cloud Run Worker.

Ví dụ:

name: YouTube Scheduler

on:
schedule: - cron: "_/5 _ \* \* \*"

workflow_dispatch:

jobs:
upload:
runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Check scheduled videos
        run: npm run worker

GitHub Actions hỗ trợ scheduled workflow, với khoảng thời gian tối thiểu 5 phút. Scheduled workflow chạy trên default branch.

Lưu ý: cron không đảm bảo chạy chính xác từng giây tại thời điểm đặt lịch. Vì vậy worker nên kiểm tra:

scheduledAt <= currentTime
AND
status == SCHEDULED

thay vì phụ thuộc vào cron chạy đúng 18:30.

Giai đoạn 6 — Worker lấy video từ Drive

Khi đến lịch:

GitHub Actions
│
▼
Query scheduled videos
│
▼
driveFileId
│
▼
Google Drive API
│
▼
download video
│
▼
GitHub Actions runner
│
▼
YouTube API

Sau khi upload thành công:

SCHEDULED
↓
UPLOADING_TO_YOUTUBE
↓
PUBLISHED

Nếu lỗi:

SCHEDULED
↓
UPLOADING_TO_YOUTUBE
↓
UPLOAD_FAILED

Sau đó retry.

Giai đoạn 7 — YouTube OAuth

Phần này giữ gần như nguyên kiến trúc cũ.

Google OAuth
│
▼
YouTube permission
│
▼
Refresh Token
│
▼
GitHub Secrets

Ví dụ:

YOUTUBE_CLIENT_ID
YOUTUBE_CLIENT_SECRET
YOUTUBE_REFRESH_TOKEN

Tuyệt đối không commit vào GitHub.

Worker lấy secrets:

GitHub Actions Secrets
↓
Environment variables
↓
Node.js worker
↓
OAuth
↓
YouTube
Giai đoạn 8 — GitHub Pages

Frontend vẫn giữ:

Home
Library
Schedule
Connect YouTube

Nhưng API architecture thay đổi.

Cũ
React
↓
Cloud Run API
↓
GCP services
Mới
React
↓
Google APIs
↓
Google Drive

và GitHub Actions đảm nhiệm phần backend job:

GitHub Actions
↓
Drive
↓
YouTube
