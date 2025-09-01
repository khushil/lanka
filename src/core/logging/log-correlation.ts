/**
 * Log Correlation Middleware
 * Provides request-level correlation IDs for distributed tracing
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';
import { TracingUtils } from '../monitoring/opentelemetry';

// Async local storage for correlation context
const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

export interface CorrelationContext {
  requestId: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: number;
}

/**
 * Correlation Context Manager
 */
export class CorrelationContextManager {
  /**
   * Get current correlation context
   */
  public static getContext(): CorrelationContext | undefined {
    return correlationStorage.getStore();
  }

  /**
   * Get request ID from current context
   */
  public static getRequestId(): string | undefined {
    const context = correlationStorage.getStore();
    return context?.requestId;
  }

  /**
   * Get trace ID from current context
   */
  public static getTraceId(): string | undefined {
    const context = correlationStorage.getStore();
    return context?.traceId || TracingUtils.getCurrentTraceId();
  }

  /**
   * Get span ID from current context
   */
  public static getSpanId(): string | undefined {
    const context = correlationStorage.getStore();
    return context?.spanId || TracingUtils.getCurrentSpanId();
  }

  /**
   * Get user ID from current context
   */
  public static getUserId(): string | undefined {
    const context = correlationStorage.getStore();
    return context?.userId;
  }

  /**
   * Update context with user information
   */
  public static updateUserContext(userId: string, sessionId?: string): void {
    const context = correlationStorage.getStore();
    if (context) {
      context.userId = userId;
      if (sessionId) {
        context.sessionId = sessionId;
      }
    }
  }

  /**
   * Run function with correlation context
   */
  public static runWithContext<T>(context: CorrelationContext, fn: () => T): T {
    return correlationStorage.run(context, fn);
  }

  /**
   * Create child context with additional properties
   */
  public static createChildContext(additionalProps: Partial<CorrelationContext>): CorrelationContext | undefined {
    const parentContext = correlationStorage.getStore();
    if (!parentContext) {
      return undefined;
    }

    return {
      ...parentContext,
      ...additionalProps
    };
  }
}

/**
 * Express middleware for request correlation
 */
export function correlationMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Generate or extract request ID
    const requestId = req.headers['x-request-id'] as string || 
                     req.headers['x-correlation-id'] as string || 
                     uuidv4();

    // Extract trace information
    const traceId = TracingUtils.getCurrentTraceId() || undefined;
    const spanId = TracingUtils.getCurrentSpanId() || undefined;

    // Create correlation context
    const context: CorrelationContext = {
      requestId,
      traceId,
      spanId,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'],
      timestamp: Date.now()
    };

    // Add request ID to response headers
    res.setHeader('X-Request-ID', requestId);
    if (traceId) {
      res.setHeader('X-Trace-ID', traceId);
    }

    // Store context and continue
    correlationStorage.run(context, () => {
      next();
    });
  };
}

/**
 * HTTP client correlation helper
 */
export class HttpCorrelation {
  /**
   * Get headers for outgoing HTTP requests
   */
  public static getHeaders(): Record<string, string> {
    const context = CorrelationContextManager.getContext();
    const headers: Record<string, string> = {};

    if (context?.requestId) {
      headers['X-Request-ID'] = context.requestId;
    }

    if (context?.traceId) {
      headers['X-Trace-ID'] = context.traceId;
    }

    return headers;
  }

  /**
   * Wrap HTTP client to automatically add correlation headers
   */
  public static wrapHttpClient<T extends { defaults?: any }>(client: T): T {
    if (client.defaults) {
      client.defaults.headers = {
        ...client.defaults.headers,
        ...HttpCorrelation.getHeaders()
      };
    }

    return client;
  }
}

/**
 * Database correlation helper
 */
export class DatabaseCorrelation {
  /**
   * Add correlation context to database query metadata
   */
  public static addQueryContext(queryMeta: Record<string, any> = {}): Record<string, any> {
    const context = CorrelationContextManager.getContext();
    
    return {
      ...queryMeta,
      requestId: context?.requestId,
      traceId: context?.traceId,
      userId: context?.userId,
      timestamp: Date.now()
    };
  }

  /**
   * Wrap database query execution with correlation
   */
  public static async executeWithCorrelation<T>(
    queryName: string,
    executor: () => Promise<T>,
    additionalMeta?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    const context = CorrelationContextManager.getContext();
    
    try {
      TracingUtils.addSpanAttributes({
        'db.operation': queryName,
        'correlation.requestId': context?.requestId || 'unknown',
        'correlation.userId': context?.userId || 'anonymous'
      });

      const result = await executor();
      
      const duration = Date.now() - startTime;
      TracingUtils.addSpanEvent('database.query.completed', {
        duration,
        success: true,
        ...additionalMeta
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      TracingUtils.recordException(error as Error);
      TracingUtils.addSpanEvent('database.query.failed', {
        duration,
        success: false,
        error: (error as Error).message,
        ...additionalMeta
      });
      
      throw error;
    }
  }
}

/**
 * Background job correlation
 */
export class JobCorrelation {
  /**
   * Create correlation context for background jobs
   */
  public static createJobContext(jobId: string, jobType: string, userId?: string): CorrelationContext {
    return {
      requestId: `job:${jobId}`,
      userId,
      timestamp: Date.now(),
      // Add job-specific metadata
      jobId,
      jobType
    } as CorrelationContext & { jobId: string; jobType: string };
  }

  /**
   * Execute job with correlation context
   */
  public static async executeJob<T>(
    jobId: string,
    jobType: string,
    executor: () => Promise<T>,
    userId?: string
  ): Promise<T> {
    const context = JobCorrelation.createJobContext(jobId, jobType, userId);
    
    return correlationStorage.run(context, async () => {
      TracingUtils.addSpanAttributes({
        'job.id': jobId,
        'job.type': jobType,
        'job.userId': userId || 'system'
      });
      
      return await executor();
    });
  }
}
