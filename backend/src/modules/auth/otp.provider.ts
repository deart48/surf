import { Injectable, Logger } from '@nestjs/common';

/**
 * Dev OTP provider: логирует код вместо отправки через SMS-провайдера
 * (data-model.md, BE_IMPLEMENTATION_PLAN BE-04). В production заменяется
 * реализацией с реальным SMS-шлюзом за тем же интерфейсом.
 */
@Injectable()
export class OtpProvider {
  private readonly logger = new Logger('OtpProvider(dev)');

  generateCode(): string {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  async send(phone: string, code: string): Promise<void> {
    this.logger.log(`OTP for ${phone}: ${code} (dev-only, not sent via SMS)`);
  }
}
