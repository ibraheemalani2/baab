import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import {
  RequireBusinessView,
  RequireBusinessManagement,
  RequireBusinessVerification,
} from '../../auth/decorators/permissions.decorator';
import { Role } from '../../auth/roles.enum';
import { BusinessStatus } from '@prisma/client';
import { AdminBusinessesService } from './admin-businesses.service';
import { BusinessVerificationDto } from './dto/business-verification.dto';
import { AdminBusinessQueryDto } from './dto/admin-business-query.dto';

@Controller('admin/businesses')
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(Role.ADMIN)
export class AdminBusinessesController {
  constructor(private adminBusinessesService: AdminBusinessesService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  async getBusinesses(
    @Query() queryDto: AdminBusinessQueryDto,
    @Request() req,
  ) {
    try {
      const businesses = await this.adminBusinessesService.getBusinesses(
        queryDto,
        'ADMIN-001' // Default admin since auth disabled,
      );

      return {
        success: true,
        businesses: businesses.data,
        pagination: businesses.pagination,
        stats: businesses.stats,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch businesses',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  async getBusinessStatsSimple(@Request() req) {
    try {
      const stats = await this.adminBusinessesService.getBusinessStats(
        'ADMIN-001' // Default admin since auth disabled,
      );

      return {
        success: true,
        stats,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch business stats',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getBusinessById(@Param('id') id: string, @Request() req) {
    try {
      const business = await this.adminBusinessesService.getBusinessById(
        id,
        'ADMIN-001' // Default admin since auth disabled,
      );

      if (!business) {
        throw new HttpException('Business not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        business,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to fetch business',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/simple-verify')
  async simpleVerifyBusiness(
    @Param('id') id: string,
    @Body() body: { status: string; notes?: string },
  ) {
    try {
      console.log('SIMPLE VERIFY: Called with:', { id, body });

      // Check if business exists
      const existingBusiness = await this.adminBusinessesService[
        'prisma'
      ].business.findUnique({
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

      if (!existingBusiness) {
        return {
          statusCode: 404,
          message: 'Business not found',
          success: false,
        };
      }

      // Check if status is already set
      if (existingBusiness.status === body.status) {
        return {
          statusCode: 400,
          message: `Business is already ${body.status.toLowerCase()}`,
          success: false,
        };
      }

      // Update business status
      const updatedBusiness = await this.adminBusinessesService[
        'prisma'
      ].business.update({
        where: { id },
        data: {
          status: body.status as BusinessStatus,
          verificationNotes: body.notes || '',
          verifiedBy: 'ADMIN-001',
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

      // Add verifier info and convert BigInt fields for JSON serialization
      const businessWithVerifier = {
        ...updatedBusiness,
        price: updatedBusiness.price ? Number(updatedBusiness.price) : null,
        monthlyRevenue: updatedBusiness.monthlyRevenue
          ? Number(updatedBusiness.monthlyRevenue)
          : null,
        verifier: {
          id: 'ADMIN-001',
          name: 'مدير النظام',
          email: 'ADMIN@baab.iq',
        },
      };

      console.log('SIMPLE VERIFY: Success');
      return {
        success: true,
        business: businessWithVerifier,
        message: `Business ${body.status.toLowerCase()} successfully`,
      };
    } catch (error) {
      console.error('SIMPLE VERIFY: Error:', error);
      return {
        statusCode: 500,
        message: error.message || 'Internal server error',
        success: false,
        error: error.message,
      };
    }
  }

  @Put(':id/verify')
  @UsePipes(new ValidationPipe({ transform: true }))
  async verifyBusiness(
    @Param('id') id: string,
    @Body() verificationDto: BusinessVerificationDto,
    @Request() req,
  ) {
    try {
      console.log('DEBUG: verifyBusiness called with:', {
        id,
        verificationDto,
        userId: 'ADMIN-001' // Default admin since auth disabled,
      });
      const business = await this.adminBusinessesService.verifyBusiness(
        id,
        verificationDto,
        'ADMIN-001' // Default admin since auth disabled,
      );

      return {
        success: true,
        business,
        message: `Business ${verificationDto.status.toLowerCase()} successfully`,
      };
    } catch (error) {
      console.error('DEBUG: Error in verifyBusiness controller:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to verify business',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/verify')
  async verifyBusinessPost(
    @Param('id') id: string,
    @Body() body: { status: string; notes?: string },
  ) {
    try {
      console.log('POST VERIFY: Called with:', { id, body });

      // Check if business exists
      const existingBusiness = await this.adminBusinessesService[
        'prisma'
      ].business.findUnique({
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

      if (!existingBusiness) {
        throw new HttpException('Business not found', HttpStatus.NOT_FOUND);
      }

      // Check if status is already set
      if (existingBusiness.status === body.status) {
        throw new HttpException(
          `Business is already ${body.status.toLowerCase()}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Update business status
      const updatedBusiness = await this.adminBusinessesService[
        'prisma'
      ].business.update({
        where: { id },
        data: {
          status: body.status as BusinessStatus,
          verificationNotes: body.notes || '',
          verifiedBy: 'ADMIN-001',
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

      // Add verifier info and convert BigInt fields for JSON serialization
      const businessWithVerifier = {
        ...updatedBusiness,
        price: updatedBusiness.price ? Number(updatedBusiness.price) : null,
        monthlyRevenue: updatedBusiness.monthlyRevenue
          ? Number(updatedBusiness.monthlyRevenue)
          : null,
        verifier: {
          id: 'ADMIN-001',
          name: 'مدير النظام',
          email: 'ADMIN@baab.iq',
        },
      };

      console.log('POST VERIFY: Success');
      return {
        success: true,
        business: businessWithVerifier,
        message: `Business ${body.status.toLowerCase()} successfully`,
      };
    } catch (error) {
      console.error('POST VERIFY: Error:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to verify business',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats/overview')
  async getBusinessStats(@Request() req) {
    try {
      const stats = await this.adminBusinessesService.getBusinessStats(
        'ADMIN-001' // Default admin since auth disabled,
      );

      return {
        success: true,
        stats,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch business stats',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/verification-history')
  async getVerificationHistory(@Param('id') id: string, @Request() req) {
    try {
      const history = await this.adminBusinessesService.getVerificationHistory(
        id,
        'ADMIN-001' // Default admin since auth disabled,
      );

      return {
        success: true,
        history,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch verification history',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
