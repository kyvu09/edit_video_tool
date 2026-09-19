/**
 * driveService.js — Tương tác trực tiếp với Google Drive API từ browser
 * 
 * Dùng gapi.client.drive đã load trong googleAuth.js
 * Tất cả operations đều chạy trên browser, không cần backend.
 */

const FOLDER_NAME = 'EditVideoTool';
const METADATA_FILENAME = 'metadata.json';

// Cache folder ID để không query lại mỗi lần
let cachedFolderId = null;

/**
 * Tìm hoặc tạo folder EditVideoTool trên Drive.
 */
async function getOrCreateFolder() {
  if (cachedFolderId) return cachedFolderId;

  const res = await window.gapi.client.drive.files.list({
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (res.result.files.length > 0) {
    cachedFolderId = res.result.files[0].id;
    return cachedFolderId;
  }

  // Tạo folder mới
  const folder = await window.gapi.client.drive.files.create({
    resource: { name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
    fields: 'id',
  });

  cachedFolderId = folder.result.id;
  return cachedFolderId;
}

/**
 * Đọc metadata.json từ Drive.
 * @returns {{ fileId: string|null, videos: Array }}
 */
export async function readMetadata() {
  const folderId = await getOrCreateFolder();

  const res = await window.gapi.client.drive.files.list({
    q: `name='${METADATA_FILENAME}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  });

  if (res.result.files.length === 0) {
    return { fileId: null, videos: [] };
  }

  const fileId = res.result.files[0].id;
  const content = await window.gapi.client.drive.files.get({
    fileId,
    alt: 'media',
  });

  return { fileId, videos: content.result || [] };
}

/**
 * Ghi metadata.json lên Drive (tạo mới hoặc update).
 */
export async function writeMetadata({ fileId, videos }) {
  const folderId = await getOrCreateFolder();
  const boundary = '===metadata_boundary===';
  const body = JSON.stringify(videos, null, 2);

  if (fileId) {
    // Update file đã có — dùng multipart upload
    const metadata = JSON.stringify({ mimeType: 'application/json' });
    const multipart =
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n` +
      `--${boundary}--`;

    await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${window.gapi.client.getToken().access_token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipart,
    });
  } else {
    // Tạo file mới
    const metadata = JSON.stringify({
      name: METADATA_FILENAME,
      parents: [folderId],
      mimeType: 'application/json',
    });
    const multipart =
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n` +
      `--${boundary}--`;

    await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${window.gapi.client.getToken().access_token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipart,
    });
  }
}

/**
 * Upload video file lên Google Drive.
 * Dùng resumable upload cho file lớn + progress callback.
 * 
 * @param {File} file - File object từ <input type="file">
 * @param {Function} onProgress - Callback (percent: number)
 * @returns {string} driveFileId
 */
export async function uploadVideoToDrive(file, onProgress) {
  const folderId = await getOrCreateFolder();
  const accessToken = window.gapi.client.getToken().access_token;

  // Bước 1: Khởi tạo resumable upload session
  const initRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: file.name,
        parents: [folderId],
        mimeType: file.type,
      }),
    }
  );

  const uploadUrl = initRes.headers.get('Location');

  // Bước 2: Upload file qua XHR (để có progress)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = JSON.parse(xhr.responseText);
        resolve(response.id); // driveFileId
      } else {
        reject(new Error(`Drive upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}
