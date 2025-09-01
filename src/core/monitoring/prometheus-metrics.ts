/**
 * Prometheus Metrics Service
 * Provides comprehensive application performance monitoring metrics
 */

import { register, collectDefaultMetrics, Counter, Histogram, Gauge, Summary } from 'prom-client';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../logging/logger';

// Collect default Node.js metrics
collectDefaultMetrics({ register });

// Custom application metrics
export const metrics = {
  // HTTP Request metrics
  httpRequestsTotal: new Counter({
    name: 'lanka_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
  }),

  httpRequestDuration: new Histogram({
    name: 'lanka_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
    registers: [register]
  }),

  // Database metrics
  neo4jConnectionsTotal: new Gauge({
    name: 'lanka_neo4j_connections_total',
    help: 'Total number of Neo4j connections',
    registers: [register]
  }),

  neo4jQueryDuration: new Histogram({
    name: 'lanka_neo4j_query_duration_seconds',
    help: 'Duration of Neo4j queries in seconds',
    labelNames: ['query_type'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [register]
  }),

  neo4jQueryErrors: new Counter({
    name: 'lanka_neo4j_query_errors_total',
    help: 'Total number of Neo4j query errors',
    labelNames: ['error_type'],
    registers: [register]
  }),

  // Memory metrics
  memoryUsageBytes: new Gauge({
    name: 'lanka_memory_usage_bytes',
    help: 'Current memory usage in bytes',
    labelNames: ['type'],
    registers: [register]
  }),

  memoryLeaksDetected: new Counter({
    name: 'lanka_memory_leaks_detected_total',
    help: 'Total number of memory leaks detected',
    registers: [register]
  }),

  gcDuration: new Histogram({
    name: 'lanka_gc_duration_seconds',
    help: 'Garbage collection duration in seconds',
    labelNames: ['gc_type'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    registers: [register]
  }),

  // Business metrics
  requirementsProcessed: new Counter({
    name: 'lanka_requirements_processed_total',
    help: 'Total number of requirements processed',
    labelNames: ['type', 'status'],
    registers: [register]
  }),

  architectureDecisions: new Counter({
    name: 'lanka_architecture_decisions_total',
    help: 'Total number of architecture decisions made',
    labelNames: ['decision_type'],
    registers: [register]
  }),

  codeGenerationRequests: new Counter({
    name: 'lanka_code_generation_requests_total',
    help: 'Total number of code generation requests',
    labelNames: ['language', 'success'],
    registers: [register]
  }),

  // System health metrics
  systemHealth: new Gauge({
    name: 'lanka_system_health_score',
    help: 'Overall system health score (0-1)',
    registers: [register]
  }),

  activeUsers: new Gauge({
    name: 'lanka_active_users',
    help: 'Number of currently active users',
    registers: [register]
  }),

  // Performance metrics
  responseTimePercentile: new Summary({
    name: 'lanka_response_time_percentiles',
    help: 'Response time percentiles',
    labelNames: ['endpoint'],
    percentiles: [0.5, 0.75, 0.90, 0.95, 0.99],
    registers: [register]
  }),

  errorRate: new Gauge({
    name: 'lanka_error_rate',
    help: 'Current error rate percentage',
    labelNames: ['service'],
    registers: [register]
  }),

  throughput: new Gauge({
    name: 'lanka_throughput_requests_per_second',
    help: 'Current throughput in requests per second',
    labelNames: ['service'],
    registers: [register]
  }),

  // SLA metrics
  slaCompliance: new Gauge({
    name: 'lanka_sla_compliance_percentage',
    help: 'SLA compliance percentage',
    labelNames: ['sla_type'],
    registers: [register]
  }),

  availabilityUptime: new Gauge({
    name: 'lanka_availability_uptime_seconds',
    help: 'Service uptime in seconds',
    registers: [register]
  })
};

/**
 * Metrics Service Class
 */
export class MetricsService {
  private static instance: MetricsService;
  private startTime: number;
  private metricsInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startTime = Date.now();
    this.initializeMetrics();
  }

  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  /**
   * Initialize metrics collection
   */
  private initializeMetrics(): void {
    // Update system metrics every 5 seconds
    this.metricsInterval = setInterval(() => {
      this.updateSystemMetrics();
    }, 5000);

    logger.info('Prometheus metrics service initialized');
  }

  /**
   * HTTP Middleware for request metrics
   */
  public httpMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = (Date.now() - startTime) / 1000;
        const route = req.route?.path || req.path || 'unknown';
        const method = req.method;
        const statusCode = res.statusCode.toString();

        // Record metrics
        metrics.httpRequestsTotal.inc({ method, route, status_code: statusCode });
        metrics.httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
        metrics.responseTimePercentile.observe({ endpoint: route }, duration * 1000);
      });

      next();
    };
  }

  /**
   * Record database query metrics
   */
  public recordDatabaseQuery(queryType: string, duration: number, success: boolean): void {
    metrics.neo4jQueryDuration.observe({ query_type: queryType }, duration / 1000);
    
    if (!success) {
      metrics.neo4jQueryErrors.inc({ error_type: 'query_failed' });
    }
  }

  /**
   * Record business event
   */
  public recordBusinessEvent(eventType: string, labels: Record<string, string> = {}): void {
    switch (eventType) {
      case 'requirement_processed':
        metrics.requirementsProcessed.inc(labels);
        break;
      case 'architecture_decision':
        metrics.architectureDecisions.inc(labels);
        break;
      case 'code_generation':
        metrics.codeGenerationRequests.inc(labels);
        break;
    }
  }

  /**
   * Update system health score
   */
  public updateHealthScore(score: number): void {
    metrics.systemHealth.set(score);
  }

  /**
   * Update active users count
   */
  public updateActiveUsers(count: number): void {
    metrics.activeUsers.set(count);
  }

  /**
   * Record memory leak detection
   */
  public recordMemoryLeak(): void {
    metrics.memoryLeaksDetected.inc();
  }

  /**
   * Record garbage collection event
   */
  public recordGCEvent(type: string, duration: number): void {
    metrics.gcDuration.observe({ gc_type: type }, duration / 1000);
  }

  /**
   * Update SLA metrics
   */
  public updateSLAMetrics(slaType: string, compliancePercentage: number): void {
    metrics.slaCompliance.set({ sla_type: slaType }, compliancePercentage);
  }

  /**
   * Update system metrics
   */
  private updateSystemMetrics(): void {
    // Update memory metrics
    const memUsage = process.memoryUsage();
    metrics.memoryUsageBytes.set({ type: 'heap_used' }, memUsage.heapUsed);
    metrics.memoryUsageBytes.set({ type: 'heap_total' }, memUsage.heapTotal);
    metrics.memoryUsageBytes.set({ type: 'rss' }, memUsage.rss);
    metrics.memoryUsageBytes.set({ type: 'external' }, memUsage.external);

    // Update uptime
    const uptimeSeconds = (Date.now() - this.startTime) / 1000;
    metrics.availabilityUptime.set(uptimeSeconds);
  }

  /**
   * Get metrics registry for Prometheus scraping
   */
  public getRegistry() {
    return register;
  }

  /**
   * Get all metrics
   */
  public async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Shutdown metrics service
   */
  public shutdown(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    
    register.clear();
    logger.info('Prometheus metrics service shutdown');
  }
}

export const metricsService = MetricsService.getInstance();
