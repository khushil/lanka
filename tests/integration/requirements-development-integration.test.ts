import { Test, TestingModule } from '@nestjs/testing';
import { RequirementsDevelopmentIntegrationService } from '../../src/services/requirements-development-integration.service';
import { RequirementService } from '../../src/modules/requirements/services/requirement.service';
import { AnalysisService } from '../../src/modules/requirements/services/analysis.service';

describe('Requirements-Development Integration', () => {
  let integrationService: RequirementsDevelopmentIntegrationService;
  let requirementService: RequirementService;
  let analysisService: AnalysisService;
  let module: TestingModule;

  const mockRequirement = {
    id: 'req-001',
    title: 'User Authentication System',
    description: 'Implement secure user authentication with JWT tokens and role-based access control',
    type: 'functional',
    priority: 'high',
    acceptanceCriteria: [
      'Users can register with email and password',
      'Users can login and receive JWT token',
      'Access control based on user roles',
      'Password reset functionality available',
    ],
    dependencies: ['database-setup', 'security-config'],
  };

  const mockAnalysis = {
    id: 'analysis-001',
    requirementId: 'req-001',
    complexity: 'medium',
    businessRules: [
      'Passwords must be at least 8 characters',
      'Failed login attempts are logged',
      'JWT tokens expire after 24 hours',
    ],
    technicalRequirements: [
      {
        category: 'security',
        specification: 'Use bcrypt for password hashing',
        constraints: ['Salt rounds >= 10'],
        performance: { hashTime: '<100ms' },
      },
      {
        category: 'authentication',
        specification: 'JWT token-based authentication',
        constraints: ['HS256 algorithm', 'Secure secret key'],
        performance: { tokenValidation: '<10ms' },
      },
    ],
    constraints: [
      {
        type: 'security',
        description: 'GDPR compliance required for user data',
      },
      {
        type: 'performance',
        description: 'Authentication must complete within 200ms',
      },
    ],
  };

  const mockImplementationDetails = {
    id: 'impl-001',
    files: [
      {
        path: 'src/auth/auth.controller.ts',
        type: 'controller',
        linesOfCode: 150,
        complexity: 'medium',
      },
      {
        path: 'src/auth/auth.service.ts',
        type: 'service',
        linesOfCode: 200,
        complexity: 'medium',
      },
      {
        path: 'src/auth/user.entity.ts',
        type: 'model',
        linesOfCode: 80,
        complexity: 'low',
      },
    ],
    tests: [
      {
        path: 'src/auth/auth.controller.spec.ts',
        coverage: 90,
        passedTests: 15,
        totalTests: 16,
      },
    ],
    documentation: [
      {
        path: 'docs/auth-api.md',
        type: 'api',
        completeness: 85,
      },
    ],
    metrics: {
      codeQuality: 85,
      testCoverage: 88,
      performance: {
        responseTime: 150,
        memoryUsage: 45,
      },
    },
  };

  beforeEach(async () => {
    const mockRequirementService = {
      getRequirement: jest.fn().mockResolvedValue(mockRequirement),
    };

    const mockAnalysisService = {
      analyzeRequirement: jest.fn().mockResolvedValue(mockAnalysis),
    };

    module = await Test.createTestingModule({
      providers: [
        RequirementsDevelopmentIntegrationService,
        {
          provide: RequirementService,
          useValue: mockRequirementService,
        },
        {
          provide: AnalysisService,
          useValue: mockAnalysisService,
        },
      ],
    }).compile();

    integrationService = module.get<RequirementsDevelopmentIntegrationService>(
      RequirementsDevelopmentIntegrationService,
    );
    requirementService = module.get<RequirementService>(RequirementService);
    analysisService = module.get<AnalysisService>(AnalysisService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('convertRequirementsToDevelopmentSpecs', () => {
    it('should convert requirements to development specifications', async () => {
      const result = await integrationService.convertRequirementsToDevelopmentSpecs('req-001');

      expect(result).toBeDefined();
      expect(result.requirementId).toBe('req-001');
      expect(result.title).toBe(mockRequirement.title);
      expect(result.description).toBe(mockRequirement.description);
      expect(result.priority).toBe(mockRequirement.priority);
      expect(result.complexity).toBe(mockAnalysis.complexity);
      expect(result.functionalSpecs).toBeDefined();
      expect(result.technicalSpecs).toBeDefined();
      expect(result.testCriteria).toBeDefined();
      expect(result.codePatterns).toContain('REST API');
      expect(result.codePatterns).toContain('Service Layer');

      expect(requirementService.getRequirement).toHaveBeenCalledWith('req-001');
      expect(analysisService.analyzeRequirement).toHaveBeenCalledWith('req-001');
    });

    it('should handle requirement not found', async () => {
      (requirementService.getRequirement as jest.Mock).mockResolvedValue(null);

      await expect(
        integrationService.convertRequirementsToDevelopmentSpecs('invalid-req')
      ).rejects.toThrow('Requirement invalid-req not found');
    });

    it('should extract functional specifications correctly', async () => {
      const result = await integrationService.convertRequirementsToDevelopmentSpecs('req-001');

      expect(result.functionalSpecs).toHaveLength(1);
      expect(result.functionalSpecs[0].name).toBe(mockRequirement.title);
      expect(result.functionalSpecs[0].type).toBe('service');
      expect(result.functionalSpecs[0].businessRules).toEqual(mockAnalysis.businessRules);
    });

    it('should extract technical specifications correctly', async () => {
      const result = await integrationService.convertRequirementsToDevelopmentSpecs('req-001');

      expect(result.technicalSpecs).toHaveLength(2);
      expect(result.technicalSpecs[0].category).toBe('security');
      expect(result.technicalSpecs[0].specification).toBe('Use bcrypt for password hashing');
      expect(result.technicalSpecs[1].category).toBe('authentication');
    });

    it('should generate appropriate code patterns based on requirement type', async () => {
      const result = await integrationService.convertRequirementsToDevelopmentSpecs('req-001');

      expect(result.codePatterns).toContain('Service Layer');
      expect(result.codePatterns).toContain('Dependency Injection');
      expect(result.codePatterns).toContain('Strategy Pattern');
    });
  });

  describe('generateCodeTemplatesFromRequirements', () => {
    it('should generate code templates from requirements', async () => {
      const templates = await integrationService.generateCodeTemplatesFromRequirements('req-001');

      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
      
      const serviceTemplate = templates.find(t => t.type === 'service');
      expect(serviceTemplate).toBeDefined();
      expect(serviceTemplate?.language).toBe('typescript');
      expect(serviceTemplate?.framework).toBe('nestjs');
      expect(serviceTemplate?.content).toContain('{{EntityName}}Service');

      const testTemplate = templates.find(t => t.type === 'test');
      expect(testTemplate).toBeDefined();
      expect(testTemplate?.framework).toBe('jest');
    });

    it('should generate API templates for API requirements', async () => {
      const apiRequirement = {
        ...mockRequirement,
        description: 'Implement REST API for user authentication',
      };
      (requirementService.getRequirement as jest.Mock).mockResolvedValue(apiRequirement);

      const templates = await integrationService.generateCodeTemplatesFromRequirements('req-001');

      const apiTemplate = templates.find(t => t.type === 'controller');
      expect(apiTemplate).toBeDefined();
      expect(apiTemplate?.content).toContain('@Controller');
      expect(apiTemplate?.placeholders).toContain('entityName');
    });

    it('should include proper placeholders in templates', async () => {
      const templates = await integrationService.generateCodeTemplatesFromRequirements('req-001');

      templates.forEach(template => {
        expect(template.placeholders).toBeDefined();
        expect(template.placeholders.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateImplementationAgainstRequirements', () => {
    it('should validate implementation against requirements', async () => {
      const validationResult = await integrationService.validateImplementationAgainstRequirements(
        'req-001',
        mockImplementationDetails
      );

      expect(validationResult).toBeDefined();
      expect(validationResult.requirementId).toBe('req-001');
      expect(validationResult.implementationId).toBe(mockImplementationDetails.id);
      expect(validationResult.validationChecks).toBeDefined();
      expect(validationResult.overallStatus).toMatch(/^(passed|warning|failed)$/);
      expect(validationResult.completionPercentage).toBeGreaterThanOrEqual(0);
      expect(validationResult.completionPercentage).toBeLessThanOrEqual(100);
    });

    it('should return passed status for good implementation', async () => {
      const validationResult = await integrationService.validateImplementationAgainstRequirements(
        'req-001',
        mockImplementationDetails
      );

      expect(validationResult.overallStatus).toBe('passed');
      expect(validationResult.completionPercentage).toBeGreaterThanOrEqual(90);
    });

    it('should validate functional requirements', async () => {
      const validationResult = await integrationService.validateImplementationAgainstRequirements(
        'req-001',
        mockImplementationDetails
      );

      const functionalChecks = validationResult.validationChecks.filter(
        check => check.type === 'functional'
      );
      expect(functionalChecks.length).toBeGreaterThan(0);
    });

    it('should validate technical requirements', async () => {
      const validationResult = await integrationService.validateImplementationAgainstRequirements(
        'req-001',
        mockImplementationDetails
      );

      const technicalChecks = validationResult.validationChecks.filter(
        check => check.type === 'technical'
      );
      expect(technicalChecks.length).toBeGreaterThan(0);
    });

    it('should validate acceptance criteria', async () => {
      const validationResult = await integrationService.validateImplementationAgainstRequirements(
        'req-001',
        mockImplementationDetails
      );

      const acceptanceChecks = validationResult.validationChecks.filter(
        check => check.type === 'acceptance'
      );
      expect(acceptanceChecks.length).toBe(mockRequirement.acceptanceCriteria.length);
    });

    it('should provide recommendations for failed validations', async () => {
      const poorImplementation = {
        ...mockImplementationDetails,
        metrics: {
          codeQuality: 40,
          testCoverage: 30,
          performance: { responseTime: 800 },
        },
      };

      const validationResult = await integrationService.validateImplementationAgainstRequirements(
        'req-001',
        poorImplementation
      );

      expect(validationResult.overallStatus).toBe('failed');
      expect(validationResult.recommendations).toBeDefined();
      expect(validationResult.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('trackImplementationProgress', () => {
    it('should track implementation progress', async () => {
      const progress = await integrationService.trackImplementationProgress('req-001');

      expect(progress).toBeDefined();
      expect(progress.requirementId).toBe('req-001');
      expect(progress.title).toBe(mockRequirement.title);
      expect(progress.status).toBeDefined();
      expect(progress.phases).toBeDefined();
      expect(progress.overallProgress).toBeGreaterThanOrEqual(0);
      expect(progress.overallProgress).toBeLessThanOrEqual(100);
    });

    it('should include all development phases', async () => {
      const progress = await integrationService.trackImplementationProgress('req-001');

      const expectedPhases = ['analysis', 'design', 'implementation', 'testing', 'deployment'];
      expectedPhases.forEach(phase => {
        expect(progress.phases[phase]).toBeDefined();
        expect(progress.phases[phase].status).toMatch(/^(not_started|in_progress|completed)$/);
      });
    });

    it('should identify implementation risks', async () => {
      const progress = await integrationService.trackImplementationProgress('req-001');

      expect(progress.risks).toBeDefined();
      if (progress.risks.length > 0) {
        progress.risks.forEach(risk => {
          expect(risk.type).toBeDefined();
          expect(risk.description).toBeDefined();
          expect(risk.severity).toBeDefined();
          expect(risk.mitigation).toBeDefined();
        });
      }
    });
  });

  describe('generateDevelopmentTasks', () => {
    it('should generate development tasks from requirements', async () => {
      const tasks = await integrationService.generateDevelopmentTasks('req-001');

      expect(tasks).toBeDefined();
      expect(tasks.length).toBeGreaterThan(0);

      const taskTypes = tasks.map(task => task.type);
      expect(taskTypes).toContain('analysis');
      expect(taskTypes).toContain('design');
      expect(taskTypes).toContain('implementation');
      expect(taskTypes).toContain('testing');
    });

    it('should create tasks with proper dependencies', async () => {
      const tasks = await integrationService.generateDevelopmentTasks('req-001');

      const analysisTask = tasks.find(task => task.type === 'analysis');
      const designTask = tasks.find(task => task.type === 'design');
      const implementationTasks = tasks.filter(task => task.type === 'implementation');
      const testTask = tasks.find(task => task.type === 'testing');

      expect(analysisTask?.dependencies).toEqual([]);
      expect(designTask?.dependencies).toContain(analysisTask?.id);
      implementationTasks.forEach(task => {
        expect(task.dependencies).toContain(designTask?.id);
      });
      expect(testTask?.dependencies).toEqual(
        expect.arrayContaining(implementationTasks.map(task => task.id))
      );
    });

    it('should estimate task effort appropriately', async () => {
      const tasks = await integrationService.generateDevelopmentTasks('req-001');

      tasks.forEach(task => {
        expect(task.estimatedHours).toBeGreaterThan(0);
        expect(task.estimatedHours).toBeLessThanOrEqual(16); // Reasonable upper bound
      });
    });

    it('should assign appropriate roles to tasks', async () => {
      const tasks = await integrationService.generateDevelopmentTasks('req-001');

      const analysisTask = tasks.find(task => task.type === 'analysis');
      const designTask = tasks.find(task => task.type === 'design');
      const implementationTask = tasks.find(task => task.type === 'implementation');
      const testTask = tasks.find(task => task.type === 'testing');

      expect(analysisTask?.assignee).toBe('analyst');
      expect(designTask?.assignee).toBe('architect');
      expect(implementationTask?.assignee).toBe('developer');
      expect(testTask?.assignee).toBe('tester');
    });

    it('should prioritize tasks based on requirement priority', async () => {
      const tasks = await integrationService.generateDevelopmentTasks('req-001');

      tasks.forEach(task => {
        expect(task.priority).toBe(mockRequirement.priority);
      });
    });
  });

  describe('Integration Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const error = new Error('Service unavailable');
      (requirementService.getRequirement as jest.Mock).mockRejectedValue(error);

      await expect(
        integrationService.convertRequirementsToDevelopmentSpecs('req-001')
      ).rejects.toThrow('Failed to convert requirement to development spec');
    });

    it('should handle analysis service errors', async () => {
      const error = new Error('Analysis failed');
      (analysisService.analyzeRequirement as jest.Mock).mockRejectedValue(error);

      await expect(
        integrationService.convertRequirementsToDevelopmentSpecs('req-001')
      ).rejects.toThrow('Failed to convert requirement to development spec');
    });

    it('should provide meaningful error messages', async () => {
      const error = new Error('Database connection failed');
      (requirementService.getRequirement as jest.Mock).mockRejectedValue(error);

      try {
        await integrationService.convertRequirementsToDevelopmentSpecs('req-001');
        fail('Expected error to be thrown');
      } catch (caught) {
        expect(caught.message).toContain('Failed to convert requirement to development spec');
        expect(caught.message).toContain('Database connection failed');
      }
    });
  });

  describe('End-to-End Integration Flow', () => {
    it('should complete full requirements-to-development workflow', async () => {
      // Step 1: Convert requirements to dev specs
      const devSpec = await integrationService.convertRequirementsToDevelopmentSpecs('req-001');
      expect(devSpec).toBeDefined();

      // Step 2: Generate code templates
      const templates = await integrationService.generateCodeTemplatesFromRequirements('req-001');
      expect(templates.length).toBeGreaterThan(0);

      // Step 3: Generate development tasks
      const tasks = await integrationService.generateDevelopmentTasks('req-001');
      expect(tasks.length).toBeGreaterThan(0);

      // Step 4: Track progress
      const progress = await integrationService.trackImplementationProgress('req-001');
      expect(progress).toBeDefined();

      // Step 5: Validate implementation
      const validation = await integrationService.validateImplementationAgainstRequirements(
        'req-001',
        mockImplementationDetails
      );
      expect(validation.overallStatus).toBe('passed');
    });

    it('should maintain data consistency across workflow steps', async () => {
      const devSpec = await integrationService.convertRequirementsToDevelopmentSpecs('req-001');
      const tasks = await integrationService.generateDevelopmentTasks('req-001');

      // Verify consistent requirement ID
      expect(devSpec.requirementId).toBe('req-001');
      tasks.forEach(task => {
        expect(task.id).toContain('req-001');
      });

      // Verify consistent priority
      expect(devSpec.priority).toBe(mockRequirement.priority);
      tasks.forEach(task => {
        expect(task.priority).toBe(mockRequirement.priority);
      });
    });

    it('should handle complex requirements with multiple functional specs', async () => {
      const complexRequirement = {
        ...mockRequirement,
        description: 'Implement user authentication API with data persistence and service layer',
      };
      (requirementService.getRequirement as jest.Mock).mockResolvedValue(complexRequirement);

      const devSpec = await integrationService.convertRequirementsToDevelopmentSpecs('req-001');
      const templates = await integrationService.generateCodeTemplatesFromRequirements('req-001');

      expect(devSpec.codePatterns).toContain('REST API');
      expect(devSpec.codePatterns).toContain('Service Layer');
      expect(devSpec.codePatterns).toContain('Repository Pattern');

      const templateTypes = templates.map(t => t.type);
      expect(templateTypes).toContain('controller');
      expect(templateTypes).toContain('service');
      expect(templateTypes).toContain('model');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent requirement conversions', async () => {
      const requirementIds = ['req-001', 'req-002', 'req-003'];
      
      const conversions = requirementIds.map(id =>
        integrationService.convertRequirementsToDevelopmentSpecs(id)
      );

      const results = await Promise.all(conversions);
      
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.requirementId).toBe(requirementIds[index]);
      });
    });

    it('should efficiently generate templates for similar requirements', async () => {
      const startTime = Date.now();
      
      await integrationService.generateCodeTemplatesFromRequirements('req-001');
      const firstCall = Date.now() - startTime;

      const secondStartTime = Date.now();
      await integrationService.generateCodeTemplatesFromRequirements('req-001');
      const secondCall = Date.now() - secondStartTime;

      // Second call should be reasonably fast (allowing for test environment variance)
      expect(secondCall).toBeLessThanOrEqual(firstCall * 2);
    });
  });
});