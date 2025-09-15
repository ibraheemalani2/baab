import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  UpdateUserSettingsDto,
  ChangePasswordDto,
} from './dto/user-settings.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserSettingsService {
  constructor(private prisma: PrismaService) {}

  async getUserSettings(userId: string) {
    try {
      console.log(`getUserSettings called with userId: "${userId}"`);

      // First check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          city: true,
          businessType: true,
          role: true,
        },
      });

      console.log(`User found:`, user ? `${user.name} (${user.role})` : 'null');

      if (!user) {
        throw new NotFoundException(`User not found with id: ${userId}`);
      }

      // Try to find existing settings
      let settings = await this.prisma.userSettings.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              city: true,
              businessType: true,
            },
          },
        },
      });

      // If no settings exist, create default settings
      if (!settings) {
        console.log(`Creating user settings for user ${userId} (${user.role})`);
        settings = await this.prisma.userSettings.create({
          data: {
            userId,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                city: true,
                businessType: true,
              },
            },
          },
        });
      }

      return {
        success: true,
        settings,
      };
    } catch (error) {
      console.error('Error in getUserSettings:', error);
      throw error;
    }
  }

  async updateUserSettings(userId: string, updateData: UpdateUserSettingsDto) {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prepare update data - flatten the nested structure
    const flatUpdateData: any = {};

    if (updateData.notifications) {
      Object.assign(flatUpdateData, {
        emailNotifications: updateData.notifications.emailNotifications,
        pushNotifications: updateData.notifications.pushNotifications,
        smsNotifications: updateData.notifications.smsNotifications,
        marketingNotifications: updateData.notifications.marketingNotifications,
        investmentUpdates: updateData.notifications.investmentUpdates,
        businessUpdates: updateData.notifications.businessUpdates,
        messageAlerts: updateData.notifications.messageAlerts,
        weeklyDigest: updateData.notifications.weeklyDigest,
      });
    }

    if (updateData.privacy) {
      Object.assign(flatUpdateData, {
        profileVisibility: updateData.privacy.profileVisibility,
        showContactInfo: updateData.privacy.showContactInfo,
        showBusinessCount: updateData.privacy.showBusinessCount,
        showInvestmentHistory: updateData.privacy.showInvestmentHistory,
        allowDirectMessages: updateData.privacy.allowDirectMessages,
      });
    }

    if (updateData.preferences) {
      Object.assign(flatUpdateData, {
        language: updateData.preferences.language,
        theme: updateData.preferences.theme,
        currency: updateData.preferences.currency,
        dateFormat: updateData.preferences.dateFormat,
        timezone: updateData.preferences.timezone,
      });
    }

    if (updateData.security) {
      Object.assign(flatUpdateData, {
        twoFactorEnabled: updateData.security.twoFactorEnabled,
        loginAlerts: updateData.security.loginAlerts,
        sessionTimeout: updateData.security.sessionTimeout,
        allowMultipleSessions: updateData.security.allowMultipleSessions,
      });
    }

    // Remove undefined values
    Object.keys(flatUpdateData).forEach((key) => {
      if (flatUpdateData[key] === undefined) {
        delete flatUpdateData[key];
      }
    });

    // Update or create settings
    const settings = await this.prisma.userSettings.upsert({
      where: { userId },
      update: flatUpdateData,
      create: {
        userId,
        ...flatUpdateData,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
            businessType: true,
          },
        },
      },
    });

    return {
      success: true,
      settings,
      message: 'Settings updated successfully',
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword, confirmPassword } = changePasswordDto;

    // Check if new password matches confirmation
    if (newPassword !== confirmPassword) {
      throw new BadRequestException(
        'New password and confirmation do not match',
      );
    }

    // Find the user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
      },
    });

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  async exportUserData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        businesses: true,
        investmentRequests: true,
        notifications: true,
        settings: true,
        userActivities: {
          take: 100, // Last 100 activities
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Remove sensitive data
    const exportData = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        businessType: user.businessType,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      businesses: user.businesses,
      investmentRequests: user.investmentRequests,
      notifications: user.notifications,
      settings: user.settings,
      recentActivities: user.userActivities,
      exportDate: new Date(),
    };

    return {
      success: true,
      data: exportData,
      message: 'User data exported successfully',
    };
  }

  async deleteUserAccount(userId: string, password: string) {
    // Find the user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password is incorrect');
    }

    // Start transaction to delete all user data
    await this.prisma.$transaction(async (tx) => {
      // Delete user settings
      await tx.userSettings.deleteMany({
        where: { userId },
      });

      // Delete notifications
      await tx.notification.deleteMany({
        where: { userId },
      });

      // Delete activity logs
      await tx.activityLog.deleteMany({
        where: { userId },
      });

      // Delete investment requests
      await tx.investmentRequest.deleteMany({
        where: {
          OR: [{ investorId: userId }, { businessOwnerId: userId }],
        },
      });

      // Delete businesses (this will cascade to investment requests)
      await tx.business.deleteMany({
        where: { ownerId: userId },
      });

      // Finally delete the user
      await tx.user.delete({
        where: { id: userId },
      });
    });

    return {
      success: true,
      message: 'User account deleted successfully',
    };
  }

  async getAccountSummary(userId: string) {
    const [
      user,
      businessesCount,
      investmentRequestsCount,
      notificationsCount,
      activitiesCount,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          city: true,
          businessType: true,
          emailVerified: true,
          phoneVerified: true,
          createdAt: true,
        },
      }),
      this.prisma.business.count({
        where: { ownerId: userId },
      }),
      this.prisma.investmentRequest.count({
        where: { investorId: userId },
      }),
      this.prisma.notification.count({
        where: { userId },
      }),
      this.prisma.activityLog.count({
        where: { userId },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      summary: {
        user,
        counts: {
          businesses: businessesCount,
          investmentRequests: investmentRequestsCount,
          notifications: notificationsCount,
          activities: activitiesCount,
        },
      },
    };
  }
}
