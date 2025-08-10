import { ProgrammingLanguage, ValidationResult } from '../types/code-generation.types';
/**
 * Code Validator Service
 * Validates code for syntax, quality, security, and performance
 */
export declare class CodeValidatorService {
    validateSyntax(code: string, language: ProgrammingLanguage): Promise<ValidationResult>;
    validateQuality(code: string, language: ProgrammingLanguage): Promise<ValidationResult>;
    validateSecurity(code: string, language: ProgrammingLanguage): Promise<ValidationResult>;
    validatePerformance(code: string, language: ProgrammingLanguage): Promise<ValidationResult>;
    private validateJavaScriptSyntax;
    private validatePythonSyntax;
    private validateJavaSyntax;
    private validateGoSyntax;
    private validateGenericSyntax;
    private checkComplexity;
    private checkNaming;
    private checkDocumentation;
    private checkCodeDuplication;
    private checkErrorHandling;
    private checkTestability;
    private checkInjectionVulnerabilities;
    private checkHardcodedSecrets;
    private checkInputValidation;
    private checkAuthenticationIssues;
    private checkCryptographicIssues;
    private checkDataExposure;
    private checkAlgorithmicComplexity;
    private checkMemoryUsage;
    private checkIOOperations;
    private checkDatabaseQueries;
    private checkConcurrency;
    private checkResourceLeaks;
    private calculateBasicMetrics;
    private calculateQualityMetrics;
    private calculateComplexity;
    private calculateSecurityScore;
    private calculatePerformanceScore;
    private generateSyntaxSuggestions;
    private generateQualitySuggestions;
    private generateSecuritySuggestions;
    private generatePerformanceSuggestions;
    private shouldHaveSemicolon;
    private hasUnmatchedBrackets;
    private findUndefinedVariables;
    private hasIndentationIssues;
    private shouldHaveColon;
    private javaStatementNeedsSemicolon;
    private hasUnclosedBlocks;
    private isUnusedImport;
    private hasBasicSyntaxErrors;
    private findPoorNaming;
    private findUndocumentedFunctions;
    private findCodeDuplication;
    private findMissingErrorHandling;
    private hasLowTestability;
    private findSQLInjections;
    private findHardcodedSecrets;
    private findUnvalidatedInputs;
    private hasWeakAuthentication;
    private findWeakCryptography;
    private findDataExposure;
    private findIneffientAlgorithms;
    private findMemoryIssues;
    private findInefficientIO;
    private findInefficientQueries;
    private findConcurrencyIssues;
    private findResourceLeaks;
}
//# sourceMappingURL=code-validator.service.d.ts.map