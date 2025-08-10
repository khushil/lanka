"use strict";
/**
 * Coverage Analyzer Service
 * Analyzes test coverage and identifies coverage gaps
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoverageAnalyzerService = void 0;
const logger_1 = require("../../../core/logging/logger");
const development_types_1 = require("../types/development.types");
class CoverageAnalyzerService {
    neo4j;
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async analyzeCoverage(coverage, threshold) {
        try {
            logger_1.logger.info('Analyzing coverage data');
            this.validateCoverageData(coverage);
            this.validateThreshold(threshold);
            const gaps = this.identifyGaps(coverage, threshold);
            const summary = this.generateSummary(coverage, threshold);
            const recommendations = this.generateRecommendations(gaps, coverage);
            return {
                gaps,
                summary,
                recommendations,
                coverageScore: coverage.overall,
                thresholdsMet: this.checkThresholdsMet(coverage, threshold)
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to analyze coverage', { error: error.message });
            throw new Error('Failed to analyze coverage');
        }
    }
    async identifyUncoveredPaths(sourceCode, existingTests) {
        try {
            logger_1.logger.info('Identifying uncovered paths');
            const codeAnalysis = this.analyzeCodePaths(sourceCode);
            const testedPaths = this.analyzedTestedPaths(existingTests);
            const uncoveredPaths = this.findUncoveredPaths(codeAnalysis, testedPaths);
            return {
                uncoveredPaths,
                totalPaths: codeAnalysis.length,
                coveragePercentage: ((codeAnalysis.length - uncoveredPaths.length) / codeAnalysis.length) * 100
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to identify uncovered paths', { error: error.message });
            throw new Error('Failed to identify uncovered paths');
        }
    }
    async analyzeBranchCoverage(sourceCode, testCoverage) {
        try {
            logger_1.logger.info('Analyzing branch coverage');
            const branches = this.extractBranches(sourceCode);
            const coveredBranches = testCoverage.coveredBranches || [];
            const uncoveredBranches = testCoverage.uncoveredBranches || [];
            const totalBranches = branches.length;
            const covered = coveredBranches.length;
            const uncovered = uncoveredBranches.length;
            return {
                totalBranches,
                coveredBranches: covered,
                uncoveredBranches: uncovered,
                branchCoveragePercentage: totalBranches > 0 ? (covered / totalBranches) * 100 : 0,
                missingBranches: this.identifyMissingBranches(branches, coveredBranches),
                criticalUncovered: this.identifyCriticalUncoveredBranches(uncoveredBranches)
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to analyze branch coverage', { error: error.message });
            throw new Error('Failed to analyze branch coverage');
        }
    }
    async calculateCoverageMetrics(coverage) {
        try {
            logger_1.logger.info('Calculating coverage metrics');
            const weightedScore = this.calculateWeightedScore(coverage);
            const qualityGrade = this.assignQualityGrade(weightedScore);
            const improvementAreas = this.identifyImprovementAreas(coverage);
            const strengths = this.identifyStrengths(coverage);
            return {
                weightedScore,
                qualityGrade,
                improvementAreas,
                strengths,
                breakdown: {
                    statements: coverage.statements.percentage,
                    branches: coverage.branches.percentage,
                    functions: coverage.functions.percentage,
                    lines: coverage.lines.percentage
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to calculate coverage metrics', { error: error.message });
            throw new Error('Failed to calculate coverage metrics');
        }
    }
    async generateCoverageReport(testSuiteId) {
        try {
            logger_1.logger.info('Generating coverage report', { testSuiteId });
            const query = `
        MATCH (suite:TestSuite {id: $testSuiteId})
        OPTIONAL MATCH (suite)-[:CONTAINS]->(test:TestCase)
        RETURN suite, collect(test) as testCases
      `;
            const result = await this.neo4j.query(query, { testSuiteId });
            if (!result.length) {
                throw new Error('Test suite not found');
            }
            const suite = result[0].suite.properties;
            const testCases = result[0].testCases.map((tc) => tc.properties);
            const coverage = suite.coverage || this.createDefaultCoverage();
            const metrics = await this.calculateCoverageMetrics(coverage);
            const gaps = this.identifyGaps(coverage, {
                statements: 80,
                branches: 75,
                functions: 85,
                lines: 80
            });
            return {
                summary: {
                    testSuite: suite.name,
                    totalTests: testCases.length,
                    coverage: coverage.overall,
                    status: this.getCoverageStatus(coverage.overall)
                },
                gaps,
                recommendations: this.generateDetailedRecommendations(gaps, coverage),
                testCaseContributions: this.analyzeTestCaseContributions(testCases),
                trendAnalysis: await this.generateTrendAnalysis(testSuiteId),
                metrics
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to generate coverage report', { error: error.message });
            throw new Error('Failed to generate coverage report');
        }
    }
    async trackCoverageTrends(testSuiteId, days) {
        try {
            logger_1.logger.info('Tracking coverage trends', { testSuiteId, days });
            const query = `
        MATCH (suite:TestSuite {id: $testSuiteId})-[:HAS_COVERAGE]->(cov:Coverage)
        WHERE cov.timestamp >= datetime() - duration({days: $days})
        RETURN cov
        ORDER BY cov.timestamp DESC
      `;
            const result = await this.neo4j.query(query, { testSuiteId, days });
            const dataPoints = result.map((r) => r.cov.properties);
            if (dataPoints.length < 2) {
                return {
                    trend: 'INSUFFICIENT_DATA',
                    changePercentage: 0,
                    dataPoints: [],
                    predictions: null,
                    alerts: []
                };
            }
            const trend = this.calculateTrend(dataPoints);
            const changePercentage = this.calculateChangePercentage(dataPoints);
            const predictions = this.generateTrendPredictions(dataPoints);
            const alerts = this.generateTrendAlerts(trend, changePercentage);
            return {
                trend,
                changePercentage,
                dataPoints,
                predictions,
                alerts
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to track coverage trends', { error: error.message });
            throw new Error('Failed to track coverage trends');
        }
    }
    async optimizeCoverageStrategy(currentCoverage, targetThreshold) {
        try {
            logger_1.logger.info('Optimizing coverage strategy');
            const gaps = this.identifyGaps(currentCoverage, targetThreshold);
            const prioritizedAreas = this.prioritizeCoverageAreas(gaps, currentCoverage);
            const strategies = this.generateOptimizationStrategies(prioritizedAreas);
            return {
                strategies: strategies.sort((a, b) => b.impact - a.impact),
                prioritizedAreas,
                estimatedEffort: this.calculateTotalEffort(strategies),
                expectedImpact: this.calculateExpectedImpact(strategies),
                timeline: this.generateImplementationTimeline(strategies)
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to optimize coverage strategy', { error: error.message });
            throw new Error('Failed to optimize coverage strategy');
        }
    }
    async normalizeFrameworkCoverage(frameworkData) {
        try {
            logger_1.logger.info('Normalizing framework coverage', { framework: frameworkData.framework });
            let normalizedCoverage;
            switch (frameworkData.framework) {
                case 'JEST':
                    normalizedCoverage = this.normalizeJestCoverage(frameworkData.coverage);
                    break;
                case 'MOCHA':
                    normalizedCoverage = this.normalizeMochaCoverage(frameworkData.coverage);
                    break;
                default:
                    normalizedCoverage = frameworkData.coverage;
            }
            return {
                normalized: true,
                coverage: normalizedCoverage,
                originalFramework: frameworkData.framework
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to normalize framework coverage', { error: error.message });
            throw new Error('Failed to normalize framework coverage');
        }
    }
    async integratePipelineCoverage(pipelineData) {
        try {
            logger_1.logger.info('Integrating pipeline coverage', { buildId: pipelineData.buildId });
            const baselineQuery = `
        MATCH (baseline:Coverage {branch: 'main'})
        RETURN baseline
        ORDER BY baseline.timestamp DESC
        LIMIT 1
      `;
            const baselineResult = await this.neo4j.query(baselineQuery);
            const baseline = baselineResult.length > 0 ? baselineResult[0].baseline.properties : null;
            const baselineDelta = baseline ? this.calculateDelta(pipelineData.coverage, baseline) : null;
            const qualityGate = this.evaluateQualityGate(pipelineData.coverage, baselineDelta);
            const recommendations = this.generatePipelineRecommendations(qualityGate, baselineDelta);
            return {
                baselineDelta,
                qualityGate,
                recommendations,
                pipelineMetrics: {
                    buildId: pipelineData.buildId,
                    branch: pipelineData.branch,
                    coverage: pipelineData.coverage.overall
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to integrate pipeline coverage', { error: error.message });
            throw new Error('Failed to integrate pipeline coverage');
        }
    }
    // Private helper methods
    validateCoverageData(coverage) {
        if (!coverage || typeof coverage.overall !== 'number') {
            throw new Error('Invalid coverage data');
        }
        if (coverage.statements.total < 0 || coverage.statements.percentage > 100) {
            throw new Error('Invalid coverage data');
        }
    }
    validateThreshold(threshold) {
        const values = Object.values(threshold);
        if (values.some(v => v < 0 || v > 100)) {
            throw new Error('Invalid threshold values');
        }
    }
    identifyGaps(coverage, threshold) {
        const gaps = [];
        if (coverage.statements.percentage < threshold.statements) {
            gaps.push({
                type: 'STATEMENT',
                location: { file: 'unknown', line: 0, column: 0 },
                reason: `Statement coverage ${coverage.statements.percentage.toFixed(1)}% below threshold ${threshold.statements}%`,
                priority: this.calculateGapPriority(coverage.statements.percentage, threshold.statements),
                suggestedTests: ['Add tests for uncovered statements']
            });
        }
        if (coverage.branches.percentage < threshold.branches) {
            gaps.push({
                type: 'BRANCH',
                location: { file: 'unknown', line: 0, column: 0 },
                reason: `Branch coverage ${coverage.branches.percentage.toFixed(1)}% below threshold ${threshold.branches}%`,
                priority: this.calculateGapPriority(coverage.branches.percentage, threshold.branches),
                suggestedTests: ['Add tests for uncovered branches', 'Test edge cases and error conditions']
            });
        }
        if (coverage.functions.percentage < threshold.functions) {
            gaps.push({
                type: 'FUNCTION',
                location: { file: 'unknown', line: 0, column: 0 },
                reason: `Function coverage ${coverage.functions.percentage.toFixed(1)}% below threshold ${threshold.functions}%`,
                priority: this.calculateGapPriority(coverage.functions.percentage, threshold.functions),
                suggestedTests: ['Add tests for untested functions']
            });
        }
        if (coverage.lines.percentage < threshold.lines) {
            gaps.push({
                type: 'LINE',
                location: { file: 'unknown', line: 0, column: 0 },
                reason: `Line coverage ${coverage.lines.percentage.toFixed(1)}% below threshold ${threshold.lines}%`,
                priority: this.calculateGapPriority(coverage.lines.percentage, threshold.lines),
                suggestedTests: ['Add tests for uncovered lines']
            });
        }
        return gaps;
    }
    calculateGapPriority(current, threshold) {
        const gap = threshold - current;
        if (gap > 20)
            return development_types_1.Priority.CRITICAL;
        if (gap > 10)
            return development_types_1.Priority.HIGH;
        if (gap > 5)
            return development_types_1.Priority.MEDIUM;
        return development_types_1.Priority.LOW;
    }
    generateSummary(coverage, threshold) {
        const status = this.getCoverageStatus(coverage.overall);
        const thresholdsMet = this.checkThresholdsMet(coverage, threshold);
        return {
            overall: coverage.overall,
            status,
            thresholdsMet,
            breakdown: {
                statements: `${coverage.statements.covered}/${coverage.statements.total} (${coverage.statements.percentage.toFixed(1)}%)`,
                branches: `${coverage.branches.covered}/${coverage.branches.total} (${coverage.branches.percentage.toFixed(1)}%)`,
                functions: `${coverage.functions.covered}/${coverage.functions.total} (${coverage.functions.percentage.toFixed(1)}%)`,
                lines: `${coverage.lines.covered}/${coverage.lines.total} (${coverage.lines.percentage.toFixed(1)}%)`
            }
        };
    }
    getCoverageStatus(overall) {
        if (overall >= 95)
            return 'EXCELLENT';
        if (overall >= 85)
            return 'GOOD';
        if (overall >= 70)
            return 'FAIR';
        if (overall >= 50)
            return 'POOR';
        return 'CRITICAL';
    }
    checkThresholdsMet(coverage, threshold) {
        return coverage.statements.percentage >= threshold.statements &&
            coverage.branches.percentage >= threshold.branches &&
            coverage.functions.percentage >= threshold.functions &&
            coverage.lines.percentage >= threshold.lines;
    }
    generateRecommendations(gaps, coverage) {
        const recommendations = [];
        if (gaps.length === 0) {
            recommendations.push('Excellent coverage achieved!');
            recommendations.push('Maintain current coverage levels');
            return recommendations;
        }
        const criticalGaps = gaps.filter(g => g.priority === development_types_1.Priority.CRITICAL);
        if (criticalGaps.length > 0) {
            recommendations.push('Address critical coverage gaps immediately');
        }
        const branchGaps = gaps.filter(g => g.type === 'BRANCH');
        if (branchGaps.length > 0) {
            recommendations.push('Focus on branch coverage - add tests for error handling and edge cases');
        }
        const statementGaps = gaps.filter(g => g.type === 'STATEMENT');
        if (statementGaps.length > 0) {
            recommendations.push('Improve statement coverage by testing more code paths');
        }
        recommendations.push('Review uncovered code for critical business logic');
        recommendations.push('Consider integration tests for better coverage');
        return recommendations;
    }
    analyzeCodePaths(sourceCode) {
        // Simplified code path analysis
        const paths = [];
        // Find if statements
        const ifMatches = sourceCode.match(/if\s*\([^)]+\)/g) || [];
        paths.push(...ifMatches.map(match => ({ type: 'CONDITIONAL', code: match })));
        // Find function declarations
        const funcMatches = sourceCode.match(/function\s+\w+|const\s+\w+\s*=/g) || [];
        paths.push(...funcMatches.map(match => ({ type: 'FUNCTION', code: match })));
        // Find error handling
        if (sourceCode.includes('throw new Error')) {
            paths.push({ type: 'ERROR_HANDLING', code: 'throw new Error' });
        }
        // Find dead code (simplified detection)
        if (sourceCode.includes('return') && sourceCode.split('return').length > 2) {
            paths.push({ type: 'DEAD_CODE', code: 'unreachable code after return' });
        }
        return paths;
    }
    analyzedTestedPaths(tests) {
        return tests.flatMap(test => {
            const paths = [];
            if (test.includes('expect'))
                paths.push('tested-path');
            return paths;
        });
    }
    findUncoveredPaths(allPaths, testedPaths) {
        return allPaths.filter(path => !testedPaths.includes('tested-path'));
    }
    extractBranches(sourceCode) {
        const branches = [];
        // Extract if-else branches
        const ifElseRegex = /if\s*\([^)]+\)\s*{[^}]*}(\s*else\s*{[^}]*})?/g;
        let match;
        while ((match = ifElseRegex.exec(sourceCode)) !== null) {
            branches.push({ type: 'if-else', code: match[0] });
        }
        // Extract switch cases
        const switchRegex = /case\s+[^:]+:/g;
        while ((match = switchRegex.exec(sourceCode)) !== null) {
            branches.push({ type: 'switch-case', code: match[0] });
        }
        return branches;
    }
    identifyMissingBranches(allBranches, coveredBranches) {
        return allBranches.filter(branch => !coveredBranches.some(covered => covered.includes(branch.type)));
    }
    identifyCriticalUncoveredBranches(uncoveredBranches) {
        return uncoveredBranches.filter(branch => branch.includes('error') || branch.includes('exception') || branch.includes('null'));
    }
    calculateWeightedScore(coverage) {
        // Weighted scoring: statements 30%, branches 30%, functions 25%, lines 15%
        return (coverage.statements.percentage * 0.30 +
            coverage.branches.percentage * 0.30 +
            coverage.functions.percentage * 0.25 +
            coverage.lines.percentage * 0.15);
    }
    assignQualityGrade(score) {
        if (score >= 95)
            return 'A+';
        if (score >= 90)
            return 'A';
        if (score >= 85)
            return 'B+';
        if (score >= 80)
            return 'B';
        if (score >= 75)
            return 'C+';
        if (score >= 70)
            return 'C';
        if (score >= 65)
            return 'D+';
        if (score >= 60)
            return 'D';
        return 'F';
    }
    identifyImprovementAreas(coverage) {
        const areas = [];
        const lowest = Math.min(coverage.statements.percentage, coverage.branches.percentage, coverage.functions.percentage, coverage.lines.percentage);
        if (coverage.statements.percentage === lowest)
            areas.push('STATEMENTS');
        if (coverage.branches.percentage === lowest)
            areas.push('BRANCHES');
        if (coverage.functions.percentage === lowest)
            areas.push('FUNCTIONS');
        if (coverage.lines.percentage === lowest)
            areas.push('LINES');
        return areas;
    }
    identifyStrengths(coverage) {
        const strengths = [];
        if (coverage.statements.percentage >= 90)
            strengths.push('STATEMENTS');
        if (coverage.branches.percentage >= 90)
            strengths.push('BRANCHES');
        if (coverage.functions.percentage >= 90)
            strengths.push('FUNCTIONS');
        if (coverage.lines.percentage >= 90)
            strengths.push('LINES');
        return strengths;
    }
    analyzeTestCaseContributions(testCases) {
        return testCases.map(tc => ({
            testId: tc.id,
            name: tc.name,
            coverageContribution: tc.coverage || 5, // Default 5% contribution
            criticalPaths: tc.criticalPaths || 0
        }));
    }
    async generateTrendAnalysis(testSuiteId) {
        // Simplified trend analysis
        return {
            trend: 'STABLE',
            periodChange: 0,
            volatility: 'LOW'
        };
    }
    generateDetailedRecommendations(gaps, coverage) {
        const recommendations = [];
        gaps.forEach(gap => {
            switch (gap.type) {
                case 'STATEMENT':
                    recommendations.push('Add unit tests to cover untested statements');
                    break;
                case 'BRANCH':
                    recommendations.push('Test error conditions and edge cases to improve branch coverage');
                    break;
                case 'FUNCTION':
                    recommendations.push('Ensure all functions have corresponding test cases');
                    break;
                case 'LINE':
                    recommendations.push('Review and test uncovered code lines');
                    break;
            }
        });
        if (coverage.uncoveredLines.length > 0) {
            recommendations.push(`Focus on lines: ${coverage.uncoveredLines.slice(0, 5).join(', ')}`);
        }
        return recommendations;
    }
    calculateTrend(dataPoints) {
        if (dataPoints.length < 2)
            return 'INSUFFICIENT_DATA';
        const first = dataPoints[dataPoints.length - 1].overall;
        const last = dataPoints[0].overall;
        const change = last - first;
        if (change > 5)
            return 'IMPROVING';
        if (change < -5)
            return 'DECLINING';
        return 'STABLE';
    }
    calculateChangePercentage(dataPoints) {
        if (dataPoints.length < 2)
            return 0;
        const first = dataPoints[dataPoints.length - 1].overall;
        const last = dataPoints[0].overall;
        return ((last - first) / first) * 100;
    }
    generateTrendPredictions(dataPoints) {
        // Simplified prediction based on linear trend
        if (dataPoints.length < 3)
            return null;
        const trend = this.calculateTrend(dataPoints);
        const avgChange = this.calculateChangePercentage(dataPoints) / dataPoints.length;
        return {
            nextWeek: dataPoints[0].overall + (avgChange * 7),
            confidence: 0.7
        };
    }
    generateTrendAlerts(trend, changePercentage) {
        const alerts = [];
        if (trend === 'DECLINING') {
            alerts.push('Coverage is declining - immediate attention required');
        }
        if (changePercentage < -10) {
            alerts.push('Significant coverage drop detected');
        }
        return alerts;
    }
    prioritizeCoverageAreas(gaps, coverage) {
        return gaps.map(gap => ({
            type: gap.type,
            priority: gap.priority,
            currentCoverage: this.getCurrentCoverageForType(gap.type, coverage),
            effort: this.estimateEffort(gap),
            impact: this.estimateImpact(gap)
        })).sort((a, b) => b.impact - a.effort);
    }
    getCurrentCoverageForType(type, coverage) {
        switch (type) {
            case 'STATEMENT': return coverage.statements.percentage;
            case 'BRANCH': return coverage.branches.percentage;
            case 'FUNCTION': return coverage.functions.percentage;
            case 'LINE': return coverage.lines.percentage;
            default: return 0;
        }
    }
    estimateEffort(gap) {
        // Effort estimation based on gap type and priority
        const baseEffort = 5;
        const priorityMultiplier = {
            [development_types_1.Priority.CRITICAL]: 3,
            [development_types_1.Priority.HIGH]: 2,
            [development_types_1.Priority.MEDIUM]: 1.5,
            [development_types_1.Priority.LOW]: 1
        };
        return baseEffort * priorityMultiplier[gap.priority];
    }
    estimateImpact(gap) {
        // Impact estimation
        const baseImpact = 5;
        const typeMultiplier = {
            'BRANCH': 3,
            'STATEMENT': 2,
            'FUNCTION': 2.5,
            'LINE': 1.5
        };
        return baseImpact * (typeMultiplier[gap.type] || 1);
    }
    generateOptimizationStrategies(areas) {
        return areas.map(area => ({
            area: area.type,
            priority: area.priority,
            description: `Improve ${area.type.toLowerCase()} coverage`,
            impact: area.impact,
            effort: area.effort,
            actions: this.generateActionsForArea(area.type)
        }));
    }
    generateActionsForArea(type) {
        switch (type) {
            case 'BRANCH':
                return [
                    'Add tests for error conditions',
                    'Test edge cases and boundary values',
                    'Add negative test cases'
                ];
            case 'STATEMENT':
                return [
                    'Add unit tests for uncovered code',
                    'Test all code paths',
                    'Add integration tests'
                ];
            case 'FUNCTION':
                return [
                    'Test all public functions',
                    'Add parameter validation tests',
                    'Test return value variations'
                ];
            default:
                return ['Add comprehensive tests'];
        }
    }
    calculateTotalEffort(strategies) {
        return strategies.reduce((total, strategy) => total + strategy.effort, 0);
    }
    calculateExpectedImpact(strategies) {
        return strategies.reduce((total, strategy) => total + strategy.impact, 0);
    }
    generateImplementationTimeline(strategies) {
        let weeks = 0;
        return strategies.map(strategy => ({
            strategy: strategy.area,
            startWeek: weeks,
            duration: Math.ceil(strategy.effort / 10), // Convert effort to weeks
            endWeek: weeks += Math.ceil(strategy.effort / 10)
        }));
    }
    normalizeJestCoverage(coverage) {
        // Jest coverage normalization
        return {
            statements: {
                total: coverage.statements?.total || 0,
                covered: coverage.statements?.covered || 0,
                percentage: coverage.statements?.pct || 0
            },
            branches: {
                total: coverage.branches?.total || 0,
                covered: coverage.branches?.covered || 0,
                percentage: coverage.branches?.pct || 0
            },
            functions: {
                total: coverage.functions?.total || 0,
                covered: coverage.functions?.covered || 0,
                percentage: coverage.functions?.pct || 0
            },
            lines: {
                total: coverage.lines?.total || 0,
                covered: coverage.lines?.covered || 0,
                percentage: coverage.lines?.pct || 0
            },
            overall: coverage.overall || 0,
            uncoveredLines: coverage.uncoveredLines || [],
            uncoveredBranches: coverage.uncoveredBranches || [],
            timestamp: new Date()
        };
    }
    normalizeMochaCoverage(coverage) {
        // Mocha coverage normalization (similar structure)
        return this.normalizeJestCoverage(coverage);
    }
    calculateDelta(current, baseline) {
        return {
            statements: current.statements.percentage - baseline.statements.percentage,
            branches: current.branches.percentage - baseline.branches.percentage,
            functions: current.functions.percentage - baseline.functions.percentage,
            lines: current.lines.percentage - baseline.lines.percentage,
            overall: current.overall - baseline.overall
        };
    }
    evaluateQualityGate(coverage, delta) {
        const gates = {
            minOverall: 80,
            maxDrop: 2,
            minBranches: 75
        };
        const passed = coverage.overall >= gates.minOverall &&
            (!delta || delta.overall >= -gates.maxDrop) &&
            coverage.branches.percentage >= gates.minBranches;
        return {
            passed,
            gates,
            violations: this.identifyViolations(coverage, delta, gates)
        };
    }
    identifyViolations(coverage, delta, gates) {
        const violations = [];
        if (coverage.overall < gates.minOverall) {
            violations.push(`Overall coverage ${coverage.overall}% below minimum ${gates.minOverall}%`);
        }
        if (delta && delta.overall < -gates.maxDrop) {
            violations.push(`Coverage dropped by ${Math.abs(delta.overall).toFixed(1)}%`);
        }
        if (coverage.branches.percentage < gates.minBranches) {
            violations.push(`Branch coverage ${coverage.branches.percentage}% below minimum ${gates.minBranches}%`);
        }
        return violations;
    }
    generatePipelineRecommendations(qualityGate, delta) {
        const recommendations = [];
        if (!qualityGate.passed) {
            recommendations.push('Quality gate failed - review coverage requirements');
        }
        if (delta && delta.overall < 0) {
            recommendations.push('Coverage decreased - add tests for new code');
        }
        qualityGate.violations?.forEach((violation) => {
            recommendations.push(`Address: ${violation}`);
        });
        return recommendations;
    }
    createDefaultCoverage() {
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
exports.CoverageAnalyzerService = CoverageAnalyzerService;
//# sourceMappingURL=coverage-analyzer.service.js.map