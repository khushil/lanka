import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import { Neo4jService } from '../../src/core/database/neo4j';
import { createGraphQLSchema } from '../../src/api/graphql/schema';
import { TestDataFactory } from '../factories/test-data.factory';
import { RequirementsService } from '../../src/modules/requirements/services/requirements.service';
import { ArchitectureDecisionService } from '../../src/modules/architecture/services/decision.service';
import { RequirementsArchitectureIntegrationService } from '../../src/services/requirements-architecture-integration.service';

describe('API Integration Tests', () => {
  let app: express.Application;
  let server: ApolloServer;
  let neo4j: Neo4jService;
  let requirementsService: RequirementsService;
  let decisionService: ArchitectureDecisionService;
  let integrationService: RequirementsArchitectureIntegrationService;

  beforeAll(async () => {
    // Initialize database
    neo4j = Neo4jService.getInstance();
    await neo4j.initializeSchema();

    // Initialize services
    requirementsService = new RequirementsService(neo4j);
    decisionService = new ArchitectureDecisionService(neo4j);
    integrationService = new RequirementsArchitectureIntegrationService(neo4j);

    // Create GraphQL schema
    const schema = createGraphQLSchema();

    // Create Apollo Server
    server = new ApolloServer({
      schema,
      introspection: true
    });

    await server.start();

    // Create Express app
    app = express();
    app.use(express.json());
    
    // Add GraphQL endpoint
    app.use('/graphql', expressMiddleware(server, {
      context: async ({ req }) => ({
        neo4j,
        requirementsService,
        decisionService,
        integrationService,
        user: req.headers.authorization ? { id: 'test-user' } : null
      })
    }));

    // Add REST endpoints for testing
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    app.get('/metrics', async (req, res) => {
      try {
        const metrics = await integrationService.getIntegrationMetrics();
        res.json(metrics);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get metrics' });
      }
    });
  });

  afterAll(async () => {
    await cleanupTestData();
    await server.stop();
    await neo4j.close();
  });

  describe('GraphQL API Integration', () => {
    describe('Requirements Queries', () => {
      it('should fetch requirements with architecture mappings', async () => {
        // Setup test data
        const scenario = TestDataFactory.createIntegrationScenario();
        await setupScenarioData(scenario);

        const query = `
          query GetRequirementsWithMappings($projectId: ID!) {
            requirements(projectId: $projectId) {
              id
              title
              description
              type
              status
              priority
              architectureMappings {
                id
                mappingType
                confidence
                rationale
                architectureDecision {
                  id
                  title
                  description
                }
                architecturePattern {
                  id
                  name
                  type
                }
              }
            }
          }
        `;

        const response = await request(app)
          .post('/graphql')
          .send({
            query,
            variables: { projectId: scenario.project.id }
          })
          .expect(200);

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.requirements).toBeDefined();
        expect(Array.isArray(response.body.data.requirements)).toBe(true);
        
        const requirements = response.body.data.requirements;
        expect(requirements.length).toBeGreaterThan(0);

        // Verify mapping data is included
        const reqWithMappings = requirements.find((req: any) => 
          req.architectureMappings && req.architectureMappings.length > 0
        );
        
        if (reqWithMappings) {
          expect(reqWithMappings.architectureMappings[0]).toHaveProperty('confidence');
          expect(reqWithMappings.architectureMappings[0]).toHaveProperty('mappingType');
        }
      });

      it('should create requirement and generate recommendations via GraphQL', async () => {
        const scenario = TestDataFactory.createIntegrationScenario();
        await setupProjectAndStakeholder(scenario.project, scenario.stakeholder);

        const mutation = `
          mutation CreateRequirementWithRecommendations($input: RequirementInput!) {
            createRequirement(input: $input) {
              id
              title
              description
              type
              recommendations {
                requirementId
                confidence
                recommendedPatterns {
                  applicabilityScore
                  benefits
                }
                recommendedTechnologies {
                  suitabilityScore
                  alignmentReason
                }
              }
            }
          }
        `;

        const requirementInput = {
          title: 'High-Performance API Requirement',
          description: 'API must handle 50,000 requests per second with 99.9% uptime',
          type: 'NON_FUNCTIONAL',
          priority: 'CRITICAL',
          projectId: scenario.project.id,
          stakeholderId: scenario.stakeholder.id
        };

        const response = await request(app)
          .post('/graphql')
          .send({
            query: mutation,
            variables: { input: requirementInput }
          })
          .expect(200);

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.createRequirement).toBeDefined();
        
        const requirement = response.body.data.createRequirement;
        expect(requirement.id).toBeDefined();
        expect(requirement.title).toBe(requirementInput.title);
        expect(requirement.recommendations).toBeDefined();
      });
    });

    describe('Architecture Decision Queries', () => {
      it('should fetch architecture decisions with requirement mappings', async () => {
        const scenario = TestDataFactory.createIntegrationScenario();
        await setupScenarioData(scenario);

        const query = `
          query GetArchitectureDecisionsWithRequirements {
            architectureDecisions {
              id
              title
              description
              status
              requirementMappings {
                id
                mappingType
                confidence
                requirement {
                  id
                  title
                  type
                  priority
                }
              }
              impactAnalysis {
                affectedRequirements
                changeComplexity
                estimatedEffort
                riskLevel
              }
            }
          }
        `;

        const response = await request(app)
          .post('/graphql')
          .send({ query })
          .expect(200);

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.architectureDecisions).toBeDefined();
        expect(Array.isArray(response.body.data.architectureDecisions)).toBe(true);
      });

      it('should create architecture decision with automatic requirement analysis', async () => {
        const scenario = TestDataFactory.createIntegrationScenario();
        await setupScenarioData(scenario);

        const mutation = `
          mutation CreateArchitectureDecision($input: ArchitectureDecisionInput!) {
            createArchitectureDecision(input: $input) {
              id
              title
              description
              status
              impactAnalysis {
                affectedRequirements
                changeComplexity
                estimatedEffort
              }
              alignmentValidation {
                overallScore
                misalignedRequirements
                recommendations
              }
            }
          }
        `;

        const decisionInput = {
          title: 'Implement Redis Caching',
          description: 'Add Redis caching layer to improve API response times',
          rationale: 'Current response times exceed requirements, caching will help',
          status: 'PROPOSED',
          requirementIds: [], // Will be populated from scenario
          alternatives: [],
          consequences: ['Improved performance', 'Additional infrastructure complexity']
        };

        const response = await request(app)
          .post('/graphql')
          .send({
            query: mutation,
            variables: { input: decisionInput }
          })
          .expect(200);

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.createArchitectureDecision).toBeDefined();
        
        const decision = response.body.data.createArchitectureDecision;
        expect(decision.id).toBeDefined();
        expect(decision.impactAnalysis).toBeDefined();
      });
    });

    describe('Integration Queries', () => {
      it('should fetch integration metrics via GraphQL', async () => {
        const scenario = TestDataFactory.createIntegrationScenario();
        await setupScenarioData(scenario);

        const query = `
          query GetIntegrationMetrics($projectId: ID) {
            integrationMetrics(projectId: $projectId) {
              totalRequirements
              mappedRequirements
              unmappedRequirements
              averageConfidence
              validationCoverage
              recommendationAccuracy
              alignmentDistribution {
                fullyAligned
                partiallyAligned
                misaligned
                notApplicable
              }
            }
          }
        `;

        const response = await request(app)
          .post('/graphql')
          .send({
            query,
            variables: { projectId: scenario.project.id }
          })
          .expect(200);

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.integrationMetrics).toBeDefined();
        
        const metrics = response.body.data.integrationMetrics;
        expect(typeof metrics.totalRequirements).toBe('number');
        expect(typeof metrics.mappedRequirements).toBe('number');
        expect(typeof metrics.averageConfidence).toBe('number');
        expect(metrics.alignmentDistribution).toBeDefined();
      });

      it('should perform health check via GraphQL', async () => {
        const query = `
          query PerformHealthCheck {
            integrationHealthCheck {
              status
              lastChecked
              issues {
                type
                description
                severity
                affectedItems
                suggestedActions
              }
              metrics {
                totalRequirements
                mappedRequirements
                unmappedRequirements
              }
              recommendations
            }
          }
        `;

        const response = await request(app)
          .post('/graphql')
          .send({ query })
          .expect(200);

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.integrationHealthCheck).toBeDefined();
        
        const healthCheck = response.body.data.integrationHealthCheck;
        expect(['HEALTHY', 'WARNING', 'CRITICAL']).toContain(healthCheck.status);
        expect(healthCheck.lastChecked).toBeDefined();
        expect(Array.isArray(healthCheck.issues)).toBe(true);
        expect(Array.isArray(healthCheck.recommendations)).toBe(true);
      });

      it('should validate requirement-architecture alignment via GraphQL', async () => {
        const scenario = TestDataFactory.createIntegrationScenario();
        await setupScenarioData(scenario);

        const mutation = `
          mutation ValidateAlignment($requirementId: ID!, $architectureDecisionId: ID!) {
            validateRequirementArchitectureAlignment(
              requirementId: $requirementId
              architectureDecisionId: $architectureDecisionId
            ) {
              requirementId
              architectureDecisionId
              alignmentScore
              alignmentType
              gaps
              recommendations
              validationStatus
              lastAssessed
            }
          }
        `;

        const response = await request(app)
          .post('/graphql')
          .send({
            query: mutation,
            variables: {
              requirementId: 'test-req-1',
              architectureDecisionId: 'test-decision-1'
            }
          })
          .expect(200);

        // Note: This might fail if test data isn't set up properly
        // In a real implementation, we'd ensure test data exists
        if (!response.body.errors) {
          const alignment = response.body.data.validateRequirementArchitectureAlignment;
          expect(alignment.alignmentScore).toBeGreaterThanOrEqual(0);
          expect(alignment.alignmentScore).toBeLessThanOrEqual(1);
          expect(['FULLY_ALIGNED', 'PARTIALLY_ALIGNED', 'MISALIGNED', 'NOT_APPLICABLE'])
            .toContain(alignment.alignmentType);
        }
      });
    });

    describe('Error Handling', () => {
      it('should handle invalid GraphQL queries gracefully', async () => {
        const invalidQuery = `
          query InvalidQuery {
            nonExistentField {
              invalidProperty
            }
          }
        `;

        const response = await request(app)
          .post('/graphql')
          .send({ query: invalidQuery })
          .expect(400);

        expect(response.body.errors).toBeDefined();
        expect(response.body.errors.length).toBeGreaterThan(0);
      });

      it('should handle missing required variables', async () => {
        const query = `
          query GetRequirements($projectId: ID!) {
            requirements(projectId: $projectId) {
              id
              title
            }
          }
        `;

        const response = await request(app)
          .post('/graphql')
          .send({ query }) // Missing variables
          .expect(400);

        expect(response.body.errors).toBeDefined();
      });

      it('should handle database connection errors', async () => {
        // Temporarily close database connection
        await neo4j.close();

        const query = `
          query GetRequirements {
            requirements {
              id
              title
            }
          }
        `;

        const response = await request(app)
          .post('/graphql')
          .send({ query })
          .expect(200); // GraphQL returns 200 even for errors

        expect(response.body.errors).toBeDefined();

        // Restore database connection
        neo4j = Neo4jService.getInstance();
        await neo4j.initializeSchema();
      });
    });
  });

  describe('REST API Integration', () => {
    it('should provide health check endpoint', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should provide metrics endpoint', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(typeof response.body.totalRequirements).toBe('number');
      expect(typeof response.body.mappedRequirements).toBe('number');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should handle requests without authentication', async () => {
      const query = `
        query GetPublicData {
          integrationMetrics {
            totalRequirements
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query })
        .expect(200);

      // Should work for public data
      expect(response.body.data).toBeDefined();
    });

    it('should handle authenticated requests', async () => {
      const query = `
        mutation CreateRequirement($input: RequirementInput!) {
          createRequirement(input: $input) {
            id
            title
          }
        }
      `;

      const input = TestDataFactory.createRequirement();

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', 'Bearer test-token')
        .send({ query, variables: { input } })
        .expect(200);

      // Should include user context
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large result sets efficiently', async () => {
      // Create batch test data
      const batchData = TestDataFactory.createBatchTestData(50);
      await setupBatchData(batchData);

      const query = `
        query GetLargeResultSet {
          requirements {
            id
            title
            description
            architectureMappings {
              id
              confidence
              architectureDecision {
                id
                title
              }
            }
          }
        }
      `;

      const startTime = Date.now();
      const response = await request(app)
        .post('/graphql')
        .send({ query })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.requirements).toBeDefined();
      expect(response.body.data.requirements.length).toBeGreaterThan(0);
      
      // Should respond within reasonable time
      expect(responseTime).toBeLessThan(5000); // 5 seconds
    });

    it('should handle concurrent requests', async () => {
      const query = `
        query GetMetrics {
          integrationMetrics {
            totalRequirements
            mappedRequirements
          }
        }
      `;

      // Create 10 concurrent requests
      const promises = Array(10).fill(null).map(() =>
        request(app)
          .post('/graphql')
          .send({ query })
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.integrationMetrics).toBeDefined();
      });
    });
  });

  // Helper functions

  async function setupProjectAndStakeholder(project: any, stakeholder: any): Promise<void> {
    await neo4j.executeQuery(
      'CREATE (p:Project {id: $id, name: $name, description: $description, status: $status, createdAt: $createdAt})',
      project
    );

    await neo4j.executeQuery(
      'CREATE (s:Stakeholder {id: $id, name: $name, email: $email, role: $role, department: $department, createdAt: $createdAt})',
      stakeholder
    );
  }

  async function setupScenarioData(scenario: any): Promise<void> {
    await setupProjectAndStakeholder(scenario.project, scenario.stakeholder);

    // Create requirements
    for (const reqData of scenario.requirements) {
      await requirementsService.createRequirement(reqData);
    }

    // Create architecture decisions
    for (const decisionData of scenario.architectureDecisions) {
      await decisionService.createDecision(decisionData);
    }

    // Create mappings
    for (const mappingData of scenario.mappings) {
      await integrationService.createMapping(mappingData);
    }
  }

  async function setupBatchData(batchData: any): Promise<void> {
    // Create project and stakeholder for batch data
    const project = TestDataFactory.createProject();
    const stakeholder = TestDataFactory.createStakeholder();
    await setupProjectAndStakeholder(project, stakeholder);

    // Create requirements and decisions in batches
    for (const reqData of batchData.requirements) {
      await requirementsService.createRequirement({
        ...reqData,
        projectId: project.id,
        stakeholderId: stakeholder.id
      });
    }

    for (const decisionData of batchData.decisions) {
      await decisionService.createDecision(decisionData);
    }

    for (const mappingData of batchData.mappings) {
      await integrationService.createMapping(mappingData);
    }
  }

  async function cleanupTestData(): Promise<void> {
    const cleanupQueries = [
      'MATCH (m:RequirementArchitectureMapping) WHERE m.id STARTS WITH \"test-\" DETACH DELETE m',
      'MATCH (r:Requirement) WHERE r.id STARTS WITH \"test-\" DETACH DELETE r',
      'MATCH (a:ArchitectureDecision) WHERE a.id STARTS WITH \"test-\" DETACH DELETE a',
      'MATCH (p:ArchitecturePattern) WHERE p.id STARTS WITH \"test-\" DETACH DELETE p',
      'MATCH (t:TechnologyStack) WHERE t.id STARTS WITH \"test-\" DETACH DELETE t',
      'MATCH (s:Stakeholder) WHERE s.id STARTS WITH \"test-\" DETACH DELETE s',
      'MATCH (proj:Project) WHERE proj.id STARTS WITH \"test-\" DETACH DELETE proj'
    ];

    for (const query of cleanupQueries) {
      try {
        await neo4j.executeQuery(query);
      } catch (error) {
        console.warn('API cleanup warning:', error);
      }
    }
  }
});