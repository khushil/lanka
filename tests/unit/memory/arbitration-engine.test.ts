import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ArbitrationEngine } from '../../../src/memory/arbitration-engine';
import { MemoryFixtures } from '../../fixtures/memory-fixtures';
import { StorageMocks } from '../../mocks/storage-mocks';
import { ArbitrationAction, MemoryType } from '../../../src/types/memory';

describe('ArbitrationEngine', () => {
  let engine: ArbitrationEngine;
  let mockEmbeddingService: any;
  let mockLLMService: any;
  let mockStorage: any;

  beforeEach(() => {
    mockEmbeddingService = {
      generateEmbedding: jest.fn(),
      calculateSimilarity: jest.fn(),
      batchEmbeddings: jest.fn(),
    };

    mockLLMService = {
      analyzeMemory: jest.fn(),
      compareMemories: jest.fn(),
      generateArbitrationDecision: jest.fn(),
      evaluateQuality: jest.fn(),
    };

    mockStorage = StorageMocks.createStorageLayerMock();

    engine = new ArbitrationEngine({
      embeddingService: mockEmbeddingService,
      llmService: mockLLMService,
      storage: mockStorage,
      config: {
        noveltyThreshold: 0.7,
        confidenceThreshold: 0.8,
        qualityThreshold: 0.6,
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Memory Arbitration', () => {
    it('should decide to add new memory when sufficiently novel', async () => {
      // Arrange
      const candidateMemory = MemoryFixtures.createSystem1Memory();
      const existingMemories = [
        MemoryFixtures.createSystem1Memory({
          id: 'existing_001',
          content: 'Different pattern about database queries',
        })
      ];

      mockEmbeddingService.calculateSimilarity.mockReturnValue(0.3); // Low similarity
      mockLLMService.generateArbitrationDecision.mockResolvedValue({
        action: ArbitrationAction.ADD_NEW,
        confidence: 0.9,
        reasoning: 'Novel async pattern with high value',
        qualityScore: 0.85,
      });

      // Act
      const decision = await engine.arbitrateMemory(candidateMemory, existingMemories);

      // Assert
      expect(decision.action).toBe(ArbitrationAction.ADD_NEW);
      expect(decision.confidence).toBe(0.9);
      expect(mockEmbeddingService.calculateSimilarity).toHaveBeenCalled();
      expect(mockLLMService.generateArbitrationDecision).toHaveBeenCalledWith(
        candidateMemory,
        expect.any(Array),
        expect.any(Object)
      );
    });

    it('should decide to update existing memory when very similar', async () => {
      // Arrange
      const candidateMemory = MemoryFixtures.createSystem1Memory({
        content: 'Enhanced async/await pattern with better error handling',
      });
      const existingMemory = MemoryFixtures.createSystem1Memory({
        id: 'existing_001',
        content: 'Basic async/await pattern',
      });

      mockEmbeddingService.calculateSimilarity.mockReturnValue(0.85); // High similarity
      mockLLMService.generateArbitrationDecision.mockResolvedValue({
        action: ArbitrationAction.UPDATE_EXISTING,
        confidence: 0.88,
        reasoning: 'Improved version of existing pattern',
        targetMemoryId: 'existing_001',
        qualityScore: 0.9,
      });

      // Act
      const decision = await engine.arbitrateMemory(candidateMemory, [existingMemory]);

      // Assert
      expect(decision.action).toBe(ArbitrationAction.UPDATE_EXISTING);
      expect(decision.targetMemoryId).toBe('existing_001');
      expect(decision.reasoning).toContain('Improved version');
    });

    it('should reject low-quality memories', async () => {
      // Arrange
      const lowQualityMemory = MemoryFixtures.createSystem1Memory({
        content: 'vague coding advice',
        metadata: {
          ...MemoryFixtures.createSystem1Memory().metadata,
          confidence: 0.3,
        }
      });

      mockLLMService.evaluateQuality.mockResolvedValue({
        score: 0.4,
        reasons: ['Too vague', 'No specific guidance', 'Low confidence'],
      });

      mockLLMService.generateArbitrationDecision.mockResolvedValue({
        action: ArbitrationAction.REJECT,
        confidence: 0.9,
        reasoning: 'Quality below threshold: too vague and non-specific',
        qualityScore: 0.4,
      });

      // Act
      const decision = await engine.arbitrateMemory(lowQualityMemory, []);

      // Assert
      expect(decision.action).toBe(ArbitrationAction.REJECT);
      expect(decision.reasoning).toContain('Quality below threshold');
    });

    it('should handle conflicting memories intelligently', async () => {
      // Arrange
      const candidateMemory = MemoryFixtures.createSystem1Memory({
        content: 'Always use async/await for promises',
      });
      const conflictingMemory = MemoryFixtures.createSystem1Memory({
        id: 'conflicting_001',
        content: 'Use callbacks for better performance',
      });

      mockEmbeddingService.calculateSimilarity.mockReturnValue(0.6);
      mockLLMService.compareMemories.mockResolvedValue({
        relationship: 'CONTRADICTS',
        confidence: 0.85,
        reasoning: 'These represent conflicting approaches to async programming',
      });

      mockLLMService.generateArbitrationDecision.mockResolvedValue({
        action: ArbitrationAction.MERGE_WITH_CONTEXT,
        confidence: 0.8,
        reasoning: 'Both approaches valid in different contexts',
        targetMemoryId: 'conflicting_001',
        qualityScore: 0.8,
        metadata: {
          resolution: 'contextual',
          conditions: ['Use async/await for modern apps', 'Use callbacks for legacy compatibility'],
        }
      });

      // Act
      const decision = await engine.arbitrateMemory(candidateMemory, [conflictingMemory]);

      // Assert
      expect(decision.action).toBe(ArbitrationAction.MERGE_WITH_CONTEXT);
      expect(decision.metadata.resolution).toBe('contextual');
    });
  });

  describe('Similarity Analysis', () => {
    it('should calculate semantic similarity accurately', async () => {
      // Arrange
      const memory1 = MemoryFixtures.createSystem1Memory({
        content: 'Use async/await for promises',
        vector: new Array(768).fill(0.1),
      });
      const memory2 = MemoryFixtures.createSystem1Memory({
        content: 'Prefer async/await over .then()',
        vector: new Array(768).fill(0.11),
      });

      mockEmbeddingService.calculateSimilarity.mockReturnValue(0.92);

      // Act
      const similarity = await engine.calculateSimilarity(memory1, memory2);

      // Assert
      expect(similarity).toBe(0.92);
      expect(mockEmbeddingService.calculateSimilarity).toHaveBeenCalledWith(
        memory1.vector,
        memory2.vector
      );
    });

    it('should find similar memories efficiently', async () => {
      // Arrange
      const candidateMemory = MemoryFixtures.createSystem1Memory();
      const existingMemories = MemoryFixtures.createPerformanceTestData(100);

      mockEmbeddingService.calculateSimilarity.mockImplementation(() => Math.random());

      // Act
      const start = Date.now();
      const similarMemories = await engine.findSimilarMemories(candidateMemory, existingMemories);
      const duration = Date.now() - start;

      // Assert
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(similarMemories).toBeDefined();
      expect(Array.isArray(similarMemories)).toBe(true);
    });

    it('should handle different memory types appropriately', async () => {
      // Arrange
      const system1Memory = MemoryFixtures.createSystem1Memory();
      const system2Memory = MemoryFixtures.createSystem2Memory();
      const workspaceMemory = MemoryFixtures.createWorkspaceMemory();

      // Act
      const system1ToSystem2 = await engine.calculateSimilarity(system1Memory, system2Memory);
      const system1ToWorkspace = await engine.calculateSimilarity(system1Memory, workspaceMemory);

      // Assert
      expect(typeof system1ToSystem2).toBe('number');
      expect(typeof system1ToWorkspace).toBe('number');
      expect(system1ToSystem2).toBeGreaterThanOrEqual(0);
      expect(system1ToSystem2).toBeLessThanOrEqual(1);
    });
  });

  describe('Quality Evaluation', () => {
    it('should evaluate memory quality comprehensively', async () => {
      // Arrange
      const highQualityMemory = MemoryFixtures.createSystem2Memory({
        metadata: {
          ...MemoryFixtures.createSystem2Memory().metadata,
          confidence: 0.95,
          validationScore: 0.9,
          accessCount: 10,
        }
      });

      mockLLMService.evaluateQuality.mockResolvedValue({
        score: 0.92,
        reasons: [
          'High confidence score',
          'Well-structured reasoning',
          'Validated through usage',
          'Clear actionable guidance'
        ],
        breakdown: {
          clarity: 0.9,
          specificity: 0.95,
          usefulness: 0.9,
          accuracy: 0.93,
        }
      });

      // Act
      const qualityResult = await engine.evaluateQuality(highQualityMemory);

      // Assert
      expect(qualityResult.score).toBe(0.92);
      expect(qualityResult.reasons).toHaveLength(4);
      expect(qualityResult.breakdown).toBeDefined();
      expect(qualityResult.breakdown.clarity).toBeGreaterThan(0.8);
    });

    it('should identify quality issues', async () => {
      // Arrange
      const poorQualityMemory = MemoryFixtures.createSystem1Memory({
        content: 'code good',
        metadata: {
          ...MemoryFixtures.createSystem1Memory().metadata,
          confidence: 0.2,
          validationScore: 0.1,
        }
      });

      mockLLMService.evaluateQuality.mockResolvedValue({
        score: 0.25,
        reasons: [
          'Extremely vague content',
          'No specific guidance',
          'Low confidence score',
          'Minimal validation'
        ],
        breakdown: {
          clarity: 0.1,
          specificity: 0.2,
          usefulness: 0.3,
          accuracy: 0.4,
        }
      });

      // Act
      const qualityResult = await engine.evaluateQuality(poorQualityMemory);

      // Assert
      expect(qualityResult.score).toBeLessThan(0.5);
      expect(qualityResult.reasons).toContain('Extremely vague content');
      expect(qualityResult.breakdown.clarity).toBeLessThan(0.2);
    });
  });

  describe('Conflict Detection', () => {
    it('should detect contradictory memories', async () => {
      // Arrange
      const memories = [
        MemoryFixtures.createSystem1Memory({
          id: 'mem_001',
          content: 'Always use var for variable declarations',
        }),
        MemoryFixtures.createSystem1Memory({
          id: 'mem_002',
          content: 'Never use var, prefer let and const',
        }),
      ];

      mockLLMService.compareMemories.mockImplementation((mem1, mem2) => {
        if (mem1.id === 'mem_001' && mem2.id === 'mem_002') {
          return Promise.resolve({
            relationship: 'CONTRADICTS',
            confidence: 0.95,
            reasoning: 'Direct contradiction about variable declaration practices',
          });
        }
        return Promise.resolve({ relationship: 'UNRELATED', confidence: 0.1 });
      });

      // Act
      const conflicts = await engine.detectConflicts(memories);

      // Assert
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('CONTRADICTION');
      expect(conflicts[0].memories).toHaveLength(2);
      expect(conflicts[0].confidence).toBe(0.95);
    });

    it('should suggest conflict resolution strategies', async () => {
      // Arrange
      const conflictingMemories = [
        MemoryFixtures.createSystem1Memory({
          id: 'sync_001',
          content: 'Use synchronous file operations for simplicity',
        }),
        MemoryFixtures.createSystem1Memory({
          id: 'async_001',
          content: 'Always use asynchronous file operations for performance',
        }),
      ];

      mockLLMService.generateArbitrationDecision.mockResolvedValue({
        action: ArbitrationAction.MERGE_WITH_CONTEXT,
        confidence: 0.85,
        reasoning: 'Both approaches valid depending on context',
        resolutionStrategy: {
          type: 'contextual',
          conditions: [
            'Use sync operations for config loading at startup',
            'Use async operations for runtime file handling',
          ],
          unifiedPattern: 'Choose file operation type based on context and performance requirements',
        }
      });

      // Act
      const resolution = await engine.resolveConflicts(conflictingMemories);

      // Assert
      expect(resolution.strategy).toBe('contextual');
      expect(resolution.unifiedMemory).toBeDefined();
      expect(resolution.conditions).toHaveLength(2);
    });
  });

  describe('Temporal Analysis', () => {
    it('should consider memory age in decisions', async () => {
      // Arrange
      const oldMemory = MemoryFixtures.createSystem1Memory({
        id: 'old_001',
        content: 'Use jQuery for DOM manipulation',
        metadata: {
          ...MemoryFixtures.createSystem1Memory().metadata,
          createdAt: new Date('2020-01-01'),
        }
      });

      const newMemory = MemoryFixtures.createSystem1Memory({
        id: 'new_001',
        content: 'Use vanilla JavaScript for DOM manipulation',
        metadata: {
          ...MemoryFixtures.createSystem1Memory().metadata,
          createdAt: new Date('2024-01-01'),
        }
      });

      mockLLMService.generateArbitrationDecision.mockResolvedValue({
        action: ArbitrationAction.UPDATE_EXISTING,
        confidence: 0.9,
        reasoning: 'Newer approach reflects current best practices',
        targetMemoryId: 'old_001',
        temporalFactor: 0.8,
      });

      // Act
      const decision = await engine.arbitrateMemory(newMemory, [oldMemory]);

      // Assert
      expect(decision.action).toBe(ArbitrationAction.UPDATE_EXISTING);
      expect(decision.temporalFactor).toBe(0.8);
    });

    it('should track memory evolution patterns', async () => {
      // Arrange
      const evolutionChain = [
        MemoryFixtures.createSystem1Memory({
          id: 'v1_001',
          content: 'Use callbacks',
          metadata: {
            ...MemoryFixtures.createSystem1Memory().metadata,
            createdAt: new Date('2018-01-01'),
          }
        }),
        MemoryFixtures.createSystem1Memory({
          id: 'v2_001',
          content: 'Use promises',
          metadata: {
            ...MemoryFixtures.createSystem1Memory().metadata,
            createdAt: new Date('2020-01-01'),
          }
        }),
        MemoryFixtures.createSystem1Memory({
          id: 'v3_001',
          content: 'Use async/await',
          metadata: {
            ...MemoryFixtures.createSystem1Memory().metadata,
            createdAt: new Date('2022-01-01'),
          }
        }),
      ];

      // Act
      const evolutionPattern = await engine.analyzeEvolutionPattern(evolutionChain);

      // Assert
      expect(evolutionPattern.trend).toBe('modernization');
      expect(evolutionPattern.stages).toHaveLength(3);
      expect(evolutionPattern.direction).toBe('improving');
    });
  });
});