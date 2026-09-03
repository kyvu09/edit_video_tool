const { exec } = require('child_process');
const robot = require('robotjs');
const util = require('util');

async function pastePromptToFlow(promptText, isFirst = true, isLast = true) {
    try {
        if (isFirst) {
            // Mở cửa sổ CHROME MỚI hoàn toàn để dùng Alt+Tab dễ dàng
            // Trình duyệt đang chạy (localhost) và cửa sổ mới (Flow) sẽ là 2 cửa sổ gần nhất
            const targetUrl = 'https://labs.google/fx/vi/tools/flow/';
            exec(`start chrome --new-window "${targetUrl}"`);
            
            // Chờ load trang lần đầu (Google Flow trang chủ)
            await new Promise(r => setTimeout(r, 6000));
            
            // Click vào nút "Dự án mới" (nằm giữa màn hình phía dưới)
            const screenSize = robot.getScreenSize();
            robot.moveMouse(screenSize.width / 2, screenSize.height - 250);
            robot.mouseClick();
            
            // Chờ load giao diện của dự án mới
            await new Promise(r => setTimeout(r, 4000));
        } else {
            // Từ Localhost, Alt+Tab sang Google Flow
            robot.keyToggle('alt', 'down');
            robot.keyTap('tab');
            robot.keyToggle('alt', 'up');
            
            // Đợi 1 giây để cửa sổ kích hoạt
            await new Promise(r => setTimeout(r, 1000));
        }

        // Click vào giữa màn hình ở phía dưới để focus ô chat
        const screenSize = robot.getScreenSize();
        robot.moveMouse(screenSize.width / 2, screenSize.height - 150);
        robot.mouseClick();
        await new Promise(r => setTimeout(r, 500));

        // CHỈ COPY VÀO CLIPBOARD SAU KHI ĐÃ MỞ PROJECT VÀ SẴN SÀNG DÁN
        // Điều này đảm bảo clipboard không bị mất hoặc bị ghi đè trong lúc chờ mở web
        const clipboardy = (await import('clipboardy')).default;
        clipboardy.writeSync(promptText);
        await new Promise(r => setTimeout(r, 500));

        // Dán prompt
        robot.keyTap('v', 'control');
        await new Promise(r => setTimeout(r, 500));

        // Nhấn Enter
        robot.keyTap('enter');
        
        // Chờ 1.5 giây cho Google Flow nhận lệnh trước khi Alt+Tab về
        await new Promise(r => setTimeout(r, 1000));

        if (!isLast) {
            // Từ Google Flow, Alt+Tab về lại Localhost để lấy prompt tiếp theo
            robot.keyToggle('alt', 'down');
            robot.keyTap('tab');
            robot.keyToggle('alt', 'up');
            
            // Chờ 1 giây để về lại Localhost
            await new Promise(r => setTimeout(r, 1000));
        }

        return { success: true, message: 'Đã nhập prompt thành công!' };
    } catch (err) {
        throw new Error('Lỗi tự động hóa: ' + err.message);
    }
}

module.exports = { pastePromptToFlow };
