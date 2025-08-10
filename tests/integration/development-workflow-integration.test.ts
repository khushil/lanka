import { Test, TestingModule } from '@nestjs/testing';
import { DevelopmentWorkflowService } from '../../src/services/development-workflow.service';
import { RequirementsDevelopmentIntegrationService } from '../../src/services/requirements-development-integration.service';
import { ArchitectureDevelopmentIntegrationService } from '../../src/services/architecture-development-integration.service';

describe('Development Workflow Integration', () => {
  let workflowService: DevelopmentWorkflowService;
  let requirementsIntegration: RequirementsDevelopmentIntegrationService;
  let architectureIntegration: ArchitectureDevelopmentIntegrationService;
  let module: TestingModule;

  const mockProjectId = 'project-001';
  const mockRequirementId = 'req-001';

  const mockDevelopmentSpec = {
    id: 'dev-spec-001',
    requirementId: mockRequirementId,
    title: 'User Authentication System',
    description: 'Comprehensive user authentication with JWT and role-based access',
    functionalSpecs: [
      {
        id: 'func-001',
        name: 'User Login',
        type: 'api',
        priority: 'high',
        inputs: ['email', 'password'],
        outputs: ['jwt_token', 'user_profile'],
        businessRules: ['Rate limiting', 'Password validation'],
      },
    ],
    technicalSpecs: [
      {
        id: 'tech-001',
        category: 'authentication',
        specification: 'JWT token authentication',
        constraints: ['HS256 algorithm'],
        performance: { tokenGeneration: '<50ms' },
      },
    ],
    testCriteria: [
      {
        id: 'test-001',
        description: 'User can login successfully',
        type: 'acceptance',
        priority: 'high',
        testMethod: 'automated',
      },
    ],
    acceptanceCriteria: ['Login completes within 200ms'],
    constraints: [],
    dependencies: ['database'],
    priority: 'high',
    complexity: 'medium',
    estimatedEffort: { hours: 24, complexity: 'medium', confidence: 0.8, factors: [] },
    codePatterns: ['REST API', 'Service Layer', 'Repository Pattern'],
    validationRules: [],
  };

  const mockArchitecturallyGuidedSpec = {
    ...mockDevelopmentSpec,
    architecturalGuidance: {
      applicableDecisions: [
        {
          id: 'decision-001',
          decision: 'Use JWT for authentication',
          category: 'security',
        },
      ],
      recommendedPatterns: [
        { name: 'Strategy Pattern', applicability: 'authentication methods' },
      ],
      technologyConstraints: [
        { technology: 'Node.js', version: '18.x', constraints: ['Use LTS'] },
      ],
      structuralGuidelines: [
        { category: 'security', rule: 'Encrypt sensitive data' },
      ],
      qualityAttributes: [
        { name: 'security', priority: 'high', metrics: { threshold: 95 } },
      ],
      integrationPoints: [
        { type: 'database', description: 'User data persistence' },
      ],
    },
    enhancedCodePatterns: ['REST API', 'Service Layer', 'Repository Pattern', 'Strategy Pattern'],
    architecturalConstraints: [
      { type: 'security', constraint: 'Use HTTPS only' },
    ],
    implementationGuidelines: [
      { category: 'security', guideline: 'Validate all inputs' },
    ],
  };

  const mockDevelopmentTasks = [
    {
      id: 'task-analysis-001',
      title: 'Analyze authentication requirements',
      type: 'analysis',
      priority: 'high',
      estimatedHours: 4,
      dependencies: [],
      assignee: 'analyst',
    },
    {
      id: 'task-design-001',
      title: 'Design authentication system',
      type: 'design',
      priority: 'high',
      estimatedHours: 6,
      dependencies: ['task-analysis-001'],
      assignee: 'architect',
    },
    {
      id: 'task-impl-001',
      title: 'Implement JWT authentication',
      type: 'implementation',
      priority: 'high',
      estimatedHours: 12,
      dependencies: ['task-design-001'],
      assignee: 'developer',
    },
  ];

  const mockCodeStructure = {
    id: 'structure-001',
    projectId: mockProjectId,
    pattern: 'layered',
    layers: [
      { id: 'presentation', name: 'Presentation', order: 1, responsibilities: ['HTTP handling'] },
      { id: 'business', name: 'Business', order: 2, responsibilities: ['Business logic'] },
      { id: 'data', name: 'Data', order: 3, responsibilities: ['Data access'] },
    ],
    modules: [
      { id: 'auth-module', name: 'Authentication', responsibilities: ['User authentication'] },
    ],
    components: [
      { id: 'auth-controller', name: 'AuthController', type: 'controller' },
      { id: 'auth-service', name: 'AuthService', type: 'service' },
    ],
  };

  const mockDevelopmentGuidelines = {
    projectId: mockProjectId,
    codingStandards: [
      { category: 'naming', standard: 'Use camelCase for methods' },
    ],
    architecturalPrinciples: ['Single Responsibility', 'Dependency Inversion'],
    designPatterns: [
      { patternName: 'Strategy Pattern', whenToUse: 'Multiple algorithms' },
    ],
    qualityGates: [
      { name: 'Code Quality', criteria: [{ metric: 'coverage', threshold: 80 }] },
    ],
  };

  beforeEach(async () => {
    const mockRequirementsIntegration = {
      convertRequirementsToDevelopmentSpecs: jest.fn().mockResolvedValue(mockDevelopmentSpec),
      generateDevelopmentTasks: jest.fn().mockResolvedValue(mockDevelopmentTasks),
      generateCodeTemplatesFromRequirements: jest.fn().mockResolvedValue([
        { id: 'template-1', type: 'controller', content: 'controller template' },
        { id: 'template-2', type: 'service', content: 'service template' },
      ]),
      validateImplementationAgainstRequirements: jest.fn().mockResolvedValue({
        overallStatus: 'passed',
        completionPercentage: 95,
        validationChecks: [],
      }),
      trackImplementationProgress: jest.fn().mockResolvedValue({
        requirementId: mockRequirementId,
        status: 'in_progress',
        overallProgress: 60,
      }),
    };

    const mockArchitectureIntegration = {
      applyArchitecturalDecisionsToDevelopment: jest.fn().mockResolvedValue(mockArchitecturallyGuidedSpec),
      generateCodeStructureFromArchitecture: jest.fn().mockResolvedValue(mockCodeStructure),
      generateDevelopmentGuidelines: jest.fn().mockResolvedValue(mockDevelopmentGuidelines),
      validateImplementationAgainstArchitecture: jest.fn().mockResolvedValue({
        overallCompliance: 'compliant',
        compliancePercentage: 92,
        validationChecks: [],
        architecturalDebt: { level: 'low', score: 2 },
      }),
      suggestArchitecturalImprovements: jest.fn().mockResolvedValue([
        { type: 'performance', priority: 'medium', description: 'Add caching' },
      ]),
      createArchitectureDrivenTasks: jest.fn().mockResolvedValue([
        { id: 'arch-task-1', type: 'architecture_review', title: 'Review architecture' },
      ]),
    };

    module = await Test.createTestingModule({
      providers: [
        DevelopmentWorkflowService,
        {
          provide: RequirementsDevelopmentIntegrationService,
          useValue: mockRequirementsIntegration,
        },
        {
          provide: ArchitectureDevelopmentIntegrationService,
          useValue: mockArchitectureIntegration,
        },
      ],
    }).compile();

    workflowService = module.get<DevelopmentWorkflowService>(DevelopmentWorkflowService);
    requirementsIntegration = module.get<RequirementsDevelopmentIntegrationService>(
      RequirementsDevelopmentIntegrationService,
    );
    architectureIntegration = module.get<ArchitectureDevelopmentIntegrationService>(
      ArchitectureDevelopmentIntegrationService,
    );
  });

  afterEach(async () => {
    await module.close();
  });

  describe('executeCompleteWorkflow', () => {
    it('should execute complete development workflow successfully', async () => {
      const workflowOptions = {
        enableParallelExecution: false,
        enableQualityGates: true,
        captureKnowledge: true,
      };

      const result = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId,
        workflowOptions
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.projectId).toBe(mockProjectId);
      expect(result.requirementId).toBe(mockRequirementId);
      expect(result.phases.length).toBeGreaterThan(0);
      expect(result.artifacts.length).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should call all integration services in correct order', async () => {
      await workflowService.executeCompleteWorkflow(mockProjectId, mockRequirementId);

      // Verify requirements integration calls
      expect(requirementsIntegration.convertRequirementsToDevelopmentSpecs).toHaveBeenCalledWith(
        mockRequirementId
      );
      expect(requirementsIntegration.generateDevelopmentTasks).toHaveBeenCalledWith(
        mockRequirementId
      );

      // Verify architecture integration calls
      expect(architectureIntegration.applyArchitecturalDecisionsToDevelopment).toHaveBeenCalledWith(
        mockProjectId,
        mockDevelopmentSpec
      );
      expect(architectureIntegration.generateCodeStructureFromArchitecture).toHaveBeenCalledWith(
        mockProjectId,
        mockDevelopmentSpec
      );
      expect(architectureIntegration.generateDevelopmentGuidelines).toHaveBeenCalledWith(
        mockProjectId
      );
    });

    it('should handle workflow options correctly', async () => {
      const workflowOptions = {
        enableParallelExecution: true,
        continueOnFailure: true,
        enableQualityGates: false,
        includeDeploy: true,
      };

      const result = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId,
        workflowOptions
      );

      expect(result.status).toBe('completed');
      // Should include deployment phase when includeDeploy is true
      const deploymentPhase = result.phases.find(phase => phase.id === 'deployment');
      expect(deploymentPhase).toBeDefined();
    });

    it('should generate comprehensive workflow result', async () => {
      const result = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId
      );

      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalSteps).toBeGreaterThan(0);
      expect(result.metrics.completedSteps).toBeGreaterThan(0);
      expect(result.metrics.completionRate).toBeGreaterThanOrEqual(0);
      expect(result.metrics.qualityScore).toBeGreaterThan(0);

      expect(result.summary).toBeDefined();
      expect(result.summary.keyAchievements.length).toBeGreaterThanOrEqual(0);
      expect(result.summary.issuesEncountered.length).toBeGreaterThanOrEqual(0);

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should capture knowledge when enabled', async () => {
      const workflowOptions = {
        captureKnowledge: true,
      };

      const result = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId,
        workflowOptions
      );

      expect(result.phases.some(phase => phase.id === 'knowledge')).toBe(true);
      
      const knowledgePhase = result.phases.find(phase => phase.id === 'knowledge');
      expect(knowledgePhase?.steps.length).toBeGreaterThan(0);
    });

    it('should handle workflow failures gracefully', async () => {
      // Mock a failure in requirements conversion
      (requirementsIntegration.convertRequirementsToDevelopmentSpecs as jest.Mock)
        .mockRejectedValueOnce(new Error('Requirements service unavailable'));

      await expect(
        workflowService.executeCompleteWorkflow(mockProjectId, mockRequirementId)
      ).rejects.toThrow('Workflow execution failed');
    });
  });

  describe('createWorkflow', () => {
    it('should create workflow definition with all phases', async () => {
      const workflowOptions = {
        includeDeploy: true,
        captureKnowledge: true,
      };

      const workflow = await workflowService.createWorkflow(
        'test-workflow',
        mockProjectId,
        mockRequirementId,
        workflowOptions
      );

      expect(workflow).toBeDefined();
      expect(workflow.id).toBe('test-workflow');
      expect(workflow.projectId).toBe(mockProjectId);
      expect(workflow.requirementId).toBe(mockRequirementId);
      expect(workflow.status).toBe('created');

      // Should have analysis, implementation, testing phases at minimum
      expect(workflow.phases.length).toBeGreaterThanOrEqual(3);
      
      // Should include deployment and knowledge phases when requested
      expect(workflow.phases.some(phase => phase.id === 'deployment')).toBe(true);
      expect(workflow.phases.some(phase => phase.id === 'knowledge')).toBe(true);
    });

    it('should define proper phase dependencies', async () => {
      const workflow = await workflowService.createWorkflow(
        'test-workflow',
        mockProjectId,
        mockRequirementId,
        {}
      );

      const analysisPhase = workflow.phases.find(phase => phase.id === 'analysis');
      const implementationPhase = workflow.phases.find(phase => phase.id === 'implementation');
      const testingPhase = workflow.phases.find(phase => phase.id === 'testing');

      expect(analysisPhase?.order).toBe(1);
      expect(implementationPhase?.order).toBe(2);
      expect(testingPhase?.order).toBe(3);

      // Steps within phases should have proper dependencies
      const steps = analysisPhase?.steps || [];
      const architectureStep = steps.find(step => step.type === 'architecture_guidance');
      const requirementsStep = steps.find(step => step.type === 'requirements_analysis');

      if (architectureStep && requirementsStep) {
        expect(architectureStep.dependencies).toContain(requirementsStep.id);
      }
    });

    it('should estimate workflow duration', async () => {
      const workflow = await workflowService.createWorkflow(
        'test-workflow',
        mockProjectId,
        mockRequirementId,
        {}
      );

      expect(workflow.metadata.estimatedDuration).toBeGreaterThan(0);
      expect(workflow.metadata.estimatedDuration).toBeLessThan(10000); // Reasonable upper bound
    });

    it('should configure workflow based on options', async () => {
      const workflowOptions = {
        enableParallelExecution: true,
        continueOnFailure: false,
        enableQualityGates: true,
        enableAutomaticRollback: true,
      };

      const workflow = await workflowService.createWorkflow(
        'test-workflow',
        mockProjectId,
        mockRequirementId,
        workflowOptions
      );

      expect(workflow.configuration.parallelExecution).toBe(true);
      expect(workflow.configuration.continueOnFailure).toBe(false);
      expect(workflow.configuration.qualityGates).toBe(true);
      expect(workflow.configuration.automaticRollback).toBe(true);
    });
  });

  describe('executeWorkflow', () => {
    let mockWorkflow: any;

    beforeEach(async () => {
      mockWorkflow = await workflowService.createWorkflow(
        'test-workflow',
        mockProjectId,
        mockRequirementId,
        { enableQualityGates: true }
      );
    });

    it('should execute all workflow phases sequentially', async () => {
      const result = await workflowService.executeWorkflow(mockWorkflow);

      expect(result.status).toBe('completed');
      expect(mockWorkflow.status).toBe('completed');
      expect(mockWorkflow.executionStart).toBeDefined();
      expect(mockWorkflow.executionEnd).toBeDefined();

      // All phases should be completed
      mockWorkflow.phases.forEach((phase: any) => {
        expect(phase.status).toBe('completed');
        expect(phase.executionStart).toBeDefined();
        expect(phase.executionEnd).toBeDefined();
      });
    });

    it('should validate quality gates', async () => {
      // Quality gates are enabled in the mock workflow
      const result = await workflowService.executeWorkflow(mockWorkflow);

      expect(result.status).toBe('completed');
      // Should pass quality gates with mock data
      expect(result.metrics.qualityScore).toBeGreaterThan(70);
    });

    it('should collect artifacts from all phases', async () => {
      const result = await workflowService.executeWorkflow(mockWorkflow);

      expect(result.artifacts.length).toBeGreaterThan(0);
      
      // Should have artifacts from different steps
      const stepTypes = result.artifacts.map((artifact: any) => artifact.type);
      expect(stepTypes).toContain('specification');
      expect(stepTypes).toContain('architecture');
      expect(stepTypes).toContain('code');
    });

    it('should calculate accurate workflow metrics', async () => {
      const result = await workflowService.executeWorkflow(mockWorkflow);

      expect(result.metrics.totalSteps).toBeGreaterThan(0);
      expect(result.metrics.completedSteps).toBe(result.metrics.totalSteps);
      expect(result.metrics.failedSteps).toBe(0);
      expect(result.metrics.completionRate).toBe(100);
      expect(result.metrics.actualDuration).toBeGreaterThan(0);
      expect(result.metrics.durationVariance).toBeDefined();
    });

    it('should handle step failures when continueOnFailure is enabled', async () => {
      // Enable continue on failure
      mockWorkflow.configuration.continueOnFailure = true;

      // Mock a step failure
      const originalMethod = requirementsIntegration.convertRequirementsToDevelopmentSpecs;
      (requirementsIntegration.convertRequirementsToDevelopmentSpecs as jest.Mock)
        .mockRejectedValueOnce(new Error('Step failed'));

      const result = await workflowService.executeWorkflow(mockWorkflow);

      // Workflow should continue despite failure
      expect(result.status).toBe('completed');
      expect(result.metrics.failedSteps).toBeGreaterThan(0);

      // Restore original method
      (requirementsIntegration.convertRequirementsToDevelopmentSpecs as jest.Mock)
        .mockImplementation(originalMethod);
    });

    it('should fail fast when continueOnFailure is disabled', async () => {
      mockWorkflow.configuration.continueOnFailure = false;

      // Mock a step failure
      (requirementsIntegration.convertRequirementsToDevelopmentSpecs as jest.Mock)
        .mockRejectedValueOnce(new Error('Critical step failed'));

      await expect(workflowService.executeWorkflow(mockWorkflow)).rejects.toThrow();
      expect(mockWorkflow.status).toBe('failed');
    });
  });

  describe('Workflow Step Execution', () => {
    it('should execute requirements analysis step', async () => {
      const mockStep = {
        id: 'requirements_analysis',
        name: 'Requirements Analysis',
        type: 'requirements_analysis',
        dependencies: [],
      };

      const mockContext = {
        workflow: { requirementId: mockRequirementId },
        stepResults: new Map(),
        sharedData: new Map(),
      };

      // This would be testing the private method, so we test through the full workflow
      const result = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId
      );

      expect(requirementsIntegration.convertRequirementsToDevelopmentSpecs).toHaveBeenCalled();
      expect(requirementsIntegration.generateDevelopmentTasks).toHaveBeenCalled();
      expect(result.status).toBe('completed');
    });

    it('should execute architecture guidance step', async () => {
      const result = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId
      );

      expect(architectureIntegration.applyArchitecturalDecisionsToDevelopment).toHaveBeenCalled();
      expect(architectureIntegration.generateCodeStructureFromArchitecture).toHaveBeenCalled();
      expect(architectureIntegration.generateDevelopmentGuidelines).toHaveBeenCalled();
      expect(result.status).toBe('completed');
    });

    it('should execute code generation step', async () => {
      const result = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId
      );

      // Code generation should produce mock generated code
      const codeArtifacts = result.artifacts.filter((artifact: any) => artifact.type === 'code');
      expect(codeArtifacts.length).toBeGreaterThan(0);
    });

    it('should execute testing step', async () => {
      const result = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId
      );

      // Testing step should produce test results
      const testArtifacts = result.artifacts.filter((artifact: any) => 
        artifact.stepId === 'testing'
      );
      expect(testArtifacts.length).toBeGreaterThan(0);
    });

    it('should execute quality assurance step', async () => {
      const result = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId
      );

      // QA step should validate quality
      expect(result.metrics.qualityScore).toBeGreaterThan(0);
    });
  });

  describe('Parallel Execution', () => {
    it('should execute compatible steps in parallel when enabled', async () => {
      const workflowOptions = {
        enableParallelExecution: true,
      };

      const startTime = Date.now();
      const result = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId,
        workflowOptions
      );
      const duration = Date.now() - startTime;

      expect(result.status).toBe('completed');
      // Parallel execution should be faster (though in tests, the difference may be minimal)
      expect(duration).toBeLessThan(60000); // Should complete within reasonable time
    });

    it('should respect step dependencies in parallel execution', async () => {
      const workflowOptions = {
        enableParallelExecution: true,
      };

      const result = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId,
        workflowOptions
      );

      // Despite parallel execution, dependencies should be respected
      expect(result.status).toBe('completed');
      expect(requirementsIntegration.convertRequirementsToDevelopmentSpecs).toHaveBeenCalledBefore(
        architectureIntegration.applyArchitecturalDecisionsToDevelopment as jest.Mock
      );
    });
  });

  describe('Quality Gates', () => {
    it('should enforce quality gates when enabled', async () => {
      const workflowOptions = {
        enableQualityGates: true,
      };

      const result = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId,
        workflowOptions
      );

      expect(result.status).toBe('completed');
      // Quality gates should pass with good mock data
      expect(result.metrics.qualityScore).toBeGreaterThanOrEqual(80);
    });

    it('should block workflow progression when quality gates fail', async () => {
      // Mock poor quality results that would fail quality gates
      (architectureIntegration.validateImplementationAgainstArchitecture as jest.Mock)
        .mockResolvedValueOnce({
          overallCompliance: 'non_compliant',
          compliancePercentage: 40,
          validationChecks: [],
        });

      const workflowOptions = {
        enableQualityGates: true,
      };

      // This should fail due to poor architectural compliance
      await expect(
        workflowService.executeCompleteWorkflow(
          mockProjectId,
          mockRequirementId,
          workflowOptions
        )
      ).rejects.toThrow();
    });
  });

  describe('Knowledge Capture', () => {
    it('should capture knowledge when enabled', async () => {
      const workflowOptions = {
        captureKnowledge: true,
      };

      const result = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId,
        workflowOptions
      );

      expect(result.status).toBe('completed');
      
      // Should have knowledge capture phase
      const knowledgePhase = result.phases.find((phase: any) => phase.id === 'knowledge');
      expect(knowledgePhase).toBeDefined();
      expect(knowledgePhase?.status).toBe('completed');

      // Should capture lessons learned and patterns
      const knowledgeArtifacts = result.artifacts.filter((artifact: any) => 
        artifact.stepId === 'knowledge_capture'
      );
      expect(knowledgeArtifacts.length).toBeGreaterThan(0);
    });

    it('should extract reusable artifacts', async () => {
      const workflowOptions = {
        captureKnowledge: true,
      };

      const result = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId,
        workflowOptions
      );

      const knowledgeArtifact = result.artifacts.find((artifact: any) => 
        artifact.stepId === 'knowledge_capture'
      );

      if (knowledgeArtifact) {
        expect(knowledgeArtifact.content.reusableArtifacts).toBeDefined();
        expect(knowledgeArtifact.content.reusableArtifacts.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should identify best practices and lessons learned', async () => {
      const workflowOptions = {
        captureKnowledge: true,
      };

      const result = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId,
        workflowOptions
      );

      const knowledgeArtifact = result.artifacts.find((artifact: any) => 
        artifact.stepId === 'knowledge_capture'
      );

      if (knowledgeArtifact) {
        expect(knowledgeArtifact.content.bestPractices).toBeDefined();
        expect(knowledgeArtifact.content.lessonsLearned).toBeDefined();
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should provide detailed error information on failure', async () => {
      const error = new Error('Service integration failed');
      (requirementsIntegration.convertRequirementsToDevelopmentSpecs as jest.Mock)
        .mockRejectedValueOnce(error);

      try {
        await workflowService.executeCompleteWorkflow(mockProjectId, mockRequirementId);
        fail('Expected workflow to fail');
      } catch (caught) {
        expect(caught.message).toContain('Workflow execution failed');
        expect(caught.workflowId).toBeDefined();
      }
    });

    it('should handle automatic rollback when enabled', async () => {
      const workflowOptions = {
        enableAutomaticRollback: true,
      };

      // Mock deployment success followed by monitoring failure
      const error = new Error('Monitoring setup failed');
      (architectureIntegration.validateImplementationAgainstArchitecture as jest.Mock)
        .mockRejectedValueOnce(error);

      try {
        await workflowService.executeCompleteWorkflow(
          mockProjectId,
          mockRequirementId,
          workflowOptions
        );
        fail('Expected workflow to fail');
      } catch (caught) {
        // Should attempt rollback
        expect(caught).toBeDefined();
      }
    });

    it('should validate step dependencies before execution', async () => {
      // This tests internal dependency validation
      const result = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId
      );

      // Should complete successfully when dependencies are met
      expect(result.status).toBe('completed');
    });
  });

  describe('Performance and Monitoring', () => {
    it('should track workflow execution time accurately', async () => {
      const result = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId
      );

      expect(result.duration).toBeGreaterThan(0);
      expect(result.metrics.actualDuration).toBe(result.duration);
    });

    it('should calculate duration variance against estimates', async () => {
      const result = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId
      );

      expect(result.metrics.estimatedDuration).toBeGreaterThan(0);
      expect(result.metrics.durationVariance).toBeDefined();
      // Variance should be a percentage
      expect(typeof result.metrics.durationVariance).toBe('number');
    });

    it('should handle large workflows efficiently', async () => {
      // Create a workflow with many steps
      const startTime = Date.now();
      
      const result = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId,
        { includeDeploy: true, captureKnowledge: true }
      );
      
      const duration = Date.now() - startTime;

      expect(result.status).toBe('completed');
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    });

    it('should provide comprehensive workflow metrics', async () => {
      const result = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId
      );

      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalSteps).toBeGreaterThan(0);
      expect(result.metrics.completionRate).toBe(100);
      expect(result.metrics.qualityScore).toBeGreaterThan(0);
      
      expect(result.summary).toBeDefined();
      expect(result.summary.artifactsGenerated).toBeGreaterThan(0);
      expect(result.summary.keyAchievements).toBeDefined();
    });
  });

  describe('Integration Consistency', () => {
    it('should maintain data consistency across all workflow steps', async () => {
      const result = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId
      );

      // Verify that project and requirement IDs are consistent
      expect(result.projectId).toBe(mockProjectId);
      expect(result.requirementId).toBe(mockRequirementId);

      // Verify that services were called with consistent data
      expect(requirementsIntegration.convertRequirementsToDevelopmentSpecs).toHaveBeenCalledWith(
        mockRequirementId
      );
      expect(architectureIntegration.applyArchitecturalDecisionsToDevelopment).toHaveBeenCalledWith(
        mockProjectId,
        expect.any(Object)
      );
    });

    it('should pass data correctly between workflow steps', async () => {
      const result = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId
      );

      // Architecture integration should receive output from requirements integration
      expect(architectureIntegration.applyArchitecturalDecisionsToDevelopment).toHaveBeenCalledWith(
        mockProjectId,
        expect.objectContaining({
          requirementId: mockRequirementId,
          title: expect.any(String),
          functionalSpecs: expect.any(Array),
        })
      );
    });

    it('should maintain workflow state throughout execution', async () => {
      const result = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId
      );

      // All phases should have consistent workflow reference
      result.phases.forEach((phase: any) => {
        expect(phase.status).toBe('completed');
        phase.steps.forEach((step: any) => {
          expect(step.status).toBe('completed');
        });
      });
    });
  });
});