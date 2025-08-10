import { Neo4jService } from '../../../core/database/neo4j';
import { CodeGenerationRequest, CodeGenerationResult, ProgrammingLanguage, ValidationLevel, ValidationResult, AIModelConfig, CodebaseInfo, GenerationHistory, BatchGenerationRequest, BatchGenerationResult } from '../types/code-generation.types';
export declare class CodeGenerationService {
    private neo4j;
    private aiService;
    private templateEngine;
    private codeValidator;
    private aiModelConfig?;
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
    private generateFromTemplate;
    private generateWithAI;
    private generateHybrid;
    private generateFromPatterns;
    private validateGeneratedCode;
    private combineValidationResults;
    private generateSuggestions;
    private storeGenerationResult;
    private logGenerationHistory;
    private countLinesOfCode;
    private average;
    private mapIssueTypeToSuggestionType;
    private mapSeverityToImpact;
    private createEmptyCodebaseInfo;
    private buildDirectoryStructure;
    private calculateCodebaseMetrics;
    private prepareTemplateData;
    private generateFilePath;
    private getFileExtension;
    private getBaseFileName;
    private calculateChecksum;
    private extractDependencies;
    private extractImports;
    private extractExports;
    private extractFunctions;
    private extractClasses;
    private extractInterfaces;
    private processAIResponse;
    private findMatchingPatterns;
    private generateFromDetectedPatterns;
    private waitForSlot;
    private createFailedResult;
}
//# sourceMappingURL=code-generation.service.d.ts.map