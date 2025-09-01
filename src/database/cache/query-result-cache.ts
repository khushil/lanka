import { logger } from '../../core/logging/logger';
import LRUCache from 'lru-cache';
import { createHash } from 'crypto';

export interface CacheConfig {
  maxSize: number;          // Maximum cache size in MB
  ttlSeconds: number;       // Default TTL in seconds
  updateThreshold: number;  // Update frequency threshold (0-1)
  compressionEnabled: boolean;
  persistToDisk: boolean;
  diskCachePath?: string;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  queryPattern: string;
  size: number;
  compressed?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalQueries: number;
  cacheSize: number;
  memoryUsage: number;
  compressionRatio: number;
  evictions: number;
  averageQueryTime: number;
  topQueries: Array<{ pattern: string; hits: number; avgTime: number }>;
}

export class QueryResultCache {
  private cache: LRUCache<string, CacheEntry>;
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalQueries: 0,
    totalQueryTime: 0,
    compressionSavings: 0
  };
  private patternStats = new Map<string, {
    hits: number;
    totalTime: number;
    avgTime: number;
  }>();

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 256, // 256MB default
      ttlSeconds: config.ttlSeconds || 300, // 5 minutes default
      updateThreshold: config.updateThreshold || 0.1, // 10% threshold
      compressionEnabled: config.compressionEnabled ?? true,
      persistToDisk: config.persistToDisk ?? false,
      diskCachePath: config.diskCachePath || './cache'
    };

    this.cache = new LRUCache<string, CacheEntry>({
      max: Math.floor((this.config.maxSize * 1024 * 1024) / 1000), // Approximate max items
      dispose: (value, key) => {
        this.stats.evictions++;
        logger.debug('Cache entry evicted', { key: key.substring(0, 50) });
      }
    });

    logger.info('Query result cache initialized', this.config);
  }

  /**
   * Get cached result for a query
   */
  public get<T = any>(
    query: string, 
    parameters: Record<string, any> = {},
    maxAge?: number
  ): T | null {
    const key = this.generateCacheKey(query, parameters);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.stats.totalQueries++;
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;
    const ttl = maxAge !== undefined ? maxAge : entry.ttl;

    // Check if entry is expired
    if (age > ttl * 1000) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.totalQueries++;
      logger.debug('Cache entry expired', { key: key.substring(0, 50), age, ttl });
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;

    this.stats.hits++;
    this.stats.totalQueries++;

    // Update pattern statistics
    this.updatePatternStats(entry.queryPattern, 0); // 0 time since it's a cache hit

    logger.debug('Cache hit', { 
      key: key.substring(0, 50), 
      accessCount: entry.accessCount,
      age 
    });

    return entry.compressed ? this.decompress(entry.data) : entry.data;
  }

  /**
   * Store query result in cache
   */
  public set<T = any>(
    query: string,
    parameters: Record<string, any> = {},
    data: T,
    ttlSeconds?: number,
    queryTime?: number
  ): void {
    const key = this.generateCacheKey(query, parameters);
    const now = Date.now();
    const ttl = ttlSeconds || this.config.ttlSeconds;

    // Calculate data size
    const dataSize = this.calculateSize(data);
    
    // Check if data should be compressed
    let finalData = data;
    let compressed = false;
    
    if (this.config.compressionEnabled && dataSize > 1024) { // Compress if > 1KB
      try {
        finalData = this.compress(data);
        compressed = true;
        const compressedSize = this.calculateSize(finalData);
        this.stats.compressionSavings += dataSize - compressedSize;
      } catch (error) {
        logger.warn('Failed to compress cache entry', error);
        finalData = data;
      }
    }

    const entry: CacheEntry<T> = {
      data: finalData,
      timestamp: now,
      ttl: ttl,
      accessCount: 1,
      lastAccessed: now,
      queryPattern: this.extractQueryPattern(query),
      size: dataSize,
      compressed
    };

    this.cache.set(key, entry);

    // Update pattern statistics
    if (queryTime !== undefined) {
      this.updatePatternStats(entry.queryPattern, queryTime);
      this.stats.totalQueryTime += queryTime;
    }

    logger.debug('Cache entry stored', { 
      key: key.substring(0, 50), 
      size: dataSize,
      compressed,
      ttl 
    });
  }

  /**
   * Check if query should use cache based on update frequency
   */
  public shouldCache(query: string, parameters: Record<string, any> = {}): boolean {
    const pattern = this.extractQueryPattern(query);
    
    // Don't cache write operations
    if (this.isWriteOperation(query)) {
      return false;
    }

    // Don't cache real-time sensitive queries
    if (this.isRealTimeSensitive(query)) {
      return false;
    }

    // Check update frequency threshold
    const patternStats = this.patternStats.get(pattern);
    if (patternStats && patternStats.hits < 3) {
      return false; // Wait for at least 3 requests before caching
    }

    return true;
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  public invalidate(pattern: string | RegExp): number {
    let invalidated = 0;
    const keys = Array.from(this.cache.keys());

    for (const key of keys) {
      const entry = this.cache.get(key);
      if (!entry) continue;

      let matches = false;
      if (typeof pattern === 'string') {
        matches = entry.queryPattern.includes(pattern) || key.includes(pattern);
      } else {
        matches = pattern.test(entry.queryPattern) || pattern.test(key);
      }

      if (matches) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    logger.info(`Invalidated ${invalidated} cache entries matching pattern: ${pattern}`);
    return invalidated;
  }

  /**
   * Invalidate cache for specific entities (useful after mutations)
   */
  public invalidateByEntity(entityType: string, entityId?: string): number {
    const pattern = entityId 
      ? new RegExp(`${entityType}.*${entityId}`, 'i')
      : new RegExp(entityType, 'i');
    
    return this.invalidate(pattern);
  }

  /**
   * Warm up cache with frequently used queries
   */
  public async warmUp(
    queries: Array<{ query: string; parameters: Record<string, any>; ttl?: number }>,
    queryExecutor: (query: string, params: Record<string, any>) => Promise<any>
  ): Promise<void> {
    logger.info(`Starting cache warmup with ${queries.length} queries`);

    const warmupPromises = queries.map(async ({ query, parameters, ttl }, index) => {
      try {
        // Add small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, index * 100));

        const result = await queryExecutor(query, parameters);
        this.set(query, parameters, result, ttl);

        logger.debug('Cache warmed up for query', { 
          query: query.substring(0, 50) + '...'
        });
      } catch (error) {
        logger.warn('Failed to warm up cache for query', { 
          query: query.substring(0, 50) + '...', 
          error 
        });
      }
    });

    await Promise.all(warmupPromises);
    logger.info('Cache warmup completed');
  }

  /**
   * Get comprehensive cache statistics
   */
  public getStats(): CacheStats {
    const totalQueries = this.stats.totalQueries;
    const hitRate = totalQueries > 0 ? (this.stats.hits / totalQueries) * 100 : 0;
    const averageQueryTime = totalQueries > 0 ? this.stats.totalQueryTime / totalQueries : 0;
    const compressionRatio = this.stats.compressionSavings > 0 ? 
      (this.stats.compressionSavings / (this.cache.size * 1000)) * 100 : 0;

    // Calculate top queries
    const topQueries = Array.from(this.patternStats.entries())
      .sort((a, b) => b[1].hits - a[1].hits)
      .slice(0, 10)
      .map(([pattern, stats]) => ({
        pattern: pattern.substring(0, 100) + (pattern.length > 100 ? '...' : ''),
        hits: stats.hits,
        avgTime: stats.avgTime
      }));

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      totalQueries,
      cacheSize: this.cache.size,
      memoryUsage: this.estimateMemoryUsage(),
      compressionRatio: Math.round(compressionRatio * 100) / 100,
      evictions: this.stats.evictions,
      averageQueryTime: Math.round(averageQueryTime * 100) / 100,
      topQueries
    };
  }

  /**
   * Clear all cache entries
   */
  public clear(): void {
    this.cache.clear();
    this.patternStats.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalQueries: 0,
      totalQueryTime: 0,
      compressionSavings: 0
    };
    logger.info('Cache cleared');
  }

  /**
   * Generate unique cache key for query and parameters
   */
  private generateCacheKey(query: string, parameters: Record<string, any>): string {
    const normalizedQuery = this.normalizeQuery(query);
    const sortedParams = this.sortParameters(parameters);
    const combined = `${normalizedQuery}:${JSON.stringify(sortedParams)}`;
    return createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Normalize query by removing extra whitespace and comments
   */
  private normalizeQuery(query: string): string {
    return query
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '') // Remove comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .toLowerCase();
  }

  /**
   * Sort parameters for consistent cache key generation
   */
  private sortParameters(parameters: Record<string, any>): Record<string, any> {
    const sorted: Record<string, any> = {};
    const keys = Object.keys(parameters).sort();
    
    for (const key of keys) {
      sorted[key] = parameters[key];
    }
    
    return sorted;
  }

  /**
   * Extract query pattern for statistics tracking
   */
  private extractQueryPattern(query: string): string {
    // Extract the main operation and entity types
    const normalized = this.normalizeQuery(query);
    const match = normalized.match(/^(match|create|merge|delete|call)\s+.*?(?:return|set|delete|$)/i);
    return match ? match[0].substring(0, 200) : normalized.substring(0, 200);
  }

  /**
   * Check if query is a write operation
   */
  private isWriteOperation(query: string): boolean {
    const writeKeywords = ['create', 'merge', 'set', 'delete', 'remove', 'drop'];
    const normalizedQuery = query.toLowerCase().trim();
    return writeKeywords.some(keyword => normalizedQuery.startsWith(keyword));
  }

  /**
   * Check if query is real-time sensitive
   */
  private isRealTimeSensitive(query: string): boolean {
    const realTimePatterns = [
      /current\s*time/i,
      /now\(\)/i,
      /datetime\(\)/i,
      /timestamp/i,
      /real.*time/i,
      /live/i
    ];
    
    return realTimePatterns.some(pattern => pattern.test(query));
  }

  /**
   * Update pattern statistics
   */
  private updatePatternStats(pattern: string, queryTime: number): void {
    if (!this.patternStats.has(pattern)) {
      this.patternStats.set(pattern, {
        hits: 0,
        totalTime: 0,
        avgTime: 0
      });
    }

    const stats = this.patternStats.get(pattern)!;
    stats.hits++;
    stats.totalTime += queryTime;
    stats.avgTime = stats.totalTime / stats.hits;
  }

  /**
   * Calculate approximate size of data in bytes
   */
  private calculateSize(data: any): number {
    try {
      return new TextEncoder().encode(JSON.stringify(data)).length;
    } catch {
      return 1000; // Fallback estimate
    }
  }

  /**
   * Compress data using a simple compression algorithm
   */
  private compress(data: any): string {
    // In a real implementation, you'd use a proper compression library like pako or lz-string
    // For now, we'll use a simple JSON stringify as placeholder
    return JSON.stringify(data);
  }

  /**
   * Decompress data
   */
  private decompress(compressedData: string): any {
    // Corresponding decompression for the compress method above
    return JSON.parse(compressedData);
  }

  /**
   * Estimate total memory usage of the cache
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    
    return totalSize;
  }

  /**
   * Clean up expired entries (called periodically)
   */
  public cleanupExpired(): number {
    let cleaned = 0;
    const now = Date.now();
    const keys = Array.from(this.cache.keys());

    for (const key of keys) {
      const entry = this.cache.get(key);
      if (!entry) continue;

      const age = now - entry.timestamp;
      if (age > entry.ttl * 1000) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }

    return cleaned;
  }

  /**
   * Get cache entry info for debugging
   */
  public getCacheEntryInfo(query: string, parameters: Record<string, any> = {}): {
    exists: boolean;
    key: string;
    entry?: CacheEntry;
    age?: number;
    expired?: boolean;
  } {
    const key = this.generateCacheKey(query, parameters);
    const entry = this.cache.get(key);

    if (!entry) {
      return { exists: false, key };
    }

    const now = Date.now();
    const age = now - entry.timestamp;
    const expired = age > entry.ttl * 1000;

    return {
      exists: true,
      key,
      entry,
      age,
      expired
    };
  }
}

// Export singleton instance
export const queryResultCache = new QueryResultCache();