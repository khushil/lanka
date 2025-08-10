// Injectable service - dependency injection handled at runtime
import { 
  SemanticSearchResult, 
  SemanticSearchOptions, 
  BugPattern, 
  PerformanceIssue, 
  SecurityVulnerability, 
  QualityMetrics, 
  RefactoringOpportunity,
  CodeStructureAnalysis,
  CodePattern,
  PatternFeedback,
  ProjectPattern,
  CrossProjectInsight,
  PatternRecommendation,
  CodeAnalysisOptions,
  ArchitectureAlignment,
  CodeAnalysisResult,
  MLModelInfo,
  LearnedPatternsExport
} from '../../../types/development.types';
// import * as parser from '@babel/parser';
// import traverse from '@babel/traverse';
import * as fs from 'fs/promises';
import * as path from 'path';
// import { glob } from 'glob';
import * as crypto from 'crypto';

// Service class with dependency injection support
export class CodeIntelligenceService {
  private mlModels: Map<string, MLModelInfo> = new Map();
  private patternDatabase: Map<string, CodePattern[]> = new Map();
  private crossProjectPatterns: Map<string, CrossProjectInsight> = new Map();
  private config: CodeAnalysisOptions = {
    enableMLPatterns: true,
    securityLevel: 'standard',
    performanceThreshold: 0.7,
    excludePatterns: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    includeExperimental: false,
    maxFileSize: 1024 * 1024, // 1MB
    timeout: 30000 // 30 seconds
  };

  constructor() {
    this.initializeModels();
  }

  public configure(options: CodeAnalysisOptions): void {
    this.config = { ...this.config, ...options };
  }

  // Semantic Code Search Implementation
  public async semanticSearch(
    query: string, 
    options: SemanticSearchOptions = {}
  ): Promise<SemanticSearchResult[]> {
    const searchOptions = {
      includeTests: true,
      maxResults: 50,
      minRelevanceScore: 0.1,
      ...options
    };

    try {
      const files = await this.getFilesForSearch(searchOptions);
      const results: SemanticSearchResult[] = [];

      for (const filePath of files) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const fileResults = await this.searchInFile(query, filePath, content);
          results.push(...fileResults);
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }

      // Sort by relevance score and limit results
      const sortedResults = results
        .filter(r => r.relevanceScore >= searchOptions.minRelevanceScore)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, searchOptions.maxResults);

      return sortedResults;
    } catch (error: any) {
      throw new Error(`Semantic search failed: ${error.message}`);
    }
  }

  private async getFilesForSearch(options: SemanticSearchOptions): Promise<string[]> {
    const patterns = options.fileTypes?.map(ext => `**/*${ext}`) || ['**/*.{js,ts,jsx,tsx,py,java,go,rb}'];
    const excludePatterns = [...(this.config.excludePatterns || []), ...(options.excludePatterns || [])];
    
    if (!options.includeTests) {
      excludePatterns.push('**/*.test.*', '**/*.spec.*', '**/test/**', '**/tests/**');
    }

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { ignore: excludePatterns });
      files.push(...matches);
    }

    return [...new Set(files)]; // Remove duplicates
  }

  private async searchInFile(
    query: string, 
    filePath: string, 
    content: string
  ): Promise<SemanticSearchResult[]> {
    const lines = content.split('\n');
    const results: SemanticSearchResult[] = [];
    const queryTerms = this.extractSearchTerms(query);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const relevanceScore = this.calculateRelevanceScore(line, queryTerms, query);
      
      if (relevanceScore > 0) {
        results.push({
          filePath,
          content: line.trim(),
          relevanceScore,
          lineNumber: i + 1,
          context: this.getLineContext(lines, i),
          matchedTerms: this.getMatchedTerms(line, queryTerms)
        });
      }
    }

    // Also perform semantic analysis if ML is enabled
    if (this.config.enableMLPatterns) {
      const semanticResults = await this.performSemanticAnalysis(query, content, filePath);
      results.push(...semanticResults);
    }

    return results;
  }

  private extractSearchTerms(query: string): string[] {
    // Extract meaningful terms from natural language query
    const terms = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2)
      .filter(term => !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(term));
    
    return terms;
  }

  private calculateRelevanceScore(line: string, queryTerms: string[], originalQuery: string): number {
    const lineLower = line.toLowerCase();
    let score = 0;

    // Exact phrase match gets highest score
    if (lineLower.includes(originalQuery.toLowerCase())) {
      score += 1.0;
    }

    // Term matches
    for (const term of queryTerms) {
      if (lineLower.includes(term)) {
        score += 0.3;
      }
    }

    // Boost for code-specific patterns
    if (this.isCodeLine(line)) {
      score *= 1.2;
    }

    // Boost for function/class definitions
    if (this.isFunctionOrClassDefinition(line)) {
      score *= 1.5;
    }

    return Math.min(score, 1.0);
  }

  private isCodeLine(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.length > 0 && 
           !trimmed.startsWith('//') && 
           !trimmed.startsWith('/*') && 
           !trimmed.startsWith('*') &&
           (trimmed.includes('function') || 
            trimmed.includes('class') || 
            trimmed.includes('const') || 
            trimmed.includes('let') || 
            trimmed.includes('var') ||
            trimmed.includes('=>') ||
            trimmed.includes('def ') ||
            trimmed.includes('public ') ||
            trimmed.includes('private '));
  }

  private isFunctionOrClassDefinition(line: string): boolean {
    const patterns = [
      /^\s*(function|async function|const|let)\s+\w+/,
      /^\s*class\s+\w+/,
      /^\s*(public|private|protected)\s+(static\s+)?(async\s+)?\w+\s*\(/,
      /^\s*def\s+\w+\s*\(/,
      /^\s*func\s+\w+\s*\(/
    ];
    
    return patterns.some(pattern => pattern.test(line));
  }

  private getLineContext(lines: string[], lineIndex: number): string {
    const start = Math.max(0, lineIndex - 2);
    const end = Math.min(lines.length, lineIndex + 3);
    return lines.slice(start, end).join('\n');
  }

  private getMatchedTerms(line: string, queryTerms: string[]): string[] {
    const lineLower = line.toLowerCase();
    return queryTerms.filter(term => lineLower.includes(term));
  }

  private async performSemanticAnalysis(
    _query: string, 
    _content: string, 
    _filePath: string
  ): Promise<SemanticSearchResult[]> {
    // This would integrate with ML models for semantic understanding
    // For now, return empty array - would be implemented with actual ML service
    return [];
  }

  // Bug Pattern Detection Implementation
  public async detectBugPatterns(codeContent: string, filePath: string): Promise<BugPattern[]> {
    const patterns: BugPattern[] = [];

    try {
      const ast = await this.parseToAST(codeContent, this.getLanguageFromPath(filePath));
      
      // Static analysis patterns
      patterns.push(...this.detectStaticBugPatterns(ast, codeContent));
      
      // Text-based patterns for quick detection
      patterns.push(...this.detectTextBasedBugPatterns(codeContent));

      // ML-based pattern detection if enabled
      if (this.config.enableMLPatterns) {
        const mlPatterns = await this.detectMLBugPatterns(codeContent, filePath);
        patterns.push(...mlPatterns);
      }

      return patterns.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity));
    } catch (error) {
      // Return syntax error as a bug pattern
      return [{
        type: 'syntax_error',
        severity: 'high',
        description: `Syntax error in code: ${(error as any).message}`,
        location: { line: 1, column: 1 },
        suggestion: 'Fix syntax errors before analyzing for other issues',
        confidence: 1.0,
        category: 'syntax'
      }];
    }
  }

  private detectStaticBugPatterns(ast: any, codeContent: string): BugPattern[] {
    const patterns: BugPattern[] = [];
    
    traverse(ast, {
      // Assignment in condition
      IfStatement: (path) => {
        if (path.node.test.type === 'AssignmentExpression') {
          patterns.push({
            type: 'assignment_in_condition',
            severity: 'high',
            description: 'Assignment used in condition instead of comparison',
            location: this.getLocationFromNode(path.node, codeContent),
            suggestion: 'Use === or == for comparison instead of =',
            confidence: 0.95,
            category: 'logic'
          });
        }
      },
      
      // Potential null dereference
      MemberExpression: (path) => {
        if (this.isPotentialNullDereference(path)) {
          patterns.push({
            type: 'potential_null_dereference',
            severity: 'medium',
            description: 'Potential null pointer dereference',
            location: this.getLocationFromNode(path.node, codeContent),
            suggestion: 'Add null check before accessing property',
            confidence: 0.7,
            category: 'runtime'
          });
        }
      },

      // Sequential awaits that could be parallel
      AwaitExpression: (path) => {
        if (this.hasSequentialAwaits(path)) {
          patterns.push({
            type: 'sequential_awaits',
            severity: 'medium',
            description: 'Sequential awaits that could run in parallel',
            location: this.getLocationFromNode(path.node, codeContent),
            suggestion: 'Consider using Promise.all() for independent async operations',
            confidence: 0.8,
            category: 'performance'
          });
        }
      }
    });

    return patterns;
  }

  private detectTextBasedBugPatterns(codeContent: string): BugPattern[] {
    const patterns: BugPattern[] = [];
    const lines = codeContent.split('\n');

    lines.forEach((line, index) => {
      // Common typos and mistakes
      if (line.includes('=!') && !line.includes('!==')) {
        patterns.push({
          type: 'likely_typo',
          severity: 'medium',
          description: 'Possible typo: =! instead of !=',
          location: { line: index + 1, column: line.indexOf('=!') + 1 },
          suggestion: 'Check if you meant != or !==',
          confidence: 0.8,
          category: 'logic'
        });
      }

      // Infinite loop patterns
      if (line.includes('while(true)') || line.includes('while (true)')) {
        patterns.push({
          type: 'infinite_loop',
          severity: 'high',
          description: 'Potential infinite loop detected',
          location: { line: index + 1, column: 1 },
          suggestion: 'Ensure there is a break condition in the loop',
          confidence: 0.9,
          category: 'logic'
        });
      }
    });

    return patterns;
  }

  private async detectMLBugPatterns(_codeContent: string, _filePath: string): Promise<BugPattern[]> {
    // This would integrate with ML models for advanced pattern detection
    // Mock implementation for now
    return [];
  }

  // Performance Anti-pattern Detection
  public async detectPerformanceIssues(codeContent: string, filePath: string): Promise<PerformanceIssue[]> {
    const issues: PerformanceIssue[] = [];

    try {
      const ast = await this.parseToAST(codeContent, this.getLanguageFromPath(filePath));
      
      issues.push(...this.detectN1Queries(ast, codeContent));
      issues.push(...this.detectMemoryLeaks(ast, codeContent));
      issues.push(...this.detectInefficiientAlgorithms(ast, codeContent));
      issues.push(...this.detectBlockingOperations(codeContent));

      return issues.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity));
    } catch (error) {
      return [];
    }
  }

  private detectN1Queries(ast: any, codeContent: string): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];
    
    traverse(ast, {
      ForStatement: (path) => {
        // Look for database queries inside loops
        let hasQuery = false;
        path.traverse({
          CallExpression: (innerPath) => {
            const callee = innerPath.node.callee;
            if (this.isDatabaseQuery(callee)) {
              hasQuery = true;
            }
          }
        });

        if (hasQuery) {
          issues.push({
            type: 'n_plus_one_query',
            severity: 'high',
            description: 'Potential N+1 query pattern detected',
            location: this.getLocationFromNode(path.node, codeContent),
            impact: 'Can cause severe performance degradation with large datasets',
            suggestion: 'Use JOIN queries, eager loading, or batch operations',
            estimatedImpact: {
              timeComplexity: 'O(n)',
              networkCalls: -1 // Variable based on loop iterations
            }
          });
        }
      }
    });

    return issues;
  }

  private detectMemoryLeaks(ast: any, codeContent: string): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    traverse(ast, {
      ClassDeclaration: (path) => {
        let hasUnboundedCollection = false;
        let hasEventListeners = false;

        path.traverse({
          AssignmentExpression: (innerPath) => {
            // Check for unbounded collections
            if (this.isUnboundedCollection(innerPath.node)) {
              hasUnboundedCollection = true;
            }
          },
          CallExpression: (innerPath) => {
            // Check for event listeners without cleanup
            if (this.isEventListenerRegistration(innerPath.node)) {
              hasEventListeners = true;
            }
          }
        });

        if (hasUnboundedCollection || hasEventListeners) {
          issues.push({
            type: 'memory_leak_potential',
            severity: 'medium',
            description: 'Potential memory leak: unbounded collections or unremoved event listeners',
            location: this.getLocationFromNode(path.node, codeContent),
            impact: 'Memory usage will grow over time',
            suggestion: 'Implement cleanup mechanisms, size limits, or use WeakMap/WeakSet',
            estimatedImpact: {
              memoryUsage: 'Growing'
            }
          });
        }
      }
    });

    return issues;
  }

  private detectInefficiientAlgorithms(ast: any, codeContent: string): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    traverse(ast, {
      ForStatement: (path) => {
        // Detect nested loops with same array
        let nestedLoopCount = 0;
        path.traverse({
          ForStatement: () => {
            nestedLoopCount++;
          }
        });

        if (nestedLoopCount > 1) {
          issues.push({
            type: 'inefficient_algorithm',
            severity: 'medium',
            description: 'Nested loops detected - potential O(n²) or higher complexity',
            location: this.getLocationFromNode(path.node, codeContent),
            impact: 'Performance degrades quadratically with input size',
            suggestion: 'Consider using hash maps, sets, or more efficient algorithms',
            estimatedImpact: {
              timeComplexity: 'O(n²)'
            }
          });
        }
      }
    });

    return issues;
  }

  private detectBlockingOperations(codeContent: string): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];
    const lines = codeContent.split('\n');

    const blockingPatterns = [
      'readFileSync',
      'writeFileSync',
      'execSync',
      'sleep(',
      'Thread.sleep'
    ];

    lines.forEach((line, index) => {
      for (const pattern of blockingPatterns) {
        if (line.includes(pattern) && line.includes('async')) {
          issues.push({
            type: 'blocking_operation',
            severity: 'high',
            description: 'Blocking operation in async function',
            location: { line: index + 1, column: line.indexOf(pattern) + 1 },
            impact: 'Blocks event loop and reduces concurrency',
            suggestion: 'Use async alternatives (readFile, writeFile, exec, etc.)',
            estimatedImpact: {
              timeComplexity: 'Blocking'
            }
          });
          break;
        }
      }
    });

    return issues;
  }

  // Security Vulnerability Scanning
  public async scanSecurityVulnerabilities(codeContent: string, filePath: string): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      vulnerabilities.push(...this.detectSQLInjection(codeContent));
      vulnerabilities.push(...this.detectXSSVulnerabilities(codeContent));
      vulnerabilities.push(...this.detectHardcodedCredentials(codeContent));
      vulnerabilities.push(...this.detectWeakRandomGeneration(codeContent));
      vulnerabilities.push(...this.detectPathTraversal(codeContent));
      vulnerabilities.push(...this.detectInsecureCrypto(codeContent));

      if (this.config.securityLevel === 'strict') {
        vulnerabilities.push(...this.detectAdvancedSecurityIssues(codeContent));
      }

      return vulnerabilities.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity));
    } catch (error) {
      throw new Error(`Security scan failed: ${(error as any).message}`);
    }
  }

  private detectSQLInjection(codeContent: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    const lines = codeContent.split('\n');

    const sqlInjectionPatterns = [
      /query.*=.*['"]\s*SELECT.*\+/i,
      /query.*=.*['"]\s*INSERT.*\+/i,
      /query.*=.*['"]\s*UPDATE.*\+/i,
      /query.*=.*['"]\s*DELETE.*\+/i,
      /execute\s*\(\s*['"]\s*SELECT.*\+/i
    ];

    lines.forEach((line, index) => {
      for (const pattern of sqlInjectionPatterns) {
        if (pattern.test(line)) {
          vulnerabilities.push({
            type: 'sql_injection',
            severity: 'high',
            description: 'Potential SQL injection vulnerability',
            location: { line: index + 1, column: 1 },
            cwe: 'CWE-89',
            owasp: 'A03:2021 – Injection',
            remediation: 'Use parameterized queries or prepared statements',
            impact: 'Unauthorized database access, data theft, or manipulation',
            exploitability: 0.9
          });
          break;
        }
      }
    });

    return vulnerabilities;
  }

  private detectXSSVulnerabilities(codeContent: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    const lines = codeContent.split('\n');

    const xssPatterns = [
      /innerHTML\s*=.*\+/,
      /outerHTML\s*=.*\+/,
      /document\.write\s*\(.*\+/,
      /\.html\s*\(.*\+/
    ];

    lines.forEach((line, index) => {
      for (const pattern of xssPatterns) {
        if (pattern.test(line)) {
          vulnerabilities.push({
            type: 'xss',
            severity: 'high',
            description: 'Potential Cross-Site Scripting (XSS) vulnerability',
            location: { line: index + 1, column: 1 },
            cwe: 'CWE-79',
            owasp: 'A03:2021 – Injection',
            remediation: 'Sanitize user input and use safe DOM manipulation methods',
            impact: 'Script execution in user browsers, session hijacking',
            exploitability: 0.8
          });
          break;
        }
      }
    });

    return vulnerabilities;
  }

  private detectHardcodedCredentials(codeContent: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    const lines = codeContent.split('\n');

    const credentialPatterns = [
      /password\s*[:=]\s*['"]\w+['"],?/i,
      /apikey\s*[:=]\s*['"][sk-]\w+['"],?/i,
      /secret\s*[:=]\s*['"]\w+['"],?/i,
      /token\s*[:=]\s*['"]\w{10,}['"],?/i,
      /key\s*[:=]\s*['"]\w{16,}['"],?/i
    ];

    lines.forEach((line, index) => {
      for (const pattern of credentialPatterns) {
        if (pattern.test(line)) {
          vulnerabilities.push({
            type: 'hardcoded_credentials',
            severity: 'critical',
            description: 'Hardcoded credentials detected',
            location: { line: index + 1, column: 1 },
            cwe: 'CWE-798',
            owasp: 'A07:2021 – Identification and Authentication Failures',
            remediation: 'Use environment variables or secure configuration files',
            impact: 'Unauthorized access if code is compromised',
            exploitability: 1.0
          });
          break;
        }
      }
    });

    return vulnerabilities;
  }

  private detectWeakRandomGeneration(codeContent: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    const lines = codeContent.split('\n');

    lines.forEach((line, index) => {
      if (line.includes('Math.random()') && (line.includes('token') || line.includes('password') || line.includes('key'))) {
        vulnerabilities.push({
          type: 'weak_random',
          severity: 'medium',
          description: 'Weak random number generation for security-sensitive values',
          location: { line: index + 1, column: line.indexOf('Math.random()') + 1 },
          cwe: 'CWE-338',
          remediation: 'Use cryptographically secure random generators (crypto.randomBytes)',
          impact: 'Predictable tokens that can be guessed by attackers',
          exploitability: 0.6
        });
      }
    });

    return vulnerabilities;
  }

  private detectPathTraversal(codeContent: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    const lines = codeContent.split('\n');

    const pathTraversalPatterns = [
      /sendFile\s*\(\s*.*\+/,
      /readFile\s*\(\s*.*\+/,
      /createReadStream\s*\(\s*.*\+/,
      /path\.join\s*\(\s*.*req\./
    ];

    lines.forEach((line, index) => {
      for (const pattern of pathTraversalPatterns) {
        if (pattern.test(line)) {
          vulnerabilities.push({
            type: 'path_traversal',
            severity: 'high',
            description: 'Potential path traversal vulnerability',
            location: { line: index + 1, column: 1 },
            cwe: 'CWE-22',
            owasp: 'A01:2021 – Broken Access Control',
            remediation: 'Validate and sanitize file paths, use path.resolve() securely',
            impact: 'Unauthorized file system access',
            exploitability: 0.7
          });
          break;
        }
      }
    });

    return vulnerabilities;
  }

  private detectInsecureCrypto(codeContent: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    const lines = codeContent.split('\n');

    const weakCryptoPatterns = [
      /createHash\s*\(\s*['"]md5['"],?\s*\)/i,
      /createHash\s*\(\s*['"]sha1['"],?\s*\)/i,
      /createCipher\s*\(\s*['"]des['"],?\s*\)/i,
      /createCipher\s*\(\s*['"]rc4['"],?\s*\)/i
    ];

    lines.forEach((line, index) => {
      for (const pattern of weakCryptoPatterns) {
        if (pattern.test(line)) {
          vulnerabilities.push({
            type: 'weak_crypto',
            severity: 'medium',
            description: 'Use of weak cryptographic algorithm',
            location: { line: index + 1, column: 1 },
            cwe: 'CWE-327',
            remediation: 'Use strong cryptographic algorithms (SHA-256, AES-256, etc.)',
            impact: 'Data can be more easily compromised',
            exploitability: 0.5
          });
          break;
        }
      }
    });

    return vulnerabilities;
  }

  private detectAdvancedSecurityIssues(_codeContent: string): SecurityVulnerability[] {
    // Additional security checks for strict mode
    return [];
  }

  // Code Quality Metrics Calculation
  public async calculateQualityMetrics(codeContent: string, filePath: string): Promise<QualityMetrics> {
    try {
      const ast = await this.parseToAST(codeContent, this.getLanguageFromPath(filePath));
      const lines = codeContent.split('\n');

      return {
        complexity: this.calculateComplexity(ast),
        maintainability: this.calculateMaintainability(ast, codeContent),
        testability: this.calculateTestability(ast),
        readability: this.calculateReadability(codeContent),
        linesOfCode: this.calculateLOC(lines),
        commentRatio: this.calculateCommentRatio(lines),
        duplicateCode: this.detectDuplicateCode(codeContent),
        technicalDebt: this.calculateTechnicalDebt(lines)
      };
    } catch (error) {
      // Return default metrics for unparseable code
      return this.getDefaultMetrics(codeContent);
    }
  }

  private calculateComplexity(ast: any): number {
    let complexity = 1; // Base complexity

    traverse(ast, {
      IfStatement: () => complexity++,
      ForStatement: () => complexity++,
      WhileStatement: () => complexity++,
      DoWhileStatement: () => complexity++,
      SwitchCase: () => complexity++,
      ConditionalExpression: () => complexity++,
      LogicalExpression: (path) => {
        if (path.node.operator === '||' || path.node.operator === '&&') {
          complexity++;
        }
      },
      CatchClause: () => complexity++
    });

    return complexity;
  }

  private calculateMaintainability(ast: any, codeContent: string): number {
    let score = 100;
    const lines = codeContent.split('\n');
    
    // Reduce score based on various factors
    const complexity = this.calculateComplexity(ast);
    score -= Math.max(0, complexity - 10) * 2; // Penalty for high complexity
    
    const loc = this.calculateLOC(lines);
    score -= Math.max(0, (loc - 200) / 10); // Penalty for large files
    
    // Function length penalty
    let maxFunctionLength = 0;
    traverse(ast, {
      FunctionDeclaration: (path) => {
        const start = path.node.loc?.start.line || 0;
        const end = path.node.loc?.end.line || 0;
        maxFunctionLength = Math.max(maxFunctionLength, end - start);
      }
    });
    score -= Math.max(0, maxFunctionLength - 50);
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateTestability(ast: any): number {
    let score = 100;
    let functionCount = 0;
    let highComplexityFunctions = 0;
    let staticMethods = 0;

    traverse(ast, {
      FunctionDeclaration: (path) => {
        functionCount++;
        const functionComplexity = this.calculateFunctionComplexity(path.node);
        if (functionComplexity > 10) {
          highComplexityFunctions++;
        }
      },
      ClassMethod: (path: any) => {
        if (path.node.static) {
          staticMethods++;
        }
      }
    });

    // Penalties
    if (functionCount > 0) {
      score -= (highComplexityFunctions / functionCount) * 30;
    }
    score -= staticMethods * 5; // Static methods harder to test

    return Math.max(0, Math.min(100, score));
  }

  private calculateReadability(codeContent: string): number {
    const lines = codeContent.split('\n');
    let score = 100;
    
    const averageLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
    score -= Math.max(0, (averageLineLength - 80) / 2); // Penalty for long lines
    
    const commentRatio = this.calculateCommentRatio(lines);
    score += commentRatio * 20; // Bonus for comments
    
    // Penalty for inconsistent indentation
    const indentationConsistency = this.calculateIndentationConsistency(lines);
    score -= (1 - indentationConsistency) * 20;
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateLOC(lines: string[]): number {
    return lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && 
             !trimmed.startsWith('//') && 
             !trimmed.startsWith('/*') && 
             !trimmed.startsWith('*') &&
             trimmed !== '{' &&
             trimmed !== '}';
    }).length;
  }

  private calculateCommentRatio(lines: string[]): number {
    const commentLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('//') || 
             trimmed.startsWith('/*') || 
             trimmed.startsWith('*');
    }).length;
    
    const totalLines = lines.filter(line => line.trim().length > 0).length;
    return totalLines > 0 ? commentLines / totalLines : 0;
  }

  private detectDuplicateCode(codeContent: string): QualityMetrics['duplicateCode'] {
    const lines = codeContent.split('\n');
    const blocks: Array<{ lines: number; occurrences: number; locations: Array<{ file: string; startLine: number; endLine: number }> }> = [];
    
    // Simple duplicate detection - in reality would be more sophisticated
    const lineGroups = new Map<string, number[]>();
    
    lines.forEach((line, index) => {
      const normalized = line.trim().replace(/\s+/g, ' ');
      if (normalized.length > 10) { // Only consider meaningful lines
        if (!lineGroups.has(normalized)) {
          lineGroups.set(normalized, []);
        }
        lineGroups.get(normalized)!.push(index + 1);
      }
    });
    
    let duplicateLines = 0;
    lineGroups.forEach((locations, line) => {
      if (locations.length > 1) {
        duplicateLines += locations.length;
        blocks.push({
          lines: 1,
          occurrences: locations.length,
          locations: locations.map(lineNum => ({
            file: 'current',
            startLine: lineNum,
            endLine: lineNum
          }))
        });
      }
    });
    
    const percentage = lines.length > 0 ? (duplicateLines / lines.length) * 100 : 0;
    
    return { percentage, blocks };
  }

  private calculateTechnicalDebt(lines: string[]): QualityMetrics['technicalDebt'] {
    let todos = 0;
    let fixmes = 0;
    let hacks = 0;

    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (lower.includes('todo')) todos++;
      if (lower.includes('fixme')) fixmes++;
      if (lower.includes('hack') || lower.includes('quick fix')) hacks++;
    });

    const estimatedHours = (todos * 0.5) + (fixmes * 1.5) + (hacks * 2);

    return { todos, fixmes, hacks, estimatedHours };
  }

  private calculateFunctionComplexity(node: any): number {
    let complexity = 1;
    
    traverse(node, {
      IfStatement: () => complexity++,
      ForStatement: () => complexity++,
      WhileStatement: () => complexity++,
      SwitchCase: () => complexity++,
      LogicalExpression: (path) => {
        if (path.node.operator === '||' || path.node.operator === '&&') {
          complexity++;
        }
      }
    });

    return complexity;
  }

  private calculateIndentationConsistency(lines: string[]): number {
    const indentations = lines
      .filter(line => line.trim().length > 0)
      .map(line => {
        const match = line.match(/^(\s*)/);
        return match ? match[1] : '';
      });

    if (indentations.length === 0) return 1;

    // Check if using consistent spaces or tabs
    const hasSpaces = indentations.some(indent => indent.includes(' '));
    const hasTabs = indentations.some(indent => indent.includes('\t'));
    
    if (hasSpaces && hasTabs) return 0.5; // Mixed indentation
    
    return 1; // Consistent indentation
  }

  private getDefaultMetrics(codeContent: string): QualityMetrics {
    const lines = codeContent.split('\n');
    return {
      complexity: 1,
      maintainability: 50,
      testability: 50,
      readability: 50,
      linesOfCode: this.calculateLOC(lines),
      commentRatio: this.calculateCommentRatio(lines),
      duplicateCode: { percentage: 0, blocks: [] },
      technicalDebt: this.calculateTechnicalDebt(lines)
    };
  }

  // Refactoring Opportunity Detection
  public async detectRefactoringOpportunities(codeContent: string, filePath: string): Promise<RefactoringOpportunity[]> {
    const opportunities: RefactoringOpportunity[] = [];

    try {
      const ast = await this.parseToAST(codeContent, this.getLanguageFromPath(filePath));
      const lines = codeContent.split('\n');

      opportunities.push(...this.detectExtractMethodOpportunities(ast, filePath));
      opportunities.push(...this.detectDuplicateCodeOpportunities(codeContent, filePath));
      opportunities.push(...this.detectLargeClassOpportunities(ast, filePath));
      opportunities.push(...this.detectLongParameterListOpportunities(ast, filePath));
      opportunities.push(...this.detectLongMethodOpportunities(ast, filePath));

      return opportunities.sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      });
    } catch (error) {
      return [];
    }
  }

  private detectExtractMethodOpportunities(ast: any, filePath: string): RefactoringOpportunity[] {
    const opportunities: RefactoringOpportunity[] = [];

    traverse(ast, {
      FunctionDeclaration: (path) => {
        const start = path.node.loc?.start.line || 0;
        const end = path.node.loc?.end.line || 0;
        const length = end - start;

        if (length > 30) { // Large function
          opportunities.push({
            type: 'extract_method',
            description: `Large function '${path.node.id?.name}' could be broken down into smaller methods`,
            location: {
              file: filePath,
              startLine: start,
              endLine: end
            },
            priority: length > 50 ? 'high' : 'medium',
            effort: length > 50 ? 'large' : 'medium',
            benefits: [
              'Improved readability',
              'Better testability',
              'Increased reusability',
              'Easier maintenance'
            ],
            suggestedRefactoring: `Break down ${path.node.id?.name} into smaller, focused methods`
          });
        }
      }
    });

    return opportunities;
  }

  private detectDuplicateCodeOpportunities(codeContent: string, filePath: string): RefactoringOpportunity[] {
    const opportunities: RefactoringOpportunity[] = [];
    const duplicateCode = this.detectDuplicateCode(codeContent);

    if (duplicateCode.percentage > 10) {
      duplicateCode.blocks.forEach(block => {
        if (block.occurrences > 2) {
          opportunities.push({
            type: 'duplicate_code',
            description: `Duplicate code block found in ${block.occurrences} locations`,
            location: {
              file: filePath,
              startLine: block.locations[0].startLine,
              endLine: block.locations[0].endLine
            },
            priority: block.occurrences > 3 ? 'high' : 'medium',
            effort: 'medium',
            benefits: [
              'Reduced code duplication',
              'Easier maintenance',
              'Consistent behavior'
            ],
            suggestedRefactoring: 'Extract common code into a shared function or utility',
            affectedFiles: block.locations.map(loc => loc.file).filter((f, i, arr) => arr.indexOf(f) === i)
          });
        }
      });
    }

    return opportunities;
  }

  private detectLargeClassOpportunities(ast: any, filePath: string): RefactoringOpportunity[] {
    const opportunities: RefactoringOpportunity[] = [];

    traverse(ast, {
      ClassDeclaration: (path) => {
        let methodCount = 0;
        let propertyCount = 0;

        path.traverse({
          MethodDefinition: () => methodCount++,
          PropertyDefinition: () => propertyCount++
        });

        const totalMembers = methodCount + propertyCount;
        if (totalMembers > 15) {
          opportunities.push({
            type: 'large_class',
            description: `Large class '${path.node.id?.name}' has ${totalMembers} members`,
            location: {
              file: filePath,
              startLine: path.node.loc?.start.line || 0,
              endLine: path.node.loc?.end.line || 0
            },
            priority: totalMembers > 25 ? 'high' : 'medium',
            effort: 'large',
            benefits: [
              'Better single responsibility principle',
              'Improved maintainability',
              'Easier testing',
              'More focused classes'
            ],
            suggestedRefactoring: `Split ${path.node.id?.name} into smaller, more focused classes`
          });
        }
      }
    });

    return opportunities;
  }

  private detectLongParameterListOpportunities(ast: any, filePath: string): RefactoringOpportunity[] {
    const opportunities: RefactoringOpportunity[] = [];

    traverse(ast, {
      FunctionDeclaration: (path) => {
        const paramCount = path.node.params.length;
        if (paramCount > 6) {
          opportunities.push({
            type: 'long_parameter_list',
            description: `Function '${path.node.id?.name}' has ${paramCount} parameters`,
            location: {
              file: filePath,
              startLine: path.node.loc?.start.line || 0,
              endLine: path.node.loc?.end.line || 0
            },
            priority: paramCount > 10 ? 'high' : 'medium',
            effort: 'medium',
            benefits: [
              'Improved readability',
              'Easier to use',
              'Better encapsulation',
              'Reduced coupling'
            ],
            suggestedRefactoring: 'Use parameter object or builder pattern'
          });
        }
      }
    });

    return opportunities;
  }

  private detectLongMethodOpportunities(ast: any, filePath: string): RefactoringOpportunity[] {
    const opportunities: RefactoringOpportunity[] = [];

    traverse(ast, {
      FunctionDeclaration: (path) => {
        const start = path.node.loc?.start.line || 0;
        const end = path.node.loc?.end.line || 0;
        const length = end - start;

        if (length > 50) {
          opportunities.push({
            type: 'long_method',
            description: `Method '${path.node.id?.name}' is ${length} lines long`,
            location: {
              file: filePath,
              startLine: start,
              endLine: end
            },
            priority: length > 100 ? 'high' : 'medium',
            effort: length > 100 ? 'large' : 'medium',
            benefits: [
              'Better readability',
              'Easier testing',
              'Improved maintainability',
              'Single responsibility'
            ],
            suggestedRefactoring: 'Break down into smaller, focused methods'
          });
        }
      }
    });

    return opportunities;
  }

  // AST-based Analysis
  public async parseToAST(codeContent: string, language: string = 'javascript'): Promise<any> {
    try {
      const plugins: any[] = ['jsx'];
      
      if (language === 'typescript') {
        plugins.push('typescript');
      }

      return parser.parse(codeContent, {
        sourceType: 'module',
        allowImportExportEverywhere: true,
        plugins
      });
    } catch (error) {
      throw new Error(`Failed to parse code: ${(error as any).message}`);
    }
  }

  public async analyzeCodeStructure(codeContent: string, filePath: string): Promise<CodeStructureAnalysis> {
    const ast = await this.parseToAST(codeContent, this.getLanguageFromPath(filePath));
    const analysis: CodeStructureAnalysis = {
      functions: [],
      classes: [],
      imports: [],
      exports: []
    };

    traverse(ast, {
      FunctionDeclaration: (path) => {
        analysis.functions.push({
          name: path.node.id?.name || 'anonymous',
          parameters: path.node.params.map((param: any) => param.name || 'destructured'),
          returnType: (path.node.returnType as any)?.typeAnnotation?.type,
          complexity: this.calculateFunctionComplexity(path.node),
          location: {
            startLine: path.node.loc?.start.line || 0,
            endLine: path.node.loc?.end.line || 0
          }
        });
      },

      ClassDeclaration: (path) => {
        const classInfo = {
          name: path.node.id?.name || 'anonymous',
          methods: [] as any[],
          properties: [] as any[],
          location: {
            startLine: path.node.loc?.start.line || 0,
            endLine: path.node.loc?.end.line || 0
          }
        };

        path.traverse({
          ClassMethod: (methodPath: any) => {
            classInfo.methods.push({
              name: (methodPath.node.key as any).name || 'computed',
              parameters: (methodPath.node.value as any).params?.map((param: any) => param.name || 'destructured') || [],
              returnType: (methodPath.node.value as any).returnType?.typeAnnotation?.type,
              visibility: this.getMethodVisibility(methodPath.node),
              isStatic: methodPath.node.static || false
            });
          },

          ClassProperty: (propPath: any) => {
            classInfo.properties.push({
              name: (propPath.node.key as any).name || 'computed',
              type: (propPath.node.typeAnnotation as any)?.typeAnnotation?.type,
              visibility: this.getPropertyVisibility(propPath.node),
              isStatic: propPath.node.static || false
            });
          }
        });

        analysis.classes.push(classInfo);
      },

      ImportDeclaration: (path) => {
        analysis.imports.push({
          module: path.node.source.value,
          imports: path.node.specifiers.map((spec: any) => spec.local.name),
          location: { line: path.node.loc?.start.line || 0 }
        });
      },

      ExportDeclaration: (path) => {
        if (path.node.type === 'ExportDefaultDeclaration') {
          analysis.exports.push({
            name: 'default',
            type: 'default',
            location: { line: path.node.loc?.start.line || 0 }
          });
        } else if (path.node.type === 'ExportNamedDeclaration') {
          path.node.specifiers?.forEach((spec: any) => {
            analysis.exports.push({
              name: spec.exported.name,
              type: 'named',
              location: { line: path.node.loc?.start.line || 0 }
            });
          });
        }
      }
    });

    return analysis;
  }

  // ML Pattern Matching
  public async trainPatternModels(trainingData: Array<{ code: string; pattern: string }>): Promise<void> {
    // In a real implementation, this would train ML models
    // For now, we'll store patterns in our local database
    trainingData.forEach(({ code, pattern }) => {
      // const hash = crypto.createHash('md5').update(code).digest('hex');
      if (!this.patternDatabase.has(pattern)) {
        this.patternDatabase.set(pattern, []);
      }
      
      this.patternDatabase.get(pattern)!.push({
        type: pattern,
        confidence: 0.8,
        description: `Pattern: ${pattern}`,
        examples: [code]
      });
    });
  }

  public async predictCodePatterns(codeContent: string, _filePath: string): Promise<CodePattern[]> {
    const patterns: CodePattern[] = [];

    // Simple pattern matching based on code structure
    if (codeContent.includes('class') && codeContent.includes('extends')) {
      patterns.push({
        type: 'inheritance',
        confidence: 0.9,
        description: 'Object-oriented inheritance pattern'
      });
    }

    if (codeContent.includes('async') && codeContent.includes('await')) {
      patterns.push({
        type: 'async_await',
        confidence: 0.95,
        description: 'Asynchronous programming pattern'
      });
    }

    if (codeContent.includes('map') && codeContent.includes('filter')) {
      patterns.push({
        type: 'functional_programming',
        confidence: 0.8,
        description: 'Functional programming with array methods'
      });
    }

    // ML-based patterns would be added here
    if (this.config.enableMLPatterns) {
      const mlPatterns = await this.predictMLPatterns(codeContent);
      patterns.push(...mlPatterns);
    }

    return patterns;
  }

  private async predictMLPatterns(_codeContent: string): Promise<CodePattern[]> {
    // Mock ML predictions - would integrate with actual ML service
    return [];
  }

  public async updatePatternModels(feedback: PatternFeedback): Promise<void> {
    // Update ML models based on feedback
    // In a real implementation, this would retrain or adjust model weights
    console.log(`Updating models with feedback: ${feedback.predictedPattern} -> ${feedback.actualPattern} (${feedback.accuracy})`);
  }

  // Cross-project Learning
  public async learnFromProjects(projectPatterns: ProjectPattern[]): Promise<void> {
    projectPatterns.forEach(project => {
      project.patterns.forEach(pattern => {
        if (!this.crossProjectPatterns.has(pattern)) {
          this.crossProjectPatterns.set(pattern, {
            pattern,
            frequency: 0,
            projects: [],
            effectiveness: 0.5,
            contexts: []
          });
        }

        const insight = this.crossProjectPatterns.get(pattern)!;
        insight.frequency++;
        insight.projects.push(project.projectId);
        insight.contexts.push(project.metadata.domain || 'unknown');
      });
    });
  }

  public async getCrossProjectInsights(): Promise<CrossProjectInsight[]> {
    return Array.from(this.crossProjectPatterns.values());
  }

  public async recommendPatterns(_projectInfo: any): Promise<PatternRecommendation[]> {
    const recommendations: PatternRecommendation[] = [];
    
    // Analyze cross-project patterns for similar projects
    this.crossProjectPatterns.forEach((insight) => {
      if (insight.frequency > 2) { // Pattern used in multiple projects
        const confidence = Math.min(insight.frequency / 10, 0.9);
        recommendations.push({
          pattern: insight.pattern,
          confidence,
          reason: `Used successfully in ${insight.projects.length} similar projects`,
          benefits: ['Proven effectiveness', 'Community adoption', 'Best practice'],
          implementation: `Consider implementing ${insight.pattern} pattern based on similar projects`
        });
      }
    });

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  public async exportLearnedPatterns(): Promise<LearnedPatternsExport> {
    const patterns = Array.from(this.patternDatabase.entries()).map(([name, patternList]) => ({
      name,
      definition: patternList[0], // Use first pattern as definition
      usage: patternList.length,
      effectiveness: 0.8 // Would be calculated based on feedback
    }));

    return {
      version: '1.0.0',
      timestamp: new Date(),
      patterns,
      metadata: {
        projectCount: this.crossProjectPatterns.size,
        codebaseSize: 0, // Would be calculated
        languages: ['javascript', 'typescript'] // Would be detected
      }
    };
  }

  // Integration Features
  public async analyzeWithArchitectureContext(
    codeContent: string,
    filePath: string,
    architectureData: any
  ): Promise<{ codeAnalysis: CodeAnalysisResult; architectureAlignment: ArchitectureAlignment }> {
    const codeAnalysis = await this.analyzeCode(codeContent, filePath);
    
    const architectureAlignment: ArchitectureAlignment = {
      score: this.calculateArchitectureAlignment(codeAnalysis, architectureData),
      issues: [],
      recommendations: []
    };

    // Check alignment with architectural patterns
    if (architectureData.patterns.includes('microservices')) {
      if (codeContent.includes('express') && !codeContent.includes('health')) {
        architectureAlignment.issues.push({
          type: 'missing_health_check',
          description: 'Microservice should include health check endpoint',
          severity: 'warning',
          suggestion: 'Add health check endpoint for service monitoring'
        });
      }
    }

    return { codeAnalysis, architectureAlignment };
  }

  public async getRecommendationsForRequirements(
    codeContent: string,
    requirements: any
  ): Promise<Array<{ type: string; priority: string; description: string }>> {
    const recommendations: Array<{ type: string; priority: string; description: string }> = [];

    if (requirements.performance === 'high') {
      const performanceIssues = await this.detectPerformanceIssues(codeContent, 'temp.js');
      performanceIssues.forEach(issue => {
        recommendations.push({
          type: 'performance',
          priority: issue.severity,
          description: issue.description
        });
      });
    }

    if (requirements.security === 'enterprise') {
      const vulnerabilities = await this.scanSecurityVulnerabilities(codeContent, 'temp.js');
      vulnerabilities.forEach(vuln => {
        recommendations.push({
          type: 'security',
          priority: vuln.severity,
          description: vuln.description
        });
      });
    }

    return recommendations;
  }

  public async analyzeCode(codeContent: string, filePath: string): Promise<CodeAnalysisResult> {
    const startTime = Date.now();
    
    try {
      const [
        metrics,
        bugPatterns,
        performanceIssues,
        securityVulnerabilities,
        refactoringOpportunities,
        codePatterns
      ] = await Promise.all([
        this.calculateQualityMetrics(codeContent, filePath),
        this.detectBugPatterns(codeContent, filePath),
        this.detectPerformanceIssues(codeContent, filePath),
        this.scanSecurityVulnerabilities(codeContent, filePath),
        this.detectRefactoringOpportunities(codeContent, filePath),
        this.predictCodePatterns(codeContent, filePath)
      ]);

      return {
        filePath,
        language: this.getLanguageFromPath(filePath),
        metrics,
        bugPatterns,
        performanceIssues,
        securityVulnerabilities,
        refactoringOpportunities,
        codePatterns,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        filePath,
        language: this.getLanguageFromPath(filePath),
        metrics: this.getDefaultMetrics(codeContent),
        bugPatterns: [],
        performanceIssues: [],
        securityVulnerabilities: [],
        refactoringOpportunities: [],
        codePatterns: [],
        errors: [{
          type: 'analysis_error',
          message: (error as any).message
        }],
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  public async analyzeFile(filePath: string): Promise<CodeAnalysisResult> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.analyzeCode(content, filePath);
    } catch (error) {
      throw new Error(`Failed to analyze file ${filePath}: ${(error as any).message}`);
    }
  }

  // Utility methods
  private getLanguageFromPath(filePath: string): string {
    const ext = path.extname(filePath);
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rb': 'ruby',
      '.php': 'php',
      '.cs': 'csharp',
      '.cpp': 'cpp',
      '.c': 'c'
    };
    return languageMap[ext] || 'unknown';
  }

  private getSeverityWeight(severity: string): number {
    const weights = { critical: 4, high: 3, medium: 2, low: 1 };
    return weights[severity as keyof typeof weights] || 0;
  }

  private getLocationFromNode(node: any, _codeContent: string): { line: number; column: number; endLine?: number; endColumn?: number } {
    return {
      line: node.loc?.start.line || 1,
      column: node.loc?.start.column || 1,
      endLine: node.loc?.end.line,
      endColumn: node.loc?.end.column
    };
  }

  private isPotentialNullDereference(path: any): boolean {
    // Simplified null dereference detection
    const object = path.node.object;
    return object && (
      object.type === 'Identifier' ||
      object.type === 'MemberExpression'
    );
  }

  private hasSequentialAwaits(path: any): boolean {
    // Check if there are multiple await expressions in the same scope
    let awaitCount = 0;
    path.getFunctionParent()?.traverse({
      AwaitExpression: () => awaitCount++
    });
    return awaitCount > 1;
  }

  private isDatabaseQuery(callee: any): boolean {
    const queryMethods = ['query', 'execute', 'find', 'findOne', 'save', 'update', 'delete'];
    return callee && (
      queryMethods.includes(callee.name) ||
      (callee.property && queryMethods.includes(callee.property.name))
    );
  }

  private isUnboundedCollection(node: any): boolean {
    // Check if assignment is to a collection that grows without bounds
    const right = node.right;
    const left = node.left;
    
    return right && left && (
      (right.type === 'NewExpression' && ['Map', 'Set', 'Array'].includes(right.callee.name)) ||
      (left.property && left.property.name && left.property.name.includes('cache'))
    );
  }

  private isEventListenerRegistration(node: any): boolean {
    const callee = node.callee;
    return callee && callee.property && (
      callee.property.name === 'addEventListener' ||
      callee.property.name === 'on' ||
      (callee.property.name && callee.property.name.startsWith('on'))
    );
  }

  private getMethodVisibility(node: any): 'public' | 'private' | 'protected' {
    // Simplified visibility detection
    if (node.key && node.key.name && node.key.name.startsWith('_')) {
      return 'private';
    }
    return 'public';
  }

  private getPropertyVisibility(node: any): 'public' | 'private' | 'protected' {
    // Simplified visibility detection
    if (node.key && node.key.name && node.key.name.startsWith('_')) {
      return 'private';
    }
    return 'public';
  }

  private calculateArchitectureAlignment(codeAnalysis: CodeAnalysisResult, architectureData: any): number {
    let score = 100;
    
    // Reduce score based on architectural misalignments
    // This is a simplified implementation
    if (architectureData.patterns.includes('microservices') && !codeAnalysis.filePath.includes('service')) {
      score -= 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  // private async callMLService(_data: any): Promise<any> {
  //   // Mock ML service call - would be replaced with actual ML integration
  //   throw new Error('Network error');
  // }

  private initializeModels(): void {
    // Initialize ML models and pattern databases
    this.mlModels.set('bug_detection', {
      name: 'Bug Detection Model',
      version: '1.0.0',
      accuracy: 0.85,
      trainingData: 10000,
      lastUpdated: new Date(),
      features: ['ast_features', 'text_features', 'context_features']
    });

    this.mlModels.set('pattern_recognition', {
      name: 'Pattern Recognition Model',
      version: '1.0.0',
      accuracy: 0.78,
      trainingData: 5000,
      lastUpdated: new Date(),
      features: ['code_structure', 'naming_patterns', 'usage_patterns']
    });
  }
}