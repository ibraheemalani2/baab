import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
  Length,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Currency, InvestorType } from '@prisma/client';

export class CreateInvestmentRequestDto {
  @IsString()
  @IsNotEmpty()
  businessId: string;

  @IsString()
  @IsOptional()
  investorId?: string; // Now optional since authentication is disabled

  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  requestedAmount: number;

  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  offeredAmount: number;

  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency = Currency.USD;

  @IsString()
  @IsOptional()
  @Length(10, 1000)
  message?: string;

  @IsEnum(InvestorType)
  @IsOptional()
  investorType?: InvestorType = InvestorType.INDIVIDUAL;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  previousInvestments?: number = 0;
}
