/**
 * Mutation Testing Service Unit Tests
 * Tests for mutation testing and test quality assessment
 */

import { MutationTestingService } from '../../../src/modules/development/services/mutation-testing.service';
import { Neo4jService } from '../../../src/core/database/neo4j';
import {
  MutationTestResult,
  MutationType,
  TestFramework
} from '../../../src/modules/development/types/development.types';

jest.mock('../../../src/core/database/neo4j');
jest.mock('../../../src/core/logging/logger');

describe('MutationTestingService', () => {
  let service: MutationTestingService;
  let mockNeo4j: jest.Mocked<Neo4jService>;

  beforeEach(() => {
    mockNeo4j = {
      getSession: jest.fn(),
      executeQuery: jest.fn().mockResolvedValue([]),
      executeTransaction: jest.fn(),
      initializeSchema: jest.fn(),
      close: jest.fn(),
    } as unknown as jest.Mocked<Neo4jService>;

    service = new MutationTestingService(mockNeo4j);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('runMutationTesting', () => {
    const sourceCode = `
      function isEven(num) {
        if (num < 0) return false;
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

    it('should generate and test arithmetic mutations', async () => {
      const result = await service.runMutationTesting({
        sourceCode,
        testCode,
        language: 'javascript',
        framework: TestFramework.JEST,
        mutationTypes: [MutationType.ARITHMETIC]
      });

      expect(result).toBeDefined();
      expect(result.mutations).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);

      const arithmeticMutations = result.mutations.filter(m => m.mutationType === MutationType.ARITHMETIC);
      expect(arithmeticMutations.length).toBeGreaterThan(0);

      // Should have mutation for % operator
      const moduloMutation = arithmeticMutations.find(m => 
        m.originalCode.includes('%') && m.mutatedCode.includes('/')
      );
      expect(moduloMutation).toBeDefined();
    });

    it('should generate and test conditional mutations', async () => {
      const conditionalCode = `
        function validateAge(age) {
          if (age >= 18) {
            return 'adult';
          } else if (age >= 13) {
            return 'teenager';
          } else {
            return 'child';
          }
        }
      `;

      const conditionalTests = `
        test('should classify ages correctly', () => {
          expect(validateAge(20)).toBe('adult');
          expect(validateAge(15)).toBe('teenager');
          expect(validateAge(10)).toBe('child');
        });
      `;

      const result = await service.runMutationTesting({
        sourceCode: conditionalCode,
        testCode: conditionalTests,
        language: 'javascript',
        framework: TestFramework.JEST,
        mutationTypes: [MutationType.CONDITIONAL]
      });

      const conditionalMutations = result.mutations.filter(m => m.mutationType === MutationType.CONDITIONAL);
      expect(conditionalMutations.length).toBeGreaterThan(0);

      // Should mutate >= to > or <
      const comparisonMutation = conditionalMutations.find(m =>
        m.originalCode.includes('>=') && (m.mutatedCode.includes('>') || m.mutatedCode.includes('<'))
      );
      expect(comparisonMutation).toBeDefined();
    });

    it('should identify killed vs survived mutations', async () => {
      const weakTestCode = `
        test('weak test', () => {
          expect(isEven(2)).toBeTruthy(); // Too generic
        });
      `;

      const result = await service.runMutationTesting({
        sourceCode,
        testCode: weakTestCode,
        language: 'javascript',
        framework: TestFramework.JEST
      });

      expect(result.killed.length + result.survived.length).toBe(result.mutations.length);
      expect(result.survived.length).toBeGreaterThan(0); // Weak tests should let mutations survive
      expect(result.overallScore).toBeLessThan(70);
    });

    it('should handle strong test suites', async () => {
      const strongTestCode = `
        test('comprehensive isEven tests', () => {
          // Test even numbers
          expect(isEven(0)).toBe(true);
          expect(isEven(2)).toBe(true);
          expect(isEven(4)).toBe(true);
          expect(isEven(100)).toBe(true);
          
          // Test odd numbers
          expect(isEven(1)).toBe(false);
          expect(isEven(3)).toBe(false);
          expect(isEven(5)).toBe(false);
          expect(isEven(99)).toBe(false);
          
          // Test negative numbers
          expect(isEven(-1)).toBe(false);
          expect(isEven(-2)).toBe(false);
        });
      `;

      const result = await service.runMutationTesting({
        sourceCode,
        testCode: strongTestCode,
        language: 'javascript',
        framework: TestFramework.JEST
      });

      expect(result.overallScore).toBeGreaterThan(80);
      expect(result.killed.length).toBeGreaterThan(result.survived.length);
    });
  });

  describe('generateMutations', () => {
    it('should generate arithmetic operator mutations', async () => {
      const code = 'const result = a + b * c - d / e;';
      
      const mutations = await service.generateMutations(code, [MutationType.ARITHMETIC]);

      expect(mutations).toBeDefined();
      expect(mutations.length).toBeGreaterThan(0);

      const additionMutation = mutations.find(m => 
        m.originalCode.includes('+') && m.mutatedCode.includes('-')
      );
      expect(additionMutation).toBeDefined();

      const multiplicationMutation = mutations.find(m =>
        m.originalCode.includes('*') && m.mutatedCode.includes('/')
      );
      expect(multiplicationMutation).toBeDefined();
    });

    it('should generate logical operator mutations', async () => {
      const code = 'if (a && b || c && !d) { return true; }';

      const mutations = await service.generateMutations(code, [MutationType.LOGICAL]);

      const andMutation = mutations.find(m =>
        m.originalCode.includes('&&') && m.mutatedCode.includes('||')
      );
      expect(andMutation).toBeDefined();

      const notMutation = mutations.find(m =>
        m.originalCode.includes('!d') && !m.mutatedCode.includes('!d')
      );
      expect(notMutation).toBeDefined();
    });

    it('should generate relational operator mutations', async () => {
      const code = 'return x > y && a <= b && c != d;';

      const mutations = await service.generateMutations(code, [MutationType.RELATIONAL]);

      const greaterMutation = mutations.find(m =>
        m.originalCode.includes('>') && (m.mutatedCode.includes('>=') || m.mutatedCode.includes('<'))
      );
      expect(greaterMutation).toBeDefined();

      const inequalityMutation = mutations.find(m =>
        m.originalCode.includes('!=') && m.mutatedCode.includes('==')
      );
      expect(inequalityMutation).toBeDefined();
    });

    it('should generate literal value mutations', async () => {
      const code = 'const threshold = 100; const flag = true; const name = "test";';

      const mutations = await service.generateMutations(code, [MutationType.LITERAL]);

      const numberMutation = mutations.find(m =>
        m.originalCode.includes('100') && m.mutatedCode.includes('101')
      );
      expect(numberMutation).toBeDefined();

      const booleanMutation = mutations.find(m =>
        m.originalCode.includes('true') && m.mutatedCode.includes('false')
      );
      expect(booleanMutation).toBeDefined();

      const stringMutation = mutations.find(m =>
        m.originalCode.includes('"test"') && m.mutatedCode.includes('""')
      );
      expect(stringMutation).toBeDefined();
    });

    it('should handle complex nested expressions', async () => {
      const complexCode = `
        function processData(items) {
          return items
            .filter(item => item.value > 0 && item.active)
            .map(item => item.value * 2)
            .reduce((sum, val) => sum + val, 0);
        }
      `;

      const mutations = await service.generateMutations(complexCode, [
        MutationType.ARITHMETIC,
        MutationType.RELATIONAL,
        MutationType.LOGICAL
      ]);

      expect(mutations.length).toBeGreaterThan(5);
    });
  });

  describe('executeMutation', () => {
    it('should execute mutation and run tests', async () => {
      const mutation: MutationTestResult = {
        id: 'mut-1',
        originalCode: 'return num % 2 === 0;',
        mutatedCode: 'return num % 2 !== 0;',
        mutationType: MutationType.RELATIONAL,
        location: { file: 'test.js', line: 3, column: 10 },
        killed: false,
        survivedTests: [],
        score: 0,
        timestamp: new Date()
      };

      const testCode = `
        test('isEven test', () => {
          expect(isEven(4)).toBe(true);
        });
      `;

      const result = await service.executeMutation(mutation, testCode, TestFramework.JEST);

      expect(result).toBeDefined();
      expect(result.killed).toBe(true); // This mutation should be killed by the test
      expect(result.killedBy).toBe('isEven test');
    });

    it('should identify surviving mutations', async () => {
      const mutation: MutationTestResult = {
        id: 'mut-2',
        originalCode: 'if (x > 5)',
        mutatedCode: 'if (x >= 5)',
        mutationType: MutationType.RELATIONAL,
        location: { file: 'test.js', line: 1, column: 5 },
        killed: false,
        survivedTests: [],
        score: 0,
        timestamp: new Date()
      };

      const inadequateTest = `
        test('basic test', () => {
          expect(someFunction(10)).toBeDefined();
        });
      `;

      const result = await service.executeMutation(mutation, inadequateTest, TestFramework.JEST);

      expect(result.killed).toBe(false);
      expect(result.survivedTests).toContain('basic test');
    });
  });

  describe('analyzeMutationResults', () => {
    it('should analyze mutation testing results and provide insights', async () => {
      const mutationResults: MutationTestResult[] = [
        {
          id: 'mut-1',
          originalCode: 'a + b',
          mutatedCode: 'a - b',
          mutationType: MutationType.ARITHMETIC,
          location: { file: 'math.js', line: 5, column: 10 },
          killed: true,
          killedBy: 'addition test',
          score: 1,
          timestamp: new Date(),
          survivedTests: []
        },
        {
          id: 'mut-2',
          originalCode: 'x > 0',
          mutatedCode: 'x >= 0',
          mutationType: MutationType.RELATIONAL,
          location: { file: 'validation.js', line: 10, column: 5 },
          killed: false,
          survivedTests: ['validation test'],
          score: 0,
          timestamp: new Date()
        }
      ];

      const analysis = await service.analyzeMutationResults(mutationResults);

      expect(analysis).toBeDefined();
      expect(analysis.overallScore).toBe(50); // 1 killed out of 2
      expect(analysis.mutationTypeResults).toBeDefined();
      expect(analysis.weakAreas).toBeDefined();
      expect(analysis.recommendations).toBeDefined();

      const relationalResults = analysis.mutationTypeResults[MutationType.RELATIONAL];
      expect(relationalResults.killRate).toBe(0);
      expect(analysis.weakAreas).toContain('RELATIONAL');
    });

    it('should identify patterns in surviving mutations', async () => {
      const results: MutationTestResult[] = [
        {
          id: 'mut-1',
          location: { file: 'boundary.js', line: 5, column: 10, function: 'checkBoundary' },
          killed: false,
          mutationType: MutationType.RELATIONAL,
          survivedTests: ['boundary test 1', 'boundary test 2']
        },
        {
          id: 'mut-2', 
          location: { file: 'boundary.js', line: 8, column: 15, function: 'checkBoundary' },
          killed: false,
          mutationType: MutationType.RELATIONAL,
          survivedTests: ['boundary test 1']
        }
      ] as MutationTestResult[];

      const analysis = await service.analyzeMutationResults(results);

      const boundaryPattern = analysis.patterns.find(p => p.area === 'boundary.js');
      expect(boundaryPattern).toBeDefined();
      expect(boundaryPattern?.survivingMutations).toBe(2);
      expect(boundaryPattern?.recommendation).toContain('boundary');
    });
  });

  describe('optimizeMutationTesting', () => {
    it('should prioritize high-value mutations', async () => {
      const allMutations = [
        {
          id: 'critical-mut',
          location: { file: 'payment.js', line: 10, function: 'processPayment' },
          mutationType: MutationType.CONDITIONAL,
          estimatedImpact: 9
        },
        {
          id: 'low-impact-mut',
          location: { file: 'theme.js', line: 5, function: 'setTheme' },
          mutationType: MutationType.LITERAL,
          estimatedImpact: 2
        }
      ];

      const optimized = await service.optimizeMutationSelection(allMutations, {
        maxMutations: 10,
        priorityThreshold: 7,
        timeConstraint: 300 // 5 minutes
      });

      expect(optimized.selectedMutations.length).toBeLessThanOrEqual(10);
      expect(optimized.selectedMutations[0].id).toBe('critical-mut');
      expect(optimized.estimatedExecutionTime).toBeLessThanOrEqual(300);
    });

    it('should balance mutation type coverage', async () => {
      const mutations = [
        ...Array(20).fill(null).map((_, i) => ({ 
          id: `arith-${i}`, 
          mutationType: MutationType.ARITHMETIC,
          estimatedImpact: 5
        })),
        { id: 'cond-1', mutationType: MutationType.CONDITIONAL, estimatedImpact: 8 },
        { id: 'logic-1', mutationType: MutationType.LOGICAL, estimatedImpact: 7 }
      ];

      const optimized = await service.optimizeMutationSelection(mutations, {
        maxMutations: 10,
        ensureTypeBalance: true
      });

      const typeDistribution = optimized.selectedMutations.reduce((acc, mut) => {
        acc[mut.mutationType] = (acc[mut.mutationType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Should include different mutation types, not just arithmetic
      expect(Object.keys(typeDistribution).length).toBeGreaterThan(1);
      expect(typeDistribution[MutationType.CONDITIONAL]).toBeGreaterThan(0);
    });
  });

  describe('generateMutationReport', () => {
    it('should generate comprehensive mutation testing report', async () => {
      const testSuiteId = 'suite-123';

      mockNeo4j.query.mockResolvedValue([{
        suite: { id: testSuiteId, name: 'Payment Processing Tests' },
        mutations: [
          {
            id: 'mut-1',
            mutationType: MutationType.ARITHMETIC,
            killed: true,
            killedBy: 'payment calculation test',
            score: 1
          },
          {
            id: 'mut-2',
            mutationType: MutationType.CONDITIONAL,
            killed: false,
            survivedTests: ['validation test'],
            score: 0
          }
        ],
        executionMetrics: {
          totalTime: 120000,
          testsRun: 25,
          mutationsGenerated: 50,
          mutationsExecuted: 30
        }
      }]);

      const report = await service.generateMutationReport(testSuiteId);

      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.summary.overallScore).toBe(50);
      expect(report.mutationTypeBreakdown).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.weakAreas).toBeDefined();
    });

    it('should include actionable recommendations', async () => {
      const testSuiteId = 'weak-suite';

      mockNeo4j.query.mockResolvedValue([{
        suite: { id: testSuiteId },
        mutations: [
          { mutationType: MutationType.RELATIONAL, killed: false, location: { function: 'validate' }},
          { mutationType: MutationType.RELATIONAL, killed: false, location: { function: 'validate' }},
          { mutationType: MutationType.CONDITIONAL, killed: false, location: { function: 'process' }}
        ]
      }]);

      const report = await service.generateMutationReport(testSuiteId);

      expect(report.recommendations.length).toBeGreaterThan(0);
      const validateRec = report.recommendations.find(rec => 
        rec.toLowerCase().includes('validate')
      );
      expect(validateRec).toBeDefined();
    });
  });

  describe('integrateMutationTesting', () => {
    it('should integrate with existing test suites', async () => {
      const integrationConfig = {
        testSuiteId: 'existing-suite',
        mutationStrategy: 'INCREMENTAL' as const,
        maxExecutionTime: 600,
        coverageThreshold: 80
      };

      const result = await service.integrateWithTestSuite(integrationConfig);

      expect(result).toBeDefined();
      expect(result.integrationPlan).toBeDefined();
      expect(result.estimatedImpact).toBeDefined();
      expect(result.implementation).toBeDefined();
    });

    it('should work with CI/CD pipelines', async () => {
      const pipelineConfig = {
        trigger: 'PULL_REQUEST' as const,
        mutationBudget: 300, // 5 minutes
        failureThreshold: 70,
        reportFormat: 'JSON' as const
      };

      const ciIntegration = await service.setupCIPipelineIntegration(pipelineConfig);

      expect(ciIntegration).toBeDefined();
      expect(ciIntegration.pipelineSteps).toBeDefined();
      expect(ciIntegration.qualityGates).toBeDefined();
      expect(ciIntegration.reportingConfig).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle syntax errors in source code', async () => {
      const invalidCode = 'function broken( { return x +; }';

      await expect(service.runMutationTesting({
        sourceCode: invalidCode,
        testCode: 'test("dummy", () => {})',
        language: 'javascript',
        framework: TestFramework.JEST
      })).rejects.toThrow('Syntax error in source code');
    });

    it('should handle test execution failures gracefully', async () => {
      const mutation: MutationTestResult = {
        id: 'failing-mut',
        originalCode: 'return true;',
        mutatedCode: 'throw new Error("test error");',
        mutationType: MutationType.STATEMENT,
        location: { file: 'test.js', line: 1, column: 1 },
        killed: false,
        survivedTests: [],
        score: 0,
        timestamp: new Date()
      };

      const result = await service.executeMutation(
        mutation, 
        'test("test", () => { someFunction(); });', 
        TestFramework.JEST
      );

      expect(result.killed).toBe(true); // Error should kill the test
      expect(result.killedBy).toContain('error');
    });

    it('should handle unsupported mutation types', async () => {
      await expect(service.generateMutations('code', ['INVALID_TYPE' as MutationType]))
        .rejects.toThrow('Unsupported mutation type');
    });

    it('should handle timeout scenarios', async () => {
      const longRunningTest = `
        test('infinite loop test', () => {
          while(true) { /* infinite loop */ }
        });
      `;

      const result = await service.executeMutation(
        {
          id: 'timeout-mut',
          originalCode: 'return true;',
          mutatedCode: 'return false;',
          mutationType: MutationType.LITERAL,
          location: { file: 'test.js', line: 1, column: 1 },
          killed: false,
          survivedTests: [],
          score: 0,
          timestamp: new Date()
        },
        longRunningTest,
        TestFramework.JEST,
        { timeout: 1000 }
      );

      expect(result.killed).toBe(false);
      expect(result.survivedTests).toContain('timeout');
    });
  });

  describe('advanced features', () => {
    it('should support custom mutation operators', async () => {
      const customOperator = {
        name: 'NULL_CHECK_REMOVAL',
        pattern: /if\s*\(\s*\w+\s*!=\s*null\s*\)/g,
        replacement: 'if (true)'
      };

      const code = 'if (user != null) { return user.name; }';

      const mutations = await service.generateCustomMutations(code, [customOperator]);

      expect(mutations.length).toBe(1);
      expect(mutations[0].mutatedCode).toContain('if (true)');
    });

    it('should support mutation testing for TypeScript', async () => {
      const tsCode = `
        interface User {
          id: number;
          name: string;
        }
        
        function validateUser(user: User): boolean {
          return user.id > 0 && user.name.length > 0;
        }
      `;

      const result = await service.runMutationTesting({
        sourceCode: tsCode,
        testCode: 'test("ts test", () => { expect(validateUser({id: 1, name: "test"})).toBe(true); });',
        language: 'typescript',
        framework: TestFramework.JEST
      });

      expect(result).toBeDefined();
      expect(result.mutations.length).toBeGreaterThan(0);
    });

    it('should provide mutation testing metrics over time', async () => {
      const timeRange = {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31')
      };

      mockNeo4j.query.mockResolvedValue([
        { date: new Date('2024-01-01'), score: 65, mutations: 20 },
        { date: new Date('2024-01-15'), score: 72, mutations: 25 },
        { date: new Date('2024-01-31'), score: 78, mutations: 30 }
      ]);

      const metrics = await service.getMutationTestingTrends('project-1', timeRange);

      expect(metrics).toBeDefined();
      expect(metrics.trend).toBe('IMPROVING');
      expect(metrics.dataPoints).toHaveLength(3);
      expect(metrics.averageScore).toBeCloseTo(71.67, 1);
    });
  });
});