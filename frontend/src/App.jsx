import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { initGoogleAuth, signIn, signOut, isSignedIn } from './services/googleAuth';
import HomePage from './pages/HomePage';
import LibraryPage from './pages/LibraryPage';
import SchedulePage from './pages/SchedulePage';

// ⚠️ Thay bằng OAuth Client ID của bạn (tạo miễn phí tại Google Cloud Console)
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function Layout({ children, authenticated, onSignIn, onSignOut }) {
  const navClass = ({ isActive }) =>
    `px-4 py-2 rounded-lg font-medium transition-colors ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="border-b border-gray-700 bg-gray-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-xl font-bold text-white">🎬 EditVideoTool</span>
            {authenticated && (
              <nav className="flex gap-2">
                <NavLink to="/" end className={navClass}>Upload</NavLink>
                <NavLink to="/library" className={navClass}>Library</NavLink>
                <NavLink to="/schedule" className={navClass}>Schedule</NavLink>
              </nav>
            )}
          </div>

          <div>
            {authenticated ? (
              <button
                onClick={onSignOut}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Đăng xuất
              </button>
            ) : (
              <button
                onClick={onSignIn}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                🔗 Đăng nhập Google
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {authenticated ? (
          children
        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎬</div>
            <h1 className="text-3xl font-bold mb-3">Edit Video Tool</h1>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Upload video lên Google Drive, đặt lịch tự động đăng lên YouTube.
              <br />Hoàn toàn miễn phí.
            </p>
            <button
              onClick={onSignIn}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl text-lg font-semibold transition-colors"
            >
              🔗 Đăng nhập với Google
            </button>
            <p className="text-gray-500 text-sm mt-4">
              Cần quyền lưu trữ video trên Google Drive của bạn
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!CLIENT_ID) {
      console.warn('VITE_GOOGLE_CLIENT_ID not set. Check .env file.');
      setLoading(false);
      return;
    }

    initGoogleAuth(CLIENT_ID, (status) => {
      setAuthenticated(status);
    }).then(() => {
      setAuthenticated(isSignedIn());
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-400">
        <div className="animate-spin text-3xl mr-3">⏳</div> Đang tải...
      </div>
    );
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Layout
        authenticated={authenticated}
        onSignIn={signIn}
        onSignOut={() => {
          signOut();
          setAuthenticated(false);
        }}
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
