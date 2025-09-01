"use strict";
/**
 * Lanka Platform Main Entry Point
 * Enhanced with memory monitoring and leak prevention
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const neo4j_1 = require("./core/database/neo4j");
const memory_endpoints_1 = require("./utils/monitoring/memory-endpoints");
const memory_monitor_1 = require("./utils/monitoring/memory-monitor");
const subscription_manager_1 = require("./core/memory/subscription-manager");
const heap_profiler_1 = require("./utils/monitoring/heap-profiler");
const logger_1 = require("./core/logging/logger");
nimport;
{
    n;
    initializeMonitoring, ;
    n;
    shutdownMonitoring, ;
    n;
    metricsService, ;
    n;
    correlationMiddleware, ;
    n;
    structuredLogger;
    n;
}
from;
'./core/monitoring';
const app = (0, express_1.default)();
exports.app = app;
const server = (0, http_1.createServer)(app);
exports.server = server;
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Add correlation middleware
app.use(correlationMiddleware());
// Add metrics middleware
app.use(metricsService.httpMiddleware());
// Memory monitoring endpoints
app.use('/api/memory', memory_endpoints_1.memoryRouter);
// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
    try {
        const metrics = await metricsService.getMetrics();
        res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
        res.send(metrics);
    }
    catch (error) {
        structuredLogger.error('Error generating metrics', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Health check endpoint
app.get('/health', (req, res) => {
    const memoryStats = memory_monitor_1.memoryMonitor.getCurrentStats();
    const subscriptionStats = subscription_manager_1.subscriptionManager.getStats();
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
app.use((error, req, res, next) => {
    logger_1.logger.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});
// Graceful shutdown handling
async function gracefulShutdown(signal) {
    logger_1.logger.info(`Received ${signal}, starting graceful shutdown...`);
    // Stop accepting new connections
    server.close(async (err) => {
        if (err) {
            logger_1.logger.error('Error during server shutdown:', err);
        }
        try {
            // Shutdown components in order
            await shutdownMonitoring();
            await subscription_manager_1.subscriptionManager.shutdown();
            await neo4j_1.Neo4jService.getInstance().close();
            heap_profiler_1.heapProfiler.shutdown();
            logger_1.logger.info('Graceful shutdown completed');
            process.exit(0);
        }
        catch (error) {
            logger_1.logger.error('Error during graceful shutdown:', error);
            process.exit(1);
        }
    });
    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
        logger_1.logger.error('Graceful shutdown timed out, forcing exit');
        process.exit(1);
    }, 30000);
}
// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught exception:', error);
    gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('Unhandled promise rejection:', { reason, promise });
    gracefulShutdown('unhandledRejection');
});
// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, async () => {
    logger_1.logger.info(`Lanka platform started on port ${PORT}`);
    try {
        // Initialize monitoring services
        await initializeMonitoring();
        // Initialize database schema
        await neo4j_1.Neo4jService.getInstance().initializeSchema();
        logger_1.logger.info('Database schema initialized');
        structuredLogger.info('Lanka platform fully initialized', {
            port: PORT,
            environment: process.env.NODE_ENV || 'development',
            monitoring: 'enabled'
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize services:', error);
        process.exit(1);
    }
});
//# sourceMappingURL=index.js.map