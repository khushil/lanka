import { MemoryOrchestratorService } from '../../../src/modules/memory/services/memory-orchestrator.service';
import { MemoryArbitrationService } from '../../../src/modules/memory/services/memory-arbitration.service';
import { GraphVectorStorageService } from '../../../src/modules/memory/services/graph-vector-storage.service';
import { QualityGateService } from '../../../src/modules/memory/services/quality-gate.service';
import { EmbeddingService } from '../../../src/modules/memory/services/embedding.service';
import { EvolutionEngineService } from '../../../src/modules/memory/services/evolution-engine.service';
import { AuditService } from '../../../src/modules/memory/services/audit.service';
import { 
  MemoryArbitrationResult, 
  QualityScore, 
  MemorySystemConfig,
  MemoryQuery,
  MemorySearchResult,
  Memory
} from '../../../src/modules/memory/types/memory.types';
import { createMock } from 'jest-mock-extended';
import { Logger } from '@nestjs/common';

// London School TDD: Mock all collaborators
jest.mock('@nestjs/common');

describe('MemoryOrchestratorService', () => {
  let service: MemoryOrchestratorService;
  let mockArbitrationService: jest.Mocked<MemoryArbitrationService>;
  let mockStorageService: jest.Mocked<GraphVectorStorageService>;
  let mockQualityGateService: jest.Mocked<QualityGateService>;
  let mockEmbeddingService: jest.Mocked<EmbeddingService>;
  let mockEvolutionEngine: jest.Mocked<EvolutionEngineService>;
  let mockAuditService: jest.Mocked<AuditService>;
  let mockConfig: MemorySystemConfig;
  let mockLogger: jest.Mocked<Logger>;

  const mockQualityScore: QualityScore = {
    novelty: 0.8,
    accuracy: 0.9,
    utility: 0.85,
    clarity: 0.88,
    validation: 0.75,
    overall: 0.84
  };

  const mockEmbedding = new Array(768).fill(0.1);

  const mockMemoryInput = {
    content: 'User authentication using JWT tokens with refresh mechanism',
    type: 'system2' as Memory['type'],
    workspace: 'auth-service',
    context: {
      source: 'development-session',
      tags: ['authentication', 'security', 'jwt'],
      metadata: {
        context: 'implementing login flow',
        goal: 'secure authentication'
      }
    }
  };

  beforeEach(() => {
    // Create mocks for all dependencies
    mockArbitrationService = createMock<MemoryArbitrationService>();
    mockStorageService = createMock<GraphVectorStorageService>();
    mockQualityGateService = createMock<QualityGateService>();
    mockEmbeddingService = createMock<EmbeddingService>();
    mockEvolutionEngine = createMock<EvolutionEngineService>();
    mockAuditService = createMock<AuditService>();
    mockLogger = createMock<Logger>();

    mockConfig = {
      arbitration: {
        quality: {
          minimumScore: 0.6
        }
      }
    } as MemorySystemConfig;

    // Set up default mock behaviors
    mockEmbeddingService.generateEmbedding.mockResolvedValue(mockEmbedding);
    mockStorageService.findSimilarMemories.mockResolvedValue([]);
    mockQualityGateService.assessQuality.mockResolvedValue(mockQualityScore);
    mockAuditService.logArbitration.mockResolvedValue(undefined);

    service = new MemoryOrchestratorService(
      mockArbitrationService,
      mockStorageService,
      mockQualityGateService,
      mockEmbeddingService,
      mockEvolutionEngine,
      mockAuditService,
      mockConfig
    );

    // Mock the logger
    (service as any).logger = mockLogger;
  });

  describe('ingestMemory', () => {
    it('should orchestrate the complete memory ingestion workflow', async () => {
      // Arrange
      const mockArbitrationResult: MemoryArbitrationResult = {
        decision: 'ADD',
        confidence: 0.9,
        reasoning: 'High quality novel memory',
        auditTrail: {
          arbitrationId: 'arb-123',
          timestamp: new Date(),
          inputHash: 'hash123',
          similarMemories: [],
          llmReasoning: 'Valid reasoning',
          qualityAssessment: mockQualityScore,
          riskAssessment: {
            contradiction: 0.1,
            obsolescence: 0.05,
            security: 0.02,
            quality: 0.95,
            overall: 0.15
          },
          reviewRequired: false
        }
      };

      mockArbitrationService.arbitrateMemory.mockResolvedValue(mockArbitrationResult);
      mockStorageService.storeMemory.mockResolvedValue('mem-new-123');

      // Act
      const result = await service.ingestMemory(
        mockMemoryInput.content,
        mockMemoryInput.type,
        mockMemoryInput.workspace,
        mockMemoryInput.context
      );

      // Assert: Verify the orchestration sequence (London School focus)
      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith(mockMemoryInput.content);
      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledBefore(mockStorageService.findSimilarMemories);
      
      expect(mockStorageService.findSimilarMemories).toHaveBeenCalledWith({
        embedding: mockEmbedding,
        workspace: mockMemoryInput.workspace,
        type: [mockMemoryInput.type],
        limit: 10
      });
      expect(mockStorageService.findSimilarMemories).toHaveBeenCalledBefore(mockQualityGateService.assessQuality);

      expect(mockQualityGateService.assessQuality).toHaveBeenCalledWith(
        mockMemoryInput.content,
        mockMemoryInput.type,
        mockMemoryInput.context
      );
      expect(mockQualityGateService.assessQuality).toHaveBeenCalledBefore(mockArbitrationService.arbitrateMemory);

      expect(mockArbitrationService.arbitrateMemory).toHaveBeenCalledWith({
        content: mockMemoryInput.content,
        type: mockMemoryInput.type,
        workspace: mockMemoryInput.workspace,
        embedding: mockEmbedding,
        similarMemories: [],
        qualityScore: mockQualityScore,
        context: mockMemoryInput.context
      });
      expect(mockArbitrationService.arbitrateMemory).toHaveBeenCalledBefore(mockStorageService.storeMemory);

      expect(mockAuditService.logArbitration).toHaveBeenCalledWith(mockArbitrationResult);
      expect(result).toBe(mockArbitrationResult);
    });

    it('should reject memories below quality threshold', async () => {
      // Arrange
      const lowQualityScore = { ...mockQualityScore, overall: 0.4 };
      mockQualityGateService.assessQuality.mockResolvedValue(lowQualityScore);

      // Act
      const result = await service.ingestMemory(
        mockMemoryInput.content,
        mockMemoryInput.type,
        mockMemoryInput.workspace,
        mockMemoryInput.context
      );

      // Assert
      expect(result.decision).toBe('REJECT');
      expect(result.reasoning).toContain('Quality score below minimum threshold');
      expect(mockArbitrationService.arbitrateMemory).not.toHaveBeenCalled();
      expect(mockStorageService.storeMemory).not.toHaveBeenCalled();
    });

    it('should handle embedding service failure', async () => {
      // Arrange
      const embeddingError = new Error('Embedding service unavailable');
      mockEmbeddingService.generateEmbedding.mockRejectedValue(embeddingError);

      // Act & Assert
      await expect(service.ingestMemory(
        mockMemoryInput.content,
        mockMemoryInput.type,
        mockMemoryInput.workspace,
        mockMemoryInput.context
      )).rejects.toThrow('Failed to ingest memory: Embedding service unavailable');

      // Verify no downstream services were called after failure
      expect(mockQualityGateService.assessQuality).not.toHaveBeenCalled();
      expect(mockArbitrationService.arbitrateMemory).not.toHaveBeenCalled();
    });

    it('should handle different arbitration decisions correctly', async () => {
      // Arrange - UPDATE decision
      const updateResult: MemoryArbitrationResult = {
        decision: 'UPDATE',
        confidence: 0.85,
        reasoning: 'Update existing memory',
        targetMemoryId: 'mem-existing-123',
        auditTrail: {} as any
      };
      
      mockArbitrationService.arbitrateMemory.mockResolvedValue(updateResult);
      mockStorageService.updateMemory.mockResolvedValue();

      // Act
      await service.ingestMemory(
        mockMemoryInput.content,
        mockMemoryInput.type,
        mockMemoryInput.workspace,
        mockMemoryInput.context
      );

      // Assert
      expect(mockStorageService.updateMemory).toHaveBeenCalledWith('mem-existing-123', expect.objectContaining({
        content: mockMemoryInput.content,
        embedding: mockEmbedding,
        updatedAt: expect.any(Date),
        quality: mockQualityScore
      }));
    });

    it('should handle MERGE decision with merge strategy', async () => {
      // Arrange
      const mergeResult: MemoryArbitrationResult = {
        decision: 'MERGE',
        confidence: 0.8,
        reasoning: 'Merge with similar memory',
        targetMemoryId: 'mem-target-123',
        mergeStrategy: 'combine-content',
        auditTrail: {} as any
      };
      
      mockArbitrationService.arbitrateMemory.mockResolvedValue(mergeResult);

      // Act
      await service.ingestMemory(
        mockMemoryInput.content,
        mockMemoryInput.type,
        mockMemoryInput.workspace,
        mockMemoryInput.context
      );

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Merging memory mem-target-123 with strategy combine-content'
      );
    });

    it('should create different memory types correctly', async () => {
      // Arrange - System1 memory
      const system1Input = {
        ...mockMemoryInput,
        type: 'system1' as Memory['type']
      };
      
      const addResult: MemoryArbitrationResult = {
        decision: 'ADD',
        confidence: 0.9,
        reasoning: 'New system1 memory',
        auditTrail: {} as any
      };
      
      mockArbitrationService.arbitrateMemory.mockResolvedValue(addResult);
      mockStorageService.storeMemory.mockResolvedValue('mem-system1-123');

      // Act
      await service.ingestMemory(
        system1Input.content,
        system1Input.type,
        system1Input.workspace,
        system1Input.context
      );

      // Assert
      expect(mockStorageService.storeMemory).toHaveBeenCalledWith(expect.objectContaining({
        type: 'system1',
        pattern: expect.any(String),
        trigger: system1Input.context.tags,
        responseTime: 0,
        strengthScore: 0.5,
        relatedPatterns: []
      }));
    });

    it('should generate unique memory IDs', async () => {
      // Arrange
      const addResult: MemoryArbitrationResult = {
        decision: 'ADD',
        confidence: 0.9,
        reasoning: 'New memory',
        auditTrail: {} as any
      };
      
      mockArbitrationService.arbitrateMemory.mockResolvedValue(addResult);
      mockStorageService.storeMemory.mockResolvedValueOnce('mem1').mockResolvedValueOnce('mem2');

      // Act
      const promises = [
        service.ingestMemory(mockMemoryInput.content, mockMemoryInput.type, mockMemoryInput.workspace, mockMemoryInput.context),
        service.ingestMemory(mockMemoryInput.content, mockMemoryInput.type, mockMemoryInput.workspace, mockMemoryInput.context)
      ];

      await Promise.all(promises);

      // Assert
      const calls = mockStorageService.storeMemory.mock.calls;
      expect(calls).toHaveLength(2);
      expect(calls[0][0].id).not.toBe(calls[1][0].id);
      expect(calls[0][0].id).toMatch(/^mem_\d+_\w+$/);
      expect(calls[1][0].id).toMatch(/^mem_\d+_\w+$/);
    });
  });

  describe('searchMemories', () => {
    it('should orchestrate hybrid search workflow', async () => {
      // Arrange
      const query: MemoryQuery = {
        text: 'authentication patterns',
        workspace: 'auth-service',
        type: ['system2'],
        limit: 10
      };

      const mockSearchResults: MemorySearchResult[] = [
        {
          memory: { id: 'mem-1', content: 'Auth pattern 1' } as Memory,
          similarity: 0.9,
          relevanceScore: 0.85
        }
      ];

      mockEmbeddingService.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockStorageService.hybridSearch.mockResolvedValue(mockSearchResults);
      mockStorageService.updateMemory.mockResolvedValue();

      // Act
      const result = await service.searchMemories(query);

      // Assert: Verify search orchestration
      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith(query.text);
      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledBefore(mockStorageService.hybridSearch);

      expect(mockStorageService.hybridSearch).toHaveBeenCalledWith({
        ...query,
        embedding: mockEmbedding
      });

      expect(mockStorageService.updateMemory).toHaveBeenCalledWith('mem-1', {
        accessCount: { $inc: 1 },
        lastAccessedAt: expect.any(Date)
      });

      expect(result).toBe(mockSearchResults);
    });

    it('should use provided embedding when available', async () => {
      // Arrange
      const queryWithEmbedding: MemoryQuery = {
        embedding: mockEmbedding,
        workspace: 'test',
        limit: 5
      };

      mockStorageService.hybridSearch.mockResolvedValue([]);

      // Act
      await service.searchMemories(queryWithEmbedding);

      // Assert
      expect(mockEmbeddingService.generateEmbedding).not.toHaveBeenCalled();
      expect(mockStorageService.hybridSearch).toHaveBeenCalledWith({
        ...queryWithEmbedding,
        embedding: mockEmbedding
      });
    });

    it('should handle search service failure', async () => {
      // Arrange
      const searchError = new Error('Search service down');
      mockStorageService.hybridSearch.mockRejectedValue(searchError);

      // Act & Assert
      await expect(service.searchMemories({ text: 'test' }))
        .rejects.toThrow('Failed to search memories: Search service down');
    });

    it('should update access patterns for all retrieved memories', async () => {
      // Arrange
      const multipleResults: MemorySearchResult[] = [
        { memory: { id: 'mem-1' } as Memory, similarity: 0.9, relevanceScore: 0.85 },
        { memory: { id: 'mem-2' } as Memory, similarity: 0.8, relevanceScore: 0.75 },
        { memory: { id: 'mem-3' } as Memory, similarity: 0.7, relevanceScore: 0.65 }
      ];

      mockStorageService.hybridSearch.mockResolvedValue(multipleResults);
      mockStorageService.updateMemory.mockResolvedValue();

      // Act
      await service.searchMemories({ text: 'test' });

      // Assert
      expect(mockStorageService.updateMemory).toHaveBeenCalledTimes(3);
      expect(mockStorageService.updateMemory).toHaveBeenCalledWith('mem-1', expect.any(Object));
      expect(mockStorageService.updateMemory).toHaveBeenCalledWith('mem-2', expect.any(Object));
      expect(mockStorageService.updateMemory).toHaveBeenCalledWith('mem-3', expect.any(Object));
    });
  });

  describe('evolveMemory', () => {
    it('should orchestrate memory evolution workflow', async () => {
      // Arrange
      const memoryId = 'mem-evolve-123';
      const mockMemory = { id: memoryId, content: 'Memory to evolve' } as Memory;
      const mockUsageAnalysis = { accessCount: 10, lastAccess: new Date() };
      const mockContradictions = [{ id: 'contradiction-1', reason: 'Conflicting info' }];
      const mockMergeOpportunities = [{ id: 'merge-1', targetId: 'mem-similar' }];

      mockStorageService.getMemoryById.mockResolvedValue(mockMemory);
      mockEvolutionEngine.analyzeUsagePatterns.mockResolvedValue(mockUsageAnalysis);
      mockEvolutionEngine.detectContradictions.mockResolvedValue(mockContradictions);
      mockEvolutionEngine.findMergeOpportunities.mockResolvedValue(mockMergeOpportunities);
      mockEvolutionEngine.resolveContradictions.mockResolvedValue();
      mockEvolutionEngine.executeMerges.mockResolvedValue();
      mockEvolutionEngine.updateMemoryStrength.mockResolvedValue();

      // Act
      await service.evolveMemory(memoryId);

      // Assert: Verify evolution orchestration sequence
      expect(mockStorageService.getMemoryById).toHaveBeenCalledWith(memoryId);
      expect(mockStorageService.getMemoryById).toHaveBeenCalledBefore(mockEvolutionEngine.analyzeUsagePatterns);

      expect(mockEvolutionEngine.analyzeUsagePatterns).toHaveBeenCalledWith(mockMemory);
      expect(mockEvolutionEngine.detectContradictions).toHaveBeenCalledWith(mockMemory);
      expect(mockEvolutionEngine.findMergeOpportunities).toHaveBeenCalledWith(mockMemory);

      // Should resolve contradictions when found
      expect(mockEvolutionEngine.resolveContradictions).toHaveBeenCalledWith(mockMemory, mockContradictions);
      // Should execute merges when opportunities found
      expect(mockEvolutionEngine.executeMerges).toHaveBeenCalledWith(mockMemory, mockMergeOpportunities);
      // Should always update memory strength
      expect(mockEvolutionEngine.updateMemoryStrength).toHaveBeenCalledWith(mockMemory, mockUsageAnalysis);
    });

    it('should handle memory not found', async () => {
      // Arrange
      mockStorageService.getMemoryById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.evolveMemory('non-existent'))
        .rejects.toThrow('Failed to evolve memory: Memory not found: non-existent');

      expect(mockEvolutionEngine.analyzeUsagePatterns).not.toHaveBeenCalled();
    });

    it('should skip contradiction resolution when none found', async () => {
      // Arrange
      const mockMemory = { id: 'mem-123' } as Memory;
      mockStorageService.getMemoryById.mockResolvedValue(mockMemory);
      mockEvolutionEngine.analyzeUsagePatterns.mockResolvedValue({});
      mockEvolutionEngine.detectContradictions.mockResolvedValue([]); // No contradictions
      mockEvolutionEngine.findMergeOpportunities.mockResolvedValue([]);
      mockEvolutionEngine.updateMemoryStrength.mockResolvedValue();

      // Act
      await service.evolveMemory('mem-123');

      // Assert
      expect(mockEvolutionEngine.resolveContradictions).not.toHaveBeenCalled();
      expect(mockEvolutionEngine.executeMerges).not.toHaveBeenCalled();
      expect(mockEvolutionEngine.updateMemoryStrength).toHaveBeenCalled();
    });
  });

  describe('batchIngestMemories', () => {
    it('should process memories in batches', async () => {
      // Arrange
      const memories = Array.from({ length: 25 }, (_, i) => ({
        content: `Memory content ${i}`,
        type: 'system2' as Memory['type'],
        workspace: 'test-workspace',
        context: { source: 'test', tags: [`tag-${i}`] }
      }));

      const mockResult: MemoryArbitrationResult = {
        decision: 'ADD',
        confidence: 0.9,
        reasoning: 'Good memory',
        auditTrail: {} as any
      };

      // Mock successful ingestion for all memories
      jest.spyOn(service, 'ingestMemory').mockResolvedValue(mockResult);

      // Act
      const results = await service.batchIngestMemories(memories);

      // Assert
      expect(results).toHaveLength(25);
      expect(service.ingestMemory).toHaveBeenCalledTimes(25);
      
      // Verify batching behavior - should be processed in batches of 10
      // This is implementation detail, but important for performance
      results.forEach(result => {
        expect(result).toBe(mockResult);
      });
    });

    it('should handle partial failures in batch processing', async () => {
      // Arrange
      const memories = Array.from({ length: 5 }, (_, i) => ({
        content: `Memory ${i}`,
        type: 'system2' as Memory['type'],
        workspace: 'test',
        context: { source: 'test', tags: [] }
      }));

      const successResult: MemoryArbitrationResult = {
        decision: 'ADD',
        confidence: 0.9,
        reasoning: 'Success',
        auditTrail: {} as any
      };

      // Mock some successes and some failures
      jest.spyOn(service, 'ingestMemory')
        .mockResolvedValueOnce(successResult)
        .mockRejectedValueOnce(new Error('Ingestion failed'))
        .mockResolvedValueOnce(successResult)
        .mockRejectedValueOnce(new Error('Another failure'))
        .mockResolvedValueOnce(successResult);

      // Act
      const results = await service.batchIngestMemories(memories);

      // Assert
      expect(results).toHaveLength(5);
      expect(results.filter(r => r.decision === 'ADD')).toHaveLength(3);
      expect(results.filter(r => r.decision === 'REJECT')).toHaveLength(2);
    });

    it('should add delays between batches', async () => {
      // Arrange
      const memories = Array.from({ length: 15 }, (_, i) => ({
        content: `Memory ${i}`,
        type: 'system2' as Memory['type'],
        workspace: 'test',
        context: { source: 'test', tags: [] }
      }));

      const mockResult: MemoryArbitrationResult = {
        decision: 'ADD',
        confidence: 0.9,
        reasoning: 'Success',
        auditTrail: {} as any
      };

      jest.spyOn(service, 'ingestMemory').mockResolvedValue(mockResult);
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      // Act
      await service.batchIngestMemories(memories);

      // Assert - Should have delay between batches (15 memories = 2 batches)
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100);

      setTimeoutSpy.mockRestore();
    });
  });

  describe('healthCheck', () => {
    it('should check health of all components', async () => {
      // Arrange
      mockStorageService.healthCheck.mockResolvedValue();
      mockEmbeddingService.healthCheck.mockResolvedValue();
      mockArbitrationService.healthCheck.mockResolvedValue();

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result.status).toBe('healthy');
      expect(result.components.storage.status).toBe('healthy');
      expect(result.components.embedding.status).toBe('healthy');
      expect(result.components.arbitration.status).toBe('healthy');
      expect(result.components.storage.latency).toBeGreaterThan(0);
    });

    it('should report degraded status when arbitration fails', async () => {
      // Arrange
      mockStorageService.healthCheck.mockResolvedValue();
      mockEmbeddingService.healthCheck.mockResolvedValue();
      mockArbitrationService.healthCheck.mockRejectedValue(new Error('Arbitration down'));

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result.status).toBe('degraded');
      expect(result.components.storage.status).toBe('healthy');
      expect(result.components.embedding.status).toBe('healthy');
      expect(result.components.arbitration.status).toBe('unhealthy');
      expect(result.components.arbitration.error).toBe('Arbitration down');
    });

    it('should report unhealthy status when storage fails', async () => {
      // Arrange
      mockStorageService.healthCheck.mockRejectedValue(new Error('Storage failure'));
      mockEmbeddingService.healthCheck.mockResolvedValue();
      mockArbitrationService.healthCheck.mockResolvedValue();

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result.status).toBe('unhealthy');
      expect(result.components.storage.status).toBe('unhealthy');
    });
  });

  describe('getMemoryAnalytics', () => {
    it('should delegate to storage service for analytics', async () => {
      // Arrange
      const mockAnalytics = {
        totalMemories: 100,
        memoryTypes: { system1: 40, system2: 35, workspace: 25 },
        qualityDistribution: { high: 60, medium: 30, low: 10 },
        usagePatterns: { daily: 50, weekly: 30, monthly: 20 },
        evolutionHistory: []
      };

      mockStorageService.getAnalytics.mockResolvedValue(mockAnalytics);

      // Act
      const result = await service.getMemoryAnalytics('test-workspace');

      // Assert
      expect(mockStorageService.getAnalytics).toHaveBeenCalledWith('test-workspace');
      expect(result).toBe(mockAnalytics);
    });

    it('should handle analytics service failure', async () => {
      // Arrange
      mockStorageService.getAnalytics.mockRejectedValue(new Error('Analytics unavailable'));

      // Act & Assert
      await expect(service.getMemoryAnalytics())
        .rejects.toThrow('Failed to retrieve memory analytics: Analytics unavailable');
    });
  });
});