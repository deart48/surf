import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CatalogService } from './catalog.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  /** operationId: listChefs — GET /chefs (read-only справочник, FR-4) */
  @Get('chefs')
  listChefs(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.catalogService.listChefs(Number(limit) || undefined, Number(offset) || undefined);
  }

  /** operationId: listPrograms — GET /programs (read-only справочник, FR-4/FR-5) */
  @Get('programs')
  listPrograms(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.catalogService.listPrograms(Number(limit) || undefined, Number(offset) || undefined);
  }
}
