/**
 * googleAuth.js — Google OAuth trực tiếp trên browser
 * 
 * Dùng Google Identity Services (GIS) + Google API Client (gapi)
 * để xác thực và gọi Drive API / YouTube API từ frontend.
 * 
 * Không cần backend server!
 */

const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient = null;
let gapiLoaded = false;
let gisLoaded = false;
let onAuthCallback = null;

/**
 * Load Google API Client library (gapi)
 */
export function loadGapiScript() {
  return new Promise((resolve) => {
    if (gapiLoaded) return resolve();

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      window.gapi.load('client', async () => {
        await window.gapi.client.init({});
        // Load Drive API discovery document
        await window.gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
        gapiLoaded = true;
        resolve();
      });
    };
    document.head.appendChild(script);
  });
}

/**
 * Load Google Identity Services library (GIS) cho OAuth
 */
export function loadGisScript(clientId) {
  return new Promise((resolve) => {
    if (gisLoaded) return resolve();

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (response) => {
          if (response.error) {
            console.error('[AUTH] Error:', response.error);
            return;
          }
          // Token đã được set vào gapi tự động
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

/**
 * Khởi tạo Google Auth (gọi 1 lần khi app load)
 */
export async function initGoogleAuth(clientId, callback) {
  onAuthCallback = callback;
  await loadGapiScript();
  await loadGisScript(clientId);
}

/**
 * Yêu cầu user đăng nhập Google
 */
export function signIn() {
  if (!tokenClient) {
    console.error('[AUTH] Token client not initialized');
    return;
  }

  // Nếu đã có token, request lại (silent refresh)
  if (window.gapi.client.getToken()) {
    tokenClient.requestAccessToken({ prompt: '' });
  } else {
    // Lần đầu — hiện popup đăng nhập
    tokenClient.requestAccessToken({ prompt: 'consent' });
  }
}

/**
 * Đăng xuất
 */
export function signOut() {
  const token = window.gapi.client.getToken();
  if (token) {
    window.google.accounts.oauth2.revoke(token.access_token);
    window.gapi.client.setToken(null);
  }
  if (onAuthCallback) onAuthCallback(false);
}

/**
 * Kiểm tra đã đăng nhập chưa
 */
export function isSignedIn() {
  return !!window.gapi?.client?.getToken();
}
