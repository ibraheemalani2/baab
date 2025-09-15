import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  ActivityQueryDto,
  CreateActivityLogDto,
} from './dto/activity-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserActivityService {
  constructor(private prisma: PrismaService) {}

  async createActivity(
    userId: string,
    createActivityDto: CreateActivityLogDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const activity = await this.prisma.activityLog.create({
      data: {
        userId,
        action: createActivityDto.action,
        entityType: createActivityDto.entityType,
        entityId: createActivityDto.entityId,
        description: createActivityDto.description,
        metadata: createActivityDto.metadata,
        ipAddress,
        userAgent,
      },
    });

    return {
      success: true,
      activity,
    };
  }

  async findUserActivities(userId: string, query: ActivityQueryDto) {
    const {
      type,
      action,
      entityType,
      search,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sortBy = 'timestamp',
      sortOrder = 'desc',
    } = query;

    const pageNum = parseInt(page.toString(), 10);
    const limitNum = parseInt(limit.toString(), 10);
    const skip = (pageNum - 1) * limitNum;
    const take = limitNum;

    // Build where clause
    const where: Prisma.ActivityLogWhereInput = {
      userId,
      ...(action && { action: { contains: action, mode: 'insensitive' } }),
      ...(entityType && { entityType }),
      ...(search && {
        OR: [
          { description: { contains: search, mode: 'insensitive' } },
          { action: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(dateFrom &&
        dateTo && {
          timestamp: {
            gte: new Date(dateFrom),
            lte: new Date(dateTo),
          },
        }),
      ...(dateFrom &&
        !dateTo && {
          timestamp: {
            gte: new Date(dateFrom),
          },
        }),
      ...(dateTo &&
        !dateFrom && {
          timestamp: {
            lte: new Date(dateTo),
          },
        }),
    };

    // Build order by clause
    const orderBy: Prisma.ActivityLogOrderByWithRelationInput = sortBy
      ? {
          [sortBy]: sortOrder,
        }
      : { timestamp: 'desc' };

    const [activities, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy,
        skip,
        take,
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      success: true,
      activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  async getActivityStats(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    thisWeek.setHours(0, 0, 0, 0);

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const [totalActivities, todayActivities, weekActivities, monthActivities] =
      await Promise.all([
        this.prisma.activityLog.count({
          where: { userId },
        }),
        this.prisma.activityLog.count({
          where: {
            userId,
            timestamp: { gte: today },
          },
        }),
        this.prisma.activityLog.count({
          where: {
            userId,
            timestamp: { gte: thisWeek },
          },
        }),
        this.prisma.activityLog.count({
          where: {
            userId,
            timestamp: { gte: thisMonth },
          },
        }),
      ]);

    // Get activity breakdown by type
    const activityBreakdown = await this.prisma.activityLog.groupBy({
      by: ['action'],
      where: { userId },
      _count: {
        action: true,
      },
      orderBy: {
        _count: {
          action: 'desc',
        },
      },
      take: 10,
    });

    return {
      success: true,
      stats: {
        totalActivities,
        todayActivities,
        weekActivities,
        monthActivities,
        activityBreakdown: activityBreakdown.map((item) => ({
          action: item.action,
          count: item._count.action,
        })),
      },
    };
  }

  async generateUserActivitySummary(userId: string) {
    // Generate activities based on user's data
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        businesses: {
          include: {
            _count: {
              select: {
                investmentRequests: true,
              },
            },
          },
        },
        investmentRequests: true,
        notifications: {
          take: 5,
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const activities: any[] = [];

    // Generate activities from business data
    user.businesses.forEach((business, index) => {
      if (business.status === 'APPROVED') {
        activities.push({
          id: `business-${business.id}`,
          type: 'APPROVAL',
          action: 'BUSINESS_APPROVED',
          description: `تم اعتماد مشروع "${business.title}" ونشره على المنصة`,
          entityType: 'Business',
          entityId: business.id,
          timestamp: business.verificationDate || business.updatedAt,
          metadata: {
            businessTitle: business.title,
            category: business.category,
          },
        });
      } else if (business.status === 'PENDING') {
        activities.push({
          id: `business-pending-${business.id}`,
          type: 'LISTING',
          action: 'BUSINESS_CREATED',
          description: `تم تقديم مشروع "${business.title}" للمراجعة`,
          entityType: 'Business',
          entityId: business.id,
          timestamp: business.createdAt,
          metadata: {
            businessTitle: business.title,
            category: business.category,
          },
        });
      }

      // Add inquiry activities
      if (business._count.investmentRequests > 0) {
        activities.push({
          id: `inquiry-${business.id}`,
          type: 'INQUIRY',
          action: 'INVESTMENT_INQUIRIES_RECEIVED',
          description: `تلقيت ${business._count.investmentRequests} استفسار حول "${business.title}"`,
          entityType: 'Business',
          entityId: business.id,
          timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Random time within last 24h
          metadata: {
            businessTitle: business.title,
            inquiryCount: business._count.investmentRequests,
          },
        });
      }
    });

    // Generate activities from investment requests
    user.investmentRequests.forEach((request, index) => {
      if (request.status === 'APPROVED') {
        activities.push({
          id: `investment-approved-${request.id}`,
          type: 'INVESTMENT',
          action: 'INVESTMENT_APPROVED',
          description: `تم قبول طلب الاستثمار بقيمة ${request.offeredAmount} ${request.currency}`,
          entityType: 'InvestmentRequest',
          entityId: request.id,
          timestamp: request.approvalDate || request.updatedAt,
          metadata: {
            amount: request.offeredAmount,
            currency: request.currency,
            businessId: request.businessId,
          },
        });
      } else if (request.status === 'PENDING') {
        activities.push({
          id: `investment-pending-${request.id}`,
          type: 'INVESTMENT',
          action: 'INVESTMENT_REQUEST_SENT',
          description: `تم إرسال طلب استثمار بقيمة ${request.offeredAmount} ${request.currency}`,
          entityType: 'InvestmentRequest',
          entityId: request.id,
          timestamp: request.createdAt,
          metadata: {
            amount: request.offeredAmount,
            currency: request.currency,
            businessId: request.businessId,
          },
        });
      }
    });

    // Add system activities
    activities.push({
      id: 'system-login',
      type: 'SYSTEM',
      action: 'USER_LOGIN',
      description: 'تسجيل دخول إلى النظام',
      entityType: 'User',
      entityId: userId,
      timestamp: new Date(),
      metadata: {
        userName: user.name,
      },
    });

    // Sort activities by timestamp (newest first)
    activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return {
      success: true,
      activities: activities.slice(0, 20), // Return latest 20 activities
    };
  }

  // Helper method to log common activities
  async logActivity(
    userId: string,
    action: string,
    description: string,
    entityType?: string,
    entityId?: string,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.createActivity(
      userId,
      {
        action,
        description,
        entityType,
        entityId,
        metadata,
      },
      ipAddress,
      userAgent,
    );
  }
}
