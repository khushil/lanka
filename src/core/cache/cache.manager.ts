/**
 * Multi-Tier Cache Manager
 * Implements cache-aside pattern with TTL configuration and versioning
 */

import { RedisService } from './redis.service';
import { logger } from '../logging/logger';

export enum CacheTier {
  HOT = 'hot',      // 5 minutes - frequently accessed data
  WARM = 'warm',    // 1 hour - moderately accessed data
  COLD = 'cold'     // 24 hours - infrequently accessed data
}

export interface CacheOptions {
  tier?: CacheTier;
  ttl?: number;
  version?: string;
  compress?: boolean;
  namespace?: string;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRatio: number;
  totalRequests: number;
  averageLatency: number;
  memoryUsage: number;
}

export interface CacheEntry<T = any> {
  data: T;
  version: string;
  createdAt: number;
  tier: CacheTier;
  compressed?: boolean;
}

export class CacheManager {
  private redis: RedisService;
  private metrics: Map<string, CacheMetrics> = new Map();
  private readonly tierTTL: Record<CacheTier, number> = {
    [CacheTier.HOT]: 300,    // 5 minutes
    [CacheTier.WARM]: 3600,  // 1 hour
    [CacheTier.COLD]: 86400  // 24 hours
  };

  private readonly defaultNamespace = 'cache';
  private readonly versionPrefix = 'v';
  private readonly metricsKey = 'cache:metrics';

  constructor() {
    this.redis = RedisService.getInstance();
    this.initializeMetrics();
  }

  private async initializeMetrics(): Promise<void> {
    try {
      // Load existing metrics from Redis
      const existingMetrics = await this.redis.get(`${this.metricsKey}:global`);
      if (existingMetrics) {
        const metrics = JSON.parse(existingMetrics);
        this.metrics.set('global', metrics);
      }
    } catch (error) {
      logger.error('Failed to initialize cache metrics', error);
    }
  }

  private buildKey(key: string, namespace?: string, version?: string): string {
    const ns = namespace || this.defaultNamespace;
    const versionSuffix = version ? `:${this.versionPrefix}${version}` : '';
    return `${ns}:${key}${versionSuffix}`;
  }

  private getTTL(options: CacheOptions): number {
    if (options.ttl) return options.ttl;
    return this.tierTTL[options.tier || CacheTier.WARM];
  }

  private async updateMetrics(namespace: string, isHit: boolean, latency: number): Promise<void> {
    const key = `metrics:${namespace}`;
    let metrics = this.metrics.get(key) || {
      hits: 0,
      misses: 0,
      hitRatio: 0,
      totalRequests: 0,
      averageLatency: 0,
      memoryUsage: 0
    };

    metrics.totalRequests++;
    if (isHit) {
      metrics.hits++;
    } else {
      metrics.misses++;
    }
    
    metrics.hitRatio = metrics.hits / metrics.totalRequests;
    metrics.averageLatency = (metrics.averageLatency + latency) / 2;

    this.metrics.set(key, metrics);

    // Persist metrics every 100 requests
    if (metrics.totalRequests % 100 === 0) {
      await this.persistMetrics(key, metrics);
    }
  }

  private async persistMetrics(key: string, metrics: CacheMetrics): Promise<void> {
    try {
      await this.redis.set(`${this.metricsKey}:${key}`, JSON.stringify(metrics), 86400);
    } catch (error) {
      logger.error('Failed to persist cache metrics', error);
    }
  }

  private compressData(data: string): string {
    // Simple compression using built-in deflate
    const buffer = Buffer.from(data, 'utf-8');
    const compressed = require('zlib').deflateSync(buffer);
    return compressed.toString('base64');
  }

  private decompressData(data: string): string {
    try {
      const buffer = Buffer.from(data, 'base64');
      const decompressed = require('zlib').inflateSync(buffer);
      return decompressed.toString('utf-8');
    } catch (error) {
      logger.error('Failed to decompress cache data', error);
      return data; // Return original data if decompression fails
    }
  }

  async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const startTime = Date.now();
    const cacheKey = this.buildKey(key, options.namespace, options.version);
    const namespace = options.namespace || this.defaultNamespace;

    try {
      const cached = await this.redis.get(cacheKey);
      const latency = Date.now() - startTime;

      if (cached) {
        await this.updateMetrics(namespace, true, latency);
        
        try {
          const entry: CacheEntry<T> = JSON.parse(cached);
          const data = entry.compressed ? 
            JSON.parse(this.decompressData(entry.data as string)) : 
            entry.data;
          
          logger.debug('Cache hit', {
            key: cacheKey,
            tier: entry.tier,
            version: entry.version,
            latency
          });

          return data;
        } catch (parseError) {
          logger.error('Failed to parse cached data', parseError);
          await this.redis.del(cacheKey); // Remove corrupted cache entry
        }
      }

      await this.updateMetrics(namespace, false, latency);
      logger.debug('Cache miss', { key: cacheKey, latency });
      return null;

    } catch (error) {
      logger.error('Cache get operation failed', { key: cacheKey, error });
      return null;
    }
  }

  async set<T = any>(key: string, data: T, options: CacheOptions = {}): Promise<boolean> {
    const cacheKey = this.buildKey(key, options.namespace, options.version);
    const ttl = this.getTTL(options);
    const tier = options.tier || CacheTier.WARM;

    try {
      let serializedData = JSON.stringify(data);
      let compressed = false;

      // Auto-compress large data (>10KB) or if compression is explicitly requested
      if (options.compress || serializedData.length > 10240) {
        serializedData = this.compressData(serializedData);
        compressed = true;
      }

      const entry: CacheEntry<T | string> = {
        data: compressed ? serializedData : data,
        version: options.version || '1.0',
        createdAt: Date.now(),
        tier,
        compressed
      };

      const success = await this.redis.set(cacheKey, JSON.stringify(entry), ttl);

      if (success) {
        logger.debug('Cache set', {
          key: cacheKey,
          tier,
          ttl,
          compressed,
          size: serializedData.length
        });

        // Publish invalidation event for versioned entries
        if (options.version) {
          await this.publishInvalidationEvent(key, options.namespace, options.version);
        }
      }

      return success;
    } catch (error) {
      logger.error('Cache set operation failed', { key: cacheKey, error });
      return false;
    }
  }

  async mget<T = any>(keys: string[], options: CacheOptions = {}): Promise<(T | null)[]> {
    const cacheKeys = keys.map(key => this.buildKey(key, options.namespace, options.version));
    const namespace = options.namespace || this.defaultNamespace;

    try {
      const results = await this.redis.mget(cacheKeys);
      const parsedResults: (T | null)[] = [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const originalKey = keys[i];

        if (result) {
          try {
            const entry: CacheEntry<T> = JSON.parse(result);
            const data = entry.compressed ? 
              JSON.parse(this.decompressData(entry.data as string)) : 
              entry.data;
            parsedResults.push(data);
            await this.updateMetrics(namespace, true, 0);
          } catch (parseError) {
            logger.error(`Failed to parse cached data for key: ${originalKey}`, parseError);
            parsedResults.push(null);
            await this.updateMetrics(namespace, false, 0);
          }
        } else {
          parsedResults.push(null);
          await this.updateMetrics(namespace, false, 0);
        }
      }

      return parsedResults;
    } catch (error) {
      logger.error('Cache mget operation failed', { keys, error });
      return new Array(keys.length).fill(null);
    }
  }

  async mset<T = any>(entries: Record<string, T>, options: CacheOptions = {}): Promise<boolean> {
    const ttl = this.getTTL(options);
    const tier = options.tier || CacheTier.WARM;
    const keyValues: Record<string, string> = {};

    try {
      for (const [key, data] of Object.entries(entries)) {
        const cacheKey = this.buildKey(key, options.namespace, options.version);
        
        let serializedData = JSON.stringify(data);
        let compressed = false;

        if (options.compress || serializedData.length > 10240) {
          serializedData = this.compressData(serializedData);
          compressed = true;
        }

        const entry: CacheEntry<T | string> = {
          data: compressed ? serializedData : data,
          version: options.version || '1.0',
          createdAt: Date.now(),
          tier,
          compressed
        };

        keyValues[cacheKey] = JSON.stringify(entry);
      }

      const success = await this.redis.mset(keyValues, ttl);

      if (success) {
        logger.debug('Cache mset', {
          count: Object.keys(entries).length,
          tier,
          ttl,
          namespace: options.namespace
        });
      }

      return success;
    } catch (error) {
      logger.error('Cache mset operation failed', error);
      return false;
    }
  }

  async del(key: string, options: CacheOptions = {}): Promise<boolean> {
    const cacheKey = this.buildKey(key, options.namespace, options.version);
    
    try {
      const success = await this.redis.del(cacheKey);
      
      if (success) {
        logger.debug('Cache delete', { key: cacheKey });
        
        // Publish invalidation event
        await this.publishInvalidationEvent(key, options.namespace, options.version);
      }
      
      return success;
    } catch (error) {
      logger.error('Cache delete operation failed', { key: cacheKey, error });
      return false;
    }
  }

  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    const cacheKey = this.buildKey(key, options.namespace, options.version);
    return await this.redis.exists(cacheKey);
  }

  async expire(key: string, ttlSeconds: number, options: CacheOptions = {}): Promise<boolean> {
    const cacheKey = this.buildKey(key, options.namespace, options.version);
    return await this.redis.expire(cacheKey, ttlSeconds);
  }

  async ttl(key: string, options: CacheOptions = {}): Promise<number> {
    const cacheKey = this.buildKey(key, options.namespace, options.version);
    return await this.redis.ttl(cacheKey);
  }

  async invalidatePattern(pattern: string, namespace?: string): Promise<number> {
    const searchPattern = this.buildKey(pattern, namespace).replace(/\*/g, '*');
    let invalidatedCount = 0;

    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.redis.scan(cursor, searchPattern, 100);
        cursor = nextCursor;

        if (keys.length > 0) {
          const pipeline = this.redis.rawClient.pipeline();
          keys.forEach(key => pipeline.del(key));
          await pipeline.exec();
          invalidatedCount += keys.length;
        }
      } while (cursor !== '0');

      if (invalidatedCount > 0) {
        logger.info('Cache pattern invalidation', {
          pattern: searchPattern,
          invalidatedCount
        });

        // Publish pattern invalidation event
        await this.redis.publish('cache:pattern:invalidate', JSON.stringify({
          pattern: searchPattern,
          namespace,
          timestamp: Date.now()
        }));
      }

      return invalidatedCount;
    } catch (error) {
      logger.error('Cache pattern invalidation failed', { pattern, error });
      return 0;
    }
  }

  async invalidateVersion(version: string, namespace?: string): Promise<number> {
    const versionPattern = namespace ? 
      `${namespace}:*:${this.versionPrefix}${version}` : 
      `*:${this.versionPrefix}${version}`;

    return await this.invalidatePattern(versionPattern, namespace);
  }

  private async publishInvalidationEvent(key: string, namespace?: string, version?: string): Promise<void> {
    try {
      await this.redis.publish('cache:invalidate', JSON.stringify({
        key,
        namespace,
        version,
        timestamp: Date.now()
      }));
    } catch (error) {
      logger.error('Failed to publish cache invalidation event', error);
    }
  }

  async getMetrics(namespace?: string): Promise<CacheMetrics | null> {
    const key = namespace ? `metrics:${namespace}` : 'global';
    const metrics = this.metrics.get(key);
    
    if (metrics) {
      // Add current memory usage
      const memoryInfo = await this.redis.getMemoryUsage();
      metrics.memoryUsage = memoryInfo.used;
    }
    
    return metrics || null;
  }

  async getAllMetrics(): Promise<Record<string, CacheMetrics>> {
    const allMetrics: Record<string, CacheMetrics> = {};
    
    for (const [key, metrics] of this.metrics) {
      allMetrics[key] = metrics;
    }
    
    return allMetrics;
  }

  async clearMetrics(): Promise<void> {
    this.metrics.clear();
    
    try {
      const pattern = `${this.metricsKey}:*`;
      await this.invalidatePattern(pattern);
    } catch (error) {
      logger.error('Failed to clear persisted metrics', error);
    }
  }

  async warm(entries: Array<{ key: string; data: any; options?: CacheOptions }>): Promise<number> {
    let warmedCount = 0;

    try {
      const pipeline = this.redis.rawClient.pipeline();

      for (const entry of entries) {
        const options = entry.options || {};
        const cacheKey = this.buildKey(entry.key, options.namespace, options.version);
        const ttl = this.getTTL(options);
        const tier = options.tier || CacheTier.WARM;

        let serializedData = JSON.stringify(entry.data);
        let compressed = false;

        if (options.compress || serializedData.length > 10240) {
          serializedData = this.compressData(serializedData);
          compressed = true;
        }

        const cacheEntry: CacheEntry = {
          data: compressed ? serializedData : entry.data,
          version: options.version || '1.0',
          createdAt: Date.now(),
          tier,
          compressed
        };

        pipeline.setex(cacheKey, ttl, JSON.stringify(cacheEntry));
      }

      const results = await pipeline.exec();
      warmedCount = results?.filter(result => result[0] === null).length || 0;

      logger.info('Cache warming completed', {
        requestedCount: entries.length,
        warmedCount
      });

    } catch (error) {
      logger.error('Cache warming failed', error);
    }

    return warmedCount;
  }

  async flush(namespace?: string): Promise<boolean> {
    try {
      if (namespace) {
        const pattern = `${namespace}:*`;
        const invalidatedCount = await this.invalidatePattern(pattern);
        logger.info(`Flushed cache namespace: ${namespace} (${invalidatedCount} keys)`);
        return invalidatedCount > 0;
      } else {
        // Flush all cache (dangerous in production)
        const keys = await this.redis.keys(`${this.defaultNamespace}:*`);
        if (keys.length > 0) {
          const pipeline = this.redis.rawClient.pipeline();
          keys.forEach(key => pipeline.del(key));
          await pipeline.exec();
          logger.warn(`Flushed entire cache (${keys.length} keys)`);
        }
        return true;
      }
    } catch (error) {
      logger.error('Cache flush failed', { namespace, error });
      return false;
    }
  }
}