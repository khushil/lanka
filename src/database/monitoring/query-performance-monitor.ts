import { Neo4jService } from '../../core/database/neo4j';
import { logger } from '../../core/logging/logger';
import { EventEmitter } from 'events';

export interface QueryPerformanceMetrics {
  queryId: string;
  query: string;
  parameters: Record<string, any>;
  startTime: number;
  endTime: number;
  duration: number;
  resultCount: number;
  memoryUsage: number;
  indexUsage: IndexUsageInfo[];
  plannerInfo: QueryPlanInfo;
  success: boolean;
  error?: string;
}

export interface IndexUsageInfo {
  indexName: string;
  indexType: 'range' | 'composite' | 'vector' | 'fulltext' | 'text';
  used: boolean;
  selectivity: number;
  hitRatio: number;
}

export interface QueryPlanInfo {
  operatorType: string;
  estimatedRows: number;
  actualRows: number;
  dbHits: number;
  pageCacheHits: number;
  pageCacheMisses: number;
  time: number;
}

export interface PerformanceAlert {
  type: 'slow_query' | 'high_memory' | 'index_miss' | 'plan_regression';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  queryId: string;
  metrics: QueryPerformanceMetrics;
  threshold: number;
  actualValue: number;
}

export class QueryPerformanceMonitor extends EventEmitter {
  private neo4jService: Neo4jService;
  private isEnabled: boolean = true;
  private performanceHistory: Map<string, QueryPerformanceMetrics[]> = new Map();
  private slowQueryThreshold: number = 1000; // 1 second
  private highMemoryThreshold: number = 100 * 1024 * 1024; // 100MB
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(neo4jService?: Neo4jService) {
    super();
    this.neo4jService = neo4jService || Neo4jService.getInstance();
    this.startMonitoring();
  }

  /**
   * Enable/disable performance monitoring
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    logger.info(`Query performance monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set performance thresholds
   */
  public setThresholds(slowQuery: number, highMemory: number): void {
    this.slowQueryThreshold = slowQuery;
    this.highMemoryThreshold = highMemory;
    logger.info(`Performance thresholds updated: slowQuery=${slowQuery}ms, highMemory=${highMemory}bytes`);
  }

  /**
   * Monitor a query execution with detailed metrics collection
   */
  public async monitorQuery<T>(
    queryId: string,
    query: string,
    parameters: Record<string, any> = {},
    database?: string
  ): Promise<{ result: T; metrics: QueryPerformanceMetrics }> {
    if (!this.isEnabled) {
      const result = await this.neo4jService.executeQuery(query, parameters, database);
      return { 
        result, 
        metrics: this.createBasicMetrics(queryId, query, parameters)
      };
    }

    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    let result: T;
    let success = true;
    let error: string | undefined;
    let resultCount = 0;
    let plannerInfo: QueryPlanInfo = this.createEmptyPlanInfo();
    let indexUsage: IndexUsageInfo[] = [];

    try {
      // Execute query with PROFILE to get detailed execution metrics
      const profiledQuery = `PROFILE ${query}`;
      const session = this.neo4jService.getSession(database);
      
      try {
        const profileResult = await session.run(profiledQuery, parameters);
        result = profileResult.records.map(record => record.toObject()) as T;
        resultCount = profileResult.records.length;

        // Extract execution plan information
        if (profileResult.summary.profile) {
          plannerInfo = this.extractPlannerInfo(profileResult.summary.profile);
        }

        // Get index usage information
        indexUsage = await this.getIndexUsageInfo(query, parameters, database);

      } finally {
        await session.close();
      }

    } catch (err: any) {
      success = false;
      error = err.message;
      logger.error(`Query execution failed: ${queryId}`, { query, parameters, error });
      throw err;
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    const memoryUsage = process.memoryUsage().heapUsed - startMemory;

    const metrics: QueryPerformanceMetrics = {
      queryId,
      query: this.sanitizeQuery(query),
      parameters: this.sanitizeParameters(parameters),
      startTime,
      endTime,
      duration,
      resultCount,
      memoryUsage,
      indexUsage,
      plannerInfo,
      success,
      error
    };

    // Store metrics for analysis
    this.storeMetrics(queryId, metrics);

    // Check for performance alerts
    this.checkPerformanceAlerts(metrics);

    // Emit performance event
    this.emit('query_executed', metrics);

    return { result, metrics };
  }

  /**
   * Get performance statistics for a specific query pattern
   */
  public getQueryStats(queryPattern: string): {
    totalExecutions: number;
    averageDuration: number;
    maxDuration: number;
    minDuration: number;
    successRate: number;
    averageResultCount: number;
    averageMemoryUsage: number;
    indexHitRate: number;
  } | null {
    const metrics = this.performanceHistory.get(queryPattern);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration);
    const successfulQueries = metrics.filter(m => m.success);
    const indexHits = metrics.flatMap(m => m.indexUsage.filter(idx => idx.used));
    const totalIndexChecks = metrics.flatMap(m => m.indexUsage).length;

    return {
      totalExecutions: metrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      successRate: (successfulQueries.length / metrics.length) * 100,
      averageResultCount: metrics.reduce((sum, m) => sum + m.resultCount, 0) / metrics.length,
      averageMemoryUsage: metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length,
      indexHitRate: totalIndexChecks > 0 ? (indexHits.length / totalIndexChecks) * 100 : 0
    };
  }

  /**
   * Get slow query report
   */
  public getSlowQueries(limit: number = 20): QueryPerformanceMetrics[] {
    const allMetrics: QueryPerformanceMetrics[] = [];
    
    for (const metrics of this.performanceHistory.values()) {
      allMetrics.push(...metrics);
    }

    return allMetrics
      .filter(m => m.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Analyze index usage across all queries
   */
  public getIndexUsageReport(): {
    indexName: string;
    totalQueries: number;
    usageCount: number;
    usagePercentage: number;
    averageSelectivity: number;
    averageHitRatio: number;
  }[] {
    const indexStats = new Map<string, {
      totalQueries: number;
      usageCount: number;
      selectivities: number[];
      hitRatios: number[];
    }>();

    // Collect index usage statistics
    for (const metrics of this.performanceHistory.values()) {
      for (const metric of metrics) {
        for (const indexUsage of metric.indexUsage) {
          if (!indexStats.has(indexUsage.indexName)) {
            indexStats.set(indexUsage.indexName, {
              totalQueries: 0,
              usageCount: 0,
              selectivities: [],
              hitRatios: []
            });
          }

          const stats = indexStats.get(indexUsage.indexName)!;
          stats.totalQueries++;
          
          if (indexUsage.used) {
            stats.usageCount++;
          }

          stats.selectivities.push(indexUsage.selectivity);
          stats.hitRatios.push(indexUsage.hitRatio);
        }
      }
    }

    // Calculate statistics
    const report: any[] = [];
    for (const [indexName, stats] of indexStats) {
      report.push({
        indexName,
        totalQueries: stats.totalQueries,
        usageCount: stats.usageCount,
        usagePercentage: (stats.usageCount / stats.totalQueries) * 100,
        averageSelectivity: stats.selectivities.reduce((a, b) => a + b, 0) / stats.selectivities.length,
        averageHitRatio: stats.hitRatios.reduce((a, b) => a + b, 0) / stats.hitRatios.length
      });
    }

    return report.sort((a, b) => b.usagePercentage - a.usagePercentage);
  }

  /**
   * Start background monitoring of database performance
   */
  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      if (this.isEnabled) {
        await this.collectSystemMetrics();
      }
    }, 30000); // Every 30 seconds

    logger.info('Query performance monitoring started');
  }

  /**
   * Collect system-level performance metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    try {
      // Get Neo4j system metrics
      const systemMetrics = await this.neo4jService.executeQuery(`
        CALL dbms.queryJournal() 
        YIELD timestamp, query, elapsedTimeMillis, allocatedBytes
        WHERE elapsedTimeMillis > $threshold
        RETURN count(*) as slow_query_count, 
               avg(elapsedTimeMillis) as avg_duration,
               max(elapsedTimeMillis) as max_duration,
               sum(allocatedBytes) as total_memory
      `, { threshold: this.slowQueryThreshold });

      // Get index statistics
      const indexStats = await this.neo4jService.executeQuery(`
        CALL db.indexes() 
        YIELD name, type, state, populationPercent, uniqueValuesSelectivity
        WHERE state = 'ONLINE'
        RETURN count(*) as total_indexes,
               avg(populationPercent) as avg_population,
               avg(uniqueValuesSelectivity) as avg_selectivity
      `);

      // Emit system metrics
      this.emit('system_metrics', {
        timestamp: Date.now(),
        slowQueries: systemMetrics[0] || {},
        indexStats: indexStats[0] || {}
      });

    } catch (error) {
      logger.error('Failed to collect system metrics', error);
    }
  }

  /**
   * Extract planner information from execution profile
   */
  private extractPlannerInfo(profile: any): QueryPlanInfo {
    return {
      operatorType: profile.operatorType || 'unknown',
      estimatedRows: profile.estimatedRows || 0,
      actualRows: profile.actualRows || 0,
      dbHits: profile.dbHits || 0,
      pageCacheHits: profile.pageCacheHits || 0,
      pageCacheMisses: profile.pageCacheMisses || 0,
      time: profile.time || 0
    };
  }

  /**
   * Get index usage information for a query
   */
  private async getIndexUsageInfo(
    query: string, 
    parameters: Record<string, any>,
    database?: string
  ): Promise<IndexUsageInfo[]> {
    try {
      // This would typically require additional Neo4j monitoring capabilities
      // For now, return mock data based on query analysis
      return this.analyzeQueryForIndexUsage(query);
    } catch (error) {
      logger.warn('Failed to get index usage info', error);
      return [];
    }
  }

  /**
   * Analyze query text to determine potential index usage
   */
  private analyzeQueryForIndexUsage(query: string): IndexUsageInfo[] {
    const indexInfo: IndexUsageInfo[] = [];
    
    // Simple heuristic-based analysis
    if (query.includes('r:Requirement') && query.includes('r.type')) {
      indexInfo.push({
        indexName: 'req_type_priority',
        indexType: 'composite',
        used: query.includes('r.priority'),
        selectivity: 0.85,
        hitRatio: 0.92
      });
    }

    if (query.includes('a:ArchitectureDecision') && query.includes('a.pattern')) {
      indexInfo.push({
        indexName: 'arch_pattern_status',
        indexType: 'composite',
        used: query.includes('a.status'),
        selectivity: 0.78,
        hitRatio: 0.88
      });
    }

    if (query.includes('vector.similarity')) {
      indexInfo.push({
        indexName: 'req_embedding_index',
        indexType: 'vector',
        used: true,
        selectivity: 0.95,
        hitRatio: 0.98
      });
    }

    return indexInfo;
  }

  /**
   * Store metrics in performance history
   */
  private storeMetrics(queryId: string, metrics: QueryPerformanceMetrics): void {
    if (!this.performanceHistory.has(queryId)) {
      this.performanceHistory.set(queryId, []);
    }

    const history = this.performanceHistory.get(queryId)!;
    history.push(metrics);

    // Keep only last 100 executions per query pattern
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Check for performance alerts and emit them
   */
  private checkPerformanceAlerts(metrics: QueryPerformanceMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // Check for slow queries
    if (metrics.duration > this.slowQueryThreshold) {
      alerts.push({
        type: 'slow_query',
        severity: metrics.duration > this.slowQueryThreshold * 5 ? 'critical' : 'warning',
        message: `Query execution took ${metrics.duration}ms, exceeding threshold of ${this.slowQueryThreshold}ms`,
        queryId: metrics.queryId,
        metrics,
        threshold: this.slowQueryThreshold,
        actualValue: metrics.duration
      });
    }

    // Check for high memory usage
    if (metrics.memoryUsage > this.highMemoryThreshold) {
      alerts.push({
        type: 'high_memory',
        severity: metrics.memoryUsage > this.highMemoryThreshold * 2 ? 'critical' : 'warning',
        message: `Query used ${metrics.memoryUsage} bytes of memory, exceeding threshold of ${this.highMemoryThreshold} bytes`,
        queryId: metrics.queryId,
        metrics,
        threshold: this.highMemoryThreshold,
        actualValue: metrics.memoryUsage
      });
    }

    // Check for index misses
    const indexMissCount = metrics.indexUsage.filter(idx => !idx.used).length;
    if (indexMissCount > 0) {
      alerts.push({
        type: 'index_miss',
        severity: indexMissCount > 2 ? 'warning' : 'info',
        message: `Query missed ${indexMissCount} potential index optimizations`,
        queryId: metrics.queryId,
        metrics,
        threshold: 0,
        actualValue: indexMissCount
      });
    }

    // Emit alerts
    for (const alert of alerts) {
      this.emit('performance_alert', alert);
      logger.warn(`Performance alert: ${alert.message}`, { 
        queryId: alert.queryId, 
        type: alert.type,
        severity: alert.severity
      });
    }
  }

  /**
   * Create basic metrics when monitoring is disabled
   */
  private createBasicMetrics(
    queryId: string, 
    query: string, 
    parameters: Record<string, any>
  ): QueryPerformanceMetrics {
    return {
      queryId,
      query: this.sanitizeQuery(query),
      parameters: this.sanitizeParameters(parameters),
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 0,
      resultCount: 0,
      memoryUsage: 0,
      indexUsage: [],
      plannerInfo: this.createEmptyPlanInfo(),
      success: true
    };
  }

  private createEmptyPlanInfo(): QueryPlanInfo {
    return {
      operatorType: 'unknown',
      estimatedRows: 0,
      actualRows: 0,
      dbHits: 0,
      pageCacheHits: 0,
      pageCacheMisses: 0,
      time: 0
    };
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    // Remove potential sensitive data from query
    return query.replace(/(['"])(?:(?=(\\?))\\.|(?!\1)[^\\\r\n])*?\1/g, '$1***$1');
  }

  /**
   * Sanitize parameters for logging
   */
  private sanitizeParameters(params: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && (
        key.toLowerCase().includes('password') ||
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('token')
      )) {
        sanitized[key] = '***';
      } else if (typeof value === 'object') {
        sanitized[key] = '[object]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Stop monitoring and cleanup
   */
  public stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.performanceHistory.clear();
    this.removeAllListeners();
    
    logger.info('Query performance monitoring stopped');
  }
}

// Export singleton instance
export const queryPerformanceMonitor = new QueryPerformanceMonitor();