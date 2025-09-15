import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  NotificationQueryDto,
  UpdateNotificationDto,
  CreateNotificationDto,
  NotificationType,
  NotificationPriority,
} from './dto/notification-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserNotificationsService {
  constructor(private prisma: PrismaService) {}

  async createNotification(
    userId: string,
    createNotificationDto: CreateNotificationDto,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        ...createNotificationDto,
      },
    });

    return {
      success: true,
      notification,
    };
  }

  async findUserNotifications(userId: string, query: NotificationQueryDto) {
    const {
      type,
      priority,
      read,
      search,
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
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(type && { type }),
      ...(priority && { priority }),
      ...(read !== undefined && { read }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { message: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Build order by clause
    const orderBy: Prisma.NotificationOrderByWithRelationInput = sortBy
      ? {
          [sortBy]: sortOrder,
        }
      : { timestamp: 'desc' };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      success: true,
      notifications,
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

  async findOne(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      include: {
        business: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    // Check if user owns this notification
    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view this notification',
      );
    }

    return {
      success: true,
      notification,
    };
  }

  async updateNotification(
    id: string,
    userId: string,
    updateNotificationDto: UpdateNotificationDto,
  ) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    // Check if user owns this notification
    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this notification',
      );
    }

    const updatedNotification = await this.prisma.notification.update({
      where: { id },
      data: {
        ...updateNotificationDto,
        ...(updateNotificationDto.read &&
          !notification.readAt && { readAt: new Date() }),
      },
    });

    return {
      success: true,
      notification: updatedNotification,
    };
  }

  async deleteNotification(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    // Check if user owns this notification
    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this notification',
      );
    }

    await this.prisma.notification.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Notification deleted successfully',
    };
  }

  async getNotificationStats(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [unreadCount, totalCount, todayCount, highPriorityCount] =
      await Promise.all([
        this.prisma.notification.count({
          where: {
            userId,
            read: false,
          },
        }),
        this.prisma.notification.count({
          where: { userId },
        }),
        this.prisma.notification.count({
          where: {
            userId,
            timestamp: { gte: today },
          },
        }),
        this.prisma.notification.count({
          where: {
            userId,
            priority: 'HIGH',
            read: false,
          },
        }),
      ]);

    // Get notification breakdown by type
    const typeBreakdown = await this.prisma.notification.groupBy({
      by: ['type'],
      where: { userId },
      _count: {
        type: true,
      },
      orderBy: {
        _count: {
          type: 'desc',
        },
      },
    });

    return {
      success: true,
      stats: {
        unreadCount,
        totalCount,
        todayCount,
        highPriorityCount,
        typeBreakdown: typeBreakdown.map((item) => ({
          type: item.type,
          count: item._count.type,
        })),
      },
    };
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }

  async deleteAllRead(userId: string) {
    await this.prisma.notification.deleteMany({
      where: {
        userId,
        read: true,
      },
    });

    return {
      success: true,
      message: 'All read notifications deleted',
    };
  }

  async generateUserNotifications(userId: string) {
    // Generate notifications based on user's data
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
        investmentRequests: {
          include: {
            business: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const notifications: any[] = [];

    // Generate notifications from investment requests
    user.investmentRequests.forEach((request) => {
      if (request.status === 'PENDING') {
        notifications.push({
          userId,
          type: NotificationType.INVESTMENT_REQUEST,
          title: 'طلب استثمار جديد',
          message: `تلقيت طلب استثمار بقيمة $${request.offeredAmount.toLocaleString()} للمشروع "${request.business.title}"`,
          priority: NotificationPriority.HIGH,
          actionUrl: '/dashboard/investment-requests',
          businessId: request.businessId,
          investmentRequestId: request.id,
          metadata: {
            businessTitle: request.business.title,
            amount: request.offeredAmount,
            currency: request.currency,
            investorId: request.investorId,
          },
        });
      }
    });

    // Generate notifications from business status changes
    user.businesses.forEach((business) => {
      if (business.status === 'APPROVED') {
        notifications.push({
          userId,
          type: NotificationType.BUSINESS_APPROVED,
          title: 'تم اعتماد مشروعك',
          message: `تم اعتماد مشروع "${business.title}" ونشره على المنصة. يمكن للمستثمرين الآن مشاهدته وتقديم طلبات الاستثمار.`,
          priority: NotificationPriority.MEDIUM,
          actionUrl: `/business/${business.id}`,
          businessId: business.id,
          metadata: {
            businessTitle: business.title,
          },
        });
      }

      // Notification for new inquiries
      if (business._count.investmentRequests > 0) {
        notifications.push({
          userId,
          type: NotificationType.INVESTMENT_REQUEST,
          title: 'استفسارات جديدة',
          message: `تلقيت ${business._count.investmentRequests} استفسار جديد حول مشروع "${business.title}"`,
          priority: NotificationPriority.MEDIUM,
          actionUrl: '/dashboard/investment-requests',
          businessId: business.id,
          metadata: {
            businessTitle: business.title,
            inquiryCount: business._count.investmentRequests,
          },
        });
      }
    });

    // Add system notifications
    if (notifications.length < 2) {
      notifications.push({
        userId,
        type: NotificationType.SYSTEM_MAINTENANCE,
        title: 'مرحباً بك في باب',
        message:
          'نرحب بك في منصة باب للاستثمار والأعمال. نتمنى لك تجربة ممتعة ومثمرة.',
        priority: NotificationPriority.LOW,
        actionUrl: '/dashboard',
        metadata: {
          welcomeMessage: true,
        },
      });
    }

    // Sort notifications by priority and limit to 20
    const priorityOrder = {
      [NotificationPriority.URGENT]: 4,
      [NotificationPriority.HIGH]: 3,
      [NotificationPriority.MEDIUM]: 2,
      [NotificationPriority.LOW]: 1,
    };
    notifications.sort(
      (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority],
    );

    return {
      success: true,
      notifications: notifications.slice(0, 20),
    };
  }

  // Helper method to create notifications for specific events
  async createBusinessApprovedNotification(
    userId: string,
    businessId: string,
    businessTitle: string,
  ) {
    return this.createNotification(userId, {
      type: NotificationType.BUSINESS_APPROVED,
      title: 'تم اعتماد مشروعك',
      message: `تم اعتماد مشروع "${businessTitle}" ونشره على المنصة`,
      priority: NotificationPriority.MEDIUM,
      actionUrl: `/business/${businessId}`,
      businessId,
      metadata: {
        businessTitle,
      },
    });
  }

  async createInvestmentRequestNotification(
    userId: string,
    businessId: string,
    businessTitle: string,
    amount: number,
    currency: string,
  ) {
    return this.createNotification(userId, {
      type: NotificationType.INVESTMENT_REQUEST,
      title: 'طلب استثمار جديد',
      message: `تلقيت طلب استثمار بقيمة ${amount} ${currency} للمشروع "${businessTitle}"`,
      priority: NotificationPriority.HIGH,
      actionUrl: '/dashboard/investment-requests',
      businessId,
      metadata: {
        businessTitle,
        amount,
        currency,
      },
    });
  }

  async createNewMessageNotification(
    userId: string,
    senderName: string,
    subject: string,
    messageId: string,
  ) {
    return this.createNotification(userId, {
      type: NotificationType.NEW_MESSAGE,
      title: 'رسالة جديدة',
      message: `تلقيت رسالة جديدة من ${senderName}`,
      priority: NotificationPriority.MEDIUM,
      actionUrl: '/dashboard/messages',
      metadata: {
        messageId,
        senderName,
        subject,
      },
    });
  }
}
