/**
 * Quality Predictor Service Unit Tests
 * Tests for AI-powered quality prediction and risk assessment
 */

import { QualityPredictorService } from '../../../src/modules/development/services/quality-predictor.service';
import { Neo4jService } from '../../../src/core/database/neo4j';
import {
  QualityPrediction,
  Priority,
  RiskFactor,
  PredictedIssue,
  HistoricalQuality,
  TestCase,
  TestCaseType,
  TestFramework
} from '../../../src/modules/development/types/development.types';

jest.mock('../../../src/core/database/neo4j');
jest.mock('../../../src/core/logging/logger');

describe('QualityPredictorService', () => {
  let service: QualityPredictorService;
  let mockNeo4j: jest.Mocked<Neo4jService>;

  beforeEach(() => {
    mockNeo4j = {
      getSession: jest.fn(),
      executeQuery: jest.fn().mockResolvedValue([]),
      executeTransaction: jest.fn(),
      initializeSchema: jest.fn(),
      close: jest.fn(),
    } as unknown as jest.Mocked<Neo4jService>;

    service = new QualityPredictorService(mockNeo4j);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('predictTestQuality', () => {
    const mockTest: TestCase = {
      id: 'test-123',
      name: 'should validate user input',
      description: 'Tests user input validation logic',
      type: TestCaseType.UNIT,
      framework: TestFramework.JEST,
      priority: Priority.HIGH,
      complexity: 3,
      estimatedDuration: 120,
      requirements: ['REQ-001', 'REQ-002'],
      tags: ['validation', 'user-input'],
      code: `
        test('should validate user input', () => {
          const validInput = { name: 'John', email: 'john@example.com' };
          expect(validateUser(validInput)).toBe(true);
          
          const invalidInput = { name: '', email: 'invalid' };
          expect(validateUser(invalidInput)).toBe(false);
        });
      `,
      assertions: [],
      coverage: {} as any,
      status: {} as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {}
    };

    it('should predict quality for high-quality test', async () => {
      mockNeo4j.executeQuery.mockResolvedValue([{
        test: mockTest,
        historicalRuns: [
          { passed: true, duration: 100, timestamp: new Date() },
          { passed: true, duration: 105, timestamp: new Date() },
          { passed: true, duration: 95, timestamp: new Date() },
          { passed: true, duration: 110, timestamp: new Date() }
        ],
        codeMetrics: {
          cyclomaticComplexity: 2,
          linesOfCode: 15,
          assertionCount: 2,
          mockUsage: 0,
          setupComplexity: 1
        }
      }]);

      const result = await service.predictTestQuality('test-123');

      expect(result).toBeDefined();
      expect(result.qualityScore).toBeGreaterThan(80);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.riskFactors).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should predict quality for potentially flaky test', async () => {
      mockNeo4j.executeQuery.mockResolvedValue([{
        test: mockTest,
        historicalRuns: [
          { passed: true, duration: 100, timestamp: new Date() },
          { passed: false, duration: 500, timestamp: new Date() },
          { passed: true, duration: 95, timestamp: new Date() },
          { passed: false, duration: 450, timestamp: new Date() },
          { passed: true, duration: 120, timestamp: new Date() }
        ],
        codeMetrics: {
          cyclomaticComplexity: 8,
          linesOfCode: 150,
          assertionCount: 1,
          mockUsage: 5,
          setupComplexity: 9
        }
      }]);

      const result = await service.predictTestQuality('test-123');

      expect(result.qualityScore).toBeLessThan(60);
      expect(result.riskFactors.length).toBeGreaterThan(0);
      
      const flakinessRisk = result.riskFactors.find(rf => 
        rf.category.toLowerCase().includes('flaky')
      );
      expect(flakinessRisk).toBeDefined();
      expect(flakinessRisk?.level).toBe(Priority.HIGH);
    });

    it('should identify high complexity risk', async () => {
      mockNeo4j.executeQuery.mockResolvedValue([{
        test: { ...mockTest, complexity: 9 },
        historicalRuns: [],
        codeMetrics: {
          cyclomaticComplexity: 15,
          linesOfCode: 500,
          assertionCount: 1,
          mockUsage: 10,
          setupComplexity: 12
        }
      }]);

      const result = await service.predictTestQuality('test-123');

      const complexityRisk = result.riskFactors.find(rf => 
        rf.category.toLowerCase().includes('complexity')
      );
      expect(complexityRisk).toBeDefined();
      expect([Priority.HIGH, Priority.CRITICAL]).toContain(complexityRisk?.level);
    });

    it('should handle new test with no historical data', async () => {
      mockNeo4j.executeQuery.mockResolvedValue([{
        test: { ...mockTest, id: 'new-test' },
        historicalRuns: [],
        codeMetrics: {
          cyclomaticComplexity: 2,
          linesOfCode: 25,
          assertionCount: 3,
          mockUsage: 1,
          setupComplexity: 2
        }
      }]);

      const result = await service.predictTestQuality('new-test');

      expect(result.confidence).toBeLessThan(0.6);
      expect(result.recommendations).toContain('Insufficient historical data');
    });
  });

  describe('predictSuiteQuality', () => {
    it('should predict quality for entire test suite', async () => {
      mockNeo4j.executeQuery.mockResolvedValue([{
        suite: {
          id: 'suite-456',
          name: 'User Service Tests',
          testCount: 25
        },
        tests: [
          { id: 'test-1', qualityScore: 85, complexity: 2 },
          { id: 'test-2', qualityScore: 90, complexity: 1 },
          { id: 'test-3', qualityScore: 45, complexity: 8 },
          { id: 'test-4', qualityScore: 75, complexity: 3 }
        ],
        historicalMetrics: [
          { timestamp: new Date(), passRate: 0.95, avgDuration: 1200 },
          { timestamp: new Date(), passRate: 0.92, avgDuration: 1350 },
          { timestamp: new Date(), passRate: 0.88, avgDuration: 1500 }
        ]
      }]);

      const result = await service.predictSuiteQuality('suite-456');

      expect(result).toBeDefined();
      expect(result.overallQualityScore).toBeGreaterThanOrEqual(0);
      expect(result.overallQualityScore).toBeLessThanOrEqual(100);
      expect(result.riskDistribution).toBeDefined();
      expect(result.problematicTests).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should identify problematic tests in suite', async () => {
      mockNeo4j.executeQuery.mockResolvedValue([{
        suite: { id: 'suite-789' },
        tests: [
          { id: 'good-test', qualityScore: 90, complexity: 2, flakyScore: 0.1 },
          { id: 'bad-test-1', qualityScore: 25, complexity: 9, flakyScore: 0.8 },
          { id: 'bad-test-2', qualityScore: 30, complexity: 7, flakyScore: 0.6 }
        ]
      }]);

      const result = await service.predictSuiteQuality('suite-789');

      expect(result.problematicTests.length).toBe(2);
      expect(result.problematicTests).toContain('bad-test-1');
      expect(result.problematicTests).toContain('bad-test-2');
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeRiskFactors', () => {
    it('should analyze complexity-based risk factors', async () => {
      const testMetrics = {
        cyclomaticComplexity: 12,
        linesOfCode: 300,
        assertionCount: 2,
        mockUsage: 8,
        setupComplexity: 10
      };

      const result = await service.analyzeRiskFactors(testMetrics, []);

      const complexityRisk = result.find(rf => rf.category === 'COMPLEXITY');
      expect(complexityRisk).toBeDefined();
      expect([Priority.HIGH, Priority.CRITICAL]).toContain(complexityRisk?.level);
      expect(complexityRisk?.mitigation.length).toBeGreaterThan(0);
    });

    it('should analyze assertion quality risks', async () => {
      const testMetrics = {
        cyclomaticComplexity: 5,
        linesOfCode: 100,
        assertionCount: 1, // Too few assertions
        mockUsage: 0,
        setupComplexity: 3
      };

      const result = await service.analyzeRiskFactors(testMetrics, []);

      const assertionRisk = result.find(rf => rf.category === 'ASSERTION_QUALITY');
      expect(assertionRisk).toBeDefined();
      expect(assertionRisk?.description).toContain('insufficient assertions');
    });

    it('should analyze mock usage risks', async () => {
      const testMetrics = {
        cyclomaticComplexity: 3,
        linesOfCode: 80,
        assertionCount: 4,
        mockUsage: 15, // Excessive mocking
        setupComplexity: 2
      };

      const result = await service.analyzeRiskFactors(testMetrics, []);

      const mockRisk = result.find(rf => rf.category === 'MOCK_USAGE');
      expect(mockRisk).toBeDefined();
      expect([Priority.MEDIUM, Priority.HIGH]).toContain(mockRisk?.level);
    });

    it('should analyze historical pattern risks', async () => {
      const historicalData: HistoricalQuality[] = [
        { timestamp: new Date(), qualityScore: 80, testsPassed: 18, testsFailed: 2, coverage: 85, issues: 1 },
        { timestamp: new Date(), qualityScore: 60, testsPassed: 15, testsFailed: 5, coverage: 75, issues: 3 },
        { timestamp: new Date(), qualityScore: 40, testsPassed: 12, testsFailed: 8, coverage: 65, issues: 5 }
      ];

      const result = await service.analyzeRiskFactors({}, historicalData);

      const trendRisk = result.find(rf => rf.category === 'QUALITY_TREND');
      expect(trendRisk).toBeDefined();
      expect(trendRisk?.level).toBe(Priority.HIGH);
    });
  });

  describe('predictIssues', () => {
    it('should predict potential flaky test issues', async () => {
      const testData = {
        id: 'test-789',
        historicalRuns: [
          { passed: true, duration: 100 },
          { passed: false, duration: 300 },
          { passed: true, duration: 95 },
          { passed: false, duration: 250 },
          { passed: true, duration: 110 }
        ],
        complexity: 6,
        hasTimeouts: true,
        hasAsyncOperations: true
      };

      const result = await service.predictIssues(testData);

      const flakyIssue = result.find(issue => issue.type === 'FLAKY_TEST');
      expect(flakyIssue).toBeDefined();
      expect(flakyIssue?.probability).toBeGreaterThan(0.6);
      expect([Priority.MEDIUM, Priority.HIGH]).toContain(flakyIssue?.severity);
    });

    it('should predict performance issues', async () => {
      const testData = {
        id: 'perf-test',
        historicalRuns: [
          { passed: true, duration: 5000 }, // Very slow
          { passed: true, duration: 4500 },
          { passed: true, duration: 6000 }
        ],
        complexity: 3,
        hasLoops: true,
        hasFileOperations: true
      };

      const result = await service.predictIssues(testData);

      const perfIssue = result.find(issue => issue.type === 'PERFORMANCE');
      expect(perfIssue).toBeDefined();
      expect(perfIssue?.probability).toBeGreaterThan(0.7);
    });

    it('should predict maintenance issues', async () => {
      const testData = {
        id: 'old-test',
        lastUpdated: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 180 days old
        complexity: 9,
        dependencyCount: 12,
        hasDeprecatedApis: true
      };

      const result = await service.predictIssues(testData);

      const maintenanceIssue = result.find(issue => issue.type === 'MAINTENANCE');
      expect(maintenanceIssue).toBeDefined();
      expect(maintenanceIssue?.prevention.length).toBeGreaterThan(0);
    });
  });

  describe('generateQualityInsights', () => {
    it('should generate actionable quality insights', async () => {
      const qualityData = {
        testId: 'insight-test',
        qualityScore: 65,
        riskFactors: [
          {
            category: 'COMPLEXITY',
            level: Priority.HIGH,
            weight: 0.3,
            description: 'High cyclomatic complexity detected'
          }
        ],
        historicalTrend: 'DECLINING',
        coverage: 75,
        performance: {
          avgDuration: 2000,
          variance: 500
        }
      };

      const result = await service.generateQualityInsights(qualityData);

      expect(result).toBeDefined();
      expect(result.primaryConcerns).toBeDefined();
      expect(result.quickWins).toBeDefined();
      expect(result.longTermActions).toBeDefined();
      expect(result.prioritizedRecommendations).toBeDefined();
    });

    it('should identify quick wins for quality improvement', async () => {
      const qualityData = {
        testId: 'quick-win-test',
        qualityScore: 55,
        riskFactors: [
          {
            category: 'ASSERTION_QUALITY',
            level: Priority.MEDIUM,
            weight: 0.2,
            description: 'Missing edge case assertions'
          }
        ],
        coverage: 85, // Good coverage
        complexity: 4  // Moderate complexity
      };

      const result = await service.generateQualityInsights(qualityData);

      expect(result.quickWins.length).toBeGreaterThan(0);
      const assertionWin = result.quickWins.find(win => 
        win.toLowerCase().includes('assertion')
      );
      expect(assertionWin).toBeDefined();
    });
  });

  describe('compareTestQuality', () => {
    it('should compare quality between tests', async () => {
      const test1Quality: QualityPrediction = {
        testId: 'test-1',
        qualityScore: 85,
        riskFactors: [
          { category: 'COMPLEXITY', level: Priority.LOW, description: 'Low complexity', mitigation: [], weight: 0.1 }
        ],
        recommendations: ['Great test quality'],
        confidence: 0.9,
        predictedIssues: [],
        historicalData: []
      };

      const test2Quality: QualityPrediction = {
        testId: 'test-2',
        qualityScore: 45,
        riskFactors: [
          { category: 'COMPLEXITY', level: Priority.HIGH, description: 'High complexity', mitigation: [], weight: 0.8 },
          { category: 'FLAKINESS', level: Priority.MEDIUM, description: 'Potential flakiness', mitigation: [], weight: 0.6 }
        ],
        recommendations: ['Refactor for simplicity', 'Add stability improvements'],
        confidence: 0.7,
        predictedIssues: [],
        historicalData: []
      };

      const result = await service.compareTestQuality([test1Quality, test2Quality]);

      expect(result).toBeDefined();
      expect(result.bestTest).toBe('test-1');
      expect(result.worstTest).toBe('test-2');
      expect(result.qualityGap).toBe(40);
      expect(result.recommendations).toBeDefined();
    });
  });

  describe('trainQualityModel', () => {
    it('should train quality prediction model', async () => {
      const trainingData = [
        {
          testId: 'train-1',
          features: { complexity: 2, assertions: 5, mocks: 1, loc: 30 },
          qualityScore: 90,
          outcome: 'STABLE'
        },
        {
          testId: 'train-2', 
          features: { complexity: 8, assertions: 1, mocks: 10, loc: 200 },
          qualityScore: 30,
          outcome: 'FLAKY'
        },
        {
          testId: 'train-3',
          features: { complexity: 4, assertions: 3, mocks: 2, loc: 60 },
          qualityScore: 75,
          outcome: 'STABLE'
        }
      ];

      const result = await service.trainQualityModel(trainingData);

      expect(result).toBeDefined();
      expect(result.modelAccuracy).toBeGreaterThan(0);
      expect(result.featureImportance).toBeDefined();
      expect(result.validationScore).toBeDefined();
    });

    it('should handle insufficient training data', async () => {
      const insufficientData = [
        { testId: 'single', features: {}, qualityScore: 50, outcome: 'STABLE' }
      ];

      await expect(service.trainQualityModel(insufficientData))
        .rejects.toThrow('Insufficient training data');
    });
  });

  describe('error handling', () => {
    it('should handle invalid test ID', async () => {
      mockNeo4j.executeQuery.mockResolvedValue([]);

      await expect(service.predictTestQuality('non-existent'))
        .rejects.toThrow('Test not found');
    });

    it('should handle database errors', async () => {
      mockNeo4j.executeQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.predictTestQuality('test-123'))
        .rejects.toThrow('Failed to predict test quality');
    });

    it('should handle corrupted historical data', async () => {
      mockNeo4j.executeQuery.mockResolvedValue([{
        test: { id: 'corrupt-test' },
        historicalRuns: [
          { passed: 'invalid', duration: 'not-a-number' }, // Corrupted data
          { passed: true, duration: 100 }
        ]
      }]);

      const result = await service.predictTestQuality('corrupt-test');
      
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.recommendations).toContain('Data quality issues detected');
    });
  });

  describe('integration scenarios', () => {
    it('should integrate with test execution results', async () => {
      const executionResults = {
        testId: 'integration-test',
        passed: true,
        duration: 150,
        coverage: 85,
        memoryUsage: 45,
        timestamp: new Date()
      };

      const result = await service.updateQualityPrediction('integration-test', executionResults);

      expect(result).toBeDefined();
      expect(result.updatedPrediction).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should work with continuous integration feedback', async () => {
      const ciData = {
        buildId: 'build-456',
        branch: 'feature-branch',
        testResults: [
          { testId: 'test-1', passed: true, duration: 100 },
          { testId: 'test-2', passed: false, duration: 200 },
          { testId: 'test-3', passed: true, duration: 150 }
        ],
        coverage: 82
      };

      const result = await service.processCIFeedback(ciData);

      expect(result).toBeDefined();
      expect(result.updatedPredictions).toHaveLength(3);
      expect(result.overallTrend).toBeDefined();
    });
  });
});