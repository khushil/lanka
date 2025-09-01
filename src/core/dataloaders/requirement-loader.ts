import { BaseDataLoader } from './base-loader';
import { 
  DataLoaderContext, 
  LoaderOptions, 
  Requirement,
  RequirementLoader,
  RequirementsByProjectLoader
} from './types';
import { logger } from '../logging/logger';

/**
 * DataLoader for batching requirement queries
 * Eliminates N+1 queries when loading requirements
 */
export class RequirementDataLoader extends BaseDataLoader<string, Requirement | null> {
  constructor(context: DataLoaderContext, options: LoaderOptions = {}) {
    super('requirement', context, async (ids: readonly string[]) => {
      return this.batchLoadRequirements(ids);
    }, {
      ...options,
      maxBatchSize: options.maxBatchSize || 100,
      cache: {
        enabled: true,
        ttl: 300000, // 5 minutes
        ...options.cache
      }
    });
  }

  /**
   * Batch load requirements by IDs
   */
  private async batchLoadRequirements(ids: readonly string[]): Promise<(Requirement | null | Error)[]> {
    if (ids.length === 0) return [];

    try {
      const query = `
        MATCH (r:Requirement)
        WHERE r.id IN $ids
        RETURN r
        ORDER BY r.createdAt DESC
      `;

      const results = await this.context.neo4j.executeQuery(query, { ids: Array.from(ids) });
      
      // Create a map for efficient lookup
      const requirementMap = new Map<string, Requirement>();
      
      results.forEach((record: any) => {
        const requirement = this.mapNodeToRequirement(record.r);
        if (requirement) {
          requirementMap.set(requirement.id, requirement);
        }
      });

      // Return results in the same order as requested IDs
      return ids.map(id => requirementMap.get(id) || null);

    } catch (error) {
      logger.error('Failed to batch load requirements', {
        error: error.message,
        idCount: ids.length,
        sampleIds: ids.slice(0, 5)
      });
      
      // Return error for all requested items
      return ids.map(() => error);
    }
  }

  /**
   * Map Neo4j node to Requirement object
   */
  private mapNodeToRequirement(node: any): Requirement | null {
    if (!node || !node.properties) return null;
    
    return {
      id: node.properties.id,
      title: node.properties.title,
      description: node.properties.description || '',
      type: node.properties.type || 'functional',
      status: node.properties.status || 'draft',
      priority: node.properties.priority || 'medium',
      projectId: node.properties.projectId,
      createdAt: node.properties.createdAt,
      updatedAt: node.properties.updatedAt,
      ...node.properties
    };
  }

  /**
   * Preload requirements with related data
   */
  async preloadWithRelations(requirementIds: string[]): Promise<void> {
    if (requirementIds.length === 0) return;

    try {
      const query = `
        MATCH (r:Requirement)
        WHERE r.id IN $ids
        OPTIONAL MATCH (r)-[:BELONGS_TO]->(p:Project)
        OPTIONAL MATCH (r)-[:HAS_TAG]->(t:Tag)
        OPTIONAL MATCH (r)-[:DEPENDS_ON]->(d:Requirement)
        RETURN r, p, collect(DISTINCT t) as tags, collect(DISTINCT d) as dependencies
      `;

      const results = await this.context.neo4j.executeQuery(query, { ids: requirementIds });
      
      results.forEach((record: any) => {
        const requirement = this.mapNodeToRequirement(record.r);
        if (requirement) {
          // Enhance with additional data
          if (record.p) {
            requirement.project = record.p.properties;
          }
          if (record.tags && record.tags.length > 0) {
            requirement.tags = record.tags.map((tag: any) => tag.properties);
          }
          if (record.dependencies && record.dependencies.length > 0) {
            requirement.dependencies = record.dependencies.map((dep: any) => dep.properties);
          }
          
          // Prime the cache with enhanced data
          this.prime(requirement.id, requirement);
        }
      });

    } catch (error) {
      logger.error('Failed to preload requirements with relations', {
        error: error.message,
        idCount: requirementIds.length
      });
    }
  }
}

/**
 * DataLoader for loading requirements by project ID
 */
export class RequirementsByProjectDataLoader extends BaseDataLoader<string, Requirement[]> {
  constructor(context: DataLoaderContext, options: LoaderOptions = {}) {
    super('requirementsByProject', context, async (projectIds: readonly string[]) => {
      return this.batchLoadRequirementsByProject(projectIds);
    }, {
      ...options,
      maxBatchSize: options.maxBatchSize || 50,
      cache: {
        enabled: true,
        ttl: 180000, // 3 minutes (shorter TTL as projects can have frequent requirement changes)
        ...options.cache
      }
    });
  }

  /**
   * Batch load requirements by project IDs
   */
  private async batchLoadRequirementsByProject(projectIds: readonly string[]): Promise<(Requirement[] | Error)[]> {
    if (projectIds.length === 0) return [];

    try {
      const query = `
        MATCH (p:Project)-[:CONTAINS]->(r:Requirement)
        WHERE p.id IN $projectIds
        RETURN p.id as projectId, collect(r) as requirements
        ORDER BY p.id
      `;

      const results = await this.context.neo4j.executeQuery(query, { 
        projectIds: Array.from(projectIds) 
      });
      
      // Create a map for efficient lookup
      const projectRequirementsMap = new Map<string, Requirement[]>();
      
      results.forEach((record: any) => {
        const requirements = record.requirements.map((node: any) => 
          this.mapNodeToRequirement(node)
        ).filter(Boolean) as Requirement[];
        
        projectRequirementsMap.set(record.projectId, requirements);
      });

      // Return results in the same order as requested project IDs
      return projectIds.map(projectId => projectRequirementsMap.get(projectId) || []);

    } catch (error) {
      logger.error('Failed to batch load requirements by project', {
        error: error.message,
        projectIdCount: projectIds.length,
        sampleProjectIds: projectIds.slice(0, 5)
      });
      
      return projectIds.map(() => error);
    }
  }

  /**
   * Map Neo4j node to Requirement object
   */
  private mapNodeToRequirement(node: any): Requirement | null {
    if (!node || !node.properties) return null;
    
    return {
      id: node.properties.id,
      title: node.properties.title,
      description: node.properties.description || '',
      type: node.properties.type || 'functional',
      status: node.properties.status || 'draft',
      priority: node.properties.priority || 'medium',
      projectId: node.properties.projectId,
      createdAt: node.properties.createdAt,
      updatedAt: node.properties.updatedAt,
      ...node.properties
    };
  }
}

/**
 * DataLoader for loading requirements by filters (type, status, etc.)
 */
export class RequirementsByFiltersDataLoader extends BaseDataLoader<string, Requirement[]> {
  constructor(context: DataLoaderContext, options: LoaderOptions = {}) {
    super('requirementsByFilters', context, async (filterKeys: readonly string[]) => {
      return this.batchLoadRequirementsByFilters(filterKeys);
    }, {
      ...options,
      maxBatchSize: options.maxBatchSize || 20,
      cache: {
        enabled: true,
        ttl: 120000, // 2 minutes (frequent changes expected)
        ...options.cache
      }
    });
  }

  /**
   * Generate filter key for caching
   */
  static generateFilterKey(filters: {
    projectId?: string;
    type?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
    limit?: number;
    offset?: number;
  }): string {
    return JSON.stringify({
      projectId: filters.projectId || 'all',
      type: filters.type || 'all',
      status: filters.status || 'all',
      priority: filters.priority || 'all',
      assigneeId: filters.assigneeId || 'all',
      limit: filters.limit || 50,
      offset: filters.offset || 0
    });
  }

  /**
   * Batch load requirements by filter combinations
   */
  private async batchLoadRequirementsByFilters(filterKeys: readonly string[]): Promise<(Requirement[] | Error)[]> {
    if (filterKeys.length === 0) return [];

    try {
      const results = await Promise.all(
        filterKeys.map(async (filterKey) => {
          const filters = JSON.parse(filterKey);
          return await this.loadRequirementsByFilter(filters);
        })
      );

      return results;

    } catch (error) {
      logger.error('Failed to batch load requirements by filters', {
        error: error.message,
        filterCount: filterKeys.length
      });
      
      return filterKeys.map(() => error);
    }
  }

  /**
   * Load requirements for a specific filter combination
   */
  private async loadRequirementsByFilter(filters: any): Promise<Requirement[]> {
    const whereClauses = [];
    const params: any = {
      limit: filters.limit,
      offset: filters.offset
    };

    // Build dynamic WHERE clauses
    if (filters.projectId !== 'all') {
      whereClauses.push('p.id = $projectId');
      params.projectId = filters.projectId;
    }

    if (filters.type !== 'all') {
      whereClauses.push('r.type = $type');
      params.type = filters.type;
    }

    if (filters.status !== 'all') {
      whereClauses.push('r.status = $status');
      params.status = filters.status;
    }

    if (filters.priority !== 'all') {
      whereClauses.push('r.priority = $priority');
      params.priority = filters.priority;
    }

    if (filters.assigneeId !== 'all') {
      whereClauses.push('r.assigneeId = $assigneeId');
      params.assigneeId = filters.assigneeId;
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      MATCH (r:Requirement)
      ${filters.projectId !== 'all' ? 'MATCH (r)<-[:CONTAINS]-(p:Project)' : ''}
      ${whereClause}
      RETURN r
      ORDER BY r.createdAt DESC
      SKIP $offset
      LIMIT $limit
    `;

    const results = await this.context.neo4j.executeQuery(query, params);
    
    return results.map((record: any) => 
      this.mapNodeToRequirement(record.r)
    ).filter(Boolean) as Requirement[];
  }

  /**
   * Map Neo4j node to Requirement object
   */
  private mapNodeToRequirement(node: any): Requirement | null {
    if (!node || !node.properties) return null;
    
    return {
      id: node.properties.id,
      title: node.properties.title,
      description: node.properties.description || '',
      type: node.properties.type || 'functional',
      status: node.properties.status || 'draft',
      priority: node.properties.priority || 'medium',
      projectId: node.properties.projectId,
      createdAt: node.properties.createdAt,
      updatedAt: node.properties.updatedAt,
      ...node.properties
    };
  }
}