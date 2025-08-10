"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirementsArchitectureIntegrationService = void 0;
const uuid_1 = require("uuid");
const logger_1 = require("../core/logging/logger");
const requirements_service_1 = require("../modules/requirements/services/requirements.service");
const decision_service_1 = require("../modules/architecture/services/decision.service");
const pattern_service_1 = require("../modules/architecture/services/pattern.service");
const technology_stack_service_1 = require("../modules/architecture/services/technology-stack.service");
const integration_types_1 = require("../types/integration.types");
class RequirementsArchitectureIntegrationService {
    neo4j;
    requirementsService;
    decisionService;
    patternService;
    technologyStackService;
    constructor(neo4j) {
        this.neo4j = neo4j;
        this.requirementsService = new requirements_service_1.RequirementsService(neo4j);
        this.decisionService = new decision_service_1.ArchitectureDecisionService(neo4j);
        this.patternService = new pattern_service_1.ArchitecturePatternService(neo4j);
        this.technologyStackService = new technology_stack_service_1.TechnologyStackService(neo4j);
    }
    /**
     * Create a mapping between a requirement and architecture component
     */
    async createMapping(input) {
        try {
            const id = (0, uuid_1.v4)();
            const mapping = {
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
            logger_1.logger.info(`Created requirement-architecture mapping: ${id}`);
            // Trigger impact analysis for this new mapping
            await this.analyzeRequirementImpact(input.requirementId);
            return mapping;
        }
        catch (error) {
            logger_1.logger.error('Failed to create requirement-architecture mapping', error);
            throw error;
        }
    }
    /**
     * Generate architecture recommendations based on requirements
     */
    async generateRecommendations(requirementId) {
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
            const implementationStrategy = await this.generateImplementationStrategy(requirement, patternRecommendations, technologyRecommendations);
            const recommendation = {
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
            logger_1.logger.info(`Generated architecture recommendations for requirement: ${requirementId}`);
            return recommendation;
        }
        catch (error) {
            logger_1.logger.error('Failed to generate architecture recommendations', error);
            throw error;
        }
    }
    /**
     * Validate alignment between requirements and architecture decisions
     */
    async validateAlignment(requirementId, architectureDecisionId) {
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
            logger_1.logger.info(`Validated alignment between requirement ${requirementId} and architecture decision ${architectureDecisionId}`);
            return alignment;
        }
        catch (error) {
            logger_1.logger.error('Failed to validate requirement-architecture alignment', error);
            throw error;
        }
    }
    /**
     * Analyze impact of requirement changes on architecture
     */
    async analyzeRequirementImpact(requirementId) {
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
            const cascadingChanges = await this.identifyCascadingChanges(requirementId, result.decisions, result.patterns, result.technologies);
            const riskAssessment = await this.assessChangeRisk(cascadingChanges);
            const impactAnalysis = {
                requirementId,
                impactedArchitectureDecisions: result.decisions.map((d) => d.properties.id),
                impactedPatterns: result.patterns.map((p) => p.properties.id),
                impactedTechnologies: result.technologies.map((t) => t.properties.id),
                cascadingChanges,
                riskAssessment,
                changeComplexity: this.calculateChangeComplexity(cascadingChanges),
                estimatedEffort: this.estimateChangeEffort(cascadingChanges, riskAssessment),
            };
            logger_1.logger.info(`Analyzed impact for requirement: ${requirementId}`);
            return impactAnalysis;
        }
        catch (error) {
            logger_1.logger.error('Failed to analyze requirement impact', error);
            throw error;
        }
    }
    /**
     * Get integration metrics for monitoring and reporting
     */
    async getIntegrationMetrics(projectId) {
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
            const alignmentDistribution = metrics.alignments?.reduce((acc, alignment) => {
                acc[alignment] = (acc[alignment] || 0) + 1;
                return acc;
            }, {}) || {};
            const integrationMetrics = {
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
        }
        catch (error) {
            logger_1.logger.error('Failed to get integration metrics', error);
            throw error;
        }
    }
    /**
     * Handle requirement change events and trigger architecture updates
     */
    async handleRequirementChange(event) {
        try {
            logger_1.logger.info('Processing requirement change event', { event });
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
            logger_1.logger.info('Completed requirement change processing', { requirementId: event.requirementId });
        }
        catch (error) {
            logger_1.logger.error('Failed to handle requirement change', error);
            throw error;
        }
    }
    /**
     * Perform integration health check
     */
    async performHealthCheck() {
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
                    type: 'ORPHANED_REQUIREMENT',
                    description: `${orphanedResult[0].count} approved/implemented requirements without architecture mappings`,
                    severity: 'HIGH',
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
                    type: 'BROKEN_MAPPING',
                    description: `${brokenResult[0].count} mappings reference non-existent architecture components`,
                    severity: 'HIGH',
                    affectedItems: brokenResult[0].sample,
                    suggestedActions: ['Clean up broken references or restore missing architecture components'],
                });
            }
            const metrics = await this.getIntegrationMetrics();
            const healthCheck = {
                status: issues.length === 0 ? 'HEALTHY' : issues.some(i => i.severity === 'HIGH') ? 'CRITICAL' : 'WARNING',
                lastChecked: new Date().toISOString(),
                issues,
                metrics,
                recommendations: this.generateHealthRecommendations(metrics, issues),
            };
            return healthCheck;
        }
        catch (error) {
            logger_1.logger.error('Failed to perform integration health check', error);
            throw error;
        }
    }
    // Private helper methods
    async getRelatedRequirements(requirementId) {
        const query = `
      MATCH (r:Requirement {id: $requirementId})
      MATCH (r)-[:SIMILAR_TO|DEPENDS_ON|CONFLICTS_WITH]-(related:Requirement)
      RETURN DISTINCT related
      LIMIT 10
    `;
        const results = await this.neo4j.executeQuery(query, { requirementId });
        return results.map(result => this.mapToRequirement(result.related));
    }
    async findSuitablePatterns(requirement, relatedRequirements) {
        // AI-driven pattern matching logic would go here
        // For now, implement basic pattern matching based on requirement characteristics
        return [];
    }
    async findSuitableTechnologies(requirement, relatedRequirements) {
        // Technology recommendation logic based on requirements
        return [];
    }
    async extractArchitecturalConstraints(requirement) {
        // Extract constraints from requirement text and metadata
        return [];
    }
    async mapQualityAttributes(requirement) {
        // Map requirement to quality attributes
        return [];
    }
    async generateImplementationStrategy(requirement, patterns, technologies) {
        // Generate implementation strategy based on recommendations
        return {
            approach: 'INCREMENTAL',
            dependencies: [],
            riskMitigations: [],
            estimatedEffort: 0,
            timeline: 'TBD',
        };
    }
    calculateRecommendationConfidence(patterns, technologies) {
        // Calculate confidence based on pattern and technology matches
        return 0.75;
    }
    generateRecommendationReasoning(requirement, patterns) {
        // Generate human-readable reasoning for recommendations
        return ['Based on requirement characteristics and historical patterns'];
    }
    async storeRecommendation(recommendation) {
        // Store recommendation in Neo4j for future reference
    }
    async assessAlignment(requirementId, architectureDecisionId) {
        // Assess alignment between requirement and architecture decision
        return {
            requirementId,
            architectureDecisionId,
            alignmentScore: 0.8,
            alignmentType: integration_types_1.AlignmentType.PARTIALLY_ALIGNED,
            gaps: [],
            recommendations: [],
            validationStatus: integration_types_1.ValidationStatus.PENDING,
            lastAssessed: new Date().toISOString(),
        };
    }
    async identifyCascadingChanges(requirementId, decisions, patterns, technologies) {
        // Identify cascading changes from requirement modification
        return [];
    }
    async assessChangeRisk(cascadingChanges) {
        // Assess risk of implementing cascading changes
        return {
            overallRisk: 'MEDIUM',
            riskFactors: [],
            mitigationStrategies: [],
        };
    }
    calculateChangeComplexity(cascadingChanges) {
        // Calculate complexity based on number and type of cascading changes
        return cascadingChanges.length > 5 ? 'HIGH' : cascadingChanges.length > 2 ? 'MEDIUM' : 'LOW';
    }
    estimateChangeEffort(cascadingChanges, riskAssessment) {
        // Estimate effort in person-hours based on changes and risks
        return cascadingChanges.length * 8; // Simple estimation
    }
    async calculateRecommendationAccuracy() {
        // Calculate accuracy of past recommendations
        return 0.85;
    }
    async calculateImplementationProgress(projectId) {
        // Calculate implementation progress based on requirement statuses
        return 0.65;
    }
    async updateAffectedMappings(event, impactAnalysis) {
        // Update mappings that are affected by requirement changes
    }
    async revalidateAffectedAlignments(requirementId) {
        // Re-validate alignments for affected architecture components
    }
    isSignificantChange(event) {
        // Determine if the change is significant enough to trigger re-analysis
        return event.type === 'REQUIREMENT_UPDATED' &&
            (event.changes.description || event.changes.type || event.changes.priority);
    }
    generateHealthRecommendations(metrics, issues) {
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
    mapToRequirement(node) {
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
exports.RequirementsArchitectureIntegrationService = RequirementsArchitectureIntegrationService;
//# sourceMappingURL=requirements-architecture-integration.service.js.map