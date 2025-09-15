import {
  Controller,
  Get,
  Query,
  UseGuards,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { Permission } from '@prisma/client';
import { Role } from '../../auth/roles.enum';
import { AdminDashboardService } from './admin-dashboard.service';

@Controller('admin/dashboard')
// @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
// @Roles(Role.ADMIN)
// @RequirePermissions(Permission.VIEW_ANALYTICS)
export class AdminDashboardController {
  constructor(private adminDashboardService: AdminDashboardService) {}

  @Get('overview')
  async getOverviewStats() {
    try {
      const stats = await this.adminDashboardService.getOverviewStats();
      return {
        success: true,
        stats,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve overview statistics',
        error: error.message,
      };
    }
  }

  @Get('business-status')
  async getBusinessStatusStats() {
    try {
      const stats = await this.adminDashboardService.getBusinessStatusStats();
      return {
        success: true,
        businessStatus: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve business status statistics',
        error: error.message,
      };
    }
  }

  @Get('investment-status')
  async getInvestmentRequestStatusStats() {
    try {
      const stats =
        await this.adminDashboardService.getInvestmentRequestStatusStats();
      return {
        success: true,
        investmentRequestStatus: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve investment request status statistics',
        error: error.message,
      };
    }
  }

  @Get('monthly-activity')
  async getMonthlyActivityStats(
    @Query(
      'months',
      new ValidationPipe({ transform: true }),
      new ParseIntPipe({ optional: true }),
    )
    months?: number,
  ) {
    try {
      const stats = await this.adminDashboardService.getMonthlyActivityStats(
        months || 6,
      );
      return {
        success: true,
        monthlyActivity: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve monthly activity statistics',
        error: error.message,
      };
    }
  }

  @Get('revenue')
  async getRevenueStats(
    @Query(
      'months',
      new ValidationPipe({ transform: true }),
      new ParseIntPipe({ optional: true }),
    )
    months?: number,
  ) {
    try {
      const stats = await this.adminDashboardService.getRevenueStats(
        months || 6,
      );
      return {
        success: true,
        revenue: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve revenue statistics',
        error: error.message,
      };
    }
  }

  @Get('recent-activity')
  async getRecentActivity(
    @Query(
      'limit',
      new ValidationPipe({ transform: true }),
      new ParseIntPipe({ optional: true }),
    )
    limit?: number,
  ) {
    try {
      const activities = await this.adminDashboardService.getRecentActivity(
        limit || 10,
      );
      return {
        success: true,
        recentActivity: activities,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve recent activity',
        error: error.message,
      };
    }
  }

  @Get('top-businesses')
  async getTopBusinesses(
    @Query(
      'limit',
      new ValidationPipe({ transform: true }),
      new ParseIntPipe({ optional: true }),
    )
    limit?: number,
  ) {
    try {
      const businesses = await this.adminDashboardService.getTopBusinesses(
        limit || 5,
      );
      return {
        success: true,
        topBusinesses: businesses,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve top businesses',
        error: error.message,
      };
    }
  }

  @Get('user-growth')
  async getUserGrowthStats(
    @Query(
      'days',
      new ValidationPipe({ transform: true }),
      new ParseIntPipe({ optional: true }),
    )
    days?: number,
  ) {
    try {
      const growth = await this.adminDashboardService.getUserGrowthStats(
        days || 30,
      );
      return {
        success: true,
        userGrowth: growth,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve user growth statistics',
        error: error.message,
      };
    }
  }

  @Get('summary')
  async getDashboardSummary() {
    try {
      const [
        overview,
        businessStatus,
        investmentRequestStatus,
        recentActivity,
        topBusinesses,
      ] = await Promise.all([
        this.adminDashboardService.getOverviewStats(),
        this.adminDashboardService.getBusinessStatusStats(),
        this.adminDashboardService.getInvestmentRequestStatusStats(),
        this.adminDashboardService.getRecentActivity(5),
        this.adminDashboardService.getTopBusinesses(3),
      ]);

      return {
        success: true,
        data: {
          totalUsers: overview.users.total,
          activeUsers: overview.users.active,
          totalListings: overview.businesses.total,
          pendingListings: businessStatus.pending,
          approvedListings: businessStatus.approved,
          rejectedListings: businessStatus.rejected,
          totalInvestmentRequests: overview.investmentRequests.total,
          pendingInvestmentRequests: investmentRequestStatus.pending,
          approvedInvestmentRequests: investmentRequestStatus.approved,
          rejectedInvestmentRequests: investmentRequestStatus.rejected,
          totalRevenue: 2450000, // Mock data for now
          monthlyRevenue: 340000,
          platformCommission: 245000,
          recentListings: topBusinesses,
          recentActivity: recentActivity,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve dashboard summary',
        error: error.message,
      };
    }
  }

  @Get('stats')
  async getDashboardStats() {
    try {
      const overview = await this.adminDashboardService.getOverviewStats();
      return {
        success: true,
        data: overview,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve dashboard stats',
        error: error.message,
      };
    }
  }

  @Get('all')
  async getAllDashboardData(
    @Query(
      'months',
      new ValidationPipe({ transform: true }),
      new ParseIntPipe({ optional: true }),
    )
    months?: number,
    @Query(
      'activityLimit',
      new ValidationPipe({ transform: true }),
      new ParseIntPipe({ optional: true }),
    )
    activityLimit?: number,
    @Query(
      'topBusinessesLimit',
      new ValidationPipe({ transform: true }),
      new ParseIntPipe({ optional: true }),
    )
    topBusinessesLimit?: number,
  ) {
    try {
      const [
        overview,
        businessStatus,
        investmentRequestStatus,
        monthlyActivity,
        revenue,
        recentActivity,
        topBusinesses,
      ] = await Promise.all([
        this.adminDashboardService.getOverviewStats(),
        this.adminDashboardService.getBusinessStatusStats(),
        this.adminDashboardService.getInvestmentRequestStatusStats(),
        this.adminDashboardService.getMonthlyActivityStats(months || 6),
        this.adminDashboardService.getRevenueStats(months || 6),
        this.adminDashboardService.getRecentActivity(activityLimit || 10),
        this.adminDashboardService.getTopBusinesses(topBusinessesLimit || 5),
      ]);

      return {
        success: true,
        dashboard: {
          overview,
          businessStatus,
          investmentRequestStatus,
          monthlyActivity,
          revenue,
          recentActivity,
          topBusinesses,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve dashboard data',
        error: error.message,
      };
    }
  }
}
