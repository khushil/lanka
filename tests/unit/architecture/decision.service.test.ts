import { ArchitectureDecisionService } from '../../../src/modules/architecture/services/decision.service';
import { Neo4jService } from '../../../src/core/database/neo4j';
import {
  ArchitectureDecisionStatus,
  Alternative,
  TradeOff,
} from '../../../src/modules/architecture/types/architecture.types';

jest.mock('../../../src/core/database/neo4j');
jest.mock('../../../src/core/logging/logger');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

describe('ArchitectureDecisionService', () => {
  let service: ArchitectureDecisionService;
  let mockNeo4j: jest.Mocked<Neo4jService>;

  beforeEach(() => {
    mockNeo4j = {
      executeQuery: jest.fn(),
    } as any;
    service = new ArchitectureDecisionService(mockNeo4j);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDecision', () => {
    it('should create a new architecture decision', async () => {
      const input = {
        title: 'Microservices vs Monolith',
        description: 'Decision on application architecture style',
        rationale: 'Need for scalability and independent deployments',
        alternatives: [
          {
            title: 'Monolithic Architecture',
            description: 'Single deployable unit',
            pros: ['Simpler to develop', 'Easier to test'],
            cons: ['Harder to scale', 'Technology lock-in'],
          },
        ] as Alternative[],
        consequences: ['Increased operational complexity', 'Better scalability'],
        tradeOffs: [
          {
            aspect: 'Development Speed',
            gain: 'Faster initial development',
            loss: 'Slower feature additions over time',
          },
        ] as TradeOff[],
        projectId: 'project-1',
        requirementIds: ['req-1', 'req-2'],
      };

      mockNeo4j.executeQuery
        // First query for creating decision
        .mockResolvedValueOnce([])
        // Second query for suggesting patterns
        .mockResolvedValueOnce([]);

      const result = await service.createDecision(input);

      expect(result).toMatchObject({
        id: 'test-uuid',
        title: input.title,
        description: input.description,
        rationale: input.rationale,
        status: ArchitectureDecisionStatus.DRAFT,
        alternatives: input.alternatives,
        consequences: input.consequences,
        tradeOffs: input.tradeOffs,
        projectId: input.projectId,
        requirementIds: input.requirementIds,
      });
      expect(result.createdAt).toBeDefined();
      expect(mockNeo4j.executeQuery).toHaveBeenCalledTimes(2);
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('CREATE (ad:ArchitectureDecision'),
        expect.objectContaining({
          id: 'test-uuid',
          title: input.title,
          projectId: input.projectId,
        })
      );
    });

    it('should handle creation errors', async () => {
      const input = {
        title: 'Test Decision',
        description: 'Test',
        rationale: 'Test rationale',
        projectId: 'project-1',
        requirementIds: [],
      };

      mockNeo4j.executeQuery.mockRejectedValue(new Error('Database error'));

      await expect(service.createDecision(input)).rejects.toThrow('Database error');
    });
  });

  describe('updateDecisionStatus', () => {
    it('should update decision status to APPROVED', async () => {
      const id = 'decision-1';
      const status = ArchitectureDecisionStatus.APPROVED;

      mockNeo4j.executeQuery.mockResolvedValue([
        {
          ad: {
            properties: {
              id,
              title: 'Test Decision',
              description: 'Test',
              rationale: 'Test rationale',
              status: ArchitectureDecisionStatus.APPROVED,
              alternatives: '[]',
              consequences: '[]',
              tradeOffs: '[]',
              createdAt: '2024-01-01',
              updatedAt: '2024-01-02',
              approvedAt: '2024-01-02',
              projectId: 'project-1',
            },
          },
        },
      ]);

      const result = await service.updateDecisionStatus(id, status);

      expect(result).toBeTruthy();
      expect(result?.status).toBe(ArchitectureDecisionStatus.APPROVED);
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET'),
        expect.objectContaining({
          id,
          status,
          approvedAt: expect.any(String),
        })
      );
    });

    it('should update decision status to DEPRECATED', async () => {
      const id = 'decision-1';
      const status = ArchitectureDecisionStatus.DEPRECATED;

      mockNeo4j.executeQuery.mockResolvedValue([
        {
          ad: {
            properties: {
              id,
              title: 'Test Decision',
              description: 'Test',
              rationale: 'Test rationale',
              status: ArchitectureDecisionStatus.DEPRECATED,
              alternatives: '[]',
              consequences: '[]',
              tradeOffs: '[]',
              createdAt: '2024-01-01',
              updatedAt: '2024-01-02',
              deprecatedAt: '2024-01-02',
              projectId: 'project-1',
            },
          },
        },
      ]);

      const result = await service.updateDecisionStatus(id, status);

      expect(result).toBeTruthy();
      expect(result?.status).toBe(ArchitectureDecisionStatus.DEPRECATED);
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET'),
        expect.objectContaining({
          id,
          status,
          deprecatedAt: expect.any(String),
        })
      );
    });

    it('should return null if decision not found', async () => {
      const id = 'non-existent';
      const status = ArchitectureDecisionStatus.APPROVED;

      mockNeo4j.executeQuery.mockResolvedValue([]);

      const result = await service.updateDecisionStatus(id, status);

      expect(result).toBeNull();
    });
  });

  describe('linkToPattern', () => {
    it('should link a decision to a pattern', async () => {
      const decisionId = 'decision-1';
      const patternId = 'pattern-1';
      const adaptations = ['Adapted for microservices', 'Used with cloud deployment'];

      mockNeo4j.executeQuery.mockResolvedValue([]);

      await service.linkToPattern(decisionId, patternId, adaptations);

      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('CREATE (ad)-[:USES_PATTERN'),
        expect.objectContaining({
          decisionId,
          patternId,
          adaptations: JSON.stringify(adaptations),
        })
      );
    });

    it('should handle link without adaptations', async () => {
      const decisionId = 'decision-1';
      const patternId = 'pattern-1';

      mockNeo4j.executeQuery.mockResolvedValue([]);

      await service.linkToPattern(decisionId, patternId);

      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          adaptations: JSON.stringify([]),
        })
      );
    });
  });

  describe('findDecisionsByProject', () => {
    it('should find all decisions for a project', async () => {
      const projectId = 'project-1';

      mockNeo4j.executeQuery.mockResolvedValue([
        {
          ad: {
            properties: {
              id: 'decision-1',
              title: 'Decision 1',
              description: 'First decision',
              rationale: 'Rationale 1',
              status: ArchitectureDecisionStatus.APPROVED,
              alternatives: '[]',
              consequences: '[]',
              tradeOffs: '[]',
              createdAt: '2024-01-01',
              projectId,
            },
          },
          requirementIds: ['req-1', 'req-2'],
          patternIds: ['pattern-1'],
        },
        {
          ad: {
            properties: {
              id: 'decision-2',
              title: 'Decision 2',
              description: 'Second decision',
              rationale: 'Rationale 2',
              status: ArchitectureDecisionStatus.DRAFT,
              alternatives: '[]',
              consequences: '[]',
              tradeOffs: '[]',
              createdAt: '2024-01-02',
              projectId,
            },
          },
          requirementIds: ['req-3'],
          patternIds: [],
        },
      ]);

      const result = await service.findDecisionsByProject(projectId);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Decision 1');
      expect(result[0].requirementIds).toEqual(['req-1', 'req-2']);
      expect(result[0].patternIds).toEqual(['pattern-1']);
      expect(result[1].title).toBe('Decision 2');
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (p:Project {id: $projectId})'),
        { projectId }
      );
    });
  });

  describe('findSimilarDecisions', () => {
    it('should find similar decisions based on requirements', async () => {
      const decisionId = 'decision-1';
      const threshold = 0.7;

      mockNeo4j.executeQuery.mockResolvedValue([
        {
          ad2: {
            properties: {
              id: 'decision-2',
              title: 'Similar Decision',
              description: 'A similar architecture decision',
              rationale: 'Similar rationale',
              status: ArchitectureDecisionStatus.APPROVED,
              alternatives: '[]',
              consequences: '[]',
              tradeOffs: '[]',
              createdAt: '2024-01-01',
              projectId: 'project-2',
            },
          },
          similarity: 0.85,
          projectName: 'Project 2',
        },
      ]);

      const result = await service.findSimilarDecisions(decisionId, threshold);

      expect(result).toHaveLength(1);
      expect(result[0].decision.title).toBe('Similar Decision');
      expect(result[0].similarity).toBe(0.85);
      expect(result[0].projectName).toBe('Project 2');
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('similarity > $threshold'),
        expect.objectContaining({ decisionId, threshold })
      );
    });

    it('should use default threshold if not provided', async () => {
      const decisionId = 'decision-1';

      mockNeo4j.executeQuery.mockResolvedValue([]);

      await service.findSimilarDecisions(decisionId);

      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ threshold: 0.7 })
      );
    });
  });

  describe('getDecisionMetrics', () => {
    it('should get metrics for a decision', async () => {
      const decisionId = 'decision-1';

      mockNeo4j.executeQuery.mockResolvedValue([
        {
          metrics: {
            decisionId,
            requirementsCovered: 5,
            patternsUsed: 2,
            estimatedCost: { monthly: 5000 },
            actualOutcomes: [
              { success: true, qualityScore: 0.85 },
            ],
            status: ArchitectureDecisionStatus.APPROVED,
          },
        },
      ]);

      const result = await service.getDecisionMetrics(decisionId);

      expect(result.decisionId).toBe(decisionId);
      expect(result.requirementsCovered).toBe(5);
      expect(result.patternsUsed).toBe(2);
      expect(result.estimatedCost).toEqual({ monthly: 5000 });
      expect(result.actualOutcomes).toHaveLength(1);
      expect(result.status).toBe(ArchitectureDecisionStatus.APPROVED);
    });

    it('should return empty metrics if decision not found', async () => {
      const decisionId = 'non-existent';

      mockNeo4j.executeQuery.mockResolvedValue([]);

      const result = await service.getDecisionMetrics(decisionId);

      expect(result).toEqual({});
    });
  });

  describe('status transitions', () => {
    it('should handle all status transitions correctly', async () => {
      const id = 'decision-1';
      const statuses = [
        ArchitectureDecisionStatus.DRAFT,
        ArchitectureDecisionStatus.PROPOSED,
        ArchitectureDecisionStatus.APPROVED,
        ArchitectureDecisionStatus.IMPLEMENTED,
        ArchitectureDecisionStatus.DEPRECATED,
        ArchitectureDecisionStatus.SUPERSEDED,
      ];

      for (const status of statuses) {
        mockNeo4j.executeQuery.mockResolvedValue([
          {
            ad: {
              properties: {
                id,
                title: 'Test Decision',
                description: 'Test',
                rationale: 'Test rationale',
                status,
                alternatives: '[]',
                consequences: '[]',
                tradeOffs: '[]',
                createdAt: '2024-01-01',
                projectId: 'project-1',
              },
            },
          },
        ]);

        const result = await service.updateDecisionStatus(id, status);

        expect(result?.status).toBe(status);
      }
    });
  });

  describe('private methods behavior', () => {
    it('should properly map database nodes to decision objects', async () => {
      const projectId = 'project-1';
      const dbNode = {
        ad: {
          properties: {
            id: 'decision-1',
            title: 'Test Decision',
            description: 'Test description',
            rationale: 'Test rationale',
            status: ArchitectureDecisionStatus.APPROVED,
            alternatives: '[{"title": "Alt 1"}]',
            consequences: '["Consequence 1"]',
            tradeOffs: '[{"aspect": "Performance"}]',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-02T00:00:00Z',
            approvedAt: '2024-01-02T00:00:00Z',
            projectId,
          },
        },
        requirementIds: ['req-1'],
        patternIds: [],
      };

      mockNeo4j.executeQuery.mockResolvedValue([dbNode]);

      const result = await service.findDecisionsByProject(projectId);

      expect(result).toHaveLength(1);
      const decision = result[0];
      expect(decision.id).toBe('decision-1');
      expect(decision.title).toBe('Test Decision');
      expect(decision.alternatives).toEqual([{ title: 'Alt 1' }]);
      expect(decision.consequences).toEqual(['Consequence 1']);
      expect(decision.tradeOffs).toEqual([{ aspect: 'Performance' }]);
      expect(decision.approvedAt).toBe('2024-01-02T00:00:00Z');
      expect(decision.requirementIds).toEqual(['req-1']);
      expect(decision.patternIds).toEqual([]);
    });
  });
});