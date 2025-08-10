import * as fs from 'fs';
import * as path from 'path';

/**
 * Comprehensive test reporter for integration tests
 * Generates detailed reports with metrics, coverage, and performance data
 */
export class IntegrationTestReporter {
  private testResults: any[] = [];
  private coverageData: any = {};
  private performanceMetrics: any[] = [];
  private startTime: number;
  private endTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Add test result
   */
  addTestResult(testSuite: string, testName: string, result: {
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    error?: string;
    details?: any;
  }): void {
    this.testResults.push({
      testSuite,
      testName,
      ...result,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Add coverage data
   */
  addCoverageData(coverage: any): void {
    this.coverageData = { ...this.coverageData, ...coverage };
  }

  /**
   * Add performance metric
   */
  addPerformanceMetric(metric: {
    name: string;
    value: number;
    unit: string;
    threshold?: number;
    passed?: boolean;
    details?: any;
  }): void {
    this.performanceMetrics.push({
      ...metric,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Generate comprehensive test report
   */
  generateReport(): {
    summary: any;
    testResults: any[];
    coverage: any;
    performance: any;
    recommendations: string[];
  } {
    this.endTime = Date.now();

    const summary = this.generateSummary();
    const coverage = this.analyzeCoverage();
    const performance = this.analyzePerformance();
    const recommendations = this.generateRecommendations();

    return {
      summary,
      testResults: this.testResults,
      coverage,
      performance,
      recommendations
    };
  }

  /**
   * Generate test summary
   */
  private generateSummary(): any {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'passed').length;
    const failedTests = this.testResults.filter(r => r.status === 'failed').length;
    const skippedTests = this.testResults.filter(r => r.status === 'skipped').length;
    
    const totalDuration = this.endTime - this.startTime;
    const avgTestDuration = totalTests > 0 ? 
      this.testResults.reduce((sum, r) => sum + r.duration, 0) / totalTests : 0;

    // Test suite breakdown
    const suiteBreakdown = this.testResults.reduce((acc, result) => {
      if (!acc[result.testSuite]) {
        acc[result.testSuite] = { passed: 0, failed: 0, skipped: 0, duration: 0 };
      }
      acc[result.testSuite][result.status]++;
      acc[result.testSuite].duration += result.duration;
      return acc;
    }, {} as any);

    return {
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      successRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
      totalDuration,
      avgTestDuration,
      suiteBreakdown,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date(this.endTime).toISOString()
    };
  }

  /**
   * Analyze coverage data
   */
  private analyzeCoverage(): any {
    if (!this.coverageData || Object.keys(this.coverageData).length === 0) {
      return {
        overall: { lines: 0, functions: 0, branches: 0, statements: 0 },
        byModule: {},
        recommendations: ['No coverage data available']
      };
    }

    // Extract overall coverage
    const overall = this.coverageData.total || {};
    
    // Coverage by module/file
    const byModule = Object.keys(this.coverageData)
      .filter(key => key !== 'total')
      .reduce((acc, key) => {
        acc[key] = this.coverageData[key];
        return acc;
      }, {} as any);

    // Coverage recommendations
    const recommendations = this.generateCoverageRecommendations(overall, byModule);

    return {
      overall,
      byModule,
      recommendations
    };
  }

  /**
   * Analyze performance metrics
   */
  private analyzePerformance(): any {
    if (this.performanceMetrics.length === 0) {
      return {
        summary: { totalMetrics: 0, passedThresholds: 0, failedThresholds: 0 },
        metrics: [],
        recommendations: ['No performance metrics collected']
      };
    }

    const totalMetrics = this.performanceMetrics.length;
    const passedThresholds = this.performanceMetrics.filter(m => m.passed === true).length;
    const failedThresholds = this.performanceMetrics.filter(m => m.passed === false).length;

    // Group metrics by category
    const metricsByCategory = this.performanceMetrics.reduce((acc, metric) => {
      const category = this.categorizeMetric(metric.name);
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(metric);
      return acc;
    }, {} as any);

    // Performance trends
    const trends = this.analyzePerformanceTrends();

    const recommendations = this.generatePerformanceRecommendations(metricsByCategory);

    return {
      summary: {
        totalMetrics,
        passedThresholds,
        failedThresholds,
        thresholdSuccessRate: totalMetrics > 0 ? (passedThresholds / totalMetrics) * 100 : 0
      },
      metricsByCategory,
      trends,
      recommendations
    };
  }

  /**
   * Generate overall recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Test success recommendations
    const failedTests = this.testResults.filter(r => r.status === 'failed');
    if (failedTests.length > 0) {
      recommendations.push(`Address ${failedTests.length} failing tests to improve reliability`);
      
      const frequentFailures = this.identifyFrequentFailures();
      if (frequentFailures.length > 0) {
        recommendations.push(`Focus on fixing frequent failures: ${frequentFailures.join(', ')}`);
      }
    }

    // Performance recommendations
    const slowTests = this.testResults.filter(r => r.duration > 5000); // 5 seconds
    if (slowTests.length > 0) {
      recommendations.push(`Optimize ${slowTests.length} slow tests for better CI/CD performance`);
    }

    // Coverage recommendations
    if (this.coverageData.total) {
      const { lines, functions, branches } = this.coverageData.total;
      if (lines?.pct < 80) {
        recommendations.push(`Increase line coverage from ${lines.pct}% to at least 80%`);
      }
      if (functions?.pct < 85) {
        recommendations.push(`Increase function coverage from ${functions.pct}% to at least 85%`);
      }
      if (branches?.pct < 75) {
        recommendations.push(`Increase branch coverage from ${branches.pct}% to at least 75%`);
      }
    }

    // Integration-specific recommendations
    const integrationIssues = this.identifyIntegrationIssues();
    recommendations.push(...integrationIssues);

    return recommendations;
  }

  /**
   * Generate coverage recommendations
   */
  private generateCoverageRecommendations(overall: any, byModule: any): string[] {
    const recommendations: string[] = [];

    // Overall coverage recommendations
    if (overall.lines?.pct < 80) {
      recommendations.push(`Increase overall line coverage to 80% (currently ${overall.lines.pct}%)`);
    }

    // Module-specific recommendations
    Object.keys(byModule).forEach(moduleName => {
      const moduleCoverage = byModule[moduleName];
      if (moduleCoverage.lines?.pct < 70) {
        recommendations.push(`Module ${moduleName} needs more test coverage (${moduleCoverage.lines.pct}% lines)`);
      }
    });

    // Integration coverage
    const integrationModules = Object.keys(byModule).filter(name => 
      name.includes('integration') || name.includes('service')
    );
    
    const lowCoverageIntegration = integrationModules.filter(name => 
      byModule[name].lines?.pct < 85
    );

    if (lowCoverageIntegration.length > 0) {
      recommendations.push(`Critical integration modules need higher coverage: ${lowCoverageIntegration.join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Generate performance recommendations
   */
  private generatePerformanceRecommendations(metricsByCategory: any): string[] {
    const recommendations: string[] = [];

    // Database performance
    if (metricsByCategory.database) {
      const slowDbOperations = metricsByCategory.database.filter((m: any) => 
        m.value > 1000 && m.unit === 'ms'
      );
      if (slowDbOperations.length > 0) {
        recommendations.push(`Optimize slow database operations: ${slowDbOperations.map((m: any) => m.name).join(', ')}`);
      }
    }

    // API performance
    if (metricsByCategory.api) {
      const slowApiCalls = metricsByCategory.api.filter((m: any) => 
        m.value > 2000 && m.unit === 'ms'
      );
      if (slowApiCalls.length > 0) {
        recommendations.push(`Optimize slow API endpoints: ${slowApiCalls.map((m: any) => m.name).join(', ')}`);
      }
    }

    // Memory usage
    if (metricsByCategory.memory) {
      const highMemoryUsage = metricsByCategory.memory.filter((m: any) => 
        m.value > 500 && m.unit === 'MB'
      );
      if (highMemoryUsage.length > 0) {
        recommendations.push(`Investigate high memory usage in: ${highMemoryUsage.map((m: any) => m.name).join(', ')}`);
      }
    }

    return recommendations;
  }

  /**
   * Categorize performance metric
   */
  private categorizeMetric(metricName: string): string {
    if (metricName.includes('database') || metricName.includes('db') || metricName.includes('query')) {
      return 'database';
    }
    if (metricName.includes('api') || metricName.includes('graphql') || metricName.includes('endpoint')) {
      return 'api';
    }
    if (metricName.includes('memory') || metricName.includes('heap')) {
      return 'memory';
    }
    if (metricName.includes('cpu') || metricName.includes('processing')) {
      return 'cpu';
    }
    if (metricName.includes('network') || metricName.includes('connection')) {
      return 'network';
    }
    return 'general';
  }

  /**
   * Analyze performance trends
   */
  private analyzePerformanceTrends(): any {
    // This would typically compare against historical data
    // For now, we'll analyze current metrics
    const trends = {
      improving: 0,
      degrading: 0,
      stable: 0
    };

    // In a real implementation, this would compare against historical benchmarks
    this.performanceMetrics.forEach(metric => {
      if (metric.passed === true) {
        trends.improving++;
      } else if (metric.passed === false) {
        trends.degrading++;
      } else {
        trends.stable++;
      }
    });

    return trends;
  }

  /**
   * Identify frequent test failures
   */
  private identifyFrequentFailures(): string[] {
    const failuresByTest = this.testResults
      .filter(r => r.status === 'failed')
      .reduce((acc, result) => {
        const key = `${result.testSuite}:${result.testName}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as any);

    return Object.keys(failuresByTest)
      .filter(testKey => failuresByTest[testKey] > 1)
      .sort((a, b) => failuresByTest[b] - failuresByTest[a])
      .slice(0, 5); // Top 5 most frequent failures
  }

  /**
   * Identify integration-specific issues
   */
  private identifyIntegrationIssues(): string[] {
    const issues: string[] = [];

    // Check for cross-module test failures
    const crossModuleFailures = this.testResults.filter(r => 
      r.status === 'failed' && r.testSuite.includes('cross-module')
    );
    if (crossModuleFailures.length > 0) {
      issues.push('Cross-module integration tests are failing - check module interfaces');
    }

    // Check for database integration issues
    const dbFailures = this.testResults.filter(r => 
      r.status === 'failed' && (
        r.testSuite.includes('database') || 
        r.error?.includes('neo4j') ||
        r.error?.includes('connection')
      )
    );
    if (dbFailures.length > 0) {
      issues.push('Database integration issues detected - check connection configuration');
    }

    // Check for API integration issues
    const apiFailures = this.testResults.filter(r => 
      r.status === 'failed' && (
        r.testSuite.includes('api') || 
        r.error?.includes('graphql') ||
        r.error?.includes('endpoint')
      )
    );
    if (apiFailures.length > 0) {
      issues.push('API integration issues detected - check resolver implementations');
    }

    // Check for real-time integration issues
    const realtimeFailures = this.testResults.filter(r => 
      r.status === 'failed' && (
        r.testSuite.includes('realtime') || 
        r.error?.includes('websocket')
      )
    );
    if (realtimeFailures.length > 0) {
      issues.push('Real-time integration issues detected - check WebSocket configuration');
    }

    return issues;
  }

  /**
   * Export report to file
   */
  async exportReport(outputDir: string = './test-reports'): Promise<void> {
    const report = this.generateReport();
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Export JSON report
    const jsonPath = path.join(outputDir, `integration-test-report-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // Export HTML report
    const htmlPath = path.join(outputDir, `integration-test-report-${timestamp}.html`);
    const htmlContent = this.generateHTMLReport(report);
    fs.writeFileSync(htmlPath, htmlContent);

    // Export summary markdown
    const mdPath = path.join(outputDir, `integration-test-summary-${timestamp}.md`);
    const mdContent = this.generateMarkdownSummary(report);
    fs.writeFileSync(mdPath, mdContent);

    console.log(`Integration test reports exported:`);
    console.log(`- JSON: ${jsonPath}`);
    console.log(`- HTML: ${htmlPath}`);
    console.log(`- Markdown: ${mdPath}`);
  }

  /**
   * Generate HTML report
   */
  private generateHTMLReport(report: any): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LANKA Integration Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; justify-content: space-around; margin: 20px 0; }
        .metric { text-align: center; padding: 10px; }
        .metric .number { font-size: 2em; font-weight: bold; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .section { margin: 30px 0; }
        .test-result { padding: 10px; margin: 5px 0; border-left: 4px solid #ccc; }
        .test-passed { border-left-color: #28a745; }
        .test-failed { border-left-color: #dc3545; background: #f8f8f8; }
        .recommendations { background: #e7f3ff; padding: 15px; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
        th { background: #f5f5f5; }
        .progress-bar { background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(to right, #28a745, #20c997); }
    </style>
</head>
<body>
    <div class="header">
        <h1>LANKA Integration Test Report</h1>
        <p>Generated on: ${new Date().toISOString()}</p>
        <p>Test Duration: ${Math.round(report.summary.totalDuration / 1000)}s</p>
    </div>

    <div class="summary">
        <div class="metric">
            <div class="number passed">${report.summary.passedTests}</div>
            <div>Passed</div>
        </div>
        <div class="metric">
            <div class="number failed">${report.summary.failedTests}</div>
            <div>Failed</div>
        </div>
        <div class="metric">
            <div class="number skipped">${report.summary.skippedTests}</div>
            <div>Skipped</div>
        </div>
        <div class="metric">
            <div class="number">${report.summary.successRate.toFixed(1)}%</div>
            <div>Success Rate</div>
        </div>
    </div>

    <div class="section">
        <h2>Coverage Summary</h2>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${report.coverage.overall.lines?.pct || 0}%"></div>
        </div>
        <p>Line Coverage: ${report.coverage.overall.lines?.pct || 0}%</p>
        <table>
            <tr>
                <th>Metric</th>
                <th>Covered</th>
                <th>Total</th>
                <th>Percentage</th>
            </tr>
            <tr>
                <td>Lines</td>
                <td>${report.coverage.overall.lines?.covered || 0}</td>
                <td>${report.coverage.overall.lines?.total || 0}</td>
                <td>${report.coverage.overall.lines?.pct || 0}%</td>
            </tr>
            <tr>
                <td>Functions</td>
                <td>${report.coverage.overall.functions?.covered || 0}</td>
                <td>${report.coverage.overall.functions?.total || 0}</td>
                <td>${report.coverage.overall.functions?.pct || 0}%</td>
            </tr>
            <tr>
                <td>Branches</td>
                <td>${report.coverage.overall.branches?.covered || 0}</td>
                <td>${report.coverage.overall.branches?.total || 0}</td>
                <td>${report.coverage.overall.branches?.pct || 0}%</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <h2>Test Results by Suite</h2>
        ${Object.keys(report.summary.suiteBreakdown).map(suite => `
            <div class="test-result ${report.summary.suiteBreakdown[suite].failed > 0 ? 'test-failed' : 'test-passed'}">
                <strong>${suite}</strong><br>
                Passed: ${report.summary.suiteBreakdown[suite].passed}, 
                Failed: ${report.summary.suiteBreakdown[suite].failed}, 
                Duration: ${Math.round(report.summary.suiteBreakdown[suite].duration)}ms
            </div>
        `).join('')}
    </div>

    <div class="section recommendations">
        <h2>Recommendations</h2>
        <ul>
            ${report.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
</body>
</html>
    `;
  }

  /**
   * Generate markdown summary
   */
  private generateMarkdownSummary(report: any): string {
    return `
# LANKA Integration Test Summary

**Generated:** ${new Date().toISOString()}  
**Duration:** ${Math.round(report.summary.totalDuration / 1000)}s  
**Success Rate:** ${report.summary.successRate.toFixed(1)}%

## Test Results

| Status | Count |
|--------|-------|
| ✅ Passed | ${report.summary.passedTests} |
| ❌ Failed | ${report.summary.failedTests} |
| ⏭️ Skipped | ${report.summary.skippedTests} |
| **Total** | **${report.summary.totalTests}** |

## Coverage Summary

| Metric | Coverage |
|--------|----------|
| Lines | ${report.coverage.overall.lines?.pct || 0}% |
| Functions | ${report.coverage.overall.functions?.pct || 0}% |
| Branches | ${report.coverage.overall.branches?.pct || 0}% |
| Statements | ${report.coverage.overall.statements?.pct || 0}% |

## Performance Metrics

- **Total Metrics:** ${report.performance.summary.totalMetrics}
- **Passed Thresholds:** ${report.performance.summary.passedThresholds}
- **Failed Thresholds:** ${report.performance.summary.failedThresholds}
- **Threshold Success Rate:** ${report.performance.summary.thresholdSuccessRate.toFixed(1)}%

## Recommendations

${report.recommendations.map((rec: string) => `- ${rec}`).join('\n')}

## Test Suite Breakdown

${Object.keys(report.summary.suiteBreakdown).map(suite => {
  const breakdown = report.summary.suiteBreakdown[suite];
  const status = breakdown.failed > 0 ? '❌' : '✅';
  return `### ${status} ${suite}
- Passed: ${breakdown.passed}
- Failed: ${breakdown.failed}
- Skipped: ${breakdown.skipped}
- Duration: ${Math.round(breakdown.duration)}ms`;
}).join('\n\n')}
    `.trim();
  }
}

// Export singleton instance for global use
export const testReporter = new IntegrationTestReporter();