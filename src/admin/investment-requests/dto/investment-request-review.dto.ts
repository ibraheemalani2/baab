import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { RequestStatus } from '@prisma/client';

export class InvestmentRequestReviewDto {
  @IsEnum(RequestStatus, {
    message:
      'Status must be one of: PENDING, APPROVED, REJECTED, WITHDRAWN, COMPLETED',
  })
  @IsNotEmpty()
  status: RequestStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Admin notes must not exceed 1000 characters' })
  adminNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Rejection reason must not exceed 500 characters',
  })
  rejectionReason?: string;
}
