import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Length,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { RequestStatus } from '@prisma/client';

export class UpdateInvestmentRequestDto {
  @IsEnum(RequestStatus)
  @IsOptional()
  status?: RequestStatus;

  @IsNumber()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  offeredAmount?: number;

  @IsString()
  @IsOptional()
  @Length(10, 1000)
  message?: string;

  @IsString()
  @IsOptional()
  @Length(10, 500)
  rejectionReason?: string;
}
