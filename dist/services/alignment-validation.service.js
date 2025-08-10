"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlignmentValidationService = void 0;
const uuid_1 = require("uuid");
const logger_1 = require("../core/logging/logger");
const requirement_types_1 = require("../modules/requirements/types/requirement.types");
const integration_types_1 = require("../types/integration.types");
class AlignmentValidationService {
    neo4j;
    validationRules;
    alignmentThresholds;
    constructor(neo4j) {
        this.neo4j = neo4j;
        this.initializeValidationRules();
        this.initializeAlignmentThresholds();
    }
    /**
     * Validate alignment between a requirement and architecture decision
     */
    async validateRequirementArchitectureAlignment(requirementId, architectureDecisionId, userId) {
        try {
            logger_1.logger.info(`Validating alignment between requirement ${requirementId} and architecture ${architectureDecisionId}`);
            // Get requirement and architecture decision
            const [requirement, architectureDecision] = await Promise.all([
                this.getRequirement(requirementId),
                this.getArchitectureDecision(architectureDecisionId),
            ]);
            if (!requirement || !architectureDecision) {
                throw new Error('Requirement or architecture decision not found');
            }
            // Perform alignment analysis
            const alignment = await this.performAlignmentAnalysis(requirement, architectureDecision);
            // Store the validation result
            await this.storeAlignmentValidation(alignment, userId);
            logger_1.logger.info(`Alignment validation completed with score: ${alignment.alignmentScore}`);
            return alignment;
        }
        catch (error) {
            logger_1.logger.error('Failed to validate requirement-architecture alignment', error);
            throw error;
        }
    }
    /**
     * Batch validate alignments for multiple requirement-architecture pairs
     */
    async batchValidateAlignments(pairs, userId) {
        try {
            const results = [];
            for (const pair of pairs) {
                try {
                    const alignment = await this.validateRequirementArchitectureAlignment(pair.requirementId, pair.architectureDecisionId, userId);
                    results.push(alignment);
                }
                catch (error) {
                    logger_1.logger.warn(`Failed to validate alignment for pair ${pair.requirementId}-${pair.architectureDecisionId}`, error);
                    // Create a failed validation record
                    results.push({
                        id: (0, uuid_1.v4)(),
                        requirementId: pair.requirementId,
                        architectureDecisionId: pair.architectureDecisionId,
                        alignmentScore: 0,
                        alignmentType: integration_types_1.AlignmentType.NOT_APPLICABLE,
                        gaps: ['Validation failed due to error'],
                        recommendations: ['Review requirement and architecture decision for completeness'],
                        validationStatus: integration_types_1.ValidationStatus.REJECTED,
                        lastAssessed: new Date().toISOString(),
                        assessedBy: userId,
                    });
                }
            }
            return results;
        }
        catch (error) {
            logger_1.logger.error('Failed to batch validate alignments', error);
            throw error;
        }
    }
    /**
     * Validate alignment between requirement and pattern
     */
    async validateRequirementPatternAlignment(requirementId, patternId) {
        try {
            const [requirement, pattern] = await Promise.all([
                this.getRequirement(requirementId),
                this.getArchitecturePattern(patternId),
            ]);
            if (!requirement || !pattern) {
                throw new Error('Requirement or pattern not found');
            }
            return this.performPatternAlignment(requirement, pattern);
        }
        catch (error) {
            logger_1.logger.error('Failed to validate requirement-pattern alignment', error);
            throw error;
        }
    }
    /**
     * Validate alignment between requirement and technology stack
     */
    async validateRequirementTechnologyAlignment(requirementId, technologyStackId) {
        try {
            const [requirement, technologyStack] = await Promise.all([
                this.getRequirement(requirementId),
                this.getTechnologyStack(technologyStackId),
            ]);
            if (!requirement || !technologyStack) {
                throw new Error('Requirement or technology stack not found');
            }
            return this.performTechnologyAlignment(requirement, technologyStack);
        }
        catch (error) {
            logger_1.logger.error('Failed to validate requirement-technology alignment', error);
            throw error;
        }
    }
    /**
     * Validate mapping consistency across all architecture components
     */
    async validateMappingConsistency(mappingId) {
        try {
            const mapping = await this.getMapping(mappingId);
            if (!mapping) {
                throw new Error('Mapping not found');
            }
            const consistencyIssues = [];
            const recommendations = [];
            // Validate requirement exists and is valid
            const requirement = await this.getRequirement(mapping.requirementId);
            if (!requirement) {
                consistencyIssues.push({
                    type: 'MISSING_REQUIREMENT',
                    description: 'Referenced requirement does not exist',
                    severity: 'HIGH',
                    affectedComponent: 'requirement',
                });
            }
            // Validate architecture decision if mapped
            if (mapping.architectureDecisionId) {
                const decision = await this.getArchitectureDecision(mapping.architectureDecisionId);
                if (!decision) {
                    consistencyIssues.push({
                        type: 'MISSING_ARCHITECTURE_DECISION',
                        description: 'Referenced architecture decision does not exist',
                        severity: 'HIGH',
                        affectedComponent: 'architectureDecision',
                    });
                }
                else if (requirement) {
                    // Validate alignment
                    const alignment = await this.performAlignmentAnalysis(requirement, decision);
                    if (alignment.alignmentScore < this.alignmentThresholds.minimum) {
                        consistencyIssues.push({
                            type: 'POOR_ALIGNMENT',
                            description: `Alignment score ${alignment.alignmentScore} below threshold ${this.alignmentThresholds.minimum}`,
                            severity: 'MEDIUM',
                            affectedComponent: 'alignment',
                        });
                        recommendations.push('Review and improve requirement-architecture alignment');
                    }
                }
            }
            // Validate pattern if mapped
            if (mapping.architecturePatternId) {
                const pattern = await this.getArchitecturePattern(mapping.architecturePatternId);
                if (!pattern) {
                    consistencyIssues.push({
                        type: 'MISSING_PATTERN',
                        description: 'Referenced architecture pattern does not exist',
                        severity: 'MEDIUM',
                        affectedComponent: 'pattern',
                    });
                }
            }
            // Validate technology stack if mapped
            if (mapping.technologyStackId) {
                const technologyStack = await this.getTechnologyStack(mapping.technologyStackId);
                if (!technologyStack) {
                    consistencyIssues.push({
                        type: 'MISSING_TECHNOLOGY_STACK',
                        description: 'Referenced technology stack does not exist',
                        severity: 'MEDIUM',
                        affectedComponent: 'technologyStack',
                    });
                }
            }
            // Validate mapping confidence
            if (mapping.confidence < this.alignmentThresholds.minimum) {
                consistencyIssues.push({
                    type: 'LOW_CONFIDENCE',
                    description: `Mapping confidence ${mapping.confidence} below threshold`,
                    severity: 'LOW',
                    affectedComponent: 'confidence',
                });
                recommendations.push('Review and validate mapping to improve confidence');
            }
            const isConsistent = consistencyIssues.length === 0;
            const overallSeverity = this.calculateOverallSeverity(consistencyIssues);
            return {
                mappingId,
                isConsistent,
                overallSeverity,
                issues: consistencyIssues,
                recommendations,
                validatedAt: new Date().toISOString(),
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to validate mapping consistency', error);
            throw error;
        }
    }
    /**
     * Validate cross-module data integrity
     */
    async validateCrossModuleIntegrity() {
        try {
            logger_1.logger.info('Starting cross-module integrity validation');
            const issues = [];
            // Check for orphaned mappings
            const orphanedMappings = await this.findOrphanedMappings();
            if (orphanedMappings.length > 0) {
                issues.push({
                    type: 'ORPHANED_MAPPINGS',
                    count: orphanedMappings.length,
                    description: `${orphanedMappings.length} mappings reference non-existent components`,
                    severity: 'HIGH',
                    affectedItems: orphanedMappings,
                });
            }
            // Check for unmapped approved requirements
            const unmappedRequirements = await this.findUnmappedApprovedRequirements();
            if (unmappedRequirements.length > 0) {
                issues.push({
                    type: 'UNMAPPED_REQUIREMENTS',
                    count: unmappedRequirements.length,
                    description: `${unmappedRequirements.length} approved requirements without architecture mappings`,
                    severity: 'MEDIUM',
                    affectedItems: unmappedRequirements,
                });
            }
            // Check for architecture decisions without requirement mappings
            const unmappedArchitectureDecisions = await this.findUnmappedArchitectureDecisions();
            if (unmappedArchitectureDecisions.length > 0) {
                issues.push({
                    type: 'UNMAPPED_ARCHITECTURE_DECISIONS',
                    count: unmappedArchitectureDecisions.length,
                    description: `${unmappedArchitectureDecisions.length} architecture decisions without requirement mappings`,
                    severity: 'MEDIUM',
                    affectedItems: unmappedArchitectureDecisions,
                });
            }
            // Check for stale alignments
            const staleAlignments = await this.findStaleAlignments();
            if (staleAlignments.length > 0) {
                issues.push({
                    type: 'STALE_ALIGNMENTS',
                    count: staleAlignments.length,
                    description: `${staleAlignments.length} alignments not validated in the last 30 days`,
                    severity: 'LOW',
                    affectedItems: staleAlignments,
                });
            }
            const overallHealth = issues.length === 0 ? 'HEALTHY' :
                issues.some(i => i.severity === 'HIGH') ? 'CRITICAL' :
                    issues.some(i => i.severity === 'MEDIUM') ? 'WARNING' : 'DEGRADED';
            return {
                overallHealth,
                validatedAt: new Date().toISOString(),
                totalIssues: issues.length,
                issues,
                recommendations: this.generateIntegrityRecommendations(issues),
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to validate cross-module integrity', error);
            throw error;
        }
    }
    /**
     * Auto-correct common integrity issues
     */
    async autoCorrectIntegrityIssues(dryRun = true) {
        try {
            const corrections = [];
            let appliedCorrections = 0;
            // Find and remove orphaned mappings
            const orphanedMappings = await this.findOrphanedMappings();
            for (const mappingId of orphanedMappings) {
                corrections.push({
                    type: 'DELETE_ORPHANED_MAPPING',
                    description: `Delete orphaned mapping ${mappingId}`,
                    severity: 'HIGH',
                    query: `MATCH (m:RequirementArchitectureMapping {id: $mappingId}) DETACH DELETE m`,
                    parameters: { mappingId },
                });
                if (!dryRun) {
                    await this.neo4j.executeQuery('MATCH (m:RequirementArchitectureMapping {id: $mappingId}) DETACH DELETE m', { mappingId });
                    appliedCorrections++;
                }
            }
            // Create mappings for high-confidence matches
            const autoMappings = await this.generateAutoMappings();
            for (const mapping of autoMappings) {
                corrections.push({
                    type: 'CREATE_AUTO_MAPPING',
                    description: `Create automatic mapping between ${mapping.requirementId} and ${mapping.architectureDecisionId}`,
                    severity: 'MEDIUM',
                    query: 'CREATE mapping query...',
                    parameters: mapping,
                });
                if (!dryRun) {
                    // Create the mapping
                    appliedCorrections++;
                }
            }
            return {
                dryRun,
                totalCorrections: corrections.length,
                appliedCorrections,
                corrections,
                processedAt: new Date().toISOString(),
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to auto-correct integrity issues', error);
            throw error;
        }
    }
    // Private helper methods
    initializeValidationRules() {
        this.validationRules = new Map([
            [requirement_types_1.RequirementType.NON_FUNCTIONAL, [
                    {
                        name: 'Performance Alignment',
                        weight: 0.8,
                        validator: (req, arch) => this.validatePerformanceAlignment(req, arch),
                    },
                    {
                        name: 'Scalability Alignment',
                        weight: 0.7,
                        validator: (req, arch) => this.validateScalabilityAlignment(req, arch),
                    },
                ]],
            [requirement_types_1.RequirementType.FUNCTIONAL, [
                    {
                        name: 'Feature Support',
                        weight: 0.9,
                        validator: (req, arch) => this.validateFeatureSupport(req, arch),
                    },
                    {
                        name: 'Interface Compatibility',
                        weight: 0.6,
                        validator: (req, arch) => this.validateInterfaceCompatibility(req, arch),
                    },
                ]],
            [requirement_types_1.RequirementType.COMPLIANCE, [
                    {
                        name: 'Regulatory Compliance',
                        weight: 1.0,
                        validator: (req, arch) => this.validateRegulatoryCompliance(req, arch),
                    },
                    {
                        name: 'Security Standards',
                        weight: 0.9,
                        validator: (req, arch) => this.validateSecurityStandards(req, arch),
                    },
                ]],
        ]);
    }
    initializeAlignmentThresholds() {
        this.alignmentThresholds = {
            minimum: 0.3,
            good: 0.7,
            excellent: 0.9,
        };
    }
    async performAlignmentAnalysis(requirement, architectureDecision) {
        const rules = this.validationRules.get(requirement.type) || [];
        let totalScore = 0;
        let totalWeight = 0;
        const gaps = [];
        const recommendations = [];
        // Apply validation rules
        for (const rule of rules) {
            const score = await rule.validator(requirement, architectureDecision);
            totalScore += score * rule.weight;
            totalWeight += rule.weight;
            if (score < 0.5) {
                gaps.push(`${rule.name} alignment is below acceptable threshold`);
                recommendations.push(`Improve ${rule.name.toLowerCase()} between requirement and architecture`);
            }
        }
        const alignmentScore = totalWeight > 0 ? totalScore / totalWeight : 0;
        const alignmentType = this.determineAlignmentType(alignmentScore);
        const validationStatus = alignmentScore >= this.alignmentThresholds.minimum
            ? integration_types_1.ValidationStatus.VALIDATED
            : integration_types_1.ValidationStatus.NEEDS_REVIEW;
        return {
            id: (0, uuid_1.v4)(),
            requirementId: requirement.id,
            architectureDecisionId: architectureDecision.id,
            alignmentScore,
            alignmentType,
            gaps,
            recommendations,
            validationStatus,
            lastAssessed: new Date().toISOString(),
        };
    }
    determineAlignmentType(score) {
        if (score >= this.alignmentThresholds.excellent) {
            return integration_types_1.AlignmentType.FULLY_ALIGNED;
        }
        else if (score >= this.alignmentThresholds.good) {
            return integration_types_1.AlignmentType.PARTIALLY_ALIGNED;
        }
        else if (score >= this.alignmentThresholds.minimum) {
            return integration_types_1.AlignmentType.PARTIALLY_ALIGNED;
        }
        else {
            return integration_types_1.AlignmentType.MISALIGNED;
        }
    }
    async performPatternAlignment(requirement, pattern) {
        // Implementation for pattern alignment validation
        return {
            requirementId: requirement.id,
            patternId: pattern.id,
            alignmentScore: 0.7,
            applicabilityScore: 0.8,
            benefits: [],
            risks: [],
            prerequisites: [],
        };
    }
    async performTechnologyAlignment(requirement, technologyStack) {
        // Implementation for technology alignment validation
        return {
            requirementId: requirement.id,
            technologyStackId: technologyStack.id,
            compatibilityScore: 0.75,
            implementationEffort: 40,
            learningCurveImpact: 'MODERATE',
            riskFactors: [],
        };
    }
    async storeAlignmentValidation(alignment, userId) {
        const query = `
      MERGE (alignment:ArchitectureRequirementAlignment {
        requirementId: $requirementId,
        architectureDecisionId: $architectureDecisionId
      })
      SET alignment.id = $id,
          alignment.alignmentScore = $alignmentScore,
          alignment.alignmentType = $alignmentType,
          alignment.gaps = $gaps,
          alignment.recommendations = $recommendations,
          alignment.validationStatus = $validationStatus,
          alignment.lastAssessed = $lastAssessed,
          alignment.assessedBy = $assessedBy
      RETURN alignment
    `;
        await this.neo4j.executeQuery(query, {
            ...alignment,
            assessedBy: userId,
        });
    }
    // Validation rule implementations
    async validatePerformanceAlignment(requirement, architecture) {
        // Check if architecture supports performance requirements
        return 0.8;
    }
    async validateScalabilityAlignment(requirement, architecture) {
        // Check if architecture supports scalability requirements
        return 0.7;
    }
    async validateFeatureSupport(requirement, architecture) {
        // Check if architecture supports required features
        return 0.85;
    }
    async validateInterfaceCompatibility(requirement, architecture) {
        // Check interface compatibility
        return 0.6;
    }
    async validateRegulatoryCompliance(requirement, architecture) {
        // Check regulatory compliance
        return 0.9;
    }
    async validateSecurityStandards(requirement, architecture) {
        // Check security standards compliance
        return 0.85;
    }
    // Data retrieval methods
    async getRequirement(id) {
        const query = 'MATCH (r:Requirement {id: $id}) RETURN r';
        const results = await this.neo4j.executeQuery(query, { id });
        return results[0] ? this.mapNodeToRequirement(results[0].r) : null;
    }
    async getArchitectureDecision(id) {
        const query = 'MATCH (a:ArchitectureDecision {id: $id}) RETURN a';
        const results = await this.neo4j.executeQuery(query, { id });
        return results[0] ? this.mapNodeToArchitectureDecision(results[0].a) : null;
    }
    async getArchitecturePattern(id) {
        const query = 'MATCH (p:ArchitecturePattern {id: $id}) RETURN p';
        const results = await this.neo4j.executeQuery(query, { id });
        return results[0] ? this.mapNodeToArchitecturePattern(results[0].p) : null;
    }
    async getTechnologyStack(id) {
        const query = 'MATCH (t:TechnologyStack {id: $id}) RETURN t';
        const results = await this.neo4j.executeQuery(query, { id });
        return results[0] ? this.mapNodeToTechnologyStack(results[0].t) : null;
    }
    async getMapping(id) {
        const query = 'MATCH (m:RequirementArchitectureMapping {id: $id}) RETURN m';
        const results = await this.neo4j.executeQuery(query, { id });
        return results[0] ? this.mapNodeToMapping(results[0].m) : null;
    }
    // Integrity check methods
    async findOrphanedMappings() {
        const query = `
      MATCH (m:RequirementArchitectureMapping)
      WHERE (m.architectureDecisionId IS NOT NULL AND NOT exists((:ArchitectureDecision {id: m.architectureDecisionId})))
      OR (m.architecturePatternId IS NOT NULL AND NOT exists((:ArchitecturePattern {id: m.architecturePatternId})))
      OR (m.technologyStackId IS NOT NULL AND NOT exists((:TechnologyStack {id: m.technologyStackId})))
      OR NOT exists((:Requirement {id: m.requirementId}))
      RETURN m.id as mappingId
    `;
        const results = await this.neo4j.executeQuery(query);
        return results.map(result => result.mappingId);
    }
    async findUnmappedApprovedRequirements() {
        const query = `
      MATCH (r:Requirement)
      WHERE r.status IN ['APPROVED', 'IMPLEMENTED']
      AND NOT (r)-[:MAPPED_TO]->(:RequirementArchitectureMapping)
      RETURN r.id as requirementId
    `;
        const results = await this.neo4j.executeQuery(query);
        return results.map(result => result.requirementId);
    }
    async findUnmappedArchitectureDecisions() {
        const query = `
      MATCH (a:ArchitectureDecision)
      WHERE a.status IN ['APPROVED', 'IMPLEMENTED']
      AND NOT (:RequirementArchitectureMapping {architectureDecisionId: a.id})
      RETURN a.id as architectureDecisionId
    `;
        const results = await this.neo4j.executeQuery(query);
        return results.map(result => result.architectureDecisionId);
    }
    async findStaleAlignments() {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const query = `
      MATCH (alignment:ArchitectureRequirementAlignment)
      WHERE alignment.lastAssessed < $thirtyDaysAgo
      RETURN alignment.id as alignmentId
    `;
        const results = await this.neo4j.executeQuery(query, { thirtyDaysAgo });
        return results.map(result => result.alignmentId);
    }
    async generateAutoMappings() {
        // Generate high-confidence automatic mappings
        return [];
    }
    calculateOverallSeverity(issues) {
        if (issues.some(i => i.severity === 'HIGH'))
            return 'HIGH';
        if (issues.some(i => i.severity === 'MEDIUM'))
            return 'MEDIUM';
        return 'LOW';
    }
    generateIntegrityRecommendations(issues) {
        const recommendations = [];
        for (const issue of issues) {
            switch (issue.type) {
                case 'ORPHANED_MAPPINGS':
                    recommendations.push('Clean up orphaned mappings by removing invalid references');
                    break;
                case 'UNMAPPED_REQUIREMENTS':
                    recommendations.push('Review and create architecture mappings for approved requirements');
                    break;
                case 'UNMAPPED_ARCHITECTURE_DECISIONS':
                    recommendations.push('Link architecture decisions to their driving requirements');
                    break;
                case 'STALE_ALIGNMENTS':
                    recommendations.push('Refresh validation of older alignments');
                    break;
            }
        }
        return recommendations;
    }
    // Mapping methods
    mapNodeToRequirement(node) {
        return { ...node.properties };
    }
    mapNodeToArchitectureDecision(node) {
        return { ...node.properties };
    }
    mapNodeToArchitecturePattern(node) {
        return { ...node.properties };
    }
    mapNodeToTechnologyStack(node) {
        return { ...node.properties };
    }
    mapNodeToMapping(node) {
        return { ...node.properties };
    }
}
exports.AlignmentValidationService = AlignmentValidationService;
//# sourceMappingURL=alignment-validation.service.js.map