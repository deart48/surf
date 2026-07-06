import { Body, Controller, Delete, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentClient } from '../../common/decorators/current-client.decorator';
import { AuthService } from './auth.service';
import { RequestCodeDto } from './dto/request-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { PushTokenDto } from './dto/push-token.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** operationId: requestAuthCode — POST /auth/request-code */
  @Post('request-code')
  @HttpCode(HttpStatus.OK)
  requestAuthCode(@Body() dto: RequestCodeDto) {
    return this.authService.requestAuthCode(dto.phone);
  }

  /** operationId: verifyAuthCode — POST /auth/verify-code */
  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  verifyAuthCode(@Body() dto: VerifyCodeDto) {
    return this.authService.verifyAuthCode(dto.phone, dto.code);
  }

  /** operationId: refreshToken — POST /auth/refresh */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refresh_token);
  }

  /** operationId: logout — POST /auth/logout */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto.refresh_token);
  }

  /** operationId: registerPushToken — POST /auth/push-tokens */
  @UseGuards(JwtAuthGuard)
  @Post('push-tokens')
  @HttpCode(HttpStatus.NO_CONTENT)
  async registerPushToken(
    @CurrentClient() clientId: string,
    @Body() dto: PushTokenDto,
  ): Promise<void> {
    await this.authService.registerPushToken(clientId, dto.token, dto.platform);
  }

  /** operationId: deletePushToken — DELETE /auth/push-tokens */
  @UseGuards(JwtAuthGuard)
  @Delete('push-tokens')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePushToken(
    @CurrentClient() clientId: string,
    @Body() dto: PushTokenDto,
  ): Promise<void> {
    await this.authService.deletePushToken(clientId, dto.token);
  }
}
