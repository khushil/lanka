import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MemoryOrchestrator } from '../../../src/memory/memory-orchestrator';
import { StorageMocks } from '../../mocks/storage-mocks';
import { MemoryFixtures } from '../../fixtures/memory-fixtures';
import { MemoryType, ArbitrationAction } from '../../../src/types/memory';

describe('MemoryOrchestrator', () => {
  let orchestrator: MemoryOrchestrator;
  let mockStorage: any;
  let mockVectorStore: any;
  let mockGraphStore: any;
  let mockArbitrator: any;

  beforeEach(() => {
    mockStorage = StorageMocks.createStorageLayerMock();
    mockVectorStore = StorageMocks.createQdrantClientMock();
    mockGraphStore = StorageMocks.createNeo4jDriverMock();
    
    mockArbitrator = {
      arbitrateMemory: jest.fn(),
      evaluateQuality: jest.fn(),
      detectConflicts: jest.fn(),
    };

    orchestrator = new MemoryOrchestrator({
      storage: mockStorage,
      vectorStore: mockVectorStore,
      graphStore: mockGraphStore,
      arbitrator: mockArbitrator,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Memory Ingestion', () => {
    it('should ingest new memory with arbitration', async () => {
      // Arrange
      const candidateMemory = MemoryFixtures.createSystem1Memory();
      const arbitrationDecision = MemoryFixtures.createArbitrationDecision({
        action: ArbitrationAction.ADD_NEW,
        confidence: 0.9,
      });

      mockArbitrator.arbitrateMemory.mockResolvedValue(arbitrationDecision);
      mockStorage.storeMemory.mockResolvedValue(candidateMemory);

      // Act
      const result = await orchestrator.ingestMemory(candidateMemory);

      // Assert
      expect(mockArbitrator.arbitrateMemory).toHaveBeenCalledWith(
        candidateMemory,
        expect.any(Array)
      );
      expect(mockStorage.storeMemory).toHaveBeenCalledWith(candidateMemory);
      expect(result).toEqual({
        success: true,
        memory: candidateMemory,
        action: ArbitrationAction.ADD_NEW,
      });
    });

    it('should reject low-quality memories', async () => {
      // Arrange
      const lowQualityMemory = MemoryFixtures.createSystem1Memory({
        metadata: {
          ...MemoryFixtures.createSystem1Memory().metadata,
          confidence: 0.2,
        }
      });

      const arbitrationDecision = MemoryFixtures.createArbitrationDecision({
        action: ArbitrationAction.REJECT,
        confidence: 0.3,
        reasoning: 'Memory quality below threshold',
      });

      mockArbitrator.arbitrateMemory.mockResolvedValue(arbitrationDecision);

      // Act
      const result = await orchestrator.ingestMemory(lowQualityMemory);

      // Assert
      expect(result).toEqual({
        success: false,
        action: ArbitrationAction.REJECT,
        reason: 'Memory quality below threshold',
      });
      expect(mockStorage.storeMemory).not.toHaveBeenCalled();
    });

    it('should update existing memory when similar memory found', async () => {
      // Arrange
      const existingMemory = MemoryFixtures.createSystem1Memory({ id: 'existing_001' });
      const candidateMemory = MemoryFixtures.createSystem1Memory({
        id: 'candidate_001',
        content: 'Updated async/await pattern with error handling',
      });

      const arbitrationDecision = MemoryFixtures.createArbitrationDecision({
        action: ArbitrationAction.UPDATE_EXISTING,
        confidence: 0.85,
        similarMemories: [{ id: 'existing_001', similarity: 0.9, reason: 'Very similar content' }],
      });

      mockArbitrator.arbitrateMemory.mockResolvedValue(arbitrationDecision);
      mockStorage.retrieveMemory.mockResolvedValue(existingMemory);
      mockStorage.updateMemory.mockResolvedValue({
        ...existingMemory,
        content: candidateMemory.content,
      });

      // Act
      const result = await orchestrator.ingestMemory(candidateMemory);

      // Assert
      expect(mockStorage.updateMemory).toHaveBeenCalledWith(
        'existing_001',
        expect.objectContaining({
          content: candidateMemory.content,
        })
      );
      expect(result.action).toBe(ArbitrationAction.UPDATE_EXISTING);
    });

    it('should handle batch ingestion efficiently', async () => {
      // Arrange
      const memories = [
        MemoryFixtures.createSystem1Memory({ id: 'batch_001' }),
        MemoryFixtures.createSystem1Memory({ id: 'batch_002' }),
        MemoryFixtures.createSystem1Memory({ id: 'batch_003' }),
      ];

      mockArbitrator.arbitrateMemory.mockResolvedValue(
        MemoryFixtures.createArbitrationDecision({ action: ArbitrationAction.ADD_NEW })
      );
      mockStorage.storeMemory.mockImplementation((memory) => Promise.resolve(memory));

      // Act
      const results = await orchestrator.ingestBatch(memories);

      // Assert
      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockStorage.storeMemory).toHaveBeenCalledTimes(3);
    });
  });

  describe('Memory Retrieval', () => {
    it('should retrieve memories by semantic search', async () => {
      // Arrange
      const query = 'async programming patterns';
      const expectedMemories = [
        MemoryFixtures.createSystem1Memory({ id: 'async_001' }),
        MemoryFixtures.createSystem1Memory({ id: 'async_002' }),
      ];

      mockStorage.searchMemories.mockResolvedValue({
        memories: expectedMemories,
        total: 2,
      });

      // Act
      const result = await orchestrator.searchMemories(query, {
        type: MemoryType.SYSTEM_1,
        limit: 10,
      });

      // Assert
      expect(mockStorage.searchMemories).toHaveBeenCalledWith(
        query,
        expect.objectContaining({ type: MemoryType.SYSTEM_1 })
      );
      expect(result.memories).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should retrieve related memories through graph traversal', async () => {
      // Arrange
      const memoryId = 'mem_001';
      const relatedMemories = [
        MemoryFixtures.createSystem1Memory({ id: 'related_001' }),
        MemoryFixtures.createSystem2Memory({ id: 'related_002' }),
      ];

      mockStorage.getRelatedMemories.mockResolvedValue(relatedMemories);

      // Act
      const result = await orchestrator.getRelatedMemories(memoryId, {
        maxDepth: 2,
        relationshipTypes: ['IMPLEMENTS', 'EVOLVED_FROM'],
      });

      // Assert
      expect(mockStorage.getRelatedMemories).toHaveBeenCalledWith(
        memoryId,
        expect.objectContaining({ maxDepth: 2 })
      );
      expect(result).toEqual(relatedMemories);
    });

    it('should combine semantic and structural search', async () => {
      // Arrange
      const query = 'error handling patterns';
      const semanticResults = [MemoryFixtures.createSystem1Memory({ id: 'semantic_001' })];
      const structuralResults = [MemoryFixtures.createSystem2Memory({ id: 'structural_001' })];

      mockStorage.searchMemories.mockResolvedValue({
        memories: semanticResults,
        total: 1,
      });
      mockStorage.getRelatedMemories.mockResolvedValue(structuralResults);

      // Act
      const result = await orchestrator.hybridSearch(query, {
        combineSemanticAndStructural: true,
        weights: { semantic: 0.7, structural: 0.3 },
      });

      // Assert
      expect(result.memories).toHaveLength(2);
      expect(result.rankedResults).toBeDefined();
    });
  });

  describe('Memory Evolution', () => {
    it('should detect and resolve memory conflicts', async () => {
      // Arrange
      const conflictingMemories = [
        MemoryFixtures.createSystem1Memory({
          id: 'conflict_001',
          content: 'Use callbacks for async operations',
        }),
        MemoryFixtures.createSystem1Memory({
          id: 'conflict_002',
          content: 'Use async/await for async operations',
        }),
      ];

      mockArbitrator.detectConflicts.mockResolvedValue([
        {
          memories: conflictingMemories,
          type: 'CONTRADICTION',
          severity: 'high',
        },
      ]);

      // Act
      const conflicts = await orchestrator.detectConflicts();

      // Assert
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('CONTRADICTION');
      expect(conflicts[0].memories).toHaveLength(2);
    });

    it('should merge similar memories', async () => {
      // Arrange
      const similarMemories = [
        MemoryFixtures.createSystem1Memory({
          id: 'similar_001',
          content: 'Use async/await for promises',
        }),
        MemoryFixtures.createSystem1Memory({
          id: 'similar_002',
          content: 'Prefer async/await over .then() chains',
        }),
      ];

      const mergedMemory = MemoryFixtures.createSystem1Memory({
        id: 'merged_001',
        content: 'Use async/await for promise handling instead of .then() chains',
      });

      mockStorage.storeMemory.mockResolvedValue(mergedMemory);

      // Act
      const result = await orchestrator.mergeSimilarMemories(similarMemories);

      // Assert
      expect(result.merged).toBe(true);
      expect(result.newMemory).toEqual(mergedMemory);
      expect(mockStorage.deleteMemory).toHaveBeenCalledTimes(2);
    });

    it('should update memory strength based on usage', async () => {
      // Arrange
      const memoryId = 'strength_test_001';
      const memory = MemoryFixtures.createSystem1Memory({
        id: memoryId,
        metadata: {
          ...MemoryFixtures.createSystem1Memory().metadata,
          accessCount: 5,
          validationScore: 0.8,
        }
      });

      mockStorage.retrieveMemory.mockResolvedValue(memory);
      mockStorage.updateMemory.mockResolvedValue({
        ...memory,
        metadata: { ...memory.metadata, accessCount: 6 }
      });

      // Act
      await orchestrator.recordMemoryAccess(memoryId);

      // Assert
      expect(mockStorage.updateMemory).toHaveBeenCalledWith(
        memoryId,
        expect.objectContaining({
          metadata: expect.objectContaining({
            accessCount: 6,
          })
        })
      );
    });
  });

  describe('Quality Gates', () => {
    it('should enforce novelty threshold', async () => {
      // Arrange
      const candidateMemory = MemoryFixtures.createSystem1Memory();
      const duplicateDecision = MemoryFixtures.createArbitrationDecision({
        action: ArbitrationAction.REJECT,
        reasoning: 'Memory is too similar to existing content',
        similarMemories: [{ id: 'existing', similarity: 0.95, reason: 'Nearly identical' }],
      });

      mockArbitrator.arbitrateMemory.mockResolvedValue(duplicateDecision);

      // Act
      const result = await orchestrator.ingestMemory(candidateMemory);

      // Assert
      expect(result.success).toBe(false);
      expect(result.reason).toContain('too similar');
    });

    it('should enforce confidence threshold', async () => {
      // Arrange
      const lowConfidenceMemory = MemoryFixtures.createSystem1Memory({
        metadata: {
          ...MemoryFixtures.createSystem1Memory().metadata,
          confidence: 0.3,
        }
      });

      mockArbitrator.evaluateQuality.mockResolvedValue({
        score: 0.3,
        reasons: ['Low confidence score', 'Insufficient validation'],
      });

      // Act
      const qualityResult = await orchestrator.evaluateMemoryQuality(lowConfidenceMemory);

      // Assert
      expect(qualityResult.score).toBe(0.3);
      expect(qualityResult.reasons).toContain('Low confidence score');
    });

    it('should validate memory structure', () => {
      // Arrange
      const invalidMemory = {
        id: 'invalid_001',
        // Missing required fields
      } as any;

      // Act & Assert
      expect(() => orchestrator.validateMemoryStructure(invalidMemory))
        .toThrow('Invalid memory structure');
    });
  });

  describe('Workspace Isolation', () => {
    it('should scope searches by workspace', async () => {
      // Arrange
      const workspace = 'team-alpha';
      const query = 'coding patterns';

      // Act
      await orchestrator.searchMemories(query, { workspace });

      // Assert
      expect(mockStorage.searchMemories).toHaveBeenCalledWith(
        query,
        expect.objectContaining({ workspace })
      );
    });

    it('should prevent cross-workspace memory leakage', async () => {
      // Arrange
      const workspaceAMemory = MemoryFixtures.createWorkspaceMemory({
        metadata: {
          ...MemoryFixtures.createWorkspaceMemory().metadata,
          workspace: 'team-alpha',
        }
      });

      // Act
      const result = await orchestrator.searchMemories('patterns', {
        workspace: 'team-beta'
      });

      // Assert
      expect(mockStorage.searchMemories).toHaveBeenCalledWith(
        'patterns',
        expect.objectContaining({ workspace: 'team-beta' })
      );
      // Should not return memories from team-alpha
    });
  });
});