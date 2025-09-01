import { Test, TestingModule } from '@nestjs/testing';
import { ConflictResolutionService } from '../../services/conflict-resolution.service';
import { LLMService } from '../../../llm/llm.service';
import { MergeConflict, MergeStrategy } from '../../types';

describe('ConflictResolutionService', () => {
  let service: ConflictResolutionService;
  let llmService: jest.Mocked<LLMService>;

  beforeEach(async () => {
    llmService = {
      analyze: jest.fn(),
    } as jest.Mocked<LLMService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConflictResolutionService,
        {
          provide: LLMService,
          useValue: llmService,
        },
      ],
    }).compile();

    service = module.get<ConflictResolutionService>(ConflictResolutionService);
  });

  describe('resolveConflict', () => {
    const mockConflict: MergeConflict = {
      memoryId: 'memory-1',
      sourceBranch: 'feature',
      targetBranch: 'main',
      conflictType: 'semantic',
      sourceCommitId: 'source-commit',
      targetCommitId: 'target-commit',
      conflictDetails: {
        field: 'content',
        sourceValue: { text: 'Use async/await pattern' },
        targetValue: { text: 'Use promises with .then()' },
        baseValue: { text: 'Use callbacks' },
      },
    };

    it('should resolve semantic conflict using LLM', async () => {
      llmService.analyze.mockResolvedValue({
        canResolve: true,
        resolvedValue: { text: 'Use async/await with proper error handling' },
        rationale: 'Modern async/await pattern with error handling combines best of both approaches',
        confidence: 0.9,
        strategy: 'semantic_merge',
      });

      const result = await service.resolveConflict(mockConflict, MergeStrategy.AUTO);

      expect(result.resolution).toBeDefined();
      expect(result.resolution!.strategy).toBe('llm');
      expect(result.resolution!.confidence).toBe(0.9);
      expect(result.resolution!.resolvedValue.text).toBe('Use async/await with proper error handling');
    });

    it('should return unresolved conflict when LLM confidence is low', async () => {
      llmService.analyze.mockResolvedValue({
        canResolve: true,
        resolvedValue: { text: 'Some resolution' },
        rationale: 'Uncertain resolution',
        confidence: 0.5, // Below threshold
        strategy: 'semantic_merge',
      });

      const result = await service.resolveConflict(mockConflict, MergeStrategy.AUTO);

      expect(result.resolution).toBeUndefined();
    });

    it('should handle LLM-assisted resolution', async () => {
      const llmResponse = {
        resolution: {
          resolvedValue: { text: 'Combined approach with async/await and promise handling' },
          rationale: 'Synthesizes both approaches for maximum compatibility',
          confidence: 0.85,
          strategy: 'llm_synthesis',
        },
      };

      llmService.analyze.mockResolvedValue(llmResponse);

      const result = await service.resolveConflict(mockConflict, MergeStrategy.LLM_ASSISTED);

      expect(result.resolution).toBeDefined();
      expect(result.resolution!.strategy).toBe('llm');
      expect(result.resolution!.resolvedValue.text).toBe('Combined approach with async/await and promise handling');
    });

    it('should resolve temporal conflicts by preferring recent changes', async () => {
      const temporalConflict: MergeConflict = {
        ...mockConflict,
        conflictType: 'temporal',
      };

      const result = await service.resolveConflict(temporalConflict, MergeStrategy.AUTO);

      expect(result.resolution).toBeDefined();
      expect(result.resolution!.strategy).toBe('automatic');
      expect(result.resolution!.resolvedValue).toEqual(temporalConflict.conflictDetails.targetValue);
      expect(result.resolution!.rationale).toContain('temporal conflict');
    });

    it('should take "ours" when using OURS strategy', async () => {
      const result = await service.resolveConflict(mockConflict, MergeStrategy.OURS);

      expect(result.resolution).toBeDefined();
      expect(result.resolution!.strategy).toBe('manual');
      expect(result.resolution!.resolvedValue).toEqual(mockConflict.conflictDetails.sourceValue);
      expect(result.resolution!.confidence).toBe(1.0);
    });

    it('should take "theirs" when using THEIRS strategy', async () => {
      const result = await service.resolveConflict(mockConflict, MergeStrategy.THEIRS);

      expect(result.resolution).toBeDefined();
      expect(result.resolution!.strategy).toBe('manual');
      expect(result.resolution!.resolvedValue).toEqual(mockConflict.conflictDetails.targetValue);
      expect(result.resolution!.confidence).toBe(1.0);
    });

    it('should perform three-way merge when base value exists', async () => {
      const result = await service.resolveConflict(mockConflict, MergeStrategy.THREE_WAY);

      // Since we have different values for source and target, it should fall back to LLM
      expect(llmService.analyze).toHaveBeenCalled();
    });

    it('should handle three-way merge with no conflicts', async () => {
      const noConflictScenario: MergeConflict = {
        ...mockConflict,
        conflictDetails: {
          field: 'content',
          sourceValue: { text: 'same content' },
          targetValue: { text: 'same content' },
          baseValue: { text: 'original content' },
        },
      };

      const result = await service.resolveConflict(noConflictScenario, MergeStrategy.THREE_WAY);

      expect(result.resolution).toBeDefined();
      expect(result.resolution!.strategy).toBe('automatic');
      expect(result.resolution!.confidence).toBe(1.0);
    });

    it('should handle structural conflicts', async () => {
      const structuralConflict: MergeConflict = {
        ...mockConflict,
        conflictType: 'structural',
        conflictDetails: {
          field: 'structure',
          sourceValue: { items: ['a', 'b', 'c'] },
          targetValue: { items: ['a', 'b', 'd'] },
        },
      };

      const result = await service.resolveConflict(structuralConflict, MergeStrategy.AUTO);

      expect(result.resolution).toBeDefined();
      expect(result.resolution!.strategy).toBe('automatic');
      // Should merge arrays by removing duplicates
      expect(result.resolution!.resolvedValue.items).toEqual(['a', 'b', 'c', 'd']);
    });

    it('should return original conflict when manual resolution is requested', async () => {
      const result = await service.resolveConflict(mockConflict, MergeStrategy.MANUAL);

      expect(result).toEqual(mockConflict);
      expect(result.resolution).toBeUndefined();
    });

    it('should handle LLM errors gracefully', async () => {
      llmService.analyze.mockRejectedValue(new Error('LLM service unavailable'));

      const result = await service.resolveConflict(mockConflict, MergeStrategy.LLM_ASSISTED);

      expect(result).toEqual(mockConflict);
      expect(result.resolution).toBeUndefined();
    });
  });

  describe('private helper methods', () => {
    it('should merge object structures correctly', () => {
      const source = { type: 'object', value: { a: 1, b: 2 } };
      const target = { type: 'object', value: { b: 3, c: 4 } };

      // Access private method for testing
      const merged = (service as any).mergeStructures(source, target);

      expect(merged).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should merge array structures correctly', () => {
      const source = { type: 'array', value: ['a', 'b'] };
      const target = { type: 'array', value: ['b', 'c'] };

      const merged = (service as any).mergeStructures(source, target);

      expect(merged).toEqual(['a', 'b', 'c']);
    });

    it('should not merge incompatible types', () => {
      const source = { type: 'object', value: {} };
      const target = { type: 'array', value: [] };

      const merged = (service as any).mergeStructures(source, target);

      expect(merged).toBeNull();
    });

    it('should perform three-way merge correctly', () => {
      const base = { content: 'original' };
      const source = { content: 'source change' };
      const target = { content: 'original' }; // No change in target

      const result = (service as any).performThreeWayMerge(base, source, target);

      expect(result.success).toBe(true);
      expect(result.result.content).toBe('source change');
      expect(result.confidence).toBe(0.9);
    });

    it('should detect three-way merge conflicts', () => {
      const base = { content: 'original' };
      const source = { content: 'source change' };
      const target = { content: 'target change' };

      const result = (service as any).performThreeWayMerge(base, source, target);

      expect(result.success).toBe(false);
      expect(result.confidence).toBe(0.0);
    });
  });
});