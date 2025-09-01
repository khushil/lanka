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

// Mock the extracted services
const mockTemplateService = {
  generateFromTemplate: jest.fn(),
  loadTemplate: jest.fn(),
  renderTemplate: jest.fn(),
};

const mockValidationService = {
  validateCode: jest.fn(),
  validateGeneratedFiles: jest.fn(),
  getValidationMetrics: jest.fn(),
  meetsQualityStandards: jest.fn(),
};

const mockAIIntegrationService = {
  configure: jest.fn(),
  getConfig: jest.fn(),
  generateWithAI: jest.fn(),
  generateHybrid: jest.fn(),
  generateTests: jest.fn(),
  generateSuggestions: jest.fn(),
  generateFromPatterns: jest.fn(),
  analyzeCode: jest.fn(),
  optimizeCode: jest.fn(),
};

jest.mock('../../../src/modules/development/services/code-generation/template.service', () => ({
  TemplateService: jest.fn().mockImplementation(() => mockTemplateService),
}));

jest.mock('../../../src/modules/development/services/code-generation/validation.service', () => ({
  ValidationService: jest.fn().mockImplementation(() => mockValidationService),
}));

jest.mock('../../../src/modules/development/services/code-generation/ai-integration.service', () => ({
  AIIntegrationService: jest.fn().mockImplementation(() => mockAIIntegrationService),
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
              decision: 'Use microservices pattern',
            },
          },
        },
      ];

      const mockGeneratedFiles = [
        {
          path: 'src/auth/auth.service.ts',
          content: 'export class AuthService { }',
          language: ProgrammingLanguage.TYPESCRIPT,
          type: CodeTemplateType.SERVICE,
          size: 30,
          checksum: 'abc123',
          dependencies: [],
          imports: [],
          exports: ['AuthService'],
          functions: [],
          classes: [{ name: 'AuthService' }],
          interfaces: [],
        },
      ];

      const mockValidation = {
        level: ValidationLevel.FULL,
        isValid: true,
        score: 0.85,
        issues: [],
        metrics: {
          complexity: 0.8,
          maintainability: 0.9,
          reliability: 0.85,
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

      const mockSuggestions = [
        {
          id: 'sug-1',
          type: 'OPTIMIZATION' as const,
          title: 'Add error handling',
          description: 'Consider adding comprehensive error handling',
          impact: 'MEDIUM' as const,
          effort: 'LOW' as const,
          benefits: ['Improved reliability'],
        },
      ];

      // Setup mocks
      mockNeo4j.executeQuery
        .mockResolvedValueOnce(mockRequirements) // getRequirements
        .mockResolvedValueOnce(mockArchitecture) // getArchitectureDecisions
        .mockResolvedValueOnce([]) // storeGenerationResult
        .mockResolvedValueOnce([]); // logGenerationHistory

      mockAIIntegrationService.generateWithAI.mockResolvedValue({
        files: mockGeneratedFiles,
        metadata: {
          aiModel: 'gpt-4',
          confidence: 0.9,
          tokenUsage: { totalTokens: 1000, cost: 0.02 },
        },
      });

      mockValidationService.validateGeneratedFiles.mockResolvedValue(mockValidation);
      mockAIIntegrationService.generateSuggestions.mockResolvedValue(mockSuggestions);

      const result = await service.generateCode(mockRequest);

      expect(result).toMatchObject({
        id: 'test-uuid',
        requestId: 'req-1',
        generatedFiles: mockGeneratedFiles,
        validation: mockValidation,
        suggestions: mockSuggestions,
        status: GenerationStatus.COMPLETED,
      });

      expect(mockAIIntegrationService.generateWithAI).toHaveBeenCalledWith(
        mockRequest,
        mockRequirements,
        mockArchitecture
      );
      expect(mockValidationService.validateGeneratedFiles).toHaveBeenCalledWith(
        mockGeneratedFiles,
        ValidationLevel.FULL
      );
      expect(mockAIIntegrationService.generateSuggestions).toHaveBeenCalledWith(mockGeneratedFiles);
    });

    it('should generate code using template strategy', async () => {
      const templateRequest = {
        ...mockRequest,
        strategy: GenerationStrategy.TEMPLATE_BASED,
      };

      const mockTemplateFiles = [
        {
          path: 'src/service.ts',
          content: 'template content',
          language: ProgrammingLanguage.TYPESCRIPT,
          type: CodeTemplateType.SERVICE,
          size: 16,
          checksum: 'def456',
          dependencies: [],
          imports: [],
          exports: [],
          functions: [],
          classes: [],
          interfaces: [],
        },
      ];

      // Setup mocks
      mockNeo4j.executeQuery
        .mockResolvedValueOnce([]) // getRequirements
        .mockResolvedValueOnce([]) // getArchitectureDecisions
        .mockResolvedValueOnce([]) // storeGenerationResult
        .mockResolvedValueOnce([]); // logGenerationHistory

      mockTemplateService.generateFromTemplate.mockResolvedValue({
        files: mockTemplateFiles,
        metadata: { template: 'service-template', templateVersion: '1.0.0' },
      });

      mockValidationService.validateGeneratedFiles.mockResolvedValue({
        level: ValidationLevel.FULL,
        isValid: true,
        score: 0.9,
        issues: [],
        metrics: {} as any,
        suggestions: [],
        validatedAt: '2024-01-01T00:00:00Z',
      });

      mockAIIntegrationService.generateSuggestions.mockResolvedValue([]);

      const result = await service.generateCode(templateRequest);

      expect(result.status).toBe(GenerationStatus.COMPLETED);
      expect(mockTemplateService.generateFromTemplate).toHaveBeenCalled();
    });

    it('should generate code using hybrid strategy', async () => {
      const hybridRequest = {
        ...mockRequest,
        strategy: GenerationStrategy.HYBRID,
      };

      const mockTemplateFiles = [
        {
          path: 'src/service.ts',
          content: 'template content',
          language: ProgrammingLanguage.TYPESCRIPT,
          type: CodeTemplateType.SERVICE,
          size: 16,
          checksum: 'def456',
          dependencies: [],
          imports: [],
          exports: [],
          functions: [],
          classes: [],
          interfaces: [],
        },
      ];

      const mockEnhancedFiles = [
        {
          ...mockTemplateFiles[0],
          content: 'enhanced template content',
          size: 25,
        },
      ];

      // Setup mocks
      mockNeo4j.executeQuery
        .mockResolvedValueOnce([]) // getRequirements
        .mockResolvedValueOnce([]) // getArchitectureDecisions
        .mockResolvedValueOnce([]) // storeGenerationResult
        .mockResolvedValueOnce([]); // logGenerationHistory

      mockTemplateService.generateFromTemplate.mockResolvedValue({
        files: mockTemplateFiles,
        metadata: { template: 'service-template', templateVersion: '1.0.0' },
      });

      mockAIIntegrationService.generateHybrid.mockResolvedValue({
        files: mockEnhancedFiles,
        metadata: {
          aiModel: 'gpt-4',
          confidence: 0.85,
          tokenUsage: { totalTokens: 800, cost: 0.016 },
          hybridStrategy: true,
        },
      });

      mockValidationService.validateGeneratedFiles.mockResolvedValue({
        level: ValidationLevel.FULL,
        isValid: true,
        score: 0.9,
        issues: [],
        metrics: {} as any,
        suggestions: [],
        validatedAt: '2024-01-01T00:00:00Z',
      });

      mockAIIntegrationService.generateSuggestions.mockResolvedValue([]);

      const result = await service.generateCode(hybridRequest);

      expect(result.status).toBe(GenerationStatus.COMPLETED);
      expect(mockTemplateService.generateFromTemplate).toHaveBeenCalled();
      expect(mockAIIntegrationService.generateHybrid).toHaveBeenCalled();
    });

    it('should handle generation errors gracefully', async () => {
      mockNeo4j.executeQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.generateCode(mockRequest)).rejects.toThrow('Database connection failed');
    });
  });

  describe('validateCode', () => {
    it('should delegate validation to ValidationService', async () => {
      const code = 'const test = "hello world";';
      const language = ProgrammingLanguage.TYPESCRIPT;
      const level = ValidationLevel.SYNTAX;

      const mockValidationResult = {
        level,
        isValid: true,
        score: 0.9,
        issues: [],
        metrics: {} as any,
        suggestions: [],
        validatedAt: '2024-01-01T00:00:00Z',
      };

      mockValidationService.validateCode.mockResolvedValue(mockValidationResult);

      const result = await service.validateCode(code, language, level);

      expect(result).toEqual(mockValidationResult);
      expect(mockValidationService.validateCode).toHaveBeenCalledWith(code, language, level);
    });
  });

  describe('generateTests', () => {
    it('should delegate test generation to AIIntegrationService', async () => {
      const codeContent = 'export class TestService {}';
      const language = ProgrammingLanguage.TYPESCRIPT;
      const framework = 'jest';

      const mockTestResult = {
        content: 'describe("TestService", () => { it("should work", () => {}) });',
        framework,
        coverage: 0.85,
      };

      mockAIIntegrationService.generateTests.mockResolvedValue(mockTestResult);

      const result = await service.generateTests(codeContent, language, framework);

      expect(result).toEqual(mockTestResult);
      expect(mockAIIntegrationService.generateTests).toHaveBeenCalledWith(codeContent, language, framework);
    });
  });

  describe('configurateAIModel', () => {
    it('should delegate AI configuration to AIIntegrationService', async () => {
      const config: AIModelConfig = {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'sk-test-key',
        temperature: 0.7,
        maxTokens: 2000,
      };

      mockAIIntegrationService.configure.mockResolvedValue(undefined);

      await service.configurateAIModel(config);

      expect(mockAIIntegrationService.configure).toHaveBeenCalledWith(config);
    });
  });

  describe('getAIModelConfig', () => {
    it('should delegate AI config retrieval to AIIntegrationService', () => {
      const mockConfig: AIModelConfig = {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'sk-test-key',
        temperature: 0.7,
        maxTokens: 2000,
      };

      mockAIIntegrationService.getConfig.mockReturnValue(mockConfig);

      const result = service.getAIModelConfig();

      expect(result).toEqual(mockConfig);
      expect(mockAIIntegrationService.getConfig).toHaveBeenCalled();
    });
  });
});