import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../../core/logging/logger';
import {
  CodeGenerationRequest,
  GeneratedFile,
  AIModelConfig,
  CodeSuggestion,
  ProgrammingLanguage,
} from '../../types/code-generation.types';
import { AIService } from '../ai.service';

/**
 * Service responsible for AI integration and interaction logic
 * Extracted from CodeGenerationService to improve maintainability
 */
export class AIIntegrationService {
  private aiService: AIService;
  private aiModelConfig?: AIModelConfig;

  constructor() {
    this.aiService = new AIService();
  }

  /**
   * Configure AI model settings
   */
  async configure(config: AIModelConfig): Promise<void> {
    try {
      logger.info('Configuring AI model', { 
        provider: config.provider, 
        model: config.model 
      });

      this.aiModelConfig = config;
      await this.aiService.configure(config);

      logger.info('AI model configured successfully');
    } catch (error) {
      logger.error('AI model configuration failed', { error });
      throw error;
    }
  }

  /**
   * Get current AI model configuration
   */
  getConfig(): AIModelConfig | undefined {
    return this.aiModelConfig;
  }

  /**
   * Generate code using AI assistance
   */
  async generateWithAI(
    request: CodeGenerationRequest, 
    requirements: any[], 
    architecture: any[]
  ): Promise<{ files: GeneratedFile[]; metadata: any }> {
    logger.info('Generating code with AI assistance');

    const aiResponse = await this.aiService.generateCode({
      requirements,
      architecture,
      language: request.language,
      templateType: request.templateType,
      context: request.context,
      customPrompts: request.customPrompts,
    });

    const files = this.processAIResponse(aiResponse, request);

    return {
      files,
      metadata: {
        aiModel: aiResponse.metadata?.aiModel,
        confidence: aiResponse.confidence,
        tokenUsage: aiResponse.metadata?.tokenUsage,
      },
    };
  }

  /**
   * Generate code using hybrid approach (template + AI enhancement)
   */
  async generateHybrid(
    request: CodeGenerationRequest, 
    requirements: any[], 
    architecture: any[],
    baseCode: string
  ): Promise<{ files: GeneratedFile[]; metadata: any }> {
    logger.info('Generating code with hybrid strategy');

    // Enhance base code with AI
    const enhancedResponse = await this.aiService.generateCode({
      baseCode: baseCode,
      requirements,
      architecture,
      language: request.language,
      enhancementType: 'refine',
      context: request.context,
    });

    const enhancedFiles = this.processAIResponse(enhancedResponse, request);

    return {
      files: enhancedFiles,
      metadata: {
        aiModel: enhancedResponse.metadata?.aiModel,
        confidence: enhancedResponse.confidence,
        tokenUsage: enhancedResponse.metadata?.tokenUsage,
        hybridStrategy: true,
      },
    };
  }

  /**
   * Generate tests for existing or generated code
   */
  async generateTests(
    codeContent: string, 
    language: ProgrammingLanguage, 
    framework: string
  ): Promise<{ content: string; framework: string; coverage: number }> {
    try {
      logger.info('Generating tests', { language, framework });

      const aiResponse = await this.aiService.generateCode({
        type: 'test-generation',
        sourceCode: codeContent,
        language,
        testFramework: framework,
        includeSetup: true,
        includeTeardown: true,
        generateMocks: true,
      });

      return {
        content: aiResponse.code || '',
        framework,
        coverage: aiResponse.metadata?.estimatedCoverage || 0.8,
      };
    } catch (error) {
      logger.error('Test generation failed', { error });
      throw error;
    }
  }

  /**
   * Generate code suggestions for improvement
   */
  async generateSuggestions(files: GeneratedFile[]): Promise<CodeSuggestion[]> {
    const suggestions: CodeSuggestion[] = [];

    // Generate improvement suggestions using AI
    for (const file of files) {
      try {
        const aiSuggestions = await this.aiService.suggestImprovements(file.content, file.language);
        suggestions.push(...aiSuggestions);
      } catch (error) {
        logger.warn('Failed to generate AI suggestions', { file: file.path, error });
      }
    }

    return suggestions;
  }

  /**
   * Generate code from detected patterns
   */
  async generateFromPatterns(
    matchingPatterns: any[], 
    request: CodeGenerationRequest
  ): Promise<GeneratedFile[]> {
    logger.info('Generating code from AI-analyzed patterns');

    const aiResponse = await this.aiService.generateCode({
      patterns: matchingPatterns,
      language: request.language,
      templateType: request.templateType,
      context: request.context,
      type: 'pattern-based',
    });

    return this.processAIResponse(aiResponse, request);
  }

  /**
   * Analyze code for potential improvements
   */
  async analyzeCode(
    code: string, 
    language: ProgrammingLanguage
  ): Promise<{ 
    suggestions: CodeSuggestion[];
    complexity: number;
    maintainability: number;
    issues: string[];
  }> {
    try {
      const analysis = await this.aiService.analyzeCode({
        code,
        language,
        analysisType: 'comprehensive',
      });

      return {
        suggestions: analysis.suggestions || [],
        complexity: analysis.metrics?.complexity || 0,
        maintainability: analysis.metrics?.maintainability || 0,
        issues: analysis.issues || [],
      };
    } catch (error) {
      logger.error('Code analysis failed', { error });
      throw error;
    }
  }

  /**
   * Optimize code using AI suggestions
   */
  async optimizeCode(
    code: string,
    language: ProgrammingLanguage,
    optimizationType: 'performance' | 'readability' | 'security' | 'general' = 'general'
  ): Promise<{ optimizedCode: string; improvements: string[] }> {
    try {
      const optimizationResponse = await this.aiService.optimizeCode({
        code,
        language,
        optimizationType,
      });

      return {
        optimizedCode: optimizationResponse.code || code,
        improvements: optimizationResponse.improvements || [],
      };
    } catch (error) {
      logger.error('Code optimization failed', { error });
      throw error;
    }
  }

  // Private helper methods

  private processAIResponse(aiResponse: any, request: CodeGenerationRequest): GeneratedFile[] {
    if (aiResponse.files) {
      return aiResponse.files.map((file: any) => ({
        path: file.path || this.generateFilePath(request),
        content: file.content,
        language: request.language,
        type: file.type || request.templateType,
        size: file.content.length,
        checksum: this.calculateChecksum(file.content),
        dependencies: this.extractDependencies(file.content),
        imports: this.extractImports(file.content, request.language),
        exports: this.extractExports(file.content, request.language),
        functions: this.extractFunctions(file.content, request.language),
        classes: this.extractClasses(file.content, request.language),
        interfaces: this.extractInterfaces(file.content, request.language),
      }));
    } else {
      return [{
        path: this.generateFilePath(request),
        content: aiResponse.code,
        language: request.language,
        type: request.templateType,
        size: aiResponse.code.length,
        checksum: this.calculateChecksum(aiResponse.code),
        dependencies: this.extractDependencies(aiResponse.code),
        imports: this.extractImports(aiResponse.code, request.language),
        exports: this.extractExports(aiResponse.code, request.language),
        functions: this.extractFunctions(aiResponse.code, request.language),
        classes: this.extractClasses(aiResponse.code, request.language),
        interfaces: this.extractInterfaces(aiResponse.code, request.language),
      }];
    }
  }

  private generateFilePath(request: CodeGenerationRequest): string {
    const extension = this.getFileExtension(request.language);
    const baseName = this.getBaseFileName(request.templateType);
    return `${request.outputPath || 'src'}/${baseName}.${extension}`;
  }

  private getFileExtension(language: ProgrammingLanguage): string {
    switch (language) {
      case ProgrammingLanguage.TYPESCRIPT: return 'ts';
      case ProgrammingLanguage.JAVASCRIPT: return 'js';
      case ProgrammingLanguage.PYTHON: return 'py';
      case ProgrammingLanguage.JAVA: return 'java';
      case ProgrammingLanguage.GO: return 'go';
      case ProgrammingLanguage.RUST: return 'rs';
      case ProgrammingLanguage.CSHARP: return 'cs';
      case ProgrammingLanguage.PHP: return 'php';
      case ProgrammingLanguage.RUBY: return 'rb';
      case ProgrammingLanguage.KOTLIN: return 'kt';
      case ProgrammingLanguage.SWIFT: return 'swift';
      default: return 'txt';
    }
  }

  private getBaseFileName(templateType: any): string {
    // Simplified implementation - should match the original
    return templateType?.toString().toLowerCase() || 'generated';
  }

  private calculateChecksum(content: string): string {
    // Simple hash implementation
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private extractDependencies(code: string): string[] {
    // Extract dependencies from import statements
    const importRegex = /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g;
    const dependencies: string[] = [];
    let match;
    while ((match = importRegex.exec(code)) !== null) {
      dependencies.push(match[1]);
    }
    return [...new Set(dependencies)];
  }

  private extractImports(code: string, language: ProgrammingLanguage): string[] {
    // Language-specific import extraction
    const importRegex = language === ProgrammingLanguage.PYTHON 
      ? /import\s+([^\s\n]+)|from\s+([^\s\n]+)\s+import/g
      : /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]|import\s+['"`]([^'"`]+)['"`]/g;
    
    const imports: string[] = [];
    let match;
    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[1] || match[2]);
    }
    return [...new Set(imports)];
  }

  private extractExports(code: string, _language: ProgrammingLanguage): string[] {
    // Language-specific export extraction
    const exportRegex = /export\s+(?:default\s+)?(?:class|interface|function|const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
    const exports: string[] = [];
    let match;
    while ((match = exportRegex.exec(code)) !== null) {
      exports.push(match[1]);
    }
    return exports;
  }

  private extractFunctions(code: string, _language: ProgrammingLanguage): any[] {
    // Simplified function extraction
    const functionRegex = /function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
    const functions: any[] = [];
    let match;
    while ((match = functionRegex.exec(code)) !== null) {
      functions.push({
        name: match[1],
        parameters: [],
        returnType: 'any',
        visibility: 'PUBLIC',
        isAsync: false,
        complexity: 1,
      });
    }
    return functions;
  }

  private extractClasses(code: string, _language: ProgrammingLanguage): any[] {
    // Simplified class extraction
    const classRegex = /class\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
    const classes: any[] = [];
    let match;
    while ((match = classRegex.exec(code)) !== null) {
      classes.push({
        name: match[1],
        extends: undefined,
        implements: [],
        properties: [],
        methods: [],
        visibility: 'PUBLIC',
        isAbstract: false,
      });
    }
    return classes;
  }

  private extractInterfaces(code: string, _language: ProgrammingLanguage): any[] {
    // Simplified interface extraction
    const interfaceRegex = /interface\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
    const interfaces: any[] = [];
    let match;
    while ((match = interfaceRegex.exec(code)) !== null) {
      interfaces.push({
        name: match[1],
        extends: [],
        properties: [],
        methods: [],
      });
    }
    return interfaces;
  }
}