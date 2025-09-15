import { Module } from '@nestjs/common';
import { AdminBusinessesController } from './admin-businesses.controller';
import { AdminBusinessesService } from './admin-businesses.service';
import { PrismaService } from '../../prisma.service';
import { AuthModule } from '../../auth/auth.module';
import { RedisCacheModule } from '../../cache/cache.module';
import { EmailModule } from '../../email/email.module';
import { RbacModule } from '../../auth/rbac/rbac.module';

@Module({
  imports: [AuthModule, RedisCacheModule, EmailModule],
  controllers: [AdminBusinessesController],
  providers: [AdminBusinessesService, PrismaService],
  exports: [AdminBusinessesService],
})
export class AdminBusinessesModule {}
