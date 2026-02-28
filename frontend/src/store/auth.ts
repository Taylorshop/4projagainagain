import type { User } from '../types';

const KEYS = {
  access: 'sf_access',
  refresh: 'sf_refresh',
  user: 'sf_user',
};

export const authStore = {
  getAccessToken: (): string | null => localStorage.getItem(KEYS.access),
  getRefreshToken: (): string | null => localStorage.getItem(KEYS.refresh),

  getUser: (): User | null => {
    const raw = localStorage.getItem(KEYS.user);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  save: (tokens: { accessToken: string; refreshToken: string; user: User }) => {
    localStorage.setItem(KEYS.access, tokens.accessToken);
    localStorage.setItem(KEYS.refresh, tokens.refreshToken);
    localStorage.setItem(KEYS.user, JSON.stringify(tokens.user));
  },

  clear: () => {
    localStorage.removeItem(KEYS.access);
    localStorage.removeItem(KEYS.refresh);
    localStorage.removeItem(KEYS.user);
  },

  isLoggedIn: (): boolean => !!localStorage.getItem(KEYS.access),
};
