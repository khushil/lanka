import { ArchitectureService } from '../../../src/modules/architecture/services/architecture.service';
import { Neo4jService } from '../../../src/core/database/neo4j';
import { createMock } from 'jest-mock-extended';

jest.mock('../../../src/core/logging/logger');

describe('ArchitectureService', () => {
  let service: ArchitectureService;
  let mockNeo4j: jest.Mocked<Neo4jService>;

  const sampleArchitectureInput = {
    title: 'Microservices Architecture',
    description: 'Event-driven microservices with CQRS pattern',
    pattern: 'microservices',
    components: ['api-gateway', 'user-service', 'event-bus'],
    requirements: ['scalability', 'fault-tolerance']
  };

  beforeEach(() => {
    mockNeo4j = createMock<Neo4jService>();
    service = new ArchitectureService(mockNeo4j);
  });

  describe('createArchitectureDecision', () => {
    it('should create architecture decision with generated metadata', async () => {
      // Arrange
      const beforeTime = Date.now();

      // Act
      const result = await service.createArchitectureDecision(sampleArchitectureInput);

      // Assert
      const afterTime = Date.now();
      expect(result).toMatchObject({
        id: expect.stringMatching(/^arch-\d+$/),
        title: sampleArchitectureInput.title,
        description: sampleArchitectureInput.description,
        pattern: sampleArchitectureInput.pattern,
        components: sampleArchitectureInput.components,
        requirements: sampleArchitectureInput.requirements,
        createdAt: expect.any(String)
      });

      // Verify ID timestamp is within reasonable range
      const resultTime = parseInt(result.id.split('-')[1]);
      expect(resultTime).toBeGreaterThanOrEqual(beforeTime);
      expect(resultTime).toBeLessThanOrEqual(afterTime);

      // Verify ISO timestamp format
      expect(() => new Date(result.createdAt).toISOString()).not.toThrow();
    });

    it('should preserve all input properties', async () => {
      // Arrange
      const complexInput = {
        ...sampleArchitectureInput,
        version: '1.0.0',
        author: 'architect@example.com',
        tags: ['production', 'scalable'],
        metadata: {
          environment: 'cloud',
          region: 'us-east-1'
        }
      };

      // Act
      const result = await service.createArchitectureDecision(complexInput);

      // Assert - All properties should be preserved
      expect(result).toMatchObject(complexInput);
      expect(result.version).toBe('1.0.0');
      expect(result.author).toBe('architect@example.com');
      expect(result.tags).toEqual(['production', 'scalable']);
      expect(result.metadata).toEqual({
        environment: 'cloud',
        region: 'us-east-1'
      });
    });

    it('should handle empty and null inputs gracefully', async () => {
      // Act & Assert
      const result1 = await service.createArchitectureDecision({});
      const result2 = await service.createArchitectureDecision(null);
      const result3 = await service.createArchitectureDecision(undefined);

      // All should generate valid IDs and timestamps
      expect(result1.id).toMatch(/^arch-\d+$/);
      expect(result1.createdAt).toBeDefined();
      
      expect(result2.id).toMatch(/^arch-\d+$/);
      expect(result2.createdAt).toBeDefined();
      
      expect(result3.id).toMatch(/^arch-\d+$/);
      expect(result3.createdAt).toBeDefined();
    });

    it('should generate unique IDs for concurrent requests', async () => {
      // Arrange & Act
      const promises = Array.from({ length: 20 }, () =>
        service.createArchitectureDecision(sampleArchitectureInput)
      );
      const results = await Promise.all(promises);

      // Assert
      const ids = results.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(results.length);
    });
  });

  describe('findArchitecturePatterns', () => {
    it('should return empty array for placeholder implementation', async () => {
      // Arrange
      const requirementId = 'req-123';

      // Act
      const result = await service.findArchitecturePatterns(requirementId);

      // Assert
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle various requirement ID formats', async () => {
      // Arrange
      const testIds = [
        'req-123',
        'requirement-456',
        '',
        null,
        undefined,
        'special-chars-@#$',
        '12345'
      ];

      // Act
      const results = await Promise.all(
        testIds.map(id => service.findArchitecturePatterns(id as any))
      );

      // Assert - All should return empty arrays without errors
      results.forEach(result => {
        expect(result).toEqual([]);
        expect(Array.isArray(result)).toBe(true);
      });
    });

    it('should be consistent across multiple calls', async () => {
      // Arrange
      const requirementId = 'req-stable';

      // Act
      const results = await Promise.all([
        service.findArchitecturePatterns(requirementId),
        service.findArchitecturePatterns(requirementId),
        service.findArchitecturePatterns(requirementId)
      ]);

      // Assert
      results.forEach(result => {
        expect(result).toEqual([]);
      });
    });
  });

  describe('optimizeForEnvironment', () => {
    it('should return optimization results with correct structure', async () => {
      // Arrange
      const architectureId = 'arch-123';
      const environment = 'production';

      // Act
      const result = await service.optimizeForEnvironment(architectureId, environment);

      // Assert
      expect(result).toMatchObject({
        architectureId,
        environment,
        optimizations: expect.any(Array)
      });
      expect(result.optimizations).toEqual([]);
    });

    it('should handle different environment types', async () => {
      // Arrange
      const architectureId = 'arch-test';
      const environments = [
        'development',
        'staging', 
        'production',
        'testing',
        'qa',
        'dr', // disaster recovery
        'edge'
      ];

      // Act
      const results = await Promise.all(
        environments.map(env => service.optimizeForEnvironment(architectureId, env))
      );

      // Assert
      results.forEach((result, index) => {
        expect(result.architectureId).toBe(architectureId);
        expect(result.environment).toBe(environments[index]);
        expect(result.optimizations).toEqual([]);
      });
    });

    it('should handle edge cases and invalid inputs', async () => {
      // Act & Assert
      const result1 = await service.optimizeForEnvironment('', '');
      const result2 = await service.optimizeForEnvironment(null as any, null as any);
      const result3 = await service.optimizeForEnvironment('arch-1', undefined as any);

      expect(result1.architectureId).toBe('');
      expect(result1.environment).toBe('');
      
      expect(result2.architectureId).toBeNull();
      expect(result2.environment).toBeNull();
      
      expect(result3.architectureId).toBe('arch-1');
      expect(result3.environment).toBeUndefined();
    });

    it('should maintain consistent structure for all inputs', async () => {
      // Arrange
      const testCases = [
        ['arch-1', 'prod'],
        ['arch-2', 'dev'],
        ['', ''],
        [null, null]
      ];

      // Act
      const results = await Promise.all(
        testCases.map(([archId, env]) => 
          service.optimizeForEnvironment(archId as any, env as any)
        )
      );

      // Assert
      results.forEach(result => {
        expect(result).toHaveProperty('architectureId');
        expect(result).toHaveProperty('environment');
        expect(result).toHaveProperty('optimizations');
        expect(Array.isArray(result.optimizations)).toBe(true);
      });
    });
  });

  describe('Service Integration and Dependencies', () => {
    it('should properly inject Neo4j dependency', () => {
      // Arrange & Act
      const newService = new ArchitectureService(mockNeo4j);

      // Assert
      expect(newService).toBeInstanceOf(ArchitectureService);
      expect((newService as any).neo4j).toBe(mockNeo4j);
    });

    it('should maintain independence between service instances', async () => {
      // Arrange
      const mockNeo4j2 = createMock<Neo4jService>();
      const service1 = new ArchitectureService(mockNeo4j);
      const service2 = new ArchitectureService(mockNeo4j2);

      // Act
      const result1 = await service1.createArchitectureDecision({ name: 'arch1' });
      const result2 = await service2.createArchitectureDecision({ name: 'arch2' });

      // Assert
      expect(result1.name).toBe('arch1');
      expect(result2.name).toBe('arch2');
      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle concurrent operations efficiently', async () => {
      // Arrange
      const concurrencyLevel = 30;
      const startTime = Date.now();

      // Act
      const operations = Array.from({ length: concurrencyLevel }, (_, i) => [
        service.createArchitectureDecision({ index: i }),
        service.findArchitecturePatterns(`req-${i}`),
        service.optimizeForEnvironment(`arch-${i}`, 'test')
      ]).flat();

      const results = await Promise.all(operations);
      const duration = Date.now() - startTime;

      // Assert
      expect(results).toHaveLength(concurrencyLevel * 3);
      expect(duration).toBeLessThan(200); // Should be fast for mocked operations
    });

    it('should not throw errors for any valid method calls', async () => {
      // Act & Assert - None of these should throw
      await expect(service.createArchitectureDecision({})).resolves.toBeDefined();
      await expect(service.findArchitecturePatterns('test')).resolves.toBeDefined();
      await expect(service.optimizeForEnvironment('arch', 'env')).resolves.toBeDefined();
    });

    it('should maintain consistent response times', async () => {
      // Arrange
      const iterations = 10;
      const durations: number[] = [];

      // Act
      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await service.createArchitectureDecision({ iteration: i });
        durations.push(Date.now() - start);
      }

      // Assert - All operations should be reasonably fast and consistent
      const avgDuration = durations.reduce((a, b) => a + b) / durations.length;
      const maxDuration = Math.max(...durations);
      
      expect(avgDuration).toBeLessThan(10); // Average under 10ms
      expect(maxDuration).toBeLessThan(50); // No single operation over 50ms
    });
  });
});