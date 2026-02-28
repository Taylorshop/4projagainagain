import { api } from './client';
import type { Quota } from '../types';

export const usersApi = {
  getQuota: () => api.get<Quota>('/users/me/quota'),

  getConnections: () => api.get<{ google: boolean; hasPassword: boolean }>('/users/me/connections'),

  unlinkGoogle: () => api.delete('/users/me/connections/google'),

  setPassword: (newPassword: string) =>
    api.post('/users/me/password', { newPassword }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch('/users/me/password', { currentPassword, newPassword }),

  updateProfile: (displayName: string) =>
    api.patch('/users/me/profile', { displayName }),

  deleteAccount: () => api.delete('/users/me'),
};
