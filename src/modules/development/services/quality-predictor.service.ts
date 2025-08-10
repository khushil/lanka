/**
 * Quality Predictor Service
 * AI-powered quality prediction and risk assessment for tests
 */

import { Neo4jService } from '../../../core/database/neo4j';
import { logger } from '../../../core/logging/logger';
import {
  QualityPrediction,
  Priority,
  RiskFactor,
  PredictedIssue,
  HistoricalQuality
} from '../types/development.types';

export class QualityPredictorService {
  constructor(private neo4j: Neo4jService) {}

  async predictTestQuality(testId: string): Promise<QualityPrediction> {
    try {
      logger.info('Predicting test quality', { testId });

      if (!testId) {
        throw new Error('Test not found');
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

      // Analyze test metrics
      const testMetrics = this.extractTestMetrics(test, historicalRuns);
      
      // Calculate quality score
      const qualityScore = this.calculateQualityScore(testMetrics);
      
      // Analyze risk factors
      const riskFactors = await this.analyzeRiskFactors(testMetrics, this.convertToHistoricalQuality(historicalRuns));
      
      // Generate recommendations
      const recommendations = this.generateQualityRecommendations(qualityScore, riskFactors);
      
      // Calculate confidence
      const confidence = this.calculateConfidence(historicalRuns.length, testMetrics);
      
      // Predict potential issues
      const predictedIssues = await this.predictIssues({
        id: testId,
        historicalRuns,
        complexity: test.complexity,
        hasTimeouts: testMetrics.hasTimeouts,
        hasAsyncOperations: testMetrics.hasAsyncOperations
      });

      return {
        testId,
        qualityScore,
        riskFactors,
        recommendations,
        confidence,
        predictedIssues,
        historicalData: this.convertToHistoricalQuality(historicalRuns)
      };
    } catch (error) {
      logger.error('Failed to predict test quality', { error: error.message });
      throw new Error('Failed to predict test quality');
    }
  }

  async predictSuiteQuality(testSuiteId: string) {
    try {
      logger.info('Predicting suite quality', { testSuiteId });

      const query = `
        MATCH (suite:TestSuite {id: $testSuiteId})-[:CONTAINS]->(test:TestCase)
        OPTIONAL MATCH (test)-[:HAS_RUN]->(run:TestRun)
        RETURN test, collect(run) as runs
      `;

      const result = await this.neo4j.query(query, { testSuiteId });
      
      const testQualities = await Promise.all(
        result.map(async (record: any) => {
          const test = record.test.properties;
          const runs = record.runs.map((run: any) => run.properties);
          
          const testMetrics = this.extractTestMetrics(test, runs);
          const qualityScore = this.calculateQualityScore(testMetrics);
          
          return {
            testId: test.id,
            qualityScore,
            complexity: test.complexity || 1,
            flakyScore: this.calculateFlakinessScore(runs)
          };
        })
      );

      const overallQualityScore = this.calculateOverallQuality(testQualities);
      const riskDistribution = this.analyzeRiskDistribution(testQualities);
      const problematicTests = this.identifyProblematicTests(testQualities);
      const recommendations = this.generateSuiteRecommendations(testQualities, problematicTests);

      return {
        overallQualityScore,
        riskDistribution,
        problematicTests,
        recommendations,
        testCount: testQualities.length,
        averageComplexity: testQualities.reduce((sum, t) => sum + t.complexity, 0) / testQualities.length
      };
    } catch (error) {
      logger.error('Failed to predict suite quality', { error: error.message });
      throw new Error('Failed to predict suite quality');
    }
  }

  async analyzeRiskFactors(testMetrics: any, historicalData: HistoricalQuality[]): Promise<RiskFactor[]> {
    try {
      logger.info('Analyzing risk factors');

      const riskFactors: RiskFactor[] = [];

      // Complexity risk
      if (testMetrics.cyclomaticComplexity > 10) {
        riskFactors.push({
          category: 'COMPLEXITY',
          level: testMetrics.cyclomaticComplexity > 15 ? Priority.CRITICAL : Priority.HIGH,
          description: `High cyclomatic complexity (${testMetrics.cyclomaticComplexity})`,
          mitigation: [
            'Break down complex test into smaller, focused tests',
            'Use helper functions to reduce complexity',
            'Simplify test logic and assertions'
          ],
          weight: 0.3
        });
      }

      // Assertion quality risk
      if (testMetrics.assertionCount < 2) {
        riskFactors.push({
          category: 'ASSERTION_QUALITY',
          level: Priority.MEDIUM,
          description: 'Test has insufficient assertions - may miss edge cases',
          mitigation: [
            'Add more specific assertions',
            'Test edge cases and error conditions',
            'Validate all expected outputs'
          ],
          weight: 0.2
        });
      }

      // Mock usage risk
      if (testMetrics.mockUsage > 10) {
        riskFactors.push({
          category: 'MOCK_USAGE',
          level: Priority.MEDIUM,
          description: 'Excessive use of mocks may indicate over-isolation',
          mitigation: [
            'Review mock necessity',
            'Consider integration testing approach',
            'Reduce mock dependencies where possible'
          ],
          weight: 0.25
        });
      }

      // Historical quality trend risk
      if (historicalData.length >= 3) {
        const trend = this.calculateQualityTrend(historicalData);
        if (trend < -10) { // Declining quality
          riskFactors.push({
            category: 'QUALITY_TREND',
            level: Priority.HIGH,
            description: `Quality declining over time (${trend.toFixed(1)}% decrease)`,
            mitigation: [
              'Review recent changes to test',
              'Update test for code changes',
              'Improve test stability'
            ],
            weight: 0.35
          });
        }
      }

      // Performance risk
      if (testMetrics.averageDuration > 5000) { // > 5 seconds
        riskFactors.push({
          category: 'PERFORMANCE',
          level: Priority.MEDIUM,
          description: `Test runs slowly (${testMetrics.averageDuration}ms average)`,
          mitigation: [
            'Optimize test setup and teardown',
            'Use more focused test data',
            'Consider mocking expensive operations'
          ],
          weight: 0.2
        });
      }

      return riskFactors;
    } catch (error) {
      logger.error('Failed to analyze risk factors', { error: error.message });
      return [];
    }
  }

  async predictIssues(testData: any): Promise<PredictedIssue[]> {
    try {
      logger.info('Predicting potential issues');

      const issues: PredictedIssue[] = [];

      // Flaky test prediction
      const flakinessScore = this.calculateFlakinessScore(testData.historicalRuns);
      if (flakinessScore > 0.3) {
        issues.push({
          type: 'FLAKY_TEST',
          probability: flakinessScore,
          severity: flakinessScore > 0.7 ? Priority.HIGH : Priority.MEDIUM,
          description: 'Test shows signs of flakiness based on historical patterns',
          prevention: [
            'Add proper wait conditions',
            'Improve test isolation',
            'Fix race conditions',
            'Use deterministic test data'
          ]
        });
      }

      // Performance degradation prediction
      if (testData.hasTimeouts || testData.complexity > 7) {
        const performanceRisk = this.calculatePerformanceRisk(testData);
        if (performanceRisk > 0.6) {
          issues.push({
            type: 'PERFORMANCE',
            probability: performanceRisk,
            severity: Priority.MEDIUM,
            description: 'Test may experience performance issues',
            prevention: [
              'Optimize test execution',
              'Reduce test complexity',
              'Use appropriate timeouts'
            ]
          });
        }
      }

      // Maintenance burden prediction
      const maintenanceRisk = this.calculateMaintenanceRisk(testData);
      if (maintenanceRisk > 0.5) {
        issues.push({
          type: 'MAINTENANCE',
          probability: maintenanceRisk,
          severity: Priority.LOW,
          description: 'Test may require frequent maintenance',
          prevention: [
            'Simplify test structure',
            'Reduce external dependencies',
            'Improve test documentation'
          ]
        });
      }

      return issues;
    } catch (error) {
      logger.error('Failed to predict issues', { error: error.message });
      return [];
    }
  }

  async generateQualityInsights(qualityData: any) {
    try {
      logger.info('Generating quality insights');

      const primaryConcerns = this.identifyPrimaryConcerns(qualityData);
      const quickWins = this.identifyQuickWins(qualityData);
      const longTermActions = this.identifyLongTermActions(qualityData);
      const prioritizedRecommendations = this.prioritizeRecommendations(qualityData);

      return {
        primaryConcerns,
        quickWins,
        longTermActions,
        prioritizedRecommendations,
        overallAssessment: this.generateOverallAssessment(qualityData)
      };
    } catch (error) {
      logger.error('Failed to generate quality insights', { error: error.message });
      throw new Error('Failed to generate quality insights');
    }
  }

  async compareTestQuality(qualityPredictions: QualityPrediction[]) {
    try {
      logger.info('Comparing test quality');

      const sorted = qualityPredictions.sort((a, b) => b.qualityScore - a.qualityScore);
      const bestTest = sorted[0].testId;
      const worstTest = sorted[sorted.length - 1].testId;
      const qualityGap = sorted[0].qualityScore - sorted[sorted.length - 1].qualityScore;
      
      const recommendations = this.generateComparisonRecommendations(sorted);

      return {
        bestTest,
        worstTest,
        qualityGap,
        averageQuality: sorted.reduce((sum, q) => sum + q.qualityScore, 0) / sorted.length,
        qualityDistribution: this.analyzeQualityDistribution(sorted),
        recommendations
      };
    } catch (error) {
      logger.error('Failed to compare test quality', { error: error.message });
      throw new Error('Failed to compare test quality');
    }
  }

  async trainQualityModel(trainingData: any[]) {
    try {
      logger.info('Training quality model', { dataPoints: trainingData.length });

      if (trainingData.length < 10) {
        throw new Error('Insufficient training data');
      }

      // Simplified model training simulation
      const features = this.extractFeatures(trainingData);
      const modelAccuracy = this.simulateModelTraining(features);
      const featureImportance = this.calculateFeatureImportance(features);
      const validationScore = this.validateModel(features);

      return {
        modelAccuracy,
        featureImportance,
        validationScore,
        trainingSize: trainingData.length,
        features: Object.keys(featureImportance)
      };
    } catch (error) {
      logger.error('Failed to train quality model', { error: error.message });
      throw new Error('Failed to train quality model');
    }
  }

  async updateQualityPrediction(testId: string, executionResults: any) {
    try {
      logger.info('Updating quality prediction with execution results');

      const currentPrediction = await this.predictTestQuality(testId);
      
      // Update prediction based on actual results
      const adjustmentFactor = this.calculateAdjustmentFactor(executionResults);
      const updatedScore = Math.max(0, Math.min(100, 
        currentPrediction.qualityScore * adjustmentFactor
      ));

      const updatedPrediction = {
        ...currentPrediction,
        qualityScore: updatedScore,
        confidence: Math.min(currentPrediction.confidence + 0.1, 1.0),
        historicalData: [
          ...currentPrediction.historicalData,
          this.createHistoricalDataPoint(executionResults)
        ]
      };

      return {
        updatedPrediction,
        confidence: updatedPrediction.confidence,
        adjustment: adjustmentFactor
      };
    } catch (error) {
      logger.error('Failed to update quality prediction', { error: error.message });
      throw new Error('Failed to update quality prediction');
    }
  }

  async processCIFeedback(ciData: any) {
    try {
      logger.info('Processing CI feedback');

      const updatedPredictions = await Promise.all(
        ciData.testResults.map(async (result: any) => {
          return await this.updateQualityPrediction(result.testId, result);
        })
      );

      const overallTrend = this.calculateOverallTrend(updatedPredictions);
      const insights = this.generateCIInsights(ciData, updatedPredictions);

      return {
        updatedPredictions,
        overallTrend,
        insights,
        buildQuality: this.calculateBuildQuality(ciData.testResults)
      };
    } catch (error) {
      logger.error('Failed to process CI feedback', { error: error.message });
      throw new Error('Failed to process CI feedback');
    }
  }

  // Private helper methods
  private extractTestMetrics(test: any, historicalRuns: any[]) {
    const durations = historicalRuns.map(run => run.duration || 0).filter(d => d > 0);
    const passRate = historicalRuns.length > 0 ? 
      historicalRuns.filter(run => run.passed).length / historicalRuns.length : 1;

    return {
      cyclomaticComplexity: test.complexity || 1,
      linesOfCode: this.estimateLinesOfCode(test.code),
      assertionCount: this.countAssertions(test.code),
      mockUsage: this.countMockUsage(test.code),
      setupComplexity: this.estimateSetupComplexity(test.setup),
      averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 100,
      passRate,
      hasTimeouts: (test.code || '').includes('timeout'),
      hasAsyncOperations: (test.code || '').includes('async') || (test.code || '').includes('await'),
      lastUpdated: new Date(test.updatedAt)
    };
  }

  private estimateLinesOfCode(code: string): number {
    return code ? code.split('\n').filter(line => line.trim().length > 0).length : 10;
  }

  private countAssertions(code: string): number {
    return code ? (code.match(/expect\(/g) || []).length : 1;
  }

  private countMockUsage(code: string): number {
    return code ? (code.match(/jest\.mock|mock\.|stub\./g) || []).length : 0;
  }

  private estimateSetupComplexity(setup: string): number {
    if (!setup) return 1;
    const lines = setup.split('\n').filter(line => line.trim().length > 0);
    return Math.min(lines.length, 10);
  }

  private calculateQualityScore(metrics: any): number {
    let score = 70; // Base score

    // Adjust for complexity
    if (metrics.cyclomaticComplexity <= 3) score += 10;
    else if (metrics.cyclomaticComplexity > 10) score -= 20;

    // Adjust for assertions
    if (metrics.assertionCount >= 3) score += 10;
    else if (metrics.assertionCount === 1) score -= 10;

    // Adjust for pass rate
    score += (metrics.passRate - 0.8) * 50;

    // Adjust for performance
    if (metrics.averageDuration < 100) score += 5;
    else if (metrics.averageDuration > 1000) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  private calculateConfidence(historicalRunsCount: number, metrics: any): number {
    let confidence = 0.3; // Base confidence

    if (historicalRunsCount >= 10) confidence += 0.4;
    else if (historicalRunsCount >= 5) confidence += 0.2;

    if (metrics.cyclomaticComplexity <= 5) confidence += 0.1;
    if (metrics.assertionCount >= 2) confidence += 0.1;
    if (metrics.passRate > 0.9) confidence += 0.1;

    if (historicalRunsCount === 0) {
      confidence = 0.3;
    }

    return Math.min(confidence, 1.0);
  }

  private generateQualityRecommendations(qualityScore: number, riskFactors: RiskFactor[]): string[] {
    const recommendations: string[] = [];

    if (qualityScore >= 85) {
      recommendations.push('Excellent test quality');
    } else if (qualityScore < 50) {
      recommendations.push('Test requires significant improvement');
    }

    if (riskFactors.some(rf => rf.category === 'COMPLEXITY')) {
      recommendations.push('Reduce test complexity by breaking into smaller tests');
    }

    if (riskFactors.some(rf => rf.category === 'ASSERTION_QUALITY')) {
      recommendations.push('Add more specific and comprehensive assertions');
    }

    if (riskFactors.length === 0) {
      recommendations.push('Well-structured test with good quality indicators');
    }

    if (recommendations.length === 0) {
      recommendations.push('Insufficient historical data for detailed recommendations');
    }

    return recommendations;
  }

  private convertToHistoricalQuality(runs: any[]): HistoricalQuality[] {
    return runs.map(run => ({
      timestamp: new Date(run.timestamp),
      qualityScore: run.passed ? 85 : 30,
      testsPassed: run.passed ? 1 : 0,
      testsFailed: run.passed ? 0 : 1,
      coverage: run.coverage || 80,
      issues: run.passed ? 0 : 1
    }));
  }

  private calculateFlakinessScore(historicalRuns: any[]): number {
    if (historicalRuns.length < 3) return 0;

    const recentRuns = historicalRuns.slice(0, 10);
    let flipCount = 0;
    
    for (let i = 1; i < recentRuns.length; i++) {
      if (recentRuns[i].passed !== recentRuns[i-1].passed) {
        flipCount++;
      }
    }

    return flipCount / (recentRuns.length - 1);
  }

  private calculateQualityTrend(historicalData: HistoricalQuality[]): number {
    if (historicalData.length < 2) return 0;

    const recent = historicalData.slice(0, 3);
    const older = historicalData.slice(-3);

    const recentAvg = recent.reduce((sum, h) => sum + h.qualityScore, 0) / recent.length;
    const olderAvg = older.reduce((sum, h) => sum + h.qualityScore, 0) / older.length;

    return ((recentAvg - olderAvg) / olderAvg) * 100;
  }

  private calculateOverallQuality(testQualities: any[]): number {
    if (testQualities.length === 0) return 0;
    return testQualities.reduce((sum, tq) => sum + tq.qualityScore, 0) / testQualities.length;
  }

  private analyzeRiskDistribution(testQualities: any[]) {
    const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
    
    testQualities.forEach(tq => {
      if (tq.qualityScore >= 80) distribution.low++;
      else if (tq.qualityScore >= 60) distribution.medium++;
      else if (tq.qualityScore >= 40) distribution.high++;
      else distribution.critical++;
    });

    return distribution;
  }

  private identifyProblematicTests(testQualities: any[]): string[] {
    return testQualities
      .filter(tq => tq.qualityScore < 60 || tq.flakyScore > 0.5)
      .map(tq => tq.testId);
  }

  private generateSuiteRecommendations(testQualities: any[], problematicTests: string[]): string[] {
    const recommendations: string[] = [];

    if (problematicTests.length > 0) {
      recommendations.push(`Review ${problematicTests.length} problematic tests`);
    }

    const avgQuality = this.calculateOverallQuality(testQualities);
    if (avgQuality < 70) {
      recommendations.push('Suite quality below acceptable threshold');
    }

    const flakyTests = testQualities.filter(tq => tq.flakyScore > 0.3);
    if (flakyTests.length > 0) {
      recommendations.push(`Address flakiness in ${flakyTests.length} tests`);
    }

    return recommendations;
  }

  private calculatePerformanceRisk(testData: any): number {
    let risk = 0;

    if (testData.complexity > 7) risk += 0.3;
    if (testData.hasTimeouts) risk += 0.4;
    if (testData.hasAsyncOperations) risk += 0.2;

    const avgDuration = testData.historicalRuns.reduce((sum: number, run: any) => 
      sum + (run.duration || 0), 0) / testData.historicalRuns.length;
    
    if (avgDuration > 3000) risk += 0.3;

    return Math.min(risk, 1.0);
  }

  private calculateMaintenanceRisk(testData: any): number {
    let risk = 0;

    const daysSinceUpdate = testData.lastUpdated ? 
      (Date.now() - new Date(testData.lastUpdated).getTime()) / (1000 * 60 * 60 * 24) : 0;

    if (daysSinceUpdate > 180) risk += 0.4;
    if (testData.dependencyCount > 10) risk += 0.3;
    if (testData.hasDeprecatedApis) risk += 0.4;

    return Math.min(risk, 1.0);
  }

  private identifyPrimaryConcerns(qualityData: any): string[] {
    const concerns: string[] = [];

    if (qualityData.qualityScore < 50) {
      concerns.push('Low overall test quality');
    }

    qualityData.riskFactors?.forEach((rf: any) => {
      if (rf.level === Priority.CRITICAL || rf.level === Priority.HIGH) {
        concerns.push(rf.description);
      }
    });

    return concerns;
  }

  private identifyQuickWins(qualityData: any): string[] {
    const quickWins: string[] = [];

    qualityData.riskFactors?.forEach((rf: any) => {
      if (rf.category === 'ASSERTION_QUALITY') {
        quickWins.push('Add more specific assertions');
      }
    });

    if (qualityData.coverage > 80 && qualityData.qualityScore < 70) {
      quickWins.push('Focus on test logic quality rather than coverage');
    }

    return quickWins;
  }

  private identifyLongTermActions(qualityData: any): string[] {
    const actions: string[] = [];

    if (qualityData.complexity > 8) {
      actions.push('Refactor complex tests into simpler, more focused tests');
    }

    if (qualityData.historicalTrend === 'DECLINING') {
      actions.push('Establish regular test quality reviews');
    }

    return actions;
  }

  private prioritizeRecommendations(qualityData: any): string[] {
    const all: Array<{rec: string, priority: number}> = [];

    qualityData.riskFactors?.forEach((rf: any) => {
      rf.mitigation.forEach((mitigation: string) => {
        const priority = rf.level === Priority.CRITICAL ? 4 : 
                        rf.level === Priority.HIGH ? 3 :
                        rf.level === Priority.MEDIUM ? 2 : 1;
        all.push({ rec: mitigation, priority });
      });
    });

    return all.sort((a, b) => b.priority - a.priority).map(item => item.rec);
  }

  private generateOverallAssessment(qualityData: any): string {
    if (qualityData.qualityScore >= 85) {
      return 'Excellent test quality with minimal risk factors';
    } else if (qualityData.qualityScore >= 70) {
      return 'Good test quality with some areas for improvement';
    } else if (qualityData.qualityScore >= 50) {
      return 'Moderate test quality requiring attention';
    } else {
      return 'Poor test quality requiring immediate improvement';
    }
  }

  private analyzeQualityDistribution(predictions: QualityPrediction[]) {
    const buckets = { excellent: 0, good: 0, fair: 0, poor: 0 };
    
    predictions.forEach(p => {
      if (p.qualityScore >= 85) buckets.excellent++;
      else if (p.qualityScore >= 70) buckets.good++;
      else if (p.qualityScore >= 50) buckets.fair++;
      else buckets.poor++;
    });

    return buckets;
  }

  private generateComparisonRecommendations(sortedPredictions: QualityPrediction[]): string[] {
    const recommendations = [];
    const poor = sortedPredictions.filter(p => p.qualityScore < 60);
    
    if (poor.length > 0) {
      recommendations.push(`Focus on improving ${poor.length} low-quality tests`);
    }

    const highVariance = sortedPredictions[0].qualityScore - sortedPredictions[sortedPredictions.length - 1].qualityScore;
    if (highVariance > 40) {
      recommendations.push('High quality variance - establish consistent testing standards');
    }

    return recommendations;
  }

  private extractFeatures(trainingData: any[]) {
    return trainingData.reduce((features, data) => {
      Object.keys(data.features).forEach(key => {
        if (!features[key]) features[key] = [];
        features[key].push(data.features[key]);
      });
      return features;
    }, {} as Record<string, number[]>);
  }

  private simulateModelTraining(features: Record<string, number[]>): number {
    // Simulate model accuracy based on feature quality
    const featureCount = Object.keys(features).length;
    const dataQuality = Math.min(featureCount / 5, 1); // Normalize feature count
    return 0.7 + (dataQuality * 0.25); // 70-95% accuracy range
  }

  private calculateFeatureImportance(features: Record<string, number[]>) {
    const importance: Record<string, number> = {};
    const featureKeys = Object.keys(features);
    
    featureKeys.forEach((key, index) => {
      // Simulate feature importance
      importance[key] = (featureKeys.length - index) / featureKeys.length;
    });

    return importance;
  }

  private validateModel(features: Record<string, number[]>): number {
    // Simulate cross-validation score
    return 0.8 + Math.random() * 0.15; // 80-95% validation score
  }

  private calculateAdjustmentFactor(executionResults: any): number {
    let factor = 1.0;

    if (executionResults.passed) {
      factor += 0.05;
    } else {
      factor -= 0.1;
    }

    if (executionResults.duration < 200) {
      factor += 0.02;
    } else if (executionResults.duration > 2000) {
      factor -= 0.05;
    }

    return Math.max(0.5, Math.min(1.5, factor));
  }

  private createHistoricalDataPoint(executionResults: any): HistoricalQuality {
    return {
      timestamp: new Date(),
      qualityScore: executionResults.passed ? 85 : 40,
      testsPassed: executionResults.passed ? 1 : 0,
      testsFailed: executionResults.passed ? 0 : 1,
      coverage: executionResults.coverage || 80,
      issues: executionResults.passed ? 0 : 1
    };
  }

  private calculateOverallTrend(updatedPredictions: any[]): string {
    const improvements = updatedPredictions.filter(p => p.adjustment > 1).length;
    const degradations = updatedPredictions.filter(p => p.adjustment < 1).length;

    if (improvements > degradations) return 'IMPROVING';
    if (degradations > improvements) return 'DECLINING';
    return 'STABLE';
  }

  private generateCIInsights(ciData: any, predictions: any[]) {
    return {
      buildQuality: this.calculateBuildQuality(ciData.testResults),
      riskTests: predictions.filter(p => p.updatedPrediction.qualityScore < 60).length,
      recommendations: [
        'Monitor failing tests for patterns',
        'Address consistently failing tests',
        'Review test quality for new code'
      ]
    };
  }

  private calculateBuildQuality(testResults: any[]): number {
    if (testResults.length === 0) return 100;
    
    const passed = testResults.filter(t => t.passed).length;
    return (passed / testResults.length) * 100;
  }
}