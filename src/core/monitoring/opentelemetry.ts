/**
 * OpenTelemetry Configuration
 * Provides distributed tracing and observability
 */

import { NodeSDK } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { logger } from '../logging/logger';

/**
 * OpenTelemetry Service Configuration
 */
export class OpenTelemetryService {
  private sdk: NodeSDK | null = null;
  private isInitialized = false;

  /**
   * Initialize OpenTelemetry SDK
   */
  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    try {
      // Create resource
      const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'lanka-platform',
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
        [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'lanka',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
        [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.HOSTNAME || 'unknown'
      });

      // Configure Jaeger exporter for tracing
      const jaegerExporter = new JaegerExporter({
        endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:16686/api/traces',
      });

      // Configure Prometheus exporter for metrics
      const prometheusExporter = new PrometheusExporter({
        port: parseInt(process.env.PROMETHEUS_METRICS_PORT || '9090'),
        endpoint: '/metrics',
      }, () => {
        logger.info('Prometheus metrics server started on port 9090');
      });

      // Create SDK
      this.sdk = new NodeSDK({
        resource,
        traceExporter: jaegerExporter,
        metricReader: new PeriodicExportingMetricReader({
          exporter: prometheusExporter,
          exportIntervalMillis: 5000,
        }),
        instrumentations: [getNodeAutoInstrumentations({
          // Disable file system instrumentation to reduce noise
          '@opentelemetry/instrumentation-fs': {
            enabled: false
          },
          // Configure HTTP instrumentation
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            ignoreIncomingRequestHook: (req) => {
              // Ignore health check and metrics endpoints
              const url = req.url || '';
              return url.includes('/health') || url.includes('/metrics');
            },
            ignoreOutgoingRequestHook: (options) => {
              // Ignore requests to monitoring services
              const hostname = options.hostname || '';
              return hostname.includes('prometheus') || hostname.includes('jaeger');
            }
          },
          // Configure Express instrumentation
          '@opentelemetry/instrumentation-express': {
            enabled: true
          },
          // Configure Neo4j instrumentation if available
          '@opentelemetry/instrumentation-neo4j': {
            enabled: true
          },
          // Configure Redis instrumentation
          '@opentelemetry/instrumentation-ioredis': {
            enabled: true
          }
        })]
      });

      // Initialize SDK
      this.sdk.start();
      this.isInitialized = true;
      
      logger.info('OpenTelemetry SDK initialized successfully', {
        serviceName: 'lanka-platform',
        jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:16686/api/traces',
        prometheusPort: process.env.PROMETHEUS_METRICS_PORT || '9090'
      });

    } catch (error) {
      logger.error('Failed to initialize OpenTelemetry SDK:', error);
      throw error;
    }
  }

  /**
   * Shutdown OpenTelemetry SDK
   */
  public async shutdown(): Promise<void> {
    if (this.sdk && this.isInitialized) {
      try {
        await this.sdk.shutdown();
        this.isInitialized = false;
        logger.info('OpenTelemetry SDK shutdown successfully');
      } catch (error) {
        logger.error('Error shutting down OpenTelemetry SDK:', error);
        throw error;
      }
    }
  }

  /**
   * Check if OpenTelemetry is initialized
   */
  public isReady(): boolean {
    return this.isInitialized;
  }
}

// Singleton instance
export const openTelemetryService = new OpenTelemetryService();

/**
 * Tracing utilities
 */
export class TracingUtils {
  /**
   * Add custom attributes to current span
   */
  public static addSpanAttributes(attributes: Record<string, string | number | boolean>): void {
    try {
      const { trace } = require('@opentelemetry/api');
      const span = trace.getActiveSpan();
      
      if (span) {
        Object.entries(attributes).forEach(([key, value]) => {
          span.setAttributes({ [key]: value });
        });
      }
    } catch (error) {
      logger.debug('Failed to add span attributes:', error);
    }
  }

  /**
   * Add span event
   */
  public static addSpanEvent(name: string, attributes?: Record<string, any>): void {
    try {
      const { trace } = require('@opentelemetry/api');
      const span = trace.getActiveSpan();
      
      if (span) {
        span.addEvent(name, attributes);
      }
    } catch (error) {
      logger.debug('Failed to add span event:', error);
    }
  }

  /**
   * Record exception in span
   */
  public static recordException(error: Error): void {
    try {
      const { trace } = require('@opentelemetry/api');
      const span = trace.getActiveSpan();
      
      if (span) {
        span.recordException(error);
        span.setStatus({ code: 2, message: error.message }); // ERROR status
      }
    } catch (recordError) {
      logger.debug('Failed to record exception:', recordError);
    }
  }

  /**
   * Get current trace ID
   */
  public static getCurrentTraceId(): string | null {
    try {
      const { trace } = require('@opentelemetry/api');
      const span = trace.getActiveSpan();
      
      if (span) {
        return span.spanContext().traceId;
      }
    } catch (error) {
      logger.debug('Failed to get trace ID:', error);
    }
    
    return null;
  }

  /**
   * Get current span ID
   */
  public static getCurrentSpanId(): string | null {
    try {
      const { trace } = require('@opentelemetry/api');
      const span = trace.getActiveSpan();
      
      if (span) {
        return span.spanContext().spanId;
      }
    } catch (error) {
      logger.debug('Failed to get span ID:', error);
    }
    
    return null;
  }
}
