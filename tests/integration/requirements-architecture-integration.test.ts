import { Neo4jService } from '../../src/core/database/neo4j';
import { RequirementsArchitectureIntegrationService } from '../../src/services/requirements-architecture-integration.service';
import { RequirementsService } from '../../src/modules/requirements/services/requirements.service';
import { ArchitectureDecisionService as DecisionService } from '../../src/modules/architecture/services/decision.service';
import { ArchitecturePatternService as PatternService } from '../../src/modules/architecture/services/pattern.service';
import { TechnologyStackService } from '../../src/modules/architecture/services/technology-stack.service';
import { RequirementType, RequirementStatus, RequirementPriority } from '../../src/modules/requirements/types/requirement.types';
import { ArchitectureDecisionStatus, ArchitecturePatternType } from '../../src/modules/architecture/types/architecture.types';
import { RequirementMappingType, AlignmentType } from '../../src/types/integration.types';

describe('Requirements-Architecture Integration', () => {
  let neo4j: Neo4jService;
  let integrationService: RequirementsArchitectureIntegrationService;
  let requirementsService: RequirementsService;
  let decisionService: DecisionService;
  let patternService: PatternService;
  let technologyStackService: TechnologyStackService;

  let testProjectId: string;
  let testStakeholderId: string;
  let testRequirementId: string;
  let testArchitectureDecisionId: string;
  let testPatternId: string;
  let testTechnologyStackId: string;

  beforeAll(async () => {
    neo4j = Neo4jService.getInstance();
    await neo4j.initializeSchema();

    integrationService = new RequirementsArchitectureIntegrationService(neo4j);
    requirementsService = new RequirementsService(neo4j);
    decisionService = new DecisionService(neo4j);
    patternService = new PatternService(neo4j);
    technologyStackService = new TechnologyStackService(neo4j);
  });

  beforeEach(async () => {
    // Create test data
    await setupTestData();
  });

  afterEach(async () => {
    // Clean up test data
    await cleanupTestData();
  });

  afterAll(async () => {
    await neo4j.close();
  });

  describe('Cross-Module Data Flow', () => {
    it('should create requirement with automatic architecture recommendations', async () => {
      // Create a new requirement
      const requirement = await requirementsService.createRequirement({
        description: 'System should handle 10,000 concurrent users with sub-200ms response time',
        title: 'High Performance Requirement',
        type: RequirementType.NON_FUNCTIONAL,
        projectId: testProjectId,
        stakeholderId: testStakeholderId,
      });

      expect(requirement).toBeDefined();
      expect(requirement.id).toBeTruthy();

      // Generate architecture recommendations
      const recommendations = await integrationService.generateRecommendations(requirement.id);

      expect(recommendations).toBeDefined();
      expect(recommendations.requirementId).toBe(requirement.id);
      expect(recommendations.confidence).toBeGreaterThan(0);
      expect(Array.isArray(recommendations.recommendedPatterns)).toBe(true);
      expect(Array.isArray(recommendations.recommendedTechnologies)).toBe(true);
    });

    it('should create requirement-architecture mapping with proper relationships', async () => {
      const mapping = await integrationService.createMapping({
        requirementId: testRequirementId,
        architectureDecisionId: testArchitectureDecisionId,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.9,
        rationale: 'Direct mapping for performance requirements to microservices architecture',
      });

      expect(mapping).toBeDefined();
      expect(mapping.id).toBeTruthy();
      expect(mapping.requirementId).toBe(testRequirementId);
      expect(mapping.architectureDecisionId).toBe(testArchitectureDecisionId);
      expect(mapping.confidence).toBe(0.9);

      // Verify the mapping exists in Neo4j
      const query = `
        MATCH (r:Requirement {id: $requirementId})
        MATCH (a:ArchitectureDecision {id: $architectureDecisionId})
        MATCH (r)-[:MAPPED_TO]->(m:RequirementArchitectureMapping)-[:MAPS_TO_DECISION]->(a)
        RETURN m
      `;

      const results = await neo4j.executeQuery(query, {
        requirementId: testRequirementId,
        architectureDecisionId: testArchitectureDecisionId,
      });

      expect(results).toHaveLength(1);
    });

    it('should validate requirement-architecture alignment', async () => {
      // Create a mapping first
      await integrationService.createMapping({
        requirementId: testRequirementId,
        architectureDecisionId: testArchitectureDecisionId,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.8,
        rationale: 'Test mapping for alignment validation',
      });

      // Validate the alignment
      const alignment = await integrationService.validateAlignment(
        testRequirementId,
        testArchitectureDecisionId
      );

      expect(alignment).toBeDefined();
      expect(alignment.requirementId).toBe(testRequirementId);
      expect(alignment.architectureDecisionId).toBe(testArchitectureDecisionId);
      expect(alignment.alignmentScore).toBeGreaterThan(0);
      expect(Object.values(AlignmentType)).toContain(alignment.alignmentType);
    });

    it('should analyze requirement impact on architecture', async () => {
      // Create mappings to multiple architecture components
      await integrationService.createMapping({
        requirementId: testRequirementId,
        architectureDecisionId: testArchitectureDecisionId,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.9,
        rationale: 'Primary architecture decision mapping',
      });

      await integrationService.createMapping({
        requirementId: testRequirementId,
        architecturePatternId: testPatternId,
        mappingType: RequirementMappingType.INFLUENCED,
        confidence: 0.7,
        rationale: 'Pattern influenced by requirement',
      });

      // Analyze impact
      const impactAnalysis = await integrationService.analyzeRequirementImpact(testRequirementId);

      expect(impactAnalysis).toBeDefined();
      expect(impactAnalysis.requirementId).toBe(testRequirementId);
      expect(impactAnalysis.impactedArchitectureDecisions).toContain(testArchitectureDecisionId);
      expect(impactAnalysis.impactedPatterns).toContain(testPatternId);
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(impactAnalysis.changeComplexity);
      expect(impactAnalysis.estimatedEffort).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cross-Module Queries', () => {
    beforeEach(async () => {
      // Create test mappings
      await integrationService.createMapping({
        requirementId: testRequirementId,
        architectureDecisionId: testArchitectureDecisionId,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.85,
        rationale: 'Test mapping for cross-module queries',
      });
    });

    it('should find architecture decisions by requirement', async () => {
      const query = `
        MATCH (r:Requirement {id: $requirementId})
        MATCH (r)-[:MAPPED_TO]->(m:RequirementArchitectureMapping)
        MATCH (m)-[:MAPS_TO_DECISION]->(a:ArchitectureDecision)
        RETURN a
      `;

      const results = await neo4j.executeQuery(query, { requirementId: testRequirementId });

      expect(results).toHaveLength(1);
      expect(results[0].a.properties.id).toBe(testArchitectureDecisionId);
    });

    it('should find requirements by architecture decision', async () => {
      const query = `
        MATCH (a:ArchitectureDecision {id: $architectureDecisionId})
        MATCH (m:RequirementArchitectureMapping)-[:MAPS_TO_DECISION]->(a)
        MATCH (r:Requirement {id: m.requirementId})
        RETURN r
      `;

      const results = await neo4j.executeQuery(query, { architectureDecisionId: testArchitectureDecisionId });

      expect(results).toHaveLength(1);
      expect(results[0].r.properties.id).toBe(testRequirementId);
    });

    it('should perform complex cross-module aggregation queries', async () => {
      const query = `
        MATCH (p:Project {id: $projectId})-[:CONTAINS]->(r:Requirement)
        OPTIONAL MATCH (r)-[:MAPPED_TO]->(m:RequirementArchitectureMapping)
        WITH p, count(r) as totalReqs, count(m) as mappedReqs
        RETURN {
          projectId: p.id,
          totalRequirements: totalReqs,
          mappedRequirements: mappedReqs,
          unmappedRequirements: totalReqs - mappedReqs,
          mappingCoverage: CASE WHEN totalReqs > 0 THEN toFloat(mappedReqs) / totalReqs ELSE 0 END
        } as stats
      `;

      const results = await neo4j.executeQuery(query, { projectId: testProjectId });

      expect(results).toHaveLength(1);
      const stats = results[0].stats;
      expect(stats.projectId).toBe(testProjectId);
      expect(stats.totalRequirements).toBeGreaterThan(0);
      expect(stats.mappedRequirements).toBeGreaterThanOrEqual(0);
      expect(stats.mappingCoverage).toBeGreaterThanOrEqual(0);
      expect(stats.mappingCoverage).toBeLessThanOrEqual(1);
    });
  });

  describe('Integration Metrics and Health', () => {
    beforeEach(async () => {
      // Create multiple mappings with different confidence levels
      await integrationService.createMapping({
        requirementId: testRequirementId,
        architectureDecisionId: testArchitectureDecisionId,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.9,
        rationale: 'High confidence mapping',
      });
    });

    it('should calculate integration metrics correctly', async () => {
      const metrics = await integrationService.getIntegrationMetrics(testProjectId);

      expect(metrics).toBeDefined();
      expect(typeof metrics.totalRequirements).toBe('number');
      expect(typeof metrics.mappedRequirements).toBe('number');
      expect(typeof metrics.unmappedRequirements).toBe('number');
      expect(typeof metrics.averageConfidence).toBe('number');
      expect(typeof metrics.validationCoverage).toBe('number');
      expect(typeof metrics.recommendationAccuracy).toBe('number');
      expect(typeof metrics.implementationProgress).toBe('number');
      expect(metrics.alignmentDistribution).toBeDefined();

      // Validate ranges
      expect(metrics.averageConfidence).toBeGreaterThanOrEqual(0);
      expect(metrics.averageConfidence).toBeLessThanOrEqual(1);
      expect(metrics.validationCoverage).toBeGreaterThanOrEqual(0);
      expect(metrics.validationCoverage).toBeLessThanOrEqual(1);
    });

    it('should perform comprehensive health check', async () => {
      const healthCheck = await integrationService.performHealthCheck();

      expect(healthCheck).toBeDefined();
      expect(['HEALTHY', 'WARNING', 'CRITICAL']).toContain(healthCheck.status);
      expect(healthCheck.lastChecked).toBeTruthy();
      expect(Array.isArray(healthCheck.issues)).toBe(true);
      expect(healthCheck.metrics).toBeDefined();
      expect(Array.isArray(healthCheck.recommendations)).toBe(true);

      // Validate issue structure if any exist
      healthCheck.issues.forEach(issue => {
        expect(issue.type).toBeTruthy();
        expect(issue.description).toBeTruthy();
        expect(['LOW', 'MEDIUM', 'HIGH']).toContain(issue.severity);
        expect(Array.isArray(issue.affectedItems)).toBe(true);
        expect(Array.isArray(issue.suggestedActions)).toBe(true);
      });
    });
  });

  describe('Event Handling and Real-time Updates', () => {
    it('should handle requirement change events and update architecture mappings', async () => {
      // Create initial mapping
      await integrationService.createMapping({
        requirementId: testRequirementId,
        architectureDecisionId: testArchitectureDecisionId,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.8,
        rationale: 'Initial mapping for event handling test',
      });

      // Simulate requirement change event
      const changeEvent = {
        type: 'REQUIREMENT_UPDATED' as const,
        requirementId: testRequirementId,
        changes: {
          description: 'Updated requirement description with new performance targets',
          priority: RequirementPriority.CRITICAL,
        },
        timestamp: new Date().toISOString(),
        userId: 'test-user',
      };

      // Handle the change event
      await integrationService.handleRequirementChange(changeEvent);

      // Verify impact analysis was triggered
      const impactAnalysis = await integrationService.analyzeRequirementImpact(testRequirementId);
      expect(impactAnalysis).toBeDefined();
      expect(impactAnalysis.requirementId).toBe(testRequirementId);
    });

    it('should maintain referential integrity across modules', async () => {
      // Create mapping
      const mapping = await integrationService.createMapping({
        requirementId: testRequirementId,
        architectureDecisionId: testArchitectureDecisionId,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.8,
        rationale: 'Referential integrity test mapping',
      });

      // Verify mapping exists
      expect(mapping).toBeDefined();

      // Verify all related entities exist
      const requirement = await requirementsService.getRequirementById(testRequirementId);
      const decision = await decisionService.getDecisionById(testArchitectureDecisionId);

      expect(requirement).toBeDefined();
      expect(decision).toBeDefined();

      // Verify relationships in Neo4j
      const relationshipQuery = `
        MATCH (r:Requirement {id: $requirementId})
        MATCH (a:ArchitectureDecision {id: $architectureDecisionId})
        MATCH (m:RequirementArchitectureMapping {id: $mappingId})
        MATCH (r)-[:MAPPED_TO]->(m)-[:MAPS_TO_DECISION]->(a)
        RETURN count(*) as relationshipCount
      `;

      const results = await neo4j.executeQuery(relationshipQuery, {
        requirementId: testRequirementId,
        architectureDecisionId: testArchitectureDecisionId,
        mappingId: mapping.id,
      });

      expect(results[0].relationshipCount).toBe(1);
    });
  });

  // Helper functions
  async function setupTestData(): Promise<void> {
    // Create test project
    testProjectId = 'test-project-' + Date.now();
    await neo4j.executeQuery(
      'CREATE (p:Project {id: $id, name: $name, createdAt: $createdAt})',
      {
        id: testProjectId,
        name: 'Test Integration Project',
        createdAt: new Date().toISOString(),
      }
    );

    // Create test stakeholder
    testStakeholderId = 'test-stakeholder-' + Date.now();
    await neo4j.executeQuery(
      'CREATE (s:Stakeholder {id: $id, name: $name, email: $email})',
      {
        id: testStakeholderId,
        name: 'Test Stakeholder',
        email: 'test@example.com',
      }
    );

    // Create test requirement
    const requirement = await requirementsService.createRequirement({
      description: 'Test requirement for integration testing',
      title: 'Test Integration Requirement',
      type: RequirementType.FUNCTIONAL,
      projectId: testProjectId,
      stakeholderId: testStakeholderId,
    });
    testRequirementId = requirement.id;

    // Create test architecture decision
    const decision = await decisionService.createDecision({
      title: 'Test Architecture Decision',
      description: 'Test decision for integration testing',
      rationale: 'Testing cross-module integration',
      requirementIds: [testRequirementId],
      alternatives: [],
      consequences: ['Test consequence'],
      tradeOffs: [],
    });
    testArchitectureDecisionId = decision.id;

    // Create test pattern
    const pattern = await patternService.createPattern({
      name: 'Test Pattern',
      type: ArchitecturePatternType.MICROSERVICES,
      description: 'Test pattern for integration testing',
      applicabilityConditions: ['Test condition'],
      components: [{
        name: 'Test Component',
        responsibility: 'Test responsibility',
        interactions: ['Test interaction'],
        constraints: ['Test constraint'],
      }],
      qualityAttributes: [{
        name: 'Performance',
        impact: 'POSITIVE',
        description: 'Improves performance',
        metric: 'Response time',
      }],
      knownUses: ['Test use case'],
    });
    testPatternId = pattern.id;

    // Create test technology stack
    const technologyStack = await technologyStackService.createTechnologyStack({
      name: 'Test Technology Stack',
      description: 'Test stack for integration testing',
      layers: [{
        name: 'Application Layer',
        technologies: [{
          name: 'Node.js',
          version: '18.0.0',
          license: 'MIT',
          vendor: 'OpenJS Foundation',
          maturity: 'MATURE',
          communitySupport: 0.9,
          learningCurve: 'MEDIUM',
        }],
        purpose: 'Application runtime',
        alternatives: [],
      }],
    });
    testTechnologyStackId = technologyStack.id;
  }

  async function cleanupTestData(): Promise<void> {
    // Clean up in reverse dependency order
    const queries = [
      'MATCH (m:RequirementArchitectureMapping) WHERE m.requirementId = $requirementId OR m.architectureDecisionId = $architectureDecisionId DETACH DELETE m',
      'MATCH (al:ArchitectureRequirementAlignment) WHERE al.requirementId = $requirementId OR al.architectureDecisionId = $architectureDecisionId DETACH DELETE al',
      'MATCH (r:Requirement {id: $requirementId}) DETACH DELETE r',
      'MATCH (a:ArchitectureDecision {id: $architectureDecisionId}) DETACH DELETE a',
      'MATCH (p:ArchitecturePattern {id: $patternId}) DETACH DELETE p',
      'MATCH (t:TechnologyStack {id: $technologyStackId}) DETACH DELETE t',
      'MATCH (s:Stakeholder {id: $stakeholderId}) DETACH DELETE s',
      'MATCH (proj:Project {id: $projectId}) DETACH DELETE proj',
    ];

    for (const query of queries) {
      try {
        await neo4j.executeQuery(query, {
          requirementId: testRequirementId,
          architectureDecisionId: testArchitectureDecisionId,
          patternId: testPatternId,
          technologyStackId: testTechnologyStackId,
          stakeholderId: testStakeholderId,
          projectId: testProjectId,
        });
      } catch (error) {
        // Ignore cleanup errors
        console.warn('Cleanup error:', error);
      }
    }
  }
});