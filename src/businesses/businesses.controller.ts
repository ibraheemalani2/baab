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
} from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { BusinessStatus, Currency } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';

@Controller('businesses')
export class BusinessesController {
  constructor(private businessesService: BusinessesService) {}

  @Post()
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.ADMIN, Role.PROJECT_OWNER)
  async createBusiness(@Body() createBusinessDto: any) {
    try {
      const business =
        await this.businessesService.createBusiness(createBusinessDto);
      return {
        success: true,
        business,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create business',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  async getBusinesses(
    @Query('status') status?: BusinessStatus,
    @Query('city') city?: string,
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('currency') currency?: Currency,
  ) {
    const filters: any = {};
    if (status) filters.status = status;
    if (city) filters.city = city;
    if (category) filters.category = category;
    if (currency) filters.currency = currency;
    if (minPrice) filters.minPrice = parseInt(minPrice);
    if (maxPrice) filters.maxPrice = parseInt(maxPrice);

    const businesses = await this.businessesService.getBusinesses(filters);
    return {
      success: true,
      businesses,
    };
  }

  @Get('search')
  async searchBusinesses(
    @Query('q') query: string,
    @Query('status') status?: BusinessStatus,
    @Query('city') city?: string,
    @Query('category') category?: string,
    @Query('currency') currency?: Currency,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
  ) {
    if (!query) {
      throw new HttpException(
        'Search query is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const filters: any = {};
    if (status) filters.status = status;
    if (city) filters.city = city;
    if (category) filters.category = category;
    if (currency) filters.currency = currency;
    if (minPrice) filters.minPrice = parseInt(minPrice);
    if (maxPrice) filters.maxPrice = parseInt(maxPrice);

    const businesses = await this.businessesService.searchBusinesses(
      query,
      filters,
    );
    return {
      success: true,
      businesses,
      count: businesses.length,
    };
  }

  @Get('advanced-search')
  async advancedSearchBusinesses(
    @Query() searchDto: import('./dto/business-search.dto').BusinessSearchDto,
  ) {
    try {
      // Convert tags string to array if provided
      let tagsArray: string[] | undefined;
      if (searchDto.tags) {
        tagsArray = searchDto.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag);
      }

      // Build search filters
      const searchFilters: import('./dto/business-search.dto').BusinessSearchFilters =
        {
          query: searchDto.query,
          status: searchDto.status,
          city: searchDto.city,
          category: searchDto.category,
          currency: searchDto.currency,
          minPrice: searchDto.minPrice,
          maxPrice: searchDto.maxPrice,
          minRevenue: searchDto.minRevenue,
          maxRevenue: searchDto.maxRevenue,
          minEmployees: searchDto.minEmployees,
          maxEmployees: searchDto.maxEmployees,
          minEstablished: searchDto.minEstablished,
          maxEstablished: searchDto.maxEstablished,
          tags: tagsArray,
          location: searchDto.location,
          sortBy: searchDto.sortBy,
          limit: searchDto.limit,
          offset: searchDto.offset,
        };

      // Calculate offset from page if provided
      if (searchDto.page && !searchDto.offset) {
        const limit = searchDto.limit || 20;
        searchFilters.offset = (searchDto.page - 1) * limit;
      }

      const result =
        await this.businessesService.advancedSearchBusinesses(searchFilters);

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Search failed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('filters')
  async getAvailableFilters() {
    try {
      // Get unique values for filter options from approved businesses
      const filterOptions = await this.businessesService.getFilterOptions();
      return {
        success: true,
        filters: filterOptions,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get filter options',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.ADMIN)
  async getBusinessStats() {
    const stats = await this.businessesService.getBusinessStats();
    return {
      success: true,
      stats,
    };
  }

  @Get('owner/:ownerId')
  async getBusinessesByOwner(@Param('ownerId') ownerId: string) {
    const businesses =
      await this.businessesService.getBusinessesByOwner(ownerId);
    return {
      success: true,
      businesses,
    };
  }

  @Get(':id')
  async getBusinessById(@Param('id') id: string) {
    const business = await this.businessesService.getBusinessById(id);
    if (!business) {
      throw new HttpException('Business not found', HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      business,
    };
  }

  @Put(':id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.ADMIN, Role.PROJECT_OWNER)
  async updateBusiness(
    @Param('id') id: string,
    @Body() updateBusinessDto: any,
  ) {
    try {
      const business = await this.businessesService.updateBusiness(
        id,
        updateBusinessDto,
      );
      return {
        success: true,
        business,
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new HttpException('Business not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        error.message || 'Failed to update business',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.ADMIN)
  async deleteBusiness(@Param('id') id: string) {
    try {
      await this.businessesService.deleteBusiness(id);
      return {
        success: true,
        message: 'Business deleted successfully',
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new HttpException('Business not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        error.message || 'Failed to delete business',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Get city statistics
  @Get('cities/stats')
  async getCityStatistics() {
    try {
      return await this.businessesService.getCityStatistics();
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get city statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
