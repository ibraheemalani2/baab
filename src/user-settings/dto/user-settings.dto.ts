import {
  IsOptional,
  IsBoolean,
  IsEnum,
  IsString,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum ProfileVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  INVESTORS_ONLY = 'INVESTORS_ONLY',
}

enum Currency {
  USD = 'USD',
  IQD = 'IQD',
}

export class NotificationSettingsDto {
  @ApiPropertyOptional({ description: 'Enable email notifications' })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Enable push notifications' })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Enable SMS notifications' })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Enable marketing notifications' })
  @IsOptional()
  @IsBoolean()
  marketingNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Enable investment update notifications',
  })
  @IsOptional()
  @IsBoolean()
  investmentUpdates?: boolean;

  @ApiPropertyOptional({ description: 'Enable business update notifications' })
  @IsOptional()
  @IsBoolean()
  businessUpdates?: boolean;

  @ApiPropertyOptional({ description: 'Enable message alert notifications' })
  @IsOptional()
  @IsBoolean()
  messageAlerts?: boolean;

  @ApiPropertyOptional({ description: 'Enable weekly digest notifications' })
  @IsOptional()
  @IsBoolean()
  weeklyDigest?: boolean;
}

export class PrivacySettingsDto {
  @ApiPropertyOptional({
    description: 'Profile visibility level',
    enum: ProfileVisibility,
  })
  @IsOptional()
  @IsEnum(ProfileVisibility)
  profileVisibility?: ProfileVisibility;

  @ApiPropertyOptional({ description: 'Show contact information in profile' })
  @IsOptional()
  @IsBoolean()
  showContactInfo?: boolean;

  @ApiPropertyOptional({ description: 'Show business count in profile' })
  @IsOptional()
  @IsBoolean()
  showBusinessCount?: boolean;

  @ApiPropertyOptional({ description: 'Show investment history in profile' })
  @IsOptional()
  @IsBoolean()
  showInvestmentHistory?: boolean;

  @ApiPropertyOptional({
    description: 'Allow direct messages from other users',
  })
  @IsOptional()
  @IsBoolean()
  allowDirectMessages?: boolean;
}

export class PreferencesDto {
  @ApiPropertyOptional({
    description: 'User interface language',
    example: 'ar',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  language?: string;

  @ApiPropertyOptional({
    description: 'UI theme preference',
    example: 'system',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  theme?: string;

  @ApiPropertyOptional({
    description: 'Preferred currency',
    enum: Currency,
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({
    description: 'Date format preference',
    example: 'dd/mm/yyyy',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  dateFormat?: string;

  @ApiPropertyOptional({
    description: 'User timezone',
    example: 'Asia/Baghdad',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;
}

export class SecuritySettingsDto {
  @ApiPropertyOptional({ description: 'Enable two-factor authentication' })
  @IsOptional()
  @IsBoolean()
  twoFactorEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable login alerts' })
  @IsOptional()
  @IsBoolean()
  loginAlerts?: boolean;

  @ApiPropertyOptional({ description: 'Session timeout in minutes' })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440) // Max 24 hours
  sessionTimeout?: number;

  @ApiPropertyOptional({ description: 'Allow multiple active sessions' })
  @IsOptional()
  @IsBoolean()
  allowMultipleSessions?: boolean;
}

export class UpdateUserSettingsDto {
  @ApiPropertyOptional({ description: 'Notification preferences' })
  @IsOptional()
  notifications?: NotificationSettingsDto;

  @ApiPropertyOptional({ description: 'Privacy settings' })
  @IsOptional()
  privacy?: PrivacySettingsDto;

  @ApiPropertyOptional({ description: 'User preferences' })
  @IsOptional()
  preferences?: PreferencesDto;

  @ApiPropertyOptional({ description: 'Security settings' })
  @IsOptional()
  security?: SecuritySettingsDto;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: 'New password' })
  @IsString()
  @MaxLength(128)
  newPassword: string;

  @ApiProperty({ description: 'Confirm new password' })
  @IsString()
  confirmPassword: string;
}
