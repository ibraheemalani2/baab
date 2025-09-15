import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ValidationPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AdminInvestmentRequestsService } from './admin-investment-requests.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import {
  RequireInvestmentView,
  RequireInvestmentManagement,
  RequireInvestmentReview,
} from '../../auth/decorators/permissions.decorator';
import { Role } from '../../auth/roles.enum';
import { AdminInvestmentRequestQueryDto } from './dto/admin-investment-request-query.dto';
import { InvestmentRequestReviewDto } from './dto/investment-request-review.dto';

@Controller('admin/investment-requests')
export class AdminInvestmentRequestsController {
  constructor(
    private readonly adminInvestmentRequestsService: AdminInvestmentRequestsService,
  ) {}

  @Get('test')
  async testEndpoint() {
    return { success: true, message: 'Test endpoint working' };
  }

  @Get('simple')
  async getSimpleInvestmentRequests() {
    try {
      console.log('DEBUG: Testing simple database query');

      // Try a basic count first
      const count =
        await this.adminInvestmentRequestsService[
          'prisma'
        ].investmentRequest.count();
      console.log('DEBUG: Count result:', count);

      // Try a simple findMany query
      console.log('DEBUG: Testing findMany query');
      const requests = await this.adminInvestmentRequestsService[
        'prisma'
      ].investmentRequest.findMany({
        take: 2,
        select: {
          id: true,
          requestedAmount: true,
          offeredAmount: true,
          status: true,
        },
      });
      console.log('DEBUG: FindMany result length:', requests?.length);

      // Transform BigInt values manually
      const transformedRequests = requests.map((r) => ({
        ...r,
        requestedAmount:
          typeof r.requestedAmount === 'bigint'
            ? Number(r.requestedAmount)
            : r.requestedAmount,
        offeredAmount:
          typeof r.offeredAmount === 'bigint'
            ? Number(r.offeredAmount)
            : r.offeredAmount,
      }));

      return {
        success: true,
        count,
        requests: transformedRequests,
        message: 'Simple query working',
      };
    } catch (error) {
      console.error('Error in simple query:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get()
  async getAllInvestmentRequests(
    @Query(new ValidationPipe({ transform: true })) query: AdminInvestmentRequestQueryDto,
  ) {
    try {
      const result = await this.adminInvestmentRequestsService.findAll(query);
      return {
        success: true,
        investmentRequests: result.investmentRequests,
        pagination: result.pagination,
        stats: result.stats,
      };
    } catch (error) {
      console.error('Error fetching investment requests:', error);
      throw new HttpException(
        error.message || 'Failed to fetch investment requests',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  async getStats() {
    try {
      const stats = await this.adminInvestmentRequestsService.getStats();
      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error('Error fetching investment request stats:', error);
      throw new HttpException(
        error.message || 'Failed to fetch stats',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getInvestmentRequest(@Param('id') id: string) {
    try {
      const investmentRequest =
        await this.adminInvestmentRequestsService.findOne(id);
      return {
        success: true,
        investmentRequest,
      };
    } catch (error) {
      console.error('Error fetching investment request:', error);
      throw new Error('Failed to fetch investment request');
    }
  }

  @Get(':id/history')
  async getInvestmentRequestHistory(@Param('id') id: string) {
    try {
      const history = await this.adminInvestmentRequestsService.getHistory(id);
      return {
        success: true,
        history,
      };
    } catch (error) {
      console.error('Error fetching investment request history:', error);
      throw new Error('Failed to fetch history');
    }
  }

  @Patch(':id/review')
  async reviewInvestmentRequest(
    @Param('id') id: string,
    @Body(ValidationPipe) reviewData: InvestmentRequestReviewDto,
    @Body('adminId') adminId: string,
  ) {
    try {
      const investmentRequest =
        await this.adminInvestmentRequestsService.review(
          id,
          reviewData,
          adminId,
        );
      return {
        success: true,
        investmentRequest,
        message: 'Investment request reviewed successfully',
      };
    } catch (error) {
      console.error('Error reviewing investment request:', error);
      throw new Error('Failed to review investment request');
    }
  }
}
