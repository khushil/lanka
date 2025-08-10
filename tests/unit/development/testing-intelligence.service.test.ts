/**
 * Testing Intelligence Service Unit Tests
 * Comprehensive test suite for the testing intelligence service
 */

import { TestingIntelligenceService } from '../../../src/modules/development/services/testing-intelligence.service';
import { Neo4jService } from '../../../src/core/database/neo4j';
import {
  TestCase,
  TestCaseType,
  TestFramework,
  Priority,
  TestStatus,
  TestGenerationRequest,
  CoverageData,
  TestSuite,
  TestIntelligenceMetrics,
  OptimizationType
} from '../../../src/modules/development/types/development.types';

// Mock dependencies
jest.mock('../../../src/core/database/neo4j');
jest.mock('../../../src/core/logging/logger');

describe('TestingIntelligenceService', () => {
  let service: TestingIntelligenceService;
  let mockNeo4j: jest.Mocked<Neo4jService>;

  beforeEach(() => {
    mockNeo4j = {
      getSession: jest.fn(),
      executeQuery: jest.fn().mockResolvedValue([]),
      executeTransaction: jest.fn(),
      initializeSchema: jest.fn(),
      close: jest.fn(),
    } as unknown as jest.Mocked<Neo4jService>;

    service = new TestingIntelligenceService(mockNeo4j);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTestCases', () => {
    const mockRequest: TestGenerationRequest = {
      sourceCode: 'function add(a: number, b: number) { return a + b; }',
      language: 'typescript',
      framework: TestFramework.JEST,
      testType: TestCaseType.UNIT,
      coverageGoals: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90
      }
    };

    it('should generate test cases from source code', async () => {

      mockNeo4j.executeQuery.mockResolvedValue([]);

      const result = await service.generateTestCases(mockRequest);

      expect(result).toBeDefined();
      expect(result.testCases).toHaveLength(1);
      expect(result.testCases[0].name).toBe('should add two numbers correctly');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(mockNeo4j.executeQuery).toHaveBeenCalled();
    });

    it('should handle different test frameworks', async () => {
      const mochaRequest = { ...mockRequest, framework: TestFramework.MOCHA };
      
      const result = await service.generateTestCases(mochaRequest);
      
      expect(result).toBeDefined();
      expect(mockNeo4j.executeQuery).toHaveBeenCalled();
    });

    it('should generate integration tests', async () => {
      const integrationRequest = { ...mockRequest, testType: TestCaseType.INTEGRATION };
      
      const result = await service.generateTestCases(integrationRequest);
      
      expect(result).toBeDefined();
      expect(result.testCases[0].type).toBe(TestCaseType.INTEGRATION);
    });

    it('should handle complex source code', async () => {
      const complexCode = `
        class Calculator {
          add(a: number, b: number): number { return a + b; }
          subtract(a: number, b: number): number { return a - b; }
          multiply(a: number, b: number): number { return a * b; }
          divide(a: number, b: number): number { 
            if (b === 0) throw new Error('Division by zero');
            return a / b; 
          }
        }
      `;
      
      const complexRequest = { ...mockRequest, sourceCode: complexCode };
      
      const result = await service.generateTestCases(complexRequest);
      
      expect(result).toBeDefined();
      expect(result.testCases.length).toBeGreaterThan(1);
    });

    it('should handle error when source code is invalid', async () => {
      const invalidRequest = { ...mockRequest, sourceCode: 'invalid syntax {' };
      
      await expect(service.generateTestCases(invalidRequest))
        .rejects.toThrow('Invalid source code provided');
    });

    it('should prioritize test cases correctly', async () => {
      const result = await service.generateTestCases(mockRequest);
      
      expect(result.testCases[0].priority).toBeDefined();
      expect([Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.CRITICAL])
        .toContain(result.testCases[0].priority);
    });
  });

  describe('analyzeCoverage', () => {
    it('should analyze test coverage and identify gaps', async () => {
      const mockTestSuite: TestSuite = {
        id: 'suite-1',
        name: 'Calculator Tests',
        description: 'Tests for calculator functionality',
        testCases: ['test-1', 'test-2'],
        configuration: {} as any,
        coverage: {
          statements: { total: 10, covered: 8, percentage: 80 },
          branches: { total: 6, covered: 4, percentage: 66.67 },
          functions: { total: 4, covered: 4, percentage: 100 },
          lines: { total: 12, covered: 10, percentage: 83.33 },
          overall: 82.5,
          uncoveredLines: [15, 23],
          uncoveredBranches: ['if-else-1', 'switch-2'],
          timestamp: new Date()
        },
        results: {} as any,
        performance: {} as any,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await service.analyzeCoverage(mockTestSuite.id);

      expect(result).toBeDefined();
      expect(result.gaps).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.gaps.length).toBeGreaterThan(0);
      expect(mockNeo4j.executeQuery).toHaveBeenCalled();
    });

    it('should handle perfect coverage scenario', async () => {
      mockNeo4j.executeQuery.mockResolvedValue([{
        coverage: {
          statements: { percentage: 100 },
          branches: { percentage: 100 },
          functions: { percentage: 100 },
          lines: { percentage: 100 },
          overall: 100,
          uncoveredLines: [],
          uncoveredBranches: []
        }
      }]);

      const result = await service.analyzeCoverage('perfect-suite');

      expect(result.gaps).toHaveLength(0);
      expect(result.recommendations).toContain('Excellent coverage achieved!');
    });

    it('should prioritize critical coverage gaps', async () => {
      const result = await service.analyzeCoverage('suite-1');

      const criticalGaps = result.gaps.filter(gap => gap.priority === Priority.CRITICAL);
      expect(criticalGaps).toBeDefined();
    });
  });

  describe('predictQuality', () => {
    it('should predict test quality based on historical data', async () => {
      mockNeo4j.executeQuery.mockResolvedValue([{
        test: { id: 'test-1', complexity: 2, coverage: 85 },
        historicalRuns: [
          { passed: true, duration: 150, timestamp: new Date() },
          { passed: true, duration: 142, timestamp: new Date() },
          { passed: false, duration: 200, timestamp: new Date() }
        ]
      }]);

      const result = await service.predictQuality('test-1');

      expect(result).toBeDefined();
      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore).toBeLessThanOrEqual(100);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.riskFactors).toBeDefined();
      expect(result.recommendations).toHaveLength(0);
    });

    it('should identify high-risk tests', async () => {
      mockNeo4j.executeQuery.mockResolvedValue([{
        test: { id: 'flaky-test', complexity: 5, coverage: 45 },
        historicalRuns: [
          { passed: false, duration: 500, timestamp: new Date() },
          { passed: true, duration: 300, timestamp: new Date() },
          { passed: false, duration: 450, timestamp: new Date() }
        ]
      }]);

      const result = await service.predictQuality('flaky-test');

      expect(result.qualityScore).toBeLessThan(60);
      expect(result.riskFactors.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle tests with no historical data', async () => {
      mockNeo4j.executeQuery.mockResolvedValue([{
        test: { id: 'new-test', complexity: 1, coverage: 90 },
        historicalRuns: []
      }]);

      const result = await service.predictQuality('new-test');

      expect(result.confidence).toBeLessThan(0.5);
      expect(result.recommendations).toContain('Insufficient historical data');
    });
  });

  describe('prioritizeTests', () => {
    const mockTests: TestCase[] = [
      {
        id: 'test-1',
        name: 'Critical path test',
        priority: Priority.HIGH,
        complexity: 3,
        estimatedDuration: 120,
        requirements: ['REQ-001', 'REQ-002'],
      } as TestCase,
      {
        id: 'test-2', 
        name: 'Edge case test',
        priority: Priority.MEDIUM,
        complexity: 2,
        estimatedDuration: 60,
        requirements: ['REQ-003'],
      } as TestCase,
      {
        id: 'test-3',
        name: 'Integration test',
        description: 'Tests integration between services',
        type: TestCaseType.INTEGRATION,
        framework: TestFramework.JEST,
        priority: Priority.LOW,
        complexity: 5,
        estimatedDuration: 300,
        requirements: [],
        tags: ['integration'],
        code: '',
        assertions: [],
        coverage: {} as any,
        status: {} as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      } as TestCase
    ];

    it('should prioritize tests based on multiple factors', async () => {
      const result = await service.prioritizeTests(mockTests, {
        riskWeight: 0.4,
        coverageWeight: 0.3,
        complexityWeight: 0.2,
        durationWeight: 0.1
      });

      expect(result).toBeDefined();
      expect(result).toHaveLength(3);
      expect(result[0].priority).toBeGreaterThanOrEqual(result[1].priority);
      expect(result[1].priority).toBeGreaterThanOrEqual(result[2].priority);
    });

    it('should handle empty test array', async () => {
      const result = await service.prioritizeTests([], {});

      expect(result).toHaveLength(0);
    });

    it('should consider requirement criticality', async () => {
      mockNeo4j.executeQuery.mockResolvedValue([
        { requirement: { id: 'REQ-001', priority: Priority.CRITICAL }},
        { requirement: { id: 'REQ-002', priority: Priority.HIGH }}
      ]);

      const result = await service.prioritizeTests(mockTests, {});
      
      const test1Result = result.find(t => t.testId === 'test-1');
      expect(test1Result?.priority).toBeGreaterThan(50);
    });
  });

  describe('runMutationTesting', () => {
    it('should perform mutation testing and return results', async () => {
      const sourceCode = `
        function isEven(num: number): boolean {
          return num % 2 === 0;
        }
      `;

      const testCode = `
        test('should return true for even numbers', () => {
          expect(isEven(4)).toBe(true);
          expect(isEven(6)).toBe(true);
        });
        test('should return false for odd numbers', () => {
          expect(isEven(3)).toBe(false);
          expect(isEven(7)).toBe(false);
        });
      `;

      const result = await service.runMutationTesting({
        sourceCode,
        testCode,
        language: 'typescript',
        framework: TestFramework.JEST
      });

      expect(result).toBeDefined();
      expect(result.mutations).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.killed).toBeDefined();
      expect(result.survived).toBeDefined();
    });

    it('should detect weak test cases', async () => {
      const weakTestCode = `
        test('weak test', () => {
          expect(isEven(2)).toBeTruthy(); // Too generic
        });
      `;

      const result = await service.runMutationTesting({
        sourceCode: 'function isEven(num) { return num % 2 === 0; }',
        testCode: weakTestCode,
        language: 'javascript',
        framework: TestFramework.JEST
      });

      expect(result.overallScore).toBeLessThan(70);
      expect(result.survived.length).toBeGreaterThan(0);
    });
  });

  describe('optimizeTestExecution', () => {
    it('should suggest test execution optimizations', async () => {
      const mockMetrics: TestIntelligenceMetrics = {
        totalTests: 150,
        testEfficiency: 65,
        coverageEffectiveness: 78,
        defectDetectionRate: 85,
        testMaintenanceCost: 40,
        automationRate: 90,
        testExecutionTime: 1200,
        qualityTrend: 82,
        riskReduction: 75,
        timestamp: new Date()
      };

      const result = await service.optimizeTestExecution(mockMetrics);

      expect(result).toBeDefined();
      expect(result.optimizations).toBeDefined();
      expect(result.optimizations.length).toBeGreaterThan(0);
      
      const parallelOptimization = result.optimizations.find(
        opt => opt.type === OptimizationType.PARALLEL_EXECUTION
      );
      expect(parallelOptimization).toBeDefined();
    });

    it('should prioritize high-impact optimizations', async () => {
      const mockMetrics: TestIntelligenceMetrics = {
        totalTests: 500,
        testEfficiency: 45, // Low efficiency
        testExecutionTime: 3600, // Long execution time
        automationRate: 60, // Low automation
      } as TestIntelligenceMetrics;

      const result = await service.optimizeTestExecution(mockMetrics);

      const highImpactOptimizations = result.optimizations.filter(
        opt => opt.impact > 8
      );
      expect(highImpactOptimizations.length).toBeGreaterThan(0);
    });
  });

  describe('generatePerformanceTests', () => {
    it('should generate performance tests from specifications', async () => {
      const specs = {
        endpoint: '/api/users',
        expectedResponseTime: 200,
        maxConcurrentUsers: 100,
        throughputTarget: 1000
      };

      const result = await service.generatePerformanceTests(specs);

      expect(result).toBeDefined();
      expect(result.testCases).toBeDefined();
      expect(result.testCases.length).toBeGreaterThan(0);
      
      const performanceTest = result.testCases.find(
        tc => tc.type === TestCaseType.PERFORMANCE
      );
      expect(performanceTest).toBeDefined();
    });

    it('should include load testing scenarios', async () => {
      const specs = {
        endpoint: '/api/heavy-operation',
        expectedResponseTime: 500,
        maxConcurrentUsers: 50
      };

      const result = await service.generatePerformanceTests(specs);
      
      const loadTests = result.testCases.filter(
        tc => tc.tags.includes('load-test')
      );
      expect(loadTests.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeTestMaintenance', () => {
    it('should identify maintenance issues in test suites', async () => {
      mockNeo4j.executeQuery.mockResolvedValue([{
        test: {
          id: 'old-test',
          updatedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days old
          failureRate: 0.3,
          executionTime: 500
        },
        dependencies: ['deprecated-api', 'old-framework']
      }]);

      const result = await service.analyzeTestMaintenance('suite-1');

      expect(result).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.recommendations).toBeDefined();
      
      const maintenanceIssue = result.issues.find(
        issue => issue.type === 'OUTDATED_DEPENDENCIES'
      );
      expect(maintenanceIssue).toBeDefined();
    });

    it('should calculate maintenance cost estimates', async () => {
      const result = await service.analyzeTestMaintenance('suite-1');

      expect(result.estimatedCost).toBeDefined();
      expect(result.estimatedCost.hours).toBeGreaterThan(0);
      expect(result.estimatedCost.priority).toBeDefined();
    });
  });

  describe('integrationTestScaffolding', () => {
    it('should generate integration test scaffolding', async () => {
      const config = {
        modules: ['UserService', 'PaymentService', 'NotificationService'],
        database: 'postgresql',
        framework: TestFramework.JEST,
        testType: TestCaseType.INTEGRATION
      };

      const result = await service.generateIntegrationTestScaffolding(config);

      expect(result).toBeDefined();
      expect(result.setupCode).toBeDefined();
      expect(result.teardownCode).toBeDefined();
      expect(result.testCases).toBeDefined();
      expect(result.mockConfigurations).toBeDefined();
    });

    it('should include database setup and teardown', async () => {
      const config = {
        modules: ['UserRepository'],
        database: 'mongodb',
        framework: TestFramework.MOCHA
      };

      const result = await service.generateIntegrationTestScaffolding(config);

      expect(result.setupCode).toContain('database');
      expect(result.teardownCode).toContain('cleanup');
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      mockNeo4j.executeQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.generateTestCases({} as TestGenerationRequest))
        .rejects.toThrow('Failed to generate test cases');
    });

    it('should validate input parameters', async () => {
      await expect(service.generateTestCases(null as any))
        .rejects.toThrow('Invalid test generation request');

      await expect(service.analyzeCoverage(''))
        .rejects.toThrow('Test suite ID is required');
    });

    it('should handle timeout scenarios', async () => {
      jest.setTimeout(1000);
      mockNeo4j.executeQuery.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 2000))
      );

      await expect(service.runMutationTesting({
        sourceCode: 'function test() {}',
        testCode: 'test("example", () => {})',
        language: 'javascript',
        framework: TestFramework.JEST,
        timeout: 500
      })).rejects.toThrow('Operation timed out');
    }, 10000);
  });

  describe('integration with other modules', () => {
    it('should integrate with requirements module for test traceability', async () => {
      mockNeo4j.executeQuery
        .mockResolvedValueOnce([{ requirement: { id: 'REQ-001', title: 'User Login' }}])
        .mockResolvedValueOnce([{ test: { id: 'test-1', name: 'login test' }}]);

      const result = await service.getTestRequirementTraceability('REQ-001');

      expect(result).toBeDefined();
      expect(result.requirement).toBeDefined();
      expect(result.coveredBy).toBeDefined();
      expect(result.coverage).toBeGreaterThanOrEqual(0);
    });

    it('should integrate with architecture module for component testing', async () => {
      mockNeo4j.executeQuery.mockResolvedValue([{
        component: { id: 'COMP-001', name: 'UserService' },
        interfaces: [{ method: 'createUser', parameters: ['userData'] }],
        dependencies: ['UserRepository', 'ValidationService']
      }]);

      const result = await service.generateComponentTests('COMP-001');

      expect(result).toBeDefined();
      expect(result.testCases).toBeDefined();
      expect(result.testCases.length).toBeGreaterThan(0);
      expect(result.mockSetup).toBeDefined();
    });
  });
});