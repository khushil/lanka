/**
 * Cache Invalidation Service
 * Event-driven cache invalidation with intelligent pattern matching
 */

import { CacheManager } from './cache.manager';
import { RedisService } from './redis.service';
import { logger } from '../logging/logger';
import { EventEmitter } from 'events';

export interface InvalidationRule {
  id: string;
  name: string;
  enabled: boolean;
  event: string;
  patterns: string[];
  namespaces: string[];
  condition?: (eventData: any) => boolean;
  delay?: number; // Delay in milliseconds before invalidation
}

export interface InvalidationEvent {
  type: string;
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  data?: any;
  timestamp: number;
  userId?: string;
}

export interface InvalidationMetrics {
  totalEvents: number;
  totalInvalidations: number;
  invalidationsByRule: Map<string, number>;
  averageInvalidationTime: number;
  lastInvalidation: Date | null;
}

export class CacheInvalidationService extends EventEmitter {
  private cache: CacheManager;
  private redis: RedisService;
  private rules: Map<string, InvalidationRule> = new Map();
  private metrics: InvalidationMetrics;
  private delayedInvalidations: Map<string, NodeJS.Timeout> = new Map();
  private readonly invalidationChannel = 'lanka:cache:invalidation';

  constructor() {
    super();
    this.cache = new CacheManager();
    this.redis = RedisService.getInstance();
    
    this.metrics = {
      totalEvents: 0,
      totalInvalidations: 0,
      invalidationsByRule: new Map(),
      averageInvalidationTime: 0,
      lastInvalidation: null
    };

    this.initializeRules();
    this.setupEventListeners();
  }

  private initializeRules(): void {
    // Requirement invalidation rules
    this.rules.set('requirement-update', {
      id: 'requirement-update',
      name: 'Requirement Update Invalidation',
      enabled: true,
      event: 'requirement.updated',
      patterns: [
        '*requirement*{entityId}*',
        '*similar*{entityId}*',
        '*project*{data.projectId}*'
      ],
      namespaces: ['neo4j', 'similarity', 'cache'],
      condition: (data) => data.entityId && data.entityId.length > 0
    });

    this.rules.set('requirement-create', {
      id: 'requirement-create',
      name: 'Requirement Creation Invalidation',
      enabled: true,
      event: 'requirement.created',
      patterns: [
        '*project*{data.projectId}*',
        '*statistics*{data.projectId}*',
        '*similarity*' // Invalidate all similarity cache as new requirement affects calculations
      ],
      namespaces: ['neo4j', 'similarity'],
      delay: 5000 // Delay to allow for related operations to complete
    });

    this.rules.set('requirement-delete', {
      id: 'requirement-delete',
      name: 'Requirement Deletion Invalidation',
      enabled: true,
      event: 'requirement.deleted',
      patterns: [
        '*requirement*{entityId}*',
        '*similar*{entityId}*',
        '*project*{data.projectId}*',
        '*statistics*{data.projectId}*',
        '*similarity*' // All similarity calculations need refresh
      ],
      namespaces: ['neo4j', 'similarity', 'cache']
    });

    // Architecture decision invalidation rules
    this.rules.set('architecture-update', {
      id: 'architecture-update',
      name: 'Architecture Decision Update Invalidation',
      enabled: true,
      event: 'architecture.updated',
      patterns: [
        '*architecture*{entityId}*',
        '*decision*{entityId}*',
        '*project*{data.projectId}*',
        '*alignment*' // Architecture changes affect requirement alignments
      ],
      namespaces: ['neo4j', 'cache']
    });

    this.rules.set('architecture-create', {
      id: 'architecture-create',
      name: 'Architecture Decision Creation Invalidation',
      enabled: true,
      event: 'architecture.created',
      patterns: [
        '*project*{data.projectId}*',
        '*statistics*{data.projectId}*',
        '*alignment*'
      ],
      namespaces: ['neo4j', 'cache'],
      delay: 3000
    });

    // Project invalidation rules
    this.rules.set('project-update', {
      id: 'project-update',
      name: 'Project Update Invalidation',
      enabled: true,
      event: 'project.updated',
      patterns: [
        '*project*{entityId}*',
        '*statistics*{entityId}*'
      ],
      namespaces: ['neo4j', 'cache']
    });

    // Stakeholder invalidation rules
    this.rules.set('stakeholder-update', {
      id: 'stakeholder-update',
      name: 'Stakeholder Update Invalidation',
      enabled: true,
      event: 'stakeholder.updated',
      patterns: [
        '*expertise*',
        '*stakeholder*{entityId}*'
      ],
      namespaces: ['neo4j', 'similarity'],
      condition: (data) => data.data && (data.data.roleChanged || data.data.expertiseChanged)
    });

    // Technology stack invalidation rules
    this.rules.set('technology-update', {
      id: 'technology-update',
      name: 'Technology Stack Update Invalidation',
      enabled: true,
      event: 'technology.updated',
      patterns: [
        '*technology*{entityId}*',
        '*stack*{entityId}*'
      ],
      namespaces: ['neo4j', 'cache']
    });

    // Time-based invalidation rules
    this.rules.set('daily-cleanup', {
      id: 'daily-cleanup',
      name: 'Daily Cache Cleanup',
      enabled: true,
      event: 'time.daily',
      patterns: [
        '*statistics*',
        '*analytics*',
        '*trends*'
      ],
      namespaces: ['neo4j', 'cache']
    });

    // Session-based invalidation rules
    this.rules.set('user-session-end', {
      id: 'user-session-end',
      name: 'User Session End Cleanup',
      enabled: true,
      event: 'user.session.ended',
      patterns: [
        '*user*{data.userId}*',
        '*session*{data.sessionId}*'
      ],
      namespaces: ['cache'],
      delay: 30000 // 30 seconds delay to allow for session cleanup
    });
  }

  private setupEventListeners(): void {
    // Listen for invalidation events on Redis pub/sub
    this.redis.subscribe(this.invalidationChannel, (channel, message) => {
      try {
        const event: InvalidationEvent = JSON.parse(message);
        this.handleInvalidationEvent(event);
      } catch (error) {
        logger.error('Failed to parse invalidation event', { message, error });
      }
    });

    // Set up internal event listeners
    this.on('invalidate', this.handleInvalidationEvent.bind(this));
  }

  private async handleInvalidationEvent(event: InvalidationEvent): Promise<void> {
    this.metrics.totalEvents++;
    
    logger.debug('Processing cache invalidation event', {
      type: event.type,
      entityType: event.entityType,
      entityId: event.entityId,
      operation: event.operation
    });

    try {
      const applicableRules = Array.from(this.rules.values()).filter(rule => 
        rule.enabled && 
        rule.event === event.type &&
        (!rule.condition || rule.condition(event))
      );

      for (const rule of applicableRules) {
        if (rule.delay && rule.delay > 0) {
          this.scheduleDelayedInvalidation(rule, event);
        } else {
          await this.executeInvalidationRule(rule, event);
        }
      }

    } catch (error) {
      logger.error('Failed to handle cache invalidation event', { event, error });
    }
  }

  private scheduleDelayedInvalidation(rule: InvalidationRule, event: InvalidationEvent): void {
    const delayKey = `${rule.id}:${event.entityId}:${Date.now()}`;
    
    // Cancel any existing delayed invalidation for the same rule and entity
    const existingKey = Array.from(this.delayedInvalidations.keys()).find(key => 
      key.startsWith(`${rule.id}:${event.entityId}:`)
    );
    
    if (existingKey) {
      clearTimeout(this.delayedInvalidations.get(existingKey)!);
      this.delayedInvalidations.delete(existingKey);
    }

    const timeout = setTimeout(async () => {
      try {
        await this.executeInvalidationRule(rule, event);
        this.delayedInvalidations.delete(delayKey);
      } catch (error) {
        logger.error('Delayed invalidation failed', { rule: rule.id, event, error });
      }
    }, rule.delay);

    this.delayedInvalidations.set(delayKey, timeout);
    
    logger.debug('Scheduled delayed invalidation', {
      rule: rule.id,
      delay: rule.delay,
      entityId: event.entityId
    });
  }

  private async executeInvalidationRule(rule: InvalidationRule, event: InvalidationEvent): Promise<void> {
    const startTime = Date.now();
    let totalInvalidated = 0;

    try {
      // Process patterns for each namespace
      for (const namespace of rule.namespaces) {
        for (const patternTemplate of rule.patterns) {
          // Replace placeholders in pattern
          const pattern = this.substitutePattern(patternTemplate, event);
          
          try {
            const invalidatedCount = await this.cache.invalidatePattern(pattern, namespace);
            totalInvalidated += invalidatedCount;
            
            logger.debug('Pattern invalidation completed', {
              rule: rule.id,
              namespace,
              pattern,
              invalidatedCount
            });

          } catch (error) {
            logger.error('Pattern invalidation failed', {
              rule: rule.id,
              namespace,
              pattern,
              error
            });
          }
        }
      }

      // Update metrics
      const executionTime = Date.now() - startTime;
      this.metrics.totalInvalidations += totalInvalidated;
      this.metrics.averageInvalidationTime = 
        (this.metrics.averageInvalidationTime + executionTime) / 2;
      this.metrics.lastInvalidation = new Date();
      
      const ruleCount = this.metrics.invalidationsByRule.get(rule.id) || 0;
      this.metrics.invalidationsByRule.set(rule.id, ruleCount + totalInvalidated);

      logger.info('Cache invalidation rule executed', {
        rule: rule.name,
        totalInvalidated,
        executionTime,
        entityId: event.entityId
      });

    } catch (error) {
      logger.error('Failed to execute invalidation rule', {
        rule: rule.id,
        event,
        error
      });
    }
  }

  private substitutePattern(patternTemplate: string, event: InvalidationEvent): string {
    return patternTemplate
      .replace('{entityId}', event.entityId)
      .replace('{entityType}', event.entityType)
      .replace('{operation}', event.operation)
      .replace(/{data\.(\w+)}/g, (match, property) => {
        return event.data && event.data[property] ? event.data[property] : '*';
      });
  }

  // Public API methods
  async invalidateEntity(
    entityType: string,
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    data?: any,
    userId?: string
  ): Promise<void> {
    const event: InvalidationEvent = {
      type: `${entityType}.${operation}${operation === 'update' ? 'd' : operation === 'create' ? 'd' : 'd'}`,
      entityType,
      entityId,
      operation,
      data,
      timestamp: Date.now(),
      userId
    };

    // Publish to Redis for distributed invalidation
    await this.redis.publish(this.invalidationChannel, JSON.stringify(event));
    
    // Handle locally as well
    this.emit('invalidate', event);
  }

  async invalidateRequirement(
    requirementId: string,
    operation: 'create' | 'update' | 'delete',
    projectId?: string,
    userId?: string
  ): Promise<void> {
    await this.invalidateEntity('requirement', requirementId, operation, {
      projectId
    }, userId);
  }

  async invalidateProject(
    projectId: string,
    operation: 'create' | 'update' | 'delete',
    userId?: string
  ): Promise<void> {
    await this.invalidateEntity('project', projectId, operation, undefined, userId);
  }

  async invalidateArchitecture(
    architectureId: string,
    operation: 'create' | 'update' | 'delete',
    projectId?: string,
    userId?: string
  ): Promise<void> {
    await this.invalidateEntity('architecture', architectureId, operation, {
      projectId
    }, userId);
  }

  async invalidateStakeholder(
    stakeholderId: string,
    operation: 'create' | 'update' | 'delete',
    roleChanged: boolean = false,
    expertiseChanged: boolean = false,
    userId?: string
  ): Promise<void> {
    await this.invalidateEntity('stakeholder', stakeholderId, operation, {
      roleChanged,
      expertiseChanged
    }, userId);
  }

  async triggerTimeBasedInvalidation(type: 'hourly' | 'daily' | 'weekly'): Promise<void> {
    const event: InvalidationEvent = {
      type: `time.${type}`,
      entityType: 'system',
      entityId: 'time-based',
      operation: 'update',
      timestamp: Date.now()
    };

    this.emit('invalidate', event);
  }

  // Rule management
  addRule(rule: InvalidationRule): void {
    this.rules.set(rule.id, rule);
    logger.info(`Added cache invalidation rule: ${rule.name}`);
  }

  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      logger.info(`Removed cache invalidation rule: ${ruleId}`);
    }
    return removed;
  }

  enableRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = true;
      logger.info(`Enabled cache invalidation rule: ${rule.name}`);
      return true;
    }
    return false;
  }

  disableRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
      logger.info(`Disabled cache invalidation rule: ${rule.name}`);
      return true;
    }
    return false;
  }

  getRules(): Map<string, InvalidationRule> {
    return new Map(this.rules);
  }

  getMetrics(): InvalidationMetrics {
    return {
      ...this.metrics,
      invalidationsByRule: new Map(this.metrics.invalidationsByRule)
    };
  }

  clearMetrics(): void {
    this.metrics = {
      totalEvents: 0,
      totalInvalidations: 0,
      invalidationsByRule: new Map(),
      averageInvalidationTime: 0,
      lastInvalidation: null
    };
  }

  async shutdown(): Promise<void> {
    // Clear all delayed invalidations
    for (const timeout of this.delayedInvalidations.values()) {
      clearTimeout(timeout);
    }
    this.delayedInvalidations.clear();

    // Unsubscribe from Redis
    await this.redis.unsubscribe(this.invalidationChannel);

    logger.info('Cache invalidation service shut down');
  }
}