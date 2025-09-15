import {
  Controller,
  Get,
  Put,
  Patch,
  Param,
  Body,
  UseGuards,
  ValidationPipe,
  UsePipes,
  Query,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import {
  RequireAdminManagement,
  RequireRoleAssignment,
} from '../../auth/decorators/permissions.decorator';
import { Role } from '../../auth/roles.enum';
import { AdminRolesService } from './admin-roles.service';
import { UpdateAdminRoleDto } from './dto/update-admin-role.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';

@Controller('admin/roles')
// @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
// @Roles(Role.ADMIN)
// @RequireRoleAssignment()
export class AdminRolesController {
  constructor(private readonly adminRolesService: AdminRolesService) {}

  @Get('admin-users')
  async getAdminUsers(@Request() req) {
    try {
      const users = await this.adminRolesService.getAdminUsers('ADMIN-001' // Default admin since auth disabled);
      return {
        success: true,
        users,
      };
    } catch (error) {
      console.error('Error fetching admin users:', error);
      throw new Error('Failed to fetch admin users');
    }
  }

  @Get('available-roles')
  async getAvailableRoles(@Request() req) {
    try {
      const roles = await this.adminRolesService.getAvailableRoles('ADMIN-001' // Default admin since auth disabled);
      return {
        success: true,
        roles,
      };
    } catch (error) {
      console.error('Error fetching available roles:', error);
      throw new Error('Failed to fetch available roles');
    }
  }

  @Get('available-permissions')
  async getAvailablePermissions(@Request() req) {
    try {
      const permissions = await this.adminRolesService.getAvailablePermissions(
        'ADMIN-001' // Default admin since auth disabled,
      );
      return {
        success: true,
        permissions,
      };
    } catch (error) {
      console.error('Error fetching available permissions:', error);
      throw new Error('Failed to fetch available permissions');
    }
  }

  @Get(':userId/permissions')
  async getUserPermissions(@Param('userId') userId: string, @Request() req) {
    try {
      const permissions = await this.adminRolesService.getUserPermissions(
        userId,
        'ADMIN-001' // Default admin since auth disabled,
      );
      return {
        success: true,
        permissions,
      };
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      throw new Error('Failed to fetch user permissions');
    }
  }

  @Put(':userId/role')
  async updateUserRole(
    @Param('userId') userId: string,
    @Body(ValidationPipe) updateRoleDto: UpdateAdminRoleDto,
    @Request() req,
  ) {
    try {
      const user = await this.adminRolesService.updateUserRole(
        userId,
        updateRoleDto.adminRole,
        'ADMIN-001' // Default admin since auth disabled,
      );
      return {
        success: true,
        user,
        message: 'User role updated successfully',
      };
    } catch (error) {
      console.error('Error updating user role:', error);
      throw new Error('Failed to update user role');
    }
  }

  @Patch(':userId/permissions')
  async updateUserPermissions(
    @Param('userId') userId: string,
    @Body(ValidationPipe) updatePermissionsDto: UpdatePermissionsDto,
    @Request() req,
  ) {
    try {
      const user = await this.adminRolesService.updateUserPermissions(
        userId,
        updatePermissionsDto.permissions,
        'ADMIN-001' // Default admin since auth disabled,
      );
      return {
        success: true,
        user,
        message: 'User permissions updated successfully',
      };
    } catch (error) {
      console.error('Error updating user permissions:', error);
      throw new Error('Failed to update user permissions');
    }
  }

  @Put(':userId/promote-to-admin')
  @RequireAdminManagement()
  async promoteToAdmin(
    @Param('userId') userId: string,
    @Body(ValidationPipe) updateRoleDto: UpdateAdminRoleDto,
    @Request() req,
  ) {
    try {
      const user = await this.adminRolesService.promoteToAdmin(
        userId,
        updateRoleDto.adminRole,
        'ADMIN-001' // Default admin since auth disabled,
      );
      return {
        success: true,
        user,
        message: 'User promoted to admin successfully',
      };
    } catch (error) {
      console.error('Error promoting user to admin:', error);
      throw new Error('Failed to promote user to admin');
    }
  }

  @Put(':userId/revoke-admin')
  @RequireAdminManagement()
  async revokeAdminAccess(@Param('userId') userId: string, @Request() req) {
    try {
      const user = await this.adminRolesService.revokeAdminAccess(
        userId,
        'ADMIN-001' // Default admin since auth disabled,
      );
      return {
        success: true,
        user,
        message: 'Admin access revoked successfully',
      };
    } catch (error) {
      console.error('Error revoking admin access:', error);
      throw new Error('Failed to revoke admin access');
    }
  }

  @Get('role-permissions/:role')
  async getRolePermissions(@Param('role') role: string) {
    try {
      const permissions = await this.adminRolesService.getRolePermissions(role);
      return {
        success: true,
        role,
        permissions,
      };
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      throw new Error('Failed to fetch role permissions');
    }
  }

  // ==================== USER MANAGEMENT ENDPOINTS ====================

  @Get('users')
  async getAllUsers(
    @Request() req,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('adminRole') adminRole?: string,
    @Query('emailVerified') emailVerified?: string,
    @Query('phoneVerified') phoneVerified?: string,
    @Query('city') city?: string,
    @Query('businessType') businessType?: string,
    @Query('createdAfter') createdAfter?: string,
    @Query('createdBefore') createdBefore?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    try {
      const filters = {
        search,
        role: role as any,
        adminRole: adminRole as any,
        emailVerified:
          emailVerified === 'true'
            ? true
            : emailVerified === 'false'
              ? false
              : undefined,
        phoneVerified:
          phoneVerified === 'true'
            ? true
            : phoneVerified === 'false'
              ? false
              : undefined,
        city,
        businessType,
        createdAfter: createdAfter ? new Date(createdAfter) : undefined,
        createdBefore: createdBefore ? new Date(createdBefore) : undefined,
      };

      const pagination = {
        page,
        limit,
        sortBy,
        sortOrder,
      };

      const result = await this.adminRolesService.getAllUsers(
        'ADMIN-001' // Default admin since auth disabled,
        filters,
        pagination,
      );
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  @Get('users/:userId')
  async getUserById(@Request() req, @Param('userId') userId: string) {
    try {
      const user = await this.adminRolesService.getUserById(
        userId,
        'ADMIN-001' // Default admin since auth disabled,
      );
      return {
        success: true,
        user,
      };
    } catch (error) {
      console.error('Error fetching user:', error);
      throw new Error('Failed to fetch user details');
    }
  }

  @Patch('users/:userId/status')
  @UsePipes(new ValidationPipe())
  async updateUserStatus(
    @Request() req,
    @Param('userId') userId: string,
    @Body()
    updateData: {
      emailVerified?: boolean;
      phoneVerified?: boolean;
      city?: string;
      businessType?: string;
    },
  ) {
    try {
      const user = await this.adminRolesService.updateUserStatus(
        userId,
        'ADMIN-001' // Default admin since auth disabled,
        updateData,
      );
      return {
        success: true,
        user,
        message: 'User status updated successfully',
      };
    } catch (error) {
      console.error('Error updating user status:', error);
      throw new Error('Failed to update user status');
    }
  }

  @Get('users/stats/overview')
  async getUserStats(@Request() req) {
    try {
      const stats = await this.adminRolesService.getUserStats('ADMIN-001' // Default admin since auth disabled);
      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      throw new Error('Failed to fetch user statistics');
    }
  }

  @Get('users/search')
  async searchUsers(
    @Request() req,
    @Query('q') searchTerm: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    try {
      if (!searchTerm) {
        return {
          success: true,
          users: [],
        };
      }

      const users = await this.adminRolesService.searchUsers(
        'ADMIN-001' // Default admin since auth disabled,
        searchTerm,
        limit,
      );
      return {
        success: true,
        users,
      };
    } catch (error) {
      console.error('Error searching users:', error);
      throw new Error('Failed to search users');
    }
  }
}
