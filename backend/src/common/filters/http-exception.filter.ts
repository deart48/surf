import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

interface ContractErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Единый маппер ошибок в контрактный формат 01-analysis/api/common/models.yaml:
 * { code, message, details? }. Ловит и HttpException (в т.ч. ApiError), и любые прочие
 * необработанные ошибки (мапятся в 500 INTERNAL_ERROR, не утекая деталями наружу).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = this.normalize(exception, status);
      response.status(status).json(body);
      return;
    }

    this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'INTERNAL_ERROR',
      message: 'Внутренняя ошибка сервера',
    } satisfies ContractErrorBody);
  }

  private normalize(exception: HttpException, status: number): ContractErrorBody {
    const payload = exception.getResponse();

    if (typeof payload === 'object' && payload !== null && 'code' in payload) {
      const { code, message, details } = payload as ContractErrorBody;
      return { code, message: Array.isArray(message) ? message.join('; ') : message, details };
    }

    // class-validator ValidationPipe errors land here as { message: string[], ... }.
    if (typeof payload === 'object' && payload !== null && 'message' in payload) {
      const raw = (payload as { message: string | string[] }).message;
      return {
        code: status === HttpStatus.UNPROCESSABLE_ENTITY || status === HttpStatus.BAD_REQUEST
          ? 'VALIDATION_ERROR'
          : 'ERROR',
        message: Array.isArray(raw) ? raw.join('; ') : raw,
      };
    }

    return { code: 'ERROR', message: exception.message };
  }
}
