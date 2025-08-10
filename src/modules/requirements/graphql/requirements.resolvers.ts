import { RequirementsService } from '../services/requirements.service';
import { NLPService } from '../services/nlp.service';

export const requirementsResolvers = {
  Query: {
    requirement: async (_: any, { id }: { id: string }, context: any) => {
      return context.services.requirements.getRequirementById(id);
    },

    requirements: async (
      _: any,
      args: {
        projectId?: string;
        type?: string;
        status?: string;
        limit?: number;
        offset?: number;
      },
      context: any
    ) => {
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
      return results.map((record: any) => record.r.properties);
    },

    findSimilarRequirements: async (
      _: any,
      { requirementId, threshold }: { requirementId: string; threshold?: number },
      context: any
    ) => {
      const requirement = await context.services.requirements.getRequirementById(requirementId);
      if (!requirement) return [];
      
      return context.services.requirements.similarityService.findSimilarRequirements(
        requirement,
        threshold
      );
    },

    detectConflicts: async (
      _: any,
      { requirementId }: { requirementId: string },
      context: any
    ) => {
      return context.services.requirements.detectConflicts(requirementId);
    },

    extractPatterns: async (
      _: any,
      { projectId }: { projectId: string },
      context: any
    ) => {
      return context.services.requirements.extractPatterns(projectId);
    },

    analyzeRequirement: async (
      _: any,
      { description }: { description: string },
      context: any
    ) => {
      const nlpService = new NLPService();
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
    createRequirement: async (
      _: any,
      { input }: { input: any },
      context: any
    ) => {
      return context.services.requirements.createRequirement(input);
    },

    updateRequirement: async (
      _: any,
      { id, input }: { id: string; input: any },
      context: any
    ) => {
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

    approveRequirement: async (
      _: any,
      { id }: { id: string },
      context: any
    ) => {
      return context.services.requirements.updateRequirementStatus(id, 'APPROVED');
    },

    linkRequirements: async (
      _: any,
      {
        requirement1Id,
        requirement2Id,
        relationship,
      }: {
        requirement1Id: string;
        requirement2Id: string;
        relationship: string;
      },
      context: any
    ) => {
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

    resolveConflict: async (
      _: any,
      { conflictId, resolution }: { conflictId: string; resolution: string },
      context: any
    ) => {
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
    similarRequirements: async (parent: any, _: any, context: any) => {
      if (!parent.id) return [];
      const requirement = await context.services.requirements.getRequirementById(parent.id);
      if (!requirement) return [];
      return context.services.requirements.similarityService.findSimilarRequirements(requirement);
    },

    conflicts: async (parent: any, _: any, context: any) => {
      if (!parent.id) return [];
      return context.services.requirements.detectConflicts(parent.id);
    },
  },
};