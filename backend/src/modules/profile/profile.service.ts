import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotFoundError } from '../../common/errors/api-error';
import { toClientDto } from '../../common/mappers/client.mapper';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(clientId: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new NotFoundError('Клиент не найден');
    }
    return toClientDto(client);
  }

  async updateProfile(clientId: string, name: string) {
    const client = await this.prisma.client.update({ where: { id: clientId }, data: { name } });
    return toClientDto(client);
  }
}
