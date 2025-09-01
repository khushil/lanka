import { TechnologyStackService } from '../../../src/modules/architecture/services/technology-stack.service';
import { Neo4jService } from '../../../src/core/database/neo4j';
import {
  TechnologyLayer,
  PerformanceMetrics,
  CostEstimate,
} from '../../../src/modules/architecture/types/architecture.types';

jest.mock('../../../src/core/database/neo4j');
jest.mock('../../../src/core/logging/logger');

// Mock the extracted services
const mockAnalysisService = {
  analyzeRequirements: jest.fn(),
  evaluateStackCompatibility: jest.fn(),
  predictPerformance: jest.fn(),
  findAlternativeTechnologies: jest.fn(),
  analyzeTechnologyMaturity: jest.fn(),
  compareStacks: jest.fn(),
};

const mockRecommendationService = {
  recommendTechnologyStacks: jest.fn(),
  recommendTechnologies: jest.fn(),
  generateArchitecturalRecommendations: jest.fn(),
  compareAndRecommend: jest.fn(),
};

const mockCostCalculationService = {
  calculateTCO: jest.fn(),
  compareCosts: jest.fn(),
  estimateScalingCosts: jest.fn(),
  trackActualCosts: jest.fn(),
};

jest.mock('../../../src/modules/architecture/services/technology-stack/analysis.service', () => ({
  TechnologyAnalysisService: jest.fn().mockImplementation(() => mockAnalysisService),
}));

jest.mock('../../../src/modules/architecture/services/technology-stack/recommendation.service', () => ({
  RecommendationService: jest.fn().mockImplementation(() => mockRecommendationService),
}));

jest.mock('../../../src/modules/architecture/services/technology-stack/cost-calculation.service', () => ({
  CostCalculationService: jest.fn().mockImplementation(() => mockCostCalculationService),
}));

describe('TechnologyStackService', () => {
  let service: TechnologyStackService;
  let mockNeo4j: jest.Mocked<Neo4jService>;

  beforeEach(() => {
    mockNeo4j = {
      executeQuery: jest.fn(),
    } as any;
    service = new TechnologyStackService(mockNeo4j);
    jest.clearAllMocks();
  });

  describe('createTechnologyStack', () => {
    it('should create a new technology stack', async () => {
      const input = {
        name: 'Modern Web Stack',
        description: 'Full-stack web application technology stack',
        layers: [
          {
            name: 'Frontend',
            technologies: [
              {
                name: 'React',
                version: '18.0',
                license: 'MIT',
                maturity: 'MATURE' as const,
                communitySupport: 0.95,
                learningCurve: 'MEDIUM' as const,
              },
            ],
          },
        ] as TechnologyLayer[],
      };

      mockNeo4j.executeQuery.mockResolvedValue([]);

      const result = await service.createTechnologyStack(input);

      expect(result).toMatchObject({
        name: input.name,
        description: input.description,
        layers: input.layers,
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(mockNeo4j.executeQuery).toHaveBeenCalled();
    });

    it('should handle creation errors', async () => {
      const input = {
        name: 'Test Stack',
        description: 'Test description',
        layers: [],
      };

      mockNeo4j.executeQuery.mockRejectedValue(new Error('Database error'));

      await expect(service.createTechnologyStack(input)).rejects.toThrow('Database error');
    });
  });

  describe('recommendTechnologyStack', () => {
    it('should delegate recommendation to RecommendationService', async () => {
      const requirementIds = ['req-1', 'req-2'];
      const constraints = {
        budget: 10000,
        teamSkills: ['JavaScript', 'Node.js'],
      };

      const mockRecommendations = [
        {
          stack: {
            id: 'stack-1',
            name: 'React Stack',
            description: 'Modern React-based stack',
            layers: [],
            compatibility: { compatible: [], incompatible: [], requires: {} },
            performanceMetrics: {},
            costEstimate: { upfront: 0, monthly: 1000, yearly: 12000, currency: 'USD', breakdown: [] },
            createdAt: '2024-01-01T00:00:00Z',
          },
          score: 85,
          rationale: 'High success rate, good team expertise',
        },
      ];

      mockRecommendationService.recommendTechnologyStacks.mockResolvedValue(mockRecommendations);

      const result = await service.recommendTechnologyStack(requirementIds, constraints);

      expect(result).toEqual(mockRecommendations);
      expect(mockRecommendationService.recommendTechnologyStacks).toHaveBeenCalledWith(
        requirementIds,
        constraints
      );
    });
  });

  describe('evaluateStackCompatibility', () => {
    it('should delegate compatibility evaluation to AnalysisService', async () => {
      const stackId = 'stack-1';
      const existingTechnologies = ['Node.js', 'PostgreSQL'];

      const mockStack = {
        id: stackId,
        name: 'Test Stack',
        description: 'Test description',
        layers: [],
        compatibility: { compatible: [], incompatible: [], requires: {} },
        performanceMetrics: {},
        costEstimate: { upfront: 0, monthly: 0, yearly: 0, currency: 'USD', breakdown: [] },
        createdAt: '2024-01-01T00:00:00Z',
      };

      const mockCompatibilityResult = {
        compatible: true,
        issues: [],
        recommendations: ['Consider adding caching layer'],
      };

      // Mock getTechnologyStackById
      mockNeo4j.executeQuery.mockResolvedValue([
        {
          ts: {
            properties: {
              id: stackId,
              name: mockStack.name,
              description: mockStack.description,
              layers: JSON.stringify(mockStack.layers),
              compatibility: JSON.stringify(mockStack.compatibility),
              performanceMetrics: JSON.stringify(mockStack.performanceMetrics),
              costEstimate: JSON.stringify(mockStack.costEstimate),
              createdAt: mockStack.createdAt,
            },
          },
        },
      ]);

      mockAnalysisService.evaluateStackCompatibility.mockResolvedValue(mockCompatibilityResult);

      const result = await service.evaluateStackCompatibility(stackId, existingTechnologies);

      expect(result).toEqual(mockCompatibilityResult);
      expect(mockAnalysisService.evaluateStackCompatibility).toHaveBeenCalledWith(
        mockStack,
        existingTechnologies
      );
    });

    it('should throw error if stack not found', async () => {
      const stackId = 'non-existent-stack';
      const existingTechnologies = ['Node.js'];

      mockNeo4j.executeQuery.mockResolvedValue([]); // No stack found

      await expect(
        service.evaluateStackCompatibility(stackId, existingTechnologies)
      ).rejects.toThrow('Technology stack not found');
    });
  });

  describe('predictPerformance', () => {
    it('should delegate performance prediction to AnalysisService', async () => {
      const stackId = 'stack-1';
      const workloadCharacteristics = {
        requestsPerSecond: 1000,
        dataVolumeGB: 100,
        concurrentUsers: 500,
        complexity: 'MEDIUM' as const,
      };

      const mockStack = {
        id: stackId,
        name: 'Test Stack',
        description: 'Test description',
        layers: [],
        compatibility: { compatible: [], incompatible: [], requires: {} },
        performanceMetrics: { throughput: 2000, latency: 50 },
        costEstimate: { upfront: 0, monthly: 0, yearly: 0, currency: 'USD', breakdown: [] },
        createdAt: '2024-01-01T00:00:00Z',
      };

      const mockPerformanceMetrics: PerformanceMetrics = {
        throughput: 1800,
        latency: 75,
        scalability: 'Good horizontal scaling capabilities',
        reliability: 0.99,
        maintainability: 0.85,
      };

      // Mock getTechnologyStackById
      mockNeo4j.executeQuery.mockResolvedValue([
        {
          ts: {
            properties: {
              id: stackId,
              name: mockStack.name,
              description: mockStack.description,
              layers: JSON.stringify(mockStack.layers),
              compatibility: JSON.stringify(mockStack.compatibility),
              performanceMetrics: JSON.stringify(mockStack.performanceMetrics),
              costEstimate: JSON.stringify(mockStack.costEstimate),
              createdAt: mockStack.createdAt,
            },
          },
        },
      ]);

      mockAnalysisService.predictPerformance.mockResolvedValue(mockPerformanceMetrics);

      const result = await service.predictPerformance(stackId, workloadCharacteristics);

      expect(result).toEqual(mockPerformanceMetrics);
      expect(mockAnalysisService.predictPerformance).toHaveBeenCalledWith(
        mockStack,
        workloadCharacteristics
      );
    });
  });

  describe('calculateTCO', () => {
    it('should delegate TCO calculation to CostCalculationService', async () => {
      const stackId = 'stack-1';
      const duration = 36;
      const scaling = { growthRate: 10, peakFactor: 2 };

      const mockTCOResult = {
        total: 150000,
        breakdown: {
          licensing: 20000,
          infrastructure: 60000,
          personnel: 50000,
          training: 10000,
          maintenance: 8000,
          opportunity: 2000,
        },
        monthlyAverage: 4167,
        recommendations: ['Consider open-source alternatives'],
      };

      mockCostCalculationService.calculateTCO.mockResolvedValue(mockTCOResult);

      const result = await service.calculateTCO(stackId, duration, scaling);

      expect(result).toEqual(mockTCOResult);
      expect(mockCostCalculationService.calculateTCO).toHaveBeenCalledWith(stackId, duration, scaling);
    });
  });

  describe('trackStackSuccess', () => {
    it('should track stack success metrics', async () => {
      const stackId = 'stack-1';
      const projectId = 'project-1';
      const metrics = {
        implementationTime: 120, // days
        defectRate: 0.05,
        performanceAchieved: {
          throughput: 1500,
          latency: 80,
        } as PerformanceMetrics,
        teamSatisfaction: 0.8,
        actualCost: {
          upfront: 5000,
          monthly: 2000,
          yearly: 24000,
          currency: 'USD',
          breakdown: [],
        } as CostEstimate,
      };

      mockNeo4j.executeQuery.mockResolvedValue([]);

      await service.trackStackSuccess(stackId, projectId, metrics);

      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('CREATE (p)-[:USED_STACK'),
        expect.objectContaining({
          stackId,
          projectId,
          implementationTime: metrics.implementationTime,
          defectRate: metrics.defectRate,
          teamSatisfaction: metrics.teamSatisfaction,
        })
      );
    });
  });

  describe('findAlternativeTechnologies', () => {
    it('should delegate alternative technology search to AnalysisService', async () => {
      const technology = 'React';
      const criteria = {
        maxCost: 1000,
        minMaturity: 'STABLE',
        requiredFeatures: ['Virtual DOM', 'Component-based'],
      };

      const mockAlternatives = [
        {
          name: 'Vue.js',
          version: '3.0',
          license: 'MIT',
          maturity: 'MATURE' as const,
          communitySupport: 0.9,
          learningCurve: 'MEDIUM' as const,
        },
        {
          name: 'Svelte',
          version: '4.0',
          license: 'MIT',
          maturity: 'STABLE' as const,
          communitySupport: 0.8,
          learningCurve: 'LOW' as const,
        },
      ];

      mockAnalysisService.findAlternativeTechnologies.mockResolvedValue(mockAlternatives);

      const result = await service.findAlternativeTechnologies(technology, criteria);

      expect(result).toEqual(mockAlternatives);
      expect(mockAnalysisService.findAlternativeTechnologies).toHaveBeenCalledWith(
        technology,
        criteria
      );
    });
  });

  describe('recommendTechnologies', () => {
    it('should delegate technology recommendation to RecommendationService', async () => {
      const requirementIds = ['req-1'];
      const patternIds = ['pattern-1'];
      const constraints = ['budget < 10000'];

      const mockRecommendations = [
        {
          technologyStack: {
            id: 'stack-1',
            name: 'Recommended Stack',
          },
          suitabilityScore: 0.8,
          alignmentReason: 'Good match for requirements',
          implementationEffort: 30,
          learningCurveImpact: 'LOW' as const,
          riskFactors: ['New technology'],
        },
      ];

      mockRecommendationService.recommendTechnologies.mockResolvedValue(mockRecommendations);

      const result = await service.recommendTechnologies(requirementIds, patternIds, constraints);

      expect(result).toEqual(mockRecommendations);
      expect(mockRecommendationService.recommendTechnologies).toHaveBeenCalledWith(
        requirementIds,
        patternIds,
        constraints
      );
    });
  });

  describe('getTechnologyStacks', () => {
    it('should retrieve technology stacks with filters', async () => {
      const filters = {
        teamExpertise: 0.7,
        limit: 10,
        offset: 0,
      };

      const mockStacks = [
        {
          ts: {
            properties: {
              id: 'stack-1',
              name: 'High Expertise Stack',
              description: 'Stack with high team expertise',
              layers: JSON.stringify([]),
              compatibility: JSON.stringify({}),
              performanceMetrics: JSON.stringify({}),
              costEstimate: JSON.stringify({}),
              teamExpertise: 0.8,
              successRate: 0.9,
              createdAt: '2024-01-01T00:00:00Z',
            },
          },
        },
      ];

      mockNeo4j.executeQuery.mockResolvedValue(mockStacks);

      const result = await service.getTechnologyStacks(filters);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'stack-1',
        name: 'High Expertise Stack',
        teamExpertise: 0.8,
        successRate: 0.9,
      });

      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ts.teamExpertise >= $teamExpertise'),
        expect.objectContaining({
          teamExpertise: 0.7,
          limit: 10,
          offset: 0,
        })
      );
    });
  });

  describe('updateTechnologyStack', () => {
    it('should update technology stack successfully', async () => {
      const stackId = 'stack-1';
      const updateInput = {
        name: 'Updated Stack Name',
        description: 'Updated description',
        teamExpertise: 0.9,
      };

      const mockUpdatedStack = {
        ts: {
          properties: {
            id: stackId,
            name: updateInput.name,
            description: updateInput.description,
            layers: JSON.stringify([]),
            compatibility: JSON.stringify({}),
            performanceMetrics: JSON.stringify({}),
            costEstimate: JSON.stringify({}),
            teamExpertise: updateInput.teamExpertise,
            updatedAt: '2024-01-02T00:00:00Z',
          },
        },
      };

      mockNeo4j.executeQuery.mockResolvedValue([mockUpdatedStack]);

      const result = await service.updateTechnologyStack(stackId, updateInput);

      expect(result).toMatchObject({
        id: stackId,
        name: updateInput.name,
        description: updateInput.description,
        teamExpertise: updateInput.teamExpertise,
      });

      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET ts.name = $name'),
        expect.objectContaining({
          id: stackId,
          name: updateInput.name,
          description: updateInput.description,
          teamExpertise: updateInput.teamExpertise,
        })
      );
    });

    it('should return null if stack not found', async () => {
      const stackId = 'non-existent-stack';
      const updateInput = { name: 'New Name' };

      mockNeo4j.executeQuery.mockResolvedValue([]); // No stack found

      const result = await service.updateTechnologyStack(stackId, updateInput);

      expect(result).toBeNull();
    });
  });
});