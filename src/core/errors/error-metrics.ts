/**
 * Error Metrics and Tracking System for Lanka Platform
 * Provides comprehensive error monitoring and analytics
 */

import { LankaError, ErrorSeverity, ErrorCategory, ErrorCode } from './error-types';
import { logger } from '../logging/logger';

export interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsByCode: Record<string, number>;
  errorsByHour: Record<string, number>;
  errorsByUser: Record<string, number>;
  errorsByOperation: Record<string, number>;
  responseTimeImpact: {
    averageResponseTime: number;
    errorResponseTime: number;
    impactPercentage: number;
  };
  errorRate: {
    current: number;
    previous: number;
    change: number;
  };
  retryMetrics: {
    totalRetries: number;
    successfulRetries: number;
    failedRetries: number;
    averageRetryCount: number;
  };
}

export interface ErrorTrend {
  timestamp: Date;
  totalErrors: number;
  criticalErrors: number;
  highSeverityErrors: number;
  mediumSeverityErrors: number;
  lowSeverityErrors: number;
}

export interface ErrorAlert {
  id: string;
  type: 'threshold' | 'spike' | 'pattern' | 'anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, any>;
  triggeredAt: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}

export class ErrorMetricsCollector {
  private static instance: ErrorMetricsCollector;
  private errors: LankaError[] = [];
  private responseTimeTracker = new Map<string, number[]>();
  private errorTrends: ErrorTrend[] = [];
  private alerts: ErrorAlert[] = [];
  private retryTracker = new Map<string, { attempts: number; success: boolean }>();

  // Configuration
  private readonly maxErrorHistory = 10000;
  private readonly trendInterval = 60000; // 1 minute
  private readonly cleanupInterval = 300000; // 5 minutes

  constructor() {
    this.startTrendCollection();
    this.startCleanup();
  }

  static getInstance(): ErrorMetricsCollector {
    if (!ErrorMetricsCollector.instance) {
      ErrorMetricsCollector.instance = new ErrorMetricsCollector();
    }
    return ErrorMetricsCollector.instance;
  }

  /**
   * Record an error occurrence
   */
  recordError(error: LankaError): void {
    this.errors.push(error);
    
    // Trim history if needed
    if (this.errors.length > this.maxErrorHistory) {
      this.errors = this.errors.slice(-this.maxErrorHistory);
    }

    // Check for alerts
    this.checkForAlerts(error);

    // Update real-time metrics
    this.updateRealTimeMetrics(error);
  }

  /**
   * Record response time impact
   */
  recordResponseTime(operation: string, responseTime: number, hasError: boolean): void {
    if (!this.responseTimeTracker.has(operation)) {
      this.responseTimeTracker.set(operation, []);
    }

    const times = this.responseTimeTracker.get(operation)!;
    times.push(responseTime);

    // Keep only last 100 response times per operation
    if (times.length > 100) {
      times.shift();
    }

    // Calculate impact if there's an error
    if (hasError) {
      this.calculateResponseTimeImpact(operation);
    }
  }

  /**
   * Record retry attempt
   */
  recordRetryAttempt(operationId: string, attemptNumber: number, success: boolean): void {
    this.retryTracker.set(operationId, {
      attempts: attemptNumber,
      success
    });

    // Clean up old retry records (after 1 hour)
    setTimeout(() => {
      this.retryTracker.delete(operationId);
    }, 3600000);
  }

  /**
   * Get current error metrics
   */
  getMetrics(timeRange?: { start: Date; end: Date }): ErrorMetrics {
    const filteredErrors = timeRange
      ? this.errors.filter(e => e.timestamp >= timeRange.start && e.timestamp <= timeRange.end)
      : this.errors;

    const totalErrors = filteredErrors.length;
    
    // Calculate metrics
    const errorsByCategory = this.calculateCategoryDistribution(filteredErrors);
    const errorsBySeverity = this.calculateSeverityDistribution(filteredErrors);
    const errorsByCode = this.calculateCodeDistribution(filteredErrors);
    const errorsByHour = this.calculateHourlyDistribution(filteredErrors);
    const errorsByUser = this.calculateUserDistribution(filteredErrors);
    const errorsByOperation = this.calculateOperationDistribution(filteredErrors);
    const responseTimeImpact = this.calculateAverageResponseTimeImpact();
    const errorRate = this.calculateErrorRate();
    const retryMetrics = this.calculateRetryMetrics();

    return {
      totalErrors,
      errorsByCategory,
      errorsBySeverity,
      errorsByCode,
      errorsByHour,
      errorsByUser,
      errorsByOperation,
      responseTimeImpact,
      errorRate,
      retryMetrics
    };
  }

  /**
   * Get error trends
   */
  getTrends(hours: number = 24): ErrorTrend[] {
    const cutoffTime = new Date(Date.now() - hours * 3600000);
    return this.errorTrends.filter(trend => trend.timestamp >= cutoffTime);
  }

  /**
   * Get current alerts
   */
  getAlerts(includeResolved: boolean = false): ErrorAlert[] {
    return includeResolved 
      ? this.alerts 
      : this.alerts.filter(alert => !alert.resolvedAt);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolvedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Get top error patterns
   */
  getTopErrorPatterns(limit: number = 10): Array<{
    pattern: string;
    count: number;
    percentage: number;
    lastOccurrence: Date;
  }> {
    const patterns = new Map<string, { count: number; lastOccurrence: Date }>();

    this.errors.forEach(error => {
      const pattern = `${error.category}:${error.code}`;
      const existing = patterns.get(pattern) || { count: 0, lastOccurrence: error.timestamp };
      
      patterns.set(pattern, {
        count: existing.count + 1,
        lastOccurrence: error.timestamp > existing.lastOccurrence 
          ? error.timestamp 
          : existing.lastOccurrence
      });
    });

    const total = this.errors.length;
    return Array.from(patterns.entries())
      .map(([pattern, data]) => ({
        pattern,
        count: data.count,
        percentage: (data.count / total) * 100,
        lastOccurrence: data.lastOccurrence
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Detect anomalies in error patterns
   */
  detectAnomalies(): Array<{
    type: 'spike' | 'unusual_pattern' | 'new_error';
    description: string;
    severity: 'low' | 'medium' | 'high';
    details: Record<string, any>;
  }> {
    const anomalies: Array<{
      type: 'spike' | 'unusual_pattern' | 'new_error';
      description: string;
      severity: 'low' | 'medium' | 'high';
      details: Record<string, any>;
    }> = [];

    // Detect error spikes (more than 3x normal rate in last 10 minutes)
    const recentErrors = this.getRecentErrors(10);
    const normalRate = this.calculateNormalErrorRate();
    const currentRate = recentErrors.length / 10; // errors per minute

    if (currentRate > normalRate * 3) {
      anomalies.push({
        type: 'spike',
        description: `Error rate spike detected: ${currentRate.toFixed(2)}/min (normal: ${normalRate.toFixed(2)}/min)`,
        severity: currentRate > normalRate * 5 ? 'high' : 'medium',
        details: {
          currentRate,
          normalRate,
          multiplier: currentRate / normalRate,
          recentErrorCount: recentErrors.length
        }
      });
    }

    // Detect new error types
    const newErrors = this.detectNewErrorTypes(recentErrors);
    newErrors.forEach(errorCode => {
      anomalies.push({
        type: 'new_error',
        description: `New error type detected: ${errorCode}`,
        severity: 'medium',
        details: { errorCode }
      });
    });

    // Detect unusual error patterns
    const unusualPatterns = this.detectUnusualPatterns();
    unusualPatterns.forEach(pattern => {
      anomalies.push({
        type: 'unusual_pattern',
        description: pattern.description,
        severity: pattern.severity,
        details: pattern.details
      });
    });

    return anomalies;
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(): Record<string, any> {
    const metrics = this.getMetrics();
    const trends = this.getTrends(1); // Last hour
    const alerts = this.getAlerts();
    const patterns = this.getTopErrorPatterns();
    const anomalies = this.detectAnomalies();

    return {
      timestamp: new Date().toISOString(),
      metrics,
      trends,
      alerts: {
        active: alerts.length,
        acknowledged: alerts.filter(a => a.acknowledged).length,
        unacknowledged: alerts.filter(a => !a.acknowledged).length
      },
      topPatterns: patterns,
      anomalies,
      health: {
        errorRate: metrics.errorRate.current,
        criticalErrors: metrics.errorsBySeverity[ErrorSeverity.CRITICAL] || 0,
        systemHealth: this.calculateSystemHealth()
      }
    };
  }

  /**
   * Private helper methods
   */
  private startTrendCollection(): void {
    setInterval(() => {
      const now = new Date();
      const lastMinuteErrors = this.errors.filter(
        e => e.timestamp >= new Date(now.getTime() - this.trendInterval)
      );

      const trend: ErrorTrend = {
        timestamp: now,
        totalErrors: lastMinuteErrors.length,
        criticalErrors: lastMinuteErrors.filter(e => e.severity === ErrorSeverity.CRITICAL).length,
        highSeverityErrors: lastMinuteErrors.filter(e => e.severity === ErrorSeverity.HIGH).length,
        mediumSeverityErrors: lastMinuteErrors.filter(e => e.severity === ErrorSeverity.MEDIUM).length,
        lowSeverityErrors: lastMinuteErrors.filter(e => e.severity === ErrorSeverity.LOW).length
      };

      this.errorTrends.push(trend);

      // Keep only last 24 hours of trends
      const cutoff = new Date(now.getTime() - 24 * 3600000);
      this.errorTrends = this.errorTrends.filter(t => t.timestamp >= cutoff);
    }, this.trendInterval);
  }

  private startCleanup(): void {
    setInterval(() => {
      // Clean up old errors (keep last 4 hours)
      const cutoff = new Date(Date.now() - 4 * 3600000);
      this.errors = this.errors.filter(e => e.timestamp >= cutoff);

      // Clean up resolved alerts older than 24 hours
      const alertCutoff = new Date(Date.now() - 24 * 3600000);
      this.alerts = this.alerts.filter(
        alert => !alert.resolvedAt || alert.resolvedAt >= alertCutoff
      );

      logger.debug('Error metrics cleanup completed', {
        errorsKept: this.errors.length,
        alertsKept: this.alerts.length
      });
    }, this.cleanupInterval);
  }

  private checkForAlerts(error: LankaError): void {
    // Critical error alert
    if (error.severity === ErrorSeverity.CRITICAL) {
      this.createAlert({
        type: 'threshold',
        severity: 'critical',
        message: `Critical error detected: ${error.code}`,
        details: {
          errorCode: error.code,
          message: error.message,
          context: error.context
        }
      });
    }

    // Error rate threshold alerts
    const recentErrors = this.getRecentErrors(5); // Last 5 minutes
    if (recentErrors.length > 50) { // More than 50 errors in 5 minutes
      this.createAlert({
        type: 'threshold',
        severity: 'high',
        message: `High error rate detected: ${recentErrors.length} errors in 5 minutes`,
        details: {
          errorCount: recentErrors.length,
          timeWindow: '5 minutes'
        }
      });
    }

    // Repeated error pattern alert
    const sameErrorsRecent = recentErrors.filter(e => e.code === error.code);
    if (sameErrorsRecent.length > 10) { // Same error more than 10 times in 5 minutes
      this.createAlert({
        type: 'pattern',
        severity: 'medium',
        message: `Repeated error pattern: ${error.code} occurred ${sameErrorsRecent.length} times`,
        details: {
          errorCode: error.code,
          occurrences: sameErrorsRecent.length
        }
      });
    }
  }

  private createAlert(alertData: Omit<ErrorAlert, 'id' | 'triggeredAt' | 'acknowledged'>): void {
    const alert: ErrorAlert = {
      ...alertData,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      triggeredAt: new Date(),
      acknowledged: false
    };

    this.alerts.push(alert);
    
    logger.warn('Error alert created', alert);
  }

  private calculateCategoryDistribution(errors: LankaError[]): Record<ErrorCategory, number> {
    const distribution = {} as Record<ErrorCategory, number>;
    
    Object.values(ErrorCategory).forEach(category => {
      distribution[category] = errors.filter(e => e.category === category).length;
    });
    
    return distribution;
  }

  private calculateSeverityDistribution(errors: LankaError[]): Record<ErrorSeverity, number> {
    const distribution = {} as Record<ErrorSeverity, number>;
    
    Object.values(ErrorSeverity).forEach(severity => {
      distribution[severity] = errors.filter(e => e.severity === severity).length;
    });
    
    return distribution;
  }

  private calculateCodeDistribution(errors: LankaError[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    errors.forEach(error => {
      distribution[error.code] = (distribution[error.code] || 0) + 1;
    });
    
    return distribution;
  }

  private calculateHourlyDistribution(errors: LankaError[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    errors.forEach(error => {
      const hour = error.timestamp.getHours().toString().padStart(2, '0');
      distribution[hour] = (distribution[hour] || 0) + 1;
    });
    
    return distribution;
  }

  private calculateUserDistribution(errors: LankaError[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    errors.forEach(error => {
      const userId = error.context?.userId || 'anonymous';
      distribution[userId] = (distribution[userId] || 0) + 1;
    });
    
    return distribution;
  }

  private calculateOperationDistribution(errors: LankaError[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    errors.forEach(error => {
      const operation = error.context?.operation || 'unknown';
      distribution[operation] = (distribution[operation] || 0) + 1;
    });
    
    return distribution;
  }

  private calculateAverageResponseTimeImpact(): {
    averageResponseTime: number;
    errorResponseTime: number;
    impactPercentage: number;
  } {
    let totalResponseTime = 0;
    let errorResponseTime = 0;
    let totalRequests = 0;
    let errorRequests = 0;

    this.responseTimeTracker.forEach(times => {
      times.forEach(time => {
        totalResponseTime += time;
        totalRequests++;
      });
    });

    // This is simplified - in reality you'd correlate response times with errors
    const recentErrors = this.getRecentErrors(60);
    errorResponseTime = totalResponseTime; // Simplified
    errorRequests = recentErrors.length;

    const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
    const avgErrorResponseTime = errorRequests > 0 ? errorResponseTime / errorRequests : 0;
    const impactPercentage = averageResponseTime > 0 
      ? ((avgErrorResponseTime - averageResponseTime) / averageResponseTime) * 100 
      : 0;

    return {
      averageResponseTime,
      errorResponseTime: avgErrorResponseTime,
      impactPercentage
    };
  }

  private calculateErrorRate(): { current: number; previous: number; change: number } {
    const now = Date.now();
    const currentPeriodStart = now - 3600000; // Last hour
    const previousPeriodStart = currentPeriodStart - 3600000; // Previous hour

    const currentErrors = this.errors.filter(
      e => e.timestamp.getTime() >= currentPeriodStart
    ).length;

    const previousErrors = this.errors.filter(
      e => e.timestamp.getTime() >= previousPeriodStart && 
          e.timestamp.getTime() < currentPeriodStart
    ).length;

    const change = previousErrors > 0 
      ? ((currentErrors - previousErrors) / previousErrors) * 100 
      : currentErrors > 0 ? 100 : 0;

    return {
      current: currentErrors / 60, // errors per minute
      previous: previousErrors / 60,
      change
    };
  }

  private calculateRetryMetrics(): {
    totalRetries: number;
    successfulRetries: number;
    failedRetries: number;
    averageRetryCount: number;
  } {
    const retries = Array.from(this.retryTracker.values());
    const totalRetries = retries.length;
    const successfulRetries = retries.filter(r => r.success).length;
    const failedRetries = totalRetries - successfulRetries;
    const averageRetryCount = totalRetries > 0 
      ? retries.reduce((sum, r) => sum + r.attempts, 0) / totalRetries 
      : 0;

    return {
      totalRetries,
      successfulRetries,
      failedRetries,
      averageRetryCount
    };
  }

  private getRecentErrors(minutes: number): LankaError[] {
    const cutoff = new Date(Date.now() - minutes * 60000);
    return this.errors.filter(e => e.timestamp >= cutoff);
  }

  private calculateNormalErrorRate(): number {
    // Calculate average error rate over the last 24 hours
    const dayAgoErrors = this.errors.filter(
      e => e.timestamp >= new Date(Date.now() - 24 * 3600000)
    );
    return dayAgoErrors.length / (24 * 60); // errors per minute
  }

  private detectNewErrorTypes(recentErrors: LankaError[]): string[] {
    const recentCodes = new Set(recentErrors.map(e => e.code));
    const historicalCodes = new Set(
      this.errors
        .filter(e => e.timestamp < new Date(Date.now() - 3600000)) // Older than 1 hour
        .map(e => e.code)
    );

    return Array.from(recentCodes).filter(code => !historicalCodes.has(code));
  }

  private detectUnusualPatterns(): Array<{
    description: string;
    severity: 'low' | 'medium' | 'high';
    details: Record<string, any>;
  }> {
    const patterns: Array<{
      description: string;
      severity: 'low' | 'medium' | 'high';
      details: Record<string, any>;
    }> = [];

    // Detect if a usually rare error is happening frequently
    const errorFrequency = this.calculateCodeDistribution(this.errors);
    const recentErrors = this.getRecentErrors(30);
    const recentFrequency = this.calculateCodeDistribution(recentErrors);

    Object.entries(recentFrequency).forEach(([code, recentCount]) => {
      const totalCount = errorFrequency[code] || 0;
      const historicalAverage = totalCount / Math.max(1, this.errors.length / 1000); // per 1000 errors
      const recentRate = recentCount / Math.max(1, recentErrors.length / 1000);

      if (recentRate > historicalAverage * 5 && recentCount > 5) {
        patterns.push({
          description: `Unusual increase in ${code}: ${recentRate.toFixed(2)}x normal rate`,
          severity: recentRate > historicalAverage * 10 ? 'high' : 'medium',
          details: {
            errorCode: code,
            recentCount,
            normalRate: historicalAverage,
            currentRate: recentRate,
            multiplier: recentRate / historicalAverage
          }
        });
      }
    });

    return patterns;
  }

  private calculateSystemHealth(): 'healthy' | 'degraded' | 'critical' {
    const metrics = this.getMetrics();
    const recentErrors = this.getRecentErrors(10);
    const criticalErrors = recentErrors.filter(e => e.severity === ErrorSeverity.CRITICAL).length;
    
    if (criticalErrors > 0 || metrics.errorRate.current > 10) {
      return 'critical';
    }
    
    if (metrics.errorRate.current > 5 || recentErrors.length > 20) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  private updateRealTimeMetrics(error: LankaError): void {
    // This could send metrics to external systems like Prometheus, DataDog, etc.
    logger.debug('Real-time error metric updated', {
      code: error.code,
      category: error.category,
      severity: error.severity,
      timestamp: error.timestamp
    });
  }
}

// Export singleton instance
export const errorMetricsCollector = ErrorMetricsCollector.getInstance();