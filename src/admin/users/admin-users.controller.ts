import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../auth/roles.enum';
import { AdminUsersService } from './admin-users.service';
import type { AdminUserQueryDto } from './admin-users.service';

@Controller('admin/users')
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(Role.ADMIN)
export class AdminUsersController {
  constructor(private adminUsersService: AdminUsersService) {}

  @Get()
  async getAdminUsers(@Query() query: AdminUserQueryDto) {
    try {
      const users = await this.adminUsersService.getUsers(query);
      const totalCount = await this.adminUsersService.getTotalCount(query);
      const page = parseInt(String(query.page)) || 1;
      const limit = parseInt(String(query.limit)) || 10;

      return {
        success: true,
        users,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page * limit < totalCount,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        message: 'Failed to retrieve users',
        error: errorMessage,
      };
    }
  }

  @Get('stats')
  async getUserStats() {
    try {
      const stats = await this.adminUsersService.getUserStats();
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        message: 'Failed to retrieve user statistics',
        error: errorMessage,
      };
    }
  }

  @Patch(':userId/status')
  async updateUserStatus(
    @Param('userId') userId: string,
    @Body() body: { status: string },
  ) {
    try {
      const updatedUser = await this.adminUsersService.updateUserStatus(
        userId,
        body.status,
      );
      return {
        success: true,
        user: updatedUser,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        message: 'Failed to update user status',
        error: errorMessage,
      };
    }
  }
}
