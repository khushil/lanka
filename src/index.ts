/**
 * Lanka Platform Main Entry Point
 * Enhanced with memory monitoring and leak prevention
 */

import express from 'express';
import { createServer } from 'http';
import { Neo4jService } from './core/database/neo4j';
import { memoryRouter } from './utils/monitoring/memory-endpoints';
import { memoryMonitor } from './utils/monitoring/memory-monitor';
import { subscriptionManager } from './core/memory/subscription-manager';
import { heapProfiler } from './utils/monitoring/heap-profiler';
import { logger } from './core/logging/logger';\nimport { \n  initializeMonitoring, \n  shutdownMonitoring, \n  metricsService, \n  correlationMiddleware,\n  structuredLogger\n} from './core/monitoring';

const app = express();
const server = createServer(app);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add correlation middleware
app.use(correlationMiddleware());

// Add metrics middleware
app.use(metricsService.httpMiddleware());

// Memory monitoring endpoints
app.use('/api/memory', memoryRouter);

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    const metrics = await metricsService.getMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    structuredLogger.error('Error generating metrics', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  const memoryStats = memoryMonitor.getCurrentStats();
  const subscriptionStats = subscriptionManager.getStats();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    memory: {
      heapUsed: Math.round(memoryStats.heap.used / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memoryStats.heap.total / 1024 / 1024) + 'MB',
      percentage: memoryStats.heap.percentage.toFixed(2) + '%'
    },
    subscriptions: subscriptionStats.total,
    uptime: process.uptime()
  });
});

// Error handling
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown handling
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(async (err) => {
    if (err) {
      logger.error('Error during server shutdown:', err);
    }
    
    try {
      // Shutdown components in order
      await shutdownMonitoring();
      await subscriptionManager.shutdown();
      await Neo4jService.getInstance().close();
      heapProfiler.shutdown();
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 30000);
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection:', { reason, promise });
  gracefulShutdown('unhandledRejection');
});

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, async () => {
  logger.info(`Lanka platform started on port ${PORT}`);
  
  try {
    // Initialize monitoring services
    await initializeMonitoring();
    
    // Initialize database schema
    await Neo4jService.getInstance().initializeSchema();
    logger.info('Database schema initialized');
    
    structuredLogger.info('Lanka platform fully initialized', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      monitoring: 'enabled'
    });
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
});

export { app, server };