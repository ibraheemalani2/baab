import { Module } from '@nestjs/common';
import { AdminInvestmentRequestsController } from './admin-investment-requests.controller';
import { AdminInvestmentRequestsService } from './admin-investment-requests.service';
import { PrismaService } from '../../prisma.service';
import { AuthModule } from '../../auth/auth.module';
import { EmailModule } from '../../email/email.module';
import { RbacModule } from '../../auth/rbac/rbac.module';

@Module({
  imports: [AuthModule, EmailModule],
  controllers: [AdminInvestmentRequestsController],
  providers: [AdminInvestmentRequestsService, PrismaService],
  exports: [AdminInvestmentRequestsService],
})
export class AdminInvestmentRequestsModule {}
