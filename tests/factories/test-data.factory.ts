import { v4 as uuidv4 } from 'uuid';
import { 
  Requirement, 
  RequirementType, 
  RequirementStatus, 
  RequirementPriority 
} from '../../src/modules/requirements/types/requirement.types';
import { 
  ArchitectureDecision, 
  ArchitecturePattern, 
  TechnologyStack,
  ArchitectureDecisionStatus,
  ArchitecturePatternType,
  TechnologyMaturity,
  LearningCurve
} from '../../src/modules/architecture/types/architecture.types';
import {
  RequirementArchitectureMapping,
  RequirementMappingType,
  AlignmentType,
  ValidationStatus
} from '../../src/types/integration.types';

/**
 * Test data factory for creating consistent test data across integration tests
 */
export class TestDataFactory {
  private static idCounter = 0;

  /**
   * Generate unique test ID
   */
  static generateId(prefix: string = 'test'): string {
    return `${prefix}-${Date.now()}-${++this.idCounter}`;
  }

  /**
   * Create test project
   */
  static createProject(overrides: Partial<any> = {}): any {
    return {
      id: this.generateId('project'),
      name: 'Test Integration Project',
      description: 'Project for integration testing',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Create test stakeholder
   */
  static createStakeholder(overrides: Partial<any> = {}): any {
    return {
      id: this.generateId('stakeholder'),
      name: 'Test Stakeholder',
      email: 'test@example.com',
      role: 'BUSINESS_ANALYST',
      department: 'Engineering',
      createdAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Create test requirement
   */
  static createRequirement(overrides: Partial<Requirement> = {}): Partial<Requirement> {
    return {
      id: this.generateId('requirement'),
      title: 'Test Requirement',
      description: 'Test requirement for integration testing',
      type: RequirementType.FUNCTIONAL,
      status: RequirementStatus.APPROVED,
      priority: RequirementPriority.MEDIUM,
      projectId: this.generateId('project'),
      stakeholderId: this.generateId('stakeholder'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completenessScore: 0.8,
      qualityScore: 0.85,
      ...overrides
    };
  }

  /**
   * Create performance requirement
   */
  static createPerformanceRequirement(overrides: Partial<Requirement> = {}): Partial<Requirement> {
    return this.createRequirement({
      title: 'Performance Requirement',
      description: 'System must handle 10,000 concurrent users with sub-200ms response time',
      type: RequirementType.NON_FUNCTIONAL,
      priority: RequirementPriority.HIGH,
      ...overrides
    });
  }

  /**
   * Create security requirement
   */
  static createSecurityRequirement(overrides: Partial<Requirement> = {}): Partial<Requirement> {
    return this.createRequirement({
      title: 'Security Requirement',
      description: 'System must implement OAuth 2.0 authentication and encrypt all data at rest',
      type: RequirementType.NON_FUNCTIONAL,
      priority: RequirementPriority.CRITICAL,
      ...overrides
    });
  }

  /**
   * Create architecture decision
   */
  static createArchitectureDecision(overrides: Partial<ArchitectureDecision> = {}): Partial<ArchitectureDecision> {
    return {
      id: this.generateId('decision'),
      title: 'Test Architecture Decision',
      description: 'Test decision for integration testing',
      rationale: 'Testing cross-module integration requires this decision',
      status: ArchitectureDecisionStatus.APPROVED,
      requirementIds: [],
      alternatives: [
        {
          name: 'Alternative 1',
          description: 'First alternative approach',
          pros: ['Pro 1', 'Pro 2'],
          cons: ['Con 1', 'Con 2'],
          rejected: true,
          rejectionReason: 'Does not meet performance requirements'
        }
      ],
      consequences: ['Improved performance', 'Increased complexity'],
      tradeOffs: [
        {
          aspect: 'Performance vs Complexity',
          benefit: 'Better performance',
          cost: 'Higher complexity',
          riskLevel: 'MEDIUM'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Create microservices architecture decision
   */
  static createMicroservicesDecision(overrides: Partial<ArchitectureDecision> = {}): Partial<ArchitectureDecision> {
    return this.createArchitectureDecision({
      title: 'Adopt Microservices Architecture',
      description: 'Decision to implement microservices architecture for scalability',
      rationale: 'Microservices provide better scalability and maintainability',
      consequences: [
        'Improved scalability',
        'Better fault isolation',
        'Increased deployment complexity',
        'Network latency considerations'
      ],
      ...overrides
    });
  }

  /**
   * Create architecture pattern
   */
  static createArchitecturePattern(overrides: Partial<ArchitecturePattern> = {}): Partial<ArchitecturePattern> {
    return {
      id: this.generateId('pattern'),
      name: 'Test Pattern',
      type: ArchitecturePatternType.MICROSERVICES,
      description: 'Test pattern for integration testing',
      applicabilityConditions: ['High scalability requirements', 'Independent deployments needed'],
      components: [
        {
          name: 'API Gateway',
          responsibility: 'Request routing and authentication',
          interactions: ['Routes requests to services', 'Handles authentication'],
          constraints: ['Must handle 10k requests/sec', 'Sub-100ms latency']
        },
        {
          name: 'Service Registry',
          responsibility: 'Service discovery and health checking',
          interactions: ['Registers services', 'Health monitoring'],
          constraints: ['High availability required', 'Consistent service information']
        }
      ],
      qualityAttributes: [
        {
          name: 'Scalability',
          impact: 'POSITIVE',
          description: 'Enables horizontal scaling',
          metric: 'Requests per second'
        },
        {
          name: 'Complexity',
          impact: 'NEGATIVE',
          description: 'Increases operational complexity',
          metric: 'Number of deployment units'
        }
      ],
      knownUses: ['Netflix', 'Amazon', 'Uber'],
      relatedPatterns: ['Event Sourcing', 'CQRS'],
      createdAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Create technology stack
   */
  static createTechnologyStack(overrides: Partial<TechnologyStack> = {}): Partial<TechnologyStack> {
    return {
      id: this.generateId('techstack'),
      name: 'Test Technology Stack',
      description: 'Test technology stack for integration testing',
      layers: [
        {
          name: 'Presentation Layer',
          technologies: [
            {
              name: 'React',
              version: '18.2.0',
              license: 'MIT',
              vendor: 'Meta',
              maturity: TechnologyMaturity.MATURE,
              communitySupport: 0.95,
              learningCurve: LearningCurve.MEDIUM,
              pros: ['Large ecosystem', 'Strong community'],
              cons: ['Frequent updates', 'Learning curve'],
              alternativeTo: ['Vue.js', 'Angular']
            }
          ],
          purpose: 'User interface and presentation logic',
          alternatives: ['Vue.js stack', 'Angular stack']
        },
        {
          name: 'Application Layer',
          technologies: [
            {
              name: 'Node.js',
              version: '18.0.0',
              license: 'MIT',
              vendor: 'OpenJS Foundation',
              maturity: TechnologyMaturity.MATURE,
              communitySupport: 0.9,
              learningCurve: LearningCurve.MEDIUM,
              pros: ['JavaScript everywhere', 'Large package ecosystem'],
              cons: ['Single-threaded', 'Memory intensive']
            }
          ],
          purpose: 'Application runtime and business logic',
          alternatives: ['Java Spring', 'Python Django']
        }
      ],
      createdAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Create requirement-architecture mapping
   */
  static createMapping(overrides: Partial<RequirementArchitectureMapping> = {}): RequirementArchitectureMapping {
    return {
      id: this.generateId('mapping'),
      requirementId: this.generateId('requirement'),
      architectureDecisionId: this.generateId('decision'),
      mappingType: RequirementMappingType.DIRECT,
      confidence: 0.8,
      rationale: 'Test mapping for integration testing',
      createdAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Create high-confidence mapping
   */
  static createHighConfidenceMapping(overrides: Partial<RequirementArchitectureMapping> = {}): RequirementArchitectureMapping {
    return this.createMapping({
      confidence: 0.95,
      rationale: 'Strong direct relationship between requirement and architecture decision',
      mappingType: RequirementMappingType.DIRECT,
      ...overrides
    });
  }

  /**
   * Create derived mapping
   */
  static createDerivedMapping(overrides: Partial<RequirementArchitectureMapping> = {}): RequirementArchitectureMapping {
    return this.createMapping({
      confidence: 0.7,
      rationale: 'Architecture decision derived from requirement analysis',
      mappingType: RequirementMappingType.DERIVED,
      ...overrides
    });
  }

  /**
   * Create test user
   */
  static createUser(overrides: Partial<any> = {}): any {
    return {
      id: this.generateId('user'),
      username: 'testuser',
      email: 'test@example.com',
      role: 'ARCHITECT',
      permissions: ['READ', 'WRITE', 'DELETE'],
      createdAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Create complete test scenario data
   */
  static createIntegrationScenario(): {
    project: any;
    stakeholder: any;
    requirements: Partial<Requirement>[];
    architectureDecisions: Partial<ArchitectureDecision>[];
    patterns: Partial<ArchitecturePattern>[];
    technologyStacks: Partial<TechnologyStack>[];
    mappings: RequirementArchitectureMapping[];
  } {
    const project = this.createProject();
    const stakeholder = this.createStakeholder();
    
    const performanceReq = this.createPerformanceRequirement({ 
      projectId: project.id, 
      stakeholderId: stakeholder.id 
    });
    const securityReq = this.createSecurityRequirement({ 
      projectId: project.id, 
      stakeholderId: stakeholder.id 
    });
    const functionalReq = this.createRequirement({ 
      projectId: project.id, 
      stakeholderId: stakeholder.id,
      title: 'User Management',
      description: 'System must allow user registration, login, and profile management'
    });

    const microservicesDecision = this.createMicroservicesDecision();
    const securityDecision = this.createArchitectureDecision({
      title: 'Implement OAuth 2.0',
      description: 'Decision to implement OAuth 2.0 for authentication',
      rationale: 'OAuth 2.0 provides secure, standard authentication'
    });

    const microservicesPattern = this.createArchitecturePattern();
    const technologyStack = this.createTechnologyStack();

    const mappings = [
      this.createHighConfidenceMapping({
        requirementId: performanceReq.id!,
        architectureDecisionId: microservicesDecision.id!,
        rationale: 'Microservices architecture directly addresses scalability requirements'
      }),
      this.createHighConfidenceMapping({
        requirementId: securityReq.id!,
        architectureDecisionId: securityDecision.id!,
        rationale: 'OAuth 2.0 decision directly fulfills security requirements'
      }),
      this.createDerivedMapping({
        requirementId: functionalReq.id!,
        architecturePatternId: microservicesPattern.id!,
        rationale: 'User management functionality benefits from microservices pattern'
      })
    ];

    return {
      project,
      stakeholder,
      requirements: [performanceReq, securityReq, functionalReq],
      architectureDecisions: [microservicesDecision, securityDecision],
      patterns: [microservicesPattern],
      technologyStacks: [technologyStack],
      mappings
    };
  }

  /**
   * Create batch test data for performance testing
   */
  static createBatchTestData(count: number): {
    requirements: Partial<Requirement>[];
    decisions: Partial<ArchitectureDecision>[];
    mappings: RequirementArchitectureMapping[];
  } {
    const requirements: Partial<Requirement>[] = [];
    const decisions: Partial<ArchitectureDecision>[] = [];
    const mappings: RequirementArchitectureMapping[] = [];

    const projectId = this.generateId('project');
    const stakeholderId = this.generateId('stakeholder');

    for (let i = 0; i < count; i++) {
      const requirement = this.createRequirement({
        projectId,
        stakeholderId,
        title: `Test Requirement ${i}`,
        description: `Test requirement number ${i} for batch processing`
      });

      const decision = this.createArchitectureDecision({
        title: `Test Decision ${i}`,
        description: `Test architecture decision number ${i}`
      });

      const mapping = this.createMapping({
        requirementId: requirement.id!,
        architectureDecisionId: decision.id!,
        confidence: 0.5 + (Math.random() * 0.5), // Random confidence between 0.5-1.0
        rationale: `Auto-generated mapping for performance test ${i}`
      });

      requirements.push(requirement);
      decisions.push(decision);
      mappings.push(mapping);
    }

    return { requirements, decisions, mappings };
  }
}