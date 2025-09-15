import { Module } from '@nestjs/common';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { PrismaService } from '../../prisma.service';
import { AuthModule } from '../../auth/auth.module';
import { RbacModule } from '../../auth/rbac/rbac.module';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService, PrismaService],
  exports: [AdminDashboardService],
})
export class AdminDashboardModule {}
