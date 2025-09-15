import { Module } from '@nestjs/common';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { RedisCacheModule } from '../cache/cache.module';

@Module({
  imports: [AuthModule, RedisCacheModule],
  controllers: [BusinessesController],
  providers: [BusinessesService, PrismaService],
  exports: [BusinessesService],
})
export class BusinessesModule {}
