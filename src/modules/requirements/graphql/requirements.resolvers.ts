import { RequirementsService } from '../services/requirements.service';
import { NLPService } from '../services/nlp.service';
import { SecureQueryBuilder, InputValidator } from '../../../utils/secure-query-builder';
import { logger } from '../../../core/logging/logger';

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
      try {
        // Validate input parameters
        InputValidator.validateGraphQLInput(input, {
          title: { type: 'string', maxLength: 255 },
          description: { type: 'string', maxLength: 2000 },
          type: { type: 'string', maxLength: 50 },
          status: { type: 'string', maxLength: 20 },
          priority: { type: 'string', maxLength: 20 }
        });

        // Use secure query builder to prevent injection
        const { query, params } = SecureQueryBuilder.buildSecureUpdateQuery(
          'Requirement',
          id,
          input
        );

        const results = await context.services.neo4j.executeQuery(query, params);
        
        if (results.length === 0) {
          throw new Error(`Requirement with id ${id} not found`);
        }

        logger.info('Requirement updated successfully', { id, fieldCount: Object.keys(input).length });
        return results[0]?.n.properties;
      } catch (error) {
        logger.error('Failed to update requirement', { id, input, error });
        throw error;
      }
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
        properties = {},
      }: {
        requirement1Id: string;
        requirement2Id: string;
        relationship: string;
        properties?: Record<string, any>;
      },
      context: any
    ) => {
      try {
        // Validate input parameters
        if (!requirement1Id || !requirement2Id) {
          throw new Error('Both requirement IDs are required');
        }

        if (requirement1Id === requirement2Id) {
          throw new Error('Cannot link requirement to itself');
        }

        // Use secure query builder with relationship type validation
        const { query, params } = SecureQueryBuilder.buildSecureRelationshipQuery(
          'Requirement',
          requirement1Id,
          'Requirement',
          requirement2Id,
          relationship,
          properties
        );

        const results = await context.services.neo4j.executeQuery(query, params);
        
        if (results.length === 0) {
          throw new Error('Failed to create relationship - one or both requirements not found');
        }

        logger.info('Requirements linked successfully', { 
          requirement1Id, 
          requirement2Id, 
          relationship 
        });
        
        return true;
      } catch (error) {
        logger.error('Failed to link requirements', { 
          requirement1Id, 
          requirement2Id, 
          relationship, 
          error 
        });
        throw error;
      }
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