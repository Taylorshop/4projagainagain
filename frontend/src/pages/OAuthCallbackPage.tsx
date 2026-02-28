import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { authStore } from '../store/auth';

/**
 * Landing page after Google OAuth2 redirect.
 * URL shape: /auth/callback?access_token=...&refresh_token=...
 */
export default function OAuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      navigate('/login');
      return;
    }

    // Fetch the user profile then store everything
    authStore.save({ accessToken, refreshToken, user: { id: '', email: '', displayName: null } });
    authApi.me()
      .then(({ data }) => {
        authStore.save({ accessToken, refreshToken, user: data.user });
        navigate('/');
      })
      .catch(() => {
        authStore.clear();
        navigate('/login');
      });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Connexion en cours…</p>
    </div>
  );
}
