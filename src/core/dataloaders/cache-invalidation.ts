import { DataLoaders } from './types';
import { logger } from '../logging/logger';

/**
 * Cache invalidation service for DataLoaders
 * Handles intelligent cache invalidation based on data relationships
 */
export class CacheInvalidationService {
  private dataLoaders: DataLoaders;

  constructor(dataLoaders: DataLoaders) {
    this.dataLoaders = dataLoaders;
  }

  /**
   * Invalidate caches when a requirement is created, updated, or deleted
   */
  invalidateRequirementCaches(requirementId: string, projectId?: string, operation: 'create' | 'update' | 'delete' = 'update') {
    try {
      // Clear the specific requirement cache
      this.dataLoaders.requirements.clear(requirementId);

      // Clear project-based cache if project is specified
      if (projectId) {
        this.dataLoaders.requirementsByProject.clear(projectId);
      }

      // Clear architecture-related caches
      this.dataLoaders.architectureDecisionsByRequirement.clear(requirementId);

      // For updates and deletes, clear dependency and similarity caches
      if (operation === 'update' || operation === 'delete') {
        this.clearRequirementRelationshipCaches(requirementId);
      }

      logger.debug('Invalidated requirement caches', {
        requirementId,
        projectId,
        operation
      });

    } catch (error) {
      logger.error('Failed to invalidate requirement caches', {
        requirementId,
        operation,
        error: error.message
      });
    }
  }

  /**
   * Invalidate caches when an architecture decision is created, updated, or deleted
   */
  invalidateArchitectureDecisionCaches(decisionId: string, operation: 'create' | 'update' | 'delete' = 'update') {
    try {
      // Clear the specific decision cache
      this.dataLoaders.architectureDecisions.clear(decisionId);

      // Clear reverse lookup cache
      this.dataLoaders.requirementsByArchitecture.clear(decisionId);

      // For updates and deletes, we need to clear related requirement caches
      if (operation === 'update' || operation === 'delete') {
        this.clearArchitectureRelatedRequirementCaches(decisionId);
      }

      logger.debug('Invalidated architecture decision caches', {
        decisionId,
        operation
      });

    } catch (error) {
      logger.error('Failed to invalidate architecture decision caches', {
        decisionId,
        operation,
        error: error.message
      });
    }
  }

  /**
   * Invalidate caches when an architecture pattern is updated
   */
  invalidateArchitecturePatternCaches(patternId: string) {
    try {
      this.dataLoaders.architecturePatterns.clear(patternId);

      logger.debug('Invalidated architecture pattern cache', { patternId });

    } catch (error) {
      logger.error('Failed to invalidate architecture pattern cache', {
        patternId,
        error: error.message
      });
    }
  }

  /**
   * Invalidate caches when a technology stack is updated
   */
  invalidateTechnologyStackCaches(stackId: string) {
    try {
      this.dataLoaders.technologyStacks.clear(stackId);

      logger.debug('Invalidated technology stack cache', { stackId });

    } catch (error) {
      logger.error('Failed to invalidate technology stack cache', {
        stackId,
        error: error.message
      });
    }
  }

  /**
   * Invalidate caches when a user is updated
   */
  invalidateUserCaches(userId: string) {
    try {
      this.dataLoaders.users.clear(userId);

      logger.debug('Invalidated user cache', { userId });

    } catch (error) {
      logger.error('Failed to invalidate user cache', {
        userId,
        error: error.message
      });
    }
  }

  /**
   * Invalidate caches when a requirement-architecture mapping is created or updated
   */
  invalidateMappingCaches(requirementId: string, architectureDecisionId: string) {
    try {
      // Clear both sides of the relationship
      this.dataLoaders.architectureDecisionsByRequirement.clear(requirementId);
      this.dataLoaders.requirementsByArchitecture.clear(architectureDecisionId);

      logger.debug('Invalidated mapping caches', {
        requirementId,
        architectureDecisionId
      });

    } catch (error) {
      logger.error('Failed to invalidate mapping caches', {
        requirementId,
        architectureDecisionId,
        error: error.message
      });
    }
  }

  /**
   * Bulk invalidation for project-related changes
   */
  invalidateProjectCaches(projectId: string) {
    try {
      // Clear requirements by project
      this.dataLoaders.requirementsByProject.clear(projectId);

      // This is a heavy operation - consider carefully before using
      logger.info('Invalidated all project-related caches', { projectId });

    } catch (error) {
      logger.error('Failed to invalidate project caches', {
        projectId,
        error: error.message
      });
    }
  }

  /**
   * Clear all caches - use sparingly
   */
  clearAllCaches() {
    try {
      this.dataLoaders.clearAll();
      logger.info('Cleared all DataLoader caches');

    } catch (error) {
      logger.error('Failed to clear all caches', error);
    }
  }

  /**
   * Clear caches matching a pattern
   */
  clearCachesByPattern(pattern: string) {
    try {
      this.dataLoaders.clearByPattern(pattern);
      logger.info('Cleared caches by pattern', { pattern });

    } catch (error) {
      logger.error('Failed to clear caches by pattern', {
        pattern,
        error: error.message
      });
    }
  }

  /**
   * Clear requirement relationship caches (dependencies, conflicts, similarities)
   */
  private clearRequirementRelationshipCaches(requirementId: string) {
    try {
      // These would need access to specialized loaders
      // For now, we can clear the main relationship cache
      this.dataLoaders.relationships.clear(requirementId);

    } catch (error) {
      logger.error('Failed to clear requirement relationship caches', {
        requirementId,
        error: error.message
      });
    }
  }

  /**
   * Clear caches for requirements related to an architecture decision
   */
  private async clearArchitectureRelatedRequirementCaches(decisionId: string) {
    try {
      // This would require a database query to find related requirements
      // Implementation would depend on having access to the Neo4j service
      logger.debug('Would clear architecture-related requirement caches', { decisionId });

    } catch (error) {
      logger.error('Failed to clear architecture-related requirement caches', {
        decisionId,
        error: error.message
      });
    }
  }
}

/**
 * Create invalidation service factory
 */
export function createCacheInvalidationService(dataLoaders: DataLoaders): CacheInvalidationService {
  return new CacheInvalidationService(dataLoaders);
}

/**
 * Smart cache invalidation based on operation type and entity relationships
 */
export class SmartCacheInvalidation {
  private invalidationService: CacheInvalidationService;

  constructor(dataLoaders: DataLoaders) {
    this.invalidationService = new CacheInvalidationService(dataLoaders);
  }

  /**
   * Handle entity changes with intelligent cache invalidation
   */
  handleEntityChange(
    entityType: 'requirement' | 'architectureDecision' | 'architecturePattern' | 'technologyStack' | 'user',
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    relatedData?: Record<string, any>
  ) {
    switch (entityType) {
      case 'requirement':
        this.invalidationService.invalidateRequirementCaches(
          entityId, 
          relatedData?.projectId, 
          operation
        );
        break;

      case 'architectureDecision':
        this.invalidationService.invalidateArchitectureDecisionCaches(entityId, operation);
        break;

      case 'architecturePattern':
        this.invalidationService.invalidateArchitecturePatternCaches(entityId);
        break;

      case 'technologyStack':
        this.invalidationService.invalidateTechnologyStackCaches(entityId);
        break;

      case 'user':
        this.invalidationService.invalidateUserCaches(entityId);
        break;
    }
  }

  /**
   * Handle relationship changes
   */
  handleRelationshipChange(
    relationshipType: 'requirement-architecture' | 'requirement-dependency' | 'requirement-conflict',
    sourceId: string,
    targetId: string,
    operation: 'create' | 'update' | 'delete'
  ) {
    switch (relationshipType) {
      case 'requirement-architecture':
        this.invalidationService.invalidateMappingCaches(sourceId, targetId);
        break;

      case 'requirement-dependency':
      case 'requirement-conflict':
        // Clear relationship caches for both requirements
        this.invalidationService.clearRequirementRelationshipCaches(sourceId);
        this.invalidationService.clearRequirementRelationshipCaches(targetId);
        break;
    }
  }

  /**
   * Get the underlying invalidation service
   */
  getInvalidationService(): CacheInvalidationService {
    return this.invalidationService;
  }
}

/**
 * Middleware for automatic cache invalidation in resolvers
 */
export function withCacheInvalidation<T extends (...args: any[]) => any>(
  resolver: T,
  invalidationConfig: {
    entityType: 'requirement' | 'architectureDecision' | 'architecturePattern' | 'technologyStack' | 'user';
    operation: 'create' | 'update' | 'delete';
    getEntityId?: (result: any, args: any) => string;
    getRelatedData?: (result: any, args: any) => Record<string, any>;
  }
): T {
  return (async (...args: any[]) => {
    const [, resolverArgs, context] = args;
    
    // Execute the original resolver
    const result = await resolver(...args);

    // Perform cache invalidation
    if (context.dataLoaders) {
      const smartInvalidation = new SmartCacheInvalidation(context.dataLoaders);
      
      const entityId = invalidationConfig.getEntityId 
        ? invalidationConfig.getEntityId(result, resolverArgs)
        : result?.id || resolverArgs?.id;

      const relatedData = invalidationConfig.getRelatedData
        ? invalidationConfig.getRelatedData(result, resolverArgs)
        : {};

      if (entityId) {
        smartInvalidation.handleEntityChange(
          invalidationConfig.entityType,
          entityId,
          invalidationConfig.operation,
          relatedData
        );
      }
    }

    return result;
  }) as T;
}