/**
 * Test Prioritizer Service
 * Intelligent test execution prioritization and optimization
 */

import { Neo4jService } from '../../../core/database/neo4j';
import { logger } from '../../../core/logging/logger';
import {
  TestCase,
  TestPrioritization,
  Priority,
  PriorityFactor
} from '../types/development.types';

export class TestPrioritizerService {
  constructor(private neo4j: Neo4jService) {}

  async prioritizeTests(tests: TestCase[], weights: Record<string, number> = {}): Promise<TestPrioritization[]> {
    try {
      logger.info('Prioritizing tests', { testCount: tests.length });

      if (!Array.isArray(tests)) {
        throw new Error('Invalid test data provided');
      }

      if (tests.length === 0) {
        return [];
      }

      // Set default weights if not provided
      const defaultWeights = {
        businessImpactWeight: 0.3,
        riskWeight: 0.25,
        complexityWeight: 0.2,
        durationWeight: 0.1,
        failureHistoryWeight: 0.15
      };

      const finalWeights = { ...defaultWeights, ...weights };

      // Get additional data for prioritization
      const enrichedTests = await this.enrichTestsWithData(tests);

      // Calculate priority for each test
      const prioritizations = await Promise.all(
        enrichedTests.map(test => this.calculateTestPriority(test, finalWeights))
      );

      // Sort by priority (highest first)
      return prioritizations.sort((a, b) => b.priority - a.priority);

    } catch (error) {
      logger.error('Failed to prioritize tests', { error: error.message });
      throw new Error('Failed to prioritize tests');
    }
  }

  async prioritizeTestsByChanges(tests: TestCase[], changedFiles: string[]): Promise<TestPrioritization[]> {
    try {
      logger.info('Prioritizing tests by code changes');

      const prioritizations: TestPrioritization[] = [];

      for (const test of tests) {
        // Get test file coverage information
        const query = `
          MATCH (test:TestCase {id: $testId})-[:COVERS]->(file:File)
          RETURN file.path as filePath
        `;

        const result = await this.neo4j.query(query, { testId: test.id });
        const coveredFiles = result.map((r: any) => r.filePath);

        // Calculate change impact
        const changeImpact = this.calculateChangeImpact(coveredFiles, changedFiles);
        
        const factors: PriorityFactor[] = [
          {
            name: 'CHANGE_IMPACT',
            weight: 1.0,
            value: changeImpact,
            contribution: changeImpact
          }
        ];

        prioritizations.push({
          testId: test.id,
          priority: changeImpact * 10, // Scale to 0-10
          factors,
          reasoning: `Test covers ${Math.round(changeImpact * 100)}% of changed files`,
          estimatedImpact: Math.round(changeImpact * 10),
          riskLevel: changeImpact > 0.7 ? Priority.HIGH : 
                    changeImpact > 0.3 ? Priority.MEDIUM : Priority.LOW
        });
      }

      return prioritizations.sort((a, b) => b.priority - a.priority);

    } catch (error) {
      logger.error('Failed to prioritize tests by changes', { error: error.message });
      throw new Error('Failed to prioritize tests by changes');
    }
  }

  async prioritizeTestsWithBudget(
    tests: TestCase[], 
    timeBudgetMinutes: number, 
    weights: Record<string, number> = {}
  ): Promise<TestPrioritization[]> {
    try {
      logger.info('Prioritizing tests with time budget', { budget: timeBudgetMinutes });

      // First get standard prioritization
      const prioritized = await this.prioritizeTests(tests, weights);

      // Apply budget constraint using knapsack-like algorithm
      const budgetMs = timeBudgetMinutes * 60 * 1000;
      const selected: TestPrioritization[] = [];
      let usedTime = 0;

      for (const prioritization of prioritized) {
        const test = tests.find(t => t.id === prioritization.testId);
        if (!test) continue;

        const testDuration = test.estimatedDuration || 120; // Default 2 minutes
        
        if (usedTime + testDuration <= budgetMs) {
          selected.push(prioritization);
          usedTime += testDuration;
        }
      }

      logger.info('Selected tests within budget', { 
        selected: selected.length, 
        timeUsed: Math.round(usedTime / 60000) 
      });

      return selected;

    } catch (error) {
      logger.error('Failed to prioritize tests with budget', { error: error.message });
      throw new Error('Failed to prioritize tests with budget');
    }
  }

  async calculateRiskScore(testData: {
    failureRate: number;
    avgExecutionTime: number;
    complexity: number;
    dependencies: string[];
    lastFailureDate?: Date;
    codeChangeFrequency: number;
  }): Promise<number> {
    try {
      let riskScore = 0;

      // Failure rate risk (0-3 points)
      riskScore += testData.failureRate * 3;

      // Execution time risk (0-2 points)
      if (testData.avgExecutionTime > 5000) riskScore += 2;
      else if (testData.avgExecutionTime > 2000) riskScore += 1;

      // Complexity risk (0-2 points)
      if (testData.complexity > 8) riskScore += 2;
      else if (testData.complexity > 5) riskScore += 1;

      // Dependencies risk (0-2 points)
      const externalDeps = testData.dependencies.filter(dep => 
        dep.includes('api') || dep.includes('database') || dep.includes('external')
      );
      if (externalDeps.length > 2) riskScore += 2;
      else if (externalDeps.length > 0) riskScore += 1;

      // Recent failure risk (0-1 points)
      if (testData.lastFailureDate) {
        const daysSinceFailure = (Date.now() - testData.lastFailureDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceFailure < 7) riskScore += 1;
      }

      return Math.min(10, riskScore);

    } catch (error) {
      logger.error('Failed to calculate risk score', { error: error.message });
      return 5; // Default medium risk
    }
  }

  async analyzeTestDependencies(testIds: string[]): Promise<Record<string, any>> {
    try {
      logger.info('Analyzing test dependencies');

      const dependencyAnalysis: Record<string, any> = {};

      for (const testId of testIds) {
        const query = `
          MATCH (test:TestCase {id: $testId})-[:DEPENDS_ON]->(dep)
          RETURN dep.type as type, dep.name as name, dep.criticality as criticality
        `;

        const result = await this.neo4j.query(query, { testId });
        const dependencies = result.map((r: any) => r);

        const dependencyRisk = this.calculateDependencyRisk(dependencies);
        const issues = this.identifyDependencyIssues(dependencies);

        dependencyAnalysis[testId] = {
          dependencies,
          dependencyRisk,
          issues,
          externalDependencies: dependencies.filter((dep: any) => dep.type === 'EXTERNAL_API').length,
          databaseDependencies: dependencies.filter((dep: any) => dep.type === 'DATABASE').length
        };
      }

      // Check for circular dependencies
      this.detectCircularDependencies(dependencyAnalysis);

      return dependencyAnalysis;

    } catch (error) {
      logger.error('Failed to analyze test dependencies', { error: error.message });
      throw new Error('Failed to analyze test dependencies');
    }
  }

  async optimizeTestOrder(tests: any[], options: any = {}): Promise<any[]> {
    try {
      logger.info('Optimizing test execution order');

      const optimizeFor = options.optimizeFor || 'SETUP_EFFICIENCY';
      const allowParallel = options.allowParallel || false;

      let optimizedTests = [...tests];

      if (optimizeFor === 'SETUP_EFFICIENCY') {
        // Group tests by setup requirements
        const groups = this.groupTestsBySetup(tests);
        optimizedTests = this.orderGroupsForEfficiency(groups);
      } else if (optimizeFor === 'EXECUTION_TIME') {
        // Order by execution time and parallelizability
        optimizedTests = this.orderByExecutionTime(tests, allowParallel);
      }

      return optimizedTests;

    } catch (error) {
      logger.error('Failed to optimize test order', { error: error.message });
      return tests; // Return original order if optimization fails
    }
  }

  async analyzeFlakiness(testIds: string[]): Promise<Record<string, any>> {
    try {
      logger.info('Analyzing test flakiness');

      const flakinessAnalysis: Record<string, any> = {};

      for (const testId of testIds) {
        const query = `
          MATCH (test:TestCase {id: $testId})-[:HAS_RUN]->(run:TestRun)
          RETURN run.passed as passed, run.duration as duration, run.environment as environment
          ORDER BY run.timestamp DESC
          LIMIT 20
        `;

        const result = await this.neo4j.query(query, { testId });
        const runs = result.map((r: any) => r);

        const flakinessScore = this.calculateFlakinessScore(runs);
        const patterns = this.identifyFlakinessPatterns(runs);
        const recommendation = this.generateFlakinessRecommendation(flakinessScore, patterns);

        flakinessAnalysis[testId] = {
          flakinessScore,
          patterns,
          recommendation,
          recentFailures: runs.filter((run: any) => !run.passed).length,
          totalRuns: runs.length
        };
      }

      return flakinessAnalysis;

    } catch (error) {
      logger.error('Failed to analyze flakiness', { error: error.message });
      throw new Error('Failed to analyze flakiness');
    }
  }

  async prioritizeByRegressionRisk(
    testIds: string[], 
    recentChanges: Array<{file: string, linesChanged: number, changeType: string}>
  ): Promise<TestPrioritization[]> {
    try {
      logger.info('Prioritizing by regression risk');

      const prioritizations: TestPrioritization[] = [];

      for (const testId of testIds) {
        // Get test coverage and historical regression data
        const query = `
          MATCH (test:TestCase {id: $testId})-[:COVERS]->(file:File)
          OPTIONAL MATCH (test)-[:HAD_REGRESSION]->(regression:Regression)
          RETURN file.path as filePath, collect(regression) as regressionHistory
        `;

        const result = await this.neo4j.query(query, { testId });
        const testData = result[0] || { filePath: [], regressionHistory: [] };

        const regressionRisk = this.calculateRegressionRisk(
          testData.filePath, 
          recentChanges, 
          testData.regressionHistory
        );

        const factors: PriorityFactor[] = [
          {
            name: 'REGRESSION_RISK',
            weight: 0.6,
            value: regressionRisk.changeImpact,
            contribution: regressionRisk.changeImpact * 0.6
          },
          {
            name: 'REGRESSION_HISTORY',
            weight: 0.4,
            value: regressionRisk.historyScore,
            contribution: regressionRisk.historyScore * 0.4
          }
        ];

        const totalPriority = factors.reduce((sum, factor) => sum + factor.contribution, 0) * 10;

        prioritizations.push({
          testId,
          priority: totalPriority,
          factors,
          reasoning: `Regression risk: ${Math.round(regressionRisk.totalRisk * 100)}%`,
          estimatedImpact: Math.round(regressionRisk.totalRisk * 10),
          riskLevel: regressionRisk.totalRisk > 0.7 ? Priority.CRITICAL :
                    regressionRisk.totalRisk > 0.4 ? Priority.HIGH :
                    regressionRisk.totalRisk > 0.2 ? Priority.MEDIUM : Priority.LOW
        });
      }

      return prioritizations.sort((a, b) => b.priority - a.priority);

    } catch (error) {
      logger.error('Failed to prioritize by regression risk', { error: error.message });
      throw new Error('Failed to prioritize by regression risk');
    }
  }

  async adjustPrioritiesWithFeedback(
    initialPriorities: TestPrioritization[], 
    feedback: Record<string, any>
  ): Promise<TestPrioritization[]> {
    try {
      logger.info('Adjusting priorities with feedback');

      return initialPriorities.map(priority => {
        const testFeedback = feedback[priority.testId];
        if (!testFeedback) return priority;

        let adjustment = 0;

        // Adjust based on actual duration vs expected
        if (testFeedback.actualDuration > 2000) adjustment -= 1;
        if (testFeedback.actualDuration < 100) adjustment += 0.5;

        // Adjust based on pass/fail
        if (!testFeedback.passed) adjustment -= 2;
        if (testFeedback.passed && testFeedback.issues.length === 0) adjustment += 0.5;

        // Adjust based on issues
        if (testFeedback.issues.includes('flaky')) adjustment -= 1.5;
        if (testFeedback.issues.includes('timeout')) adjustment -= 1;

        const adjustedPriority = Math.max(0, priority.priority + adjustment);

        return {
          ...priority,
          priority: adjustedPriority,
          factors: [
            ...priority.factors,
            {
              name: 'FEEDBACK_ADJUSTMENT',
              weight: 0.1,
              value: adjustment,
              contribution: adjustment * 0.1
            }
          ]
        };
      });

    } catch (error) {
      logger.error('Failed to adjust priorities with feedback', { error: error.message });
      return initialPriorities;
    }
  }

  async extractLearningsFromHistory(executionHistory: any[]): Promise<Record<string, any>> {
    try {
      logger.info('Extracting learnings from execution history');

      const learnings: Record<string, any> = {};

      // Group by test ID
      const groupedHistory = executionHistory.reduce((groups, execution) => {
        if (!groups[execution.testId]) {
          groups[execution.testId] = [];
        }
        groups[execution.testId].push(execution);
        return groups;
      }, {} as Record<string, any[]>);

      // Analyze patterns for each test
      for (const [testId, history] of Object.entries(groupedHistory)) {
        const patterns = this.identifyExecutionPatterns(history);
        const trends = this.analyzeTrends(history);
        const recommendations = this.generateLearningRecommendations(patterns, trends);

        learnings[testId] = {
          patterns,
          trends,
          recommendations,
          executionCount: history.length,
          averageDuration: history.reduce((sum, h) => sum + h.duration, 0) / history.length
        };
      }

      return learnings;

    } catch (error) {
      logger.error('Failed to extract learnings from history', { error: error.message });
      throw new Error('Failed to extract learnings from history');
    }
  }

  async optimizeForResources(
    tests: any[], 
    resources: {cpu: number, memory: number, network: number, database: number}
  ): Promise<TestPrioritization[]> {
    try {
      logger.info('Optimizing for available resources');

      const prioritizations: TestPrioritization[] = [];

      for (const test of tests) {
        const resourceScore = this.calculateResourceCompatibility(test.resourceUsage, resources);
        
        const factors: PriorityFactor[] = [
          {
            name: 'RESOURCE_COMPATIBILITY',
            weight: 1.0,
            value: resourceScore,
            contribution: resourceScore
          }
        ];

        prioritizations.push({
          testId: test.id,
          priority: resourceScore * 10,
          factors,
          reasoning: `Resource compatibility: ${Math.round(resourceScore * 100)}%`,
          estimatedImpact: Math.round(resourceScore * 10),
          riskLevel: resourceScore > 0.8 ? Priority.LOW : 
                    resourceScore > 0.5 ? Priority.MEDIUM : Priority.HIGH
        });
      }

      return prioritizations.sort((a, b) => b.priority - a.priority);

    } catch (error) {
      logger.error('Failed to optimize for resources', { error: error.message });
      throw new Error('Failed to optimize for resources');
    }
  }

  async prioritizeForPipeline(tests: TestCase[], pipelineContext: any): Promise<TestCase[]> {
    try {
      logger.info('Prioritizing for CI/CD pipeline');

      let prioritizedTests = [...tests];

      // Filter by changed files
      if (pipelineContext.changedFiles) {
        const relevantTests = await this.filterTestsByRelevance(tests, pipelineContext.changedFiles);
        prioritizedTests = relevantTests;
      }

      // Apply time constraints
      if (pipelineContext.timeConstraint) {
        const budgetTests = await this.prioritizeTestsWithBudget(
          prioritizedTests, 
          pipelineContext.timeConstraint / 60
        );
        prioritizedTests = budgetTests.map(pt => tests.find(t => t.id === pt.testId)!).filter(Boolean);
      }

      // Prioritize quality gates
      if (pipelineContext.qualityGates) {
        prioritizedTests = this.prioritizeByQualityGates(prioritizedTests, pipelineContext.qualityGates);
      }

      return prioritizedTests;

    } catch (error) {
      logger.error('Failed to prioritize for pipeline', { error: error.message });
      return tests;
    }
  }

  async updatePrioritiesFromResults(testResults: Record<string, any>): Promise<Record<string, any>> {
    try {
      logger.info('Updating priorities from test results');

      const updates: Record<string, any> = {};

      for (const [testId, result] of Object.entries(testResults)) {
        let adjustmentReason = '';
        let priorityAdjustment = 0;

        if (!result.passed) {
          if (result.error?.includes('timeout')) {
            adjustmentReason = 'Test failed due to timeout - reduce priority temporarily';
            priorityAdjustment = -2;
          } else if (result.error?.includes('assertion')) {
            adjustmentReason = 'Test failed on assertion - may need review';
            priorityAdjustment = -1;
          }
        } else {
          if (result.duration < 100) {
            adjustmentReason = 'Fast execution - good candidate for frequent running';
            priorityAdjustment = 1;
          }
        }

        updates[testId] = {
          adjustmentReason,
          priorityAdjustment,
          lastResult: result,
          timestamp: new Date()
        };
      }

      return updates;

    } catch (error) {
      logger.error('Failed to update priorities from results', { error: error.message });
      throw new Error('Failed to update priorities from results');
    }
  }

  // Private helper methods
  private async enrichTestsWithData(tests: TestCase[]): Promise<any[]> {
    const enrichedTests = [];

    for (const test of tests) {
      // Get requirement business impact
      const requirements = test.requirements || [];
      let businessImpact = 5; // Default medium impact

      if (requirements.length > 0) {
        const query = `
          MATCH (req:Requirement)
          WHERE req.id IN $requirements
          RETURN avg(req.businessImpact) as avgImpact
        `;
        
        const result = await this.neo4j.query(query, { requirements });
        businessImpact = result[0]?.avgImpact || 5;
      }

      // Get failure history
      const historyQuery = `
        MATCH (test:TestCase {id: $testId})-[:HAS_RUN]->(run:TestRun)
        RETURN 
          avg(CASE WHEN run.passed THEN 0 ELSE 1 END) as failureRate,
          avg(run.duration) as avgDuration,
          count(run) as runCount
        LIMIT 50
      `;

      const historyResult = await this.neo4j.query(historyQuery, { testId: test.id });
      const history = historyResult[0] || { failureRate: 0, avgDuration: 120, runCount: 0 };

      enrichedTests.push({
        ...test,
        businessImpact,
        failureRate: history.failureRate,
        avgDuration: history.avgDuration,
        runCount: history.runCount
      });
    }

    return enrichedTests;
  }

  private async calculateTestPriority(test: any, weights: Record<string, number>): Promise<TestPrioritization> {
    const factors: PriorityFactor[] = [];

    // Business impact factor
    const businessImpactScore = test.businessImpact / 10;
    factors.push({
      name: 'BUSINESS_IMPACT',
      weight: weights.businessImpactWeight,
      value: businessImpactScore,
      contribution: businessImpactScore * weights.businessImpactWeight
    });

    // Risk factor
    const riskScore = test.failureRate || 0;
    factors.push({
      name: 'RISK_SCORE',
      weight: weights.riskWeight,
      value: riskScore,
      contribution: riskScore * weights.riskWeight
    });

    // Complexity factor (inverse - simpler tests prioritized)
    const complexityScore = Math.max(0, 1 - (test.complexity / 10));
    factors.push({
      name: 'COMPLEXITY',
      weight: weights.complexityWeight,
      value: complexityScore,
      contribution: complexityScore * weights.complexityWeight
    });

    // Duration factor (inverse - faster tests prioritized)
    const durationScore = Math.max(0, 1 - (test.estimatedDuration / 1000));
    factors.push({
      name: 'EXECUTION_TIME',
      weight: weights.durationWeight,
      value: durationScore,
      contribution: durationScore * weights.durationWeight
    });

    // Failure history factor
    if (test.runCount > 0) {
      factors.push({
        name: 'FAILURE_HISTORY',
        weight: weights.failureHistoryWeight,
        value: test.failureRate,
        contribution: test.failureRate * weights.failureHistoryWeight
      });
    }

    const totalPriority = factors.reduce((sum, factor) => sum + factor.contribution, 0) * 10;

    return {
      testId: test.id,
      priority: totalPriority,
      factors,
      reasoning: this.generateReasoning(factors),
      estimatedImpact: Math.round(test.businessImpact),
      riskLevel: this.determineRiskLevel(totalPriority)
    };
  }

  private calculateChangeImpact(coveredFiles: string[], changedFiles: string[]): number {
    if (coveredFiles.length === 0) return 0;

    const intersection = coveredFiles.filter(file => 
      changedFiles.some(changed => changed.includes(file) || file.includes(changed))
    );

    return intersection.length / coveredFiles.length;
  }

  private calculateDependencyRisk(dependencies: any[]): number {
    let risk = 0;

    dependencies.forEach(dep => {
      const criticality = dep.criticality || 5;
      if (dep.type === 'EXTERNAL_API') risk += criticality * 0.3;
      if (dep.type === 'DATABASE') risk += criticality * 0.2;
      if (dep.type === 'SERVICE') risk += criticality * 0.15;
    });

    return Math.min(10, risk);
  }

  private identifyDependencyIssues(dependencies: any[]): any[] {
    const issues = [];

    // Check for circular dependencies (simplified)
    const dependencyNames = dependencies.map(d => d.name);
    if (dependencyNames.length !== new Set(dependencyNames).size) {
      issues.push({ type: 'DUPLICATE_DEPENDENCY', severity: Priority.MEDIUM });
    }

    // Check for high-risk external dependencies
    const externalDeps = dependencies.filter(d => d.type === 'EXTERNAL_API');
    if (externalDeps.length > 3) {
      issues.push({ type: 'TOO_MANY_EXTERNAL_DEPS', severity: Priority.HIGH });
    }

    return issues;
  }

  private detectCircularDependencies(dependencyAnalysis: Record<string, any>): void {
    // Simplified circular dependency detection
    for (const [testId, analysis] of Object.entries(dependencyAnalysis)) {
      const circularDeps = analysis.dependencies.filter((dep: any) => 
        dep.name === testId || dep.name.includes(testId)
      );

      if (circularDeps.length > 0) {
        analysis.issues.push({ type: 'CIRCULAR_DEPENDENCY', severity: Priority.HIGH });
      }
    }
  }

  private groupTestsBySetup(tests: any[]): Record<string, any[]> {
    return tests.reduce((groups, test) => {
      const setupType = test.setupType || 'NONE';
      if (!groups[setupType]) groups[setupType] = [];
      groups[setupType].push(test);
      return groups;
    }, {} as Record<string, any[]>);
  }

  private orderGroupsForEfficiency(groups: Record<string, any[]>): any[] {
    // Order groups to minimize setup/teardown overhead
    const setupOrder = ['NONE', 'DATABASE', 'API_SERVER', 'BROWSER'];
    const ordered = [];

    for (const setupType of setupOrder) {
      if (groups[setupType]) {
        ordered.push(...groups[setupType]);
      }
    }

    // Add any remaining groups
    for (const [setupType, groupTests] of Object.entries(groups)) {
      if (!setupOrder.includes(setupType)) {
        ordered.push(...groupTests);
      }
    }

    return ordered;
  }

  private orderByExecutionTime(tests: any[], allowParallel: boolean): any[] {
    if (allowParallel) {
      // Group parallelizable tests together
      const parallelizable = tests.filter(t => t.parallelizable);
      const sequential = tests.filter(t => !t.parallelizable);
      
      return [
        ...parallelizable.sort((a, b) => a.duration - b.duration),
        ...sequential.sort((a, b) => a.duration - b.duration)
      ];
    }

    // Simple sort by duration (fastest first)
    return tests.sort((a, b) => (a.duration || 120) - (b.duration || 120));
  }

  private calculateFlakinessScore(runs: any[]): number {
    if (runs.length < 3) return 0;

    let inconsistencyCount = 0;
    const windowSize = 5;

    for (let i = 0; i <= runs.length - windowSize; i++) {
      const window = runs.slice(i, i + windowSize);
      const passCount = window.filter((run: any) => run.passed).length;
      
      // Consider it flaky if not all pass or all fail in a window
      if (passCount > 0 && passCount < windowSize) {
        inconsistencyCount++;
      }
    }

    return inconsistencyCount / Math.max(1, runs.length - windowSize + 1);
  }

  private identifyFlakinessPatterns(runs: any[]): any[] {
    const patterns = [];

    // Environment-based pattern
    const environments = runs.reduce((env, run) => {
      if (!env[run.environment]) env[run.environment] = { passed: 0, failed: 0 };
      if (run.passed) env[run.environment].passed++;
      else env[run.environment].failed++;
      return env;
    }, {});

    for (const [env, stats] of Object.entries(environments) as any) {
      const total = stats.passed + stats.failed;
      const failureRate = stats.failed / total;
      if (failureRate > 0.3 && total > 2) {
        patterns.push({
          type: 'ENVIRONMENT',
          environment: env,
          correlation: failureRate
        });
      }
    }

    return patterns;
  }

  private generateFlakinessRecommendation(score: number, patterns: any[]): string {
    if (score > 0.5) {
      return 'High flakiness detected - investigate and fix immediately';
    } else if (score > 0.2) {
      return 'Moderate flakiness - monitor and investigate patterns';
    } else if (patterns.length > 0) {
      return 'Flakiness patterns detected - review environmental factors';
    } else {
      return 'Stable test with low flakiness';
    }
  }

  private calculateRegressionRisk(filePath: string[], recentChanges: any[], regressionHistory: any[]) {
    // Change impact
    const relevantChanges = recentChanges.filter(change => 
      filePath.some(file => change.file.includes(file))
    );
    
    const changeImpact = relevantChanges.length > 0 ? 
      relevantChanges.reduce((sum, change) => sum + change.linesChanged, 0) / 100 : 0;

    // History score
    const historyScore = regressionHistory.length > 0 ? 
      regressionHistory.filter((reg: any) => reg.severity === 'HIGH').length / 10 : 0;

    const totalRisk = Math.min(1, (changeImpact * 0.7) + (historyScore * 0.3));

    return { changeImpact, historyScore, totalRisk };
  }

  private identifyExecutionPatterns(history: any[]): any[] {
    const patterns = [];

    // Performance anomaly pattern
    const durations = history.map(h => h.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const anomalies = durations.filter(d => d > avgDuration * 3);

    if (anomalies.length > 0) {
      patterns.push({
        type: 'PERFORMANCE_ANOMALY',
        occurrences: anomalies.length,
        threshold: avgDuration * 3
      });
    }

    return patterns;
  }

  private analyzeTrends(history: any[]): any {
    if (history.length < 3) return { trend: 'INSUFFICIENT_DATA' };

    const recent = history.slice(0, Math.floor(history.length / 2));
    const older = history.slice(Math.floor(history.length / 2));

    const recentAvgDuration = recent.reduce((sum, h) => sum + h.duration, 0) / recent.length;
    const olderAvgDuration = older.reduce((sum, h) => sum + h.duration, 0) / older.length;

    const durationChange = ((recentAvgDuration - olderAvgDuration) / olderAvgDuration) * 100;

    return {
      trend: Math.abs(durationChange) < 10 ? 'STABLE' : 
             durationChange > 0 ? 'DETERIORATING' : 'IMPROVING',
      durationChange: Math.round(durationChange)
    };
  }

  private generateLearningRecommendations(patterns: any[], trends: any): string[] {
    const recommendations = [];

    if (patterns.some(p => p.type === 'PERFORMANCE_ANOMALY')) {
      recommendations.push('Investigate performance anomalies - may indicate resource contention');
    }

    if (trends.trend === 'DETERIORATING') {
      recommendations.push('Test performance is declining - review recent changes');
    }

    if (recommendations.length === 0) {
      recommendations.push('Test execution patterns are stable');
    }

    return recommendations;
  }

  private calculateResourceCompatibility(usage: any, available: any): number {
    if (!usage || !available) return 0.5;

    let compatibility = 0;
    let factorCount = 0;

    for (const [resource, needed] of Object.entries(usage)) {
      if (available[resource] !== undefined) {
        const availableAmount = available[resource as keyof typeof available];
        compatibility += Math.max(0, Math.min(1, availableAmount / needed));
        factorCount++;
      }
    }

    return factorCount > 0 ? compatibility / factorCount : 0.5;
  }

  private async filterTestsByRelevance(tests: TestCase[], changedFiles: string[]): Promise<TestCase[]> {
    // Simplified relevance filtering
    return tests.filter(test => 
      test.tags.some(tag => changedFiles.some(file => file.includes(tag))) ||
      test.requirements.length > 0
    );
  }

  private prioritizeByQualityGates(tests: TestCase[], qualityGates: string[]): TestCase[] {
    return tests.sort((a, b) => {
      const aMatches = a.tags.filter(tag => qualityGates.includes(tag)).length;
      const bMatches = b.tags.filter(tag => qualityGates.includes(tag)).length;
      return bMatches - aMatches;
    });
  }

  private generateReasoning(factors: PriorityFactor[]): string {
    const topFactor = factors.reduce((max, factor) => 
      factor.contribution > max.contribution ? factor : max
    );

    return `Primary factor: ${topFactor.name} (${Math.round(topFactor.contribution * 100)}% contribution)`;
  }

  private determineRiskLevel(priority: number): Priority {
    if (priority >= 8) return Priority.CRITICAL;
    if (priority >= 6) return Priority.HIGH;
    if (priority >= 4) return Priority.MEDIUM;
    return Priority.LOW;
  }
}