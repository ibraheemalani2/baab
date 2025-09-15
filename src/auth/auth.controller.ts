/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  HttpException,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Role } from './roles.enum';

interface LoginDto {
  emailOrPhone: string;
  password: string;
}

interface RegisterDto {
  email?: string;
  phone?: string;
  password: string;
  name: string;
  city?: string;
  businessType?: string;
  role?: Role;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Request() req: any) {
    const { emailOrPhone, password } = loginDto;

    if (!emailOrPhone || !password) {
      throw new HttpException(
        'يرجى إدخال البريد الإلكتروني أو رقم الهاتف وكلمة المرور',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Extract IP address and user agent
    const ipAddress =
      req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.login(
      emailOrPhone,
      password,
      ipAddress,
      userAgent,
    );
    if (!result) {
      throw new HttpException(
        'البريد الإلكتروني أو رقم الهاتف أو كلمة المرور غير صحيح. يرجى المحاولة مرة أخرى.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return result;
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Request() req: any) {
    try {
      // Extract IP address and user agent
      const ipAddress =
        req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const user = await this.authService.createUser(
        registerDto,
        ipAddress,
        userAgent,
      );
      return {
        success: true,
        user,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('user/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getUser(@Param('id') id: string) {
    const user = await this.authService.getUserById(id);
    if (!user) {
      throw new HttpException('المستخدم غير موجود', HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      user,
    };
  }

  @Get('user/email/:email')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getUserByEmail(@Param('email') email: string) {
    const user = await this.authService.getUserByEmail(email);
    if (!user) {
      throw new HttpException('المستخدم غير موجود', HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      user,
    };
  }

  @Get('user/phone/:phone')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getUserByPhone(@Param('phone') phone: string) {
    const user = await this.authService.getUserByPhone(phone);
    if (!user) {
      throw new HttpException('المستخدم غير موجود', HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      user,
    };
  }
}
