/**
 * Cache Warming Service
 * Intelligent cache population and background refresh strategies
 */

import { CacheManager, CacheTier } from './cache.manager';
import { CachedNeo4jService } from './cached-neo4j.service';
import { CachedSimilarityService } from '../../modules/requirements/services/cached-similarity.service';
import { logger } from '../logging/logger';
import * as cron from 'node-cron';

export interface WarmingStrategy {
  name: string;
  priority: number;
  frequency: string; // Cron expression
  enabled: boolean;
  queries: Array<{
    query: string;
    params?: Record<string, any>;
    tier: CacheTier;
    description: string;
  }>;
}

export interface WarmingMetrics {
  strategy: string;
  queriesWarmed: number;
  successCount: number;
  failureCount: number;
  totalTime: number;
  averageQueryTime: number;
  lastRun: Date;
}

export class CacheWarmingService {
  private cache: CacheManager;
  private neo4j: CachedNeo4jService;
  private similarity: CachedSimilarityService;
  private strategies: Map<string, WarmingStrategy> = new Map();
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();
  private metrics: Map<string, WarmingMetrics> = new Map();
  private isRunning = false;

  constructor() {
    this.cache = new CacheManager();
    this.neo4j = new CachedNeo4jService();
    this.similarity = new CachedSimilarityService();
    
    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    // Startup warming strategy - runs once when service starts
    this.strategies.set('startup', {
      name: 'Startup Warming',
      priority: 1,
      frequency: 'startup', // Special case for startup only
      enabled: true,
      queries: [
        {
          query: 'MATCH (r:Requirement) WHERE r.status IN ["active", "in_progress"] RETURN r ORDER BY r.priority DESC LIMIT 50',
          tier: CacheTier.HOT,
          description: 'Active requirements'
        },
        {
          query: 'MATCH (p:Project) WHERE p.status = "active" RETURN p ORDER BY p.createdAt DESC LIMIT 20',
          tier: CacheTier.WARM,
          description: 'Active projects'
        },
        {
          query: 'MATCH (ad:ArchitectureDecision) WHERE ad.status = "accepted" RETURN ad ORDER BY ad.createdAt DESC LIMIT 30',
          tier: CacheTier.WARM,
          description: 'Accepted architecture decisions'
        },
        {
          query: 'MATCH (ts:TechnologyStack) RETURN ts ORDER BY ts.popularity DESC LIMIT 15',
          tier: CacheTier.COLD,
          description: 'Popular technology stacks'
        }
      ]
    });

    // Frequent warming strategy - runs every 5 minutes
    this.strategies.set('frequent', {
      name: 'Frequent Data Warming',
      priority: 2,
      frequency: '*/5 * * * *', // Every 5 minutes
      enabled: true,
      queries: [
        {
          query: 'MATCH (r:Requirement) WHERE r.updatedAt > datetime() - duration("PT1H") RETURN r',
          tier: CacheTier.HOT,
          description: 'Recently updated requirements'
        },
        {
          query: `
            MATCH (r:Requirement)-[:BELONGS_TO]->(p:Project)
            WHERE p.status = "active"
            WITH p, count(r) AS reqCount
            WHERE reqCount > 0
            RETURN p.id AS projectId, p.name AS projectName, reqCount
            ORDER BY reqCount DESC LIMIT 10
          `,
          tier: CacheTier.HOT,
          description: 'Projects with most active requirements'
        }
      ]
    });

    // Hourly warming strategy - runs every hour
    this.strategies.set('hourly', {
      name: 'Hourly Data Refresh',
      priority: 3,
      frequency: '0 * * * *', // Every hour
      enabled: true,
      queries: [
        {
          query: `
            MATCH (r:Requirement)<-[:CONTAINS]-(p:Project)
            WITH p, count(r) AS totalReqs,
                 count(CASE WHEN r.status = 'completed' THEN 1 END) AS completedReqs
            RETURN p.id, p.name, totalReqs, completedReqs,
                   CASE WHEN totalReqs > 0 THEN toFloat(completedReqs) / totalReqs ELSE 0 END AS completion
            ORDER BY completion DESC, totalReqs DESC
            LIMIT 20
          `,
          tier: CacheTier.WARM,
          description: 'Project completion statistics'
        },
        {
          query: `
            MATCH (ad:ArchitectureDecision)-[:INFLUENCES]->(r:Requirement)
            WITH ad, count(r) AS influenceCount
            WHERE influenceCount > 1
            RETURN ad ORDER BY influenceCount DESC LIMIT 20
          `,
          tier: CacheTier.WARM,
          description: 'High-impact architecture decisions'
        }
      ]
    });

    // Daily warming strategy - runs once a day
    this.strategies.set('daily', {
      name: 'Daily Analytics Warming',
      priority: 4,
      frequency: '0 2 * * *', // Daily at 2 AM
      enabled: true,
      queries: [
        {
          query: `
            MATCH (r:Requirement)
            WHERE r.createdAt >= datetime() - duration("P7D")
            WITH r.type AS requirementType, count(r) AS weeklyCount
            RETURN requirementType, weeklyCount
            ORDER BY weeklyCount DESC
          `,
          tier: CacheTier.COLD,
          description: 'Weekly requirement type trends'
        },
        {
          query: `
            MATCH (s:Stakeholder)-[:OWNS]->(r:Requirement)
            WITH s, count(r) AS ownedCount, avg(r.qualityScore) AS avgQuality
            WHERE ownedCount >= 3
            RETURN s.id, s.name, ownedCount, avgQuality
            ORDER BY avgQuality DESC, ownedCount DESC
            LIMIT 50
          `,
          tier: CacheTier.COLD,
          description: 'Stakeholder expertise rankings'
        }
      ]
    });

    // Similarity warming strategy - special strategy for similarity calculations
    this.strategies.set('similarity', {
      name: 'Similarity Calculations Warming',
      priority: 5,
      frequency: '0 */4 * * *', // Every 4 hours
      enabled: true,
      queries: [] // Will be populated dynamically
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Cache warming service is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting cache warming service');

    try {
      // Run startup warming immediately
      await this.executeStrategy('startup');

      // Schedule recurring warming strategies
      for (const [name, strategy] of this.strategies) {
        if (strategy.enabled && strategy.frequency !== 'startup') {
          const job = cron.schedule(strategy.frequency, async () => {
            await this.executeStrategy(name);
          }, {
            scheduled: false
          });

          this.scheduledJobs.set(name, job);
          job.start();
          
          logger.info(`Scheduled cache warming strategy: ${strategy.name}`, {
            frequency: strategy.frequency,
            priority: strategy.priority
          });
        }
      }

      logger.info('Cache warming service started successfully');

    } catch (error) {
      logger.error('Failed to start cache warming service', error);
      this.isRunning = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping cache warming service');

    // Stop all scheduled jobs
    for (const [name, job] of this.scheduledJobs) {
      job.stop();
      job.destroy();
      logger.debug(`Stopped cache warming job: ${name}`);
    }

    this.scheduledJobs.clear();
    this.isRunning = false;

    logger.info('Cache warming service stopped');
  }

  private async executeStrategy(strategyName: string): Promise<WarmingMetrics> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy || !strategy.enabled) {
      throw new Error(`Strategy not found or disabled: ${strategyName}`);
    }

    const startTime = Date.now();
    let successCount = 0;
    let failureCount = 0;
    const queryTimes: number[] = [];

    logger.info(`Executing cache warming strategy: ${strategy.name}`, {
      queryCount: strategy.queries.length
    });

    try {
      if (strategyName === 'similarity') {
        // Special handling for similarity warming
        const similarityMetrics = await this.executeSimilarityWarming();
        successCount = similarityMetrics.successCount;
        failureCount = similarityMetrics.failureCount;
      } else {
        // Execute regular Neo4j queries
        for (const queryConfig of strategy.queries) {
          const queryStart = Date.now();
          
          try {
            await this.neo4j.executeQuery(
              queryConfig.query,
              queryConfig.params || {},
              undefined,
              {
                tier: queryConfig.tier,
                skipCache: false // Ensure we populate cache
              }
            );
            
            const queryTime = Date.now() - queryStart;
            queryTimes.push(queryTime);
            successCount++;

            logger.debug(`Cache warming query completed: ${queryConfig.description}`, {
              executionTime: queryTime
            });

          } catch (error) {
            failureCount++;
            logger.error(`Cache warming query failed: ${queryConfig.description}`, error);
          }
        }
      }

      const totalTime = Date.now() - startTime;
      const averageQueryTime = queryTimes.length > 0 ? 
        queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length : 0;

      const metrics: WarmingMetrics = {
        strategy: strategyName,
        queriesWarmed: strategy.queries.length,
        successCount,
        failureCount,
        totalTime,
        averageQueryTime,
        lastRun: new Date()
      };

      this.metrics.set(strategyName, metrics);

      logger.info(`Cache warming strategy completed: ${strategy.name}`, metrics);

      return metrics;

    } catch (error) {
      logger.error(`Cache warming strategy failed: ${strategy.name}`, error);
      throw error;
    }
  }

  private async executeSimilarityWarming(): Promise<{ successCount: number; failureCount: number }> {
    let successCount = 0;
    let failureCount = 0;

    try {
      // Get most active requirements for similarity warming
      const activeRequirementsResult = await this.neo4j.executeQuery(`
        MATCH (r:Requirement)
        WHERE r.status IN ["active", "in_progress"]
        AND r.updatedAt >= datetime() - duration("P7D")
        RETURN r
        ORDER BY r.priority DESC, r.updatedAt DESC
        LIMIT 10
      `, {}, undefined, { tier: CacheTier.HOT });

      if (activeRequirementsResult.data.length === 0) {
        logger.info('No active requirements found for similarity warming');
        return { successCount: 0, failureCount: 0 };
      }

      // Warm similarity calculations for active requirements
      for (const requirement of activeRequirementsResult.data) {
        try {
          await this.similarity.findSimilarRequirements(requirement, {
            threshold: 0.7,
            warmCache: true,
            skipCache: false
          });
          successCount++;
        } catch (error) {
          failureCount++;
          logger.warn(`Failed to warm similarity for requirement ${requirement.id}`, error);
        }
      }

      logger.info('Similarity warming completed', {
        processedRequirements: activeRequirementsResult.data.length,
        successCount,
        failureCount
      });

    } catch (error) {
      logger.error('Similarity warming failed', error);
      failureCount = 1;
    }

    return { successCount, failureCount };
  }

  async warmSpecificQueries(queries: Array<{
    query: string;
    params?: Record<string, any>;
    tier?: CacheTier;
    description?: string;
  }>): Promise<number> {
    let warmedCount = 0;

    logger.info('Starting specific query warming', { queryCount: queries.length });

    try {
      for (const queryConfig of queries) {
        try {
          await this.neo4j.executeQuery(
            queryConfig.query,
            queryConfig.params || {},
            undefined,
            {
              tier: queryConfig.tier || CacheTier.WARM,
              skipCache: false
            }
          );
          warmedCount++;
        } catch (error) {
          logger.warn(`Failed to warm specific query: ${queryConfig.description}`, error);
        }
      }

    } catch (error) {
      logger.error('Specific query warming failed', error);
    }

    return warmedCount;
  }

  async warmProjectData(projectId: string): Promise<number> {
    const projectQueries = [
      {
        query: 'MATCH (p:Project {id: $projectId})-[:CONTAINS]->(r:Requirement) RETURN r',
        params: { projectId },
        tier: CacheTier.HOT,
        description: 'Project requirements'
      },
      {
        query: 'MATCH (p:Project {id: $projectId})-[:HAS_DECISION]->(ad:ArchitectureDecision) RETURN ad',
        params: { projectId },
        tier: CacheTier.WARM,
        description: 'Project architecture decisions'
      },
      {
        query: 'MATCH (p:Project {id: $projectId})-[:USES]->(ts:TechnologyStack) RETURN ts',
        params: { projectId },
        tier: CacheTier.WARM,
        description: 'Project technology stacks'
      },
      {
        query: `
          MATCH (p:Project {id: $projectId})-[:CONTAINS]->(r:Requirement)
          WITH p, count(r) AS totalReqs,
               count(CASE WHEN r.status = 'completed' THEN 1 END) AS completedReqs
          RETURN p.id, p.name, totalReqs, completedReqs,
                 CASE WHEN totalReqs > 0 THEN toFloat(completedReqs) / totalReqs ELSE 0 END AS completion
        `,
        params: { projectId },
        tier: CacheTier.COLD,
        description: 'Project statistics'
      }
    ];

    return await this.warmSpecificQueries(projectQueries);
  }

  async warmUserData(userId: string): Promise<number> {
    const userQueries = [
      {
        query: 'MATCH (s:Stakeholder {id: $userId})-[:OWNS]->(r:Requirement) RETURN r ORDER BY r.priority DESC',
        params: { userId },
        tier: CacheTier.HOT,
        description: 'User requirements'
      },
      {
        query: 'MATCH (s:Stakeholder {id: $userId})-[:PARTICIPATES_IN]->(p:Project) RETURN p',
        params: { userId },
        tier: CacheTier.WARM,
        description: 'User projects'
      },
      {
        query: `
          MATCH (s:Stakeholder {id: $userId})-[:OWNS]->(r:Requirement)
          WITH s, r.type AS reqType, count(r) AS typeCount
          RETURN reqType, typeCount
          ORDER BY typeCount DESC
        `,
        params: { userId },
        tier: CacheTier.COLD,
        description: 'User expertise by requirement type'
      }
    ];

    return await this.warmSpecificQueries(userQueries);
  }

  getStrategyMetrics(strategyName?: string): WarmingMetrics | Map<string, WarmingMetrics> | null {
    if (strategyName) {
      return this.metrics.get(strategyName) || null;
    }
    return new Map(this.metrics);
  }

  async enableStrategy(strategyName: string): Promise<boolean> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      return false;
    }

    strategy.enabled = true;
    
    if (this.isRunning && strategy.frequency !== 'startup') {
      // Restart the job if service is running
      const existingJob = this.scheduledJobs.get(strategyName);
      if (existingJob) {
        existingJob.stop();
        existingJob.destroy();
      }

      const job = cron.schedule(strategy.frequency, async () => {
        await this.executeStrategy(strategyName);
      }, { scheduled: false });

      this.scheduledJobs.set(strategyName, job);
      job.start();
    }

    logger.info(`Enabled cache warming strategy: ${strategy.name}`);
    return true;
  }

  async disableStrategy(strategyName: string): Promise<boolean> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      return false;
    }

    strategy.enabled = false;
    
    const job = this.scheduledJobs.get(strategyName);
    if (job) {
      job.stop();
      job.destroy();
      this.scheduledJobs.delete(strategyName);
    }

    logger.info(`Disabled cache warming strategy: ${strategy.name}`);
    return true;
  }

  getStrategies(): Map<string, WarmingStrategy> {
    return new Map(this.strategies);
  }

  async executeStrategyNow(strategyName: string): Promise<WarmingMetrics> {
    return await this.executeStrategy(strategyName);
  }

  isServiceRunning(): boolean {
    return this.isRunning;
  }
}