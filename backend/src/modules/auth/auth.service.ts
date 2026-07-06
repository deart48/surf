import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Clock } from '../../domain/clock';
import { CLOCK } from '../../infrastructure/clock/clock.module';
import {
  TooManyRequestsError,
  UnauthorizedError,
  UnprocessableEntityError,
} from '../../common/errors/api-error';
import { OtpProvider } from './otp.provider';

const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS ?? 300);
const OTP_RESEND_AFTER_SECONDS = Number(process.env.OTP_RESEND_AFTER_SECONDS ?? 60);
const ACCESS_TTL_SECONDS = Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 900);
const REFRESH_TTL_SECONDS = Number(process.env.JWT_REFRESH_TTL_SECONDS ?? 2592000);
const BCRYPT_ROUNDS = 10;

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly otpProvider: OtpProvider,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async requestAuthCode(phone: string): Promise<{
    ttl_seconds: number;
    resend_after_seconds: number;
    code?: string;
  }> {
    const now = this.clock.now();
    const lastOtp = await this.prisma.otpCode.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });

    if (lastOtp) {
      const secondsSinceLast = (now.getTime() - lastOtp.createdAt.getTime()) / 1000;
      if (secondsSinceLast < OTP_RESEND_AFTER_SECONDS) {
        throw new TooManyRequestsError('Повторная отправка кода ещё недоступна', {
          retry_after_seconds: Math.ceil(OTP_RESEND_AFTER_SECONDS - secondsSinceLast),
        });
      }
    }

    const code = this.otpProvider.generateCode();
    const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);
    const expiresAt = new Date(now.getTime() + OTP_TTL_SECONDS * 1000);

    const client = await this.prisma.client.findUnique({ where: { phone } });

    await this.prisma.otpCode.create({
      data: { phone, codeHash, expiresAt, clientId: client?.id },
    });

    await this.otpProvider.send(phone, code);

    return {
      ttl_seconds: OTP_TTL_SECONDS,
      resend_after_seconds: OTP_RESEND_AFTER_SECONDS,
      // Демонстрационная реализация без SMS-провайдера возвращает code в ответе (auth/models.yaml).
      code,
    };
  }

  async verifyAuthCode(
    phone: string,
    code: string,
  ): Promise<{ tokens: TokenPair; client: { id: string; name: string | null; phone: string; created_at: Date }; is_new: boolean }> {
    const now = this.clock.now();
    const otp = await this.prisma.otpCode.findFirst({
      where: { phone, consumedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new UnprocessableEntityError('Код истёк или не запрошен');
    }

    const matches = await bcrypt.compare(code, otp.codeHash);
    if (!matches) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnprocessableEntityError('Неверный код');
    }

    await this.prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: now } });

    let client = await this.prisma.client.findUnique({ where: { phone } });
    const isNew = !client;
    if (!client) {
      client = await this.prisma.client.create({ data: { phone } });
    }

    const tokens = await this.issueTokenPair(client.id);

    return {
      tokens,
      client: { id: client.id, name: client.name, phone: client.phone, created_at: client.createdAt },
      is_new: isNew,
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    const now = this.clock.now();
    const candidates = await this.prisma.refreshToken.findMany({
      where: { revokedAt: null, expiresAt: { gt: now } },
    });

    const match = await this.findMatchingToken(candidates, refreshToken);
    if (!match) {
      throw new UnauthorizedError('Refresh-токен недействителен или истёк');
    }

    await this.prisma.refreshToken.update({
      where: { id: match.id },
      data: { revokedAt: now },
    });

    return this.issueTokenPair(match.clientId);
  }

  async logout(refreshToken: string): Promise<void> {
    const now = this.clock.now();
    const candidates = await this.prisma.refreshToken.findMany({ where: { revokedAt: null } });
    const match = await this.findMatchingToken(candidates, refreshToken);
    if (match) {
      await this.prisma.refreshToken.update({ where: { id: match.id }, data: { revokedAt: now } });
    }
    // Локальная очистка на клиенте выполняется независимо от результата (LOGIC-002).
  }

  async registerPushToken(
    clientId: string,
    token: string,
    platform: 'web' | 'ios' | 'android',
  ): Promise<void> {
    await this.prisma.pushToken.upsert({
      where: { clientId_token: { clientId, token } },
      create: { clientId, token, platform },
      update: { platform },
    });
  }

  async deletePushToken(clientId: string, token: string): Promise<void> {
    await this.prisma.pushToken.deleteMany({ where: { clientId, token } });
  }

  private async issueTokenPair(clientId: string): Promise<TokenPair> {
    const now = this.clock.now();
    const accessToken = this.jwtService.sign(
      { sub: clientId, type: 'access' },
      { expiresIn: ACCESS_TTL_SECONDS },
    );

    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawRefreshToken, BCRYPT_ROUNDS);
    const expiresAt = new Date(now.getTime() + REFRESH_TTL_SECONDS * 1000);

    await this.prisma.refreshToken.create({
      data: { clientId, tokenHash, expiresAt },
    });

    return {
      access_token: accessToken,
      refresh_token: rawRefreshToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TTL_SECONDS,
    };
  }

  private async findMatchingToken<T extends { tokenHash: string }>(
    candidates: T[],
    rawToken: string,
  ): Promise<T | undefined> {
    for (const candidate of candidates) {
      if (await bcrypt.compare(rawToken, candidate.tokenHash)) {
        return candidate;
      }
    }
    return undefined;
  }
}
