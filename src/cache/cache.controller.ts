import { Controller, Get } from '@nestjs/common';
import { CacheService } from './cache.service';

@Controller('cache')
export class CacheController {
  constructor(private cacheService: CacheService) {}

  @Get('health')
  async checkCacheHealth() {
    const isHealthy = await this.cacheService.ping();
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      redis: {
        connected: isHealthy,
      },
    };
  }

  @Get('stats')
  async getCacheStats() {
    try {
      // Get some basic cache information
      const testKey = `cache-test-${Date.now()}`;
      await this.cacheService.set(testKey, 'test', 1000);
      const testValue = await this.cacheService.get(testKey);
      await this.cacheService.del(testKey);

      return {
        status: 'operational',
        canWrite: testValue === 'test',
        canRead: testValue === 'test',
        canDelete: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('clear')
  async clearCache() {
    try {
      await this.cacheService.reset();
      return {
        success: true,
        message: 'Cache cleared successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
