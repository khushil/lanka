/**
 * Memory Monitoring HTTP Endpoints
 * Provides REST API for memory statistics and profiling
 */

import { Router, Request, Response } from 'express';
import { memoryMonitor, MemoryMonitor } from './memory-monitor';
import { subscriptionManager } from '../../core/memory/subscription-manager';
import { Neo4jService } from '../../core/database/neo4j';
import { streamProcessor } from '../../services/streaming/stream-processor';
import { logger } from '../../core/logging/logger';

export const memoryRouter = Router();

/**
 * Get current memory statistics
 */
memoryRouter.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = memoryMonitor.getCurrentStats();
    const subscriptionStats = subscriptionManager.getStats();
    const neo4jInstance = Neo4jService.getInstance();
    const poolStats = neo4jInstance.getPoolStats();
    const processorStats = streamProcessor.getStats();

    res.json({
      memory: stats,
      subscriptions: subscriptionStats,
      connectionPool: poolStats,
      streamProcessor: processorStats,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Failed to get memory stats:', error);
    res.status(500).json({ error: 'Failed to get memory statistics' });
  }
});

/**
 * Get memory usage history
 */
memoryRouter.get('/history', (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const history = memoryMonitor.getHistory(limit);
    
    res.json({
      history,
      count: history.length
    });
  } catch (error) {
    logger.error('Failed to get memory history:', error);
    res.status(500).json({ error: 'Failed to get memory history' });
  }
});

/**
 * Detect memory leaks
 */
memoryRouter.get('/leak-detection', (req: Request, res: Response) => {
  try {
    const leakAnalysis = memoryMonitor.detectMemoryLeaks();
    
    res.json({
      leakDetection: leakAnalysis,
      recommendations: memoryMonitor.getOptimizationSuggestions()
    });
  } catch (error) {
    logger.error('Failed to detect memory leaks:', error);
    res.status(500).json({ error: 'Failed to detect memory leaks' });
  }
});

/**
 * Force garbage collection
 */
memoryRouter.post('/gc', (req: Request, res: Response) => {
  try {
    const beforeStats = memoryMonitor.getCurrentStats();
    const success = memoryMonitor.forceGC();
    const afterStats = memoryMonitor.getCurrentStats();
    
    const freed = beforeStats.heap.used - afterStats.heap.used;
    
    res.json({
      success,
      before: beforeStats,
      after: afterStats,
      freedMemory: freed,
      freedMemoryFormatted: formatBytes(freed)
    });
  } catch (error) {
    logger.error('Failed to force GC:', error);
    res.status(500).json({ error: 'Failed to force garbage collection' });
  }
});

/**
 * Create heap snapshot
 */
memoryRouter.post('/snapshot', async (req: Request, res: Response) => {
  try {
    const snapshot = await memoryMonitor.createHeapSnapshot();
    
    if (snapshot) {
      res.json({
        success: true,
        snapshot: {
          id: snapshot.id,
          timestamp: snapshot.timestamp,
          size: snapshot.size,
          sizeFormatted: formatBytes(snapshot.size)
        }
      });
    } else {
      res.status(500).json({ error: 'Failed to create heap snapshot' });
    }
  } catch (error) {
    logger.error('Failed to create heap snapshot:', error);
    res.status(500).json({ error: 'Failed to create heap snapshot' });
  }
});

/**
 * Compare heap snapshots
 */
memoryRouter.get('/snapshot/compare', (req: Request, res: Response) => {
  try {
    const { snapshot1, snapshot2 } = req.query;
    
    if (!snapshot1 || !snapshot2) {
      return res.status(400).json({ error: 'Both snapshot1 and snapshot2 parameters are required' });
    }
    
    const comparison = memoryMonitor.compareSnapshots(
      snapshot1 as string,
      snapshot2 as string
    );
    
    res.json({
      comparison: {
        ...comparison,
        sizeDifferenceFormatted: formatBytes(Math.abs(comparison.sizeDifference)),
        growthRateFormatted: formatBytes(Math.abs(comparison.growthRate)) + '/s'
      }
    });
  } catch (error) {
    logger.error('Failed to compare snapshots:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get optimization suggestions
 */
memoryRouter.get('/optimize', (req: Request, res: Response) => {
  try {
    const suggestions = memoryMonitor.getOptimizationSuggestions();
    const currentStats = memoryMonitor.getCurrentStats();
    
    res.json({
      currentUsage: {
        heapUsed: formatBytes(currentStats.heap.used),
        heapTotal: formatBytes(currentStats.heap.total),
        percentage: currentStats.heap.percentage.toFixed(2) + '%',
        rss: formatBytes(currentStats.rss),
        external: formatBytes(currentStats.external)
      },
      suggestions,
      priority: currentStats.heap.percentage > 80 ? 'high' : 
               currentStats.heap.percentage > 60 ? 'medium' : 'low'
    });
  } catch (error) {
    logger.error('Failed to get optimization suggestions:', error);
    res.status(500).json({ error: 'Failed to get optimization suggestions' });
  }
});

/**
 * Start/Stop memory monitoring
 */
memoryRouter.post('/monitoring/:action', (req: Request, res: Response) => {
  try {
    const { action } = req.params;
    const interval = req.body.interval || 5000;
    
    switch (action) {
      case 'start':
        memoryMonitor.startMonitoring(interval);
        res.json({ success: true, message: 'Memory monitoring started', interval });
        break;
        
      case 'stop':
        memoryMonitor.stopMonitoring();
        res.json({ success: true, message: 'Memory monitoring stopped' });
        break;
        
      default:
        res.status(400).json({ error: 'Invalid action. Use start or stop' });
    }
  } catch (error) {
    logger.error('Failed to control memory monitoring:', error);
    res.status(500).json({ error: 'Failed to control memory monitoring' });
  }
});

/**
 * Get subscription manager statistics
 */
memoryRouter.get('/subscriptions', (req: Request, res: Response) => {
  try {
    const stats = subscriptionManager.getStats();
    
    res.json({
      subscriptions: stats,
      details: {
        totalSubscriptions: stats.total,
        subscriptionsByType: stats.byType,
        oldestSubscription: stats.oldestSubscription,
        memoryUsage: stats.memoryUsage
      }
    });
  } catch (error) {
    logger.error('Failed to get subscription stats:', error);
    res.status(500).json({ error: 'Failed to get subscription statistics' });
  }
});

/**
 * Clean up subscriptions
 */
memoryRouter.post('/subscriptions/cleanup', (req: Request, res: Response) => {
  try {
    const { eventName } = req.body;
    const cleaned = subscriptionManager.unsubscribeAll(eventName);
    
    res.json({
      success: true,
      cleanedSubscriptions: cleaned,
      eventName: eventName || 'all'
    });
  } catch (error) {
    logger.error('Failed to cleanup subscriptions:', error);
    res.status(500).json({ error: 'Failed to cleanup subscriptions' });
  }
});

/**
 * Get database connection pool statistics
 */
memoryRouter.get('/connection-pool', (req: Request, res: Response) => {
  try {
    const neo4jInstance = Neo4jService.getInstance();
    const poolStats = neo4jInstance.getPoolStats();
    
    res.json({
      connectionPool: poolStats,
      status: poolStats.activeSessions > poolStats.maxPoolSize * 0.8 ? 'warning' : 'healthy',
      utilization: ((poolStats.activeSessions / poolStats.maxPoolSize) * 100).toFixed(2) + '%'
    });
  } catch (error) {
    logger.error('Failed to get connection pool stats:', error);
    res.status(500).json({ error: 'Failed to get connection pool statistics' });
  }
});

/**
 * Get stream processor statistics
 */
memoryRouter.get('/stream-processor', (req: Request, res: Response) => {
  try {
    const stats = streamProcessor.getStats();
    
    res.json({
      streamProcessor: stats,
      performance: {
        successRate: stats.processed / (stats.processed + stats.failed) * 100,
        memoryUsageFormatted: formatBytes(stats.memoryUsage),
        backpressureActive: stats.backpressureActive
      }
    });
  } catch (error) {
    logger.error('Failed to get stream processor stats:', error);
    res.status(500).json({ error: 'Failed to get stream processor statistics' });
  }
});

/**
 * Get comprehensive memory report
 */
memoryRouter.get('/report', async (req: Request, res: Response) => {
  try {
    const memoryStats = memoryMonitor.getCurrentStats();
    const subscriptionStats = subscriptionManager.getStats();
    const neo4jInstance = Neo4jService.getInstance();
    const poolStats = neo4jInstance.getPoolStats();
    const processorStats = streamProcessor.getStats();
    const leakAnalysis = memoryMonitor.detectMemoryLeaks();
    const suggestions = memoryMonitor.getOptimizationSuggestions();
    
    // Create health score based on various factors
    let healthScore = 100;
    
    if (memoryStats.heap.percentage > 80) healthScore -= 30;
    else if (memoryStats.heap.percentage > 60) healthScore -= 15;
    
    if (leakAnalysis.hasLeak) healthScore -= 25;
    if (subscriptionStats.total > 1000) healthScore -= 10;
    if (poolStats.activeSessions > poolStats.maxPoolSize * 0.8) healthScore -= 10;
    
    const report = {
      timestamp: Date.now(),
      healthScore: Math.max(0, healthScore),
      status: healthScore > 80 ? 'healthy' : healthScore > 60 ? 'warning' : 'critical',
      memory: {
        current: memoryStats,
        formatted: {
          heapUsed: formatBytes(memoryStats.heap.used),
          heapTotal: formatBytes(memoryStats.heap.total),
          rss: formatBytes(memoryStats.rss),
          external: formatBytes(memoryStats.external)
        }
      },
      subscriptions: subscriptionStats,
      connectionPool: poolStats,
      streamProcessor: processorStats,
      leakDetection: leakAnalysis,
      optimizations: suggestions,
      recommendations: generateRecommendations(healthScore, memoryStats, leakAnalysis, suggestions)
    };
    
    res.json(report);
  } catch (error) {
    logger.error('Failed to generate memory report:', error);
    res.status(500).json({ error: 'Failed to generate memory report' });
  }
});

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(
  healthScore: number, 
  memoryStats: any, 
  leakAnalysis: any, 
  suggestions: string[]
): string[] {
  const recommendations: string[] = [];
  
  if (healthScore < 60) {
    recommendations.push('URGENT: Memory usage is critical - consider immediate action');
  }
  
  if (leakAnalysis.hasLeak) {
    recommendations.push('Memory leak detected - investigate subscription and connection cleanup');
  }
  
  if (memoryStats.heap.percentage > 70) {
    recommendations.push('High memory usage - monitor closely and consider optimization');
  }
  
  recommendations.push(...suggestions);
  
  return recommendations;
}