import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { StorageLayer } from '../../../src/storage/storage-layer';
import { StorageMocks } from '../../mocks/storage-mocks';
import { MemoryFixtures } from '../../fixtures/memory-fixtures';
import { MemoryType } from '../../../src/types/memory';

describe('StorageLayer', () => {
  let storageLayer: StorageLayer;
  let mockNeo4j: any;
  let mockQdrant: any;
  let mockPostgres: any;
  let mockRedis: any;

  beforeEach(async () => {
    mockNeo4j = StorageMocks.createNeo4jDriverMock();
    mockQdrant = StorageMocks.createQdrantClientMock();
    mockPostgres = StorageMocks.createPostgresMock();
    mockRedis = StorageMocks.createRedisMock();

    storageLayer = new StorageLayer({
      neo4j: mockNeo4j.driver,
      qdrant: mockQdrant,
      postgres: mockPostgres,
      redis: mockRedis,
    });

    await storageLayer.initialize();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await storageLayer.cleanup();
  });

  describe('Memory Storage', () => {
    it('should store memory in all required systems', async () => {
      // Arrange
      const memory = MemoryFixtures.createSystem1Memory();
      
      mockNeo4j.session.run.mockResolvedValue({
        records: [{ get: () => ({ properties: memory }) }]
      });
      mockQdrant.upsert.mockResolvedValue({ operation_id: 'op_123' });
      mockPostgres.query.mockResolvedValue({ rows: [memory] });

      // Act
      const result = await storageLayer.storeMemory(memory);

      // Assert
      expect(mockNeo4j.session.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE'),
        expect.objectContaining({ id: memory.id })
      );
      expect(mockQdrant.upsert).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          points: expect.arrayContaining([
            expect.objectContaining({ id: memory.id })
          ])
        })
      );
      expect(mockPostgres.query).toHaveBeenCalled();
      expect(result).toEqual(memory);
    });

    it('should handle storage failures gracefully', async () => {
      // Arrange
      const memory = MemoryFixtures.createSystem1Memory();
      mockNeo4j.session.run.mockRejectedValue(new Error('Neo4j connection failed'));

      // Act & Assert
      await expect(storageLayer.storeMemory(memory))
        .rejects.toThrow('Failed to store memory');

      // Verify rollback occurred
      expect(mockQdrant.delete).toHaveBeenCalled();
    });

    it('should validate memory structure before storage', async () => {
      // Arrange
      const invalidMemory = {
        id: 'invalid_001',
        // Missing required fields
      } as any;

      // Act & Assert
      await expect(storageLayer.storeMemory(invalidMemory))
        .rejects.toThrow('Invalid memory structure');
    });

    it('should handle concurrent storage operations', async () => {
      // Arrange
      const memories = MemoryFixtures.createPerformanceTestData(10);
      
      mockNeo4j.session.run.mockResolvedValue({
        records: memories.map(m => ({ get: () => ({ properties: m }) }))
      });
      mockQdrant.upsert.mockResolvedValue({ operation_id: 'batch_op' });

      // Act
      const promises = memories.map(memory => storageLayer.storeMemory(memory));
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(10);
      expect(mockNeo4j.session.run).toHaveBeenCalledTimes(10);
      expect(mockQdrant.upsert).toHaveBeenCalledTimes(10);
    });
  });

  describe('Memory Retrieval', () => {
    it('should retrieve memory by ID from cache first', async () => {
      // Arrange
      const memory = MemoryFixtures.createSystem1Memory();
      mockRedis.get.mockResolvedValue(JSON.stringify(memory));

      // Act
      const result = await storageLayer.retrieveMemory(memory.id);

      // Assert
      expect(result).toEqual(memory);
      expect(mockRedis.get).toHaveBeenCalledWith(`memory:${memory.id}`);
      expect(mockNeo4j.session.run).not.toHaveBeenCalled(); // Should not hit database
    });

    it('should fall back to database when cache miss', async () => {
      // Arrange
      const memory = MemoryFixtures.createSystem1Memory();
      mockRedis.get.mockResolvedValue(null);
      mockNeo4j.session.run.mockResolvedValue({
        records: [{ get: () => ({ properties: memory }) }]
      });

      // Act
      const result = await storageLayer.retrieveMemory(memory.id);

      // Assert
      expect(result).toEqual(memory);
      expect(mockRedis.get).toHaveBeenCalled();
      expect(mockNeo4j.session.run).toHaveBeenCalled();
      expect(mockRedis.set).toHaveBeenCalledWith(
        `memory:${memory.id}`,
        JSON.stringify(memory),
        'EX',
        3600
      );
    });

    it('should handle retrieval failures', async () => {
      // Arrange
      const memoryId = 'nonexistent_001';
      mockRedis.get.mockResolvedValue(null);
      mockNeo4j.session.run.mockResolvedValue({ records: [] });

      // Act
      const result = await storageLayer.retrieveMemory(memoryId);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('Memory Search', () => {
    it('should perform semantic search using vector similarity', async () => {
      // Arrange
      const query = 'async programming patterns';
      const searchResults = [
        {
          id: 'mem_001',
          score: 0.95,
          payload: MemoryFixtures.createSystem1Memory({ id: 'mem_001' })
        }
      ];

      mockQdrant.search.mockResolvedValue(searchResults);

      // Act
      const result = await storageLayer.searchMemories(query, {
        type: MemoryType.SYSTEM_1,
        limit: 10,
      });

      // Assert
      expect(mockQdrant.search).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          vector: expect.any(Array),
          limit: 10,
          filter: expect.objectContaining({
            must: expect.arrayContaining([
              { key: 'type', match: { value: MemoryType.SYSTEM_1 } }
            ])
          })
        })
      );
      expect(result.memories).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter search results by workspace', async () => {
      // Arrange
      const query = 'coding patterns';
      const workspace = 'team-alpha';

      mockQdrant.search.mockResolvedValue([]);

      // Act
      await storageLayer.searchMemories(query, { workspace });

      // Assert
      expect(mockQdrant.search).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          filter: expect.objectContaining({
            must: expect.arrayContaining([
              { key: 'workspace', match: { value: workspace } }
            ])
          })
        })
      );
    });

    it('should handle search errors gracefully', async () => {
      // Arrange
      const query = 'test query';
      mockQdrant.search.mockRejectedValue(new Error('Vector search failed'));

      // Act & Assert
      await expect(storageLayer.searchMemories(query))
        .rejects.toThrow('Search operation failed');
    });
  });

  describe('Graph Operations', () => {
    it('should traverse memory relationships', async () => {
      // Arrange
      const memoryId = 'mem_001';
      const relatedMemories = [
        MemoryFixtures.createSystem1Memory({ id: 'related_001' }),
        MemoryFixtures.createSystem2Memory({ id: 'related_002' }),
      ];

      mockNeo4j.session.run.mockResolvedValue({
        records: relatedMemories.map(m => ({
          get: (key: string) => {
            if (key === 'related') return { properties: m };
            if (key === 'relationship') return { type: 'IMPLEMENTS' };
            return null;
          }
        }))
      });

      // Act
      const result = await storageLayer.getRelatedMemories(memoryId, {
        relationshipTypes: ['IMPLEMENTS', 'EVOLVED_FROM'],
        maxDepth: 2,
      });

      // Assert
      expect(mockNeo4j.session.run).toHaveBeenCalledWith(
        expect.stringContaining('MATCH'),
        expect.objectContaining({
          startId: memoryId,
          maxDepth: 2,
        })
      );
      expect(result).toHaveLength(2);
    });

    it('should create memory relationships', async () => {
      // Arrange
      const sourceId = 'mem_001';
      const targetId = 'mem_002';
      const relationshipType = 'IMPLEMENTS';

      mockNeo4j.session.run.mockResolvedValue({
        records: [{ get: () => ({ type: relationshipType }) }]
      });

      // Act
      await storageLayer.createRelationship(sourceId, targetId, relationshipType, {
        strength: 0.8,
        context: 'pattern implementation',
      });

      // Assert
      expect(mockNeo4j.session.run).toHaveBeenCalledWith(
        expect.stringContaining('MERGE'),
        expect.objectContaining({
          sourceId,
          targetId,
          type: relationshipType,
        })
      );
    });

    it('should detect memory clusters', async () => {
      // Arrange
      const clusterData = {
        records: [
          {
            get: () => ({
              cluster_id: 1,
              memories: ['mem_001', 'mem_002', 'mem_003'],
              theme: 'async-patterns',
            })
          }
        ]
      };

      mockNeo4j.session.run.mockResolvedValue(clusterData);

      // Act
      const clusters = await storageLayer.detectMemoryClusters();

      // Assert
      expect(clusters).toHaveLength(1);
      expect(clusters[0].theme).toBe('async-patterns');
      expect(clusters[0].memories).toHaveLength(3);
    });
  });

  describe('Memory Updates', () => {
    it('should update memory across all storage systems', async () => {
      // Arrange
      const memoryId = 'mem_001';
      const updates = {
        content: 'Updated async/await pattern with error handling',
        metadata: { confidence: 0.95, accessCount: 10 },
      };

      mockNeo4j.session.run.mockResolvedValue({
        records: [{ get: () => ({ properties: { id: memoryId, ...updates } }) }]
      });

      // Act
      const result = await storageLayer.updateMemory(memoryId, updates);

      // Assert
      expect(mockNeo4j.session.run).toHaveBeenCalledWith(
        expect.stringContaining('SET'),
        expect.objectContaining({ id: memoryId })
      );
      expect(mockQdrant.upsert).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalledWith(`memory:${memoryId}`);
      expect(result).toBeDefined();
    });

    it('should handle partial update failures', async () => {
      // Arrange
      const memoryId = 'mem_001';
      const updates = { content: 'Updated content' };

      mockNeo4j.session.run.mockResolvedValue({
        records: [{ get: () => ({ properties: { id: memoryId, ...updates } }) }]
      });
      mockQdrant.upsert.mockRejectedValue(new Error('Vector update failed'));

      // Act & Assert
      await expect(storageLayer.updateMemory(memoryId, updates))
        .rejects.toThrow('Failed to update memory');

      // Verify rollback
      expect(mockNeo4j.session.run).toHaveBeenCalledTimes(2); // Update + rollback
    });
  });

  describe('Memory Deletion', () => {
    it('should delete memory from all storage systems', async () => {
      // Arrange
      const memoryId = 'mem_001';

      mockNeo4j.session.run.mockResolvedValue({ records: [] });
      mockQdrant.delete.mockResolvedValue({ operation_id: 'delete_op' });

      // Act
      const result = await storageLayer.deleteMemory(memoryId);

      // Assert
      expect(mockNeo4j.session.run).toHaveBeenCalledWith(
        expect.stringContaining('DELETE'),
        expect.objectContaining({ id: memoryId })
      );
      expect(mockQdrant.delete).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalledWith(`memory:${memoryId}`);
      expect(result).toBe(true);
    });

    it('should handle cascading deletes for relationships', async () => {
      // Arrange
      const memoryId = 'mem_001';

      mockNeo4j.session.run.mockResolvedValue({
        records: [{ get: () => ({ count: 5 }) }]
      });

      // Act
      await storageLayer.deleteMemory(memoryId, { cascade: true });

      // Assert
      expect(mockNeo4j.session.run).toHaveBeenCalledWith(
        expect.stringContaining('DETACH DELETE'),
        expect.objectContaining({ id: memoryId })
      );
    });
  });

  describe('Batch Operations', () => {
    it('should perform batch inserts efficiently', async () => {
      // Arrange
      const memories = MemoryFixtures.createPerformanceTestData(100);

      mockNeo4j.session.run.mockResolvedValue({
        records: memories.map(m => ({ get: () => ({ properties: m }) }))
      });
      mockQdrant.upsert.mockResolvedValue({ operation_id: 'batch_insert' });

      // Act
      const start = Date.now();
      await storageLayer.batchStoreMemories(memories);
      const duration = Date.now() - start;

      // Assert
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(mockNeo4j.session.run).toHaveBeenCalledWith(
        expect.stringContaining('UNWIND'),
        expect.objectContaining({ memories: expect.any(Array) })
      );
    });

    it('should handle batch operation failures', async () => {
      // Arrange
      const memories = MemoryFixtures.createPerformanceTestData(10);
      mockNeo4j.session.run.mockRejectedValue(new Error('Batch operation failed'));

      // Act & Assert
      await expect(storageLayer.batchStoreMemories(memories))
        .rejects.toThrow('Batch storage failed');
    });
  });

  describe('Storage Health and Metrics', () => {
    it('should provide storage health status', async () => {
      // Arrange
      mockNeo4j.driver.verifyConnectivity.mockResolvedValue(undefined);
      mockQdrant.getCollection.mockResolvedValue({ status: 'green' });
      mockPostgres.query.mockResolvedValue({ rows: [{ version: '14.0' }] });
      mockRedis.ping?.mockResolvedValue('PONG');

      // Act
      const health = await storageLayer.getHealthStatus();

      // Assert
      expect(health.neo4j).toBe('healthy');
      expect(health.qdrant).toBe('healthy');
      expect(health.postgres).toBe('healthy');
      expect(health.redis).toBe('healthy');
      expect(health.overall).toBe('healthy');
    });

    it('should collect storage metrics', async () => {
      // Arrange
      mockNeo4j.session.run.mockResolvedValue({
        records: [{ get: () => ({ count: 1000 }) }]
      });
      mockQdrant.getCollection.mockResolvedValue({
        vectors_count: 1000,
        indexed_vectors_count: 950,
      });

      // Act
      const metrics = await storageLayer.getStorageMetrics();

      // Assert
      expect(metrics.totalMemories).toBe(1000);
      expect(metrics.vectorIndexSize).toBe(1000);
      expect(metrics.graphNodeCount).toBeDefined();
      expect(metrics.cacheHitRate).toBeDefined();
    });
  });
});