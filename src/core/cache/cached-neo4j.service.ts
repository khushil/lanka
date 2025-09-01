/**
 * Cached Neo4j Service
 * Wraps Neo4j operations with intelligent caching strategies
 */

import { Neo4jService } from '../database/neo4j';
import { CacheManager, CacheTier } from './cache.manager';
import { logger } from '../logging/logger';
import * as crypto from 'crypto';

export interface QueryCacheOptions {
  tier?: CacheTier;
  ttl?: number;
  skipCache?: boolean;
  invalidatePattern?: string;
  version?: string;
}

export interface CachedQueryResult {
  data: any;
  fromCache: boolean;
  cacheKey?: string;
  executionTime: number;
}

export class CachedNeo4jService {
  private neo4j: Neo4jService;
  private cache: CacheManager;
  private readonly namespace = 'neo4j';

  constructor() {
    this.neo4j = Neo4jService.getInstance();
    this.cache = new CacheManager();
  }

  private generateCacheKey(query: string, params: Record<string, any>, database?: string): string {
    // Create deterministic cache key from query and parameters
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();
    const sortedParams = Object.keys(params).sort().reduce((sorted, key) => {
      sorted[key] = params[key];
      return sorted;
    }, {} as Record<string, any>);

    const payload = {
      query: normalizedQuery,
      params: sortedParams,
      database: database || 'default'
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex')
      .substring(0, 32); // Use first 32 chars for readability
  }

  private shouldCache(query: string): boolean {
    const readOnlyPatterns = [
      /^MATCH\s/i,
      /^CALL\s.*\.list/i,
      /^CALL\s.*\.search/i,
      /^RETURN\s/i,
      /^WITH\s/i,
      /^UNWIND\s/i
    ];

    const writePatterns = [
      /^CREATE\s/i,
      /^MERGE\s/i,
      /^SET\s/i,
      /^DELETE\s/i,
      /^REMOVE\s/i,
      /^DETACH\s/i
    ];

    // Don't cache write operations
    if (writePatterns.some(pattern => pattern.test(query.trim()))) {
      return false;
    }

    // Cache read operations
    return readOnlyPatterns.some(pattern => pattern.test(query.trim()));
  }

  private determineCacheTier(query: string): CacheTier {
    // Frequently accessed patterns get hot cache
    const hotPatterns = [
      /requirement.*status/i,
      /project.*active/i,
      /stakeholder.*role/i,
      /architecture.*current/i
    ];

    // Reference data gets cold cache (longer TTL)
    const coldPatterns = [
      /pattern.*type/i,
      /technology.*stack/i,
      /organization.*structure/i,
      /template.*definition/i
    ];

    if (hotPatterns.some(pattern => pattern.test(query))) {
      return CacheTier.HOT;
    }

    if (coldPatterns.some(pattern => pattern.test(query))) {
      return CacheTier.COLD;
    }

    return CacheTier.WARM; // Default to warm cache
  }

  async executeQuery(
    query: string,
    params: Record<string, any> = {},
    database?: string,
    cacheOptions: QueryCacheOptions = {}
  ): Promise<CachedQueryResult> {
    const startTime = Date.now();

    // Skip cache if explicitly requested or for write operations
    if (cacheOptions.skipCache || !this.shouldCache(query)) {
      try {
        const data = await this.neo4j.executeQuery(query, params, database);
        return {
          data,
          fromCache: false,
          executionTime: Date.now() - startTime
        };
      } catch (error) {
        logger.error('Neo4j query execution failed', { query, params, error });
        throw error;
      }
    }

    // Generate cache key and check cache
    const cacheKey = this.generateCacheKey(query, params, database);
    
    try {
      // Try to get from cache first
      const cached = await this.cache.get<any>(cacheKey, {
        namespace: this.namespace,
        version: cacheOptions.version
      });

      if (cached) {
        logger.debug('Neo4j query served from cache', {
          cacheKey: cacheKey.substring(0, 8) + '...',
          query: query.substring(0, 50) + '...',
          executionTime: Date.now() - startTime
        });

        return {
          data: cached,
          fromCache: true,
          cacheKey,
          executionTime: Date.now() - startTime
        };
      }

      // Execute query if not in cache
      const data = await this.neo4j.executeQuery(query, params, database);
      
      // Cache the result
      const tier = cacheOptions.tier || this.determineCacheTier(query);
      const ttl = cacheOptions.ttl;

      await this.cache.set(cacheKey, data, {
        tier,
        ttl,
        namespace: this.namespace,
        version: cacheOptions.version,
        compress: true // Compress Neo4j results as they can be large
      });

      logger.debug('Neo4j query executed and cached', {
        cacheKey: cacheKey.substring(0, 8) + '...',
        tier,
        resultCount: Array.isArray(data) ? data.length : 1,
        executionTime: Date.now() - startTime
      });

      return {
        data,
        fromCache: false,
        cacheKey,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Cached Neo4j query failed', { query, params, cacheKey, error });
      throw error;
    }
  }

  async executeTransaction(
    work: (tx: any) => Promise<any>,
    database?: string,
    invalidatePatterns: string[] = []
  ): Promise<any> {
    try {
      const result = await this.neo4j.executeTransaction(work, database);
      
      // Invalidate cache patterns after successful transaction
      if (invalidatePatterns.length > 0) {
        await Promise.all(
          invalidatePatterns.map(pattern => 
            this.cache.invalidatePattern(pattern, this.namespace)
          )
        );
        
        logger.debug('Cache invalidated after transaction', { 
          patterns: invalidatePatterns,
          namespace: this.namespace
        });
      }
      
      return result;
    } catch (error) {
      logger.error('Cached Neo4j transaction failed', error);
      throw error;
    }
  }

  // High-level caching methods for common patterns
  async findRequirements(
    filters: Record<string, any> = {},
    cacheOptions: QueryCacheOptions = {}
  ): Promise<CachedQueryResult> {
    const whereClause = Object.keys(filters).length > 0 ? 
      'WHERE ' + Object.keys(filters).map(key => `r.${key} = $${key}`).join(' AND ') :
      '';

    const query = `
      MATCH (r:Requirement)
      ${whereClause}
      RETURN r
      ORDER BY r.createdAt DESC
    `;

    return this.executeQuery(query, filters, undefined, {
      tier: CacheTier.WARM,
      ...cacheOptions
    });
  }

  async findSimilarRequirements(
    requirementId: string,
    threshold: number = 0.7,
    cacheOptions: QueryCacheOptions = {}
  ): Promise<CachedQueryResult> {
    const query = `
      MATCH (r:Requirement {id: $requirementId})
      MATCH (other:Requirement)<-[:CONTAINS]-(p:Project)
      WHERE other.id <> r.id
      WITH r, other, p,
           apoc.text.jaroWinklerDistance(
             toLower(r.description),
             toLower(other.description)
           ) AS similarity
      WHERE similarity > $threshold
      OPTIONAL MATCH (other)-[:SATISFIES]->(outcome:Outcome)
      RETURN 
        other.id AS id,
        other.title AS title,
        other.description AS description,
        similarity,
        p.name AS projectName,
        collect(outcome) AS outcomes
      ORDER BY similarity DESC
      LIMIT 10
    `;

    return this.executeQuery(query, { requirementId, threshold }, undefined, {
      tier: CacheTier.HOT, // Similarity queries are frequent
      ...cacheOptions
    });
  }

  async getArchitectureDecisions(
    projectId?: string,
    cacheOptions: QueryCacheOptions = {}
  ): Promise<CachedQueryResult> {
    const query = projectId ? `
      MATCH (ad:ArchitectureDecision)-[:BELONGS_TO]->(p:Project {id: $projectId})
      RETURN ad
      ORDER BY ad.createdAt DESC
    ` : `
      MATCH (ad:ArchitectureDecision)
      RETURN ad
      ORDER BY ad.createdAt DESC
    `;

    return this.executeQuery(query, projectId ? { projectId } : {}, undefined, {
      tier: CacheTier.WARM,
      ...cacheOptions
    });
  }

  async getProjectStatistics(
    projectId: string,
    cacheOptions: QueryCacheOptions = {}
  ): Promise<CachedQueryResult> {
    const query = `
      MATCH (p:Project {id: $projectId})
      OPTIONAL MATCH (p)-[:CONTAINS]->(r:Requirement)
      OPTIONAL MATCH (p)-[:HAS_DECISION]->(ad:ArchitectureDecision)
      OPTIONAL MATCH (p)-[:USES]->(ts:TechnologyStack)
      RETURN 
        p.name AS projectName,
        count(DISTINCT r) AS requirementCount,
        count(DISTINCT ad) AS architectureDecisionCount,
        count(DISTINCT ts) AS technologyStackCount,
        count(DISTINCT CASE WHEN r.status = 'completed' THEN r END) AS completedRequirements
    `;

    return this.executeQuery(query, { projectId }, undefined, {
      tier: CacheTier.COLD, // Stats don't change frequently
      ttl: 3600, // 1 hour
      ...cacheOptions
    });
  }

  // Cache management methods
  async invalidateQuery(
    query: string,
    params: Record<string, any> = {},
    database?: string
  ): Promise<boolean> {
    const cacheKey = this.generateCacheKey(query, params, database);
    return await this.cache.del(cacheKey, { namespace: this.namespace });
  }

  async invalidateRequirementCache(requirementId?: string): Promise<number> {
    const patterns = requirementId ? [
      `*requirement*${requirementId}*`,
      `*similar*${requirementId}*`
    ] : [
      '*requirement*',
      '*similar*'
    ];

    let totalInvalidated = 0;
    for (const pattern of patterns) {
      totalInvalidated += await this.cache.invalidatePattern(pattern, this.namespace);
    }
    
    return totalInvalidated;
  }

  async invalidateProjectCache(projectId?: string): Promise<number> {
    const patterns = projectId ? [
      `*project*${projectId}*`,
      `*statistics*${projectId}*`
    ] : [
      '*project*',
      '*statistics*'
    ];

    let totalInvalidated = 0;
    for (const pattern of patterns) {
      totalInvalidated += await this.cache.invalidatePattern(pattern, this.namespace);
    }
    
    return totalInvalidated;
  }

  async invalidateArchitectureCache(architectureId?: string): Promise<number> {
    const patterns = architectureId ? [
      `*architecture*${architectureId}*`,
      `*decision*${architectureId}*`
    ] : [
      '*architecture*',
      '*decision*'
    ];

    let totalInvalidated = 0;
    for (const pattern of patterns) {
      totalInvalidated += await this.cache.invalidatePattern(pattern, this.namespace);
    }
    
    return totalInvalidated;
  }

  async warmCache(queries: Array<{
    query: string;
    params?: Record<string, any>;
    database?: string;
    cacheOptions?: QueryCacheOptions;
  }>): Promise<number> {
    let warmedCount = 0;

    try {
      // Execute queries in parallel but limit concurrency to avoid overwhelming Neo4j
      const batchSize = 5;
      for (let i = 0; i < queries.length; i += batchSize) {
        const batch = queries.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async ({ query, params = {}, database, cacheOptions = {} }) => {
            try {
              await this.executeQuery(query, params, database, {
                ...cacheOptions,
                skipCache: false // Ensure we cache even if query exists
              });
              warmedCount++;
            } catch (error) {
              logger.warn('Cache warming query failed', { query: query.substring(0, 50), error });
            }
          })
        );
      }

      logger.info('Neo4j cache warming completed', {
        totalQueries: queries.length,
        warmedCount,
        namespace: this.namespace
      });

    } catch (error) {
      logger.error('Neo4j cache warming failed', error);
    }

    return warmedCount;
  }

  async getCacheMetrics() {
    return await this.cache.getMetrics(this.namespace);
  }

  async clearCache(): Promise<boolean> {
    return await this.cache.flush(this.namespace);
  }
}