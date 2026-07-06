import { Client } from '@prisma/client';

/** Явный маппинг Prisma (camelCase) -> контракт OpenAPI 01-analysis/api/profile/models.yaml (snake_case). */
export function toClientDto(client: Client) {
  return {
    id: client.id,
    name: client.name,
    phone: client.phone,
    created_at: client.createdAt,
  };
}
