import sys

def main():
    file_path = r"c:\personal_kyvu\CODE\editVideoTool\public\index.html"
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    replacements = [
        # Section 5: Section Card Header Icons
        ('<span class="section-card-header-icon">🔗</span>', '<span class="section-card-header-icon"><i data-lucide="link"></i></span>'),
        ('<span class="section-card-header-icon">📝</span>', '<span class="section-card-header-icon"><i data-lucide="file-text"></i></span>'),
        ('<span class="section-card-header-icon">✍️</span>', '<span class="section-card-header-icon"><i data-lucide="pen-line"></i></span>'),
        ('<span class="section-card-header-icon">📣</span>', '<span class="section-card-header-icon"><i data-lucide="megaphone"></i></span>'),
        ('<span class="section-card-header-icon">🖼️</span>', '<span class="section-card-header-icon"><i data-lucide="layout-grid"></i></span>'),
        ('<span class="section-card-header-icon">📄</span>', '<span class="section-card-header-icon"><i data-lucide="file-check"></i></span>'),
        ('<span class="section-card-header-icon">🔌</span>', '<span class="section-card-header-icon"><i data-lucide="plug"></i></span>'),
        ('<span class="section-card-header-icon">🎭</span>', '<span class="section-card-header-icon"><i data-lucide="audio-lines"></i></span>'),
        ('<span class="section-card-header-icon">📁</span>', '<span class="section-card-header-icon"><i data-lucide="folder-open"></i></span>'),
        ('<span class="section-card-header-icon">🎨</span>', '<span class="section-card-header-icon"><i data-lucide="palette"></i></span>'),
        ('<span class="section-card-header-icon">⚙️</span>', '<span class="section-card-header-icon"><i data-lucide="settings"></i></span>'),
        ('<span class="section-card-header-icon">🆔</span>', '<span class="section-card-header-icon"><i data-lucide="hash"></i></span>'),
        ('<span class="section-card-header-icon">💬</span>', '<span class="section-card-header-icon"><i data-lucide="message-square"></i></span>'),

        # Section 6: Buttons
        ('🔍 Trích xuất', '<i data-lucide="search" class="btn-icon"></i> Trích xuất'),
        ('✍️ Viết Lại Content Mới', '<i data-lucide="pen-line" class="btn-icon"></i> Viết Lại Content Mới'),
        ('✨ Tạo Phân Cảnh Bằng AI', '<i data-lucide="sparkles" class="btn-icon"></i> Tạo Phân Cảnh Bằng AI'),
        ('📋 Viết Tiêu Đề & Mô Tả', '<i data-lucide="clipboard-list" class="btn-icon"></i> Viết Tiêu Đề & Mô Tả'),
        ('📋 Sao chép', '<i data-lucide="copy" class="btn-icon"></i> Sao chép'),
        ('🔄 Dán vào Kịch Bản Thô', '<i data-lucide="arrow-left" class="btn-icon"></i> Dán vào Kịch Bản Thô'),
        ('⚡ Điền vào Form Tạo Video', '<i data-lucide="zap" class="btn-icon"></i> Điền vào Form Tạo Video'),
        ('⬇️ Tải file .txt', '<i data-lucide="download" class="btn-icon"></i> Tải file .txt'),
        ('⟵ Lấy từ Trợ Lý Kịch Bản', '<i data-lucide="arrow-left" class="btn-icon"></i> Lấy từ Trợ Lý Kịch Bản'),
        ('🎙️ Tạo Audio Ngay', '<i data-lucide="mic" class="btn-icon"></i> Tạo Audio Ngay'),
        ('⬇️ Tải xuống MP3', '<i data-lucide="download" class="btn-icon"></i> Tải xuống MP3'),
        ('⚡ Dùng cho Tạo Video', '<i data-lucide="zap" class="btn-icon"></i> Dùng cho Tạo Video'),
        ('🚀 Bắt Đầu Tạo Video', '<i data-lucide="rocket" class="btn-icon"></i> Bắt Đầu Tạo Video'),
        ('⬇️ Tải Video', '<i data-lucide="download" class="btn-icon"></i> Tải Video'),
        ('🔄 Tạo Video Mới', '<i data-lucide="refresh-cw" class="btn-icon"></i> Tạo Video Mới'),
        ('🔄 Thử Lại', '<i data-lucide="rotate-ccw" class="btn-icon"></i> Thử Lại'),
        ('✨ Bắt Đầu Tạo Ảnh', '<i data-lucide="sparkles" class="btn-icon"></i> Bắt Đầu Tạo Ảnh'),
        ('📦 Tải Tất Cả (ZIP)', '<i data-lucide="package" class="btn-icon"></i> Tải Tất Cả (ZIP)'),
        ('⟵ Lấy từ Tab AI', '<i data-lucide="arrow-left" class="btn-icon"></i> Lấy từ Tab AI'),
        ('🔀 Tạo ID', '<i data-lucide="shuffle" class="btn-icon"></i> Tạo ID'),

        # Section 7: Form Upload Labels
        ('<span class="icon">🎵</span>', '<span class="icon"><i data-lucide="music"></i></span>'),
        ('<span class="icon">📄</span>', '<span class="icon"><i data-lucide="file-text"></i></span>'),
        ('<span class="icon">🖼️</span>', '<span class="icon"><i data-lucide="image-plus"></i></span>'),
        ('<span class="icon">🌄</span>', '<span class="icon"><i data-lucide="image"></i></span>'),
        ('<span class="icon">🎶</span>', '<span class="icon"><i data-lucide="music-2"></i></span>'),

        # Section 8: Provider Cards
        ('<div class="provider-card-icon">💻</div>', '<div class="provider-card-icon"><i data-lucide="monitor"></i></div>'),
        ('<div class="provider-card-icon">🇻🇳</div>', '<div class="provider-card-icon"><i data-lucide="globe"></i></div>'),
        ('<div class="provider-card-icon">🌐</div>', '<div class="provider-card-icon"><i data-lucide="languages"></i></div>'),

        # Section 9: Toggle Row Icon
        ('<span class="toggle-row-icon">🎨</span>', '<span class="toggle-row-icon"><i data-lucide="paintbrush"></i></span>'),

        # Section 10: Slider Headers
        ('<span>🔊 Âm lượng nhạc nền</span>', '<span><i data-lucide="volume-2" class="btn-icon"></i> Âm lượng nhạc nền</span>'),
        ('<span>⏩ Tốc độ video</span>', '<span><i data-lucide="gauge" class="btn-icon"></i> Tốc độ video</span>'),

        # Section 11: Progress/Success/Error Views
        ('<h2>⏳ Đang Tạo Video...</h2>', '<h2><i data-lucide="loader" class="btn-icon spin-icon"></i> Đang Tạo Video...</h2>'),
        ('<h2>🎉 Video Đã Tạo Thành Công!</h2>', '<h2><i data-lucide="party-popper" class="btn-icon"></i> Video Đã Tạo Thành Công!</h2>'),
        ('<h2>❌ Có Lỗi Xảy Ra</h2>', '<h2><i data-lucide="alert-circle" class="btn-icon"></i> Có Lỗi Xảy Ra</h2>'),

        # Section 12: YouTube Section
        ('<h3>▶️ Upload lên YouTube</h3>', '<h3><i data-lucide="youtube" class="btn-icon"></i> Upload lên YouTube</h3>'),
        ('🔗 Kết nối YouTube', '<i data-lucide="link" class="btn-icon"></i> Kết nối YouTube'),
        ('▶️ Tải lên YouTube', '<i data-lucide="upload" class="btn-icon"></i> Tải lên YouTube'),

        # Section 15: TTS Result Card
        ('<h4>✅ Nghe Thử & Sử Dụng</h4>', '<h4><i data-lucide="check-circle" class="btn-icon"></i> Nghe Thử & Sử Dụng</h4>'),

        # Section 16: Voice Clone Section Texts
        ('🎙️ Chọn Giọng Đọc:', '<i data-lucide="mic" class="btn-icon"></i> Chọn Giọng Đọc:'),
        ('⚙️ Quản lý giọng đã lưu', '<i data-lucide="settings" class="btn-icon"></i> Quản lý giọng đã lưu'),
        ('🧬 Clone Giọng Mới', '<i data-lucide="dna" class="btn-icon"></i> Clone Giọng Mới'),
        ('<span style="font-size: 20px;">🎤</span>', '<i data-lucide="mic" style="width: 24px; height: 24px;"></i>'),
        ('💾 Lưu Giọng', '<i data-lucide="save" class="btn-icon"></i> Lưu Giọng'),
        ('📁 Các Giọng Clone', '<i data-lucide="folder" class="btn-icon"></i> Các Giọng Clone'),
        ('💾 Bạn có muốn lưu', '<i data-lucide="save" class="btn-icon"></i> Bạn có muốn lưu'),
        ('💡 Khi có file mẫu', '<i data-lucide="lightbulb" class="btn-icon"></i> Khi có file mẫu'),
    ]

    for old, new in replacements:
        content = content.replace(old, new)

    # Section 17: Add Lucide initialization at the END of body
    init_script = "<script>document.addEventListener('DOMContentLoaded', () => { if (typeof lucide !== 'undefined') lucide.createIcons(); });</script>"
    
    # ensure we only append once
    if init_script not in content:
        content = content.replace('</body>', f'    {init_script}\n</body>')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Done")

if __name__ == '__main__':
    main()
