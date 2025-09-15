/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  UseGuards,
  Request,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { InvestmentRequestsService } from './investment-requests.service';
import { RequestStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';
import { CreateInvestmentRequestDto } from './dto/create-investment-request.dto';
import { UpdateInvestmentRequestDto } from './dto/update-investment-request.dto';
import { InvestmentRequestQueryDto } from './dto/investment-request-query.dto';

@Controller('investment-requests')
export class InvestmentRequestsController {
  constructor(private investmentRequestsService: InvestmentRequestsService) {}

  @Post()
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.INVESTOR) // Only investors can create investment requests
  @UsePipes(new ValidationPipe({ transform: true }))
  async createInvestmentRequest(
    @Body() createDto: CreateInvestmentRequestDto,
    @Request() req,
  ) {
    try {
      // Prevent ADMIN users from creating investment requests
      // if (req.user.role === 'ADMIN') {
      //   throw new HttpException(
      //     'Admin users cannot create investment requests',
      //     HttpStatus.FORBIDDEN,
      //   );
      // }

      // Add investor ID from authenticated user and fetch business owner
      const business =
        await this.investmentRequestsService.getBusinessForInvestmentRequest(
          createDto.businessId,
        );
      if (!business) {
        throw new HttpException('Business not found', HttpStatus.NOT_FOUND);
      }

      const requestData = {
        ...createDto,
        investorId: createDto.investorId || 'default-investor', // Use from DTO or default
        businessOwnerId: business.ownerId,
      };

      const investmentRequest =
        await this.investmentRequestsService.createInvestmentRequest(
          requestData,
        );
      return {
        success: true,
        investmentRequest,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create investment request',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.INVESTOR, Role.PROJECT_OWNER, Role.ADMIN)
  @UsePipes(new ValidationPipe({ transform: true }))
  async getInvestmentRequests(
    @Query() queryDto: InvestmentRequestQueryDto,
    @Request() req,
  ) {
    const filters: any = {};

    // If user is not ADMIN, they can only see their own requests
    // if (req.user.role !== 'ADMIN') {
    //   // User can see requests where they are EITHER investor OR business owner
    //   filters.userRelatedRequests = req.user.id;
    // } else {
      // Admin can filter by any user - now available to all
      if (queryDto.status) filters.status = queryDto.status;
      if (queryDto.investorId) filters.investorId = queryDto.investorId;
      if (queryDto.businessOwnerId)
        filters.businessOwnerId = queryDto.businessOwnerId;
      if (queryDto.businessId) filters.businessId = queryDto.businessId;
    // }

    const investmentRequests =
      await this.investmentRequestsService.getInvestmentRequests(filters);
    
    // التحقق من عدد الاستثمارات وإرجاع رسالة مناسبة
    if (!investmentRequests || investmentRequests.length === 0) {
      return {
        success: true,
        message: 'ماكو استثمارات',
        count: 0,
        investmentRequests: [],
      };
    }

    return {
      success: true,
      count: investmentRequests.length,
      investmentRequests,
    };
  }

  @Get('stats')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.INVESTOR, Role.PROJECT_OWNER, Role.ADMIN)
  async getInvestmentRequestStats(@Request() req) {
    const userId = undefined; // Show all stats - no user filtering
    const stats =
      await this.investmentRequestsService.getInvestmentRequestStats(userId);
    return {
      success: true,
      stats,
    };
  }

  @Get('investor/:investorId')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.INVESTOR, Role.PROJECT_OWNER, Role.ADMIN)
  async getInvestmentRequestsByInvestor(
    @Param('investorId') investorId: string,
    @Request() req,
  ) {
    // Users can only see their own investment requests
    // if (req.user.role !== 'ADMIN' && req.user.id !== investorId) {
    //   throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    // }

    const investmentRequests =
      await this.investmentRequestsService.getInvestmentRequestsByInvestor(
        investorId,
      );
    
    // التحقق من عدد الاستثمارات وإرجاع رسالة مناسبة
    if (!investmentRequests || investmentRequests.length === 0) {
      return {
        success: true,
        message: 'ماكو استثمارات',
        count: 0,
        investmentRequests: [],
      };
    }

    return {
      success: true,
      count: investmentRequests.length,
      investmentRequests,
    };
  }

  @Get('business-owner/:businessOwnerId')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.INVESTOR, Role.PROJECT_OWNER, Role.ADMIN)
  async getInvestmentRequestsByBusinessOwner(
    @Param('businessOwnerId') businessOwnerId: string,
    @Request() req,
  ) {
    // Users can only see requests for their own businesses
    // if (req.user.role !== 'ADMIN' && req.user.id !== businessOwnerId) {
    //   throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    // }

    const investmentRequests =
      await this.investmentRequestsService.getInvestmentRequestsByBusinessOwner(
        businessOwnerId,
      );
    
    // التحقق من عدد الاستثمارات وإرجاع رسالة مناسبة
    if (!investmentRequests || investmentRequests.length === 0) {
      return {
        success: true,
        message: 'ماكو استثمارات',
        count: 0,
        investmentRequests: [],
      };
    }

    return {
      success: true,
      count: investmentRequests.length,
      investmentRequests,
    };
  }

  @Get('business/:businessId')
  async getInvestmentRequestsByBusiness(
    @Param('businessId') businessId: string,
  ) {
    const investmentRequests =
      await this.investmentRequestsService.getInvestmentRequestsByBusiness(
        businessId,
      );
    return {
      success: true,
      investmentRequests,
    };
  }

  @Get(':id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.INVESTOR, Role.PROJECT_OWNER, Role.ADMIN)
  async getInvestmentRequestById(@Param('id') id: string, @Request() req) {
    const investmentRequest =
      await this.investmentRequestsService.getInvestmentRequestById(id);

    if (!investmentRequest) {
      throw new HttpException(
        'Investment request not found',
        HttpStatus.NOT_FOUND,
      );
    }

    // Users can only see their own investment requests or requests for their businesses
    // if (
    //   req.user.role !== 'ADMIN' &&
    //   req.user.id !== investmentRequest.investorId &&
    //   req.user.id !== investmentRequest.businessOwnerId
    // ) {
    //   throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    // }

    return {
      success: true,
      investmentRequest,
    };
  }

  @Put(':id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.INVESTOR, Role.PROJECT_OWNER, Role.ADMIN)
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateInvestmentRequest(
    @Param('id') id: string,
    @Body() updateDto: UpdateInvestmentRequestDto,
    @Request() req,
  ) {
    try {
      const existingRequest =
        await this.investmentRequestsService.getInvestmentRequestById(id);

      if (!existingRequest) {
        throw new HttpException(
          'Investment request not found',
          HttpStatus.NOT_FOUND,
        );
      }

      // Users can only update their own investment requests or requests for their businesses
      // if (
      //   req.user.role !== 'ADMIN' &&
      //   req.user.id !== existingRequest.investorId &&
      //   req.user.id !== existingRequest.businessOwnerId
      // ) {
      //   throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      // }

      const investmentRequest =
        await this.investmentRequestsService.updateInvestmentRequest(
          id,
          updateDto,
        );
      return {
        success: true,
        investmentRequest,
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new HttpException(
          'Investment request not found',
          HttpStatus.NOT_FOUND,
        );
      }
      throw new HttpException(
        error.message || 'Failed to update investment request',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.INVESTOR, Role.PROJECT_OWNER, Role.ADMIN)
  async deleteInvestmentRequest(@Param('id') id: string, @Request() req) {
    try {
      const existingRequest =
        await this.investmentRequestsService.getInvestmentRequestById(id);

      if (!existingRequest) {
        throw new HttpException(
          'Investment request not found',
          HttpStatus.NOT_FOUND,
        );
      }

      // Only investors can delete their own requests, or ADMINs
      // if (
      //   req.user.role !== 'ADMIN' &&
      //   req.user.id !== existingRequest.investorId
      // ) {
      //   throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      // }

      await this.investmentRequestsService.deleteInvestmentRequest(id);
      return {
        success: true,
        message: 'Investment request deleted successfully',
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new HttpException(
          'Investment request not found',
          HttpStatus.NOT_FOUND,
        );
      }
      throw new HttpException(
        error.message || 'Failed to delete investment request',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('check/:businessId')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.INVESTOR, Role.ADMIN) // Allow both investors and admins to check investment requests
  async checkUserInvestmentRequest(
    @Param('businessId') businessId: string,
    @Request() req,
  ) {
    try {
      // Admin users won't have investment requests
      // if (req.user.role === 'ADMIN') {
      //   return {
      //     success: true,
      //     hasRequest: false,
      //     request: null,
      //   };
      // }

      // Since no user authentication, check with a default user or make this endpoint require userId param
      const userId = req.body?.userId || req.query?.userId || 'default-user';
      const existingRequest =
        await this.investmentRequestsService.checkUserRequest(
          userId,
          businessId,
        );

      return {
        success: true,
        hasRequest: !!existingRequest,
        request: existingRequest || null,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to check investment request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
