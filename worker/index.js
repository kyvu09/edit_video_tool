/**
 * worker/index.js — Script chính của GitHub Actions Worker
 * 
 * Chạy mỗi 5 phút qua GitHub Actions cron.
 * 
 * Luồng:
 * 1. Đọc metadata.json từ Google Drive
 * 2. Tìm video có scheduledAt <= now && status === 'SCHEDULED'
 * 3. Download video từ Drive
 * 4. Upload lên YouTube
 * 5. Cập nhật metadata.json (SCHEDULED → PUBLISHED hoặc UPLOAD_FAILED)
 */

const { readMetadata, writeMetadata, writeVideoInfo, downloadVideoStream } = require('./src/driveService');
const { uploadToYouTube } = require('./src/youtubeService');

async function main() {
  console.log('─────────────────────────────────────────');
  console.log(`[WORKER] Started at ${new Date().toISOString()}`);
  console.log('─────────────────────────────────────────');

  // 1. Đọc metadata
  const metadata = await readMetadata();
  const { videos } = metadata;

  if (videos.length === 0) {
    console.log('[WORKER] No videos in metadata. Done.');
    return;
  }

  // 2. Tìm video cần upload
  const now = new Date();
  const scheduled = videos.filter(v =>
    v.status === 'SCHEDULED' && new Date(v.scheduledAt) <= now
  );

  if (scheduled.length === 0) {
    console.log(`[WORKER] No videos due for upload. Total: ${videos.length}, Scheduled: ${videos.filter(v => v.status === 'SCHEDULED').length}`);
    return;
  }

  console.log(`[WORKER] Found ${scheduled.length} video(s) ready to upload.`);

  let hasChanges = false;

  // 3. Xử lý từng video
  for (const video of scheduled) {
    console.log(`\n[WORKER] Processing: "${video.title}" (ID: ${video.id})`);

    // Cập nhật trạng thái → UPLOADING_TO_YOUTUBE
    video.status = 'UPLOADING_TO_YOUTUBE';
    video.updatedAt = new Date().toISOString();

    try {
      // Download video từ Drive
      console.log(`[WORKER] Downloading from Drive: ${video.driveFileId}`);
      const videoStream = await downloadVideoStream(video.driveFileId);

      // Upload lên YouTube
      const youtubeVideoId = await uploadToYouTube({
        videoStream,
        title: video.title,
        description: video.description || '',
        tags: video.tags || [],
        privacyStatus: video.privacyStatus || 'public',
      });

      // Thành công → PUBLISHED
      video.status = 'PUBLISHED';
      video.youtubeVideoId = youtubeVideoId;
      video.youtubeUrl = `https://youtube.com/watch?v=${youtubeVideoId}`;
      video.publishedAt = new Date().toISOString();
      video.updatedAt = new Date().toISOString();
      video.errorMessage = null;
      hasChanges = true;

      console.log(`[WORKER] ✅ Published: ${video.youtubeUrl}`);
    } catch (err) {
      // Lỗi → UPLOAD_FAILED
      console.error(`[WORKER] ❌ Failed: ${err.message}`);
      video.status = 'UPLOAD_FAILED';
      video.errorMessage = err.message;
      video.failedAt = new Date().toISOString();
      video.updatedAt = new Date().toISOString();
      hasChanges = true;
    }

    // Cập nhật info.json trong thư mục con nếu có
    if (video.driveFolderId) {
      try {
        await writeVideoInfo(video, video.driveFolderId);
      } catch (e) {
        console.error(`[WORKER] Failed to update subfolder info.json: ${e.message}`);
      }
    }
  }

  // 4. Lưu lại metadata
  if (hasChanges) {
    await writeMetadata(metadata);
    console.log('[WORKER] Metadata updated on Drive.');
  }

  // 5. Tóm tắt
  const published = scheduled.filter(v => v.status === 'PUBLISHED').length;
  const failed = scheduled.filter(v => v.status === 'UPLOAD_FAILED').length;
  console.log(`\n[WORKER] Summary: ${published} published, ${failed} failed out of ${scheduled.length} total.`);
  console.log('[WORKER] Done.');
}

main().catch(err => {
  console.error('[WORKER] Fatal error:', err);
  process.exit(1);
});
