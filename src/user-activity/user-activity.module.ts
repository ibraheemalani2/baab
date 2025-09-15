import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserActivityService } from './user-activity.service';
import { UserActivityController } from './user-activity.controller';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'your-super-secure-jwt-secret-key-change-in-production',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '30d' },
    }),
  ],
  controllers: [UserActivityController],
  providers: [UserActivityService, PrismaService],
  exports: [UserActivityService],
})
export class UserActivityModule {}
