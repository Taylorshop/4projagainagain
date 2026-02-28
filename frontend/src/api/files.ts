import { api } from './client';
import { authStore } from '../store/auth';
import type { Item } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function withToken(url: string): string {
  const token = authStore.getAccessToken();
  return token ? `${url}?token=${encodeURIComponent(token)}` : url;
}

export const filesApi = {
  list: (parentId?: string | null) =>
    api.get<Item[]>('/files', { params: parentId ? { parentId } : {} }),

  listTrash: () => api.get<Item[]>('/files/trash'),

  search: (q: string) => api.get<Item[]>('/files/search', { params: { q } }),

  get: (id: string) => api.get<Item>(`/files/${id}`),

  createFolder: (name: string, parentId?: string | null) =>
    api.post<Item>('/files/folders', { name, parentId }),

  upload: (
    files: File[],
    parentId: string | null,
    onProgress: (pct: number) => void,
  ) => {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    const params = parentId ? `?parentId=${parentId}` : '';
    return api.post<Item[]>(`/files/upload${params}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    });
  },

  rename: (id: string, name: string) => api.patch<Item>(`/files/${id}`, { name }),

  move: (id: string, newParentId: string | null) =>
    api.patch<Item>(`/files/${id}`, newParentId === null ? { moveToRoot: true } : { newParentId }),

  trash: (id: string) => api.delete<Item>(`/files/${id}`),

  restore: (id: string) => api.post<Item>(`/files/${id}/restore`),

  permanentDelete: (id: string) => api.delete(`/files/${id}/permanent`),

  downloadUrl: (id: string) => withToken(`${BASE_URL}/files/${id}/download`),

  previewUrl: (id: string) => withToken(`${BASE_URL}/files/${id}/preview`),

  zipUrl: (id: string) => withToken(`${BASE_URL}/files/${id}/zip`),
};
