/**
 * driveService.js — Tương tác với Google Drive API
 * 
 * Dùng trong GitHub Actions worker:
 * - Đọc/ghi metadata.json (database)
 * - Download video file để upload lên YouTube
 */

const { google } = require('googleapis');

const FOLDER_NAME = 'EditVideoTool';
const METADATA_FILENAME = 'metadata.json';

/**
 * Tạo OAuth2 client cho Google Drive
 */
function getDriveAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID, // Vẫn dùng chung Client ID
    process.env.YOUTUBE_CLIENT_SECRET,
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN, // Token của tài khoản Drive
  });

  return oauth2Client;
}

/**
 * Tạo OAuth2 client cho YouTube
 */
function getYoutubeAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN, // Token của tài khoản YouTube
  });

  return oauth2Client;
}

/**
 * Tạo Drive API instance.
 */
function getDrive(auth) {
  return google.drive({ version: 'v3', auth });
}

/**
 * Tìm folder EditVideoTool trên Drive. Tạo mới nếu chưa có.
 * @returns {string} folderId
 */
async function getOrCreateFolder(drive) {
  // Tìm folder đã tồn tại
  const res = await drive.files.list({
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  // Tạo mới
  const folder = await drive.files.create({
    requestBody: {
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });

  console.log(`[DRIVE] Created folder: ${FOLDER_NAME}`);
  return folder.data.id;
}

/**
 * Đọc metadata.json từ Google Drive.
 * Trả về mảng video objects. Nếu chưa tồn tại, trả về [].
 * 
 * @returns {{ fileId: string|null, videos: Array }}
 */
async function readMetadata() {
  const auth = getDriveAuthClient();
  const drive = getDrive(auth);
  const folderId = await getOrCreateFolder(drive);

  // Tìm file metadata.json
  const res = await drive.files.list({
    q: `name='${METADATA_FILENAME}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (res.data.files.length === 0) {
    return { fileId: null, folderId, videos: [] };
  }

  const fileId = res.data.files[0].id;

  // Download nội dung
  const content = await drive.files.get({
    fileId,
    alt: 'media',
  });

  const videos = typeof content.data === 'string'
    ? JSON.parse(content.data)
    : content.data;

  return { fileId, folderId, videos };
}

/**
 * Ghi metadata.json lên Google Drive (tạo mới hoặc cập nhật).
 */
async function writeMetadata({ fileId, folderId, videos }) {
  const auth = getDriveAuthClient();
  const drive = getDrive(auth);

  const media = {
    mimeType: 'application/json',
    body: JSON.stringify(videos, null, 2),
  };

  if (fileId) {
    // Cập nhật file đã có
    await drive.files.update({
      fileId,
      media,
    });
  } else {
    // Tạo file mới trong folder EditVideoTool
    if (!folderId) {
      folderId = await getOrCreateFolder(drive);
    }
    await drive.files.create({
      requestBody: {
        name: METADATA_FILENAME,
        parents: [folderId],
      },
      media,
      fields: 'id',
    });
  }

  console.log(`[DRIVE] metadata.json saved (${videos.length} videos)`);
}

/**
 * Cập nhật file info.json trong thư mục con của video.
 */
async function writeVideoInfo(videoMeta, targetFolderId) {
  if (!targetFolderId) return;

  const auth = getDriveAuthClient();
  const drive = getDrive(auth);

  // Tìm file info.json
  const res = await drive.files.list({
    q: `name='info.json' and '${targetFolderId}' in parents and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  });

  const media = {
    mimeType: 'application/json',
    body: JSON.stringify(videoMeta, null, 2),
  };

  if (res.data.files.length > 0) {
    await drive.files.update({
      fileId: res.data.files[0].id,
      media,
    });
    console.log(`[DRIVE] Updated info.json in subfolder ${targetFolderId}`);
  }
}

/**
 * Download video file từ Google Drive.
 * Trả về readable stream để pipe thẳng sang YouTube upload.
 * 
 * @param {string} driveFileId - ID file trên Drive
 * @returns {ReadableStream}
 */
async function downloadVideoStream(driveFileId) {
  const auth = getDriveAuthClient();
  const drive = getDrive(auth);

  const res = await drive.files.get({
    fileId: driveFileId,
    alt: 'media',
  }, {
    responseType: 'stream',
  });

  return res.data;
}

module.exports = {
  getDriveAuthClient,
  getYoutubeAuthClient,
  readMetadata,
  writeMetadata,
  writeVideoInfo,
  downloadVideoStream,
};
