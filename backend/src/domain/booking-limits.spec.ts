import { checkBookingLimits, MAX_SEATS_PER_BOOKING } from './booking-limits';

describe('checkBookingLimits', () => {
  const availableSlot = { freeSeats: 4, freeRentalSets: 3, status: 'scheduled' as const };

  it('allows a booking within seats and rental limits', () => {
    expect(checkBookingLimits(availableSlot, { seatsCount: 3, rentalCount: 2 })).toBeNull();
  });

  it('rejects booking on a cancelled slot (E4 / R-008) before any other check', () => {
    const cancelledSlot = { freeSeats: 4, freeRentalSets: 3, status: 'cancelled' as const };
    expect(checkBookingLimits(cancelledSlot, { seatsCount: 1, rentalCount: 0 })).toEqual({
      code: 'SLOT_CANCELLED',
    });
  });

  it('rejects seats_count = 0 (out of 1..6 range)', () => {
    expect(checkBookingLimits(availableSlot, { seatsCount: 0, rentalCount: 0 })).toEqual({
      code: 'SEATS_OUT_OF_RANGE',
    });
  });

  it(`rejects seats_count > ${MAX_SEATS_PER_BOOKING} (max per booking, FR-8)`, () => {
    const bigSlot = { freeSeats: 10, freeRentalSets: 6, status: 'scheduled' as const };
    expect(checkBookingLimits(bigSlot, { seatsCount: 7, rentalCount: 0 })).toEqual({
      code: 'SEATS_OUT_OF_RANGE',
    });
  });

  it('caps available seats at min(free_seats, 6) — E1 when free_seats < requested', () => {
    expect(checkBookingLimits(availableSlot, { seatsCount: 4, rentalCount: 0 })).toBeNull();
    expect(checkBookingLimits(availableSlot, { seatsCount: 5, rentalCount: 0 })).toEqual({
      code: 'SEATS_EXCEEDED',
      availableSeats: 4,
    });
  });

  it('rejects rental_count > seats_count (out of range)', () => {
    expect(checkBookingLimits(availableSlot, { seatsCount: 2, rentalCount: 3 })).toEqual({
      code: 'RENTAL_OUT_OF_RANGE',
    });
  });

  it('rejects negative rental_count', () => {
    expect(checkBookingLimits(availableSlot, { seatsCount: 2, rentalCount: -1 })).toEqual({
      code: 'RENTAL_OUT_OF_RANGE',
    });
  });

  it('rejects rental_count > free_rental_sets even when seats are available (E2 — separate pools, FR-10)', () => {
    const noRentalSlot = { freeSeats: 4, freeRentalSets: 0, status: 'scheduled' as const };
    expect(checkBookingLimits(noRentalSlot, { seatsCount: 2, rentalCount: 1 })).toEqual({
      code: 'RENTAL_EXCEEDED',
      availableRentalSets: 0,
    });
  });

  it('allows own equipment (rental_count = 0) even when rental pool is exhausted', () => {
    const noRentalSlot = { freeSeats: 4, freeRentalSets: 0, status: 'scheduled' as const };
    expect(checkBookingLimits(noRentalSlot, { seatsCount: 2, rentalCount: 0 })).toBeNull();
  });
});
