"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirementsResolvers = void 0;
const nlp_service_1 = require("../services/nlp.service");
const secure_query_builder_1 = require("../../../utils/secure-query-builder");
const logger_1 = require("../../../core/logging/logger");
exports.requirementsResolvers = {
    Query: {
        requirement: async (_, { id }, context) => {
            return context.services.requirements.getRequirementById(id);
        },
        requirements: async (_, args, context) => {
            // Simplified implementation - would have more complex filtering in production
            const query = `
        MATCH (r:Requirement)
        ${args.projectId ? 'MATCH (r)<-[:CONTAINS]-(p:Project {id: $projectId})' : ''}
        ${args.type ? 'WHERE r.type = $type' : ''}
        ${args.status ? 'WHERE r.status = $status' : ''}
        RETURN r
        SKIP $offset
        LIMIT $limit
      `;
            const params = {
                projectId: args.projectId,
                type: args.type,
                status: args.status,
                offset: args.offset || 0,
                limit: args.limit || 20,
            };
            const results = await context.services.neo4j.executeQuery(query, params);
            return results.map((record) => record.r.properties);
        },
        findSimilarRequirements: async (_, { requirementId, threshold }, context) => {
            const requirement = await context.services.requirements.getRequirementById(requirementId);
            if (!requirement)
                return [];
            return context.services.requirements.similarityService.findSimilarRequirements(requirement, threshold);
        },
        detectConflicts: async (_, { requirementId }, context) => {
            return context.services.requirements.detectConflicts(requirementId);
        },
        extractPatterns: async (_, { projectId }, context) => {
            return context.services.requirements.extractPatterns(projectId);
        },
        analyzeRequirement: async (_, { description }, context) => {
            const nlpService = new nlp_service_1.NLPService();
            const analysis = await nlpService.analyzeRequirement(description);
            return {
                requirement: {
                    id: 'temp-' + Date.now(),
                    title: analysis.suggestedTitle,
                    description,
                    type: analysis.type,
                    status: 'DRAFT',
                    priority: analysis.priority,
                    createdAt: new Date().toISOString(),
                },
                completenessScore: analysis.completenessScore,
                qualityScore: analysis.qualityScore,
                suggestions: analysis.suggestions,
                similarRequirements: [],
                recommendedExperts: [],
            };
        },
    },
    Mutation: {
        createRequirement: async (_, { input }, context) => {
            return context.services.requirements.createRequirement(input);
        },
        updateRequirement: async (_, { id, input }, context) => {
            try {
                // Validate input parameters
                secure_query_builder_1.InputValidator.validateGraphQLInput(input, {
                    title: { type: 'string', maxLength: 255 },
                    description: { type: 'string', maxLength: 2000 },
                    type: { type: 'string', maxLength: 50 },
                    status: { type: 'string', maxLength: 20 },
                    priority: { type: 'string', maxLength: 20 }
                });
                // Use secure query builder to prevent injection
                const { query, params } = secure_query_builder_1.SecureQueryBuilder.buildSecureUpdateQuery('Requirement', id, input);
                const results = await context.services.neo4j.executeQuery(query, params);
                if (results.length === 0) {
                    throw new Error(`Requirement with id ${id} not found`);
                }
                logger_1.logger.info('Requirement updated successfully', { id, fieldCount: Object.keys(input).length });
                return results[0]?.n.properties;
            }
            catch (error) {
                logger_1.logger.error('Failed to update requirement', { id, input, error });
                throw error;
            }
        },
        approveRequirement: async (_, { id }, context) => {
            return context.services.requirements.updateRequirementStatus(id, 'APPROVED');
        },
        linkRequirements: async (_, { requirement1Id, requirement2Id, relationship, properties = {}, }, context) => {
            try {
                // Validate input parameters
                if (!requirement1Id || !requirement2Id) {
                    throw new Error('Both requirement IDs are required');
                }
                if (requirement1Id === requirement2Id) {
                    throw new Error('Cannot link requirement to itself');
                }
                // Use secure query builder with relationship type validation
                const { query, params } = secure_query_builder_1.SecureQueryBuilder.buildSecureRelationshipQuery('Requirement', requirement1Id, 'Requirement', requirement2Id, relationship, properties);
                const results = await context.services.neo4j.executeQuery(query, params);
                if (results.length === 0) {
                    throw new Error('Failed to create relationship - one or both requirements not found');
                }
                logger_1.logger.info('Requirements linked successfully', {
                    requirement1Id,
                    requirement2Id,
                    relationship
                });
                return true;
            }
            catch (error) {
                logger_1.logger.error('Failed to link requirements', {
                    requirement1Id,
                    requirement2Id,
                    relationship,
                    error
                });
                throw error;
            }
        },
        resolveConflict: async (_, { conflictId, resolution }, context) => {
            // Simplified conflict resolution
            const query = `
        MATCH (c:Conflict {id: $conflictId})
        SET c.status = 'RESOLVED',
            c.resolution = $resolution,
            c.resolvedAt = $resolvedAt
        RETURN c
      `;
            const results = await context.services.neo4j.executeQuery(query, {
                conflictId,
                resolution,
                resolvedAt: new Date().toISOString(),
            });
            return results[0]?.c.properties;
        },
    },
    Requirement: {
        similarRequirements: async (parent, _, context) => {
            if (!parent.id)
                return [];
            const requirement = await context.services.requirements.getRequirementById(parent.id);
            if (!requirement)
                return [];
            return context.services.requirements.similarityService.findSimilarRequirements(requirement);
        },
        conflicts: async (parent, _, context) => {
            if (!parent.id)
                return [];
            return context.services.requirements.detectConflicts(parent.id);
        },
    },
};
//# sourceMappingURL=requirements.resolvers.js.map