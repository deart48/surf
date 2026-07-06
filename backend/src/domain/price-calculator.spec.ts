import { calculatePriceTotal } from './price-calculator';

describe('calculatePriceTotal', () => {
  it('computes price*seats + rental_price*rental (FR-13)', () => {
    const slot = { price: 3500, rentalPrice: 500 };
    expect(calculatePriceTotal(slot, { seatsCount: 3, rentalCount: 2 })).toBe(
      3500 * 3 + 500 * 2,
    );
  });

  it('handles all-own-equipment booking (rental_count = 0)', () => {
    const slot = { price: 3500, rentalPrice: 500 };
    expect(calculatePriceTotal(slot, { seatsCount: 2, rentalCount: 0 })).toBe(7000);
  });

  it('handles zero-price slot edge case', () => {
    const slot = { price: 0, rentalPrice: 0 };
    expect(calculatePriceTotal(slot, { seatsCount: 6, rentalCount: 6 })).toBe(0);
  });
});
