import { World, IWorldOptions, setWorldConstructor } from '@cucumber/cucumber';
import { Neo4jService } from '../../src/core/database/neo4j';
import { DevelopmentService } from '../../src/modules/development/services/development.service';
import { ArchitectureDecisionService } from '../../src/modules/architecture/services/decision.service';
import { RequirementsService } from '../../src/modules/requirements/services/requirements.service';
import { logger } from '../../src/core/logging/logger';

/**
 * Custom World class for Development Intelligence BDD tests
 * Provides shared context and services across test steps
 */

export interface TestUser {
  id: string;
  name: string;
  role: string;
  permissions: string[];
}

export interface TestData {
  [key: string]: any;
}

export interface TestResults {
  [key: string]: any;
}

export class DevelopmentIntelligenceWorld extends World {
  // Core services
  public neo4j: Neo4jService;
  public developmentService: DevelopmentService;
  public architectureService: ArchitectureDecisionService;
  public requirementsService: RequirementsService;
  
  // Test context
  public currentUser: TestUser | null = null;
  public testData: TestData = {};
  public results: TestResults = {};
  public cleanup: Array<() => Promise<void>> = [];
  
  // Test configuration
  public config: {
    timeout: number;
    apiBaseUrl: string;
    neo4jUri: string;
  };
  
  constructor(options: IWorldOptions) {
    super(options);
    
    // Initialize configuration from world parameters
    this.config = {
      timeout: options.parameters?.testTimeout || 30000,
      apiBaseUrl: options.parameters?.apiBaseUrl || 'http://localhost:3000',
      neo4jUri: options.parameters?.neo4jUri || 'bolt://localhost:7688'
    };
    
    // Initialize services
    this.initializeServices();
    
    logger.info('Development Intelligence World initialized');
  }
  
  private async initializeServices(): Promise<void> {
    try {
      // Initialize Neo4j service
      this.neo4j = new Neo4jService(this.config.neo4jUri);
      await this.neo4j.connect();
      
      // Initialize domain services
      this.developmentService = new DevelopmentService(this.neo4j);
      this.architectureService = new ArchitectureDecisionService(this.neo4j);
      this.requirementsService = new RequirementsService(this.neo4j);
      
      logger.info('All services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize services', error);
      throw error;
    }
  }
  
  // Authentication helpers
  public authenticateAs(role: string, name: string = 'Test User'): void {
    this.currentUser = {
      id: `test-user-${Date.now()}`,
      name: name,
      role: role.toLowerCase(),
      permissions: this.getPermissionsForRole(role)
    };
    
    logger.info(`Authenticated as ${role}: ${name}`);
  }
  
  private getPermissionsForRole(role: string): string[] {
    const rolePermissions: { [key: string]: string[] } = {
      'software developer': [
        'CODE_READ', 'CODE_WRITE', 'TEST_RUN', 'REQUIREMENT_READ'
      ],
      'qa engineer': [
        'TEST_READ', 'TEST_WRITE', 'QUALITY_ANALYZE', 'BUG_REPORT'
      ],
      'devops engineer': [
        'PIPELINE_READ', 'PIPELINE_WRITE', 'DEPLOY', 'MONITOR'
      ],
      'system architect': [
        'ARCH_READ', 'ARCH_WRITE', 'SYSTEM_DESIGN', 'PATTERN_MANAGE'
      ],
      'development team lead': [
        'TEAM_MANAGE', 'TASK_ASSIGN', 'WORKFLOW_MANAGE', 'REPORT_VIEW'
      ],
      'business analyst': [
        'REQUIREMENT_READ', 'REQUIREMENT_WRITE', 'STAKEHOLDER_MANAGE'
      ],
      'performance engineer': [
        'PERFORMANCE_ANALYZE', 'OPTIMIZE', 'BENCHMARK', 'MONITOR'
      ]
    };
    
    return rolePermissions[role.toLowerCase()] || [];
  }
  
  // Test data management
  public setTestData(key: string, value: any): void {
    this.testData[key] = value;
    logger.debug(`Test data set: ${key}`);
  }
  
  public getTestData(key: string): any {
    return this.testData[key];
  }
  
  public setResult(key: string, value: any): void {
    this.results[key] = value;
    logger.debug(`Result set: ${key}`);
  }
  
  public getResult(key: string): any {
    return this.results[key];
  }
  
  // Cleanup management
  public addCleanup(cleanupFn: () => Promise<void>): void {
    this.cleanup.push(cleanupFn);
  }
  
  public async executeCleanup(): Promise<void> {
    for (const cleanupFn of this.cleanup) {
      try {
        await cleanupFn();
      } catch (error) {
        logger.error('Cleanup function failed', error);
      }
    }
    this.cleanup = [];
  }
  
  // Utility methods
  public generateUniqueId(prefix: string = 'test'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  public async waitFor(condition: () => boolean | Promise<boolean>, timeout: number = 5000): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await this.sleep(100);
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }
  
  public sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Test scenario helpers
  public async createTestProject(name: string, options: any = {}): Promise<any> {
    const projectId = this.generateUniqueId('project');
    const project = {
      id: projectId,
      name: name,
      description: options.description || `Test project: ${name}`,
      status: options.status || 'ACTIVE',
      createdAt: new Date().toISOString(),
      testScenario: this.getCurrentScenarioName(),
      ...options
    };
    
    const query = `
      CREATE (p:Project $project)
      RETURN p
    `;
    
    await this.neo4j.executeQuery(query, { project });
    
    this.addCleanup(async () => {
      await this.neo4j.executeQuery(
        'MATCH (p:Project {id: $projectId}) DETACH DELETE p',
        { projectId }
      );
    });
    
    this.setTestData('currentProject', project);
    return project;
  }
  
  public async createTestRequirement(title: string, options: any = {}): Promise<any> {
    const requirementId = this.generateUniqueId('requirement');
    const requirement = {
      id: requirementId,
      title: title,
      description: options.description || `Test requirement: ${title}`,
      type: options.type || 'FUNCTIONAL',
      priority: options.priority || 'MEDIUM',
      status: options.status || 'DRAFT',
      projectId: options.projectId || this.getTestData('currentProject')?.id,
      createdAt: new Date().toISOString(),
      testScenario: this.getCurrentScenarioName(),
      ...options
    };
    
    const savedRequirement = await this.requirementsService.createRequirement(requirement);
    
    this.addCleanup(async () => {
      await this.neo4j.executeQuery(
        'MATCH (r:Requirement {id: $requirementId}) DETACH DELETE r',
        { requirementId }
      );
    });
    
    this.setTestData('currentRequirement', savedRequirement);
    return savedRequirement;
  }
  
  public async createTestArchitectureDecision(title: string, options: any = {}): Promise<any> {
    const decisionId = this.generateUniqueId('architecture');
    const decision = {
      title: title,
      description: options.description || `Test architecture decision: ${title}`,
      rationale: options.rationale || 'Test rationale',
      projectId: options.projectId || this.getTestData('currentProject')?.id,
      requirementIds: options.requirementIds || [this.getTestData('currentRequirement')?.id],
      ...options
    };
    
    const savedDecision = await this.architectureService.createDecision(decision);
    
    this.addCleanup(async () => {
      await this.neo4j.executeQuery(
        'MATCH (a:ArchitectureDecision {id: $decisionId}) DETACH DELETE a',
        { decisionId: savedDecision.id }
      );
    });
    
    this.setTestData('currentArchitectureDecision', savedDecision);
    return savedDecision;
  }
  
  private getCurrentScenarioName(): string {
    // This would be set by the test runner - for now return a default
    return this.testData.scenarioName || 'unknown-scenario';
  }
  
  // Assertions helpers
  public expectToBeDefineAndNotNull(value: any, message?: string): void {
    if (value === undefined || value === null) {
      throw new Error(message || `Expected value to be defined and not null, got: ${value}`);
    }
  }
  
  public expectToContain(container: any, item: any, message?: string): void {
    if (!container || !container.includes || !container.includes(item)) {
      throw new Error(message || `Expected ${JSON.stringify(container)} to contain ${JSON.stringify(item)}`);
    }
  }
  
  public expectToEqual(actual: any, expected: any, message?: string): void {
    if (actual !== expected) {
      throw new Error(message || `Expected ${actual} to equal ${expected}`);
    }
  }
  
  public expectToBeGreaterThan(actual: number, expected: number, message?: string): void {
    if (actual <= expected) {
      throw new Error(message || `Expected ${actual} to be greater than ${expected}`);
    }
  }
}

setWorldConstructor(DevelopmentIntelligenceWorld);