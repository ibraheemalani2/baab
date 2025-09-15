/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '@prisma/client';

export interface LogActivityParams {
  userId?: string;
  adminId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  description: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

export interface ActivityLogFilters {
  userId?: string;
  adminId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class ActivityLogsService {
  constructor(private readonly prisma: PrismaService) {}

  // Log a new activity
  async logActivity(params: LogActivityParams): Promise<unknown> {
    try {
      const activityLog = await (this.prisma as any).activityLog.create({
        data: {
          userId: params.userId,
          adminId: params.adminId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          description: params.description,
          metadata: params.metadata || undefined,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });

      return activityLog;
    } catch (error) {
      // Log the error but don't throw - activity logging should not break the main flow
      console.error('Failed to log activity:', error);
      return null;
    }
  }

  // Get activity logs with filters and pagination
  async getActivityLogs(
    filters: ActivityLogFilters = {},
    pagination: PaginationParams = {},
  ) {
    const where: any = {};

    // Build filters
    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.adminId) {
      where.adminId = filters.adminId;
    }

    if (filters.action) {
      where.action = { contains: filters.action, mode: 'insensitive' };
    }

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.search) {
      where.OR = [
        { action: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { entityType: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.dateFrom || filters.dateTo) {
      where.timestamp = {};
      if (filters.dateFrom) {
        where.timestamp.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.timestamp.lte = filters.dateTo;
      }
    }

    // Pagination
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(100, Math.max(1, pagination.limit || 20));
    const skip = (page - 1) * limit;

    // Sorting
    const { sortBy = 'timestamp', sortOrder = 'desc' } = pagination;
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [activities, totalCount] = await Promise.all([
      (this.prisma as any).activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              adminRole: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      (this.prisma as any).activityLog.count({ where }),
    ]);

    return {
      activities,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  // Get activity logs for a specific entity
  async getEntityActivityLogs(
    entityType: string,
    entityId: string,
  ): Promise<unknown[]> {
    return (this.prisma as any).activityLog.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            adminRole: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  // Get recent activities (for dashboard)
  async getRecentActivities(limit: number = 20): Promise<unknown[]> {
    return (this.prisma as any).activityLog.findMany({
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            adminRole: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  // Get activity statistics
  async getActivityStats(days: number = 30) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    const [
      totalActivities,
      recentActivities,
      topActions,
      adminActivities,
      userActivities,
    ] = await Promise.all([
      (this.prisma as any).activityLog.count(),
      (this.prisma as any).activityLog.count({
        where: {
          timestamp: { gte: daysAgo },
        },
      }),
      (this.prisma as any).activityLog.groupBy({
        by: ['action'],
        _count: { action: true },
        where: {
          timestamp: { gte: daysAgo },
        },
        orderBy: {
          _count: { action: 'desc' },
        },
        take: 10,
      }),
      (this.prisma as any).activityLog.count({
        where: {
          adminId: { not: null },
          timestamp: { gte: daysAgo },
        },
      }),
      (this.prisma as any).activityLog.count({
        where: {
          userId: { not: null },
          adminId: null,
          timestamp: { gte: daysAgo },
        },
      }),
    ]);

    // Get daily activity counts for the chart
    const dailyActivities = await this.prisma.$queryRaw<
      Array<{
        date: string;
        count: bigint;
      }>
    >`
      SELECT 
        DATE("timestamp") as date,
        COUNT(*)::bigint as count
      FROM activity_logs 
      WHERE "timestamp" >= ${daysAgo}
      GROUP BY DATE("timestamp")
      ORDER BY date ASC
    `;

    return {
      overview: {
        totalActivities,
        recentActivities,
        adminActivities,
        userActivities,
      },
      topActions: topActions.map((item) => ({
        action: item.action,
        count: item._count.action,
      })),
      dailyActivity: dailyActivities.map((item) => ({
        date: item.date,
        count: Number(item.count),
      })),
    };
  }

  // Clean up old activity logs (for maintenance)
  async cleanupOldLogs(daysToKeep: number = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deleted = await (this.prisma as any).activityLog.deleteMany({
      where: {
        timestamp: { lt: cutoffDate },
      },
    });

    return deleted.count;
  }

  // Pre-defined activity logging methods for common actions
  async logUserLogin(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<unknown> {
    return this.logActivity({
      userId,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: userId,
      description: 'User logged in to the system',
      ipAddress,
      userAgent,
    });
  }

  async logUserRegistration(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<unknown> {
    return this.logActivity({
      userId,
      action: 'USER_REGISTRATION',
      entityType: 'User',
      entityId: userId,
      description: 'New user registered in the system',
      ipAddress,
      userAgent,
    });
  }

  async logBusinessCreated(
    businessId: string,
    userId: string,
    businessTitle: string,
  ): Promise<unknown> {
    return this.logActivity({
      userId,
      action: 'BUSINESS_CREATED',
      entityType: 'Business',
      entityId: businessId,
      description: `User created new business: ${businessTitle}`,
    });
  }

  async logBusinessVerified(
    businessId: string,
    adminId: string,
    status: string,
    businessTitle: string,
  ): Promise<unknown> {
    return this.logActivity({
      adminId,
      action: 'BUSINESS_VERIFIED',
      entityType: 'Business',
      entityId: businessId,
      description: `Admin ${status.toLowerCase()} business: ${businessTitle}`,
      metadata: { newStatus: status },
    });
  }

  async logInvestmentRequest(
    requestId: string,
    userId: string,
    businessTitle: string,
    amount: number,
  ): Promise<unknown> {
    return this.logActivity({
      userId,
      action: 'INVESTMENT_REQUEST_CREATED',
      entityType: 'InvestmentRequest',
      entityId: requestId,
      description: `User created investment request for ${businessTitle}`,
      metadata: { amount, businessTitle },
    });
  }

  async logInvestmentReview(
    requestId: string,
    adminId: string,
    status: string,
    businessTitle: string,
  ): Promise<unknown> {
    return this.logActivity({
      adminId,
      action: 'INVESTMENT_REQUEST_REVIEWED',
      entityType: 'InvestmentRequest',
      entityId: requestId,
      description: `Admin ${status.toLowerCase()} investment request for ${businessTitle}`,
      metadata: { newStatus: status },
    });
  }

  async logRoleUpdate(
    targetUserId: string,
    adminId: string,
    oldRole: string,
    newRole: string,
    targetUserName: string,
  ): Promise<unknown> {
    return this.logActivity({
      adminId,
      action: 'USER_ROLE_UPDATED',
      entityType: 'User',
      entityId: targetUserId,
      description: `Admin updated user ${targetUserName} role from ${oldRole} to ${newRole}`,
      metadata: { oldRole, newRole },
    });
  }

  async logPermissionUpdate(
    targetUserId: string,
    adminId: string,
    permissions: string[],
    targetUserName: string,
  ): Promise<unknown> {
    return this.logActivity({
      adminId,
      action: 'USER_PERMISSIONS_UPDATED',
      entityType: 'User',
      entityId: targetUserId,
      description: `Admin updated permissions for user ${targetUserName}`,
      metadata: { newPermissions: permissions },
    });
  }

  async logUserStatusUpdate(
    targetUserId: string,
    adminId: string,
    updates: Prisma.InputJsonValue,
    targetUserName: string,
  ): Promise<unknown> {
    return this.logActivity({
      adminId,
      action: 'USER_STATUS_UPDATED',
      entityType: 'User',
      entityId: targetUserId,
      description: `Admin updated status for user ${targetUserName}`,
      metadata: { updates },
    });
  }
}
