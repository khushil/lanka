/**
 * Distributed Tracing Integration
 * Provides comprehensive request flow tracking and performance monitoring
 */

import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { logger } from '../logging/logger';

/**
 * Tracing Service for manual instrumentation
 */
export class TracingService {
  private tracer = trace.getTracer('lanka-platform', '1.0.0');

  /**
   * Create a new span
   */
  public createSpan(name: string, options?: {
    kind?: SpanKind;
    attributes?: Record<string, string | number | boolean>;
    parent?: any;
  }) {
    const span = this.tracer.startSpan(name, {
      kind: options?.kind || SpanKind.INTERNAL,
      attributes: options?.attributes
    }, options?.parent);

    return span;
  }

  /**
   * Execute function with span
   */
  public async withSpan<T>(
    name: string,
    fn: (span: any) => Promise<T>,
    options?: {
      kind?: SpanKind;
      attributes?: Record<string, string | number | boolean>;
    }
  ): Promise<T> {
    const span = this.createSpan(name, options);
    
    try {
      const result = await context.with(trace.setSpan(context.active(), span), () => fn(span));
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Trace database operations
   */
  public async traceDatabaseOperation<T>(
    operation: string,
    dbType: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    return this.withSpan(
      `db.${operation}`,
      async (span) => {
        span.setAttributes({
          'db.system': dbType,
          'db.operation.name': operation,
          'component': 'database'
        });

        if (metadata) {
          Object.entries(metadata).forEach(([key, value]) => {
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
              span.setAttributes({ [`db.${key}`]: value });
            }
          });
        }

        const startTime = Date.now();
        const result = await fn();
        const duration = Date.now() - startTime;
        
        span.setAttributes({
          'db.operation.duration_ms': duration
        });

        span.addEvent('database.operation.completed', {
          duration_ms: duration,
          success: true
        });

        return result;
      },
      { kind: SpanKind.CLIENT }
    );
  }

  /**
   * Trace HTTP requests
   */
  public async traceHttpRequest<T>(
    method: string,
    url: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    return this.withSpan(
      `HTTP ${method}`,
      async (span) => {
        span.setAttributes({
          'http.method': method,
          'http.url': url,
          'component': 'http'
        });

        if (metadata) {
          Object.entries(metadata).forEach(([key, value]) => {
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
              span.setAttributes({ [`http.${key}`]: value });
            }
          });
        }

        const result = await fn();
        return result;
      },
      { kind: SpanKind.CLIENT }
    );
  }

  /**
   * Trace business operations
   */
  public async traceBusinessOperation<T>(
    operationType: string,
    operationName: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    return this.withSpan(
      `business.${operationType}.${operationName}`,
      async (span) => {
        span.setAttributes({
          'business.operation.type': operationType,
          'business.operation.name': operationName,
          'component': 'business-logic'
        });

        if (metadata) {
          Object.entries(metadata).forEach(([key, value]) => {
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
              span.setAttributes({ [`business.${key}`]: value });
            }
          });
        }

        const result = await fn();
        
        span.addEvent('business.operation.completed', {
          operationType,
          operationName,
          success: true
        });

        return result;
      },
      { kind: SpanKind.INTERNAL }
    );
  }

  /**
   * Add span attributes safely
   */
  public addAttributes(attributes: Record<string, string | number | boolean>): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes(attributes);
    }
  }

  /**
   * Add span event
   */
  public addEvent(name: string, attributes?: Record<string, any>): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  }

  /**
   * Record exception in current span
   */
  public recordException(error: Error): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    }
  }

  /**
   * Get current trace context
   */
  public getCurrentContext() {
    const span = trace.getActiveSpan();
    if (span) {
      const spanContext = span.spanContext();
      return {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
        traceFlags: spanContext.traceFlags
      };
    }
    return null;
  }
}

// Singleton instance
export const tracingService = new TracingService();

/**
 * Decorator for automatic span creation
 */
export function Traced(operationName?: string, options?: {
  kind?: SpanKind;
  attributes?: Record<string, string | number | boolean>;
}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const spanName = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return tracingService.withSpan(
        spanName,
        async (span) => {
          // Add method metadata
          span.setAttributes({
            'method.class': target.constructor.name,
            'method.name': propertyKey
          });

          if (options?.attributes) {
            span.setAttributes(options.attributes);
          }

          return originalMethod.apply(this, args);
        },
        options
      );
    };

    return descriptor;
  };
}

/**
 * Performance monitoring decorator
 */
export function TracedPerformance(threshold?: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const performanceThreshold = threshold || 1000; // 1 second default

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const spanName = `perf.${target.constructor.name}.${propertyKey}`;
      
      return tracingService.withSpan(
        spanName,
        async (span) => {
          const result = await originalMethod.apply(this, args);
          const duration = Date.now() - startTime;
          
          span.setAttributes({
            'performance.duration_ms': duration,
            'performance.threshold_ms': performanceThreshold,
            'performance.exceeded_threshold': duration > performanceThreshold
          });

          if (duration > performanceThreshold) {
            span.addEvent('performance.threshold.exceeded', {
              duration_ms: duration,
              threshold_ms: performanceThreshold
            });
            
            logger.warn(`Performance threshold exceeded in ${spanName}`, {
              duration,
              threshold: performanceThreshold,
              method: `${target.constructor.name}.${propertyKey}`
            });
          }

          return result;
        },
        { kind: SpanKind.INTERNAL }
      );
    };

    return descriptor;
  };
}
