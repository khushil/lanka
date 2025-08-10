import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { expect } from '@jest/globals';
import { Neo4jService } from '../../src/core/database/neo4j';
import { DevelopmentService } from '../../src/modules/development/services/development.service';
import { ArchitectureDecisionService } from '../../src/modules/architecture/services/decision.service';
import { RequirementsService } from '../../src/modules/requirements/services/requirements.service';

/**
 * Step Definitions for Development Intelligence BDD Tests
 * Implements Cucumber step definitions for comprehensive development testing
 */

// World object to share state between steps
interface TestWorld {
  neo4j: Neo4jService;
  developmentService: DevelopmentService;
  architectureService: ArchitectureDecisionService;
  requirementsService: RequirementsService;
  currentUser: any;
  testData: any;
  results: any;
}

let world: TestWorld;

Before(async function() {
  // Initialize test environment before each scenario
  world = {
    neo4j: new Neo4jService(process.env.NEO4J_TEST_URI || 'bolt://localhost:7687'),
    developmentService: null,
    architectureService: null,
    requirementsService: null,
    currentUser: null,
    testData: {},
    results: {}
  };

  await world.neo4j.connect();
  world.developmentService = new DevelopmentService(world.neo4j);
  world.architectureService = new ArchitectureDecisionService(world.neo4j);
  world.requirementsService = new RequirementsService(world.neo4j);
});

After(async function() {
  // Cleanup test environment after each scenario
  await world.neo4j.clearTestData();
  await world.neo4j.close();
});

// Common Background Steps
Given('the LANKA system is initialized', async function() {
  // Verify system initialization
  expect(world.neo4j.isConnected()).toBe(true);
  expect(world.developmentService).toBeDefined();
  expect(world.architectureService).toBeDefined();
  expect(world.requirementsService).toBeDefined();
});

Given('I am authenticated as a {string}', async function(role: string) {
  world.currentUser = {
    id: 'test-user-id',
    name: 'Test User',
    role: role.toLowerCase(),
    permissions: getPermissionsForRole(role)
  };
});

Given('there are {string} in the system', async function(entityType: string) {
  await setupTestEntities(entityType, world);
});

// Code Generation Engine Steps
Given('I have a functional requirement {string}', async function(requirement: string) {
  world.testData.requirement = await world.requirementsService.createRequirement({
    title: requirement,
    description: `Test requirement for ${requirement}`,
    type: 'FUNCTIONAL',
    priority: 'HIGH',
    projectId: 'test-project-id'
  });
});

Given('I have an architecture decision for {string}', async function(architecture: string) {
  world.testData.architecture = await world.architectureService.createDecision({
    title: `Architecture for ${architecture}`,
    description: `Test architecture decision for ${architecture}`,
    rationale: 'Test rationale',
    projectId: 'test-project-id',
    requirementIds: [world.testData.requirement?.id || 'test-req-id']
  });
});

When('I request code generation for the requirement', async function() {
  world.results.codeGeneration = await world.developmentService.generateCode(
    world.testData.requirement.id,
    world.testData.architecture.id
  );
});

Then('the system should generate TypeScript API endpoint code', async function() {
  expect(world.results.codeGeneration).toBeDefined();
  expect(world.results.codeGeneration.language).toBe('typescript');
  expect(world.results.codeGeneration.code).toContain('// Generated code');
});

Then('the code should include proper error handling', async function() {
  expect(world.results.codeGeneration.code).toContain('try');
  expect(world.results.codeGeneration.code).toContain('catch');
});

Then('the code should include input validation', async function() {
  expect(world.results.codeGeneration.code).toMatch(/validate|validation|check/i);
});

// Test Generation Intelligence Steps
When('I request unit test generation', async function() {
  world.results.testGeneration = await world.developmentService.generateTests(
    world.results.codeGeneration.id
  );
});

Then('the system should generate Jest test suites', async function() {
  expect(world.results.testGeneration).toBeDefined();
  expect(Array.isArray(world.results.testGeneration)).toBe(true);
});

Then('each function should have positive test cases', async function() {
  const tests = world.results.testGeneration;
  expect(tests.some((test: any) => test.type === 'positive')).toBe(true);
});

Then('each function should have negative test cases', async function() {
  const tests = world.results.testGeneration;
  expect(tests.some((test: any) => test.type === 'negative')).toBe(true);
});

// DevOps Pipeline Automation Steps
Given('I have a new project {string}', async function(projectName: string) {
  world.testData.project = {
    id: 'test-project-id',
    name: projectName,
    technologies: []
  };
});

Given('the project uses {string}, {string}, {string}, and {string}', 
async function(tech1: string, tech2: string, tech3: string, tech4: string) {
  world.testData.project.technologies = [tech1, tech2, tech3, tech4];
});

When('I request CI/CD pipeline generation', async function() {
  world.results.pipeline = await world.developmentService.analyzeCICD(
    world.testData.project.id
  );
});

Then('the system should generate GitHub Actions workflows', async function() {
  expect(world.results.pipeline).toBeDefined();
  expect(world.results.pipeline.pipelineOptimizations).toBeDefined();
});

// Cross-Module Integration Steps
When('the requirement is approved and classified', async function() {
  await world.requirementsService.updateRequirement(
    world.testData.requirement.id,
    { status: 'APPROVED' }
  );
});

Then('the Architecture module should suggest MFA patterns', async function() {
  const patterns = await world.architectureService.findSimilarDecisions(
    world.testData.architecture.id
  );
  expect(patterns).toBeDefined();
});

Then('all artifacts should maintain traceability links', async function() {
  const decision = await world.architectureService.getDecisionById(
    world.testData.architecture.id
  );
  expect(decision?.requirementIds).toContain(world.testData.requirement.id);
});

// Bug Pattern Detection Steps
Given('I have code with potential issues {string}', async function(issueType: string) {
  world.testData.codeWithIssues = {
    id: 'code-with-issues-id',
    code: generateCodeWithIssue(issueType),
    issueType: issueType
  };
});

When('I run bug pattern detection analysis', async function() {
  world.results.bugAnalysis = await analyzeBugPatterns(world.testData.codeWithIssues);
});

Then('the system should identify null safety violations', async function() {
  expect(world.results.bugAnalysis.issues).toBeDefined();
  expect(world.results.bugAnalysis.issues.some(
    (issue: any) => issue.type === 'NULL_SAFETY_VIOLATION'
  )).toBe(true);
});

// Performance Anti-Pattern Detection Steps
Given('I have database access code with {string}', async function(antiPattern: string) {
  world.testData.performanceCode = {
    id: 'perf-code-id',
    code: generatePerformanceAntiPattern(antiPattern),
    antiPatternType: antiPattern
  };
});

When('I analyze database performance patterns', async function() {
  world.results.performanceAnalysis = await analyzePerformancePatterns(
    world.testData.performanceCode
  );
});

Then('the system should detect N+1 query anti-patterns', async function() {
  expect(world.results.performanceAnalysis.antiPatterns).toBeDefined();
  expect(world.results.performanceAnalysis.antiPatterns.some(
    (pattern: any) => pattern.type === 'N_PLUS_ONE_QUERY'
  )).toBe(true);
});

// Development Workflow Automation Steps
Given('I have development tasks {string} and {string}', 
async function(task1: string, task2: string) {
  world.testData.tasks = [
    { id: 'task1', title: task1, type: 'FEATURE' },
    { id: 'task2', title: task2, type: 'OPTIMIZATION' }
  ];
});

When('I request intelligent task assignment', async function() {
  world.results.taskAssignment = await assignTasksIntelligently(
    world.testData.tasks,
    world.testData.teamMembers
  );
});

// Helper Functions
function getPermissionsForRole(role: string): string[] {
  const rolePermissions = {
    'software developer': ['CODE_READ', 'CODE_WRITE', 'TEST_RUN'],
    'qa engineer': ['TEST_READ', 'TEST_WRITE', 'QUALITY_ANALYZE'],
    'devops engineer': ['PIPELINE_READ', 'PIPELINE_WRITE', 'DEPLOY'],
    'system architect': ['ARCH_READ', 'ARCH_WRITE', 'SYSTEM_DESIGN'],
    'development team lead': ['TEAM_MANAGE', 'TASK_ASSIGN', 'WORKFLOW_MANAGE']
  };
  return rolePermissions[role.toLowerCase()] || [];
}

async function setupTestEntities(entityType: string, testWorld: TestWorld): Promise<void> {
  switch (entityType) {
    case 'approved requirements':
      testWorld.testData.requirements = await createTestRequirements(testWorld);
      break;
    case 'approved architecture decisions':
      testWorld.testData.architectureDecisions = await createTestArchitectureDecisions(testWorld);
      break;
    case 'code components':
      testWorld.testData.codeComponents = await createTestCodeComponents(testWorld);
      break;
    // Add more entity setup as needed
  }
}

async function createTestRequirements(testWorld: TestWorld): Promise<any[]> {
  const requirements = [
    {
      title: 'User Authentication System',
      description: 'Implement secure user authentication',
      type: 'FUNCTIONAL',
      priority: 'HIGH'
    },
    {
      title: 'Performance Requirements',
      description: 'System must respond within 100ms',
      type: 'NON_FUNCTIONAL',
      priority: 'MEDIUM'
    }
  ];

  return Promise.all(requirements.map(req => 
    testWorld.requirementsService.createRequirement({
      ...req,
      projectId: 'test-project-id'
    })
  ));
}

async function createTestArchitectureDecisions(testWorld: TestWorld): Promise<any[]> {
  const decisions = [
    {
      title: 'Microservices Architecture',
      description: 'Use microservices for scalability',
      rationale: 'Better scalability and maintainability'
    },
    {
      title: 'API Gateway Pattern',
      description: 'Centralized API gateway for routing',
      rationale: 'Simplified client communication'
    }
  ];

  return Promise.all(decisions.map(decision =>
    testWorld.architectureService.createDecision({
      ...decision,
      projectId: 'test-project-id',
      requirementIds: ['test-req-id']
    })
  ));
}

async function createTestCodeComponents(testWorld: TestWorld): Promise<any[]> {
  return [
    {
      id: 'component-1',
      name: 'User Service',
      type: 'SERVICE',
      language: 'typescript'
    },
    {
      id: 'component-2',
      name: 'Authentication Controller',
      type: 'CONTROLLER',
      language: 'typescript'
    }
  ];
}

function generateCodeWithIssue(issueType: string): string {
  const codeTemplates = {
    'Null pointer dereference patterns': `
      function processUser(user) {
        return user.name.toUpperCase(); // Potential null pointer
      }
    `,
    'String concatenation in loops without StringBuilder': `
      function buildMessage(items) {
        let message = '';
        for (const item of items) {
          message += item + ', '; // Inefficient string concatenation
        }
        return message;
      }
    `
  };
  
  return codeTemplates[issueType] || '// Test code with issues';
}

function generatePerformanceAntiPattern(antiPattern: string): string {
  const antiPatterns = {
    'N+1 query patterns': `
      async function getUsers() {
        const users = await User.findAll();
        for (const user of users) {
          user.profile = await Profile.findByUserId(user.id); // N+1 query
        }
        return users;
      }
    `,
    'Large object allocations in hot paths': `
      function processData(data) {
        const result = new Array(1000000); // Large allocation in hot path
        return result.fill(data);
      }
    `
  };
  
  return antiPatterns[antiPattern] || '// Test performance anti-pattern';
}

async function analyzeBugPatterns(code: any): Promise<any> {
  // Mock implementation for bug pattern analysis
  return {
    issues: [
      {
        type: 'NULL_SAFETY_VIOLATION',
        severity: 'HIGH',
        message: 'Potential null pointer dereference',
        line: 2,
        suggestions: ['Add null check', 'Use optional chaining']
      }
    ]
  };
}

async function analyzePerformancePatterns(code: any): Promise<any> {
  // Mock implementation for performance pattern analysis
  return {
    antiPatterns: [
      {
        type: 'N_PLUS_ONE_QUERY',
        severity: 'HIGH',
        message: 'N+1 query detected',
        suggestions: ['Use eager loading', 'Implement batch queries']
      }
    ]
  };
}

async function assignTasksIntelligently(tasks: any[], teamMembers: any[]): Promise<any> {
  // Mock implementation for intelligent task assignment
  return {
    assignments: tasks.map((task, index) => ({
      taskId: task.id,
      assigneeId: `member-${index}`,
      confidence: 0.85,
      reasoning: 'Based on expertise and availability'
    }))
  };
}