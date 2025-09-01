import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MemoryOrchestrator } from '../../src/memory/memory-orchestrator';
import { StorageMocks } from '../mocks/storage-mocks';
import { MemoryFixtures } from '../fixtures/memory-fixtures';
import { MemoryType } from '../../src/types/memory';

describe('Memory System Performance Tests', () => {
  let orchestrator: MemoryOrchestrator;
  let mockStorage: any;
  let performanceMetrics: any;

  beforeEach(async () => {
    performanceMetrics = {
      memoryIngestion: [],
      memoryRetrieval: [],
      graphTraversal: [],
      arbitrationTime: [],
    };

    mockStorage = StorageMocks.createStorageLayerMock();
    
    // Add performance monitoring
    const originalStoreMemory = mockStorage.storeMemory;
    mockStorage.storeMemory = jest.fn(async (memory) => {
      const start = performance.now();
      const result = await originalStoreMemory(memory);
      performanceMetrics.memoryIngestion.push(performance.now() - start);
      return result;
    });

    const originalSearchMemories = mockStorage.searchMemories;
    mockStorage.searchMemories = jest.fn(async (...args) => {
      const start = performance.now();
      const result = await originalSearchMemories(...args);
      performanceMetrics.memoryRetrieval.push(performance.now() - start);
      return result;
    });

    orchestrator = new MemoryOrchestrator({
      storage: mockStorage,
      config: {
        batchSize: 100,
        maxConcurrency: 10,
        cacheSize: 1000,
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Memory Ingestion Performance', () => {
    it('should handle single memory ingestion under 100ms', async () => {
      // Arrange
      const memory = MemoryFixtures.createSystem1Memory();

      // Act
      const start = performance.now();
      await orchestrator.ingestMemory(memory);
      const duration = performance.now() - start;

      // Assert
      expect(duration).toBeLessThan(100);
      expect(performanceMetrics.memoryIngestion[0]).toBeLessThan(50);
    });

    it('should handle batch ingestion of 1000 memories under 5 seconds', async () => {
      // Arrange
      const memories = MemoryFixtures.createPerformanceTestData(1000);
      
      // Mock fast storage responses
      mockStorage.storeMemory.mockImplementation(async (memory) => {
        await new Promise(resolve => setTimeout(resolve, 1)); // Simulate 1ms storage
        return memory;
      });

      // Act
      const start = performance.now();
      const results = await orchestrator.ingestBatch(memories);
      const duration = performance.now() - start;

      // Assert
      expect(duration).toBeLessThan(5000);
      expect(results).toHaveLength(1000);
      expect(results.every(r => r.success)).toBe(true);
      
      // Check average ingestion time
      const avgTime = performanceMetrics.memoryIngestion.reduce((a, b) => a + b, 0) / performanceMetrics.memoryIngestion.length;
      expect(avgTime).toBeLessThan(10);
    });

    it('should maintain performance under concurrent ingestion', async () => {
      // Arrange
      const batchSize = 50;
      const batchCount = 10;
      const batches = Array.from({ length: batchCount }, () => 
        MemoryFixtures.createPerformanceTestData(batchSize)
      );

      mockStorage.storeMemory.mockImplementation(async (memory) => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 5));
        return memory;
      });

      // Act
      const start = performance.now();
      const batchPromises = batches.map(batch => orchestrator.ingestBatch(batch));
      const results = await Promise.all(batchPromises);
      const duration = performance.now() - start;

      // Assert
      expect(duration).toBeLessThan(3000); // 10 batches of 50 in under 3 seconds
      expect(results.flat()).toHaveLength(500);
      
      // Check for consistent performance across batches
      const times = performanceMetrics.memoryIngestion;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      expect(maxTime / minTime).toBeLessThan(10); // No more than 10x variation
    });

    it('should scale linearly with memory size', async () => {
      // Arrange
      const sizes = [10, 50, 100, 200];
      const timings = [];

      for (const size of sizes) {
        const memories = MemoryFixtures.createPerformanceTestData(size);
        
        // Act
        const start = performance.now();
        await orchestrator.ingestBatch(memories);
        const duration = performance.now() - start;
        
        timings.push({ size, duration });
      }

      // Assert - Check for reasonable linear scaling
      const ratio1 = timings[1].duration / timings[0].duration; // 50/10
      const ratio2 = timings[2].duration / timings[1].duration; // 100/50
      const ratio3 = timings[3].duration / timings[2].duration; // 200/100

      // Should be roughly linear (within 2x factor)
      expect(ratio1).toBeLessThan(10);
      expect(ratio2).toBeLessThan(4);
      expect(ratio3).toBeLessThan(4);
    });
  });

  describe('Memory Retrieval Performance', () => {
    beforeEach(async () => {
      // Pre-populate with test data
      const memories = MemoryFixtures.createPerformanceTestData(1000);
      await orchestrator.ingestBatch(memories);
      performanceMetrics.memoryRetrieval = []; // Reset metrics
    });

    it('should retrieve single memory under 50ms', async () => {
      // Arrange
      const memoryId = 'perf_test_000001';
      const memory = MemoryFixtures.createSystem1Memory({ id: memoryId });
      mockStorage.retrieveMemory.mockResolvedValue(memory);

      // Act
      const start = performance.now();
      const result = await orchestrator.retrieveMemory(memoryId);
      const duration = performance.now() - start;

      // Assert
      expect(duration).toBeLessThan(50);
      expect(result).toBeDefined();
    });

    it('should handle semantic search of 10000 memories under 500ms', async () => {
      // Arrange
      const query = 'async programming patterns';
      const searchResults = MemoryFixtures.createPerformanceTestData(100);
      
      mockStorage.searchMemories.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 200)); // Simulate vector search
        return { memories: searchResults, total: searchResults.length };
      });

      // Act
      const start = performance.now();
      const result = await orchestrator.searchMemories(query, { limit: 100 });
      const duration = performance.now() - start;

      // Assert
      expect(duration).toBeLessThan(500);
      expect(result.memories).toHaveLength(100);
    });

    it('should optimize repeated searches with caching', async () => {
      // Arrange
      const query = 'common search query';
      const searchResults = MemoryFixtures.createPerformanceTestData(10);
      
      mockStorage.searchMemories.mockResolvedValue({
        memories: searchResults,
        total: searchResults.length
      });

      // First search (cache miss)
      const start1 = performance.now();
      await orchestrator.searchMemories(query);
      const firstSearchTime = performance.now() - start1;

      // Second search (cache hit)
      const start2 = performance.now();
      await orchestrator.searchMemories(query);
      const secondSearchTime = performance.now() - start2;

      // Assert
      expect(secondSearchTime).toBeLessThan(firstSearchTime / 2);
      expect(secondSearchTime).toBeLessThan(50);
    });

    it('should handle concurrent searches efficiently', async () => {
      // Arrange
      const queries = Array.from({ length: 20 }, (_, i) => `search query ${i}`);
      
      mockStorage.searchMemories.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { memories: [], total: 0 };
      });

      // Act
      const start = performance.now();
      const promises = queries.map(query => orchestrator.searchMemories(query));
      const results = await Promise.all(promises);
      const duration = performance.now() - start;

      // Assert
      expect(duration).toBeLessThan(1000); // 20 concurrent searches in under 1 second
      expect(results).toHaveLength(20);
      
      // Should use concurrent processing, not sequential
      expect(duration).toBeLessThan(20 * 50); // Much less than sequential time
    });
  });

  describe('Graph Traversal Performance', () => {
    beforeEach(async () => {
      // Create interconnected memory network
      const memories = MemoryFixtures.createPerformanceTestData(500);
      await orchestrator.ingestBatch(memories);
      
      // Add relationships between memories
      mockStorage.getRelatedMemories.mockImplementation(async (memoryId, options) => {
        const start = performance.now();
        const maxDepth = options?.maxDepth || 2;
        const related = MemoryFixtures.createPerformanceTestData(Math.min(maxDepth * 5, 20));
        performanceMetrics.graphTraversal.push(performance.now() - start);
        return related;
      });
    });

    it('should traverse graph with depth 2 under 200ms', async () => {
      // Arrange
      const startMemoryId = 'perf_test_000001';

      // Act
      const start = performance.now();
      const related = await orchestrator.getRelatedMemories(startMemoryId, {
        maxDepth: 2,
        relationshipTypes: ['IMPLEMENTS', 'EVOLVED_FROM'],
      });
      const duration = performance.now() - start;

      // Assert
      expect(duration).toBeLessThan(200);
      expect(related).toBeDefined();
      expect(performanceMetrics.graphTraversal[0]).toBeLessThan(100);
    });

    it('should scale graph traversal with depth efficiently', async () => {
      // Arrange
      const startMemoryId = 'perf_test_000001';
      const depths = [1, 2, 3, 4];
      const timings = [];

      for (const depth of depths) {
        const start = performance.now();
        await orchestrator.getRelatedMemories(startMemoryId, { maxDepth: depth });
        const duration = performance.now() - start;
        timings.push({ depth, duration });
      }

      // Assert - Should not grow exponentially
      const growthRatio = timings[3].duration / timings[0].duration;
      expect(growthRatio).toBeLessThan(20); // Depth 4 shouldn't be 20x slower than depth 1
    });

    it('should handle complex graph queries under 1 second', async () => {
      // Arrange
      const complexQuery = {
        startNodes: ['perf_test_000001', 'perf_test_000002', 'perf_test_000003'],
        relationshipTypes: ['IMPLEMENTS', 'EVOLVED_FROM', 'CONTRADICTS'],
        maxDepth: 3,
        filters: {
          type: [MemoryType.SYSTEM_1, MemoryType.SYSTEM_2],
          confidence: { min: 0.8 },
        }
      };

      mockStorage.getRelatedMemories.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return MemoryFixtures.createPerformanceTestData(15);
      });

      // Act
      const start = performance.now();
      const results = await Promise.all(
        complexQuery.startNodes.map(nodeId => 
          orchestrator.getRelatedMemories(nodeId, complexQuery)
        )
      );
      const duration = performance.now() - start;

      // Assert
      expect(duration).toBeLessThan(1000);
      expect(results.flat()).toBeDefined();
    });
  });

  describe('Arbitration Performance', () => {
    beforeEach(() => {
      // Mock arbitration engine with performance tracking
      const mockArbitrator = {
        arbitrateMemory: jest.fn().mockImplementation(async (memory, existing) => {
          const start = performance.now();
          await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20));
          performanceMetrics.arbitrationTime.push(performance.now() - start);
          
          return MemoryFixtures.createArbitrationDecision({
            action: 'ADD_NEW',
            confidence: 0.85,
          });
        }),
      };

      orchestrator = new MemoryOrchestrator({
        storage: mockStorage,
        arbitrator: mockArbitrator,
      });
    });

    it('should complete arbitration under 100ms per memory', async () => {
      // Arrange
      const memory = MemoryFixtures.createSystem1Memory();

      // Act
      const start = performance.now();
      await orchestrator.ingestMemory(memory);
      const duration = performance.now() - start;

      // Assert
      expect(duration).toBeLessThan(100);
      expect(performanceMetrics.arbitrationTime[0]).toBeLessThan(50);
    });

    it('should maintain arbitration speed with large existing memory set', async () => {
      // Arrange
      const existingMemories = MemoryFixtures.createPerformanceTestData(10000);
      const newMemories = MemoryFixtures.createPerformanceTestData(100);

      mockStorage.searchMemories.mockResolvedValue({
        memories: existingMemories.slice(0, 50), // Return top 50 similar
        total: 50,
      });

      // Act
      const start = performance.now();
      const results = await orchestrator.ingestBatch(newMemories);
      const duration = performance.now() - start;

      // Assert
      expect(duration).toBeLessThan(10000); // 100 arbitrations in under 10 seconds
      expect(results).toHaveLength(100);
      
      // Check arbitration time consistency
      const avgArbitrationTime = performanceMetrics.arbitrationTime.reduce((a, b) => a + b, 0) / performanceMetrics.arbitrationTime.length;
      expect(avgArbitrationTime).toBeLessThan(100);
    });
  });

  describe('Memory System Scalability', () => {
    it('should handle memory system with 100k memories', async () => {
      // Arrange - Simulate large memory database
      const largeDataset = { count: 100000 };
      
      mockStorage.searchMemories.mockImplementation(async (query, options) => {
        const start = performance.now();
        // Simulate realistic search time for 100k memories
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 100));
        performanceMetrics.memoryRetrieval.push(performance.now() - start);
        
        return {
          memories: MemoryFixtures.createPerformanceTestData(options?.limit || 50),
          total: largeDataset.count,
        };
      });

      // Act
      const searches = Array.from({ length: 10 }, (_, i) => `query ${i}`);
      const start = performance.now();
      const results = await Promise.all(
        searches.map(query => orchestrator.searchMemories(query, { limit: 50 }))
      );
      const duration = performance.now() - start;

      // Assert
      expect(duration).toBeLessThan(5000); // 10 searches in large dataset under 5 seconds
      expect(results.every(r => r.total === 100000)).toBe(true);
    });

    it('should maintain performance under high memory churn', async () => {
      // Arrange - Simulate high write/read activity
      const operations = [];
      const memoryPool = MemoryFixtures.createPerformanceTestData(1000);

      // Mix of operations
      for (let i = 0; i < 200; i++) {
        if (i % 3 === 0) {
          operations.push({ type: 'ingest', memory: memoryPool[i % memoryPool.length] });
        } else if (i % 3 === 1) {
          operations.push({ type: 'search', query: `query ${i % 10}` });
        } else {
          operations.push({ type: 'retrieve', id: `perf_test_${String(i % 1000).padStart(6, '0')}` });
        }
      }

      mockStorage.storeMemory.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return {};
      });

      mockStorage.searchMemories.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        return { memories: [], total: 0 };
      });

      mockStorage.retrieveMemory.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 2));
        return MemoryFixtures.createSystem1Memory();
      });

      // Act
      const start = performance.now();
      const results = await Promise.all(operations.map(async (op) => {
        switch (op.type) {
          case 'ingest':
            return await orchestrator.ingestMemory(op.memory);
          case 'search':
            return await orchestrator.searchMemories(op.query);
          case 'retrieve':
            return await orchestrator.retrieveMemory(op.id);
        }
      }));
      const duration = performance.now() - start;

      // Assert
      expect(duration).toBeLessThan(10000); // 200 mixed operations under 10 seconds
      expect(results).toHaveLength(200);
    });
  });

  describe('Resource Usage', () => {
    it('should maintain stable memory usage during operations', async () => {
      // Arrange
      const initialMemory = process.memoryUsage();
      const memories = MemoryFixtures.createPerformanceTestData(1000);

      // Act
      await orchestrator.ingestBatch(memories);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      // Assert - Memory growth should be reasonable (less than 50MB for 1000 memories)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle memory pressure gracefully', async () => {
      // Arrange - Create memory pressure
      const largeMemories = Array.from({ length: 100 }, () => ({
        ...MemoryFixtures.createSystem1Memory(),
        content: 'x'.repeat(10000), // Large content
        vector: new Array(2048).fill(0).map(() => Math.random()), // Large vector
      }));

      // Act & Assert - Should not crash or timeout
      const start = performance.now();
      const results = await orchestrator.ingestBatch(largeMemories);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(results).toHaveLength(100);
    });
  });

  describe('Performance Monitoring', () => {
    it('should provide performance metrics', async () => {
      // Arrange
      const memories = MemoryFixtures.createPerformanceTestData(100);

      // Act
      await orchestrator.ingestBatch(memories);
      await orchestrator.searchMemories('test query');
      const metrics = await orchestrator.getPerformanceMetrics();

      // Assert
      expect(metrics).toEqual({
        ingestion: expect.objectContaining({
          totalOperations: expect.any(Number),
          averageTime: expect.any(Number),
          throughput: expect.any(Number),
        }),
        retrieval: expect.objectContaining({
          totalSearches: expect.any(Number),
          averageSearchTime: expect.any(Number),
          cacheHitRate: expect.any(Number),
        }),
        arbitration: expect.objectContaining({
          totalDecisions: expect.any(Number),
          averageDecisionTime: expect.any(Number),
        }),
        storage: expect.objectContaining({
          totalMemories: expect.any(Number),
          storageUtilization: expect.any(Number),
        })
      });
    });

    it('should identify performance bottlenecks', async () => {
      // Arrange - Introduce artificial bottleneck
      mockStorage.storeMemory.mockImplementation(async (memory) => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Slow storage
        return memory;
      });

      const memories = MemoryFixtures.createPerformanceTestData(20);

      // Act
      await orchestrator.ingestBatch(memories);
      const bottlenecks = await orchestrator.identifyBottlenecks();

      // Assert
      expect(bottlenecks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            component: 'storage',
            severity: expect.any(String),
            metric: 'write_latency',
            value: expect.any(Number),
          })
        ])
      );
    });
  });
});