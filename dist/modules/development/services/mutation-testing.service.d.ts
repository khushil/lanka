/**
 * Mutation Testing Service
 * Advanced mutation testing for test quality assessment
 */
import { Neo4jService } from '../../../core/database/neo4j';
import { MutationTestResult, MutationType, TestFramework } from '../types/development.types';
export declare class MutationTestingService {
    private neo4j;
    constructor(neo4j: Neo4jService);
    runMutationTesting(config: {
        sourceCode: string;
        testCode: string;
        language: string;
        framework: TestFramework;
        mutationTypes?: MutationType[];
    }): Promise<{
        mutations: MutationTestResult[];
        overallScore: number;
        killed: MutationTestResult[];
        survived: MutationTestResult[];
        analysis: {
            overallScore: number;
            mutationTypeResults: Record<string, any>;
            weakAreas: string[];
            patterns: any[];
            recommendations: string[];
        };
        recommendations: string[];
    }>;
    generateMutations(sourceCode: string, mutationTypes: MutationType[]): Promise<MutationTestResult[]>;
    executeMutation(mutation: MutationTestResult, testCode: string, framework: TestFramework, options?: {
        timeout?: number;
    }): Promise<MutationTestResult>;
    analyzeMutationResults(results: MutationTestResult[]): Promise<{
        overallScore: number;
        mutationTypeResults: Record<string, any>;
        weakAreas: string[];
        patterns: any[];
        recommendations: string[];
    }>;
    optimizeMutationSelection(allMutations: any[], constraints: {
        maxMutations?: number;
        priorityThreshold?: number;
        timeConstraint?: number;
        ensureTypeBalance?: boolean;
    }): Promise<{
        selectedMutations: any[];
        totalAvailable: number;
        selectionRatio: number;
        estimatedExecutionTime: number;
        criteria: {
            maxMutations?: number;
            priorityThreshold?: number;
            timeConstraint?: number;
            ensureTypeBalance?: boolean;
        };
    }>;
    generateMutationReport(testSuiteId: string): Promise<{
        summary: {
            totalMutations: number;
            killedMutations: number;
            survivedMutations: number;
            overallScore: any;
            qualityAssessment: string;
        };
        mutationTypeBreakdown: Record<string, any>;
        weakAreas: string[];
        recommendations: string[];
        detailedResults: any;
        testSuite: any;
    }>;
    integrateWithTestSuite(integrationConfig: {
        testSuiteId: string;
        mutationStrategy: 'INCREMENTAL' | 'FULL' | 'SELECTIVE';
        maxExecutionTime: number;
        coverageThreshold: number;
    }): Promise<{
        integrationPlan: {
            strategy: any;
            phases: string[];
            estimatedDuration: string;
            resources: string[];
        };
        estimatedImpact: {
            codeQualityImprovement: string;
            testSuiteStrength: string;
            executionTimeIncrease: string;
            maintenanceOverhead: string;
        };
        implementation: {
            prerequisites: string[];
            steps: string[];
            bestPractices: string[];
        };
        timeline: {
            week1: string;
            week2: string;
            week3: string;
            week4: string;
        };
        prerequisites: string[];
    }>;
    setupCIPipelineIntegration(pipelineConfig: {
        trigger: 'PULL_REQUEST' | 'DAILY' | 'WEEKLY';
        mutationBudget: number;
        failureThreshold: number;
        reportFormat: 'JSON' | 'HTML' | 'JUNIT';
    }): Promise<{
        pipelineSteps: ({
            name: string;
            action: string;
            condition?: undefined;
        } | {
            name: string;
            action: string;
            condition: any;
        })[];
        qualityGates: {
            mutationScore: {
                threshold: any;
                action: string;
            };
            newCodeMutations: {
                threshold: number;
                action: string;
            };
            coverageRegression: {
                threshold: number;
                action: string;
            };
        };
        reportingConfig: {
            format: any;
            outputs: string[];
            includeDetails: boolean;
            includeRecommendations: boolean;
        };
        configuration: string;
        monitoring: {
            metrics: string[];
            alerts: {
                condition: string;
                action: string;
            }[];
            dashboards: string[];
        };
    }>;
    generateCustomMutations(sourceCode: string, customOperators: any[]): Promise<MutationTestResult[]>;
    getMutationTestingTrends(projectId: string, timeRange: {
        from: Date;
        to: Date;
    }): Promise<{
        trend: string;
        dataPoints: never[];
        averageScore: number;
        improvement?: undefined;
        insights?: undefined;
    } | {
        trend: string;
        dataPoints: any;
        averageScore: number;
        improvement: number;
        insights: string[];
    }>;
    private generateArithmeticMutations;
    private generateLogicalMutations;
    private generateRelationalMutations;
    private generateConditionalMutations;
    private generateLiteralMutations;
    private generateUnaryMutations;
    private generateStatementMutations;
    private createMutationResult;
    private findCodeLocation;
    private extractFunctionName;
    private simulateTestExecution;
    private extractTestName;
    private simulateTestLogic;
    private identifyMutationPatterns;
    private generateAnalysisRecommendations;
    private generateMutationRecommendations;
    private balanceMutationTypes;
    private generateSummary;
    private generateReportRecommendations;
    private createIntegrationPlan;
    private estimateIntegrationImpact;
    private generateImplementationGuide;
    private createImplementationTimeline;
    private identifyPrerequisites;
    private generatePipelineSteps;
    private defineQualityGates;
    private configureReporting;
    private generatePipelineConfiguration;
    private setupPipelineMonitoring;
    private calculateTrend;
    private calculateImprovement;
    private generateTrendInsights;
}
//# sourceMappingURL=mutation-testing.service.d.ts.map