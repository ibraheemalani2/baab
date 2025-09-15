import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { EmailService } from '../../email/email.service';
import { AdminInvestmentRequestQueryDto } from './dto/admin-investment-request-query.dto';
import { InvestmentRequestReviewDto } from './dto/investment-request-review.dto';
import { RequestStatus, Prisma } from '@prisma/client';

@Injectable()
export class AdminInvestmentRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async findAll(query: AdminInvestmentRequestQueryDto) {
    console.log('DEBUG: Starting findAll with query:', query);
    try {
      const {
        search,
        status,
        investorType,
        businessCategory,
        city,
        reviewedBy,
        dateFrom,
        dateTo,
        sortBy = 'requestDate',
        sortOrder = 'desc',
        page = 1,
        limit = 10,
      } = query;

      // Build where clause
      const where: Prisma.InvestmentRequestWhereInput = {};

      // Search filter
      if (search) {
        where.OR = [
          {
            business: {
              title: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
          {
            investor: {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
          {
            message: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ];
      }

      // Status filter
      if (status) {
        where.status = status;
      }

      // Investor type filter
      if (investorType) {
        where.investorType = investorType;
      }

      // Business filters
      if (businessCategory || city) {
        const businessWhere: any = {};
        if (businessCategory) {
          businessWhere.category = businessCategory;
        }
        if (city) {
          businessWhere.city = city;
        }
        where.business = businessWhere;
      }

      // Reviewed by filter
      if (reviewedBy) {
        where.reviewedBy = reviewedBy;
      }

      // Date range filter
      if (dateFrom || dateTo) {
        where.requestDate = {};
        if (dateFrom) {
          where.requestDate.gte = new Date(dateFrom);
        }
        if (dateTo) {
          where.requestDate.lte = new Date(dateTo);
        }
      }

      // Build order by clause
      const orderBy: Prisma.InvestmentRequestOrderByWithRelationInput = {};
      if (sortBy === 'requestDate') {
        orderBy.requestDate = sortOrder;
      } else if (sortBy === 'reviewDate') {
        orderBy.reviewDate = sortOrder;
      } else if (sortBy === 'requestedAmount') {
        orderBy.requestedAmount = sortOrder;
      } else if (sortBy === 'offeredAmount') {
        orderBy.offeredAmount = sortOrder;
      } else {
        orderBy.requestDate = 'desc';
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      console.log('DEBUG: About to execute database queries');
      // Execute queries
      const [investmentRequests, totalCount] = await Promise.all([
        this.prisma.investmentRequest.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            business: {
              select: {
                id: true,
                title: true,
                category: true,
                city: true,
                price: true,
                currency: true,
                images: true,
              },
            },
            investor: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                city: true,
              },
            },
            businessOwner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            reviewer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        this.prisma.investmentRequest.count({ where }),
      ]);

      console.log(
        'DEBUG: Database queries completed, got',
        investmentRequests.length,
        'requests, total count:',
        totalCount,
      );

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      const pagination = {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext,
        hasPrev,
      };

      console.log('DEBUG: About to calculate stats');
      // Calculate stats
      const stats = await this.calculateStats(where);
      console.log('DEBUG: Stats calculated:', stats);

      console.log('DEBUG: About to transform investment requests');
      // Transform BigInt values for JSON serialization
      const transformedInvestmentRequests = investmentRequests.map((request) =>
        this.transformInvestmentRequestForJson(request),
      );
      console.log('DEBUG: Transformation completed');

      return {
        investmentRequests: transformedInvestmentRequests,
        pagination,
        stats,
      };
    } catch (error) {
      console.error('DEBUG: Error in findAll:', error);
      throw error;
    }
  }

  async findOne(id: string) {
    const investmentRequest = await this.prisma.investmentRequest.findUnique({
      where: { id },
      include: {
        business: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            city: true,
            price: true,
            currency: true,
            images: true,
            monthlyRevenue: true,
            established: true,
            employees: true,
          },
        },
        investor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
          },
        },
        businessOwner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!investmentRequest) {
      throw new NotFoundException('Investment request not found');
    }

    return this.transformInvestmentRequestForJson(investmentRequest);
  }

  async review(
    id: string,
    reviewData: InvestmentRequestReviewDto,
    adminId: string,
  ) {
    const { status, adminNotes, rejectionReason } = reviewData;

    // Get the investment request
    const existingRequest = await this.findOne(id);

    if (!existingRequest) {
      throw new NotFoundException('Investment request not found');
    }

    // Update the investment request
    const updatedRequest = await this.prisma.investmentRequest.update({
      where: { id },
      data: {
        status,
        reviewedBy: adminId,
        reviewDate: new Date(),
        adminNotes,
        rejectionReason:
          status === RequestStatus.REJECTED ? rejectionReason : null,
        approvalDate: status === RequestStatus.APPROVED ? new Date() : null,
        rejectionDate: status === RequestStatus.REJECTED ? new Date() : null,
      },
      include: {
        business: true,
        investor: true,
        businessOwner: true,
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Send notification emails
    try {
      await this.emailService.sendInvestmentStatusUpdate({
        investmentRequest: updatedRequest,
        status,
        adminNotes,
        rejectionReason,
      });
    } catch (error) {
      console.error('Failed to send investment status update email:', error);
      // Don't throw error, just log it - the review should still succeed
    }

    return this.transformInvestmentRequestForJson(updatedRequest);
  }

  async getHistory(id: string) {
    // This would typically involve a separate audit log table
    // For now, we'll just return the current request with review information
    const investmentRequest = await this.findOne(id);

    const history: Array<{
      date: Date;
      action: string;
      user: string;
      details: string;
    }> = [];

    // Add request creation event
    history.push({
      date: investmentRequest.requestDate,
      action: 'REQUEST_CREATED',
      user: investmentRequest.investor.name,
      details: `Investment request created for ${investmentRequest.business.title}`,
    });

    // Add review event if reviewed
    if (investmentRequest.reviewDate && investmentRequest.reviewer) {
      history.push({
        date: investmentRequest.reviewDate,
        action: 'REQUEST_REVIEWED',
        user: investmentRequest.reviewer.name,
        details: `Request ${investmentRequest.status.toLowerCase()}${investmentRequest.adminNotes ? ': ' + investmentRequest.adminNotes : ''}`,
      });
    }

    return history.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  async getStats() {
    console.log('DEBUG: Starting getStats method');
    try {
      const [total, pending, approved, rejected, withdrawn, completed] =
        await Promise.all([
          this.prisma.investmentRequest.count(),
          this.prisma.investmentRequest.count({
            where: { status: RequestStatus.PENDING },
          }),
          this.prisma.investmentRequest.count({
            where: { status: RequestStatus.APPROVED },
          }),
          this.prisma.investmentRequest.count({
            where: { status: RequestStatus.REJECTED },
          }),
          this.prisma.investmentRequest.count({
            where: { status: RequestStatus.WITHDRAWN },
          }),
          this.prisma.investmentRequest.count({
            where: { status: RequestStatus.COMPLETED },
          }),
        ]);

      const approvalRate =
        total > 0
          ? Math.round((approved / (approved + rejected)) * 100) || 0
          : 0;
      const rejectionRate =
        total > 0
          ? Math.round((rejected / (approved + rejected)) * 100) || 0
          : 0;

      console.log('DEBUG: Basic counts completed');

      // Calculate total investment amounts
      console.log('DEBUG: About to calculate total investment amount');
      const totalInvestmentAmount =
        await this.prisma.investmentRequest.aggregate({
          where: { status: RequestStatus.APPROVED },
          _sum: {
            offeredAmount: true,
          },
        });

      console.log(
        'DEBUG: Total investment amount result:',
        totalInvestmentAmount,
      );

      const result = {
        total,
        pending,
        approved,
        rejected,
        withdrawn,
        completed,
        approvalRate,
        rejectionRate,
        totalInvestmentAmount: totalInvestmentAmount._sum.offeredAmount
          ? Number(totalInvestmentAmount._sum.offeredAmount)
          : 0,
      };

      console.log('DEBUG: Returning result:', result);
      return result;
    } catch (error) {
      console.error('DEBUG: Error in getStats:', error);
      throw error;
    }
  }

  private async calculateStats(where: Prisma.InvestmentRequestWhereInput) {
    const [total, pending, approved, rejected] = await Promise.all([
      this.prisma.investmentRequest.count({ where }),
      this.prisma.investmentRequest.count({
        where: { ...where, status: RequestStatus.PENDING },
      }),
      this.prisma.investmentRequest.count({
        where: { ...where, status: RequestStatus.APPROVED },
      }),
      this.prisma.investmentRequest.count({
        where: { ...where, status: RequestStatus.REJECTED },
      }),
    ]);

    const approvalRate =
      total > 0 ? Math.round((approved / total) * 100) || 0 : 0;

    return {
      total,
      pending,
      approved,
      rejected,
      approvalRate,
    };
  }

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
      business: request.business
        ? {
            ...request.business,
            price:
              typeof request.business.price === 'bigint'
                ? Number(request.business.price)
                : request.business.price,
            monthlyRevenue:
              request.business.monthlyRevenue &&
              typeof request.business.monthlyRevenue === 'bigint'
                ? Number(request.business.monthlyRevenue)
                : request.business.monthlyRevenue,
          }
        : request.business,
    };
  }
}
