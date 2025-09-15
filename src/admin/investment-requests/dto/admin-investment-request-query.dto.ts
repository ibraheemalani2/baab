import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { RequestStatus, InvestorType } from '@prisma/client';

export class AdminInvestmentRequestQueryDto {
  @IsOptional()
  @IsString()
  search?: string; // Search in business title, investor name, or message

  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @IsOptional()
  @IsEnum(InvestorType)
  investorType?: InvestorType;

  @IsOptional()
  @IsString()
  businessCategory?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  reviewedBy?: string; // Admin ID who reviewed

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  minAmount?: number; // Minimum offered amount

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxAmount?: number; // Maximum offered amount

  @IsOptional()
  @IsString()
  sortBy?: string; // Field to sort by

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toLowerCase())
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;
}
