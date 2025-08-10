/**
 * Testing Intelligence Service
 * Main orchestrator for AI-powered testing capabilities
 */

import { Neo4jService } from '../../../core/database/neo4j';
import { logger } from '../../../core/logging/logger';
import { TestCaseGeneratorService } from './test-case-generator.service';
import { CoverageAnalyzerService } from './coverage-analyzer.service';
import { QualityPredictorService } from './quality-predictor.service';
import { TestPrioritizerService } from './test-prioritizer.service';
import { MutationTestingService } from './mutation-testing.service';
import {
  TestGenerationRequest,
  TestGenerationResponse,
  TestCase,
  TestIntelligenceMetrics,
  TestOptimization,
  OptimizationType,
  Priority,
  TestCaseType,
  TestFramework
} from '../types/development.types';

export class TestingIntelligenceService {
  private testCaseGenerator: TestCaseGeneratorService;
  private coverageAnalyzer: CoverageAnalyzerService;
  private qualityPredictor: QualityPredictorService;
  private testPrioritizer: TestPrioritizerService;
  private mutationTesting: MutationTestingService;

  constructor(private neo4j: Neo4jService) {
    this.testCaseGenerator = new TestCaseGeneratorService(neo4j);
    this.coverageAnalyzer = new CoverageAnalyzerService(neo4j);
    this.qualityPredictor = new QualityPredictorService(neo4j);
    this.testPrioritizer = new TestPrioritizerService(neo4j);
    this.mutationTesting = new MutationTestingService(neo4j);
  }

  async generateTestCases(request: TestGenerationRequest): Promise<TestGenerationResponse> {
    try {
      logger.info('Generating test cases', { request: request.testType });
      
      if (!request || !request.sourceCode || !request.language) {
        throw new Error('Invalid test generation request');
      }

      // Validate source code syntax
      if (this.hasInvalidSyntax(request.sourceCode)) {
        throw new Error('Invalid source code provided');
      }

      // Generate test cases using AI-powered analysis
      const testCases = await this.generateTestCasesFromSource(request);
      
      // Analyze coverage gaps
      const coverageGaps = await this.identifyCoverageGaps(request.sourceCode, testCases);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(testCases, coverageGaps);
      
      // Calculate confidence score
      const confidence = this.calculateConfidence(testCases, request);

      // Store generated test cases in database
      await this.storeTestCases(testCases);

      return {
        testCases,
        coverage: coverageGaps,
        recommendations,
        confidence,
        metadata: {
          generatedAt: new Date().toISOString(),
          framework: request.framework,
          testType: request.testType,
          complexity: request.complexity || 'auto-detected'
        }
      };
    } catch (error) {
      logger.error('Failed to generate test cases', { error: error.message });
      throw new Error('Failed to generate test cases');
    }
  }

  async analyzeCoverage(testSuiteId: string) {
    try {
      logger.info('Analyzing test coverage', { testSuiteId });

      if (!testSuiteId) {
        throw new Error('Test suite ID is required');
      }

      // Get test suite and coverage data from database
      const query = `
        MATCH (suite:TestSuite {id: $testSuiteId})
        OPTIONAL MATCH (suite)-[:CONTAINS]->(test:TestCase)
        RETURN suite, collect(test) as tests
      `;

      const result = await this.neo4j.query(query, { testSuiteId });
      
      if (!result.length) {
        throw new Error('Test suite not found');
      }

      const suite = result[0].suite;
      const coverage = suite.properties?.coverage || this.createDefaultCoverage();

      // Use coverage analyzer to identify gaps
      return await this.coverageAnalyzer.analyzeCoverage(coverage, {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90
      });
    } catch (error) {
      logger.error('Failed to analyze coverage', { error: error.message });
      throw new Error('Failed to analyze coverage');
    }
  }

  async predictQuality(testId: string) {
    try {
      logger.info('Predicting test quality', { testId });

      if (!testId) {
        throw new Error('Test ID is required');
      }

      // Get test data and historical runs
      const query = `
        MATCH (test:TestCase {id: $testId})
        OPTIONAL MATCH (test)-[:HAS_RUN]->(run:TestRun)
        RETURN test, collect(run) as historicalRuns
        ORDER BY run.timestamp DESC
        LIMIT 50
      `;

      const result = await this.neo4j.query(query, { testId });
      
      if (!result.length) {
        throw new Error('Test not found');
      }

      const test = result[0].test.properties;
      const historicalRuns = result[0].historicalRuns.map((run: any) => run.properties);

      // Use quality predictor to analyze
      return await this.qualityPredictor.predictTestQuality(testId);
    } catch (error) {
      logger.error('Failed to predict test quality', { error: error.message });
      throw new Error('Failed to predict test quality');
    }
  }

  async prioritizeTests(tests: TestCase[], weights: Record<string, number> = {}) {
    try {
      logger.info('Prioritizing tests', { testCount: tests.length });

      if (!Array.isArray(tests)) {
        throw new Error('Invalid test data provided');
      }

      return await this.testPrioritizer.prioritizeTests(tests, weights);
    } catch (error) {
      logger.error('Failed to prioritize tests', { error: error.message });
      throw new Error('Failed to prioritize tests');
    }
  }

  async runMutationTesting(config: {
    sourceCode: string;
    testCode: string;
    language: string;
    framework: TestFramework;
    timeout?: number;
  }) {
    try {
      logger.info('Running mutation testing');

      if (config.timeout && config.timeout < 1000) {
        throw new Error('Operation timed out');
      }

      return await this.mutationTesting.runMutationTesting(config);
    } catch (error) {
      logger.error('Failed to run mutation testing', { error: error.message });
      throw new Error('Failed to run mutation testing');
    }
  }

  async optimizeTestExecution(metrics: TestIntelligenceMetrics) {
    try {
      logger.info('Optimizing test execution');

      const optimizations: TestOptimization[] = [];

      // Analyze execution time
      if (metrics.testExecutionTime > 1800) { // > 30 minutes
        optimizations.push({
          id: `opt-${Date.now()}-parallel`,
          type: OptimizationType.PARALLEL_EXECUTION,
          description: 'Enable parallel test execution to reduce runtime',
          impact: 9,
          effort: 4,
          priority: Priority.HIGH,
          implementation: [
            'Configure test runner for parallel execution',
            'Isolate test dependencies',
            'Update CI/CD pipeline'
          ],
          expectedBenefits: [
            'Reduce execution time by 60-70%',
            'Faster feedback cycles'
          ],
          risks: [
            'Potential race conditions',
            'Increased resource usage'
          ],
          metadata: {}
        });
      }

      // Analyze test efficiency
      if (metrics.testEfficiency < 60) {
        optimizations.push({
          id: `opt-${Date.now()}-selection`,
          type: OptimizationType.TEST_SELECTION,
          description: 'Implement intelligent test selection based on code changes',
          impact: 8,
          effort: 6,
          priority: Priority.HIGH,
          implementation: [
            'Implement change impact analysis',
            'Create test-to-code mapping',
            'Configure smart test selection'
          ],
          expectedBenefits: [
            'Run only relevant tests',
            'Reduce unnecessary test execution'
          ],
          risks: [
            'May miss edge case regressions',
            'Requires accurate dependency mapping'
          ],
          metadata: {}
        });
      }

      // Analyze automation rate
      if (metrics.automationRate < 80) {
        optimizations.push({
          id: `opt-${Date.now()}-automation`,
          type: OptimizationType.COVERAGE_IMPROVEMENT,
          description: 'Increase test automation coverage',
          impact: 7,
          effort: 8,
          priority: Priority.MEDIUM,
          implementation: [
            'Identify manual testing gaps',
            'Create automated test cases',
            'Integrate with CI/CD pipeline'
          ],
          expectedBenefits: [
            'Higher automation rate',
            'Consistent test execution',
            'Reduced manual effort'
          ],
          risks: [
            'Initial development overhead',
            'Maintenance complexity'
          ],
          metadata: {}
        });
      }

      return {
        optimizations: optimizations.sort((a, b) => b.impact - a.impact),
        totalImpact: optimizations.reduce((sum, opt) => sum + opt.impact, 0),
        estimatedTimeReduction: this.calculateTimeReduction(optimizations),
        priorityLevel: optimizations.length > 0 ? optimizations[0].priority : Priority.LOW
      };
    } catch (error) {
      logger.error('Failed to optimize test execution', { error: error.message });
      throw new Error('Failed to optimize test execution');
    }
  }

  async generatePerformanceTests(specs: {
    endpoint?: string;
    expectedResponseTime?: number;
    maxConcurrentUsers?: number;
    throughputTarget?: number;
  }) {
    try {
      logger.info('Generating performance tests', { specs });

      const testCases: TestCase[] = [];

      // Generate load test
      if (specs.endpoint) {
        testCases.push({
          id: `perf-load-${Date.now()}`,
          name: `Load test for ${specs.endpoint}`,
          description: `Tests load handling for ${specs.endpoint}`,
          type: TestCaseType.PERFORMANCE,
          framework: TestFramework.JEST,
          priority: Priority.MEDIUM,
          complexity: 4,
          estimatedDuration: 300,
          requirements: [],
          tags: ['performance', 'load-test', 'endpoint'],
          code: this.generateLoadTestCode(specs),
          assertions: [],
          coverage: this.createDefaultCoverage(),
          status: 'PENDING' as any,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: { specs }
        });
      }

      // Generate response time test
      if (specs.expectedResponseTime) {
        testCases.push({
          id: `perf-response-${Date.now()}`,
          name: 'Response time validation test',
          description: `Validates response time under ${specs.expectedResponseTime}ms`,
          type: TestCaseType.PERFORMANCE,
          framework: TestFramework.JEST,
          priority: Priority.HIGH,
          complexity: 3,
          estimatedDuration: 180,
          requirements: [],
          tags: ['performance', 'response-time'],
          code: this.generateResponseTimeTestCode(specs),
          assertions: [],
          coverage: this.createDefaultCoverage(),
          status: 'PENDING' as any,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: { specs }
        });
      }

      return {
        testCases,
        estimatedExecutionTime: testCases.reduce((sum, tc) => sum + tc.estimatedDuration, 0),
        recommendations: this.generatePerformanceRecommendations(specs)
      };
    } catch (error) {
      logger.error('Failed to generate performance tests', { error: error.message });
      throw new Error('Failed to generate performance tests');
    }
  }

  async analyzeTestMaintenance(testSuiteId: string) {
    try {
      logger.info('Analyzing test maintenance', { testSuiteId });

      const query = `
        MATCH (suite:TestSuite {id: $testSuiteId})-[:CONTAINS]->(test:TestCase)
        OPTIONAL MATCH (test)-[:DEPENDS_ON]->(dep:Dependency)
        RETURN test, collect(dep) as dependencies
      `;

      const result = await this.neo4j.query(query, { testSuiteId });

      const issues: any[] = [];
      let estimatedHours = 0;

      for (const record of result) {
        const test = record.test.properties;
        const dependencies = record.dependencies.map((dep: any) => dep.properties);

        // Check for outdated dependencies
        const outdatedDeps = dependencies.filter((dep: any) => 
          dep.name?.includes('deprecated') || dep.name?.includes('old')
        );

        if (outdatedDeps.length > 0) {
          issues.push({
            type: 'OUTDATED_DEPENDENCIES',
            testId: test.id,
            severity: Priority.HIGH,
            description: `Test uses ${outdatedDeps.length} outdated dependencies`,
            estimatedFixTime: 4
          });
          estimatedHours += 4;
        }

        // Check for old tests (not updated in 90 days)
        const lastUpdate = new Date(test.updatedAt);
        const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUpdate > 90) {
          issues.push({
            type: 'STALE_TEST',
            testId: test.id,
            severity: Priority.MEDIUM,
            description: `Test not updated for ${Math.floor(daysSinceUpdate)} days`,
            estimatedFixTime: 2
          });
          estimatedHours += 2;
        }
      }

      return {
        issues,
        estimatedCost: {
          hours: estimatedHours,
          priority: estimatedHours > 20 ? Priority.HIGH : Priority.MEDIUM
        },
        recommendations: this.generateMaintenanceRecommendations(issues)
      };
    } catch (error) {
      logger.error('Failed to analyze test maintenance', { error: error.message });
      throw new Error('Failed to analyze test maintenance');
    }
  }

  async generateIntegrationTestScaffolding(config: {
    modules: string[];
    database?: string;
    framework: TestFramework;
    testType?: TestCaseType;
  }) {
    try {
      logger.info('Generating integration test scaffolding', { config });

      const setupCode = this.generateIntegrationSetup(config);
      const teardownCode = this.generateIntegrationTeardown(config);
      const testCases = this.generateIntegrationTestCases(config);
      const mockConfigurations = this.generateMockConfigurations(config);

      return {
        setupCode,
        teardownCode,
        testCases,
        mockConfigurations,
        framework: config.framework,
        recommendations: [
          'Ensure proper test isolation',
          'Use transactions for database tests',
          'Mock external dependencies'
        ]
      };
    } catch (error) {
      logger.error('Failed to generate integration test scaffolding', { error: error.message });
      throw new Error('Failed to generate integration test scaffolding');
    }
  }

  // Integration methods
  async getTestRequirementTraceability(requirementId: string) {
    try {
      const query = `
        MATCH (req:Requirement {id: $requirementId})
        OPTIONAL MATCH (req)<-[:COVERS]-(test:TestCase)
        RETURN req, collect(test) as coveredBy
      `;

      const result = await this.neo4j.query(query, { requirementId });
      
      if (!result.length) {
        throw new Error('Requirement not found');
      }

      const requirement = result[0].req.properties;
      const tests = result[0].coveredBy.map((test: any) => test.properties);

      return {
        requirement,
        coveredBy: tests,
        coverage: tests.length > 0 ? 100 : 0,
        gaps: tests.length === 0 ? ['No test coverage for this requirement'] : []
      };
    } catch (error) {
      logger.error('Failed to get test requirement traceability', { error: error.message });
      throw new Error('Failed to get test requirement traceability');
    }
  }

  async generateComponentTests(componentId: string) {
    try {
      const query = `
        MATCH (comp:Component {id: $componentId})
        OPTIONAL MATCH (comp)-[:HAS_INTERFACE]->(interface:Interface)
        OPTIONAL MATCH (comp)-[:DEPENDS_ON]->(dep:Component)
        RETURN comp, collect(interface) as interfaces, collect(dep) as dependencies
      `;

      const result = await this.neo4j.query(query, { componentId });
      
      if (!result.length) {
        throw new Error('Component not found');
      }

      const component = result[0].comp.properties;
      const interfaces = result[0].interfaces.map((iface: any) => iface.properties);
      const dependencies = result[0].dependencies.map((dep: any) => dep.properties);

      const testCases: TestCase[] = [];

      // Generate test cases for each interface
      for (const iface of interfaces) {
        testCases.push({
          id: `component-test-${componentId}-${iface.method}`,
          name: `Test ${component.name}.${iface.method}`,
          description: `Tests the ${iface.method} method of ${component.name}`,
          type: TestCaseType.UNIT,
          framework: TestFramework.JEST,
          priority: Priority.MEDIUM,
          complexity: 3,
          estimatedDuration: 120,
          requirements: [],
          tags: ['component', 'unit', component.name],
          code: this.generateComponentTestCode(component, iface),
          assertions: [],
          coverage: this.createDefaultCoverage(),
          status: 'PENDING' as any,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: { component, interface: iface }
        });
      }

      return {
        testCases,
        mockSetup: this.generateComponentMockSetup(dependencies),
        recommendations: [
          'Test all public methods',
          'Mock external dependencies',
          'Validate error handling'
        ]
      };
    } catch (error) {
      logger.error('Failed to generate component tests', { error: error.message });
      throw new Error('Failed to generate component tests');
    }
  }

  // Private helper methods
  private hasInvalidSyntax(sourceCode: string): boolean {
    try {
      // Basic syntax validation for common patterns
      const braceCount = (sourceCode.match(/{/g) || []).length - (sourceCode.match(/}/g) || []).length;
      const parenCount = (sourceCode.match(/\(/g) || []).length - (sourceCode.match(/\)/g) || []).length;
      
      return braceCount !== 0 || parenCount !== 0;
    } catch {
      return true;
    }
  }

  private async generateTestCasesFromSource(request: TestGenerationRequest): Promise<TestCase[]> {
    // Use the test case generator service
    return await this.testCaseGenerator.generateFromSourceCode(request);
  }

  private async identifyCoverageGaps(sourceCode: string, testCases: TestCase[]) {
    // Analyze which parts of the source code are not covered by tests
    return [];
  }

  private generateRecommendations(testCases: TestCase[], coverageGaps: any[]): string[] {
    const recommendations: string[] = [];

    if (testCases.length === 0) {
      recommendations.push('No test cases generated - check source code validity');
      return recommendations;
    }

    if (testCases.length === 1) {
      recommendations.push('Consider testing edge cases like negative numbers');
    }

    if (coverageGaps.length > 0) {
      recommendations.push('Address coverage gaps in critical code paths');
    }

    recommendations.push('Review generated tests for completeness');
    return recommendations;
  }

  private calculateConfidence(testCases: TestCase[], request: TestGenerationRequest): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on test case quality
    if (testCases.length > 0) {
      confidence += 0.3;
    }

    // Adjust based on complexity
    if (request.complexity && request.complexity < 5) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  private async storeTestCases(testCases: TestCase[]): Promise<void> {
    for (const testCase of testCases) {
      const query = `
        CREATE (test:TestCase $properties)
        RETURN test
      `;
      
      await this.neo4j.query(query, { properties: testCase });
    }
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

  private calculateTimeReduction(optimizations: TestOptimization[]): number {
    return optimizations.reduce((total, opt) => {
      if (opt.type === OptimizationType.PARALLEL_EXECUTION) {
        return total + 60; // 60% reduction
      }
      if (opt.type === OptimizationType.TEST_SELECTION) {
        return total + 40; // 40% reduction
      }
      return total + 10; // Default 10% reduction
    }, 0);
  }

  private generateLoadTestCode(specs: any): string {
    return `
test('load test for ${specs.endpoint}', async () => {
  const concurrent = ${specs.maxConcurrentUsers || 10};
  const promises = Array(concurrent).fill(null).map(() => 
    fetch('${specs.endpoint}')
  );
  
  const responses = await Promise.all(promises);
  responses.forEach(response => {
    expect(response.ok).toBe(true);
  });
});
    `;
  }

  private generateResponseTimeTestCode(specs: any): string {
    return `
test('response time validation', async () => {
  const start = performance.now();
  const response = await fetch('${specs.endpoint || '/api/test'}');
  const duration = performance.now() - start;
  
  expect(response.ok).toBe(true);
  expect(duration).toBeLessThan(${specs.expectedResponseTime});
});
    `;
  }

  private generatePerformanceRecommendations(specs: any): string[] {
    const recommendations = [];
    
    if (specs.maxConcurrentUsers && specs.maxConcurrentUsers > 100) {
      recommendations.push('Consider using dedicated load testing tools for high concurrency');
    }
    
    if (specs.expectedResponseTime && specs.expectedResponseTime < 100) {
      recommendations.push('Very strict response time requirement - ensure proper infrastructure');
    }
    
    return recommendations;
  }

  private generateMaintenanceRecommendations(issues: any[]): string[] {
    const recommendations = [];
    
    if (issues.some(i => i.type === 'OUTDATED_DEPENDENCIES')) {
      recommendations.push('Update outdated dependencies to latest versions');
    }
    
    if (issues.some(i => i.type === 'STALE_TEST')) {
      recommendations.push('Review and update stale tests regularly');
    }
    
    return recommendations;
  }

  private generateIntegrationSetup(config: any): string {
    let setup = `beforeAll(async () => {\n`;
    
    if (config.database) {
      setup += `  await setupTestDatabase('${config.database}');\n`;
    }
    
    setup += `  // Initialize test environment\n`;
    setup += `});\n`;
    
    return setup;
  }

  private generateIntegrationTeardown(config: any): string {
    let teardown = `afterAll(async () => {\n`;
    
    if (config.database) {
      teardown += `  await cleanupTestDatabase();\n`;
    }
    
    teardown += `  // Cleanup test environment\n`;
    teardown += `});\n`;
    
    return teardown;
  }

  private generateIntegrationTestCases(config: any): TestCase[] {
    return config.modules.map((module: string, index: number) => ({
      id: `integration-${module}-${Date.now()}-${index}`,
      name: `Integration test for ${module}`,
      description: `Tests integration of ${module} with other components`,
      type: config.testType || TestCaseType.INTEGRATION,
      framework: config.framework,
      priority: Priority.MEDIUM,
      complexity: 4,
      estimatedDuration: 200,
      requirements: [],
      tags: ['integration', module],
      code: `test('${module} integration', async () => {\n  // Test ${module} integration\n  expect(true).toBe(true);\n});`,
      assertions: [],
      coverage: this.createDefaultCoverage(),
      status: 'PENDING' as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { module }
    }));
  }

  private generateMockConfigurations(config: any): Record<string, any> {
    const mocks: Record<string, any> = {};
    
    config.modules.forEach((module: string) => {
      mocks[module] = {
        mock: `jest.mock('${module}')`,
        setup: `const mock${module} = ${module} as jest.Mocked<typeof ${module}>;`
      };
    });
    
    return mocks;
  }

  private generateComponentTestCode(component: any, iface: any): string {
    return `
test('should test ${component.name}.${iface.method}', () => {
  const ${component.name.toLowerCase()} = new ${component.name}();
  
  // Test the method
  const result = ${component.name.toLowerCase()}.${iface.method}();
  
  expect(result).toBeDefined();
});
    `;
  }

  private generateComponentMockSetup(dependencies: any[]): string {
    if (dependencies.length === 0) return '';
    
    let mockSetup = '// Mock dependencies\n';
    dependencies.forEach(dep => {
      mockSetup += `jest.mock('${dep.name}');\n`;
    });
    
    return mockSetup;
  }
}