import { CodeTemplate, CodeTemplateType, ProgrammingLanguage } from '../types/code-generation.types';
/**
 * Template Engine Service for code generation
 * Handles template loading, rendering, and variable substitution
 */
export declare class TemplateEngineService {
    private templates;
    constructor();
    loadTemplate(criteria: {
        type: CodeTemplateType;
        language: ProgrammingLanguage;
        framework?: string;
    }): Promise<CodeTemplate>;
    renderTemplate(template: CodeTemplate, data: any): Promise<string>;
    validateTemplate(template: CodeTemplate): Promise<{
        isValid: boolean;
        errors: string[];
        warnings: string[];
    }>;
    createTemplate(template: Omit<CodeTemplate, 'id' | 'createdAt'>): CodeTemplate;
    listTemplates(criteria?: {
        language?: ProgrammingLanguage;
        type?: CodeTemplateType;
    }): CodeTemplate[];
    private initializeDefaultTemplates;
    private addJavaServiceTemplate;
    private addGoServiceTemplate;
    private addTestTemplates;
    private generateTemplateKey;
    private generateTemplateId;
    private getVariableValue;
    private processCondition;
    private processIterations;
    private evaluateCondition;
    private extractUsedVariables;
    private isValidCondition;
    private formatCode;
}
//# sourceMappingURL=template-engine.service.d.ts.map