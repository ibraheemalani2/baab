import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { BusinessesModule } from './businesses/businesses.module';
import { InvestmentRequestsModule } from './investment-requests/investment-requests.module';
import { RedisCacheModule } from './cache/cache.module';
import { EmailModule } from './email/email.module';
import { AdminBusinessesModule } from './admin/businesses/admin-businesses.module';
import { AdminInvestmentRequestsModule } from './admin/investment-requests/admin-investment-requests.module';
import { AdminRolesModule } from './admin/roles/admin-roles.module';
import { AdminDashboardModule } from './admin/dashboard/admin-dashboard.module';
import { AdminUsersModule } from './admin/users/admin-users.module';
import { ActivityLogsModule } from './admin/activity-logs/activity-logs.module';
import { UserActivityModule } from './user-activity/user-activity.module';
import { UserSettingsModule } from './user-settings/user-settings.module';
import { UserNotificationsModule } from './user-notifications/user-notifications.module';
import { DashboardStatsModule } from './dashboard-stats/dashboard-stats.module';

@Module({
  imports: [
    RedisCacheModule,
    AuthModule,
    BusinessesModule,
    InvestmentRequestsModule,
    EmailModule,
    AdminBusinessesModule,
    AdminInvestmentRequestsModule,
    AdminRolesModule,
    AdminDashboardModule,
    AdminUsersModule,
    ActivityLogsModule,
    UserActivityModule,
    UserSettingsModule,
    UserNotificationsModule,
    DashboardStatsModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
