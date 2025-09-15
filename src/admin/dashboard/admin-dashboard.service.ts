import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { BusinessStatus, RequestStatus, Role } from '@prisma/client';

@Injectable()
export class AdminDashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverviewStats() {
    // Get counts for all main entities
    const [
      totalUsers,
      totalBusinesses,
      totalInvestmentRequests,
      totalAdmins,
      activeUsers,
      pendingBusinesses,
      pendingInvestmentRequests,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { role: { in: [Role.INVESTOR, Role.PROJECT_OWNER] } },
      }),
      this.prisma.business.count(),
      this.prisma.investmentRequest.count(),
      this.prisma.user.count({ where: { role: Role.ADMIN } }),
      this.prisma.user.count({
        where: {
          role: { in: [Role.INVESTOR, Role.PROJECT_OWNER] },
          updatedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
      this.prisma.business.count({
        where: { status: BusinessStatus.PENDING },
      }),
      this.prisma.investmentRequest.count({
        where: { status: RequestStatus.PENDING },
      }),
    ]);

    // Calculate total investment amount
    const totalInvestmentAmount = await this.prisma.investmentRequest.aggregate(
      {
        where: { status: RequestStatus.APPROVED },
        _sum: { offeredAmount: true },
      },
    );

    // Calculate monthly growth rates
    const lastMonthStart = new Date();
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    lastMonthStart.setDate(1);
    lastMonthStart.setHours(0, 0, 0, 0);

    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const [
      newUsersThisMonth,
      newBusinessesThisMonth,
      newInvestmentRequestsThisMonth,
    ] = await Promise.all([
      this.prisma.user.count({
        where: {
          role: { in: [Role.INVESTOR, Role.PROJECT_OWNER] },
          createdAt: { gte: thisMonthStart },
        },
      }),
      this.prisma.business.count({
        where: { createdAt: { gte: thisMonthStart } },
      }),
      this.prisma.investmentRequest.count({
        where: { createdAt: { gte: thisMonthStart } },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        newThisMonth: newUsersThisMonth,
      },
      businesses: {
        total: totalBusinesses,
        pending: pendingBusinesses,
        newThisMonth: newBusinessesThisMonth,
      },
      investmentRequests: {
        total: totalInvestmentRequests,
        pending: pendingInvestmentRequests,
        newThisMonth: newInvestmentRequestsThisMonth,
      },
      totalInvestmentAmount: totalInvestmentAmount._sum.offeredAmount || 0,
      admins: {
        total: totalAdmins,
      },
    };
  }

  async getBusinessStatusStats() {
    const businessStatusCounts = await this.prisma.business.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const statusMap = businessStatusCounts.reduce(
      (acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      },
      {} as Record<BusinessStatus, number>,
    );

    return {
      pending: statusMap[BusinessStatus.PENDING] || 0,
      approved: statusMap[BusinessStatus.APPROVED] || 0,
      rejected: statusMap[BusinessStatus.REJECTED] || 0,
      suspended: statusMap[BusinessStatus.SUSPENDED] || 0,
    };
  }

  async getInvestmentRequestStatusStats() {
    const requestStatusCounts = await this.prisma.investmentRequest.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const statusMap = requestStatusCounts.reduce(
      (acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      },
      {} as Record<RequestStatus, number>,
    );

    return {
      pending: statusMap[RequestStatus.PENDING] || 0,
      approved: statusMap[RequestStatus.APPROVED] || 0,
      rejected: statusMap[RequestStatus.REJECTED] || 0,
      withdrawn: statusMap[RequestStatus.WITHDRAWN] || 0,
      completed: statusMap[RequestStatus.COMPLETED] || 0,
    };
  }

  async getMonthlyActivityStats(months: number = 6) {
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - months);

    // Get monthly user registrations
    const monthlyUsers = await this.prisma.$queryRaw<
      Array<{ month: string; count: bigint }>
    >`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
        COUNT(*)::bigint as count
      FROM users 
      WHERE "role" IN ('INVESTOR', 'PROJECT_OWNER') AND "createdAt" >= ${monthsAgo}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
    `;

    // Get monthly business creations
    const monthlyBusinesses = await this.prisma.$queryRaw<
      Array<{ month: string; count: bigint }>
    >`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
        COUNT(*)::bigint as count
      FROM businesses 
      WHERE "createdAt" >= ${monthsAgo}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
    `;

    // Get monthly investment requests
    const monthlyInvestmentRequests = await this.prisma.$queryRaw<
      Array<{ month: string; count: bigint }>
    >`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', "requestDate"), 'YYYY-MM') as month,
        COUNT(*)::bigint as count
      FROM investment_requests 
      WHERE "requestDate" >= ${monthsAgo}
      GROUP BY DATE_TRUNC('month', "requestDate")
      ORDER BY month ASC
    `;

    // Generate month labels for the last N months
    const monthLabels: string[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      monthLabels.push(date.toISOString().slice(0, 7)); // YYYY-MM format
    }

    // Create data arrays with 0 as default for missing months
    const usersData = monthLabels.map((month) => {
      const found = monthlyUsers.find((item) => item.month === month);
      return found ? Number(found.count) : 0;
    });

    const businessesData = monthLabels.map((month) => {
      const found = monthlyBusinesses.find((item) => item.month === month);
      return found ? Number(found.count) : 0;
    });

    const investmentRequestsData = monthLabels.map((month) => {
      const found = monthlyInvestmentRequests.find(
        (item) => item.month === month,
      );
      return found ? Number(found.count) : 0;
    });

    return {
      labels: monthLabels.map((month) => {
        const date = new Date(month + '-01');
        return date.toLocaleDateString('ar-IQ', {
          year: 'numeric',
          month: 'long',
        });
      }),
      datasets: [
        {
          label: 'مستخدمين جدد',
          data: usersData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
        },
        {
          label: 'أعمال جديدة',
          data: businessesData,
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
        },
        {
          label: 'طلبات استثمار',
          data: investmentRequestsData,
          borderColor: 'rgb(245, 158, 11)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
        },
      ],
    };
  }

  async getRevenueStats(months: number = 6) {
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - months);

    // Get monthly investment amounts (approved investments)
    const monthlyRevenue = await this.prisma.$queryRaw<
      Array<{
        month: string;
        total_amount: bigint | null;
        count: bigint;
      }>
    >`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', "approvalDate"), 'YYYY-MM') as month,
        SUM("offeredAmount")::bigint as total_amount,
        COUNT(*)::bigint as count
      FROM investment_requests 
      WHERE "status" = 'APPROVED' 
        AND "approvalDate" IS NOT NULL 
        AND "approvalDate" >= ${monthsAgo}
      GROUP BY DATE_TRUNC('month', "approvalDate")
      ORDER BY month ASC
    `;

    // Generate month labels
    const monthLabels: string[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      monthLabels.push(date.toISOString().slice(0, 7));
    }

    const revenueData = monthLabels.map((month) => {
      const found = monthlyRevenue.find((item) => item.month === month);
      return found ? Number(found.total_amount || 0) : 0;
    });

    const countData = monthLabels.map((month) => {
      const found = monthlyRevenue.find((item) => item.month === month);
      return found ? Number(found.count) : 0;
    });

    return {
      labels: monthLabels.map((month) => {
        const date = new Date(month + '-01');
        return date.toLocaleDateString('ar-IQ', {
          year: 'numeric',
          month: 'long',
        });
      }),
      revenue: revenueData,
      approvedInvestments: countData,
      totalRevenue: revenueData.reduce((sum, amount) => sum + amount, 0),
    };
  }

  async getRecentActivity(limit: number = 10) {
    // Get recent businesses
    const recentBusinesses = await this.prisma.business.findMany({
      take: limit / 2,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        owner: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Get recent investment requests
    const recentInvestmentRequests =
      await this.prisma.investmentRequest.findMany({
        take: limit / 2,
        orderBy: { requestDate: 'desc' },
        select: {
          id: true,
          status: true,
          requestDate: true,
          offeredAmount: true,
          currency: true,
          business: {
            select: {
              title: true,
            },
          },
          investor: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

    // Combine and sort by date
    const businessActivities = recentBusinesses.map((business) => ({
      id: business.id,
      type: 'business' as const,
      title: `عمل جديد: ${business.title}`,
      status: business.status,
      user: business.owner.name,
      email: business.owner.email,
      date: business.createdAt,
    }));

    const investmentActivities = recentInvestmentRequests.map((request) => ({
      id: request.id,
      type: 'investment' as const,
      title: `طلب استثمار في ${request.business.title}`,
      status: request.status,
      user: request.investor.name,
      email: request.investor.email,
      amount: request.offeredAmount,
      currency: request.currency,
      date: request.requestDate,
    }));

    const allActivities = [...businessActivities, ...investmentActivities]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);

    return allActivities;
  }

  async getTopBusinesses(limit: number = 5) {
    const topBusinesses = await this.prisma.business.findMany({
      take: limit,
      where: { status: BusinessStatus.APPROVED },
      orderBy: [
        { investmentRequests: { _count: 'desc' } },
        { monthlyRevenue: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        category: true,
        city: true,
        price: true,
        currency: true,
        monthlyRevenue: true,
        _count: {
          select: {
            investmentRequests: true,
          },
        },
        owner: {
          select: {
            name: true,
          },
        },
      },
    });

    return topBusinesses.map((business) => ({
      id: business.id,
      title: business.title,
      category: business.category,
      city: business.city,
      price: business.price,
      currency: business.currency,
      monthlyRevenue: business.monthlyRevenue,
      investmentRequestsCount: business._count.investmentRequests,
      ownerName: business.owner.name,
    }));
  }

  async getUserGrowthStats(days: number = 30) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    const userGrowth = await this.prisma.$queryRaw<
      Array<{
        date: string;
        count: bigint;
      }>
    >`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*)::bigint as count
      FROM users 
      WHERE "role" IN ('INVESTOR', 'PROJECT_OWNER') AND "createdAt" >= ${daysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    return userGrowth.map((item) => ({
      date: item.date,
      count: Number(item.count),
    }));
  }
}
