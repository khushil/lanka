import DataLoader from 'dataloader';
import { DataLoaderContext, LoaderOptions, CacheOptions, BatchLoadFn } from './types';
import { logger } from '../logging/logger';

/**
 * Base class for all DataLoader implementations
 * Provides common functionality like caching, metrics, and error handling
 */
export abstract class BaseDataLoader<K, V> {
  protected loader: DataLoader<K, V>;
  protected context: DataLoaderContext;
  protected loaderType: string;
  protected options: LoaderOptions;

  constructor(
    loaderType: string,
    context: DataLoaderContext,
    batchLoadFn: BatchLoadFn<K, V>,
    options: LoaderOptions = {}
  ) {
    this.loaderType = loaderType;
    this.context = context;
    this.options = options;

    // Create the DataLoader instance
    this.loader = new DataLoader<K, V>(
      this.createInstrumentedBatchFunction(batchLoadFn),
      {
        cache: options.cache?.enabled !== false,
        batchScheduleFn: options.batchScheduleFn,
        maxBatchSize: options.maxBatchSize || 100,
        cacheKeyFn: this.getCacheKey.bind(this),
        cacheMap: options.cache?.ttl ? this.createTTLCache(options.cache) : undefined
      }
    );
  }

  /**
   * Load a single item by key
   */
  async load(key: K): Promise<V> {
    try {
      const startTime = Date.now();
      
      // Check if already in cache
      if (this.loader.cache && this.loader.cache.get(key)) {
        this.context.metrics?.recordCacheHit(this.loaderType, String(key));
      } else {
        this.context.metrics?.recordCacheMiss(this.loaderType, String(key));
      }

      const result = await this.loader.load(key);
      
      const duration = Date.now() - startTime;
      if (duration > 100) { // Log slow individual loads
        logger.debug('Slow DataLoader load operation', {
          loaderType: this.loaderType,
          key: String(key),
          duration
        });
      }

      return result;
    } catch (error) {
      logger.error('DataLoader load error', {
        loaderType: this.loaderType,
        key: String(key),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Load multiple items by keys
   */
  async loadMany(keys: K[]): Promise<(V | Error)[]> {
    try {
      const startTime = Date.now();
      const results = await this.loader.loadMany(keys);
      
      const duration = Date.now() - startTime;
      if (duration > 200) { // Log slow batch loads
        logger.debug('Slow DataLoader loadMany operation', {
          loaderType: this.loaderType,
          keyCount: keys.length,
          duration
        });
      }

      return results;
    } catch (error) {
      logger.error('DataLoader loadMany error', {
        loaderType: this.loaderType,
        keyCount: keys.length,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Prime the cache with a known value
   */
  prime(key: K, value: V): void {
    this.loader.prime(key, value);
  }

  /**
   * Clear a specific key from cache
   */
  clear(key: K): void {
    this.loader.clear(key);
  }

  /**
   * Clear all cached values
   */
  clearAll(): void {
    this.loader.clearAll();
  }

  /**
   * Get the underlying DataLoader instance
   */
  getLoader(): DataLoader<K, V> {
    return this.loader;
  }

  /**
   * Create an instrumented batch function that records metrics
   */
  private createInstrumentedBatchFunction(batchLoadFn: BatchLoadFn<K, V>): BatchLoadFn<K, V> {
    return async (keys: readonly K[]) => {
      const startTime = Date.now();
      
      try {
        logger.debug('DataLoader batch operation started', {
          loaderType: this.loaderType,
          batchSize: keys.length,
          keys: keys.slice(0, 10).map(String) // Log first 10 keys only
        });

        const results = await batchLoadFn(keys);
        const duration = Date.now() - startTime;

        // Record metrics
        this.context.metrics?.recordBatchLoad(this.loaderType, keys.length, duration);

        // Validate results
        if (results.length !== keys.length) {
          const error = new Error(`Batch function returned ${results.length} results for ${keys.length} keys`);
          logger.error('DataLoader batch function result count mismatch', {
            loaderType: this.loaderType,
            expectedCount: keys.length,
            actualCount: results.length,
            error
          });
          throw error;
        }

        logger.debug('DataLoader batch operation completed', {
          loaderType: this.loaderType,
          batchSize: keys.length,
          duration,
          successCount: results.filter(r => !(r instanceof Error)).length,
          errorCount: results.filter(r => r instanceof Error).length
        });

        return results;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        logger.error('DataLoader batch operation failed', {
          loaderType: this.loaderType,
          batchSize: keys.length,
          duration,
          error: error.message
        });

        // Return errors for all keys
        return keys.map(() => error);
      }
    };
  }

  /**
   * Generate cache key for given input
   */
  protected getCacheKey(key: K): string {
    if (typeof key === 'string' || typeof key === 'number') {
      return String(key);
    }
    
    if (typeof key === 'object' && key !== null) {
      return JSON.stringify(key);
    }
    
    return String(key);
  }

  /**
   * Create a TTL-aware cache implementation
   */
  private createTTLCache(cacheOptions: CacheOptions): Map<string, { value: V; expiry: number }> {
    const cache = new Map<string, { value: V; expiry: number }>();
    const ttl = cacheOptions.ttl || 300000; // 5 minutes default
    const maxSize = cacheOptions.maxSize || 1000;

    // Periodic cleanup of expired entries
    const cleanup = () => {
      const now = Date.now();
      const expiredKeys: string[] = [];
      
      for (const [key, entry] of cache.entries()) {
        if (now > entry.expiry) {
          expiredKeys.push(key);
        }
      }
      
      expiredKeys.forEach(key => cache.delete(key));
      
      // If still over max size, remove oldest entries
      if (cache.size > maxSize) {
        const entries = Array.from(cache.entries());
        const toRemove = cache.size - maxSize;
        for (let i = 0; i < toRemove; i++) {
          cache.delete(entries[i][0]);
        }
      }
    };

    // Run cleanup every minute
    setInterval(cleanup, 60000);

    return new Map([
      ['get', (key: string) => {
        const entry = cache.get(key);
        if (!entry) return undefined;
        
        if (Date.now() > entry.expiry) {
          cache.delete(key);
          return undefined;
        }
        
        return entry.value;
      }],
      ['set', (key: string, value: V) => {
        cache.set(key, {
          value,
          expiry: Date.now() + ttl
        });
      }],
      ['delete', (key: string) => {
        return cache.delete(key);
      }],
      ['clear', () => {
        cache.clear();
      }]
    ] as any);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate?: number;
    missRate?: number;
  } {
    const cacheMap = (this.loader as any)._cacheMap;
    
    return {
      size: cacheMap ? cacheMap.size || 0 : 0,
      // Hit/miss rates would need to be tracked separately if needed
    };
  }
}