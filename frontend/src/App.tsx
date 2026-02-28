import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { authStore } from './store/auth';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import FilesPage from './pages/FilesPage';
import TrashPage from './pages/TrashPage';
import SettingsPage from './pages/SettingsPage';
import PublicSharePage from './pages/PublicSharePage';

function RequireAuth({ children }: { children: React.ReactElement }) {
  if (!authStore.isLoggedIn()) return <Navigate to="/login" replace />;
  return children;
}

function RedirectIfAuth({ children }: { children: React.ReactElement }) {
  if (authStore.isLoggedIn()) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<RedirectIfAuth><LoginPage /></RedirectIfAuth>} />
        <Route path="/register" element={<RedirectIfAuth><RegisterPage /></RedirectIfAuth>} />
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />
        <Route path="/share/:token" element={<PublicSharePage />} />

        {/* Protected */}
        <Route path="/" element={<RequireAuth><FilesPage /></RequireAuth>} />
        <Route path="/trash" element={<RequireAuth><TrashPage /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
