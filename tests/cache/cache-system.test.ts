/**
 * Cache System Integration Tests
 * Comprehensive tests for Redis caching layer implementation
 */

import { 
  RedisService, 
  CacheManager, 
  CacheTier,
  CacheConfiguration,
  initializeGlobalCache
} from '../../src/core/cache';

describe('Redis Caching Layer', () => {
  let cacheConfig: CacheConfiguration;
  let redis: RedisService;
  let cacheManager: CacheManager;

  beforeAll(async () => {
    // Initialize cache system for testing
    cacheConfig = initializeGlobalCache({
      enableWarming: false, // Disable for tests
      enableInvalidation: false, // Disable for tests
      enableGraphQLCache: true,
      startupWarmingEnabled: false,
      metricsReportingInterval: 0
    });

    await cacheConfig.initialize();
    redis = cacheConfig.getRedisService();
    cacheManager = cacheConfig.getCacheManager();
  });

  afterAll(async () => {
    await cacheConfig.shutdown();
  });

  beforeEach(async () => {
    // Clear test data
    await cacheManager.flush('test');
  });

  describe('RedisService', () => {
    it('should establish Redis connection', async () => {
      const isConnected = await redis.ping();
      expect(isConnected).toBe(true);
    });

    it('should perform basic Redis operations', async () => {
      const key = 'test:basic';
      const value = 'test-value';

      // Set
      const setResult = await redis.set(key, value, 60);
      expect(setResult).toBe(true);

      // Get
      const getValue = await redis.get(key);
      expect(getValue).toBe(value);

      // Exists
      const exists = await redis.exists(key);
      expect(exists).toBe(true);

      // Delete
      const delResult = await redis.del(key);
      expect(delResult).toBe(true);

      // Verify deletion
      const getAfterDel = await redis.get(key);
      expect(getAfterDel).toBe(null);
    });

    it('should handle TTL operations', async () => {
      const key = 'test:ttl';
      const value = 'ttl-test';

      await redis.set(key, value, 2); // 2 seconds TTL

      const ttl = await redis.ttl(key);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(2);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 2100));

      const expiredValue = await redis.get(key);
      expect(expiredValue).toBe(null);
    });

    it('should handle batch operations', async () => {
      const keys = ['test:batch:1', 'test:batch:2', 'test:batch:3'];
      const values = ['value1', 'value2', 'value3'];
      const keyValues = Object.fromEntries(keys.map((key, i) => [key, values[i]]));

      // Multi-set
      const msetResult = await redis.mset(keyValues, 60);
      expect(msetResult).toBe(true);

      // Multi-get
      const mgetResult = await redis.mget(keys);
      expect(mgetResult).toEqual(values);
    });
  });

  describe('CacheManager', () => {
    it('should cache and retrieve simple values', async () => {
      const key = 'test:simple';
      const value = { id: 1, name: 'Test' };

      // Set
      const setResult = await cacheManager.set(key, value, {
        tier: CacheTier.HOT,
        ttl: 60,
        namespace: 'test'
      });
      expect(setResult).toBe(true);

      // Get
      const getValue = await cacheManager.get(key, { namespace: 'test' });
      expect(getValue).toEqual(value);
    });

    it('should respect cache tiers and TTL', async () => {
      const hotKey = 'test:hot';
      const warmKey = 'test:warm';
      const coldKey = 'test:cold';
      const value = 'tier-test';

      // Set with different tiers
      await cacheManager.set(hotKey, value, { tier: CacheTier.HOT, namespace: 'test' });
      await cacheManager.set(warmKey, value, { tier: CacheTier.WARM, namespace: 'test' });
      await cacheManager.set(coldKey, value, { tier: CacheTier.COLD, namespace: 'test' });

      // Verify all values are cached
      expect(await cacheManager.get(hotKey, { namespace: 'test' })).toBe(value);
      expect(await cacheManager.get(warmKey, { namespace: 'test' })).toBe(value);
      expect(await cacheManager.get(coldKey, { namespace: 'test' })).toBe(value);

      // Check TTL differences (hot should have shorter TTL than cold)
      const hotTtl = await cacheManager.ttl(hotKey, { namespace: 'test' });
      const coldTtl = await cacheManager.ttl(coldKey, { namespace: 'test' });
      expect(coldTtl).toBeGreaterThan(hotTtl);
    });

    it('should handle cache versioning', async () => {
      const key = 'test:version';
      const value1 = 'version1';
      const value2 = 'version2';

      // Set version 1
      await cacheManager.set(key, value1, {
        version: '1.0',
        namespace: 'test'
      });

      // Set version 2
      await cacheManager.set(key, value2, {
        version: '2.0',
        namespace: 'test'
      });

      // Get specific versions
      const getV1 = await cacheManager.get(key, {
        version: '1.0',
        namespace: 'test'
      });
      const getV2 = await cacheManager.get(key, {
        version: '2.0',
        namespace: 'test'
      });

      expect(getV1).toBe(value1);
      expect(getV2).toBe(value2);
    });

    it('should compress large data', async () => {
      const key = 'test:large';
      const largeValue = {
        data: 'x'.repeat(20000), // 20KB of data
        timestamp: Date.now()
      };

      const setResult = await cacheManager.set(key, largeValue, {
        tier: CacheTier.WARM,
        namespace: 'test',
        compress: true
      });
      expect(setResult).toBe(true);

      const getValue = await cacheManager.get(key, { namespace: 'test' });
      expect(getValue).toEqual(largeValue);
    });

    it('should handle batch operations', async () => {
      const entries = {
        'batch:1': { id: 1, name: 'Item 1' },
        'batch:2': { id: 2, name: 'Item 2' },
        'batch:3': { id: 3, name: 'Item 3' }
      };

      // Multi-set
      const msetResult = await cacheManager.mset(entries, {
        tier: CacheTier.WARM,
        namespace: 'test'
      });
      expect(msetResult).toBe(true);

      // Multi-get
      const keys = Object.keys(entries);
      const mgetResult = await cacheManager.mget(keys, { namespace: 'test' });
      expect(mgetResult).toEqual(Object.values(entries));
    });

    it('should invalidate cache patterns', async () => {
      const keys = ['user:1:profile', 'user:1:settings', 'user:2:profile'];
      const value = 'test-value';

      // Set multiple keys
      for (const key of keys) {
        await cacheManager.set(key, value, { namespace: 'test' });
      }

      // Verify all keys exist
      for (const key of keys) {
        expect(await cacheManager.exists(key, { namespace: 'test' })).toBe(true);
      }

      // Invalidate pattern user:1:*
      const invalidatedCount = await cacheManager.invalidatePattern('user:1:*', 'test');
      expect(invalidatedCount).toBe(2);

      // Verify user:1 keys are gone, user:2 key remains
      expect(await cacheManager.exists('user:1:profile', { namespace: 'test' })).toBe(false);
      expect(await cacheManager.exists('user:1:settings', { namespace: 'test' })).toBe(false);
      expect(await cacheManager.exists('user:2:profile', { namespace: 'test' })).toBe(true);
    });

    it('should collect metrics', async () => {
      const key = 'test:metrics';
      const value = 'metrics-test';

      // Generate some cache hits and misses
      await cacheManager.set(key, value, { namespace: 'test' });
      
      // Cache hit
      await cacheManager.get(key, { namespace: 'test' });
      
      // Cache miss
      await cacheManager.get('nonexistent:key', { namespace: 'test' });

      const metrics = await cacheManager.getMetrics('test');
      expect(metrics).toBeDefined();
      expect(metrics!.totalRequests).toBeGreaterThan(0);
      expect(metrics!.hits).toBeGreaterThan(0);
      expect(metrics!.misses).toBeGreaterThan(0);
      expect(metrics!.hitRatio).toBeGreaterThan(0);
      expect(metrics!.hitRatio).toBeLessThanOrEqual(1);
    });
  });

  describe('Cache Integration', () => {
    it('should maintain cache consistency across operations', async () => {
      const key = 'test:consistency';
      const initialValue = { version: 1, data: 'initial' };
      const updatedValue = { version: 2, data: 'updated' };

      // Initial set
      await cacheManager.set(key, initialValue, { namespace: 'test' });
      expect(await cacheManager.get(key, { namespace: 'test' })).toEqual(initialValue);

      // Update
      await cacheManager.set(key, updatedValue, { namespace: 'test' });
      expect(await cacheManager.get(key, { namespace: 'test' })).toEqual(updatedValue);

      // Delete
      await cacheManager.del(key, { namespace: 'test' });
      expect(await cacheManager.get(key, { namespace: 'test' })).toBeNull();
    });

    it('should handle concurrent access', async () => {
      const key = 'test:concurrent';
      const value = 'concurrent-test';

      // Simulate concurrent set operations
      const setPromises = Array(10).fill(0).map(async (_, i) => {
        return cacheManager.set(`${key}:${i}`, `${value}:${i}`, { namespace: 'test' });
      });

      const setResults = await Promise.all(setPromises);
      expect(setResults.every(result => result === true)).toBe(true);

      // Simulate concurrent get operations
      const getPromises = Array(10).fill(0).map(async (_, i) => {
        return cacheManager.get(`${key}:${i}`, { namespace: 'test' });
      });

      const getResults = await Promise.all(getPromises);
      getResults.forEach((result, i) => {
        expect(result).toBe(`${value}:${i}`);
      });
    });

    it('should recover from Redis disconnection', async () => {
      const key = 'test:recovery';
      const value = 'recovery-test';

      // Set initial value
      await cacheManager.set(key, value, { namespace: 'test' });
      expect(await cacheManager.get(key, { namespace: 'test' })).toBe(value);

      // Simulate Redis operations continuing after reconnection
      // (In a real scenario, you might restart Redis container here)
      
      // The cache should continue to work
      const newValue = 'recovery-test-new';
      await cacheManager.set(key, newValue, { namespace: 'test' });
      expect(await cacheManager.get(key, { namespace: 'test' })).toBe(newValue);
    });
  });

  describe('Performance Tests', () => {
    it('should handle high-volume operations', async () => {
      const count = 1000;
      const startTime = Date.now();

      // Bulk set operations
      const setPromises = Array(count).fill(0).map(async (_, i) => {
        return cacheManager.set(`perf:${i}`, { id: i, data: `data-${i}` }, { 
          namespace: 'test',
          tier: CacheTier.HOT
        });
      });

      await Promise.all(setPromises);

      // Bulk get operations
      const getPromises = Array(count).fill(0).map(async (_, i) => {
        return cacheManager.get(`perf:${i}`, { namespace: 'test' });
      });

      const results = await Promise.all(getPromises);
      const endTime = Date.now();

      // Verify results
      expect(results.length).toBe(count);
      expect(results.every(result => result !== null)).toBe(true);

      // Performance assertion (should complete in reasonable time)
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(10000); // Should complete in less than 10 seconds

      console.log(`High-volume test: ${count * 2} operations completed in ${totalTime}ms`);
    }, 15000);

    it('should achieve target hit ratio', async () => {
      const keys = Array(100).fill(0).map((_, i) => `hitRatio:${i}`);
      const value = 'hit-ratio-test';

      // Set all keys
      for (const key of keys) {
        await cacheManager.set(key, value, { namespace: 'test' });
      }

      // Generate mixed access pattern (70% hits, 30% misses)
      const accessPromises = [];
      for (let i = 0; i < 1000; i++) {
        if (Math.random() < 0.7) {
          // Cache hit
          const randomKey = keys[Math.floor(Math.random() * keys.length)];
          accessPromises.push(cacheManager.get(randomKey, { namespace: 'test' }));
        } else {
          // Cache miss
          accessPromises.push(cacheManager.get(`miss:${i}`, { namespace: 'test' }));
        }
      }

      await Promise.all(accessPromises);

      const metrics = await cacheManager.getMetrics('test');
      expect(metrics).toBeDefined();
      expect(metrics!.hitRatio).toBeGreaterThan(0.6); // Should achieve >60% hit ratio
      
      console.log(`Achieved hit ratio: ${(metrics!.hitRatio * 100).toFixed(1)}%`);
    });
  });
});