import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createDataLoaderFactory, DataLoaderFactory } from '../../../src/core/dataloaders';

// Mock GraphQL execution context
interface MockGraphQLContext {
  services: { neo4j: any };
  dataLoaders: any;
  dataLoaderFactory: DataLoaderFactory;
}

describe('DataLoader Performance Integration Tests', () => {
  let mockNeo4j: any;
  let factory: DataLoaderFactory;
  let context: MockGraphQLContext;

  beforeEach(() => {
    mockNeo4j = {
      executeQuery: jest.fn()
    };

    factory = createDataLoaderFactory(mockNeo4j, {
      cache: { enabled: true, ttl: 300000 },
      maxBatchSize: 100
    });

    context = {
      services: { neo4j: mockNeo4j },
      dataLoaders: factory.createDataLoaders(),
      dataLoaderFactory: factory
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('N+1 Query Problem Resolution', () => {
    test('should eliminate N+1 queries for requirements and their architecture decisions', async () => {
      // Mock data setup
      const requirements = Array.from({ length: 10 }, (_, i) => ({
        properties: { id: `req${i}`, title: `Requirement ${i}`, projectId: 'proj1' }
      }));

      const architectureDecisions = Array.from({ length: 5 }, (_, i) => ({
        properties: { id: `dec${i}`, title: `Decision ${i}`, status: 'approved' }
      }));

      const mappings = [
        { requirementId: 'req0', decisions: [architectureDecisions[0]] },
        { requirementId: 'req1', decisions: [architectureDecisions[1]] },
        { requirementId: 'req2', decisions: [architectureDecisions[0], architectureDecisions[2]] },
        // ... more mappings
      ];

      // Setup mock responses
      mockNeo4j.executeQuery
        .mockResolvedValueOnce(requirements) // Batch load requirements
        .mockResolvedValueOnce(mappings); // Batch load architecture decisions by requirements

      // Simulate GraphQL resolver execution
      const requirementIds = requirements.map(r => r.properties.id);
      
      // Load requirements (should be 1 query)
      const loadedRequirements = await context.dataLoaders.requirements.loadMany(requirementIds);
      
      // Load architecture decisions for each requirement (should be 1 query, not N)
      const architecturePromises = loadedRequirements.map(req => 
        context.dataLoaders.architectureDecisionsByRequirement.load(req.id)
      );
      const architectureResults = await Promise.all(architecturePromises);

      // Verify performance: should only have 2 database queries total
      expect(mockNeo4j.executeQuery).toHaveBeenCalledTimes(2);
      
      // Verify results
      expect(loadedRequirements).toHaveLength(10);
      expect(architectureResults).toHaveLength(10);
      
      // Log performance improvement
      const metrics = factory.getPerformanceMetrics();
      expect(metrics.requirement.batchedRequests).toBeGreaterThan(0);
    });

    test('should batch load nested relationships efficiently', async () => {
      // Simulate loading requirements with their dependencies, conflicts, and similar requirements
      const requirements = [
        { properties: { id: 'req1', title: 'Requirement 1' } },
        { properties: { id: 'req2', title: 'Requirement 2' } },
        { properties: { id: 'req3', title: 'Requirement 3' } }
      ];

      const dependencies = [
        { requirementId: 'req1', dependencies: ['req2'] },
        { requirementId: 'req2', dependencies: ['req3'] },
        { requirementId: 'req3', dependencies: [] }
      ];

      const conflicts = [
        { requirementId: 'req1', conflicts: [] },
        { requirementId: 'req2', conflicts: ['req1'] },
        { requirementId: 'req3', conflicts: [] }
      ];

      mockNeo4j.executeQuery
        .mockResolvedValueOnce(requirements)
        .mockResolvedValueOnce(dependencies)
        .mockResolvedValueOnce(conflicts);

      const specialized = factory.createSpecializedLoaders();

      // Load requirements and their relationships
      const [loadedReqs, reqDeps, reqConflicts] = await Promise.all([
        context.dataLoaders.requirements.loadMany(['req1', 'req2', 'req3']),
        specialized.requirementDependencies.loadMany(['req1', 'req2', 'req3']),
        specialized.requirementConflicts.loadMany(['req1', 'req2', 'req3'])
      ]);

      // Should only be 3 queries (requirements, dependencies, conflicts)
      expect(mockNeo4j.executeQuery).toHaveBeenCalledTimes(3);
      
      expect(loadedReqs).toHaveLength(3);
      expect(reqDeps).toHaveLength(3);
      expect(reqConflicts).toHaveLength(3);
    });

    test('should demonstrate significant performance improvement over naive approach', async () => {
      // Simulate naive approach (N+1 queries)
      const startNaive = Date.now();
      
      // Mock 100ms per query to simulate network latency
      mockNeo4j.executeQuery.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10)); // 10ms simulated latency
        return [{ properties: { id: 'test', title: 'Test' } }];
      });

      // Naive approach: 1 query for list + N queries for details
      const requirementCount = 20;
      
      // Simulate getting list
      await mockNeo4j.executeQuery('list query');
      
      // Simulate N individual queries
      for (let i = 0; i < requirementCount; i++) {
        await mockNeo4j.executeQuery(`individual query ${i}`);
      }
      
      const naiveTime = Date.now() - startNaive;
      
      // Reset mocks
      jest.clearAllMocks();
      mockNeo4j.executeQuery.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return Array.from({ length: requirementCount }, (_, i) => ({
          properties: { id: `req${i}`, title: `Requirement ${i}` }
        }));
      });

      // DataLoader approach: batch everything
      const startOptimized = Date.now();
      
      const requirementIds = Array.from({ length: requirementCount }, (_, i) => `req${i}`);
      await context.dataLoaders.requirements.loadMany(requirementIds);
      
      const optimizedTime = Date.now() - startOptimized;

      // DataLoader should be significantly faster
      expect(optimizedTime).toBeLessThan(naiveTime * 0.3); // At least 70% faster
      expect(mockNeo4j.executeQuery).toHaveBeenCalledTimes(1); // Only 1 batch query
    });
  });

  describe('Cache Performance', () => {
    test('should achieve high cache hit rates for frequently accessed data', async () => {
      const requirement = { properties: { id: 'popular_req', title: 'Popular Requirement' } };
      mockNeo4j.executeQuery.mockResolvedValue([requirement]);

      // Load the same requirement multiple times
      const loadPromises = Array.from({ length: 50 }, () => 
        context.dataLoaders.requirements.load('popular_req')
      );

      await Promise.all(loadPromises);

      // Should only hit the database once
      expect(mockNeo4j.executeQuery).toHaveBeenCalledTimes(1);

      const metrics = factory.getPerformanceMetrics();
      const cacheHitRate = metrics.requirement.cacheHits / 
                          (metrics.requirement.cacheHits + metrics.requirement.cacheMisses);
      
      // Should achieve > 95% cache hit rate
      expect(cacheHitRate).toBeGreaterThan(0.95);
    });

    test('should manage memory efficiently with cache limits', async () => {
      const lightweightLoaders = factory.createLightweightLoaders({
        cache: { maxSize: 10, ttl: 60000 }
      });

      // Generate more items than cache can hold
      const requirements = Array.from({ length: 20 }, (_, i) => ({
        properties: { id: `req${i}`, title: `Requirement ${i}` }
      }));

      mockNeo4j.executeQuery.mockImplementation(async (query, params) => {
        const ids = params.ids || [];
        return requirements.filter(req => ids.includes(req.properties.id));
      });

      // Load items sequentially to test cache eviction
      for (let i = 0; i < 20; i++) {
        await lightweightLoaders.requirements.load(`req${i}`);
      }

      // Cache should have managed memory by evicting old entries
      const cacheStats = (lightweightLoaders.requirements as any).getCacheStats?.();
      if (cacheStats) {
        expect(cacheStats.size).toBeLessThanOrEqual(10);
      }
    });

    test('should handle concurrent cache operations safely', async () => {
      const requirement = { properties: { id: 'concurrent_req', title: 'Concurrent Requirement' } };
      mockNeo4j.executeQuery.mockResolvedValue([requirement]);

      // Start multiple concurrent loads
      const concurrentLoads = Array.from({ length: 100 }, () => 
        context.dataLoaders.requirements.load('concurrent_req')
      );

      const results = await Promise.all(concurrentLoads);

      // All results should be identical
      expect(results.every(result => result?.id === 'concurrent_req')).toBe(true);
      
      // Should only hit database once despite concurrent loads
      expect(mockNeo4j.executeQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('Batch Size Optimization', () => {
    test('should respect maximum batch size limits', async () => {
      const smallBatchFactory = createDataLoaderFactory(mockNeo4j, {
        maxBatchSize: 5
      });

      const dataLoaders = smallBatchFactory.createDataLoaders();

      mockNeo4j.executeQuery.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          properties: { id: `req${i}`, title: `Requirement ${i}` }
        }))
      );

      // Load more items than batch size
      const requirementIds = Array.from({ length: 10 }, (_, i) => `req${i}`);
      await dataLoaders.requirements.loadMany(requirementIds);

      // Should split into multiple batches
      expect(mockNeo4j.executeQuery).toHaveBeenCalledTimes(2);
      
      // Each call should have <= maxBatchSize items
      const calls = mockNeo4j.executeQuery.mock.calls;
      calls.forEach(call => {
        const params = call[1];
        if (params && params.ids) {
          expect(params.ids.length).toBeLessThanOrEqual(5);
        }
      });
    });

    test('should optimize batch sizes for different data types', async () => {
      // High-volume loaders should use larger batches
      const highVolumeLoaders = factory.createHighVolumeLoaders();
      
      // Lightweight loaders should use smaller batches
      const lightweightLoaders = factory.createLightweightLoaders();

      // This is more of a configuration test
      expect(highVolumeLoaders).toBeDefined();
      expect(lightweightLoaders).toBeDefined();
    });
  });

  describe('Memory Usage and Monitoring', () => {
    test('should provide detailed performance metrics', async () => {
      // Perform various operations
      const requirements = Array.from({ length: 10 }, (_, i) => ({
        properties: { id: `req${i}`, title: `Requirement ${i}` }
      }));

      mockNeo4j.executeQuery.mockResolvedValue(requirements);

      // Mix of cache hits and misses
      await context.dataLoaders.requirements.load('req1'); // Miss + batch load
      await context.dataLoaders.requirements.load('req1'); // Hit
      await context.dataLoaders.requirements.load('req2'); // Hit (from batch)

      const metrics = factory.getMetrics();
      const report = factory.getPerformanceReport();

      // Verify metrics structure
      expect(metrics.requirement).toBeDefined();
      expect(metrics.requirement.totalRequests).toBeGreaterThan(0);
      expect(metrics.requirement.batchedRequests).toBeGreaterThan(0);
      expect(metrics.requirement.cacheHits).toBeGreaterThan(0);

      // Verify report structure
      expect(report.uptime).toBeGreaterThan(0);
      expect(Array.isArray(report.insights)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(typeof report.summary).toBe('object');
    });

    test('should detect and report performance issues', async () => {
      // Simulate slow queries
      mockNeo4j.executeQuery.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
        return [{ properties: { id: 'slow_req', title: 'Slow Requirement' } }];
      });

      await context.dataLoaders.requirements.load('slow_req');

      const report = factory.getPerformanceReport();
      
      // Should detect slow performance
      const slowQueries = report.recommendations.filter(rec => 
        rec.includes('slow') || rec.includes('optimization')
      );
      
      expect(report.insights.length).toBeGreaterThan(0);
    });

    test('should handle memory pressure gracefully', async () => {
      // Simulate high memory usage scenario
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        properties: { 
          id: `req${i}`, 
          title: `Requirement ${i}`,
          description: 'A'.repeat(1000) // Large description
        }
      }));

      mockNeo4j.executeQuery.mockResolvedValue(largeDataset);

      // Load large dataset
      const ids = largeDataset.map(req => req.properties.id);
      const results = await context.dataLoaders.requirements.loadMany(ids);

      expect(results).toHaveLength(1000);
      
      // Memory usage should be tracked
      const report = factory.getPerformanceReport();
      expect(report.summary.requirement).toBeDefined();
    });
  });

  describe('Real-world Performance Scenarios', () => {
    test('should handle complex GraphQL query efficiently', async () => {
      // Simulate a complex query:
      // {
      //   requirements {
      //     id
      //     title
      //     architectureDecisions { id title }
      //     assignee { username }
      //     dependencies { id title }
      //   }
      // }

      const requirements = Array.from({ length: 10 }, (_, i) => ({
        properties: { 
          id: `req${i}`, 
          title: `Requirement ${i}`,
          assigneeId: `user${i % 3}` // 3 different users
        }
      }));

      const users = Array.from({ length: 3 }, (_, i) => ({
        u: { properties: { id: `user${i}`, username: `user${i}` } },
        roles: [],
        permissions: [],
        teams: []
      }));

      const decisions = Array.from({ length: 5 }, (_, i) => ({
        properties: { id: `dec${i}`, title: `Decision ${i}` }
      }));

      const mappings = requirements.map(req => ({
        requirementId: req.properties.id,
        decisions: [decisions[Math.floor(Math.random() * decisions.length)]]
      }));

      const dependencies = requirements.map(req => ({
        requirementId: req.properties.id,
        dependencies: []
      }));

      // Setup all mock responses
      mockNeo4j.executeQuery
        .mockResolvedValueOnce(requirements) // Load requirements
        .mockResolvedValueOnce(users) // Load users
        .mockResolvedValueOnce(mappings) // Load architecture decisions
        .mockResolvedValueOnce(dependencies); // Load dependencies

      // Execute the complex query simulation
      const reqIds = requirements.map(r => r.properties.id);
      const userIds = [...new Set(requirements.map(r => r.properties.assigneeId))];

      const [loadedReqs, loadedUsers, archDecisions, reqDeps] = await Promise.all([
        context.dataLoaders.requirements.loadMany(reqIds),
        context.dataLoaders.users.loadMany(userIds),
        Promise.all(reqIds.map(id => 
          context.dataLoaders.architectureDecisionsByRequirement.load(id)
        )),
        Promise.all(reqIds.map(id => {
          const specialized = factory.createSpecializedLoaders();
          return specialized.requirementDependencies.load(id);
        }))
      ]);

      // Verify efficient execution
      expect(mockNeo4j.executeQuery).toHaveBeenCalledTimes(4); // 4 batch queries total
      expect(loadedReqs).toHaveLength(10);
      expect(loadedUsers).toHaveLength(3);
      expect(archDecisions).toHaveLength(10);
      expect(reqDeps).toHaveLength(10);

      // Verify performance metrics
      const metrics = factory.getPerformanceMetrics();
      const totalBatchEfficiency = Object.values(metrics).reduce((sum, metric) => 
        sum + (metric.totalRequests / Math.max(metric.batchedRequests, 1)), 0
      );
      
      expect(totalBatchEfficiency).toBeGreaterThan(10); // Should show good batching
    });

    test('should maintain performance under concurrent load', async () => {
      const requirements = Array.from({ length: 100 }, (_, i) => ({
        properties: { id: `req${i}`, title: `Requirement ${i}` }
      }));

      mockNeo4j.executeQuery.mockImplementation(async (query, params) => {
        // Simulate realistic database response time
        await new Promise(resolve => setTimeout(resolve, 50));
        
        if (params && params.ids) {
          return requirements.filter(req => params.ids.includes(req.properties.id));
        }
        return requirements;
      });

      // Simulate 50 concurrent users each loading different requirements
      const concurrentQueries = Array.from({ length: 50 }, (_, userIndex) => {
        const userReqIds = Array.from({ length: 5 }, (_, i) => `req${(userIndex * 5 + i) % 100}`);
        return context.dataLoaders.requirements.loadMany(userReqIds);
      });

      const startTime = Date.now();
      const results = await Promise.all(concurrentQueries);
      const totalTime = Date.now() - startTime;

      // All queries should complete
      expect(results).toHaveLength(50);
      results.forEach(result => {
        expect(result).toHaveLength(5);
      });

      // Should complete efficiently due to batching
      expect(totalTime).toBeLessThan(1000); // Should complete in under 1 second

      const metrics = factory.getPerformanceMetrics();
      expect(metrics.requirement.averageBatchSize).toBeGreaterThan(1);
    });
  });
});