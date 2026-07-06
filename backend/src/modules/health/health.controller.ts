import { Controller, Get } from '@nestjs/common';

/** Служебные endpoints вне клиентского OpenAPI-контракта (BE_IMPLEMENTATION_PLAN §Функционал). */
@Controller()
export class HealthController {
  @Get('healthz')
  healthz() {
    return { status: 'ok' };
  }

  @Get('readyz')
  readyz() {
    return { status: 'ready' };
  }
}
