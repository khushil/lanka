/**
 * Test Case Generator Service
 * AI-powered test case generation from source code and requirements
 */
import { Neo4jService } from '../../../core/database/neo4j';
import { TestGenerationRequest, TestGenerationResponse, TestCase, TestCaseType, TestFramework } from '../types/development.types';
export declare class TestCaseGeneratorService {
    private neo4j;
    constructor(neo4j: Neo4jService);
    generateFromSourceCode(request: TestGenerationRequest): Promise<TestGenerationResponse>;
    generateFromRequirements(requirements: string[], framework: TestFramework, testType: TestCaseType): Promise<TestGenerationResponse>;
    generateEdgeCases(sourceCode: string, language: string): Promise<TestCase[]>;
    generatePerformanceTests(sourceCode: string, language: string, constraints: {
        maxExecutionTime?: number;
        memoryLimit?: number;
    }): Promise<TestCase[]>;
    generateSecurityTests(sourceCode: string, language: string): Promise<TestCase[]>;
    generateRegressionTests(bugReports: Array<{
        id: string;
        description: string;
        steps: string[];
        fixed: boolean;
    }>): Promise<TestCase[]>;
    optimizeTestCases(testCases: TestCase[]): Promise<TestCase[]>;
    generateTestData(schema: Record<string, any>, count: number, options?: {
        includeEdgeCases?: boolean;
    }): Promise<any[]>;
    private validateRequest;
    private analyzeSourceCode;
    private extractFunctions;
    private extractMainFunction;
    private calculateComplexity;
    private generateTestCasesFromAnalysis;
    private generateBasicTest;
    private generateConditionalTest;
    private generateAsyncTest;
    private generateNumericTest;
    private generateReactTests;
    private generateTestCaseFromRequirement;
    private generateTestNameFromRequirement;
    private generateRequirementTestCode;
    private generateNumericEdgeCaseTest;
    private generateStringEdgeCaseTest;
    private generateArrayEdgeCaseTest;
    private generateConditionalEdgeCaseTest;
    private generateBasicTestCode;
    private generateConditionalTestCode;
    private generateAsyncTestCode;
    private generateNumericTestCode;
    private generateReactRenderTest;
    private generateReactPropsTest;
    private generatePerformanceTimeTest;
    private generateMemoryUsageTest;
    private generateInjectionTest;
    private generateValidationSecurityTest;
    private generateRegressionTestCode;
    private removeDuplicateTests;
    private prioritizeTestCases;
    private mergeSimilarTests;
    private generateDataForType;
    private generateRecommendations;
    private generateRequirementRecommendations;
    private calculateConfidence;
    private createDefaultCoverage;
}
//# sourceMappingURL=test-case-generator.service.d.ts.map