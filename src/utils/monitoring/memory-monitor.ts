/**
 * Memory Monitoring and Profiling Service
 * Provides real-time memory usage tracking and leak detection
 */

import { EventEmitter } from 'events';
import { performance, PerformanceObserver } from 'perf_hooks';
import { logger } from '../../core/logging/logger';

export interface MemoryStats {
  timestamp: number;
  heap: {
    used: number;
    total: number;
    limit: number;
    percentage: number;
  };
  rss: number;
  external: number;
  arrayBuffers: number;
  gc?: {
    type: string;
    duration: number;
    timestamp: number;
  }[];
}

export interface MemoryAlert {
  type: 'warning' | 'critical';
  message: string;
  threshold: number;
  current: number;
  timestamp: number;
  suggestions: string[];
}

export interface HeapSnapshot {
  id: string;
  timestamp: number;
  size: number;
  nodes: number;
  edges: number;
  strings: number;
  metadata?: any;
}

export class MemoryMonitor extends EventEmitter {
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private gcObserver: PerformanceObserver | null = null;
  private memoryHistory: MemoryStats[] = [];
  private maxHistorySize = 1000;
  private alertThresholds = {
    warning: 0.7,   // 70% of heap limit
    critical: 0.9   // 90% of heap limit
  };
  private lastGcStats: any[] = [];
  private heapSnapshots: HeapSnapshot[] = [];

  constructor(options?: {
    historySize?: number;
    warningThreshold?: number;
    criticalThreshold?: number;
  }) {
    super();
    
    if (options?.historySize) {
      this.maxHistorySize = options.historySize;
    }
    
    if (options?.warningThreshold) {
      this.alertThresholds.warning = options.warningThreshold;
    }
    
    if (options?.criticalThreshold) {
      this.alertThresholds.critical = options.criticalThreshold;
    }

    this.setupGCObserver();
  }

  /**
   * Start memory monitoring
   */
  public startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    logger.info(`Starting memory monitoring with ${intervalMs}ms interval`);

    this.monitoringInterval = setInterval(() => {
      this.collectMemoryStats();
    }, intervalMs);

    // Initial collection
    this.collectMemoryStats();
  }

  /**
   * Stop memory monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    logger.info('Stopping memory monitoring');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.gcObserver) {
      this.gcObserver.disconnect();
      this.gcObserver = null;
    }
  }

  /**
   * Get current memory statistics
   */
  public getCurrentStats(): MemoryStats {
    return this.createMemoryStats();
  }

  /**
   * Get memory usage history
   */
  public getHistory(limit?: number): MemoryStats[] {
    const history = [...this.memoryHistory];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Detect memory leaks based on growth patterns
   */
  public detectMemoryLeaks(): {
    hasLeak: boolean;
    growthRate: number;
    confidence: number;
    analysis: string;
  } {
    if (this.memoryHistory.length < 10) {
      return {
        hasLeak: false,
        growthRate: 0,
        confidence: 0,
        analysis: 'Insufficient data for leak detection'
      };
    }

    // Analyze last 10 data points
    const recentHistory = this.memoryHistory.slice(-10);
    const growthRates: number[] = [];

    for (let i = 1; i < recentHistory.length; i++) {
      const prev = recentHistory[i - 1];
      const curr = recentHistory[i];
      const timeDiff = curr.timestamp - prev.timestamp;
      const memDiff = curr.heap.used - prev.heap.used;
      
      if (timeDiff > 0) {
        growthRates.push(memDiff / timeDiff); // bytes per millisecond
      }
    }

    const avgGrowthRate = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
    const positiveGrowthCount = growthRates.filter(rate => rate > 0).length;
    const confidence = positiveGrowthCount / growthRates.length;

    // Consider it a leak if memory consistently grows
    const hasLeak = confidence > 0.7 && avgGrowthRate > 1024; // 1KB/s growth

    let analysis = '';
    if (hasLeak) {
      analysis = `Memory is growing at ${(avgGrowthRate * 1000).toFixed(2)} bytes/second with ${(confidence * 100).toFixed(1)}% consistency`;
    } else if (confidence > 0.5) {
      analysis = `Some memory growth detected but within normal bounds`;
    } else {
      analysis = `Memory usage appears stable`;
    }

    return {
      hasLeak,
      growthRate: avgGrowthRate * 1000, // Convert to bytes/second
      confidence,
      analysis
    };
  }

  /**
   * Force garbage collection (if available)
   */
  public forceGC(): boolean {
    if (global.gc) {
      const before = process.memoryUsage();
      global.gc();
      const after = process.memoryUsage();
      
      const freed = before.heapUsed - after.heapUsed;
      logger.info(`Forced GC freed ${this.formatBytes(freed)} memory`);
      
      this.emit('gc:forced', { before, after, freed });
      return true;
    }
    
    logger.warn('GC not available. Run with --expose-gc flag');
    return false;
  }

  /**
   * Create heap snapshot (requires v8 profiler or similar)
   */
  public async createHeapSnapshot(): Promise<HeapSnapshot | null> {
    try {
      // This would require the v8-profiler-next package
      // const profiler = require('v8-profiler-next');
      // const snapshot = profiler.takeSnapshot();
      
      // For now, create a basic snapshot with available data
      const memStats = this.getCurrentStats();
      const snapshot: HeapSnapshot = {
        id: `snapshot_${Date.now()}`,
        timestamp: Date.now(),
        size: memStats.heap.used,
        nodes: 0, // Would be populated by actual profiler
        edges: 0, // Would be populated by actual profiler
        strings: 0, // Would be populated by actual profiler
        metadata: {
          heap: memStats.heap,
          rss: memStats.rss,
          external: memStats.external
        }
      };

      this.heapSnapshots.push(snapshot);
      
      // Keep only last 5 snapshots
      if (this.heapSnapshots.length > 5) {
        this.heapSnapshots = this.heapSnapshots.slice(-5);
      }

      logger.info(`Created heap snapshot: ${snapshot.id}`);
      this.emit('snapshot:created', snapshot);
      
      return snapshot;
    } catch (error) {
      logger.error('Failed to create heap snapshot:', error);
      return null;
    }
  }

  /**
   * Compare two heap snapshots
   */
  public compareSnapshots(snapshot1Id: string, snapshot2Id: string): any {
    const snap1 = this.heapSnapshots.find(s => s.id === snapshot1Id);
    const snap2 = this.heapSnapshots.find(s => s.id === snapshot2Id);

    if (!snap1 || !snap2) {
      throw new Error('Snapshot(s) not found');
    }

    const sizeDiff = snap2.size - snap1.size;
    const timeDiff = snap2.timestamp - snap1.timestamp;

    return {
      sizeDifference: sizeDiff,
      timeDifference: timeDiff,
      growthRate: sizeDiff / (timeDiff / 1000), // bytes per second
      percentage: (sizeDiff / snap1.size) * 100,
      analysis: sizeDiff > 0 ? 'Memory increased' : sizeDiff < 0 ? 'Memory decreased' : 'No change'
    };
  }

  /**
   * Get memory optimization suggestions
   */
  public getOptimizationSuggestions(): string[] {
    const currentStats = this.getCurrentStats();
    const suggestions: string[] = [];

    // High memory usage
    if (currentStats.heap.percentage > 0.8) {
      suggestions.push('Consider reducing cache sizes or implementing LRU cache');
      suggestions.push('Review large object allocations and consider object pooling');
      suggestions.push('Force garbage collection if appropriate');
    }

    // Memory growth detected
    const leakAnalysis = this.detectMemoryLeaks();
    if (leakAnalysis.hasLeak) {
      suggestions.push('Potential memory leak detected - review event listeners and timers');
      suggestions.push('Check for unclosed database connections or file handles');
      suggestions.push('Verify proper cleanup in async operations');
    }

    // High external memory
    if (currentStats.external > 100 * 1024 * 1024) { // 100MB
      suggestions.push('High external memory usage - review buffer usage and file operations');
    }

    // GC frequency issues
    if (this.lastGcStats.length > 5) {
      const avgGcDuration = this.lastGcStats.reduce((sum, gc) => sum + gc.duration, 0) / this.lastGcStats.length;
      if (avgGcDuration > 50) { // 50ms average GC time
        suggestions.push('Long GC pauses detected - consider reducing heap size or optimizing allocations');
      }
    }

    return suggestions;
  }

  /**
   * Collect current memory statistics
   */
  private collectMemoryStats(): void {
    const stats = this.createMemoryStats();
    
    // Add to history
    this.memoryHistory.push(stats);
    
    // Trim history if needed
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory = this.memoryHistory.slice(-this.maxHistorySize);
    }

    // Check for alerts
    this.checkAlerts(stats);

    // Emit stats
    this.emit('stats', stats);
  }

  /**
   * Create memory statistics object
   */
  private createMemoryStats(): MemoryStats {
    const memUsage = process.memoryUsage();
    const heapLimit = (global as any).gc?.heapLimit || memUsage.heapTotal * 2;

    return {
      timestamp: Date.now(),
      heap: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        limit: heapLimit,
        percentage: (memUsage.heapUsed / heapLimit) * 100
      },
      rss: memUsage.rss,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers || 0,
      gc: this.lastGcStats.length > 0 ? [...this.lastGcStats] : undefined
    };
  }

  /**
   * Check for memory alerts
   */
  private checkAlerts(stats: MemoryStats): void {
    const percentage = stats.heap.percentage / 100;

    if (percentage >= this.alertThresholds.critical) {
      const alert: MemoryAlert = {
        type: 'critical',
        message: 'Critical memory usage detected',
        threshold: this.alertThresholds.critical,
        current: percentage,
        timestamp: stats.timestamp,
        suggestions: [
          'Force garbage collection immediately',
          'Review and release large objects',
          'Consider restarting the application'
        ]
      };
      
      this.emit('alert', alert);
      logger.error('CRITICAL: Memory usage at ' + (percentage * 100).toFixed(1) + '%');
      
    } else if (percentage >= this.alertThresholds.warning) {
      const alert: MemoryAlert = {
        type: 'warning',
        message: 'High memory usage detected',
        threshold: this.alertThresholds.warning,
        current: percentage,
        timestamp: stats.timestamp,
        suggestions: [
          'Monitor memory growth closely',
          'Consider cleaning up caches',
          'Review recent allocations'
        ]
      };
      
      this.emit('alert', alert);
      logger.warn('WARNING: Memory usage at ' + (percentage * 100).toFixed(1) + '%');
    }
  }

  /**
   * Setup garbage collection observer
   */
  private setupGCObserver(): void {
    try {
      this.gcObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          if (entry.entryType === 'gc') {
            const gcEvent = {
              type: (entry as any).detail?.kind || 'unknown',
              duration: entry.duration,
              timestamp: entry.startTime + performance.timeOrigin
            };
            
            this.lastGcStats.push(gcEvent);
            
            // Keep only last 10 GC events
            if (this.lastGcStats.length > 10) {
              this.lastGcStats = this.lastGcStats.slice(-10);
            }
            
            this.emit('gc', gcEvent);
          }
        });
      });

      this.gcObserver.observe({ entryTypes: ['gc'] });
    } catch (error) {
      logger.warn('GC observer not available:', error);
    }
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Shutdown memory monitor
   */
  public shutdown(): void {
    this.stopMonitoring();
    this.removeAllListeners();
    this.memoryHistory = [];
    this.lastGcStats = [];
    this.heapSnapshots = [];
    
    logger.info('Memory monitor shutdown complete');
  }
}

// Singleton instance
export const memoryMonitor = new MemoryMonitor();