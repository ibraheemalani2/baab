import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { PermissionsService } from '../rbac/permissions.service';

export const PERMISSIONS_KEY = 'permissions';
export const PERMISSIONS_OPERATION_KEY = 'permissions_operation';

export enum PermissionOperation {
  AND = 'AND', // User must have ALL permissions
  OR = 'OR', // User must have ANY permission
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const operation =
      this.reflector.getAllAndOverride<PermissionOperation>(
        PERMISSIONS_OPERATION_KEY,
        [context.getHandler(), context.getClass()],
      ) || PermissionOperation.OR;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Handle static ADMIN user (not in database)
    let fullUser;
    if (user.id === 'ADMIN-001' && user.role === 'ADMIN') {
      // Static admin has all permissions
      fullUser = {
        id: 'ADMIN-001',
        role: 'ADMIN' as any,
        adminRole: 'SUPER_ADMIN' as any,
        permissions: Object.values(Permission), // Grant all permissions to static admin
      };
    } else {
      // Fetch full user data with permissions from database
      fullUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          role: true,
          adminRole: true,
          permissions: true,
        },
      });

      if (!fullUser) {
        throw new ForbiddenException('User not found');
      }
    }

    let hasPermission: boolean;

    if (operation === PermissionOperation.AND) {
      hasPermission = this.permissionsService.hasAllPermissions(
        fullUser.role,
        fullUser.adminRole,
        fullUser.permissions,
        requiredPermissions,
      );
    } else {
      hasPermission = this.permissionsService.hasAnyPermission(
        fullUser.role,
        fullUser.adminRole,
        fullUser.permissions,
        requiredPermissions,
      );
    }

    if (!hasPermission) {
      throw new ForbiddenException(
        'Insufficient permissions to access this resource',
      );
    }

    return true;
  }
}
