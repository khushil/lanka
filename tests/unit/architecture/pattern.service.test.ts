import { ArchitecturePatternService } from '../../../src/modules/architecture/services/pattern.service';
import { Neo4jService } from '../../../src/core/database/neo4j';
import {
  ArchitecturePatternType,
  PatternComponent,
  QualityAttribute,
} from '../../../src/modules/architecture/types/architecture.types';

jest.mock('../../../src/core/database/neo4j');
jest.mock('../../../src/core/logging/logger');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

describe('ArchitecturePatternService', () => {
  let service: ArchitecturePatternService;
  let mockNeo4j: jest.Mocked<Neo4jService>;

  beforeEach(() => {
    mockNeo4j = {
      executeQuery: jest.fn(),
    } as any;
    service = new ArchitecturePatternService(mockNeo4j);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPattern', () => {
    it('should create a new architecture pattern', async () => {
      const input = {
        name: 'Microservices Pattern',
        type: ArchitecturePatternType.MICROSERVICES,
        description: 'Distributed service-oriented architecture',
        applicabilityConditions: ['High scalability needed', 'Independent deployment required'],
        components: [
          {
            name: 'API Gateway',
            responsibility: 'Entry point for all client requests',
            interactions: ['Service Registry', 'Microservices'],
          },
        ] as PatternComponent[],
        qualityAttributes: [
          {
            name: 'Scalability',
            impact: 'POSITIVE' as const,
            description: 'Enables independent scaling of services',
          },
        ] as QualityAttribute[],
        knownUses: ['Netflix', 'Amazon', 'Uber'],
      };

      mockNeo4j.executeQuery.mockResolvedValue([]);

      const result = await service.createPattern(input);

      expect(result).toMatchObject({
        id: 'test-uuid',
        name: input.name,
        type: input.type,
        description: input.description,
        applicabilityConditions: input.applicabilityConditions,
        components: input.components,
        qualityAttributes: input.qualityAttributes,
        knownUses: input.knownUses,
        successRate: 0,
        adoptionCount: 0,
      });
      expect(result.createdAt).toBeDefined();
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('CREATE (ap:ArchitecturePattern'),
        expect.objectContaining({
          id: 'test-uuid',
          name: input.name,
          type: input.type,
        })
      );
    });

    it('should handle creation errors', async () => {
      const input = {
        name: 'Test Pattern',
        type: ArchitecturePatternType.LAYERED,
        description: 'Test description',
        applicabilityConditions: [],
        components: [],
        qualityAttributes: [],
      };

      mockNeo4j.executeQuery.mockRejectedValue(new Error('Database error'));

      await expect(service.createPattern(input)).rejects.toThrow('Database error');
    });
  });

  describe('findPatternsByType', () => {
    it('should find patterns by type', async () => {
      const type = ArchitecturePatternType.MICROSERVICES;

      mockNeo4j.executeQuery.mockResolvedValue([
        {
          ap: {
            properties: {
              id: 'pattern-1',
              name: 'Pattern 1',
              type: ArchitecturePatternType.MICROSERVICES,
              description: 'Test pattern 1',
              applicabilityConditions: '["condition1"]',
              components: '[]',
              qualityAttributes: '[]',
              knownUses: '[]',
              successRate: 0.9,
              adoptionCount: 10,
              createdAt: '2024-01-01',
            },
          },
        },
        {
          ap: {
            properties: {
              id: 'pattern-2',
              name: 'Pattern 2',
              type: ArchitecturePatternType.MICROSERVICES,
              description: 'Test pattern 2',
              applicabilityConditions: '["condition2"]',
              components: '[]',
              qualityAttributes: '[]',
              knownUses: '[]',
              successRate: 0.85,
              adoptionCount: 5,
              createdAt: '2024-01-02',
            },
          },
        },
      ]);

      const result = await service.findPatternsByType(type);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Pattern 1');
      expect(result[0].type).toBe(ArchitecturePatternType.MICROSERVICES);
      expect(result[0].successRate).toBe(0.9);
      expect(result[1].name).toBe('Pattern 2');
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (ap:ArchitecturePattern {type: $type})'),
        { type }
      );
    });
  });

  describe('recommendPatternsForRequirements', () => {
    it('should recommend patterns based on requirements', async () => {
      const requirementIds = ['req-1', 'req-2'];

      mockNeo4j.executeQuery.mockResolvedValue([
        {
          ap: {
            properties: {
              id: 'pattern-1',
              name: 'Recommended Pattern',
              type: ArchitecturePatternType.MICROSERVICES,
              description: 'Best fit pattern',
              applicabilityConditions: '["High scalability"]',
              components: '[]',
              qualityAttributes: '[]',
              knownUses: '[]',
              successRate: 0.95,
              adoptionCount: 20,
              createdAt: '2024-01-01',
            },
          },
          score: 85.5,
        },
      ]);

      const result = await service.recommendPatternsForRequirements(requirementIds);

      expect(result).toHaveLength(1);
      expect(result[0].pattern.name).toBe('Recommended Pattern');
      expect(result[0].score).toBe(85.5);
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('UNWIND $requirementIds AS reqId'),
        { requirementIds }
      );
    });
  });

  describe('extractPatternsFromSuccessfulProjects', () => {
    it('should extract patterns from successful projects', async () => {
      const minSuccessRate = 0.8;

      mockNeo4j.executeQuery
        // First query for existing patterns
        .mockResolvedValueOnce([
          {
            ap: {
              properties: {
                id: 'pattern-1',
                name: 'Extracted Pattern 1',
                type: ArchitecturePatternType.MICROSERVICES,
                description: 'Pattern from successful projects',
                applicabilityConditions: '[]',
                components: '[]',
                qualityAttributes: '[]',
                knownUses: '["project-1", "project-2"]',
                successRate: 0.9,
                adoptionCount: 15,
                createdAt: '2024-01-01',
              },
            },
          },
        ])
        // Second query for identifying new patterns
        .mockResolvedValueOnce([]);

      const result = await service.extractPatternsFromSuccessfulProjects(minSuccessRate);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Extracted Pattern 1');
      expect(result[0].successRate).toBe(0.9);
      expect(mockNeo4j.executeQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('updatePatternSuccess', () => {
    it('should update pattern success metrics', async () => {
      const patternId = 'pattern-1';
      const projectId = 'project-1';
      const success = true;
      const metrics = { performanceGain: 25, defectReduction: 30 };

      mockNeo4j.executeQuery.mockResolvedValue([]);

      await service.updatePatternSuccess(patternId, projectId, success, metrics);

      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (ap:ArchitecturePattern {id: $patternId})'),
        expect.objectContaining({
          patternId,
          projectId,
          success,
          metrics: JSON.stringify(metrics),
        })
      );
    });
  });

  describe('findSimilarPatterns', () => {
    it('should find similar patterns based on quality attributes', async () => {
      const patternId = 'pattern-1';
      const threshold = 0.7;

      mockNeo4j.executeQuery.mockResolvedValue([
        {
          ap2: {
            properties: {
              id: 'pattern-2',
              name: 'Similar Pattern',
              type: ArchitecturePatternType.MICROSERVICES,
              description: 'A similar pattern',
              applicabilityConditions: '[]',
              components: '[]',
              qualityAttributes: '[{"name": "Scalability", "impact": "POSITIVE"}]',
              knownUses: '[]',
              successRate: 0.85,
              adoptionCount: 8,
              createdAt: '2024-01-01',
            },
          },
        },
      ]);

      const result = await service.findSimilarPatterns(patternId, threshold);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Similar Pattern');
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (ap1:ArchitecturePattern {id: $patternId})'),
        { patternId, threshold }
      );
    });

    it('should use default threshold if not provided', async () => {
      const patternId = 'pattern-1';

      mockNeo4j.executeQuery.mockResolvedValue([]);

      await service.findSimilarPatterns(patternId);

      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ threshold: 0.7 })
      );
    });
  });

  describe('getPatternMetrics', () => {
    it('should get aggregated pattern metrics', async () => {
      mockNeo4j.executeQuery.mockResolvedValue([
        {
          metrics: {
            totalPatterns: 25,
            avgSuccessRate: 0.82,
            avgAdoptionCount: 12.5,
            totalDecisions: 150,
            totalProjects: 45,
            patternTypes: [
              ArchitecturePatternType.MICROSERVICES,
              ArchitecturePatternType.LAYERED,
              ArchitecturePatternType.EVENT_DRIVEN,
            ],
          },
        },
      ]);

      const result = await service.getPatternMetrics();

      expect(result.totalPatterns).toBe(25);
      expect(result.avgSuccessRate).toBe(0.82);
      expect(result.avgAdoptionCount).toBe(12.5);
      expect(result.totalDecisions).toBe(150);
      expect(result.totalProjects).toBe(45);
      expect(result.patternTypes).toHaveLength(3);
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (ap:ArchitecturePattern)')
      );
    });

    it('should return empty metrics when no patterns exist', async () => {
      mockNeo4j.executeQuery.mockResolvedValue([]);

      const result = await service.getPatternMetrics();

      expect(result).toEqual({});
    });
  });

  describe('pattern type validation', () => {
    it('should handle all architecture pattern types', async () => {
      const types = Object.values(ArchitecturePatternType);

      for (const type of types) {
        mockNeo4j.executeQuery.mockResolvedValue([]);
        
        const result = await service.findPatternsByType(type);
        
        expect(result).toEqual([]);
        expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
          expect.any(String),
          { type }
        );
      }
    });
  });

  describe('private method behavior', () => {
    it('should properly map database nodes to pattern objects', async () => {
      const dbNode = {
        ap: {
          properties: {
            id: 'pattern-1',
            name: 'Test Pattern',
            type: ArchitecturePatternType.LAYERED,
            description: 'Test description',
            applicabilityConditions: '["condition1", "condition2"]',
            components: '[{"name": "Component1"}]',
            qualityAttributes: '[{"name": "Performance", "impact": "POSITIVE"}]',
            knownUses: '["Project1", "Project2"]',
            successRate: 0.75,
            adoptionCount: 10,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-02T00:00:00Z',
          },
        },
      };

      mockNeo4j.executeQuery.mockResolvedValue([dbNode]);

      const result = await service.findPatternsByType(ArchitecturePatternType.LAYERED);

      expect(result).toHaveLength(1);
      const pattern = result[0];
      expect(pattern.id).toBe('pattern-1');
      expect(pattern.name).toBe('Test Pattern');
      expect(pattern.applicabilityConditions).toEqual(['condition1', 'condition2']);
      expect(pattern.components).toEqual([{ name: 'Component1' }]);
      expect(pattern.qualityAttributes).toEqual([{ name: 'Performance', impact: 'POSITIVE' }]);
      expect(pattern.knownUses).toEqual(['Project1', 'Project2']);
      expect(pattern.successRate).toBe(0.75);
      expect(pattern.adoptionCount).toBe(10);
      expect(pattern.updatedAt).toBe('2024-01-02T00:00:00Z');
    });
  });
});