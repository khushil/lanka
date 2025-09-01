/**
 * LANKA Memory System - Graph-Vector Hybrid Storage Service
 * Manages dual representation: Neo4j for relationships, Vector DB for semantics
 */

import { Injectable, Logger } from '@nestjs/common';
import { Driver, Session, Integer } from 'neo4j-driver';
import {
  Memory,
  MemoryQuery,
  MemorySearchResult,
  SimilarMemory,
  GraphNode,
  GraphRelationship,
  MemoryRelationship,
  RelevanceBreakdown,
  SearchContext,
  MemorySystemConfig,
} from '../types/memory.types';

interface VectorSearchResult {
  id: string;
  score: number;
  payload: Record<string, any>;
}

@Injectable()
export class GraphVectorStorageService {
  private readonly logger = new Logger(GraphVectorStorageService.name);
  private readonly neo4jDriver: Driver;
  private readonly vectorClient: any; // Vector DB client (Qdrant/Milvus)

  constructor(
    neo4jDriver: Driver,
    vectorClient: any,
    private readonly config: MemorySystemConfig,
  ) {
    this.neo4jDriver = neo4jDriver;
    this.vectorClient = vectorClient;
  }

  /**
   * Store memory in both graph and vector databases
   */
  async storeMemory(memory: Memory): Promise<string> {
    const session = this.neo4jDriver.session();
    
    try {
      this.logger.debug(`Storing memory ${memory.id} of type ${memory.type}`);

      // Start transaction for consistency
      const result = await session.executeWrite(async tx => {
        // Store in Neo4j as a graph node
        const graphResult = await this.storeMemoryNode(tx, memory);
        
        // Store in vector database for semantic search
        await this.storeMemoryVector(memory);

        // Create relationships if specified
        if (memory.metadata.relationships.length > 0) {
          await this.createRelationships(tx, memory.id, memory.metadata.relationships);
        }

        return graphResult;
      });

      this.logger.log(`Memory ${memory.id} stored successfully`);
      return memory.id;
    } catch (error) {
      this.logger.error(`Failed to store memory ${memory.id}: ${error.message}`, error.stack);
      throw new Error(`Storage failed: ${error.message}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Hybrid search combining vector similarity and graph traversal
   */
  async hybridSearch(query: MemoryQuery): Promise<MemorySearchResult[]> {
    const startTime = Date.now();
    this.logger.debug(`Executing hybrid search with strategy: ${this.determineSearchStrategy(query)}`);

    try {
      const strategy = this.determineSearchStrategy(query);
      let results: MemorySearchResult[] = [];

      switch (strategy) {
        case 'vector_only':
          results = await this.vectorSearch(query);
          break;
        case 'graph_only':
          results = await this.graphSearch(query);
          break;
        case 'hybrid':
          results = await this.executeHybridSearch(query);
          break;
      }

      // Apply filters and sorting
      results = this.applyFilters(results, query);
      results = this.sortResults(results);

      // Limit results
      if (query.limit) {
        results = results.slice(0, query.limit);
      }

      const searchTime = Date.now() - startTime;
      this.logger.debug(`Hybrid search completed: ${results.length} results in ${searchTime}ms`);

      return results.map(result => ({
        ...result,
        context: {
          ...result.context,
          searchTime,
          strategy,
        },
      }));
    } catch (error) {
      this.logger.error(`Hybrid search failed: ${error.message}`, error.stack);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Find similar memories for arbitration
   */
  async findSimilarMemories(query: MemoryQuery): Promise<SimilarMemory[]> {
    const results: SimilarMemory[] = [];

    try {
      // Semantic similarity via vector search
      if (query.embedding) {
        const vectorResults = await this.searchVectorDatabase(query.embedding, query.workspace, 20);
        results.push(...vectorResults.map(r => ({
          memoryId: r.id,
          similarity: r.score,
          type: 'semantic' as const,
          comparisonMethod: 'cosine_similarity',
        })));
      }

      // Structural similarity via graph traversal
      if (query.text) {
        const structuralResults = await this.findStructurallySimilar(query);
        results.push(...structuralResults);
      }

      // Contextual similarity (same workspace, tags, etc.)
      const contextualResults = await this.findContextuallySimilar(query);
      results.push(...contextualResults);

      // Remove duplicates and sort by similarity
      const uniqueResults = this.deduplicateSimilarMemories(results);
      return uniqueResults.sort((a, b) => b.similarity - a.similarity);
    } catch (error) {
      this.logger.error(`Failed to find similar memories: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Get memory by ID
   */
  async getMemoryById(id: string): Promise<Memory | null> {
    const session = this.neo4jDriver.session();
    
    try {
      const result = await session.executeRead(tx =>
        tx.run(
          `
          MATCH (m:Memory {id: $id})
          OPTIONAL MATCH (m)-[r]->(related:Memory)
          RETURN m, collect({relationship: r, target: related}) as relationships
          `,
          { id },
        ),
      );

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      const memoryNode = record.get('m').properties;
      const relationships = record.get('relationships');

      return this.nodeToMemory(memoryNode, relationships);
    } catch (error) {
      this.logger.error(`Failed to get memory ${id}: ${error.message}`, error.stack);
      return null;
    } finally {
      await session.close();
    }
  }

  /**
   * Update memory
   */
  async updateMemory(id: string, updates: Partial<Memory>): Promise<void> {
    const session = this.neo4jDriver.session();
    
    try {
      await session.executeWrite(async tx => {
        // Update Neo4j node
        await this.updateMemoryNode(tx, id, updates);
        
        // Update vector database if embedding changed
        if (updates.embedding) {
          await this.updateMemoryVector(id, updates);
        }
      });

      this.logger.debug(`Memory ${id} updated successfully`);
    } catch (error) {
      this.logger.error(`Failed to update memory ${id}: ${error.message}`, error.stack);
      throw new Error(`Update failed: ${error.message}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Get analytics for memory system
   */
  async getAnalytics(workspace?: string): Promise<any> {
    const session = this.neo4jDriver.session();
    
    try {
      const query = workspace
        ? `
          MATCH (m:Memory {workspace: $workspace})
          WITH m
          RETURN 
            count(m) as totalMemories,
            collect(distinct m.type) as memoryTypes,
            avg(m.quality.overall) as avgQuality,
            avg(m.accessCount) as avgAccessCount,
            min(m.createdAt) as oldestMemory,
            max(m.createdAt) as newestMemory
          `
        : `
          MATCH (m:Memory)
          WITH m
          RETURN 
            count(m) as totalMemories,
            collect(distinct m.type) as memoryTypes,
            avg(m.quality.overall) as avgQuality,
            avg(m.accessCount) as avgAccessCount,
            min(m.createdAt) as oldestMemory,
            max(m.createdAt) as newestMemory
          `;

      const result = await session.executeRead(tx =>
        tx.run(query, workspace ? { workspace } : {}),
      );

      if (result.records.length === 0) {
        return this.getEmptyAnalytics();
      }

      const record = result.records[0];
      
      return {
        totalMemories: record.get('totalMemories').toNumber(),
        memoryTypes: this.countByType(record.get('memoryTypes')),
        qualityDistribution: await this.getQualityDistribution(workspace),
        usagePatterns: await this.getUsagePatterns(workspace),
        evolutionHistory: await this.getEvolutionHistory(workspace),
        avgQuality: record.get('avgQuality'),
        avgAccessCount: record.get('avgAccessCount'),
        dateRange: {
          oldest: record.get('oldestMemory'),
          newest: record.get('newestMemory'),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get analytics: ${error.message}`, error.stack);
      throw new Error(`Analytics failed: ${error.message}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Health check for storage systems
   */
  async healthCheck(): Promise<void> {
    try {
      // Check Neo4j connectivity
      await this.checkNeo4jHealth();
      
      // Check vector database connectivity
      await this.checkVectorDatabaseHealth();
      
      this.logger.debug('Storage service health check passed');
    } catch (error) {
      this.logger.error('Storage service health check failed', error.stack);
      throw error;
    }
  }

  // Private implementation methods

  private determineSearchStrategy(query: MemoryQuery): 'vector_only' | 'graph_only' | 'hybrid' {
    if (query.embedding || query.text) {
      if (query.workspace || query.tags?.length) {
        return 'hybrid'; // Both semantic and structural context
      }
      return 'vector_only'; // Pure semantic search
    }
    
    if (query.workspace || query.tags?.length) {
      return 'graph_only'; // Pure structural search
    }
    
    return 'hybrid'; // Default to hybrid for best results
  }

  private async executeHybridSearch(query: MemoryQuery): Promise<MemorySearchResult[]> {
    // Execute both searches in parallel
    const [vectorResults, graphResults] = await Promise.all([
      this.vectorSearch(query),
      this.graphSearch(query),
    ]);

    // Merge and re-rank results
    return this.mergeSearchResults(vectorResults, graphResults, query);
  }

  private async vectorSearch(query: MemoryQuery): Promise<MemorySearchResult[]> {
    if (!query.embedding && !query.text) {
      return [];
    }

    const vectorResults = await this.searchVectorDatabase(
      query.embedding!,
      query.workspace,
      query.limit || 50,
    );

    // Fetch full memory objects from Neo4j
    const memoryIds = vectorResults.map(r => r.id);
    const memories = await this.getMemoriesByIds(memoryIds);

    return vectorResults.map(vr => {
      const memory = memories.find(m => m.id === vr.id);
      if (!memory) return null;

      return {
        memory,
        score: vr.score,
        relevance: {
          semantic: vr.score,
          structural: 0,
          temporal: this.calculateTemporalRelevance(memory),
          quality: memory.quality.overall,
          workspace: query.workspace === memory.workspace ? 1 : 0.5,
          combined: vr.score,
        },
        context: {
          query,
          totalResults: vectorResults.length,
          searchTime: 0,
          strategy: 'vector_only',
        },
      };
    }).filter(Boolean) as MemorySearchResult[];
  }

  private async graphSearch(query: MemoryQuery): Promise<MemorySearchResult[]> {
    const session = this.neo4jDriver.session();
    
    try {
      let cypherQuery = 'MATCH (m:Memory)';
      const params: Record<string, any> = {};

      // Build WHERE conditions
      const conditions: string[] = [];

      if (query.workspace) {
        conditions.push('m.workspace = $workspace');
        params.workspace = query.workspace;
      }

      if (query.type && query.type.length > 0) {
        conditions.push('m.type IN $types');
        params.types = query.type;
      }

      if (query.tags && query.tags.length > 0) {
        conditions.push('any(tag IN $tags WHERE tag IN m.metadata.tags)');
        params.tags = query.tags;
      }

      if (query.minConfidence !== undefined) {
        conditions.push('m.confidence >= $minConfidence');
        params.minConfidence = query.minConfidence;
      }

      if (query.maxAge !== undefined) {
        const cutoffDate = new Date(Date.now() - query.maxAge * 24 * 60 * 60 * 1000);
        conditions.push('m.createdAt >= $cutoffDate');
        params.cutoffDate = cutoffDate.toISOString();
      }

      if (!query.includeDeprecated) {
        conditions.push('m.metadata.deprecationReason IS NULL');
      }

      if (conditions.length > 0) {
        cypherQuery += ' WHERE ' + conditions.join(' AND ');
      }

      cypherQuery += ' RETURN m ORDER BY m.quality.overall DESC, m.accessCount DESC';

      if (query.limit) {
        cypherQuery += ' LIMIT $limit';
        params.limit = Integer.fromNumber(query.limit);
      }

      const result = await session.executeRead(tx => tx.run(cypherQuery, params));

      return result.records.map(record => {
        const memory = this.nodeToMemory(record.get('m').properties);
        
        return {
          memory,
          score: this.calculateGraphScore(memory, query),
          relevance: {
            semantic: 0,
            structural: this.calculateStructuralRelevance(memory, query),
            temporal: this.calculateTemporalRelevance(memory),
            quality: memory.quality.overall,
            workspace: query.workspace === memory.workspace ? 1 : 0.5,
            combined: this.calculateGraphScore(memory, query),
          },
          context: {
            query,
            totalResults: result.records.length,
            searchTime: 0,
            strategy: 'graph_only',
          },
        };
      });
    } finally {
      await session.close();
    }
  }

  private async storeMemoryNode(tx: any, memory: Memory): Promise<any> {
    const query = `
      CREATE (m:Memory {
        id: $id,
        type: $type,
        content: $content,
        confidence: $confidence,
        workspace: $workspace,
        createdAt: $createdAt,
        updatedAt: $updatedAt,
        accessCount: $accessCount,
        lastAccessedAt: $lastAccessedAt,
        quality: $quality,
        metadata: $metadata
      })
      RETURN m
    `;

    const params = {
      id: memory.id,
      type: memory.type,
      content: memory.content,
      confidence: memory.confidence,
      workspace: memory.workspace,
      createdAt: memory.createdAt.toISOString(),
      updatedAt: memory.updatedAt.toISOString(),
      accessCount: Integer.fromNumber(memory.accessCount),
      lastAccessedAt: memory.lastAccessedAt.toISOString(),
      quality: memory.quality,
      metadata: memory.metadata,
    };

    return tx.run(query, params);
  }

  private async storeMemoryVector(memory: Memory): Promise<void> {
    const collectionName = `memories_${memory.type}`;
    
    await this.vectorClient.upsert({
      collection: collectionName,
      points: [{
        id: memory.id,
        vector: memory.embedding,
        payload: {
          workspace: memory.workspace,
          type: memory.type,
          confidence: memory.confidence,
          quality: memory.quality.overall,
          createdAt: memory.createdAt.toISOString(),
          tags: memory.metadata.tags,
        },
      }],
    });
  }

  private async searchVectorDatabase(
    embedding: number[],
    workspace?: string,
    limit: number = 10,
  ): Promise<VectorSearchResult[]> {
    const collections = Object.keys(this.config.storage.vector.collections);
    const searches = collections.map(async collection => {
      const filter: any = {};
      if (workspace) {
        filter.workspace = workspace;
      }

      return this.vectorClient.search({
        collection,
        vector: embedding,
        filter,
        limit,
        withPayload: true,
      });
    });

    const results = await Promise.all(searches);
    
    // Flatten and sort results
    const allResults = results.flat().map(r => ({
      id: r.id,
      score: r.score,
      payload: r.payload,
    }));

    return allResults
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async createRelationships(
    tx: any,
    memoryId: string,
    relationships: MemoryRelationship[],
  ): Promise<void> {
    for (const rel of relationships) {
      const query = `
        MATCH (source:Memory {id: $sourceId})
        MATCH (target:Memory {id: $targetId})
        CREATE (source)-[r:${rel.type} {
          strength: $strength,
          context: $context,
          createdAt: $createdAt
        }]->(target)
        RETURN r
      `;

      await tx.run(query, {
        sourceId: memoryId,
        targetId: rel.targetId,
        strength: rel.strength,
        context: rel.context,
        createdAt: rel.createdAt.toISOString(),
      });
    }
  }

  private nodeToMemory(node: any, relationships?: any[]): Memory {
    // Convert Neo4j node back to Memory object
    // This is a simplified version - full implementation would handle all memory types
    return {
      id: node.id,
      type: node.type,
      content: node.content,
      embedding: [], // Would need to fetch from vector DB
      confidence: node.confidence,
      workspace: node.workspace,
      createdAt: new Date(node.createdAt),
      updatedAt: new Date(node.updatedAt),
      accessCount: node.accessCount.toNumber(),
      lastAccessedAt: new Date(node.lastAccessedAt),
      quality: node.quality,
      metadata: {
        ...node.metadata,
        relationships: relationships || [],
      },
    } as Memory;
  }

  private async getMemoriesByIds(ids: string[]): Promise<Memory[]> {
    if (ids.length === 0) return [];

    const session = this.neo4jDriver.session();
    try {
      const result = await session.executeRead(tx =>
        tx.run('MATCH (m:Memory) WHERE m.id IN $ids RETURN m', { ids }),
      );

      return result.records.map(record => 
        this.nodeToMemory(record.get('m').properties),
      );
    } finally {
      await session.close();
    }
  }

  private calculateGraphScore(memory: Memory, query: MemoryQuery): number {
    let score = 0.5; // Base score

    // Quality weight
    score += memory.quality.overall * 0.3;

    // Recency weight
    const daysSinceCreated = (Date.now() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const recencyBonus = Math.max(0, (30 - daysSinceCreated) / 30) * 0.2;
    score += recencyBonus;

    // Usage weight
    const usageBonus = Math.min(memory.accessCount / 100, 1) * 0.1;
    score += usageBonus;

    return Math.min(score, 1);
  }

  private calculateStructuralRelevance(memory: Memory, query: MemoryQuery): number {
    let relevance = 0;

    if (query.workspace === memory.workspace) relevance += 0.3;
    if (query.type?.includes(memory.type)) relevance += 0.2;
    if (query.tags?.some(tag => memory.metadata.tags.includes(tag))) relevance += 0.3;

    return Math.min(relevance, 1);
  }

  private calculateTemporalRelevance(memory: Memory): number {
    const daysSinceAccessed = (Date.now() - memory.lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, (7 - daysSinceAccessed) / 7); // Decay over 7 days
  }

  private mergeSearchResults(
    vectorResults: MemorySearchResult[],
    graphResults: MemorySearchResult[],
    query: MemoryQuery,
  ): MemorySearchResult[] {
    const merged = new Map<string, MemorySearchResult>();

    // Add vector results
    vectorResults.forEach(result => {
      merged.set(result.memory.id, result);
    });

    // Merge graph results
    graphResults.forEach(graphResult => {
      const existing = merged.get(graphResult.memory.id);
      if (existing) {
        // Combine scores
        const combinedScore = (existing.score * 0.7) + (graphResult.score * 0.3);
        merged.set(graphResult.memory.id, {
          ...existing,
          score: combinedScore,
          relevance: {
            semantic: existing.relevance.semantic,
            structural: graphResult.relevance.structural,
            temporal: Math.max(existing.relevance.temporal, graphResult.relevance.temporal),
            quality: existing.relevance.quality,
            workspace: Math.max(existing.relevance.workspace, graphResult.relevance.workspace),
            combined: combinedScore,
          },
        });
      } else {
        merged.set(graphResult.memory.id, graphResult);
      }
    });

    return Array.from(merged.values());
  }

  private applyFilters(results: MemorySearchResult[], query: MemoryQuery): MemorySearchResult[] {
    return results.filter(result => {
      if (query.minConfidence && result.memory.confidence < query.minConfidence) {
        return false;
      }

      if (query.maxAge) {
        const daysSinceCreated = (Date.now() - result.memory.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreated > query.maxAge) {
          return false;
        }
      }

      if (!query.includeDeprecated && result.memory.metadata.deprecationReason) {
        return false;
      }

      return true;
    });
  }

  private sortResults(results: MemorySearchResult[]): MemorySearchResult[] {
    return results.sort((a, b) => b.relevance.combined - a.relevance.combined);
  }

  private async findStructurallySimilar(query: MemoryQuery): Promise<SimilarMemory[]> {
    // Placeholder for structural similarity analysis
    return [];
  }

  private async findContextuallySimilar(query: MemoryQuery): Promise<SimilarMemory[]> {
    // Placeholder for contextual similarity analysis
    return [];
  }

  private deduplicateSimilarMemories(memories: SimilarMemory[]): SimilarMemory[] {
    const seen = new Set<string>();
    return memories.filter(memory => {
      if (seen.has(memory.memoryId)) {
        return false;
      }
      seen.add(memory.memoryId);
      return true;
    });
  }

  private countByType(types: string[]): Record<string, number> {
    return types.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private async getQualityDistribution(workspace?: string): Promise<Record<string, number>> {
    // Placeholder - would implement actual quality distribution calculation
    return { high: 0, medium: 0, low: 0 };
  }

  private async getUsagePatterns(workspace?: string): Promise<Record<string, number>> {
    // Placeholder - would implement actual usage pattern analysis
    return { daily: 0, weekly: 0, monthly: 0 };
  }

  private async getEvolutionHistory(workspace?: string): Promise<any[]> {
    // Placeholder - would implement actual evolution history retrieval
    return [];
  }

  private getEmptyAnalytics(): any {
    return {
      totalMemories: 0,
      memoryTypes: {},
      qualityDistribution: { high: 0, medium: 0, low: 0 },
      usagePatterns: { daily: 0, weekly: 0, monthly: 0 },
      evolutionHistory: [],
      avgQuality: 0,
      avgAccessCount: 0,
      dateRange: { oldest: null, newest: null },
    };
  }

  private async checkNeo4jHealth(): Promise<void> {
    const session = this.neo4jDriver.session();
    try {
      await session.run('RETURN 1');
    } finally {
      await session.close();
    }
  }

  private async checkVectorDatabaseHealth(): Promise<void> {
    // Placeholder for vector database health check
    // Implementation depends on vector database provider
  }

  private async updateMemoryNode(tx: any, id: string, updates: Partial<Memory>): Promise<any> {
    // Build dynamic update query
    const setStatements: string[] = [];
    const params: Record<string, any> = { id };

    Object.keys(updates).forEach((key, index) => {
      if (updates[key as keyof Memory] !== undefined) {
        const paramName = `param${index}`;
        setStatements.push(`m.${key} = $${paramName}`);
        params[paramName] = updates[key as keyof Memory];
      }
    });

    if (setStatements.length === 0) {
      return;
    }

    const query = `
      MATCH (m:Memory {id: $id})
      SET ${setStatements.join(', ')}, m.updatedAt = $updatedAt
      RETURN m
    `;

    params.updatedAt = new Date().toISOString();

    return tx.run(query, params);
  }

  private async updateMemoryVector(id: string, updates: Partial<Memory>): Promise<void> {
    if (!updates.embedding) return;

    // Update vector in all relevant collections
    const collections = Object.keys(this.config.storage.vector.collections);
    
    for (const collection of collections) {
      await this.vectorClient.upsert({
        collection,
        points: [{
          id,
          vector: updates.embedding,
        }],
      });
    }
  }
}