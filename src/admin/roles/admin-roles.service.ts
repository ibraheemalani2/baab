import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PermissionsService } from '../../auth/rbac/permissions.service';
import { AdminRole, Permission, Role, Prisma } from '@prisma/client';

interface UserFilters {
  search?: string;
  role?: Role;
  adminRole?: AdminRole;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  city?: string;
  businessType?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class AdminRolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async getAdminUsers(currentUserId: string) {
    // Get current user to check permissions
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        id: true,
        role: true,
        adminRole: true,
        permissions: true,
      },
    });

    if (!currentUser || currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can view admin users');
    }

    // Get all admin users
    const adminUsers = await this.prisma.user.findMany({
      where: {
        role: Role.ADMIN,
      },
      select: {
        id: true,
        name: true,
        email: true,
        adminRole: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate effective permissions for each user
    return adminUsers.map((user) => ({
      ...user,
      effectivePermissions: this.permissionsService.getAllUserPermissions(
        Role.ADMIN,
        user.adminRole,
        user.permissions,
      ),
    }));
  }

  async getAvailableRoles(currentUserId: string): Promise<AdminRole[]> {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        role: true,
        adminRole: true,
        permissions: true,
      },
    });

    if (!currentUser || currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can view available roles');
    }

    return this.permissionsService.getAssignableRoles(
      currentUser.role,
      currentUser.adminRole,
      currentUser.permissions,
    );
  }

  async getAvailablePermissions(currentUserId: string): Promise<Permission[]> {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        role: true,
        adminRole: true,
        permissions: true,
      },
    });

    if (!currentUser || currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only admins can view available permissions',
      );
    }

    return this.permissionsService.getGrantablePermissions(
      currentUser.role,
      currentUser.adminRole,
      currentUser.permissions,
    );
  }

  async getUserPermissions(
    targetUserId: string,
    currentUserId: string,
  ): Promise<{
    explicitPermissions: Permission[];
    effectivePermissions: Permission[];
    defaultRolePermissions: Permission[];
  }> {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        role: true,
        adminRole: true,
        permissions: true,
      },
    });

    if (!currentUser || currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can view user permissions');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        role: true,
        adminRole: true,
        permissions: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const defaultRolePermissions = targetUser.adminRole
      ? this.permissionsService.getDefaultPermissions(targetUser.adminRole)
      : [];

    const effectivePermissions = this.permissionsService.getAllUserPermissions(
      targetUser.role,
      targetUser.adminRole,
      targetUser.permissions,
    );

    return {
      explicitPermissions: targetUser.permissions,
      effectivePermissions,
      defaultRolePermissions,
    };
  }

  async updateUserRole(
    targetUserId: string,
    newRole: AdminRole,
    currentUserId: string,
  ) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        role: true,
        adminRole: true,
        permissions: true,
      },
    });

    if (!currentUser || currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can update user roles');
    }

    // Check if current user can assign this role
    if (
      !this.permissionsService.canAssignRole(
        currentUser.role,
        currentUser.adminRole,
        currentUser.permissions,
        newRole,
      )
    ) {
      throw new ForbiddenException('You cannot assign this role');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (targetUser.role !== Role.ADMIN) {
      throw new BadRequestException(
        'User must be an admin to assign admin roles',
      );
    }

    // Prevent self-demotion from SUPER_ADMIN
    if (
      currentUserId === targetUserId &&
      currentUser.adminRole === AdminRole.SUPER_ADMIN &&
      newRole !== AdminRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Cannot demote yourself from Super Admin');
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        adminRole: newRole,
        // Reset explicit permissions when role changes
        permissions: [],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        adminRole: true,
        permissions: true,
      },
    });
  }

  async updateUserPermissions(
    targetUserId: string,
    permissions: Permission[],
    currentUserId: string,
  ) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        role: true,
        adminRole: true,
        permissions: true,
      },
    });

    if (!currentUser || currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can update user permissions');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (targetUser.role !== Role.ADMIN) {
      throw new BadRequestException(
        'User must be an admin to have permissions',
      );
    }

    // Check if current user can grant all requested permissions
    for (const permission of permissions) {
      if (
        !this.permissionsService.canGrantPermission(
          currentUser.role,
          currentUser.adminRole,
          currentUser.permissions,
          permission,
        )
      ) {
        throw new ForbiddenException(
          `You cannot grant the permission: ${permission}`,
        );
      }
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        permissions,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        adminRole: true,
        permissions: true,
      },
    });
  }

  async promoteToAdmin(
    targetUserId: string,
    adminRole: AdminRole,
    currentUserId: string,
  ) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        role: true,
        adminRole: true,
        permissions: true,
      },
    });

    if (!currentUser || currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can promote users');
    }

    if (
      !this.permissionsService.hasPermission(
        currentUser.role,
        currentUser.adminRole,
        currentUser.permissions,
        Permission.MANAGE_ADMINS,
      )
    ) {
      throw new ForbiddenException('You cannot promote users to admin');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (targetUser.role === Role.ADMIN) {
      throw new BadRequestException('User is already an admin');
    }

    // Check if current user can assign this role
    if (
      !this.permissionsService.canAssignRole(
        currentUser.role,
        currentUser.adminRole,
        currentUser.permissions,
        adminRole,
      )
    ) {
      throw new ForbiddenException('You cannot assign this admin role');
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        role: Role.ADMIN,
        adminRole: adminRole,
        permissions: [],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        adminRole: true,
        permissions: true,
      },
    });
  }

  async revokeAdminAccess(targetUserId: string, currentUserId: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        role: true,
        adminRole: true,
        permissions: true,
      },
    });

    if (!currentUser || currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can revoke admin access');
    }

    if (
      !this.permissionsService.hasPermission(
        currentUser.role,
        currentUser.adminRole,
        currentUser.permissions,
        Permission.MANAGE_ADMINS,
      )
    ) {
      throw new ForbiddenException('You cannot revoke admin access');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (targetUser.role !== Role.ADMIN) {
      throw new BadRequestException('User is not an admin');
    }

    // Prevent self-demotion
    if (currentUserId === targetUserId) {
      throw new ForbiddenException('Cannot revoke your own admin access');
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        role: Role.PROJECT_OWNER,
        adminRole: null,
        permissions: [],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        adminRole: true,
        permissions: true,
      },
    });
  }

  async getRolePermissions(role: string): Promise<Permission[]> {
    if (!Object.values(AdminRole).includes(role as AdminRole)) {
      throw new BadRequestException('Invalid admin role');
    }

    return this.permissionsService.getDefaultPermissions(role as AdminRole);
  }

  // ==================== USER MANAGEMENT METHODS ====================

  async getAllUsers(
    currentUserId: string,
    filters: UserFilters = {},
    pagination: PaginationOptions = {},
  ) {
    // Check permissions
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: { role: true, adminRole: true, permissions: true },
    });

    if (!currentUser || currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can view users');
    }

    if (
      !this.permissionsService.hasPermission(
        currentUser.role,
        currentUser.adminRole,
        currentUser.permissions,
        Permission.VIEW_USERS,
      )
    ) {
      throw new ForbiddenException('You do not have permission to view users');
    }

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.adminRole) {
      where.adminRole = filters.adminRole;
    }

    if (filters.emailVerified !== undefined) {
      where.emailVerified = filters.emailVerified;
    }

    if (filters.phoneVerified !== undefined) {
      where.phoneVerified = filters.phoneVerified;
    }

    if (filters.city) {
      where.city = filters.city;
    }

    if (filters.businessType) {
      where.businessType = filters.businessType;
    }

    if (filters.createdAfter || filters.createdBefore) {
      where.createdAt = {};
      if (filters.createdAfter) {
        where.createdAt.gte = filters.createdAfter;
      }
      if (filters.createdBefore) {
        where.createdAt.lte = filters.createdBefore;
      }
    }

    // Build order by clause
    const { sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const orderBy: Prisma.UserOrderByWithRelationInput = {};
    orderBy[sortBy as keyof Prisma.UserOrderByWithRelationInput] = sortOrder;

    // Pagination
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(100, Math.max(1, pagination.limit || 20));
    const skip = (page - 1) * limit;

    // Execute queries
    const [users, totalCount] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          adminRole: true,
          permissions: true,
          emailVerified: true,
          phoneVerified: true,
          city: true,
          businessType: true,
          image: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              businesses: true,
              investmentRequests: true,
              receivedRequests: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  async getUserById(userId: string, currentUserId: string) {
    // Check permissions
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: { role: true, adminRole: true, permissions: true },
    });

    if (!currentUser || currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can view user details');
    }

    if (
      !this.permissionsService.hasPermission(
        currentUser.role,
        currentUser.adminRole,
        currentUser.permissions,
        Permission.VIEW_USERS,
      )
    ) {
      throw new ForbiddenException(
        'You do not have permission to view user details',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        adminRole: true,
        permissions: true,
        emailVerified: true,
        phoneVerified: true,
        city: true,
        businessType: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        businesses: {
          select: {
            id: true,
            title: true,
            status: true,
            category: true,
            price: true,
            currency: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        investmentRequests: {
          select: {
            id: true,
            status: true,
            offeredAmount: true,
            currency: true,
            requestDate: true,
            business: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: { requestDate: 'desc' },
        },
        receivedRequests: {
          select: {
            id: true,
            status: true,
            offeredAmount: true,
            currency: true,
            requestDate: true,
            investor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { requestDate: 'desc' },
        },
        _count: {
          select: {
            businesses: true,
            investmentRequests: true,
            receivedRequests: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUserStatus(
    userId: string,
    currentUserId: string,
    data: {
      emailVerified?: boolean;
      phoneVerified?: boolean;
      city?: string;
      businessType?: string;
    },
  ) {
    // Check permissions
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: { role: true, adminRole: true, permissions: true },
    });

    if (!currentUser || currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can update users');
    }

    if (
      !this.permissionsService.hasPermission(
        currentUser.role,
        currentUser.adminRole,
        currentUser.permissions,
        Permission.MANAGE_USERS,
      )
    ) {
      throw new ForbiddenException(
        'You do not have permission to update users',
      );
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        adminRole: true,
        emailVerified: true,
        phoneVerified: true,
        city: true,
        businessType: true,
        updatedAt: true,
      },
    });
  }

  async getUserStats(currentUserId: string) {
    // Check permissions
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: { role: true, adminRole: true, permissions: true },
    });

    if (!currentUser || currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can view user statistics');
    }

    if (
      !this.permissionsService.hasPermission(
        currentUser.role,
        currentUser.adminRole,
        currentUser.permissions,
        Permission.VIEW_ANALYTICS,
      )
    ) {
      throw new ForbiddenException(
        'You do not have permission to view user statistics',
      );
    }

    const [
      totalUsers,
      totalAdmins,
      emailVerifiedUsers,
      phoneVerifiedUsers,
      newUsersThisMonth,
      activeUsersThisMonth,
      usersByRole,
      usersByCity,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: Role.ADMIN } }),
      this.prisma.user.count({ where: { emailVerified: true } }),
      this.prisma.user.count({ where: { phoneVerified: true } }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      this.prisma.user.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
      }),
      this.prisma.user.groupBy({
        by: ['city'],
        _count: { city: true },
        where: { city: { not: null } },
        orderBy: { _count: { city: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      overview: {
        totalUsers,
        totalAdmins,
        regularUsers: totalUsers - totalAdmins,
        emailVerifiedUsers,
        phoneVerifiedUsers,
        newUsersThisMonth,
        activeUsersThisMonth,
      },
      roleDistribution: usersByRole.reduce(
        (acc, item) => {
          acc[item.role] = item._count.role;
          return acc;
        },
        {} as Record<Role, number>,
      ),
      topCities: usersByCity.map((item) => ({
        city: item.city,
        count: item._count.city,
      })),
    };
  }

  async searchUsers(
    currentUserId: string,
    searchTerm: string,
    limit: number = 10,
  ) {
    // Check permissions
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: { role: true, adminRole: true, permissions: true },
    });

    if (!currentUser || currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can search users');
    }

    if (
      !this.permissionsService.hasPermission(
        currentUser.role,
        currentUser.adminRole,
        currentUser.permissions,
        Permission.VIEW_USERS,
      )
    ) {
      throw new ForbiddenException(
        'You do not have permission to search users',
      );
    }

    return this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        adminRole: true,
        city: true,
        businessType: true,
        createdAt: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    });
  }
}
