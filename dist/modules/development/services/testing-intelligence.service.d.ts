/**
 * Testing Intelligence Service
 * Main orchestrator for AI-powered testing capabilities
 */
import { Neo4jService } from '../../../core/database/neo4j';
import { TestGenerationRequest, TestGenerationResponse, TestCase, TestIntelligenceMetrics, TestOptimization, Priority, TestCaseType, TestFramework } from '../types/development.types';
export declare class TestingIntelligenceService {
    private neo4j;
    private testCaseGenerator;
    private coverageAnalyzer;
    private qualityPredictor;
    private testPrioritizer;
    private mutationTesting;
    constructor(neo4j: Neo4jService);
    generateTestCases(request: TestGenerationRequest): Promise<TestGenerationResponse>;
    analyzeCoverage(testSuiteId: string): Promise<{
        gaps: import("../types/development.types").CoverageGap[];
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
    predictQuality(testId: string): Promise<import("../types/development.types").QualityPrediction>;
    prioritizeTests(tests: TestCase[], weights?: Record<string, number>): Promise<import("../types/development.types").TestPrioritization[]>;
    runMutationTesting(config: {
        sourceCode: string;
        testCode: string;
        language: string;
        framework: TestFramework;
        timeout?: number;
    }): Promise<{
        mutations: import("../types/development.types").MutationTestResult[];
        overallScore: number;
        killed: import("../types/development.types").MutationTestResult[];
        survived: import("../types/development.types").MutationTestResult[];
        analysis: {
            overallScore: number;
            mutationTypeResults: Record<string, any>;
            weakAreas: string[];
            patterns: any[];
            recommendations: string[];
        };
        recommendations: string[];
    }>;
    optimizeTestExecution(metrics: TestIntelligenceMetrics): Promise<{
        optimizations: TestOptimization[];
        totalImpact: number;
        estimatedTimeReduction: number;
        priorityLevel: Priority;
    }>;
    generatePerformanceTests(specs: {
        endpoint?: string;
        expectedResponseTime?: number;
        maxConcurrentUsers?: number;
        throughputTarget?: number;
    }): Promise<{
        testCases: TestCase[];
        estimatedExecutionTime: number;
        recommendations: string[];
    }>;
    analyzeTestMaintenance(testSuiteId: string): Promise<{
        issues: any[];
        estimatedCost: {
            hours: number;
            priority: Priority;
        };
        recommendations: string[];
    }>;
    generateIntegrationTestScaffolding(config: {
        modules: string[];
        database?: string;
        framework: TestFramework;
        testType?: TestCaseType;
    }): Promise<{
        setupCode: string;
        teardownCode: string;
        testCases: TestCase[];
        mockConfigurations: Record<string, any>;
        framework: TestFramework;
        recommendations: string[];
    }>;
    getTestRequirementTraceability(requirementId: string): Promise<{
        requirement: any;
        coveredBy: any;
        coverage: number;
        gaps: string[];
    }>;
    generateComponentTests(componentId: string): Promise<{
        testCases: TestCase[];
        mockSetup: string;
        recommendations: string[];
    }>;
    private hasInvalidSyntax;
    private generateTestCasesFromSource;
    private identifyCoverageGaps;
    private generateRecommendations;
    private calculateConfidence;
    private storeTestCases;
    private createDefaultCoverage;
    private calculateTimeReduction;
    private generateLoadTestCode;
    private generateResponseTimeTestCode;
    private generatePerformanceRecommendations;
    private generateMaintenanceRecommendations;
    private generateIntegrationSetup;
    private generateIntegrationTeardown;
    private generateIntegrationTestCases;
    private generateMockConfigurations;
    private generateComponentTestCode;
    private generateComponentMockSetup;
}
//# sourceMappingURL=testing-intelligence.service.d.ts.map