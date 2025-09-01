/**
 * Monitoring Module Entry Point
 * Exports all monitoring and observability services
 */

// Initialize OpenTelemetry first (before other imports)
import { openTelemetryService } from './opentelemetry';

// Check if we should initialize OpenTelemetry
if (process.env.ENABLE_TRACING !== 'false') {
  openTelemetryService.initialize();
}

// Export all monitoring services
export { metricsService, MetricsService, metrics } from './prometheus-metrics';
export { structuredLogger, StructuredLogger } from '../logging/structured-logger';
export { 
  correlationMiddleware, 
  CorrelationContextManager,
  HttpCorrelation,
  DatabaseCorrelation,
  JobCorrelation 
} from '../logging/log-correlation';
export { 
  tracingService, 
  TracingService, 
  TracingUtils, 
  Traced, 
  TracedPerformance 
} from './tracing';
export { 
  openTelemetryService, 
  OpenTelemetryService 
} from './opentelemetry';
export { 
  slaTracker, 
  SLATracker 
} from './sla-tracker';
export { 
  memoryMonitor,
  MemoryMonitor,
  MemoryStats,
  MemoryAlert 
} from '../../utils/monitoring/memory-monitor';

// Export types
export type {
  SLADefinition,
  SLAStatus,
  SLAViolation,
  BusinessMetric
} from './sla-tracker';

export type {
  CorrelationContext
} from '../logging/log-correlation';

/**
 * Initialize all monitoring services
 */
export async function initializeMonitoring(): Promise<void> {
  try {
    // OpenTelemetry is already initialized above
    
    // Start memory monitoring
    memoryMonitor.startMonitoring(5000);
    
    // Initialize SLA tracking
    // SLA tracker initializes automatically as singleton
    
    console.log('✅ Monitoring services initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize monitoring services:', error);
    throw error;
  }
}

/**
 * Shutdown all monitoring services
 */
export async function shutdownMonitoring(): Promise<void> {
  try {
    await openTelemetryService.shutdown();
    memoryMonitor.shutdown();
    slaTracker.shutdown();
    metricsService.shutdown();
    
    console.log('✅ Monitoring services shutdown completed');
  } catch (error) {
    console.error('❌ Error during monitoring shutdown:', error);
    throw error;
  }
}

/**
 * Health check for monitoring services
 */
export function getMonitoringHealth(): {
  openTelemetry: boolean;
  prometheus: boolean;
  slaTracker: boolean;
  memoryMonitor: boolean;
} {
  return {
    openTelemetry: openTelemetryService.isReady(),
    prometheus: true, // Prometheus is always ready if metrics service exists
    slaTracker: true, // SLA tracker is always ready if instance exists
    memoryMonitor: memoryMonitor.getCurrentStats() !== null
  };
}
