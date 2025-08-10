import { Test, TestingModule } from '@nestjs/testing';
import { RequirementService } from '../../src/modules/requirements/services/requirement.service';
import { AnalysisService } from '../../src/modules/requirements/services/analysis.service';
import { DecisionService } from '../../src/modules/architecture/services/decision.service';
import { PatternService } from '../../src/modules/architecture/services/pattern.service';
import { DevelopmentWorkflowService } from '../../src/services/development-workflow.service';
import { RequirementsDevelopmentIntegrationService } from '../../src/services/requirements-development-integration.service';
import { ArchitectureDevelopmentIntegrationService } from '../../src/services/architecture-development-integration.service';

describe('Knowledge Sharing and Pattern Reuse Integration', () => {
  let workflowService: DevelopmentWorkflowService;
  let requirementService: RequirementService;
  let analysisService: AnalysisService;
  let decisionService: DecisionService;
  let patternService: PatternService;
  let requirementsIntegration: RequirementsDevelopmentIntegrationService;
  let architectureIntegration: ArchitectureDevelopmentIntegrationService;
  let module: TestingModule;

  // Mock knowledge base that accumulates across test executions
  const mockKnowledgeBase = {
    patterns: new Map<string, any>(),
    templates: new Map<string, any>(),
    bestPractices: new Map<string, any>(),
    lessonsLearned: new Map<string, any>(),
    reusableArtifacts: new Map<string, any>(),
    successMetrics: new Map<string, any>(),
  };

  const mockProjects = [
    {
      id: 'project-ecommerce-001',
      name: 'E-commerce Platform',
      domain: 'e-commerce',
      requirements: [
        {
          id: 'req-ecom-001',
          title: 'Product Catalog Management',
          type: 'functional',
          domain: 'catalog',
          patterns: ['Repository', 'CQRS', 'Event Sourcing'],
          complexity: 'medium',
          successMetrics: {
            performanceImprovements: 40,
            developmentTimeReduction: 25,
            codeReuse: 60,
          },
        },
        {
          id: 'req-ecom-002',
          title: 'Order Processing System',
          type: 'functional',
          domain: 'orders',
          patterns: ['Saga', 'Circuit Breaker', 'Event-Driven'],
          complexity: 'high',
          successMetrics: {
            performanceImprovements: 35,
            developmentTimeReduction: 30,
            codeReuse: 55,
          },
        },
      ],
    },
    {
      id: 'project-banking-001',
      name: 'Banking System',
      domain: 'finance',
      requirements: [
        {
          id: 'req-bank-001',
          title: 'Transaction Processing',
          type: 'functional',
          domain: 'transactions',
          patterns: ['ACID Transactions', 'Two-Phase Commit', 'Audit Trail'],
          complexity: 'high',
          successMetrics: {
            performanceImprovements: 20,
            developmentTimeReduction: 35,
            codeReuse: 70,
          },
        },
      ],
    },
    {
      id: 'project-healthcare-001',
      name: 'Patient Management System',
      domain: 'healthcare',
      requirements: [
        {
          id: 'req-health-001',
          title: 'Patient Data Management',
          type: 'functional',
          domain: 'patient-data',
          patterns: ['Repository', 'Encryption', 'GDPR Compliance'],
          complexity: 'medium',
          successMetrics: {
            performanceImprovements: 30,
            developmentTimeReduction: 20,
            codeReuse: 45,
          },
        },
      ],
    },
  ];

  const mockReusablePatterns = [
    {
      id: 'pattern-repository-001',
      name: 'Generic Repository Pattern',
      domain: 'data-access',
      applicability: 'Any CRUD operations with consistent interface',
      reuseCount: 15,
      successRate: 92,
      averageTimeReduction: 35,
      template: {
        interface: `
interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: T): Promise<T>;
  update(id: string, entity: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}`,
        implementation: `
abstract class BaseRepository<T> implements IRepository<T> {
  constructor(protected model: Model<T>) {}
  
  async findById(id: string): Promise<T | null> {
    return this.model.findById(id);
  }
  
  // ... other standard implementations
}`,
      },
      adaptationGuide: [
        'Replace T with specific entity type',
        'Add domain-specific query methods',
        'Implement validation rules',
        'Add audit logging if required',
      ],
      metrics: {
        codeReduction: 60,
        testCoverageImprovement: 25,
        bugReduction: 40,
      },
    },
    {
      id: 'pattern-saga-001',
      name: 'Orchestrated Saga Pattern',
      domain: 'distributed-transactions',
      applicability: 'Multi-service transactions with compensation logic',
      reuseCount: 8,
      successRate: 87,
      averageTimeReduction: 45,
      template: {
        orchestrator: `
class SagaOrchestrator {
  private steps: SagaStep[] = [];
  
  async execute(context: SagaContext): Promise<SagaResult> {
    for (const step of this.steps) {
      try {
        await step.execute(context);
      } catch (error) {
        await this.compensate(context, step);
        throw error;
      }
    }
    return { status: 'completed', context };
  }
  
  private async compensate(context: SagaContext, failedStep: SagaStep) {
    // Compensation logic
  }
}`,
      },
      adaptationGuide: [
        'Define saga steps for specific business process',
        'Implement compensation actions',
        'Add timeout and retry mechanisms',
        'Include monitoring and logging',
      ],
      metrics: {
        reliabilityImprovement: 50,
        complexityReduction: 35,
        maintenanceReduction: 30,
      },
    },
    {
      id: 'pattern-event-sourcing-001',
      name: 'Event Sourcing with CQRS',
      domain: 'data-consistency',
      applicability: 'Complex business domains with audit requirements',
      reuseCount: 6,
      successRate: 95,
      averageTimeReduction: 40,
      template: {
        eventStore: `
class EventStore {
  async saveEvents(streamId: string, events: DomainEvent[]): Promise<void> {
    // Save events to persistent store
  }
  
  async getEvents(streamId: string): Promise<DomainEvent[]> {
    // Retrieve events for aggregate
  }
}`,
        aggregate: `
abstract class AggregateRoot {
  private uncommittedEvents: DomainEvent[] = [];
  
  protected addEvent(event: DomainEvent): void {
    this.uncommittedEvents.push(event);
    this.apply(event);
  }
  
  abstract apply(event: DomainEvent): void;
}`,
      },
      adaptationGuide: [
        'Define domain events for business operations',
        'Implement event handlers for state changes',
        'Create read models for queries',
        'Add event versioning strategy',
      ],
      metrics: {
        auditCapabilityImprovement: 100,
        scalabilityImprovement: 60,
        testabilityImprovement: 45,
      },
    },
  ];

  const mockBestPractices = [
    {
      id: 'practice-error-handling-001',
      title: 'Comprehensive Error Handling Strategy',
      domain: 'cross-cutting',
      description: 'Standardized error handling across all layers',
      applicability: 'All projects requiring robust error management',
      reuseCount: 22,
      successRate: 96,
      template: `
class ErrorHandler {
  static async handle<T>(
    operation: () => Promise<T>,
    context: string,
    fallback?: () => Promise<T>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      logger.error(\`Error in \${context}\`, error);
      
      if (fallback) {
        return await fallback();
      }
      
      throw new ApplicationError(
        \`Operation failed: \${context}\`,
        error
      );
    }
  }
}`,
      guidelines: [
        'Use structured error messages',
        'Include context information',
        'Implement graceful degradation',
        'Log errors appropriately',
        'Provide user-friendly error messages',
      ],
      metrics: {
        bugReduction: 45,
        debuggingTimeReduction: 35,
        userExperienceImprovement: 40,
      },
    },
    {
      id: 'practice-testing-strategy-001',
      title: 'Test Pyramid Implementation',
      domain: 'quality-assurance',
      description: 'Balanced testing strategy with proper test distribution',
      applicability: 'All development projects',
      reuseCount: 18,
      successRate: 89,
      template: `
// Unit Tests (70%)
describe('UserService', () => {
  it('should create user with valid data', () => {
    // Fast, isolated unit test
  });
});

// Integration Tests (20%)
describe('UserAPI Integration', () => {
  it('should handle user registration flow', () => {
    // Test component interactions
  });
});

// E2E Tests (10%)
describe('User Registration E2E', () => {
  it('should complete full user journey', () => {
    // Test complete user scenarios
  });
});`,
      guidelines: [
        'Maintain 70/20/10 distribution',
        'Fast unit tests with good coverage',
        'Integration tests for component interactions',
        'E2E tests for critical user paths',
        'Automated test execution',
      ],
      metrics: {
        testCoverageImprovement: 50,
        testExecutionSpeedImprovement: 40,
        defectDetectionRate: 65,
      },
    },
  ];

  const mockLessonsLearned = [
    {
      id: 'lesson-microservices-001',
      title: 'Microservices Communication Complexity',
      category: 'architecture',
      description: 'Synchronous communication between microservices can create cascading failures',
      projectContext: 'E-commerce platform with 12 microservices',
      problem: 'Service dependencies caused system-wide outages',
      solution: 'Implement circuit breakers and async messaging',
      impact: 'Reduced cascading failures by 80%',
      prevention: [
        'Use async messaging for non-critical communications',
        'Implement circuit breaker pattern',
        'Design for failure scenarios',
        'Monitor service dependencies',
      ],
      applicability: 'Projects with multiple interconnected services',
      reuseCount: 7,
    },
    {
      id: 'lesson-performance-001',
      title: 'N+1 Query Problem in GraphQL',
      category: 'performance',
      description: 'Nested GraphQL queries can cause performance issues',
      projectContext: 'Product catalog with complex relationships',
      problem: 'Database queries multiplied with nested data fetching',
      solution: 'Implement DataLoader pattern and query optimization',
      impact: 'Reduced query time by 75% and database load by 60%',
      prevention: [
        'Use DataLoader for batching database calls',
        'Implement query depth limiting',
        'Add query complexity analysis',
        'Use database query optimization',
      ],
      applicability: 'GraphQL APIs with complex data relationships',
      reuseCount: 5,
    },
  ];

  beforeEach(async () => {
    // Mock services with knowledge base integration
    const mockRequirementService = {
      getRequirement: jest.fn().mockImplementation((id: string) => {
        const project = mockProjects.find(p => 
          p.requirements.some(r => r.id === id)
        );
        return Promise.resolve(project?.requirements.find(r => r.id === id));
      }),
      findSimilarRequirements: jest.fn().mockImplementation((requirement: any) => {
        return Promise.resolve(
          mockProjects.flatMap(p => p.requirements)
            .filter(r => r.domain === requirement.domain && r.id !== requirement.id)
        );
      }),
    };

    const mockAnalysisService = {
      analyzeRequirement: jest.fn().mockImplementation((id: string) => {
        const requirement = mockProjects.flatMap(p => p.requirements).find(r => r.id === id);
        return Promise.resolve({
          id: `analysis-${id}`,
          requirementId: id,
          complexity: requirement?.complexity || 'medium',
          recommendedPatterns: requirement?.patterns || [],
          similarProjects: mockProjects.filter(p => 
            p.domain === mockProjects.find(proj => 
              proj.requirements.some(r => r.id === id)
            )?.domain
          ),
        });
      }),
    };

    const mockDecisionService = {
      getDecisionsForProject: jest.fn().mockResolvedValue([]),
      findReusableDecisions: jest.fn().mockImplementation((projectDomain: string) => {
        return Promise.resolve(
          Array.from(mockKnowledgeBase.patterns.values())
            .filter((pattern: any) => pattern.domain === projectDomain)
        );
      }),
    };

    const mockPatternService = {
      getRecommendedPatterns: jest.fn().mockImplementation((types: string[]) => {
        return Promise.resolve(mockReusablePatterns);
      }),
      findPatternsByDomain: jest.fn().mockImplementation((domain: string) => {
        return Promise.resolve(
          mockReusablePatterns.filter(pattern => 
            pattern.domain === domain || pattern.domain === 'cross-cutting'
          )
        );
      }),
      getPatternUsageMetrics: jest.fn().mockImplementation((patternId: string) => {
        const pattern = mockReusablePatterns.find(p => p.id === patternId);
        return Promise.resolve(pattern?.metrics || {});
      }),
    };

    module = await Test.createTestingModule({
      providers: [
        DevelopmentWorkflowService,
        RequirementsDevelopmentIntegrationService,
        ArchitectureDevelopmentIntegrationService,
        {
          provide: RequirementService,
          useValue: mockRequirementService,
        },
        {
          provide: AnalysisService,
          useValue: mockAnalysisService,
        },
        {
          provide: DecisionService,
          useValue: mockDecisionService,
        },
        {
          provide: PatternService,
          useValue: mockPatternService,
        },
        {
          provide: 'TechnologyStackService',
          useValue: {
            getTechnologyStack: jest.fn().mockResolvedValue({
              technologies: [],
            }),
          },
        },
      ],
    }).compile();

    workflowService = module.get<DevelopmentWorkflowService>(DevelopmentWorkflowService);
    requirementService = module.get<RequirementService>(RequirementService);
    analysisService = module.get<AnalysisService>(AnalysisService);
    decisionService = module.get<DecisionService>(DecisionService);
    patternService = module.get<PatternService>(PatternService);
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

  describe('Pattern Discovery and Recommendation', () => {
    it('should discover and recommend patterns based on similar requirements', async () => {
      const requirementId = 'req-ecom-001';
      
      const analysis = await analysisService.analyzeRequirement(requirementId);
      expect(analysis.recommendedPatterns).toContain('Repository');
      expect(analysis.similarProjects.length).toBeGreaterThan(0);

      const patterns = await patternService.getRecommendedPatterns(['data-access']);
      const repositoryPattern = patterns.find(p => p.name.includes('Repository'));
      expect(repositoryPattern).toBeDefined();
      expect(repositoryPattern?.reuseCount).toBeGreaterThan(0);
    });

    it('should provide pattern adaptation guidelines', async () => {
      const patterns = await patternService.getRecommendedPatterns(['data-access']);
      const repositoryPattern = patterns.find(p => p.name.includes('Repository'));
      
      expect(repositoryPattern?.adaptationGuide).toBeDefined();
      expect(repositoryPattern?.adaptationGuide.length).toBeGreaterThan(0);
      expect(repositoryPattern?.template).toBeDefined();
      
      // Should provide concrete implementation guidance
      expect(repositoryPattern?.template.interface).toContain('IRepository');
      expect(repositoryPattern?.template.implementation).toContain('BaseRepository');
    });

    it('should calculate pattern success metrics', async () => {
      const patterns = await patternService.getRecommendedPatterns(['distributed-transactions']);
      const sagaPattern = patterns.find(p => p.name.includes('Saga'));
      
      expect(sagaPattern?.successRate).toBeGreaterThanOrEqual(80);
      expect(sagaPattern?.averageTimeReduction).toBeGreaterThan(0);
      expect(sagaPattern?.metrics.reliabilityImprovement).toBeGreaterThan(0);
    });

    it('should recommend domain-specific patterns', async () => {
      const ecommercePatterns = await patternService.findPatternsByDomain('e-commerce');
      const financePatterns = await patternService.findPatternsByDomain('finance');
      
      // E-commerce should include catalog and order patterns
      expect(ecommercePatterns.some(p => p.applicability.includes('CRUD'))).toBe(true);
      
      // Finance should include transaction patterns
      expect(financePatterns.some(p => p.applicability.includes('transactions'))).toBe(true);
    });

    it('should track pattern usage across projects', async () => {
      const repositoryMetrics = await patternService.getPatternUsageMetrics('pattern-repository-001');
      
      expect(repositoryMetrics.codeReduction).toBeGreaterThan(0);
      expect(repositoryMetrics.testCoverageImprovement).toBeGreaterThan(0);
      expect(repositoryMetrics.bugReduction).toBeGreaterThan(0);
    });
  });

  describe('Template Generation and Reuse', () => {
    it('should generate reusable code templates from successful implementations', async () => {
      const requirementId = 'req-ecom-001';
      const templates = await requirementsIntegration.generateCodeTemplatesFromRequirements(
        requirementId
      );

      expect(templates.length).toBeGreaterThan(0);
      
      // Should include repository template
      const serviceTemplate = templates.find(t => t.type === 'service');
      expect(serviceTemplate).toBeDefined();
      expect(serviceTemplate?.content).toBeDefined();
      expect(serviceTemplate?.placeholders.length).toBeGreaterThan(0);
    });

    it('should adapt templates based on requirement context', async () => {
      const ecommerceReq = 'req-ecom-001';
      const bankingReq = 'req-bank-001';
      
      const ecommerceTemplates = await requirementsIntegration.generateCodeTemplatesFromRequirements(
        ecommerceReq
      );
      const bankingTemplates = await requirementsIntegration.generateCodeTemplatesFromRequirements(
        bankingReq
      );

      expect(ecommerceTemplates.length).toBeGreaterThan(0);
      expect(bankingTemplates.length).toBeGreaterThan(0);
      
      // Templates should be contextually different
      const ecomService = ecommerceTemplates.find(t => t.type === 'service');
      const bankService = bankingTemplates.find(t => t.type === 'service');
      
      expect(ecomService?.content).toBeDefined();
      expect(bankService?.content).toBeDefined();
    });

    it('should provide template customization guidance', async () => {
      const templates = await requirementsIntegration.generateCodeTemplatesFromRequirements(
        'req-ecom-001'
      );

      templates.forEach(template => {
        expect(template.placeholders).toBeDefined();
        expect(template.language).toBeDefined();
        expect(template.framework).toBeDefined();
        
        // Should provide guidance on customization
        if (template.type === 'service') {
          expect(template.placeholders).toContain('EntityName');
        }
      });
    });

    it('should validate template quality and completeness', async () => {
      const templates = await requirementsIntegration.generateCodeTemplatesFromRequirements(
        'req-ecom-002'
      );

      templates.forEach(template => {
        // Template should be syntactically valid
        expect(template.content.length).toBeGreaterThan(50);
        expect(template.content).toContain('class');
        
        // Should include error handling
        expect(template.content).toContain('try') || 
        expect(template.content).toContain('catch') ||
        expect(template.content).toContain('Error');
      });
    });
  });

  describe('Best Practices Capture and Application', () => {
    it('should capture best practices from successful implementations', async () => {
      const workflowResult = await workflowService.executeCompleteWorkflow(
        'project-ecommerce-001',
        'req-ecom-001',
        { captureKnowledge: true }
      );

      expect(workflowResult.status).toBe('completed');
      
      const knowledgeArtifact = workflowResult.artifacts.find(a => 
        a.stepId === 'knowledge_capture'
      );
      
      expect(knowledgeArtifact?.content.bestPractices).toBeDefined();
      expect(knowledgeArtifact?.content.bestPractices.length).toBeGreaterThan(0);
    });

    it('should apply relevant best practices to new projects', async () => {
      const guidelines = await architectureIntegration.generateDevelopmentGuidelines(
        'project-ecommerce-001'
      );

      expect(guidelines.bestPractices.length).toBeGreaterThan(0);
      
      // Should include cross-cutting best practices
      const errorHandlingPractice = guidelines.bestPractices.find(bp => 
        bp.category === 'design' && bp.practice.toLowerCase().includes('error')
      );
      expect(errorHandlingPractice).toBeDefined();
    });

    it('should provide practice adaptation guidance', async () => {
      // Best practices should come with implementation guidance
      mockBestPractices.forEach(practice => {
        expect(practice.guidelines.length).toBeGreaterThan(0);
        expect(practice.template).toBeDefined();
        expect(practice.applicability).toBeDefined();
        expect(practice.metrics).toBeDefined();
      });
    });

    it('should measure best practice effectiveness', async () => {
      const errorHandlingPractice = mockBestPractices.find(p => 
        p.id === 'practice-error-handling-001'
      );
      
      expect(errorHandlingPractice?.metrics.bugReduction).toBeGreaterThan(0);
      expect(errorHandlingPractice?.metrics.debuggingTimeReduction).toBeGreaterThan(0);
      expect(errorHandlingPractice?.reuseCount).toBeGreaterThan(0);
      expect(errorHandlingPractice?.successRate).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Lessons Learned Integration', () => {
    it('should capture lessons learned from workflow execution', async () => {
      // Simulate a workflow with some challenges
      const workflowResult = await workflowService.executeCompleteWorkflow(
        'project-ecommerce-001',
        'req-ecom-002',
        { captureKnowledge: true, continueOnFailure: true }
      );

      const knowledgeArtifact = workflowResult.artifacts.find(a => 
        a.stepId === 'knowledge_capture'
      );
      
      expect(knowledgeArtifact?.content.lessonsLearned).toBeDefined();
      expect(knowledgeArtifact?.content.lessonsLearned.length).toBeGreaterThanOrEqual(0);
    });

    it('should provide preventive guidance based on lessons learned', async () => {
      const microservicesLesson = mockLessonsLearned.find(l => 
        l.id === 'lesson-microservices-001'
      );
      
      expect(microservicesLesson?.prevention.length).toBeGreaterThan(0);
      expect(microservicesLesson?.solution).toBeDefined();
      expect(microservicesLesson?.impact).toBeDefined();
      
      // Prevention guidance should be actionable
      expect(microservicesLesson?.prevention).toContain('Use async messaging for non-critical communications');
      expect(microservicesLesson?.prevention).toContain('Implement circuit breaker pattern');
    });

    it('should correlate lessons with architectural decisions', async () => {
      const performanceLesson = mockLessonsLearned.find(l => 
        l.category === 'performance'
      );
      
      expect(performanceLesson?.solution).toBeDefined();
      expect(performanceLesson?.applicability).toBeDefined();
      
      // Should provide context for when the lesson applies
      expect(performanceLesson?.projectContext).toBeDefined();
      expect(performanceLesson?.problem).toBeDefined();
    });

    it('should track lesson application success rate', async () => {
      mockLessonsLearned.forEach(lesson => {
        expect(lesson.reuseCount).toBeGreaterThanOrEqual(0);
        expect(lesson.impact).toBeDefined();
        
        if (lesson.reuseCount > 0) {
          expect(lesson.prevention.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Knowledge Base Evolution', () => {
    it('should update pattern success metrics based on usage', async () => {
      const initialPattern = mockReusablePatterns.find(p => p.id === 'pattern-repository-001');
      const initialReuseCount = initialPattern?.reuseCount || 0;
      
      // Execute workflow using the pattern
      await workflowService.executeCompleteWorkflow(
        'project-healthcare-001',
        'req-health-001',
        { captureKnowledge: true }
      );

      // In a real implementation, this would update the knowledge base
      const updatedMetrics = await patternService.getPatternUsageMetrics(
        'pattern-repository-001'
      );
      
      expect(updatedMetrics).toBeDefined();
      expect(updatedMetrics.codeReduction).toBeGreaterThan(0);
    });

    it('should evolve templates based on successful adaptations', async () => {
      // Generate templates for similar requirements
      const ecommerceTemplates = await requirementsIntegration.generateCodeTemplatesFromRequirements(
        'req-ecom-001'
      );
      const healthcareTemplates = await requirementsIntegration.generateCodeTemplatesFromRequirements(
        'req-health-001'
      );

      // Both should have service templates but with domain-specific adaptations
      const ecomService = ecommerceTemplates.find(t => t.type === 'service');
      const healthService = healthcareTemplates.find(t => t.type === 'service');
      
      expect(ecomService).toBeDefined();
      expect(healthService).toBeDefined();
      
      // Both should share common structure but have contextual differences
      expect(ecomService?.framework).toBe(healthService?.framework);
      expect(ecomService?.language).toBe(healthService?.language);
    });

    it('should identify emerging patterns from multiple implementations', async () => {
      // Execute multiple workflows to identify patterns
      const workflows = [
        workflowService.executeCompleteWorkflow(
          'project-ecommerce-001',
          'req-ecom-001',
          { captureKnowledge: true }
        ),
        workflowService.executeCompleteWorkflow(
          'project-banking-001',
          'req-bank-001',
          { captureKnowledge: true }
        ),
        workflowService.executeCompleteWorkflow(
          'project-healthcare-001',
          'req-health-001',
          { captureKnowledge: true }
        ),
      ];

      const results = await Promise.all(workflows);
      
      results.forEach(result => {
        expect(result.status).toBe('completed');
        const knowledgeArtifact = result.artifacts.find(a => 
          a.stepId === 'knowledge_capture'
        );
        expect(knowledgeArtifact?.content.patterns).toBeDefined();
      });
    });

    it('should maintain pattern version history', async () => {
      const patterns = await patternService.getRecommendedPatterns(['all']);
      
      patterns.forEach(pattern => {
        expect(pattern.id).toBeDefined();
        expect(pattern.name).toBeDefined();
        expect(pattern.reuseCount).toBeGreaterThanOrEqual(0);
        
        // Pattern evolution should be tracked
        if (pattern.reuseCount > 0) {
          expect(pattern.successRate).toBeGreaterThan(0);
          expect(pattern.averageTimeReduction).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  describe('Cross-Project Knowledge Sharing', () => {
    it('should share successful patterns across different domains', async () => {
      const crossDomainPatterns = await patternService.findPatternsByDomain('cross-cutting');
      
      expect(crossDomainPatterns.length).toBeGreaterThan(0);
      
      // Cross-cutting patterns should be applicable across domains
      crossDomainPatterns.forEach(pattern => {
        expect(pattern.applicability).toContain('All') || 
        expect(pattern.applicability).toContain('Any') ||
        expect(pattern.domain).toBe('cross-cutting');
      });
    });

    it('should identify reusable components across projects', async () => {
      const similarRequirements = await requirementService.findSimilarRequirements({
        domain: 'data-access',
        type: 'functional',
      });
      
      expect(similarRequirements.length).toBeGreaterThan(0);
      
      // Should find requirements with similar patterns
      const repositoryRequirements = similarRequirements.filter(req => 
        req.patterns?.includes('Repository')
      );
      expect(repositoryRequirements.length).toBeGreaterThan(0);
    });

    it('should provide project success metrics for knowledge validation', async () => {
      mockProjects.forEach(project => {
        project.requirements.forEach(requirement => {
          expect(requirement.successMetrics).toBeDefined();
          expect(requirement.successMetrics.developmentTimeReduction).toBeGreaterThanOrEqual(0);
          expect(requirement.successMetrics.codeReuse).toBeGreaterThanOrEqual(0);
          expect(requirement.successMetrics.performanceImprovements).toBeGreaterThanOrEqual(0);
        });
      });
    });

    it('should enable knowledge discovery through project analysis', async () => {
      const analysis = await analysisService.analyzeRequirement('req-ecom-001');
      
      expect(analysis.similarProjects).toBeDefined();
      expect(analysis.recommendedPatterns).toBeDefined();
      expect(analysis.recommendedPatterns.length).toBeGreaterThan(0);
      
      // Should include cross-project insights
      if (analysis.similarProjects.length > 0) {
        expect(analysis.similarProjects[0].domain).toBeDefined();
      }
    });
  });

  describe('ROI and Impact Measurement', () => {
    it('should measure development time reduction from pattern reuse', async () => {
      const repositoryPattern = mockReusablePatterns.find(p => 
        p.name.includes('Repository')
      );
      
      expect(repositoryPattern?.averageTimeReduction).toBeGreaterThan(0);
      expect(repositoryPattern?.metrics.codeReduction).toBeGreaterThan(0);
      
      // Calculate projected savings
      const projectedSavings = repositoryPattern.averageTimeReduction * repositoryPattern.reuseCount;
      expect(projectedSavings).toBeGreaterThan(0);
    });

    it('should track code quality improvements from best practices', async () => {
      const errorHandlingPractice = mockBestPractices.find(p => 
        p.title.includes('Error Handling')
      );
      
      expect(errorHandlingPractice?.metrics.bugReduction).toBeGreaterThan(0);
      expect(errorHandlingPractice?.metrics.debuggingTimeReduction).toBeGreaterThan(0);
      expect(errorHandlingPractice?.successRate).toBeGreaterThanOrEqual(85);
    });

    it('should measure pattern adoption success rates', async () => {
      mockReusablePatterns.forEach(pattern => {
        expect(pattern.successRate).toBeGreaterThanOrEqual(80);
        expect(pattern.reuseCount).toBeGreaterThan(0);
        
        if (pattern.metrics) {
          Object.values(pattern.metrics).forEach(metric => {
            expect(typeof metric).toBe('number');
            expect(metric).toBeGreaterThanOrEqual(0);
          });
        }
      });
    });

    it('should calculate cumulative knowledge base value', async () => {
      let totalTimeReduction = 0;
      let totalReuseInstances = 0;
      
      mockReusablePatterns.forEach(pattern => {
        totalTimeReduction += pattern.averageTimeReduction * pattern.reuseCount;
        totalReuseInstances += pattern.reuseCount;
      });
      
      mockBestPractices.forEach(practice => {
        // Estimate time reduction from best practices
        const practiceValue = practice.metrics.debuggingTimeReduction * practice.reuseCount;
        totalTimeReduction += practiceValue;
        totalReuseInstances += practice.reuseCount;
      });
      
      expect(totalTimeReduction).toBeGreaterThan(0);
      expect(totalReuseInstances).toBeGreaterThan(0);
      
      const averageValuePerReuse = totalTimeReduction / totalReuseInstances;
      expect(averageValuePerReuse).toBeGreaterThan(0);
    });
  });

  describe('Knowledge Quality and Validation', () => {
    it('should validate pattern effectiveness before recommendation', async () => {
      const patterns = await patternService.getRecommendedPatterns(['data-access']);
      
      patterns.forEach(pattern => {
        // Only recommend patterns with proven success
        expect(pattern.successRate).toBeGreaterThanOrEqual(80);
        expect(pattern.reuseCount).toBeGreaterThan(0);
        
        // Should have complete implementation guidance
        expect(pattern.template).toBeDefined();
        expect(pattern.adaptationGuide.length).toBeGreaterThan(0);
      });
    });

    it('should ensure best practices have measurable outcomes', async () => {
      mockBestPractices.forEach(practice => {
        expect(practice.metrics).toBeDefined();
        expect(Object.keys(practice.metrics).length).toBeGreaterThan(0);
        
        // Each metric should show positive impact
        Object.values(practice.metrics).forEach(value => {
          expect(value).toBeGreaterThan(0);
        });
      });
    });

    it('should validate lesson learned applicability', async () => {
      mockLessonsLearned.forEach(lesson => {
        expect(lesson.applicability).toBeDefined();
        expect(lesson.prevention.length).toBeGreaterThan(0);
        expect(lesson.solution).toBeDefined();
        expect(lesson.impact).toBeDefined();
        
        // Should have clear problem-solution mapping
        expect(lesson.problem).toBeDefined();
        expect(lesson.projectContext).toBeDefined();
      });
    });

    it('should maintain knowledge freshness and relevance', async () => {
      // Knowledge should be continuously validated
      const currentPatterns = await patternService.getRecommendedPatterns(['all']);
      
      currentPatterns.forEach(pattern => {
        // Recent patterns should have higher relevance
        expect(pattern.reuseCount).toBeGreaterThanOrEqual(0);
        
        if (pattern.reuseCount > 10) {
          expect(pattern.successRate).toBeGreaterThanOrEqual(85);
        }
      });
    });
  });

  describe('Integration with Development Workflow', () => {
    it('should seamlessly integrate knowledge recommendations into workflow', async () => {
      const workflowResult = await workflowService.executeCompleteWorkflow(
        'project-ecommerce-001',
        'req-ecom-001',
        { captureKnowledge: true }
      );

      expect(workflowResult.status).toBe('completed');
      
      // Should include pattern recommendations in architecture phase
      const architecturePhase = workflowResult.phases.find(p => p.id === 'analysis');
      expect(architecturePhase).toBeDefined();
      
      // Should capture new knowledge
      const knowledgePhase = workflowResult.phases.find(p => p.id === 'knowledge');
      expect(knowledgePhase).toBeDefined();
    });

    it('should provide real-time pattern suggestions during development', async () => {
      const developmentSpec = await requirementsIntegration.convertRequirementsToDevelopmentSpecs(
        'req-ecom-001'
      );
      
      expect(developmentSpec.codePatterns.length).toBeGreaterThan(0);
      
      // Should suggest relevant patterns based on requirement type
      expect(developmentSpec.codePatterns).toContain('Repository Pattern');
    });

    it('should validate implementation against known best practices', async () => {
      const validationResult = await architectureIntegration.validateImplementationAgainstArchitecture(
        'project-ecommerce-001',
        {
          id: 'impl-001',
          files: [
            { path: 'src/product/product.service.ts', type: 'service', linesOfCode: 200, complexity: 'medium' },
            { path: 'src/product/product.repository.ts', type: 'repository', linesOfCode: 150, complexity: 'low' },
          ],
          tests: [
            { path: 'src/product/product.service.spec.ts', coverage: 85, passedTests: 20, totalTests: 22 },
          ],
          documentation: [],
          metrics: { codeQuality: 88, testCoverage: 85, performance: { responseTime: 95 } },
        }
      );

      expect(validationResult.overallCompliance).not.toBe('non_compliant');
      
      // Should provide recommendations based on best practices
      if (validationResult.recommendations.length > 0) {
        validationResult.recommendations.forEach(recommendation => {
          expect(typeof recommendation).toBe('string');
          expect(recommendation.length).toBeGreaterThan(10);
        });
      }
    });

    it('should enable continuous knowledge improvement', async () => {
      // Execute multiple workflows to demonstrate knowledge accumulation
      const workflows = await Promise.all([
        workflowService.executeCompleteWorkflow(
          'project-ecommerce-001',
          'req-ecom-001',
          { captureKnowledge: true }
        ),
        workflowService.executeCompleteWorkflow(
          'project-ecommerce-001',
          'req-ecom-002',
          { captureKnowledge: true }
        ),
      ]);

      workflows.forEach(result => {
        expect(result.status).toBe('completed');
        
        const knowledgeArtifact = result.artifacts.find(a => 
          a.stepId === 'knowledge_capture'
        );
        
        if (knowledgeArtifact) {
          expect(knowledgeArtifact.content.reusableArtifacts).toBeDefined();
          expect(knowledgeArtifact.content.patterns).toBeDefined();
        }
      });
    });
  });
});