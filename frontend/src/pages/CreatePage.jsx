import { useState, useRef, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

// ── Helpers ────────────────────────────────────────────────────────────────────

const STEPS = {
  'step-rembg':    { label: 'Tách nền ảnh', icon: '🖼️' },
  'step-whisper':  { label: 'Nhận dạng giọng nói', icon: '🎙️' },
  'step-parse':    { label: 'Phân tích kịch bản', icon: '📝' },
  'step-timeline': { label: 'Tạo timeline', icon: '⏱️' },
  'step-subtitle': { label: 'Tạo phụ đề', icon: '💬' },
  'step-ffmpeg':   { label: 'Render video', icon: '🎬' },
};

function StepIndicator({ currentStep, progress }) {
  const stepKeys = Object.keys(STEPS);
  const currentIdx = stepKeys.indexOf(currentStep);
  return (
    <div className="flex gap-1 flex-wrap mb-3">
      {stepKeys.map((key, idx) => {
        const done    = idx < currentIdx;
        const active  = idx === currentIdx;
        const pending = idx > currentIdx;
        return (
          <div key={key} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium transition-all ${
            done    ? 'bg-green-800 text-green-300' :
            active  ? 'bg-blue-600 text-white animate-pulse' :
            'bg-gray-700 text-gray-500'
          }`}>
            <span>{STEPS[key].icon}</span>
            <span className="hidden sm:inline">{STEPS[key].label}</span>
            {done && <span>✓</span>}
          </div>
        );
      })}
    </div>
  );
}

function ProgressBar({ progress }) {
  return (
    <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
      <div
        className="bg-gradient-to-r from-blue-500 to-blue-400 h-3 rounded-full transition-all duration-500"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CreatePage() {
  // Form state
  const [audioFile, setAudioFile]   = useState(null);
  const [scriptFile, setScriptFile] = useState(null);
  const [images, setImages]         = useState([]);
  const [bgImage, setBgImage]       = useState(null);
  const [bgmFile, setBgmFile]       = useState(null);
  const [aspectRatio, setAspectRatio]           = useState('16:9');
  const [backgroundMode, setBackgroundMode]     = useState('whitekey');
  const [bgmVolume, setBgmVolume]               = useState(30);
  const [videoSpeed, setVideoSpeed]             = useState(1.0);
  const [enableKaraoke, setEnableKaraoke]       = useState(true);

  // Processing state
  const [sessionId, setSessionId]   = useState(null);
  const [status, setStatus]         = useState('idle'); // idle | uploading | processing | completed | failed
  const [progress, setProgress]     = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [statusMsg, setStatusMsg]   = useState('');
  const [videoUrl, setVideoUrl]     = useState(null);
  const [error, setError]           = useState('');

  const esRef = useRef(null); // EventSource ref

  // ── SSE listener ──────────────────────────────────────────────────────────
  const startProgressStream = useCallback((sid) => {
    if (esRef.current) esRef.current.close();

    // Thử SSE trước, fallback về polling nếu cần
    const es = new EventSource(`${API_BASE}/api/progress-stream/${sid}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setProgress(data.progress || 0);
        setCurrentStep(data.currentStep || '');
        setStatusMsg(data.statusMessage || '');
        if (data.status === 'completed') {
          setStatus('completed');
          setVideoUrl(data.videoUrl);
          es.close();
        } else if (data.status === 'failed') {
          setStatus('failed');
          setError(data.error || data.statusMessage || 'Lỗi không xác định');
          es.close();
        }
      } catch {}
    };

    es.onerror = () => {
      es.close();
      // Fallback: poll mỗi 2 giây
      const poll = setInterval(async () => {
        try {
          const r = await fetch(`${API_BASE}/api/progress/${sid}`);
          const data = await r.json();
          setProgress(data.progress || 0);
          setCurrentStep(data.currentStep || '');
          setStatusMsg(data.statusMessage || '');
          if (data.status === 'completed') {
            setStatus('completed');
            setVideoUrl(data.videoUrl);
            clearInterval(poll);
          } else if (data.status === 'failed') {
            setStatus('failed');
            setError(data.error || data.statusMessage || 'Lỗi không xác định');
            clearInterval(poll);
          }
        } catch {}
      }, 2000);
    };
  }, []);

  useEffect(() => () => esRef.current?.close(), []);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!audioFile || !scriptFile || images.length === 0) return;

    setStatus('uploading');
    setError('');
    setProgress(0);
    setVideoUrl(null);

    try {
      const form = new FormData();
      form.append('audio', audioFile);
      form.append('script', scriptFile);
      images.forEach(img => form.append('images', img));
      if (bgImage) form.append('backgroundImage', bgImage);
      if (bgmFile)  form.append('bgm', bgmFile);
      form.append('aspectRatio', aspectRatio);
      form.append('backgroundMode', backgroundMode);
      form.append('bgmVolume', bgmVolume);
      form.append('videoSpeed', videoSpeed);
      form.append('enableKaraokeEffect', enableKaraoke ? '1' : '0');

      const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload thất bại' }));
        throw new Error(err.error || 'Upload thất bại');
      }
      const { sessionId: sid } = await res.json();
      setSessionId(sid);
      setStatus('processing');
      startProgressStream(sid);
    } catch (err) {
      setError(err.message);
      setStatus('failed');
    }
  };

  const reset = () => {
    esRef.current?.close();
    setAudioFile(null); setScriptFile(null); setImages([]); setBgImage(null); setBgmFile(null);
    setSessionId(null); setStatus('idle'); setProgress(0);
    setCurrentStep(''); setStatusMsg(''); setVideoUrl(null); setError('');
  };

  // ── Drag-and-drop images ──────────────────────────────────────────────────
  const handleImageDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    setImages(prev => [...prev, ...files]);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (status === 'completed') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-900/50 border border-green-600 rounded-xl p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-400 mb-2">Video đã tạo xong!</h2>
          <p className="text-gray-300 mb-6">Video của bạn đã render thành công.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            {videoUrl && (
              <a
                href={`${API_BASE}${videoUrl}`}
                download="output.mp4"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
              >
                ⬇️ Tải video xuống
              </a>
            )}
            {videoUrl && (
              <a
                href={`${API_BASE}/api/video/${sessionId}`}
                target="_blank"
                rel="noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
              >
                ▶️ Xem trước
              </a>
            )}
            <button
              onClick={reset}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
            >
              ➕ Tạo video mới
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'processing' || status === 'uploading') {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🎬 Đang tạo video...</h1>
        <div className="bg-gray-800 rounded-xl p-6">
          {currentStep && <StepIndicator currentStep={currentStep} progress={progress} />}
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-blue-400">{statusMsg || (status === 'uploading' ? 'Đang tải files lên...' : 'Đang xử lý...')}</span>
            <span className="text-gray-400 font-mono">{progress}%</span>
          </div>
          <ProgressBar progress={progress} />
          <p className="text-gray-500 text-xs mt-4 text-center">
            Thời gian xử lý tùy thuộc số scene và độ phức tạp. Đừng đóng trang này.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">🎬 Tạo Video</h1>
      <p className="text-gray-400 mb-8">Upload audio, kịch bản và ảnh để tự động tạo video có phụ đề.</p>

      {status === 'failed' && (
        <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 mb-6 text-red-300">
          ❌ {error}
          <button onClick={reset} className="ml-4 underline text-red-400 text-sm">Thử lại</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Row 1: Audio + Script ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FileDropZone
            label="File Audio *"
            accept="audio/*"
            file={audioFile}
            onChange={setAudioFile}
            icon="🎵"
            hint="MP3, WAV, M4A..."
          />
          <FileDropZone
            label="File Kịch bản *"
            accept=".txt,.md"
            file={scriptFile}
            onChange={setScriptFile}
            icon="📝"
            hint="TXT hoặc Markdown"
          />
        </div>

        {/* ── Row 2: Scene Images ── */}
        <div>
          <label className="block text-sm font-medium mb-2">Ảnh Scene * ({images.length} ảnh)</label>
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              images.length > 0 ? 'border-blue-500 bg-blue-950/30' : 'border-gray-600 hover:border-gray-400'
            }`}
            onDrop={handleImageDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => document.getElementById('images-input').click()}
          >
            {images.length > 0 ? (
              <div>
                <div className="flex flex-wrap gap-2 justify-center mb-2">
                  {images.slice(0, 6).map((img, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={URL.createObjectURL(img)}
                        alt=""
                        className="w-16 h-16 object-cover rounded border border-gray-600"
                      />
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setImages(prev => prev.filter((_, j) => j !== i)); }}
                        className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >×</button>
                    </div>
                  ))}
                  {images.length > 6 && (
                    <div className="w-16 h-16 bg-gray-700 rounded border border-gray-600 flex items-center justify-center text-gray-400 text-sm">
                      +{images.length - 6}
                    </div>
                  )}
                </div>
                <p className="text-gray-400 text-sm">Click hoặc kéo thả để thêm ảnh</p>
              </div>
            ) : (
              <div>
                <div className="text-3xl mb-2">🖼️</div>
                <p className="text-gray-300">Kéo thả hoặc click để chọn ảnh</p>
                <p className="text-gray-500 text-sm mt-1">JPG, PNG — mỗi ảnh tương ứng 1 scene theo thứ tự</p>
              </div>
            )}
          </div>
          <input
            id="images-input"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => setImages(prev => [...prev, ...Array.from(e.target.files)])}
          />
        </div>

        {/* ── Row 3: Optional files ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FileDropZone
            label="Ảnh Background (tùy chọn)"
            accept="image/*"
            file={bgImage}
            onChange={setBgImage}
            icon="🌄"
            hint="Ảnh nền cố định phía sau"
          />
          <FileDropZone
            label="Nhạc nền BGM (tùy chọn)"
            accept="audio/*"
            file={bgmFile}
            onChange={setBgmFile}
            icon="🎶"
            hint="MP3, WAV..."
          />
        </div>

        {/* ── Settings ── */}
        <div className="bg-gray-800 rounded-xl p-5">
          <h3 className="font-semibold mb-4 text-gray-200">⚙️ Cài đặt</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {/* Aspect Ratio */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Tỉ lệ khung hình</label>
              <select
                value={aspectRatio}
                onChange={e => setAspectRatio(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="16:9">16:9 (Ngang)</option>
                <option value="9:16">9:16 (Dọc / Shorts)</option>
              </select>
            </div>

            {/* Background Mode */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Chế độ tách nền</label>
              <select
                value={backgroundMode}
                onChange={e => setBackgroundMode(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="whitekey">Whitekey (nền trắng)</option>
                <option value="rembg">AI (rembg)</option>
              </select>
            </div>

            {/* Video Speed */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Tốc độ: <span className="text-white font-mono">{videoSpeed}x</span>
              </label>
              <input
                type="range" min="0.5" max="2.0" step="0.1"
                value={videoSpeed}
                onChange={e => setVideoSpeed(parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            {/* BGM Volume */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Âm lượng BGM: <span className="text-white font-mono">{bgmVolume}%</span>
              </label>
              <input
                type="range" min="0" max="100" step="5"
                value={bgmVolume}
                onChange={e => setBgmVolume(parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            {/* Karaoke */}
            <div className="flex items-center gap-2 pt-4">
              <input
                id="karaoke"
                type="checkbox"
                checked={enableKaraoke}
                onChange={e => setEnableKaraoke(e.target.checked)}
                className="w-4 h-4 accent-blue-500"
              />
              <label htmlFor="karaoke" className="text-sm text-gray-300 cursor-pointer">
                Hiệu ứng karaoke
              </label>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!audioFile || !scriptFile || images.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold text-lg transition-colors"
        >
          🚀 Bắt đầu tạo video
        </button>
      </form>
    </div>
  );
}

// ── Sub-component: Generic file drop zone ────────────────────────────────────
function FileDropZone({ label, accept, file, onChange, icon, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <div
        className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
          file ? 'border-blue-500 bg-blue-950/30' : 'border-gray-600 hover:border-gray-400'
        }`}
        onClick={() => document.getElementById(`fz-${label}`).click()}
      >
        {file ? (
          <div>
            <div className="text-2xl mb-1">{icon}</div>
            <p className="font-medium text-sm truncate px-2">{file.name}</p>
            <p className="text-gray-400 text-xs">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
        ) : (
          <div>
            <div className="text-2xl mb-1">{icon}</div>
            <p className="text-gray-400 text-sm">{hint}</p>
          </div>
        )}
      </div>
      <input
        id={`fz-${label}`}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => onChange(e.target.files[0] || null)}
      />
    </div>
  );
}
