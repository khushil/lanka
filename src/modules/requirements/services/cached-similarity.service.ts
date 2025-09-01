/**
 * Cached Similarity Service
 * High-performance similarity calculations with intelligent caching
 */

import { CachedNeo4jService } from '../../../core/cache/cached-neo4j.service';
import { CacheManager, CacheTier } from '../../../core/cache/cache.manager';
import { Requirement } from '../types/requirement.types';
import { logger } from '../../../core/logging/logger';
import * as crypto from 'crypto';

export interface SimilarRequirement {
  id: string;
  title: string;
  description: string;
  similarity: number;
  projectName: string;
  successMetrics?: {
    implementationTime?: number;
    defectRate?: number;
    stakeholderSatisfaction?: number;
  };
  adaptationGuidelines?: string[];
}

export interface SimilarityCalculationOptions {
  threshold?: number;
  limit?: number;
  skipCache?: boolean;
  warmCache?: boolean;
  includeMetrics?: boolean;
}

export class CachedSimilarityService {
  private neo4j: CachedNeo4jService;
  private cache: CacheManager;
  private readonly namespace = 'similarity';

  constructor() {
    this.neo4j = new CachedNeo4jService();
    this.cache = new CacheManager();
  }

  private generateSimilarityKey(requirement: Requirement, options: SimilarityCalculationOptions): string {
    const payload = {
      requirementId: requirement.id,
      description: requirement.description?.substring(0, 100) || '', // First 100 chars for key
      type: requirement.type,
      threshold: options.threshold || 0.7,
      limit: options.limit || 10,
      includeMetrics: options.includeMetrics || false
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex')
      .substring(0, 24);
  }

  async findSimilarRequirements(
    requirement: Requirement,
    options: SimilarityCalculationOptions = {}
  ): Promise<SimilarRequirement[]> {
    const threshold = options.threshold || 0.7;
    const limit = options.limit || 10;
    const cacheKey = this.generateSimilarityKey(requirement, options);

    try {
      // Check cache first unless explicitly skipped
      if (!options.skipCache) {
        const cached = await this.cache.get<SimilarRequirement[]>(cacheKey, {
          namespace: this.namespace,
          tier: CacheTier.HOT // Similarity queries are frequent
        });

        if (cached) {
          logger.debug('Similarity calculation served from cache', {
            requirementId: requirement.id,
            cacheKey: cacheKey.substring(0, 8) + '...',
            resultCount: cached.length
          });
          return cached;
        }
      }

      // Execute similarity calculation
      const result = await this.neo4j.findSimilarRequirements(
        requirement.id,
        threshold,
        { tier: CacheTier.HOT }
      );

      if (!result.data || result.data.length === 0) {
        logger.debug('No similar requirements found', {
          requirementId: requirement.id,
          threshold
        });
        return [];
      }

      // Process and enrich results
      const similarRequirements = result.data
        .slice(0, limit)
        .map((record: any) => this.mapToSimilarRequirement(record));

      // Add success metrics if requested
      if (options.includeMetrics) {
        await this.enrichWithMetrics(similarRequirements);
      }

      // Cache the results
      await this.cache.set(cacheKey, similarRequirements, {
        namespace: this.namespace,
        tier: CacheTier.HOT,
        ttl: 300, // 5 minutes for similarity calculations
        compress: true
      });

      logger.debug('Similarity calculation completed and cached', {
        requirementId: requirement.id,
        resultCount: similarRequirements.length,
        fromCache: result.fromCache,
        executionTime: result.executionTime
      });

      // Warm related caches if requested
      if (options.warmCache) {
        this.warmRelatedCaches(requirement, similarRequirements);
      }

      return similarRequirements;

    } catch (error) {
      logger.error('Similarity calculation failed', {
        requirementId: requirement.id,
        error
      });
      return [];
    }
  }

  async calculateCrossProjectSimilarity(
    requirementId: string,
    options: { skipCache?: boolean } = {}
  ): Promise<Map<string, number>> {
    const cacheKey = `cross-project:${requirementId}`;

    try {
      // Check cache first
      if (!options.skipCache) {
        const cached = await this.cache.get<Record<string, number>>(cacheKey, {
          namespace: this.namespace,
          tier: CacheTier.WARM
        });

        if (cached) {
          return new Map(Object.entries(cached));
        }
      }

      const query = `
        MATCH (r:Requirement {id: $requirementId})
        MATCH (other:Requirement)<-[:CONTAINS]-(p:Project)
        WHERE other.id <> r.id AND p.id <> r.projectId
        WITH r, other, p,
             apoc.text.jaroWinklerDistance(
               toLower(r.description),
               toLower(other.description)
             ) AS similarity
        WHERE similarity > 0.5
        WITH p.id AS projectId, avg(similarity) AS avgSimilarity
        RETURN projectId, avgSimilarity
        ORDER BY avgSimilarity DESC
      `;

      const result = await this.neo4j.executeQuery(query, { requirementId }, undefined, {
        tier: CacheTier.WARM
      });

      const similarityMap = new Map<string, number>();
      const similarityObject: Record<string, number> = {};

      result.data.forEach((record: any) => {
        similarityMap.set(record.projectId, record.avgSimilarity);
        similarityObject[record.projectId] = record.avgSimilarity;
      });

      // Cache the result
      await this.cache.set(cacheKey, similarityObject, {
        namespace: this.namespace,
        tier: CacheTier.WARM,
        ttl: 3600 // 1 hour
      });

      return similarityMap;

    } catch (error) {
      logger.error('Cross-project similarity calculation failed', {
        requirementId,
        error
      });
      return new Map();
    }
  }

  async findExpertiseForRequirement(
    requirement: Requirement,
    options: { skipCache?: boolean; limit?: number } = {}
  ): Promise<any[]> {
    const limit = options.limit || 5;
    const cacheKey = `expertise:${requirement.type}:${limit}`;

    try {
      // Check cache first
      if (!options.skipCache) {
        const cached = await this.cache.get<any[]>(cacheKey, {
          namespace: this.namespace,
          tier: CacheTier.COLD // Expertise data doesn't change frequently
        });

        if (cached) {
          return cached;
        }
      }

      const query = `
        MATCH (similar:Requirement)<-[:OWNS]-(expert:Stakeholder)
        WHERE similar.type = $type
        WITH expert, count(similar) AS requirementCount,
             avg(similar.qualityScore) AS avgQuality
        WHERE requirementCount > 3 AND avgQuality > 0.7
        RETURN 
          expert.id AS expertId,
          expert.name AS expertName,
          expert.email AS expertEmail,
          requirementCount,
          avgQuality
        ORDER BY avgQuality DESC, requirementCount DESC
        LIMIT $limit
      `;

      const result = await this.neo4j.executeQuery(query, {
        type: requirement.type,
        limit
      }, undefined, {
        tier: CacheTier.COLD
      });

      // Cache the result
      await this.cache.set(cacheKey, result.data, {
        namespace: this.namespace,
        tier: CacheTier.COLD,
        ttl: 86400 // 24 hours - expertise data is relatively stable
      });

      return result.data;

    } catch (error) {
      logger.error('Expertise lookup failed', {
        requirementType: requirement.type,
        error
      });
      return [];
    }
  }

  async batchSimilarityCalculation(
    requirements: Requirement[],
    options: SimilarityCalculationOptions = {}
  ): Promise<Map<string, SimilarRequirement[]>> {
    const results = new Map<string, SimilarRequirement[]>();
    const uncachedRequirements: Requirement[] = [];
    const cacheKeys: string[] = [];

    try {
      // Check which requirements are already cached
      for (const requirement of requirements) {
        const cacheKey = this.generateSimilarityKey(requirement, options);
        cacheKeys.push(cacheKey);

        if (!options.skipCache) {
          const cached = await this.cache.get<SimilarRequirement[]>(cacheKey, {
            namespace: this.namespace
          });

          if (cached) {
            results.set(requirement.id, cached);
          } else {
            uncachedRequirements.push(requirement);
          }
        } else {
          uncachedRequirements.push(requirement);
        }
      }

      // Process uncached requirements in batches to avoid overwhelming the database
      const batchSize = 3;
      for (let i = 0; i < uncachedRequirements.length; i += batchSize) {
        const batch = uncachedRequirements.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (requirement) => {
            try {
              const similar = await this.findSimilarRequirements(requirement, {
                ...options,
                skipCache: false // Allow caching for individual calculations
              });
              results.set(requirement.id, similar);
            } catch (error) {
              logger.warn('Batch similarity calculation failed for requirement', {
                requirementId: requirement.id,
                error
              });
              results.set(requirement.id, []);
            }
          })
        );
      }

      logger.info('Batch similarity calculation completed', {
        totalRequirements: requirements.length,
        cachedCount: requirements.length - uncachedRequirements.length,
        calculatedCount: uncachedRequirements.length
      });

      return results;

    } catch (error) {
      logger.error('Batch similarity calculation failed', error);
      return results;
    }
  }

  private async enrichWithMetrics(similarRequirements: SimilarRequirement[]): Promise<void> {
    try {
      // Fetch success metrics for similar requirements
      const requirementIds = similarRequirements.map(sr => sr.id);
      const metricsQuery = `
        MATCH (r:Requirement)
        WHERE r.id IN $requirementIds
        OPTIONAL MATCH (r)-[:SATISFIES]->(outcome:Outcome)
        RETURN 
          r.id AS requirementId,
          outcome.implementationTime AS implementationTime,
          outcome.defectRate AS defectRate,
          outcome.stakeholderSatisfaction AS satisfaction
      `;

      const metricsResult = await this.neo4j.executeQuery(metricsQuery, {
        requirementIds
      }, undefined, {
        tier: CacheTier.WARM
      });

      // Map metrics back to similar requirements
      const metricsMap = new Map<string, any>();
      metricsResult.data.forEach((record: any) => {
        metricsMap.set(record.requirementId, {
          implementationTime: record.implementationTime,
          defectRate: record.defectRate,
          stakeholderSatisfaction: record.satisfaction
        });
      });

      // Enrich similar requirements with metrics
      similarRequirements.forEach(sr => {
        const metrics = metricsMap.get(sr.id);
        if (metrics) {
          sr.successMetrics = metrics;
        }
      });

    } catch (error) {
      logger.error('Failed to enrich similarity results with metrics', error);
    }
  }

  private async warmRelatedCaches(
    originalRequirement: Requirement,
    similarRequirements: SimilarRequirement[]
  ): Promise<void> {
    try {
      // Warm caches for the most similar requirements
      const topSimilar = similarRequirements
        .filter(sr => sr.similarity > 0.8)
        .slice(0, 3);

      const warmingQueries = topSimilar.map(sr => ({
        query: `
          MATCH (r:Requirement {id: $requirementId})
          OPTIONAL MATCH (r)-[:BELONGS_TO]->(p:Project)
          OPTIONAL MATCH (r)-[:HAS_ARCHITECTURE]->(ad:ArchitectureDecision)
          RETURN r, p, collect(ad) AS architectureDecisions
        `,
        params: { requirementId: sr.id },
        cacheOptions: { tier: CacheTier.WARM }
      }));

      await this.neo4j.warmCache(warmingQueries);

    } catch (error) {
      logger.warn('Failed to warm related caches', error);
    }
  }

  private mapToSimilarRequirement(record: any): SimilarRequirement {
    const similar: SimilarRequirement = {
      id: record.id,
      title: record.title,
      description: record.description,
      similarity: record.similarity,
      projectName: record.projectName,
    };

    // Extract success metrics from outcomes if available
    if (record.outcomes && record.outcomes.length > 0) {
      const metrics = record.outcomes[0];
      similar.successMetrics = {
        implementationTime: metrics.implementationTime,
        defectRate: metrics.defectRate,
        stakeholderSatisfaction: metrics.satisfaction,
      };
    }

    // Add adaptation guidelines based on similarity
    similar.adaptationGuidelines = this.generateAdaptationGuidelines(
      record.similarity
    );

    return similar;
  }

  private generateAdaptationGuidelines(similarity: number): string[] {
    const guidelines: string[] = [];

    if (similarity > 0.9) {
      guidelines.push('This requirement is nearly identical - consider direct reuse');
      guidelines.push('Review implementation details for minor context differences');
    } else if (similarity > 0.8) {
      guidelines.push('Strong similarity - adapt existing solution with minor modifications');
      guidelines.push('Pay attention to project-specific constraints');
    } else if (similarity > 0.7) {
      guidelines.push('Moderate similarity - use as template but expect customization');
      guidelines.push('Review acceptance criteria for alignment');
    }

    guidelines.push('Consult with the original implementation team if possible');
    guidelines.push('Document any adaptations for future reference');

    return guidelines;
  }

  // Cache management methods
  async invalidateSimilarityCache(requirementId?: string): Promise<number> {
    const patterns = requirementId ? [
      `*${requirementId}*`,
      `expertise:*`,
      `cross-project:${requirementId}*`
    ] : ['*'];

    let totalInvalidated = 0;
    for (const pattern of patterns) {
      totalInvalidated += await this.cache.invalidatePattern(pattern, this.namespace);
    }

    logger.info('Similarity cache invalidated', {
      requirementId,
      patterns,
      totalInvalidated
    });

    return totalInvalidated;
  }

  async getCacheMetrics() {
    return await this.cache.getMetrics(this.namespace);
  }

  async clearCache(): Promise<boolean> {
    return await this.cache.flush(this.namespace);
  }

  async precomputeSimilarities(requirements: Requirement[]): Promise<number> {
    logger.info('Starting similarity precomputation', {
      requirementCount: requirements.length
    });

    let precomputedCount = 0;
    const batchSize = 5;

    try {
      for (let i = 0; i < requirements.length; i += batchSize) {
        const batch = requirements.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (requirement) => {
            try {
              await this.findSimilarRequirements(requirement, {
                threshold: 0.6, // Lower threshold for precomputation
                warmCache: true
              });
              precomputedCount++;
            } catch (error) {
              logger.warn('Similarity precomputation failed', {
                requirementId: requirement.id,
                error
              });
            }
          })
        );

        // Small delay to avoid overwhelming the system
        if (i + batchSize < requirements.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      logger.info('Similarity precomputation completed', {
        totalRequirements: requirements.length,
        precomputedCount
      });

    } catch (error) {
      logger.error('Similarity precomputation failed', error);
    }

    return precomputedCount;
  }
}