import { Neo4jService } from '../../src/core/database/neo4j';
import { RequirementsArchitectureIntegrationService } from '../../src/services/requirements-architecture-integration.service';
import { RequirementsService } from '../../src/modules/requirements/services/requirements.service';
import { ArchitectureDecisionService } from '../../src/modules/architecture/services/decision.service';
import { TestDataFactory } from '../factories/test-data.factory';
import { RequirementMappingType } from '../../src/types/integration.types';

describe('Performance Integration Tests', () => {
  let neo4j: Neo4jService;
  let integrationService: RequirementsArchitectureIntegrationService;
  let requirementsService: RequirementsService;
  let decisionService: ArchitectureDecisionService;

  const PERFORMANCE_THRESHOLDS = {
    singleQuery: 1000, // 1 second
    batchOperation: 5000, // 5 seconds
    complexQuery: 3000, // 3 seconds
    concurrentOperations: 10000, // 10 seconds
    memoryLimit: 500 * 1024 * 1024, // 500MB
  };

  beforeAll(async () => {
    neo4j = Neo4jService.getInstance();
    await neo4j.initializeSchema();

    integrationService = new RequirementsArchitectureIntegrationService(neo4j);
    requirementsService = new RequirementsService(neo4j);
    decisionService = new ArchitectureDecisionService(neo4j);
  });

  afterAll(async () => {
    await cleanupPerformanceTestData();
    await neo4j.close();
  });

  describe('Individual Operation Performance', () => {
    it('should create requirements within performance threshold', async () => {
      const startTime = Date.now();
      
      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement()
      );
      
      const endTime = Date.now();
      const operationTime = endTime - startTime;

      expect(requirement.id).toBeDefined();
      expect(operationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.singleQuery);
    });

    it('should create architecture decisions within performance threshold', async () => {
      const startTime = Date.now();
      
      const decision = await decisionService.createDecision(
        TestDataFactory.createArchitectureDecision()
      );
      
      const endTime = Date.now();
      const operationTime = endTime - startTime;

      expect(decision.id).toBeDefined();
      expect(operationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.singleQuery);
    });

    it('should create mappings within performance threshold', async () => {
      // Setup test entities
      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement()
      );
      const decision = await decisionService.createDecision(
        TestDataFactory.createArchitectureDecision()
      );

      const startTime = Date.now();
      
      const mapping = await integrationService.createMapping({
        requirementId: requirement.id,
        architectureDecisionId: decision.id,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.8,
        rationale: 'Performance test mapping'
      });
      
      const endTime = Date.now();
      const operationTime = endTime - startTime;

      expect(mapping.id).toBeDefined();
      expect(operationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.singleQuery);
    });

    it('should generate recommendations within performance threshold', async () => {
      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createPerformanceRequirement()
      );

      const startTime = Date.now();
      
      const recommendations = await integrationService.generateRecommendations(requirement.id);
      
      const endTime = Date.now();
      const operationTime = endTime - startTime;

      expect(recommendations.requirementId).toBe(requirement.id);
      expect(operationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.complexQuery);
    });

    it('should validate alignment within performance threshold', async () => {
      // Setup test entities and mapping
      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement()
      );
      const decision = await decisionService.createDecision(
        TestDataFactory.createArchitectureDecision()
      );

      await integrationService.createMapping({
        requirementId: requirement.id,
        architectureDecisionId: decision.id,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.8,
        rationale: 'Alignment performance test'
      });

      const startTime = Date.now();
      
      const alignment = await integrationService.validateAlignment(
        requirement.id,
        decision.id
      );
      
      const endTime = Date.now();
      const operationTime = endTime - startTime;

      expect(alignment.requirementId).toBe(requirement.id);
      expect(operationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.singleQuery);
    });
  });

  describe('Batch Operation Performance', () => {
    it('should handle bulk requirement creation efficiently', async () => {
      const batchSize = 100;
      const requirements = Array(batchSize).fill(null).map(() =>
        TestDataFactory.createRequirement()
      );

      const startTime = Date.now();
      
      const createdRequirements = await Promise.all(
        requirements.map(req => requirementsService.createRequirement(req))
      );
      
      const endTime = Date.now();
      const operationTime = endTime - startTime;

      expect(createdRequirements).toHaveLength(batchSize);
      expect(operationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.batchOperation);
      
      // Calculate average time per operation
      const avgTimePerOperation = operationTime / batchSize;
      expect(avgTimePerOperation).toBeLessThan(100); // Less than 100ms per operation
    });

    it('should handle bulk mapping creation efficiently', async () => {
      // Setup base entities
      const requirements = await Promise.all(
        Array(50).fill(null).map(() =>
          requirementsService.createRequirement(TestDataFactory.createRequirement())
        )
      );
      
      const decisions = await Promise.all(
        Array(50).fill(null).map(() =>
          decisionService.createDecision(TestDataFactory.createArchitectureDecision())
        )
      );

      const startTime = Date.now();
      
      // Create mappings between requirements and decisions
      const mappings = await Promise.all(
        requirements.map((req, index) =>
          integrationService.createMapping({
            requirementId: req.id,
            architectureDecisionId: decisions[index].id,
            mappingType: RequirementMappingType.DIRECT,
            confidence: 0.5 + Math.random() * 0.5,
            rationale: `Bulk mapping ${index}`
          })
        )
      );
      
      const endTime = Date.now();
      const operationTime = endTime - startTime;

      expect(mappings).toHaveLength(50);
      expect(operationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.batchOperation);
    });

    it('should handle bulk integration metrics calculation efficiently', async () => {
      // Setup test data
      const scenario = TestDataFactory.createIntegrationScenario();
      await setupPerformanceScenario(scenario);

      const startTime = Date.now();
      
      const metrics = await integrationService.getIntegrationMetrics(scenario.project.id);
      
      const endTime = Date.now();
      const operationTime = endTime - startTime;

      expect(metrics).toBeDefined();
      expect(metrics.totalRequirements).toBeGreaterThan(0);
      expect(operationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.singleQuery);
    });
  });

  describe('Complex Query Performance', () => {
    beforeEach(async () => {
      // Setup complex test scenario with relationships
      const batchData = TestDataFactory.createBatchTestData(200);
      await setupLargeTestDataset(batchData);
    });

    it('should handle cross-module queries efficiently', async () => {
      const startTime = Date.now();
      
      const query = `
        MATCH (r:Requirement)
        WHERE r.id STARTS WITH "perf-test"
        OPTIONAL MATCH (r)-[:MAPPED_TO]->(m:RequirementArchitectureMapping)
        OPTIONAL MATCH (m)-[:MAPS_TO_DECISION]->(a:ArchitectureDecision)
        RETURN 
          r.type as requirementType,
          count(DISTINCT r) as requirementCount,
          count(DISTINCT m) as mappingCount,
          count(DISTINCT a) as decisionCount,
          avg(m.confidence) as avgConfidence
        ORDER BY requirementCount DESC
      `;

      const results = await neo4j.executeQuery(query);
      
      const endTime = Date.now();
      const operationTime = endTime - startTime;

      expect(results.length).toBeGreaterThan(0);
      expect(operationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.complexQuery);
    });

    it('should handle deep relationship traversal efficiently', async () => {
      const startTime = Date.now();
      
      const query = `
        MATCH (r:Requirement)
        WHERE r.id STARTS WITH "perf-test"
        MATCH path = (r)-[:MAPPED_TO*1..3]-(connected)
        RETURN 
          length(path) as pathLength,
          count(path) as pathCount,
          collect(DISTINCT type(connected)) as nodeTypes
        ORDER BY pathLength
        LIMIT 1000
      `;

      const results = await neo4j.executeQuery(query);
      
      const endTime = Date.now();
      const operationTime = endTime - startTime;

      expect(results.length).toBeGreaterThan(0);
      expect(operationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.complexQuery);
    });

    it('should handle aggregation queries with grouping efficiently', async () => {
      const startTime = Date.now();
      
      const query = `
        MATCH (p:Project)-[:CONTAINS]->(r:Requirement)
        WHERE p.id STARTS WITH "perf-test"
        OPTIONAL MATCH (r)-[:MAPPED_TO]->(m:RequirementArchitectureMapping)
        WITH p, r.type as reqType, r.priority as priority, m
        RETURN 
          p.id as projectId,
          reqType,
          priority,
          count(DISTINCT r) as requirementCount,
          count(DISTINCT m) as mappingCount,
          avg(m.confidence) as avgConfidence,
          min(m.confidence) as minConfidence,
          max(m.confidence) as maxConfidence
        ORDER BY requirementCount DESC
      `;

      const results = await neo4j.executeQuery(query);
      
      const endTime = Date.now();
      const operationTime = endTime - startTime;

      expect(results.length).toBeGreaterThan(0);
      expect(operationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.complexQuery);
    });
  });

  describe('Concurrent Operation Performance', () => {
    it('should handle concurrent requirement operations', async () => {
      const concurrencyLevel = 20;
      const operationsPerWorker = 10;

      const startTime = Date.now();
      
      // Create concurrent workers
      const workers = Array(concurrencyLevel).fill(null).map(async (_, workerIndex) => {
        const operations = [];
        
        for (let i = 0; i < operationsPerWorker; i++) {
          const operation = requirementsService.createRequirement({
            ...TestDataFactory.createRequirement(),
            title: `Concurrent Requirement ${workerIndex}-${i}`
          });
          operations.push(operation);
        }
        
        return Promise.all(operations);
      });

      const results = await Promise.all(workers);
      
      const endTime = Date.now();
      const operationTime = endTime - startTime;

      const totalRequirements = results.flat().length;
      expect(totalRequirements).toBe(concurrencyLevel * operationsPerWorker);
      expect(operationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.concurrentOperations);
    });

    it('should handle concurrent mapping operations', async () => {
      // Setup base entities
      const requirements = await Promise.all(
        Array(50).fill(null).map(() =>
          requirementsService.createRequirement(TestDataFactory.createRequirement())
        )
      );
      
      const decisions = await Promise.all(
        Array(50).fill(null).map(() =>
          decisionService.createDecision(TestDataFactory.createArchitectureDecision())
        )
      );

      const startTime = Date.now();
      
      // Create concurrent mapping operations
      const concurrentMappings = requirements.map(async (req, index) => {
        const decision = decisions[index % decisions.length];
        return integrationService.createMapping({
          requirementId: req.id,
          architectureDecisionId: decision.id,
          mappingType: RequirementMappingType.DIRECT,
          confidence: 0.5 + Math.random() * 0.5,
          rationale: `Concurrent mapping for ${req.id}`
        });
      });

      const mappings = await Promise.all(concurrentMappings);
      
      const endTime = Date.now();
      const operationTime = endTime - startTime;

      expect(mappings).toHaveLength(50);
      expect(operationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.concurrentOperations);
    });

    it('should handle mixed concurrent operations', async () => {
      const startTime = Date.now();
      
      // Mix of different operation types
      const mixedOperations = [
        // Create requirements
        ...Array(20).fill(null).map(() =>
          requirementsService.createRequirement(TestDataFactory.createRequirement())
        ),
        
        // Create decisions  
        ...Array(15).fill(null).map(() =>
          decisionService.createDecision(TestDataFactory.createArchitectureDecision())
        ),
        
        // Get metrics (multiple times)
        ...Array(10).fill(null).map(() =>
          integrationService.getIntegrationMetrics()
        ),
        
        // Perform health checks
        ...Array(5).fill(null).map(() =>
          integrationService.performHealthCheck()
        )
      ];

      const results = await Promise.all(mixedOperations);
      
      const endTime = Date.now();
      const operationTime = endTime - startTime;

      expect(results).toHaveLength(50);
      expect(operationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.concurrentOperations);
    });
  });

  describe('Memory Performance', () => {
    it('should not leak memory during repeated operations', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 100;

      // Perform repeated operations
      for (let i = 0; i < iterations; i++) {
        const requirement = await requirementsService.createRequirement(
          TestDataFactory.createRequirement()
        );
        
        const decision = await decisionService.createDecision(
          TestDataFactory.createArchitectureDecision()
        );
        
        await integrationService.createMapping({
          requirementId: requirement.id,
          architectureDecisionId: decision.id,
          mappingType: RequirementMappingType.DIRECT,
          confidence: 0.8,
          rationale: `Memory test iteration ${i}`
        });
        
        // Force garbage collection every 10 iterations
        if (i % 10 === 0 && global.gc) {
          global.gc();
        }
      }

      // Final garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryLimit);
    });

    it('should handle large result sets without excessive memory usage', async () => {
      // Create large dataset
      const largeDataset = TestDataFactory.createBatchTestData(500);
      await setupLargeTestDataset(largeDataset);

      const initialMemory = process.memoryUsage();

      // Query large result set
      const query = `
        MATCH (r:Requirement)
        WHERE r.id STARTS WITH "perf-test"
        OPTIONAL MATCH (r)-[:MAPPED_TO]->(m:RequirementArchitectureMapping)
        OPTIONAL MATCH (m)-[:MAPS_TO_DECISION]->(a:ArchitectureDecision)
        RETURN r, m, a
        LIMIT 1000
      `;

      const results = await neo4j.executeQuery(query);
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(results.length).toBeGreaterThan(0);
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryLimit);
    });
  });

  describe('Scalability Tests', () => {
    it('should scale linearly with data size for basic operations', async () => {
      const dataSizes = [10, 50, 100, 200];
      const performanceMetrics: Array<{ size: number; time: number }> = [];

      for (const size of dataSizes) {
        const startTime = Date.now();
        
        // Create test data of specified size
        const requirements = await Promise.all(
          Array(size).fill(null).map(() =>
            requirementsService.createRequirement(TestDataFactory.createRequirement())
          )
        );

        const endTime = Date.now();
        const operationTime = endTime - startTime;
        
        performanceMetrics.push({ size, time: operationTime });
        
        expect(requirements).toHaveLength(size);
        
        // Clean up for next iteration
        await cleanupTestRequirements(requirements.map(r => r.id));
      }

      // Verify scalability characteristics
      for (let i = 1; i < performanceMetrics.length; i++) {
        const prev = performanceMetrics[i - 1];
        const curr = performanceMetrics[i];
        
        // Time should scale roughly linearly (allowing for some variance)
        const scalingFactor = curr.time / prev.time;
        const sizeRatio = curr.size / prev.size;
        
        // Scaling factor should not be much worse than size ratio
        expect(scalingFactor).toBeLessThan(sizeRatio * 2);
      }
    });

    it('should maintain performance with increasing relationship density', async () => {
      const baselines = [];
      
      // Test with low relationship density (1:1)
      let startTime = Date.now();
      const requirements1 = await createTestRequirements(50);
      const decisions1 = await createTestDecisions(50);
      await createTestMappings(requirements1, decisions1, 1); // 1:1 mapping
      let endTime = Date.now();
      baselines.push({ density: 'low', time: endTime - startTime });

      // Test with medium relationship density (1:3)
      startTime = Date.now();
      const requirements2 = await createTestRequirements(50);
      const decisions2 = await createTestDecisions(150);
      await createTestMappings(requirements2, decisions2, 3); // 1:3 mapping
      endTime = Date.now();
      baselines.push({ density: 'medium', time: endTime - startTime });

      // Test with high relationship density (1:5)
      startTime = Date.now();
      const requirements3 = await createTestRequirements(50);
      const decisions3 = await createTestDecisions(250);
      await createTestMappings(requirements3, decisions3, 5); // 1:5 mapping
      endTime = Date.now();
      baselines.push({ density: 'high', time: endTime - startTime });

      // Performance should not degrade exponentially
      expect(baselines[1].time).toBeLessThan(baselines[0].time * 5);
      expect(baselines[2].time).toBeLessThan(baselines[0].time * 10);
    });
  });

  // Helper functions

  async function setupPerformanceScenario(scenario: any): Promise<void> {
    // Create project and stakeholder
    await neo4j.executeQuery(
      'CREATE (p:Project {id: $id, name: $name, description: $description, status: $status, createdAt: $createdAt})',
      scenario.project
    );

    await neo4j.executeQuery(
      'CREATE (s:Stakeholder {id: $id, name: $name, email: $email, role: $role, department: $department, createdAt: $createdAt})',
      scenario.stakeholder
    );

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

  async function setupLargeTestDataset(batchData: any): Promise<void> {
    const project = { ...TestDataFactory.createProject(), id: 'perf-test-project' };
    const stakeholder = { ...TestDataFactory.createStakeholder(), id: 'perf-test-stakeholder' };

    await neo4j.executeQuery(
      'CREATE (p:Project {id: $id, name: $name, description: $description, status: $status, createdAt: $createdAt})',
      project
    );

    await neo4j.executeQuery(
      'CREATE (s:Stakeholder {id: $id, name: $name, email: $email, role: $role, department: $department, createdAt: $createdAt})',
      stakeholder
    );

    // Create requirements and decisions in batches
    for (const reqData of batchData.requirements) {
      await requirementsService.createRequirement({
        ...reqData,
        id: reqData.id?.replace('test-', 'perf-test-') || reqData.id,
        projectId: project.id,
        stakeholderId: stakeholder.id
      });
    }

    for (const decisionData of batchData.decisions) {
      await decisionService.createDecision({
        ...decisionData,
        id: decisionData.id?.replace('test-', 'perf-test-') || decisionData.id
      });
    }

    for (const mappingData of batchData.mappings) {
      await integrationService.createMapping({
        ...mappingData,
        requirementId: mappingData.requirementId.replace('test-', 'perf-test-'),
        architectureDecisionId: mappingData.architectureDecisionId.replace('test-', 'perf-test-')
      });
    }
  }

  async function createTestRequirements(count: number): Promise<any[]> {
    return Promise.all(
      Array(count).fill(null).map((_, index) =>
        requirementsService.createRequirement({
          ...TestDataFactory.createRequirement(),
          title: `Performance Requirement ${index}`
        })
      )
    );
  }

  async function createTestDecisions(count: number): Promise<any[]> {
    return Promise.all(
      Array(count).fill(null).map((_, index) =>
        decisionService.createDecision({
          ...TestDataFactory.createArchitectureDecision(),
          title: `Performance Decision ${index}`
        })
      )
    );
  }

  async function createTestMappings(
    requirements: any[],
    decisions: any[],
    mappingsPerRequirement: number
  ): Promise<any[]> {
    const mappings = [];
    
    for (let i = 0; i < requirements.length; i++) {
      for (let j = 0; j < mappingsPerRequirement; j++) {
        const decisionIndex = (i * mappingsPerRequirement + j) % decisions.length;
        const mapping = await integrationService.createMapping({
          requirementId: requirements[i].id,
          architectureDecisionId: decisions[decisionIndex].id,
          mappingType: RequirementMappingType.DIRECT,
          confidence: 0.5 + Math.random() * 0.5,
          rationale: `Performance mapping ${i}-${j}`
        });
        mappings.push(mapping);
      }
    }
    
    return mappings;
  }

  async function cleanupTestRequirements(requirementIds: string[]): Promise<void> {
    if (requirementIds.length === 0) return;
    
    const query = `
      MATCH (r:Requirement)
      WHERE r.id IN $ids
      DETACH DELETE r
    `;
    
    await neo4j.executeQuery(query, { ids: requirementIds });
  }

  async function cleanupPerformanceTestData(): Promise<void> {
    const cleanupQueries = [
      'MATCH (m:RequirementArchitectureMapping) WHERE m.id CONTAINS "perf-test" DETACH DELETE m',
      'MATCH (r:Requirement) WHERE r.id CONTAINS "perf-test" DETACH DELETE r',
      'MATCH (a:ArchitectureDecision) WHERE a.id CONTAINS "perf-test" DETACH DELETE a',
      'MATCH (s:Stakeholder) WHERE s.id CONTAINS "perf-test" DETACH DELETE s',
      'MATCH (p:Project) WHERE p.id CONTAINS "perf-test" DETACH DELETE p'
    ];

    for (const query of cleanupQueries) {
      try {
        await neo4j.executeQuery(query);
      } catch (error) {
        console.warn('Performance test cleanup warning:', error);
      }
    }
  }
});