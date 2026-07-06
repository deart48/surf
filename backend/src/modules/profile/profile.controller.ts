import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentClient } from '../../common/decorators/current-client.decorator';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /** operationId: getProfile — GET /profile (NFR-8: только свой профиль, clientId из JWT) */
  @Get()
  getProfile(@CurrentClient() clientId: string) {
    return this.profileService.getProfile(clientId);
  }

  /** operationId: updateProfile — PATCH /profile */
  @Patch()
  updateProfile(@CurrentClient() clientId: string, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateProfile(clientId, dto.name);
  }
}
