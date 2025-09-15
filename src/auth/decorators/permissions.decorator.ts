import { SetMetadata } from '@nestjs/common';
import { Permission } from '@prisma/client';

export const PERMISSIONS_KEY = 'permissions';
export const PERMISSIONS_OPERATION_KEY = 'permissions_operation';

export enum PermissionOperation {
  AND = 'AND', // User must have ALL permissions
  OR = 'OR', // User must have ANY permission
}

/**
 * Decorator to require specific permissions for a route or controller
 * @param permissions - Array of permissions required
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Decorator to set how multiple permissions should be evaluated
 * @param operation - AND (all required) or OR (any required)
 */
export const PermissionsOperation = (operation: PermissionOperation) =>
  SetMetadata(PERMISSIONS_OPERATION_KEY, operation);

// Convenience decorators for common permission patterns
export const RequireBusinessManagement = () =>
  RequirePermissions(Permission.MANAGE_BUSINESSES);

export const RequireBusinessView = () =>
  RequirePermissions(Permission.VIEW_BUSINESSES);

export const RequireBusinessVerification = () =>
  RequirePermissions(Permission.VERIFY_BUSINESSES);

export const RequireInvestmentManagement = () =>
  RequirePermissions(Permission.MANAGE_INVESTMENT_REQUESTS);

export const RequireInvestmentReview = () =>
  RequirePermissions(Permission.REVIEW_INVESTMENT_REQUESTS);

export const RequireInvestmentView = () =>
  RequirePermissions(Permission.VIEW_INVESTMENT_REQUESTS);

export const RequireUserManagement = () =>
  RequirePermissions(Permission.MANAGE_USERS);

export const RequireUserView = () => RequirePermissions(Permission.VIEW_USERS);

export const RequireAdminManagement = () =>
  RequirePermissions(Permission.MANAGE_ADMINS);

export const RequireRoleAssignment = () =>
  RequirePermissions(Permission.ASSIGN_ADMIN_ROLES);

export const RequireSettingsManagement = () =>
  RequirePermissions(Permission.MANAGE_SETTINGS);

export const RequireAnalyticsView = () =>
  RequirePermissions(Permission.VIEW_ANALYTICS);

// Combined permission decorators
export const RequireBusinessOrInvestmentView = () => {
  PermissionsOperation(PermissionOperation.OR);
  return RequirePermissions(
    Permission.VIEW_BUSINESSES,
    Permission.VIEW_INVESTMENT_REQUESTS,
  );
};

export const RequireContentModeration = () => {
  PermissionsOperation(PermissionOperation.AND);
  return RequirePermissions(
    Permission.MANAGE_BUSINESSES,
    Permission.VERIFY_BUSINESSES,
  );
};

export const RequireFullInvestmentAccess = () => {
  PermissionsOperation(PermissionOperation.AND);
  return RequirePermissions(
    Permission.MANAGE_INVESTMENT_REQUESTS,
    Permission.REVIEW_INVESTMENT_REQUESTS,
  );
};
