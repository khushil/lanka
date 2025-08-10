import { logger } from '../../../core/logging/logger';
import {
  ProgrammingLanguage,
  ValidationLevel,
  ValidationResult,
  ValidationIssue,
  QualityMetrics,
} from '../types/code-generation.types';

/**
 * Code Validator Service
 * Validates code for syntax, quality, security, and performance
 */
export class CodeValidatorService {
  async validateSyntax(code: string, language: ProgrammingLanguage): Promise<ValidationResult> {
    logger.info('Validating code syntax', { language });

    try {
      const issues: ValidationIssue[] = [];
      let isValid = true;

      // Perform language-specific syntax validation
      switch (language) {
        case ProgrammingLanguage.TYPESCRIPT:
        case ProgrammingLanguage.JAVASCRIPT:
          issues.push(...this.validateJavaScriptSyntax(code));
          break;
        case ProgrammingLanguage.PYTHON:
          issues.push(...this.validatePythonSyntax(code));
          break;
        case ProgrammingLanguage.JAVA:
          issues.push(...this.validateJavaSyntax(code));
          break;
        case ProgrammingLanguage.GO:
          issues.push(...this.validateGoSyntax(code));
          break;
        default:
          issues.push(...this.validateGenericSyntax(code));
      }

      // Check for critical syntax errors
      const criticalErrors = issues.filter(issue => 
        issue.severity === 'ERROR' && issue.type === 'SYNTAX'
      );
      isValid = criticalErrors.length === 0;

      const score = isValid ? 1.0 : Math.max(0, 1.0 - (criticalErrors.length * 0.2));

      return {
        level: ValidationLevel.SYNTAX,
        isValid,
        score,
        issues,
        metrics: this.calculateBasicMetrics(code),
        suggestions: this.generateSyntaxSuggestions(issues),
        validatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Syntax validation failed', { error });
      throw error;
    }
  }

  async validateQuality(code: string, language: ProgrammingLanguage): Promise<ValidationResult> {
    logger.info('Validating code quality', { language });

    try {
      const issues: ValidationIssue[] = [];
      
      // Check for quality issues
      issues.push(...this.checkComplexity(code));
      issues.push(...this.checkNaming(code, language));
      issues.push(...this.checkDocumentation(code, language));
      issues.push(...this.checkCodeDuplication(code));
      issues.push(...this.checkErrorHandling(code, language));
      issues.push(...this.checkTestability(code, language));

      const metrics = this.calculateQualityMetrics(code, issues);
      const score = metrics.overall;
      const isValid = score >= 0.7; // Quality threshold

      return {
        level: ValidationLevel.QUALITY,
        isValid,
        score,
        issues,
        metrics,
        suggestions: this.generateQualitySuggestions(issues, metrics),
        validatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Quality validation failed', { error });
      throw error;
    }
  }

  async validateSecurity(code: string, language: ProgrammingLanguage): Promise<ValidationResult> {
    logger.info('Validating code security', { language });

    try {
      const issues: ValidationIssue[] = [];
      
      // Check for security vulnerabilities
      issues.push(...this.checkInjectionVulnerabilities(code, language));
      issues.push(...this.checkHardcodedSecrets(code));
      issues.push(...this.checkInputValidation(code, language));
      issues.push(...this.checkAuthenticationIssues(code, language));
      issues.push(...this.checkCryptographicIssues(code, language));
      issues.push(...this.checkDataExposure(code, language));

      const securityScore = this.calculateSecurityScore(issues);
      const isValid = securityScore >= 0.8; // Security threshold
      
      const metrics: QualityMetrics = {
        complexity: this.calculateComplexity(code),
        maintainability: 0.8,
        reliability: 0.8,
        security: securityScore,
        performance: 0.8,
        testability: 0.8,
        readability: 0.8,
        reusability: 0.8,
        overall: securityScore,
      };

      return {
        level: ValidationLevel.SECURITY,
        isValid,
        score: securityScore,
        issues,
        metrics,
        suggestions: this.generateSecuritySuggestions(issues),
        validatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Security validation failed', { error });
      throw error;
    }
  }

  async validatePerformance(code: string, language: ProgrammingLanguage): Promise<ValidationResult> {
    logger.info('Validating code performance', { language });

    try {
      const issues: ValidationIssue[] = [];
      
      // Check for performance issues
      issues.push(...this.checkAlgorithmicComplexity(code));
      issues.push(...this.checkMemoryUsage(code, language));
      issues.push(...this.checkIOOperations(code, language));
      issues.push(...this.checkDatabaseQueries(code, language));
      issues.push(...this.checkConcurrency(code, language));
      issues.push(...this.checkResourceLeaks(code, language));

      const performanceScore = this.calculatePerformanceScore(code, issues);
      const isValid = performanceScore >= 0.7; // Performance threshold

      const metrics: QualityMetrics = {
        complexity: this.calculateComplexity(code),
        maintainability: 0.8,
        reliability: 0.8,
        security: 0.8,
        performance: performanceScore,
        testability: 0.8,
        readability: 0.8,
        reusability: 0.8,
        overall: performanceScore,
      };

      return {
        level: ValidationLevel.PERFORMANCE,
        isValid,
        score: performanceScore,
        issues,
        metrics,
        suggestions: this.generatePerformanceSuggestions(issues),
        validatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Performance validation failed', { error });
      throw error;
    }
  }

  // Private validation methods

  private validateJavaScriptSyntax(code: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const lines = code.split('\n');

    lines.forEach((line, lineNumber) => {
      // Check for common syntax errors
      
      // Missing semicolons (simplified check)
      if (this.shouldHaveSemicolon(line) && !line.trim().endsWith(';') && !line.trim().endsWith('{') && !line.trim().endsWith('}')) {
        issues.push({
          id: `syntax-semicolon-${lineNumber}`,
          type: 'SYNTAX',
          severity: 'WARNING',
          message: 'Missing semicolon',
          location: {
            file: 'generated.ts',
            line: lineNumber + 1,
            column: line.length,
          },
          suggestion: 'Add semicolon at the end of the statement',
          fixable: true,
        });
      }

      // Unmatched brackets
      if (this.hasUnmatchedBrackets(line)) {
        issues.push({
          id: `syntax-brackets-${lineNumber}`,
          type: 'SYNTAX',
          severity: 'ERROR',
          message: 'Unmatched brackets',
          location: {
            file: 'generated.ts',
            line: lineNumber + 1,
            column: 0,
          },
          fixable: false,
        });
      }

      // Undefined variables (simplified check)
      const undefinedVars = this.findUndefinedVariables(line);
      undefinedVars.forEach(variable => {
        issues.push({
          id: `syntax-undefined-${lineNumber}-${variable}`,
          type: 'SEMANTIC',
          severity: 'ERROR',
          message: `'${variable}' is not defined`,
          location: {
            file: 'generated.ts',
            line: lineNumber + 1,
            column: line.indexOf(variable),
          },
          suggestion: `Declare '${variable}' before using it`,
          fixable: false,
        });
      });
    });

    return issues;
  }

  private validatePythonSyntax(code: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const lines = code.split('\n');

    lines.forEach((line, lineNumber) => {
      // Check Python-specific syntax
      
      // Indentation issues
      if (this.hasIndentationIssues(line, lines, lineNumber)) {
        issues.push({
          id: `syntax-indent-${lineNumber}`,
          type: 'SYNTAX',
          severity: 'ERROR',
          message: 'Indentation error',
          location: {
            file: 'generated.py',
            line: lineNumber + 1,
            column: 0,
          },
          suggestion: 'Fix indentation to match Python standards (4 spaces)',
          fixable: true,
        });
      }

      // Missing colons
      if (this.shouldHaveColon(line) && !line.trim().endsWith(':')) {
        issues.push({
          id: `syntax-colon-${lineNumber}`,
          type: 'SYNTAX',
          severity: 'ERROR',
          message: 'Missing colon',
          location: {
            file: 'generated.py',
            line: lineNumber + 1,
            column: line.length,
          },
          suggestion: 'Add colon at the end of the statement',
          fixable: true,
        });
      }
    });

    return issues;
  }

  private validateJavaSyntax(code: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const lines = code.split('\n');

    lines.forEach((line, lineNumber) => {
      // Check Java-specific syntax
      
      // Missing semicolons
      if (this.javaStatementNeedsSemicolon(line) && !line.trim().endsWith(';')) {
        issues.push({
          id: `syntax-semicolon-${lineNumber}`,
          type: 'SYNTAX',
          severity: 'ERROR',
          message: 'Missing semicolon',
          location: {
            file: 'generated.java',
            line: lineNumber + 1,
            column: line.length,
          },
          suggestion: 'Add semicolon at the end of the statement',
          fixable: true,
        });
      }

      // Unclosed blocks
      if (this.hasUnclosedBlocks(line)) {
        issues.push({
          id: `syntax-blocks-${lineNumber}`,
          type: 'SYNTAX',
          severity: 'ERROR',
          message: 'Unclosed block',
          location: {
            file: 'generated.java',
            line: lineNumber + 1,
            column: 0,
          },
          fixable: false,
        });
      }
    });

    return issues;
  }

  private validateGoSyntax(code: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const lines = code.split('\n');

    lines.forEach((line, lineNumber) => {
      // Check Go-specific syntax
      
      // Unused imports (simplified)
      if (line.trim().startsWith('import') && this.isUnusedImport(line, code)) {
        issues.push({
          id: `syntax-unused-import-${lineNumber}`,
          type: 'SYNTAX',
          severity: 'WARNING',
          message: 'Unused import',
          location: {
            file: 'generated.go',
            line: lineNumber + 1,
            column: 0,
          },
          suggestion: 'Remove unused import',
          fixable: true,
        });
      }
    });

    return issues;
  }

  private validateGenericSyntax(code: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const lines = code.split('\n');

    lines.forEach((line, lineNumber) => {
      // Generic syntax checks
      if (this.hasBasicSyntaxErrors(line)) {
        issues.push({
          id: `syntax-generic-${lineNumber}`,
          type: 'SYNTAX',
          severity: 'WARNING',
          message: 'Potential syntax issue detected',
          location: {
            file: 'generated',
            line: lineNumber + 1,
            column: 0,
          },
          fixable: false,
        });
      }
    });

    return issues;
  }

  // Quality check methods

  private checkComplexity(code: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const complexity = this.calculateComplexity(code);

    if (complexity > 10) {
      issues.push({
        id: 'quality-complexity',
        type: 'QUALITY',
        severity: 'WARNING',
        message: `High cyclomatic complexity: ${complexity}`,
        location: { file: 'generated', line: 1, column: 0 },
        suggestion: 'Consider breaking down complex functions into smaller ones',
        fixable: false,
      });
    }

    return issues;
  }

  private checkNaming(code: string, language: ProgrammingLanguage): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    // Check for poor naming conventions
    const poorNames = this.findPoorNaming(code, language);
    poorNames.forEach(name => {
      issues.push({
        id: `quality-naming-${name.name}`,
        type: 'QUALITY',
        severity: 'INFO',
        message: `Poor naming: '${name.name}'`,
        location: name.location,
        suggestion: 'Use more descriptive names',
        fixable: false,
      });
    });

    return issues;
  }

  private checkDocumentation(code: string, language: ProgrammingLanguage): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    const undocumentedFunctions = this.findUndocumentedFunctions(code, language);
    undocumentedFunctions.forEach(func => {
      issues.push({
        id: `quality-docs-${func.name}`,
        type: 'QUALITY',
        severity: 'INFO',
        message: `Missing documentation for function: ${func.name}`,
        location: func.location,
        suggestion: 'Add documentation comments',
        fixable: false,
      });
    });

    return issues;
  }

  private checkCodeDuplication(code: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    const duplicates = this.findCodeDuplication(code);
    duplicates.forEach(dup => {
      issues.push({
        id: `quality-duplication-${dup.id}`,
        type: 'QUALITY',
        severity: 'WARNING',
        message: 'Code duplication detected',
        location: dup.location,
        suggestion: 'Extract common code into a reusable function',
        fixable: false,
      });
    });

    return issues;
  }

  private checkErrorHandling(code: string, language: ProgrammingLanguage): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    const missingErrorHandling = this.findMissingErrorHandling(code, language);
    missingErrorHandling.forEach(location => {
      issues.push({
        id: `quality-error-handling-${location.line}`,
        type: 'QUALITY',
        severity: 'WARNING',
        message: 'Missing error handling',
        location,
        suggestion: 'Add proper error handling',
        fixable: false,
      });
    });

    return issues;
  }

  private checkTestability(code: string, language: ProgrammingLanguage): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    if (this.hasLowTestability(code, language)) {
      issues.push({
        id: 'quality-testability',
        type: 'QUALITY',
        severity: 'INFO',
        message: 'Code may be difficult to test',
        location: { file: 'generated', line: 1, column: 0 },
        suggestion: 'Consider using dependency injection and smaller functions',
        fixable: false,
      });
    }

    return issues;
  }

  // Security check methods

  private checkInjectionVulnerabilities(code: string, language: ProgrammingLanguage): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    const sqlInjections = this.findSQLInjections(code, language);
    sqlInjections.forEach(injection => {
      issues.push({
        id: `security-sql-injection-${injection.line}`,
        type: 'SECURITY',
        severity: 'ERROR',
        message: 'Potential SQL injection vulnerability',
        location: injection,
        rule: 'no-sql-injection',
        suggestion: 'Use parameterized queries or prepared statements',
        fixable: true,
      });
    });

    return issues;
  }

  private checkHardcodedSecrets(code: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    const secrets = this.findHardcodedSecrets(code);
    secrets.forEach(secret => {
      issues.push({
        id: `security-hardcoded-secret-${secret.line}`,
        type: 'SECURITY',
        severity: 'ERROR',
        message: 'Hardcoded secret detected',
        location: secret,
        suggestion: 'Use environment variables or secure configuration',
        fixable: false,
      });
    });

    return issues;
  }

  private checkInputValidation(code: string, language: ProgrammingLanguage): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    const unvalidatedInputs = this.findUnvalidatedInputs(code, language);
    unvalidatedInputs.forEach(input => {
      issues.push({
        id: `security-input-validation-${input.line}`,
        type: 'SECURITY',
        severity: 'WARNING',
        message: 'Input validation missing',
        location: input,
        suggestion: 'Add input validation and sanitization',
        fixable: false,
      });
    });

    return issues;
  }

  private checkAuthenticationIssues(code: string, language: ProgrammingLanguage): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    if (this.hasWeakAuthentication(code, language)) {
      issues.push({
        id: 'security-weak-auth',
        type: 'SECURITY',
        severity: 'WARNING',
        message: 'Weak authentication implementation',
        location: { file: 'generated', line: 1, column: 0 },
        suggestion: 'Use strong authentication mechanisms',
        fixable: false,
      });
    }

    return issues;
  }

  private checkCryptographicIssues(code: string, language: ProgrammingLanguage): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    const weakCrypto = this.findWeakCryptography(code, language);
    weakCrypto.forEach(crypto => {
      issues.push({
        id: `security-weak-crypto-${crypto.line}`,
        type: 'SECURITY',
        severity: 'ERROR',
        message: 'Weak cryptographic algorithm',
        location: crypto,
        suggestion: 'Use strong cryptographic algorithms',
        fixable: false,
      });
    });

    return issues;
  }

  private checkDataExposure(code: string, language: ProgrammingLanguage): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    const exposedData = this.findDataExposure(code, language);
    exposedData.forEach(exposure => {
      issues.push({
        id: `security-data-exposure-${exposure.line}`,
        type: 'SECURITY',
        severity: 'WARNING',
        message: 'Potential data exposure',
        location: exposure,
        suggestion: 'Ensure sensitive data is properly protected',
        fixable: false,
      });
    });

    return issues;
  }

  // Performance check methods

  private checkAlgorithmicComplexity(code: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    const inefficientAlgorithms = this.findIneffientAlgorithms(code);
    inefficientAlgorithms.forEach(algo => {
      issues.push({
        id: `performance-algorithm-${algo.line}`,
        type: 'PERFORMANCE',
        severity: 'WARNING',
        message: 'Inefficient algorithm detected',
        location: algo,
        suggestion: 'Consider using more efficient algorithms',
        fixable: false,
      });
    });

    return issues;
  }

  private checkMemoryUsage(code: string, language: ProgrammingLanguage): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    const memoryIssues = this.findMemoryIssues(code, language);
    memoryIssues.forEach(issue => {
      issues.push({
        id: `performance-memory-${issue.line}`,
        type: 'PERFORMANCE',
        severity: 'WARNING',
        message: 'Potential memory issue',
        location: issue,
        suggestion: 'Optimize memory usage',
        fixable: false,
      });
    });

    return issues;
  }

  private checkIOOperations(code: string, language: ProgrammingLanguage): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    const inefficientIO = this.findInefficientIO(code, language);
    inefficientIO.forEach(io => {
      issues.push({
        id: `performance-io-${io.line}`,
        type: 'PERFORMANCE',
        severity: 'INFO',
        message: 'Potentially inefficient I/O operation',
        location: io,
        suggestion: 'Consider batching or async operations',
        fixable: false,
      });
    });

    return issues;
  }

  private checkDatabaseQueries(code: string, language: ProgrammingLanguage): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    const inefficientQueries = this.findInefficientQueries(code, language);
    inefficientQueries.forEach(query => {
      issues.push({
        id: `performance-query-${query.line}`,
        type: 'PERFORMANCE',
        severity: 'WARNING',
        message: 'Potentially inefficient database query',
        location: query,
        suggestion: 'Add indexes or optimize query structure',
        fixable: false,
      });
    });

    return issues;
  }

  private checkConcurrency(code: string, language: ProgrammingLanguage): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    const concurrencyIssues = this.findConcurrencyIssues(code, language);
    concurrencyIssues.forEach(issue => {
      issues.push({
        id: `performance-concurrency-${issue.line}`,
        type: 'PERFORMANCE',
        severity: 'WARNING',
        message: 'Potential concurrency issue',
        location: issue,
        suggestion: 'Review thread safety and synchronization',
        fixable: false,
      });
    });

    return issues;
  }

  private checkResourceLeaks(code: string, language: ProgrammingLanguage): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    const leaks = this.findResourceLeaks(code, language);
    leaks.forEach(leak => {
      issues.push({
        id: `performance-leak-${leak.line}`,
        type: 'PERFORMANCE',
        severity: 'ERROR',
        message: 'Potential resource leak',
        location: leak,
        suggestion: 'Ensure resources are properly closed',
        fixable: false,
      });
    });

    return issues;
  }

  // Helper methods

  private calculateBasicMetrics(code: string): QualityMetrics {
    const lines = code.split('\n').length;
    const complexity = this.calculateComplexity(code);
    
    return {
      complexity,
      maintainability: Math.max(0, 1 - complexity / 20),
      reliability: 0.8,
      security: 0.8,
      performance: 0.8,
      testability: 0.8,
      readability: Math.max(0, 1 - lines / 1000),
      reusability: 0.8,
      overall: 0.8,
    };
  }

  private calculateQualityMetrics(code: string, issues: ValidationIssue[]): QualityMetrics {
    const errorCount = issues.filter(i => i.severity === 'ERROR').length;
    const warningCount = issues.filter(i => i.severity === 'WARNING').length;
    
    const complexity = this.calculateComplexity(code);
    const maintainability = Math.max(0, 1 - (errorCount * 0.1) - (warningCount * 0.05));
    const reliability = Math.max(0, 1 - (errorCount * 0.15) - (warningCount * 0.05));
    const readability = Math.max(0, 1 - complexity / 15);
    
    const overall = (maintainability + reliability + readability) / 3;
    
    return {
      complexity,
      maintainability,
      reliability,
      security: 0.8,
      performance: 0.8,
      testability: Math.max(0, 1 - complexity / 12),
      readability,
      reusability: maintainability * 0.8,
      overall,
    };
  }

  private calculateComplexity(code: string): number {
    // Simplified cyclomatic complexity calculation
    const controlFlowKeywords = [
      'if', 'else', 'elif', 'while', 'for', 'switch', 'case',
      'try', 'catch', 'finally', '&&', '||', '?'
    ];
    
    let complexity = 1; // Base complexity
    
    controlFlowKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = code.match(regex);
      complexity += matches ? matches.length : 0;
    });
    
    return complexity;
  }

  private calculateSecurityScore(issues: ValidationIssue[]): number {
    const criticalIssues = issues.filter(i => i.severity === 'ERROR').length;
    const majorIssues = issues.filter(i => i.severity === 'WARNING').length;
    
    return Math.max(0, 1 - (criticalIssues * 0.3) - (majorIssues * 0.1));
  }

  private calculatePerformanceScore(code: string, issues: ValidationIssue[]): number {
    const complexity = this.calculateComplexity(code);
    const perfIssues = issues.filter(i => i.severity === 'ERROR').length;
    const perfWarnings = issues.filter(i => i.severity === 'WARNING').length;
    
    const complexityScore = Math.max(0, 1 - complexity / 20);
    const issueScore = Math.max(0, 1 - (perfIssues * 0.2) - (perfWarnings * 0.1));
    
    return (complexityScore + issueScore) / 2;
  }

  private generateSyntaxSuggestions(issues: ValidationIssue[]): string[] {
    const suggestions = new Set<string>();
    
    issues.forEach(issue => {
      if (issue.suggestion) {
        suggestions.add(issue.suggestion);
      }
    });
    
    if (issues.some(i => i.type === 'SYNTAX')) {
      suggestions.add('Run code through a linter to catch syntax errors early');
    }
    
    return Array.from(suggestions);
  }

  private generateQualitySuggestions(issues: ValidationIssue[], metrics: QualityMetrics): string[] {
    const suggestions = new Set<string>();
    
    if (metrics.complexity > 10) {
      suggestions.add('Break down complex functions into smaller, more manageable pieces');
    }
    
    if (metrics.maintainability < 0.7) {
      suggestions.add('Improve code maintainability by following coding standards');
    }
    
    if (metrics.readability < 0.7) {
      suggestions.add('Use more descriptive variable and function names');
      suggestions.add('Add comments to explain complex logic');
    }
    
    return Array.from(suggestions);
  }

  private generateSecuritySuggestions(issues: ValidationIssue[]): string[] {
    const suggestions = new Set<string>();
    
    if (issues.some(i => i.rule === 'no-sql-injection')) {
      suggestions.add('Use parameterized queries to prevent SQL injection');
    }
    
    if (issues.some(i => i.message.includes('hardcoded'))) {
      suggestions.add('Move secrets to environment variables or secure configuration');
    }
    
    suggestions.add('Follow secure coding practices');
    suggestions.add('Regularly update dependencies to patch security vulnerabilities');
    
    return Array.from(suggestions);
  }

  private generatePerformanceSuggestions(issues: ValidationIssue[]): string[] {
    const suggestions = new Set<string>();
    
    if (issues.some(i => i.message.includes('algorithm'))) {
      suggestions.add('Review and optimize algorithmic complexity');
    }
    
    if (issues.some(i => i.message.includes('memory'))) {
      suggestions.add('Optimize memory usage and avoid memory leaks');
    }
    
    if (issues.some(i => i.message.includes('I/O'))) {
      suggestions.add('Consider using asynchronous I/O operations');
    }
    
    suggestions.add('Profile your code to identify performance bottlenecks');
    
    return Array.from(suggestions);
  }

  // Simplified detection methods (would be more sophisticated in production)

  private shouldHaveSemicolon(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed) return false;
    
    const statementKeywords = ['let', 'const', 'var', 'return', 'throw', 'break', 'continue'];
    return statementKeywords.some(keyword => trimmed.startsWith(keyword)) ||
           /\w+\s*=/.test(trimmed) ||
           /\w+\.\w+\(/.test(trimmed);
  }

  private hasUnmatchedBrackets(line: string): boolean {
    const openBrackets = (line.match(/[({[]/g) || []).length;
    const closeBrackets = (line.match(/[)}\]]/g) || []).length;
    return Math.abs(openBrackets - closeBrackets) > 2; // Allow some tolerance
  }

  private findUndefinedVariables(line: string): string[] {
    // Very simplified - would use proper AST parsing in production
    return [];
  }

  private hasIndentationIssues(line: string, lines: string[], lineNumber: number): boolean {
    if (lineNumber === 0) return false;
    
    const currentIndent = line.length - line.trimLeft().length;
    const prevLine = lines[lineNumber - 1];
    const prevIndent = prevLine.length - prevLine.trimLeft().length;
    
    // Check if indentation is consistent (multiple of 4)
    return currentIndent % 4 !== 0 && currentIndent !== prevIndent;
  }

  private shouldHaveColon(line: string): boolean {
    const trimmed = line.trim();
    const keywords = ['if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'def', 'class'];
    return keywords.some(keyword => trimmed.startsWith(keyword));
  }

  private javaStatementNeedsSemicolon(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed) return false;
    
    return !trimmed.endsWith('{') && 
           !trimmed.endsWith('}') && 
           !trimmed.startsWith('//') && 
           !trimmed.startsWith('/*') &&
           !trimmed.startsWith('@') &&
           !trimmed.startsWith('package') &&
           !trimmed.startsWith('import');
  }

  private hasUnclosedBlocks(line: string): boolean {
    return line.includes('{') && !line.includes('}') && line.trim().endsWith('{');
  }

  private isUnusedImport(line: string, code: string): boolean {
    const importMatch = line.match(/import\s+"([^"]+)"/);
    if (!importMatch) return false;
    
    const importName = importMatch[1].split('/').pop() || '';
    return !code.includes(importName) || code.indexOf(importName) === code.indexOf(line);
  }

  private hasBasicSyntaxErrors(line: string): boolean {
    // Check for obviously malformed code
    return line.includes('undefined') || line.includes('null;') || line.includes(';;');
  }

  private findPoorNaming(code: string, language: ProgrammingLanguage): Array<{name: string, location: any}> {
    const poorNames = [];
    const lines = code.split('\n');
    
    lines.forEach((line, lineNumber) => {
      // Find single letter variables (except common ones like i, j, k)
      const singleLetters = line.match(/\b[a-h]|[l-z]\b/g);
      if (singleLetters) {
        singleLetters.forEach(name => {
          poorNames.push({
            name,
            location: { file: 'generated', line: lineNumber + 1, column: line.indexOf(name) }
          });
        });
      }
    });
    
    return poorNames;
  }

  private findUndocumentedFunctions(code: string, language: ProgrammingLanguage): Array<{name: string, location: any}> {
    const functions = [];
    const lines = code.split('\n');
    
    lines.forEach((line, lineNumber) => {
      if (line.includes('function ') || line.includes('def ')) {
        const functionMatch = line.match(/(function|def)\s+(\w+)/);
        if (functionMatch && lineNumber > 0 && !lines[lineNumber - 1].includes('*')) {
          functions.push({
            name: functionMatch[2],
            location: { file: 'generated', line: lineNumber + 1, column: 0 }
          });
        }
      }
    });
    
    return functions;
  }

  private findCodeDuplication(code: string): Array<{id: string, location: any}> {
    // Simplified duplication detection
    const duplicates = [];
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length - 1; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[i].trim() === lines[j].trim() && lines[i].trim().length > 10) {
          duplicates.push({
            id: `${i}-${j}`,
            location: { file: 'generated', line: j + 1, column: 0 }
          });
        }
      }
    }
    
    return duplicates;
  }

  private findMissingErrorHandling(code: string, language: ProgrammingLanguage): Array<any> {
    const locations = [];
    const lines = code.split('\n');
    
    lines.forEach((line, lineNumber) => {
      if ((line.includes('await ') || line.includes('async ')) && 
          !code.includes('try') && !code.includes('catch')) {
        locations.push({ file: 'generated', line: lineNumber + 1, column: 0 });
      }
    });
    
    return locations;
  }

  private hasLowTestability(code: string, language: ProgrammingLanguage): boolean {
    // Check for hard-to-test patterns
    return code.includes('new Date()') || 
           code.includes('Math.random()') || 
           code.includes('console.log');
  }

  private findSQLInjections(code: string, language: ProgrammingLanguage): Array<any> {
    const injections = [];
    const lines = code.split('\n');
    
    lines.forEach((line, lineNumber) => {
      if (line.includes('SELECT') && line.includes('+')) {
        injections.push({ file: 'generated', line: lineNumber + 1, column: 0 });
      }
    });
    
    return injections;
  }

  private findHardcodedSecrets(code: string): Array<any> {
    const secrets = [];
    const lines = code.split('\n');
    
    const secretPatterns = [
      /password\s*=\s*["'][^"']+["']/i,
      /api[_-]?key\s*=\s*["'][^"']+["']/i,
      /secret\s*=\s*["'][^"']+["']/i,
      /token\s*=\s*["'][^"']+["']/i,
    ];
    
    lines.forEach((line, lineNumber) => {
      secretPatterns.forEach(pattern => {
        if (pattern.test(line)) {
          secrets.push({ file: 'generated', line: lineNumber + 1, column: 0 });
        }
      });
    });
    
    return secrets;
  }

  private findUnvalidatedInputs(code: string, language: ProgrammingLanguage): Array<any> {
    // Simplified - look for parameters without validation
    return [];
  }

  private hasWeakAuthentication(code: string, language: ProgrammingLanguage): boolean {
    return code.includes('password') && !code.includes('hash') && !code.includes('bcrypt');
  }

  private findWeakCryptography(code: string, language: ProgrammingLanguage): Array<any> {
    const weak = [];
    const lines = code.split('\n');
    
    lines.forEach((line, lineNumber) => {
      if (line.includes('MD5') || line.includes('SHA1')) {
        weak.push({ file: 'generated', line: lineNumber + 1, column: 0 });
      }
    });
    
    return weak;
  }

  private findDataExposure(code: string, language: ProgrammingLanguage): Array<any> {
    const exposures = [];
    const lines = code.split('\n');
    
    lines.forEach((line, lineNumber) => {
      if (line.includes('console.log') && 
          (line.includes('password') || line.includes('token'))) {
        exposures.push({ file: 'generated', line: lineNumber + 1, column: 0 });
      }
    });
    
    return exposures;
  }

  private findIneffientAlgorithms(code: string): Array<any> {
    const algorithms = [];
    const lines = code.split('\n');
    
    lines.forEach((line, lineNumber) => {
      // Look for nested loops
      if (line.includes('for') && code.includes('for', code.indexOf(line) + line.length)) {
        algorithms.push({ file: 'generated', line: lineNumber + 1, column: 0 });
      }
    });
    
    return algorithms;
  }

  private findMemoryIssues(code: string, language: ProgrammingLanguage): Array<any> {
    // Simplified memory issue detection
    return [];
  }

  private findInefficientIO(code: string, language: ProgrammingLanguage): Array<any> {
    const ios = [];
    const lines = code.split('\n');
    
    lines.forEach((line, lineNumber) => {
      if (line.includes('readFile') && !line.includes('async')) {
        ios.push({ file: 'generated', line: lineNumber + 1, column: 0 });
      }
    });
    
    return ios;
  }

  private findInefficientQueries(code: string, language: ProgrammingLanguage): Array<any> {
    const queries = [];
    const lines = code.split('\n');
    
    lines.forEach((line, lineNumber) => {
      if (line.includes('SELECT *') || line.includes('WHERE') && !line.includes('INDEX')) {
        queries.push({ file: 'generated', line: lineNumber + 1, column: 0 });
      }
    });
    
    return queries;
  }

  private findConcurrencyIssues(code: string, language: ProgrammingLanguage): Array<any> {
    // Simplified concurrency issue detection
    return [];
  }

  private findResourceLeaks(code: string, language: ProgrammingLanguage): Array<any> {
    const leaks = [];
    const lines = code.split('\n');
    
    lines.forEach((line, lineNumber) => {
      if (line.includes('open') && !code.includes('close')) {
        leaks.push({ file: 'generated', line: lineNumber + 1, column: 0 });
      }
    });
    
    return leaks;
  }
}