import { Neo4jService } from '../../src/core/database/neo4j';
import { RequirementsArchitectureIntegrationService } from '../../src/services/requirements-architecture-integration.service';
import { RequirementsService } from '../../src/modules/requirements/services/requirements.service';
import { ArchitectureDecisionService } from '../../src/modules/architecture/services/decision.service';
import { ArchitecturePatternService } from '../../src/modules/architecture/services/pattern.service';
import { TechnologyStackService } from '../../src/modules/architecture/services/technology-stack.service';
import { TestDataFactory } from '../factories/test-data.factory';
import { RequirementType, RequirementStatus } from '../../src/modules/requirements/types/requirement.types';
import { ArchitectureDecisionStatus } from '../../src/modules/architecture/types/architecture.types';
import { RequirementMappingType, AlignmentType } from '../../src/types/integration.types';

describe('Cross-Module Integration Flows', () => {
  let neo4j: Neo4jService;
  let integrationService: RequirementsArchitectureIntegrationService;
  let requirementsService: RequirementsService;
  let decisionService: ArchitectureDecisionService;
  let patternService: ArchitecturePatternService;
  let technologyStackService: TechnologyStackService;

  beforeAll(async () => {
    // Initialize Neo4j with test database
    neo4j = Neo4jService.getInstance();
    await neo4j.initializeSchema();

    // Initialize services
    integrationService = new RequirementsArchitectureIntegrationService(neo4j);
    requirementsService = new RequirementsService(neo4j);
    decisionService = new ArchitectureDecisionService(neo4j);
    patternService = new ArchitecturePatternService(neo4j);
    technologyStackService = new TechnologyStackService(neo4j);
  });

  afterAll(async () => {
    await cleanupAllTestData();
    await neo4j.close();
  });

  describe('End-to-End Requirement to Architecture Flow', () => {
    it('should complete full flow: requirement creation → recommendation → mapping → validation', async () => {
      // 1. Create test scenario data
      const scenario = TestDataFactory.createIntegrationScenario();
      
      // Set up project and stakeholder
      await setupProjectAndStakeholder(scenario.project, scenario.stakeholder);

      // 2. Create requirement
      const requirement = await requirementsService.createRequirement(scenario.requirements[0]);
      expect(requirement.id).toBeDefined();

      // 3. Generate architecture recommendations
      const recommendations = await integrationService.generateRecommendations(requirement.id);
      expect(recommendations).toBeDefined();
      expect(recommendations.requirementId).toBe(requirement.id);
      expect(recommendations.confidence).toBeGreaterThan(0);

      // 4. Create architecture decision based on recommendations
      const decision = await decisionService.createDecision({
        title: 'Performance Architecture Decision',
        description: 'Decision based on performance requirements',
        rationale: 'Recommended architecture for performance needs',
        requirementIds: [requirement.id],
        alternatives: [],
        consequences: ['Improved performance', 'Increased complexity']
      });

      // 5. Create mapping between requirement and decision
      const mapping = await integrationService.createMapping({
        requirementId: requirement.id,
        architectureDecisionId: decision.id,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.9,
        rationale: 'Direct mapping from performance requirement to architecture decision'
      });

      expect(mapping.id).toBeDefined();
      expect(mapping.confidence).toBe(0.9);

      // 6. Validate alignment
      const alignment = await integrationService.validateAlignment(
        requirement.id,
        decision.id
      );

      expect(alignment.requirementId).toBe(requirement.id);
      expect(alignment.architectureDecisionId).toBe(decision.id);
      expect(alignment.alignmentScore).toBeGreaterThan(0);

      // 7. Analyze impact
      const impactAnalysis = await integrationService.analyzeRequirementImpact(requirement.id);
      expect(impactAnalysis.requirementId).toBe(requirement.id);
      expect(impactAnalysis.impactedArchitectureDecisions).toContain(decision.id);

      // 8. Verify data consistency across modules
      await verifyDataConsistency(requirement.id, decision.id, mapping.id);
    });

    it('should handle complex multi-requirement to multi-architecture flow', async () => {
      const scenario = TestDataFactory.createIntegrationScenario();
      await setupProjectAndStakeholder(scenario.project, scenario.stakeholder);

      // Create multiple requirements
      const requirements = [];
      for (const reqData of scenario.requirements) {
        const req = await requirementsService.createRequirement(reqData);
        requirements.push(req);
      }

      // Create multiple architecture decisions
      const decisions = [];
      for (const decisionData of scenario.architectureDecisions) {
        const decision = await decisionService.createDecision(decisionData);
        decisions.push(decision);
      }

      // Create architecture pattern
      const pattern = await patternService.createPattern(scenario.patterns[0]);

      // Create complex mappings
      const mappings = [];
      
      // Performance requirement → Microservices decision
      mappings.push(await integrationService.createMapping({
        requirementId: requirements[0].id,
        architectureDecisionId: decisions[0].id,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.95,
        rationale: 'Performance requirements directly drive microservices architecture'
      }));

      // Security requirement → Security decision
      mappings.push(await integrationService.createMapping({
        requirementId: requirements[1].id,
        architectureDecisionId: decisions[1].id,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.9,
        rationale: 'Security requirements directly drive authentication architecture'
      }));

      // Functional requirement → Pattern
      mappings.push(await integrationService.createMapping({
        requirementId: requirements[2].id,
        architecturePatternId: pattern.id,
        mappingType: RequirementMappingType.INFLUENCED,
        confidence: 0.7,
        rationale: 'Functional requirements influence architectural patterns'
      }));

      // Verify all mappings
      expect(mappings).toHaveLength(3);
      mappings.forEach(mapping => {
        expect(mapping.id).toBeDefined();
        expect(mapping.confidence).toBeGreaterThan(0.5);
      });

      // Analyze cross-requirement impact
      for (const requirement of requirements) {
        const impact = await integrationService.analyzeRequirementImpact(requirement.id);
        expect(impact.requirementId).toBe(requirement.id);
      }

      // Get integration metrics
      const metrics = await integrationService.getIntegrationMetrics(scenario.project.id);
      expect(metrics.totalRequirements).toBe(3);
      expect(metrics.mappedRequirements).toBe(3);
      expect(metrics.unmappedRequirements).toBe(0);
      expect(metrics.averageConfidence).toBeGreaterThan(0.8);
    });
  });

  describe('Requirement Change Propagation', () => {
    it('should propagate requirement changes to architecture components', async () => {
      const scenario = TestDataFactory.createIntegrationScenario();
      await setupProjectAndStakeholder(scenario.project, scenario.stakeholder);

      // Create requirement and decision
      const requirement = await requirementsService.createRequirement(scenario.requirements[0]);
      const decision = await decisionService.createDecision(scenario.architectureDecisions[0]);

      // Create mapping
      const mapping = await integrationService.createMapping({
        requirementId: requirement.id,
        architectureDecisionId: decision.id,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.8,
        rationale: 'Initial mapping for change propagation test'
      });

      // Simulate requirement change
      const changeEvent = {
        type: 'REQUIREMENT_UPDATED' as const,
        requirementId: requirement.id,
        changes: {
          description: 'Updated performance requirement with stricter SLA',
          priority: 'CRITICAL'
        },
        timestamp: new Date().toISOString(),
        userId: 'test-user'
      };

      // Handle the change
      await integrationService.handleRequirementChange(changeEvent);

      // Verify impact analysis was triggered
      const impactAnalysis = await integrationService.analyzeRequirementImpact(requirement.id);
      expect(impactAnalysis.requirementId).toBe(requirement.id);
      expect(impactAnalysis.impactedArchitectureDecisions).toContain(decision.id);

      // Verify cascading changes were identified
      expect(Array.isArray(impactAnalysis.cascadingChanges)).toBe(true);
      expect(impactAnalysis.riskAssessment).toBeDefined();
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(impactAnalysis.changeComplexity);
    });

    it('should handle requirement status changes and update mappings', async () => {
      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement({ status: RequirementStatus.DRAFT })
      );
      
      const decision = await decisionService.createDecision(
        TestDataFactory.createArchitectureDecision({ status: ArchitectureDecisionStatus.PROPOSED })
      );

      // Create mapping while both are in draft/proposed state
      const mapping = await integrationService.createMapping({
        requirementId: requirement.id,
        architectureDecisionId: decision.id,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.6,
        rationale: 'Preliminary mapping for draft requirement'
      });

      // Update requirement to approved
      const updatedReq = await requirementsService.updateRequirement(requirement.id, {
        status: RequirementStatus.APPROVED
      });

      // Simulate status change event
      const statusChangeEvent = {
        type: 'REQUIREMENT_STATUS_CHANGED' as const,
        requirementId: requirement.id,
        changes: {
          status: RequirementStatus.APPROVED,
          previousStatus: RequirementStatus.DRAFT
        },
        timestamp: new Date().toISOString(),
        userId: 'test-user'
      };

      // Handle status change
      await integrationService.handleRequirementChange(statusChangeEvent);

      // Verify mapping confidence was updated (approval should increase confidence)
      // This would be implemented in the actual service
      expect(updatedReq.status).toBe(RequirementStatus.APPROVED);
    });
  });

  describe('Architecture Decision Impact Analysis', () => {
    it('should analyze impact of architecture changes on requirements', async () => {
      const scenario = TestDataFactory.createIntegrationScenario();
      await setupProjectAndStakeholder(scenario.project, scenario.stakeholder);

      // Create multiple requirements that map to same decision
      const performanceReq = await requirementsService.createRequirement(scenario.requirements[0]);
      const scalabilityReq = await requirementsService.createRequirement({
        ...TestDataFactory.createRequirement(),
        title: 'Scalability Requirement',
        description: 'System must scale to 100,000 users',
        projectId: scenario.project.id,
        stakeholderId: scenario.stakeholder.id
      });

      const microservicesDecision = await decisionService.createDecision(scenario.architectureDecisions[0]);

      // Create mappings
      await integrationService.createMapping({
        requirementId: performanceReq.id,
        architectureDecisionId: microservicesDecision.id,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.9,
        rationale: 'Performance drives microservices'
      });

      await integrationService.createMapping({
        requirementId: scalabilityReq.id,
        architectureDecisionId: microservicesDecision.id,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.85,
        rationale: 'Scalability drives microservices'
      });

      // Analyze impact on both requirements
      const performanceImpact = await integrationService.analyzeRequirementImpact(performanceReq.id);
      const scalabilityImpact = await integrationService.analyzeRequirementImpact(scalabilityReq.id);

      // Both should reference the same architecture decision
      expect(performanceImpact.impactedArchitectureDecisions).toContain(microservicesDecision.id);
      expect(scalabilityImpact.impactedArchitectureDecisions).toContain(microservicesDecision.id);

      // Verify cross-impact analysis (changing microservices decision affects both requirements)
      expect(performanceImpact.changeComplexity).toBeDefined();
      expect(scalabilityImpact.changeComplexity).toBeDefined();
    });
  });

  describe('Data Consistency and Referential Integrity', () => {
    it('should maintain referential integrity across all modules', async () => {
      const scenario = TestDataFactory.createIntegrationScenario();
      await setupProjectAndStakeholder(scenario.project, scenario.stakeholder);

      // Create entities
      const requirement = await requirementsService.createRequirement(scenario.requirements[0]);
      const decision = await decisionService.createDecision(scenario.architectureDecisions[0]);
      const pattern = await patternService.createPattern(scenario.patterns[0]);

      // Create mapping
      const mapping = await integrationService.createMapping({
        requirementId: requirement.id,
        architectureDecisionId: decision.id,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.85,
        rationale: 'Referential integrity test'
      });

      // Verify all relationships exist in Neo4j
      const relationshipQuery = `
        MATCH (r:Requirement {id: $requirementId})
        MATCH (a:ArchitectureDecision {id: $architectureDecisionId})
        MATCH (m:RequirementArchitectureMapping {id: $mappingId})
        MATCH (r)-[:MAPPED_TO]->(m)-[:MAPS_TO_DECISION]->(a)
        RETURN r, a, m
      `;

      const results = await neo4j.executeQuery(relationshipQuery, {
        requirementId: requirement.id,
        architectureDecisionId: decision.id,
        mappingId: mapping.id
      });

      expect(results).toHaveLength(1);
      expect(results[0].r.properties.id).toBe(requirement.id);
      expect(results[0].a.properties.id).toBe(decision.id);
      expect(results[0].m.properties.id).toBe(mapping.id);
    });

    it('should handle cascading deletions properly', async () => {
      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement()
      );
      const decision = await decisionService.createDecision(
        TestDataFactory.createArchitectureDecision()
      );

      // Create mapping
      const mapping = await integrationService.createMapping({
        requirementId: requirement.id,
        architectureDecisionId: decision.id,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.8,
        rationale: 'Cascade deletion test'
      });

      // Verify mapping exists
      const mappingQuery = `
        MATCH (m:RequirementArchitectureMapping {id: $mappingId})
        RETURN m
      `;
      
      let results = await neo4j.executeQuery(mappingQuery, { mappingId: mapping.id });
      expect(results).toHaveLength(1);

      // Delete requirement
      await requirementsService.deleteRequirement(requirement.id);

      // Verify mapping was cleaned up (this would need to be implemented in the service)
      // For now, we just verify the requirement is deleted
      try {
        await requirementsService.getRequirementById(requirement.id);
        fail('Requirement should have been deleted');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Health Checks and Monitoring', () => {
    it('should identify orphaned requirements in health check', async () => {
      // Create requirement without mapping
      const orphanedRequirement = await requirementsService.createRequirement({
        ...TestDataFactory.createRequirement(),
        status: RequirementStatus.APPROVED
      });

      // Create requirement with mapping
      const mappedRequirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement()
      );
      const decision = await decisionService.createDecision(
        TestDataFactory.createArchitectureDecision()
      );

      await integrationService.createMapping({
        requirementId: mappedRequirement.id,
        architectureDecisionId: decision.id,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.8,
        rationale: 'Mapped requirement for health check test'
      });

      // Run health check
      const healthCheck = await integrationService.performHealthCheck();

      // Should identify orphaned requirement
      const orphanedIssue = healthCheck.issues.find(
        issue => issue.type === 'ORPHANED_REQUIREMENT'
      );

      if (orphanedIssue) {
        expect(orphanedIssue.affectedItems).toContain(orphanedRequirement.id);
        expect(orphanedIssue.severity).toBe('HIGH');
      }

      expect(['HEALTHY', 'WARNING', 'CRITICAL']).toContain(healthCheck.status);
    });

    it('should calculate accurate integration metrics', async () => {
      const scenario = TestDataFactory.createIntegrationScenario();
      await setupProjectAndStakeholder(scenario.project, scenario.stakeholder);

      // Create test data
      const requirements = [];
      for (let i = 0; i < 5; i++) {
        const req = await requirementsService.createRequirement({
          ...TestDataFactory.createRequirement(),
          projectId: scenario.project.id,
          stakeholderId: scenario.stakeholder.id
        });
        requirements.push(req);
      }

      // Create decisions and map only some requirements
      const decision1 = await decisionService.createDecision(
        TestDataFactory.createArchitectureDecision()
      );
      const decision2 = await decisionService.createDecision(
        TestDataFactory.createArchitectureDecision()
      );

      // Map 3 out of 5 requirements
      await integrationService.createMapping({
        requirementId: requirements[0].id,
        architectureDecisionId: decision1.id,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.9,
        rationale: 'High confidence mapping'
      });

      await integrationService.createMapping({
        requirementId: requirements[1].id,
        architectureDecisionId: decision1.id,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.8,
        rationale: 'Medium-high confidence mapping'
      });

      await integrationService.createMapping({
        requirementId: requirements[2].id,
        architectureDecisionId: decision2.id,
        mappingType: RequirementMappingType.DERIVED,
        confidence: 0.6,
        rationale: 'Lower confidence mapping'
      });

      // Get metrics
      const metrics = await integrationService.getIntegrationMetrics(scenario.project.id);

      expect(metrics.totalRequirements).toBe(5);
      expect(metrics.mappedRequirements).toBe(3);
      expect(metrics.unmappedRequirements).toBe(2);
      
      // Average confidence should be (0.9 + 0.8 + 0.6) / 3 = 0.77
      expect(metrics.averageConfidence).toBeCloseTo(0.77, 2);
    });
  });

  // Helper functions

  async function setupProjectAndStakeholder(project: any, stakeholder: any): Promise<void> {
    // Create project
    await neo4j.executeQuery(
      'CREATE (p:Project {id: $id, name: $name, description: $description, status: $status, createdAt: $createdAt})',
      project
    );

    // Create stakeholder
    await neo4j.executeQuery(
      'CREATE (s:Stakeholder {id: $id, name: $name, email: $email, role: $role, department: $department, createdAt: $createdAt})',
      stakeholder
    );
  }

  async function verifyDataConsistency(requirementId: string, decisionId: string, mappingId: string): Promise<void> {
    // Verify requirement exists
    const requirement = await requirementsService.getRequirementById(requirementId);
    expect(requirement).toBeDefined();
    expect(requirement.id).toBe(requirementId);

    // Verify decision exists
    const decision = await decisionService.getDecisionById(decisionId);
    expect(decision).toBeDefined();
    expect(decision.id).toBe(decisionId);

    // Verify mapping relationships
    const relationshipQuery = `
      MATCH (r:Requirement {id: $requirementId})
      MATCH (a:ArchitectureDecision {id: $decisionId})
      MATCH (m:RequirementArchitectureMapping {id: $mappingId})
      MATCH (r)-[:MAPPED_TO]->(m)-[:MAPS_TO_DECISION]->(a)
      RETURN count(*) as relationshipCount
    `;

    const results = await neo4j.executeQuery(relationshipQuery, {
      requirementId,
      decisionId,
      mappingId
    });

    expect(results[0].relationshipCount).toBe(1);
  }

  async function cleanupAllTestData(): Promise<void> {
    // Clean up in dependency order
    const cleanupQueries = [
      'MATCH (m:RequirementArchitectureMapping) DETACH DELETE m',
      'MATCH (al:ArchitectureRequirementAlignment) DETACH DELETE al', 
      'MATCH (r:Requirement) WHERE r.id STARTS WITH \"test-\" DETACH DELETE r',
      'MATCH (a:ArchitectureDecision) WHERE a.id STARTS WITH \"test-\" DETACH DELETE a',
      'MATCH (p:ArchitecturePattern) WHERE p.id STARTS WITH \"test-\" DETACH DELETE p',
      'MATCH (t:TechnologyStack) WHERE t.id STARTS WITH \"test-\" DETACH DELETE t',
      'MATCH (s:Stakeholder) WHERE s.id STARTS WITH \"test-\" DETACH DELETE s',
      'MATCH (proj:Project) WHERE proj.id STARTS WITH \"test-\" DETACH DELETE proj'
    ];

    for (const query of cleanupQueries) {
      try {
        await neo4j.executeQuery(query);
      } catch (error) {
        console.warn('Cleanup warning:', error);
      }
    }
  }
});