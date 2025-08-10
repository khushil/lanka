import { RequirementsService } from '../../src/modules/requirements/services/requirements.service';
import { NLPService } from '../../src/modules/requirements/services/nlp.service';
import { RequirementType, RequirementPriority } from '../../src/modules/requirements/types/requirement.types';

describe('RequirementsService', () => {
  let requirementsService: RequirementsService;
  let mockNeo4j: any;

  beforeEach(() => {
    mockNeo4j = {
      executeQuery: jest.fn(),
      executeTransaction: jest.fn(),
    };
    requirementsService = new RequirementsService(mockNeo4j);
  });

  describe('createRequirement', () => {
    it('should create a new requirement with NLP analysis', async () => {
      const input = {
        description: 'As a user, I want to login with OAuth2 so that I can access my account securely',
        projectId: 'proj-123',
        stakeholderId: 'stake-456',
      };

      mockNeo4j.executeQuery.mockResolvedValue([]);

      const result = await requirementsService.createRequirement(input);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.type).toBe(RequirementType.USER_STORY);
      expect(result.description).toBe(input.description);
      expect(result.projectId).toBe(input.projectId);
      expect(result.stakeholderId).toBe(input.stakeholderId);
    });
  });

  describe('findSimilarRequirements', () => {
    it('should find similar requirements based on embedding similarity', async () => {
      const requirementId = 'req-123';
      const mockSimilarRequirements = [
        { 
          other: { id: 'req-456', title: 'OAuth Integration' },
          similarity: 0.85,
        },
      ];

      mockNeo4j.executeQuery.mockResolvedValue(mockSimilarRequirements);

      const result = await requirementsService.findSimilarRequirements(requirementId);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(mockNeo4j.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('MATCH'),
        expect.objectContaining({ requirementId })
      );
    });
  });

  describe('detectConflicts', () => {
    it('should detect conflicting requirements in the same project', async () => {
      const requirementId = 'req-123';
      const mockConflicts = [
        {
          other: { id: 'req-789', type: 'NON_FUNCTIONAL' },
          conflictType: 'potential_conflict',
        },
      ];

      mockNeo4j.executeQuery.mockResolvedValue(mockConflicts);

      const result = await requirementsService.detectConflicts(requirementId);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].conflictType).toBe('potential_conflict');
    });
  });
});

describe('NLPService', () => {
  let nlpService: NLPService;

  beforeEach(() => {
    nlpService = new NLPService();
  });

  describe('analyzeRequirement', () => {
    it('should classify user story correctly', async () => {
      const text = 'As a customer, I want to search for products so that I can find what I need';
      const result = await nlpService.analyzeRequirement(text);

      expect(result.type).toBe(RequirementType.USER_STORY);
      expect(result.suggestedTitle).toBeDefined();
      expect(result.embedding).toBeDefined();
      expect(result.embedding.length).toBe(768);
    });

    it('should identify non-functional requirements', async () => {
      const text = 'The system must handle 1000 concurrent users with response time under 200ms';
      const result = await nlpService.analyzeRequirement(text);

      expect(result.type).toBe(RequirementType.NON_FUNCTIONAL);
      expect(result.priority).toBeDefined();
    });

    it('should assess requirement quality', async () => {
      const goodRequirement = 'The user authentication system must validate credentials against the LDAP server within 100ms and return appropriate error messages for invalid attempts';
      const poorRequirement = 'System should work fast';

      const goodResult = await nlpService.analyzeRequirement(goodRequirement);
      const poorResult = await nlpService.analyzeRequirement(poorRequirement);

      expect(goodResult.qualityScore).toBeGreaterThan(poorResult.qualityScore);
      expect(goodResult.completenessScore).toBeGreaterThan(poorResult.completenessScore);
      expect(poorResult.suggestions.length).toBeGreaterThan(0);
    });

    it('should determine requirement priority', async () => {
      const criticalReq = 'Critical: The system must comply with GDPR regulations';
      const lowReq = 'Nice to have: Add dark mode support';

      const criticalResult = await nlpService.analyzeRequirement(criticalReq);
      const lowResult = await nlpService.analyzeRequirement(lowReq);

      expect(criticalResult.priority).toBe(RequirementPriority.CRITICAL);
      expect(lowResult.priority).toBe(RequirementPriority.LOW);
    });
  });
});