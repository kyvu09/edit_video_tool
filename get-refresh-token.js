const { google } = require('googleapis');
const readline = require('readline');
require('dotenv').config();

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/oauth2callback' // Make sure this matches your Google Cloud Console config exactly
);

const authUrl1 = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/drive.file'],
});

console.log('\n=== HƯỚNG DẪN LẤY REFRESH TOKEN (BƯỚC 1/2) ===');
console.log('Do Google cấm xin quyền Drive và YouTube cùng lúc, ta sẽ làm 2 bước.');
console.log('1. Hãy mở đường link sau và cấp quyền cho Google Drive:');
console.log('\n' + authUrl1 + '\n');
console.log('2. Copy mã đằng sau chữ "code=" trên thanh địa chỉ và dán vào đây.');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.question('\nNhập mã code Bước 1: ', async (code1) => {
    try {
        const { tokens } = await oauth2Client.getToken(decodeURIComponent(code1));
        oauth2Client.setCredentials(tokens);
        console.log('=> Thành công cấp quyền Drive!\n');

        const authUrl2 = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: ['https://www.googleapis.com/auth/youtube.upload'],
        });

        console.log('\n=== BƯỚC 2/2: CẤP QUYỀN YOUTUBE ===');
        console.log('LƯU Ý: VÌ BẠN ĐÃ CẤP QUYỀN DRIVE Ở TÀI KHOẢN TRƯỚC, LẦN NÀY HÃY CHỌN MỘT TÀI KHOẢN GOOGLE / YOUTUBE KHÁC NHÉ!');
        console.log('1. Mở đường link sau để cấp quyền YouTube:');
        console.log('\n' + authUrl2 + '\n');
        console.log('2. Copy mã đằng sau chữ "code=" trên thanh địa chỉ và dán vào đây.');

        rl.question('\nNhập mã code Bước 2: ', async (code2) => {
            try {
                // Ta phải tạo một oauth client mới hoàn toàn để không bị dính credentials cũ
                const oauth2ClientYoutube = new google.auth.OAuth2(
                    process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET,
                    'http://localhost:3000/oauth2callback'
                );
                
                const res = await oauth2ClientYoutube.getToken(decodeURIComponent(code2));
                console.log('\n=== THÀNH CÔNG! ĐÂY LÀ 2 REFRESH TOKEN CỦA BẠN ===\n');
                console.log('GOOGLE_DRIVE_REFRESH_TOKEN (Tài khoản 1):');
                console.log(tokens.refresh_token);
                console.log('\nYOUTUBE_REFRESH_TOKEN (Tài khoản 2):');
                console.log(res.tokens.refresh_token);
                console.log('\n=================================================');
                console.log('Hãy copy 2 mã này và điền vào GitHub Secrets nhé.');
            } catch (err2) {
                console.error('Lỗi ở Bước 2:', err2.message);
            }
            rl.close();
        });

    } catch (error) {
        console.error('Lỗi ở Bước 1:', error.message);
        rl.close();
    }
});
