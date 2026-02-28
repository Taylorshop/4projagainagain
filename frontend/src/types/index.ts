export type ItemType = 'FILE' | 'FOLDER';

export interface Item {
  id: string;
  userId: string;
  type: ItemType;
  name: string;
  parentId: string | null;
  mimeType: string | null;
  sizeBytes: string | null;
  storageKey: string | null;
  trashedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShareLink {
  id: string;
  userId: string;
  itemId: string;
  token: string;
  createdAt: string;
  expiresAt: string | null;
  item?: Item;
}

export interface User {
  id: string;
  email: string;
  displayName: string | null;
}

export interface Quota {
  usedBytes: string;
  maxBytes: string;
  freeBytes: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}
