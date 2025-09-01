/**
 * Structured Logging Service with ELK Stack Integration
 * Provides centralized, searchable logging with trace correlation
 */

import winston from 'winston';
import ElasticsearchWinston from 'winston-elasticsearch';
import { TracingUtils } from '../monitoring/opentelemetry';
import path from 'path';

// Log levels
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Log colors for console output
const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

winston.addColors(LOG_COLORS);

/**
 * Custom log format with trace correlation
 */
const createLogFormat = () => {
  return winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.printf(({ timestamp, level, message, service, traceId, spanId, userId, requestId, ...metadata }) => {
      // Build structured log object
      const logObject: any = {
        '@timestamp': timestamp,
        level: level.toUpperCase(),
        message,
        service: service || 'lanka-platform',
        environment: process.env.NODE_ENV || 'development',
        hostname: process.env.HOSTNAME || require('os').hostname(),
        pid: process.pid
      };

      // Add tracing information if available
      if (traceId || TracingUtils.getCurrentTraceId()) {
        logObject.traceId = traceId || TracingUtils.getCurrentTraceId();
      }
      
      if (spanId || TracingUtils.getCurrentSpanId()) {
        logObject.spanId = spanId || TracingUtils.getCurrentSpanId();
      }

      // Add user context
      if (userId) {
        logObject.userId = userId;
      }

      // Add request context
      if (requestId) {
        logObject.requestId = requestId;
      }

      // Add metadata
      if (Object.keys(metadata).length > 0) {
        logObject.metadata = metadata;
      }

      return JSON.stringify(logObject);
    })
  );
};

/**
 * Console format for development
 */
const createConsoleFormat = () => {
  return winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, traceId, spanId, ...metadata }) => {
      let log = `${timestamp} [${level}]: ${message}`;
      
      if (traceId) {
        log += ` [trace:${traceId.substring(0, 8)}]`;
      }
      
      if (spanId) {
        log += ` [span:${spanId.substring(0, 8)}]`;
      }
      
      if (Object.keys(metadata).length > 0) {
        log += ` ${JSON.stringify(metadata, null, 2)}`;
      }
      
      return log;
    })
  );
};

/**
 * Create Elasticsearch transport
 */
const createElasticsearchTransport = () => {
  const esHost = process.env.ELASTICSEARCH_HOST || 'localhost';
  const esPort = process.env.ELASTICSEARCH_PORT || '9200';
  const esIndex = process.env.ELASTICSEARCH_LOG_INDEX || 'lanka-logs';
  
  return new ElasticsearchWinston({
    clientOpts: {
      node: `http://${esHost}:${esPort}`,
      auth: process.env.ELASTICSEARCH_AUTH ? {
        username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
        password: process.env.ELASTICSEARCH_PASSWORD || ''
      } : undefined,
      maxRetries: 5,
      requestTimeout: 30000,
    },
    index: esIndex,
    indexPrefix: 'lanka-logs',
    indexSuffixPattern: 'YYYY.MM.DD',
    mappingTemplate: {
      settings: {
        'number_of_shards': 1,
        'number_of_replicas': 0,
        'index.refresh_interval': '5s'
      },
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          level: { type: 'keyword' },
          message: { type: 'text', analyzer: 'standard' },
          service: { type: 'keyword' },
          environment: { type: 'keyword' },
          hostname: { type: 'keyword' },
          traceId: { type: 'keyword' },
          spanId: { type: 'keyword' },
          userId: { type: 'keyword' },
          requestId: { type: 'keyword' },
          metadata: { type: 'object', enabled: true }
        }
      }
    },
    transformer: (logData: any) => {
      // Transform log data before sending to Elasticsearch
      const transformed = { ...logData };
      
      // Add automatic trace correlation
      if (!transformed.traceId) {
        transformed.traceId = TracingUtils.getCurrentTraceId();
      }
      
      if (!transformed.spanId) {
        transformed.spanId = TracingUtils.getCurrentSpanId();
      }
      
      return transformed;
    },
    handleExceptions: false,
    exitOnError: false
  });
};

/**
 * Structured Logger Class
 */
export class StructuredLogger {
  private logger: winston.Logger;
  private defaultMeta: Record<string, any>;

  constructor(service?: string, defaultMeta?: Record<string, any>) {
    this.defaultMeta = {
      service: service || 'lanka-platform',
      ...defaultMeta
    };

    // Create transports
    const transports: winston.transport[] = [];

    // Console transport (always enabled)
    transports.push(
      new winston.transports.Console({
        format: createConsoleFormat(),
        level: process.env.LOG_LEVEL || 'info'
      })
    );

    // File transports
    transports.push(
      new winston.transports.File({
        filename: path.join('logs', 'error.log'),
        level: 'error',
        format: createLogFormat(),
        maxsize: 10485760, // 10MB
        maxFiles: 5
      }),
      new winston.transports.File({
        filename: path.join('logs', 'combined.log'),
        format: createLogFormat(),
        maxsize: 10485760, // 10MB
        maxFiles: 10
      })
    );

    // Elasticsearch transport (production)
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_ELASTICSEARCH_LOGGING === 'true') {
      try {
        transports.push(createElasticsearchTransport());
        console.log('Elasticsearch logging enabled');
      } catch (error) {
        console.warn('Failed to initialize Elasticsearch transport:', error);
      }
    }

    // Create logger
    this.logger = winston.createLogger({
      levels: LOG_LEVELS,
      level: process.env.LOG_LEVEL || 'info',
      format: createLogFormat(),
      defaultMeta: this.defaultMeta,
      transports,
      exitOnError: false
    });
  }

  /**
   * Create child logger with additional context
   */
  public child(meta: Record<string, any>): StructuredLogger {
    return new StructuredLogger(this.defaultMeta.service, {
      ...this.defaultMeta,
      ...meta
    });
  }

  /**
   * Log with correlation context
   */
  public log(level: string, message: string, meta?: Record<string, any>, correlationContext?: {
    traceId?: string;
    spanId?: string;
    userId?: string;
    requestId?: string;
  }): void {
    const logMeta = {
      ...meta,
      ...correlationContext
    };

    this.logger.log(level, message, logMeta);
  }

  /**
   * Error logging with automatic exception tracking
   */
  public error(message: string, error?: Error | any, meta?: Record<string, any>): void {
    const errorMeta: Record<string, any> = { ...meta };
    
    if (error) {
      if (error instanceof Error) {
        errorMeta.error = {
          name: error.name,
          message: error.message,
          stack: error.stack
        };
        
        // Record in OpenTelemetry span
        TracingUtils.recordException(error);
      } else {
        errorMeta.error = error;
      }
    }

    this.logger.error(message, errorMeta);
  }

  /**
   * Warning logging
   */
  public warn(message: string, meta?: Record<string, any>): void {
    this.logger.warn(message, meta);
  }

  /**
   * Info logging
   */
  public info(message: string, meta?: Record<string, any>): void {
    this.logger.info(message, meta);
  }

  /**
   * HTTP request logging
   */
  public http(message: string, meta?: Record<string, any>): void {
    this.logger.http(message, meta);
  }

  /**
   * Debug logging
   */
  public debug(message: string, meta?: Record<string, any>): void {
    this.logger.debug(message, meta);
  }

  /**
   * Log business events with structured data
   */
  public businessEvent(eventType: string, data: Record<string, any>, meta?: Record<string, any>): void {
    this.info(`Business Event: ${eventType}`, {
      eventType,
      eventData: data,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  /**
   * Log performance metrics
   */
  public performance(operation: string, duration: number, meta?: Record<string, any>): void {
    this.info(`Performance: ${operation}`, {
      operation,
      duration,
      durationUnit: 'ms',
      ...meta
    });
  }

  /**
   * Log security events
   */
  public security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', meta?: Record<string, any>): void {
    const logLevel = severity === 'critical' ? 'error' : severity === 'high' ? 'warn' : 'info';
    
    this.log(logLevel, `Security Event: ${event}`, {
      securityEvent: true,
      eventType: event,
      severity,
      ...meta
    });
  }

  /**
   * Log audit trail
   */
  public audit(action: string, resource: string, userId: string, result: 'success' | 'failure', meta?: Record<string, any>): void {
    this.info(`Audit: ${action}`, {
      audit: true,
      action,
      resource,
      userId,
      result,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  /**
   * Flush all transports
   */
  public async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.on('finish', resolve);
      this.logger.end();
    });
  }
}

// Default structured logger instance
export const structuredLogger = new StructuredLogger();

// Export for backward compatibility
export { structuredLogger as logger };
