import { PerformanceMetrics, LoaderMetrics } from './types';
import { logger } from '../logging/logger';

/**
 * Performance metrics collector for DataLoader operations
 * Tracks batch loading efficiency, cache performance, and timing metrics
 */
export class DataLoaderPerformanceMetrics implements PerformanceMetrics {
  private metrics: Map<string, {
    requests: number;
    batchedRequests: number;
    cacheHits: number;
    cacheMisses: number;
    totalLoadTime: number;
    batchSizes: number[];
    loadTimes: number[];
  }> = new Map();

  private startTime = Date.now();

  /**
   * Record a batch load operation
   */
  recordBatchLoad(loaderType: string, batchSize: number, duration: number): void {
    const stats = this.getOrCreateStats(loaderType);
    
    stats.batchedRequests += 1;
    stats.requests += batchSize;
    stats.totalLoadTime += duration;
    stats.batchSizes.push(batchSize);
    stats.loadTimes.push(duration);

    // Log slow batch operations
    if (duration > 1000) { // > 1 second
      logger.warn('Slow DataLoader batch operation detected', {
        loaderType,
        batchSize,
        duration,
        averageDurationPerItem: duration / batchSize
      });
    }

    // Log large batch operations
    if (batchSize > 100) {
      logger.info('Large DataLoader batch operation', {
        loaderType,
        batchSize,
        duration,
        itemsPerSecond: Math.round(batchSize / (duration / 1000))
      });
    }
  }

  /**
   * Record a cache hit
   */
  recordCacheHit(loaderType: string, key: string): void {
    const stats = this.getOrCreateStats(loaderType);
    stats.cacheHits += 1;
    stats.requests += 1;
  }

  /**
   * Record a cache miss
   */
  recordCacheMiss(loaderType: string, key: string): void {
    const stats = this.getOrCreateStats(loaderType);
    stats.cacheMisses += 1;
  }

  /**
   * Get comprehensive metrics for all loaders
   */
  getMetrics(): LoaderMetrics {
    const result: LoaderMetrics = {};

    for (const [loaderType, stats] of this.metrics) {
      const totalRequests = stats.requests;
      const batchedRequests = stats.batchedRequests;
      const cacheHits = stats.cacheHits;
      const cacheMisses = stats.cacheMisses;
      
      const averageBatchSize = stats.batchSizes.length > 0 
        ? stats.batchSizes.reduce((sum, size) => sum + size, 0) / stats.batchSizes.length
        : 0;
      
      const averageLoadTime = stats.loadTimes.length > 0
        ? stats.loadTimes.reduce((sum, time) => sum + time, 0) / stats.loadTimes.length
        : 0;

      result[loaderType] = {
        totalRequests,
        batchedRequests,
        cacheHits,
        cacheMisses,
        averageBatchSize: Math.round(averageBatchSize * 100) / 100,
        averageLoadTime: Math.round(averageLoadTime * 100) / 100,
        totalLoadTime: stats.totalLoadTime
      };
    }

    return result;
  }

  /**
   * Get a performance summary report
   */
  getPerformanceReport(): {
    uptime: number;
    summary: LoaderMetrics;
    insights: string[];
    recommendations: string[];
  } {
    const metrics = this.getMetrics();
    const uptime = Date.now() - this.startTime;
    const insights: string[] = [];
    const recommendations: string[] = [];

    for (const [loaderType, stats] of Object.entries(metrics)) {
      const cacheHitRate = stats.cacheHits / (stats.cacheHits + stats.cacheMisses);
      const batchingEfficiency = stats.batchedRequests > 0 ? stats.totalRequests / stats.batchedRequests : 1;

      // Generate insights
      if (cacheHitRate > 0.8) {
        insights.push(`${loaderType}: Excellent cache performance (${Math.round(cacheHitRate * 100)}% hit rate)`);
      } else if (cacheHitRate < 0.3) {
        insights.push(`${loaderType}: Poor cache performance (${Math.round(cacheHitRate * 100)}% hit rate)`);
      }

      if (batchingEfficiency > 5) {
        insights.push(`${loaderType}: Good batching efficiency (${Math.round(batchingEfficiency)}x reduction)`);
      } else if (batchingEfficiency < 2) {
        insights.push(`${loaderType}: Poor batching efficiency (${Math.round(batchingEfficiency)}x reduction)`);
      }

      if (stats.averageLoadTime > 500) {
        insights.push(`${loaderType}: Slow average load time (${stats.averageLoadTime}ms)`);
      }

      // Generate recommendations
      if (cacheHitRate < 0.5) {
        recommendations.push(`${loaderType}: Consider increasing cache TTL or reviewing query patterns`);
      }

      if (stats.averageBatchSize < 3) {
        recommendations.push(`${loaderType}: Low batch sizes suggest potential for better request grouping`);
      }

      if (stats.averageLoadTime > 1000) {
        recommendations.push(`${loaderType}: Consider optimizing database queries or adding indexes`);
      }
    }

    return {
      uptime,
      summary: metrics,
      insights,
      recommendations
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.startTime = Date.now();
  }

  /**
   * Get or create stats for a loader type
   */
  private getOrCreateStats(loaderType: string) {
    if (!this.metrics.has(loaderType)) {
      this.metrics.set(loaderType, {
        requests: 0,
        batchedRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        totalLoadTime: 0,
        batchSizes: [],
        loadTimes: []
      });
    }
    return this.metrics.get(loaderType)!;
  }

  /**
   * Log periodic performance reports
   */
  startPeriodicReporting(intervalMs: number = 300000): void { // 5 minutes default
    setInterval(() => {
      const report = this.getPerformanceReport();
      
      if (Object.keys(report.summary).length > 0) {
        logger.info('DataLoader Performance Report', {
          uptime: `${Math.round(report.uptime / 60000)}m`,
          loaderCount: Object.keys(report.summary).length,
          insights: report.insights,
          recommendations: report.recommendations.slice(0, 3) // Limit to top 3
        });
      }
    }, intervalMs);
  }
}

// Singleton instance for global metrics collection
export const globalMetrics = new DataLoaderPerformanceMetrics();