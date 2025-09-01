import { SimilarityService, SimilarRequirement } from '../../../src/modules/requirements/services/similarity.service';
import { Neo4jService } from '../../../src/core/database/neo4j';
import { Requirement, RequirementType, RequirementStatus } from '../../../src/modules/requirements/types/requirement.types';
import { createMock } from 'jest-mock-extended';

jest.mock('../../../src/core/logging/logger');

describe('SimilarityService', () => {
  let service: SimilarityService;
  let mockNeo4j: jest.Mocked<Neo4jService>;

  const mockRequirement: Requirement = {
    id: 'req-123',
    title: 'User Authentication',
    description: 'User should be able to login with email and password',
    type: RequirementType.FUNCTIONAL,
    status: RequirementStatus.DRAFT,
    priority: 'HIGH',
    createdAt: '2023-01-01T00:00:00Z',
    projectId: 'project-123',
    stakeholderId: 'stakeholder-456',
    embedding: [0.1, 0.2, 0.3],
    completenessScore: 0.85,
    qualityScore: 0.90
  };

  beforeEach(() => {
    mockNeo4j = createMock<Neo4jService>();
    service = new SimilarityService(mockNeo4j);
  });

  describe('findSimilarRequirements', () => {
    it('should find similar requirements with high similarity scores', async () => {
      // Arrange
      const mockSimilarResults = [
        {
          id: 'req-similar-1',
          title: 'User Login System',
          description: 'Users can authenticate using email and password',
          similarity: 0.85,
          projectName: 'Project Alpha',
          outcomes: []
        },
        {
          id: 'req-similar-2', 
          title: 'Authentication Module',
          description: 'Login functionality with credentials',
          similarity: 0.78,
          projectName: 'Project Beta',
          outcomes: []
        }
      ];

      const expectedQuery = expect.stringContaining('apoc.text.jaroWinklerDistance');
      mockNeo4j.executeQuery.mockResolvedValueOnce(mockSimilarResults);

      // Act
      const result = await service.findSimilarRequirements(mockRequirement, 0.7);

      // Assert
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expectedQuery,
        expect.objectContaining({
          requirementId: mockRequirement.id,
          description: mockRequirement.description,
          threshold: 0.7
        })
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'req-similar-1',
        title: 'User Login System',
        similarity: 0.85,
        projectName: 'Project Alpha',
        adaptationGuidelines: expect.any(Array)
      });
    });

    it('should use default threshold when not provided', async () => {
      // Arrange
      mockNeo4j.executeQuery.mockResolvedValueOnce([]);

      // Act
      await service.findSimilarRequirements(mockRequirement);

      // Assert
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          threshold: 0.7
        })
      );
    });

    it('should exclude the same requirement from results', async () => {
      // Act
      await service.findSimilarRequirements(mockRequirement);

      // Assert
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE other.id <> $requirementId'),
        expect.any(Object)
      );
    });

    it('should include success metrics when available', async () => {
      // Arrange
      const mockResultWithMetrics = [{
        id: 'req-with-metrics',
        title: 'Similar Requirement',
        description: 'Similar functionality',
        similarity: 0.8,
        projectName: 'Project Gamma',
        outcomes: [{
          implementationTime: 30,
          defectRate: 0.02,
          satisfaction: 4.5
        }]
      }];

      mockNeo4j.executeQuery.mockResolvedValueOnce(mockResultWithMetrics);

      // Act
      const result = await service.findSimilarRequirements(mockRequirement);

      // Assert
      expect(result[0].successMetrics).toEqual({
        implementationTime: 30,
        defectRate: 0.02,
        stakeholderSatisfaction: 4.5
      });
    });

    it('should return empty array when Neo4j query fails', async () => {
      // Arrange
      mockNeo4j.executeQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      // Act
      const result = await service.findSimilarRequirements(mockRequirement);

      // Assert
      expect(result).toEqual([]);
    });

    it('should generate appropriate adaptation guidelines based on similarity', async () => {
      // Arrange
      const highSimilarityResult = [{
        id: 'high-sim',
        title: 'Nearly Identical',
        description: 'Almost same requirement',
        similarity: 0.92,
        projectName: 'Test Project',
        outcomes: []
      }];

      const moderateSimilarityResult = [{
        id: 'mod-sim',
        title: 'Somewhat Similar',
        description: 'Related requirement',
        similarity: 0.75,
        projectName: 'Test Project',
        outcomes: []
      }];

      // Act
      mockNeo4j.executeQuery.mockResolvedValueOnce(highSimilarityResult);
      const highResult = await service.findSimilarRequirements(mockRequirement);

      mockNeo4j.executeQuery.mockResolvedValueOnce(moderateSimilarityResult);
      const moderateResult = await service.findSimilarRequirements(mockRequirement);

      // Assert
      expect(highResult[0].adaptationGuidelines).toContain('nearly identical - consider direct reuse');
      expect(moderateResult[0].adaptationGuidelines).toContain('use as template but expect customization');
      
      // Both should have common guidelines
      expect(highResult[0].adaptationGuidelines).toContain('Consult with the original implementation team');
      expect(moderateResult[0].adaptationGuidelines).toContain('Document any adaptations for future reference');
    });

    it('should limit results to 10 items', async () => {
      // Act
      await service.findSimilarRequirements(mockRequirement);

      // Assert
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 10'),
        expect.any(Object)
      );
    });

    it('should order results by similarity descending', async () => {
      // Act
      await service.findSimilarRequirements(mockRequirement);

      // Assert
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY textSimilarity DESC'),
        expect.any(Object)
      );
    });
  });

  describe('calculateCrossProjectSimilarity', () => {
    it('should calculate average similarity across projects', async () => {
      // Arrange
      const requirementId = 'req-test';
      const mockCrossProjectResults = [
        { projectId: 'project-1', avgSimilarity: 0.8 },
        { projectId: 'project-2', avgSimilarity: 0.65 },
        { projectId: 'project-3', avgSimilarity: 0.75 }
      ];

      mockNeo4j.executeQuery.mockResolvedValueOnce(mockCrossProjectResults);

      // Act
      const result = await service.calculateCrossProjectSimilarity(requirementId);

      // Assert
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('avg(similarity) AS avgSimilarity'),
        { requirementId }
      );

      expect(result.size).toBe(3);
      expect(result.get('project-1')).toBe(0.8);
      expect(result.get('project-2')).toBe(0.65);
      expect(result.get('project-3')).toBe(0.75);
    });

    it('should exclude same project and same requirement', async () => {
      // Arrange
      const requirementId = 'req-test';

      // Act
      await service.calculateCrossProjectSimilarity(requirementId);

      // Assert
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE other.id <> r.id AND p.id <> r.projectId'),
        { requirementId }
      );
    });

    it('should filter by minimum similarity threshold', async () => {
      // Act
      await service.calculateCrossProjectSimilarity('req-test');

      // Assert
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE similarity > 0.5'),
        expect.any(Object)
      );
    });

    it('should return empty map when no similar projects found', async () => {
      // Arrange
      mockNeo4j.executeQuery.mockResolvedValueOnce([]);

      // Act
      const result = await service.calculateCrossProjectSimilarity('req-test');

      // Assert
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should order results by similarity descending', async () => {
      // Act
      await service.calculateCrossProjectSimilarity('req-test');

      // Assert
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY avgSimilarity DESC'),
        expect.any(Object)
      );
    });
  });

  describe('findExpertiseForRequirement', () => {
    it('should find domain experts based on requirement type', async () => {
      // Arrange
      const mockExperts = [
        {
          expertId: 'expert-1',
          expertName: 'John Doe',
          expertEmail: 'john@example.com',
          requirementCount: 5,
          avgQuality: 0.85
        },
        {
          expertId: 'expert-2',
          expertName: 'Jane Smith',
          expertEmail: 'jane@example.com',
          requirementCount: 8,
          avgQuality: 0.92
        }
      ];

      mockNeo4j.executeQuery.mockResolvedValueOnce(mockExperts);

      // Act
      const result = await service.findExpertiseForRequirement(mockRequirement);

      // Assert
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE similar.type = $type'),
        { type: mockRequirement.type }
      );

      expect(result).toEqual(mockExperts);
    });

    it('should filter experts by minimum requirement count and quality', async () => {
      // Act
      await service.findExpertiseForRequirement(mockRequirement);

      // Assert
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE requirementCount > 3 AND avgQuality > 0.7'),
        expect.any(Object)
      );
    });

    it('should order experts by quality and requirement count', async () => {
      // Act
      await service.findExpertiseForRequirement(mockRequirement);

      // Assert
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY avgQuality DESC, requirementCount DESC'),
        expect.any(Object)
      );
    });

    it('should limit results to 5 experts', async () => {
      // Act
      await service.findExpertiseForRequirement(mockRequirement);

      // Assert
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 5'),
        expect.any(Object)
      );
    });

    it('should return empty array when no experts found', async () => {
      // Arrange
      mockNeo4j.executeQuery.mockResolvedValueOnce([]);

      // Act
      const result = await service.findExpertiseForRequirement(mockRequirement);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection failures gracefully', async () => {
      // Arrange
      mockNeo4j.executeQuery.mockRejectedValue(new Error('Connection timeout'));

      // Act
      const similarResult = await service.findSimilarRequirements(mockRequirement);
      
      // Assert - Should not throw, return empty array instead
      expect(similarResult).toEqual([]);
    });

    it('should handle malformed query results', async () => {
      // Arrange
      const malformedResults = [
        { id: 'valid-1', similarity: 0.8 },
        { malformed: 'invalid' },
        null,
        { id: 'valid-2', similarity: 0.7 }
      ];

      mockNeo4j.executeQuery.mockResolvedValueOnce(malformedResults);

      // Act
      const result = await service.findSimilarRequirements(mockRequirement);

      // Assert - Should handle gracefully and return valid results
      expect(result).toHaveLength(4); // Includes attempts to map all items
      expect(result[0].id).toBe('valid-1');
    });

    it('should handle empty or null requirement inputs', async () => {
      // Arrange
      const nullRequirement = null as any;
      const emptyRequirement = {} as Requirement;

      // Act & Assert - Should not throw
      await expect(service.findSimilarRequirements(nullRequirement)).rejects.toThrow();
      await expect(service.findExpertiseForRequirement(emptyRequirement)).resolves.toBeDefined();
    });

    it('should handle very long requirement descriptions', async () => {
      // Arrange
      const longRequirement = {
        ...mockRequirement,
        description: 'A'.repeat(10000)
      };

      mockNeo4j.executeQuery.mockResolvedValueOnce([]);

      // Act & Assert - Should not throw
      await expect(service.findSimilarRequirements(longRequirement)).resolves.toBeDefined();
    });
  });

  describe('Adaptation Guidelines Generation', () => {
    it('should provide direct reuse guidance for very high similarity', async () => {
      // Arrange
      const veryHighSimilarity = [{
        id: 'exact-match',
        title: 'Exact Match',
        description: 'Exactly the same',
        similarity: 0.95,
        projectName: 'Test',
        outcomes: []
      }];

      mockNeo4j.executeQuery.mockResolvedValueOnce(veryHighSimilarity);

      // Act
      const result = await service.findSimilarRequirements(mockRequirement);

      // Assert
      expect(result[0].adaptationGuidelines).toContain('nearly identical - consider direct reuse');
      expect(result[0].adaptationGuidelines).toContain('Review implementation details for minor context differences');
    });

    it('should provide template guidance for moderate similarity', async () => {
      // Arrange
      const moderateSimilarity = [{
        id: 'template-match',
        title: 'Template Match',
        description: 'Good starting point',
        similarity: 0.82,
        projectName: 'Test',
        outcomes: []
      }];

      mockNeo4j.executeQuery.mockResolvedValueOnce(moderateSimilarity);

      // Act
      const result = await service.findSimilarRequirements(mockRequirement);

      // Assert
      expect(result[0].adaptationGuidelines).toContain('Strong similarity - adapt existing solution with minor modifications');
      expect(result[0].adaptationGuidelines).toContain('Pay attention to project-specific constraints');
    });

    it('should provide customization guidance for lower similarity', async () => {
      // Arrange
      const lowerSimilarity = [{
        id: 'custom-match',
        title: 'Custom Match',
        description: 'Needs customization',
        similarity: 0.72,
        projectName: 'Test',
        outcomes: []
      }];

      mockNeo4j.executeQuery.mockResolvedValueOnce(lowerSimilarity);

      // Act
      const result = await service.findSimilarRequirements(mockRequirement);

      // Assert
      expect(result[0].adaptationGuidelines).toContain('Moderate similarity - use as template but expect customization');
      expect(result[0].adaptationGuidelines).toContain('Review acceptance criteria for alignment');
    });

    it('should always include common guidelines', async () => {
      // Arrange
      const anyResult = [{
        id: 'any-result',
        title: 'Any Result',
        description: 'Any description',
        similarity: 0.8,
        projectName: 'Test',
        outcomes: []
      }];

      mockNeo4j.executeQuery.mockResolvedValueOnce(anyResult);

      // Act
      const result = await service.findSimilarRequirements(mockRequirement);

      // Assert
      expect(result[0].adaptationGuidelines).toContain('Consult with the original implementation team if possible');
      expect(result[0].adaptationGuidelines).toContain('Document any adaptations for future reference');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent similarity searches', async () => {
      // Arrange
      const requirements = Array.from({ length: 5 }, (_, i) => ({
        ...mockRequirement,
        id: `req-${i}`,
        description: `Different requirement ${i}`
      }));

      mockNeo4j.executeQuery.mockResolvedValue([]);

      // Act
      const results = await Promise.all(
        requirements.map(req => service.findSimilarRequirements(req))
      );

      // Assert
      expect(results).toHaveLength(5);
      expect(mockNeo4j.executeQuery).toHaveBeenCalledTimes(5);
    });
  });
});