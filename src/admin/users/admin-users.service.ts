/**
 * Admin Users Service - Manages admin user operations with proper type safety
 *
 * Fixed Issues:
 * - Replaced non-existent fields (status, verified, lastLogin) with actual schema fields
 * - Added proper TypeScript types using Prisma generated types
 * - Implemented proper error handling with try-catch blocks
 * - Added input validation for pagination and user status updates
 * - Created logical status mapping based on emailVerified and phoneVerified fields
 * - Added proper interfaces for type safety and reusability
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Role, Prisma } from '@prisma/client';

// DTOs for type safety
export interface AdminUserQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'verified' | 'unverified';
  role?: Role;
  sortBy?: 'createdAt' | 'name' | 'email';
  sortOrder?: 'asc' | 'desc';
}

export interface AdminUserResponse {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  businessType: string | null;
  joinDate: string;
  status: string;
  verified: boolean;
  role: Role;
  stats: {
    listingsCreated: number;
    investmentsMade: number;
    dealsCompleted: number;
  };
  lastLogin: string;
}

export interface AdminUserStatsResponse {
  totalUsers: number;
  activeUsers: number;
  emailVerifiedUsers: number;
  phoneVerifiedUsers: number;
  fullyVerifiedUsers: number;
  adminUsers: number;
  regularUsers: number;
  // Backward compatibility fields
  verifiedUsers: number;
  suspendedUsers: number;
  pendingUsers: number;
}

@Injectable()
export class AdminUsersService {
  constructor(private prisma: PrismaService) {}

  async getUsers(query: AdminUserQueryDto): Promise<AdminUserResponse[]> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        role,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = query;

      // Validate pagination parameters
      const pageNum = Math.max(1, Math.floor(Number(page)));
      const limitNum = Math.min(100, Math.max(1, Math.floor(Number(limit))));

      const where: Prisma.UserWhereInput = {};

      // Search functionality
      if (search && search.trim()) {
        where.OR = [
          { name: { contains: search.trim(), mode: 'insensitive' } },
          { email: { contains: search.trim(), mode: 'insensitive' } },
          { phone: { contains: search.trim(), mode: 'insensitive' } },
        ];
      }

      // Status filtering based on verification status
      if (status) {
        switch (status) {
          case 'verified':
            where.AND = [{ emailVerified: true }, { phoneVerified: true }];
            break;
          case 'unverified':
            where.OR = [{ emailVerified: false }, { phoneVerified: false }];
            break;
          case 'active':
            where.emailVerified = true;
            break;
          case 'inactive':
            where.emailVerified = false;
            break;
        }
      }

      // Role filtering
      if (role && Object.values(Role).includes(role)) {
        where.role = role;
      }

      const users = await this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          city: true,
          businessType: true,
          role: true,
          emailVerified: true,
          phoneVerified: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              businesses: true,
              investmentRequests: {
                where: { status: 'APPROVED' },
              },
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
      });

      // Transform users to match frontend interface
      return users.map((user): AdminUserResponse => {
        const isFullyVerified = user.emailVerified && user.phoneVerified;
        const isPartiallyVerified = user.emailVerified || user.phoneVerified;

        let status: string;
        if (isFullyVerified) {
          status = 'verified';
        } else if (isPartiallyVerified) {
          status = 'partial';
        } else {
          status = 'unverified';
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          city: user.city,
          businessType: user.businessType || 'غير محدد',
          joinDate: user.createdAt.toISOString().split('T')[0],
          status,
          verified: isFullyVerified,
          role: user.role,
          stats: {
            listingsCreated: user._count.businesses,
            investmentsMade: user._count.investmentRequests,
            dealsCompleted: user._count.investmentRequests, // Use approved investments as deals
          },
          lastLogin: user.updatedAt.toISOString().split('T')[0], // Use updatedAt as proxy for last activity
        };
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new BadRequestException('Failed to fetch users');
    }
  }

  async getUserStats(): Promise<AdminUserStatsResponse> {
    try {
      const [
        totalUsers,
        activeUsers,
        emailVerifiedUsers,
        phoneVerifiedUsers,
        fullyVerifiedUsers,
        adminUsers,
        regularUsers,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { emailVerified: true } }),
        this.prisma.user.count({ where: { emailVerified: true } }),
        this.prisma.user.count({ where: { phoneVerified: true } }),
        this.prisma.user.count({
          where: {
            AND: [{ emailVerified: true }, { phoneVerified: true }],
          },
        }),
        this.prisma.user.count({ where: { role: 'ADMIN' } }),
        this.prisma.user.count({
          where: { role: { in: [Role.INVESTOR, Role.PROJECT_OWNER] } },
        }),
      ]);

      return {
        totalUsers,
        activeUsers,
        emailVerifiedUsers,
        phoneVerifiedUsers,
        fullyVerifiedUsers,
        adminUsers,
        regularUsers,
        // Backward compatibility fields
        verifiedUsers: fullyVerifiedUsers,
        suspendedUsers: totalUsers - activeUsers,
        pendingUsers: totalUsers - fullyVerifiedUsers,
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw new BadRequestException('Failed to fetch user statistics');
    }
  }

  async updateUserStatus(userId: string, status: string) {
    try {
      if (!userId || typeof userId !== 'string') {
        throw new BadRequestException('Invalid user ID provided');
      }

      // Map status to actual fields that exist
      const updateData: Prisma.UserUpdateInput = {};

      switch (status.toLowerCase()) {
        case 'active':
          updateData.emailVerified = true;
          break;
        case 'inactive':
          updateData.emailVerified = false;
          break;
        case 'verified':
          updateData.emailVerified = true;
          updateData.phoneVerified = true;
          break;
        case 'unverified':
          updateData.emailVerified = false;
          updateData.phoneVerified = false;
          break;
        default:
          throw new BadRequestException(`Invalid status: ${status}`);
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          phoneVerified: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Transform response to match expected format
      return {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        status:
          updatedUser.emailVerified && updatedUser.phoneVerified
            ? 'verified'
            : updatedUser.emailVerified
              ? 'partial'
              : 'unverified',
        verified: updatedUser.emailVerified && updatedUser.phoneVerified,
        role: updatedUser.role,
      };
    } catch (error) {
      console.error('Error updating user status:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update user status');
    }
  }

  // Additional helper method for getting total count
  async getTotalCount(query: AdminUserQueryDto): Promise<number> {
    try {
      const { search, status, role } = query;
      const where: Prisma.UserWhereInput = {};

      if (search && search.trim()) {
        where.OR = [
          { name: { contains: search.trim(), mode: 'insensitive' } },
          { email: { contains: search.trim(), mode: 'insensitive' } },
          { phone: { contains: search.trim(), mode: 'insensitive' } },
        ];
      }

      if (status) {
        switch (status) {
          case 'verified':
            where.AND = [{ emailVerified: true }, { phoneVerified: true }];
            break;
          case 'unverified':
            where.OR = [{ emailVerified: false }, { phoneVerified: false }];
            break;
          case 'active':
            where.emailVerified = true;
            break;
          case 'inactive':
            where.emailVerified = false;
            break;
        }
      }

      if (role && Object.values(Role).includes(role)) {
        where.role = role;
      }

      return await this.prisma.user.count({ where });
    } catch (error) {
      console.error('Error getting total count:', error);
      throw new BadRequestException('Failed to get total count');
    }
  }
}
