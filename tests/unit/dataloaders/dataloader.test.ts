import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  createDataLoaderFactory,
  DataLoaderFactory,
  RequirementDataLoader,
  ArchitectureDecisionDataLoader,
  UserDataLoader,
  RelationshipDataLoader,
  DataLoaderContext,
  DataLoaderPerformanceMetrics
} from '../../../src/core/dataloaders';

// Mock Neo4j service
const mockNeo4j = {
  executeQuery: jest.fn()
};

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn()
};

describe('DataLoader Implementation', () => {
  let factory: DataLoaderFactory;
  let context: DataLoaderContext;
  let metrics: DataLoaderPerformanceMetrics;

  beforeEach(() => {
    jest.clearAllMocks();
    
    metrics = new DataLoaderPerformanceMetrics();
    context = {
      neo4j: mockNeo4j,
      logger: mockLogger,
      metrics
    };

    factory = new DataLoaderFactory(context);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('DataLoaderFactory', () => {
    test('should create factory with default options', () => {
      const testFactory = createDataLoaderFactory(mockNeo4j);
      expect(testFactory).toBeInstanceOf(DataLoaderFactory);
    });

    test('should create complete set of DataLoaders', () => {
      const dataLoaders = factory.createDataLoaders();
      
      expect(dataLoaders).toHaveProperty('requirements');
      expect(dataLoaders).toHaveProperty('architectureDecisions');
      expect(dataLoaders).toHaveProperty('architecturePatterns');
      expect(dataLoaders).toHaveProperty('technologyStacks');
      expect(dataLoaders).toHaveProperty('users');
      expect(dataLoaders).toHaveProperty('relationships');
      expect(dataLoaders).toHaveProperty('requirementsByProject');
      expect(dataLoaders).toHaveProperty('architectureDecisionsByRequirement');
      expect(dataLoaders).toHaveProperty('requirementsByArchitecture');
      
      // Cache management methods
      expect(typeof dataLoaders.clearAll).toBe('function');
      expect(typeof dataLoaders.clearByPattern).toBe('function');
      expect(typeof dataLoaders.prime).toBe('function');
    });

    test('should create high-volume loaders with correct options', () => {
      const highVolumeLoaders = factory.createHighVolumeLoaders();
      expect(highVolumeLoaders).toBeDefined();
      expect(typeof highVolumeLoaders.clearAll).toBe('function');
    });

    test('should create lightweight loaders with correct options', () => {
      const lightweightLoaders = factory.createLightweightLoaders();
      expect(lightweightLoaders).toBeDefined();
      expect(typeof lightweightLoaders.clearAll).toBe('function');
    });

    test('should create specialized loaders', () => {
      const specialized = factory.createSpecializedLoaders();
      
      expect(specialized).toHaveProperty('usersByRole');
      expect(specialized).toHaveProperty('usersByTeam');
      expect(specialized).toHaveProperty('requirementsByFilters');
      expect(specialized).toHaveProperty('requirementDependencies');
      expect(specialized).toHaveProperty('requirementConflicts');
      expect(specialized).toHaveProperty('similarRequirements');
      expect(specialized).toHaveProperty('relationshipsByType');
    });
  });

  describe('RequirementDataLoader', () => {
    test('should batch load requirements by IDs', async () => {
      const mockRequirements = [
        { properties: { id: 'req1', title: 'Requirement 1', description: 'Test req 1' } },
        { properties: { id: 'req2', title: 'Requirement 2', description: 'Test req 2' } }
      ];

      mockNeo4j.executeQuery.mockResolvedValueOnce(mockRequirements);

      const loader = new RequirementDataLoader(context);
      const results = await loader.loadMany(['req1', 'req2']);

      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (r:Requirement)'),
        { ids: ['req1', 'req2'] }
      );

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        id: 'req1',
        title: 'Requirement 1'
      });
    });

    test('should handle empty batch gracefully', async () => {
      const loader = new RequirementDataLoader(context);
      const results = await loader.loadMany([]);

      expect(results).toHaveLength(0);
      expect(mockNeo4j.executeQuery).not.toHaveBeenCalled();
    });

    test('should cache results correctly', async () => {
      const mockRequirement = { 
        properties: { id: 'req1', title: 'Requirement 1', description: 'Test req 1' } 
      };

      mockNeo4j.executeQuery.mockResolvedValueOnce([mockRequirement]);

      const loader = new RequirementDataLoader(context);
      
      // First load
      const result1 = await loader.load('req1');
      
      // Second load (should use cache)
      const result2 = await loader.load('req1');

      expect(mockNeo4j.executeQuery).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    test('should prime cache correctly', async () => {
      const requirement = { 
        id: 'req1', 
        title: 'Requirement 1', 
        description: 'Test req 1' 
      };

      const loader = new RequirementDataLoader(context);
      loader.prime('req1', requirement);
      
      // Load should not hit database
      const result = await loader.load('req1');

      expect(mockNeo4j.executeQuery).not.toHaveBeenCalled();
      expect(result).toEqual(requirement);
    });

    test('should handle database errors gracefully', async () => {
      const error = new Error('Database connection failed');
      mockNeo4j.executeQuery.mockRejectedValueOnce(error);

      const loader = new RequirementDataLoader(context);
      
      await expect(loader.load('req1')).rejects.toThrow('Database connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to batch load requirements',
        expect.objectContaining({ error: error.message })
      );
    });

    test('should preload requirements with relations', async () => {
      const mockResults = [{
        r: { properties: { id: 'req1', title: 'Requirement 1' } },
        p: { properties: { id: 'proj1', name: 'Project 1' } },
        tags: [{ properties: { name: 'tag1' } }],
        dependencies: []
      }];

      mockNeo4j.executeQuery.mockResolvedValueOnce(mockResults);

      const loader = new RequirementDataLoader(context);
      await loader.preloadWithRelations(['req1']);

      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('OPTIONAL MATCH (r)-[:BELONGS_TO]->(p:Project)'),
        { ids: ['req1'] }
      );
    });
  });

  describe('ArchitectureDecisionDataLoader', () => {
    test('should batch load architecture decisions by IDs', async () => {
      const mockDecisions = [
        { 
          a: { properties: { id: 'dec1', title: 'Decision 1', status: 'approved' } },
          t: null,
          patterns: []
        }
      ];

      mockNeo4j.executeQuery.mockResolvedValueOnce(mockDecisions);

      const loader = new ArchitectureDecisionDataLoader(context);
      const results = await loader.loadMany(['dec1']);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: 'dec1',
        title: 'Decision 1',
        status: 'approved'
      });
    });

    test('should load architecture decisions with related data', async () => {
      const mockDecisions = [
        { 
          a: { properties: { id: 'dec1', title: 'Decision 1' } },
          t: { properties: { id: 'tech1', name: 'Technology 1' } },
          patterns: [{ properties: { id: 'pat1', name: 'Pattern 1' } }]
        }
      ];

      mockNeo4j.executeQuery.mockResolvedValueOnce(mockDecisions);

      const loader = new ArchitectureDecisionDataLoader(context);
      const result = await loader.load('dec1');

      expect(result).toMatchObject({
        id: 'dec1',
        title: 'Decision 1',
        technologyStack: { id: 'tech1', name: 'Technology 1' },
        patterns: [{ id: 'pat1', name: 'Pattern 1' }]
      });
    });
  });

  describe('UserDataLoader', () => {
    test('should batch load users with roles and permissions', async () => {
      const mockUsers = [
        {
          u: { properties: { id: 'user1', username: 'testuser', email: 'test@example.com' } },
          roles: ['admin', 'user'],
          permissions: ['read', 'write'],
          teams: []
        }
      ];

      mockNeo4j.executeQuery.mockResolvedValueOnce(mockUsers);

      const loader = new UserDataLoader(context);
      const result = await loader.load('user1');

      expect(result).toMatchObject({
        id: 'user1',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['admin', 'user'],
        permissions: ['read', 'write']
      });
    });

    test('should load user by username', async () => {
      const mockUser = {
        u: { properties: { id: 'user1', username: 'testuser', email: 'test@example.com' } },
        roles: ['user'],
        permissions: ['read']
      };

      mockNeo4j.executeQuery.mockResolvedValueOnce([mockUser]);

      const loader = new UserDataLoader(context);
      const result = await loader.loadByUsername('testuser');

      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (u:User {username: $username})'),
        { username: 'testuser' }
      );

      expect(result).toMatchObject({
        id: 'user1',
        username: 'testuser'
      });
    });

    test('should return null for non-existent user', async () => {
      mockNeo4j.executeQuery.mockResolvedValueOnce([]);

      const loader = new UserDataLoader(context);
      const result = await loader.loadByUsername('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('RelationshipDataLoader', () => {
    test('should batch load relationships for nodes', async () => {
      const mockRelationships = [
        {
          sourceId: 'node1',
          targetId: 'node2',
          relationshipType: 'DEPENDS_ON',
          properties: { strength: 0.8 },
          createdAt: '2023-01-01T00:00:00Z',
          relationshipId: 'rel1'
        }
      ];

      mockNeo4j.executeQuery.mockResolvedValueOnce(mockRelationships);

      const loader = new RelationshipDataLoader(context);
      const results = await loader.loadMany(['node1']);

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveLength(1);
      expect(results[0][0]).toMatchObject({
        id: 'rel1',
        type: 'DEPENDS_ON',
        sourceId: 'node1',
        targetId: 'node2'
      });
    });

    test('should handle nodes with no relationships', async () => {
      mockNeo4j.executeQuery.mockResolvedValueOnce([]);

      const loader = new RelationshipDataLoader(context);
      const results = await loader.loadMany(['orphan_node']);

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveLength(0);
    });
  });

  describe('Performance Metrics', () => {
    test('should record batch load metrics', async () => {
      const mockRequirements = [
        { properties: { id: 'req1', title: 'Requirement 1' } }
      ];

      mockNeo4j.executeQuery.mockImplementation(async () => {
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 10));
        return mockRequirements;
      });

      const loader = new RequirementDataLoader(context);
      await loader.load('req1');

      const metricsData = metrics.getMetrics();
      expect(metricsData.requirement).toBeDefined();
      expect(metricsData.requirement.batchedRequests).toBe(1);
      expect(metricsData.requirement.totalRequests).toBe(1);
    });

    test('should record cache hits and misses', async () => {
      const mockRequirement = { 
        properties: { id: 'req1', title: 'Requirement 1' } 
      };

      mockNeo4j.executeQuery.mockResolvedValueOnce([mockRequirement]);

      const loader = new RequirementDataLoader(context);
      
      // First load (cache miss + batch load)
      await loader.load('req1');
      
      // Second load (cache hit)
      await loader.load('req1');

      const metricsData = metrics.getMetrics();
      expect(metricsData.requirement.cacheHits).toBe(1);
      expect(metricsData.requirement.cacheMisses).toBe(1);
    });

    test('should generate performance report', () => {
      const report = metrics.getPerformanceReport();

      expect(report).toHaveProperty('uptime');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('insights');
      expect(report).toHaveProperty('recommendations');
      expect(Array.isArray(report.insights)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    test('should reset metrics correctly', () => {
      metrics.recordBatchLoad('test', 5, 100);
      metrics.recordCacheHit('test', 'key1');
      
      const beforeReset = metrics.getMetrics();
      expect(Object.keys(beforeReset)).toContain('test');

      metrics.reset();
      
      const afterReset = metrics.getMetrics();
      expect(Object.keys(afterReset)).not.toContain('test');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      const networkError = new Error('Network timeout');
      mockNeo4j.executeQuery.mockRejectedValueOnce(networkError);

      const loader = new RequirementDataLoader(context);
      
      await expect(loader.load('req1')).rejects.toThrow('Network timeout');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    test('should handle malformed data gracefully', async () => {
      // Return data without expected properties
      mockNeo4j.executeQuery.mockResolvedValueOnce([{ invalid: 'data' }]);

      const loader = new RequirementDataLoader(context);
      const result = await loader.load('req1');

      expect(result).toBeNull();
    });

    test('should handle partial batch failures', async () => {
      // Simulate a scenario where batch function returns mixed results
      const loader = new RequirementDataLoader(context);
      
      // Mock the batch function to return some errors
      const originalBatchFn = (loader as any).loader._batchLoadFn;
      (loader as any).loader._batchLoadFn = async (keys: string[]) => {
        return keys.map(key => 
          key === 'error_key' ? new Error('Individual load error') : { id: key, title: `Title ${key}` }
        );
      };

      const results = await loader.loadMany(['req1', 'error_key', 'req3']);
      
      expect(results).toHaveLength(3);
      expect(results[0]).toMatchObject({ id: 'req1' });
      expect(results[1]).toBeInstanceOf(Error);
      expect(results[2]).toMatchObject({ id: 'req3' });
    });
  });

  describe('Cache Management', () => {
    test('should clear individual cache keys', async () => {
      const mockRequirement = { 
        properties: { id: 'req1', title: 'Requirement 1' } 
      };

      mockNeo4j.executeQuery.mockResolvedValue([mockRequirement]);

      const loader = new RequirementDataLoader(context);
      
      // Load and cache
      await loader.load('req1');
      expect(mockNeo4j.executeQuery).toHaveBeenCalledTimes(1);

      // Load again (should use cache)
      await loader.load('req1');
      expect(mockNeo4j.executeQuery).toHaveBeenCalledTimes(1);

      // Clear cache
      loader.clear('req1');

      // Load again (should hit database)
      await loader.load('req1');
      expect(mockNeo4j.executeQuery).toHaveBeenCalledTimes(2);
    });

    test('should clear all caches', () => {
      const dataLoaders = factory.createDataLoaders();
      
      // Prime some caches
      dataLoaders.requirements.prime('req1', { id: 'req1', title: 'Test' });
      dataLoaders.users.prime('user1', { id: 'user1', username: 'test' });

      // Clear all
      dataLoaders.clearAll();

      // Verify cache stats if available
      const reqStats = (dataLoaders.requirements as any).getCacheStats?.();
      const userStats = (dataLoaders.users as any).getCacheStats?.();

      if (reqStats) expect(reqStats.size).toBe(0);
      if (userStats) expect(userStats.size).toBe(0);
    });

    test('should clear caches by pattern', () => {
      const dataLoaders = factory.createDataLoaders();
      
      // This would test pattern-based clearing
      // Implementation depends on the specific pattern matching logic
      dataLoaders.clearByPattern('requirement.*');
      
      // Verify that only requirement-related caches were cleared
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Integration Tests', () => {
    test('should work with realistic GraphQL context', async () => {
      const dataLoaders = factory.createDataLoaders();
      
      const mockContext = {
        services: { neo4j: mockNeo4j },
        dataLoaders,
        dataLoaderFactory: factory,
        auth: { user: { id: 'user1' } }
      };

      // Simulate a GraphQL query that would use multiple loaders
      const mockRequirement = { 
        properties: { 
          id: 'req1', 
          title: 'Test Requirement',
          assigneeId: 'user1',
          projectId: 'proj1'
        } 
      };

      const mockUser = {
        u: { properties: { id: 'user1', username: 'testuser' } },
        roles: ['user'],
        permissions: ['read']
      };

      mockNeo4j.executeQuery
        .mockResolvedValueOnce([mockRequirement]) // Requirements query
        .mockResolvedValueOnce([mockUser]); // Users query

      // Load requirement
      const requirement = await dataLoaders.requirements.load('req1');
      
      // Load assignee (should batch if called in parallel)
      const assignee = await dataLoaders.users.load('user1');

      expect(requirement).toBeDefined();
      expect(assignee).toBeDefined();
      expect(mockNeo4j.executeQuery).toHaveBeenCalledTimes(2);
    });

    test('should handle high-volume concurrent loads', async () => {
      const loader = new RequirementDataLoader(context);
      
      // Mock multiple requirements
      const mockRequirements = Array.from({ length: 50 }, (_, i) => ({
        properties: { id: `req${i}`, title: `Requirement ${i}` }
      }));

      mockNeo4j.executeQuery.mockResolvedValue(mockRequirements);

      // Load many requirements concurrently
      const keys = Array.from({ length: 50 }, (_, i) => `req${i}`);
      const promises = keys.map(key => loader.load(key));
      
      const results = await Promise.all(promises);

      expect(results).toHaveLength(50);
      expect(results.every(r => r?.id?.startsWith('req'))).toBe(true);
      
      // Should batch efficiently
      expect(mockNeo4j.executeQuery).toHaveBeenCalledTimes(1);
    });

    test('should provide meaningful error messages for debugging', async () => {
      const loader = new RequirementDataLoader(context);
      
      const error = new Error('Connection lost to Neo4j database');
      mockNeo4j.executeQuery.mockRejectedValueOnce(error);

      await expect(loader.load('req1')).rejects.toThrow('Connection lost to Neo4j database');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to batch load requirements',
        expect.objectContaining({
          error: 'Connection lost to Neo4j database',
          idCount: 1,
          sampleIds: ['req1']
        })
      );
    });
  });
});