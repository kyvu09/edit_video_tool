/**
 * googleAuth.js — Google OAuth trực tiếp trên browser
 * 
 * Dùng Google Identity Services (GIS) + Google API Client (gapi)
 * để xác thực và gọi Drive API / YouTube API từ frontend.
 * Bản Vanilla JS
 */

const GOOGLE_CLIENT_ID = '285157394306-t33b4urve339htjbt64sdde5u4un3ub9.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient = null;
let gapiLoaded = false;
let gisLoaded = false;
let onAuthCallback = null;

function loadGapiScript() {
  return new Promise((resolve) => {
    if (gapiLoaded) return resolve();

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      window.gapi.load('client', async () => {
        await window.gapi.client.init({});
        await window.gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
        gapiLoaded = true;
        resolve();
      });
    };
    document.head.appendChild(script);
  });
}

function loadGisScript(clientId) {
  return new Promise((resolve) => {
    if (gisLoaded) return resolve();

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        include_granted_scopes: false,
        callback: (response) => {
          if (response.error) {
            console.error('[AUTH] Error:', response.error);
            if (onAuthCallback) onAuthCallback(false, response.error);
            return;
          }
          console.log('[AUTH] Signed in successfully');
          if (onAuthCallback) onAuthCallback(true);
        },
      });
      gisLoaded = true;
      resolve();
    };
    document.head.appendChild(script);
  });
}

window.initGoogleAuth = async function(callback) {
  onAuthCallback = callback;
  await loadGapiScript();
  await loadGisScript(GOOGLE_CLIENT_ID);
};

window.signInGoogle = function() {
  if (!tokenClient) {
    console.error('[AUTH] Token client not initialized');
    return;
  }
  if (window.gapi.client.getToken()) {
    tokenClient.requestAccessToken({ prompt: '' });
  } else {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  }
};

window.signOutGoogle = function() {
  const token = window.gapi.client.getToken();
  if (token) {
    window.google.accounts.oauth2.revoke(token.access_token);
    window.gapi.client.setToken(null);
  }
  if (onAuthCallback) onAuthCallback(false);
};

window.isGoogleSignedIn = function() {
  return !!window.gapi?.client?.getToken();
};
