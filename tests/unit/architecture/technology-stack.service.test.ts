import { TechnologyStackService } from '../../../src/modules/architecture/services/technology-stack.service';
import { Neo4jService } from '../../../src/core/database/neo4j';
import {
  TechnologyLayer,
  PerformanceMetrics,
  CostEstimate,
} from '../../../src/modules/architecture/types/architecture.types';

jest.mock('../../../src/core/database/neo4j');
jest.mock('../../../src/core/logging/logger');

describe('TechnologyStackService', () => {
  let service: TechnologyStackService;
  let mockNeo4j: jest.Mocked<Neo4jService>;

  beforeEach(() => {
    mockNeo4j = {
      executeQuery: jest.fn(),
    } as any;
    service = new TechnologyStackService(mockNeo4j);
  });

  afterEach(() => {
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
    it('should recommend technology stacks based on requirements', async () => {
      const requirementIds = ['req-1', 'req-2'];
      const constraints = {
        budget: 10000,
        teamSkills: ['JavaScript', 'Node.js'],
      };

      // Mock requirement analysis
      mockNeo4j.executeQuery
        .mockResolvedValueOnce([
          {
            analysis: {
              types: ['FUNCTIONAL', 'NON_FUNCTIONAL'],
              priorities: ['HIGH', 'MEDIUM'],
              hasRealTime: true,
              hasHighVolume: false,
              hasSecurity: true,
              hasCompliance: false,
            },
          },
        ])
        // Mock candidate stacks
        .mockResolvedValueOnce([
          {
            ts: {
              properties: {
                id: 'stack-1',
                name: 'Stack 1',
                description: 'Test stack',
                layers: '[]',
                compatibility: '{}',
                performanceMetrics: '{"latency": 50}',
                costEstimate: '{"monthly": 5000}',
                successRate: 0.85,
                teamExpertise: 0.8,
                createdAt: '2024-01-01',
              },
            },
          },
        ]);

      const result = await service.recommendTechnologyStack(requirementIds, constraints);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('stack');
      expect(result[0]).toHaveProperty('score');
      expect(result[0]).toHaveProperty('rationale');
      expect(result[0].stack.name).toBe('Stack 1');
    });
  });

  describe('evaluateStackCompatibility', () => {
    it('should evaluate compatibility with existing technologies', async () => {
      const stackId = 'stack-1';
      const existingTechnologies = ['Node.js', 'PostgreSQL'];

      mockNeo4j.executeQuery.mockResolvedValue([
        {
          ts: {
            properties: {
              id: stackId,
              name: 'Test Stack',
              description: 'Test',
              layers: JSON.stringify([
                {
                  name: 'Backend',
                  technologies: [
                    {
                      name: 'Express',
                      version: '4.0',
                      license: 'MIT',
                      maturity: 'MATURE',
                      communitySupport: 0.9,
                      learningCurve: 'LOW',
                    },
                  ],
                },
              ]),
              compatibility: JSON.stringify({
                compatible: ['Node.js', 'PostgreSQL'],
                incompatible: [],
                requires: {},
              }),
              performanceMetrics: '{}',
              costEstimate: '{}',
              createdAt: '2024-01-01',
            },
          },
        },
      ]);

      const result = await service.evaluateStackCompatibility(stackId, existingTechnologies);

      expect(result.compatible).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.recommendations).toHaveLength(0);
    });

    it('should identify incompatibilities', async () => {
      const stackId = 'stack-1';
      const existingTechnologies = ['Java'];

      mockNeo4j.executeQuery.mockResolvedValue([
        {
          ts: {
            properties: {
              id: stackId,
              name: 'Test Stack',
              description: 'Test',
              layers: '[]',
              compatibility: JSON.stringify({
                compatible: [],
                incompatible: ['Java'],
                requires: {},
              }),
              performanceMetrics: '{}',
              costEstimate: '{}',
              createdAt: '2024-01-01',
            },
          },
        },
      ]);

      const result = await service.evaluateStackCompatibility(stackId, existingTechnologies);

      expect(result.compatible).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('predictPerformance', () => {
    it('should predict performance based on workload characteristics', async () => {
      const stackId = 'stack-1';
      const workloadCharacteristics = {
        requestsPerSecond: 1000,
        dataVolumeGB: 100,
        concurrentUsers: 5000,
        complexity: 'HIGH' as const,
      };

      mockNeo4j.executeQuery
        // Get stack
        .mockResolvedValueOnce([
          {
            ts: {
              properties: {
                id: stackId,
                name: 'Test Stack',
                description: 'Test',
                layers: '[]',
                compatibility: '{}',
                performanceMetrics: JSON.stringify({
                  throughput: 2000,
                  latency: 100,
                  scalability: 'good',
                  reliability: 0.99,
                  maintainability: 0.8,
                }),
                costEstimate: '{}',
                createdAt: '2024-01-01',
              },
            },
          },
        ])
        // Get historical performance
        .mockResolvedValueOnce([])
        // Store prediction
        .mockResolvedValueOnce([]);

      const result = await service.predictPerformance(stackId, workloadCharacteristics);

      expect(result).toHaveProperty('throughput');
      expect(result).toHaveProperty('latency');
      expect(result).toHaveProperty('scalability');
      expect(result).toHaveProperty('reliability');
      expect(result).toHaveProperty('maintainability');
    });
  });

  describe('calculateTCO', () => {
    it('should calculate total cost of ownership', async () => {
      const stackId = 'stack-1';
      const duration = 36; // months
      const scaling = {
        growthRate: 20, // 20% per year
        peakFactor: 2,
      };

      mockNeo4j.executeQuery.mockResolvedValue([
        {
          ts: {
            properties: {
              id: stackId,
              name: 'Test Stack',
              description: 'Test',
              layers: JSON.stringify([
                {
                  name: 'Backend',
                  technologies: [
                    {
                      name: 'Node.js',
                      version: '18',
                      license: 'MIT',
                      maturity: 'MATURE',
                      communitySupport: 0.95,
                      learningCurve: 'LOW',
                    },
                  ],
                },
              ]),
              compatibility: '{}',
              performanceMetrics: '{}',
              costEstimate: JSON.stringify({
                upfront: 0,
                monthly: 5000,
                yearly: 60000,
                currency: 'USD',
                breakdown: [],
              }),
              createdAt: '2024-01-01',
            },
          },
        },
      ]);

      const result = await service.calculateTCO(stackId, duration, scaling);

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('breakdown');
      expect(result).toHaveProperty('monthlyAverage');
      expect(result).toHaveProperty('recommendations');
      expect(result.breakdown).toHaveProperty('licensing');
      expect(result.breakdown).toHaveProperty('infrastructure');
      expect(result.breakdown).toHaveProperty('personnel');
      expect(result.breakdown).toHaveProperty('training');
      expect(result.breakdown).toHaveProperty('maintenance');
      expect(result.breakdown).toHaveProperty('opportunity');
      expect(result.total).toBeGreaterThan(0);
    });
  });

  describe('trackStackSuccess', () => {
    it('should track success metrics for a technology stack', async () => {
      const stackId = 'stack-1';
      const projectId = 'project-1';
      const metrics = {
        implementationTime: 90,
        defectRate: 0.05,
        performanceAchieved: {
          throughput: 1800,
          latency: 110,
          scalability: 'good',
          reliability: 0.98,
          maintainability: 0.75,
        } as PerformanceMetrics,
        teamSatisfaction: 0.85,
        actualCost: {
          upfront: 1000,
          monthly: 4500,
          yearly: 54000,
          currency: 'USD',
          breakdown: [],
        } as CostEstimate,
      };

      mockNeo4j.executeQuery.mockResolvedValue([]);

      await service.trackStackSuccess(stackId, projectId, metrics);

      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (ts:TechnologyStack {id: $stackId})'),
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
    it('should find alternative technologies based on criteria', async () => {
      const technology = 'React';
      const criteria = {
        maxCost: 1000,
        minMaturity: 'STABLE',
        requiredFeatures: ['component-based', 'virtual-dom'],
      };

      const result = await service.findAlternativeTechnologies(technology, criteria);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(5);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('name');
        expect(result[0]).toHaveProperty('version');
        expect(result[0]).toHaveProperty('license');
        expect(result[0]).toHaveProperty('maturity');
        expect(result[0]).toHaveProperty('communitySupport');
        expect(result[0]).toHaveProperty('learningCurve');
      }
    });
  });
});