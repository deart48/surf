import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Контрактная форма ошибки из 01-analysis/api/common/models.yaml:
 * { code, message, details? }
 */
export class ApiError extends HttpException {
  constructor(
    status: HttpStatus,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, status);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Не авторизован') {
    super(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Доступ запрещён') {
    super(HttpStatus.FORBIDDEN, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Ресурс не найден') {
    super(HttpStatus.NOT_FOUND, 'NOT_FOUND', message);
  }
}

export class ConflictError extends ApiError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(HttpStatus.CONFLICT, code, message, details);
  }
}

export class GoneError extends ApiError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(HttpStatus.GONE, code, message, details);
  }
}

export class UnprocessableEntityError extends ApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(HttpStatus.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR', message, details);
  }
}

export class TooManyRequestsError extends ApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(HttpStatus.TOO_MANY_REQUESTS, 'RATE_LIMITED', message, details);
  }
}
