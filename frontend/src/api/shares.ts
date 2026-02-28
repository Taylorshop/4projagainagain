import { api } from './client';
import type { ShareLink } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export const sharesApi = {
  create: (itemId: string) => api.post<ShareLink>('/shares', { itemId }),

  list: () => api.get<ShareLink[]>('/shares'),

  remove: (id: string) => api.delete(`/shares/${id}`),

  getPublic: (token: string) =>
    api.get<{
      id: string;
      token: string;
      item: { id: string; name: string; type: string; mimeType: string | null; sizeBytes: string | null };
    }>(`/shares/public/${token}`),

  publicDownloadUrl: (token: string) => `${BASE_URL}/shares/public/${token}/download`,
};
