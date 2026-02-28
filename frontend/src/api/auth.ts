import { api } from './client';
import type { AuthTokens, User } from '../types';

export const authApi = {
  register: (email: string, password: string, displayName?: string) =>
    api.post<{ user: User }>('/auth/register', { email, password, displayName }),

  login: (email: string, password: string) =>
    api.post<AuthTokens>('/auth/login', { email, password }),

  refresh: (refreshToken: string) =>
    api.post<AuthTokens>('/auth/refresh', { refreshToken }),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),

  me: () => api.get<{ user: User }>('/auth/me'),

  googleLoginUrl: (): string => {
    const base = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
    return `${base}/auth/oauth/google`;
  },
};
