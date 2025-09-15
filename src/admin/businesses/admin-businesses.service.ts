import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CacheService } from '../../cache/cache.service';
import { EmailService } from '../../email/email.service';
import { BusinessVerificationDto } from './dto/business-verification.dto';
import { AdminBusinessQueryDto } from './dto/admin-business-query.dto';
import { BusinessStatus } from '@prisma/client';

@Injectable()
export class AdminBusinessesService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private emailService: EmailService,
  ) {}

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

  async getBusinesses(queryDto: AdminBusinessQueryDto, adminId: string) {
    const {
      status,
      city,
      category,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
      verifiedBy,
      dateFrom,
      dateTo,
    } = queryDto;

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (city) {
      where.city = city;
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { owner: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (verifiedBy) {
      where.verifiedBy = verifiedBy;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalCount = await this.prisma.business.count({ where });

    // Fetch businesses with relations
    const businesses = await this.prisma.business.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
          },
        },
        verifier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            investmentRequests: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    });

    // Calculate statistics
    const stats = await this.getBusinessStats(adminId);

    return {
      data: businesses.map((business) =>
        this.transformBusinessForJson(business),
      ),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1,
      },
      stats,
    };
  }

  async getBusinessById(id: string, adminId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
            businessType: true,
            createdAt: true,
          },
        },
        verifier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        investmentRequests: {
          include: {
            investor: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            investmentRequests: true,
          },
        },
      },
    });

    if (!business) {
      throw new HttpException('Business not found', HttpStatus.NOT_FOUND);
    }

    return this.transformBusinessForJson(business);
  }

  async verifyBusiness(
    id: string,
    verificationDto: BusinessVerificationDto,
    adminId: string,
  ) {
    console.log('SERVICE DEBUG: verifyBusiness called with:', {
      id,
      verificationDto,
      adminId,
    });
    const { status, notes } = verificationDto;

    console.log('SERVICE DEBUG: Checking if business exists...');
    // Check if business exists
    const existingBusiness = await this.prisma.business.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    console.log(
      'SERVICE DEBUG: Found business:',
      existingBusiness?.title,
      'Status:',
      existingBusiness?.status,
    );

    if (!existingBusiness) {
      console.log('SERVICE DEBUG: Business not found');
      throw new HttpException('Business not found', HttpStatus.NOT_FOUND);
    }

    // Validate status transition
    if (existingBusiness.status === status) {
      console.log('SERVICE DEBUG: Business already has this status');
      throw new HttpException(
        `Business is already ${status.toLowerCase()}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Update business with verification details
    let businessWithVerifier: any;

    try {
      console.log('SERVICE DEBUG: Starting database update...');
      const updatedBusiness = await this.prisma.business.update({
        where: { id },
        data: {
          status: status as BusinessStatus,
          verificationNotes: notes,
          verifiedBy: adminId,
          verificationDate: new Date(),
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      console.log('SERVICE DEBUG: Database update successful');
      // Add verifier info manually for static admin
      businessWithVerifier = {
        ...updatedBusiness,
        verifier:
          adminId === 'ADMIN-001'
            ? {
                id: 'ADMIN-001',
                name: 'مدير النظام',
                email: 'ADMIN@baab.iq',
              }
            : null,
      };
      console.log('SERVICE DEBUG: Added verifier info');
    } catch (dbError) {
      console.error('SERVICE DEBUG: Database update error:', dbError);
      throw new HttpException(
        'Failed to update business verification',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Send email notification to business owner
    try {
      console.log('SERVICE DEBUG: Sending email notification...');
      await this.emailService.sendBusinessVerificationNotification({
        businessTitle: businessWithVerifier.title,
        businessOwnerName: businessWithVerifier.owner.name,
        businessOwnerEmail: businessWithVerifier.owner.email || '',
        status: status as BusinessStatus,
        notes: notes || '',
        adminName: businessWithVerifier.verifier?.name || 'Admin',
        businessId: businessWithVerifier.id,
      });
      console.log('SERVICE DEBUG: Email sent successfully');
    } catch (emailError) {
      console.error(
        'SERVICE DEBUG: Failed to send business verification notification:',
        emailError,
      );
      // Don't fail the entire operation if email fails
    }

    // Clear relevant caches
    try {
      console.log('SERVICE DEBUG: Clearing caches...');
      await this.cacheService.del('business-stats');
      await this.cacheService.del(`business-${id}`);
      console.log('SERVICE DEBUG: Caches cleared');
    } catch (cacheError) {
      console.error('SERVICE DEBUG: Cache clearing error:', cacheError);
      // Don't fail the operation if cache clearing fails
    }

    console.log('SERVICE DEBUG: Returning business data...');
    return businessWithVerifier;
  }

  async getBusinessStats(adminId: string) {
    const cacheKey = 'admin-business-stats';
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const [
      totalCount,
      pendingCount,
      approvedCount,
      rejectedCount,
      soldCount,
      fundedCount,
      suspendedCount,
      thisMonthCount,
      verificationActivity,
    ] = await Promise.all([
      this.prisma.business.count(),
      this.prisma.business.count({ where: { status: 'PENDING' } }),
      this.prisma.business.count({ where: { status: 'APPROVED' } }),
      this.prisma.business.count({ where: { status: 'REJECTED' } }),
      this.prisma.business.count({ where: { status: 'SOLD' } }),
      this.prisma.business.count({ where: { status: 'FUNDED' } }),
      this.prisma.business.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.business.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      this.prisma.business.groupBy({
        by: ['status', 'verifiedBy'],
        where: {
          verificationDate: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        _count: true,
      }),
    ]);

    const stats = {
      total: totalCount,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      sold: soldCount,
      funded: fundedCount,
      suspended: suspendedCount,
      thisMonth: thisMonthCount,
      verificationActivity,
      approvalRate:
        totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0,
      rejectionRate:
        totalCount > 0 ? Math.round((rejectedCount / totalCount) * 100) : 0,
    };

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, stats, 300);

    return stats;
  }

  async getVerificationHistory(id: string, adminId: string) {
    // This would typically come from an audit log table
    // For now, we'll return the current verification status
    const business = await this.prisma.business.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        status: true,
        verificationNotes: true,
        verificationDate: true,
        verifier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!business) {
      throw new HttpException('Business not found', HttpStatus.NOT_FOUND);
    }

    return {
      businessId: business.id,
      businessTitle: business.title,
      history: [
        {
          action: 'STATUS_CHANGE',
          status: business.status,
          notes: business.verificationNotes,
          timestamp: business.verificationDate,
          admin: business.verifier,
        },
      ].filter((item) => item.timestamp), // Only show if there's verification data
    };
  }
}
