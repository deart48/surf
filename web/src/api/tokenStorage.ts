// Хранение access/refresh токенов сессии (LOGIC-002). Простое хранение в localStorage:
// для MVP-клиента этого достаточно; при повышении требований к XSS-защите стоит
// пересмотреть на httpOnly cookie + BFF.

const STORAGE_KEY = 'chef-table-auth-v1';

export interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch ms, для проактивного refresh
}

export function loadTokens(): StoredTokens | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredTokens) : null;
  } catch {
    return null;
  }
}

export function saveTokens(tokens: { access_token: string; refresh_token: string; expires_in: number }): void {
  const stored: StoredTokens = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export function clearTokens(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasTokens(): boolean {
  return loadTokens() !== null;
}
