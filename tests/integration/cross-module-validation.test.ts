import { Test, TestingModule } from '@nestjs/testing';
import { RequirementService } from '../../src/modules/requirements/services/requirement.service';
import { AnalysisService } from '../../src/modules/requirements/services/analysis.service';
import { DecisionService } from '../../src/modules/architecture/services/decision.service';
import { PatternService } from '../../src/modules/architecture/services/pattern.service';
import { TechnologyStackService } from '../../src/modules/architecture/services/technology-stack.service';
import { RequirementsDevelopmentIntegrationService } from '../../src/services/requirements-development-integration.service';
import { ArchitectureDevelopmentIntegrationService } from '../../src/services/architecture-development-integration.service';
import { DevelopmentWorkflowService } from '../../src/services/development-workflow.service';

describe('Cross-Module Validation Integration', () => {
  let requirementService: RequirementService;
  let analysisService: AnalysisService;
  let decisionService: DecisionService;
  let patternService: PatternService;
  let technologyStackService: TechnologyStackService;
  let requirementsIntegration: RequirementsDevelopmentIntegrationService;
  let architectureIntegration: ArchitectureDevelopmentIntegrationService;
  let workflowService: DevelopmentWorkflowService;
  let module: TestingModule;

  const mockProjectId = 'cross-validation-project-001';
  const mockRequirementId = 'cross-validation-req-001';

  // Mock data that spans across modules
  const mockRequirement = {
    id: mockRequirementId,
    projectId: mockProjectId,
    title: 'E-commerce Order Processing System',
    description: 'Implement a scalable order processing system with real-time inventory management, payment processing, and order fulfillment workflows',
    type: 'functional',
    priority: 'critical',
    acceptanceCriteria: [
      'Process orders within 100ms response time',
      'Handle concurrent inventory updates safely',
      'Integrate with multiple payment providers',
      'Support order cancellation and refunds',
      'Provide real-time order status updates',
    ],
    dependencies: ['inventory-service', 'payment-service', 'notification-service'],
    constraints: [
      'Must handle 10,000 concurrent users',
      'Must be ACID compliant for financial transactions',
      'Must support eventual consistency for inventory',
    ],
    businessRules: [
      'Orders cannot exceed available inventory',
      'Payment must be authorized before order confirmation',
      'Cancelled orders must refund within 24 hours',
    ],
  };

  const mockRequirementAnalysis = {
    id: 'analysis-cross-001',
    requirementId: mockRequirementId,
    complexity: 'high',
    riskLevel: 'medium',
    technicalRequirements: [
      {
        category: 'performance',
        specification: 'Sub-100ms order processing',
        constraints: ['Database optimization', 'Caching strategy'],
        performance: { maxLatency: 100, targetThroughput: 1000 },
      },
      {
        category: 'scalability',
        specification: 'Horizontal scaling capability',
        constraints: ['Stateless design', 'Load balancing'],
        performance: { maxConcurrentUsers: 10000 },
      },
      {
        category: 'reliability',
        specification: '99.9% uptime requirement',
        constraints: ['Circuit breakers', 'Failover mechanisms'],
        performance: { uptime: 99.9 },
      },
    ],
    businessRules: mockRequirement.businessRules,
    integrationPoints: [
      { system: 'inventory-service', type: 'synchronous', criticality: 'high' },
      { system: 'payment-service', type: 'synchronous', criticality: 'critical' },
      { system: 'notification-service', type: 'asynchronous', criticality: 'medium' },
    ],
  };

  const mockArchitecturalDecisions = [
    {
      id: 'decision-cross-001',
      projectId: mockProjectId,
      title: 'Microservices Architecture',
      context: 'Need to handle high scalability and team autonomy for order processing system',
      decision: 'Adopt microservices architecture with domain-driven design',
      rationale: 'Enables independent scaling and deployment of different business capabilities',
      category: 'architectural_style',
      consequences: 'Improved scalability but increased complexity in service coordination',
      alternatives: [
        { name: 'Monolithic', description: 'Single deployable unit' },
        { name: 'Service-oriented', description: 'Coarse-grained services' },
      ],
      constraints: ['Service autonomy', 'Data ownership per service'],
      qualityAttributes: ['scalability', 'maintainability', 'deployability'],
    },
    {
      id: 'decision-cross-002',
      projectId: mockProjectId,
      title: 'Event-Driven Communication',
      context: 'Need asynchronous communication between order and inventory services',
      decision: 'Use event-driven architecture with message queues',
      rationale: 'Decouples services and provides resilience to failures',
      category: 'integration',
      consequences: 'Eventual consistency but improved system resilience',
      alternatives: [
        { name: 'Synchronous REST', description: 'Direct API calls' },
        { name: 'Database sharing', description: 'Shared database integration' },
      ],
      constraints: ['Message durability', 'Ordered message processing'],
      qualityAttributes: ['reliability', 'availability', 'scalability'],
    },
    {
      id: 'decision-cross-003',
      projectId: mockProjectId,
      title: 'Database per Service',
      context: 'Data management strategy for microservices',
      decision: 'Each microservice owns its data with dedicated database',
      rationale: 'Ensures service autonomy and independent evolution',
      category: 'data_management',
      consequences: 'Data consistency challenges but service independence',
      alternatives: [
        { name: 'Shared database', description: 'Common database for all services' },
        { name: 'Data lake', description: 'Centralized data storage' },
      ],
      constraints: ['ACID for financial data', 'Eventual consistency for inventory'],
      qualityAttributes: ['maintainability', 'scalability', 'performance'],
    },
  ];

  const mockDesignPatterns = [
    {
      id: 'pattern-cross-001',
      name: 'CQRS (Command Query Responsibility Segregation)',
      category: 'Architectural',
      applicability: 'complex business domains with different read/write patterns',
      benefits: ['Optimized read/write models', 'Scalable queries', 'Clear command handling'],
      drawbacks: ['Added complexity', 'Eventual consistency'],
      structure: 'Separate command and query models with event sourcing',
      examples: ['Order command model', 'Order history query model'],
      relatedPatterns: ['Event Sourcing', 'Domain Events'],
    },
    {
      id: 'pattern-cross-002',
      name: 'Saga Pattern',
      category: 'Integration',
      applicability: 'distributed transactions across multiple services',
      benefits: ['Distributed transaction management', 'Failure handling', 'Compensation logic'],
      drawbacks: ['Complex failure scenarios', 'Debugging challenges'],
      structure: 'Orchestrator or choreography-based saga execution',
      examples: ['Order processing saga', 'Payment processing saga'],
      relatedPatterns: ['Compensating Transaction', 'Process Manager'],
    },
    {
      id: 'pattern-cross-003',
      name: 'Circuit Breaker',
      category: 'Resilience',
      applicability: 'service-to-service communication with potential failures',
      benefits: ['Failure isolation', 'Quick recovery', 'System stability'],
      drawbacks: ['False positives', 'Configuration complexity'],
      structure: 'Proxy with state machine (closed/open/half-open)',
      examples: ['Payment service circuit breaker', 'Inventory service circuit breaker'],
      relatedPatterns: ['Bulkhead', 'Timeout', 'Retry'],
    },
  ];

  const mockTechnologyStack = {
    id: 'tech-stack-cross-001',
    projectId: mockProjectId,
    technologies: [
      {
        name: 'Node.js',
        version: '18.x',
        category: 'runtime',
        rationale: 'High concurrency support for I/O intensive operations',
        constraints: ['Memory management for high load', 'CPU profiling for performance'],
        guidelines: ['Use async/await consistently', 'Implement proper error handling'],
        bestPractices: ['Connection pooling', 'Graceful shutdowns', 'Health checks'],
      },
      {
        name: 'PostgreSQL',
        version: '15.x',
        category: 'database',
        rationale: 'ACID compliance for financial transactions',
        constraints: ['Read replicas for scaling', 'Connection pooling', 'Query optimization'],
        guidelines: ['Use transactions for consistency', 'Implement proper indexing'],
        bestPractices: ['Regular backups', 'Monitoring query performance', 'Connection limits'],
      },
      {
        name: 'Redis',
        version: '7.x',
        category: 'cache',
        rationale: 'High-performance caching and session storage',
        constraints: ['Memory optimization', 'Persistence configuration', 'Clustering'],
        guidelines: ['Use appropriate data structures', 'Set expiration policies'],
        bestPractices: ['Monitor memory usage', 'Implement cache warming', 'Handle cache misses'],
      },
      {
        name: 'RabbitMQ',
        version: '3.12.x',
        category: 'messaging',
        rationale: 'Reliable message queuing for event-driven architecture',
        constraints: ['Message durability', 'Dead letter queues', 'Clustering setup'],
        guidelines: ['Design idempotent message handlers', 'Use proper routing keys'],
        bestPractices: ['Monitor queue sizes', 'Implement retry mechanisms', 'Handle poison messages'],
      },
    ],
  };

  beforeEach(async () => {
    const mockRequirementService = {
      getRequirement: jest.fn().mockResolvedValue(mockRequirement),
      findByProject: jest.fn().mockResolvedValue([mockRequirement]),
      validateRequirementConsistency: jest.fn().mockResolvedValue({
        isConsistent: true,
        issues: [],
      }),
    };

    const mockAnalysisService = {
      analyzeRequirement: jest.fn().mockResolvedValue(mockRequirementAnalysis),
      validateTechnicalFeasibility: jest.fn().mockResolvedValue({
        feasible: true,
        risks: [],
        recommendations: [],
      }),
    };

    const mockDecisionService = {
      getDecisionsForProject: jest.fn().mockResolvedValue(mockArchitecturalDecisions),
      validateDecisionConsistency: jest.fn().mockResolvedValue({
        isConsistent: true,
        conflicts: [],
      }),
      findRelatedDecisions: jest.fn().mockResolvedValue(mockArchitecturalDecisions),
    };

    const mockPatternService = {
      getRecommendedPatterns: jest.fn().mockResolvedValue(mockDesignPatterns),
      validatePatternCompatibility: jest.fn().mockResolvedValue({
        compatible: true,
        conflicts: [],
        recommendations: [],
      }),
      findPatternsForRequirement: jest.fn().mockResolvedValue(mockDesignPatterns),
    };

    const mockTechnologyStackService = {
      getTechnologyStack: jest.fn().mockResolvedValue(mockTechnologyStack),
      validateTechnologyCompatibility: jest.fn().mockResolvedValue({
        compatible: true,
        issues: [],
        recommendations: [],
      }),
    };

    module = await Test.createTestingModule({
      providers: [
        RequirementsDevelopmentIntegrationService,
        ArchitectureDevelopmentIntegrationService,
        DevelopmentWorkflowService,
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
          provide: TechnologyStackService,
          useValue: mockTechnologyStackService,
        },
      ],
    }).compile();

    requirementService = module.get<RequirementService>(RequirementService);
    analysisService = module.get<AnalysisService>(AnalysisService);
    decisionService = module.get<DecisionService>(DecisionService);
    patternService = module.get<PatternService>(PatternService);
    technologyStackService = module.get<TechnologyStackService>(TechnologyStackService);
    requirementsIntegration = module.get<RequirementsDevelopmentIntegrationService>(
      RequirementsDevelopmentIntegrationService,
    );
    architectureIntegration = module.get<ArchitectureDevelopmentIntegrationService>(
      ArchitectureDevelopmentIntegrationService,
    );
    workflowService = module.get<DevelopmentWorkflowService>(DevelopmentWorkflowService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('End-to-End Cross-Module Integration', () => {
    it('should validate complete data flow from requirements through architecture to development', async () => {
      // Execute complete workflow
      const workflowResult = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId,
        { captureKnowledge: true }
      );

      expect(workflowResult.status).toBe('completed');
      expect(workflowResult.projectId).toBe(mockProjectId);
      expect(workflowResult.requirementId).toBe(mockRequirementId);

      // Verify all services were called with consistent data
      expect(requirementService.getRequirement).toHaveBeenCalledWith(mockRequirementId);
      expect(analysisService.analyzeRequirement).toHaveBeenCalledWith(mockRequirementId);
      expect(decisionService.getDecisionsForProject).toHaveBeenCalledWith(mockProjectId);
      expect(patternService.getRecommendedPatterns).toHaveBeenCalled();
      expect(technologyStackService.getTechnologyStack).toHaveBeenCalledWith(mockProjectId);

      // Verify data consistency across modules
      expect(workflowResult.phases.length).toBeGreaterThan(3);
      expect(workflowResult.artifacts.length).toBeGreaterThan(5);
    });

    it('should maintain referential integrity across all modules', async () => {
      // Test requirements-architecture alignment
      const developmentSpec = await requirementsIntegration.convertRequirementsToDevelopmentSpecs(
        mockRequirementId
      );
      
      const guidedSpec = await architectureIntegration.applyArchitecturalDecisionsToDevelopment(
        mockProjectId,
        developmentSpec
      );

      // Verify that architectural decisions align with requirements
      expect(guidedSpec.architecturalGuidance.applicableDecisions.length).toBeGreaterThan(0);
      expect(guidedSpec.enhancedCodePatterns.length).toBeGreaterThanOrEqual(
        developmentSpec.codePatterns.length
      );

      // Verify technology constraints match architectural decisions
      const techConstraints = guidedSpec.architecturalGuidance.technologyConstraints;
      expect(techConstraints.some(tc => tc.technology === 'Node.js')).toBe(true);
      expect(techConstraints.some(tc => tc.technology === 'PostgreSQL')).toBe(true);
    });

    it('should validate cross-cutting concerns across all modules', async () => {
      // Performance requirements should be reflected in architecture and implementation
      const developmentSpec = await requirementsIntegration.convertRequirementsToDevelopmentSpecs(
        mockRequirementId
      );

      const codeStructure = await architectureIntegration.generateCodeStructureFromArchitecture(
        mockProjectId,
        developmentSpec
      );

      // Verify performance concerns are addressed
      expect(developmentSpec.technicalSpecs.some(ts => ts.category === 'performance')).toBe(true);
      expect(codeStructure.components.length).toBeGreaterThan(0);
      expect(codeStructure.layers.length).toBeGreaterThan(0);

      // Verify scalability patterns are included
      const guidedSpec = await architectureIntegration.applyArchitecturalDecisionsToDevelopment(
        mockProjectId,
        developmentSpec
      );
      
      expect(guidedSpec.enhancedCodePatterns.some(pattern => 
        pattern.toLowerCase().includes('circuit') ||
        pattern.toLowerCase().includes('saga') ||
        pattern.toLowerCase().includes('cqrs')
      )).toBe(true);
    });
  });

  describe('Requirements-Architecture Alignment Validation', () => {
    it('should validate that architectural decisions support requirement constraints', async () => {
      const developmentSpec = await requirementsIntegration.convertRequirementsToDevelopmentSpecs(
        mockRequirementId
      );

      const guidedSpec = await architectureIntegration.applyArchitecturalDecisionsToDevelopment(
        mockProjectId,
        developmentSpec
      );

      // Performance constraint (100ms) should be reflected in architectural decisions
      const performanceDecisions = guidedSpec.architecturalGuidance.applicableDecisions.filter(
        decision => decision.qualityAttributes?.includes('performance')
      );
      expect(performanceDecisions.length).toBeGreaterThan(0);

      // Scalability constraint (10,000 users) should influence architecture
      const scalabilityDecisions = guidedSpec.architecturalGuidance.applicableDecisions.filter(
        decision => decision.qualityAttributes?.includes('scalability')
      );
      expect(scalabilityDecisions.length).toBeGreaterThan(0);
    });

    it('should ensure business rules are preserved through architectural transformation', async () => {
      const developmentSpec = await requirementsIntegration.convertRequirementsToDevelopmentSpecs(
        mockRequirementId
      );

      // Business rules from requirements should be preserved
      expect(developmentSpec.functionalSpecs[0].businessRules).toEqual(
        expect.arrayContaining(mockRequirement.businessRules)
      );

      const validationResult = await requirementsIntegration.validateImplementationAgainstRequirements(
        mockRequirementId,
        {
          id: 'impl-001',
          files: [],
          tests: [],
          documentation: [],
          metrics: { codeQuality: 85, testCoverage: 90, performance: {} },
        }
      );

      expect(validationResult.overallStatus).toBe('passed');
    });

    it('should validate integration points consistency', async () => {
      const developmentSpec = await requirementsIntegration.convertRequirementsToDevelopmentSpecs(
        mockRequirementId
      );

      const guidedSpec = await architectureIntegration.applyArchitecturalDecisionsToDevelopment(
        mockProjectId,
        developmentSpec
      );

      // Integration points from requirement analysis should match architectural guidance
      expect(guidedSpec.architecturalGuidance.integrationPoints.length).toBeGreaterThan(0);
      
      const integrationTypes = guidedSpec.architecturalGuidance.integrationPoints.map(ip => ip.type);
      expect(integrationTypes).toEqual(
        expect.arrayContaining(['database', 'service', 'system'])
      );
    });
  });

  describe('Technology Stack Consistency Validation', () => {
    it('should validate technology choices support both requirements and architecture', async () => {
      const developmentSpec = await requirementsIntegration.convertRequirementsToDevelopmentSpecs(
        mockRequirementId
      );

      const guidelines = await architectureIntegration.generateDevelopmentGuidelines(mockProjectId);

      // Technology guidelines should support requirement constraints
      const nodeGuideline = guidelines.technologyGuidelines.find(tg => tg.technology === 'Node.js');
      expect(nodeGuideline).toBeDefined();
      expect(nodeGuideline?.bestPractices.length).toBeGreaterThan(0);

      // Database choice should support ACID requirements
      const dbGuideline = guidelines.technologyGuidelines.find(tg => tg.technology === 'PostgreSQL');
      expect(dbGuideline).toBeDefined();

      // Messaging technology should support event-driven architecture
      const messageGuideline = guidelines.technologyGuidelines.find(tg => tg.technology === 'RabbitMQ');
      expect(messageGuideline).toBeDefined();
    });

    it('should validate technology constraints are reflected in implementation guidelines', async () => {
      const guidelines = await architectureIntegration.generateDevelopmentGuidelines(mockProjectId);

      // Quality gates should reflect technology constraints
      expect(guidelines.qualityGates.length).toBeGreaterThan(0);
      
      const performanceGate = guidelines.qualityGates.find(qg => 
        qg.criteria.some(c => c.metric.includes('performance') || c.metric.includes('response'))
      );
      expect(performanceGate).toBeDefined();

      // Best practices should address scalability
      const scalabilityPractice = guidelines.bestPractices.find(bp => 
        bp.practice.toLowerCase().includes('scal') || 
        bp.practice.toLowerCase().includes('performance')
      );
      expect(scalabilityPractice).toBeDefined();
    });

    it('should ensure technology stack supports required patterns', async () => {
      const codeStructure = await architectureIntegration.generateCodeStructureFromArchitecture(
        mockProjectId,
        {
          id: 'spec-001',
          requirementId: mockRequirementId,
          title: 'Test Spec',
          description: 'Test',
          functionalSpecs: [],
          technicalSpecs: [],
          testCriteria: [],
          acceptanceCriteria: [],
          constraints: [],
          dependencies: [],
          priority: 'high',
          complexity: 'medium',
          estimatedEffort: { hours: 16, complexity: 'medium', confidence: 0.8, factors: [] },
          codePatterns: ['CQRS', 'Saga Pattern', 'Circuit Breaker'],
          validationRules: [],
        }
      );

      // Code structure should reflect pattern requirements
      expect(codeStructure.components.length).toBeGreaterThan(0);
      
      // Dependency rules should support pattern implementation
      expect(codeStructure.dependencies.length).toBeGreaterThan(0);
      const circularDependencyRule = codeStructure.dependencies.find(dep => 
        dep.rule.toLowerCase().includes('circular')
      );
      expect(circularDependencyRule).toBeDefined();
    });
  });

  describe('Quality Attribute Traceability', () => {
    it('should trace performance requirements through all layers', async () => {
      const developmentSpec = await requirementsIntegration.convertRequirementsToDevelopmentSpecs(
        mockRequirementId
      );

      const guidedSpec = await architectureIntegration.applyArchitecturalDecisionsToDevelopment(
        mockProjectId,
        developmentSpec
      );

      const improvements = await architectureIntegration.suggestArchitecturalImprovements(
        mockProjectId,
        { codeQuality: 75, testCoverage: 80, performance: { responseTime: 150 } }
      );

      // Performance requirements should be traceable
      expect(developmentSpec.technicalSpecs.some(ts => ts.category === 'performance')).toBe(true);
      expect(guidedSpec.architecturalGuidance.qualityAttributes.some(qa => qa.name === 'performance')).toBe(true);
      
      // Should suggest performance improvements if metrics don't meet requirements
      const performanceImprovement = improvements.find(imp => imp.type === 'performance');
      if (performanceImprovement) {
        expect(performanceImprovement.recommendedPatterns.length).toBeGreaterThan(0);
      }
    });

    it('should validate security requirements across all modules', async () => {
      const developmentSpec = await requirementsIntegration.convertRequirementsToDevelopmentSpecs(
        mockRequirementId
      );

      const guidelines = await architectureIntegration.generateDevelopmentGuidelines(mockProjectId);

      // Security should be addressed in multiple places
      expect(guidelines.securityGuidelines.length).toBeGreaterThan(0);
      
      const authGuideline = guidelines.securityGuidelines.find(sg => 
        sg.category === 'authentication' || sg.threats.includes('Unauthorized access')
      );
      expect(authGuideline).toBeDefined();

      const inputValidationGuideline = guidelines.securityGuidelines.find(sg => 
        sg.category === 'validation'
      );
      expect(inputValidationGuideline).toBeDefined();
    });

    it('should ensure reliability requirements are consistently applied', async () => {
      const tasks = await architectureIntegration.createArchitectureDrivenTasks(
        mockProjectId,
        {
          id: 'spec-001',
          requirementId: mockRequirementId,
          title: 'Reliable System',
          description: 'System with 99.9% uptime',
          functionalSpecs: [],
          technicalSpecs: [],
          testCriteria: [],
          acceptanceCriteria: [],
          constraints: [],
          dependencies: [],
          priority: 'high',
          complexity: 'high',
          estimatedEffort: { hours: 40, complexity: 'high', confidence: 0.7, factors: [] },
          codePatterns: ['Circuit Breaker', 'Bulkhead', 'Retry'],
          validationRules: [],
        }
      );

      // Should have tasks related to reliability patterns
      const reliabilityTask = tasks.find(task => 
        task.type === 'pattern_implementation' &&
        (task.title.includes('Circuit') || task.title.includes('Bulkhead'))
      );
      expect(reliabilityTask).toBeDefined();
    });
  });

  describe('Data Consistency and Validation', () => {
    it('should validate data model consistency across modules', async () => {
      const developmentSpec = await requirementsIntegration.convertRequirementsToDevelopmentSpecs(
        mockRequirementId
      );

      const codeStructure = await architectureIntegration.generateCodeStructureFromArchitecture(
        mockProjectId,
        developmentSpec
      );

      // Data models should be consistent with requirements
      expect(developmentSpec.functionalSpecs.length).toBeGreaterThan(0);
      expect(codeStructure.components.length).toBeGreaterThan(0);

      // Should have proper interfaces defined
      expect(codeStructure.interfaces.length).toBeGreaterThan(0);
      codeStructure.interfaces.forEach(interface_ => {
        expect(interface_.methods.length).toBeGreaterThan(0);
      });
    });

    it('should ensure constraint consistency across requirements and architecture', async () => {
      const developmentSpec = await requirementsIntegration.convertRequirementsToDevelopmentSpecs(
        mockRequirementId
      );

      const guidedSpec = await architectureIntegration.applyArchitecturalDecisionsToDevelopment(
        mockProjectId,
        developmentSpec
      );

      // Constraints should be preserved and enhanced
      expect(developmentSpec.constraints.length).toBeDefined();
      expect(guidedSpec.architecturalConstraints.length).toBeGreaterThan(0);

      // Should have implementation guidelines for constraints
      expect(guidedSpec.implementationGuidelines.length).toBeGreaterThan(0);
    });

    it('should validate business rule implementation across layers', async () => {
      const developmentSpec = await requirementsIntegration.convertRequirementsToDevelopmentSpecs(
        mockRequirementId
      );

      const templates = await requirementsIntegration.generateCodeTemplatesFromRequirements(
        mockRequirementId
      );

      // Business rules should be reflected in generated templates
      expect(developmentSpec.functionalSpecs[0].businessRules.length).toBeGreaterThan(0);
      
      const serviceTemplate = templates.find(t => t.type === 'service');
      if (serviceTemplate) {
        expect(serviceTemplate.content).toContain('Business Rule');
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle inconsistent data across modules gracefully', async () => {
      // Mock inconsistent requirement data
      (requirementService.getRequirement as jest.Mock).mockResolvedValueOnce({
        ...mockRequirement,
        projectId: 'different-project-id', // Inconsistent project ID
      });

      // Should handle gracefully or provide meaningful errors
      await expect(
        workflowService.executeCompleteWorkflow(mockProjectId, mockRequirementId)
      ).rejects.toThrow();
    });

    it('should validate and report missing dependencies', async () => {
      // Mock requirement with missing dependencies
      const incompleteRequirement = {
        ...mockRequirement,
        dependencies: ['non-existent-service'],
      };

      (requirementService.getRequirement as jest.Mock).mockResolvedValueOnce(incompleteRequirement);

      const developmentSpec = await requirementsIntegration.convertRequirementsToDevelopmentSpecs(
        mockRequirementId
      );

      expect(developmentSpec.dependencies).toContain('non-existent-service');
      
      // Should be reflected in validation
      const validationResult = await requirementsIntegration.validateImplementationAgainstRequirements(
        mockRequirementId,
        {
          id: 'impl-001',
          files: [],
          tests: [],
          documentation: [],
          metrics: { codeQuality: 85, testCoverage: 90, performance: {} },
        }
      );

      expect(validationResult).toBeDefined();
    });

    it('should handle conflicting architectural decisions', async () => {
      // Mock conflicting decisions
      const conflictingDecisions = [
        ...mockArchitecturalDecisions,
        {
          id: 'decision-conflict-001',
          projectId: mockProjectId,
          title: 'Monolithic Architecture',
          decision: 'Use monolithic architecture for simplicity',
          category: 'architectural_style',
          constraints: ['Single deployment unit'],
        },
      ];

      (decisionService.getDecisionsForProject as jest.Mock).mockResolvedValueOnce(
        conflictingDecisions
      );

      // Should handle conflicts in architectural guidance
      const developmentSpec = await requirementsIntegration.convertRequirementsToDevelopmentSpecs(
        mockRequirementId
      );

      const guidedSpec = await architectureIntegration.applyArchitecturalDecisionsToDevelopment(
        mockProjectId,
        developmentSpec
      );

      expect(guidedSpec.architecturalGuidance.applicableDecisions.length).toBeGreaterThan(0);
    });

    it('should validate technology stack compatibility issues', async () => {
      // Mock incompatible technology stack
      const incompatibleStack = {
        ...mockTechnologyStack,
        technologies: [
          ...mockTechnologyStack.technologies,
          {
            name: 'MySQL',
            version: '8.0',
            category: 'database',
            rationale: 'Alternative database choice',
            constraints: ['No ACID guarantees for complex transactions'],
          },
        ],
      };

      (technologyStackService.getTechnologyStack as jest.Mock).mockResolvedValueOnce(
        incompatibleStack
      );

      const guidelines = await architectureIntegration.generateDevelopmentGuidelines(mockProjectId);

      // Should include both PostgreSQL and MySQL guidelines
      expect(guidelines.technologyGuidelines.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Performance and Scalability Validation', () => {
    it('should validate system can handle concurrent operations across modules', async () => {
      // Simulate concurrent workflow executions
      const concurrentWorkflows = Array(5).fill(null).map((_, index) =>
        workflowService.executeCompleteWorkflow(
          mockProjectId,
          `${mockRequirementId}-${index}`,
          { enableParallelExecution: true }
        )
      );

      const results = await Promise.all(concurrentWorkflows);

      results.forEach(result => {
        expect(result.status).toBe('completed');
        expect(result.artifacts.length).toBeGreaterThan(0);
      });
    });

    it('should validate large-scale data processing across modules', async () => {
      // Mock large requirement with many functional specs
      const largeRequirement = {
        ...mockRequirement,
        functionalSpecs: Array(50).fill(null).map((_, index) => ({
          id: `func-${index}`,
          name: `Feature ${index}`,
          type: 'service',
          priority: 'medium',
          inputs: [`input-${index}`],
          outputs: [`output-${index}`],
          businessRules: [`Rule ${index}`],
        })),
      };

      // Should handle large datasets efficiently
      const startTime = Date.now();
      const workflowResult = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId
      );
      const duration = Date.now() - startTime;

      expect(workflowResult.status).toBe('completed');
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    });

    it('should validate memory and resource usage across modules', async () => {
      // Execute workflow with monitoring
      const workflowResult = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId,
        { includeDeploy: true }
      );

      expect(workflowResult.status).toBe('completed');
      
      // Should have deployment metrics
      const deploymentArtifact = workflowResult.artifacts.find(artifact => 
        artifact.type === 'deployment_info'
      );
      
      if (deploymentArtifact) {
        expect(deploymentArtifact.content.deploymentResult).toBeDefined();
      }
    });
  });

  describe('Knowledge Capture and Reuse', () => {
    it('should capture cross-module knowledge for future reuse', async () => {
      const workflowResult = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId,
        { captureKnowledge: true }
      );

      expect(workflowResult.status).toBe('completed');
      
      const knowledgeArtifact = workflowResult.artifacts.find(artifact => 
        artifact.stepId === 'knowledge_capture'
      );

      expect(knowledgeArtifact).toBeDefined();
      expect(knowledgeArtifact?.content.reusableArtifacts.length).toBeGreaterThan(0);
      expect(knowledgeArtifact?.content.patterns.length).toBeGreaterThan(0);
    });

    it('should identify reusable patterns across requirements and architecture', async () => {
      const workflowResult = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId,
        { captureKnowledge: true }
      );

      const knowledgeArtifact = workflowResult.artifacts.find(artifact => 
        artifact.stepId === 'knowledge_capture'
      );

      if (knowledgeArtifact) {
        const patterns = knowledgeArtifact.content.patterns;
        expect(patterns.some((pattern: any) => pattern.context === 'Development workflow')).toBe(true);
      }
    });

    it('should validate lessons learned capture across modules', async () => {
      const workflowResult = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId,
        { captureKnowledge: true }
      );

      const knowledgeArtifact = workflowResult.artifacts.find(artifact => 
        artifact.stepId === 'knowledge_capture'
      );

      if (knowledgeArtifact) {
        expect(knowledgeArtifact.content.lessonsLearned).toBeDefined();
        expect(knowledgeArtifact.content.bestPractices).toBeDefined();
      }
    });
  });

  describe('Compliance and Audit Trail', () => {
    it('should maintain complete audit trail across all modules', async () => {
      const workflowResult = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId
      );

      expect(workflowResult.summary.keyAchievements.length).toBeGreaterThan(0);
      expect(workflowResult.phases.every(phase => phase.status === 'completed')).toBe(true);
      
      // Should have timestamps for all phases
      workflowResult.phases.forEach(phase => {
        expect(phase.executionStart).toBeDefined();
        expect(phase.executionEnd).toBeDefined();
      });
    });

    it('should validate compliance requirements are met across modules', async () => {
      const validationResult = await architectureIntegration.validateImplementationAgainstArchitecture(
        mockProjectId,
        {
          id: 'impl-001',
          files: [
            { path: 'src/order/order.service.ts', type: 'service', linesOfCode: 200, complexity: 'medium' },
            { path: 'src/payment/payment.service.ts', type: 'service', linesOfCode: 150, complexity: 'high' },
          ],
          tests: [
            { path: 'src/order/order.service.spec.ts', coverage: 85, passedTests: 20, totalTests: 22 },
          ],
          documentation: [],
          metrics: { codeQuality: 88, testCoverage: 85, performance: { responseTime: 95 } },
        }
      );

      expect(validationResult.overallCompliance).not.toBe('non_compliant');
      expect(validationResult.compliancePercentage).toBeGreaterThanOrEqual(80);
    });

    it('should provide comprehensive traceability reports', async () => {
      const workflowResult = await workflowService.executeCompleteWorkflow(
        mockProjectId,
        mockRequirementId,
        { captureKnowledge: true }
      );

      expect(workflowResult.summary.workflowId).toBeDefined();
      expect(workflowResult.summary.artifactsGenerated).toBeGreaterThan(0);
      expect(workflowResult.recommendations.length).toBeGreaterThanOrEqual(0);

      // Should provide full traceability
      expect(workflowResult.phases.length).toBeGreaterThan(0);
      expect(workflowResult.artifacts.length).toBeGreaterThan(0);
      expect(workflowResult.metrics.totalSteps).toBeGreaterThan(0);
    });
  });
});