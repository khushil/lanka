import { NLPService, RequirementAnalysis } from '../../../src/modules/requirements/services/nlp.service';
import { RequirementType, RequirementPriority } from '../../../src/modules/requirements/types/requirement.types';

jest.mock('../../../src/core/logging/logger');

describe('NLPService', () => {
  let service: NLPService;

  beforeEach(() => {
    service = new NLPService();
  });

  describe('analyzeRequirement', () => {
    it('should analyze user story requirements correctly', async () => {
      // Arrange
      const userStoryText = 'As a user I want to login with email and password so that I can access my account';

      // Act
      const result = await service.analyzeRequirement(userStoryText);

      // Assert
      expect(result).toMatchObject({
        type: RequirementType.USER_STORY,
        priority: expect.any(String),
        suggestedTitle: expect.any(String),
        entities: expect.any(Array),
        keywords: expect.any(Array),
        embedding: expect.any(Array),
        completenessScore: expect.any(Number),
        qualityScore: expect.any(Number),
        suggestions: expect.any(Array)
      });
      expect(result.type).toBe(RequirementType.USER_STORY);
      expect(result.embedding).toHaveLength(768);
    });

    it('should identify compliance requirements', async () => {
      // Arrange
      const complianceText = 'The system must comply with GDPR regulations for data processing';

      // Act
      const result = await service.analyzeRequirement(complianceText);

      // Assert
      expect(result.type).toBe(RequirementType.COMPLIANCE);
      expect(result.keywords).toContain('comply');
      expect(result.keywords).toContain('regulations');
    });

    it('should classify non-functional requirements', async () => {
      // Arrange
      const performanceText = 'System must handle 10000 concurrent users with sub-second response time performance';

      // Act
      const result = await service.analyzeRequirement(performanceText);

      // Assert
      expect(result.type).toBe(RequirementType.NON_FUNCTIONAL);
      expect(result.keywords).toContain('performance');
      expect(result.completenessScore).toBeGreaterThan(0.8); // Should be complete with metrics
    });

    it('should detect acceptance criteria format', async () => {
      // Arrange
      const acceptanceCriteria = 'Given a user is on the login page, when they enter valid credentials, then they should be redirected to dashboard';

      // Act
      const result = await service.analyzeRequirement(acceptanceCriteria);

      // Assert
      expect(result.type).toBe(RequirementType.ACCEPTANCE_CRITERIA);
      expect(result.keywords).toContain('given');
      expect(result.keywords).toContain('when');
      expect(result.keywords).toContain('then');
    });

    it('should determine critical priority correctly', async () => {
      // Arrange
      const criticalText = 'This is a critical security requirement that must have immediate attention';

      // Act
      const result = await service.analyzeRequirement(criticalText);

      // Assert
      expect(result.priority).toBe(RequirementPriority.CRITICAL);
    });

    it('should handle high priority indicators', async () => {
      // Arrange
      const highPriorityText = 'This important feature needs high priority implementation';

      // Act
      const result = await service.analyzeRequirement(highPriorityText);

      // Assert
      expect(result.priority).toBe(RequirementPriority.HIGH);
    });

    it('should generate meaningful titles', async () => {
      // Arrange
      const longRequirement = 'User authentication system should validate credentials against database and maintain session state. Additional security measures should be implemented.';

      // Act
      const result = await service.analyzeRequirement(longRequirement);

      // Assert
      expect(result.suggestedTitle).toBe('User authentication system should validate credentials against database and maintain session state');
      expect(result.suggestedTitle.length).toBeLessThanOrEqual(100);
    });

    it('should truncate very long titles', async () => {
      // Arrange
      const veryLongText = 'A'.repeat(120) + '. More content here.';

      // Act
      const result = await service.analyzeRequirement(veryLongText);

      // Assert
      expect(result.suggestedTitle).toHaveLength(100);
      expect(result.suggestedTitle).toEndWith('...');
    });

    it('should extract entities correctly', async () => {
      // Arrange
      const textWithEntities = 'User must login to Dashboard via OAuth using Google authentication';

      // Act
      const result = await service.analyzeRequirement(textWithEntities);

      // Assert
      expect(result.entities).toContain('User');
      expect(result.entities).toContain('Dashboard');
      expect(result.entities).toContain('OAuth');
      expect(result.entities).toContain('Google');
      expect(result.entities).toHaveLength(new Set(result.entities).size); // No duplicates
    });

    it('should filter stop words from keywords', async () => {
      // Arrange
      const textWithStopWords = 'The user should be able to login with the system and access the dashboard';

      // Act
      const result = await service.analyzeRequirement(textWithStopWords);

      // Assert
      expect(result.keywords).not.toContain('the');
      expect(result.keywords).not.toContain('and');
      expect(result.keywords).not.toContain('with');
      expect(result.keywords).toContain('user');
      expect(result.keywords).toContain('login');
      expect(result.keywords).toContain('system');
    });

    it('should generate normalized embeddings', async () => {
      // Arrange
      const text = 'Test requirement for embedding generation';

      // Act
      const result = await service.analyzeRequirement(text);

      // Assert
      expect(result.embedding).toHaveLength(768);
      
      // Check normalization (magnitude should be approximately 1)
      const magnitude = Math.sqrt(result.embedding.reduce((sum, val) => sum + val * val, 0));
      expect(magnitude).toBeCloseTo(1, 5);
      
      // Should not be all zeros
      expect(result.embedding.some(val => val !== 0)).toBe(true);
    });

    it('should assess quality and completeness correctly', async () => {
      // Arrange
      const highQualityText = 'User should login using email and password. System must validate credentials within 2 seconds and redirect to dashboard.';

      // Act
      const result = await service.analyzeRequirement(highQualityText);

      // Assert
      expect(result.completenessScore).toBeGreaterThan(0.8);
      expect(result.qualityScore).toBeGreaterThan(0.8);
      expect(result.suggestions).toHaveLength(0); // High quality should have no suggestions
    });

    it('should provide suggestions for low quality requirements', async () => {
      // Arrange
      const lowQualityText = 'Something should work etc';

      // Act
      const result = await service.analyzeRequirement(lowQualityText);

      // Assert
      expect(result.completenessScore).toBeLessThan(0.6);
      expect(result.qualityScore).toBeLessThan(0.8);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0]).toContain('more specific details');
    });

    it('should suggest adding metrics for performance requirements', async () => {
      // Arrange
      const performanceWithoutMetrics = 'System should have good performance';

      // Act
      const result = await service.analyzeRequirement(performanceWithoutMetrics);

      // Assert
      expect(result.suggestions).toContain('Add specific metrics or thresholds for measurability');
    });

    it('should handle empty or invalid input', async () => {
      // Act & Assert
      await expect(service.analyzeRequirement('')).rejects.toThrow();
      await expect(service.analyzeRequirement(null as any)).rejects.toThrow();
      await expect(service.analyzeRequirement(undefined as any)).rejects.toThrow();
    });

    it('should be consistent across multiple calls', async () => {
      // Arrange
      const text = 'Consistent requirement analysis test';

      // Act
      const result1 = await service.analyzeRequirement(text);
      const result2 = await service.analyzeRequirement(text);

      // Assert - All fields should be identical
      expect(result1.type).toBe(result2.type);
      expect(result1.priority).toBe(result2.priority);
      expect(result1.suggestedTitle).toBe(result2.suggestedTitle);
      expect(result1.entities).toEqual(result2.entities);
      expect(result1.keywords).toEqual(result2.keywords);
      expect(result1.embedding).toEqual(result2.embedding);
      expect(result1.completenessScore).toBe(result2.completenessScore);
      expect(result1.qualityScore).toBe(result2.qualityScore);
      expect(result1.suggestions).toEqual(result2.suggestions);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle special characters gracefully', async () => {
      // Arrange
      const textWithSpecialChars = 'User@domain.com should login with $pecial Ch@rs & símb0ls!';

      // Act
      const result = await service.analyzeRequirement(textWithSpecialChars);

      // Assert
      expect(result).toBeDefined();
      expect(result.keywords).not.toContain('$pecial'); // Should be filtered
      expect(result.suggestedTitle).toContain('@domain.com'); // Should preserve email
    });

    it('should handle very long requirements', async () => {
      // Arrange
      const longText = 'A'.repeat(5000);

      // Act
      const result = await service.analyzeRequirement(longText);

      // Assert
      expect(result).toBeDefined();
      expect(result.embedding).toHaveLength(768);
      expect(result.suggestedTitle.length).toBeLessThanOrEqual(100);
    });

    it('should handle requirements with only stop words', async () => {
      // Arrange
      const stopWordsOnly = 'the and or but in on at to for of with by';

      // Act
      const result = await service.analyzeRequirement(stopWordsOnly);

      // Assert
      expect(result).toBeDefined();
      expect(result.keywords).toHaveLength(0);
      expect(result.entities).toHaveLength(0);
    });

    it('should handle multilingual or mixed content', async () => {
      // Arrange
      const mixedContent = 'User должен login using correct パスワード credentials';

      // Act
      const result = await service.analyzeRequirement(mixedContent);

      // Assert
      expect(result).toBeDefined();
      expect(result.entities).toContain('User');
      expect(result.keywords).toContain('login');
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle concurrent analysis requests', async () => {
      // Arrange
      const texts = Array.from({ length: 10 }, (_, i) => 
        `Requirement ${i}: User should perform action ${i} with specific criteria`
      );

      // Act
      const results = await Promise.all(texts.map(text => service.analyzeRequirement(text)));

      // Assert
      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.suggestedTitle).toContain(`action ${index}`);
        expect(result.embedding).toHaveLength(768);
      });
    });

    it('should complete analysis within reasonable time', async () => {
      // Arrange
      const complexText = 'As a system administrator, I want to configure user permissions and access controls so that I can maintain security compliance while ensuring users have appropriate access to resources they need for their job functions, including read/write permissions, administrative capabilities, and integration with external authentication providers like LDAP and OAuth2.';
      
      // Act
      const startTime = Date.now();
      const result = await service.analyzeRequirement(complexText);
      const duration = Date.now() - startTime;

      // Assert
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Quality Assessment Edge Cases', () => {
    it('should handle requirements with numbers correctly', async () => {
      // Arrange
      const textWithNumbers = 'System should process 1000 requests per second with 99.9% uptime';

      // Act
      const result = await service.analyzeRequirement(textWithNumbers);

      // Assert
      expect(result.completenessScore).toBeGreaterThan(0.8); // Should boost completeness
      expect(result.qualityScore).toBeGreaterThan(0.75);
    });

    it('should penalize vague language', async () => {
      // Arrange
      const vagueText = 'System should work well and handle stuff appropriately etc';

      // Act
      const result = await service.analyzeRequirement(vagueText);

      // Assert
      expect(result.qualityScore).toBeLessThan(0.5); // Should have low quality score
      expect(result.suggestions).toContain('more specific details');
    });

    it('should handle single word input', async () => {
      // Arrange
      const singleWord = 'Login';

      // Act
      const result = await service.analyzeRequirement(singleWord);

      // Assert
      expect(result).toBeDefined();
      expect(result.completenessScore).toBeLessThan(0.3);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });
});