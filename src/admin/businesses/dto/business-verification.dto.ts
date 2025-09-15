import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { BusinessStatus } from '@prisma/client';

export class BusinessVerificationDto {
  @IsEnum(BusinessStatus, {
    message:
      'Status must be one of: PENDING, APPROVED, REJECTED, SOLD, FUNDED, SUSPENDED',
  })
  status: BusinessStatus;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @Length(0, 1000, { message: 'Notes must be between 0 and 1000 characters' })
  notes?: string;
}
