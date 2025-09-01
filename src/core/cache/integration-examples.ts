/**
 * Cache Integration Examples
 * Demonstrates how to integrate caching throughout the application
 */

import { 
  CacheConfiguration,
  initializeGlobalCache,
  getGlobalCache 
} from './cache.config';
import { CacheTier } from './cache.manager';
import { logger } from '../logging/logger';

// Example 1: Application Startup Integration
export async function initializeApplicationCache(): Promise<void> {
  try {
    logger.info('Initializing application cache system');
    
    // Initialize global cache with custom configuration
    const cacheConfig = initializeGlobalCache({
      enableWarming: true,
      enableInvalidation: true,
      enableGraphQLCache: true,
      startupWarmingEnabled: true,
      metricsReportingInterval: 300000 // 5 minutes
    });

    // Initialize the cache system
    await cacheConfig.initialize();
    
    // Verify cache health
    const healthCheck = await cacheConfig.healthCheck();
    if (healthCheck.status === 'unhealthy') {
      logger.error('Cache system unhealthy', healthCheck.errors);
      throw new Error('Cache initialization failed');
    }

    logger.info('Application cache system initialized successfully');
    
  } catch (error) {
    logger.error('Failed to initialize application cache', error);
    throw error;
  }
}

// Example 2: Service Layer Integration
export class CachedRequirementService {
  private cache = getGlobalCache();

  async getRequirement(id: string): Promise<any> {
    const neo4j = this.cache.getCachedNeo4jService();
    
    // Use cached Neo4j service for automatic caching
    const result = await neo4j.executeQuery(
      'MATCH (r:Requirement {id: $id}) RETURN r',
      { id },
      undefined,
      { 
        tier: CacheTier.HOT,
        ttl: 300 // 5 minutes
      }
    );

    return result.data[0]?.r || null;
  }

  async findSimilarRequirements(requirementId: string, threshold = 0.7): Promise<any[]> {
    const similarity = this.cache.getCachedNeo4jService();
    
    const result = await similarity.findSimilarRequirements(requirementId, threshold, {
      tier: CacheTier.HOT
    });

    return result.data || [];
  }

  async updateRequirement(id: string, updates: any): Promise<void> {
    const neo4j = this.cache.getCachedNeo4jService();
    const invalidation = this.cache.getInvalidationService();
    
    try {
      // Update the requirement
      await neo4j.executeTransaction(async (tx) => {
        return await tx.run(
          'MATCH (r:Requirement {id: $id}) SET r += $updates RETURN r',
          { id, updates }
        );
      }, undefined, [
        `*requirement*${id}*`,
        `*similar*${id}*`,
        `*project*${updates.projectId}*`
      ]);

      // Trigger cache invalidation
      if (invalidation) {
        await invalidation.invalidateRequirement(id, 'update', updates.projectId);
      }

    } catch (error) {
      logger.error('Failed to update requirement', { id, error });
      throw error;
    }
  }
}

// Example 3: GraphQL Integration
export function createGraphQLServerWithCache(typeDefs: any, resolvers: any): any {
  const cacheConfig = getGlobalCache();
  const graphqlCache = cacheConfig.getGraphQLMiddleware();
  
  if (!graphqlCache) {
    throw new Error('GraphQL cache not initialized');
  }

  // Apply caching middleware to resolvers
  const cachedResolvers = {
    Query: {
      ...resolvers.Query,
      requirements: graphqlCache.createCacheMiddleware()(
        resolvers.Query.requirements
      ),
      similarRequirements: graphqlCache.createCacheMiddleware()(
        resolvers.Query.similarRequirements
      ),
      projectStatistics: graphqlCache.createCacheMiddleware()(
        resolvers.Query.projectStatistics
      )
    },
    Mutation: {
      ...resolvers.Mutation,
      // Mutations handle their own invalidation
      createRequirement: async (parent: any, args: any, context: any) => {
        const result = await resolvers.Mutation.createRequirement(parent, args, context);
        
        // Invalidate related caches
        const invalidation = cacheConfig.getInvalidationService();
        if (invalidation) {
          await invalidation.invalidateRequirement(result.id, 'create', args.projectId);
        }
        
        return result;
      }
    }
  };

  return {
    typeDefs,
    resolvers: cachedResolvers
  };
}

// Example 4: Express Middleware Integration
export function createCacheMiddleware() {
  return (req: any, res: any, next: any) => {
    const cacheConfig = getGlobalCache();
    
    // Add cache services to request context
    req.cache = {
      manager: cacheConfig.getCacheManager(),
      neo4j: cacheConfig.getCachedNeo4jService(),
      warming: cacheConfig.getWarmingService(),
      invalidation: cacheConfig.getInvalidationService()
    };
    
    next();
  };
}

// Example 5: Custom Cache Warming Strategy
export async function warmUserSpecificData(userId: string): Promise<void> {
  const cacheConfig = getGlobalCache();
  const warmingService = cacheConfig.getWarmingService();
  const neo4j = cacheConfig.getCachedNeo4jService();
  
  if (!warmingService) return;

  try {
    logger.info('Starting user-specific cache warming', { userId });

    // Warm user's requirements
    await neo4j.executeQuery(
      `MATCH (s:Stakeholder {id: $userId})-[:OWNS]->(r:Requirement) 
       RETURN r ORDER BY r.priority DESC LIMIT 20`,
      { userId },
      undefined,
      { tier: CacheTier.HOT }
    );

    // Warm user's projects
    await neo4j.executeQuery(
      `MATCH (s:Stakeholder {id: $userId})-[:PARTICIPATES_IN]->(p:Project) 
       RETURN p ORDER BY p.updatedAt DESC`,
      { userId },
      undefined,
      { tier: CacheTier.WARM }
    );

    // Warm similarity data for user's recent requirements
    const recentReqs = await neo4j.executeQuery(
      `MATCH (s:Stakeholder {id: $userId})-[:OWNS]->(r:Requirement)
       WHERE r.updatedAt >= datetime() - duration("P7D")
       RETURN r LIMIT 5`,
      { userId },
      undefined,
      { tier: CacheTier.HOT }
    );

    // Pre-compute similarities
    for (const req of recentReqs.data) {
      await neo4j.findSimilarRequirements(req.r.id, 0.7, { tier: CacheTier.HOT });
    }

    logger.info('User-specific cache warming completed', { userId });

  } catch (error) {
    logger.error('User cache warming failed', { userId, error });
  }
}

// Example 6: Performance Monitoring Integration
export class CachePerformanceMonitor {
  private cache = getGlobalCache();
  
  async generatePerformanceReport(): Promise<any> {
    const cacheManager = this.cache.getCacheManager();
    const redis = this.cache.getRedisService();
    const warmingService = this.cache.getWarmingService();
    const invalidationService = this.cache.getInvalidationService();

    const report = {
      timestamp: new Date().toISOString(),
      redis: {
        memory: await redis.getMemoryUsage(),
        info: await redis.getInfo()
      },
      cache: {
        global: await cacheManager.getMetrics(),
        neo4j: await cacheManager.getMetrics('neo4j'),
        similarity: await cacheManager.getMetrics('similarity'),
        graphql: await cacheManager.getMetrics('graphql')
      },
      warming: warmingService ? warmingService.getStrategyMetrics() : null,
      invalidation: invalidationService ? invalidationService.getMetrics() : null,
      recommendations: await this.generateRecommendations()
    };

    return report;
  }

  private async generateRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    const cacheManager = this.cache.getCacheManager();
    
    try {
      const metrics = await cacheManager.getAllMetrics();
      
      for (const [namespace, metric] of Object.entries(metrics)) {
        if (metric.hitRatio < 0.6) {
          recommendations.push(
            `${namespace} cache hit ratio is low (${(metric.hitRatio * 100).toFixed(1)}%). ` +
            'Consider increasing TTL or improving cache key strategies.'
          );
        }
        
        if (metric.averageLatency > 100) {
          recommendations.push(
            `${namespace} cache latency is high (${metric.averageLatency.toFixed(1)}ms). ` +
            'Consider Redis optimization or network tuning.'
          );
        }
      }

      const redisMemory = await this.cache.getRedisService().getMemoryUsage();
      if (redisMemory.fragmentation > 1.5) {
        recommendations.push(
          `Redis memory fragmentation is high (${redisMemory.fragmentation.toFixed(2)}). ` +
          'Consider Redis restart or memory optimization.'
        );
      }

    } catch (error) {
      logger.error('Failed to generate cache recommendations', error);
      recommendations.push('Error generating recommendations - check cache system health.');
    }

    return recommendations;
  }
}

// Example 7: Cache Testing Utilities
export class CacheTestUtils {
  private cache = getGlobalCache();

  async clearAllCaches(): Promise<void> {
    const cacheManager = this.cache.getCacheManager();
    await cacheManager.flush();
  }

  async seedTestData(): Promise<void> {
    const cacheManager = this.cache.getCacheManager();
    
    const testData = [
      { key: 'test:requirement:1', data: { id: '1', title: 'Test Requirement' } },
      { key: 'test:project:1', data: { id: '1', name: 'Test Project' } },
      { key: 'test:similarity:1', data: [{ id: '2', similarity: 0.85 }] }
    ];

    await cacheManager.mset(
      Object.fromEntries(testData.map(item => [item.key, JSON.stringify(item.data)])),
      { tier: CacheTier.HOT, ttl: 3600, namespace: 'test' }
    );
  }

  async verifyCacheIntegrity(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // Test Redis connection
      const redis = this.cache.getRedisService();
      if (!(await redis.ping())) {
        errors.push('Redis connection failed');
      }

      // Test cache operations
      const cacheManager = this.cache.getCacheManager();
      const testKey = `integrity-test:${Date.now()}`;
      const testValue = 'integrity-test-value';
      
      await cacheManager.set(testKey, testValue, { tier: CacheTier.HOT, ttl: 60 });
      const retrieved = await cacheManager.get(testKey);
      
      if (retrieved !== testValue) {
        errors.push('Cache set/get operations failed');
      }
      
      await cacheManager.del(testKey);

    } catch (error) {
      errors.push(`Cache integrity check failed: ${error}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}