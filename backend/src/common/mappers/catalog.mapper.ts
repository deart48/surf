import { Chef, Program } from '@prisma/client';

/** Явный маппинг Prisma (camelCase) -> контракт OpenAPI 01-analysis/api/catalog/models.yaml (snake_case). */
export function toProgramDto(program: Program) {
  return {
    id: program.id,
    name: program.name,
    type: program.type,
    duration_min: program.durationMin,
  };
}

export function toChefDto(chef: Chef) {
  return {
    id: chef.id,
    name: chef.name,
  };
}
