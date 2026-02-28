import axios from 'axios';
import { authStore } from '../store/auth';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Attach JWT access token to every request
api.interceptors.request.use((config) => {
  const token = authStore.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, attempt one silent token refresh, then redirect to /login
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthEndpoint = original?.url?.includes('/auth/');
    if (error.response?.status === 401 && !original._retried && !isAuthEndpoint) {
      original._retried = true;
      const refreshToken = authStore.getRefreshToken();
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          authStore.save({ ...data, user: data.user });
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          authStore.clear();
          window.location.href = '/login';
        }
      } else {
        authStore.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
