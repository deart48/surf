import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { ClockModule } from './infrastructure/clock/clock.module';
import { HealthController } from './modules/health/health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { ProfileModule } from './modules/profile/profile.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { SlotsModule } from './modules/slots/slots.module';
import { BookingsModule } from './modules/bookings/bookings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ClockModule,
    AuthModule,
    ProfileModule,
    CatalogModule,
    SlotsModule,
    BookingsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
