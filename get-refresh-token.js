const { google } = require('googleapis');
const readline = require('readline');
require('dotenv').config();

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/oauth2callback' 
);

const authUrl1 = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/drive.file'],
});

console.log('\n=== HƯỚNG DẪN LẤY REFRESH TOKEN CHO GOOGLE DRIVE ===');
console.log('1. Hãy mở đường link sau và cấp quyền:');
console.log('\n' + authUrl1 + '\n');
console.log('2. Copy mã đằng sau chữ "code=" trên thanh địa chỉ và dán vào đây.');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.question('\nNhập mã code: ', async (code) => {
    try {
        const { tokens } = await oauth2Client.getToken(decodeURIComponent(code));
        console.log('\n=== THÀNH CÔNG! ĐÂY LÀ REFRESH TOKEN CỦA GOOGLE DRIVE ===\n');
        console.log(tokens.refresh_token);
        console.log('\n=================================================');
        console.log('Hãy copy mã này và điền vào biến GOOGLE_DRIVE_REFRESH_TOKEN trên GitHub Secrets.');
        console.log('Còn biến YOUTUBE_REFRESH_TOKEN thì bạn chỉ cần mở file config/youtube-token.json là có sẵn luôn!');
    } catch (error) {
        console.error('Lỗi:', error.message);
    }
    rl.close();
});
