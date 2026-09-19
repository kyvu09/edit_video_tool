import { useEffect, useState } from 'react';
import { readMetadata, writeMetadata } from '../services/driveService';
import { useNavigate } from 'react-router-dom';

const STATUS_CONFIG = {
  DRAFT:                { color: 'bg-gray-600',   label: 'Draft',        icon: '📝' },
  UPLOADING:            { color: 'bg-blue-600',   label: 'Uploading',    icon: '⬆️' },
  STORED:               { color: 'bg-teal-600',   label: 'Stored',       icon: '💾' },
  SCHEDULED:            { color: 'bg-yellow-600', label: 'Scheduled',    icon: '🕐' },
  UPLOADING_TO_YOUTUBE: { color: 'bg-purple-600', label: 'Publishing',   icon: '🚀' },
  PUBLISHED:            { color: 'bg-green-600',  label: 'Published',    icon: '✅' },
  UPLOAD_FAILED:        { color: 'bg-red-600',    label: 'Failed',       icon: '❌' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return (
    <span className={`${cfg.color} text-white text-xs font-semibold px-2 py-1 rounded-full`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

export default function LibraryPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();

  const fetchVideos = async () => {
    try {
      const { videos } = await readMetadata();
      setVideos(videos);
    } catch (err) {
      console.error('Failed to load metadata:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
    // Auto-refresh mỗi 15 giây
    const interval = setInterval(fetchVideos, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (videoId) => {
    if (!confirm('Xóa video này khỏi danh sách? File trên Drive sẽ không bị xóa.')) return;
    setDeletingId(videoId);
    try {
      const metadata = await readMetadata();
      metadata.videos = metadata.videos.filter(v => v.id !== videoId);
      await writeMetadata(metadata);
      setVideos(metadata.videos);
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="animate-spin text-3xl mr-3">⏳</div> Đang tải từ Google Drive...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Library</h1>
          <p className="text-gray-400 mt-1">{videos.length} video trên Google Drive</p>
        </div>
        <button
          onClick={fetchVideos}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
        >
          🔄 Refresh
        </button>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-5xl mb-4">🎬</div>
          <p className="text-xl">Chưa có video nào</p>
          <a href="/" className="text-blue-400 hover:underline mt-2 inline-block">Upload video đầu tiên →</a>
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map(video => (
            <div key={video.id} className="bg-gray-800 rounded-xl p-5 flex items-center gap-4">
              <div className="w-16 h-12 bg-gray-700 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                🎬
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold truncate">{video.title}</h3>
                  <StatusBadge status={video.status} />
                </div>
                <div className="text-gray-500 text-sm space-y-0.5">
                  <p>{video.originalFilename} — {(video.fileSize / 1024 / 1024).toFixed(1)} MB</p>
                  {video.scheduledAt && (
                    <p>📅 {new Date(video.scheduledAt).toLocaleString('vi-VN')}</p>
                  )}
                  {video.youtubeUrl && (
                    <a href={video.youtubeUrl} target="_blank" rel="noreferrer" className="text-red-400 hover:underline">
                      ▶️ Xem trên YouTube
                    </a>
                  )}
                  {video.errorMessage && (
                    <p className="text-red-400 text-xs">⚠️ {video.errorMessage}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                {(video.status === 'STORED' || video.status === 'UPLOAD_FAILED') && (
                  <button
                    onClick={() => navigate('/schedule', { state: { videoId: video.id, title: video.title } })}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    🕐 Lên lịch
                  </button>
                )}
                <button
                  onClick={() => handleDelete(video.id)}
                  disabled={deletingId === video.id}
                  className="bg-gray-700 hover:bg-red-800 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {deletingId === video.id ? '...' : '🗑️'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
