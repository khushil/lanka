import { CodeGenerationService } from '../../../src/modules/development/services/code-generation.service';
import { Neo4jService } from '../../../src/core/database/neo4j';
import {
  ProgrammingLanguage,
  CodeTemplateType,
  GenerationStrategy,
  ValidationLevel,
  GenerationStatus,
  CodeGenerationRequest,
  GenerationContext,
  AIModelConfig,
} from '../../../src/modules/development/types/code-generation.types';

jest.mock('../../../src/core/database/neo4j');
jest.mock('../../../src/core/logging/logger');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

// Mock AI service
const mockAIService = {
  generateCode: jest.fn(),
  analyzeCode: jest.fn(),
  suggestImprovements: jest.fn(),
  configure: jest.fn(),
};

// Mock template engine
const mockTemplateEngine = {
  renderTemplate: jest.fn(),
  loadTemplate: jest.fn(),
  validateTemplate: jest.fn(),
};

// Mock code validator
const mockCodeValidator = {
  validateSyntax: jest.fn(),
  validateQuality: jest.fn(),
  validateSecurity: jest.fn(),
  validatePerformance: jest.fn(),
};

jest.mock('../../../src/modules/development/services/ai.service', () => ({
  AIService: jest.fn().mockImplementation(() => mockAIService),
}));

jest.mock('../../../src/modules/development/services/template-engine.service', () => ({
  TemplateEngineService: jest.fn().mockImplementation(() => mockTemplateEngine),
}));

jest.mock('../../../src/modules/development/services/code-validator.service', () => ({
  CodeValidatorService: jest.fn().mockImplementation(() => mockCodeValidator),
}));

describe('CodeGenerationService', () => {
  let service: CodeGenerationService;
  let mockNeo4j: jest.Mocked<Neo4jService>;

  const mockRequest: CodeGenerationRequest = {
    id: 'req-1',
    requirementIds: ['req-1', 'req-2'],
    architectureIds: ['arch-1'],
    language: ProgrammingLanguage.TYPESCRIPT,
    templateType: CodeTemplateType.SERVICE,
    strategy: GenerationStrategy.AI_ASSISTED,
    context: {
      projectId: 'project-1',
      framework: 'nestjs',
      libraries: ['express', 'typeorm'],
      patterns: ['repository', 'service'],
      conventions: [],
      constraints: ['max-complexity: 10'],
      environment: 'development',
      teamPreferences: {},
    } as GenerationContext,
    validationLevel: ValidationLevel.FULL,
    createdAt: '2024-01-01T00:00:00Z',
    requestedBy: 'user-1',
  };

  beforeEach(() => {
    mockNeo4j = {
      executeQuery: jest.fn(),
    } as any;
    
    service = new CodeGenerationService(mockNeo4j);
    jest.clearAllMocks();
  });

  describe('generateCode', () => {
    it('should generate code successfully with AI assistance', async () => {
      const mockRequirements = [
        {
          r: {
            properties: {
              id: 'req-1',
              title: 'User Authentication',
              description: 'Implement user authentication service',
              type: 'FUNCTIONAL',
            },
          },
        },
      ];

      const mockArchitecture = [
        {
          ad: {
            properties: {
              id: 'arch-1',
              title: 'Microservices Architecture',
              description: 'Use microservices pattern',
            },
          },
        },
      ];

      const mockGeneratedCode = `
import { Injectable } from '@nestjs/common';
import { User } from './user.entity';

@Injectable()
export class UserService {
  async authenticate(username: string, password: string): Promise<User | null> {
    // Implementation here
    return null;
  }
}
      `;

      const mockValidationResult = {
        level: ValidationLevel.FULL,
        isValid: true,
        score: 0.85,
        issues: [],
        metrics: {
          complexity: 5,
          maintainability: 0.9,
          reliability: 0.8,
          security: 0.95,
          performance: 0.8,
          testability: 0.85,
          readability: 0.9,
          reusability: 0.8,
          overall: 0.85,
        },
        suggestions: ['Consider adding input validation'],
        validatedAt: '2024-01-01T00:00:00Z',
      };

      mockNeo4j.executeQuery
        .mockResolvedValueOnce(mockRequirements) // Get requirements
        .mockResolvedValueOnce(mockArchitecture) // Get architecture
        .mockResolvedValueOnce([]); // Store result

      mockAIService.generateCode.mockResolvedValue({
        code: mockGeneratedCode,
        confidence: 0.9,
        metadata: {
          aiModel: 'gpt-4',
          processingTime: 5000,
          tokenUsage: {
            promptTokens: 1000,
            completionTokens: 500,
            totalTokens: 1500,
          },
        },
      });

      mockCodeValidator.validateSyntax.mockResolvedValue({
        level: ValidationLevel.SYNTAX,
        isValid: true,
        score: 1.0,
        issues: [],
        metrics: {
          complexity: 2,
          maintainability: 0.9,
          reliability: 0.8,
          security: 0.9,
          performance: 0.8,
          testability: 0.85,
          readability: 0.9,
          reusability: 0.8,
          overall: 0.85,
        },
        suggestions: [],
        validatedAt: '2024-01-01T00:00:00Z',
      });
      
      mockCodeValidator.validateQuality.mockResolvedValue(mockValidationResult);
      
      mockCodeValidator.validateSecurity.mockResolvedValue({
        level: ValidationLevel.SECURITY,
        isValid: true,
        score: 0.95,
        issues: [],
        metrics: {
          complexity: 2,
          maintainability: 0.9,
          reliability: 0.8,
          security: 0.95,
          performance: 0.8,
          testability: 0.85,
          readability: 0.9,
          reusability: 0.8,
          overall: 0.85,
        },
        suggestions: [],
        validatedAt: '2024-01-01T00:00:00Z',
      });
      
      mockCodeValidator.validatePerformance.mockResolvedValue({
        level: ValidationLevel.PERFORMANCE,
        isValid: true,
        score: 0.8,
        issues: [],
        metrics: {
          complexity: 2,
          maintainability: 0.9,
          reliability: 0.8,
          security: 0.9,
          performance: 0.8,
          testability: 0.85,
          readability: 0.9,
          reusability: 0.8,
          overall: 0.8,
        },
        suggestions: [],
        validatedAt: '2024-01-01T00:00:00Z',
      });

      const result = await service.generateCode(mockRequest);

      expect(result).toBeDefined();
      expect(result.status).toBe(GenerationStatus.COMPLETED);
      expect(result.generatedFiles).toHaveLength(1);
      expect(result.generatedFiles[0].content).toBe(mockGeneratedCode);
      expect(result.validation.isValid).toBe(true);
      expect(result.validation.score).toBeCloseTo(0.89, 1); // Average of 1.0, 0.85, 0.95, 0.8
      expect(mockNeo4j.executeQuery).toHaveBeenCalledTimes(4); // getRequirements, getArchitecture, storeResult, logHistory
    });

    it('should generate code using template-based strategy', async () => {
      const templateRequest = {
        ...mockRequest,
        strategy: GenerationStrategy.TEMPLATE_BASED,
      };

      const mockTemplate = {
        id: 'template-1',
        name: 'NestJS Service Template',
        template: `
import { Injectable } from '@nestjs/common';

@Injectable()
export class {{serviceName}} {
  {{#methods}}
  {{name}}({{parameters}}): {{returnType}} {
    // TODO: Implement {{name}}
  }
  {{/methods}}
}
        `,
        variables: [],
        conditions: [],
        fragments: [],
        metadata: { version: '1.0.0' },
      };

      const mockRenderedCode = `
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  authenticate(username: string, password: string): Promise<User | null> {
    // TODO: Implement authenticate
  }
}
      `;

      mockNeo4j.executeQuery
        .mockResolvedValueOnce([]) // Get requirements
        .mockResolvedValueOnce([]) // Get architecture
        .mockResolvedValueOnce([]) // Store result
        .mockResolvedValueOnce([]); // Log history

      mockTemplateEngine.loadTemplate.mockResolvedValue(mockTemplate);
      mockTemplateEngine.renderTemplate.mockResolvedValue(mockRenderedCode);
      mockCodeValidator.validateSyntax.mockResolvedValue({
        level: ValidationLevel.SYNTAX,
        isValid: true,
        score: 1.0,
        issues: [],
        metrics: {
          complexity: 3,
          maintainability: 0.8,
          reliability: 0.75,
          security: 0.9,
          performance: 0.8,
          testability: 0.85,
          readability: 0.9,
          reusability: 0.8,
          overall: 0.8,
        },
        suggestions: [],
        validatedAt: '2024-01-01T00:00:00Z',
      });
      mockCodeValidator.validateQuality.mockResolvedValue({
        level: ValidationLevel.QUALITY,
        isValid: true,
        score: 0.8,
        issues: [],
        metrics: {
          complexity: 3,
          maintainability: 0.8,
          reliability: 0.75,
          security: 0.9,
          performance: 0.8,
          testability: 0.85,
          readability: 0.9,
          reusability: 0.8,
          overall: 0.8,
        },
        suggestions: [],
        validatedAt: '2024-01-01T00:00:00Z',
      });

      const result = await service.generateCode(templateRequest);

      expect(result.status).toBe(GenerationStatus.COMPLETED);
      expect(result.generatedFiles[0].content).toBe(mockRenderedCode);
      expect(mockTemplateEngine.loadTemplate).toHaveBeenCalled();
      expect(mockTemplateEngine.renderTemplate).toHaveBeenCalled();
    });

    it('should handle validation failures', async () => {
      const mockValidationResult = {
        level: ValidationLevel.SYNTAX,
        isValid: false,
        score: 0.3,
        issues: [
          {
            id: 'issue-1',
            type: 'SYNTAX' as const,
            severity: 'ERROR' as const,
            message: 'Syntax error: missing semicolon',
            location: {
              file: 'user.service.ts',
              line: 10,
              column: 25,
            },
            fixable: true,
          },
        ],
        metrics: {
          complexity: 2,
          maintainability: 0.3,
          reliability: 0.2,
          security: 0.8,
          performance: 0.7,
          testability: 0.4,
          readability: 0.3,
          reusability: 0.5,
          overall: 0.3,
        },
        suggestions: ['Fix syntax errors before proceeding'],
        validatedAt: '2024-01-01T00:00:00Z',
      };

      mockNeo4j.executeQuery
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockAIService.generateCode.mockResolvedValue({
        code: 'invalid code without semicolon',
        confidence: 0.9,
        metadata: {},
      });

      mockCodeValidator.validateSyntax.mockResolvedValue(mockValidationResult);

      const result = await service.generateCode(mockRequest);

      expect(result.status).toBe(GenerationStatus.FAILED);
      expect(result.validation.isValid).toBe(false);
      expect(result.validation.issues).toHaveLength(1);
      expect(result.validation.issues[0].type).toBe('SYNTAX');
    });

    it('should handle AI service errors gracefully', async () => {
      mockNeo4j.executeQuery
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockAIService.generateCode.mockRejectedValue(new Error('AI service unavailable'));

      await expect(service.generateCode(mockRequest)).rejects.toThrow('AI service unavailable');
    });
  });

  describe('validateCode', () => {
    const mockCode = `
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  async findUser(id: string): Promise<User | null> {
    return this.userRepository.findOne(id);
  }
}
    `;

    it('should validate code syntax', async () => {
      const mockValidationResult = {
        level: ValidationLevel.SYNTAX,
        isValid: true,
        score: 1.0,
        issues: [],
        metrics: {
          complexity: 2,
          maintainability: 0.9,
          reliability: 0.8,
          security: 0.9,
          performance: 0.8,
          testability: 0.85,
          readability: 0.9,
          reusability: 0.8,
          overall: 0.85,
        },
        suggestions: [],
        validatedAt: '2024-01-01T00:00:00Z',
      };

      mockCodeValidator.validateSyntax.mockResolvedValue(mockValidationResult);

      const result = await service.validateCode(mockCode, ProgrammingLanguage.TYPESCRIPT, ValidationLevel.SYNTAX);

      expect(result.isValid).toBe(true);
      expect(result.score).toBe(1.0);
      expect(mockCodeValidator.validateSyntax).toHaveBeenCalledWith(mockCode, ProgrammingLanguage.TYPESCRIPT);
    });

    it('should validate code quality', async () => {
      const mockQualityResult = {
        level: ValidationLevel.QUALITY,
        isValid: true,
        score: 0.8,
        issues: [
          {
            id: 'quality-1',
            type: 'QUALITY' as const,
            severity: 'WARNING' as const,
            message: 'Consider using async/await consistently',
            location: {
              file: 'user.service.ts',
              line: 5,
              column: 3,
            },
            fixable: true,
          },
        ],
        metrics: {
          complexity: 3,
          maintainability: 0.8,
          reliability: 0.8,
          security: 0.9,
          performance: 0.75,
          testability: 0.8,
          readability: 0.85,
          reusability: 0.8,
          overall: 0.8,
        },
        suggestions: ['Add error handling', 'Improve variable naming'],
        validatedAt: '2024-01-01T00:00:00Z',
      };

      // Mock syntax validation for QUALITY level (which always runs first)
      mockCodeValidator.validateSyntax.mockResolvedValue({
        level: ValidationLevel.SYNTAX,
        isValid: true,
        score: 1.0,
        issues: [],
        metrics: {
          complexity: 2,
          maintainability: 0.9,
          reliability: 0.8,
          security: 0.9,
          performance: 0.8,
          testability: 0.85,
          readability: 0.9,
          reusability: 0.8,
          overall: 0.85,
        },
        suggestions: [],
        validatedAt: '2024-01-01T00:00:00Z',
      });

      mockCodeValidator.validateQuality.mockResolvedValue(mockQualityResult);

      const result = await service.validateCode(mockCode, ProgrammingLanguage.TYPESCRIPT, ValidationLevel.QUALITY);

      expect(result.isValid).toBe(true);
      expect(result.score).toBe(0.9); // Average of 1.0 (syntax) and 0.8 (quality)
      expect(result.issues).toHaveLength(1);
      expect(result.suggestions).toHaveLength(2);
    });
  });

  describe('analyzeCodebase', () => {
    it('should analyze existing codebase structure', async () => {
      const projectId = 'project-1';
      const mockCodebaseData = [
        {
          files: [
            { path: 'src/user.service.ts', language: 'TYPESCRIPT', size: 1500 },
            { path: 'src/user.controller.ts', language: 'TYPESCRIPT', size: 800 },
            { path: 'test/user.test.ts', language: 'TYPESCRIPT', size: 600 },
          ],
          patterns: ['repository', 'service', 'controller'],
          dependencies: [
            { name: '@nestjs/common', version: '9.0.0', type: 'RUNTIME' },
            { name: 'typeorm', version: '0.3.0', type: 'RUNTIME' },
          ],
        },
      ];

      mockNeo4j.executeQuery.mockResolvedValue(mockCodebaseData);

      const result = await service.analyzeCodebase(projectId);

      expect(result).toBeDefined();
      expect(result.structure).toBeDefined();
      expect(result.dependencies).toHaveLength(2);
      expect(result.patterns).toHaveLength(3);
      expect(result.metrics.fileCount).toBe(3);
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (p:Project {id: $projectId})'),
        { projectId }
      );
    });

    it('should handle empty codebase', async () => {
      const projectId = 'empty-project';

      mockNeo4j.executeQuery.mockResolvedValue([]);

      const result = await service.analyzeCodebase(projectId);

      expect(result.structure.children).toHaveLength(0);
      expect(result.dependencies).toHaveLength(0);
      expect(result.patterns).toHaveLength(0);
      expect(result.metrics.fileCount).toBe(0);
    });
  });

  describe('generateTests', () => {
    it('should generate tests for generated code', async () => {
      const codeContent = `
export class UserService {
  async findUser(id: string): Promise<User | null> {
    return this.userRepository.findOne(id);
  }
}
      `;

      const mockTestCode = `
describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
  });

  describe('findUser', () => {
    it('should find user by id', async () => {
      const result = await service.findUser('1');
      expect(result).toBeDefined();
    });
  });
});
      `;

      mockAIService.generateCode.mockResolvedValue({
        code: mockTestCode,
        confidence: 0.8,
        metadata: {
          aiModel: 'gpt-4',
          processingTime: 3000,
        },
      });

      const result = await service.generateTests(codeContent, ProgrammingLanguage.TYPESCRIPT, 'jest');

      expect(result).toBeDefined();
      expect(result.content).toBe(mockTestCode);
      expect(result.framework).toBe('jest');
      expect(mockAIService.generateCode).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'test-generation',
          sourceCode: codeContent,
          language: ProgrammingLanguage.TYPESCRIPT,
          testFramework: 'jest',
        })
      );
    });

    it('should handle test generation errors', async () => {
      const codeContent = 'invalid code';

      mockAIService.generateCode.mockRejectedValue(new Error('Cannot generate tests for invalid code'));

      await expect(
        service.generateTests(codeContent, ProgrammingLanguage.TYPESCRIPT, 'jest')
      ).rejects.toThrow('Cannot generate tests for invalid code');
    });
  });

  describe('configurateAIModel', () => {
    it('should configure AI model settings', async () => {
      const config: AIModelConfig = {
        provider: 'OPENAI',
        model: 'gpt-4',
        version: '2024-01-01',
        parameters: {
          temperature: 0.7,
          maxTokens: 2000,
          topP: 0.9,
          frequencyPenalty: 0.1,
          presencePenalty: 0.1,
        },
        capabilities: {
          supportsCodeGeneration: true,
          supportsMultipleLanguages: true,
          supportsContextLearning: true,
          maxContextLength: 32000,
          supportedLanguages: [ProgrammingLanguage.TYPESCRIPT, ProgrammingLanguage.PYTHON],
        },
      };

      await service.configurateAIModel(config);

      // Verify configuration was applied
      const appliedConfig = service.getAIModelConfig();
      expect(appliedConfig?.model).toBe('gpt-4');
      expect(appliedConfig?.parameters.temperature).toBe(0.7);
      expect(appliedConfig?.capabilities.supportsCodeGeneration).toBe(true);
    });
  });

  describe('getGenerationHistory', () => {
    it('should retrieve generation history for a project', async () => {
      const projectId = 'project-1';
      const mockHistory = [
        {
          gh: {
            properties: {
              requestId: 'req-1',
              resultId: 'result-1',
              timestamp: '2024-01-01T00:00:00Z',
              user: 'user-1',
              success: true,
              duration: 5000,
              filesGenerated: 2,
              linesGenerated: 150,
              tokensUsed: 1500,
              cost: 0.05,
              qualityScore: 0.85,
              validationScore: 0.9,
            },
          },
        },
      ];

      mockNeo4j.executeQuery.mockResolvedValue(mockHistory);

      const result = await service.getGenerationHistory(projectId, 10);

      expect(result).toHaveLength(1);
      expect(result[0].requestId).toBe('req-1');
      expect(result[0].success).toBe(true);
      expect(result[0].metrics.filesGenerated).toBe(2);
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (p:Project {id: $projectId})'),
        expect.objectContaining({ projectId, limit: 10 })
      );
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      const errorRequest = {
        id: 'req-1',
        requirementIds: ['req-1'],
        architectureIds: ['arch-1'],
        language: ProgrammingLanguage.TYPESCRIPT,
        templateType: CodeTemplateType.SERVICE,
        strategy: GenerationStrategy.AI_ASSISTED,
        context: {} as GenerationContext,
        validationLevel: ValidationLevel.SYNTAX,
        createdAt: '2024-01-01T00:00:00Z',
        requestedBy: 'user-1',
      };

      mockNeo4j.executeQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.generateCode(errorRequest)).rejects.toThrow('Database connection failed');
    });

    it('should handle validation service errors', async () => {
      const mockCode = 'test code';

      mockCodeValidator.validateSyntax.mockRejectedValue(new Error('Validation service error'));

      await expect(
        service.validateCode(mockCode, ProgrammingLanguage.TYPESCRIPT, ValidationLevel.SYNTAX)
      ).rejects.toThrow('Validation service error');
    });
  });
});