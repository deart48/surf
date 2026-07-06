import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/** Читает Idempotency-Key из заголовка запроса (LOGIC-004). Опционален по HTTP, но
 * при отсутствии createBooking не защищён от дублей при retry — контроллер это допускает,
 * решение о принудительности — на уровне API-политики, не транспорта. */
export const IdempotencyKey = createParamDecorator((_: unknown, ctx: ExecutionContext): string | undefined => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const header = request.headers['idempotency-key'];
  return Array.isArray(header) ? header[0] : header;
});
