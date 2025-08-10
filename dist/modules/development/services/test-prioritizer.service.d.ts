/**
 * Test Prioritizer Service
 * Intelligent test execution prioritization and optimization
 */
import { Neo4jService } from '../../../core/database/neo4j';
import { TestCase, TestPrioritization } from '../types/development.types';
export declare class TestPrioritizerService {
    private neo4j;
    constructor(neo4j: Neo4jService);
    prioritizeTests(tests: TestCase[], weights?: Record<string, number>): Promise<TestPrioritization[]>;
    prioritizeTestsByChanges(tests: TestCase[], changedFiles: string[]): Promise<TestPrioritization[]>;
    prioritizeTestsWithBudget(tests: TestCase[], timeBudgetMinutes: number, weights?: Record<string, number>): Promise<TestPrioritization[]>;
    calculateRiskScore(testData: {
        failureRate: number;
        avgExecutionTime: number;
        complexity: number;
        dependencies: string[];
        lastFailureDate?: Date;
        codeChangeFrequency: number;
    }): Promise<number>;
    analyzeTestDependencies(testIds: string[]): Promise<Record<string, any>>;
    optimizeTestOrder(tests: any[], options?: any): Promise<any[]>;
    analyzeFlakiness(testIds: string[]): Promise<Record<string, any>>;
    prioritizeByRegressionRisk(testIds: string[], recentChanges: Array<{
        file: string;
        linesChanged: number;
        changeType: string;
    }>): Promise<TestPrioritization[]>;
    adjustPrioritiesWithFeedback(initialPriorities: TestPrioritization[], feedback: Record<string, any>): Promise<TestPrioritization[]>;
    extractLearningsFromHistory(executionHistory: any[]): Promise<Record<string, any>>;
    optimizeForResources(tests: any[], resources: {
        cpu: number;
        memory: number;
        network: number;
        database: number;
    }): Promise<TestPrioritization[]>;
    prioritizeForPipeline(tests: TestCase[], pipelineContext: any): Promise<TestCase[]>;
    updatePrioritiesFromResults(testResults: Record<string, any>): Promise<Record<string, any>>;
    private enrichTestsWithData;
    private calculateTestPriority;
    private calculateChangeImpact;
    private calculateDependencyRisk;
    private identifyDependencyIssues;
    private detectCircularDependencies;
    private groupTestsBySetup;
    private orderGroupsForEfficiency;
    private orderByExecutionTime;
    private calculateFlakinessScore;
    private identifyFlakinessPatterns;
    private generateFlakinessRecommendation;
    private calculateRegressionRisk;
    private identifyExecutionPatterns;
    private analyzeTrends;
    private generateLearningRecommendations;
    private calculateResourceCompatibility;
    private filterTestsByRelevance;
    private prioritizeByQualityGates;
    private generateReasoning;
    private determineRiskLevel;
}
//# sourceMappingURL=test-prioritizer.service.d.ts.map