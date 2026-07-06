import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { toChefDto, toProgramDto } from '../../common/mappers/catalog.mapper';

const DEFAULT_LIMIT = 50;

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listChefs(limit = DEFAULT_LIMIT, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.chef.findMany({ take: limit, skip: offset, orderBy: { name: 'asc' } }),
      this.prisma.chef.count(),
    ]);
    return { items: items.map(toChefDto), meta: { total, limit, offset } };
  }

  async listPrograms(limit = DEFAULT_LIMIT, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.program.findMany({ take: limit, skip: offset, orderBy: { name: 'asc' } }),
      this.prisma.program.count(),
    ]);
    return { items: items.map(toProgramDto), meta: { total, limit, offset } };
  }
}
