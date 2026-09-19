import { useState } from 'react';
import { uploadVideoToDrive, readMetadata, writeMetadata } from '../services/driveService';

export default function HomePage() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('idle'); // idle | uploading | done | error
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !title) return;

    setStep('uploading');
    setError('');
    setProgress(0);

    try {
      // Bước 1: Upload video trực tiếp lên Google Drive
      const driveFileId = await uploadVideoToDrive(file, setProgress);

      // Bước 2: Đọc metadata.json hiện tại
      const metadata = await readMetadata();

      // Bước 3: Thêm video mới vào metadata
      const newVideo = {
        id: `vid_${Date.now()}`,
        title,
        description: description || '',
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        driveFileId,
        originalFilename: file.name,
        fileSize: file.size,
        status: 'STORED',
        scheduledAt: null,
        youtubeVideoId: null,
        youtubeUrl: null,
        privacyStatus: 'public',
        errorMessage: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      metadata.videos.push(newVideo);

      // Bước 4: Ghi lại metadata.json lên Drive
      await writeMetadata(metadata);

      setStep('done');
    } catch (err) {
      setError(err.message);
      setStep('error');
    }
  };

  const reset = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setTags('');
    setProgress(0);
    setStep('idle');
    setError('');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Upload Video</h1>
      <p className="text-gray-400 mb-8">Upload video lên Google Drive để lên lịch đăng YouTube.</p>

      {step === 'done' ? (
        <div className="bg-green-900/50 border border-green-600 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h2 className="text-xl font-bold text-green-400 mb-1">Upload thành công!</h2>
          <p className="text-gray-300 mb-1">Video đã được lưu trên Google Drive.</p>
          <p className="text-gray-400 text-sm mb-6">Vào Library để xem hoặc lên lịch đăng YouTube.</p>
          <div className="flex gap-3 justify-center">
            <a href="/library" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors">
              Xem Library →
            </a>
            <button onClick={reset} className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2 rounded-lg font-medium transition-colors">
              Upload thêm
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-6 space-y-5">
          {/* File picker */}
          <div>
            <label className="block text-sm font-medium mb-2">File Video *</label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                file ? 'border-blue-500 bg-blue-950/30' : 'border-gray-600 hover:border-gray-400'
              }`}
              onClick={() => document.getElementById('video-input').click()}
            >
              {file ? (
                <div>
                  <div className="text-2xl mb-1">🎬</div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-gray-400 text-sm">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              ) : (
                <div>
                  <div className="text-3xl mb-2">📁</div>
                  <p className="text-gray-300">Kéo thả hoặc click để chọn file</p>
                  <p className="text-gray-500 text-sm mt-1">MP4, MOV, AVI... (Google Drive 15GB)</p>
                </div>
              )}
            </div>
            <input
              id="video-input"
              type="file"
              accept="video/*"
              className="hidden"
              onChange={e => setFile(e.target.files[0] || null)}
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">Tiêu đề YouTube *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Tiêu đề video khi đăng YouTube"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Mô tả</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Mô tả video (tùy chọn)"
              rows={3}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-2">Tags</label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <p className="text-gray-500 text-xs mt-1">Phân cách bằng dấu phẩy</p>
          </div>

          {/* Progress bar */}
          {step === 'uploading' && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-blue-400">Đang upload lên Google Drive...</span>
                <span>{progress}%</span>
              </div>
              <div className="bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="bg-red-900/50 border border-red-600 rounded-lg p-3 text-red-300 text-sm">
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={step === 'uploading' || !file || !title}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors"
          >
            {step === 'uploading' ? '⏳ Đang upload...' : '⬆️ Upload lên Google Drive'}
          </button>
        </form>
      )}
    </div>
  );
}
