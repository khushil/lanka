/**
 * GraphQL Cache Middleware
 * Intelligent caching for GraphQL queries and resolvers
 */

import { CacheManager, CacheTier } from './cache.manager';
import { logger } from '../logging/logger';
import * as crypto from 'crypto';

export interface GraphQLCacheOptions {
  tier?: CacheTier;
  ttl?: number;
  keyGenerator?: (info: any, variables: any, context: any) => string;
  shouldCache?: (info: any, variables: any, context: any) => boolean;
  version?: string;
  tags?: string[];
}

export interface ResolverCacheConfig {
  [resolverPath: string]: GraphQLCacheOptions;
}

export class GraphQLCacheMiddleware {
  private cache: CacheManager;
  private readonly namespace = 'graphql';
  private resolverConfigs: Map<string, GraphQLCacheOptions> = new Map();
  private defaultConfig: GraphQLCacheOptions;

  constructor() {
    this.cache = new CacheManager();
    this.defaultConfig = {
      tier: CacheTier.WARM,
      ttl: 300, // 5 minutes default
      shouldCache: this.defaultShouldCache.bind(this)
    };

    this.initializeResolverConfigs();
  }

  private initializeResolverConfigs(): void {
    // Query resolvers - typically safe to cache
    this.resolverConfigs.set('Query.requirements', {
      tier: CacheTier.HOT,
      ttl: 300,
      tags: ['requirements']
    });

    this.resolverConfigs.set('Query.projects', {
      tier: CacheTier.WARM,
      ttl: 600,
      tags: ['projects']
    });

    this.resolverConfigs.set('Query.architectureDecisions', {
      tier: CacheTier.WARM,
      ttl: 900,
      tags: ['architecture']
    });

    this.resolverConfigs.set('Query.similarRequirements', {
      tier: CacheTier.HOT,
      ttl: 180, // 3 minutes for similarity results
      tags: ['similarity', 'requirements']
    });

    this.resolverConfigs.set('Query.projectStatistics', {
      tier: CacheTier.COLD,
      ttl: 3600, // 1 hour for statistics
      tags: ['statistics', 'projects']
    });

    this.resolverConfigs.set('Query.stakeholderExpertise', {
      tier: CacheTier.COLD,
      ttl: 7200, // 2 hours for expertise data
      tags: ['stakeholders', 'expertise']
    });

    // Field resolvers - cache expensive computed fields
    this.resolverConfigs.set('Requirement.similarRequirements', {
      tier: CacheTier.HOT,
      ttl: 300,
      tags: ['similarity', 'requirements'],
      keyGenerator: (info, variables, context) => {
        const requirementId = context.source?.id || variables?.id;
        const threshold = variables?.threshold || 0.7;
        return `requirement-similar:${requirementId}:${threshold}`;
      }
    });

    this.resolverConfigs.set('Project.completionPercentage', {
      tier: CacheTier.WARM,
      ttl: 600,
      tags: ['projects', 'statistics'],
      keyGenerator: (info, variables, context) => {
        const projectId = context.source?.id || variables?.projectId;
        return `project-completion:${projectId}`;
      }
    });

    this.resolverConfigs.set('Requirement.impactAnalysis', {
      tier: CacheTier.WARM,
      ttl: 1800, // 30 minutes for impact analysis
      tags: ['requirements', 'analysis'],
      keyGenerator: (info, variables, context) => {
        const requirementId = context.source?.id || variables?.id;
        return `requirement-impact:${requirementId}`;
      }
    });

    this.resolverConfigs.set('ArchitectureDecision.affectedRequirements', {
      tier: CacheTier.WARM,
      ttl: 900,
      tags: ['architecture', 'requirements'],
      keyGenerator: (info, variables, context) => {
        const decisionId = context.source?.id || variables?.id;
        return `architecture-affected:${decisionId}`;
      }
    });

    // Mutations - generally should not be cached, but can cache result patterns
    this.resolverConfigs.set('Mutation.createRequirement', {
      shouldCache: () => false // Never cache mutations directly
    });

    this.resolverConfigs.set('Mutation.updateRequirement', {
      shouldCache: () => false
    });

    // Complex aggregation queries
    this.resolverConfigs.set('Query.requirementTrends', {
      tier: CacheTier.COLD,
      ttl: 7200, // 2 hours for trend analysis
      tags: ['trends', 'analytics', 'requirements']
    });

    this.resolverConfigs.set('Query.technologyStackUsage', {
      tier: CacheTier.COLD,
      ttl: 14400, // 4 hours for technology usage stats
      tags: ['technology', 'analytics']
    });
  }

  private defaultShouldCache(info: any, variables: any, context: any): boolean {
    // Don't cache if user is not authenticated
    if (!context.user) {
      return false;
    }

    // Don't cache mutations by default
    if (info.operation?.operation === 'mutation') {
      return false;
    }

    // Don't cache subscription operations
    if (info.operation?.operation === 'subscription') {
      return false;
    }

    // Don't cache if query contains sensitive operations
    const query = info.operation?.loc?.source?.body || '';
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /private/i
    ];

    if (sensitivePatterns.some(pattern => pattern.test(query))) {
      return false;
    }

    // Cache read operations by default
    return true;
  }

  private generateCacheKey(
    info: any,
    variables: any,
    context: any,
    config?: GraphQLCacheOptions
  ): string {
    // Use custom key generator if provided
    if (config?.keyGenerator) {
      try {
        return config.keyGenerator(info, variables, context);
      } catch (error) {
        logger.warn('Custom key generator failed, falling back to default', error);
      }
    }

    // Default key generation
    const resolverPath = this.getResolverPath(info);
    const userId = context.user?.id || 'anonymous';
    
    // Create a deterministic key from query variables
    const sortedVariables = variables ? JSON.stringify(variables, Object.keys(variables).sort()) : '';
    const variableHash = crypto.createHash('md5').update(sortedVariables).digest('hex').substring(0, 8);
    
    // Include field selections for more specific caching
    const selections = this.getFieldSelections(info);
    const selectionHash = crypto.createHash('md5').update(selections.join(',')).digest('hex').substring(0, 8);
    
    return `${resolverPath}:${userId}:${variableHash}:${selectionHash}`;
  }

  private getResolverPath(info: any): string {
    const operation = info.operation?.operation || 'Query';
    const fieldName = info.fieldName;
    const parentType = info.parentType?.name || operation;
    
    return `${parentType}.${fieldName}`;
  }

  private getFieldSelections(info: any): string[] {
    try {
      const selections = info.fieldNodes?.[0]?.selectionSet?.selections || [];
      return selections.map((selection: any) => selection.name?.value || '').filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  async createCacheMiddleware() {
    return async (resolve: any, source: any, args: any, context: any, info: any) => {
      const resolverPath = this.getResolverPath(info);
      const config = this.resolverConfigs.get(resolverPath) || this.defaultConfig;

      // Check if this resolver should be cached
      const shouldCache = config.shouldCache ? 
        config.shouldCache(info, args, { ...context, source }) : 
        this.defaultShouldCache(info, args, { ...context, source });

      if (!shouldCache) {
        logger.debug('Resolver not cached', { resolverPath, reason: 'shouldCache returned false' });
        return await resolve(source, args, context, info);
      }

      const cacheKey = this.generateCacheKey(info, args, context, config);
      const startTime = Date.now();

      try {
        // Try to get from cache first
        const cached = await this.cache.get(cacheKey, {
          namespace: this.namespace,
          version: config.version
        });

        if (cached !== null) {
          logger.debug('GraphQL resolver served from cache', {
            resolverPath,
            cacheKey: cacheKey.substring(0, 20) + '...',
            executionTime: Date.now() - startTime
          });

          return cached;
        }

        // Execute resolver if not cached
        const result = await resolve(source, args, context, info);
        
        // Cache the result if it's not null/undefined
        if (result !== null && result !== undefined) {
          const tier = config.tier || this.defaultConfig.tier!;
          const ttl = config.ttl || this.defaultConfig.ttl;

          await this.cache.set(cacheKey, result, {
            tier,
            ttl,
            namespace: this.namespace,
            version: config.version,
            compress: this.shouldCompressResult(result)
          });

          logger.debug('GraphQL resolver result cached', {
            resolverPath,
            tier,
            ttl,
            resultSize: JSON.stringify(result).length,
            executionTime: Date.now() - startTime
          });
        }

        return result;

      } catch (error) {
        logger.error('GraphQL cache middleware error', {
          resolverPath,
          cacheKey,
          error
        });
        
        // Return the actual resolver result even if caching fails
        return await resolve(source, args, context, info);
      }
    };
  }

  private shouldCompressResult(result: any): boolean {
    try {
      const serialized = JSON.stringify(result);
      return serialized.length > 5120; // Compress results larger than 5KB
    } catch (error) {
      return false;
    }
  }

  // Tag-based invalidation
  async invalidateByTags(tags: string[]): Promise<number> {
    let totalInvalidated = 0;

    for (const tag of tags) {
      // Find all resolvers with this tag
      const resolversWithTag = Array.from(this.resolverConfigs.entries())
        .filter(([, config]) => config.tags?.includes(tag))
        .map(([resolverPath]) => resolverPath);

      // Invalidate patterns for each resolver
      for (const resolverPath of resolversWithTag) {
        const pattern = `${resolverPath.replace('.', '-')}:*`;
        const invalidated = await this.cache.invalidatePattern(pattern, this.namespace);
        totalInvalidated += invalidated;
      }

      logger.debug('Tag-based cache invalidation', {
        tag,
        resolversAffected: resolversWithTag.length,
        keysInvalidated: totalInvalidated
      });
    }

    return totalInvalidated;
  }

  // Resolver-specific invalidation
  async invalidateResolver(resolverPath: string): Promise<number> {
    const pattern = `${resolverPath.replace('.', '-')}:*`;
    const invalidated = await this.cache.invalidatePattern(pattern, this.namespace);
    
    logger.info('Resolver cache invalidated', {
      resolverPath,
      keysInvalidated: invalidated
    });

    return invalidated;
  }

  // Context-specific invalidation (e.g., for a specific user)
  async invalidateForUser(userId: string): Promise<number> {
    const pattern = `*:${userId}:*`;
    const invalidated = await this.cache.invalidatePattern(pattern, this.namespace);
    
    logger.info('User-specific cache invalidated', {
      userId,
      keysInvalidated: invalidated
    });

    return invalidated;
  }

  // Configuration management
  setResolverConfig(resolverPath: string, config: GraphQLCacheOptions): void {
    this.resolverConfigs.set(resolverPath, config);
    logger.info('GraphQL resolver cache config updated', { resolverPath, config });
  }

  getResolverConfig(resolverPath: string): GraphQLCacheOptions | undefined {
    return this.resolverConfigs.get(resolverPath);
  }

  getAllConfigs(): Map<string, GraphQLCacheOptions> {
    return new Map(this.resolverConfigs);
  }

  // Cache warming for GraphQL
  async warmResolvers(warmingQueries: Array<{
    resolverPath: string;
    variables: any;
    context: any;
    mockInfo?: any;
  }>): Promise<number> {
    let warmedCount = 0;

    for (const query of warmingQueries) {
      try {
        const config = this.resolverConfigs.get(query.resolverPath);
        const cacheKey = this.generateCacheKey(
          query.mockInfo || { fieldName: query.resolverPath.split('.')[1] },
          query.variables,
          query.context,
          config
        );

        // Skip if already cached
        const exists = await this.cache.exists(cacheKey, { namespace: this.namespace });
        if (exists) {
          continue;
        }

        // This would typically require executing the actual resolver
        // For now, we'll just mark the warming attempt
        warmedCount++;
        
        logger.debug('GraphQL resolver cache warming', {
          resolverPath: query.resolverPath,
          cacheKey: cacheKey.substring(0, 20) + '...'
        });

      } catch (error) {
        logger.warn('GraphQL resolver cache warming failed', {
          resolverPath: query.resolverPath,
          error
        });
      }
    }

    return warmedCount;
  }

  async getMetrics() {
    return await this.cache.getMetrics(this.namespace);
  }

  async clearCache(): Promise<boolean> {
    return await this.cache.flush(this.namespace);
  }
}