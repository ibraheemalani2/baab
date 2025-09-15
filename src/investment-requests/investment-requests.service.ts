/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CacheService } from '../cache/cache.service';
import { EmailService } from '../email/email.service';
import { RequestStatus, InvestorType, Currency } from '@prisma/client';

interface CreateInvestmentRequestDto {
  businessId: string;
  investorId: string;
  businessOwnerId: string;
  requestedAmount: number;
  offeredAmount: number;
  currency?: Currency;
  message?: string;
  investorType?: InvestorType;
  previousInvestments?: number;
}

interface UpdateInvestmentRequestDto {
  status?: RequestStatus;
  offeredAmount?: number;
  message?: string;
  rejectionReason?: string;
}

interface InvestmentRequestFilters {
  status?: RequestStatus;
  investorId?: string;
  businessOwnerId?: string;
  businessId?: string;
  userRelatedRequests?: string; // User ID for requests where user is either investor or business owner
  [key: string]: unknown;
}

@Injectable()
export class InvestmentRequestsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private emailService: EmailService,
  ) {}

  // Helper method to convert BigInt values to numbers for JSON serialization
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
              typeof request.business.monthlyRevenue === 'bigint'
                ? Number(request.business.monthlyRevenue)
                : request.business.monthlyRevenue,
          }
        : request.business,
    };
  }

  async getBusinessForInvestmentRequest(businessId: string) {
    return this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, ownerId: true, title: true, status: true },
    });
  }

  async createInvestmentRequest(createDto: CreateInvestmentRequestDto) {
    // Enhanced business logic and validation
    const business = await this.prisma.business.findUnique({
      where: { id: createDto.businessId },
      select: {
        id: true,
        title: true,
        status: true,
        price: true,
        currency: true,
        ownerId: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
          },
        },
      },
    });

    if (!business) {
      throw new Error('Business not found');
    }

    if (business.status !== 'APPROVED') {
      throw new Error('Cannot invest in a business that is not approved');
    }

    if (business.ownerId === createDto.investorId) {
      throw new Error('Cannot invest in your own business');
    }

    // Check if investor already has ANY request for this business
    const existingRequest = await this.prisma.investmentRequest.findFirst({
      where: {
        businessId: createDto.businessId,
        investorId: createDto.investorId,
        // Check for ANY existing request (pending, approved, rejected)
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    if (existingRequest) {
      const statusMessage = {
        PENDING: 'لديك طلب استثمار قيد المراجعة لهذا المشروع',
        APPROVED: 'لديك استثمار موافق عليه في هذا المشروع',
        REJECTED: 'تم رفض طلب استثمارك السابق لهذا المشروع',
        COMPLETED: 'لديك استثمار مكتمل في هذا المشروع',
      };

      throw new Error(
        statusMessage[existingRequest.status] ||
          'لديك طلب استثمار موجود لهذا المشروع',
      );
    }

    // Check current funding status
    const approvedInvestments = await this.prisma.investmentRequest.findMany({
      where: {
        businessId: createDto.businessId,
        status: 'APPROVED',
      },
      select: {
        offeredAmount: true,
      },
    });

    const totalFunded = approvedInvestments.reduce(
      (sum, inv) => sum + Number(inv.offeredAmount),
      0,
    );
    const targetAmount = Number(business.price);
    const remainingAmount = targetAmount - totalFunded;

    // Check if business is already fully funded
    if (remainingAmount <= 0) {
      throw new Error(
        'This business is already fully funded. No additional investments can be accepted.',
      );
    }

    // Validate investment amounts
    if (createDto.offeredAmount <= 0) {
      throw new Error('Offered amount must be greater than 0');
    }

    if (createDto.offeredAmount < 100000) {
      // Minimum 1000 in cents
      throw new Error('Minimum investment amount is 1,000');
    }

    // Check if the offered amount would cause over-funding
    if (createDto.offeredAmount > remainingAmount) {
      const formattedRemaining =
        business.currency === 'IQD'
          ? `${remainingAmount.toLocaleString('ar-IQ')} د.ع`
          : `$${remainingAmount.toLocaleString('en-US')}`;
      throw new Error(
        `Investment amount exceeds remaining funding needed. Maximum available: ${formattedRemaining}`,
      );
    }

    // Create the investment request
    const investmentRequest = await this.prisma.investmentRequest.create({
      data: {
        ...createDto,
        currency: createDto.currency || business.currency || 'USD',
        investorType: createDto.investorType || 'INDIVIDUAL',
        previousInvestments: createDto.previousInvestments || 0,
        status: 'PENDING',
        businessOwnerId: business.ownerId,
        requestedAmount: business.price,
      },
      include: {
        business: {
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            currency: true,
            city: true,
            category: true,
          },
        },
        investor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
            businessType: true,
          },
        },
        businessOwner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
            businessType: true,
          },
        },
      },
    });

    // Send email notification to business owner
    try {
      await this.emailService.sendInvestmentRequestNotification({
        businessTitle: investmentRequest.business.title,
        businessOwnerName: investmentRequest.businessOwner.name,
        businessOwnerEmail: investmentRequest.businessOwner.email || '',
        investorName: investmentRequest.investor.name,
        investorEmail: investmentRequest.investor.email || '',
        investorPhone: investmentRequest.investor.phone,
        investorCity: investmentRequest.investor.city,
        investorType: investmentRequest.investorType,
        offeredAmount: investmentRequest.offeredAmount,
        requestedAmount: investmentRequest.requestedAmount,
        currency: investmentRequest.currency,
        message: investmentRequest.message || '',
        previousInvestments: investmentRequest.previousInvestments,
        businessId: investmentRequest.businessId,
        requestId: investmentRequest.id,
      });
    } catch (emailError) {
      // Log email error but don't fail the request creation
      console.error(
        'Failed to send investment request email notification:',
        emailError,
      );
    }

    // Invalidate related caches
    await this.cacheService.invalidateInvestmentRequests(
      createDto.investorId,
      createDto.businessId,
    );

    // Transform BigInt values to numbers for JSON serialization
    return this.transformInvestmentRequestForJson(investmentRequest);
  }

  async getInvestmentRequests(filters: InvestmentRequestFilters = {}) {
    // منع الحلقة اللا نهائية - التحقق من صحة user ID
    if (filters.userRelatedRequests !== undefined && (!filters.userRelatedRequests || filters.userRelatedRequests.trim().length === 0)) {
      return [];
    }

    // محاولة البحث 3 مرات
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`🔍 محاولة البحث رقم ${attempt} للمستخدم:`, filters.userRelatedRequests);
      
      const result = await this.performSearch(filters, attempt);
      
      if (result && result.length > 0) {
        console.log(`✅ تم العثور على ${result.length} استثمار في المحاولة ${attempt}`);
        return result;
      }
      
      console.log(`❌ لم يتم العثور على استثمارات في المحاولة ${attempt}`);
      
      if (attempt < 3) {
        // انتظار قصير بين المحاولات
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('🚫 لم يتم العثور على أي استثمارات بعد 3 محاولات');
    return [];
  }

  private async performSearch(filters: InvestmentRequestFilters, attempt: number) {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }
    
    // Handle user-related requests (user is either investor OR business owner)
    if (filters.userRelatedRequests) {
      where.OR = [
        { investorId: filters.userRelatedRequests },
        { businessOwnerId: filters.userRelatedRequests }
      ];
    } else {
      // Handle specific filters
      if (filters.investorId) {
        where.investorId = filters.investorId;
      }
      if (filters.businessOwnerId) {
        where.businessOwnerId = filters.businessOwnerId;
      }
    }
    
    if (filters.businessId) {
      where.businessId = filters.businessId;
    }

    const investmentRequests = await this.prisma.investmentRequest.findMany({
      where,
      take: 50, // حد أقصى 50 نتيجة لمنع الحلقة اللا نهائية
      include: {
        business: {
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            currency: true,
            city: true,
            category: true,
          },
        },
        investor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
            businessType: true,
          },
        },
        businessOwner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
            businessType: true,
          },
        },
      },
      orderBy: {
        requestDate: 'desc',
      },
    });

    // Calculate funding progress for each business
    const businessFundingMap = new Map<string, number>();

    // Get all unique business IDs
    const businessIds = [
      ...new Set(investmentRequests.map((req) => req.businessId)),
    ];

    // Calculate total funded amount for each business
    for (const businessId of businessIds) {
      const approvedInvestments = await this.prisma.investmentRequest.findMany({
        where: {
          businessId,
          status: 'APPROVED',
        },
        select: {
          offeredAmount: true,
        },
      });

      const totalFunded = approvedInvestments.reduce(
        (sum, inv) => sum + Number(inv.offeredAmount),
        0,
      );

      businessFundingMap.set(businessId, totalFunded);
    }

    // Enhance investment requests with funding information
    const enhancedRequests = investmentRequests.map((request) => ({
      ...request,
      business: {
        ...request.business,
        totalFunded: businessFundingMap.get(request.businessId) || 0,
        fundingProgress: Math.min(
          Math.round(
            ((businessFundingMap.get(request.businessId) || 0) /
              Number(request.business.price)) *
              100,
          ),
          100,
        ),
        isFullyFunded:
          (businessFundingMap.get(request.businessId) || 0) >=
          Number(request.business.price),
      },
    }));

    // التحقق من عدد الاستثمارات وإرجاع رسالة مناسبة إذا لم توجد
    if (!enhancedRequests || enhancedRequests.length === 0) {
      return [];
    }

    // Transform BigInt values to numbers for JSON serialization
    const transformedRequests = enhancedRequests.map((request) =>
      this.transformInvestmentRequestForJson(request),
    );

    return transformedRequests;
  }

  async getInvestmentRequestById(id: string) {
    const investmentRequest = await this.prisma.investmentRequest.findUnique({
      where: { id },
      include: {
        business: {
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            currency: true,
            city: true,
            category: true,
            images: true,
            location: true,
            established: true,
            employees: true,
            monthlyRevenue: true,
            tags: true,
          },
        },
        investor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
            businessType: true,
          },
        },
        businessOwner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
            businessType: true,
          },
        },
      },
    });

    if (!investmentRequest) {
      return null;
    }

    // Transform BigInt values to numbers for JSON serialization
    return this.transformInvestmentRequestForJson(investmentRequest);
  }

  async updateInvestmentRequest(
    id: string,
    updateDto: UpdateInvestmentRequestDto,
  ) {
    const updateData: any = { ...updateDto };

    if (updateDto.status === 'APPROVED') {
      updateData.approvalDate = new Date();
    } else if (updateDto.status === 'REJECTED') {
      updateData.rejectionDate = new Date();
    }

    const updatedRequest = await this.prisma.investmentRequest.update({
      where: { id },
      data: updateData,
      include: {
        business: {
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            currency: true,
            city: true,
            category: true,
          },
        },
        investor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
            businessType: true,
          },
        },
        businessOwner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
            businessType: true,
          },
        },
      },
    });

    // Check if business becomes fully funded when investment is approved
    if (updateDto.status === 'APPROVED') {
      const approvedInvestments = await this.prisma.investmentRequest.findMany({
        where: {
          businessId: updatedRequest.businessId,
          status: 'APPROVED',
        },
        select: {
          offeredAmount: true,
        },
      });

      const totalFunded = approvedInvestments.reduce(
        (sum, inv) => sum + Number(inv.offeredAmount),
        0,
      );
      const targetAmount = Number(updatedRequest.business.price);

      // If business is now fully funded, update status to SOLD/FUNDED
      if (totalFunded >= targetAmount) {
        await this.prisma.business.update({
          where: { id: updatedRequest.businessId },
          data: { status: 'SOLD' }, // or 'FUNDED' if you have this status
        });

        console.log(
          `✅ Business ${updatedRequest.business.title} is now fully funded and marked as SOLD`,
        );
      }
    }

    // Send status update notification to investor and business owner
    if (
      updateDto.status &&
      ['APPROVED', 'REJECTED', 'COMPLETED'].includes(updateDto.status)
    ) {
      try {
        await this.emailService.sendInvestmentStatusUpdate({
          investmentRequest: updatedRequest,
          status: updateDto.status,
          adminNotes: updateDto.message,
          rejectionReason: updateDto.rejectionReason,
        });
      } catch (emailError) {
        // Log email error but don't fail the update
        console.error(
          'Failed to send status update email notification:',
          emailError,
        );
      }
    }

    // Transform BigInt values to numbers for JSON serialization
    return this.transformInvestmentRequestForJson(updatedRequest);
  }

  async deleteInvestmentRequest(id: string) {
    return this.prisma.investmentRequest.delete({
      where: { id },
    });
  }

  async checkUserRequest(investorId: string, businessId: string) {
    const existingRequest = await this.prisma.investmentRequest.findFirst({
      where: {
        investorId,
        businessId,
        // Check for ANY existing request (pending, approved, rejected)
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        offeredAmount: true,
        approvalDate: true,
        rejectionDate: true,
        rejectionReason: true,
      },
      orderBy: {
        createdAt: 'desc', // Get the most recent request
      },
    });

    if (!existingRequest) {
      return null;
    }

    // Transform BigInt values to numbers for JSON serialization
    return {
      ...existingRequest,
      offeredAmount:
        typeof existingRequest.offeredAmount === 'bigint'
          ? Number(existingRequest.offeredAmount)
          : existingRequest.offeredAmount,
    };
  }

  async getInvestmentRequestsByInvestor(investorId: string) {
    return this.getInvestmentRequests({ userRelatedRequests: investorId });
  }

  async getInvestmentRequestsByBusinessOwner(businessOwnerId: string) {
    return this.getInvestmentRequests({ userRelatedRequests: businessOwnerId });
  }

  async getInvestmentRequestsByBusiness(businessId: string) {
    return this.getInvestmentRequests({ businessId });
  }

  async getInvestmentRequestStats(userId?: string) {
    const baseWhere = userId
      ? {
          OR: [{ investorId: userId }, { businessOwnerId: userId }],
        }
      : {};

    const totalRequests = await this.prisma.investmentRequest.count({
      where: baseWhere,
    });

    const pendingRequests = await this.prisma.investmentRequest.count({
      where: {
        ...baseWhere,
        status: 'PENDING',
      },
    });

    const approvedRequests = await this.prisma.investmentRequest.count({
      where: {
        ...baseWhere,
        status: 'APPROVED',
      },
    });

    const completedRequests = await this.prisma.investmentRequest.count({
      where: {
        ...baseWhere,
        status: 'COMPLETED',
      },
    });

    return {
      total: totalRequests,
      pending: pendingRequests,
      approved: approvedRequests,
      completed: completedRequests,
    };
  }
}
