/**
 * Coverage Analyzer Service
 * Analyzes test coverage and identifies coverage gaps
 */
import { Neo4jService } from '../../../core/database/neo4j';
import { CoverageData, CoverageGap, CoverageThreshold, Priority } from '../types/development.types';
export declare class CoverageAnalyzerService {
    private neo4j;
    constructor(neo4j: Neo4jService);
    analyzeCoverage(coverage: CoverageData, threshold: CoverageThreshold): Promise<{
        gaps: CoverageGap[];
        summary: {
            overall: number;
            status: string;
            thresholdsMet: boolean;
            breakdown: {
                statements: string;
                branches: string;
                functions: string;
                lines: string;
            };
        };
        recommendations: string[];
        coverageScore: number;
        thresholdsMet: boolean;
    }>;
    identifyUncoveredPaths(sourceCode: string, existingTests: string[]): Promise<{
        uncoveredPaths: any[];
        totalPaths: number;
        coveragePercentage: number;
    }>;
    analyzeBranchCoverage(sourceCode: string, testCoverage: any): Promise<{
        totalBranches: number;
        coveredBranches: any;
        uncoveredBranches: any;
        branchCoveragePercentage: number;
        missingBranches: any[];
        criticalUncovered: string[];
    }>;
    calculateCoverageMetrics(coverage: CoverageData): Promise<{
        weightedScore: number;
        qualityGrade: string;
        improvementAreas: string[];
        strengths: string[];
        breakdown: {
            statements: number;
            branches: number;
            functions: number;
            lines: number;
        };
    }>;
    generateCoverageReport(testSuiteId: string): Promise<{
        summary: {
            testSuite: any;
            totalTests: any;
            coverage: any;
            status: string;
        };
        gaps: CoverageGap[];
        recommendations: string[];
        testCaseContributions: {
            testId: any;
            name: any;
            coverageContribution: any;
            criticalPaths: any;
        }[];
        trendAnalysis: {
            trend: string;
            periodChange: number;
            volatility: string;
        };
        metrics: {
            weightedScore: number;
            qualityGrade: string;
            improvementAreas: string[];
            strengths: string[];
            breakdown: {
                statements: number;
                branches: number;
                functions: number;
                lines: number;
            };
        };
    }>;
    trackCoverageTrends(testSuiteId: string, days: number): Promise<{
        trend: string;
        changePercentage: number;
        dataPoints: any;
        predictions: {
            nextWeek: any;
            confidence: number;
        } | null;
        alerts: string[];
    }>;
    optimizeCoverageStrategy(currentCoverage: CoverageData, targetThreshold: CoverageThreshold): Promise<{
        strategies: {
            area: any;
            priority: any;
            description: string;
            impact: any;
            effort: any;
            actions: string[];
        }[];
        prioritizedAreas: {
            type: "STATEMENT" | "BRANCH" | "FUNCTION" | "LINE";
            priority: Priority;
            currentCoverage: number;
            effort: number;
            impact: number;
        }[];
        estimatedEffort: number;
        expectedImpact: number;
        timeline: {
            strategy: any;
            startWeek: number;
            duration: number;
            endWeek: number;
        }[];
    }>;
    normalizeFrameworkCoverage(frameworkData: any): Promise<{
        normalized: boolean;
        coverage: any;
        originalFramework: any;
    }>;
    integratePipelineCoverage(pipelineData: any): Promise<{
        baselineDelta: {
            statements: number;
            branches: number;
            functions: number;
            lines: number;
            overall: number;
        } | null;
        qualityGate: {
            passed: boolean;
            gates: {
                minOverall: number;
                maxDrop: number;
                minBranches: number;
            };
            violations: string[];
        };
        recommendations: string[];
        pipelineMetrics: {
            buildId: any;
            branch: any;
            coverage: any;
        };
    }>;
    private validateCoverageData;
    private validateThreshold;
    private identifyGaps;
    private calculateGapPriority;
    private generateSummary;
    private getCoverageStatus;
    private checkThresholdsMet;
    private generateRecommendations;
    private analyzeCodePaths;
    private analyzedTestedPaths;
    private findUncoveredPaths;
    private extractBranches;
    private identifyMissingBranches;
    private identifyCriticalUncoveredBranches;
    private calculateWeightedScore;
    private assignQualityGrade;
    private identifyImprovementAreas;
    private identifyStrengths;
    private analyzeTestCaseContributions;
    private generateTrendAnalysis;
    private generateDetailedRecommendations;
    private calculateTrend;
    private calculateChangePercentage;
    private generateTrendPredictions;
    private generateTrendAlerts;
    private prioritizeCoverageAreas;
    private getCurrentCoverageForType;
    private estimateEffort;
    private estimateImpact;
    private generateOptimizationStrategies;
    private generateActionsForArea;
    private calculateTotalEffort;
    private calculateExpectedImpact;
    private generateImplementationTimeline;
    private normalizeJestCoverage;
    private normalizeMochaCoverage;
    private calculateDelta;
    private evaluateQualityGate;
    private identifyViolations;
    private generatePipelineRecommendations;
    private createDefaultCoverage;
}
//# sourceMappingURL=coverage-analyzer.service.d.ts.map