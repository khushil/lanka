import { BaseDataLoader } from './base-loader';
import { 
  DataLoaderContext, 
  LoaderOptions, 
  ArchitectureDecision,
  ArchitecturePattern,
  TechnologyStack,
  ArchitectureDecisionsByRequirementLoader,
  RequirementsByArchitectureLoader
} from './types';
import { logger } from '../logging/logger';

/**
 * DataLoader for batching architecture decision queries
 */
export class ArchitectureDecisionDataLoader extends BaseDataLoader<string, ArchitectureDecision | null> {
  constructor(context: DataLoaderContext, options: LoaderOptions = {}) {
    super('architectureDecision', context, async (ids: readonly string[]) => {
      return this.batchLoadArchitectureDecisions(ids);
    }, {
      ...options,
      maxBatchSize: options.maxBatchSize || 100,
      cache: {
        enabled: true,
        ttl: 600000, // 10 minutes (architecture decisions change less frequently)
        ...options.cache
      }
    });
  }

  /**
   * Batch load architecture decisions by IDs
   */
  private async batchLoadArchitectureDecisions(ids: readonly string[]): Promise<(ArchitectureDecision | null | Error)[]> {
    if (ids.length === 0) return [];

    try {
      const query = `
        MATCH (a:ArchitectureDecision)
        WHERE a.id IN $ids
        OPTIONAL MATCH (a)-[:USES_TECHNOLOGY]->(t:TechnologyStack)
        OPTIONAL MATCH (a)-[:USES_PATTERN]->(p:ArchitecturePattern)
        RETURN a, t, collect(DISTINCT p) as patterns
        ORDER BY a.createdAt DESC
      `;

      const results = await this.context.neo4j.executeQuery(query, { ids: Array.from(ids) });
      
      // Create a map for efficient lookup
      const decisionMap = new Map<string, ArchitectureDecision>();
      
      results.forEach((record: any) => {
        const decision = this.mapNodeToArchitectureDecision(record.a);
        if (decision) {
          // Add related data
          if (record.t) {
            decision.technologyStack = record.t.properties;
          }
          if (record.patterns && record.patterns.length > 0) {
            decision.patterns = record.patterns.map((p: any) => p.properties);
          }
          
          decisionMap.set(decision.id, decision);
        }
      });

      // Return results in the same order as requested IDs
      return ids.map(id => decisionMap.get(id) || null);

    } catch (error) {
      logger.error('Failed to batch load architecture decisions', {
        error: error.message,
        idCount: ids.length,
        sampleIds: ids.slice(0, 5)
      });
      
      return ids.map(() => error);
    }
  }

  /**
   * Map Neo4j node to ArchitectureDecision object
   */
  private mapNodeToArchitectureDecision(node: any): ArchitectureDecision | null {
    if (!node || !node.properties) return null;
    
    return {
      id: node.properties.id,
      title: node.properties.title,
      description: node.properties.description || '',
      status: node.properties.status || 'proposed',
      rationale: node.properties.rationale || '',
      consequences: node.properties.consequences || '',
      alternatives: node.properties.alternatives,
      technologyStackId: node.properties.technologyStackId,
      createdAt: node.properties.createdAt,
      updatedAt: node.properties.updatedAt,
      ...node.properties
    };
  }
}

/**
 * DataLoader for batching architecture pattern queries
 */
export class ArchitecturePatternDataLoader extends BaseDataLoader<string, ArchitecturePattern | null> {
  constructor(context: DataLoaderContext, options: LoaderOptions = {}) {
    super('architecturePattern', context, async (ids: readonly string[]) => {
      return this.batchLoadArchitecturePatterns(ids);
    }, {
      ...options,
      maxBatchSize: options.maxBatchSize || 100,
      cache: {
        enabled: true,
        ttl: 1800000, // 30 minutes (patterns rarely change)
        ...options.cache
      }
    });
  }

  /**
   * Batch load architecture patterns by IDs
   */
  private async batchLoadArchitecturePatterns(ids: readonly string[]): Promise<(ArchitecturePattern | null | Error)[]> {
    if (ids.length === 0) return [];

    try {
      const query = `
        MATCH (p:ArchitecturePattern)
        WHERE p.id IN $ids
        OPTIONAL MATCH (p)-[:COMPATIBLE_WITH]->(compatible:ArchitecturePattern)
        OPTIONAL MATCH (p)-[:CONFLICTS_WITH]->(conflicts:ArchitecturePattern)
        RETURN p, 
               collect(DISTINCT compatible) as compatiblePatterns,
               collect(DISTINCT conflicts) as conflictingPatterns
      `;

      const results = await this.context.neo4j.executeQuery(query, { ids: Array.from(ids) });
      
      // Create a map for efficient lookup
      const patternMap = new Map<string, ArchitecturePattern>();
      
      results.forEach((record: any) => {
        const pattern = this.mapNodeToArchitecturePattern(record.p);
        if (pattern) {
          // Add related data
          if (record.compatiblePatterns && record.compatiblePatterns.length > 0) {
            pattern.compatiblePatterns = record.compatiblePatterns.map((p: any) => p.properties);
          }
          if (record.conflictingPatterns && record.conflictingPatterns.length > 0) {
            pattern.conflictingPatterns = record.conflictingPatterns.map((p: any) => p.properties);
          }
          
          patternMap.set(pattern.id, pattern);
        }
      });

      // Return results in the same order as requested IDs
      return ids.map(id => patternMap.get(id) || null);

    } catch (error) {
      logger.error('Failed to batch load architecture patterns', {
        error: error.message,
        idCount: ids.length,
        sampleIds: ids.slice(0, 5)
      });
      
      return ids.map(() => error);
    }
  }

  /**
   * Map Neo4j node to ArchitecturePattern object
   */
  private mapNodeToArchitecturePattern(node: any): ArchitecturePattern | null {
    if (!node || !node.properties) return null;
    
    return {
      id: node.properties.id,
      name: node.properties.name,
      description: node.properties.description || '',
      category: node.properties.category || 'structural',
      applicability: node.properties.applicability || '',
      consequences: node.properties.consequences || '',
      implementation: node.properties.implementation || '',
      examples: node.properties.examples,
      createdAt: node.properties.createdAt,
      updatedAt: node.properties.updatedAt,
      ...node.properties
    };
  }
}

/**
 * DataLoader for batching technology stack queries
 */
export class TechnologyStackDataLoader extends BaseDataLoader<string, TechnologyStack | null> {
  constructor(context: DataLoaderContext, options: LoaderOptions = {}) {
    super('technologyStack', context, async (ids: readonly string[]) => {
      return this.batchLoadTechnologyStacks(ids);
    }, {
      ...options,
      maxBatchSize: options.maxBatchSize || 50,
      cache: {
        enabled: true,
        ttl: 900000, // 15 minutes
        ...options.cache
      }
    });
  }

  /**
   * Batch load technology stacks by IDs
   */
  private async batchLoadTechnologyStacks(ids: readonly string[]): Promise<(TechnologyStack | null | Error)[]> {
    if (ids.length === 0) return [];

    try {
      const query = `
        MATCH (t:TechnologyStack)
        WHERE t.id IN $ids
        OPTIONAL MATCH (t)-[:INCLUDES]->(tech:Technology)
        RETURN t, collect(tech) as technologies
      `;

      const results = await this.context.neo4j.executeQuery(query, { ids: Array.from(ids) });
      
      // Create a map for efficient lookup
      const stackMap = new Map<string, TechnologyStack>();
      
      results.forEach((record: any) => {
        const stack = this.mapNodeToTechnologyStack(record.t);
        if (stack) {
          // Add technologies
          if (record.technologies && record.technologies.length > 0) {
            stack.technologies = record.technologies.map((tech: any) => tech.properties);
          }
          
          stackMap.set(stack.id, stack);
        }
      });

      // Return results in the same order as requested IDs
      return ids.map(id => stackMap.get(id) || null);

    } catch (error) {
      logger.error('Failed to batch load technology stacks', {
        error: error.message,
        idCount: ids.length,
        sampleIds: ids.slice(0, 5)
      });
      
      return ids.map(() => error);
    }
  }

  /**
   * Map Neo4j node to TechnologyStack object
   */
  private mapNodeToTechnologyStack(node: any): TechnologyStack | null {
    if (!node || !node.properties) return null;
    
    return {
      id: node.properties.id,
      name: node.properties.name,
      description: node.properties.description || '',
      technologies: [], // Will be populated by the query
      compatibility: node.properties.compatibility || 'unknown',
      maturity: node.properties.maturity || 'stable',
      performance: node.properties.performance || 0,
      cost: node.properties.cost || 0,
      maintainability: node.properties.maintainability || 0,
      createdAt: node.properties.createdAt,
      updatedAt: node.properties.updatedAt,
      ...node.properties
    };
  }
}

/**
 * DataLoader for loading architecture decisions by requirement ID
 */
export class ArchitectureDecisionsByRequirementDataLoader extends BaseDataLoader<string, ArchitectureDecision[]> {
  constructor(context: DataLoaderContext, options: LoaderOptions = {}) {
    super('architectureDecisionsByRequirement', context, async (requirementIds: readonly string[]) => {
      return this.batchLoadArchitectureDecisionsByRequirement(requirementIds);
    }, {
      ...options,
      maxBatchSize: options.maxBatchSize || 50,
      cache: {
        enabled: true,
        ttl: 300000, // 5 minutes
        ...options.cache
      }
    });
  }

  /**
   * Batch load architecture decisions by requirement IDs
   */
  private async batchLoadArchitectureDecisionsByRequirement(
    requirementIds: readonly string[]
  ): Promise<(ArchitectureDecision[] | Error)[]> {
    if (requirementIds.length === 0) return [];

    try {
      const query = `
        MATCH (r:Requirement)-[:MAPPED_TO]->(m:RequirementArchitectureMapping)
        MATCH (m)-[:MAPS_TO_DECISION]->(a:ArchitectureDecision)
        WHERE r.id IN $requirementIds
        RETURN r.id as requirementId, collect(DISTINCT a) as decisions
      `;

      const results = await this.context.neo4j.executeQuery(query, { 
        requirementIds: Array.from(requirementIds) 
      });
      
      // Create a map for efficient lookup
      const requirementDecisionsMap = new Map<string, ArchitectureDecision[]>();
      
      results.forEach((record: any) => {
        const decisions = record.decisions.map((node: any) => 
          this.mapNodeToArchitectureDecision(node)
        ).filter(Boolean) as ArchitectureDecision[];
        
        requirementDecisionsMap.set(record.requirementId, decisions);
      });

      // Return results in the same order as requested requirement IDs
      return requirementIds.map(requirementId => 
        requirementDecisionsMap.get(requirementId) || []
      );

    } catch (error) {
      logger.error('Failed to batch load architecture decisions by requirement', {
        error: error.message,
        requirementIdCount: requirementIds.length,
        sampleRequirementIds: requirementIds.slice(0, 5)
      });
      
      return requirementIds.map(() => error);
    }
  }

  /**
   * Map Neo4j node to ArchitectureDecision object
   */
  private mapNodeToArchitectureDecision(node: any): ArchitectureDecision | null {
    if (!node || !node.properties) return null;
    
    return {
      id: node.properties.id,
      title: node.properties.title,
      description: node.properties.description || '',
      status: node.properties.status || 'proposed',
      rationale: node.properties.rationale || '',
      consequences: node.properties.consequences || '',
      alternatives: node.properties.alternatives,
      technologyStackId: node.properties.technologyStackId,
      createdAt: node.properties.createdAt,
      updatedAt: node.properties.updatedAt,
      ...node.properties
    };
  }
}