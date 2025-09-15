import { Module } from '@nestjs/common';
import { AdminRolesController } from './admin-roles.controller';
import { AdminRolesService } from './admin-roles.service';
import { PrismaService } from '../../prisma.service';
import { AuthModule } from '../../auth/auth.module';
import { RbacModule } from '../../auth/rbac/rbac.module';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [AdminRolesController],
  providers: [AdminRolesService, PrismaService],
  exports: [AdminRolesService],
})
export class AdminRolesModule {}
