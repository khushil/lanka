/**
 * Test Prioritizer Service Unit Tests
 * Tests for intelligent test execution prioritization
 */

import { TestPrioritizerService } from '../../../src/modules/development/services/test-prioritizer.service';
import { Neo4jService } from '../../../src/core/database/neo4j';
import {
  TestCase,
  TestPrioritization,
  Priority,
  TestCaseType,
  TestFramework,
  PriorityFactor
} from '../../../src/modules/development/types/development.types';

jest.mock('../../../src/core/database/neo4j');
jest.mock('../../../src/core/logging/logger');

describe('TestPrioritizerService', () => {
  let service: TestPrioritizerService;
  let mockNeo4j: jest.Mocked<Neo4jService>;

  beforeEach(() => {
    mockNeo4j = {
      getSession: jest.fn(),
      executeQuery: jest.fn().mockResolvedValue([]),
      executeTransaction: jest.fn(),
      initializeSchema: jest.fn(),
      close: jest.fn(),
    } as unknown as jest.Mocked<Neo4jService>;

    service = new TestPrioritizerService(mockNeo4j);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('prioritizeTests', () => {
    const mockTests: TestCase[] = [
      {
        id: 'test-critical',
        name: 'Critical payment validation test',
        priority: Priority.CRITICAL,
        complexity: 5,
        estimatedDuration: 300,
        requirements: ['REQ-001', 'REQ-002'],
        tags: ['payment', 'validation', 'critical-path'],
        type: TestCaseType.UNIT,
        framework: TestFramework.JEST,
      } as TestCase,
      {
        id: 'test-medium',
        name: 'User profile update test',
        priority: Priority.MEDIUM,
        complexity: 3,
        estimatedDuration: 150,
        requirements: ['REQ-003'],
        tags: ['user', 'profile'],
        type: TestCaseType.INTEGRATION,
        framework: TestFramework.JEST,
      } as TestCase,
      {
        id: 'test-low',
        name: 'UI theme toggle test',
        priority: Priority.LOW,
        complexity: 1,
        estimatedDuration: 60,
        requirements: [],
        tags: ['ui', 'theme'],
        type: TestCaseType.E2E,
        framework: TestFramework.PLAYWRIGHT,
      } as TestCase
    ];

    it('should prioritize tests based on business impact', async () => {
      mockNeo4j.executeQuery.mockResolvedValue([
        { requirement: { id: 'REQ-001', businessImpact: 9, riskScore: 8 }},
        { requirement: { id: 'REQ-002', businessImpact: 8, riskScore: 7 }},
        { requirement: { id: 'REQ-003', businessImpact: 5, riskScore: 4 }}
      ]);

      const result = await service.prioritizeTests(mockTests, {
        businessImpactWeight: 0.4,
        riskWeight: 0.3,
        complexityWeight: 0.2,
        durationWeight: 0.1
      });

      expect(result).toHaveLength(3);
      expect(result[0].testId).toBe('test-critical');
      expect(result[0].priority).toBeGreaterThan(result[1].priority);
      expect(result[1].priority).toBeGreaterThan(result[2].priority);
    });

    it('should consider test failure history in prioritization', async () => {
      mockNeo4j.executeQuery.mockResolvedValue([
        { test: { id: 'test-critical' }, failureRate: 0.1, avgFixTime: 30 },
        { test: { id: 'test-medium' }, failureRate: 0.4, avgFixTime: 120 },
        { test: { id: 'test-low' }, failureRate: 0.05, avgFixTime: 15 }
      ]);

      const result = await service.prioritizeTests(mockTests, {
        failureHistoryWeight: 0.6
      });

      // test-medium should be prioritized higher due to high failure rate
      expect(result[0].testId).toBe('test-medium');
      
      const mediumTestResult = result.find(r => r.testId === 'test-medium');
      const failureFactor = mediumTestResult?.factors.find(f => f.name === 'FAILURE_HISTORY');
      expect(failureFactor).toBeDefined();
      expect(failureFactor?.value).toBeGreaterThan(0.3);
    });

    it('should prioritize based on code change impact', async () => {
      const changedFiles = [
        'src/payment/payment.service.ts',
        'src/validation/validator.ts'
      ];

      mockNeo4j.executeQuery.mockResolvedValue([
        { test: { id: 'test-critical' }, coveredFiles: ['src/payment/payment.service.ts'] },
        { test: { id: 'test-medium' }, coveredFiles: ['src/user/profile.service.ts'] },
        { test: { id: 'test-low' }, coveredFiles: ['src/ui/theme.component.tsx'] }
      ]);

      const result = await service.prioritizeTestsByChanges(mockTests, changedFiles);

      expect(result[0].testId).toBe('test-critical');
      
      const changeImpactFactor = result[0].factors.find(f => f.name === 'CHANGE_IMPACT');
      expect(changeImpactFactor).toBeDefined();
      expect(changeImpactFactor?.value).toBe(1); // 100% overlap
    });

    it('should handle empty test array', async () => {
      const result = await service.prioritizeTests([], {});

      expect(result).toHaveLength(0);
    });

    it('should apply time budget constraints', async () => {
      const timeBudgetMinutes = 10; // Only 10 minutes available

      const result = await service.prioritizeTestsWithBudget(mockTests, timeBudgetMinutes, {
        businessImpactWeight: 1.0
      });

      // Should only include tests that fit in the budget
      const totalDuration = result.reduce((sum, test) => {
        const originalTest = mockTests.find(t => t.id === test.testId);
        return sum + (originalTest?.estimatedDuration || 0);
      }, 0);

      expect(totalDuration).toBeLessThanOrEqual(timeBudgetMinutes * 60 * 1000); // Convert to ms
    });
  });

  describe('calculateRiskScore', () => {
    it('should calculate risk based on multiple factors', async () => {
      const testData = {
        failureRate: 0.3,
        avgExecutionTime: 5000,
        complexity: 8,
        dependencies: ['external-api', 'database', 'payment-gateway'],
        lastFailureDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        codeChangeFrequency: 0.8
      };

      const riskScore = await service.calculateRiskScore(testData);

      expect(riskScore).toBeGreaterThanOrEqual(0);
      expect(riskScore).toBeLessThanOrEqual(10);
      expect(riskScore).toBeGreaterThan(5); // Should be high risk
    });

    it('should calculate low risk for stable tests', async () => {
      const stableTestData = {
        failureRate: 0.02,
        avgExecutionTime: 100,
        complexity: 2,
        dependencies: [],
        lastFailureDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
        codeChangeFrequency: 0.1
      };

      const riskScore = await service.calculateRiskScore(stableTestData);

      expect(riskScore).toBeLessThan(3); // Should be low risk
    });
  });

  describe('analyzeTestDependencies', () => {
    it('should analyze and prioritize based on test dependencies', async () => {
      mockNeo4j.executeQuery.mockResolvedValue([
        {
          test: { id: 'test-1' },
          dependencies: [
            { type: 'SERVICE', name: 'UserService', criticality: 9 },
            { type: 'DATABASE', name: 'UserDB', criticality: 8 }
          ]
        },
        {
          test: { id: 'test-2' },
          dependencies: [
            { type: 'EXTERNAL_API', name: 'PaymentAPI', criticality: 10 },
            { type: 'SERVICE', name: 'PaymentService', criticality: 9 }
          ]
        }
      ]);

      const result = await service.analyzeTestDependencies(['test-1', 'test-2']);

      expect(result).toBeDefined();
      expect(result['test-2'].dependencyRisk).toBeGreaterThan(result['test-1'].dependencyRisk);
      
      const paymentTestDeps = result['test-2'].dependencies;
      const externalApiDep = paymentTestDeps.find(dep => dep.type === 'EXTERNAL_API');
      expect(externalApiDep?.criticality).toBe(10);
    });

    it('should identify circular dependencies', async () => {
      mockNeo4j.executeQuery.mockResolvedValue([
        {
          test: { id: 'test-a' },
          dependencies: [{ test: 'test-b', type: 'SETUP_DEPENDENCY' }]
        },
        {
          test: { id: 'test-b' },
          dependencies: [{ test: 'test-c', type: 'DATA_DEPENDENCY' }]
        },
        {
          test: { id: 'test-c' },
          dependencies: [{ test: 'test-a', type: 'TEARDOWN_DEPENDENCY' }]
        }
      ]);

      const result = await service.analyzeTestDependencies(['test-a', 'test-b', 'test-c']);

      const circularDep = Object.values(result).find(analysis => 
        analysis.issues.some(issue => issue.type === 'CIRCULAR_DEPENDENCY')
      );
      expect(circularDep).toBeDefined();
    });
  });

  describe('optimizeTestOrder', () => {
    it('should optimize test execution order for minimal setup/teardown', async () => {
      const tests = [
        { id: 'db-test-1', setupType: 'DATABASE', teardownType: 'DATABASE' },
        { id: 'api-test-1', setupType: 'API_SERVER', teardownType: 'API_SERVER' },
        { id: 'db-test-2', setupType: 'DATABASE', teardownType: 'DATABASE' },
        { id: 'unit-test-1', setupType: 'NONE', teardownType: 'NONE' }
      ];

      const optimizedOrder = await service.optimizeTestOrder(tests);

      expect(optimizedOrder).toBeDefined();
      expect(optimizedOrder.length).toBe(4);
      
      // Database tests should be grouped together
      const dbTest1Index = optimizedOrder.findIndex(t => t.id === 'db-test-1');
      const dbTest2Index = optimizedOrder.findIndex(t => t.id === 'db-test-2');
      expect(Math.abs(dbTest1Index - dbTest2Index)).toBe(1);
    });

    it('should minimize total execution time', async () => {
      const tests = [
        { id: 'slow-test', duration: 5000, parallelizable: false },
        { id: 'fast-test-1', duration: 100, parallelizable: true },
        { id: 'fast-test-2', duration: 150, parallelizable: true },
        { id: 'medium-test', duration: 1000, parallelizable: false }
      ];

      const optimizedOrder = await service.optimizeTestOrder(tests, {
        optimizeFor: 'EXECUTION_TIME',
        allowParallel: true
      });

      // Parallelizable tests should be grouped for parallel execution
      const parallelGroup = optimizedOrder.filter(t => t.parallelizable);
      expect(parallelGroup.length).toBe(2);
    });
  });

  describe('analyzeFlakiness', () => {
    it('should identify flaky tests and deprioritize them', async () => {
      mockNeo4j.executeQuery.mockResolvedValue([
        {
          test: { id: 'stable-test' },
          runs: [
            { passed: true, duration: 100 },
            { passed: true, duration: 105 },
            { passed: true, duration: 98 }
          ]
        },
        {
          test: { id: 'flaky-test' },
          runs: [
            { passed: true, duration: 100 },
            { passed: false, duration: 200 },
            { passed: true, duration: 110 },
            { passed: false, duration: 250 }
          ]
        }
      ]);

      const flakinessAnalysis = await service.analyzeFlakiness(['stable-test', 'flaky-test']);

      expect(flakinessAnalysis['stable-test'].flakinessScore).toBeLessThan(0.2);
      expect(flakinessAnalysis['flaky-test'].flakinessScore).toBeGreaterThan(0.4);
      expect(flakinessAnalysis['flaky-test'].recommendation).toContain('investigate');
    });

    it('should identify patterns in flaky test failures', async () => {
      mockNeo4j.executeQuery.mockResolvedValue([
        {
          test: { id: 'env-flaky-test' },
          runs: [
            { passed: true, environment: 'staging', duration: 100 },
            { passed: false, environment: 'production', duration: 200 },
            { passed: true, environment: 'staging', duration: 105 },
            { passed: false, environment: 'production', duration: 250 }
          ]
        }
      ]);

      const analysis = await service.analyzeFlakiness(['env-flaky-test']);
      const patterns = analysis['env-flaky-test'].patterns;

      const environmentPattern = patterns.find(p => p.type === 'ENVIRONMENT');
      expect(environmentPattern).toBeDefined();
      expect(environmentPattern?.correlation).toBeGreaterThan(0.7);
    });
  });

  describe('prioritizeByRegressionRisk', () => {
    it('should prioritize tests covering recently changed code', async () => {
      const recentChanges = [
        { file: 'src/payment/processor.ts', linesChanged: 25, changeType: 'MODIFICATION' },
        { file: 'src/user/validator.ts', linesChanged: 5, changeType: 'ADDITION' },
        { file: 'src/ui/theme.css', linesChanged: 10, changeType: 'MODIFICATION' }
      ];

      mockNeo4j.executeQuery.mockResolvedValue([
        { test: { id: 'payment-test' }, coverageFiles: ['src/payment/processor.ts'] },
        { test: { id: 'user-test' }, coverageFiles: ['src/user/validator.ts'] },
        { test: { id: 'ui-test' }, coverageFiles: ['src/ui/theme.css'] }
      ]);

      const result = await service.prioritizeByRegressionRisk(['payment-test', 'user-test', 'ui-test'], recentChanges);

      expect(result[0].testId).toBe('payment-test'); // Most lines changed
      expect(result[0].regressionRisk).toBeGreaterThan(result[1].regressionRisk);
    });

    it('should consider historical regression patterns', async () => {
      mockNeo4j.executeQuery.mockResolvedValue([
        {
          test: { id: 'regression-prone-test' },
          regressionHistory: [
            { date: new Date(), severity: 'HIGH', fixed: true },
            { date: new Date(), severity: 'MEDIUM', fixed: true }
          ]
        },
        {
          test: { id: 'stable-test' },
          regressionHistory: []
        }
      ]);

      const result = await service.prioritizeByRegressionRisk(['regression-prone-test', 'stable-test'], []);

      const regressionProneResult = result.find(r => r.testId === 'regression-prone-test');
      expect(regressionProneResult?.factors).toBeDefined();
      
      const historyFactor = regressionProneResult?.factors.find(f => f.name === 'REGRESSION_HISTORY');
      expect(historyFactor?.value).toBeGreaterThan(0.5);
    });
  });

  describe('dynamicPrioritization', () => {
    it('should adjust priorities based on real-time feedback', async () => {
      const initialPriorities: TestPrioritization[] = [
        {
          testId: 'test-1',
          priority: 8.0,
          factors: [],
          reasoning: 'High business impact',
          estimatedImpact: 9,
          riskLevel: Priority.HIGH
        },
        {
          testId: 'test-2', 
          priority: 6.0,
          factors: [],
          reasoning: 'Medium complexity',
          estimatedImpact: 6,
          riskLevel: Priority.MEDIUM
        }
      ];

      const feedback = {
        'test-1': { actualDuration: 1000, passed: false, issues: ['timeout', 'flaky'] },
        'test-2': { actualDuration: 150, passed: true, issues: [] }
      };

      const adjusted = await service.adjustPrioritiesWithFeedback(initialPriorities, feedback);

      // test-1 should be deprioritized due to issues
      expect(adjusted.find(a => a.testId === 'test-1')?.priority).toBeLessThan(8.0);
      // test-2 should maintain or improve priority
      expect(adjusted.find(a => a.testId === 'test-2')?.priority).toBeGreaterThanOrEqual(6.0);
    });

    it('should learn from execution patterns', async () => {
      const executionHistory = [
        { testId: 'test-1', timestamp: new Date(), duration: 100, passed: true },
        { testId: 'test-1', timestamp: new Date(), duration: 105, passed: true },
        { testId: 'test-1', timestamp: new Date(), duration: 5000, passed: false } // Anomaly
      ];

      const learnings = await service.extractLearningsFromHistory(executionHistory);

      expect(learnings).toBeDefined();
      expect(learnings['test-1']).toBeDefined();
      expect(learnings['test-1'].patterns).toBeDefined();
      
      const anomalyPattern = learnings['test-1'].patterns.find(p => p.type === 'PERFORMANCE_ANOMALY');
      expect(anomalyPattern).toBeDefined();
    });
  });

  describe('resourceOptimization', () => {
    it('should prioritize based on available resources', async () => {
      const resources = {
        cpu: 0.7,        // 70% CPU available
        memory: 0.5,     // 50% memory available
        network: 0.9,    // 90% network available
        database: 0.3    // 30% database capacity available
      };

      const tests = [
        { id: 'cpu-intensive', resourceUsage: { cpu: 0.8, memory: 0.2, network: 0.1, database: 0.1 }},
        { id: 'db-heavy', resourceUsage: { cpu: 0.2, memory: 0.3, network: 0.1, database: 0.8 }},
        { id: 'lightweight', resourceUsage: { cpu: 0.1, memory: 0.1, network: 0.1, database: 0.1 }}
      ];

      const optimized = await service.optimizeForResources(tests, resources);

      // Database-heavy test should be deprioritized due to low DB capacity
      expect(optimized.find(t => t.testId === 'db-heavy')?.priority).toBeLessThan(5);
      // Lightweight test should be prioritized
      expect(optimized.find(t => t.testId === 'lightweight')?.priority).toBeGreaterThan(7);
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      mockNeo4j.executeQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.prioritizeTests([], {}))
        .rejects.toThrow('Failed to prioritize tests');
    });

    it('should handle invalid test data gracefully', async () => {
      const invalidTests = [
        { id: null, name: undefined } as any
      ];

      await expect(service.prioritizeTests(invalidTests, {}))
        .rejects.toThrow('Invalid test data provided');
    });

    it('should handle empty prioritization weights', async () => {
      const tests: TestCase[] = [
        { id: 'test-1', priority: Priority.HIGH } as TestCase
      ];

      const result = await service.prioritizeTests(tests, {});

      expect(result).toHaveLength(1);
      // Should use default weights
      expect(result[0].priority).toBeDefined();
    });
  });

  describe('integration scenarios', () => {
    it('should integrate with CI/CD pipeline priorities', async () => {
      const pipelineContext = {
        branch: 'feature/payment-update',
        changedFiles: ['src/payment/*.ts'],
        buildType: 'PULL_REQUEST',
        timeConstraint: 600, // 10 minutes
        qualityGates: ['coverage', 'security']
      };

      const tests: TestCase[] = [
        { id: 'payment-unit-test', tags: ['payment', 'unit'] } as TestCase,
        { id: 'security-test', tags: ['security'] } as TestCase,
        { id: 'ui-test', tags: ['ui', 'e2e'] } as TestCase
      ];

      const result = await service.prioritizeForPipeline(tests, pipelineContext);

      // Payment and security tests should be prioritized for this context
      expect(result[0].tags).toContain('payment');
      expect(result.some(t => t.tags?.includes('security'))).toBe(true);
    });

    it('should work with test result feedback loops', async () => {
      const testResults = {
        'test-1': { passed: false, duration: 5000, error: 'timeout' },
        'test-2': { passed: true, duration: 100, error: null },
        'test-3': { passed: false, duration: 200, error: 'assertion failed' }
      };

      const updatedPriorities = await service.updatePrioritiesFromResults(testResults);

      expect(updatedPriorities).toBeDefined();
      // Failed tests should be analyzed for priority adjustments
      expect(updatedPriorities['test-1'].adjustmentReason).toContain('timeout');
      expect(updatedPriorities['test-3'].adjustmentReason).toContain('assertion');
    });
  });
});