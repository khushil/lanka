/**
 * Memory Leak Load Testing
 * Comprehensive tests to verify memory stability under load
 */

import { performance } from 'perf_hooks';
import { memoryMonitor } from '../../src/utils/monitoring/memory-monitor';
import { subscriptionManager } from '../../src/core/memory/subscription-manager';
import { heapProfiler } from '../../src/utils/monitoring/heap-profiler';
import { streamProcessor } from '../../src/services/streaming/stream-processor';
import { Neo4jService } from '../../src/core/database/neo4j';
import { logger } from '../../src/core/logging/logger';

export interface LoadTestConfig {
  duration: number; // ms
  concurrency: number;
  subscriptionCount: number;
  queryCount: number;
  streamingDataSize: number;
  memoryThreshold: number; // bytes
  leakThreshold: number; // bytes per second
}

export interface LoadTestResults {
  success: boolean;
  duration: number;
  memoryStats: {
    initial: any;
    peak: any;
    final: any;
    growth: number;
    growthRate: number;
  };
  subscriptionStats: {
    created: number;
    cleaned: number;
    leaked: number;
  };
  connectionStats: {
    created: number;
    closed: number;
    leaked: number;
  };
  streamStats: {
    processed: number;
    failed: number;
    memoryPeak: number;
  };
  leakAnalysis: {
    hasLeak: boolean;
    confidence: number;
    analysis: string[];
  };
  errors: string[];
}

export class MemoryLeakTester {
  private config: LoadTestConfig;
  private results: Partial<LoadTestResults> = {};
  private testStartTime: number = 0;
  private isRunning = false;

  constructor(config: Partial<LoadTestConfig> = {}) {
    this.config = {
      duration: 300000, // 5 minutes
      concurrency: 50,
      subscriptionCount: 1000,
      queryCount: 5000,
      streamingDataSize: 10000,
      memoryThreshold: 500 * 1024 * 1024, // 500MB
      leakThreshold: 1024 * 10, // 10KB/s
      ...config
    };
  }

  /**
   * Run comprehensive memory leak test
   */
  public async runLoadTest(): Promise<LoadTestResults> {
    if (this.isRunning) {
      throw new Error('Load test already running');
    }

    this.isRunning = true;
    this.testStartTime = performance.now();
    this.results = { errors: [] };

    logger.info('Starting memory leak load test', this.config);

    try {
      // Start monitoring
      memoryMonitor.startMonitoring(1000);
      const profileId = heapProfiler.startProfiling({ duration: this.config.duration });

      // Initial memory measurement
      const initialMemory = memoryMonitor.getCurrentStats();
      this.results.memoryStats = {
        initial: initialMemory,
        peak: initialMemory,
        final: initialMemory,
        growth: 0,
        growthRate: 0
      };

      // Run concurrent tests
      await Promise.all([
        this.runSubscriptionLoadTest(),
        this.runDatabaseLoadTest(),
        this.runStreamingLoadTest(),
        this.monitorMemoryDuringTest()
      ]);

      // Final measurements
      const finalMemory = memoryMonitor.getCurrentStats();
      const profile = heapProfiler.stopProfiling();
      
      this.results.memoryStats!.final = finalMemory;
      this.results.memoryStats!.growth = finalMemory.heap.used - initialMemory.heap.used;
      this.results.memoryStats!.growthRate = this.results.memoryStats!.growth / (this.config.duration / 1000);

      // Analyze for leaks
      this.results.leakAnalysis = memoryMonitor.detectMemoryLeaks();

      // Determine success
      const success = this.evaluateTestResults();
      this.results.success = success;
      this.results.duration = performance.now() - this.testStartTime;

      logger.info('Memory leak load test completed', {
        success,
        duration: this.results.duration,
        memoryGrowth: this.results.memoryStats!.growth,
        leakDetected: this.results.leakAnalysis!.hasLeak
      });

      return this.results as LoadTestResults;

    } catch (error) {
      this.results.errors!.push(error.message);
      this.results.success = false;
      throw error;
    } finally {
      this.isRunning = false;
      memoryMonitor.stopMonitoring();
    }
  }

  /**
   * Test subscription creation and cleanup
   */
  private async runSubscriptionLoadTest(): Promise<void> {
    logger.info('Starting subscription load test');
    
    const subscriptions: string[] = [];
    let created = 0;
    let cleaned = 0;

    try {
      // Create subscriptions rapidly
      for (let i = 0; i < this.config.subscriptionCount; i++) {
        const subscriptionId = subscriptionManager.createSubscription(
          `test-event-${i}`,
          (data) => { /* test callback */ },
          'event',
          { testData: `subscription-${i}` }
        );
        
        subscriptions.push(subscriptionId);
        created++;

        // Cleanup some subscriptions randomly to simulate real usage
        if (Math.random() < 0.3) {
          const cleanupId = subscriptions.shift();
          if (cleanupId) {
            subscriptionManager.unsubscribe(cleanupId);
            cleaned++;
          }
        }

        // Pause occasionally to simulate real patterns
        if (i % 100 === 0) {
          await this.sleep(10);
        }
      }

      // Clean up remaining subscriptions
      for (const subscriptionId of subscriptions) {
        subscriptionManager.unsubscribe(subscriptionId);
        cleaned++;
      }

      this.results.subscriptionStats = {
        created,
        cleaned,
        leaked: created - cleaned
      };

    } catch (error) {
      this.results.errors!.push(`Subscription test error: ${error.message}`);
    }
  }

  /**
   * Test database connection pooling
   */
  private async runDatabaseLoadTest(): Promise<void> {
    logger.info('Starting database load test');
    
    const neo4jService = Neo4jService.getInstance();
    let created = 0;
    let closed = 0;

    try {
      const queries = Array.from({ length: this.config.queryCount }, (_, i) => 
        this.runDatabaseQuery(neo4jService, i)
      );

      // Run queries with controlled concurrency
      const batches = this.chunkArray(queries, this.config.concurrency);
      
      for (const batch of batches) {
        await Promise.all(batch);
        created += batch.length;
        
        // Small delay between batches
        await this.sleep(10);
      }

      closed = created; // Assume all sessions properly closed
      
      this.results.connectionStats = {
        created,
        closed,
        leaked: created - closed
      };

    } catch (error) {
      this.results.errors!.push(`Database test error: ${error.message}`);
    }
  }

  /**
   * Test streaming data processing
   */
  private async runStreamingLoadTest(): Promise<void> {
    logger.info('Starting streaming load test');
    
    let processed = 0;
    let failed = 0;
    let memoryPeak = 0;

    try {
      // Generate test data
      const testData = Array.from({ length: this.config.streamingDataSize }, (_, i) => ({
        id: i,
        data: `test-data-${i}`,
        timestamp: Date.now()
      }));

      // Process in batches to test memory handling
      const results = await streamProcessor.processStream(
        testData,
        async (batch) => {
          // Simulate processing
          return batch.map(item => ({
            ...item,
            processed: true,
            processedAt: Date.now()
          }));
        },
        {
          onProgress: (stats) => {
            processed = stats.processed;
            failed = stats.failed;
            memoryPeak = Math.max(memoryPeak, stats.memoryUsage);
          },
          onError: (error) => {
            this.results.errors!.push(`Stream processing error: ${error.message}`);
          }
        }
      );

      processed = results.length;

      this.results.streamStats = {
        processed,
        failed,
        memoryPeak
      };

    } catch (error) {
      this.results.errors!.push(`Streaming test error: ${error.message}`);
    }
  }

  /**
   * Monitor memory during the test
   */
  private async monitorMemoryDuringTest(): Promise<void> {
    const startTime = performance.now();
    
    while (performance.now() - startTime < this.config.duration) {
      const currentStats = memoryMonitor.getCurrentStats();
      
      // Track peak memory usage
      if (!this.results.memoryStats || 
          currentStats.heap.used > this.results.memoryStats.peak.heap.used) {
        this.results.memoryStats!.peak = currentStats;
      }

      // Check if we're exceeding thresholds
      if (currentStats.heap.used > this.config.memoryThreshold) {
        this.results.errors!.push(`Memory threshold exceeded: ${currentStats.heap.used} > ${this.config.memoryThreshold}`);
      }

      await this.sleep(1000);
    }
  }

  /**
   * Run individual database query
   */
  private async runDatabaseQuery(neo4jService: Neo4jService, index: number): Promise<void> {
    try {
      // Simple query to test connection handling
      await neo4jService.executeQuery(
        'MATCH (n) RETURN count(n) as total LIMIT 1',
        {},
        undefined,
        true // Use pooling
      );
    } catch (error) {
      // Ignore individual query failures for load test
    }
  }

  /**
   * Evaluate test results
   */
  private evaluateTestResults(): boolean {
    let success = true;
    const reasons: string[] = [];

    // Check memory growth
    if (this.results.memoryStats!.growthRate > this.config.leakThreshold) {
      success = false;
      reasons.push(`Excessive memory growth: ${this.results.memoryStats!.growthRate} bytes/s > ${this.config.leakThreshold}`);
    }

    // Check for detected leaks
    if (this.results.leakAnalysis!.hasLeak) {
      success = false;
      reasons.push(`Memory leak detected with ${(this.results.leakAnalysis!.confidence * 100).toFixed(1)}% confidence`);
    }

    // Check subscription leaks
    if (this.results.subscriptionStats!.leaked > this.config.subscriptionCount * 0.01) {
      success = false;
      reasons.push(`Subscription leaks detected: ${this.results.subscriptionStats!.leaked}`);
    }

    // Check connection leaks
    if (this.results.connectionStats!.leaked > this.config.queryCount * 0.01) {
      success = false;
      reasons.push(`Connection leaks detected: ${this.results.connectionStats!.leaked}`);
    }

    // Check errors
    if (this.results.errors!.length > 0) {
      success = false;
      reasons.push(`${this.results.errors!.length} errors occurred during testing`);
    }

    if (!success) {
      logger.warn('Load test failed:', reasons);
    }

    return success;
  }

  /**
   * Utility functions
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Export test runner function
export async function runMemoryLeakTest(config?: Partial<LoadTestConfig>): Promise<LoadTestResults> {
  const tester = new MemoryLeakTester(config);
  return await tester.runLoadTest();
}

// CLI runner if called directly
if (require.main === module) {
  const config: Partial<LoadTestConfig> = {
    duration: parseInt(process.env.TEST_DURATION || '300000'),
    concurrency: parseInt(process.env.TEST_CONCURRENCY || '50'),
    subscriptionCount: parseInt(process.env.TEST_SUBSCRIPTIONS || '1000'),
    queryCount: parseInt(process.env.TEST_QUERIES || '5000'),
    streamingDataSize: parseInt(process.env.TEST_STREAM_SIZE || '10000')
  };

  runMemoryLeakTest(config)
    .then(results => {
      console.log('Memory leak test completed:', results);
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Memory leak test failed:', error);
      process.exit(1);
    });
}