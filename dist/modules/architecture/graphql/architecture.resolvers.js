"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.architectureResolvers = exports.ArchitectureResolvers = void 0;
const neo4j_1 = require("../../../core/database/neo4j");
const logger_1 = require("../../../core/logging/logger");
const requirements_architecture_integration_service_1 = require("../../../services/requirements-architecture-integration.service");
const decision_service_1 = require("../services/decision.service");
const pattern_service_1 = require("../services/pattern.service");
const technology_stack_service_1 = require("../services/technology-stack.service");
const architecture_service_1 = require("../services/architecture.service");
const requirements_service_1 = require("../../requirements/services/requirements.service");
class ArchitectureResolvers {
    neo4j;
    integrationService;
    decisionService;
    patternService;
    technologyStackService;
    architectureService;
    requirementsService;
    constructor() {
        this.neo4j = neo4j_1.Neo4jService.getInstance();
        this.integrationService = new requirements_architecture_integration_service_1.RequirementsArchitectureIntegrationService(this.neo4j);
        this.decisionService = new decision_service_1.ArchitectureDecisionService(this.neo4j);
        this.patternService = new pattern_service_1.ArchitecturePatternService(this.neo4j);
        this.technologyStackService = new technology_stack_service_1.TechnologyStackService(this.neo4j);
        this.architectureService = new architecture_service_1.ArchitectureService(this.neo4j);
        this.requirementsService = new requirements_service_1.RequirementsService(this.neo4j);
    }
    getResolvers() {
        return {
            Query: {
                // Architecture Decision Queries
                architectureDecision: async (_, { id }) => {
                    try {
                        return await this.decisionService.getDecisionById(id);
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to get architecture decision', error);
                        throw error;
                    }
                },
                architectureDecisions: async (_, args) => {
                    try {
                        return await this.decisionService.getDecisions(args);
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to get architecture decisions', error);
                        throw error;
                    }
                },
                // Architecture Pattern Queries
                architecturePattern: async (_, { id }) => {
                    try {
                        return await this.patternService.getPatternById(id);
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to get architecture pattern', error);
                        throw error;
                    }
                },
                architecturePatterns: async (_, args) => {
                    try {
                        return await this.patternService.getPatterns(args);
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to get architecture patterns', error);
                        throw error;
                    }
                },
                // Technology Stack Queries
                technologyStack: async (_, { id }) => {
                    try {
                        return await this.technologyStackService.getTechnologyStackById(id);
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to get technology stack', error);
                        throw error;
                    }
                },
                technologyStacks: async (_, args) => {
                    try {
                        return await this.technologyStackService.getTechnologyStacks(args);
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to get technology stacks', error);
                        throw error;
                    }
                },
                // Integration Queries
                requirementArchitectureMappings: async (_, args) => {
                    try {
                        const query = `
              MATCH (m:RequirementArchitectureMapping)
              ${args.requirementId ? 'WHERE m.requirementId = $requirementId' : ''}
              ${args.architectureDecisionId ? 'WHERE m.architectureDecisionId = $architectureDecisionId' : ''}
              ${args.confidence ? 'WHERE m.confidence >= $confidence' : ''}
              OPTIONAL MATCH (r:Requirement {id: m.requirementId})
              OPTIONAL MATCH (a:ArchitectureDecision {id: m.architectureDecisionId})
              OPTIONAL MATCH (p:ArchitecturePattern {id: m.architecturePatternId})
              OPTIONAL MATCH (t:TechnologyStack {id: m.technologyStackId})
              RETURN m, r, a, p, t
              ORDER BY m.createdAt DESC
              SKIP $offset
              LIMIT $limit
            `;
                        const results = await this.neo4j.executeQuery(query, {
                            ...args,
                            offset: args.offset || 0,
                            limit: args.limit || 20,
                        });
                        return results.map(result => ({
                            ...this.mapNodeToObject(result.m),
                            requirement: result.r ? this.mapNodeToObject(result.r) : null,
                            architectureDecision: result.a ? this.mapNodeToObject(result.a) : null,
                            architecturePattern: result.p ? this.mapNodeToObject(result.p) : null,
                            technologyStack: result.t ? this.mapNodeToObject(result.t) : null,
                        }));
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to get requirement architecture mappings', error);
                        throw error;
                    }
                },
                generateArchitectureRecommendations: async (_, { requirementId }) => {
                    try {
                        return await this.integrationService.generateRecommendations(requirementId);
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to generate architecture recommendations', error);
                        throw error;
                    }
                },
                validateRequirementAlignment: async (_, { requirementId, architectureDecisionId }) => {
                    try {
                        return await this.integrationService.validateAlignment(requirementId, architectureDecisionId);
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to validate requirement alignment', error);
                        throw error;
                    }
                },
                analyzeRequirementImpact: async (_, { requirementId }) => {
                    try {
                        return await this.integrationService.analyzeRequirementImpact(requirementId);
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to analyze requirement impact', error);
                        throw error;
                    }
                },
                getIntegrationMetrics: async (_, { projectId }) => {
                    try {
                        return await this.integrationService.getIntegrationMetrics(projectId);
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to get integration metrics', error);
                        throw error;
                    }
                },
                performIntegrationHealthCheck: async () => {
                    try {
                        return await this.integrationService.performHealthCheck();
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to perform integration health check', error);
                        throw error;
                    }
                },
                // Cross-Module Search
                searchArchitectureByRequirement: async (_, { requirementId, includePatterns, includeTechnologies }) => {
                    try {
                        const query = `
              MATCH (r:Requirement {id: $requirementId})
              MATCH (r)-[:MAPPED_TO]->(m:RequirementArchitectureMapping)
              MATCH (m)-[:MAPS_TO_DECISION]->(a:ArchitectureDecision)
              ${includePatterns ? 'OPTIONAL MATCH (m)-[:MAPS_TO_PATTERN]->(p:ArchitecturePattern)' : ''}
              ${includeTechnologies ? 'OPTIONAL MATCH (m)-[:MAPS_TO_TECHNOLOGY]->(t:TechnologyStack)' : ''}
              RETURN DISTINCT a
              ORDER BY a.createdAt DESC
            `;
                        const results = await this.neo4j.executeQuery(query, {
                            requirementId,
                            includePatterns: includePatterns || true,
                            includeTechnologies: includeTechnologies || true,
                        });
                        return results.map(result => this.mapNodeToObject(result.a));
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to search architecture by requirement', error);
                        throw error;
                    }
                },
                searchRequirementsByArchitecture: async (_, { architectureDecisionId, includeRelated }) => {
                    try {
                        const query = `
              MATCH (a:ArchitectureDecision {id: $architectureDecisionId})
              MATCH (m:RequirementArchitectureMapping)-[:MAPS_TO_DECISION]->(a)
              MATCH (r:Requirement {id: m.requirementId})
              ${includeRelated ? `
                OPTIONAL MATCH (r)-[:SIMILAR_TO|DEPENDS_ON]-(related:Requirement)
                WHERE related.id <> r.id
                RETURN DISTINCT r UNION RETURN DISTINCT related
              ` : 'RETURN DISTINCT r'}
              ORDER BY r.createdAt DESC
            `;
                        const results = await this.neo4j.executeQuery(query, {
                            architectureDecisionId,
                            includeRelated: includeRelated || true,
                        });
                        return results.map(result => this.mapNodeToObject(result.r));
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to search requirements by architecture', error);
                        throw error;
                    }
                },
                // Pattern and Technology Recommendations
                recommendPatterns: async (_, { requirementIds, constraints }) => {
                    try {
                        return await this.patternService.recommendPatterns(requirementIds, constraints);
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to recommend patterns', error);
                        throw error;
                    }
                },
                recommendTechnologies: async (_, { requirementIds, patternIds, constraints }) => {
                    try {
                        return await this.technologyStackService.recommendTechnologies(requirementIds, patternIds, constraints);
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to recommend technologies', error);
                        throw error;
                    }
                },
            },
            Mutation: {
                // Architecture Decision Mutations
                createArchitectureDecision: async (_, { input }) => {
                    try {
                        const decision = await this.decisionService.createDecision(input);
                        // Create automatic mappings to requirements
                        if (input.requirementIds && input.requirementIds.length > 0) {
                            await Promise.all(input.requirementIds.map((requirementId) => this.integrationService.createMapping({
                                requirementId,
                                architectureDecisionId: decision.id,
                                mappingType: 'DIRECT',
                                confidence: 0.9,
                                rationale: 'Automatic mapping created during decision creation',
                            })));
                        }
                        return decision;
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to create architecture decision', error);
                        throw error;
                    }
                },
                updateArchitectureDecision: async (_, { id, input }) => {
                    try {
                        const decision = await this.decisionService.updateDecision(id, input);
                        // Trigger impact analysis for affected requirements
                        const mappings = await this.getMappingsByArchitectureDecision(id);
                        await Promise.all(mappings.map((mapping) => this.integrationService.analyzeRequirementImpact(mapping.requirementId)));
                        return decision;
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to update architecture decision', error);
                        throw error;
                    }
                },
                approveArchitectureDecision: async (_, { id }) => {
                    try {
                        return await this.decisionService.approveDecision(id);
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to approve architecture decision', error);
                        throw error;
                    }
                },
                deprecateArchitectureDecision: async (_, { id, reason, replacementId }) => {
                    try {
                        return await this.decisionService.deprecateDecision(id, reason, replacementId);
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to deprecate architecture decision', error);
                        throw error;
                    }
                },
                // Architecture Pattern Mutations
                createArchitecturePattern: async (_, { input }) => {
                    try {
                        return await this.patternService.createPattern(input);
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to create architecture pattern', error);
                        throw error;
                    }
                },
                updateArchitecturePattern: async (_, { id, input }) => {
                    try {
                        return await this.patternService.updatePattern(id, input);
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to update architecture pattern', error);
                        throw error;
                    }
                },
                // Technology Stack Mutations
                createTechnologyStack: async (_, { input }) => {
                    try {
                        return await this.technologyStackService.createTechnologyStack(input);
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to create technology stack', error);
                        throw error;
                    }
                },
                updateTechnologyStack: async (_, { id, input }) => {
                    try {
                        return await this.technologyStackService.updateTechnologyStack(id, input);
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to update technology stack', error);
                        throw error;
                    }
                },
                // Integration Mutations
                createRequirementArchitectureMapping: async (_, { input }) => {
                    try {
                        return await this.integrationService.createMapping(input);
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to create requirement architecture mapping', error);
                        throw error;
                    }
                },
                updateMappingConfidence: async (_, { id, confidence, rationale }) => {
                    try {
                        const query = `
              MATCH (m:RequirementArchitectureMapping {id: $id})
              SET m.confidence = $confidence,
                  m.rationale = COALESCE($rationale, m.rationale),
                  m.updatedAt = $updatedAt
              RETURN m
            `;
                        const results = await this.neo4j.executeQuery(query, {
                            id,
                            confidence,
                            rationale,
                            updatedAt: new Date().toISOString(),
                        });
                        return results[0] ? this.mapNodeToObject(results[0].m) : null;
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to update mapping confidence', error);
                        throw error;
                    }
                },
                validateMapping: async (_, { id, validated, validatorId, notes }) => {
                    try {
                        const query = `
              MATCH (m:RequirementArchitectureMapping {id: $id})
              SET m.validatedAt = $validatedAt,
                  m.validatedBy = $validatorId,
                  m.validationNotes = $notes,
                  m.validationStatus = $status
              RETURN m
            `;
                        const results = await this.neo4j.executeQuery(query, {
                            id,
                            validatedAt: validated ? new Date().toISOString() : null,
                            validatorId: validated ? validatorId : null,
                            notes,
                            status: validated ? 'VALIDATED' : 'REJECTED',
                        });
                        return results[0] ? this.mapNodeToObject(results[0].m) : null;
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to validate mapping', error);
                        throw error;
                    }
                },
                // Batch Operations
                batchCreateMappings: async (_, { mappings }) => {
                    try {
                        const results = await Promise.all(mappings.map(mapping => this.integrationService.createMapping(mapping)));
                        return results;
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to batch create mappings', error);
                        throw error;
                    }
                },
                batchValidateAlignments: async (_, { alignments, validatorId }) => {
                    try {
                        const results = [];
                        for (const alignmentId of alignments) {
                            const query = `
                MATCH (alignment:ArchitectureRequirementAlignment {id: $alignmentId})
                SET alignment.validationStatus = 'VALIDATED',
                    alignment.validatedAt = $validatedAt,
                    alignment.validatedBy = $validatorId
                RETURN alignment
              `;
                            const result = await this.neo4j.executeQuery(query, {
                                alignmentId,
                                validatedAt: new Date().toISOString(),
                                validatorId,
                            });
                            if (result[0]) {
                                results.push(this.mapNodeToObject(result[0].alignment));
                            }
                        }
                        return results;
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to batch validate alignments', error);
                        throw error;
                    }
                },
                // Optimization Operations
                optimizeArchitectureForRequirements: async (_, { requirementIds, constraints }) => {
                    try {
                        // This would implement AI-driven architecture optimization
                        // For now, return recommendations for the first requirement
                        if (requirementIds.length > 0) {
                            return await this.integrationService.generateRecommendations(requirementIds[0]);
                        }
                        throw new Error('No requirements provided for optimization');
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to optimize architecture for requirements', error);
                        throw error;
                    }
                },
                rebalanceArchitectureDecisions: async (_, { projectId, strategy }) => {
                    try {
                        const query = `
              MATCH (p:Project {id: $projectId})-[:CONTAINS]->(r:Requirement)
              MATCH (r)-[:MAPPED_TO]->(m:RequirementArchitectureMapping)
              MATCH (m)-[:MAPS_TO_DECISION]->(a:ArchitectureDecision)
              RETURN DISTINCT a
              ORDER BY a.createdAt DESC
            `;
                        const results = await this.neo4j.executeQuery(query, { projectId });
                        return results.map(result => this.mapNodeToObject(result.a));
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to rebalance architecture decisions', error);
                        throw error;
                    }
                },
                // Data Migration and Cleanup
                migrateExistingMappings: async (_, { projectId, dryRun }) => {
                    try {
                        // Find unmapped requirements and suggest mappings
                        const query = `
              MATCH (p:Project {id: $projectId})-[:CONTAINS]->(r:Requirement)
              WHERE NOT (r)-[:MAPPED_TO]->(:RequirementArchitectureMapping)
              AND r.status IN ['APPROVED', 'IMPLEMENTED']
              RETURN r
              LIMIT 50
            `;
                        const results = await this.neo4j.executeQuery(query, { projectId });
                        const migrations = [];
                        for (const result of results) {
                            const requirement = this.mapNodeToObject(result.r);
                            const recommendation = await this.integrationService.generateRecommendations(requirement.id);
                            if (!dryRun && recommendation.recommendedPatterns.length > 0) {
                                // Create actual mappings
                                const mapping = await this.integrationService.createMapping({
                                    requirementId: requirement.id,
                                    architecturePatternId: recommendation.recommendedPatterns[0].pattern.id,
                                    mappingType: 'DERIVED',
                                    confidence: recommendation.confidence,
                                    rationale: 'Automatic migration based on AI recommendations',
                                });
                                migrations.push(mapping);
                            }
                        }
                        return migrations;
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to migrate existing mappings', error);
                        throw error;
                    }
                },
                cleanupBrokenMappings: async (_, { projectId }) => {
                    try {
                        const query = `
              MATCH (m:RequirementArchitectureMapping)
              ${projectId ? `
                MATCH (p:Project {id: $projectId})-[:CONTAINS]->(r:Requirement {id: m.requirementId})
              ` : ''}
              WHERE (m.architectureDecisionId IS NOT NULL AND NOT exists((:ArchitectureDecision {id: m.architectureDecisionId})))
              OR (m.architecturePatternId IS NOT NULL AND NOT exists((:ArchitecturePattern {id: m.architecturePatternId})))
              OR (m.technologyStackId IS NOT NULL AND NOT exists((:TechnologyStack {id: m.technologyStackId})))
              DELETE m
              RETURN count(m) as cleanedCount
            `;
                        const results = await this.neo4j.executeQuery(query, projectId ? { projectId } : {});
                        return results[0]?.cleanedCount || 0;
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to cleanup broken mappings', error);
                        throw error;
                    }
                },
            },
            // Field Resolvers for nested data
            ArchitectureDecision: {
                requirements: async (parent) => {
                    const query = `
            MATCH (a:ArchitectureDecision {id: $id})
            MATCH (m:RequirementArchitectureMapping)-[:MAPS_TO_DECISION]->(a)
            MATCH (r:Requirement {id: m.requirementId})
            RETURN DISTINCT r
          `;
                    const results = await this.neo4j.executeQuery(query, { id: parent.id });
                    return results.map(result => this.mapNodeToObject(result.r));
                },
                patterns: async (parent) => {
                    const query = `
            MATCH (a:ArchitectureDecision {id: $id})
            MATCH (a)-[:USES_PATTERN]->(p:ArchitecturePattern)
            RETURN p
          `;
                    const results = await this.neo4j.executeQuery(query, { id: parent.id });
                    return results.map(result => this.mapNodeToObject(result.p));
                },
                technologyStack: async (parent) => {
                    if (!parent.technologyStackId)
                        return null;
                    const query = `
            MATCH (t:TechnologyStack {id: $id})
            RETURN t
          `;
                    const results = await this.neo4j.executeQuery(query, { id: parent.technologyStackId });
                    return results[0] ? this.mapNodeToObject(results[0].t) : null;
                },
                mappings: async (parent) => {
                    const query = `
            MATCH (m:RequirementArchitectureMapping)-[:MAPS_TO_DECISION]->(a:ArchitectureDecision {id: $id})
            RETURN m
          `;
                    const results = await this.neo4j.executeQuery(query, { id: parent.id });
                    return results.map(result => this.mapNodeToObject(result.m));
                },
                alignments: async (parent) => {
                    const query = `
            MATCH (alignment:ArchitectureRequirementAlignment {architectureDecisionId: $id})
            RETURN alignment
          `;
                    const results = await this.neo4j.executeQuery(query, { id: parent.id });
                    return results.map(result => this.mapNodeToObject(result.alignment));
                },
            },
            RequirementArchitectureMapping: {
                requirement: async (parent) => {
                    return await this.requirementsService.getRequirementById(parent.requirementId);
                },
                architectureDecision: async (parent) => {
                    if (!parent.architectureDecisionId)
                        return null;
                    return await this.decisionService.getDecisionById(parent.architectureDecisionId);
                },
                architecturePattern: async (parent) => {
                    if (!parent.architecturePatternId)
                        return null;
                    return await this.patternService.getPatternById(parent.architecturePatternId);
                },
                technologyStack: async (parent) => {
                    if (!parent.technologyStackId)
                        return null;
                    return await this.technologyStackService.getTechnologyStackById(parent.technologyStackId);
                },
            },
        };
    }
    // Helper methods
    async getMappingsByArchitectureDecision(architectureDecisionId) {
        const query = `
      MATCH (m:RequirementArchitectureMapping {architectureDecisionId: $architectureDecisionId})
      RETURN m
    `;
        const results = await this.neo4j.executeQuery(query, { architectureDecisionId });
        return results.map(result => this.mapNodeToObject(result.m));
    }
    mapNodeToObject(node) {
        if (!node || !node.properties)
            return null;
        return { ...node.properties };
    }
}
exports.ArchitectureResolvers = ArchitectureResolvers;
exports.architectureResolvers = new ArchitectureResolvers().getResolvers();
//# sourceMappingURL=architecture.resolvers.js.map