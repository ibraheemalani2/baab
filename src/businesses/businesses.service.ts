/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CacheService } from '../cache/cache.service';
import { BusinessStatus, Currency } from '@prisma/client';

interface CreateBusinessDto {
  title: string;
  description: string;
  price: number | bigint;
  currency?: Currency;
  city: string;
  category: string;
  location: string;
  established?: number;
  employees?: number;
  monthlyRevenue?: number | bigint;
  tags?: string[];
  images?: string[];
  ownerId: string;
}

interface UpdateBusinessDto {
  title?: string;
  description?: string;
  price?: number | bigint;
  currency?: Currency;
  city?: string;
  category?: string;
  location?: string;
  established?: number;
  employees?: number;
  monthlyRevenue?: number | bigint;
  tags?: string[];
  images?: string[];
  status?: BusinessStatus;
}

interface BusinessFilters {
  status?: BusinessStatus;
  city?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  currency?: Currency;
  [key: string]: unknown;
}

@Injectable()
export class BusinessesService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async createBusiness(createBusinessDto: CreateBusinessDto) {
    const business = await this.prisma.business.create({
      data: {
        ...createBusinessDto,
        currency: createBusinessDto.currency || 'USD',
        tags: createBusinessDto.tags || [],
        images: createBusinessDto.images || [],
        status: 'PENDING',
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
            businessType: true,
          },
        },
      },
    });

    // Invalidate related caches
    await this.cacheService.invalidateBusinesses();
    await this.cacheService.invalidateStats();

    // Transform BigInt values to numbers for JSON serialization
    return this.transformBusinessForJson(business);
  }

  // Helper method to transform BigInt values to numbers for JSON serialization
  private transformBusinessForJson(business: any) {
    return {
      ...business,
      price:
        typeof business.price === 'bigint'
          ? Number(business.price)
          : business.price,
      monthlyRevenue:
        typeof business.monthlyRevenue === 'bigint'
          ? Number(business.monthlyRevenue)
          : business.monthlyRevenue,
      // Transform nested investment requests BigInt values
      investmentRequests: business.investmentRequests
        ? business.investmentRequests.map((request: any) => ({
            ...request,
            requestedAmount:
              typeof request.requestedAmount === 'bigint'
                ? Number(request.requestedAmount)
                : request.requestedAmount,
            offeredAmount:
              typeof request.offeredAmount === 'bigint'
                ? Number(request.offeredAmount)
                : request.offeredAmount,
          }))
        : business.investmentRequests,
    };
  }

  async getBusinesses(filters: BusinessFilters = {}) {
    // Try to get from cache first
    const cachedBusinesses = await this.cacheService.getBusinesses(filters);
    if (cachedBusinesses) {
      return cachedBusinesses;
    }

    // If not in cache, fetch from database
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.city) {
      where.city = filters.city;
    }
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.currency) {
      where.currency = filters.currency;
    }
    if (filters.minPrice || filters.maxPrice) {
      where.price = {};
      if (filters.minPrice) {
        where.price.gte = filters.minPrice;
      }
      if (filters.maxPrice) {
        where.price.lte = filters.maxPrice;
      }
    }

    const businesses = await this.prisma.business.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
            businessType: true,
          },
        },
        _count: {
          select: {
            investmentRequests: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform BigInt values to numbers for JSON serialization
    const transformedBusinesses = businesses.map((business) =>
      this.transformBusinessForJson(business),
    );

    // Cache the result
    await this.cacheService.setBusinesses(transformedBusinesses, filters);

    return transformedBusinesses;
  }

  async getBusinessById(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
            businessType: true,
          },
        },
        investmentRequests: {
          include: {
            investor: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                city: true,
                businessType: true,
              },
            },
          },
          orderBy: {
            requestDate: 'desc',
          },
        },
        _count: {
          select: {
            investmentRequests: true,
          },
        },
      },
    });

    return business ? this.transformBusinessForJson(business) : null;
  }

  async getBusinessesByOwner(ownerId: string) {
    const businesses = await this.prisma.business.findMany({
      where: { ownerId },
      include: {
        _count: {
          select: {
            investmentRequests: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform BigInt values to numbers for JSON serialization
    return businesses.map((business) =>
      this.transformBusinessForJson(business),
    );
  }

  async updateBusiness(id: string, updateBusinessDto: UpdateBusinessDto) {
    const business = await this.prisma.business.update({
      where: { id },
      data: updateBusinessDto,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
            businessType: true,
          },
        },
      },
    });

    // Invalidate related caches
    await this.cacheService.invalidateBusinesses(id);
    await this.cacheService.invalidateStats();

    // Transform BigInt values to numbers for JSON serialization
    return this.transformBusinessForJson(business);
  }

  async deleteBusiness(id: string) {
    const result = await this.prisma.business.delete({
      where: { id },
    });

    // Invalidate related caches
    await this.cacheService.invalidateBusinesses(id);
    await this.cacheService.invalidateStats();

    return result;
  }

  async getBusinessStats() {
    // Try to get from cache first
    const cachedStats = await this.cacheService.getStats('business');
    if (cachedStats) {
      return cachedStats;
    }

    // If not in cache, calculate from database
    const totalBusinesses = await this.prisma.business.count();
    const approvedBusinesses = await this.prisma.business.count({
      where: { status: 'APPROVED' },
    });
    const pendingBusinesses = await this.prisma.business.count({
      where: { status: 'PENDING' },
    });
    const soldBusinesses = await this.prisma.business.count({
      where: { status: 'SOLD' },
    });

    const stats = {
      total: totalBusinesses,
      approved: approvedBusinesses,
      pending: pendingBusinesses,
      sold: soldBusinesses,
    };

    // Cache the result for 10 minutes
    await this.cacheService.setStats('business', stats);

    return stats;
  }

  /**
   * Advanced search using PostgreSQL full-text search indexes
   * Supports Arabic and English queries with relevance ranking
   */
  async searchBusinesses(query: string, filters: BusinessFilters = {}) {
    const startTime = Date.now();

    // Build search query parts
    const searchConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Full-text search condition (if query provided)
    if (query && query.trim()) {
      const cleanQuery = query.trim();

      // Use combined full-text search index for best performance
      searchConditions.push(`
        to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(location, '')) 
        @@ plainto_tsquery('simple', $${paramIndex})
      `);
      queryParams.push(cleanQuery);
      paramIndex++;
    }

    // Status filter
    if (filters.status) {
      searchConditions.push(`status = $${paramIndex}`);
      queryParams.push(filters.status);
      paramIndex++;
    } else {
      // Default to approved businesses for public search
      searchConditions.push(`status = 'APPROVED'`);
    }

    // City filter
    if (filters.city) {
      searchConditions.push(`city = $${paramIndex}`);
      queryParams.push(filters.city);
      paramIndex++;
    }

    // Category filter
    if (filters.category) {
      searchConditions.push(`category = $${paramIndex}`);
      queryParams.push(filters.category);
      paramIndex++;
    }

    // Currency filter
    if (filters.currency) {
      searchConditions.push(`currency = $${paramIndex}`);
      queryParams.push(filters.currency);
      paramIndex++;
    }

    // Price range filter
    if (filters.minPrice !== undefined) {
      searchConditions.push(`price >= $${paramIndex}`);
      queryParams.push(filters.minPrice);
      paramIndex++;
    }
    if (filters.maxPrice !== undefined) {
      searchConditions.push(`price <= $${paramIndex}`);
      queryParams.push(filters.maxPrice);
      paramIndex++;
    }

    // Build WHERE clause
    const whereClause =
      searchConditions.length > 0
        ? `WHERE ${searchConditions.join(' AND ')}`
        : '';

    // Build ORDER BY clause with relevance ranking
    let orderByClause = 'ORDER BY "createdAt" DESC';
    if (query && query.trim()) {
      orderByClause = `
        ORDER BY 
          ts_rank(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(location, '')), 
                  plainto_tsquery('simple', $1)) DESC,
          "createdAt" DESC
      `;
    }

    // Execute search query with proper joins
    const searchQuery = `
      SELECT 
        b.*,
        u.id as owner_id,
        u.name as owner_name,
        u.email as owner_email,
        u.phone as owner_phone,
        u.city as owner_city,
        u.business_type as owner_business_type,
        (SELECT COUNT(*) FROM investment_requests ir WHERE ir.business_id = b.id) as investment_requests_count
        ${
          query && query.trim()
            ? `,
        ts_rank(to_tsvector('simple', coalesce(b.title, '') || ' ' || coalesce(b.description, '') || ' ' || coalesce(b.location, '')), 
                plainto_tsquery('simple', $1)) as relevance_score`
            : ''
        }
      FROM businesses b
      LEFT JOIN users u ON b.owner_id = u.id
      ${whereClause}
      ${orderByClause}
      LIMIT 50
    `;

    const businesses = (await this.prisma.$queryRawUnsafe(
      searchQuery,
      ...queryParams,
    )) as any[];

    // Transform results to match expected format
    const transformedBusinesses = businesses.map((business: any) => ({
      id: business.id,
      title: business.title,
      description: business.description,
      price: business.price,
      currency: business.currency,
      city: business.city,
      category: business.category,
      location: business.location,
      established: business.established,
      employees: business.employees,
      monthlyRevenue: business.monthlyRevenue,
      tags: business.tags,
      images: business.images,
      status: business.status,
      createdAt: business.createdAt ? new Date(business.createdAt) : null,
      updatedAt: business.updatedAt ? new Date(business.updatedAt) : null,
      owner: {
        id: business.owner_id,
        name: business.owner_name,
        email: business.owner_email,
        phone: business.owner_phone,
        city: business.owner_city,
        businessType: business.owner_business_type,
      },
      _count: {
        investmentRequests: business.investment_requests_count || 0,
      },
      ...(business.relevance_score && {
        relevanceScore: business.relevance_score,
      }),
    }));

    const executionTime = Date.now() - startTime;

    console.log(
      `🔍 Search executed in ${executionTime}ms for query: "${query}" with ${transformedBusinesses.length} results`,
    );

    return transformedBusinesses;
  }

  /**
   * Advanced search with comprehensive filtering, sorting, and pagination
   */
  async advancedSearchBusinesses(
    searchDto: import('./dto/business-search.dto').BusinessSearchFilters,
  ): Promise<import('./dto/business-search.dto').BusinessSearchResult> {
    const startTime = Date.now();
    const limit = Math.min(searchDto.limit || 20, 100); // Cap at 100
    const page = searchDto.page || 1;
    const offset = (page - 1) * limit;

    // Build search conditions and parameters
    const conditions: string[] = [];
    const countConditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Full-text search (if query provided)
    let hasTextSearch = false;
    if (searchDto.query && searchDto.query.trim()) {
      hasTextSearch = true;
      const cleanQuery = searchDto.query.trim();

      const textSearchCondition = `
        to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(location, '')) 
        @@ plainto_tsquery('simple', $${paramIndex})
      `;
      conditions.push(textSearchCondition);
      countConditions.push(textSearchCondition);
      params.push(cleanQuery);
      paramIndex++;
    }

    // Status filter (default to APPROVED for public searches)
    const statusCondition = searchDto.status
      ? `status = $${paramIndex}`
      : `status = 'APPROVED'`;
    conditions.push(statusCondition);
    countConditions.push(statusCondition);
    if (searchDto.status) {
      params.push(searchDto.status);
      paramIndex++;
    } else {
      params.push('APPROVED');
      paramIndex++;
    }

    // Apply other filters
    const addFilter = (field: string, value: any, operator = '=') => {
      if (value !== undefined && value !== null) {
        const condition = `${field} ${operator} $${paramIndex}`;
        conditions.push(condition);
        countConditions.push(condition);
        params.push(value);
        paramIndex++;
      }
    };

    addFilter('city', searchDto.city);
    addFilter('category', searchDto.category);
    addFilter('currency', searchDto.currency);
    addFilter('price', searchDto.minPrice, '>=');
    addFilter('price', searchDto.maxPrice, '<=');
    addFilter('"monthlyRevenue"', searchDto.minRevenue, '>=');
    addFilter('"monthlyRevenue"', searchDto.maxRevenue, '<=');
    addFilter('employees', searchDto.minEmployees, '>=');
    addFilter('employees', searchDto.maxEmployees, '<=');
    addFilter('established', searchDto.minEstablished, '>=');
    addFilter('established', searchDto.maxEstablished, '<=');

    // Tags filter (array contains)
    if (searchDto.tags && searchDto.tags.length > 0) {
      const tagsCondition = `tags && $${paramIndex}`;
      conditions.push(tagsCondition);
      countConditions.push(tagsCondition);
      params.push(searchDto.tags);
      paramIndex++;
    }

    // Location search
    if (searchDto.location) {
      const locationCondition = `location ILIKE $${paramIndex}`;
      conditions.push(locationCondition);
      countConditions.push(locationCondition);
      params.push(`%${searchDto.location}%`);
      paramIndex++;
    }

    // Build WHERE clause
    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countWhereClause =
      countConditions.length > 0
        ? `WHERE ${countConditions.join(' AND ')}`
        : '';

    // Build ORDER BY clause
    let orderByClause = '';
    switch (searchDto.sortBy) {
      case 'price_asc':
        orderByClause = 'ORDER BY price ASC, "createdAt" DESC';
        break;
      case 'price_desc':
        orderByClause = 'ORDER BY price DESC, "createdAt" DESC';
        break;
      case 'date_asc':
        orderByClause = 'ORDER BY "createdAt" ASC';
        break;
      case 'date_desc':
        orderByClause = 'ORDER BY "createdAt" DESC';
        break;
      case 'revenue_desc':
        orderByClause =
          'ORDER BY "monthlyRevenue" DESC NULLS LAST, "createdAt" DESC';
        break;
      case 'revenue_asc':
        orderByClause =
          'ORDER BY "monthlyRevenue" ASC NULLS LAST, "createdAt" DESC';
        break;
      case 'relevance':
      default:
        if (hasTextSearch) {
          orderByClause = `
            ORDER BY 
              ts_rank(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(location, '')), 
                      plainto_tsquery('simple', $1)) DESC,
              "createdAt" DESC
          `;
        } else {
          orderByClause = 'ORDER BY "createdAt" DESC';
        }
        break;
    }

    // Count total results
    const countQuery = `
      SELECT COUNT(*) as total
      FROM businesses
      ${countWhereClause}
    `;

    const countResult = (await this.prisma.$queryRawUnsafe(
      countQuery,
      ...params,
    )) as any[];
    const total = parseInt(countResult[0]?.total || '0');

    // Execute main search query
    const searchQuery = `
      SELECT 
        b.*,
        u.id as owner_id,
        u.name as owner_name,
        u.email as owner_email,
        u.phone as owner_phone,
        u.city as owner_city,
        u.business_type as owner_business_type,
        (SELECT COUNT(*) FROM investment_requests ir WHERE ir.business_id = b.id) as investment_requests_count
        ${
          hasTextSearch
            ? `,
        ts_rank(to_tsvector('simple', coalesce(b.title, '') || ' ' || coalesce(b.description, '') || ' ' || coalesce(b.location, '')), 
                plainto_tsquery('simple', $1)) as relevance_score`
            : ''
        }
      FROM businesses b
      LEFT JOIN users u ON b.owner_id = u.id
      ${whereClause}
      ${orderByClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const businesses = (await this.prisma.$queryRawUnsafe(
      searchQuery,
      ...params,
      limit,
      offset,
    )) as any[];

    // Transform results
    const transformedBusinesses = businesses.map((business: any) => ({
      id: business.id,
      title: business.title,
      description: business.description,
      price: business.price,
      currency: business.currency,
      city: business.city,
      category: business.category,
      location: business.location,
      established: business.established,
      employees: business.employees,
      monthlyRevenue: business.monthlyRevenue,
      tags: business.tags,
      images: business.images,
      status: business.status,
      createdAt: business.createdAt ? new Date(business.createdAt) : null,
      updatedAt: business.updatedAt ? new Date(business.updatedAt) : null,
      owner: {
        id: business.owner_id,
        name: business.owner_name,
        email: business.owner_email,
        phone: business.owner_phone,
        city: business.owner_city,
        businessType: business.owner_business_type,
      },
      _count: {
        investmentRequests: business.investment_requests_count || 0,
      },
      ...(business.relevance_score && {
        relevanceScore: business.relevance_score,
      }),
    }));

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;
    const executionTime = Date.now() - startTime;

    console.log(
      `🔍 Advanced search executed in ${executionTime}ms: ${transformedBusinesses.length}/${total} results`,
    );

    return {
      businesses: transformedBusinesses,
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev,
      searchMeta: {
        query: searchDto.query || '',
        filters: searchDto,
        executionTime,
        searchType: hasTextSearch
          ? conditions.length > 2
            ? 'combined'
            : 'fulltext'
          : 'filtered',
      },
    };
  }

  /**
   * Get available filter options for approved businesses
   */
  async getFilterOptions() {
    const cacheKey = 'business_filter_options';

    // Try cache first
    const cachedOptions = await this.cacheService.get(cacheKey);
    if (cachedOptions) {
      return cachedOptions;
    }

    // Get unique filter values from approved businesses
    const filterQuery = `
      SELECT 
        ARRAY_AGG(DISTINCT city ORDER BY city) as cities,
        ARRAY_AGG(DISTINCT category ORDER BY category) as categories,
        ARRAY_AGG(DISTINCT currency ORDER BY currency) as currencies,
        MIN(price) as min_price,
        MAX(price) as max_price,
        MIN("monthlyRevenue") as min_revenue,
        MAX("monthlyRevenue") as max_revenue,
        MIN(employees) as min_employees,
        MAX(employees) as max_employees,
        MIN(established) as min_established,
        MAX(established) as max_established
      FROM businesses 
      WHERE status = 'APPROVED'
    `;

    const result = (await this.prisma.$queryRawUnsafe(filterQuery)) as any[];
    const data = result[0];

    // Get unique tags
    const tagsQuery = `
      SELECT DISTINCT UNNEST(tags) as tag
      FROM businesses 
      WHERE status = 'APPROVED' AND tags IS NOT NULL AND array_length(tags, 1) > 0
      ORDER BY tag
    `;

    const tagsResult = (await this.prisma.$queryRawUnsafe(tagsQuery)) as any[];
    const tags = tagsResult.map((row: any) => row.tag).filter(Boolean);

    const filterOptions = {
      cities: data.cities?.filter(Boolean) || [],
      categories: data.categories?.filter(Boolean) || [],
      currencies: data.currencies?.filter(Boolean) || [],
      tags: tags,
      priceRange: {
        min: Number(data.min_price) || 0,
        max: Number(data.max_price) || 0,
      },
      revenueRange: {
        min: Number(data.min_revenue) || 0,
        max: Number(data.max_revenue) || 0,
      },
      employeesRange: {
        min: data.min_employees || 1,
        max: data.max_employees || 1000,
      },
      establishedRange: {
        min: data.min_established || 1900,
        max: data.max_established || new Date().getFullYear(),
      },
    };

    // Cache for 30 minutes
    await this.cacheService.set(cacheKey, filterOptions, 1800);

    return filterOptions;
  }

  // Get city statistics
  async getCityStatistics() {
    const cacheKey = 'business-city-stats';

    // Try cache first
    const cachedStats = await this.cacheService.get(cacheKey);
    if (cachedStats) {
      return cachedStats;
    }

    const statsQuery = `
      SELECT 
        city,
        COUNT(*) as business_count,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_count,
        AVG(CASE WHEN status = 'APPROVED' THEN price END) as avg_price,
        ARRAY_AGG(DISTINCT category ORDER BY category) as categories,
        COUNT(DISTINCT "ownerId") as unique_owners
      FROM businesses 
      WHERE city IS NOT NULL AND city != ''
      GROUP BY city
      ORDER BY business_count DESC
    `;

    const result = (await this.prisma.$queryRawUnsafe(statsQuery)) as any[];

    const cityStats = {
      success: true,
      cities:
        result.map((city: any) => ({
          name: city.city,
          businessCount: parseInt(city.business_count) || 0,
          approvedCount: parseInt(city.approved_count) || 0,
          averagePrice: Number(city.avg_price) || 0,
          topCategories: city.categories?.slice(0, 3) || [],
          uniqueOwners: parseInt(city.unique_owners) || 0,
        })) || [],
    };

    // Cache for 1 hour
    await this.cacheService.set(cacheKey, cityStats, 3600);

    return cityStats;
  }
}
