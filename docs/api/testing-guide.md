# LANKA API Testing Guide

## Overview

This guide provides comprehensive testing strategies for the LANKA Architecture Intelligence API, covering unit tests, integration tests, end-to-end testing, and performance testing scenarios.

## Table of Contents

- [Testing Strategy](#testing-strategy)
- [Test Environment Setup](#test-environment-setup)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [End-to-End Testing](#end-to-end-testing)
- [Performance Testing](#performance-testing)
- [Security Testing](#security-testing)
- [Test Automation](#test-automation)
- [Continuous Testing](#continuous-testing)

---

## Testing Strategy

### Testing Pyramid

```
    /\
   /  \     E2E Tests (Few, High Value)
  /____\    
 /      \   Integration Tests (Some, Medium Value)
/________\  Unit Tests (Many, Fast, Isolated)
```

### Test Categories

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test component interactions
3. **Contract Tests**: Verify API contracts and schemas  
4. **End-to-End Tests**: Test complete user workflows
5. **Performance Tests**: Validate performance characteristics
6. **Security Tests**: Verify security controls
7. **Chaos Tests**: Test resilience under failure conditions

---

## Test Environment Setup

### Environment Configuration

```javascript
// test-config.js
const testConfig = {
  environments: {
    unit: {
      apiUrl: 'http://localhost:3000',
      database: 'memory', // In-memory database for unit tests
      auth: 'mock',
      services: 'mock'
    },
    integration: {
      apiUrl: 'http://localhost:4000',
      database: 'test-db',
      auth: 'test-auth-server',
      services: 'test-services'
    },
    e2e: {
      apiUrl: 'https://staging-api.lanka.ai/v2',
      database: 'staging-db',
      auth: 'staging-auth',
      services: 'staging-services'
    },
    performance: {
      apiUrl: 'https://perf-api.lanka.ai/v2',
      database: 'performance-db',
      loadProfile: 'high-throughput'
    }
  },
  
  testData: {
    users: {
      admin: { email: 'admin@test.com', password: 'test-admin-pass' },
      developer: { email: 'dev@test.com', password: 'test-dev-pass' },
      viewer: { email: 'viewer@test.com', password: 'test-viewer-pass' }
    },
    projects: {
      sample: { id: 'proj-test-001', name: 'Test Project' }
    }
  },
  
  timeouts: {
    unit: 5000,
    integration: 10000,
    e2e: 30000,
    performance: 60000
  }
};

module.exports = testConfig;
```

### Test Database Setup

```javascript
// test-db-setup.js
const { Neo4jService } = require('../src/core/database/neo4j');

class TestDatabaseSetup {
  constructor() {
    this.neo4j = new Neo4jService({
      uri: process.env.NEO4J_TEST_URI || 'bolt://localhost:7687',
      username: process.env.NEO4J_TEST_USERNAME || 'neo4j',
      password: process.env.NEO4J_TEST_PASSWORD || 'test-password'
    });
  }

  async setup() {
    await this.clearDatabase();
    await this.seedTestData();
  }

  async clearDatabase() {
    await this.neo4j.executeQuery('MATCH (n) DETACH DELETE n');
  }

  async seedTestData() {
    // Create test organizations
    await this.neo4j.executeQuery(`
      CREATE (org:Organization {
        id: 'org-test-001',
        name: 'Test Organization',
        plan: 'professional',
        createdAt: datetime()
      })
    `);

    // Create test users
    await this.neo4j.executeQuery(`
      MATCH (org:Organization {id: 'org-test-001'})
      CREATE (admin:User {
        id: 'user-admin-001',
        email: 'admin@test.com',
        name: 'Test Admin',
        roles: ['admin'],
        createdAt: datetime()
      })
      CREATE (dev:User {
        id: 'user-dev-001',
        email: 'dev@test.com',
        name: 'Test Developer',
        roles: ['developer'],
        createdAt: datetime()
      })
      CREATE (org)-[:HAS_MEMBER]->(admin)
      CREATE (org)-[:HAS_MEMBER]->(dev)
    `);

    // Create test projects
    await this.neo4j.executeQuery(`
      MATCH (org:Organization {id: 'org-test-001'})
      CREATE (proj:Project {
        id: 'proj-test-001',
        name: 'Test Project',
        description: 'Project for testing',
        createdAt: datetime()
      })
      CREATE (org)-[:OWNS]->(proj)
    `);
  }

  async teardown() {
    await this.clearDatabase();
    await this.neo4j.close();
  }
}

module.exports = TestDatabaseSetup;
```

---

## Unit Testing

### Test Structure

```javascript
// requirements.service.test.js
const { RequirementsService } = require('../src/modules/requirements/services/requirements.service');
const { Neo4jService } = require('../src/core/database/neo4j');
const TestDatabaseSetup = require('./utils/test-db-setup');

describe('RequirementsService', () => {
  let service;
  let dbSetup;
  let neo4j;

  beforeAll(async () => {
    dbSetup = new TestDatabaseSetup();
    await dbSetup.setup();
    neo4j = dbSetup.neo4j;
    service = new RequirementsService(neo4j);
  });

  afterAll(async () => {
    await dbSetup.teardown();
  });

  beforeEach(async () => {
    // Clean up between tests while keeping base data
    await neo4j.executeQuery('MATCH (r:Requirement) DETACH DELETE r');
  });

  describe('createRequirement', () => {
    it('should create a requirement with valid input', async () => {
      const input = {
        description: 'Test requirement description',
        title: 'Test Requirement',
        type: 'FUNCTIONAL',
        projectId: 'proj-test-001',
        stakeholderId: 'user-dev-001'
      };

      const result = await service.createRequirement(input);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^req-/);
      expect(result.title).toBe(input.title);
      expect(result.description).toBe(input.description);
      expect(result.type).toBe(input.type);
      expect(result.status).toBe('DRAFT');
      expect(result.completenessScore).toBeGreaterThan(0);
      expect(result.qualityScore).toBeGreaterThan(0);
    });

    it('should handle missing title by auto-generating', async () => {
      const input = {
        description: 'User authentication system with OAuth2 support',
        projectId: 'proj-test-001',
        stakeholderId: 'user-dev-001'
      };

      const result = await service.createRequirement(input);

      expect(result.title).toBeDefined();
      expect(result.title.length).toBeGreaterThan(0);
      expect(result.title).toMatch(/authentication|oauth/i);
    });

    it('should throw error for invalid project ID', async () => {
      const input = {
        description: 'Test requirement',
        projectId: 'invalid-project-id',
        stakeholderId: 'user-dev-001'
      };

      await expect(service.createRequirement(input))
        .rejects
        .toThrow('Project not found');
    });

    it('should calculate quality scores correctly', async () => {
      const highQualityInput = {
        description: 'The system shall provide secure user authentication using industry-standard protocols such as OAuth 2.0 and OpenID Connect. The authentication process must support multi-factor authentication options including SMS, email, and authenticator apps. The system must handle failed login attempts by implementing rate limiting and account lockout mechanisms.',
        title: 'Secure User Authentication System',
        type: 'FUNCTIONAL',
        projectId: 'proj-test-001',
        stakeholderId: 'user-dev-001'
      };

      const lowQualityInput = {
        description: 'Login stuff',
        title: 'Login',
        type: 'FUNCTIONAL',
        projectId: 'proj-test-001',
        stakeholderId: 'user-dev-001'
      };

      const highQualityResult = await service.createRequirement(highQualityInput);
      const lowQualityResult = await service.createRequirement(lowQualityInput);

      expect(highQualityResult.qualityScore).toBeGreaterThan(lowQualityResult.qualityScore);
      expect(highQualityResult.completenessScore).toBeGreaterThan(lowQualityResult.completenessScore);
    });
  });

  describe('findSimilarRequirements', () => {
    beforeEach(async () => {
      // Create test requirements for similarity testing
      await service.createRequirement({
        description: 'User authentication with password and email',
        title: 'User Authentication',
        type: 'FUNCTIONAL',
        projectId: 'proj-test-001',
        stakeholderId: 'user-dev-001'
      });

      await service.createRequirement({
        description: 'OAuth2 login integration with Google and Facebook',
        title: 'Social Media Login',
        type: 'FUNCTIONAL',
        projectId: 'proj-test-001',
        stakeholderId: 'user-dev-001'
      });

      await service.createRequirement({
        description: 'Payment processing with credit cards',
        title: 'Payment System',
        type: 'FUNCTIONAL',
        projectId: 'proj-test-001',
        stakeholderId: 'user-dev-001'
      });
    });

    it('should find similar requirements', async () => {
      const newRequirement = await service.createRequirement({
        description: 'Secure user login with multi-factor authentication',
        title: 'Secure Login System',
        type: 'FUNCTIONAL',
        projectId: 'proj-test-001',
        stakeholderId: 'user-dev-001'
      });

      const similar = await service.findSimilarRequirements(newRequirement.id);

      expect(similar.length).toBeGreaterThan(0);
      
      const authRequirement = similar.find(s => 
        s.other.properties.title.includes('Authentication')
      );
      expect(authRequirement).toBeDefined();
      expect(authRequirement.similarity).toBeGreaterThan(0.7);
    });

    it('should not return the same requirement as similar', async () => {
      const requirement = await service.createRequirement({
        description: 'Test requirement for similarity',
        title: 'Test Requirement',
        type: 'FUNCTIONAL',
        projectId: 'proj-test-001',
        stakeholderId: 'user-dev-001'
      });

      const similar = await service.findSimilarRequirements(requirement.id);

      const selfReference = similar.find(s => 
        s.other.properties.id === requirement.id
      );
      expect(selfReference).toBeUndefined();
    });
  });
});
```

### Mocking External Services

```javascript
// mocks/ai-service.mock.js
class MockAIService {
  constructor() {
    this.responses = new Map();
  }

  setMockResponse(input, response) {
    this.responses.set(JSON.stringify(input), response);
  }

  async analyzeRequirement(description) {
    const key = JSON.stringify({ description });
    const mockResponse = this.responses.get(key);
    
    if (mockResponse) {
      return mockResponse;
    }

    // Default mock response
    return {
      suggestedTitle: this.generateTitle(description),
      type: this.inferType(description),
      priority: this.inferPriority(description),
      embedding: Array(768).fill(0).map(() => Math.random() - 0.5),
      completenessScore: this.calculateCompleteness(description),
      qualityScore: this.calculateQuality(description)
    };
  }

  generateTitle(description) {
    const words = description.split(' ').slice(0, 5);
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  inferType(description) {
    if (description.includes('performance') || description.includes('scalability')) {
      return 'NON_FUNCTIONAL';
    }
    if (description.includes('business') || description.includes('revenue')) {
      return 'BUSINESS';
    }
    return 'FUNCTIONAL';
  }

  inferPriority(description) {
    if (description.includes('critical') || description.includes('security')) {
      return 'CRITICAL';
    }
    if (description.includes('important') || description.includes('must')) {
      return 'HIGH';
    }
    if (description.includes('nice to have') || description.includes('optional')) {
      return 'LOW';
    }
    return 'MEDIUM';
  }

  calculateCompleteness(description) {
    let score = 0.5;
    
    if (description.length > 50) score += 0.2;
    if (description.length > 100) score += 0.2;
    if (description.includes('shall') || description.includes('must')) score += 0.1;
    if (description.match(/\d/)) score += 0.1; // Contains numbers/metrics
    
    return Math.min(score, 1.0);
  }

  calculateQuality(description) {
    let score = 0.5;
    
    const sentences = description.split(/[.!?]+/).length - 1;
    if (sentences > 1) score += 0.2;
    
    const technicalTerms = ['system', 'user', 'authentication', 'security', 'performance'];
    const termCount = technicalTerms.filter(term => 
      description.toLowerCase().includes(term)
    ).length;
    score += Math.min(termCount * 0.1, 0.3);
    
    return Math.min(score, 1.0);
  }

  reset() {
    this.responses.clear();
  }
}

module.exports = MockAIService;
```

---

## Integration Testing

### API Integration Tests

```javascript
// integration/api.test.js
const request = require('supertest');
const app = require('../src/app');
const TestDatabaseSetup = require('./utils/test-db-setup');

describe('API Integration Tests', () => {
  let dbSetup;
  let authToken;
  let testUser;

  beforeAll(async () => {
    dbSetup = new TestDatabaseSetup();
    await dbSetup.setup();
    
    // Authenticate test user
    const loginResponse = await request(app)
      .post('/v2/auth/login')
      .send({
        email: 'dev@test.com',
        password: 'test-dev-pass'
      });

    authToken = loginResponse.body.accessToken;
    testUser = loginResponse.body.user;
  });

  afterAll(async () => {
    await dbSetup.teardown();
  });

  describe('Requirements API', () => {
    let testRequirement;

    beforeEach(async () => {
      // Create a test requirement for each test
      const response = await request(app)
        .post('/v2/requirements')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Integration Test Requirement',
          description: 'A requirement created for integration testing purposes',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          projectId: 'proj-test-001',
          stakeholderId: testUser.id
        });

      testRequirement = response.body.requirement;
    });

    it('should create requirement with full workflow', async () => {
      const requirementData = {
        title: 'Payment Processing System',
        description: 'The system must process credit card payments securely using PCI DSS compliant methods',
        type: 'FUNCTIONAL',
        priority: 'CRITICAL',
        projectId: 'proj-test-001',
        stakeholderId: testUser.id,
        acceptanceCriteria: [
          'Process Visa and Mastercard payments',
          'Comply with PCI DSS standards',
          'Handle payment failures gracefully'
        ]
      };

      // Create requirement
      const createResponse = await request(app)
        .post('/v2/requirements')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requirementData)
        .expect(201);

      expect(createResponse.body).toHaveProperty('requirement');
      expect(createResponse.body).toHaveProperty('analysis');
      expect(createResponse.body.requirement.id).toMatch(/^req-/);

      const requirementId = createResponse.body.requirement.id;

      // Get requirement
      const getResponse = await request(app)
        .get(`/v2/requirements/${requirementId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.requirement.title).toBe(requirementData.title);

      // Update requirement
      const updateData = {
        status: 'APPROVED',
        businessValue: 'Enable revenue generation through secure payment processing'
      };

      const updateResponse = await request(app)
        .put(`/v2/requirements/${requirementId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.requirement.status).toBe('APPROVED');
      expect(updateResponse.body.requirement.businessValue).toBe(updateData.businessValue);

      // Find similar requirements
      const similarResponse = await request(app)
        .get(`/v2/requirements/${requirementId}/similar`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(similarResponse.body)).toBe(true);

      // Analyze impact
      const impactResponse = await request(app)
        .get(`/v2/requirements/${requirementId}/impact`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(impactResponse.body).toHaveProperty('changeComplexity');
      expect(impactResponse.body).toHaveProperty('estimatedEffort');
    });

    it('should handle validation errors properly', async () => {
      const invalidData = {
        description: '', // Empty description should fail
        projectId: 'invalid-project-id'
      };

      const response = await request(app)
        .post('/v2/requirements')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toHaveProperty('field');
    });

    it('should handle authentication properly', async () => {
      // Request without token
      await request(app)
        .get('/v2/requirements')
        .expect(401);

      // Request with invalid token
      await request(app)
        .get('/v2/requirements')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Architecture Integration', () => {
    let testArchitectureDecision;

    beforeEach(async () => {
      const response = await request(app)
        .post('/v2/architecture/decisions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Architecture Decision',
          description: 'A test architecture decision',
          rationale: 'Testing purposes',
          requirementIds: ['proj-test-001']
        });

      testArchitectureDecision = response.body;
    });

    it('should create architecture decision and mapping', async () => {
      // Create architecture decision
      const decisionData = {
        title: 'Microservices Architecture',
        description: 'Implement microservices for better scalability',
        rationale: 'Microservices provide better isolation and scalability',
        requirementIds: [testRequirement.id],
        consequences: ['Increased complexity', 'Better scalability']
      };

      const decisionResponse = await request(app)
        .post('/v2/architecture/decisions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(decisionData)
        .expect(201);

      const decision = decisionResponse.body;

      // Create mapping between requirement and architecture decision
      const mappingData = {
        requirementId: testRequirement.id,
        architectureDecisionId: decision.id,
        mappingType: 'DIRECT',
        confidence: 0.9,
        rationale: 'Direct mapping for testing integration'
      };

      const mappingResponse = await request(app)
        .post('/v2/integration/mappings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mappingData)
        .expect(201);

      expect(mappingResponse.body).toHaveProperty('id');
      expect(mappingResponse.body.confidence).toBe(0.9);

      // Validate alignment
      const validationResponse = await request(app)
        .post('/v2/integration/validation')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          requirementId: testRequirement.id,
          architectureDecisionId: decision.id
        })
        .expect(200);

      expect(validationResponse.body).toHaveProperty('alignmentScore');
      expect(validationResponse.body).toHaveProperty('alignmentType');
    });

    it('should generate recommendations', async () => {
      const response = await request(app)
        .get(`/v2/integration/recommendations/${testRequirement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('confidence');
      expect(response.body).toHaveProperty('recommendedPatterns');
      expect(response.body).toHaveProperty('recommendedTechnologies');
      expect(Array.isArray(response.body.recommendedPatterns)).toBe(true);
    });
  });

  describe('GraphQL Integration', () => {
    it('should handle GraphQL queries', async () => {
      const query = `
        query GetRequirement($id: ID!) {
          requirement(id: $id) {
            id
            title
            description
            type
            status
            priority
            completenessScore
            qualityScore
          }
        }
      `;

      const response = await request(app)
        .post('/v2/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query,
          variables: { id: testRequirement.id }
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('requirement');
      expect(response.body.data.requirement.id).toBe(testRequirement.id);
    });

    it('should handle GraphQL mutations', async () => {
      const mutation = `
        mutation CreateRequirement($input: CreateRequirementInput!) {
          createRequirement(input: $input) {
            id
            title
            description
            type
            status
          }
        }
      `;

      const variables = {
        input: {
          title: 'GraphQL Test Requirement',
          description: 'Created via GraphQL mutation test',
          type: 'FUNCTIONAL',
          projectId: 'proj-test-001',
          stakeholderId: testUser.id
        }
      };

      const response = await request(app)
        .post('/v2/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: mutation, variables })
        .expect(200);

      expect(response.body.data).toHaveProperty('createRequirement');
      expect(response.body.data.createRequirement.title).toBe(variables.input.title);
    });
  });
});
```

---

## End-to-End Testing

### E2E Test Setup

```javascript
// e2e/setup.js
const { chromium } = require('playwright');

class E2ETestSetup {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async setup() {
    this.browser = await chromium.launch({
      headless: process.env.CI === 'true',
      slowMo: 100 // Slow down for better debugging
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: {
        dir: 'test-results/videos/',
        size: { width: 1280, height: 720 }
      }
    });

    this.page = await this.context.newPage();
  }

  async teardown() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async login(email = 'dev@test.com', password = 'test-dev-pass') {
    await this.page.goto('/login');
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForURL('/dashboard');
  }
}

module.exports = E2ETestSetup;
```

### E2E Test Examples

```javascript
// e2e/requirement-workflow.test.js
const { test, expect } = require('@playwright/test');

test.describe('Requirement Workflow E2E', () => {
  test('complete requirement creation and analysis workflow', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'dev@test.com');
    await page.fill('[data-testid="password"]', 'test-dev-pass');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to requirements
    await page.click('[data-testid="nav-requirements"]');
    await expect(page).toHaveURL('/requirements');
    
    // Create new requirement
    await page.click('[data-testid="create-requirement-button"]');
    await page.fill('[data-testid="requirement-title"]', 'E2E Test Requirement');
    await page.fill('[data-testid="requirement-description"]', 
      'This is a comprehensive requirement for end-to-end testing of the LANKA platform'
    );
    await page.selectOption('[data-testid="requirement-type"]', 'FUNCTIONAL');
    await page.selectOption('[data-testid="requirement-priority"]', 'HIGH');
    
    // Add acceptance criteria
    await page.click('[data-testid="add-acceptance-criteria"]');
    await page.fill('[data-testid="acceptance-criteria-0"]', 
      'System must handle the test scenario correctly'
    );
    
    await page.click('[data-testid="save-requirement"]');
    
    // Wait for requirement to be created and analyzed
    await page.waitForSelector('[data-testid="requirement-created-success"]');
    await page.waitForSelector('[data-testid="completeness-score"]');
    await page.waitForSelector('[data-testid="quality-score"]');
    
    // Verify scores are displayed
    const completenessScore = await page.textContent('[data-testid="completeness-score"]');
    const qualityScore = await page.textContent('[data-testid="quality-score"]');
    
    expect(parseFloat(completenessScore)).toBeGreaterThan(0);
    expect(parseFloat(qualityScore)).toBeGreaterThan(0);
    
    // Check for similar requirements suggestion
    await page.waitForSelector('[data-testid="similar-requirements"]');
    const similarCount = await page.locator('[data-testid="similar-requirement"]').count();
    
    // Generate architecture recommendations
    await page.click('[data-testid="generate-recommendations"]');
    await page.waitForSelector('[data-testid="architecture-recommendations"]');
    
    const recommendationCount = await page.locator('[data-testid="pattern-recommendation"]').count();
    expect(recommendationCount).toBeGreaterThan(0);
    
    // Accept a recommendation
    await page.click('[data-testid="accept-recommendation-0"]');
    await page.waitForSelector('[data-testid="mapping-created-success"]');
    
    // Navigate to architecture view
    await page.click('[data-testid="nav-architecture"]');
    await expect(page).toHaveURL('/architecture');
    
    // Verify mapping is visible in architecture view
    await page.waitForSelector('[data-testid="architecture-decisions"]');
    const mappingExists = await page.isVisible('[data-testid="requirement-mapping"]');
    expect(mappingExists).toBe(true);
  });

  test('requirement conflict detection workflow', async ({ page }) => {
    // Login and navigate to requirements
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'dev@test.com');
    await page.fill('[data-testid="password"]', 'test-dev-pass');
    await page.click('[data-testid="login-button"]');
    await page.goto('/requirements');
    
    // Create first requirement
    await page.click('[data-testid="create-requirement-button"]');
    await page.fill('[data-testid="requirement-title"]', 'High Performance Database');
    await page.fill('[data-testid="requirement-description"]', 
      'System must achieve sub-100ms response times for all database queries'
    );
    await page.selectOption('[data-testid="requirement-type"]', 'NON_FUNCTIONAL');
    await page.selectOption('[data-testid="requirement-priority"]', 'CRITICAL');
    await page.click('[data-testid="save-requirement"]');
    await page.waitForSelector('[data-testid="requirement-created-success"]');
    
    // Create conflicting requirement
    await page.click('[data-testid="create-requirement-button"]');
    await page.fill('[data-testid="requirement-title"]', 'Comprehensive Audit Logging');
    await page.fill('[data-testid="requirement-description]', 
      'System must log every single database operation for compliance audit trails'
    );
    await page.selectOption('[data-testid="requirement-type"]', 'COMPLIANCE');
    await page.selectOption('[data-testid="requirement-priority"]', 'CRITICAL');
    await page.click('[data-testid="save-requirement"]');
    
    // Check for conflict detection
    await page.waitForSelector('[data-testid="conflict-detected"]');
    
    const conflictMessage = await page.textContent('[data-testid="conflict-message"]');
    expect(conflictMessage).toContain('potential conflict');
    
    // Review conflict details
    await page.click('[data-testid="view-conflict-details"]');
    await page.waitForSelector('[data-testid="conflict-analysis"]');
    
    const conflictType = await page.textContent('[data-testid="conflict-type"]');
    expect(conflictType).toContain('PERFORMANCE_TRADE_OFF');
    
    // Accept suggested resolution
    await page.click('[data-testid="accept-resolution-0"]');
    await page.waitForSelector('[data-testid="conflict-resolved"]');
  });
});
```

---

## Performance Testing

### Load Testing with Artillery

```yaml
# artillery-config.yml
config:
  target: 'https://staging-api.lanka.ai/v2'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Spike test"
  variables:
    email: "test@example.com"
    password: "test-password"
  processor: "./test-processor.js"

scenarios:
  - name: "Requirements API Load Test"
    weight: 60
    flow:
      - post:
          url: "/auth/login"
          json:
            email: "{{ email }}"
            password: "{{ password }}"
          capture:
            - json: "$.accessToken"
              as: "token"
      - get:
          url: "/requirements"
          headers:
            Authorization: "Bearer {{ token }}"
          capture:
            - json: "$.data[0].id"
              as: "requirementId"
      - get:
          url: "/requirements/{{ requirementId }}"
          headers:
            Authorization: "Bearer {{ token }}"
      - post:
          url: "/requirements"
          headers:
            Authorization: "Bearer {{ token }}"
          json:
            title: "Load Test Requirement"
            description: "Performance testing requirement"
            type: "FUNCTIONAL"
            projectId: "proj-test-001"
            stakeholderId: "user-test-001"

  - name: "Architecture Intelligence Load Test"
    weight: 40
    flow:
      - post:
          url: "/auth/login"
          json:
            email: "{{ email }}"
            password: "{{ password }}"
          capture:
            - json: "$.accessToken"
              as: "token"
      - get:
          url: "/requirements"
          headers:
            Authorization: "Bearer {{ token }}"
          capture:
            - json: "$.data[0].id"
              as: "requirementId"
      - get:
          url: "/integration/recommendations/{{ requirementId }}"
          headers:
            Authorization: "Bearer {{ token }}"
      - get:
          url: "/integration/metrics"
          headers:
            Authorization: "Bearer {{ token }}"
```

### Performance Test Scripts

```javascript
// performance/api-benchmark.js
const autocannon = require('autocannon');

class APIBenchmark {
  constructor(baseURL = 'http://localhost:4000') {
    this.baseURL = baseURL;
    this.token = null;
  }

  async setup() {
    // Authenticate to get token
    const authResponse = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'test-password'
      })
    });

    const authData = await authResponse.json();
    this.token = authData.accessToken;
  }

  async benchmarkGetRequirements() {
    console.log('Benchmarking GET /requirements...');
    
    const result = await autocannon({
      url: `${this.baseURL}/requirements`,
      connections: 10,
      duration: 30,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      requests: [
        {
          method: 'GET'
        }
      ]
    });

    return result;
  }

  async benchmarkCreateRequirements() {
    console.log('Benchmarking POST /requirements...');
    
    const result = await autocannon({
      url: `${this.baseURL}/requirements`,
      connections: 5,
      duration: 30,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      requests: [
        {
          method: 'POST',
          body: JSON.stringify({
            title: 'Benchmark Test Requirement',
            description: 'Performance testing requirement for load analysis',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM',
            projectId: 'proj-test-001',
            stakeholderId: 'user-test-001'
          })
        }
      ]
    });

    return result;
  }

  async benchmarkRecommendations() {
    console.log('Benchmarking GET /integration/recommendations...');
    
    // First create a requirement to get recommendations for
    const createResponse = await fetch(`${this.baseURL}/requirements`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Recommendation Benchmark Requirement',
        description: 'Test requirement for recommendation benchmarking',
        type: 'FUNCTIONAL',
        projectId: 'proj-test-001',
        stakeholderId: 'user-test-001'
      })
    });

    const requirement = await createResponse.json();
    const requirementId = requirement.requirement.id;

    const result = await autocannon({
      url: `${this.baseURL}/integration/recommendations/${requirementId}`,
      connections: 3,
      duration: 30,
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    return result;
  }

  async runAllBenchmarks() {
    await this.setup();

    const results = {
      getRequirements: await this.benchmarkGetRequirements(),
      createRequirements: await this.benchmarkCreateRequirements(),
      recommendations: await this.benchmarkRecommendations()
    };

    // Generate performance report
    this.generateReport(results);

    return results;
  }

  generateReport(results) {
    console.log('\n=== PERFORMANCE BENCHMARK REPORT ===\n');

    Object.entries(results).forEach(([testName, result]) => {
      console.log(`${testName.toUpperCase()}:`);
      console.log(`  Requests/sec: ${result.requests.average}`);
      console.log(`  Latency avg: ${result.latency.average}ms`);
      console.log(`  Latency p99: ${result.latency.p99}ms`);
      console.log(`  Throughput: ${result.throughput.average} bytes/sec`);
      console.log(`  Errors: ${result.errors}`);
      console.log('');
    });

    // Check performance thresholds
    const issues = [];
    
    if (results.getRequirements.requests.average < 100) {
      issues.push('GET /requirements: Low throughput (< 100 req/sec)');
    }
    
    if (results.getRequirements.latency.p99 > 1000) {
      issues.push('GET /requirements: High latency (p99 > 1000ms)');
    }

    if (results.recommendations.latency.average > 2000) {
      issues.push('Recommendations: High average latency (> 2000ms)');
    }

    if (issues.length > 0) {
      console.log('⚠️  PERFORMANCE ISSUES DETECTED:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    } else {
      console.log('✅ All performance benchmarks passed');
    }
  }
}

module.exports = APIBenchmark;

// Run benchmarks
if (require.main === module) {
  const benchmark = new APIBenchmark();
  benchmark.runAllBenchmarks().catch(console.error);
}
```

---

## Test Automation

### CI/CD Pipeline Integration

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    services:
      neo4j:
        image: neo4j:5.0
        env:
          NEO4J_AUTH: neo4j/test-password
        ports:
          - 7687:7687
        options: --health-cmd "cypher-shell -u neo4j -p test-password 'RETURN 1'" --health-interval 10s --health-timeout 5s --health-retries 5

    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm run test:unit
      env:
        NEO4J_TEST_URI: bolt://localhost:7687
        NEO4J_TEST_USERNAME: neo4j
        NEO4J_TEST_PASSWORD: test-password
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    services:
      neo4j:
        image: neo4j:5.0
        env:
          NEO4J_AUTH: neo4j/test-password
        ports:
          - 7687:7687

    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Start test server
      run: npm run start:test &
      env:
        NODE_ENV: test
        NEO4J_URI: bolt://localhost:7687
    
    - name: Wait for server
      run: npx wait-on http://localhost:4000/health
    
    - name: Run integration tests
      run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Install Playwright browsers
      run: npx playwright install --with-deps
    
    - name: Run E2E tests
      run: npm run test:e2e
      env:
        BASE_URL: https://staging-api.lanka.ai/v2
    
    - name: Upload test results
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report
        path: playwright-report/

  performance-tests:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run performance tests
      run: npm run test:performance
      env:
        TARGET_URL: https://staging-api.lanka.ai/v2
    
    - name: Upload performance results
      uses: actions/upload-artifact@v4
      with:
        name: performance-results
        path: performance-results/
```

This comprehensive testing guide provides developers with all the tools and strategies needed to thoroughly test the LANKA API, from individual components to complete user workflows and performance characteristics.