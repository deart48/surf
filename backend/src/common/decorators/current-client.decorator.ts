import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '../guards/jwt-auth.guard';

/**
 * Достаёт clientId, положенный JwtAuthGuard-ом. Гарантирует, что handler
 * никогда не читает "чужой" client_id из query/body (NFR-8).
 */
export const CurrentClient = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.clientId;
});
