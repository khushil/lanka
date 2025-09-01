/**
 * Global Error Handler for Lanka Platform
 * Handles unhandled errors and provides centralized error management
 */

import { ErrorWrapper } from './error-wrapper';
import { LankaError, ErrorSeverity, ErrorCode } from './error-types';
import { logger } from '../logging/logger';

export interface ErrorHandlerOptions {
  enableCrashReporting?: boolean;
  enableMetrics?: boolean;
  alertThresholds?: {
    criticalErrorsPerMinute?: number;
    highErrorsPerMinute?: number;
    mediumErrorsPerMinute?: number;
  };
  notificationChannels?: {
    slack?: {
      webhookUrl: string;
      channel: string;
    };
    email?: {
      recipients: string[];
      smtpConfig: any;
    };
    pagerDuty?: {
      integrationKey: string;
    };
  };
}

export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private errorCounts: Map<string, number> = new Map();
  private lastAlertTime: Map<string, number> = new Map();
  private isShuttingDown = false;

  constructor(private options: ErrorHandlerOptions = {}) {
    this.setupProcessHandlers();
    this.startMetricsCollection();
  }

  static getInstance(options?: ErrorHandlerOptions): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler(options);
    }
    return GlobalErrorHandler.instance;
  }

  /**
   * Handle uncaught exceptions
   */
  private setupProcessHandlers(): void {
    // Uncaught Exception Handler
    process.on('uncaughtException', (error: Error) => {
      const lankaError = ErrorWrapper.wrap(error, {
        operation: 'uncaught_exception',
        metadata: { source: 'process.uncaughtException' }
      });

      this.handleCriticalError(lankaError);
      
      // Give time for error reporting before exit
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });

    // Unhandled Promise Rejection Handler
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      const lankaError = ErrorWrapper.wrap(error, {
        operation: 'unhandled_rejection',
        metadata: { 
          source: 'process.unhandledRejection',
          promise: promise.toString()
        }
      });

      this.handleCriticalError(lankaError);
    });

    // Graceful Shutdown Handlers
    ['SIGTERM', 'SIGINT', 'SIGUSR2'].forEach((signal) => {
      process.on(signal, () => {
        logger.info(`Received ${signal}, starting graceful shutdown`);
        this.gracefulShutdown(signal);
      });
    });

    // Warning Handler for memory leaks, etc.
    process.on('warning', (warning: NodeJS.ProcessWarning) => {
      const warningError = ErrorWrapper.system(
        ErrorCode.CONFIGURATION_ERROR,
        `Node.js Warning: ${warning.message}`,
        {
          operation: 'process_warning',
          metadata: {
            warningName: warning.name,
            warningCode: warning.code,
            warningStack: warning.stack
          }
        }
      );
      
      this.handleError(warningError);
    });
  }

  /**
   * Handle any Lanka error
   */
  handleError(error: LankaError): void {
    if (this.isShuttingDown) {
      return;
    }

    try {
      // Update error metrics
      this.updateErrorMetrics(error);

      // Check if we need to send alerts
      this.checkAlertThresholds(error);

      // Report to external services if configured
      if (this.options.enableCrashReporting) {
        this.reportError(error);
      }

      // Log the error (already done in ErrorWrapper, but this ensures it's logged)
      this.logError(error);

    } catch (handlingError) {
      // Fallback logging if error handling itself fails
      console.error('Error in error handler:', handlingError);
      console.error('Original error:', error);
    }
  }

  /**
   * Handle critical errors that require immediate attention
   */
  private handleCriticalError(error: LankaError): void {
    console.error('CRITICAL ERROR:', error.toString());
    console.error('Stack:', error.stack);

    // Force immediate reporting for critical errors
    this.reportError(error, true);
    this.sendImmediateAlert(error);
    
    // Log with maximum verbosity
    logger.error('CRITICAL ERROR - System may be unstable', {
      error: error.toJSON(),
      stack: error.stack,
      processMemory: process.memoryUsage(),
      uptime: process.uptime()
    });
  }

  /**
   * Update error counting metrics
   */
  private updateErrorMetrics(error: LankaError): void {
    if (!this.options.enableMetrics) {
      return;
    }

    const minuteKey = this.getMinuteKey();
    const severityKey = `${minuteKey}:${error.severity}`;
    const categoryKey = `${minuteKey}:${error.category}`;
    const codeKey = `${minuteKey}:${error.code}`;

    this.errorCounts.set(severityKey, (this.errorCounts.get(severityKey) || 0) + 1);
    this.errorCounts.set(categoryKey, (this.errorCounts.get(categoryKey) || 0) + 1);
    this.errorCounts.set(codeKey, (this.errorCounts.get(codeKey) || 0) + 1);
  }

  /**
   * Check if error rates exceed alert thresholds
   */
  private checkAlertThresholds(error: LankaError): void {
    if (!this.options.alertThresholds) {
      return;
    }

    const minuteKey = this.getMinuteKey();
    const severityKey = `${minuteKey}:${error.severity}`;
    const currentCount = this.errorCounts.get(severityKey) || 0;

    let threshold: number | undefined;
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        threshold = this.options.alertThresholds.criticalErrorsPerMinute || 1;
        break;
      case ErrorSeverity.HIGH:
        threshold = this.options.alertThresholds.highErrorsPerMinute || 5;
        break;
      case ErrorSeverity.MEDIUM:
        threshold = this.options.alertThresholds.mediumErrorsPerMinute || 20;
        break;
      default:
        return; // No alerts for LOW severity
    }

    if (currentCount >= threshold) {
      const alertKey = `${error.severity}:${minuteKey}`;
      const lastAlert = this.lastAlertTime.get(alertKey) || 0;
      const now = Date.now();

      // Don't spam alerts - minimum 5 minutes between alerts of same type
      if (now - lastAlert > 5 * 60 * 1000) {
        this.sendThresholdAlert(error.severity, currentCount, threshold);
        this.lastAlertTime.set(alertKey, now);
      }
    }
  }

  /**
   * Report error to external monitoring services
   */
  private reportError(error: LankaError, urgent: boolean = false): void {
    // This would integrate with services like Sentry, Rollbar, etc.
    // For now, we'll just log the intent
    logger.info('Reporting error to external service', {
      errorCode: error.code,
      severity: error.severity,
      urgent,
      reportingEnabled: this.options.enableCrashReporting
    });

    // Example integration points:
    // - Sentry.captureException(error)
    // - Rollbar.error(error)
    // - Datadog.increment('error.count', 1, { severity: error.severity })
  }

  /**
   * Send immediate alert for critical errors
   */
  private sendImmediateAlert(error: LankaError): void {
    const alertMessage = `🚨 CRITICAL ERROR in Lanka Platform
Error Code: ${error.code}
Message: ${error.message}
Category: ${error.category}
Time: ${new Date().toISOString()}
Context: ${JSON.stringify(error.context, null, 2)}`;

    this.sendAlert(alertMessage, 'critical');
  }

  /**
   * Send threshold-based alerts
   */
  private sendThresholdAlert(severity: ErrorSeverity, count: number, threshold: number): void {
    const alertMessage = `⚠️ Error Rate Alert - Lanka Platform
Severity: ${severity}
Count: ${count} errors/minute (threshold: ${threshold})
Time: ${new Date().toISOString()}`;

    this.sendAlert(alertMessage, severity.toLowerCase());
  }

  /**
   * Send alert through configured channels
   */
  private sendAlert(message: string, priority: string): void {
    // Slack notification
    if (this.options.notificationChannels?.slack) {
      this.sendSlackAlert(message, priority);
    }

    // Email notification
    if (this.options.notificationChannels?.email) {
      this.sendEmailAlert(message, priority);
    }

    // PagerDuty notification
    if (this.options.notificationChannels?.pagerDuty && priority === 'critical') {
      this.sendPagerDutyAlert(message);
    }

    // Fallback to console for development
    if (!this.options.notificationChannels) {
      console.warn('ALERT:', message);
    }
  }

  /**
   * Clean up resources and prepare for shutdown
   */
  private gracefulShutdown(signal: string): void {
    this.isShuttingDown = true;
    
    logger.info('Graceful shutdown initiated', {
      signal,
      uptime: process.uptime(),
      errorCounts: Object.fromEntries(this.errorCounts)
    });

    // Send final metrics if needed
    this.sendFinalMetrics();

    // Give time for final operations
    setTimeout(() => {
      logger.info('Graceful shutdown completed');
      process.exit(0);
    }, 2000);
  }

  /**
   * Start collecting and cleaning up old metrics
   */
  private startMetricsCollection(): void {
    if (!this.options.enableMetrics) {
      return;
    }

    // Clean up old metrics every 5 minutes
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 5 * 60 * 1000);
  }

  /**
   * Helper methods
   */
  private getMinuteKey(): string {
    return Math.floor(Date.now() / 60000).toString();
  }

  private cleanupOldMetrics(): void {
    const currentMinute = Math.floor(Date.now() / 60000);
    const cutoffMinute = currentMinute - 10; // Keep last 10 minutes

    for (const [key] of this.errorCounts) {
      const minute = parseInt(key.split(':')[0]);
      if (minute < cutoffMinute) {
        this.errorCounts.delete(key);
      }
    }

    // Clean up alert timestamps older than 1 hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [key, timestamp] of this.lastAlertTime) {
      if (timestamp < oneHourAgo) {
        this.lastAlertTime.delete(key);
      }
    }
  }

  private logError(error: LankaError): void {
    logger.error('Global Error Handler', {
      code: error.code,
      category: error.category,
      severity: error.severity,
      message: error.message,
      userMessage: error.userMessage,
      context: error.context,
      suggestions: error.suggestions,
      retryable: error.retryable,
      timestamp: error.timestamp
    });
  }

  private sendSlackAlert(message: string, priority: string): void {
    // Implementation would use Slack API
    logger.info('Sending Slack alert', { message, priority });
  }

  private sendEmailAlert(message: string, priority: string): void {
    // Implementation would use email service
    logger.info('Sending email alert', { message, priority });
  }

  private sendPagerDutyAlert(message: string): void {
    // Implementation would use PagerDuty API
    logger.info('Sending PagerDuty alert', { message });
  }

  private sendFinalMetrics(): void {
    const finalMetrics = {
      totalErrors: this.errorCounts.size,
      errorBreakdown: Object.fromEntries(this.errorCounts),
      shutdownTime: new Date().toISOString()
    };

    logger.info('Final error metrics', finalMetrics);
  }

  /**
   * Get current error statistics
   */
  getErrorStats(): {
    currentMinute: Record<string, number>;
    last10Minutes: Record<string, number>;
  } {
    const currentMinute = this.getMinuteKey();
    const currentMinuteStats: Record<string, number> = {};
    const last10MinutesStats: Record<string, number> = {};

    for (const [key, count] of this.errorCounts) {
      const [minute, category] = key.split(':');
      if (minute === currentMinute) {
        currentMinuteStats[category] = count;
      }
      last10MinutesStats[category] = (last10MinutesStats[category] || 0) + count;
    }

    return {
      currentMinute: currentMinuteStats,
      last10Minutes: last10MinutesStats
    };
  }
}

// Export singleton instance
export const globalErrorHandler = GlobalErrorHandler.getInstance();

// Express middleware for handling errors
export const errorMiddleware = (
  error: Error,
  req: any,
  res: any,
  next: any
): void => {
  const lankaError = ErrorWrapper.wrap(error, {
    operation: req.route?.path || req.path || 'unknown_route',
    userId: req.user?.id,
    sessionId: req.sessionID,
    requestId: req.headers['x-request-id'],
    metadata: {
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    }
  });

  globalErrorHandler.handleError(lankaError);

  // Send client response
  res.status(lankaError.httpStatusCode).json({
    success: false,
    error: {
      code: lankaError.code,
      message: lankaError.userMessage || lankaError.message,
      suggestions: lankaError.suggestions,
      ...(process.env.NODE_ENV === 'development' && {
        details: lankaError.message,
        stack: lankaError.stack
      })
    }
  });
};

// GraphQL error formatter
export const formatGraphQLError = (error: any): any => {
  const lankaError = error.originalError instanceof LankaError 
    ? error.originalError 
    : ErrorWrapper.wrap(error.originalError || error);

  globalErrorHandler.handleError(lankaError);

  return {
    message: lankaError.userMessage || lankaError.message,
    code: lankaError.code,
    category: lankaError.category,
    suggestions: lankaError.suggestions,
    path: error.path,
    ...(process.env.NODE_ENV === 'development' && {
      stack: lankaError.stack
    })
  };
};