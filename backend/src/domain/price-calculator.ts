export interface SlotPricing {
  price: number;
  rentalPrice: number;
}

export interface BookingSeats {
  seatsCount: number;
  rentalCount: number;
}

/**
 * price_total = slot.price * seats_count + slot.rental_price * rental_count (FR-13).
 * Считается ТОЛЬКО сервером; клиент показывает результат как есть, не пересчитывает.
 */
export function calculatePriceTotal(slot: SlotPricing, booking: BookingSeats): number {
  return slot.price * booking.seatsCount + slot.rentalPrice * booking.rentalCount;
}
