// Типы данных по OpenAPI-контракту 01-analysis/api/{slots,bookings,catalog,profile,auth}/models.yaml.
// Соответствуют форме реальных ответов backend (../../backend) после явного DTO-маппинга
// (см. backend/src/common/mappers/*) — snake_case, как в контракте.

export type ProgramType = 'novice' | 'experienced';

export interface Program {
  id: string;
  name: string;
  type: ProgramType;
  duration_min: number;
}

export interface Chef {
  id: string;
  name: string;
}

export type SlotStatus = 'scheduled' | 'cancelled';

export interface Slot {
  id: string;
  start_at: string; // ISO datetime, UTC
  program: Program;
  chef: Chef;
  total_seats: number;
  free_seats: number;
  free_rental_sets: number;
  price: number;
  rental_price: number;
  address: string;
  status: SlotStatus;
}

export type BookingStatus = 'active' | 'cancelled' | 'late_cancel' | 'studio_cancelled';

export interface Booking {
  id: string;
  slot_id: string;
  client_id: string;
  seats_count: number;
  rental_count: number;
  allergies: string | null;
  status: BookingStatus;
  price_total: number;
  cancel_reason: string | null;
  created_at: string;
  cancelled_at: string | null;
  slot: Slot;
  is_first_booking?: boolean;
  reminder_hours?: number[];
}

export interface Client {
  id: string;
  name?: string | null;
  phone: string;
  created_at: string;
}

export interface SlotFilters {
  date_from?: string;
  date_to?: string;
  program_type?: ProgramType[];
  chef_id?: string[];
  only_available?: boolean;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
}
