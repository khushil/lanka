import { RequirementsService } from '../../../src/modules/requirements/services/requirements.service';
import { Neo4jService } from '../../../src/core/database/neo4j';
import { NLPService } from '../../../src/modules/requirements/services/nlp.service';
import { SimilarityService } from '../../../src/modules/requirements/services/similarity.service';
import { RequirementType, RequirementStatus } from '../../../src/modules/requirements/types/requirement.types';
import { createMock } from 'jest-mock-extended';

// London School TDD: Mock all collaborators
jest.mock('../../../src/modules/requirements/services/nlp.service');
jest.mock('../../../src/modules/requirements/services/similarity.service');
jest.mock('../../../src/core/logging/logger');

describe('RequirementsService', () => {
  let service: RequirementsService;
  let mockNeo4j: jest.Mocked<Neo4jService>;
  let mockNLPService: jest.Mocked<NLPService>;
  let mockSimilarityService: jest.Mocked<SimilarityService>;

  const mockRequirementInput = {
    description: 'User should be able to login with email and password',
    title: 'User Authentication',
    type: RequirementType.FUNCTIONAL,
    projectId: 'project-123',
    stakeholderId: 'stakeholder-456'
  };

  const mockNLPAnalysis = {
    suggestedTitle: 'User Authentication Feature',
    type: RequirementType.FUNCTIONAL,
    priority: 'HIGH',
    embedding: [0.1, 0.2, 0.3],
    completenessScore: 0.85,
    qualityScore: 0.92
  };

  beforeEach(() => {
    // London School: Create mocks for all dependencies
    mockNeo4j = createMock<Neo4jService>();
    mockNLPService = createMock<NLPService>();
    mockSimilarityService = createMock<SimilarityService>();

    // Mock NLP service behavior
    mockNLPService.analyzeRequirement.mockResolvedValue(mockNLPAnalysis);
    
    // Mock similarity service behavior
    mockSimilarityService.findSimilarRequirements.mockResolvedValue([]);

    // Mock Neo4j query execution
    mockNeo4j.executeQuery.mockResolvedValue([]);

    service = new RequirementsService(mockNeo4j);
    
    // Inject mocked dependencies
    (service as any).nlpService = mockNLPService;
    (service as any).similarityService = mockSimilarityService;
  });

  describe('createRequirement', () => {
    it('should orchestrate requirement creation workflow correctly', async () => {
      // Arrange
      const expectedQuery = expect.stringContaining('CREATE (r:Requirement');
      mockNeo4j.executeQuery.mockResolvedValueOnce([{ r: { properties: {} }}]);

      // Act
      await service.createRequirement(mockRequirementInput);

      // Assert: Verify the collaboration sequence (London School focus)
      expect(mockNLPService.analyzeRequirement).toHaveBeenCalledWith(mockRequirementInput.description);
      expect(mockNLPService.analyzeRequirement).toHaveBeenCalledBefore(mockNeo4j.executeQuery);
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(expectedQuery, expect.any(Object));
      expect(mockSimilarityService.findSimilarRequirements).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should use NLP analysis results for requirement creation', async () => {
      // Arrange
      mockNeo4j.executeQuery.mockResolvedValueOnce([]);

      // Act
      const result = await service.createRequirement(mockRequirementInput);

      // Assert: Verify data flows correctly through the collaboration
      expect(result).toMatchObject({
        title: mockRequirementInput.title,
        description: mockRequirementInput.description,
        type: mockRequirementInput.type,
        status: RequirementStatus.DRAFT,
        priority: mockNLPAnalysis.priority,
        projectId: mockRequirementInput.projectId,
        stakeholderId: mockRequirementInput.stakeholderId,
        embedding: mockNLPAnalysis.embedding,
        completenessScore: mockNLPAnalysis.completenessScore,
        qualityScore: mockNLPAnalysis.qualityScore
      });
    });

    it('should link similar requirements when found', async () => {
      // Arrange
      const similarRequirements = [
        { id: 'req-similar-1', similarity: 0.8 },
        { id: 'req-similar-2', similarity: 0.75 }
      ];
      mockSimilarityService.findSimilarRequirements.mockResolvedValueOnce(similarRequirements);
      mockNeo4j.executeQuery
        .mockResolvedValueOnce([]) // Initial creation
        .mockResolvedValue([]); // Linking queries

      // Act
      await service.createRequirement(mockRequirementInput);

      // Assert: Verify linking workflow is triggered
      expect(mockNeo4j.executeQuery).toHaveBeenCalledTimes(3); // 1 create + 2 link queries
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('CREATE (r1)-[:SIMILAR_TO'),
        expect.objectContaining({
          id2: similarRequirements[0].id,
          score: similarRequirements[0].similarity
        })
      );
    });

    it('should handle NLP service failure gracefully', async () => {
      // Arrange
      const nlpError = new Error('NLP service unavailable');
      mockNLPService.analyzeRequirement.mockRejectedValueOnce(nlpError);

      // Act & Assert
      await expect(service.createRequirement(mockRequirementInput))
        .rejects.toThrow('NLP service unavailable');

      // Verify no database operations occurred after failure
      expect(mockNeo4j.executeQuery).not.toHaveBeenCalled();
      expect(mockSimilarityService.findSimilarRequirements).not.toHaveBeenCalled();
    });

    it('should handle database failure gracefully', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockNeo4j.executeQuery.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(service.createRequirement(mockRequirementInput))
        .rejects.toThrow('Database connection failed');

      // Verify NLP analysis still occurred (proper error boundary)
      expect(mockNLPService.analyzeRequirement).toHaveBeenCalled();
      expect(mockSimilarityService.findSimilarRequirements).not.toHaveBeenCalled();
    });
  });

  describe('findSimilarRequirements', () => {
    it('should execute secure parameterized query', async () => {
      // Arrange
      const requirementId = 'req-123';
      const expectedQuery = expect.stringContaining('MATCH (r:Requirement {id: $requirementId})');

      // Act
      await service.findSimilarRequirements(requirementId);

      // Assert: Verify secure query execution
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expectedQuery,
        expect.objectContaining({
          requirementId: expect.any(String),
          threshold: 0.7,
          limit: 10
        })
      );
    });

    it('should sanitize input parameters', async () => {
      // Arrange
      const maliciousInput = "'; DROP TABLE requirements; --";

      // Act
      await service.findSimilarRequirements(maliciousInput);

      // Assert: Verify input sanitization occurred
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          requirementId: expect.not.stringContaining('DROP TABLE')
        })
      );
    });
  });

  describe('detectConflicts', () => {
    it('should identify potential conflicts based on type and priority', async () => {
      // Arrange
      const requirementId = 'req-123';
      const mockConflicts = [
        { other: { properties: { id: 'conflicting-req' } }, conflictType: 'potential_conflict' }
      ];
      mockNeo4j.executeQuery.mockResolvedValueOnce(mockConflicts);

      // Act
      const result = await service.detectConflicts(requirementId);

      // Assert
      expect(result).toEqual(mockConflicts);
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('potential_conflict'),
        { requirementId }
      );
    });
  });

  describe('getRequirementById', () => {
    it('should return null when requirement not found', async () => {
      // Arrange
      mockNeo4j.executeQuery.mockResolvedValueOnce([]);

      // Act
      const result = await service.getRequirementById('non-existent');

      // Assert
      expect(result).toBeNull();
    });

    it('should map database node to requirement object correctly', async () => {
      // Arrange
      const mockDbResult = [{
        r: {
          properties: {
            id: 'req-123',
            title: 'Test Requirement',
            description: 'Test description',
            type: RequirementType.FUNCTIONAL,
            status: RequirementStatus.APPROVED,
            priority: 'HIGH'
          }
        }
      }];
      mockNeo4j.executeQuery.mockResolvedValueOnce(mockDbResult);

      // Act
      const result = await service.getRequirementById('req-123');

      // Assert
      expect(result).toMatchObject({
        id: 'req-123',
        title: 'Test Requirement',
        description: 'Test description',
        type: RequirementType.FUNCTIONAL,
        status: RequirementStatus.APPROVED,
        priority: 'HIGH'
      });
    });
  });

  describe('updateRequirementStatus', () => {
    it('should update status and timestamp', async () => {
      // Arrange
      const requirementId = 'req-123';
      const newStatus = RequirementStatus.APPROVED;
      const mockUpdatedResult = [{
        r: {
          properties: {
            id: requirementId,
            status: newStatus,
            updatedAt: expect.any(String)
          }
        }
      }];
      mockNeo4j.executeQuery.mockResolvedValueOnce(mockUpdatedResult);

      // Act
      await service.updateRequirementStatus(requirementId, newStatus);

      // Assert: Verify update query parameters
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET r.status = $status'),
        expect.objectContaining({
          id: requirementId,
          status: newStatus,
          updatedAt: expect.any(String)
        })
      );
    });
  });

  describe('extractPatterns', () => {
    it('should analyze high-quality implemented requirements', async () => {
      // Arrange
      const projectId = 'project-123';
      const mockPatterns = [
        { 
          type: RequirementType.FUNCTIONAL,
          requirements: [{ id: 'req1' }, { id: 'req2' }],
          avgQuality: 0.9
        }
      ];
      mockNeo4j.executeQuery.mockResolvedValueOnce(mockPatterns);

      // Act
      const result = await service.extractPatterns(projectId);

      // Assert
      expect(result).toEqual(mockPatterns);
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("r.status = 'IMPLEMENTED' AND r.qualityScore > 0.8"),
        { projectId }
      );
    });
  });
});