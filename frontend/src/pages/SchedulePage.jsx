import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { readMetadata, writeMetadata } from '../services/driveService';

export default function SchedulePage() {
  const location = useLocation();
  const prefill = location.state || {};

  const [videos, setVideos] = useState([]);
  const [selectedVideoId, setSelectedVideoId] = useState(prefill.videoId || '');
  const [scheduledAt, setScheduledAt] = useState('');
  const [privacyStatus, setPrivacyStatus] = useState('public');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadVideos = async () => {
      try {
        const { videos } = await readMetadata();
        // Hiện video STORED, UPLOAD_FAILED (có thể retry) và SCHEDULED (để sửa giờ)
        setVideos(videos.filter(v => v.status === 'STORED' || v.status === 'UPLOAD_FAILED' || v.status === 'SCHEDULED'));
      } catch (err) {
        console.error(err);
      }
    };
    loadVideos();
  }, []);

  const handleSchedule = async (e) => {
    e.preventDefault();
    if (!selectedVideoId || !scheduledAt) return;
    await processSchedule(new Date(scheduledAt).toISOString(), false);
  };

  const handlePublishNow = async () => {
    if (!selectedVideoId) return;
    // Set to 5 minutes ago so it runs immediately
    const pastTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    await processSchedule(pastTime, true);
  };

  const processSchedule = async (timeIso, isPublishNow) => {
    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      const metadata = await readMetadata();
      const video = metadata.videos.find(v => v.id === selectedVideoId);
      if (!video) throw new Error('Video not found in metadata');

      video.status = 'SCHEDULED';
      video.scheduledAt = timeIso;
      video.privacyStatus = privacyStatus;
      video.updatedAt = new Date().toISOString();
      video.errorMessage = null;

      await writeMetadata(metadata);

      setSuccess({
        title: video.title,
        scheduledAt: video.scheduledAt,
        isPublishNow
      });

      setVideos(vs => vs.filter(v => v.id !== selectedVideoId));
      setSelectedVideoId('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Min datetime = bây giờ + 10 phút (GitHub Actions cron 5 phút nên cần buffer)
  const minDateTime = new Date(Date.now() + 10 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Lên lịch đăng YouTube</h1>
      <p className="text-gray-400 mb-8">
        Chọn video, đặt giờ. GitHub Actions sẽ tự upload lên YouTube đúng lịch (±5 phút).
      </p>

      {/* Hướng dẫn kỹ thuật */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6">
        <h3 className="font-medium mb-2">⚙️ Cách hoạt động</h3>
        <ol className="text-gray-400 text-sm space-y-1 list-decimal list-inside">
          <li>Bạn chọn video và đặt giờ → metadata.json được cập nhật trên Drive.</li>
          <li>GitHub Actions chạy mỗi 5 phút, đọc metadata.json.</li>
          <li>Nếu có video tới giờ → tự download từ Drive và upload YouTube.</li>
          <li>Trạng thái cập nhật: SCHEDULED → PUBLISHED (hoặc FAILED).</li>
        </ol>
      </div>

      {/* Success State */}
      {success && (
        <div className="bg-green-900/50 border border-green-600 rounded-xl p-6 text-center mb-6">
          <div className="text-4xl mb-2">🎉</div>
          <h2 className="text-xl font-bold text-green-400">
            {success.isPublishNow ? 'Đã kích hoạt Đăng Ngay!' : 'Đã lên lịch!'}
          </h2>
          <p className="text-gray-300 mt-2">
            <strong>"{success.title}"</strong> {success.isPublishNow ? 'đã sẵn sàng để đăng ngay lập tức.' : `sẽ được đăng lên YouTube vào: ${new Date(success.scheduledAt).toLocaleString('vi-VN')}`}
          </p>
          <div className="mt-4 flex flex-col items-center gap-3">
            <a 
              href="https://github.com/kyvu09/edit_video_tool/actions/workflows/youtube-scheduler.yml" 
              target="_blank" rel="noreferrer"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium inline-block transition-colors"
            >
              🚀 Bấm vào đây để Run Workflow ngay
            </a>
            <p className="text-sm text-gray-400 max-w-sm">
              (Hoặc bạn có thể kệ nó, GitHub sẽ tự động lôi ra đăng vào đầu giờ tiếp theo).
            </p>
            <button
              onClick={() => setSuccess(null)}
              className="mt-2 text-gray-400 hover:text-white underline text-sm"
            >
              Lên lịch video khác
            </button>
          </div>
        </div>
      )}

      {!success && (
        <form onSubmit={handleSchedule} className="bg-gray-800 rounded-xl p-6 space-y-5">
          {/* Chọn video */}
          <div>
            <label className="block text-sm font-medium mb-2">Video *</label>
            {videos.length === 0 ? (
              <div className="bg-gray-700 rounded-lg p-4 text-gray-400 text-sm">
                Không có video nào sẵn sàng.{' '}
                <a href="/" className="text-blue-400 hover:underline">Upload video mới →</a>
              </div>
            ) : (
              <select
                value={selectedVideoId}
                onChange={e => setSelectedVideoId(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">-- Chọn video --</option>
                {videos.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.title} ({(v.fileSize / 1024 / 1024).toFixed(0)} MB)
                    {v.status === 'UPLOAD_FAILED' ? ' ⚠️ Retry' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Chọn ngày giờ */}
          <div>
            <label className="block text-sm font-medium mb-2">Ngày & Giờ đăng *</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              min={minDateTime}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 text-white"
              required
            />
          </div>

          {/* Privacy Status */}
          <div>
            <label className="block text-sm font-medium mb-2">Chế độ riêng tư</label>
            <select
              value={privacyStatus}
              onChange={e => setPrivacyStatus(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500"
            >
              <option value="public">🌍 Công khai (Public)</option>
              <option value="unlisted">🔗 Không niêm yết (Unlisted)</option>
              <option value="private">🔒 Riêng tư (Private)</option>
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/50 border border-red-600 rounded-lg p-3 text-red-300 text-sm">
              ❌ {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading || !selectedVideoId || !scheduledAt}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors"
            >
              {loading ? '⏳ Đang lưu...' : '🕐 Lên lịch (Chờ Bot)'}
            </button>
            <button
              type="button"
              onClick={handlePublishNow}
              disabled={loading || !selectedVideoId}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors"
            >
              ⚡ Đăng Ngay
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
