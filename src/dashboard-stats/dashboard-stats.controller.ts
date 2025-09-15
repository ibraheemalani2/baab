import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { DashboardStatsService } from './dashboard-stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('dashboard-stats')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
@Controller('dashboard-stats')
export class DashboardStatsController {
  constructor(private readonly dashboardStatsService: DashboardStatsService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Get complete dashboard summary',
    description:
      'Returns stats, recent listings, and recent activity in one call',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard summary retrieved successfully',
  })
  async getDashboardSummary(@Request() req) {
    return this.dashboardStatsService.getUserDashboardSummary('default-user'); // Default since auth disabled);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
  })
  async getStats(@Request() req) {
    return this.dashboardStatsService.getUserDashboardStats('default-user'); // Default since auth disabled);
  }

  @Get('recent-listings')
  @ApiOperation({ summary: 'Get user recent business listings' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'Number of listings to return',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent listings retrieved successfully',
  })
  async getRecentListings(@Request() req, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    return this.dashboardStatsService.getUserRecentListings(
      'default-user', // Default since auth disabled,
      limitNum,
    );
  }

  @Get('recent-activity')
  @ApiOperation({
    summary: 'Generate recent activity from user data',
    description:
      'Creates activity feed based on user businesses and investment requests',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent activity generated successfully',
  })
  async getRecentActivity(@Request() req) {
    return this.dashboardStatsService.generateRecentActivity('default-user'); // Default since auth disabled);
  }

  @Get('business-performance')
  @ApiOperation({
    summary: 'Get business performance metrics',
    description: 'Returns performance data for all user businesses',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance metrics retrieved successfully',
  })
  async getBusinessPerformance(@Request() req) {
    return this.dashboardStatsService.getBusinessPerformanceMetrics(
      'default-user' // Default since auth disabled,
    );
  }

  @Get('monthly-trends')
  @ApiOperation({
    summary: 'Get monthly trends data',
    description: 'Returns business and inquiry trends for the last 6 months',
  })
  @ApiResponse({
    status: 200,
    description: 'Monthly trends retrieved successfully',
  })
  async getMonthlyTrends(@Request() req) {
    return this.dashboardStatsService.getMonthlyTrends('default-user'); // Default since auth disabled);
  }
}
