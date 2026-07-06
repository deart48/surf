export const MAX_SEATS_PER_BOOKING = 6;

export interface SlotAvailability {
  freeSeats: number;
  freeRentalSets: number;
  status: 'scheduled' | 'cancelled';
}

export interface BookingRequestSeats {
  seatsCount: number;
  rentalCount: number;
}

export type BookingLimitViolation =
  | { code: 'SLOT_CANCELLED' }
  | { code: 'SEATS_EXCEEDED'; availableSeats: number }
  | { code: 'RENTAL_EXCEEDED'; availableRentalSets: number }
  | { code: 'SEATS_OUT_OF_RANGE' }
  | { code: 'RENTAL_OUT_OF_RANGE' };

/**
 * Проверка лимитов брони (FR-8, FR-9, FR-10; data-model → инварианты).
 *
 * - seats_count: 1..min(free_seats, 6)
 * - rental_count: 0..seats_count И <= free_rental_sets (учёт мест и проката РАЗДЕЛЬНЫЙ —
 *   своя экипировка занимает место, но не расходует прокатный фонд).
 *
 * Возвращает первое найденное нарушение или null, если бронь допустима.
 * Порядок проверки соответствует UC-2 исключениям (E4 -> E1 -> E2).
 */
export function checkBookingLimits(
  slot: SlotAvailability,
  request: BookingRequestSeats,
): BookingLimitViolation | null {
  if (slot.status === 'cancelled') {
    return { code: 'SLOT_CANCELLED' };
  }

  if (request.seatsCount < 1 || request.seatsCount > MAX_SEATS_PER_BOOKING) {
    return { code: 'SEATS_OUT_OF_RANGE' };
  }

  const maxSeats = Math.min(slot.freeSeats, MAX_SEATS_PER_BOOKING);
  if (request.seatsCount > maxSeats) {
    return { code: 'SEATS_EXCEEDED', availableSeats: slot.freeSeats };
  }

  if (request.rentalCount < 0 || request.rentalCount > request.seatsCount) {
    return { code: 'RENTAL_OUT_OF_RANGE' };
  }

  if (request.rentalCount > slot.freeRentalSets) {
    return { code: 'RENTAL_EXCEEDED', availableRentalSets: slot.freeRentalSets };
  }

  return null;
}
