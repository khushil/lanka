/**
 * SLA Tracking and Business Metrics Service
 * Monitors service level agreements and key performance indicators
 */

import { EventEmitter } from 'events';
import { metricsService } from './prometheus-metrics';
import { structuredLogger } from '../logging/structured-logger';
import { tracingService } from './tracing';

export interface SLADefinition {
  name: string;
  description: string;
  target: number; // Target percentage (0-100)
  measurement: 'availability' | 'response_time' | 'error_rate' | 'throughput';
  timeWindow: string; // e.g., '1h', '24h', '30d'
  threshold?: number; // For response time and throughput
  tags?: Record<string, string>;
}

export interface SLAStatus {
  name: string;
  current: number;
  target: number;
  compliance: number; // Actual compliance percentage
  trend: 'improving' | 'degrading' | 'stable';
  lastUpdated: Date;
  violations: SLAViolation[];
}

export interface SLAViolation {
  timestamp: Date;
  duration: number; // Duration in ms
  severity: 'minor' | 'major' | 'critical';
  description: string;
  impact: string;
}

export interface BusinessMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
  description?: string;
}

/**
 * SLA Tracker Service
 */
export class SLATracker extends EventEmitter {
  private static instance: SLATracker;
  private slaDefinitions: Map<string, SLADefinition> = new Map();
  private slaStatus: Map<string, SLAStatus> = new Map();
  private businessMetrics: Map<string, BusinessMetric[]> = new Map();
  private evaluationInterval: NodeJS.Timeout | null = null;
  private readonly maxHistorySize = 1000;

  private constructor() {
    super();
    this.initializeDefaultSLAs();
    this.startEvaluation();
  }

  public static getInstance(): SLATracker {
    if (!SLATracker.instance) {
      SLATracker.instance = new SLATracker();
    }
    return SLATracker.instance;
  }

  /**
   * Initialize default SLAs
   */
  private initializeDefaultSLAs(): void {
    // Availability SLA - 99.9% uptime
    this.defineSLA({
      name: 'availability',
      description: 'Service availability target',
      target: 99.9,
      measurement: 'availability',
      timeWindow: '24h'
    });

    // Response Time SLA - 95% of requests under 2 seconds
    this.defineSLA({
      name: 'response_time',
      description: '95th percentile response time under 2 seconds',
      target: 95.0,
      measurement: 'response_time',
      timeWindow: '1h',
      threshold: 2000 // 2 seconds in ms
    });

    // Error Rate SLA - Less than 1% error rate
    this.defineSLA({
      name: 'error_rate',
      description: 'Error rate below 1%',
      target: 99.0, // 99% success rate = 1% error rate
      measurement: 'error_rate',
      timeWindow: '1h'
    });

    // Throughput SLA - Minimum 100 requests per minute
    this.defineSLA({
      name: 'throughput',
      description: 'Minimum throughput requirement',
      target: 100,
      measurement: 'throughput',
      timeWindow: '5m',
      threshold: 100 // 100 requests per minute
    });

    structuredLogger.info('Default SLAs initialized', {
      slaCount: this.slaDefinitions.size
    });
  }

  /**
   * Define a new SLA
   */
  public defineSLA(sla: SLADefinition): void {
    this.slaDefinitions.set(sla.name, sla);
    
    // Initialize status
    this.slaStatus.set(sla.name, {
      name: sla.name,
      current: 0,
      target: sla.target,
      compliance: 0,
      trend: 'stable',
      lastUpdated: new Date(),
      violations: []
    });

    structuredLogger.info('SLA defined', {
      slaName: sla.name,
      target: sla.target,
      measurement: sla.measurement
    });

    this.emit('sla:defined', sla);
  }

  /**
   * Record business metric
   */
  public recordBusinessMetric(name: string, value: number, unit: string, tags?: Record<string, string>, description?: string): void {
    const metric: BusinessMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags,
      description
    };

    if (!this.businessMetrics.has(name)) {
      this.businessMetrics.set(name, []);
    }

    const metrics = this.businessMetrics.get(name)!;
    metrics.push(metric);

    // Trim history
    if (metrics.length > this.maxHistorySize) {
      metrics.splice(0, metrics.length - this.maxHistorySize);
    }

    // Update Prometheus metrics
    switch (name) {
      case 'requirements_processed':
        metricsService.recordBusinessEvent('requirement_processed', tags || {});
        break;
      case 'architecture_decisions':
        metricsService.recordBusinessEvent('architecture_decision', tags || {});
        break;
      case 'code_generation_requests':
        metricsService.recordBusinessEvent('code_generation', tags || {});
        break;
    }

    structuredLogger.businessEvent(name, {
      value,
      unit,
      tags
    });

    this.emit('metric:recorded', metric);
  }

  /**
   * Get current SLA status
   */
  public getSLAStatus(name?: string): SLAStatus[] {
    if (name) {
      const status = this.slaStatus.get(name);
      return status ? [status] : [];
    }
    return Array.from(this.slaStatus.values());
  }

  /**
   * Get business metric history
   */
  public getBusinessMetrics(name?: string): BusinessMetric[] {
    if (name) {
      return this.businessMetrics.get(name) || [];
    }
    
    const allMetrics: BusinessMetric[] = [];
    for (const metrics of this.businessMetrics.values()) {
      allMetrics.push(...metrics);
    }
    return allMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Calculate SLA compliance
   */
  public async calculateCompliance(slaName: string): Promise<number> {
    const sla = this.slaDefinitions.get(slaName);
    if (!sla) {
      throw new Error(`SLA ${slaName} not found`);
    }

    return tracingService.traceBusinessOperation(
      'sla',
      'calculateCompliance',
      async () => {
        let compliance = 0;

        switch (sla.measurement) {
          case 'availability':
            compliance = await this.calculateAvailabilityCompliance(sla);
            break;
          case 'response_time':
            compliance = await this.calculateResponseTimeCompliance(sla);
            break;
          case 'error_rate':
            compliance = await this.calculateErrorRateCompliance(sla);
            break;
          case 'throughput':
            compliance = await this.calculateThroughputCompliance(sla);
            break;
        }

        // Update status
        const status = this.slaStatus.get(slaName)!;
        const previousCompliance = status.compliance;
        status.compliance = compliance;
        status.current = compliance;
        status.lastUpdated = new Date();
        
        // Determine trend
        if (compliance > previousCompliance + 1) {
          status.trend = 'improving';
        } else if (compliance < previousCompliance - 1) {
          status.trend = 'degrading';
        } else {
          status.trend = 'stable';
        }

        // Check for violations
        if (compliance < sla.target) {
          this.recordSLAViolation(slaName, compliance, sla.target);
        }

        // Update Prometheus metrics
        metricsService.updateSLAMetrics(slaName, compliance);

        return compliance;
      },
      {
        slaName,
        measurement: sla.measurement,
        target: sla.target
      }
    );
  }

  /**
   * Calculate availability compliance
   */
  private async calculateAvailabilityCompliance(sla: SLADefinition): Promise<number> {
    // Mock implementation - in real scenario, this would query metrics
    // For now, assume 99.95% availability
    return 99.95;
  }

  /**
   * Calculate response time compliance
   */
  private async calculateResponseTimeCompliance(sla: SLADefinition): Promise<number> {
    // Mock implementation - in real scenario, this would query Prometheus
    // Calculate percentage of requests under threshold
    return 96.5; // 96.5% of requests under 2 seconds
  }

  /**
   * Calculate error rate compliance
   */
  private async calculateErrorRateCompliance(sla: SLADefinition): Promise<number> {
    // Mock implementation - in real scenario, this would query error metrics
    return 99.2; // 99.2% success rate (0.8% error rate)
  }

  /**
   * Calculate throughput compliance
   */
  private async calculateThroughputCompliance(sla: SLADefinition): Promise<number> {
    // Mock implementation - in real scenario, this would query request rate
    return 110; // 110 requests per minute (above 100 threshold)
  }

  /**
   * Record SLA violation
   */
  private recordSLAViolation(slaName: string, actualValue: number, targetValue: number): void {
    const status = this.slaStatus.get(slaName)!;
    const gap = targetValue - actualValue;
    
    let severity: 'minor' | 'major' | 'critical';
    if (gap < 1) {
      severity = 'minor';
    } else if (gap < 5) {
      severity = 'major';
    } else {
      severity = 'critical';
    }

    const violation: SLAViolation = {
      timestamp: new Date(),
      duration: 0, // Would be calculated based on time in violation
      severity,
      description: `SLA ${slaName} violated: ${actualValue}% vs target ${targetValue}%`,
      impact: `Performance gap of ${gap.toFixed(2)}%`
    };

    status.violations.push(violation);
    
    // Keep only last 50 violations
    if (status.violations.length > 50) {
      status.violations = status.violations.slice(-50);
    }

    structuredLogger.warn('SLA violation detected', {
      slaName,
      actualValue,
      targetValue,
      gap,
      severity
    });

    this.emit('sla:violation', { slaName, violation });
  }

  /**
   * Start periodic SLA evaluation
   */
  private startEvaluation(): void {
    if (this.evaluationInterval) {
      return;
    }

    this.evaluationInterval = setInterval(async () => {
      try {
        for (const slaName of this.slaDefinitions.keys()) {
          await this.calculateCompliance(slaName);
        }
      } catch (error) {
        structuredLogger.error('Error during SLA evaluation', error);
      }
    }, 60000); // Evaluate every minute

    structuredLogger.info('SLA evaluation started', {
      interval: '60s',
      slaCount: this.slaDefinitions.size
    });
  }

  /**
   * Generate SLA report
   */
  public generateReport(): {
    summary: {
      totalSLAs: number;
      compliantSLAs: number;
      violatedSLAs: number;
      overallCompliance: number;
    };
    details: SLAStatus[];
    businessMetrics: BusinessMetric[];
  } {
    const details = this.getSLAStatus();
    const compliantSLAs = details.filter(s => s.compliance >= s.target).length;
    const overallCompliance = details.reduce((sum, s) => sum + s.compliance, 0) / details.length;

    return {
      summary: {
        totalSLAs: details.length,
        compliantSLAs,
        violatedSLAs: details.length - compliantSLAs,
        overallCompliance
      },
      details,
      businessMetrics: this.getBusinessMetrics().slice(0, 100) // Last 100 metrics
    };
  }

  /**
   * Shutdown SLA tracker
   */
  public shutdown(): void {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
      this.evaluationInterval = null;
    }
    
    this.removeAllListeners();
    structuredLogger.info('SLA tracker shutdown complete');
  }
}

// Singleton instance
export const slaTracker = SLATracker.getInstance();
