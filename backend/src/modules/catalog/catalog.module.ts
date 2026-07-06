import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret' })],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
