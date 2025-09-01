/**
 * Cache Module Index
 * Export all caching components for easy integration
 */

// Core Redis and Cache Services
export { RedisService } from './redis.service';
export { CacheManager, CacheTier } from './cache.manager';
export type { CacheOptions, CacheMetrics, CacheEntry } from './cache.manager';

// Cached Database Services
export { CachedNeo4jService } from './cached-neo4j.service';
export type { QueryCacheOptions, CachedQueryResult } from './cached-neo4j.service';

// Cached Application Services
export { CachedSimilarityService } from '../modules/requirements/services/cached-similarity.service';
export type { SimilarRequirement, SimilarityCalculationOptions } from '../modules/requirements/services/cached-similarity.service';

// Cache Management Services
export { CacheWarmingService } from './cache-warming.service';
export type { WarmingStrategy, WarmingMetrics } from './cache-warming.service';

export { CacheInvalidationService } from './cache-invalidation.service';
export type { InvalidationRule, InvalidationEvent, InvalidationMetrics } from './cache-invalidation.service';

// GraphQL Caching
export { GraphQLCacheMiddleware } from './graphql-cache.middleware';
export type { GraphQLCacheOptions, ResolverCacheConfig } from './graphql-cache.middleware';

// Cache Configuration and Setup
export { CacheConfiguration } from './cache.config';

// Re-export commonly used types from other modules if needed
export type { EnvironmentConfig } from '../config/environment';