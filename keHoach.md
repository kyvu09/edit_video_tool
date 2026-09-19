# Kế hoạch & Kiến trúc Edit Video Tool

## Kiến trúc hệ thống (Final)

```mermaid
flowchart TD
    UI[GitHub Pages (Frontend)] -- "API request" --> Backend[Cloud Run (Backend)]
    
    Backend -- "1. Cấp quyền" --> SignedURL[Signed URL]
    SignedURL -- "2. Trả về" --> UI
    UI -- "3. Upload trực tiếp" --> GCS[(Cloud Storage\nvideo.mp4)]
    
    Backend -- "Lưu Metadata & Trạng thái" --> DB[(Firestore)]
    Backend -- "Tạo Task tới giờ đăng" --> Tasks[Cloud Tasks]
    Backend -- "Lưu token bảo mật" --> SecretManager[Secret Manager]
    
    Tasks -- "Đúng giờ gọi lại" --> BackendWorker[Cloud Run (Worker)]
    
    BackendWorker -- "Lấy token" --> SecretManager
    BackendWorker -- "Lấy video" --> GCS
    BackendWorker -- "Refresh token" --> GoogleOAuth[Google OAuth]
    BackendWorker -- "Upload" --> YouTubeAPI[YouTube Data API]
    YouTubeAPI --> YouTube[YouTube]
```

## Chi tiết Stack Công Nghệ

*   **Frontend:** GitHub Pages (Giao diện SPA)
*   **Backend:** Google Cloud Run (Xử lý logic, cấp quyền, worker)
*   **Video storage:** Google Cloud Storage (Lưu trữ file video)
*   **Database:** Firestore (Lưu metadata, lịch đăng, trạng thái)
*   **Scheduled jobs:** Cloud Tasks (Kích hoạt chính xác thời điểm đăng)
*   **Authentication:** Google OAuth 2.0 (Xin quyền upload YouTube)
*   **Secrets:** Google Cloud Secret Manager (Lưu `refresh_token` an toàn)
*   **Publishing:** YouTube Data API v3

## Các quyết định thiết kế quan trọng

### 1. Upload Video qua Signed URL
Để xử lý các video vài trăm MB đến vài GB, luồng sẽ là:
`Frontend -> Xin quyền Backend -> Nhận Signed URL -> Upload trực tiếp từ Frontend lên Cloud Storage.`
Backend chỉ làm nhiệm vụ cấp quyền chứ không phải gánh luồng upload nặng nề.

### 2. Lên lịch bằng Cloud Tasks
Không dùng cơ chế quét (polling) mỗi phút bằng Scheduler. Khi user đặt lịch (VD: 20/09/2026 19:30), Backend sẽ tạo một Cloud Task đúng giờ đó. Tới `19:30`, Cloud Tasks gọi Backend để thực hiện upload lên YouTube.
*(Cloud Scheduler có thể vẫn được dùng sau này cho các task dọn dẹp hệ thống).*

### 3. Bảo mật OAuth 2.0 Token (Secret Manager)
Flow lấy quyền:
User chọn "Connect YouTube" -> Đăng nhập Google OAuth -> Chấp nhận quyền -> Trả về `refresh_token`.
Token này được lưu bảo mật trong **Secret Manager** thay vì dạng plaintext trong Firestore. Khi Cloud Tasks chạy, Backend sẽ lấy `refresh_token` từ Secret Manager ra để tạo `access_token` mới và upload.

### 4. Quản lý Trạng thái Video (State Machine)
Để tránh tình trạng mơ hồ về việc video đã đăng hay chưa, Firestore sẽ theo dõi vòng đời của video qua các trạng thái:
1. `DRAFT`: Đang tạo, chưa có file
2. `UPLOADING`: Đang được tải lên Cloud Storage từ Frontend
3. `STORED`: Đã nằm trong Storage an toàn
4. `SCHEDULED`: Đã được thiết lập lịch lên YouTube (Cloud Task đã được tạo)
5. `UPLOADING_TO_YOUTUBE`: Tới giờ, Worker đang đẩy lên YouTube
6. `PUBLISHED`: Đăng thành công trên YouTube
7. `UPLOAD_FAILED`: Đăng lỗi (Cần `RETRY`)

### 5. Quota YouTube API & Cold Start
*   **Cold Start:** Backend (Cloud Run) lúc mới chạy hoặc upload chạy ngầm chậm vài giây không phải vấn đề. Chưa cần thiết lập `min-instances=1` ở giai đoạn này.
*   **Quota:** Mặc định ~10.000 units/ngày (mỗi video insert tốn ~1600 units). Nghĩa là tầm 6 video/ngày, đủ cho giai đoạn đầu. Nếu cần sẽ xin Google tăng hạn mức.
