import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AdminRole, Permission, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminSeedService {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(private prisma: PrismaService) {}

  async seedSuperAdmin(): Promise<void> {
    try {
      const superAdminEmail =
        process.env.SUPER_ADMIN_EMAIL || 'superadmin@baab.iq';
      const superAdminPassword =
        process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!';
      const superAdminName =
        process.env.SUPER_ADMIN_NAME || 'Super Administrator';

      // Check if super admin already exists
      const existingAdmin = await this.prisma.user.findUnique({
        where: { email: superAdminEmail },
      });

      if (existingAdmin) {
        this.logger.log(`Super admin already exists: ${superAdminEmail}`);

        // Ensure existing admin has proper role and permissions
        if (
          existingAdmin.role !== Role.ADMIN ||
          existingAdmin.adminRole !== AdminRole.SUPER_ADMIN
        ) {
          await this.prisma.user.update({
            where: { id: existingAdmin.id },
            data: {
              role: Role.ADMIN,
              adminRole: AdminRole.SUPER_ADMIN,
              permissions: Object.values(Permission),
            },
          });
          this.logger.log('Updated existing user with super admin privileges');
        }
        return;
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

      // Create super admin user
      const superAdmin = await this.prisma.user.create({
        data: {
          email: superAdminEmail,
          password: hashedPassword,
          name: superAdminName,
          role: Role.ADMIN,
          adminRole: AdminRole.SUPER_ADMIN,
          permissions: Object.values(Permission),
          emailVerified: true,
          phoneVerified: false,
          phone: null,
          city: 'بغداد',
          businessType: null,
        },
      });

      this.logger.log(`Super admin created successfully: ${superAdmin.email}`);
      this.logger.log(`Super admin ID: ${superAdmin.id}`);
      this.logger.log(
        `Super admin has ${superAdmin.permissions.length} permissions`,
      );
    } catch (error) {
      this.logger.error('Failed to seed super admin:', error);
      throw error;
    }
  }

  async seedDefaultAdminUsers(): Promise<void> {
    try {
      const defaultAdmins = [
        {
          email: process.env.CONTENT_ADMIN_EMAIL || 'content@baab.iq',
          password: process.env.CONTENT_ADMIN_PASSWORD || 'ContentAdmin123!',
          name: 'مدير المحتوى',
          adminRole: AdminRole.CONTENT_MODERATOR,
          permissions: [
            Permission.MANAGE_CONTENT,
            Permission.MANAGE_BUSINESSES,
            Permission.VIEW_BUSINESSES,
            Permission.VIEW_ANALYTICS,
          ],
        },
        {
          email: process.env.INVESTMENT_ADMIN_EMAIL || 'investment@baab.iq',
          password:
            process.env.INVESTMENT_ADMIN_PASSWORD || 'InvestmentAdmin123!',
          name: 'مدير الاستثمارات',
          adminRole: AdminRole.INVESTMENT_MODERATOR,
          permissions: [
            Permission.MANAGE_INVESTMENT_REQUESTS,
            Permission.REVIEW_INVESTMENT_REQUESTS,
            Permission.VIEW_INVESTMENT_REQUESTS,
            Permission.VIEW_BUSINESSES,
            Permission.VIEW_ANALYTICS,
          ],
        },
        {
          email: process.env.USER_ADMIN_EMAIL || 'users@baab.iq',
          password: process.env.USER_ADMIN_PASSWORD || 'UserAdmin123!',
          name: 'مدير المستخدمين',
          adminRole: AdminRole.USER_MANAGER,
          permissions: [
            Permission.MANAGE_USERS,
            Permission.VIEW_USERS,
            Permission.ASSIGN_ROLES,
            Permission.VIEW_ANALYTICS,
          ],
        },
      ];

      for (const adminData of defaultAdmins) {
        const existingAdmin = await this.prisma.user.findUnique({
          where: { email: adminData.email },
        });

        if (existingAdmin) {
          this.logger.log(`Admin already exists: ${adminData.email}`);
          continue;
        }

        const hashedPassword = await bcrypt.hash(adminData.password, 10);

        const newAdmin = await this.prisma.user.create({
          data: {
            email: adminData.email,
            password: hashedPassword,
            name: adminData.name,
            role: Role.ADMIN,
            adminRole: adminData.adminRole,
            permissions: adminData.permissions,
            emailVerified: true,
            phoneVerified: false,
            phone: null,
            city: 'بغداد',
            businessType: null,
          },
        });

        this.logger.log(
          `Admin created: ${newAdmin.email} (${adminData.adminRole})`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to seed default admin users:', error);
      throw error;
    }
  }

  async seedAll(): Promise<void> {
    this.logger.log('Starting admin seeding process...');
    await this.seedSuperAdmin();
    await this.seedDefaultAdminUsers();
    this.logger.log('Admin seeding process completed successfully');
  }
}
