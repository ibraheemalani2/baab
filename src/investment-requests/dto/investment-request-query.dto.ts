import { IsOptional, IsEnum, IsString } from 'class-validator';
import { RequestStatus } from '@prisma/client';

export class InvestmentRequestQueryDto {
  @IsEnum(RequestStatus)
  @IsOptional()
  status?: RequestStatus;

  @IsString()
  @IsOptional()
  investorId?: string;

  @IsString()
  @IsOptional()
  businessOwnerId?: string;

  @IsString()
  @IsOptional()
  businessId?: string;
}
