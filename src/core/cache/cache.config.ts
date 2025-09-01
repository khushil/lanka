/**
 * Cache Configuration
 * Centralized configuration and initialization for all cache services
 */

import { RedisService } from './redis.service';
import { CacheManager } from './cache.manager';
import { CachedNeo4jService } from './cached-neo4j.service';
import { CacheWarmingService } from './cache-warming.service';
import { CacheInvalidationService } from './cache-invalidation.service';
import { GraphQLCacheMiddleware } from './graphql-cache.middleware';
import { logger } from '../logging/logger';

export interface CacheConfigOptions {
  enableWarming?: boolean;
  enableInvalidation?: boolean;
  enableGraphQLCache?: boolean;
  startupWarmingEnabled?: boolean;
  metricsReportingInterval?: number;
}

export class CacheConfiguration {
  private redis: RedisService;
  private cacheManager: CacheManager;
  private cachedNeo4j: CachedNeo4jService;
  private warmingService?: CacheWarmingService;
  private invalidationService?: CacheInvalidationService;
  private graphqlMiddleware?: GraphQLCacheMiddleware;
  private metricsInterval?: NodeJS.Timeout;
  private isInitialized = false;

  private readonly defaultOptions: Required<CacheConfigOptions> = {
    enableWarming: true,
    enableInvalidation: true,
    enableGraphQLCache: true,
    startupWarmingEnabled: true,
    metricsReportingInterval: 300000 // 5 minutes
  };

  constructor(private options: CacheConfigOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Cache configuration already initialized');
      return;
    }

    try {
      logger.info('Initializing cache configuration', this.options);

      // Initialize core services
      this.redis = RedisService.getInstance();
      this.cacheManager = new CacheManager();
      this.cachedNeo4j = new CachedNeo4jService();

      // Verify Redis connection
      const isRedisHealthy = await this.redis.ping();
      if (!isRedisHealthy) {
        throw new Error('Redis connection failed');
      }

      // Initialize optional services
      if (this.options.enableWarming) {
        this.warmingService = new CacheWarmingService();
        if (this.options.startupWarmingEnabled) {
          await this.warmingService.start();
        }
      }

      if (this.options.enableInvalidation) {
        this.invalidationService = new CacheInvalidationService();
      }

      if (this.options.enableGraphQLCache) {
        this.graphqlMiddleware = new GraphQLCacheMiddleware();
      }

      // Start metrics reporting
      if (this.options.metricsReportingInterval > 0) {
        this.startMetricsReporting();
      }

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      this.isInitialized = true;
      logger.info('Cache configuration initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize cache configuration', error);
      throw error;
    }
  }

  private startMetricsReporting(): void {
    this.metricsInterval = setInterval(async () => {
      try {
        await this.reportMetrics();
      } catch (error) {
        logger.error('Failed to report cache metrics', error);
      }
    }, this.options.metricsReportingInterval);
  }

  private async reportMetrics(): Promise<void> {
    const metrics = {
      timestamp: new Date().toISOString(),
      redis: {
        memory: await this.redis.getMemoryUsage(),
        info: await this.redis.getInfo()
      },
      cache: await this.cacheManager.getAllMetrics(),
      warming: this.warmingService ? 
        this.warmingService.getStrategyMetrics() as any : null,
      invalidation: this.invalidationService ? 
        this.invalidationService.getMetrics() : null,
      graphql: this.graphqlMiddleware ? 
        await this.graphqlMiddleware.getMetrics() : null
    };

    logger.info('Cache system metrics', metrics);

    // Store metrics in cache for dashboard/monitoring
    await this.cacheManager.set('system:metrics:cache', metrics, {
      tier: 'cold' as any,
      ttl: 3600, // 1 hour
      namespace: 'system'
    });
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down cache services gracefully`);
      
      try {
        await this.shutdown();
        process.exit(0);
      } catch (error) {
        logger.error('Error during cache shutdown', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    logger.info('Shutting down cache configuration');

    try {
      // Stop metrics reporting
      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
      }

      // Shutdown services in reverse order
      if (this.invalidationService) {
        await this.invalidationService.shutdown();
      }

      if (this.warmingService) {
        await this.warmingService.stop();
      }

      // Disconnect Redis last
      await this.redis.disconnect();

      this.isInitialized = false;
      logger.info('Cache configuration shut down successfully');

    } catch (error) {
      logger.error('Error during cache shutdown', error);
      throw error;
    }
  }

  // Service getters
  getRedisService(): RedisService {
    this.ensureInitialized();
    return this.redis;
  }

  getCacheManager(): CacheManager {
    this.ensureInitialized();
    return this.cacheManager;
  }

  getCachedNeo4jService(): CachedNeo4jService {
    this.ensureInitialized();
    return this.cachedNeo4j;
  }

  getWarmingService(): CacheWarmingService | null {
    this.ensureInitialized();
    return this.warmingService || null;
  }

  getInvalidationService(): CacheInvalidationService | null {
    this.ensureInitialized();
    return this.invalidationService || null;
  }

  getGraphQLMiddleware(): GraphQLCacheMiddleware | null {
    this.ensureInitialized();
    return this.graphqlMiddleware || null;
  }

  // Utility methods
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    services: Record<string, boolean>;
    errors: string[];
  }> {
    const services: Record<string, boolean> = {};
    const errors: string[] = [];

    try {
      // Redis health check
      services.redis = await this.redis.ping();
      if (!services.redis) {
        errors.push('Redis connection failed');
      }

      // Cache manager health check
      try {
        const testKey = 'health:check:' + Date.now();
        await this.cacheManager.set(testKey, 'test', { tier: 'hot' as any, ttl: 60 });
        const result = await this.cacheManager.get(testKey);
        services.cacheManager = result === 'test';
        await this.cacheManager.del(testKey);
        
        if (!services.cacheManager) {
          errors.push('Cache manager operations failed');
        }
      } catch (error) {
        services.cacheManager = false;
        errors.push(`Cache manager error: ${error}`);
      }

      // Neo4j cache health check
      try {
        const testResult = await this.cachedNeo4j.executeQuery(
          'RETURN 1 as test',
          {},
          undefined,
          { tier: 'hot' as any, ttl: 60 }
        );
        services.neo4jCache = testResult.data.length > 0;
        
        if (!services.neo4jCache) {
          errors.push('Neo4j cache operations failed');
        }
      } catch (error) {
        services.neo4jCache = false;
        errors.push(`Neo4j cache error: ${error}`);
      }

      // Warming service health check
      if (this.warmingService) {
        services.warmingService = this.warmingService.isServiceRunning();
      }

      // Invalidation service health check
      if (this.invalidationService) {
        services.invalidationService = true; // Service doesn't have a direct health check
      }

    } catch (error) {
      errors.push(`Health check error: ${error}`);
    }

    const allHealthy = Object.values(services).every(status => status === true);
    
    return {
      status: allHealthy && errors.length === 0 ? 'healthy' : 'unhealthy',
      services,
      errors
    };
  }

  async getSystemInfo(): Promise<any> {
    this.ensureInitialized();

    return {
      initialized: this.isInitialized,
      options: this.options,
      redis: {
        isCluster: this.redis.isCluster,
        memory: await this.redis.getMemoryUsage()
      },
      services: {
        warming: this.warmingService ? {
          running: this.warmingService.isServiceRunning(),
          strategies: Array.from(this.warmingService.getStrategies().keys())
        } : null,
        invalidation: this.invalidationService ? {
          rules: Array.from(this.invalidationService.getRules().keys())
        } : null,
        graphql: this.graphqlMiddleware ? {
          resolvers: Array.from(this.graphqlMiddleware.getAllConfigs().keys())
        } : null
      }
    };
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Cache configuration not initialized. Call initialize() first.');
    }
  }

  // Convenience methods for common operations
  async warmProject(projectId: string): Promise<number> {
    if (!this.warmingService) {
      throw new Error('Cache warming service not enabled');
    }
    return await this.warmingService.warmProjectData(projectId);
  }

  async warmUser(userId: string): Promise<number> {
    if (!this.warmingService) {
      throw new Error('Cache warming service not enabled');
    }
    return await this.warmingService.warmUserData(userId);
  }

  async invalidateRequirement(
    requirementId: string,
    operation: 'create' | 'update' | 'delete',
    projectId?: string
  ): Promise<void> {
    if (!this.invalidationService) {
      throw new Error('Cache invalidation service not enabled');
    }
    await this.invalidationService.invalidateRequirement(requirementId, operation, projectId);
  }

  async invalidateProject(
    projectId: string,
    operation: 'create' | 'update' | 'delete'
  ): Promise<void> {
    if (!this.invalidationService) {
      throw new Error('Cache invalidation service not enabled');
    }
    await this.invalidationService.invalidateProject(projectId, operation);
  }
}

// Singleton instance for global use
let globalCacheConfig: CacheConfiguration | null = null;

export function initializeGlobalCache(options?: CacheConfigOptions): CacheConfiguration {
  if (!globalCacheConfig) {
    globalCacheConfig = new CacheConfiguration(options);
  }
  return globalCacheConfig;
}

export function getGlobalCache(): CacheConfiguration {
  if (!globalCacheConfig) {
    throw new Error('Global cache not initialized. Call initializeGlobalCache() first.');
  }
  return globalCacheConfig;
}

export async function shutdownGlobalCache(): Promise<void> {
  if (globalCacheConfig) {
    await globalCacheConfig.shutdown();
    globalCacheConfig = null;
  }
}