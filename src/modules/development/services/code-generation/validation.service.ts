import { logger } from '../../../../core/logging/logger';
import {
  ValidationResult,
  ValidationLevel,
  ProgrammingLanguage,
  GeneratedFile,
  ValidationIssue,
  QualityMetrics,
} from '../../types/code-generation.types';
import { CodeValidatorService } from '../code-validator.service';

/**
 * Service responsible for code validation logic
 * Extracted from CodeGenerationService to improve maintainability
 */
export class ValidationService {
  private codeValidator: CodeValidatorService;

  constructor() {
    this.codeValidator = new CodeValidatorService();
  }

  /**
   * Validate code syntax, quality, security, and performance
   */
  async validateCode(
    code: string, 
    language: ProgrammingLanguage, 
    level: ValidationLevel
  ): Promise<ValidationResult> {
    try {
      logger.info('Validating code', { language, level });

      const validations: ValidationResult[] = [];

      // Always validate syntax first
      const syntaxValidation = await this.codeValidator.validateSyntax(code, language);
      validations.push(syntaxValidation);

      // Return early if syntax is invalid
      if (!syntaxValidation.isValid) {
        return syntaxValidation;
      }

      // Perform additional validations based on level
      switch (level) {
        case ValidationLevel.FULL:
          const [qualityValidation, securityValidation, performanceValidation] = await Promise.all([
            this.codeValidator.validateQuality(code, language),
            this.codeValidator.validateSecurity(code, language),
            this.codeValidator.validatePerformance(code, language),
          ]);
          validations.push(qualityValidation, securityValidation, performanceValidation);
          break;
        case ValidationLevel.QUALITY:
          const qualityResult = await this.codeValidator.validateQuality(code, language);
          validations.push(qualityResult);
          break;
        case ValidationLevel.SECURITY:
          const securityResult = await this.codeValidator.validateSecurity(code, language);
          validations.push(securityResult);
          break;
        case ValidationLevel.PERFORMANCE:
          const performanceResult = await this.codeValidator.validatePerformance(code, language);
          validations.push(performanceResult);
          break;
        case ValidationLevel.SEMANTIC:
          // For semantic validation, we use quality validation as it includes semantic checks
          const semanticResult = await this.codeValidator.validateQuality(code, language);
          validations.push(semanticResult);
          break;
      }

      // Combine validation results
      return this.combineValidationResults(validations, level);
    } catch (error) {
      logger.error('Code validation failed', { error });
      throw error;
    }
  }

  /**
   * Validate generated files
   */
  async validateGeneratedFiles(files: GeneratedFile[], level: ValidationLevel): Promise<ValidationResult> {
    const allValidations: ValidationResult[] = [];

    for (const file of files) {
      const validation = await this.validateCode(file.content, file.language, level);
      allValidations.push(validation);
    }

    return this.combineValidationResults(allValidations, level);
  }

  /**
   * Combine multiple validation results into a single result
   */
  private combineValidationResults(validations: ValidationResult[], level: ValidationLevel): ValidationResult {
    const allIssues: ValidationIssue[] = validations.flatMap(v => v.issues);
    const isValid = validations.every(v => v.isValid);
    const averageScore = validations.reduce((sum, v) => sum + v.score, 0) / validations.length;
    
    const combinedMetrics: QualityMetrics = {
      complexity: this.average(validations.map(v => v.metrics.complexity)),
      maintainability: this.average(validations.map(v => v.metrics.maintainability)),
      reliability: this.average(validations.map(v => v.metrics.reliability)),
      security: this.average(validations.map(v => v.metrics.security)),
      performance: this.average(validations.map(v => v.metrics.performance)),
      testability: this.average(validations.map(v => v.metrics.testability)),
      readability: this.average(validations.map(v => v.metrics.readability)),
      reusability: this.average(validations.map(v => v.metrics.reusability)),
      overall: averageScore,
    };

    return {
      level,
      isValid,
      score: averageScore,
      issues: allIssues,
      metrics: combinedMetrics,
      suggestions: [...new Set(validations.flatMap(v => v.suggestions))],
      validatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get validation metrics for code quality assessment
   */
  async getValidationMetrics(code: string, language: ProgrammingLanguage): Promise<QualityMetrics> {
    const validation = await this.validateCode(code, language, ValidationLevel.FULL);
    return validation.metrics;
  }

  /**
   * Check if code meets minimum quality standards
   */
  async meetsQualityStandards(
    code: string, 
    language: ProgrammingLanguage,
    thresholds: Partial<QualityMetrics> = {}
  ): Promise<{ passes: boolean; failedMetrics: string[] }> {
    const metrics = await this.getValidationMetrics(code, language);
    const failedMetrics: string[] = [];
    
    // Default thresholds
    const defaultThresholds: QualityMetrics = {
      complexity: 0.7,
      maintainability: 0.8,
      reliability: 0.9,
      security: 0.9,
      performance: 0.7,
      testability: 0.8,
      readability: 0.8,
      reusability: 0.7,
      overall: 0.8,
    };

    const finalThresholds = { ...defaultThresholds, ...thresholds };

    // Check each metric
    Object.entries(finalThresholds).forEach(([metric, threshold]) => {
      const actualValue = metrics[metric as keyof QualityMetrics];
      if (actualValue < threshold) {
        failedMetrics.push(`${metric}: ${actualValue} < ${threshold}`);
      }
    });

    return {
      passes: failedMetrics.length === 0,
      failedMetrics,
    };
  }

  // Private helper methods

  private average(values: (number | undefined)[]): number {
    const validValues = values.filter((v): v is number => v !== undefined);
    return validValues.length > 0 ? validValues.reduce((sum, v) => sum + v, 0) / validValues.length : 0;
  }
}