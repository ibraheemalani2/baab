import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class DashboardStatsService {
  constructor(private prisma: PrismaService) {}

  // Helper method to convert BigInt values to numbers for JSON serialization
  private transformBusinessForJson(business: any) {
    return {
      ...business,
      price:
        typeof business.price === 'bigint'
          ? Number(business.price)
          : business.price,
      monthlyRevenue:
        typeof business.monthlyRevenue === 'bigint'
          ? Number(business.monthlyRevenue)
          : business.monthlyRevenue,
    };
  }

  // Helper method to transform investment request data
  private transformInvestmentRequestForJson(request: any) {
    return {
      ...request,
      requestedAmount:
        typeof request.requestedAmount === 'bigint'
          ? Number(request.requestedAmount)
          : request.requestedAmount,
      offeredAmount:
        typeof request.offeredAmount === 'bigint'
          ? Number(request.offeredAmount)
          : request.offeredAmount,
    };
  }

  async getUserDashboardStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [
      totalListings,
      activeListings,
      pendingListings,
      soldListings,
      totalInquiries,
      completedDeals,
      totalViews, // This would need to be tracked in a real app
    ] = await Promise.all([
      this.prisma.business.count({
        where: { ownerId: userId },
      }),
      this.prisma.business.count({
        where: { ownerId: userId, status: 'APPROVED' },
      }),
      this.prisma.business.count({
        where: { ownerId: userId, status: 'PENDING' },
      }),
      this.prisma.business.count({
        where: { ownerId: userId, status: 'SOLD' },
      }),
      this.prisma.investmentRequest.count({
        where: { businessOwnerId: userId },
      }),
      this.prisma.investmentRequest.count({
        where: { businessOwnerId: userId, status: 'COMPLETED' },
      }),
      // Mock total views - in a real app, this would be tracked
      Promise.resolve(Math.floor(Math.random() * 1000) + 100),
    ]);

    return {
      success: true,
      stats: {
        totalListings,
        activeListings,
        pendingListings,
        soldListings,
        totalInquiries,
        completedDeals,
        totalViews,
      },
    };
  }

  async getUserRecentListings(userId: string, limit: number = 5) {
    const recentListings = await this.prisma.business.findMany({
      where: { ownerId: userId },
      include: {
        _count: {
          select: {
            investmentRequests: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      success: true,
      recentListings: recentListings.map((listing) => {
        const transformed = this.transformBusinessForJson(listing);
        return {
          id: transformed.id,
          title: transformed.title,
          price: transformed.price,
          currency: transformed.currency,
          status: transformed.status,
          createdAt: transformed.createdAt,
          inquiries: listing._count.investmentRequests,
          category: transformed.category,
          city: transformed.city,
        };
      }),
    };
  }

  async generateRecentActivity(userId: string) {
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
          orderBy: { createdAt: 'desc' },
          take: 5,
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
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const activities: any[] = [];

    // Generate activities from recent businesses
    user.businesses.forEach((business, index) => {
      if (business.status === 'APPROVED') {
        activities.push({
          id: `business-${business.id}`,
          type: 'approval',
          message: `تم الموافقة على "${business.title}"`,
          time: `منذ ${index + 2} ساعات`,
          urgent: false,
          timestamp: business.verificationDate || business.updatedAt,
          metadata: {
            businessId: business.id,
            businessTitle: business.title,
          },
        });
      } else if (business.status === 'PENDING') {
        activities.push({
          id: `business-pending-${business.id}`,
          type: 'view',
          message: `تم تقديم "${business.title}" للمراجعة`,
          time: `منذ ${index + 3} ساعات`,
          urgent: false,
          timestamp: business.createdAt,
          metadata: {
            businessId: business.id,
            businessTitle: business.title,
          },
        });
      }

      // Add inquiry activity if there are investment requests
      if (business._count.investmentRequests > 0) {
        activities.push({
          id: `inquiry-${business.id}`,
          type: 'inquiry',
          message: `${business._count.investmentRequests} استفسار جديد عن "${business.title}"`,
          time: `منذ ${index + 1} ساعة`,
          urgent: business._count.investmentRequests > 2,
          timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
          metadata: {
            businessId: business.id,
            businessTitle: business.title,
            inquiryCount: business._count.investmentRequests,
          },
        });
      }
    });

    // Generate activities from investment requests
    user.investmentRequests.forEach((request, index) => {
      if (request.status === 'APPROVED') {
        const transformedRequest =
          this.transformInvestmentRequestForJson(request);
        activities.push({
          id: `investment-approved-${request.id}`,
          type: 'investment',
          message: `تم قبول طلب الاستثمار في "${request.business.title}"`,
          time: `منذ ${index + 1} يوم`,
          urgent: false,
          timestamp: request.approvalDate || request.updatedAt,
          metadata: {
            requestId: request.id,
            businessTitle: request.business.title,
            amount: transformedRequest.offeredAmount,
            currency: request.currency,
          },
        });
      }
    });

    // Add system activities if needed
    if (activities.length < 2) {
      activities.push({
        id: 'system-1',
        type: 'message',
        message: 'مرحباً بك في لوحة التحكم. ابدأ بإضافة أول مشروع لك!',
        time: 'منذ يوم واحد',
        urgent: false,
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        metadata: {
          systemMessage: true,
        },
      });
    }

    // Sort by timestamp (newest first) and limit to 5
    activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return {
      success: true,
      recentActivity: activities.slice(0, 5),
    };
  }

  async getUserDashboardSummary(userId: string) {
    const [stats, recentListings, recentActivity] = await Promise.all([
      this.getUserDashboardStats(userId),
      this.getUserRecentListings(userId, 3),
      this.generateRecentActivity(userId),
    ]);

    return {
      success: true,
      data: {
        stats: stats.stats,
        recentListings: recentListings.recentListings,
        recentActivity: recentActivity.recentActivity,
        lastUpdated: new Date(),
      },
    };
  }

  async getBusinessPerformanceMetrics(userId: string) {
    // Get business performance data
    const businesses = await this.prisma.business.findMany({
      where: { ownerId: userId },
      include: {
        _count: {
          select: {
            investmentRequests: true,
          },
        },
      },
    });

    const performanceMetrics = businesses.map((business) => {
      // Calculate days since publication
      const daysSincePublication = Math.floor(
        (new Date().getTime() - business.createdAt.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      // Mock conversion rate (in a real app, this would be calculated from actual data)
      const conversionRate =
        business._count.investmentRequests > 0
          ? (Math.random() * 0.15 + 0.05) * 100 // 5-20%
          : 0;

      return {
        businessId: business.id,
        title: business.title,
        status: business.status,
        inquiries: business._count.investmentRequests,
        daysSincePublication,
        conversionRate,
        performance:
          conversionRate > 10 ? 'high' : conversionRate > 5 ? 'medium' : 'low',
      };
    });

    return {
      success: true,
      metrics: performanceMetrics,
    };
  }

  async getMonthlyTrends(userId: string) {
    // Get data for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData = await this.prisma.business.groupBy({
      by: ['createdAt'],
      where: {
        ownerId: userId,
        createdAt: {
          gte: sixMonthsAgo,
        },
      },
      _count: {
        id: true,
      },
    });

    // Process data into monthly trends
    const trends: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const count = monthlyData.filter((item) => {
        const itemDate = new Date(item.createdAt);
        return (
          itemDate.getFullYear() === date.getFullYear() &&
          itemDate.getMonth() === date.getMonth()
        );
      }).length;

      trends.push({
        month: monthKey,
        businesses: count,
        inquiries: Math.floor(count * (Math.random() * 3 + 1)), // Mock inquiry data
      });
    }

    return {
      success: true,
      trends,
    };
  }
}
