/**
 * Testing Intelligence Test Data Factory
 * Generates realistic test data for testing intelligence services
 */

import {
  TestCase,
  TestCaseType,
  TestFramework,
  Priority,
  TestStatus,
  AssertionType,
  CoverageData,
  TestSuite,
  TestConfiguration,
  TestResults,
  TestGenerationRequest,
  MutationTestResult,
  MutationType,
  QualityPrediction,
  TestPrioritization,
  PriorityFactor,
  RiskFactor,
  TestIntelligenceMetrics,
  TestOptimization,
  OptimizationType
} from '../../src/modules/development/types/development.types';

export class TestingIntelligenceFactory {
  private static idCounter = 1;

  static createTestCase(overrides: Partial<TestCase> = {}): TestCase {
    const id = `test-${this.idCounter++}`;
    const now = new Date();

    return {
      id,
      name: `Test ${id}`,
      description: `Description for ${id}`,
      type: TestCaseType.UNIT,
      framework: TestFramework.JEST,
      priority: Priority.MEDIUM,
      complexity: 3,
      estimatedDuration: 120,
      requirements: [`REQ-${this.idCounter}`],
      tags: ['unit', 'test'],
      code: `test('${id}', () => { expect(true).toBe(true); });`,
      setup: 'beforeEach(() => { /* setup */ });',
      teardown: 'afterEach(() => { /* cleanup */ });',
      assertions: [
        {
          type: AssertionType.EQUALITY,
          expected: true,
          matcher: 'toBe',
          message: 'Should be true'
        }
      ],
      coverage: this.createCoverageData(),
      status: TestStatus.PENDING,
      createdAt: now,
      updatedAt: now,
      metadata: {
        author: 'test-factory',
        version: '1.0.0'
      },
      ...overrides
    };
  }

  static createTestCases(count: number, overrides: Partial<TestCase> = {}): TestCase[] {
    return Array.from({ length: count }, (_, index) => 
      this.createTestCase({ 
        ...overrides,
        name: `Test Case ${index + 1}`,
        id: `test-${Date.now()}-${index}`
      })
    );
  }

  static createCoverageData(overrides: Partial<CoverageData> = {}): CoverageData {
    return {
      statements: { total: 100, covered: 85, percentage: 85 },
      branches: { total: 50, covered: 42, percentage: 84 },
      functions: { total: 20, covered: 19, percentage: 95 },
      lines: { total: 95, covered: 81, percentage: 85.26 },
      overall: 87.3,
      uncoveredLines: [15, 23, 45, 67, 89],
      uncoveredBranches: ['if-branch-1', 'else-branch-2'],
      timestamp: new Date(),
      ...overrides
    };
  }

  static createTestSuite(overrides: Partial<TestSuite> = {}): TestSuite {
    const id = `suite-${this.idCounter++}`;
    const now = new Date();

    return {
      id,
      name: `Test Suite ${id}`,
      description: `Description for ${id}`,
      testCases: [`test-1`, `test-2`, `test-3`],
      configuration: this.createTestConfiguration(),
      coverage: this.createCoverageData(),
      results: this.createTestResults(),
      performance: {
        averageTestDuration: 150,
        slowestTests: [
          { testId: 'test-1', duration: 300, status: TestStatus.PASSED },
          { testId: 'test-2', duration: 250, status: TestStatus.PASSED }
        ],
        memoryUsage: { heapUsed: 50, heapTotal: 100, external: 5, rss: 60 },
        cpuUsage: 45,
        networkRequests: 3
      },
      createdAt: now,
      updatedAt: now,
      ...overrides
    };
  }

  static createTestConfiguration(overrides: Partial<TestConfiguration> = {}): TestConfiguration {
    return {
      framework: TestFramework.JEST,
      timeout: 30000,
      retries: 2,
      parallel: true,
      maxWorkers: 4,
      setupFiles: ['setup.ts'],
      teardownFiles: ['teardown.ts'],
      environment: { NODE_ENV: 'test' },
      reporters: ['default', 'coverage'],
      coverage: {
        enabled: true,
        threshold: { statements: 80, branches: 75, functions: 85, lines: 80 },
        include: ['src/**/*.ts'],
        exclude: ['src/**/*.test.ts'],
        reporters: ['text', 'lcov']
      },
      ...overrides
    };
  }

  static createTestResults(overrides: Partial<TestResults> = {}): TestResults {
    return {
      total: 25,
      passed: 23,
      failed: 2,
      skipped: 0,
      duration: 1200,
      failures: [
        {
          testId: 'test-fail-1',
          error: 'Expected true but got false',
          stackTrace: 'Error: at test.spec.ts:15:20',
          screenshot: 'failure-screenshot.png',
          logs: ['Log entry 1', 'Log entry 2'],
          metadata: { retry: 1 }
        }
      ],
      performance: {
        averageTestDuration: 48,
        slowestTests: [],
        memoryUsage: { heapUsed: 30, heapTotal: 60, external: 2, rss: 40 },
        cpuUsage: 35,
        networkRequests: 5
      },
      timestamp: new Date(),
      ...overrides
    };
  }

  static createTestGenerationRequest(overrides: Partial<TestGenerationRequest> = {}): TestGenerationRequest {
    return {
      sourceCode: `
        function add(a: number, b: number): number {
          return a + b;
        }
      `,
      language: 'typescript',
      framework: TestFramework.JEST,
      testType: TestCaseType.UNIT,
      requirements: ['REQ-001'],
      existingTests: [],
      coverageGoals: { statements: 90, branches: 85, functions: 90, lines: 90 },
      complexity: 3,
      patterns: ['function'],
      ...overrides
    };
  }

  static createMutationTestResult(overrides: Partial<MutationTestResult> = {}): MutationTestResult {
    return {
      id: `mutation-${this.idCounter++}`,
      originalCode: 'return a + b;',
      mutatedCode: 'return a - b;',
      mutationType: MutationType.ARITHMETIC,
      location: { file: 'math.ts', line: 5, column: 10, function: 'add' },
      killed: true,
      survivedTests: [],
      killedBy: 'addition test',
      score: 1,
      timestamp: new Date(),
      ...overrides
    };
  }

  static createQualityPrediction(overrides: Partial<QualityPrediction> = {}): QualityPrediction {
    return {
      testId: `test-${this.idCounter++}`,
      qualityScore: 85,
      riskFactors: [
        {
          category: 'COMPLEXITY',
          level: Priority.LOW,
          description: 'Low complexity test',
          mitigation: ['Keep complexity low', 'Use clear assertions'],
          weight: 0.2
        }
      ],
      recommendations: ['Excellent test quality', 'Consider adding edge cases'],
      confidence: 0.9,
      predictedIssues: [],
      historicalData: [
        {
          timestamp: new Date(),
          qualityScore: 85,
          testsPassed: 23,
          testsFailed: 2,
          coverage: 87,
          issues: 1
        }
      ],
      ...overrides
    };
  }

  static createTestPrioritization(overrides: Partial<TestPrioritization> = {}): TestPrioritization {
    return {
      testId: `test-${this.idCounter++}`,
      priority: 8.5,
      factors: [
        {
          name: 'BUSINESS_IMPACT',
          weight: 0.4,
          value: 9,
          contribution: 3.6
        },
        {
          name: 'RISK_SCORE',
          weight: 0.3,
          value: 7,
          contribution: 2.1
        },
        {
          name: 'COMPLEXITY',
          weight: 0.2,
          value: 5,
          contribution: 1.0
        },
        {
          name: 'EXECUTION_TIME',
          weight: 0.1,
          value: 8,
          contribution: 0.8
        }
      ],
      reasoning: 'High business impact and moderate risk require immediate attention',
      estimatedImpact: 9,
      riskLevel: Priority.HIGH,
      ...overrides
    };
  }

  static createRiskFactor(overrides: Partial<RiskFactor> = {}): RiskFactor {
    return {
      category: 'COMPLEXITY',
      level: Priority.MEDIUM,
      description: 'Moderate complexity detected',
      mitigation: [
        'Break down complex test into smaller parts',
        'Use helper functions to reduce complexity'
      ],
      weight: 0.3,
      ...overrides
    };
  }

  static createTestIntelligenceMetrics(overrides: Partial<TestIntelligenceMetrics> = {}): TestIntelligenceMetrics {
    return {
      totalTests: 150,
      testEfficiency: 75,
      coverageEffectiveness: 82,
      defectDetectionRate: 88,
      testMaintenanceCost: 35,
      automationRate: 92,
      testExecutionTime: 1200,
      qualityTrend: 85,
      riskReduction: 78,
      timestamp: new Date(),
      ...overrides
    };
  }

  static createTestOptimization(overrides: Partial<TestOptimization> = {}): TestOptimization {
    return {
      id: `optimization-${this.idCounter++}`,
      type: OptimizationType.PARALLEL_EXECUTION,
      description: 'Enable parallel test execution to reduce overall runtime',
      impact: 8,
      effort: 4,
      priority: Priority.HIGH,
      implementation: [
        'Configure Jest for parallel execution',
        'Isolate test dependencies',
        'Update CI/CD configuration'
      ],
      expectedBenefits: [
        'Reduce test execution time by 60%',
        'Faster feedback cycles',
        'Improved developer productivity'
      ],
      risks: [
        'Potential race conditions in shared resources',
        'Increased memory usage during test execution'
      ],
      metadata: {
        estimatedTimeSavings: 720, // seconds
        resourceRequirements: 'Additional CPU cores'
      },
      ...overrides
    };
  }

  static createRealisticTestScenarios(): {
    highQualityTest: TestCase;
    problematicTest: TestCase;
    flakyTest: TestCase;
    performanceTest: TestCase;
  } {
    return {
      highQualityTest: this.createTestCase({
        name: 'High quality user validation test',
        complexity: 2,
        priority: Priority.HIGH,
        tags: ['validation', 'user', 'critical-path'],
        code: `
          describe('User Validation', () => {
            test('should validate user with all required fields', () => {
              const validUser = { name: 'John', email: 'john@test.com', age: 25 };
              expect(validateUser(validUser)).toBe(true);
              expect(validateUser(validUser).errors).toHaveLength(0);
            });
            
            test('should reject user with missing required fields', () => {
              const invalidUser = { name: '', email: 'invalid', age: -1 };
              expect(validateUser(invalidUser)).toBe(false);
              expect(validateUser(invalidUser).errors).toContain('Invalid name');
            });
          });
        `,
        assertions: [
          { type: AssertionType.EQUALITY, expected: true, matcher: 'toBe' },
          { type: AssertionType.PROPERTY, expected: 0, matcher: 'toHaveLength' }
        ]
      }),

      problematicTest: this.createTestCase({
        name: 'Problematic integration test',
        complexity: 8,
        priority: Priority.LOW,
        tags: ['integration', 'problematic'],
        code: `
          test('complex integration test with multiple dependencies', async () => {
            // This test has multiple issues: too complex, too many dependencies, unclear assertions
            const db = await setupDatabase();
            const api = new APIClient();
            const service = new ComplexService(db, api, logger, cache, queue);
            
            const result = await service.processComplexWorkflow(data);
            expect(result).toBeDefined(); // Weak assertion
            
            // Missing cleanup, potential race conditions, unclear purpose
          });
        `,
        estimatedDuration: 5000,
        assertions: [
          { type: AssertionType.TRUTHINESS, expected: true, matcher: 'toBeDefined' }
        ]
      }),

      flakyTest: this.createTestCase({
        name: 'Flaky async test with timing issues',
        complexity: 5,
        priority: Priority.MEDIUM,
        tags: ['async', 'flaky', 'timing'],
        code: `
          test('async operation with timeout', async () => {
            const promise = asyncOperation();
            setTimeout(() => {
              expect(promise).resolves.toBe('success');
            }, 100); // Race condition potential
          });
        `,
        estimatedDuration: 200,
        metadata: {
          flakyScore: 0.7,
          timeoutIssues: true
        }
      }),

      performanceTest: this.createTestCase({
        name: 'Performance benchmark test',
        type: TestCaseType.PERFORMANCE,
        complexity: 4,
        priority: Priority.MEDIUM,
        tags: ['performance', 'benchmark'],
        code: `
          test('should process 1000 items under 100ms', async () => {
            const items = generateItems(1000);
            const start = performance.now();
            
            const result = await processItems(items);
            const duration = performance.now() - start;
            
            expect(duration).toBeLessThan(100);
            expect(result).toHaveLength(1000);
          });
        `,
        estimatedDuration: 150,
        assertions: [
          { type: AssertionType.COMPARISON, expected: 100, matcher: 'toBeLessThan' },
          { type: AssertionType.PROPERTY, expected: 1000, matcher: 'toHaveLength' }
        ]
      )
    };
  }

  static createCoverageScenarios(): {
    excellentCoverage: CoverageData;
    poorCoverage: CoverageData;
    unbalancedCoverage: CoverageData;
  } {
    return {
      excellentCoverage: this.createCoverageData({
        statements: { total: 100, covered: 98, percentage: 98 },
        branches: { total: 50, covered: 47, percentage: 94 },
        functions: { total: 20, covered: 20, percentage: 100 },
        lines: { total: 95, covered: 93, percentage: 97.89 },
        overall: 97.47,
        uncoveredLines: [25, 67],
        uncoveredBranches: ['edge-case-1']
      }),

      poorCoverage: this.createCoverageData({
        statements: { total: 100, covered: 45, percentage: 45 },
        branches: { total: 50, covered: 18, percentage: 36 },
        functions: { total: 20, covered: 12, percentage: 60 },
        lines: { total: 95, covered: 40, percentage: 42.11 },
        overall: 45.78,
        uncoveredLines: Array.from({ length: 55 }, (_, i) => i + 1),
        uncoveredBranches: Array.from({ length: 32 }, (_, i) => `branch-${i}`)
      }),

      unbalancedCoverage: this.createCoverageData({
        statements: { total: 100, covered: 95, percentage: 95 },
        branches: { total: 50, covered: 20, percentage: 40 },
        functions: { total: 20, covered: 18, percentage: 90 },
        lines: { total: 95, covered: 90, percentage: 94.74 },
        overall: 79.93,
        uncoveredLines: [15, 23, 45, 67, 89],
        uncoveredBranches: Array.from({ length: 30 }, (_, i) => `branch-${i}`)
      })
    };
  }

  static createMutationTestingScenarios(): {
    strongTestSuite: MutationTestResult[];
    weakTestSuite: MutationTestResult[];
  } {
    return {
      strongTestSuite: [
        this.createMutationTestResult({
          id: 'mut-1',
          mutationType: MutationType.ARITHMETIC,
          killed: true,
          killedBy: 'arithmetic test',
          score: 1
        }),
        this.createMutationTestResult({
          id: 'mut-2',
          mutationType: MutationType.CONDITIONAL,
          killed: true,
          killedBy: 'boundary test',
          score: 1
        }),
        this.createMutationTestResult({
          id: 'mut-3',
          mutationType: MutationType.LOGICAL,
          killed: true,
          killedBy: 'logic test',
          score: 1
        })
      ],

      weakTestSuite: [
        this.createMutationTestResult({
          id: 'mut-4',
          mutationType: MutationType.ARITHMETIC,
          killed: false,
          survivedTests: ['weak test 1', 'weak test 2'],
          score: 0
        }),
        this.createMutationTestResult({
          id: 'mut-5',
          mutationType: MutationType.RELATIONAL,
          killed: false,
          survivedTests: ['generic test'],
          score: 0
        })
      ]
    };
  }

  static reset(): void {
    this.idCounter = 1;
  }
}