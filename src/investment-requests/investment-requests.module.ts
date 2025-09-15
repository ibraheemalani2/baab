import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { InvestmentRequestsController } from './investment-requests.controller';
import { InvestmentRequestsService } from './investment-requests.service';
import { PrismaService } from '../prisma.service';
import { RedisCacheModule } from '../cache/cache.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback-secret-key',
      signOptions: { expiresIn: '30d' },
    }),
    RedisCacheModule,
    EmailModule,
  ],
  controllers: [InvestmentRequestsController],
  providers: [InvestmentRequestsService, PrismaService],
  exports: [InvestmentRequestsService],
})
export class InvestmentRequestsModule {}
