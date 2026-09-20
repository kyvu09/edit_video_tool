/**
 * youtubeService.js — Upload video lên YouTube
 * 
 * Dùng trong GitHub Actions worker.
 * Nhận video stream từ driveService → pipe trực tiếp lên YouTube.
 */

const { google } = require('googleapis');
const { getYoutubeAuthClient } = require('./driveService');

/**
 * Upload video lên YouTube từ readable stream.
 * 
 * @param {object} options
 * @param {ReadableStream} options.videoStream - Stream video từ Google Drive
 * @param {string} options.title - Tiêu đề video
 * @param {string} options.description - Mô tả
 * @param {Array} options.tags - Tags
 * @param {string} options.privacyStatus - 'public' | 'private' | 'unlisted'
 * @returns {string} YouTube Video ID
 */
async function uploadToYouTube({ videoStream, title, description, tags, privacyStatus = 'public' }) {
  const auth = getYoutubeAuthClient();
  const youtube = google.youtube({ version: 'v3', auth });

  console.log(`[YOUTUBE] Uploading: "${title}"...`);

  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title,
        description: description || '',
        tags: tags || [],
        categoryId: '22', // People & Blogs
        defaultLanguage: 'vi',
      },
      status: {
        privacyStatus,
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: videoStream,
    },
  });

  const youtubeVideoId = response.data.id;
  console.log(`[YOUTUBE] ✅ Upload thành công!`);
  console.log(`[YOUTUBE] 🔗 https://youtube.com/watch?v=${youtubeVideoId}`);

  return youtubeVideoId;
}

module.exports = { uploadToYouTube };
