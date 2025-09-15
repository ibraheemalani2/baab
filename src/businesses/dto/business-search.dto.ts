import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { BusinessStatus, Currency } from '@prisma/client';

export class BusinessSearchDto {
  @IsOptional()
  @IsString()
  query?: string; // Search query text

  @IsOptional()
  @IsEnum(BusinessStatus)
  status?: BusinessStatus;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(0)
  minRevenue?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(0)
  maxRevenue?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  minEmployees?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  maxEmployees?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1800)
  @Max(new Date().getFullYear())
  minEstablished?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1800)
  @Max(new Date().getFullYear())
  maxEstablished?: number;

  @IsOptional()
  @IsString()
  tags?: string; // Comma-separated tags

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum([
    'relevance',
    'price_asc',
    'price_desc',
    'date_desc',
    'date_asc',
    'revenue_desc',
    'revenue_asc',
  ])
  sortBy?:
    | 'relevance'
    | 'price_asc'
    | 'price_desc'
    | 'date_desc'
    | 'date_asc'
    | 'revenue_desc'
    | 'revenue_asc' = 'relevance';

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;
}

export interface BusinessSearchFilters {
  query?: string;
  status?: BusinessStatus;
  city?: string;
  category?: string;
  currency?: Currency;
  minPrice?: number;
  maxPrice?: number;
  minRevenue?: number;
  maxRevenue?: number;
  minEmployees?: number;
  maxEmployees?: number;
  minEstablished?: number;
  maxEstablished?: number;
  tags?: string[];
  location?: string;
  sortBy?: string;
  limit?: number;
  offset?: number;
  page?: number;
}

export interface BusinessSearchResult {
  businesses: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  searchMeta?: {
    query: string;
    filters: BusinessSearchFilters;
    executionTime: number;
    searchType: 'fulltext' | 'filtered' | 'combined';
  };
}
