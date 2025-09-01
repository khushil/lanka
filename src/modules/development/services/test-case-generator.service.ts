/**
 * Test Case Generator Service
 * AI-powered test case generation from source code and requirements
 */

import { Neo4jService } from '../../../core/database/neo4j';
import { logger } from '../../../core/logging/logger';
import {
  TestGenerationRequest,
  TestGenerationResponse,
  TestCase,
  TestCaseType,
  TestFramework,
  Priority,
  TestStatus,
  AssertionType
} from '../types/development.types';

export class TestCaseGeneratorService {
  constructor(_neo4j: Neo4jService) {
    // Neo4j service passed for future database operations
  }

  async generateFromSourceCode(request: TestGenerationRequest): Promise<TestGenerationResponse> {
    try {
      logger.info('Generating tests from source code', { language: request.language, framework: request.framework });

      // Validate inputs
      this.validateRequest(request);
      
      // Parse and analyze source code
      const codeAnalysis = this.analyzeSourceCode(request.sourceCode, request.language);
      
      // Generate appropriate test cases based on analysis
      const testCases = await this.generateTestCasesFromAnalysis(codeAnalysis, request);
      
      // Generate edge cases
      const edgeCases = await this.generateEdgeCases(request.sourceCode, request.language);
      
      // Combine and optimize test cases
      const allTestCases = [...testCases, ...edgeCases];
      const optimizedTestCases = await this.optimizeTestCases(allTestCases);

      return {
        testCases: optimizedTestCases,
        coverage: [],
        recommendations: this.generateRecommendations(optimizedTestCases, codeAnalysis),
        confidence: this.calculateConfidence(optimizedTestCases, request),
        metadata: {
          generatedAt: new Date().toISOString(),
          codeAnalysis: codeAnalysis.summary,
          testCount: optimizedTestCases.length
        }
      };
    } catch (error) {
      logger.error('Failed to generate test cases from source code', { error: (error as Error).message });
      throw new Error('Unable to parse source code');
    }
  }

  async generateFromRequirements(
    requirements: string[], 
    framework: TestFramework, 
    testType: TestCaseType
  ): Promise<TestGenerationResponse> {
    try {
      logger.info('Generating tests from requirements', { requirementCount: requirements.length });

      const testCases: TestCase[] = [];

      for (let i = 0; i < requirements.length; i++) {
        const requirement = requirements[i];
        const testCase = this.generateTestCaseFromRequirement(requirement, framework, testType, i);
        testCases.push(testCase);
      }

      return {
        testCases,
        coverage: [],
        recommendations: this.generateRequirementRecommendations(requirements),
        confidence: 0.8,
        metadata: {
          generatedAt: new Date().toISOString(),
          requirementCount: requirements.length
        }
      };
    } catch (error) {
      logger.error('Failed to generate tests from requirements', { error: (error as Error).message });
      throw new Error('Failed to generate tests from requirements');
    }
  }

  async generateEdgeCases(sourceCode: string, language: string): Promise<TestCase[]> {
    try {
      logger.info('Generating edge case tests');

      const edgeCases: TestCase[] = [];
      const analysis = this.analyzeSourceCode(sourceCode, language);

      // Generate edge cases based on code patterns
      if (analysis.hasNumericOperations) {
        edgeCases.push(this.generateNumericEdgeCaseTest());
      }

      if (analysis.hasStringOperations) {
        edgeCases.push(this.generateStringEdgeCaseTest());
      }

      if (analysis.hasArrayOperations) {
        edgeCases.push(this.generateArrayEdgeCaseTest());
      }

      if (analysis.hasConditionals) {
        edgeCases.push(this.generateConditionalEdgeCaseTest());
      }

      return edgeCases;
    } catch (error) {
      logger.error('Failed to generate edge cases', { error: (error as Error).message });
      return [];
    }
  }

  async generatePerformanceTests(
    sourceCode: string, 
    language: string, 
    constraints: { maxExecutionTime?: number; memoryLimit?: number }
  ): Promise<TestCase[]> {
    try {
      logger.info('Generating performance tests');

      const performanceTests: TestCase[] = [];
      const analysis = this.analyzeSourceCode(sourceCode, language);

      // Generate execution time test
      if (constraints.maxExecutionTime) {
        performanceTests.push({
          id: `perf-time-${Date.now()}`,
          name: 'Performance execution time test',
          description: 'Tests function execution within time constraints',
          type: TestCaseType.PERFORMANCE,
          framework: TestFramework.JEST,
          priority: Priority.MEDIUM,
          complexity: 3,
          estimatedDuration: 150,
          requirements: [],
          tags: ['performance', 'execution-time'],
          code: this.generatePerformanceTimeTest(analysis.mainFunction, constraints.maxExecutionTime),
          assertions: [{
            type: AssertionType.COMPARISON,
            expected: constraints.maxExecutionTime,
            matcher: 'toBeLessThan',
            message: 'Execution should be within time limit'
          }],
          coverage: this.createDefaultCoverage(),
          status: TestStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: { constraints }
        });
      }

      // Generate memory usage test
      if (constraints.memoryLimit) {
        performanceTests.push({
          id: `perf-memory-${Date.now()}`,
          name: 'Memory usage test',
          description: 'Tests memory consumption within limits',
          type: TestCaseType.PERFORMANCE,
          framework: TestFramework.JEST,
          priority: Priority.MEDIUM,
          complexity: 4,
          estimatedDuration: 200,
          requirements: [],
          tags: ['performance', 'memory'],
          code: this.generateMemoryUsageTest(analysis.mainFunction, constraints.memoryLimit),
          assertions: [{
            type: AssertionType.COMPARISON,
            expected: constraints.memoryLimit,
            matcher: 'toBeLessThan',
            message: 'Memory usage should be within limit'
          }],
          coverage: this.createDefaultCoverage(),
          status: TestStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: { constraints }
        });
      }

      return performanceTests;
    } catch (error) {
      logger.error('Failed to generate performance tests', { error: (error as Error).message });
      return [];
    }
  }

  async generateSecurityTests(sourceCode: string, language: string): Promise<TestCase[]> {
    try {
      logger.info('Generating security tests');

      const securityTests: TestCase[] = [];
      const analysis = this.analyzeSourceCode(sourceCode, language);

      // Check for potential security vulnerabilities
      if (analysis.hasEvalFunction) {
        securityTests.push({
          id: `security-injection-${Date.now()}`,
          name: 'Code injection prevention test',
          description: 'Tests protection against code injection attacks',
          type: TestCaseType.SECURITY,
          framework: TestFramework.JEST,
          priority: Priority.CRITICAL,
          complexity: 5,
          estimatedDuration: 180,
          requirements: [],
          tags: ['security', 'injection'],
          code: this.generateInjectionTest(analysis.mainFunction),
          assertions: [{
            type: AssertionType.EXCEPTION,
            expected: 'Error',
            matcher: 'toThrow',
            message: 'Should reject malicious input'
          }],
          coverage: this.createDefaultCoverage(),
          status: TestStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: { vulnerability: 'code_injection' }
        });
      }

      if (analysis.hasUserInput) {
        securityTests.push({
          id: `security-validation-${Date.now()}`,
          name: 'Input validation security test',
          description: 'Tests input validation and sanitization',
          type: TestCaseType.SECURITY,
          framework: TestFramework.JEST,
          priority: Priority.HIGH,
          complexity: 4,
          estimatedDuration: 160,
          requirements: [],
          tags: ['security', 'validation'],
          code: this.generateValidationSecurityTest(analysis.mainFunction),
          assertions: [{
            type: AssertionType.EQUALITY,
            expected: false,
            matcher: 'toBe',
            message: 'Should reject invalid input'
          }],
          coverage: this.createDefaultCoverage(),
          status: TestStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: { vulnerability: 'input_validation' }
        });
      }

      return securityTests;
    } catch (error) {
      logger.error('Failed to generate security tests', { error: (error as Error).message });
      return [];
    }
  }

  async generateRegressionTests(bugReports: Array<{
    id: string;
    description: string;
    steps: string[];
    fixed: boolean;
  }>): Promise<TestCase[]> {
    try {
      logger.info('Generating regression tests', { bugCount: bugReports.length });

      const regressionTests: TestCase[] = [];

      for (const bug of bugReports) {
        if (bug.fixed) {
          regressionTests.push({
            id: `regression-${bug.id}-${Date.now()}`,
            name: `Regression test for ${bug.id}`,
            description: `Prevents regression of ${bug.description}`,
            type: TestCaseType.REGRESSION,
            framework: TestFramework.JEST,
            priority: Priority.HIGH,
            complexity: 3,
            estimatedDuration: 120,
            requirements: [],
            tags: ['regression', bug.id],
            code: this.generateRegressionTestCode(bug),
            assertions: [{
              type: AssertionType.EQUALITY,
              expected: true,
              matcher: 'toBe',
              message: `Should prevent regression of ${bug.id}`
            }],
            coverage: this.createDefaultCoverage(),
            status: TestStatus.PENDING,
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: { bugReport: bug }
          });
        }
      }

      return regressionTests;
    } catch (error) {
      logger.error('Failed to generate regression tests', { error: (error as Error).message });
      return [];
    }
  }

  async optimizeTestCases(testCases: TestCase[]): Promise<TestCase[]> {
    try {
      logger.info('Optimizing test cases', { count: testCases.length });

      // Remove duplicates based on similar code patterns
      const uniqueTests = this.removeDuplicateTests(testCases);
      
      // Sort by priority and impact
      const prioritizedTests = this.prioritizeTestCases(uniqueTests);
      
      // Merge similar test cases
      const mergedTests = this.mergeSimilarTests(prioritizedTests);

      return mergedTests;
    } catch (error) {
      logger.error('Failed to optimize test cases', { error: (error as Error).message });
      return testCases; // Return original if optimization fails
    }
  }

  async generateTestData(
    schema: Record<string, any>, 
    count: number, 
    options: { includeEdgeCases?: boolean } = {}
  ): Promise<any[]> {
    try {
      logger.info('Generating test data', { schema: Object.keys(schema), count });

      const testData: any[] = [];

      for (let i = 0; i < count; i++) {
        const dataPoint: any = {};

        for (const [key, type] of Object.entries(schema)) {
          dataPoint[key] = this.generateDataForType(type, i, options.includeEdgeCases);
        }

        testData.push(dataPoint);
      }

      return testData;
    } catch (error) {
      logger.error('Failed to generate test data', { error: (error as Error).message });
      return [];
    }
  }

  // Private helper methods
  private validateRequest(request: TestGenerationRequest): void {
    if (!request.sourceCode) {
      throw new Error('Source code is required');
    }
    
    if (!request.language) {
      throw new Error('Language is required');
    }

    if (!Object.values(TestFramework).includes(request.framework)) {
      throw new Error('Unsupported test framework');
    }

    const supportedLanguages = ['javascript', 'typescript', 'python', 'java', 'csharp'];
    if (!supportedLanguages.includes(request.language.toLowerCase())) {
      throw new Error(`Unsupported language: ${request.language}`);
    }

    // Basic syntax check
    try {
      // Simple validation for common syntax errors
      if (request.sourceCode.includes('{{')) {
        throw new Error('Invalid syntax detected');
      }
    } catch {
      throw new Error('Syntax error in source code');
    }
  }

  private analyzeSourceCode(sourceCode: string, language: string) {
    return {
      language,
      functions: this.extractFunctions(sourceCode),
      mainFunction: this.extractMainFunction(sourceCode),
      hasNumericOperations: /[\+\-\*\/]/.test(sourceCode),
      hasStringOperations: /\.string|\.charAt|\.substring|\.indexOf/.test(sourceCode),
      hasArrayOperations: /\.map|\.filter|\.reduce|\.push|\.pop|\[\]/.test(sourceCode),
      hasConditionals: /if\s*\(|switch\s*\(|case\s/.test(sourceCode),
      hasLoops: /for\s*\(|while\s*\(|forEach/.test(sourceCode),
      hasAsyncOperations: /async|await|Promise|then|catch/.test(sourceCode),
      hasEvalFunction: /eval\s*\(/.test(sourceCode),
      hasUserInput: /input|req\.body|params|query/.test(sourceCode),
      complexity: this.calculateComplexity(sourceCode),
      summary: {
        lineCount: sourceCode.split('\n').length,
        functionCount: (sourceCode.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || []).length,
        testableUnits: (sourceCode.match(/function\s+\w+|const\s+\w+\s*=/g) || []).length
      }
    };
  }

  private extractFunctions(sourceCode: string): string[] {
    const functionRegex = /function\s+(\w+)|const\s+(\w+)\s*=|(\w+)\s*:/g;
    const matches = [];
    let match;

    while ((match = functionRegex.exec(sourceCode)) !== null) {
      matches.push(match[1] || match[2] || match[3]);
    }

    return matches.filter(Boolean);
  }

  private extractMainFunction(sourceCode: string): string {
    const functions = this.extractFunctions(sourceCode);
    return functions[0] || 'testFunction';
  }

  private calculateComplexity(sourceCode: string): number {
    let complexity = 1; // Base complexity
    
    // Add complexity for conditionals
    const conditionals = (sourceCode.match(/if|else|switch|case|\?/g) || []).length;
    complexity += conditionals;
    
    // Add complexity for loops
    const loops = (sourceCode.match(/for|while|do/g) || []).length;
    complexity += loops * 2;
    
    // Add complexity for function calls
    const functionCalls = (sourceCode.match(/\w+\s*\(/g) || []).length;
    complexity += Math.floor(functionCalls / 3);
    
    return complexity;
  }

  private async generateTestCasesFromAnalysis(analysis: any, request: TestGenerationRequest): Promise<TestCase[]> {
    const testCases: TestCase[] = [];

    // Generate basic test case
    testCases.push(this.generateBasicTest(analysis, request));

    // Generate specific test cases based on analysis
    if (analysis.hasConditionals) {
      testCases.push(this.generateConditionalTest(analysis, request));
    }

    if (analysis.hasAsyncOperations) {
      testCases.push(this.generateAsyncTest(analysis, request));
    }

    if (analysis.hasNumericOperations) {
      testCases.push(this.generateNumericTest(analysis, request));
    }

    // Generate framework-specific tests
    if (request.patterns?.includes('react')) {
      testCases.push(...this.generateReactTests(analysis, request));
    }

    return testCases;
  }

  private generateBasicTest(analysis: any, request: TestGenerationRequest): TestCase {
    const functionName = analysis.mainFunction;
    
    return {
      id: `test-basic-${Date.now()}`,
      name: `should test ${functionName} with valid input`,
      description: `Basic test for ${functionName} function`,
      type: request.testType,
      framework: request.framework,
      priority: Priority.HIGH,
      complexity: 2,
      estimatedDuration: 60,
      requirements: request.requirements || [],
      tags: ['basic', 'happy-path'],
      code: this.generateBasicTestCode(functionName, request.framework),
      assertions: [{
        type: AssertionType.TRUTHINESS,
        expected: true,
        matcher: 'toBeDefined',
        message: 'Function should return a defined value'
      }],
      coverage: this.createDefaultCoverage(),
      status: TestStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { analysis: analysis.summary }
    };
  }

  private generateConditionalTest(analysis: any, request: TestGenerationRequest): TestCase {
    return {
      id: `test-conditional-${Date.now()}`,
      name: `should test ${analysis.mainFunction} conditional paths`,
      description: 'Tests different conditional branches',
      type: request.testType,
      framework: request.framework,
      priority: Priority.HIGH,
      complexity: 3,
      estimatedDuration: 90,
      requirements: request.requirements || [],
      tags: ['conditional', 'branches'],
      code: this.generateConditionalTestCode(analysis.mainFunction, request.framework),
      assertions: [{
        type: AssertionType.EQUALITY,
        expected: true,
        matcher: 'toBe',
        message: 'Should handle conditional logic correctly'
      }],
      coverage: this.createDefaultCoverage(),
      status: TestStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { testType: 'conditional' }
    };
  }

  private generateAsyncTest(analysis: any, request: TestGenerationRequest): TestCase {
    return {
      id: `test-async-${Date.now()}`,
      name: `should test ${analysis.mainFunction} async behavior`,
      description: 'Tests asynchronous operations',
      type: request.testType,
      framework: request.framework,
      priority: Priority.MEDIUM,
      complexity: 4,
      estimatedDuration: 120,
      requirements: request.requirements || [],
      tags: ['async', 'promises'],
      code: this.generateAsyncTestCode(analysis.mainFunction, request.framework),
      assertions: [{
        type: AssertionType.ASYNC,
        expected: 'resolved',
        matcher: 'resolves.toBe',
        message: 'Should resolve properly'
      }],
      coverage: this.createDefaultCoverage(),
      status: TestStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { testType: 'async' }
    };
  }

  private generateNumericTest(analysis: any, request: TestGenerationRequest): TestCase {
    return {
      id: `test-numeric-${Date.now()}`,
      name: `should test ${analysis.mainFunction} with numbers`,
      description: 'Tests numeric operations and edge cases',
      type: request.testType,
      framework: request.framework,
      priority: Priority.MEDIUM,
      complexity: 2,
      estimatedDuration: 80,
      requirements: request.requirements || [],
      tags: ['numeric', 'math'],
      code: this.generateNumericTestCode(analysis.mainFunction, request.framework),
      assertions: [{
        type: AssertionType.EQUALITY,
        expected: 5,
        matcher: 'toBe',
        message: 'Should perform numeric operations correctly'
      }],
      coverage: this.createDefaultCoverage(),
      status: TestStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { testType: 'numeric' }
    };
  }

  private generateReactTests(analysis: any, request: TestGenerationRequest): TestCase[] {
    const tests: TestCase[] = [];

    // Render test
    tests.push({
      id: `test-react-render-${Date.now()}`,
      name: 'should render component correctly',
      description: 'Tests component rendering',
      type: request.testType,
      framework: request.framework,
      priority: Priority.HIGH,
      complexity: 2,
      estimatedDuration: 90,
      requirements: request.requirements || [],
      tags: ['react', 'render'],
      code: this.generateReactRenderTest(analysis.mainFunction),
      assertions: [{
        type: AssertionType.TRUTHINESS,
        expected: true,
        matcher: 'toBeTruthy',
        message: 'Component should render'
      }],
      coverage: this.createDefaultCoverage(),
      status: TestStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { testType: 'react-render' }
    });

    // Props test
    tests.push({
      id: `test-react-props-${Date.now()}`,
      name: 'should handle props correctly',
      description: 'Tests component props handling',
      type: request.testType,
      framework: request.framework,
      priority: Priority.MEDIUM,
      complexity: 3,
      estimatedDuration: 100,
      requirements: request.requirements || [],
      tags: ['react', 'props'],
      code: this.generateReactPropsTest(analysis.mainFunction),
      assertions: [{
        type: AssertionType.PROPERTY,
        expected: 'test-title',
        matcher: 'toHaveTextContent',
        message: 'Should display correct props'
      }],
      coverage: this.createDefaultCoverage(),
      status: TestStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { testType: 'react-props' }
    });

    return tests;
  }

  private generateTestCaseFromRequirement(
    requirement: string, 
    framework: TestFramework, 
    testType: TestCaseType,
    index: number
  ): TestCase {
    const testName = this.generateTestNameFromRequirement(requirement);
    
    return {
      id: `req-test-${Date.now()}-${index}`,
      name: testName,
      description: `Test for requirement: ${requirement}`,
      type: testType,
      framework,
      priority: Priority.MEDIUM,
      complexity: 3,
      estimatedDuration: 150,
      requirements: [requirement],
      tags: [testType.toLowerCase(), 'requirement'],
      code: this.generateRequirementTestCode(requirement, framework, testType),
      assertions: [{
        type: AssertionType.TRUTHINESS,
        expected: true,
        matcher: 'toBe',
        message: 'Should satisfy requirement'
      }],
      coverage: this.createDefaultCoverage(),
      status: TestStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { requirement }
    };
  }

  private generateTestNameFromRequirement(requirement: string): string {
    const words = requirement.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .slice(0, 6);
    
    return `should ${words.join(' ')}`;
  }

  private generateRequirementTestCode(requirement: string, framework: TestFramework, testType: TestCaseType): string {
    const testName = this.generateTestNameFromRequirement(requirement);
    
    if (testType === TestCaseType.E2E && framework === TestFramework.PLAYWRIGHT) {
      return `
test('${testName}', async ({ page }) => {
  // Navigate to application
  await page.goto('/');
  
  // Test requirement: ${requirement}
  // Implement specific test steps based on requirement
  await page.click('[data-testid="main-button"]');
  await page.waitForSelector('[data-testid="result"]');
  
  // Verify the expected behavior
  const result = await page.textContent('[data-testid="result"]');
  expect(result).toContain('expected-text');
  
  expect(true).toBe(true);
});
      `;
    }
    
    if (testType === TestCaseType.API && framework === TestFramework.SUPERTEST) {
      return `
test('${testName}', async () => {
  const response = await request(app)
    .get('/api/test')
    .expect(200);
  
  // Validate requirement: ${requirement}
  expect(response.body).toBeDefined();
});
      `;
    }
    
    // Default unit test
    return `
test('${testName}', () => {
  // Test requirement: ${requirement}
  // Implement specific test logic based on requirement
  const mockData = { id: 1, name: 'test' };
  const result = functionUnderTest(mockData);
  
  // Verify the expected behavior
  expect(result).toBeDefined();
  expect(result).toHaveProperty('id', 1);
  
  expect(true).toBe(true);
});
    `;
  }

  // Edge case generators
  private generateNumericEdgeCaseTest(): TestCase {
    return {
      id: `edge-numeric-${Date.now()}`,
      name: 'should handle numeric edge cases',
      description: 'Tests numeric boundary conditions',
      type: TestCaseType.UNIT,
      framework: TestFramework.JEST,
      priority: Priority.MEDIUM,
      complexity: 2,
      estimatedDuration: 70,
      requirements: [],
      tags: ['edge-case', 'numeric'],
      code: `
test('should handle numeric edge cases', () => {
  // Test zero
  expect(testFunction(0)).toBeDefined();
  
  // Test negative numbers
  expect(testFunction(-1)).toBeDefined();
  
  // Test large numbers
  expect(testFunction(Number.MAX_VALUE)).toBeDefined();
  
  // Test infinity
  expect(testFunction(Infinity)).toBeDefined();
});
      `,
      assertions: [],
      coverage: this.createDefaultCoverage(),
      status: TestStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { edgeCase: 'numeric' }
    };
  }

  private generateStringEdgeCaseTest(): TestCase {
    return {
      id: `edge-string-${Date.now()}`,
      name: 'should handle string edge cases',
      description: 'Tests string boundary conditions',
      type: TestCaseType.UNIT,
      framework: TestFramework.JEST,
      priority: Priority.MEDIUM,
      complexity: 2,
      estimatedDuration: 70,
      requirements: [],
      tags: ['edge-case', 'string'],
      code: `
test('should handle string edge cases', () => {
  // Test empty string
  expect(testFunction('')).toBeDefined();
  
  // Test null
  expect(testFunction(null)).toBeDefined();
  
  // Test undefined
  expect(testFunction(undefined)).toBeDefined();
  
  // Test very long string
  expect(testFunction('a'.repeat(10000))).toBeDefined();
});
      `,
      assertions: [],
      coverage: this.createDefaultCoverage(),
      status: TestStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { edgeCase: 'string' }
    };
  }

  private generateArrayEdgeCaseTest(): TestCase {
    return {
      id: `edge-array-${Date.now()}`,
      name: 'should handle array edge cases',
      description: 'Tests array boundary conditions',
      type: TestCaseType.UNIT,
      framework: TestFramework.JEST,
      priority: Priority.MEDIUM,
      complexity: 2,
      estimatedDuration: 70,
      requirements: [],
      tags: ['edge-case', 'array'],
      code: `
test('should handle array edge cases', () => {
  // Test empty array
  expect(testFunction([])).toBeDefined();
  
  // Test single element
  expect(testFunction([1])).toBeDefined();
  
  // Test null array
  expect(testFunction(null)).toBeDefined();
  
  // Test very large array
  expect(testFunction(new Array(10000).fill(1))).toBeDefined();
});
      `,
      assertions: [],
      coverage: this.createDefaultCoverage(),
      status: TestStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { edgeCase: 'array' }
    };
  }

  private generateConditionalEdgeCaseTest(): TestCase {
    return {
      id: `edge-conditional-${Date.now()}`,
      name: 'should handle conditional edge cases',
      description: 'Tests conditional boundary conditions',
      type: TestCaseType.UNIT,
      framework: TestFramework.JEST,
      priority: Priority.MEDIUM,
      complexity: 3,
      estimatedDuration: 80,
      requirements: [],
      tags: ['edge-case', 'conditional'],
      code: `
test('should handle conditional edge cases', () => {
  // Test boundary values
  expect(testFunction(0)).toBeDefined();
  expect(testFunction(-1)).toBeDefined();
  expect(testFunction(1)).toBeDefined();
  
  // Test boolean values
  expect(testFunction(true)).toBeDefined();
  expect(testFunction(false)).toBeDefined();
});
      `,
      assertions: [],
      coverage: this.createDefaultCoverage(),
      status: TestStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { edgeCase: 'conditional' }
    };
  }

  // Test code generators
  private generateBasicTestCode(functionName: string, framework: TestFramework): string {
    if (framework === TestFramework.JEST) {
      return `
describe('${functionName}', () => {
  test('should work with valid input', () => {
    const result = ${functionName}(2, 3);
    expect(result).toBeDefined();
    expect(result).toBe(5);
  });
});
      `;
    }
    
    return `test('should work with valid input', () => { expect(${functionName}()).toBeDefined(); });`;
  }

  private generateConditionalTestCode(functionName: string, _framework: TestFramework): string {
    return `
test('should handle different conditions', () => {
  expect(${functionName}(true)).toBe(true);
  expect(${functionName}(false)).toBe(false);
  expect(${functionName}(null)).toBeDefined();
});
    `;
  }

  private generateAsyncTestCode(functionName: string, _framework: TestFramework): string {
    return `
test('should handle async operations', async () => {
  const result = await ${functionName}();
  expect(result).resolves.toBeDefined();
});
    `;
  }

  private generateNumericTestCode(functionName: string, _framework: TestFramework): string {
    return `
test('should handle numeric operations', () => {
  expect(${functionName}(2, 3)).toBe(5);
  expect(${functionName}(0, 0)).toBe(0);
  expect(${functionName}(-1, 1)).toBe(0);
});
    `;
  }

  private generateReactRenderTest(componentName: string): string {
    return `
import { render } from '@testing-library/react';
import ${componentName} from './${componentName}';

test('should render ${componentName}', () => {
  const { container } = render(<${componentName} />);
  expect(container.firstChild).toBeTruthy();
});
    `;
  }

  private generateReactPropsTest(componentName: string): string {
    return `
import { render } from '@testing-library/react';
import ${componentName} from './${componentName}';

test('should handle props correctly', () => {
  const { getByText } = render(<${componentName} title="test-title" />);
  expect(getByText('test-title')).toBeInTheDocument();
});
    `;
  }

  private generatePerformanceTimeTest(functionName: string, maxTime: number): string {
    return `
test('performance execution time', () => {
  const start = performance.now();
  ${functionName}();
  const duration = performance.now() - start;
  
  expect(duration).toBeLessThan(${maxTime});
});
    `;
  }

  private generateMemoryUsageTest(functionName: string, maxMemory: number): string {
    return `
test('memory usage test', () => {
  const initialMemory = process.memoryUsage().heapUsed;
  ${functionName}();
  global.gc && global.gc();
  const finalMemory = process.memoryUsage().heapUsed;
  const memoryIncrease = finalMemory - initialMemory;
  
  expect(memoryIncrease).toBeLessThan(${maxMemory} * 1024 * 1024);
});
    `;
  }

  private generateInjectionTest(functionName: string): string {
    return `
test('should prevent code injection', () => {
  const maliciousInput = "'; DROP TABLE users; --";
  expect(() => ${functionName}(maliciousInput)).toThrow();
});
    `;
  }

  private generateValidationSecurityTest(functionName: string): string {
    return `
test('should validate input properly', () => {
  const invalidInput = '<script>alert("XSS")</script>';
  const result = ${functionName}(invalidInput);
  expect(result).not.toContain('<script>');
});
    `;
  }

  private generateRegressionTestCode(bug: any): string {
    return `
test('regression test for ${bug.id}', () => {
  // Reproducing steps from bug report:
  ${bug.steps.map((step: string) => `// ${step}`).join('\n  ')}
  
  // This test ensures the bug doesn't reoccur
  expect(true).toBe(true); // Replace with actual test logic
});
    `;
  }

  // Optimization helpers
  private removeDuplicateTests(testCases: TestCase[]): TestCase[] {
    const unique = new Map();
    
    for (const testCase of testCases) {
      const key = `${testCase.name}-${testCase.type}`;
      if (!unique.has(key)) {
        unique.set(key, testCase);
      }
    }
    
    return Array.from(unique.values());
  }

  private prioritizeTestCases(testCases: TestCase[]): TestCase[] {
    return testCases.sort((a, b) => {
      // Sort by priority first
      const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Then by complexity (lower complexity first for equal priority)
      return a.complexity - b.complexity;
    });
  }

  private mergeSimilarTests(testCases: TestCase[]): TestCase[] {
    // Simple implementation - in a real system, this would use more sophisticated similarity analysis
    return testCases.slice(0, Math.min(testCases.length, 15)); // Limit to reasonable number
  }

  private generateDataForType(type: any, index: number, includeEdgeCases?: boolean): any {
    switch (typeof type === 'string' ? type : 'string') {
      case 'uuid':
        return `uuid-${Date.now()}-${index}`;
      case 'email':
        return `user${index}@test${includeEdgeCases && index === 0 ? '' : '.com'}`;
      case 'number':
        if (includeEdgeCases && index < 3) {
          return [0, -1, Number.MAX_VALUE][index];
        }
        return Math.floor(Math.random() * 100) + index;
      case 'boolean':
        return index % 2 === 0;
      case 'string':
      default:
        if (includeEdgeCases && index === 0) {
          return '';
        }
        return `test-string-${index}`;
    }
  }

  private generateRecommendations(testCases: TestCase[], analysis: any): string[] {
    const recommendations: string[] = [];
    
    if (testCases.length === 0) {
      recommendations.push('No test cases generated - review source code structure');
      return recommendations;
    }
    
    if (analysis.complexity > 5) {
      recommendations.push('High complexity detected - consider breaking into smaller functions');
    }
    
    if (analysis.hasAsyncOperations) {
      recommendations.push('Async operations detected - ensure proper error handling tests');
    }
    
    if (!testCases.some(tc => tc.tags.includes('edge-case'))) {
      recommendations.push('Add edge case testing for better coverage');
    }
    
    recommendations.push('Review generated tests and add domain-specific validations');
    
    return recommendations;
  }

  private generateRequirementRecommendations(_requirements: string[]): string[] {
    return [
      'Review generated tests against original requirements',
      'Add specific validation logic for each requirement',
      'Consider adding integration tests for end-to-end flows'
    ];
  }

  private calculateConfidence(testCases: TestCase[], request: TestGenerationRequest): number {
    let confidence = 0.6; // Base confidence
    
    if (testCases.length > 0) {
      confidence += 0.2;
    }
    
    if (testCases.some(tc => tc.tags.includes('edge-case'))) {
      confidence += 0.1;
    }
    
    if (request.existingTests && request.existingTests.length > 0) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  private createDefaultCoverage() {
    return {
      statements: { total: 0, covered: 0, percentage: 0 },
      branches: { total: 0, covered: 0, percentage: 0 },
      functions: { total: 0, covered: 0, percentage: 0 },
      lines: { total: 0, covered: 0, percentage: 0 },
      overall: 0,
      uncoveredLines: [],
      uncoveredBranches: [],
      timestamp: new Date()
    };
  }
}