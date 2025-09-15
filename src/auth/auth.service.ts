/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import { Role } from './roles.enum';
import { ActivityLogsService } from '../admin/activity-logs/activity-logs.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private activityLogsService: ActivityLogsService,
  ) {}

  async validateUser(emailOrPhone: string, password: string) {
    // Static ADMIN credentials for development
    const STATIC_EMAIL = 'ADMIN@baab.iq';
    const STATIC_PASSWORD = 'ADMIN123';

    if (emailOrPhone === STATIC_EMAIL && password === STATIC_PASSWORD) {
      return {
        id: 'ADMIN-001',
        email: STATIC_EMAIL,
        name: 'Administrator',
        phone: '+964 770 123 4567',
        role: Role.ADMIN,
      };
    }

    // Check database for user
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrPhone }, { phone: emailOrPhone }],
      },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    // Return user without password
    const { password: _password, ...result } = user;
    return result;
  }

  async createUser(
    userData: {
      email?: string;
      phone?: string;
      password: string;
      name: string;
      city?: string;
      businessType?: string;
      role?: Role;
    },
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Check if user already exists
    if (userData.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: userData.email },
      });
      if (existingUser) {
        throw new Error('البريد الإلكتروني مستخدم بالفعل');
      }
    }

    if (userData.phone) {
      const existingUser = await this.prisma.user.findUnique({
        where: { phone: userData.phone },
      });
      if (existingUser) {
        throw new Error('رقم الهاتف مستخدم بالفعل');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: userData.email,
        phone: userData.phone,
        password: hashedPassword,
        name: userData.name,
        role: userData.role || Role.PROJECT_OWNER,
        emailVerified: false,
        phoneVerified: false,
        city: userData.city,
        businessType: userData.businessType,
      },
    });

    // Log user registration activity
    await this.activityLogsService.logUserRegistration(
      user.id,
      ipAddress,
      userAgent,
    );

    // Return user without password
    const { password: _password, ...result } = user;
    return result;
  }

  async login(
    emailOrPhone: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.validateUser(emailOrPhone, password);

    if (!user) {
      return null;
    }

    // Log successful login activity
    await this.activityLogsService.logUserLogin(user.id, ipAddress, userAgent);

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return {
      success: true,
      user,
      access_token: this.jwtService.sign(payload),
    };
  }

  generateToken(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return null;
    }

    // Return user without password
    const { password: _password, ...result } = user;
    return result;
  }

  async getUserByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    // Return user without password
    const { password: _password, ...result } = user;
    return result;
  }

  async getUserByPhone(phone: string) {
    const user = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      return null;
    }

    // Return user without password
    const { password: _password, ...result } = user;
    return result;
  }
}
