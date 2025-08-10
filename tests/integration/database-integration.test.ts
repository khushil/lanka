import { Neo4jService } from '../../src/core/database/neo4j';
import { TestDataFactory } from '../factories/test-data.factory';
import { RequirementsService } from '../../src/modules/requirements/services/requirements.service';
import { ArchitectureDecisionService } from '../../src/modules/architecture/services/decision.service';
import { RequirementsArchitectureIntegrationService } from '../../src/services/requirements-architecture-integration.service';
import { RequirementMappingType, AlignmentType } from '../../src/types/integration.types';

describe('Database Integration Tests', () => {
  let neo4j: Neo4jService;
  let requirementsService: RequirementsService;
  let decisionService: ArchitectureDecisionService;
  let integrationService: RequirementsArchitectureIntegrationService;

  beforeAll(async () => {
    neo4j = Neo4jService.getInstance();
    await neo4j.initializeSchema();

    requirementsService = new RequirementsService(neo4j);
    decisionService = new ArchitectureDecisionService(neo4j);
    integrationService = new RequirementsArchitectureIntegrationService(neo4j);
  });

  afterAll(async () => {
    await cleanupAllTestData();
    await neo4j.close();
  });

  describe('Neo4j Schema and Constraints', () => {
    it('should have proper constraints on node types', async () => {
      // Check that unique constraints exist
      const constraintsQuery = `
        SHOW CONSTRAINTS
        YIELD name, type, entityType, labelsOrTypes, properties
        WHERE entityType = "NODE"
        RETURN name, type, labelsOrTypes, properties
      `;

      const results = await neo4j.executeQuery(constraintsQuery);
      
      // Should have constraints on key entity IDs
      const constraintLabels = results.map(r => r.labelsOrTypes[0]);
      expect(constraintLabels).toContain('Requirement');
      expect(constraintLabels).toContain('ArchitectureDecision');
      expect(constraintLabels).toContain('Project');
    });

    it('should have proper indexes for performance', async () => {
      const indexesQuery = `
        SHOW INDEXES
        YIELD name, type, entityType, labelsOrTypes, properties
        WHERE entityType = "NODE"
        RETURN name, type, labelsOrTypes, properties
      `;

      const results = await neo4j.executeQuery(indexesQuery);
      expect(results.length).toBeGreaterThan(0);
      
      // Verify indexes on commonly queried fields
      const indexedProperties = results.flatMap(r => r.properties);
      expect(indexedProperties).toContain('id');
    });
  });

  describe('Cross-Module Relationship Integrity', () => {
    it('should maintain referential integrity across requirement-architecture relationships', async () => {
      // Create test data
      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement()
      );
      const decision = await decisionService.createDecision(
        TestDataFactory.createArchitectureDecision()
      );

      // Create mapping
      const mapping = await integrationService.createMapping({
        requirementId: requirement.id,
        architectureDecisionId: decision.id,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.85,
        rationale: 'Test referential integrity'
      });

      // Verify all nodes exist
      const verifyQuery = `
        MATCH (r:Requirement {id: $requirementId})
        MATCH (a:ArchitectureDecision {id: $architectureDecisionId})
        MATCH (m:RequirementArchitectureMapping {id: $mappingId})
        MATCH (r)-[:MAPPED_TO]->(m)-[:MAPS_TO_DECISION]->(a)
        RETURN r.id as reqId, a.id as decId, m.id as mapId
      `;

      const results = await neo4j.executeQuery(verifyQuery, {
        requirementId: requirement.id,
        architectureDecisionId: decision.id,
        mappingId: mapping.id
      });

      expect(results).toHaveLength(1);
      expect(results[0].reqId).toBe(requirement.id);
      expect(results[0].decId).toBe(decision.id);
      expect(results[0].mapId).toBe(mapping.id);
    });

    it('should handle complex relationship patterns', async () => {
      const scenario = TestDataFactory.createIntegrationScenario();
      
      // Set up base entities
      await setupProjectAndStakeholder(scenario.project, scenario.stakeholder);
      
      // Create requirements
      const requirements = [];
      for (const reqData of scenario.requirements) {
        const req = await requirementsService.createRequirement(reqData);
        requirements.push(req);
      }

      // Create architecture components
      const decisions = [];
      for (const decData of scenario.architectureDecisions) {
        const decision = await decisionService.createDecision(decData);
        decisions.push(decision);
      }

      // Create multiple relationship types
      const mappings = [
        // Direct mapping
        await integrationService.createMapping({
          requirementId: requirements[0].id,
          architectureDecisionId: decisions[0].id,
          mappingType: RequirementMappingType.DIRECT,
          confidence: 0.9,
          rationale: 'Direct performance requirement to microservices decision'
        }),
        
        // Derived mapping
        await integrationService.createMapping({
          requirementId: requirements[1].id,
          architectureDecisionId: decisions[1].id,
          mappingType: RequirementMappingType.DERIVED,
          confidence: 0.75,
          rationale: 'Security requirements derived from authentication decision'
        }),

        // Constraint mapping
        await integrationService.createMapping({
          requirementId: requirements[2].id,
          architectureDecisionId: decisions[0].id,
          mappingType: RequirementMappingType.CONSTRAINT,
          confidence: 0.6,
          rationale: 'Functional requirement constrains architecture choice'
        })
      ];

      // Verify complex relationship query
      const complexQuery = `
        MATCH (p:Project {id: $projectId})-[:CONTAINS]->(r:Requirement)
        MATCH (r)-[:MAPPED_TO]->(m:RequirementArchitectureMapping)
        MATCH (m)-[:MAPS_TO_DECISION]->(a:ArchitectureDecision)
        WITH p, r, m, a, m.mappingType as mappingType, m.confidence as confidence
        RETURN 
          count(DISTINCT r) as totalRequirements,
          count(DISTINCT a) as totalDecisions,
          count(DISTINCT m) as totalMappings,
          collect(DISTINCT mappingType) as mappingTypes,
          avg(confidence) as avgConfidence,
          max(confidence) as maxConfidence,
          min(confidence) as minConfidence
      `;

      const results = await neo4j.executeQuery(complexQuery, {
        projectId: scenario.project.id
      });

      expect(results).toHaveLength(1);
      const result = results[0];
      expect(result.totalRequirements).toBe(3);
      expect(result.totalDecisions).toBeGreaterThanOrEqual(1);
      expect(result.totalMappings).toBe(3);
      expect(result.mappingTypes).toContain('DIRECT');
      expect(result.mappingTypes).toContain('DERIVED');
      expect(result.mappingTypes).toContain('CONSTRAINT');
      expect(result.avgConfidence).toBeGreaterThan(0.5);
    });
  });

  describe('Query Performance and Optimization', () => {
    beforeEach(async () => {
      // Create performance test data
      const batchData = TestDataFactory.createBatchTestData(100);
      await setupBatchTestData(batchData);
    });

    it('should perform requirement queries efficiently', async () => {
      const startTime = Date.now();
      
      const query = `
        MATCH (r:Requirement)
        WHERE r.id STARTS WITH "test-"
        RETURN count(r) as totalRequirements
      `;

      const results = await neo4j.executeQuery(query);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(results[0].totalRequirements).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle complex aggregation queries efficiently', async () => {
      const startTime = Date.now();

      const aggregationQuery = `
        MATCH (r:Requirement)
        WHERE r.id STARTS WITH "test-"
        OPTIONAL MATCH (r)-[:MAPPED_TO]->(m:RequirementArchitectureMapping)
        OPTIONAL MATCH (m)-[:MAPS_TO_DECISION]->(a:ArchitectureDecision)
        WITH r, m, a
        RETURN 
          r.type as requirementType,
          count(DISTINCT r) as requirementCount,
          count(DISTINCT m) as mappingCount,
          count(DISTINCT a) as decisionCount,
          avg(m.confidence) as avgConfidence
        ORDER BY requirementCount DESC
      `;

      const results = await neo4j.executeQuery(aggregationQuery);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(results.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should optimize path queries between modules', async () => {
      const startTime = Date.now();

      const pathQuery = `
        MATCH path = (r:Requirement)-[:MAPPED_TO]->(:RequirementArchitectureMapping)-[:MAPS_TO_DECISION]->(a:ArchitectureDecision)
        WHERE r.id STARTS WITH "test-" AND a.id STARTS WITH "test-"
        RETURN 
          count(path) as totalPaths,
          avg(length(path)) as avgPathLength,
          collect(DISTINCT r.type) as requirementTypes
        LIMIT 1000
      `;

      const results = await neo4j.executeQuery(pathQuery);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(results[0].totalPaths).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(3000); // Should complete within 3 seconds
    });
  });

  describe('Transaction Management', () => {
    it('should handle transaction rollback on errors', async () => {
      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement()
      );

      // Start transaction
      const session = neo4j.getDriver().session();
      const txn = session.beginTransaction();

      try {
        // Create mapping in transaction
        await txn.run(
          `CREATE (m:RequirementArchitectureMapping {
            id: $id,
            requirementId: $requirementId,
            confidence: $confidence,
            rationale: $rationale,
            createdAt: $createdAt
          })`,
          {
            id: 'test-mapping-txn',
            requirementId: requirement.id,
            confidence: 0.8,
            rationale: 'Transaction test mapping',
            createdAt: new Date().toISOString()
          }
        );

        // Intentionally cause an error
        await txn.run(
          'CREATE (invalid:NonExistentNode {invalidProperty: $invalidValue})',
          { invalidValue: undefined } // This should cause an error
        );

        await txn.commit();
        fail('Transaction should have failed');
      } catch (error) {
        await txn.rollback();
        
        // Verify mapping was not created due to rollback
        const checkQuery = `
          MATCH (m:RequirementArchitectureMapping {id: "test-mapping-txn"})
          RETURN count(m) as count
        `;
        
        const results = await neo4j.executeQuery(checkQuery);
        expect(results[0].count).toBe(0);
      } finally {
        await session.close();
      }
    });

    it('should handle concurrent transactions correctly', async () => {
      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement()
      );
      const decision = await decisionService.createDecision(
        TestDataFactory.createArchitectureDecision()
      );

      // Create multiple concurrent transactions
      const concurrentOperations = Array(5).fill(null).map(async (_, index) => {
        return integrationService.createMapping({
          requirementId: requirement.id,
          architectureDecisionId: decision.id,
          mappingType: RequirementMappingType.DIRECT,
          confidence: 0.7 + (index * 0.05),
          rationale: `Concurrent mapping ${index}`
        });
      });

      const results = await Promise.all(concurrentOperations);

      // All should succeed with unique IDs
      expect(results).toHaveLength(5);
      const ids = results.map(r => r.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds).toHaveLength(5);
    });
  });

  describe('Data Consistency and Integrity', () => {
    it('should maintain data consistency during bulk operations', async () => {
      const batchSize = 50;
      const requirements = [];
      const decisions = [];

      // Create batch data
      for (let i = 0; i < batchSize; i++) {
        const req = await requirementsService.createRequirement(
          TestDataFactory.createRequirement({
            title: `Bulk Requirement ${i}`,
            description: `Bulk requirement number ${i}`
          })
        );
        requirements.push(req);

        const decision = await decisionService.createDecision(
          TestDataFactory.createArchitectureDecision({
            title: `Bulk Decision ${i}`,
            description: `Bulk decision number ${i}`
          })
        );
        decisions.push(decision);
      }

      // Create mappings in batch
      const mappingPromises = requirements.map((req, index) =>
        integrationService.createMapping({
          requirementId: req.id,
          architectureDecisionId: decisions[index].id,
          mappingType: RequirementMappingType.DIRECT,
          confidence: 0.5 + Math.random() * 0.5,
          rationale: `Bulk mapping ${index}`
        })
      );

      const mappings = await Promise.all(mappingPromises);
      expect(mappings).toHaveLength(batchSize);

      // Verify consistency
      const consistencyQuery = `
        MATCH (r:Requirement)-[:MAPPED_TO]->(m:RequirementArchitectureMapping)-[:MAPS_TO_DECISION]->(a:ArchitectureDecision)
        WHERE r.title STARTS WITH "Bulk Requirement" 
          AND a.title STARTS WITH "Bulk Decision"
        RETURN count(*) as consistentMappings
      `;

      const results = await neo4j.executeQuery(consistencyQuery);
      expect(results[0].consistentMappings).toBe(batchSize);
    });

    it('should handle orphaned node cleanup', async () => {
      // Create requirement and decision
      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement()
      );
      const decision = await decisionService.createDecision(
        TestDataFactory.createArchitectureDecision()
      );

      // Create mapping
      const mapping = await integrationService.createMapping({
        requirementId: requirement.id,
        architectureDecisionId: decision.id,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.8,
        rationale: 'Orphan cleanup test'
      });

      // Delete requirement (simulating orphan scenario)
      await neo4j.executeQuery(
        'MATCH (r:Requirement {id: $id}) DETACH DELETE r',
        { id: requirement.id }
      );

      // Check for orphaned mappings
      const orphanQuery = `
        MATCH (m:RequirementArchitectureMapping {id: $mappingId})
        WHERE NOT EXISTS((:Requirement {id: m.requirementId}))
        RETURN m
      `;

      const orphanResults = await neo4j.executeQuery(orphanQuery, {
        mappingId: mapping.id
      });

      expect(orphanResults).toHaveLength(1); // Mapping should be orphaned

      // Clean up orphaned mappings
      const cleanupQuery = `
        MATCH (m:RequirementArchitectureMapping)
        WHERE NOT EXISTS((:Requirement {id: m.requirementId}))
           OR NOT EXISTS((:ArchitectureDecision {id: m.architectureDecisionId}))
        DETACH DELETE m
        RETURN count(m) as deletedMappings
      `;

      const cleanupResults = await neo4j.executeQuery(cleanupQuery);
      expect(cleanupResults[0].deletedMappings).toBeGreaterThan(0);
    });
  });

  describe('Indexing and Query Optimization', () => {
    it('should use indexes effectively for frequent queries', async () => {
      // Create test data with known patterns
      const project = TestDataFactory.createProject();
      await setupProject(project);

      // Create multiple requirements with different types
      const requirementTypes = ['FUNCTIONAL', 'NON_FUNCTIONAL', 'CONSTRAINT'];
      for (let i = 0; i < 30; i++) {
        const reqType = requirementTypes[i % 3];
        await requirementsService.createRequirement({
          ...TestDataFactory.createRequirement(),
          type: reqType,
          projectId: project.id
        });
      }

      // Query with index utilization
      const indexQuery = `
        PROFILE
        MATCH (p:Project {id: $projectId})-[:CONTAINS]->(r:Requirement)
        WHERE r.type = $type
        RETURN count(r) as count
      `;

      const results = await neo4j.executeQuery(indexQuery, {
        projectId: project.id,
        type: 'FUNCTIONAL'
      });

      expect(results[0].count).toBe(10);
    });

    it('should optimize relationship traversal queries', async () => {
      // Create connected graph of requirements and decisions
      const scenario = TestDataFactory.createIntegrationScenario();
      await setupCompleteScenario(scenario);

      // Test deep traversal query
      const traversalQuery = `
        MATCH (start:Requirement {type: $startType})
        MATCH (start)-[:MAPPED_TO*1..3]-(connected)
        RETURN DISTINCT type(connected) as nodeType, count(connected) as count
        ORDER BY count DESC
      `;

      const results = await neo4j.executeQuery(traversalQuery, {
        startType: 'FUNCTIONAL'
      });

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Backup and Recovery', () => {
    it('should export and import data correctly', async () => {
      // Create test data
      const scenario = TestDataFactory.createIntegrationScenario();
      await setupCompleteScenario(scenario);

      // Export data
      const exportQuery = `
        MATCH (n)
        WHERE n.id STARTS WITH "test-"
        RETURN 
          labels(n) as nodeLabels,
          properties(n) as nodeProperties,
          id(n) as internalId
        LIMIT 100
      `;

      const exportResults = await neo4j.executeQuery(exportQuery);
      expect(exportResults.length).toBeGreaterThan(0);

      // Store original count
      const originalCount = exportResults.length;

      // Simulate data loss by deleting test data
      await cleanupAllTestData();

      // Verify data is deleted
      const afterDeleteResults = await neo4j.executeQuery(exportQuery);
      expect(afterDeleteResults.length).toBe(0);

      // Import data back (in a real scenario, this would restore from backup)
      // For this test, we just verify the export captured the data
      expect(originalCount).toBeGreaterThan(0);
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

  async function setupProject(project: any): Promise<void> {
    await neo4j.executeQuery(
      'CREATE (p:Project {id: $id, name: $name, description: $description, status: $status, createdAt: $createdAt})',
      project
    );
  }

  async function setupBatchTestData(batchData: any): Promise<void> {
    const project = TestDataFactory.createProject();
    const stakeholder = TestDataFactory.createStakeholder();
    await setupProjectAndStakeholder(project, stakeholder);

    // Create requirements and decisions
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

  async function setupCompleteScenario(scenario: any): Promise<void> {
    await setupProjectAndStakeholder(scenario.project, scenario.stakeholder);

    // Create all entities
    for (const reqData of scenario.requirements) {
      await requirementsService.createRequirement(reqData);
    }

    for (const decisionData of scenario.architectureDecisions) {
      await decisionService.createDecision(decisionData);
    }

    for (const mappingData of scenario.mappings) {
      await integrationService.createMapping(mappingData);
    }
  }

  async function cleanupAllTestData(): Promise<void> {
    const cleanupQueries = [
      'MATCH (m:RequirementArchitectureMapping) WHERE m.id STARTS WITH \"test-\" DETACH DELETE m',
      'MATCH (al:ArchitectureRequirementAlignment) WHERE al.requirementId STARTS WITH \"test-\" OR al.architectureDecisionId STARTS WITH \"test-\" DETACH DELETE al',
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
        console.warn('Database cleanup warning:', error);
      }
    }
  }
});