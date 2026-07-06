// Чистые доменные политики — без React/API-зависимостей.
// LOGIC-003 (живой пересчёт брони), LOGIC-005 (правило отмены 24ч).
// ВАЖНО: это клиентское превью. Источник истины — сервер (SCR-06 §7, R-004);
// в mock-режиме эти функции используются также внутри mockApi для эмуляции сервера.

import { AsYouType, isValidPhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js';
import type { Slot } from '../api/types';

export const MAX_SEATS_PER_BOOKING = 6;
export const EARLY_CANCELLATION_HOURS = 24;

/** Дефолтная страна для маски и разбора номера без явного кода (основная аудитория — РФ). */
const DEFAULT_PHONE_COUNTRY = 'RU' as const;

/** Текст ошибки формата из SCR-01 (AC-N01). */
export const PHONE_FORMAT_ERROR = 'Проверьте номер — кажется, не хватает цифр';

export function maxBookableSeats(slot: Pick<Slot, 'free_seats'>): number {
  return Math.max(0, Math.min(slot.free_seats, MAX_SEATS_PER_BOOKING));
}

export function maxBookableRentalSets(
  slot: Pick<Slot, 'free_rental_sets'>,
  seatsCount: number,
): number {
  return Math.max(0, Math.min(slot.free_rental_sets, seatsCount));
}

export function calculatePriceTotal(
  slot: Pick<Slot, 'price' | 'rental_price'>,
  seatsCount: number,
  rentalCount: number,
): number {
  return slot.price * seatsCount + slot.rental_price * rentalCount;
}

export interface CancellationInfo {
  isEarly: boolean;
  hoursUntilStart: number;
  canCancel: boolean;
}

export function getCancellationInfo(startAtIso: string, now: Date = new Date()): CancellationInfo {
  const startAt = new Date(startAtIso).getTime();
  const hoursUntilStart = (startAt - now.getTime()) / 3_600_000;
  return {
    isEarly: hoursUntilStart >= EARLY_CANCELLATION_HOURS,
    hoursUntilStart,
    canCancel: hoursUntilStart > 0,
  };
}

export function isPast(startAtIso: string, now: Date = new Date()): boolean {
  return new Date(startAtIso).getTime() < now.getTime();
}

export function formatMoney(amountRub: number): string {
  return `${amountRub.toLocaleString('ru-RU')} ₽`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Маска при вводе: нормализует вставку с пробелами/скобками/дефисами (SCR-01),
 * форматирует по мере набора через libphonenumber-js AsYouType.
 */
export function formatPhoneInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '+';

  // Если пользователь стёр «+», восстанавливаем префикс для RU-аудитории.
  const withPlus = trimmed.startsWith('+') ? trimmed : `+${trimmed.replace(/^\+?/, '')}`;
  return new AsYouType(DEFAULT_PHONE_COUNTRY).input(withPlus);
}

/**
 * Реальная проверка корректности номера (код страны + длина/структура национального номера
 * по libphonenumber-js), а не только формат E.164. Совпадает с backend `@IsPhoneNumber`.
 */
export function isValidPhone(phone: string): boolean {
  return isValidPhoneNumber(phone, DEFAULT_PHONE_COUNTRY);
}

/** Нормализует в E.164 для API (`RequestCodeRequest.phone`) или возвращает null. */
export function normalizePhoneToE164(phone: string): string | null {
  const parsed = parsePhoneNumberFromString(phone, DEFAULT_PHONE_COUNTRY);
  if (!parsed?.isValid()) return null;
  return parsed.format('E.164');
}

/**
 * Сообщение об ошибке для UI или null, если номер валиден / ещё слишком короткий для проверки.
 * `force` — показывать ошибку даже на коротком черновике (submit).
 */
export function getPhoneValidationError(phone: string, force = false): string | null {
  const digits = phone.replace(/\D/g, '');

  if (!force && digits.length <= 1) return null;

  if (!phone.startsWith('+')) {
    return PHONE_FORMAT_ERROR;
  }

  if (!force && digits.length < 11) {
    return null;
  }

  if (!isValidPhone(phone)) {
    return PHONE_FORMAT_ERROR;
  }

  return null;
}
