// Тонкий HTTP-клиент к NestJS backend (см. ../../backend). Формат ошибок — контракт
// 01-analysis/api/common/models.yaml: { code, message, details? }, маппится тут в ApiError.
import { clearTokens, loadTokens, saveTokens } from './tokenStorage';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean; // по умолчанию true — большинство эндпоинтов защищены JwtAuthGuard
  idempotencyKey?: string;
  signal?: AbortSignal;
}

let onSessionExpired: (() => void) | null = null;

/** Вызывается один раз из SessionProvider, чтобы клиент мог разлогинить при неудачном refresh. */
export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

async function rawRequest(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, init);
}

// Прямой вызов POST /auth/refresh в обход apiRequest — чтобы не зациклиться на 401.
async function performRefresh(): Promise<boolean> {
  const tokens = loadTokens();
  if (!tokens) return false;
  try {
    const response = await rawRequest('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: tokens.refresh_token }),
    });
    if (!response.ok) return false;
    const data = await response.json();
    saveTokens(data);
    return true;
  } catch {
    return false;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, idempotencyKey, signal } = options;

  async function send(): Promise<Response> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    if (auth) {
      const tokens = loadTokens();
      if (tokens) headers.Authorization = `Bearer ${tokens.access_token}`;
    }
    return rawRequest(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  }

  let response = await send();

  if (response.status === 401 && auth) {
    const refreshed = await performRefresh();
    if (refreshed) {
      response = await send();
    } else {
      clearTokens();
      onSessionExpired?.();
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    const code = data?.code ?? 'UNKNOWN_ERROR';
    const message = data?.message ?? `Ошибка запроса (${response.status})`;
    throw new ApiError(response.status, code, message, data?.details);
  }

  return data as T;
}
