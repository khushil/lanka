import { AIModelConfig, ProgrammingLanguage, CodeSuggestion } from '../types/code-generation.types';
/**
 * AI Service for code generation and analysis
 * Integrates with various AI models (OpenAI, Hugging Face, etc.)
 */
export declare class AIService {
    private config?;
    configure(config: AIModelConfig): Promise<void>;
    generateCode(options: {
        requirements?: any[];
        architecture?: any[];
        language: ProgrammingLanguage;
        templateType?: string;
        context?: any;
        customPrompts?: string[];
        type?: string;
        sourceCode?: string;
        testFramework?: string;
        includeSetup?: boolean;
        includeTeardown?: boolean;
        generateMocks?: boolean;
        baseCode?: string;
        enhancementType?: string;
    }): Promise<{
        code?: string;
        files?: Array<{
            path: string;
            content: string;
            type: string;
        }>;
        confidence: number;
        metadata?: {
            aiModel?: string;
            processingTime?: number;
            tokenUsage?: {
                promptTokens: number;
                completionTokens: number;
                totalTokens: number;
                cost?: number;
            };
            estimatedCoverage?: number;
        };
    }>;
    analyzeCode(code: string, language: ProgrammingLanguage): Promise<{
        complexity: number;
        maintainability: number;
        suggestions: string[];
    }>;
    suggestImprovements(code: string, language: ProgrammingLanguage): Promise<CodeSuggestion[]>;
    private buildPrompt;
    private callAIModel;
    private mockOpenAIResponse;
    private mockHuggingFaceResponse;
    private mockGenericResponse;
    private processAIResponse;
    private generateMockTestCode;
}
//# sourceMappingURL=ai.service.d.ts.map