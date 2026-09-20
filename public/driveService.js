/**
 * driveService.js — Tương tác trực tiếp với Google Drive API từ browser
 * Vanilla JS version
 */

const FOLDER_NAME = 'EditVideoTool';
const METADATA_FILENAME = 'metadata.json';
let cachedFolderId = null;

async function getOrCreateSpecificFolder(folderName, parentId = null) {
  let q = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) {
    q += ` and '${parentId}' in parents`;
  }
  const res = await window.gapi.client.drive.files.list({
    q: q,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (res.result.files.length > 0) {
    return res.result.files[0].id;
  }

  const resource = { name: folderName, mimeType: 'application/vnd.google-apps.folder' };
  if (parentId) {
    resource.parents = [parentId];
  }

  const folder = await window.gapi.client.drive.files.create({
    resource: resource,
    fields: 'id',
  });
  return folder.result.id;
}

async function getOrCreateFolder() {
  if (cachedFolderId) return cachedFolderId;
  cachedFolderId = await getOrCreateSpecificFolder(FOLDER_NAME);
  return cachedFolderId;
}

window.readMetadata = async function() {
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
};

// Hàm nội bộ để ghi 1 file JSON lên 1 folder cụ thể
async function writeJsonFileToFolder(fileName, jsonBody, parentFolderId, existingFileId = null) {
  const boundary = '===metadata_boundary===';
  const body = JSON.stringify(jsonBody, null, 2);

  if (existingFileId) {
    const metadata = JSON.stringify({ mimeType: 'application/json' });
    const multipart =
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n` +
      `--${boundary}--`;

    await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${window.gapi.client.getToken().access_token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipart,
    });
  } else {
    const metadata = JSON.stringify({
      name: fileName,
      parents: [parentFolderId],
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

window.writeMetadata = async function({ fileId, videos }) {
  const folderId = await getOrCreateFolder();
  await writeJsonFileToFolder(METADATA_FILENAME, videos, folderId, fileId);
};

window.writeVideoInfo = async function(videoMeta, targetFolderId) {
  // Tìm xem có file info.json trong targetFolderId chưa
  const res = await window.gapi.client.drive.files.list({
    q: `name='info.json' and '${targetFolderId}' in parents and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  });
  const existingFileId = res.result.files.length > 0 ? res.result.files[0].id : null;
  await writeJsonFileToFolder('info.json', videoMeta, targetFolderId, existingFileId);
};

window.uploadVideoToDrive = async function(file, category, customFolderName, onProgress) {
  const rootFolderId = await getOrCreateFolder();
  
  // Tạo cây thư mục: root -> category -> customFolderName
  let targetFolderId = rootFolderId;
  
  if (category) {
    targetFolderId = await getOrCreateSpecificFolder(category, targetFolderId);
  }
  
  if (customFolderName) {
    targetFolderId = await getOrCreateSpecificFolder(customFolderName, targetFolderId);
  }
  
  const accessToken = window.gapi.client.getToken().access_token;

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
        parents: [targetFolderId],
        mimeType: file.type,
      }),
    }
  );

  const uploadUrl = initRes.headers.get('Location');

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
        resolve({ driveFileId: response.id, targetFolderId });
      } else {
        reject(new Error(`Drive upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
};
