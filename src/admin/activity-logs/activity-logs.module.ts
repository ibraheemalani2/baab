import { Module } from '@nestjs/common';
import { ActivityLogsController } from './activity-logs.controller';
import { ActivityLogsService } from './activity-logs.service';
import { PrismaService } from '../../prisma.service';
import { AuthModule } from '../../auth/auth.module';
import { RbacModule } from '../../auth/rbac/rbac.module';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [ActivityLogsController],
  providers: [ActivityLogsService, PrismaService],
  exports: [ActivityLogsService],
})
export class ActivityLogsModule {}
