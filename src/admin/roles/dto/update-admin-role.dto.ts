import { IsEnum, IsNotEmpty } from 'class-validator';
import { AdminRole } from '@prisma/client';

export class UpdateAdminRoleDto {
  @IsEnum(AdminRole, {
    message:
      'Admin role must be one of: SUPER_ADMIN, CONTENT_MODERATOR, INVESTMENT_MODERATOR, USER_MANAGER, READ_ONLY_ADMIN',
  })
  @IsNotEmpty()
  adminRole: AdminRole;
}
