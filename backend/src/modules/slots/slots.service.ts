import { Inject, Injectable } from '@nestjs/common';
import { Prisma, ProgramType } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Clock } from '../../domain/clock';
import { CLOCK } from '../../infrastructure/clock/clock.module';
import { NotFoundError } from '../../common/errors/api-error';
import { toSlotDto } from '../../common/mappers/slot.mapper';
import { ListSlotsQueryDto } from './dto/list-slots-query.dto';

const DEFAULT_LIST_DAYS = 7;
const DEFAULT_LIMIT = 20;

@Injectable()
export class SlotsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** FR-3/FR-4/R-027: дефолт 7 дней от текущего момента, если date_from/date_to не заданы. */
  async listSlots(query: ListSlotsQueryDto) {
    const now = this.clock.now();
    const dateFrom = query.date_from ? new Date(query.date_from) : now;
    const dateTo = query.date_to
      ? new Date(query.date_to)
      : new Date(dateFrom.getTime() + DEFAULT_LIST_DAYS * 24 * 60 * 60 * 1000);

    const limit = query.limit ?? DEFAULT_LIMIT;
    const offset = query.offset ?? 0;

    const where: Prisma.SlotWhereInput = {
      startAt: { gte: dateFrom, lte: dateTo },
      ...(query.program_type?.length
        ? { program: { type: { in: query.program_type as ProgramType[] } } }
        : {}),
      ...(query.chef_id?.length ? { chefId: { in: query.chef_id } } : {}),
      ...(query.only_available ? { freeSeats: { gt: 0 }, status: 'scheduled' } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.slot.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { startAt: 'asc' },
        include: { program: true, chef: true },
      }),
      this.prisma.slot.count({ where }),
    ]);

    return { items: items.map(toSlotDto), meta: { total, limit, offset } };
  }

  async getSlot(slotId: string) {
    const slot = await this.prisma.slot.findUnique({
      where: { id: slotId },
      include: { program: true, chef: true },
    });
    if (!slot) {
      throw new NotFoundError('Слот не найден');
    }
    return toSlotDto(slot);
  }
}
