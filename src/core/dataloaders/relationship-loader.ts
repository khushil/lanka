import { BaseDataLoader } from './base-loader';
import { DataLoaderContext, LoaderOptions, Relationship } from './types';
import { logger } from '../logging/logger';

/**
 * DataLoader for batching graph relationship queries
 * Handles various relationship types in the Neo4j graph
 */
export class RelationshipDataLoader extends BaseDataLoader<string, Relationship[]> {
  constructor(context: DataLoaderContext, options: LoaderOptions = {}) {
    super('relationship', context, async (nodeIds: readonly string[]) => {
      return this.batchLoadRelationships(nodeIds);
    }, {
      ...options,
      maxBatchSize: options.maxBatchSize || 50,
      cache: {
        enabled: true,
        ttl: 180000, // 3 minutes (relationships can change frequently)
        ...options.cache
      }
    });
  }

  /**
   * Batch load all relationships for given node IDs
   */
  private async batchLoadRelationships(nodeIds: readonly string[]): Promise<(Relationship[] | Error)[]> {
    if (nodeIds.length === 0) return [];

    try {
      const query = `
        MATCH (source)-[r]->(target)
        WHERE source.id IN $nodeIds OR target.id IN $nodeIds
        RETURN source.id as sourceId, 
               target.id as targetId,
               type(r) as relationshipType,
               properties(r) as properties,
               r.createdAt as createdAt,
               id(r) as relationshipId
        ORDER BY r.createdAt DESC
      `;

      const results = await this.context.neo4j.executeQuery(query, { nodeIds: Array.from(nodeIds) });
      
      // Group relationships by node ID
      const nodeRelationshipsMap = new Map<string, Relationship[]>();
      
      // Initialize empty arrays for all requested node IDs
      nodeIds.forEach(nodeId => {
        nodeRelationshipsMap.set(nodeId, []);
      });

      results.forEach((record: any) => {
        const relationship = this.mapRecordToRelationship(record);
        
        if (relationship) {
          // Add to source node's relationships if it's in our requested IDs
          if (nodeIds.includes(relationship.sourceId)) {
            const sourceRels = nodeRelationshipsMap.get(relationship.sourceId) || [];
            sourceRels.push(relationship);
            nodeRelationshipsMap.set(relationship.sourceId, sourceRels);
          }
          
          // Add to target node's relationships if it's in our requested IDs and different from source
          if (nodeIds.includes(relationship.targetId) && relationship.targetId !== relationship.sourceId) {
            const targetRels = nodeRelationshipsMap.get(relationship.targetId) || [];
            targetRels.push(relationship);
            nodeRelationshipsMap.set(relationship.targetId, targetRels);
          }
        }
      });

      // Return results in the same order as requested node IDs
      return nodeIds.map(nodeId => nodeRelationshipsMap.get(nodeId) || []);

    } catch (error) {
      logger.error('Failed to batch load relationships', {
        error: error.message,
        nodeIdCount: nodeIds.length,
        sampleNodeIds: nodeIds.slice(0, 5)
      });
      
      return nodeIds.map(() => error);
    }
  }

  /**
   * Map database record to Relationship object
   */
  private mapRecordToRelationship(record: any): Relationship | null {
    if (!record.sourceId || !record.targetId) return null;
    
    return {
      id: String(record.relationshipId),
      type: record.relationshipType,
      sourceId: record.sourceId,
      targetId: record.targetId,
      properties: record.properties || {},
      createdAt: record.createdAt || new Date().toISOString()
    };
  }
}

/**
 * DataLoader for loading specific relationship types
 */
export class RelationshipsByTypeDataLoader extends BaseDataLoader<string, Relationship[]> {
  constructor(context: DataLoaderContext, options: LoaderOptions = {}) {
    super('relationshipsByType', context, async (typeKeys: readonly string[]) => {
      return this.batchLoadRelationshipsByType(typeKeys);
    }, {
      ...options,
      maxBatchSize: options.maxBatchSize || 30,
      cache: {
        enabled: true,
        ttl: 300000, // 5 minutes
        ...options.cache
      }
    });
  }

  /**
   * Generate a key for relationship type queries
   */
  static generateTypeKey(nodeId: string, relationshipType: string, direction: 'in' | 'out' | 'both' = 'both'): string {
    return `${nodeId}:${relationshipType}:${direction}`;
  }

  /**
   * Batch load relationships by type for given nodes
   */
  private async batchLoadRelationshipsByType(typeKeys: readonly string[]): Promise<(Relationship[] | Error)[]> {
    if (typeKeys.length === 0) return [];

    try {
      // Parse type keys to extract node IDs, types, and directions
      const queries = typeKeys.map(typeKey => {
        const [nodeId, relationshipType, direction] = typeKey.split(':');
        return { nodeId, relationshipType, direction };
      });

      // Group by relationship type for efficient querying
      const typeGroups = new Map<string, { nodeIds: string[]; direction: string }>();
      
      queries.forEach(({ nodeId, relationshipType, direction }) => {
        if (!typeGroups.has(relationshipType)) {
          typeGroups.set(relationshipType, { nodeIds: [], direction });
        }
        const group = typeGroups.get(relationshipType)!;
        group.nodeIds.push(nodeId);
      });

      // Execute queries for each relationship type
      const allResults = new Map<string, Relationship[]>();

      for (const [relType, { nodeIds, direction }] of typeGroups) {
        let query = '';
        
        if (direction === 'out') {
          query = `
            MATCH (source)-[r:${relType}]->(target)
            WHERE source.id IN $nodeIds
            RETURN source.id as sourceId, target.id as targetId,
                   type(r) as relationshipType, properties(r) as properties,
                   r.createdAt as createdAt, id(r) as relationshipId
          `;
        } else if (direction === 'in') {
          query = `
            MATCH (source)-[r:${relType}]->(target)
            WHERE target.id IN $nodeIds
            RETURN source.id as sourceId, target.id as targetId,
                   type(r) as relationshipType, properties(r) as properties,
                   r.createdAt as createdAt, id(r) as relationshipId
          `;
        } else { // both
          query = `
            MATCH (n)-[r:${relType}]-(other)
            WHERE n.id IN $nodeIds
            RETURN CASE 
                     WHEN startNode(r).id IN $nodeIds THEN startNode(r).id 
                     ELSE endNode(r).id 
                   END as sourceId,
                   CASE 
                     WHEN startNode(r).id IN $nodeIds THEN endNode(r).id 
                     ELSE startNode(r).id 
                   END as targetId,
                   type(r) as relationshipType, properties(r) as properties,
                   r.createdAt as createdAt, id(r) as relationshipId
          `;
        }

        const results = await this.context.neo4j.executeQuery(query, { nodeIds });
        
        results.forEach((record: any) => {
          const relationship = this.mapRecordToRelationship(record);
          if (relationship) {
            const key = `${record.sourceId}:${relType}:${direction}`;
            if (!allResults.has(key)) {
              allResults.set(key, []);
            }
            allResults.get(key)!.push(relationship);
          }
        });
      }

      // Return results in the same order as requested type keys
      return typeKeys.map(typeKey => allResults.get(typeKey) || []);

    } catch (error) {
      logger.error('Failed to batch load relationships by type', {
        error: error.message,
        typeKeyCount: typeKeys.length,
        sampleTypeKeys: typeKeys.slice(0, 5)
      });
      
      return typeKeys.map(() => error);
    }
  }

  /**
   * Map database record to Relationship object
   */
  private mapRecordToRelationship(record: any): Relationship | null {
    if (!record.sourceId || !record.targetId) return null;
    
    return {
      id: String(record.relationshipId),
      type: record.relationshipType,
      sourceId: record.sourceId,
      targetId: record.targetId,
      properties: record.properties || {},
      createdAt: record.createdAt || new Date().toISOString()
    };
  }
}

/**
 * DataLoader for loading requirement dependencies
 */
export class RequirementDependenciesDataLoader extends BaseDataLoader<string, string[]> {
  constructor(context: DataLoaderContext, options: LoaderOptions = {}) {
    super('requirementDependencies', context, async (requirementIds: readonly string[]) => {
      return this.batchLoadRequirementDependencies(requirementIds);
    }, {
      ...options,
      maxBatchSize: options.maxBatchSize || 50,
      cache: {
        enabled: true,
        ttl: 240000, // 4 minutes
        ...options.cache
      }
    });
  }

  /**
   * Batch load requirement dependencies
   */
  private async batchLoadRequirementDependencies(requirementIds: readonly string[]): Promise<(string[] | Error)[]> {
    if (requirementIds.length === 0) return [];

    try {
      const query = `
        MATCH (r:Requirement)-[:DEPENDS_ON]->(dep:Requirement)
        WHERE r.id IN $requirementIds
        RETURN r.id as requirementId, collect(dep.id) as dependencies
      `;

      const results = await this.context.neo4j.executeQuery(query, { requirementIds: Array.from(requirementIds) });
      
      // Create a map for efficient lookup
      const dependenciesMap = new Map<string, string[]>();
      
      results.forEach((record: any) => {
        dependenciesMap.set(record.requirementId, record.dependencies || []);
      });

      // Return results in the same order as requested requirement IDs
      return requirementIds.map(requirementId => 
        dependenciesMap.get(requirementId) || []
      );

    } catch (error) {
      logger.error('Failed to batch load requirement dependencies', {
        error: error.message,
        requirementIdCount: requirementIds.length
      });
      
      return requirementIds.map(() => error);
    }
  }
}

/**
 * DataLoader for loading requirement conflicts
 */
export class RequirementConflictsDataLoader extends BaseDataLoader<string, string[]> {
  constructor(context: DataLoaderContext, options: LoaderOptions = {}) {
    super('requirementConflicts', context, async (requirementIds: readonly string[]) => {
      return this.batchLoadRequirementConflicts(requirementIds);
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
   * Batch load requirement conflicts
   */
  private async batchLoadRequirementConflicts(requirementIds: readonly string[]): Promise<(string[] | Error)[]> {
    if (requirementIds.length === 0) return [];

    try {
      const query = `
        MATCH (r:Requirement)-[:CONFLICTS_WITH]-(conflict:Requirement)
        WHERE r.id IN $requirementIds
        RETURN r.id as requirementId, collect(DISTINCT conflict.id) as conflicts
      `;

      const results = await this.context.neo4j.executeQuery(query, { requirementIds: Array.from(requirementIds) });
      
      // Create a map for efficient lookup
      const conflictsMap = new Map<string, string[]>();
      
      results.forEach((record: any) => {
        conflictsMap.set(record.requirementId, record.conflicts || []);
      });

      // Return results in the same order as requested requirement IDs
      return requirementIds.map(requirementId => 
        conflictsMap.get(requirementId) || []
      );

    } catch (error) {
      logger.error('Failed to batch load requirement conflicts', {
        error: error.message,
        requirementIdCount: requirementIds.length
      });
      
      return requirementIds.map(() => error);
    }
  }
}

/**
 * DataLoader for loading similar requirements
 */
export class SimilarRequirementsDataLoader extends BaseDataLoader<string, Array<{ requirementId: string; similarity: number }>> {
  constructor(context: DataLoaderContext, options: LoaderOptions = {}) {
    super('similarRequirements', context, async (requirementIds: readonly string[]) => {
      return this.batchLoadSimilarRequirements(requirementIds);
    }, {
      ...options,
      maxBatchSize: options.maxBatchSize || 20, // Smaller batch size for complex queries
      cache: {
        enabled: true,
        ttl: 600000, // 10 minutes (similarity doesn't change often)
        ...options.cache
      }
    });
  }

  /**
   * Batch load similar requirements
   */
  private async batchLoadSimilarRequirements(
    requirementIds: readonly string[]
  ): Promise<(Array<{ requirementId: string; similarity: number }> | Error)[]> {
    if (requirementIds.length === 0) return [];

    try {
      const query = `
        MATCH (r:Requirement)-[sim:SIMILAR_TO]-(similar:Requirement)
        WHERE r.id IN $requirementIds
        RETURN r.id as requirementId, 
               collect({
                 requirementId: similar.id,
                 similarity: coalesce(sim.score, 0.0)
               }) as similarRequirements
        ORDER BY sim.score DESC
      `;

      const results = await this.context.neo4j.executeQuery(query, { requirementIds: Array.from(requirementIds) });
      
      // Create a map for efficient lookup
      const similarityMap = new Map<string, Array<{ requirementId: string; similarity: number }>>();
      
      results.forEach((record: any) => {
        const similarities = record.similarRequirements || [];
        // Sort by similarity score descending
        similarities.sort((a: any, b: any) => b.similarity - a.similarity);
        similarityMap.set(record.requirementId, similarities);
      });

      // Return results in the same order as requested requirement IDs
      return requirementIds.map(requirementId => 
        similarityMap.get(requirementId) || []
      );

    } catch (error) {
      logger.error('Failed to batch load similar requirements', {
        error: error.message,
        requirementIdCount: requirementIds.length
      });
      
      return requirementIds.map(() => error);
    }
  }
}