import { logger } from '../../../../core/logging/logger';
import {
  CodeGenerationRequest,
  GeneratedFile,
  ProgrammingLanguage,
  CodeTemplateType,
} from '../../types/code-generation.types';
import { TemplateEngineService } from '../template-engine.service';

/**
 * Service responsible for template management and rendering logic
 * Extracted from CodeGenerationService to improve maintainability
 */
export class TemplateService {
  private templateEngine: TemplateEngineService;

  constructor() {
    this.templateEngine = new TemplateEngineService();
  }

  /**
   * Generate code from templates
   */
  async generateFromTemplate(
    request: CodeGenerationRequest, 
    requirements: any[], 
    architecture: any[]
  ): Promise<{ files: GeneratedFile[]; metadata: any }> {
    logger.info('Generating code from template', { templateType: request.templateType });

    const template = await this.templateEngine.loadTemplate({
      type: request.templateType,
      language: request.language,
      framework: request.context.framework,
    });

    const templateData = this.prepareTemplateData(request, requirements, architecture);
    const renderedCode = await this.templateEngine.renderTemplate(template, templateData);

    const generatedFile: GeneratedFile = {
      path: this.generateFilePath(request),
      content: renderedCode,
      language: request.language,
      type: request.templateType,
      size: renderedCode.length,
      checksum: this.calculateChecksum(renderedCode),
      dependencies: this.extractDependencies(renderedCode),
      imports: this.extractImports(renderedCode, request.language),
      exports: this.extractExports(renderedCode, request.language),
      functions: this.extractFunctions(renderedCode, request.language),
      classes: this.extractClasses(renderedCode, request.language),
      interfaces: this.extractInterfaces(renderedCode, request.language),
    };

    return {
      files: [generatedFile],
      metadata: {
        template: template.name,
        templateVersion: template.metadata.version,
      },
    };
  }

  /**
   * Load and configure template engine
   */
  async loadTemplate(config: {
    type: CodeTemplateType;
    language: ProgrammingLanguage;
    framework?: string;
  }) {
    return this.templateEngine.loadTemplate(config);
  }

  /**
   * Render template with provided data
   */
  async renderTemplate(template: any, data: any): Promise<string> {
    return this.templateEngine.renderTemplate(template, data);
  }

  // Private helper methods

  private prepareTemplateData(request: CodeGenerationRequest, requirements: any[], architecture: any[]): any {
    return {
      requirements,
      architecture,
      context: request.context,
      language: request.language,
      templateType: request.templateType,
    };
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

  private getBaseFileName(templateType: CodeTemplateType): string {
    switch (templateType) {
      case CodeTemplateType.SERVICE: return 'service';
      case CodeTemplateType.CONTROLLER: return 'controller';
      case CodeTemplateType.MODEL: return 'model';
      case CodeTemplateType.COMPONENT: return 'component';
      case CodeTemplateType.TEST: return 'test';
      case CodeTemplateType.CONFIG: return 'config';
      case CodeTemplateType.MIDDLEWARE: return 'middleware';
      case CodeTemplateType.UTILITY: return 'util';
      case CodeTemplateType.API_ENDPOINT: return 'api';
      case CodeTemplateType.DATABASE_MIGRATION: return 'migration';
      default: return 'generated';
    }
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