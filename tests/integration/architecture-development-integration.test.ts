import { Test, TestingModule } from '@nestjs/testing';
import { ArchitectureDevelopmentIntegrationService } from '../../src/services/architecture-development-integration.service';
import { DecisionService } from '../../src/modules/architecture/services/decision.service';
import { PatternService } from '../../src/modules/architecture/services/pattern.service';
import { TechnologyStackService } from '../../src/modules/architecture/services/technology-stack.service';

describe('Architecture-Development Integration', () => {
  let integrationService: ArchitectureDevelopmentIntegrationService;
  let decisionService: DecisionService;
  let patternService: PatternService;
  let technologyStackService: TechnologyStackService;
  let module: TestingModule;

  const mockProjectId = 'project-001';

  const mockDecisions = [
    {
      id: 'decision-001',
      title: 'Database Technology',
      context: 'Need to choose database for user management system',
      decision: 'Use PostgreSQL for primary database',
      rationale: 'ACID compliance and strong consistency requirements',
      category: 'technology',
      consequences: 'Strong consistency but may impact performance at scale',
      alternatives: [
        { name: 'MongoDB', description: 'NoSQL alternative' },
        { name: 'MySQL', description: 'Traditional RDBMS' },
      ],
      constraints: ['Must support transactions', 'GDPR compliance required'],
      principles: ['Data consistency', 'ACID compliance'],
    },
    {
      id: 'decision-002',
      title: 'API Architecture',
      context: 'Design API layer for microservices',
      decision: 'Implement RESTful APIs with OpenAPI specification',
      rationale: 'Standard approach with good tooling support',
      category: 'design',
      consequences: 'Clear API contracts but potential over-fetching',
      alternatives: [
        { name: 'GraphQL', description: 'Flexible query language' },
        { name: 'gRPC', description: 'High-performance RPC' },
      ],
    },
    {
      id: 'decision-003',
      title: 'Layered Architecture',
      context: 'Overall system architecture pattern',
      decision: 'Use layered architecture with clean separation',
      rationale: 'Clear separation of concerns and testability',
      category: 'structural',
      consequences: 'Good maintainability but potential performance overhead',
    },
  ];

  const mockPatterns = [
    {
      id: 'pattern-001',
      name: 'Repository Pattern',
      category: 'Structural',
      applicability: 'data access layer',
      benefits: ['Testability', 'Separation of concerns', 'Flexibility'],
      drawbacks: ['Additional complexity', 'Performance overhead'],
      structure: 'Interface + Implementation + Entity',
      examples: ['UserRepository', 'OrderRepository'],
    },
    {
      id: 'pattern-002',
      name: 'Factory Pattern',
      category: 'Creational',
      applicability: 'object creation',
      benefits: ['Loose coupling', 'Extensibility'],
      drawbacks: ['Additional classes'],
      structure: 'Factory interface + Concrete factories',
    },
    {
      id: 'pattern-003',
      name: 'Strategy Pattern',
      category: 'Behavioral',
      applicability: 'algorithm selection',
      benefits: ['Runtime algorithm switching', 'Easy testing'],
      drawbacks: ['Increased number of objects'],
    },
  ];

  const mockTechnologyStack = {
    id: 'stack-001',
    projectId: mockProjectId,
    technologies: [
      {
        name: 'Node.js',
        version: '18.x',
        category: 'runtime',
        constraints: ['Use LTS version', 'Memory limit 512MB'],
        rationale: 'JavaScript ecosystem and async I/O',
        guidelines: ['Use async/await', 'Handle promises properly'],
        bestPractices: ['Use TypeScript', 'Enable strict mode'],
        commonPitfalls: ['Callback hell', 'Unhandled promises'],
      },
      {
        name: 'NestJS',
        version: '10.x',
        category: 'framework',
        constraints: ['Use decorators', 'Follow module structure'],
        rationale: 'Enterprise-ready Node.js framework',
      },
      {
        name: 'PostgreSQL',
        version: '15.x',
        category: 'database',
        constraints: ['Use connection pooling', 'Enable SSL'],
        rationale: 'ACID compliance and reliability',
      },
    ],
  };

  const mockDevelopmentSpec = {
    id: 'dev-spec-001',
    requirementId: 'req-001',
    title: 'User Management API',
    description: 'RESTful API for user management with authentication',
    functionalSpecs: [
      {
        id: 'func-001',
        name: 'User Registration',
        description: 'API endpoint for user registration',
        type: 'api',
        priority: 'high',
        inputs: ['email', 'password', 'profile'],
        outputs: ['user_id', 'confirmation_token'],
        businessRules: ['Email must be unique', 'Password strength validation'],
      },
    ],
    technicalSpecs: [
      {
        id: 'tech-001',
        category: 'authentication',
        specification: 'JWT token-based authentication',
        constraints: ['HS256 algorithm'],
        performance: { tokenValidation: '<10ms' },
      },
    ],
    testCriteria: [
      {
        id: 'test-001',
        description: 'User can register successfully',
        type: 'acceptance',
        priority: 'high',
        testMethod: 'automated',
      },
    ],
    acceptanceCriteria: ['User registration completes successfully'],
    constraints: [],
    dependencies: [],
    priority: 'high',
    complexity: 'medium',
    estimatedEffort: { hours: 16, complexity: 'medium', confidence: 0.8, factors: [] },
    codePatterns: ['REST API', 'Service Layer'],
    validationRules: [],
  };

  const mockImplementationDetails = {
    id: 'impl-001',
    files: [
      {
        path: 'src/users/users.controller.ts',
        type: 'controller',
        linesOfCode: 120,
        complexity: 'medium',
      },
      {
        path: 'src/users/users.service.ts',
        type: 'service',
        linesOfCode: 200,
        complexity: 'high',
      },
      {
        path: 'src/users/user.entity.ts',
        type: 'model',
        linesOfCode: 80,
        complexity: 'low',
      },
    ],
    tests: [
      {
        path: 'src/users/users.controller.spec.ts',
        coverage: 85,
        passedTests: 12,
        totalTests: 14,
      },
    ],
    documentation: [],
    metrics: {
      codeQuality: 82,
      testCoverage: 85,
      performance: {
        responseTime: 120,
        memoryUsage: 35,
        cpuUsage: 15,
      },
    },
  };

  beforeEach(async () => {
    const mockDecisionService = {
      getDecisionsForProject: jest.fn().mockResolvedValue(mockDecisions),
    };

    const mockPatternService = {
      getRecommendedPatterns: jest.fn().mockResolvedValue(mockPatterns),
    };

    const mockTechnologyStackService = {
      getTechnologyStack: jest.fn().mockResolvedValue(mockTechnologyStack),
    };

    module = await Test.createTestingModule({
      providers: [
        ArchitectureDevelopmentIntegrationService,
        {
          provide: DecisionService,
          useValue: mockDecisionService,
        },
        {
          provide: PatternService,
          useValue: mockPatternService,
        },
        {
          provide: TechnologyStackService,
          useValue: mockTechnologyStackService,
        },
      ],
    }).compile();

    integrationService = module.get<ArchitectureDevelopmentIntegrationService>(
      ArchitectureDevelopmentIntegrationService,
    );
    decisionService = module.get<DecisionService>(DecisionService);
    patternService = module.get<PatternService>(PatternService);
    technologyStackService = module.get<TechnologyStackService>(TechnologyStackService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('applyArchitecturalDecisionsToDevelopment', () => {
    it('should apply architectural decisions to development specs', async () => {
      const result = await integrationService.applyArchitecturalDecisionsToDevelopment(
        mockProjectId,
        mockDevelopmentSpec
      );

      expect(result).toBeDefined();
      expect(result.architecturalGuidance).toBeDefined();
      expect(result.architecturalGuidance.applicableDecisions).toBeDefined();
      expect(result.architecturalGuidance.recommendedPatterns).toEqual(mockPatterns);
      expect(result.architecturalGuidance.technologyConstraints).toBeDefined();
      expect(result.enhancedCodePatterns).toContain('REST API');
      expect(result.enhancedCodePatterns).toContain('Repository Pattern');

      expect(decisionService.getDecisionsForProject).toHaveBeenCalledWith(mockProjectId);
      expect(patternService.getRecommendedPatterns).toHaveBeenCalled();
      expect(technologyStackService.getTechnologyStack).toHaveBeenCalledWith(mockProjectId);
    });

    it('should filter relevant architectural decisions', async () => {
      const result = await integrationService.applyArchitecturalDecisionsToDevelopment(
        mockProjectId,
        mockDevelopmentSpec
      );

      expect(result.architecturalGuidance.applicableDecisions).toBeDefined();
      // Should filter decisions relevant to the development spec
      const apiDecision = result.architecturalGuidance.applicableDecisions.find(
        d => d.category === 'design'
      );
      expect(apiDecision).toBeDefined();
    });

    it('should extract technology constraints', async () => {
      const result = await integrationService.applyArchitecturalDecisionsToDevelopment(
        mockProjectId,
        mockDevelopmentSpec
      );

      expect(result.architecturalGuidance.technologyConstraints).toBeDefined();
      const nodeConstraint = result.architecturalGuidance.technologyConstraints.find(
        c => c.technology === 'Node.js'
      );
      expect(nodeConstraint).toBeDefined();
      expect(nodeConstraint?.constraints).toContain('Use LTS version');
    });

    it('should identify quality attributes', async () => {
      const result = await integrationService.applyArchitecturalDecisionsToDevelopment(
        mockProjectId,
        mockDevelopmentSpec
      );

      expect(result.architecturalGuidance.qualityAttributes).toBeDefined();
      if (result.architecturalGuidance.qualityAttributes.length > 0) {
        result.architecturalGuidance.qualityAttributes.forEach(qa => {
          expect(qa.name).toBeDefined();
          expect(qa.priority).toBeDefined();
          expect(qa.metrics).toBeDefined();
        });
      }
    });

    it('should generate structural guidelines', async () => {
      const result = await integrationService.applyArchitecturalDecisionsToDevelopment(
        mockProjectId,
        mockDevelopmentSpec
      );

      expect(result.architecturalGuidance.structuralGuidelines).toBeDefined();
      expect(result.architecturalGuidance.structuralGuidelines.length).toBeGreaterThan(0);
      
      result.architecturalGuidance.structuralGuidelines.forEach(guideline => {
        expect(guideline.category).toBeDefined();
        expect(guideline.rule).toBeDefined();
        expect(guideline.rationale).toBeDefined();
      });
    });
  });

  describe('generateCodeStructureFromArchitecture', () => {
    it('should generate code structure based on architectural patterns', async () => {
      const structure = await integrationService.generateCodeStructureFromArchitecture(
        mockProjectId,
        mockDevelopmentSpec
      );

      expect(structure).toBeDefined();
      expect(structure.projectId).toBe(mockProjectId);
      expect(structure.pattern).toBeDefined();
      expect(structure.layers).toBeDefined();
      expect(structure.modules).toBeDefined();
      expect(structure.components).toBeDefined();
      expect(structure.directories).toBeDefined();
    });

    it('should create appropriate layers for layered architecture', async () => {
      const structure = await integrationService.generateCodeStructureFromArchitecture(
        mockProjectId,
        mockDevelopmentSpec
      );

      if (structure.pattern === 'layered') {
        const layerNames = structure.layers.map(layer => layer.name);
        expect(layerNames).toContain('Presentation');
        expect(layerNames).toContain('Business');
        expect(layerNames).toContain('Data');
      }
    });

    it('should generate modules based on functional specs', async () => {
      const structure = await integrationService.generateCodeStructureFromArchitecture(
        mockProjectId,
        mockDevelopmentSpec
      );

      expect(structure.modules.length).toBeGreaterThanOrEqual(mockDevelopmentSpec.functionalSpecs.length);
      
      const userModule = structure.modules.find(m => m.name === 'User Registration');
      expect(userModule).toBeDefined();
    });

    it('should include appropriate directory structure', async () => {
      const structure = await integrationService.generateCodeStructureFromArchitecture(
        mockProjectId,
        mockDevelopmentSpec
      );

      expect(structure.directories.length).toBeGreaterThan(0);
      structure.directories.forEach(dir => {
        expect(dir.path).toBeDefined();
        expect(dir.purpose).toBeDefined();
      });
    });

    it('should define naming conventions', async () => {
      const structure = await integrationService.generateCodeStructureFromArchitecture(
        mockProjectId,
        mockDevelopmentSpec
      );

      expect(structure.conventions.length).toBeGreaterThan(0);
      
      const classConvention = structure.conventions.find(c => c.applies_to === 'classes');
      expect(classConvention).toBeDefined();
      expect(classConvention?.pattern).toBe('PascalCase');
    });
  });

  describe('validateImplementationAgainstArchitecture', () => {
    it('should validate implementation against architectural decisions', async () => {
      const validationResult = await integrationService.validateImplementationAgainstArchitecture(
        mockProjectId,
        mockImplementationDetails
      );

      expect(validationResult).toBeDefined();
      expect(validationResult.projectId).toBe(mockProjectId);
      expect(validationResult.implementationId).toBe(mockImplementationDetails.id);
      expect(validationResult.validationChecks).toBeDefined();
      expect(validationResult.overallCompliance).toMatch(/^(compliant|partially_compliant|non_compliant)$/);
      expect(validationResult.compliancePercentage).toBeGreaterThanOrEqual(0);
      expect(validationResult.compliancePercentage).toBeLessThanOrEqual(100);
    });

    it('should validate decision compliance', async () => {
      const validationResult = await integrationService.validateImplementationAgainstArchitecture(
        mockProjectId,
        mockImplementationDetails
      );

      const decisionChecks = validationResult.validationChecks.filter(
        check => check.type === 'architectural_decision'
      );
      expect(decisionChecks.length).toBe(mockDecisions.length);
      
      decisionChecks.forEach(check => {
        expect(check.relatedDecision).toBeDefined();
        expect(check.passed).toBe(true); // Mock should pass
      });
    });

    it('should validate pattern implementation', async () => {
      const validationResult = await integrationService.validateImplementationAgainstArchitecture(
        mockProjectId,
        mockImplementationDetails
      );

      const patternChecks = validationResult.validationChecks.filter(
        check => check.type === 'design_pattern'
      );
      expect(patternChecks.length).toBe(mockPatterns.length);
    });

    it('should validate technology stack usage', async () => {
      const validationResult = await integrationService.validateImplementationAgainstArchitecture(
        mockProjectId,
        mockImplementationDetails
      );

      const techChecks = validationResult.validationChecks.filter(
        check => check.type === 'technology_usage'
      );
      expect(techChecks.length).toBe(mockTechnologyStack.technologies.length);
    });

    it('should calculate architectural debt', async () => {
      const validationResult = await integrationService.validateImplementationAgainstArchitecture(
        mockProjectId,
        mockImplementationDetails
      );

      expect(validationResult.architecturalDebt).toBeDefined();
      expect(validationResult.architecturalDebt.score).toBeGreaterThanOrEqual(0);
      expect(validationResult.architecturalDebt.level).toMatch(/^(low|medium|high)$/);
      expect(validationResult.architecturalDebt.categories).toBeDefined();
    });

    it('should provide recommendations for non-compliant implementations', async () => {
      // Mock some failures
      const poorImplementation = {
        ...mockImplementationDetails,
        metrics: {
          codeQuality: 40,
          testCoverage: 30,
          performance: { responseTime: 800 },
        },
      };

      const validationResult = await integrationService.validateImplementationAgainstArchitecture(
        mockProjectId,
        poorImplementation
      );

      expect(validationResult.recommendations.length).toBeGreaterThan(0);
      expect(validationResult.overallCompliance).not.toBe('compliant');
    });
  });

  describe('generateDevelopmentGuidelines', () => {
    it('should generate comprehensive development guidelines', async () => {
      const guidelines = await integrationService.generateDevelopmentGuidelines(mockProjectId);

      expect(guidelines).toBeDefined();
      expect(guidelines.projectId).toBe(mockProjectId);
      expect(guidelines.codingStandards).toBeDefined();
      expect(guidelines.architecturalPrinciples).toBeDefined();
      expect(guidelines.designPatterns).toBeDefined();
      expect(guidelines.technologyGuidelines).toBeDefined();
      expect(guidelines.qualityGates).toBeDefined();
      expect(guidelines.reviewChecklist).toBeDefined();
      expect(guidelines.bestPractices).toBeDefined();
      expect(guidelines.antiPatterns).toBeDefined();
    });

    it('should include coding standards', async () => {
      const guidelines = await integrationService.generateDevelopmentGuidelines(mockProjectId);

      expect(guidelines.codingStandards.length).toBeGreaterThan(0);
      guidelines.codingStandards.forEach(standard => {
        expect(standard.category).toBeDefined();
        expect(standard.standard).toBeDefined();
        expect(standard.enforcement).toBeDefined();
      });
    });

    it('should extract architectural principles', async () => {
      const guidelines = await integrationService.generateDevelopmentGuidelines(mockProjectId);

      expect(guidelines.architecturalPrinciples.length).toBeGreaterThan(0);
      expect(guidelines.architecturalPrinciples).toContain('Single Responsibility Principle');
      expect(guidelines.architecturalPrinciples).toContain('Separation of Concerns');
    });

    it('should map patterns to guidelines', async () => {
      const guidelines = await integrationService.generateDevelopmentGuidelines(mockProjectId);

      expect(guidelines.designPatterns.length).toBe(mockPatterns.length);
      guidelines.designPatterns.forEach(patternGuideline => {
        expect(patternGuideline.patternName).toBeDefined();
        expect(patternGuideline.whenToUse).toBeDefined();
        expect(patternGuideline.benefits).toBeDefined();
      });
    });

    it('should generate quality gates', async () => {
      const guidelines = await integrationService.generateDevelopmentGuidelines(mockProjectId);

      expect(guidelines.qualityGates.length).toBeGreaterThan(0);
      guidelines.qualityGates.forEach(gate => {
        expect(gate.name).toBeDefined();
        expect(gate.criteria).toBeDefined();
        expect(gate.enforcement).toBeDefined();
      });
    });

    it('should create review checklist', async () => {
      const guidelines = await integrationService.generateDevelopmentGuidelines(mockProjectId);

      expect(guidelines.reviewChecklist.length).toBeGreaterThan(0);
      guidelines.reviewChecklist.forEach(item => {
        expect(item.category).toBeDefined();
        expect(item.item).toBeDefined();
        expect(item.mandatory).toBeDefined();
      });
    });

    it('should identify anti-patterns', async () => {
      const guidelines = await integrationService.generateDevelopmentGuidelines(mockProjectId);

      expect(guidelines.antiPatterns.length).toBeGreaterThan(0);
      guidelines.antiPatterns.forEach(antiPattern => {
        expect(antiPattern.name).toBeDefined();
        expect(antiPattern.problems).toBeDefined();
        expect(antiPattern.solution).toBeDefined();
      });
    });
  });

  describe('suggestArchitecturalImprovements', () => {
    it('should suggest improvements based on metrics', async () => {
      const improvements = await integrationService.suggestArchitecturalImprovements(
        mockProjectId,
        mockImplementationDetails.metrics
      );

      expect(improvements).toBeDefined();
      expect(Array.isArray(improvements)).toBe(true);
    });

    it('should suggest code quality improvements for poor metrics', async () => {
      const poorMetrics = {
        codeQuality: 40,
        testCoverage: 50,
        performance: { responseTime: 800 },
      };

      const improvements = await integrationService.suggestArchitecturalImprovements(
        mockProjectId,
        poorMetrics
      );

      expect(improvements.length).toBeGreaterThan(0);
      
      const qualityImprovement = improvements.find(i => i.type === 'code_quality');
      expect(qualityImprovement).toBeDefined();
      expect(qualityImprovement?.priority).toBe('high');
    });

    it('should suggest performance improvements', async () => {
      const performanceMetrics = {
        codeQuality: 85,
        testCoverage: 90,
        performance: { responseTime: 600 },
      };

      const improvements = await integrationService.suggestArchitecturalImprovements(
        mockProjectId,
        performanceMetrics
      );

      const perfImprovement = improvements.find(i => i.type === 'performance');
      expect(perfImprovement).toBeDefined();
      expect(perfImprovement?.recommendedPatterns).toContain('Cache-Aside');
    });

    it('should suggest testing improvements for low coverage', async () => {
      const testMetrics = {
        codeQuality: 80,
        testCoverage: 50,
        performance: { responseTime: 200 },
      };

      const improvements = await integrationService.suggestArchitecturalImprovements(
        mockProjectId,
        testMetrics
      );

      const testImprovement = improvements.find(i => i.type === 'testing');
      expect(testImprovement).toBeDefined();
      expect(testImprovement?.priority).toBe('high');
    });

    it('should provide implementation steps for improvements', async () => {
      const improvements = await integrationService.suggestArchitecturalImprovements(
        mockProjectId,
        { codeQuality: 40, testCoverage: 30, performance: {} }
      );

      improvements.forEach(improvement => {
        expect(improvement.implementationSteps).toBeDefined();
        expect(improvement.implementationSteps.length).toBeGreaterThan(0);
      });
    });
  });

  describe('createArchitectureDrivenTasks', () => {
    it('should create tasks driven by architectural decisions', async () => {
      const tasks = await integrationService.createArchitectureDrivenTasks(
        mockProjectId,
        mockDevelopmentSpec
      );

      expect(tasks).toBeDefined();
      expect(tasks.length).toBeGreaterThan(0);

      const taskTypes = tasks.map(task => task.type);
      expect(taskTypes).toContain('architecture_review');
    });

    it('should create pattern implementation tasks', async () => {
      const tasks = await integrationService.createArchitectureDrivenTasks(
        mockProjectId,
        mockDevelopmentSpec
      );

      const patternTasks = tasks.filter(task => task.type === 'pattern_implementation');
      expect(patternTasks.length).toBeGreaterThan(0);

      patternTasks.forEach(task => {
        expect(task.title).toContain('Pattern');
        expect(task.requiredSkills).toContain('senior_developer');
      });
    });

    it('should create quality attribute tasks', async () => {
      const tasks = await integrationService.createArchitectureDrivenTasks(
        mockProjectId,
        mockDevelopmentSpec
      );

      const qaTasks = tasks.filter(task => task.type === 'quality_attribute');
      if (qaTasks.length > 0) {
        qaTasks.forEach(task => {
          expect(task.title).toContain('Quality Attribute');
          expect(task.deliverables).toBeDefined();
        });
      }
    });

    it('should establish proper task dependencies', async () => {
      const tasks = await integrationService.createArchitectureDrivenTasks(
        mockProjectId,
        mockDevelopmentSpec
      );

      const reviewTask = tasks.find(task => task.type === 'architecture_review');
      const implementationTasks = tasks.filter(task => task.type === 'pattern_implementation');

      expect(reviewTask?.dependencies).toEqual([]);
      implementationTasks.forEach(task => {
        expect(task.dependencies).toContain(reviewTask?.id);
      });
    });

    it('should assign appropriate skills to tasks', async () => {
      const tasks = await integrationService.createArchitectureDrivenTasks(
        mockProjectId,
        mockDevelopmentSpec
      );

      tasks.forEach(task => {
        expect(task.requiredSkills).toBeDefined();
        expect(task.requiredSkills.length).toBeGreaterThan(0);
      });

      const reviewTask = tasks.find(task => task.type === 'architecture_review');
      expect(reviewTask?.requiredSkills).toContain('solution_architect');
    });
  });

  describe('Integration Error Handling', () => {
    it('should handle decision service errors gracefully', async () => {
      const error = new Error('Decision service unavailable');
      (decisionService.getDecisionsForProject as jest.Mock).mockRejectedValue(error);

      await expect(
        integrationService.applyArchitecturalDecisionsToDevelopment(mockProjectId, mockDevelopmentSpec)
      ).rejects.toThrow('Failed to apply architectural guidance');
    });

    it('should handle pattern service errors', async () => {
      const error = new Error('Pattern service failed');
      (patternService.getRecommendedPatterns as jest.Mock).mockRejectedValue(error);

      await expect(
        integrationService.applyArchitecturalDecisionsToDevelopment(mockProjectId, mockDevelopmentSpec)
      ).rejects.toThrow('Failed to apply architectural guidance');
    });

    it('should handle technology stack service errors', async () => {
      const error = new Error('Technology stack not found');
      (technologyStackService.getTechnologyStack as jest.Mock).mockRejectedValue(error);

      await expect(
        integrationService.applyArchitecturalDecisionsToDevelopment(mockProjectId, mockDevelopmentSpec)
      ).rejects.toThrow('Failed to apply architectural guidance');
    });

    it('should provide meaningful error messages', async () => {
      const error = new Error('Database connection failed');
      (decisionService.getDecisionsForProject as jest.Mock).mockRejectedValue(error);

      try {
        await integrationService.generateDevelopmentGuidelines(mockProjectId);
        fail('Expected error to be thrown');
      } catch (caught) {
        expect(caught.message).toContain('Failed to generate development guidelines');
      }
    });
  });

  describe('End-to-End Architecture Integration', () => {
    it('should complete full architecture-to-development workflow', async () => {
      // Step 1: Apply architectural decisions
      const guidedSpec = await integrationService.applyArchitecturalDecisionsToDevelopment(
        mockProjectId,
        mockDevelopmentSpec
      );
      expect(guidedSpec.architecturalGuidance).toBeDefined();

      // Step 2: Generate code structure
      const codeStructure = await integrationService.generateCodeStructureFromArchitecture(
        mockProjectId,
        mockDevelopmentSpec
      );
      expect(codeStructure.layers.length).toBeGreaterThan(0);

      // Step 3: Generate development guidelines
      const guidelines = await integrationService.generateDevelopmentGuidelines(mockProjectId);
      expect(guidelines.codingStandards.length).toBeGreaterThan(0);

      // Step 4: Create architecture-driven tasks
      const tasks = await integrationService.createArchitectureDrivenTasks(
        mockProjectId,
        mockDevelopmentSpec
      );
      expect(tasks.length).toBeGreaterThan(0);

      // Step 5: Validate implementation
      const validation = await integrationService.validateImplementationAgainstArchitecture(
        mockProjectId,
        mockImplementationDetails
      );
      expect(validation.overallCompliance).toBeDefined();

      // Step 6: Suggest improvements
      const improvements = await integrationService.suggestArchitecturalImprovements(
        mockProjectId,
        mockImplementationDetails.metrics
      );
      expect(improvements).toBeDefined();
    });

    it('should maintain consistency across all architecture integration steps', async () => {
      const guidedSpec = await integrationService.applyArchitecturalDecisionsToDevelopment(
        mockProjectId,
        mockDevelopmentSpec
      );
      const codeStructure = await integrationService.generateCodeStructureFromArchitecture(
        mockProjectId,
        mockDevelopmentSpec
      );
      const guidelines = await integrationService.generateDevelopmentGuidelines(mockProjectId);

      // Verify consistent project ID
      expect(codeStructure.projectId).toBe(mockProjectId);
      expect(guidelines.projectId).toBe(mockProjectId);

      // Verify pattern consistency
      const guidedPatterns = guidedSpec.enhancedCodePatterns;
      const structuralComponents = codeStructure.components.flatMap(c => c.patterns);
      const guidelinePatterns = guidelines.designPatterns.map(p => p.patternName);

      guidedPatterns.forEach(pattern => {
        expect(guidelinePatterns.some(gp => gp === pattern)).toBe(true);
      });
    });

    it('should handle complex architectural scenarios', async () => {
      const complexSpec = {
        ...mockDevelopmentSpec,
        functionalSpecs: [
          ...mockDevelopmentSpec.functionalSpecs,
          {
            id: 'func-002',
            name: 'User Authentication',
            type: 'service',
            priority: 'high',
            inputs: ['credentials'],
            outputs: ['token'],
            businessRules: ['Multi-factor authentication'],
          },
        ],
      };

      const guidedSpec = await integrationService.applyArchitecturalDecisionsToDevelopment(
        mockProjectId,
        complexSpec
      );
      
      expect(guidedSpec.enhancedCodePatterns.length).toBeGreaterThan(mockDevelopmentSpec.codePatterns.length);
      expect(guidedSpec.architecturalGuidance.structuralGuidelines.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent architecture integrations', async () => {
      const specs = [mockDevelopmentSpec, mockDevelopmentSpec, mockDevelopmentSpec];
      
      const integrations = specs.map(spec =>
        integrationService.applyArchitecturalDecisionsToDevelopment(mockProjectId, spec)
      );

      const results = await Promise.all(integrations);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.architecturalGuidance).toBeDefined();
      });
    });

    it('should efficiently validate large implementations', async () => {
      const largeImplementation = {
        ...mockImplementationDetails,
        files: Array(20).fill(null).map((_, index) => ({
          path: `src/module${index}/service.ts`,
          type: 'service',
          linesOfCode: 150,
          complexity: 'medium',
        })),
      };

      const startTime = Date.now();
      const validation = await integrationService.validateImplementationAgainstArchitecture(
        mockProjectId,
        largeImplementation
      );
      const duration = Date.now() - startTime;

      expect(validation).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should cache architectural guidelines for reuse', async () => {
      const startTime = Date.now();
      await integrationService.generateDevelopmentGuidelines(mockProjectId);
      const firstCall = Date.now() - startTime;

      const secondStartTime = Date.now();
      await integrationService.generateDevelopmentGuidelines(mockProjectId);
      const secondCall = Date.now() - secondStartTime;

      // Subsequent calls should benefit from any caching
      expect(secondCall).toBeLessThanOrEqual(firstCall * 2);
    });
  });

  describe('Quality and Compliance', () => {
    it('should ensure high compliance scores for well-architected implementations', async () => {
      const validation = await integrationService.validateImplementationAgainstArchitecture(
        mockProjectId,
        mockImplementationDetails
      );

      expect(validation.compliancePercentage).toBeGreaterThanOrEqual(80);
      expect(validation.overallCompliance).not.toBe('non_compliant');
    });

    it('should identify architectural debt accurately', async () => {
      const validation = await integrationService.validateImplementationAgainstArchitecture(
        mockProjectId,
        mockImplementationDetails
      );

      const debt = validation.architecturalDebt;
      expect(debt.level).toBe('low'); // Should be low for good implementation
      expect(debt.score).toBeLessThan(5);
    });

    it('should provide actionable recommendations', async () => {
      const poorImplementation = {
        ...mockImplementationDetails,
        metrics: { codeQuality: 40, testCoverage: 30, performance: {} },
      };

      const validation = await integrationService.validateImplementationAgainstArchitecture(
        mockProjectId,
        poorImplementation
      );

      expect(validation.recommendations.length).toBeGreaterThan(0);
      validation.recommendations.forEach(rec => {
        expect(rec.length).toBeGreaterThan(10); // Should be descriptive
      });
    });
  });
});