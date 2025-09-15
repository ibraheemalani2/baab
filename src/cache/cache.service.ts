import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  // Generic cache operations
  async get<T>(key: string): Promise<T | undefined> {
    try {
      return await this.cacheManager.get<T>(key);
    } catch (error) {
      console.error(`Cache get error for key "${key}":`, error);
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
    } catch (error) {
      console.error(`Cache set error for key "${key}":`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      console.error(`Cache del error for key "${key}":`, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.cacheManager.store.keys(pattern);
      if (keys && keys.length > 0) {
        await Promise.all(keys.map((key) => this.cacheManager.del(key)));
      }
    } catch (error) {
      console.error(`Cache delPattern error for pattern "${pattern}":`, error);
    }
  }

  async reset(): Promise<void> {
    try {
      await this.cacheManager.reset();
    } catch (error) {
      console.error('Cache reset error:', error);
    }
  }

  // Business-specific cache methods
  async getBusinesses(
    filters?: Record<string, unknown>,
  ): Promise<unknown[] | undefined> {
    const key = this.generateBusinessKey(filters);
    return this.get<any[]>(key);
  }

  async setBusinesses(
    businesses: unknown[],
    filters?: Record<string, unknown>,
    ttl: number = 300000,
  ): Promise<void> {
    const key = this.generateBusinessKey(filters);
    await this.set(key, businesses, ttl);
  }

  async invalidateBusinesses(businessId?: string): Promise<void> {
    if (businessId) {
      // Invalidate specific business and related caches
      await this.del(`business:${businessId}`);
      await this.del(`business:owner:${businessId}`);
    }
    // Invalidate all business list caches
    await this.delPattern('businesses:*');
    await this.delPattern('business:stats:*');
  }

  // Investment request cache methods
  async getInvestmentRequests(
    filters?: Record<string, unknown>,
  ): Promise<unknown[] | undefined> {
    const key = this.generateInvestmentRequestKey(filters);
    return this.get<any[]>(key);
  }

  async setInvestmentRequests(
    requests: unknown[],
    filters?: Record<string, unknown>,
    ttl: number = 300000,
  ): Promise<void> {
    const key = this.generateInvestmentRequestKey(filters);
    await this.set(key, requests, ttl);
  }

  async invalidateInvestmentRequests(
    userId?: string,
    businessId?: string,
  ): Promise<void> {
    if (userId) {
      await this.delPattern(`investment-requests:*:${userId}:*`);
    }
    if (businessId) {
      await this.delPattern(`investment-requests:*:*:${businessId}`);
    }
    await this.delPattern('investment-requests:*');
  }

  // User session cache methods
  async getUserSession(userId: string): Promise<any | undefined> {
    return this.get(`session:${userId}`);
  }

  async setUserSession(
    userId: string,
    sessionData: any,
    ttl: number = 1800000,
  ): Promise<void> {
    await this.set(`session:${userId}`, sessionData, ttl); // 30 minutes
  }

  async invalidateUserSession(userId: string): Promise<void> {
    await this.del(`session:${userId}`);
  }

  // Statistics cache methods
  async getStats(type: string): Promise<any | undefined> {
    return this.get(`stats:${type}`);
  }

  async setStats(
    type: string,
    stats: any,
    ttl: number = 600000,
  ): Promise<void> {
    await this.set(`stats:${type}`, stats, ttl); // 10 minutes
  }

  async invalidateStats(): Promise<void> {
    await this.delPattern('stats:*');
  }

  // Private helper methods
  private generateBusinessKey(filters?: Record<string, unknown>): string {
    if (!filters) return 'businesses:all';

    const filterStr = Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${String(value)}`)
      .join(':');

    return `businesses:${filterStr}`;
  }

  private generateInvestmentRequestKey(
    filters?: Record<string, unknown>,
  ): string {
    if (!filters) return 'investment-requests:all';

    const filterStr = Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${String(value)}`)
      .join(':');

    return `investment-requests:${filterStr}`;
  }

  // Health check method
  async ping(): Promise<boolean> {
    try {
      await this.set('ping', 'pong', 1000);
      const result = await this.get('ping');
      await this.del('ping');
      return result === 'pong';
    } catch (error) {
      console.error('Cache ping error:', error);
      return false;
    }
  }
}
