import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsGuard } from '../guards/permissions.guard';
import { PrismaService } from '../../prisma.service';

@Module({
  imports: [],
  providers: [PermissionsService, PermissionsGuard, PrismaService],
  exports: [PermissionsService, PermissionsGuard],
})
export class RbacModule {}
