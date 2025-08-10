"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationMigrationUtil = void 0;
const logger_1 = require("../core/logging/logger");
const requirements_service_1 = require("../modules/requirements/services/requirements.service");
const decision_service_1 = require("../modules/architecture/services/decision.service");
const pattern_service_1 = require("../modules/architecture/services/pattern.service");
const technology_stack_service_1 = require("../modules/architecture/services/technology-stack.service");
const requirements_architecture_integration_service_1 = require("../services/requirements-architecture-integration.service");
const recommendation_engine_service_1 = require("../services/recommendation-engine.service");
const alignment_validation_service_1 = require("../services/alignment-validation.service");
const integration_types_1 = require("../types/integration.types");
class IntegrationMigrationUtil {
    neo4j;
    requirementsService;
    decisionService;
    patternService;
    technologyStackService;
    integrationService;
    recommendationEngine;
    validationService;
    constructor(neo4j) {
        this.neo4j = neo4j;
        this.requirementsService = new requirements_service_1.RequirementsService(neo4j);
        this.decisionService = new decision_service_1.ArchitectureDecisionService(neo4j);
        this.patternService = new pattern_service_1.ArchitecturePatternService(neo4j);
        this.technologyStackService = new technology_stack_service_1.TechnologyStackService(neo4j);
        this.integrationService = new requirements_architecture_integration_service_1.RequirementsArchitectureIntegrationService(neo4j);
        this.recommendationEngine = new recommendation_engine_service_1.RecommendationEngineService(neo4j);
        this.validationService = new alignment_validation_service_1.AlignmentValidationService(neo4j);
    }
    /**
     * Migrate existing project data to use the new integration layer
     */
    async migrateProjectIntegration(projectId, options = {}) {
        try {
            logger_1.logger.info(`Starting integration migration for project: ${projectId}`);
            const startTime = Date.now();
            const result = {
                projectId,
                startTime: new Date(startTime).toISOString(),
                phase: 'INITIALIZATION',
                success: false,
                phases: [],
                statistics: {
                    requirementsProcessed: 0,
                    architectureDecisionsProcessed: 0,
                    mappingsCreated: 0,
                    alignmentsValidated: 0,
                    errorsEncountered: 0,
                },
                errors: [],
                recommendations: [],
            };
            // Phase 1: Data Discovery and Analysis
            result.phase = 'DISCOVERY';
            const discoveryResult = await this.performDataDiscovery(projectId);
            result.phases.push({
                name: 'Data Discovery',
                status: 'COMPLETED',
                duration: Date.now() - startTime,
                details: discoveryResult,
            });
            // Phase 2: Create Missing Architecture Components
            if (options.createMissingComponents) {
                result.phase = 'COMPONENT_CREATION';
                const creationResult = await this.createMissingComponents(projectId, discoveryResult);
                result.phases.push({
                    name: 'Component Creation',
                    status: creationResult.success ? 'COMPLETED' : 'FAILED',
                    duration: Date.now() - startTime,
                    details: creationResult,
                });
            }
            // Phase 3: Generate Automatic Mappings
            result.phase = 'MAPPING_GENERATION';
            const mappingResult = await this.generateAutomaticMappings(projectId, discoveryResult, options.confidenceThreshold || 0.7);
            result.phases.push({
                name: 'Mapping Generation',
                status: mappingResult.success ? 'COMPLETED' : 'PARTIAL',
                duration: Date.now() - startTime,
                details: mappingResult,
            });
            result.statistics.mappingsCreated = mappingResult.mappingsCreated;
            // Phase 4: Validate Alignments
            if (options.validateAlignments !== false) {
                result.phase = 'ALIGNMENT_VALIDATION';
                const validationResult = await this.validateMigratedAlignments(projectId);
                result.phases.push({
                    name: 'Alignment Validation',
                    status: validationResult.success ? 'COMPLETED' : 'PARTIAL',
                    duration: Date.now() - startTime,
                    details: validationResult,
                });
                result.statistics.alignmentsValidated = validationResult.alignmentsValidated;
            }
            // Phase 5: Data Quality Assessment
            result.phase = 'QUALITY_ASSESSMENT';
            const qualityResult = await this.assessMigrationQuality(projectId);
            result.phases.push({
                name: 'Quality Assessment',
                status: 'COMPLETED',
                duration: Date.now() - startTime,
                details: qualityResult,
            });
            // Phase 6: Generate Recommendations
            result.phase = 'RECOMMENDATIONS';
            result.recommendations = this.generateMigrationRecommendations(discoveryResult, mappingResult, qualityResult);
            result.phase = 'COMPLETED';
            result.success = true;
            result.endTime = new Date().toISOString();
            result.totalDuration = Date.now() - startTime;
            logger_1.logger.info(`Integration migration completed for project: ${projectId}`);
            return result;
        }
        catch (error) {
            logger_1.logger.error('Integration migration failed', error);
            throw error;
        }
    }
    /**
     * Migrate all projects in the system
     */
    async migrateAllProjects(options = {}) {
        try {
            logger_1.logger.info('Starting batch migration for all projects');
            const projects = await this.getAllProjects();
            const results = [];
            const batchStartTime = Date.now();
            for (const project of projects) {
                try {
                    const projectResult = await this.migrateProjectIntegration(project.id, options);
                    results.push(projectResult);
                    logger_1.logger.info(`Completed migration for project: ${project.id}`);
                }
                catch (error) {
                    logger_1.logger.error(`Failed migration for project: ${project.id}`, error);
                    results.push({
                        projectId: project.id,
                        startTime: new Date().toISOString(),
                        phase: 'FAILED',
                        success: false,
                        phases: [],
                        statistics: {
                            requirementsProcessed: 0,
                            architectureDecisionsProcessed: 0,
                            mappingsCreated: 0,
                            alignmentsValidated: 0,
                            errorsEncountered: 1,
                        },
                        errors: [error.message],
                        recommendations: [],
                    });
                }
            }
            const batchResult = {
                totalProjects: projects.length,
                successfulMigrations: results.filter(r => r.success).length,
                failedMigrations: results.filter(r => !r.success).length,
                totalDuration: Date.now() - batchStartTime,
                results,
                overallStatistics: this.aggregateStatistics(results),
            };
            logger_1.logger.info(`Batch migration completed: ${batchResult.successfulMigrations}/${batchResult.totalProjects} successful`);
            return batchResult;
        }
        catch (error) {
            logger_1.logger.error('Batch migration failed', error);
            throw error;
        }
    }
    /**
     * Rollback integration migration for a project
     */
    async rollbackMigration(projectId) {
        try {
            logger_1.logger.info(`Starting rollback for project: ${projectId}`);
            const startTime = Date.now();
            const rollbackActions = [];
            // Remove integration mappings
            const mappingCleanup = await this.cleanupMappings(projectId);
            rollbackActions.push({
                action: 'REMOVE_MAPPINGS',
                description: `Removed ${mappingCleanup.removedCount} integration mappings`,
                success: true,
            });
            // Remove alignment validations
            const alignmentCleanup = await this.cleanupAlignments(projectId);
            rollbackActions.push({
                action: 'REMOVE_ALIGNMENTS',
                description: `Removed ${alignmentCleanup.removedCount} alignment validations`,
                success: true,
            });
            // Remove auto-generated architecture components (if specified)
            const componentCleanup = await this.cleanupAutoGeneratedComponents(projectId);
            rollbackActions.push({
                action: 'REMOVE_AUTO_COMPONENTS',
                description: `Removed ${componentCleanup.removedCount} auto-generated components`,
                success: true,
            });
            return {
                projectId,
                success: true,
                duration: Date.now() - startTime,
                rollbackActions,
                completedAt: new Date().toISOString(),
            };
        }
        catch (error) {
            logger_1.logger.error('Migration rollback failed', error);
            throw error;
        }
    }
    /**
     * Export integration data for backup or analysis
     */
    async exportIntegrationData(projectId) {
        try {
            logger_1.logger.info(`Exporting integration data for project: ${projectId}`);
            const exportData = {
                projectId,
                exportedAt: new Date().toISOString(),
                version: '1.0',
                data: {
                    requirements: await this.exportRequirements(projectId),
                    architectureDecisions: await this.exportArchitectureDecisions(projectId),
                    patterns: await this.exportPatterns(projectId),
                    technologyStacks: await this.exportTechnologyStacks(projectId),
                    mappings: await this.exportMappings(projectId),
                    alignments: await this.exportAlignments(projectId),
                    recommendations: await this.exportRecommendations(projectId),
                },
                metadata: {
                    totalRequirements: 0,
                    totalArchitectureDecisions: 0,
                    totalMappings: 0,
                    totalAlignments: 0,
                },
            };
            // Calculate metadata
            exportData.metadata.totalRequirements = exportData.data.requirements.length;
            exportData.metadata.totalArchitectureDecisions = exportData.data.architectureDecisions.length;
            exportData.metadata.totalMappings = exportData.data.mappings.length;
            exportData.metadata.totalAlignments = exportData.data.alignments.length;
            logger_1.logger.info(`Export completed for project: ${projectId}`);
            return exportData;
        }
        catch (error) {
            logger_1.logger.error('Integration data export failed', error);
            throw error;
        }
    }
    /**
     * Import integration data from backup
     */
    async importIntegrationData(exportData) {
        try {
            logger_1.logger.info(`Importing integration data for project: ${exportData.projectId}`);
            const importResult = {
                projectId: exportData.projectId,
                success: false,
                importedItems: {
                    requirements: 0,
                    architectureDecisions: 0,
                    mappings: 0,
                    alignments: 0,
                },
                errors: [],
                warnings: [],
            };
            // Import in dependency order
            // 1. Import requirements (if they don't exist)
            for (const requirement of exportData.data.requirements) {
                try {
                    const existing = await this.requirementsService.getRequirementById(requirement.id);
                    if (!existing) {
                        await this.recreateRequirement(requirement);
                        importResult.importedItems.requirements++;
                    }
                }
                catch (error) {
                    importResult.errors.push(`Failed to import requirement ${requirement.id}: ${error.message}`);
                }
            }
            // 2. Import architecture decisions
            for (const decision of exportData.data.architectureDecisions) {
                try {
                    const existing = await this.decisionService.getDecisionById(decision.id);
                    if (!existing) {
                        await this.recreateArchitectureDecision(decision);
                        importResult.importedItems.architectureDecisions++;
                    }
                }
                catch (error) {
                    importResult.errors.push(`Failed to import architecture decision ${decision.id}: ${error.message}`);
                }
            }
            // 3. Import mappings
            for (const mapping of exportData.data.mappings) {
                try {
                    await this.recreateMapping(mapping);
                    importResult.importedItems.mappings++;
                }
                catch (error) {
                    importResult.errors.push(`Failed to import mapping ${mapping.id}: ${error.message}`);
                }
            }
            // 4. Import alignments
            for (const alignment of exportData.data.alignments) {
                try {
                    await this.recreateAlignment(alignment);
                    importResult.importedItems.alignments++;
                }
                catch (error) {
                    importResult.errors.push(`Failed to import alignment ${alignment.id}: ${error.message}`);
                }
            }
            importResult.success = importResult.errors.length === 0;
            logger_1.logger.info(`Import completed for project: ${exportData.projectId}`);
            return importResult;
        }
        catch (error) {
            logger_1.logger.error('Integration data import failed', error);
            throw error;
        }
    }
    // Private helper methods
    async performDataDiscovery(projectId) {
        const query = `
      MATCH (p:Project {id: $projectId})
      OPTIONAL MATCH (p)-[:CONTAINS]->(r:Requirement)
      OPTIONAL MATCH (a:ArchitectureDecision) WHERE a.projectId = $projectId
      OPTIONAL MATCH (pat:ArchitecturePattern)
      OPTIONAL MATCH (ts:TechnologyStack)
      OPTIONAL MATCH (m:RequirementArchitectureMapping) WHERE m.requirementId IN [r.id] OR m.architectureDecisionId IN [a.id]
      
      RETURN {
        requirements: collect(DISTINCT r),
        architectureDecisions: collect(DISTINCT a),
        patterns: collect(DISTINCT pat)[0..5],
        technologyStacks: collect(DISTINCT ts)[0..5],
        existingMappings: collect(DISTINCT m)
      } as discovery
    `;
        const results = await this.neo4j.executeQuery(query, { projectId });
        const discovery = results[0]?.discovery || {};
        return {
            projectId,
            requirements: discovery.requirements || [],
            architectureDecisions: discovery.architectureDecisions || [],
            patterns: discovery.patterns || [],
            technologyStacks: discovery.technologyStacks || [],
            existingMappings: discovery.existingMappings || [],
            unmappedRequirements: this.findUnmappedRequirements(discovery.requirements, discovery.existingMappings),
            unmappedArchitectureDecisions: this.findUnmappedArchitectureDecisions(discovery.architectureDecisions, discovery.existingMappings),
        };
    }
    async createMissingComponents(projectId, discovery) {
        const result = {
            success: true,
            componentsCreated: {
                patterns: 0,
                technologyStacks: 0,
                decisions: 0,
            },
            errors: [],
        };
        // Create default patterns if none exist
        if (discovery.patterns.length === 0) {
            try {
                await this.createDefaultPatterns();
                result.componentsCreated.patterns = 3; // Assume 3 default patterns
            }
            catch (error) {
                result.errors.push(`Failed to create default patterns: ${error.message}`);
                result.success = false;
            }
        }
        // Create default technology stacks if none exist
        if (discovery.technologyStacks.length === 0) {
            try {
                await this.createDefaultTechnologyStacks();
                result.componentsCreated.technologyStacks = 2; // Assume 2 default stacks
            }
            catch (error) {
                result.errors.push(`Failed to create default technology stacks: ${error.message}`);
                result.success = false;
            }
        }
        return result;
    }
    async generateAutomaticMappings(projectId, discovery, confidenceThreshold) {
        const result = {
            success: true,
            mappingsCreated: 0,
            mappingsSkipped: 0,
            errors: [],
        };
        // Generate mappings for unmapped requirements
        for (const requirement of discovery.unmappedRequirements) {
            try {
                // Use recommendation engine to find suitable architecture components
                const recommendations = await this.recommendationEngine.generateRecommendations([requirement]);
                // Create mappings for high-confidence recommendations
                for (const patternRec of recommendations.patterns) {
                    if (patternRec.applicabilityScore >= confidenceThreshold) {
                        await this.integrationService.createMapping({
                            requirementId: requirement.id,
                            architecturePatternId: patternRec.pattern.id,
                            mappingType: integration_types_1.RequirementMappingType.DERIVED,
                            confidence: patternRec.applicabilityScore,
                            rationale: `Auto-generated mapping based on pattern recommendation (score: ${patternRec.applicabilityScore})`,
                        });
                        result.mappingsCreated++;
                    }
                }
                for (const techRec of recommendations.technologies) {
                    if (techRec.suitabilityScore >= confidenceThreshold) {
                        await this.integrationService.createMapping({
                            requirementId: requirement.id,
                            technologyStackId: techRec.technologyStack.id,
                            mappingType: integration_types_1.RequirementMappingType.INFLUENCED,
                            confidence: techRec.suitabilityScore,
                            rationale: `Auto-generated mapping based on technology recommendation (score: ${techRec.suitabilityScore})`,
                        });
                        result.mappingsCreated++;
                    }
                }
            }
            catch (error) {
                result.errors.push(`Failed to create mapping for requirement ${requirement.id}: ${error.message}`);
                result.mappingsSkipped++;
            }
        }
        result.success = result.errors.length === 0;
        return result;
    }
    async validateMigratedAlignments(projectId) {
        const result = {
            success: true,
            alignmentsValidated: 0,
            alignmentsFailed: 0,
            averageAlignmentScore: 0,
            errors: [],
        };
        try {
            // Get all mappings for the project
            const mappings = await this.getMappingsForProject(projectId);
            let totalScore = 0;
            let validatedCount = 0;
            for (const mapping of mappings) {
                try {
                    if (mapping.architectureDecisionId) {
                        const alignment = await this.validationService.validateRequirementArchitectureAlignment(mapping.requirementId, mapping.architectureDecisionId);
                        totalScore += alignment.alignmentScore;
                        validatedCount++;
                        result.alignmentsValidated++;
                    }
                }
                catch (error) {
                    result.errors.push(`Failed to validate alignment for mapping ${mapping.id}: ${error.message}`);
                    result.alignmentsFailed++;
                }
            }
            result.averageAlignmentScore = validatedCount > 0 ? totalScore / validatedCount : 0;
            result.success = result.errors.length === 0;
        }
        catch (error) {
            logger_1.logger.error('Failed to validate migrated alignments', error);
            result.success = false;
            result.errors.push(error.message);
        }
        return result;
    }
    async assessMigrationQuality(projectId) {
        try {
            const metrics = await this.integrationService.getIntegrationMetrics(projectId);
            const healthCheck = await this.integrationService.performHealthCheck();
            return {
                metrics,
                healthCheck,
                qualityScore: this.calculateQualityScore(metrics, healthCheck),
                recommendations: this.generateQualityRecommendations(metrics, healthCheck),
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to assess migration quality', error);
            throw error;
        }
    }
    generateMigrationRecommendations(discovery, mapping, quality) {
        const recommendations = [];
        if (discovery.unmappedRequirements.length > discovery.requirements.length * 0.2) {
            recommendations.push('Consider manual review of unmapped requirements to ensure complete architecture coverage');
        }
        if (mapping.mappingsSkipped > mapping.mappingsCreated * 0.3) {
            recommendations.push('Review skipped mappings - many requirements may need custom architecture solutions');
        }
        if (quality.qualityScore < 0.7) {
            recommendations.push('Integration quality is below optimal - consider manual validation and refinement');
        }
        if (quality.healthCheck.status !== 'HEALTHY') {
            recommendations.push('Address integration health issues identified in the assessment');
        }
        return recommendations;
    }
    // Additional helper methods would continue here...
    findUnmappedRequirements(requirements, mappings) {
        const mappedRequirementIds = new Set(mappings.map(m => m.requirementId));
        return requirements.filter(r => !mappedRequirementIds.has(r.properties.id));
    }
    findUnmappedArchitectureDecisions(decisions, mappings) {
        const mappedDecisionIds = new Set(mappings.map(m => m.architectureDecisionId));
        return decisions.filter(d => !mappedDecisionIds.has(d.properties.id));
    }
    async getAllProjects() {
        const query = 'MATCH (p:Project) RETURN p.id as id, p.name as name';
        const results = await this.neo4j.executeQuery(query);
        return results.map(r => ({ id: r.id, name: r.name }));
    }
    aggregateStatistics(results) {
        return results.reduce((acc, result) => ({
            requirementsProcessed: acc.requirementsProcessed + result.statistics.requirementsProcessed,
            architectureDecisionsProcessed: acc.architectureDecisionsProcessed + result.statistics.architectureDecisionsProcessed,
            mappingsCreated: acc.mappingsCreated + result.statistics.mappingsCreated,
            alignmentsValidated: acc.alignmentsValidated + result.statistics.alignmentsValidated,
            errorsEncountered: acc.errorsEncountered + result.statistics.errorsEncountered,
        }), {
            requirementsProcessed: 0,
            architectureDecisionsProcessed: 0,
            mappingsCreated: 0,
            alignmentsValidated: 0,
            errorsEncountered: 0,
        });
    }
    calculateQualityScore(metrics, healthCheck) {
        let score = 0;
        // Coverage score (40% weight)
        const coverage = metrics.totalRequirements > 0 ? metrics.mappedRequirements / metrics.totalRequirements : 0;
        score += coverage * 0.4;
        // Confidence score (30% weight)
        score += metrics.averageConfidence * 0.3;
        // Validation score (20% weight)
        score += metrics.validationCoverage * 0.2;
        // Health score (10% weight)
        const healthScore = healthCheck.status === 'HEALTHY' ? 1.0 :
            healthCheck.status === 'WARNING' ? 0.7 :
                healthCheck.status === 'CRITICAL' ? 0.3 : 0.5;
        score += healthScore * 0.1;
        return Math.min(1.0, score);
    }
    generateQualityRecommendations(metrics, healthCheck) {
        // Generate quality-based recommendations
        return [];
    }
    // Cleanup methods
    async cleanupMappings(projectId) {
        const query = `
      MATCH (p:Project {id: $projectId})-[:CONTAINS]->(r:Requirement)
      MATCH (r)-[:MAPPED_TO]->(m:RequirementArchitectureMapping)
      DETACH DELETE m
      RETURN count(m) as removedCount
    `;
        const results = await this.neo4j.executeQuery(query, { projectId });
        return { removedCount: results[0]?.removedCount || 0 };
    }
    async cleanupAlignments(projectId) {
        const query = `
      MATCH (p:Project {id: $projectId})-[:CONTAINS]->(r:Requirement)
      MATCH (alignment:ArchitectureRequirementAlignment {requirementId: r.id})
      DELETE alignment
      RETURN count(alignment) as removedCount
    `;
        const results = await this.neo4j.executeQuery(query, { projectId });
        return { removedCount: results[0]?.removedCount || 0 };
    }
    async cleanupAutoGeneratedComponents(projectId) {
        // Remove components that were auto-generated during migration
        return { removedCount: 0 };
    }
    // Export/Import helper methods
    async exportRequirements(projectId) {
        const query = 'MATCH (p:Project {id: $projectId})-[:CONTAINS]->(r:Requirement) RETURN r';
        const results = await this.neo4j.executeQuery(query, { projectId });
        return results.map(r => r.r.properties);
    }
    async exportArchitectureDecisions(projectId) {
        const query = 'MATCH (a:ArchitectureDecision {projectId: $projectId}) RETURN a';
        const results = await this.neo4j.executeQuery(query, { projectId });
        return results.map(r => r.a.properties);
    }
    async exportPatterns(projectId) {
        const query = 'MATCH (p:ArchitecturePattern) RETURN p LIMIT 10';
        const results = await this.neo4j.executeQuery(query);
        return results.map(r => r.p.properties);
    }
    async exportTechnologyStacks(projectId) {
        const query = 'MATCH (ts:TechnologyStack) RETURN ts LIMIT 10';
        const results = await this.neo4j.executeQuery(query);
        return results.map(r => r.ts.properties);
    }
    async exportMappings(projectId) {
        const query = `
      MATCH (p:Project {id: $projectId})-[:CONTAINS]->(r:Requirement)
      MATCH (r)-[:MAPPED_TO]->(m:RequirementArchitectureMapping)
      RETURN m
    `;
        const results = await this.neo4j.executeQuery(query, { projectId });
        return results.map(r => r.m.properties);
    }
    async exportAlignments(projectId) {
        const query = `
      MATCH (p:Project {id: $projectId})-[:CONTAINS]->(r:Requirement)
      MATCH (alignment:ArchitectureRequirementAlignment {requirementId: r.id})
      RETURN alignment
    `;
        const results = await this.neo4j.executeQuery(query, { projectId });
        return results.map(r => r.alignment.properties);
    }
    async exportRecommendations(projectId) {
        // Export recommendation data if stored
        return [];
    }
    async recreateRequirement(requirement) {
        // Recreate requirement from exported data
    }
    async recreateArchitectureDecision(decision) {
        // Recreate architecture decision from exported data
    }
    async recreateMapping(mapping) {
        // Recreate mapping from exported data
    }
    async recreateAlignment(alignment) {
        // Recreate alignment from exported data
    }
    async getMappingsForProject(projectId) {
        const query = `
      MATCH (p:Project {id: $projectId})-[:CONTAINS]->(r:Requirement)
      MATCH (r)-[:MAPPED_TO]->(m:RequirementArchitectureMapping)
      RETURN m
    `;
        const results = await this.neo4j.executeQuery(query, { projectId });
        return results.map(r => r.m.properties);
    }
    async createDefaultPatterns() {
        // Create default architecture patterns
    }
    async createDefaultTechnologyStacks() {
        // Create default technology stacks
    }
}
exports.IntegrationMigrationUtil = IntegrationMigrationUtil;
//# sourceMappingURL=integration-migration.util.js.map