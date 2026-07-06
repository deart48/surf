import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SlotsService } from './slots.service';
import { ListSlotsQueryDto } from './dto/list-slots-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('slots')
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  /** operationId: listSlots — GET /slots */
  @Get()
  listSlots(@Query() query: ListSlotsQueryDto) {
    return this.slotsService.listSlots(query);
  }

  /** operationId: getSlot — GET /slots/:slotId */
  @Get(':slotId')
  getSlot(@Param('slotId') slotId: string) {
    return this.slotsService.getSlot(slotId);
  }
}
