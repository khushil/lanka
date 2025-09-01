import { RequirementsService } from '../../src/modules/requirements/services/requirements.service';
import { NLPService } from '../../src/modules/requirements/services/nlp.service';
import { SimilarityService } from '../../src/modules/requirements/services/similarity.service';
import { MemoryOrchestratorService } from '../../src/modules/memory/services/memory-orchestrator.service';
import { Neo4jService } from '../../src/core/database/neo4j';
import { SecureQueryBuilder } from '../../src/utils/secure-query-builder';
import { createMock } from 'jest-mock-extended';

// Mock dependencies for performance testing
jest.mock('../../src/core/logging/logger');
jest.mock('../../src/modules/requirements/services/nlp.service');
jest.mock('../../src/modules/requirements/services/similarity.service');

describe('Service Performance Benchmarks', () => {
  let mockNeo4j: jest.Mocked<Neo4jService>;

  beforeEach(() => {
    mockNeo4j = createMock<Neo4jService>();
    mockNeo4j.executeQuery = jest.fn().mockResolvedValue([]);
  });

  describe('RequirementsService Performance', () => {
    let service: RequirementsService;
    let mockNLPService: jest.Mocked<NLPService>;
    let mockSimilarityService: jest.Mocked<SimilarityService>;

    beforeEach(() => {
      mockNLPService = createMock<NLPService>();
      mockSimilarityService = createMock<SimilarityService>();

      service = new RequirementsService(mockNeo4j);
      (service as any).nlpService = mockNLPService;
      (service as any).similarityService = mockSimilarityService;

      // Setup fast mock responses for performance testing
      mockNLPService.analyzeRequirement.mockResolvedValue({
        type: 'FUNCTIONAL' as any,
        priority: 'MEDIUM' as any,
        suggestedTitle: 'Test Title',
        entities: ['User'],
        keywords: ['login'],
        embedding: new Array(768).fill(0.1),
        completenessScore: 0.8,
        qualityScore: 0.9,
        suggestions: []
      });

      mockSimilarityService.findSimilarRequirements.mockResolvedValue([]);
    });

    it('should create requirements within performance target (< 500ms)', async () => {
      // Arrange
      const requirementData = {
        description: 'User should be able to login with email and password',
        title: 'User Authentication',
        type: 'FUNCTIONAL' as any,
        projectId: 'project-123',
        stakeholderId: 'stakeholder-456'
      };

      // Act & Measure
      const startTime = Date.now();
      await service.createRequirement(requirementData);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(500);
    });

    it('should handle concurrent requirement creation efficiently', async () => {
      // Arrange
      const requirementData = {
        description: 'Concurrent test requirement',
        projectId: 'project-test',
        stakeholderId: 'stakeholder-test'
      };

      const concurrencyLevel = 20;
      const promises = Array.from({ length: concurrencyLevel }, (_, i) => 
        service.createRequirement({
          ...requirementData,
          description: `Concurrent requirement ${i}`
        })
      );

      // Act & Measure
      const startTime = Date.now();
      await Promise.all(promises);
      const totalDuration = Date.now() - startTime;
      const avgDurationPerRequest = totalDuration / concurrencyLevel;

      // Assert
      expect(totalDuration).toBeLessThan(2000); // Total under 2 seconds
      expect(avgDurationPerRequest).toBeLessThan(200); // Average under 200ms
    });

    it('should maintain performance under load', async () => {
      // Arrange - Simulate realistic load
      const batchSize = 10;
      const batchCount = 5;
      const durations: number[] = [];

      // Act - Execute multiple batches
      for (let batch = 0; batch < batchCount; batch++) {
        const batchPromises = Array.from({ length: batchSize }, (_, i) =>
          service.createRequirement({
            description: `Load test requirement ${batch}-${i}`,
            projectId: `project-${batch}`,
            stakeholderId: `stakeholder-${batch}`
          })
        );

        const batchStart = Date.now();
        await Promise.all(batchPromises);
        durations.push(Date.now() - batchStart);
      }

      // Assert - Performance should remain consistent
      const avgBatchDuration = durations.reduce((a, b) => a + b) / durations.length;
      const maxBatchDuration = Math.max(...durations);
      
      expect(avgBatchDuration).toBeLessThan(1000);
      expect(maxBatchDuration).toBeLessThan(1500);
      
      // Performance should not degrade significantly
      const performanceDegradation = (maxBatchDuration - Math.min(...durations)) / Math.min(...durations);
      expect(performanceDegradation).toBeLessThan(0.5); // Less than 50% degradation
    });

    it('should efficiently find similar requirements', async () => {
      // Arrange
      const requirementId = 'req-performance-test';
      
      // Act & Measure
      const startTime = Date.now();
      await service.findSimilarRequirements(requirementId);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(200); // Should be fast with proper indexing
    });

    it('should handle large result sets efficiently', async () => {
      // Arrange - Mock large result set
      const largeResultSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `req-${i}`,
        title: `Requirement ${i}`,
        description: `Description ${i}`,
        similarity: 0.8 - (i * 0.001)
      }));

      mockNeo4j.executeQuery.mockResolvedValueOnce(largeResultSet);

      // Act & Measure
      const startTime = Date.now();
      await service.findSimilarRequirements('test-req');
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(300);
    });
  });

  describe('NLP Service Performance', () => {
    let nlpService: NLPService;

    beforeEach(() => {
      nlpService = new NLPService();
    });

    it('should analyze requirements within target time (< 100ms)', async () => {
      // Arrange
      const requirement = 'User should be able to login with email and password to access their dashboard';

      // Act & Measure
      const startTime = Date.now();
      await nlpService.analyzeRequirement(requirement);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(100);
    });

    it('should handle batch analysis efficiently', async () => {
      // Arrange
      const requirements = Array.from({ length: 50 }, (_, i) =>
        `Requirement ${i}: User should perform action ${i} with specific criteria and validation rules`
      );

      // Act & Measure
      const startTime = Date.now();
      await Promise.all(requirements.map(req => nlpService.analyzeRequirement(req)));
      const totalDuration = Date.now() - startTime;
      const avgDuration = totalDuration / requirements.length;

      // Assert
      expect(totalDuration).toBeLessThan(3000); // 3 seconds for 50 analyses
      expect(avgDuration).toBeLessThan(80); // Average under 80ms
    });

    it('should maintain performance with varying text lengths', async () => {
      // Arrange - Different length requirements
      const testCases = [
        'Short requirement',
        'Medium length requirement with additional details and context information',
        'Very long requirement description that contains extensive details about the functionality, including specific use cases, acceptance criteria, business rules, validation requirements, error handling scenarios, and integration points with other systems. This requirement also includes performance specifications, security considerations, accessibility requirements, and detailed workflow descriptions that span multiple paragraphs and cover various edge cases and exceptional situations.',
        'A'.repeat(5000) // Very long text
      ];

      const durations: number[] = [];

      // Act & Measure
      for (const testCase of testCases) {
        const startTime = Date.now();
        await nlpService.analyzeRequirement(testCase);
        durations.push(Date.now() - startTime);
      }

      // Assert - All should complete within reasonable time
      durations.forEach((duration, index) => {
        expect(duration).toBeLessThan(200); // None should take more than 200ms
      });

      // Performance should scale reasonably with length
      const maxVariation = Math.max(...durations) - Math.min(...durations);
      expect(maxVariation).toBeLessThan(150); // Variation under 150ms
    });

    it('should handle concurrent analysis requests', async () => {
      // Arrange
      const concurrentRequests = 30;
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        nlpService.analyzeRequirement(`Concurrent analysis test ${i} with detailed requirements`)
      );

      // Act & Measure
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const totalDuration = Date.now() - startTime;

      // Assert
      expect(results).toHaveLength(concurrentRequests);
      expect(totalDuration).toBeLessThan(2000); // Under 2 seconds for 30 concurrent
      
      // All results should be valid
      results.forEach(result => {
        expect(result.embedding).toHaveLength(768);
        expect(result.qualityScore).toBeGreaterThan(0);
      });
    });
  });

  describe('Similarity Service Performance', () => {
    let similarityService: SimilarityService;
    
    beforeEach(() => {
      similarityService = new SimilarityService(mockNeo4j);
    });

    it('should find similar requirements efficiently', async () => {
      // Arrange
      const mockRequirement = {
        id: 'req-test',
        description: 'User authentication requirement'
      } as any;

      // Mock database response with realistic data
      const mockResults = Array.from({ length: 100 }, (_, i) => ({
        id: `similar-${i}`,
        title: `Similar Requirement ${i}`,
        description: `Similar description ${i}`,
        similarity: 0.9 - (i * 0.01),
        projectName: `Project ${i}`,
        outcomes: []
      }));

      mockNeo4j.executeQuery.mockResolvedValueOnce(mockResults.slice(0, 10)); // Return top 10

      // Act & Measure
      const startTime = Date.now();
      const results = await similarityService.findSimilarRequirements(mockRequirement);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(150);
      expect(results.length).toBeLessThanOrEqual(10);
    });

    it('should handle cross-project similarity calculation efficiently', async () => {
      // Arrange
      const requirementId = 'req-cross-project-test';
      
      const mockCrossProjectResults = Array.from({ length: 20 }, (_, i) => ({
        projectId: `project-${i}`,
        avgSimilarity: 0.8 - (i * 0.02)
      }));

      mockNeo4j.executeQuery.mockResolvedValueOnce(mockCrossProjectResults);

      // Act & Measure
      const startTime = Date.now();
      const similarityMap = await similarityService.calculateCrossProjectSimilarity(requirementId);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(200);
      expect(similarityMap.size).toBe(20);
    });

    it('should efficiently find expertise for requirements', async () => {
      // Arrange
      const mockRequirement = {
        type: 'FUNCTIONAL'
      } as any;

      const mockExperts = Array.from({ length: 15 }, (_, i) => ({
        expertId: `expert-${i}`,
        expertName: `Expert ${i}`,
        expertEmail: `expert${i}@example.com`,
        requirementCount: 10 - i,
        avgQuality: 0.9 - (i * 0.02)
      }));

      mockNeo4j.executeQuery.mockResolvedValueOnce(mockExperts.slice(0, 5));

      // Act & Measure
      const startTime = Date.now();
      const experts = await similarityService.findExpertiseForRequirement(mockRequirement);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(100);
      expect(experts.length).toBeLessThanOrEqual(5);
    });
  });

  describe('SecureQueryBuilder Performance', () => {
    it('should build queries efficiently', () => {
      // Arrange
      const updateFields = {
        title: 'Performance Test',
        description: 'Testing query builder performance',
        status: 'APPROVED',
        priority: 'HIGH',
        updatedAt: new Date().toISOString()
      };

      const iterations = 1000;

      // Act & Measure
      const startTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        SecureQueryBuilder.buildSecureUpdateQuery('Requirement', `req-${i}`, updateFields);
      }
      const totalDuration = Date.now() - startTime;
      const avgDuration = totalDuration / iterations;

      // Assert
      expect(totalDuration).toBeLessThan(1000); // 1000 queries under 1 second
      expect(avgDuration).toBeLessThan(2); // Average under 2ms per query
    });

    it('should validate input efficiently', () => {
      // Arrange
      const complexInput = {
        strings: Array.from({ length: 100 }, (_, i) => `string-${i}`),
        numbers: Array.from({ length: 100 }, (_, i) => i),
        nested: {
          level1: {
            level2: {
              level3: 'deep value'
            }
          }
        },
        arrays: [
          Array.from({ length: 50 }, (_, i) => ({ id: i, name: `item-${i}` }))
        ]
      };

      const iterations = 100;

      // Act & Measure
      const startTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        SecureQueryBuilder.validateAndSanitizeInput(complexInput);
      }
      const totalDuration = Date.now() - startTime;
      const avgDuration = totalDuration / iterations;

      // Assert
      expect(totalDuration).toBeLessThan(2000); // 100 validations under 2 seconds
      expect(avgDuration).toBeLessThan(25); // Average under 25ms
    });

    it('should handle concurrent query building', async () => {
      // Arrange
      const concurrencyLevel = 100;
      const buildQuery = (i: number) => () =>
        SecureQueryBuilder.buildSecureFilterQuery(
          'Requirement',
          { status: 'APPROVED', projectId: `project-${i}` },
          20,
          i * 20
        );

      const queryBuilders = Array.from({ length: concurrencyLevel }, (_, i) => buildQuery(i));

      // Act & Measure
      const startTime = Date.now();
      const results = queryBuilders.map(builder => builder());
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(500); // 100 concurrent queries under 500ms
      expect(results).toHaveLength(concurrencyLevel);
      
      // Verify all queries are unique
      const uniqueQueries = new Set(results.map(r => r.params.projectId));
      expect(uniqueQueries.size).toBe(concurrencyLevel);
    });
  });

  describe('Memory Usage Benchmarks', () => {
    it('should not cause memory leaks in repeated operations', async () => {
      // Arrange
      const nlpService = new NLPService();
      const iterations = 100;
      const initialMemory = process.memoryUsage();

      // Act - Perform many operations
      for (let i = 0; i < iterations; i++) {
        await nlpService.analyzeRequirement(`Memory test requirement ${i} with detailed description`);
        
        // Force garbage collection every 10 iterations if available
        if (i % 10 === 0 && global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();

      // Assert - Memory growth should be reasonable
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);
      
      expect(memoryGrowthMB).toBeLessThan(50); // Less than 50MB growth
    });

    it('should handle large datasets efficiently', () => {
      // Arrange
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `item-${i}`,
        data: `Data item ${i}`.repeat(10),
        nested: {
          values: Array.from({ length: 10 }, (_, j) => j * i)
        }
      }));

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      // Act
      const sanitized = SecureQueryBuilder.validateAndSanitizeInput(largeDataset);
      
      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;

      // Assert
      expect(endTime - startTime).toBeLessThan(1000); // Under 1 second
      expect(endMemory - startMemory).toBeLessThan(100 * 1024 * 1024); // Under 100MB
      expect(sanitized).toHaveLength(100); // Should be capped
    });
  });

  describe('Stress Testing', () => {
    it('should handle extreme concurrency without failing', async () => {
      // Arrange
      const extremeConcurrency = 200;
      const nlpService = new NLPService();
      
      const promises = Array.from({ length: extremeConcurrency }, (_, i) =>
        nlpService.analyzeRequirement(`Stress test requirement ${i}`)
      );

      // Act & Measure
      const startTime = Date.now();
      const results = await Promise.allSettled(promises);
      const duration = Date.now() - startTime;

      // Assert
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failureRate = (extremeConcurrency - successful) / extremeConcurrency;

      expect(failureRate).toBeLessThan(0.05); // Less than 5% failure rate
      expect(duration).toBeLessThan(5000); // Under 5 seconds for extreme load
      expect(successful).toBeGreaterThan(extremeConcurrency * 0.95); // At least 95% success
    });

    it('should recover gracefully from resource exhaustion', async () => {
      // Arrange - Create resource-intensive operations
      const resourceIntensiveOperations = Array.from({ length: 50 }, (_, i) => () => {
        const largeString = 'A'.repeat(10000);
        const complexObject = {
          data: largeString,
          nested: Array.from({ length: 1000 }, (_, j) => ({ 
            id: j, 
            content: `content-${j}`.repeat(10) 
          }))
        };
        return SecureQueryBuilder.validateAndSanitizeInput(complexObject);
      });

      // Act - Execute operations sequentially to avoid overwhelming system
      let successCount = 0;
      let errorCount = 0;

      for (const operation of resourceIntensiveOperations) {
        try {
          const result = operation();
          if (result) successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      // Assert - Should handle resource pressure gracefully
      expect(successCount).toBeGreaterThan(40); // At least 80% success
      expect(errorCount).toBeLessThan(10); // Less than 20% errors
    });
  });
});