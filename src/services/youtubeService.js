const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.resolve(__dirname, '../../config');
const TOKEN_PATH = path.join(CONFIG_DIR, 'youtube-token.json');

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

let oauth2Client;

function initAuthClient() {
  let clientId = process.env.GOOGLE_CLIENT_ID;
  let clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  let redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REDIRECT_URI in .env');
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
      console.error('Failed to parse youtube-token.json', e);
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
    existing.access_token = tokens.access_token;
    existing.expiry_date = tokens.expiry_date;
    existing.token_type = tokens.token_type || existing.token_type;

    const tempPath = `${TOKEN_PATH}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(existing, null, 2));
    fs.renameSync(tempPath, TOKEN_PATH);
  });
}

function getAuthUrl() {
  if (!oauth2Client) initAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/youtube.upload'
    ]
  });
}

async function handleCallback(code) {
  if (!oauth2Client) initAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  const tempPath = `${TOKEN_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(tokens, null, 2));
  fs.renameSync(tempPath, TOKEN_PATH);
  return tokens;
}

function checkAuthStatus() {
  if (!oauth2Client) initAuthClient();
  const creds = oauth2Client.credentials;
  return !!(creds && (creds.access_token || creds.refresh_token));
}

function logout() {
  if (fs.existsSync(TOKEN_PATH)) {
    fs.unlinkSync(TOKEN_PATH);
  }
  if (oauth2Client) {
    oauth2Client.setCredentials({});
  }
}

async function uploadVideo(videoPath, metadata) {
  if (!oauth2Client) initAuthClient();
  if (!checkAuthStatus()) {
    throw new Error('Not authenticated with YouTube');
  }

  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
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

  const res = await youtube.videos.insert({
    part: 'snippet,status',
    requestBody: {
      snippet: {
        title: metadata.title,
        description: metadata.description,
        tags: tags
      },
      status: {
        privacyStatus: metadata.privacyStatus || 'private'
      }
    },
    media: media
  }, {
    onUploadProgress: evt => {
      const progress = (evt.bytesRead / fileSize) * 100;
      console.log(`[YouTube Upload] ${Math.round(progress)}% uploaded`);
    }
  });

  return res.data;
}

module.exports = {
  getAuthUrl,
  handleCallback,
  checkAuthStatus,
  uploadVideo,
  logout
};