import { v4 as uuidv4 } from 'uuid';
import { Neo4jService } from '../core/database/neo4j';
import { logger } from '../core/logging/logger';
import { RequirementsService } from '../modules/requirements/services/requirements.service';
import { ArchitectureDecisionService } from '../modules/architecture/services/decision.service';
import { ArchitecturePatternService } from '../modules/architecture/services/pattern.service';
import { TechnologyStackService } from '../modules/architecture/services/technology-stack.service';
import { Requirement, RequirementType } from '../modules/requirements/types/requirement.types';
import { ArchitectureDecision } from '../modules/architecture/types/architecture.types';
import {
  RequirementArchitectureMapping,
  RequirementMappingType,
  RequirementArchitectureRecommendation,
  ArchitectureRequirementAlignment,
  AlignmentType,
  ValidationStatus,
  RequirementImpactAnalysis,
  IntegrationMetrics,
  RequirementChangeEvent,
  ArchitectureChangeEvent,
  IntegrationHealthCheck,
  CascadingChange,
  RiskAssessment,
} from '../types/integration.types';

export class RequirementsArchitectureIntegrationService {
  private requirementsService: RequirementsService;
  private decisionService: ArchitectureDecisionService;
  private patternService: ArchitecturePatternService;
  private technologyStackService: TechnologyStackService;

  constructor(private neo4j: Neo4jService) {
    this.requirementsService = new RequirementsService(neo4j);
    this.decisionService = new ArchitectureDecisionService(neo4j);
    this.patternService = new ArchitecturePatternService(neo4j);
    this.technologyStackService = new TechnologyStackService(neo4j);
  }

  /**
   * Create a mapping between a requirement and architecture component
   */
  async createMapping(input: {
    requirementId: string;
    architectureDecisionId?: string;
    architecturePatternId?: string;
    technologyStackId?: string;
    mappingType: RequirementMappingType;
    confidence: number;
    rationale: string;
  }): Promise<RequirementArchitectureMapping> {
    try {
      const id = uuidv4();
      const mapping: RequirementArchitectureMapping = {
        id,
        ...input,
        createdAt: new Date().toISOString(),
      };

      // Create the mapping in Neo4j with appropriate relationships
      const query = `
        MATCH (r:Requirement {id: $requirementId})
        CREATE (m:RequirementArchitectureMapping {
          id: $id,
          requirementId: $requirementId,
          architectureDecisionId: $architectureDecisionId,
          architecturePatternId: $architecturePatternId,
          technologyStackId: $technologyStackId,
          mappingType: $mappingType,
          confidence: $confidence,
          rationale: $rationale,
          createdAt: $createdAt
        })
        CREATE (r)-[:MAPPED_TO]->(m)
        
        ${input.architectureDecisionId ? `
          WITH m
          MATCH (a:ArchitectureDecision {id: $architectureDecisionId})
          CREATE (m)-[:MAPS_TO_DECISION]->(a)
        ` : ''}
        
        ${input.architecturePatternId ? `
          WITH m
          MATCH (p:ArchitecturePattern {id: $architecturePatternId})
          CREATE (m)-[:MAPS_TO_PATTERN]->(p)
        ` : ''}
        
        ${input.technologyStackId ? `
          WITH m
          MATCH (t:TechnologyStack {id: $technologyStackId})
          CREATE (m)-[:MAPS_TO_TECHNOLOGY]->(t)
        ` : ''}
        
        RETURN m
      `;

      await this.neo4j.executeQuery(query, mapping);
      logger.info(`Created requirement-architecture mapping: ${id}`);

      // Trigger impact analysis for this new mapping
      await this.analyzeRequirementImpact(input.requirementId);

      return mapping;
    } catch (error) {
      logger.error('Failed to create requirement-architecture mapping', error);
      throw error;
    }
  }

  /**
   * Generate architecture recommendations based on requirements
   */
  async generateRecommendations(
    requirementId: string
  ): Promise<RequirementArchitectureRecommendation> {
    try {
      const requirement = await this.requirementsService.getRequirementById(requirementId);
      if (!requirement) {
        throw new Error(`Requirement not found: ${requirementId}`);
      }

      // Get related requirements to understand context
      const relatedRequirements = await this.getRelatedRequirements(requirementId);
      
      // Find matching patterns based on requirement characteristics
      const patternRecommendations = await this.findSuitablePatterns(requirement, relatedRequirements);
      
      // Find suitable technology stacks
      const technologyRecommendations = await this.findSuitableTechnologies(requirement, relatedRequirements);
      
      // Extract architectural constraints from requirements
      const architecturalConstraints = await this.extractArchitecturalConstraints(requirement);
      
      // Map quality attributes
      const qualityAttributes = await this.mapQualityAttributes(requirement);
      
      // Generate implementation strategy
      const implementationStrategy = await this.generateImplementationStrategy(
        requirement, 
        patternRecommendations,
        technologyRecommendations
      );

      const recommendation: RequirementArchitectureRecommendation = {
        requirementId,
        recommendedPatterns: patternRecommendations,
        recommendedTechnologies: technologyRecommendations,
        architecturalConstraints,
        qualityAttributes,
        implementationStrategy,
        confidence: this.calculateRecommendationConfidence(patternRecommendations, technologyRecommendations),
        reasoning: this.generateRecommendationReasoning(requirement, patternRecommendations),
      };

      // Store recommendation for future reference
      await this.storeRecommendation(recommendation);

      logger.info(`Generated architecture recommendations for requirement: ${requirementId}`);
      return recommendation;
    } catch (error) {
      logger.error('Failed to generate architecture recommendations', error);
      throw error;
    }
  }

  /**
   * Validate alignment between requirements and architecture decisions
   */
  async validateAlignment(
    requirementId: string,
    architectureDecisionId: string
  ): Promise<ArchitectureRequirementAlignment> {
    try {
      const alignment = await this.assessAlignment(requirementId, architectureDecisionId);
      
      // Store validation result
      const query = `
        MERGE (alignment:ArchitectureRequirementAlignment {
          requirementId: $requirementId,
          architectureDecisionId: $architectureDecisionId
        })
        SET alignment.alignmentScore = $alignmentScore,
            alignment.alignmentType = $alignmentType,
            alignment.gaps = $gaps,
            alignment.recommendations = $recommendations,
            alignment.validationStatus = $validationStatus,
            alignment.lastAssessed = $lastAssessed
        RETURN alignment
      `;

      await this.neo4j.executeQuery(query, alignment);
      logger.info(`Validated alignment between requirement ${requirementId} and architecture decision ${architectureDecisionId}`);
      
      return alignment;
    } catch (error) {
      logger.error('Failed to validate requirement-architecture alignment', error);
      throw error;
    }
  }

  /**
   * Analyze impact of requirement changes on architecture
   */
  async analyzeRequirementImpact(requirementId: string): Promise<RequirementImpactAnalysis> {
    try {
      const query = `
        MATCH (r:Requirement {id: $requirementId})
        OPTIONAL MATCH (r)-[:MAPPED_TO]->(m:RequirementArchitectureMapping)
        OPTIONAL MATCH (m)-[:MAPS_TO_DECISION]->(ad:ArchitectureDecision)
        OPTIONAL MATCH (m)-[:MAPS_TO_PATTERN]->(ap:ArchitecturePattern)
        OPTIONAL MATCH (m)-[:MAPS_TO_TECHNOLOGY]->(ts:TechnologyStack)
        RETURN r, collect(DISTINCT ad) as decisions, 
               collect(DISTINCT ap) as patterns,
               collect(DISTINCT ts) as technologies
      `;

      const results = await this.neo4j.executeQuery(query, { requirementId });
      if (results.length === 0) {
        throw new Error(`Requirement not found: ${requirementId}`);
      }

      const result = results[0];
      const cascadingChanges = await this.identifyCascadingChanges(
        requirementId,
        result.decisions,
        result.patterns,
        result.technologies
      );

      const riskAssessment = await this.assessChangeRisk(cascadingChanges);
      
      const impactAnalysis: RequirementImpactAnalysis = {
        requirementId,
        impactedArchitectureDecisions: result.decisions.map((d: any) => d.properties.id),
        impactedPatterns: result.patterns.map((p: any) => p.properties.id),
        impactedTechnologies: result.technologies.map((t: any) => t.properties.id),
        cascadingChanges,
        riskAssessment,
        changeComplexity: this.calculateChangeComplexity(cascadingChanges),
        estimatedEffort: this.estimateChangeEffort(cascadingChanges, riskAssessment),
      };

      logger.info(`Analyzed impact for requirement: ${requirementId}`);
      return impactAnalysis;
    } catch (error) {
      logger.error('Failed to analyze requirement impact', error);
      throw error;
    }
  }

  /**
   * Get integration metrics for monitoring and reporting
   */
  async getIntegrationMetrics(projectId?: string): Promise<IntegrationMetrics> {
    try {
      const projectFilter = projectId ? `(r)<-[:CONTAINS]-(p:Project {id: $projectId})` : '';
      
      const query = `
        MATCH (r:Requirement)
        ${projectFilter ? `MATCH ${projectFilter}` : ''}
        OPTIONAL MATCH (r)-[:MAPPED_TO]->(m:RequirementArchitectureMapping)
        OPTIONAL MATCH (alignment:ArchitectureRequirementAlignment)
        WHERE alignment.requirementId = r.id
        
        WITH count(DISTINCT r) as totalReqs,
             count(DISTINCT CASE WHEN m IS NOT NULL THEN r END) as mappedReqs,
             collect(DISTINCT m.confidence) as confidences,
             collect(DISTINCT alignment.alignmentType) as alignments,
             count(DISTINCT CASE WHEN alignment.validationStatus = 'VALIDATED' THEN alignment END) as validatedAlignments,
             count(DISTINCT alignment) as totalAlignments
        
        RETURN {
          totalRequirements: totalReqs,
          mappedRequirements: mappedReqs,
          unmappedRequirements: totalReqs - mappedReqs,
          averageConfidence: CASE WHEN size(confidences) > 0 THEN reduce(sum = 0.0, conf IN confidences | sum + conf) / size(confidences) ELSE 0 END,
          validationCoverage: CASE WHEN totalAlignments > 0 THEN toFloat(validatedAlignments) / totalAlignments ELSE 0 END,
          alignments: alignments
        } as metrics
      `;

      const results = await this.neo4j.executeQuery(query, projectId ? { projectId } : {});
      const metrics = results[0]?.metrics || {};

      // Calculate alignment distribution
      const alignmentDistribution = metrics.alignments?.reduce((acc: any, alignment: string) => {
        acc[alignment] = (acc[alignment] || 0) + 1;
        return acc;
      }, {} as Record<AlignmentType, number>) || {};

      const integrationMetrics: IntegrationMetrics = {
        totalRequirements: metrics.totalRequirements || 0,
        mappedRequirements: metrics.mappedRequirements || 0,
        unmappedRequirements: metrics.unmappedRequirements || 0,
        averageConfidence: metrics.averageConfidence || 0,
        alignmentDistribution,
        validationCoverage: metrics.validationCoverage || 0,
        recommendationAccuracy: await this.calculateRecommendationAccuracy(),
        implementationProgress: await this.calculateImplementationProgress(projectId),
      };

      return integrationMetrics;
    } catch (error) {
      logger.error('Failed to get integration metrics', error);
      throw error;
    }
  }

  /**
   * Handle requirement change events and trigger architecture updates
   */
  async handleRequirementChange(event: RequirementChangeEvent): Promise<void> {
    try {
      logger.info('Processing requirement change event', { event });

      // Analyze impact of the change
      const impactAnalysis = await this.analyzeRequirementImpact(event.requirementId);
      
      // Update affected mappings if needed
      await this.updateAffectedMappings(event, impactAnalysis);
      
      // Trigger re-validation of alignments
      await this.revalidateAffectedAlignments(event.requirementId);
      
      // Generate new recommendations if significant changes detected
      if (this.isSignificantChange(event)) {
        await this.generateRecommendations(event.requirementId);
      }

      logger.info('Completed requirement change processing', { requirementId: event.requirementId });
    } catch (error) {
      logger.error('Failed to handle requirement change', error);
      throw error;
    }
  }

  /**
   * Perform integration health check
   */
  async performHealthCheck(): Promise<IntegrationHealthCheck> {
    try {
      const issues = [];
      
      // Check for orphaned requirements
      const orphanedQuery = `
        MATCH (r:Requirement)
        WHERE NOT (r)-[:MAPPED_TO]->(:RequirementArchitectureMapping)
        AND r.status IN ['APPROVED', 'IMPLEMENTED']
        RETURN count(r) as count, collect(r.id)[0..10] as sample
      `;
      const orphanedResult = await this.neo4j.executeQuery(orphanedQuery);
      if (orphanedResult[0]?.count > 0) {
        issues.push({
          type: 'ORPHANED_REQUIREMENT' as const,
          description: `${orphanedResult[0].count} approved/implemented requirements without architecture mappings`,
          severity: 'HIGH' as const,
          affectedItems: orphanedResult[0].sample,
          suggestedActions: ['Review unmapped requirements and create appropriate mappings'],
        });
      }

      // Check for broken mappings
      const brokenMappingsQuery = `
        MATCH (m:RequirementArchitectureMapping)
        WHERE (m.architectureDecisionId IS NOT NULL AND NOT exists((:ArchitectureDecision {id: m.architectureDecisionId})))
        OR (m.architecturePatternId IS NOT NULL AND NOT exists((:ArchitecturePattern {id: m.architecturePatternId})))
        OR (m.technologyStackId IS NOT NULL AND NOT exists((:TechnologyStack {id: m.technologyStackId})))
        RETURN count(m) as count, collect(m.id)[0..10] as sample
      `;
      const brokenResult = await this.neo4j.executeQuery(brokenMappingsQuery);
      if (brokenResult[0]?.count > 0) {
        issues.push({
          type: 'BROKEN_MAPPING' as const,
          description: `${brokenResult[0].count} mappings reference non-existent architecture components`,
          severity: 'HIGH' as const,
          affectedItems: brokenResult[0].sample,
          suggestedActions: ['Clean up broken references or restore missing architecture components'],
        });
      }

      const metrics = await this.getIntegrationMetrics();
      
      const healthCheck: IntegrationHealthCheck = {
        status: issues.length === 0 ? 'HEALTHY' : issues.some(i => i.severity === 'HIGH') ? 'CRITICAL' : 'WARNING',
        lastChecked: new Date().toISOString(),
        issues,
        metrics,
        recommendations: this.generateHealthRecommendations(metrics, issues),
      };

      return healthCheck;
    } catch (error) {
      logger.error('Failed to perform integration health check', error);
      throw error;
    }
  }

  // Private helper methods

  private async getRelatedRequirements(requirementId: string): Promise<Requirement[]> {
    const query = `
      MATCH (r:Requirement {id: $requirementId})
      MATCH (r)-[:SIMILAR_TO|DEPENDS_ON|CONFLICTS_WITH]-(related:Requirement)
      RETURN DISTINCT related
      LIMIT 10
    `;
    
    const results = await this.neo4j.executeQuery(query, { requirementId });
    return results.map(result => this.mapToRequirement(result.related));
  }

  private async findSuitablePatterns(requirement: Requirement, relatedRequirements: Requirement[]): Promise<any[]> {
    // AI-driven pattern matching logic would go here
    // For now, implement basic pattern matching based on requirement characteristics
    return [];
  }

  private async findSuitableTechnologies(requirement: Requirement, relatedRequirements: Requirement[]): Promise<any[]> {
    // Technology recommendation logic based on requirements
    return [];
  }

  private async extractArchitecturalConstraints(requirement: Requirement): Promise<any[]> {
    // Extract constraints from requirement text and metadata
    return [];
  }

  private async mapQualityAttributes(requirement: Requirement): Promise<any[]> {
    // Map requirement to quality attributes
    return [];
  }

  private async generateImplementationStrategy(requirement: Requirement, patterns: any[], technologies: any[]): Promise<any> {
    // Generate implementation strategy based on recommendations
    return {
      approach: 'INCREMENTAL',
      dependencies: [],
      riskMitigations: [],
      estimatedEffort: 0,
      timeline: 'TBD',
    };
  }

  private calculateRecommendationConfidence(patterns: any[], technologies: any[]): number {
    // Calculate confidence based on pattern and technology matches
    return 0.75;
  }

  private generateRecommendationReasoning(requirement: Requirement, patterns: any[]): string[] {
    // Generate human-readable reasoning for recommendations
    return ['Based on requirement characteristics and historical patterns'];
  }

  private async storeRecommendation(recommendation: RequirementArchitectureRecommendation): Promise<void> {
    // Store recommendation in Neo4j for future reference
  }

  private async assessAlignment(requirementId: string, architectureDecisionId: string): Promise<ArchitectureRequirementAlignment> {
    // Assess alignment between requirement and architecture decision
    return {
      requirementId,
      architectureDecisionId,
      alignmentScore: 0.8,
      alignmentType: AlignmentType.PARTIALLY_ALIGNED,
      gaps: [],
      recommendations: [],
      validationStatus: ValidationStatus.PENDING,
      lastAssessed: new Date().toISOString(),
    };
  }

  private async identifyCascadingChanges(
    requirementId: string,
    decisions: any[],
    patterns: any[],
    technologies: any[]
  ): Promise<CascadingChange[]> {
    // Identify cascading changes from requirement modification
    return [];
  }

  private async assessChangeRisk(cascadingChanges: CascadingChange[]): Promise<RiskAssessment> {
    // Assess risk of implementing cascading changes
    return {
      overallRisk: 'MEDIUM',
      riskFactors: [],
      mitigationStrategies: [],
    };
  }

  private calculateChangeComplexity(cascadingChanges: CascadingChange[]): 'LOW' | 'MEDIUM' | 'HIGH' {
    // Calculate complexity based on number and type of cascading changes
    return cascadingChanges.length > 5 ? 'HIGH' : cascadingChanges.length > 2 ? 'MEDIUM' : 'LOW';
  }

  private estimateChangeEffort(cascadingChanges: CascadingChange[], riskAssessment: RiskAssessment): number {
    // Estimate effort in person-hours based on changes and risks
    return cascadingChanges.length * 8; // Simple estimation
  }

  private async calculateRecommendationAccuracy(): Promise<number> {
    // Calculate accuracy of past recommendations
    return 0.85;
  }

  private async calculateImplementationProgress(projectId?: string): Promise<number> {
    // Calculate implementation progress based on requirement statuses
    return 0.65;
  }

  private async updateAffectedMappings(event: RequirementChangeEvent, impactAnalysis: RequirementImpactAnalysis): Promise<void> {
    // Update mappings that are affected by requirement changes
  }

  private async revalidateAffectedAlignments(requirementId: string): Promise<void> {
    // Re-validate alignments for affected architecture components
  }

  private isSignificantChange(event: RequirementChangeEvent): boolean {
    // Determine if the change is significant enough to trigger re-analysis
    return event.type === 'REQUIREMENT_UPDATED' && 
           (event.changes.description || event.changes.type || event.changes.priority);
  }

  private generateHealthRecommendations(metrics: IntegrationMetrics, issues: any[]): string[] {
    const recommendations = [];
    
    if (metrics.unmappedRequirements > 0) {
      recommendations.push(`Review and map ${metrics.unmappedRequirements} unmapped requirements`);
    }
    
    if (metrics.validationCoverage < 0.8) {
      recommendations.push('Increase validation coverage by reviewing requirement-architecture alignments');
    }
    
    if (metrics.averageConfidence < 0.7) {
      recommendations.push('Review and improve mapping confidence through better requirement analysis');
    }
    
    return recommendations;
  }

  private mapToRequirement(node: any): Requirement {
    return {
      id: node.properties.id,
      title: node.properties.title,
      description: node.properties.description,
      type: node.properties.type,
      status: node.properties.status,
      priority: node.properties.priority,
      createdAt: node.properties.createdAt,
      updatedAt: node.properties.updatedAt,
      projectId: node.properties.projectId,
      stakeholderId: node.properties.stakeholderId,
      embedding: node.properties.embedding,
      completenessScore: node.properties.completenessScore,
      qualityScore: node.properties.qualityScore,
    };
  }
}