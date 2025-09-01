import { Neo4jService } from '../../../core/database/neo4j';
import { CodeGenerationRequest, CodeGenerationResult, ProgrammingLanguage, ValidationLevel, ValidationResult, AIModelConfig, CodebaseInfo, GenerationHistory, BatchGenerationRequest, BatchGenerationResult } from '../types/code-generation.types';
/**
 * Refactored CodeGenerationService - Core orchestration logic only
 * Template, validation, and AI integration logic extracted to separate services
 * Now maintains single responsibility principle with < 300 lines
 */
export declare class CodeGenerationService {
    private neo4j;
    private templateService;
    private validationService;
    private aiIntegrationService;
    constructor(neo4j: Neo4jService);
    /**
     * Generate code from requirements and architecture decisions
     */
    generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResult>;
    /**
     * Validate code syntax, quality, security, and performance
     */
    validateCode(code: string, language: ProgrammingLanguage, level: ValidationLevel): Promise<ValidationResult>;
    /**
     * Analyze existing codebase to understand patterns and structure
     */
    analyzeCodebase(projectId: string): Promise<CodebaseInfo>;
    /**
     * Generate tests for existing or generated code
     */
    generateTests(codeContent: string, language: ProgrammingLanguage, framework: string): Promise<{
        content: string;
        framework: string;
        coverage: number;
    }>;
    /**
     * Configure AI model settings
     */
    configurateAIModel(config: AIModelConfig): Promise<void>;
    /**
     * Get current AI model configuration
     */
    getAIModelConfig(): AIModelConfig | undefined;
    /**
     * Get generation history for a project
     */
    getGenerationHistory(projectId: string, limit?: number): Promise<GenerationHistory[]>;
    /**
     * Process batch generation requests
     */
    generateBatch(batchRequest: BatchGenerationRequest): Promise<BatchGenerationResult>;
    private getRequirements;
    private getArchitectureDecisions;
    private generateFromPatterns;
    private storeGenerationResult;
    private logGenerationHistory;
    private countLinesOfCode;
    private createEmptyCodebaseInfo;
    private buildDirectoryStructure;
    private calculateCodebaseMetrics;
    private findMatchingPatterns;
    private waitForSlot;
    private createFailedResult;
    private average;
}
//# sourceMappingURL=code-generation.service.d.ts.map