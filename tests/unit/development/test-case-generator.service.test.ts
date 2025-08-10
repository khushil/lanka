/**
 * Test Case Generator Service Unit Tests
 * Tests for AI-powered test case generation
 */

import { TestCaseGeneratorService } from '../../../src/modules/development/services/test-case-generator.service';
import { Neo4jService } from '../../../src/core/database/neo4j';
import {
  TestGenerationRequest,
  TestFramework,
  TestCaseType,
  Priority,
  AssertionType
} from '../../../src/modules/development/types/development.types';

jest.mock('../../../src/core/database/neo4j');
jest.mock('../../../src/core/logging/logger');

describe('TestCaseGeneratorService', () => {
  let service: TestCaseGeneratorService;
  let mockNeo4j: jest.Mocked<Neo4jService>;

  beforeEach(() => {
    mockNeo4j = {
      getSession: jest.fn(),
      executeQuery: jest.fn().mockResolvedValue([]),
      executeTransaction: jest.fn(),
      initializeSchema: jest.fn(),
      close: jest.fn(),
    } as unknown as jest.Mocked<Neo4jService>;

    service = new TestCaseGeneratorService(mockNeo4j);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateFromSourceCode', () => {
    it('should generate unit tests from simple function', async () => {
      const request: TestGenerationRequest = {
        sourceCode: `
          function calculateTax(amount: number, rate: number): number {
            if (amount < 0 || rate < 0) {
              throw new Error('Invalid input');
            }
            return amount * rate;
          }
        `,
        language: 'typescript',
        framework: TestFramework.JEST,
        testType: TestCaseType.UNIT
      };

      const result = await service.generateFromSourceCode(request);

      expect(result).toBeDefined();
      expect(result.testCases).toHaveLength(3); // Happy path, edge cases, error cases
      expect(result.testCases[0].code).toContain('calculateTax');
      expect(result.testCases[0].assertions).toHaveLength(1);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should generate tests for class methods', async () => {
      const request: TestGenerationRequest = {
        sourceCode: `
          class Calculator {
            private history: number[] = [];
            
            add(a: number, b: number): number {
              const result = a + b;
              this.history.push(result);
              return result;
            }
            
            getHistory(): number[] {
              return [...this.history];
            }
            
            clear(): void {
              this.history = [];
            }
          }
        `,
        language: 'typescript',
        framework: TestFramework.JEST,
        testType: TestCaseType.UNIT
      };

      const result = await service.generateFromSourceCode(request);

      expect(result.testCases.length).toBeGreaterThan(3);
      
      // Should test constructor, add method, getHistory, clear
      const addTest = result.testCases.find(tc => tc.name.includes('add'));
      const historyTest = result.testCases.find(tc => tc.name.includes('history'));
      const clearTest = result.testCases.find(tc => tc.name.includes('clear'));
      
      expect(addTest).toBeDefined();
      expect(historyTest).toBeDefined();
      expect(clearTest).toBeDefined();
    });

    it('should handle async functions', async () => {
      const request: TestGenerationRequest = {
        sourceCode: `
          async function fetchUser(id: string): Promise<User> {
            const response = await fetch(\`/api/users/\${id}\`);
            if (!response.ok) {
              throw new Error('User not found');
            }
            return response.json();
          }
        `,
        language: 'typescript',
        framework: TestFramework.JEST,
        testType: TestCaseType.UNIT
      };

      const result = await service.generateFromSourceCode(request);

      const asyncTest = result.testCases.find(tc => tc.code.includes('await'));
      expect(asyncTest).toBeDefined();
      expect(asyncTest?.code).toContain('async');
      expect(asyncTest?.code).toContain('expect');
    });

    it('should generate tests for React components', async () => {
      const request: TestGenerationRequest = {
        sourceCode: `
          interface Props {
            title: string;
            onClick: () => void;
            disabled?: boolean;
          }
          
          function Button({ title, onClick, disabled = false }: Props) {
            return (
              <button onClick={onClick} disabled={disabled}>
                {title}
              </button>
            );
          }
        `,
        language: 'typescript',
        framework: TestFramework.JEST,
        testType: TestCaseType.UNIT,
        patterns: ['react', 'component']
      };

      const result = await service.generateFromSourceCode(request);

      expect(result.testCases.length).toBeGreaterThan(2);
      
      const renderTest = result.testCases.find(tc => tc.code.includes('render'));
      const clickTest = result.testCases.find(tc => tc.code.includes('click'));
      
      expect(renderTest).toBeDefined();
      expect(clickTest).toBeDefined();
      expect(result.testCases[0].code).toContain('@testing-library/react');
    });
  });

  describe('generateFromRequirements', () => {
    it('should generate acceptance tests from requirements', async () => {
      const requirements = [
        'User should be able to login with valid credentials',
        'System should display error message for invalid credentials',
        'User should be redirected to dashboard after successful login'
      ];

      const result = await service.generateFromRequirements(
        requirements,
        TestFramework.PLAYWRIGHT,
        TestCaseType.E2E
      );

      expect(result.testCases).toHaveLength(3);
      expect(result.testCases[0].type).toBe(TestCaseType.E2E);
      expect(result.testCases[0].framework).toBe(TestFramework.PLAYWRIGHT);
      expect(result.testCases[0].code).toContain('test(');
    });

    it('should generate API tests from requirements', async () => {
      const requirements = [
        'API should return user profile when valid token provided',
        'API should return 401 when invalid token provided',
        'API should return 404 when user not found'
      ];

      const result = await service.generateFromRequirements(
        requirements,
        TestFramework.SUPERTEST,
        TestCaseType.API
      );

      expect(result.testCases[0].code).toContain('request(app)');
      expect(result.testCases[0].code).toContain('.expect(');
    });
  });

  describe('generateEdgeCases', () => {
    it('should identify and generate edge case tests', async () => {
      const sourceCode = `
        function divideNumbers(a: number, b: number): number {
          return a / b;
        }
      `;

      const edgeCases = await service.generateEdgeCases(sourceCode, 'typescript');

      expect(edgeCases).toBeDefined();
      expect(edgeCases.length).toBeGreaterThan(0);
      
      const divideByZeroTest = edgeCases.find(tc => tc.name.includes('zero'));
      const infinityTest = edgeCases.find(tc => tc.name.includes('infinity'));
      
      expect(divideByZeroTest || infinityTest).toBeDefined();
    });

    it('should handle string manipulation edge cases', async () => {
      const sourceCode = `
        function capitalize(str: string): string {
          return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        }
      `;

      const edgeCases = await service.generateEdgeCases(sourceCode, 'typescript');

      const emptyStringTest = edgeCases.find(tc => tc.code.includes('""'));
      const nullTest = edgeCases.find(tc => tc.code.includes('null'));
      
      expect(emptyStringTest || nullTest).toBeDefined();
    });

    it('should handle array manipulation edge cases', async () => {
      const sourceCode = `
        function findMax(numbers: number[]): number {
          return Math.max(...numbers);
        }
      `;

      const edgeCases = await service.generateEdgeCases(sourceCode, 'typescript');

      const emptyArrayTest = edgeCases.find(tc => tc.code.includes('[]'));
      expect(emptyArrayTest).toBeDefined();
    });
  });

  describe('generatePerformanceTests', () => {
    it('should generate performance test cases', async () => {
      const sourceCode = `
        function processLargeArray(data: number[]): number[] {
          return data.map(x => x * 2).filter(x => x > 100);
        }
      `;

      const performanceTests = await service.generatePerformanceTests(
        sourceCode,
        'typescript',
        { maxExecutionTime: 100, memoryLimit: 50 }
      );

      expect(performanceTests).toBeDefined();
      expect(performanceTests.length).toBeGreaterThan(0);
      expect(performanceTests[0].type).toBe(TestCaseType.PERFORMANCE);
      expect(performanceTests[0].code).toContain('performance');
    });

    it('should include memory usage tests', async () => {
      const sourceCode = `
        function createLargeObject(): any {
          const obj: any = {};
          for (let i = 0; i < 10000; i++) {
            obj[\`key\${i}\`] = new Array(100).fill(Math.random());
          }
          return obj;
        }
      `;

      const performanceTests = await service.generatePerformanceTests(
        sourceCode,
        'typescript',
        { memoryLimit: 100 }
      );

      const memoryTest = performanceTests.find(tc => 
        tc.code.includes('memory') || tc.code.includes('heap')
      );
      expect(memoryTest).toBeDefined();
    });
  });

  describe('generateSecurityTests', () => {
    it('should generate security test cases', async () => {
      const sourceCode = `
        function executeUserInput(input: string): string {
          return eval(input); // Dangerous!
        }
      `;

      const securityTests = await service.generateSecurityTests(sourceCode, 'typescript');

      expect(securityTests).toBeDefined();
      expect(securityTests.length).toBeGreaterThan(0);
      expect(securityTests[0].type).toBe(TestCaseType.SECURITY);
      
      const injectionTest = securityTests.find(tc => 
        tc.name.toLowerCase().includes('injection')
      );
      expect(injectionTest).toBeDefined();
    });

    it('should test input validation', async () => {
      const sourceCode = `
        function updateUser(userData: any): User {
          return database.update('users', userData);
        }
      `;

      const securityTests = await service.generateSecurityTests(sourceCode, 'typescript');

      const validationTest = securityTests.find(tc =>
        tc.name.toLowerCase().includes('validation')
      );
      expect(validationTest).toBeDefined();
    });
  });

  describe('generateRegressionTests', () => {
    it('should generate regression tests from bug reports', async () => {
      const bugReports = [
        {
          id: 'BUG-001',
          description: 'Function returns wrong value when input is negative',
          steps: ['Call function with -5', 'Expect positive result'],
          fixed: true
        }
      ];

      const regressionTests = await service.generateRegressionTests(bugReports);

      expect(regressionTests).toBeDefined();
      expect(regressionTests.length).toBeGreaterThan(0);
      expect(regressionTests[0].type).toBe(TestCaseType.REGRESSION);
      expect(regressionTests[0].tags).toContain('regression');
    });
  });

  describe('optimizeTestCases', () => {
    it('should remove duplicate test cases', async () => {
      const testCases = [
        {
          id: 'test-1',
          name: 'should add numbers',
          code: 'expect(add(2, 3)).toBe(5);',
          assertions: [{ type: AssertionType.EQUALITY, expected: 5, matcher: 'toBe' }]
        },
        {
          id: 'test-2', 
          name: 'should add two numbers',
          code: 'expect(add(2, 3)).toEqual(5);',
          assertions: [{ type: AssertionType.EQUALITY, expected: 5, matcher: 'toEqual' }]
        },
        {
          id: 'test-3',
          name: 'should handle zero',
          code: 'expect(add(0, 5)).toBe(5);',
          assertions: [{ type: AssertionType.EQUALITY, expected: 5, matcher: 'toBe' }]
        }
      ];

      const optimized = await service.optimizeTestCases(testCases as any);

      expect(optimized.length).toBeLessThan(testCases.length);
      expect(optimized.length).toBe(2); // Should merge similar tests
    });

    it('should prioritize high-value test cases', async () => {
      const testCases = [
        { id: 'test-1', priority: Priority.LOW, complexity: 1 },
        { id: 'test-2', priority: Priority.CRITICAL, complexity: 3 },
        { id: 'test-3', priority: Priority.MEDIUM, complexity: 2 }
      ];

      const optimized = await service.optimizeTestCases(testCases as any);

      expect(optimized[0].priority).toBe(Priority.CRITICAL);
    });
  });

  describe('generateTestData', () => {
    it('should generate realistic test data', async () => {
      const schema = {
        user: {
          id: 'uuid',
          name: 'string',
          email: 'email',
          age: 'number',
          isActive: 'boolean'
        }
      };

      const testData = await service.generateTestData(schema, 5);

      expect(testData).toHaveLength(5);
      expect(testData[0]).toHaveProperty('user');
      expect(testData[0].user).toHaveProperty('id');
      expect(testData[0].user).toHaveProperty('email');
      expect(testData[0].user.email).toMatch(/@/);
    });

    it('should generate edge case data', async () => {
      const schema = {
        value: 'number'
      };

      const testData = await service.generateTestData(schema, 10, { includeEdgeCases: true });

      const hasZero = testData.some(data => data.value === 0);
      const hasNegative = testData.some(data => data.value < 0);
      const hasLarge = testData.some(data => data.value > 1000);

      expect(hasZero || hasNegative || hasLarge).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle invalid source code', async () => {
      const request: TestGenerationRequest = {
        sourceCode: 'invalid syntax {{{',
        language: 'typescript',
        framework: TestFramework.JEST,
        testType: TestCaseType.UNIT
      };

      await expect(service.generateFromSourceCode(request))
        .rejects.toThrow('Unable to parse source code');
    });

    it('should handle unsupported language', async () => {
      const request: TestGenerationRequest = {
        sourceCode: 'print("hello")',
        language: 'cobol',
        framework: TestFramework.JEST,
        testType: TestCaseType.UNIT
      };

      await expect(service.generateFromSourceCode(request))
        .rejects.toThrow('Unsupported language: cobol');
    });

    it('should handle framework mismatch', async () => {
      const request: TestGenerationRequest = {
        sourceCode: 'function test() {}',
        language: 'javascript',
        framework: 'INVALID_FRAMEWORK' as TestFramework,
        testType: TestCaseType.UNIT
      };

      await expect(service.generateFromSourceCode(request))
        .rejects.toThrow('Unsupported test framework');
    });
  });

  describe('framework-specific generation', () => {
    it('should generate Jest-specific syntax', async () => {
      const request: TestGenerationRequest = {
        sourceCode: 'const add = (a, b) => a + b;',
        language: 'javascript',
        framework: TestFramework.JEST,
        testType: TestCaseType.UNIT
      };

      const result = await service.generateFromSourceCode(request);
      
      expect(result.testCases[0].code).toContain('describe(');
      expect(result.testCases[0].code).toContain('it(');
      expect(result.testCases[0].code).toContain('expect(');
    });

    it('should generate Mocha-specific syntax', async () => {
      const request: TestGenerationRequest = {
        sourceCode: 'const add = (a, b) => a + b;',
        language: 'javascript',
        framework: TestFramework.MOCHA,
        testType: TestCaseType.UNIT
      };

      const result = await service.generateFromSourceCode(request);
      
      expect(result.testCases[0].code).toContain('describe(');
      expect(result.testCases[0].code).toContain('it(');
      // Mocha might use different assertion library
    });

    it('should generate Playwright E2E tests', async () => {
      const request: TestGenerationRequest = {
        sourceCode: 'N/A', // E2E doesn't use source code
        language: 'typescript',
        framework: TestFramework.PLAYWRIGHT,
        testType: TestCaseType.E2E,
        requirements: ['User can login to the application']
      };

      const result = await service.generateFromSourceCode(request);
      
      expect(result.testCases[0].code).toContain('test(');
      expect(result.testCases[0].code).toContain('page.');
      expect(result.testCases[0].code).toContain('await');
    });
  });
});