const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.resolve(__dirname, '../../config');
const TOKEN_PATH = path.join(CONFIG_DIR, 'youtube-token.json');
const HISTORY_PATH = path.join(CONFIG_DIR, 'youtube-history.json');

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

let oauth2Client;

function initAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback';

  if (!clientId || !clientSecret) {
    console.warn('[YouTube Service] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env');
    return null;
  }

  oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  // Load token if exists
  if (fs.existsSync(TOKEN_PATH)) {
    try {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      oauth2Client.setCredentials(token);
    } catch (e) {
      console.error('[YouTube Service] Failed to parse youtube-token.json', e);
    }
  }

  // Handle token refresh automatically
  oauth2Client.on('tokens', (tokens) => {
    let existing = {};
    if (fs.existsSync(TOKEN_PATH)) {
      try { existing = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')); } catch (e) { }
    }

    if (tokens.refresh_token) {
      existing.refresh_token = tokens.refresh_token;
    }
    existing.access_token = tokens.access_token || existing.access_token;
    existing.expiry_date = tokens.expiry_date || existing.expiry_date;
    existing.token_type = tokens.token_type || existing.token_type;

    const tempPath = `${TOKEN_PATH}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(existing, null, 2));
    fs.renameSync(tempPath, TOKEN_PATH);
    console.log('[YouTube Service] Token refreshed and saved.');
  });

  return oauth2Client;
}

function getAuthUrl() {
  if (!oauth2Client) initAuthClient();
  if (!oauth2Client) {
    throw new Error('Chưa cấu hình GOOGLE_CLIENT_ID hoặc GOOGLE_CLIENT_SECRET trong file .env');
  }

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly'
    ]
  });
}

async function handleCallback(code) {
  if (!oauth2Client) initAuthClient();
  if (!oauth2Client) {
    throw new Error('OAuth client not initialized');
  }

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  
  const tempPath = `${TOKEN_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(tokens, null, 2));
  fs.renameSync(tempPath, TOKEN_PATH);
  return tokens;
}

function checkAuthStatus() {
  if (!oauth2Client) initAuthClient();
  if (!oauth2Client) return false;
  const creds = oauth2Client.credentials;
  return !!(creds && (creds.access_token || creds.refresh_token));
}

async function getChannelInfo() {
  if (!oauth2Client) initAuthClient();
  if (!checkAuthStatus()) return null;

  try {
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const res = await youtube.channels.list({
      part: 'snippet,statistics',
      mine: true
    });

    if (res.data.items && res.data.items.length > 0) {
      const channel = res.data.items[0];
      return {
        id: channel.id,
        title: channel.snippet.title,
        customUrl: channel.snippet.customUrl || '',
        thumbnail: channel.snippet.thumbnails?.default?.url || channel.snippet.thumbnails?.medium?.url || '',
        subscriberCount: channel.statistics?.subscriberCount || '0'
      };
    }
  } catch (err) {
    console.error('[YouTube Service] Error fetching channel info:', err.message);
  }
  return null;
}

function logout() {
  if (fs.existsSync(TOKEN_PATH)) {
    try { fs.unlinkSync(TOKEN_PATH); } catch (e) { }
  }
  if (oauth2Client) {
    oauth2Client.setCredentials({});
  }
}

function getHistory() {
  if (fs.existsSync(HISTORY_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
    } catch (e) {
      return [];
    }
  }
  return [];
}

function saveToHistory(item) {
  const history = getHistory();
  history.unshift(item);
  if (history.length > 50) history.pop(); // Giữ tối đa 50 item gần nhất
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

/**
 * Upload hoặc Lên lịch đăng video YouTube
 * @param {string} videoPath 
 * @param {object} metadata - { title, description, tags, privacyStatus, publishAt, categoryId }
 * @param {function} onProgress - (progressPct) => {}
 */
async function uploadVideo(videoPath, metadata, onProgress = null) {
  if (!oauth2Client) initAuthClient();
  if (!checkAuthStatus()) {
    throw new Error('Chưa xác thực tài khoản YouTube. Vui lòng kết nối tài khoản trước.');
  }

  if (!fs.existsSync(videoPath)) {
    throw new Error(`Không tìm thấy file video: ${videoPath}`);
  }

  const youtube = google.youtube({
    version: 'v3',
    auth: oauth2Client
  });

  const fileSize = fs.statSync(videoPath).size;
  const media = {
    body: fs.createReadStream(videoPath)
  };

  let tags = [];
  if (Array.isArray(metadata.tags)) {
    tags = metadata.tags;
  } else if (typeof metadata.tags === 'string') {
    tags = metadata.tags.split(',').map(t => t.trim()).filter(Boolean);
  }

  const status = {};
  const isScheduled = !!metadata.publishAt;

  if (isScheduled) {
    // Để hẹn giờ công chiếu/phát hành trên YouTube:
    // privacyStatus PHẢI là 'private' và publishAt là chuỗi ISO 8601
    status.privacyStatus = 'private';
    status.publishAt = new Date(metadata.publishAt).toISOString();
  } else {
    status.privacyStatus = metadata.privacyStatus || 'public';
  }

  status.selfDeclaredMadeForKids = false;

  console.log(`[YouTube Service] Starting upload for "${metadata.title}" (isScheduled: ${isScheduled}, size: ${(fileSize / (1024*1024)).toFixed(1)}MB)...`);

  const res = await youtube.videos.insert({
    part: 'snippet,status',
    requestBody: {
      snippet: {
        title: metadata.title || 'Video AI',
        description: metadata.description || '',
        tags: tags,
        categoryId: metadata.categoryId || '22', // People & Blogs
        defaultLanguage: 'vi'
      },
      status: status
    },
    media: media
  }, {
    onUploadProgress: evt => {
      const progress = Math.min(100, Math.round((evt.bytesRead / fileSize) * 100));
      if (onProgress) onProgress(progress);
      console.log(`[YouTube Upload] ${progress}% uploaded (${evt.bytesRead}/${fileSize})`);
    }
  });

  const youtubeVideoId = res.data.id;
  const historyItem = {
    id: youtubeVideoId,
    title: metadata.title,
    description: metadata.description,
    youtubeUrl: `https://youtube.com/watch?v=${youtubeVideoId}`,
    status: isScheduled ? 'SCHEDULED' : (status.privacyStatus.toUpperCase()),
    publishAt: metadata.publishAt ? new Date(metadata.publishAt).toISOString() : null,
    uploadedAt: new Date().toISOString(),
    privacyStatus: status.privacyStatus
  };

  saveToHistory(historyItem);

  return {
    ...res.data,
    historyItem
  };
}

module.exports = {
  initAuthClient,
  getAuthUrl,
  handleCallback,
  checkAuthStatus,
  getChannelInfo,
  uploadVideo,
  getHistory,
  logout
};