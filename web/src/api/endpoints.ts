// Реальный API-клиент к NestJS backend (../../backend). Раньше на этом месте был
// src/mock/mockApi.ts — сигнатуры функций сохранены такими же, поэтому переключение
// экранов на сеть свелось к замене импорта и типов (см. ./types.ts).
import { apiRequest, ApiError } from './client';
import { clearTokens, hasTokens, loadTokens, saveTokens } from './tokenStorage';
import type {
  Booking,
  Chef,
  Client,
  PaginationMeta,
  Program,
  Slot,
  SlotFilters,
} from './types';

export { ApiError };

// --- auth --------------------------------------------------------------------

export async function requestAuthCode(phone: string) {
  return apiRequest<{ ttl_seconds: number; resend_after_seconds: number; code?: string }>(
    '/auth/request-code',
    { method: 'POST', body: { phone }, auth: false },
  );
}

export async function verifyAuthCode(phone: string, code: string) {
  const result = await apiRequest<{
    tokens: { access_token: string; refresh_token: string; token_type: 'Bearer'; expires_in: number };
    client: Client;
    is_new: boolean;
  }>('/auth/verify-code', { method: 'POST', body: { phone, code }, auth: false });

  saveTokens(result.tokens);
  return result;
}

export async function logout() {
  const tokens = loadTokens();
  clearTokens();
  if (!tokens) return;
  try {
    await apiRequest('/auth/logout', { method: 'POST', body: { refresh_token: tokens.refresh_token }, auth: false });
  } catch {
    // Локальный logout не должен блокироваться недоступностью сервера (LOGIC-002).
  }
}

export function isAuthenticated(): boolean {
  return hasTokens();
}

// --- profile -------------------------------------------------------------------

export async function getProfile(): Promise<Client> {
  return apiRequest<Client>('/profile');
}

export async function updateProfile(name: string): Promise<Client> {
  return apiRequest<Client>('/profile', { method: 'PATCH', body: { name } });
}

// --- catalog ---------------------------------------------------------------------

export async function listPrograms(): Promise<Program[]> {
  const res = await apiRequest<{ items: Program[]; meta: PaginationMeta }>('/programs');
  return res.items;
}

export async function listChefs(): Promise<Chef[]> {
  const res = await apiRequest<{ items: Chef[]; meta: PaginationMeta }>('/chefs');
  return res.items;
}

// --- slots -----------------------------------------------------------------------

function buildSlotsQuery(filters: SlotFilters): string {
  const params = new URLSearchParams();
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to) params.set('date_to', filters.date_to);
  filters.program_type?.forEach((type) => params.append('program_type', type));
  filters.chef_id?.forEach((id) => params.append('chef_id', id));
  if (filters.only_available) params.set('only_available', 'true');
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function listSlots(filters: SlotFilters): Promise<{ items: Slot[]; meta: PaginationMeta }> {
  return apiRequest(`/slots${buildSlotsQuery(filters)}`);
}

export async function getSlot(slotId: string): Promise<Slot> {
  return apiRequest(`/slots/${slotId}`);
}

// --- bookings --------------------------------------------------------------------

export interface CreateBookingInput {
  slot_id: string;
  seats_count: number;
  rental_count: number;
  allergies?: string | null;
}

export async function createBooking(input: CreateBookingInput, idempotencyKey: string): Promise<Booking> {
  return apiRequest<Booking>('/bookings', { method: 'POST', body: input, idempotencyKey });
}

export async function listBookings(): Promise<Booking[]> {
  const res = await apiRequest<{ items: Booking[]; meta: PaginationMeta }>('/bookings');
  return res.items;
}

export async function getBooking(bookingId: string): Promise<Booking> {
  return apiRequest(`/bookings/${bookingId}`);
}

export async function cancelBooking(bookingId: string): Promise<Booking> {
  return apiRequest(`/bookings/${bookingId}/cancel`, { method: 'POST' });
}

// --- push (best-effort, реальная регистрация токена в backend) -------------------

export async function registerPushTokenMock(): Promise<{ granted: boolean }> {
  if (typeof Notification === 'undefined') return { granted: false };
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { granted: false };
    // Полноценной Web Push подписки (Service Worker + VAPID) нет — регистрируем
    // синтетический идентификатор устройства, чтобы задействовать реальный
    // POST /auth/push-tokens и не потерять функциональность на API-уровне.
    const token = `web-${crypto.randomUUID()}`;
    await apiRequest('/auth/push-tokens', { method: 'POST', body: { token, platform: 'web' } });
    return { granted: true };
  } catch {
    return { granted: false };
  }
}
