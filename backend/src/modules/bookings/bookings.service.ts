import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Clock } from '../../domain/clock';
import { CLOCK } from '../../infrastructure/clock/clock.module';
import { checkBookingLimits } from '../../domain/booking-limits';
import { calculatePriceTotal } from '../../domain/price-calculator';
import { CancellationPolicy } from '../../domain/cancellation.policy';
import {
  ConflictError,
  ForbiddenError,
  GoneError,
  NotFoundError,
  UnprocessableEntityError,
} from '../../common/errors/api-error';
import { toSlotDto } from '../../common/mappers/slot.mapper';
import { CreateBookingDto } from './dto/create-booking.dto';

/** Каноническое MVP-значение из FR-19: напоминание за 24ч до старта. Задаётся сервером. */
const REMINDER_HOURS = [24];

interface SlotForUpdateRow {
  id: string;
  status: 'scheduled' | 'cancelled';
  free_seats: number;
  free_rental_sets: number;
  price: number;
  rental_price: number;
}

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * createBooking (UC-2, LOGIC-004, createBooking-sequence.md):
   * - Idempotency-Key: повтор с тем же ключом+телом для того же клиента -> тот же результат.
   * - Транзакция + SELECT ... FOR UPDATE на слот -> исключает овербукинг (NFR-4/R-004).
   */
  async createBooking(clientId: string, dto: CreateBookingDto, idempotencyKey?: string) {
    const requestHash = this.hashRequest(dto);

    if (idempotencyKey) {
      const existing = await this.prisma.idempotencyKey.findUnique({
        where: { clientId_key: { clientId, key: idempotencyKey } },
      });
      if (existing) {
        if (existing.requestHash !== requestHash) {
          throw new UnprocessableEntityError(
            'Idempotency-Key уже использован для другого тела запроса',
          );
        }
        return existing.responseBody as Record<string, unknown>;
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<SlotForUpdateRow[]>(Prisma.sql`
        SELECT id, status, free_seats, free_rental_sets, price, rental_price
        FROM slots WHERE id = ${dto.slot_id}::uuid FOR UPDATE
      `);
      const slot = rows[0];

      if (!slot) {
        throw new NotFoundError('Слот не найден');
      }

      const violation = checkBookingLimits(
        {
          freeSeats: slot.free_seats,
          freeRentalSets: slot.free_rental_sets,
          status: slot.status,
        },
        { seatsCount: dto.seats_count, rentalCount: dto.rental_count },
      );

      if (violation) {
        if (violation.code === 'SLOT_CANCELLED') {
          throw new GoneError('SLOT_CANCELLED', 'Класс отменён студией', {});
        }
        if (violation.code === 'SEATS_EXCEEDED') {
          throw new ConflictError('SEATS_UNAVAILABLE', 'Недостаточно свободных мест', {
            available_seats: violation.availableSeats,
          });
        }
        if (violation.code === 'RENTAL_EXCEEDED') {
          throw new ConflictError('RENTAL_UNAVAILABLE', 'Недостаточно прокатных комплектов', {
            available_rental_sets: violation.availableRentalSets,
          });
        }
        throw new UnprocessableEntityError('Некорректные параметры брони');
      }

      const priceTotal = calculatePriceTotal(
        { price: slot.price, rentalPrice: slot.rental_price },
        { seatsCount: dto.seats_count, rentalCount: dto.rental_count },
      );

      const priorBookingsCount = await tx.booking.count({ where: { clientId } });

      await tx.slot.update({
        where: { id: dto.slot_id },
        data: {
          freeSeats: { decrement: dto.seats_count },
          freeRentalSets: { decrement: dto.rental_count },
        },
      });

      const booking = await tx.booking.create({
        data: {
          slotId: dto.slot_id,
          clientId,
          seatsCount: dto.seats_count,
          rentalCount: dto.rental_count,
          allergies: dto.allergies,
          priceTotal,
          status: 'active',
        },
        include: { slot: { include: { program: true, chef: true } } },
      });

      const response = {
        ...this.toBookingDto(booking),
        is_first_booking: priorBookingsCount === 0,
        reminder_hours: REMINDER_HOURS,
      };

      if (idempotencyKey) {
        await tx.idempotencyKey.create({
          data: {
            clientId,
            key: idempotencyKey,
            requestHash,
            responseBody: response as unknown as Prisma.InputJsonValue,
            statusCode: 201,
          },
        });
      }

      return response;
    });

    return result;
  }

  async listBookings(clientId: string, limit = 20, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: { clientId },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: { slot: { include: { program: true, chef: true } } },
      }),
      this.prisma.booking.count({ where: { clientId } }),
    ]);

    return { items: items.map((b) => this.toBookingDto(b)), meta: { total, limit, offset } };
  }

  async getBooking(clientId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: { include: { program: true, chef: true } } },
    });

    if (!booking) {
      throw new NotFoundError('Бронь не найдена');
    }
    if (booking.clientId !== clientId) {
      throw new ForbiddenError('Доступ к чужой брони запрещён');
    }

    return this.toBookingDto(booking);
  }

  /** cancelBooking (UC-3, LOGIC-005): только active, только до старта, ранняя/поздняя по 24ч. */
  async cancelBooking(clientId: string, bookingId: string) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { slot: true },
      });

      if (!booking) {
        throw new NotFoundError('Бронь не найдена');
      }
      if (booking.clientId !== clientId) {
        throw new ForbiddenError('Доступ к чужой брони запрещён');
      }
      if (booking.status !== 'active') {
        throw new ConflictError('BOOKING_NOT_ACTIVE', 'Бронь уже отменена или неактивна');
      }

      const policy = new CancellationPolicy(this.clock);
      const outcome = policy.evaluate(booking.slot.startAt);

      if (outcome === 'not_allowed') {
        throw new ConflictError('CLASS_ALREADY_STARTED', 'Класс уже начался, отмена недоступна');
      }

      const now = this.clock.now();

      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: outcome === 'early' ? 'cancelled' : 'late_cancel',
          cancelledAt: now,
        },
        include: { slot: { include: { program: true, chef: true } } },
      });

      if (outcome === 'early') {
        await tx.slot.update({
          where: { id: booking.slotId },
          data: {
            freeSeats: { increment: booking.seatsCount },
            freeRentalSets: { increment: booking.rentalCount },
          },
        });
      }

      return this.toBookingDto(updated);
    });
  }

  private hashRequest(dto: CreateBookingDto): string {
    return crypto.createHash('sha256').update(JSON.stringify(dto)).digest('hex');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toBookingDto(booking: any) {
    return {
      id: booking.id,
      slot_id: booking.slotId,
      client_id: booking.clientId,
      seats_count: booking.seatsCount,
      rental_count: booking.rentalCount,
      allergies: booking.allergies,
      status: booking.status,
      price_total: booking.priceTotal,
      cancel_reason: booking.cancelReason,
      created_at: booking.createdAt,
      cancelled_at: booking.cancelledAt,
      slot: toSlotDto(booking.slot),
    };
  }
}
