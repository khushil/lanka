import { logger } from '../../../core/logging/logger';
import { RequirementsArchitectureIntegrationService } from '../../../services/requirements-architecture-integration.service';
import { ArchitectureDecisionService } from '../services/decision.service';
import { ArchitecturePatternService } from '../services/pattern.service';
import { TechnologyStackService } from '../services/technology-stack.service';
import { ArchitectureService } from '../services/architecture.service';

/**
 * Optimized Architecture Resolvers using DataLoaders
 * Eliminates N+1 queries and improves GraphQL performance
 */
export class OptimizedArchitectureResolvers {
  private integrationService: RequirementsArchitectureIntegrationService;
  private decisionService: ArchitectureDecisionService;
  private patternService: ArchitecturePatternService;
  private technologyStackService: TechnologyStackService;
  private architectureService: ArchitectureService;

  constructor(neo4j: any) {
    this.integrationService = new RequirementsArchitectureIntegrationService(neo4j);
    this.decisionService = new ArchitectureDecisionService(neo4j);
    this.patternService = new ArchitecturePatternService(neo4j);
    this.technologyStackService = new TechnologyStackService(neo4j);
    this.architectureService = new ArchitectureService(neo4j);
  }

  getResolvers() {
    return {
      Query: {
        // Architecture Decision Queries - Using DataLoaders
        architectureDecision: async (_: any, { id }: { id: string }, context: any) => {
          try {
            return await context.dataLoaders.architectureDecisions.load(id);
          } catch (error) {
            logger.error('Failed to get architecture decision', error);
            throw error;
          }
        },

        architectureDecisions: async (_: any, args: any, context: any) => {
          try {
            // For complex queries, still use service but prime the cache
            const decisions = await this.decisionService.getDecisions(args);
            
            // Prime the DataLoader cache with fetched data
            decisions.forEach((decision: any) => {
              if (decision.id) {
                context.dataLoaders.architectureDecisions.prime(decision.id, decision);
              }
            });

            return decisions;
          } catch (error) {
            logger.error('Failed to get architecture decisions', error);
            throw error;
          }
        },

        // Architecture Pattern Queries - Using DataLoaders
        architecturePattern: async (_: any, { id }: { id: string }, context: any) => {
          try {
            return await context.dataLoaders.architecturePatterns.load(id);
          } catch (error) {
            logger.error('Failed to get architecture pattern', error);
            throw error;
          }
        },

        architecturePatterns: async (_: any, args: any, context: any) => {
          try {
            const patterns = await this.patternService.getPatterns(args);
            
            // Prime the cache
            patterns.forEach((pattern: any) => {
              if (pattern.id) {
                context.dataLoaders.architecturePatterns.prime(pattern.id, pattern);
              }
            });

            return patterns;
          } catch (error) {
            logger.error('Failed to get architecture patterns', error);
            throw error;
          }
        },

        // Technology Stack Queries - Using DataLoaders
        technologyStack: async (_: any, { id }: { id: string }, context: any) => {
          try {
            return await context.dataLoaders.technologyStacks.load(id);
          } catch (error) {
            logger.error('Failed to get technology stack', error);
            throw error;
          }
        },

        technologyStacks: async (_: any, args: any, context: any) => {
          try {
            const stacks = await this.technologyStackService.getTechnologyStacks(args);
            
            // Prime the cache
            stacks.forEach((stack: any) => {
              if (stack.id) {
                context.dataLoaders.technologyStacks.prime(stack.id, stack);
              }
            });

            return stacks;
          } catch (error) {
            logger.error('Failed to get technology stacks', error);
            throw error;
          }
        },

        // Integration Queries - Optimized with DataLoaders
        requirementArchitectureMappings: async (_: any, args: any, context: any) => {
          try {
            const query = `
              MATCH (m:RequirementArchitectureMapping)
              ${args.requirementId ? 'WHERE m.requirementId = $requirementId' : ''}
              ${args.architectureDecisionId ? 'WHERE m.architectureDecisionId = $architectureDecisionId' : ''}
              ${args.confidence ? 'WHERE m.confidence >= $confidence' : ''}
              RETURN m
              ORDER BY m.createdAt DESC
              SKIP $offset
              LIMIT $limit
            `;

            const results = await context.services.neo4j.executeQuery(query, {
              ...args,
              offset: args.offset || 0,
              limit: args.limit || 20,
            });

            // Extract IDs for batch loading related data
            const requirementIds: string[] = [];
            const architectureDecisionIds: string[] = [];
            const architecturePatternIds: string[] = [];
            const technologyStackIds: string[] = [];

            const mappings = results.map((result: any) => {
              const mapping = this.mapNodeToObject(result.m);
              
              if (mapping.requirementId) requirementIds.push(mapping.requirementId);
              if (mapping.architectureDecisionId) architectureDecisionIds.push(mapping.architectureDecisionId);
              if (mapping.architecturePatternId) architecturePatternIds.push(mapping.architecturePatternId);
              if (mapping.technologyStackId) technologyStackIds.push(mapping.technologyStackId);
              
              return mapping;
            });

            // Batch load all related data
            const [requirements, decisions, patterns, stacks] = await Promise.all([
              requirementIds.length > 0 ? context.dataLoaders.requirements.loadMany(requirementIds) : [],
              architectureDecisionIds.length > 0 ? context.dataLoaders.architectureDecisions.loadMany(architectureDecisionIds) : [],
              architecturePatternIds.length > 0 ? context.dataLoaders.architecturePatterns.loadMany(architecturePatternIds) : [],
              technologyStackIds.length > 0 ? context.dataLoaders.technologyStacks.loadMany(technologyStackIds) : []
            ]);

            // Map the results back to mappings
            const requirementMap = new Map(requirements.filter(Boolean).map((r: any) => [r.id, r]));
            const decisionMap = new Map(decisions.filter(Boolean).map((d: any) => [d.id, d]));
            const patternMap = new Map(patterns.filter(Boolean).map((p: any) => [p.id, p]));
            const stackMap = new Map(stacks.filter(Boolean).map((s: any) => [s.id, s]));

            return mappings.map((mapping: any) => ({
              ...mapping,
              requirement: mapping.requirementId ? requirementMap.get(mapping.requirementId) : null,
              architectureDecision: mapping.architectureDecisionId ? decisionMap.get(mapping.architectureDecisionId) : null,
              architecturePattern: mapping.architecturePatternId ? patternMap.get(mapping.architecturePatternId) : null,
              technologyStack: mapping.technologyStackId ? stackMap.get(mapping.technologyStackId) : null,
            }));

          } catch (error) {
            logger.error('Failed to get requirement architecture mappings', error);
            throw error;
          }
        },

        // Optimized cross-module searches
        searchArchitectureByRequirement: async (_: any, { requirementId }: any, context: any) => {
          try {
            // Load architecture decisions for this requirement using DataLoader
            const decisions = await context.dataLoaders.architectureDecisionsByRequirement.load(requirementId);
            return decisions || [];
          } catch (error) {
            logger.error('Failed to search architecture by requirement', error);
            throw error;
          }
        },

        searchRequirementsByArchitecture: async (_: any, { architectureDecisionId }: any, context: any) => {
          try {
            // Load requirements for this architecture decision using DataLoader
            const requirements = await context.dataLoaders.requirementsByArchitecture.load(architectureDecisionId);
            return requirements || [];
          } catch (error) {
            logger.error('Failed to search requirements by architecture', error);
            throw error;
          }
        },

        // Performance metrics endpoint
        dataLoaderMetrics: async (_: any, args: any, context: any) => {
          try {
            if (!context.dataLoaderFactory) {
              throw new Error('DataLoader factory not available');
            }

            const metrics = context.dataLoaderFactory.getPerformanceMetrics();
            const report = context.dataLoaderFactory.getPerformanceReport();

            return {
              metrics,
              report,
              timestamp: new Date().toISOString()
            };
          } catch (error) {
            logger.error('Failed to get DataLoader metrics', error);
            throw error;
          }
        },
      },

      Mutation: {
        // Mutations remain largely the same but with cache invalidation
        createArchitectureDecision: async (_: any, { input }: any, context: any) => {
          try {
            const decision = await this.decisionService.createDecision(input);
            
            // Create automatic mappings to requirements
            if (input.requirementIds && input.requirementIds.length > 0) {
              await Promise.all(
                input.requirementIds.map((requirementId: string) =>
                  this.integrationService.createMapping({
                    requirementId,
                    architectureDecisionId: decision.id,
                    mappingType: 'DIRECT',
                    confidence: 0.9,
                    rationale: 'Automatic mapping created during decision creation',
                  })
                )
              );

              // Invalidate related caches
              input.requirementIds.forEach((reqId: string) => {
                context.dataLoaders.architectureDecisionsByRequirement.clear(reqId);
              });
            }

            // Prime the cache with the new decision
            context.dataLoaders.architectureDecisions.prime(decision.id, decision);

            return decision;
          } catch (error) {
            logger.error('Failed to create architecture decision', error);
            throw error;
          }
        },

        updateArchitectureDecision: async (_: any, { id, input }: any, context: any) => {
          try {
            const decision = await this.decisionService.updateDecision(id, input);
            
            // Clear cache for updated decision
            context.dataLoaders.architectureDecisions.clear(id);
            
            // Invalidate related requirement caches
            const query = `
              MATCH (m:RequirementArchitectureMapping {architectureDecisionId: $id})
              RETURN collect(m.requirementId) as requirementIds
            `;
            
            const results = await context.services.neo4j.executeQuery(query, { id });
            const requirementIds = results[0]?.requirementIds || [];
            
            requirementIds.forEach((reqId: string) => {
              context.dataLoaders.architectureDecisionsByRequirement.clear(reqId);
              context.dataLoaders.requirementsByArchitecture.clear(id);
            });

            // Prime with updated data
            context.dataLoaders.architectureDecisions.prime(id, decision);

            return decision;
          } catch (error) {
            logger.error('Failed to update architecture decision', error);
            throw error;
          }
        },

        // Cache management mutations
        clearDataLoaderCaches: async (_: any, { pattern }: { pattern?: string }, context: any) => {
          try {
            if (pattern) {
              context.dataLoaders.clearByPattern(pattern);
            } else {
              context.dataLoaders.clearAll();
            }

            return {
              success: true,
              message: pattern ? `Cleared caches matching pattern: ${pattern}` : 'Cleared all caches',
              timestamp: new Date().toISOString()
            };
          } catch (error) {
            logger.error('Failed to clear DataLoader caches', error);
            throw error;
          }
        },
      },

      // Optimized Field Resolvers using DataLoaders
      ArchitectureDecision: {
        requirements: async (parent: any, _: any, context: any) => {
          // Use the reverse lookup DataLoader
          return await context.dataLoaders.requirementsByArchitecture.load(parent.id);
        },

        patterns: async (parent: any, _: any, context: any) => {
          const query = `
            MATCH (a:ArchitectureDecision {id: $id})
            MATCH (a)-[:USES_PATTERN]->(p:ArchitecturePattern)
            RETURN collect(p.id) as patternIds
          `;
          
          const results = await context.services.neo4j.executeQuery(query, { id: parent.id });
          const patternIds = results[0]?.patternIds || [];
          
          if (patternIds.length === 0) return [];
          
          return await context.dataLoaders.architecturePatterns.loadMany(patternIds);
        },

        technologyStack: async (parent: any, _: any, context: any) => {
          if (!parent.technologyStackId) return null;
          return await context.dataLoaders.technologyStacks.load(parent.technologyStackId);
        },

        mappings: async (parent: any, _: any, context: any) => {
          const query = `
            MATCH (m:RequirementArchitectureMapping)-[:MAPS_TO_DECISION]->(a:ArchitectureDecision {id: $id})
            RETURN m
          `;
          
          const results = await context.services.neo4j.executeQuery(query, { id: parent.id });
          return results.map((result: any) => this.mapNodeToObject(result.m));
        },
      },

      RequirementArchitectureMapping: {
        requirement: async (parent: any, _: any, context: any) => {
          if (!parent.requirementId) return null;
          return await context.dataLoaders.requirements.load(parent.requirementId);
        },

        architectureDecision: async (parent: any, _: any, context: any) => {
          if (!parent.architectureDecisionId) return null;
          return await context.dataLoaders.architectureDecisions.load(parent.architectureDecisionId);
        },

        architecturePattern: async (parent: any, _: any, context: any) => {
          if (!parent.architecturePatternId) return null;
          return await context.dataLoaders.architecturePatterns.load(parent.architecturePatternId);
        },

        technologyStack: async (parent: any, _: any, context: any) => {
          if (!parent.technologyStackId) return null;
          return await context.dataLoaders.technologyStacks.load(parent.technologyStackId);
        },
      },
    };
  }

  // Helper methods
  private mapNodeToObject(node: any): any {
    if (!node || !node.properties) return null;
    return { ...node.properties };
  }
}

export const optimizedArchitectureResolvers = new OptimizedArchitectureResolvers(null).getResolvers();