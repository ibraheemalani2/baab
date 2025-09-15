import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ValidationPipe,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { Role } from '../../auth/roles.enum';
import { Permission } from '@prisma/client';
import {
  ActivityLogsService,
  ActivityLogFilters,
  PaginationParams,
} from './activity-logs.service';

@Controller('admin/activity-logs')
// @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
// @Roles(Role.ADMIN)
// @RequirePermissions(Permission.VIEW_ANALYTICS)
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Get()
  async getActivityLogs(
    @Request() req,
    @Query('userId') userId?: string,
    @Query('adminId') adminId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    try {
      const filters: ActivityLogFilters = {
        userId,
        adminId,
        action,
        entityType,
        entityId,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
        search,
      };

      const pagination: PaginationParams = {
        page,
        limit,
        sortBy,
        sortOrder,
      };

      const result = await this.activityLogsService.getActivityLogs(
        filters,
        pagination,
      );
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      return {
        success: false,
        message: 'Failed to fetch activity logs',
        error: error.message,
      };
    }
  }

  @Get('entity/:entityType/:entityId')
  async getEntityActivityLogs(
    @Request() req,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    try {
      const activities = await this.activityLogsService.getEntityActivityLogs(
        entityType,
        entityId,
      );
      return {
        success: true,
        activities,
      };
    } catch (error) {
      console.error('Error fetching entity activity logs:', error);
      return {
        success: false,
        message: 'Failed to fetch entity activity logs',
        error: error.message,
      };
    }
  }

  @Get('recent')
  async getRecentActivities(
    @Request() req,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    try {
      const activities =
        await this.activityLogsService.getRecentActivities(limit);
      return {
        success: true,
        activities,
      };
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      return {
        success: false,
        message: 'Failed to fetch recent activities',
        error: error.message,
      };
    }
  }

  @Get('stats')
  async getActivityStats(
    @Request() req,
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ) {
    try {
      const stats = await this.activityLogsService.getActivityStats(days);
      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error('Error fetching activity statistics:', error);
      return {
        success: false,
        message: 'Failed to fetch activity statistics',
        error: error.message,
      };
    }
  }

  @Get('cleanup')
  @RequirePermissions(Permission.MANAGE_SETTINGS)
  async cleanupOldLogs(
    @Request() req,
    @Query('daysToKeep', new ParseIntPipe({ optional: true }))
    daysToKeep?: number,
  ) {
    try {
      const deletedCount =
        await this.activityLogsService.cleanupOldLogs(daysToKeep);
      return {
        success: true,
        message: `Successfully cleaned up ${deletedCount} old activity logs`,
        deletedCount,
      };
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
      return {
        success: false,
        message: 'Failed to cleanup old logs',
        error: error.message,
      };
    }
  }

  // Get user-specific activity logs
  @Get('user/:userId')
  async getUserActivityLogs(
    @Request() req,
    @Param('userId') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('action') action?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    try {
      const filters: ActivityLogFilters = {
        userId,
        action,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      };

      const pagination: PaginationParams = {
        page,
        limit,
      };

      const result = await this.activityLogsService.getActivityLogs(
        filters,
        pagination,
      );
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      console.error('Error fetching user activity logs:', error);
      return {
        success: false,
        message: 'Failed to fetch user activity logs',
        error: error.message,
      };
    }
  }

  // Get admin-specific activity logs
  @Get('admin/:adminId')
  async getAdminActivityLogs(
    @Request() req,
    @Param('adminId') adminId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('action') action?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    try {
      const filters: ActivityLogFilters = {
        adminId,
        action,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      };

      const pagination: PaginationParams = {
        page,
        limit,
      };

      const result = await this.activityLogsService.getActivityLogs(
        filters,
        pagination,
      );
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      console.error('Error fetching admin activity logs:', error);
      return {
        success: false,
        message: 'Failed to fetch admin activity logs',
        error: error.message,
      };
    }
  }
}
