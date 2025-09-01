/**
 * LANKA Memory System - Memory Orchestrator Service
 * Central nervous system coordinating all memory operations
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  Memory,
  MemoryQuery,
  MemorySearchResult,
  MemoryArbitrationResult,
  QualityScore,
  MemorySystemConfig,
  ArbitrationAudit,
  SimilarMemory,
  System1Memory,
  System2Memory,
  WorkspaceMemory,
} from '../types/memory.types';
import { MemoryArbitrationService } from './memory-arbitration.service';
import { GraphVectorStorageService } from './graph-vector-storage.service';
import { QualityGateService } from './quality-gate.service';
import { EmbeddingService } from './embedding.service';
import { EvolutionEngineService } from './evolution-engine.service';
import { AuditService } from './audit.service';

@Injectable()
export class MemoryOrchestratorService {
  private readonly logger = new Logger(MemoryOrchestratorService.name);

  constructor(
    private readonly arbitrationService: MemoryArbitrationService,
    private readonly storageService: GraphVectorStorageService,
    private readonly qualityGateService: QualityGateService,
    private readonly embeddingService: EmbeddingService,
    private readonly evolutionEngine: EvolutionEngineService,
    private readonly auditService: AuditService,
    private readonly config: MemorySystemConfig,
  ) {}

  /**
   * Ingestion Pipeline: Process potential memories from development activities
   */
  async ingestMemory(
    content: string,
    type: Memory['type'],
    workspace: string,
    context: {
      source: string;
      tags: string[];
      metadata?: Record<string, unknown>;
    },
  ): Promise<MemoryArbitrationResult> {
    const startTime = Date.now();
    this.logger.debug(`Starting memory ingestion for ${type} memory in workspace ${workspace}`);

    try {
      // Step 1: Generate embedding for semantic analysis
      const embedding = await this.embeddingService.generateEmbedding(content);

      // Step 2: Find similar existing memories
      const similarMemories = await this.findSimilarMemories(embedding, workspace, type);

      // Step 3: Assess quality against gates
      const qualityScore = await this.qualityGateService.assessQuality(content, type, context);

      if (qualityScore.overall < this.config.arbitration.quality.minimumScore) {
        return this.createRejectionResult('Quality score below minimum threshold', qualityScore);
      }

      // Step 4: Perform arbitration decision
      const arbitrationResult = await this.arbitrationService.arbitrateMemory({
        content,
        type,
        workspace,
        embedding,
        similarMemories,
        qualityScore,
        context,
      });

      // Step 5: Execute the arbitration decision
      await this.executeArbitrationDecision(arbitrationResult, {
        content,
        type,
        workspace,
        embedding,
        context,
        qualityScore,
      });

      // Step 6: Log audit trail
      await this.auditService.logArbitration(arbitrationResult);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Memory ingestion completed: ${arbitrationResult.decision} (${duration}ms)`,
      );

      return arbitrationResult;
    } catch (error) {
      this.logger.error(`Memory ingestion failed: ${error.message}`, error.stack);
      throw new Error(`Failed to ingest memory: ${error.message}`);
    }
  }

  /**
   * Search and retrieve memories using hybrid vector-graph approach
   */
  async searchMemories(query: MemoryQuery): Promise<MemorySearchResult[]> {
    const startTime = Date.now();
    this.logger.debug(`Searching memories with query: ${JSON.stringify(query)}`);

    try {
      // Generate embedding for text queries
      let queryEmbedding: number[] | undefined;
      if (query.text) {
        queryEmbedding = await this.embeddingService.generateEmbedding(query.text);
      } else if (query.embedding) {
        queryEmbedding = query.embedding;
      }

      // Execute hybrid search strategy
      const results = await this.storageService.hybridSearch({
        ...query,
        embedding: queryEmbedding,
      });

      // Update access patterns for retrieved memories
      await this.updateAccessPatterns(results.map(r => r.memory.id));

      const duration = Date.now() - startTime;
      this.logger.debug(`Memory search completed: ${results.length} results (${duration}ms)`);

      return results;
    } catch (error) {
      this.logger.error(`Memory search failed: ${error.message}`, error.stack);
      throw new Error(`Failed to search memories: ${error.message}`);
    }
  }

  /**
   * Evolution Pipeline: Continuous improvement of memory quality
   */
  async evolveMemory(memoryId: string): Promise<void> {
    this.logger.debug(`Starting memory evolution for ${memoryId}`);

    try {
      const memory = await this.storageService.getMemoryById(memoryId);
      if (!memory) {
        throw new Error(`Memory not found: ${memoryId}`);
      }

      // Analyze usage patterns
      const usageAnalysis = await this.evolutionEngine.analyzeUsagePatterns(memory);

      // Check for contradictions
      const contradictions = await this.evolutionEngine.detectContradictions(memory);

      // Identify merge opportunities
      const mergeOpportunities = await this.evolutionEngine.findMergeOpportunities(memory);

      // Apply evolution strategies
      if (contradictions.length > 0) {
        await this.evolutionEngine.resolveContradictions(memory, contradictions);
      }

      if (mergeOpportunities.length > 0) {
        await this.evolutionEngine.executeMerges(memory, mergeOpportunities);
      }

      // Update memory strength based on usage
      await this.evolutionEngine.updateMemoryStrength(memory, usageAnalysis);

      this.logger.log(`Memory evolution completed for ${memoryId}`);
    } catch (error) {
      this.logger.error(`Memory evolution failed for ${memoryId}: ${error.message}`, error.stack);
      throw new Error(`Failed to evolve memory: ${error.message}`);
    }
  }

  /**
   * Batch memory operations for performance
   */
  async batchIngestMemories(
    memories: Array<{
      content: string;
      type: Memory['type'];
      workspace: string;
      context: any;
    }>,
  ): Promise<MemoryArbitrationResult[]> {
    this.logger.log(`Starting batch ingestion of ${memories.length} memories`);

    const results: MemoryArbitrationResult[] = [];
    const batchSize = 10; // Process in batches to avoid overwhelming services

    for (let i = 0; i < memories.length; i += batchSize) {
      const batch = memories.slice(i, i + batchSize);
      const batchPromises = batch.map(memory =>
        this.ingestMemory(memory.content, memory.type, memory.workspace, memory.context),
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          this.logger.error(`Batch ingestion failed for memory ${i + index}: ${result.reason}`);
          results.push(this.createRejectionResult(`Batch processing failed: ${result.reason}`));
        }
      });

      // Small delay between batches to prevent overwhelming the system
      if (i + batchSize < memories.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    this.logger.log(`Batch ingestion completed: ${results.length} results`);
    return results;
  }

  /**
   * Get memory analytics and insights
   */
  async getMemoryAnalytics(workspace?: string): Promise<{
    totalMemories: number;
    memoryTypes: Record<string, number>;
    qualityDistribution: Record<string, number>;
    usagePatterns: Record<string, number>;
    evolutionHistory: any[];
  }> {
    try {
      const analytics = await this.storageService.getAnalytics(workspace);
      return analytics;
    } catch (error) {
      this.logger.error(`Failed to get memory analytics: ${error.message}`, error.stack);
      throw new Error(`Failed to retrieve memory analytics: ${error.message}`);
    }
  }

  /**
   * Validate memory system health
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, { status: string; latency?: number; error?: string }>;
  }> {
    const health = {
      status: 'healthy' as const,
      components: {} as Record<string, { status: string; latency?: number; error?: string }>,
    };

    try {
      // Check storage service
      const storageStart = Date.now();
      await this.storageService.healthCheck();
      health.components.storage = {
        status: 'healthy',
        latency: Date.now() - storageStart,
      };
    } catch (error) {
      health.components.storage = { status: 'unhealthy', error: error.message };
      health.status = 'unhealthy';
    }

    try {
      // Check embedding service
      const embeddingStart = Date.now();
      await this.embeddingService.healthCheck();
      health.components.embedding = {
        status: 'healthy',
        latency: Date.now() - embeddingStart,
      };
    } catch (error) {
      health.components.embedding = { status: 'unhealthy', error: error.message };
      health.status = 'unhealthy';
    }

    try {
      // Check arbitration service
      const arbitrationStart = Date.now();
      await this.arbitrationService.healthCheck();
      health.components.arbitration = {
        status: 'healthy',
        latency: Date.now() - arbitrationStart,
      };
    } catch (error) {
      health.components.arbitration = { status: 'unhealthy', error: error.message };
      if (health.status === 'healthy') health.status = 'degraded';
    }

    return health;
  }

  // Private helper methods

  private async findSimilarMemories(
    embedding: number[],
    workspace: string,
    type: Memory['type'],
  ): Promise<SimilarMemory[]> {
    return this.storageService.findSimilarMemories({
      embedding,
      workspace,
      type: [type],
      limit: 10,
    });
  }

  private async executeArbitrationDecision(
    result: MemoryArbitrationResult,
    data: {
      content: string;
      type: Memory['type'];
      workspace: string;
      embedding: number[];
      context: any;
      qualityScore: QualityScore;
    },
  ): Promise<void> {
    switch (result.decision) {
      case 'ADD':
        await this.createNewMemory(data);
        break;
      case 'UPDATE':
        if (result.targetMemoryId) {
          await this.updateExistingMemory(result.targetMemoryId, data);
        }
        break;
      case 'MERGE':
        if (result.targetMemoryId && result.mergeStrategy) {
          await this.mergeMemories(result.targetMemoryId, data, result.mergeStrategy);
        }
        break;
      case 'DEPRECATE':
        if (result.targetMemoryId) {
          await this.deprecateMemory(result.targetMemoryId);
        }
        break;
      case 'REJECT':
        // No action needed for rejections
        break;
    }
  }

  private async createNewMemory(data: {
    content: string;
    type: Memory['type'];
    workspace: string;
    embedding: number[];
    context: any;
    qualityScore: QualityScore;
  }): Promise<string> {
    const baseMemory = {
      id: this.generateMemoryId(),
      content: data.content,
      embedding: data.embedding,
      confidence: data.qualityScore.overall,
      workspace: data.workspace,
      createdAt: new Date(),
      updatedAt: new Date(),
      accessCount: 0,
      lastAccessedAt: new Date(),
      quality: data.qualityScore,
      metadata: {
        source: data.context.source,
        context: data.context.metadata?.context || '',
        tags: data.context.tags,
        relationships: [],
        version: 1,
      },
    };

    let memory: Memory;

    switch (data.type) {
      case 'system1':
        memory = {
          ...baseMemory,
          type: 'system1',
          pattern: this.extractPattern(data.content),
          trigger: data.context.tags,
          responseTime: 0,
          strengthScore: 0.5,
          relatedPatterns: [],
        } as System1Memory;
        break;
      case 'system2':
        memory = {
          ...baseMemory,
          type: 'system2',
          reasoning: {
            id: this.generateMemoryId(),
            startTime: new Date(),
            endTime: new Date(),
            context: data.context.metadata?.context || '',
            goal: data.context.metadata?.goal || '',
            assumptions: [],
            constraints: [],
            approach: data.content,
            validation: [],
          },
          problem: data.context.metadata?.problem || '',
          solution: data.content,
          steps: [],
          complexity: 'moderate',
          validationCount: 0,
          teachingValue: data.qualityScore.utility,
        } as System2Memory;
        break;
      case 'workspace':
        memory = {
          ...baseMemory,
          type: 'workspace',
          scope: {
            project: data.workspace,
            modules: [],
            team: data.context.metadata?.team || '',
            visibility: 'team',
          },
          convention: data.content,
          agreement: {
            decision: data.content,
            rationale: data.context.metadata?.rationale || '',
            alternatives: [],
            decisionDate: new Date(),
            participants: [],
            consensus: 0.8,
          },
          evolution: [],
          consensus: 'team',
          contributors: [],
        } as WorkspaceMemory;
        break;
    }

    return this.storageService.storeMemory(memory);
  }

  private async updateExistingMemory(memoryId: string, data: any): Promise<void> {
    await this.storageService.updateMemory(memoryId, {
      content: data.content,
      embedding: data.embedding,
      updatedAt: new Date(),
      quality: data.qualityScore,
      'metadata.version': data.metadata?.version + 1 || 2,
    });
  }

  private async mergeMemories(targetId: string, data: any, strategy: string): Promise<void> {
    // Implementation depends on merge strategy
    this.logger.debug(`Merging memory ${targetId} with strategy ${strategy}`);
    // TODO: Implement different merge strategies
  }

  private async deprecateMemory(memoryId: string): Promise<void> {
    await this.storageService.updateMemory(memoryId, {
      'metadata.deprecationReason': 'Superseded by new information',
      updatedAt: new Date(),
    });
  }

  private async updateAccessPatterns(memoryIds: string[]): Promise<void> {
    const now = new Date();
    const updates = memoryIds.map(id =>
      this.storageService.updateMemory(id, {
        accessCount: { $inc: 1 },
        lastAccessedAt: now,
      }),
    );

    await Promise.all(updates);
  }

  private createRejectionResult(reason: string, qualityScore?: QualityScore): MemoryArbitrationResult {
    return {
      decision: 'REJECT',
      confidence: 1.0,
      reasoning: reason,
      auditTrail: {
        arbitrationId: this.generateMemoryId(),
        timestamp: new Date(),
        inputHash: '',
        similarMemories: [],
        llmReasoning: reason,
        qualityAssessment: qualityScore || {
          novelty: 0,
          accuracy: 0,
          utility: 0,
          clarity: 0,
          validation: 0,
          overall: 0,
        },
        riskAssessment: {
          contradiction: 0,
          obsolescence: 0,
          security: 0,
          quality: 0,
          overall: 0,
        },
        reviewRequired: false,
      },
    };
  }

  private generateMemoryId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractPattern(content: string): string {
    // Simple pattern extraction - could be enhanced with ML
    const patterns = content.match(/\b\w+\(\)/g); // Function calls
    return patterns?.[0] || content.substring(0, 50);
  }
}