import { Chef, Program, Slot } from '@prisma/client';
import { toChefDto, toProgramDto } from './catalog.mapper';

type SlotWithRelations = Slot & { program: Program; chef: Chef };

/** Явный маппинг Prisma (camelCase) -> контракт OpenAPI 01-analysis/api/slots/models.yaml (snake_case). */
export function toSlotDto(slot: SlotWithRelations) {
  return {
    id: slot.id,
    start_at: slot.startAt,
    program: toProgramDto(slot.program),
    chef: toChefDto(slot.chef),
    total_seats: slot.totalSeats,
    free_seats: slot.freeSeats,
    free_rental_sets: slot.freeRentalSets,
    price: slot.price,
    rental_price: slot.rentalPrice,
    address: slot.address,
    status: slot.status,
  };
}
