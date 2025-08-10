"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirementsResolvers = void 0;
const nlp_service_1 = require("../services/nlp.service");
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
            // Simplified update - would be more comprehensive in production
            const setClause = Object.keys(input)
                .map(key => `r.${key} = $${key}`)
                .join(', ');
            const query = `
        MATCH (r:Requirement {id: $id})
        SET ${setClause}, r.updatedAt = $updatedAt
        RETURN r
      `;
            const params = {
                id,
                ...input,
                updatedAt: new Date().toISOString(),
            };
            const results = await context.services.neo4j.executeQuery(query, params);
            return results[0]?.r.properties;
        },
        approveRequirement: async (_, { id }, context) => {
            return context.services.requirements.updateRequirementStatus(id, 'APPROVED');
        },
        linkRequirements: async (_, { requirement1Id, requirement2Id, relationship, }, context) => {
            const query = `
        MATCH (r1:Requirement {id: $requirement1Id})
        MATCH (r2:Requirement {id: $requirement2Id})
        CREATE (r1)-[:${relationship}]->(r2)
        RETURN r1, r2
      `;
            const results = await context.services.neo4j.executeQuery(query, {
                requirement1Id,
                requirement2Id,
            });
            return results.length > 0;
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