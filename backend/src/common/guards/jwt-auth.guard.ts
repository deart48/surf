import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UnauthorizedError } from '../errors/api-error';

export interface AuthenticatedRequest extends Request {
  clientId: string;
}

interface AccessTokenPayload {
  sub: string;
  type: 'access';
}

/**
 * Извлекает Bearer access-токен, кладёт clientId в request (NFR-8: клиент
 * управляет только своими данными — controllers читают clientId отсюда, не из body/query).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Отсутствует токен авторизации');
    }

    const token = header.slice('Bearer '.length);

    try {
      const payload = this.jwtService.verify<AccessTokenPayload>(token);
      if (payload.type !== 'access') {
        throw new UnauthorizedError('Неверный тип токена');
      }
      request.clientId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedError('Токен недействителен или истёк');
    }
  }
}
