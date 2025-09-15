import { Injectable } from '@nestjs/common';
import { AdminRole, Permission, Role } from '@prisma/client';

// Define default permissions for each admin role
const DEFAULT_ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  [AdminRole.SUPER_ADMIN]: [
    // All permissions for super admin
    Permission.MANAGE_BUSINESSES,
    Permission.VERIFY_BUSINESSES,
    Permission.VIEW_BUSINESSES,
    Permission.MANAGE_INVESTMENT_REQUESTS,
    Permission.REVIEW_INVESTMENT_REQUESTS,
    Permission.VIEW_INVESTMENT_REQUESTS,
    Permission.MANAGE_USERS,
    Permission.VIEW_USERS,
    Permission.ASSIGN_ROLES,
    Permission.MANAGE_SETTINGS,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_CONTENT,
    Permission.MANAGE_ADMINS,
    Permission.ASSIGN_ADMIN_ROLES,
  ],
  [AdminRole.CONTENT_MODERATOR]: [
    Permission.MANAGE_BUSINESSES,
    Permission.VERIFY_BUSINESSES,
    Permission.VIEW_BUSINESSES,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_CONTENT,
  ],
  [AdminRole.INVESTMENT_MODERATOR]: [
    Permission.MANAGE_INVESTMENT_REQUESTS,
    Permission.REVIEW_INVESTMENT_REQUESTS,
    Permission.VIEW_INVESTMENT_REQUESTS,
    Permission.VIEW_BUSINESSES,
    Permission.VIEW_ANALYTICS,
  ],
  [AdminRole.USER_MANAGER]: [
    Permission.MANAGE_USERS,
    Permission.VIEW_USERS,
    Permission.VIEW_ANALYTICS,
  ],
  [AdminRole.READ_ONLY_ADMIN]: [
    Permission.VIEW_BUSINESSES,
    Permission.VIEW_INVESTMENT_REQUESTS,
    Permission.VIEW_USERS,
    Permission.VIEW_ANALYTICS,
  ],
};

@Injectable()
export class PermissionsService {
  /**
   * Check if a user has a specific permission
   */
  hasPermission(
    userRole: Role,
    adminRole: AdminRole | null,
    userPermissions: Permission[],
    requiredPermission: Permission,
  ): boolean {
    // Non-admin users have no admin permissions
    if (userRole !== Role.ADMIN) {
      return false;
    }

    // If user doesn't have an admin role, no permissions
    if (!adminRole) {
      return false;
    }

    // Check explicit user permissions first
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Check default role permissions
    const defaultPermissions = this.getDefaultPermissions(adminRole);
    return defaultPermissions.includes(requiredPermission);
  }

  /**
   * Check if a user has any of the specified permissions
   */
  hasAnyPermission(
    userRole: Role,
    adminRole: AdminRole | null,
    userPermissions: Permission[],
    requiredPermissions: Permission[],
  ): boolean {
    return requiredPermissions.some((permission) =>
      this.hasPermission(userRole, adminRole, userPermissions, permission),
    );
  }

  /**
   * Check if a user has all of the specified permissions
   */
  hasAllPermissions(
    userRole: Role,
    adminRole: AdminRole | null,
    userPermissions: Permission[],
    requiredPermissions: Permission[],
  ): boolean {
    return requiredPermissions.every((permission) =>
      this.hasPermission(userRole, adminRole, userPermissions, permission),
    );
  }

  /**
   * Get all permissions for a user (default + explicit)
   */
  getAllUserPermissions(
    userRole: Role,
    adminRole: AdminRole | null,
    userPermissions: Permission[],
  ): Permission[] {
    if (userRole !== Role.ADMIN || !adminRole) {
      return [];
    }

    const defaultPermissions = this.getDefaultPermissions(adminRole);
    const allPermissions = new Set([...defaultPermissions, ...userPermissions]);
    return Array.from(allPermissions);
  }

  /**
   * Get default permissions for an admin role
   */
  getDefaultPermissions(adminRole: AdminRole): Permission[] {
    return DEFAULT_ROLE_PERMISSIONS[adminRole] || [];
  }

  /**
   * Check if a role can be assigned by the current user
   */
  canAssignRole(
    currentUserRole: Role,
    currentAdminRole: AdminRole | null,
    currentUserPermissions: Permission[],
    targetRole: AdminRole,
  ): boolean {
    // Only admin users can assign roles
    if (currentUserRole !== Role.ADMIN) {
      return false;
    }

    // Must have ASSIGN_ADMIN_ROLES permission
    if (
      !this.hasPermission(
        currentUserRole,
        currentAdminRole,
        currentUserPermissions,
        Permission.ASSIGN_ADMIN_ROLES,
      )
    ) {
      return false;
    }

    // Super admins can assign any role
    if (currentAdminRole === AdminRole.SUPER_ADMIN) {
      return true;
    }

    // Other admin roles cannot assign SUPER_ADMIN
    return targetRole !== AdminRole.SUPER_ADMIN;
  }

  /**
   * Validate permission assignment
   */
  canGrantPermission(
    granterRole: Role,
    granterAdminRole: AdminRole | null,
    granterPermissions: Permission[],
    permissionToGrant: Permission,
  ): boolean {
    // Only admin users can grant permissions
    if (granterRole !== Role.ADMIN) {
      return false;
    }

    // Must have ASSIGN_ADMIN_ROLES permission
    if (
      !this.hasPermission(
        granterRole,
        granterAdminRole,
        granterPermissions,
        Permission.ASSIGN_ADMIN_ROLES,
      )
    ) {
      return false;
    }

    // Super admins can grant any permission
    if (granterAdminRole === AdminRole.SUPER_ADMIN) {
      return true;
    }

    // Other admin roles can only grant permissions they have
    return this.hasPermission(
      granterRole,
      granterAdminRole,
      granterPermissions,
      permissionToGrant,
    );
  }

  /**
   * Get available roles that a user can assign
   */
  getAssignableRoles(
    currentUserRole: Role,
    currentAdminRole: AdminRole | null,
    currentUserPermissions: Permission[],
  ): AdminRole[] {
    const allRoles = Object.values(AdminRole);
    return allRoles.filter((role) =>
      this.canAssignRole(
        currentUserRole,
        currentAdminRole,
        currentUserPermissions,
        role,
      ),
    );
  }

  /**
   * Get available permissions that a user can grant
   */
  getGrantablePermissions(
    granterRole: Role,
    granterAdminRole: AdminRole | null,
    granterPermissions: Permission[],
  ): Permission[] {
    const allPermissions = Object.values(Permission);
    return allPermissions.filter((permission) =>
      this.canGrantPermission(
        granterRole,
        granterAdminRole,
        granterPermissions,
        permission,
      ),
    );
  }
}
