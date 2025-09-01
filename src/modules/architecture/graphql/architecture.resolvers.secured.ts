import { Neo4jService } from '../../../core/database/neo4j';
import { logger } from '../../../core/logging/logger';
import { RequirementsArchitectureIntegrationService } from '../../../services/requirements-architecture-integration.service';
import { ArchitectureDecisionService } from '../services/decision.service';
import { ArchitecturePatternService } from '../services/pattern.service';
import { TechnologyStackService } from '../services/technology-stack.service';
import { ArchitectureService } from '../services/architecture.service';
import { RequirementsService } from '../../requirements/services/requirements.service';
import { AuthorizationGuard, PERMISSIONS, withAuthorization } from '../../../core/auth/guards/authorization.guard';

export class ArchitectureResolvers {
  private neo4j: Neo4jService;
  private integrationService: RequirementsArchitectureIntegrationService;
  private decisionService: ArchitectureDecisionService;
  private patternService: ArchitecturePatternService;
  private technologyStackService: TechnologyStackService;
  private architectureService: ArchitectureService;
  private requirementsService: RequirementsService;

  constructor() {
    this.neo4j = Neo4jService.getInstance();
    this.integrationService = new RequirementsArchitectureIntegrationService(this.neo4j);
    this.decisionService = new ArchitectureDecisionService(this.neo4j);
    this.patternService = new ArchitecturePatternService(this.neo4j);
    this.technologyStackService = new TechnologyStackService(this.neo4j);
    this.architectureService = new ArchitectureService(this.neo4j);
    this.requirementsService = new RequirementsService(this.neo4j);
  }

  getResolvers() {
    return {
      Query: {
        // Architecture Decision Queries with Authorization
        architectureDecision: withAuthorization(
          async (_: any, { id }: { id: string }) => {
            try {
              return await this.decisionService.getDecisionById(id);
            } catch (error) {
              logger.error('Failed to get architecture decision', error);
              throw error;
            }
          },
          { permissions: [PERMISSIONS.ARCHITECTURE_READ] }
        ),

        architectureDecisions: withAuthorization(
          async (_: any, args: any) => {
            try {
              return await this.decisionService.getDecisions(args);
            } catch (error) {
              logger.error('Failed to get architecture decisions', error);
              throw error;
            }
          },
          { permissions: [PERMISSIONS.ARCHITECTURE_READ] }
        ),

        // Architecture Pattern Queries with Authorization
        architecturePattern: withAuthorization(
          async (_: any, { id }: { id: string }) => {
            try {
              return await this.patternService.getPatternById(id);
            } catch (error) {
              logger.error('Failed to get architecture pattern', error);
              throw error;
            }
          },
          { permissions: [PERMISSIONS.ARCHITECTURE_READ] }
        ),

        architecturePatterns: withAuthorization(
          async (_: any, args: any) => {
            try {
              return await this.patternService.getPatterns(args);
            } catch (error) {
              logger.error('Failed to get architecture patterns', error);
              throw error;
            }
          },
          { permissions: [PERMISSIONS.ARCHITECTURE_READ] }
        ),

        // Technology Stack Queries with Authorization
        technologyStack: withAuthorization(
          async (_: any, { id }: { id: string }) => {
            try {
              return await this.technologyStackService.getTechnologyStackById(id);
            } catch (error) {
              logger.error('Failed to get technology stack', error);
              throw error;
            }
          },
          { permissions: [PERMISSIONS.ARCHITECTURE_READ] }
        ),

        technologyStacks: withAuthorization(
          async (_: any, args: any) => {
            try {
              return await this.technologyStackService.getTechnologyStacks(args);
            } catch (error) {
              logger.error('Failed to get technology stacks', error);
              throw error;
            }
          },
          { permissions: [PERMISSIONS.ARCHITECTURE_READ] }
        ),

        // Integration Queries with Authorization
        requirementArchitectureMappings: withAuthorization(
          async (_: any, args: any, context: any) => {
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
            } catch (error) {
              logger.error('Failed to get requirement architecture mappings', error);
              throw error;
            }
          },
          { permissions: [PERMISSIONS.ARCHITECTURE_READ, PERMISSIONS.REQUIREMENTS_READ], requireAll: false }
        ),

        generateArchitectureRecommendations: withAuthorization(
          async (_: any, { requirementId }: { requirementId: string }) => {
            try {
              return await this.integrationService.generateRecommendations(requirementId);
            } catch (error) {
              logger.error('Failed to generate architecture recommendations', error);
              throw error;
            }
          },
          { permissions: [PERMISSIONS.ARCHITECTURE_READ] }
        ),
      },

      Mutation: {
        // Architecture Decision Mutations with Authorization
        createArchitectureDecision: withAuthorization(
          async (_: any, { input }: any, context: any) => {
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
              }

              return decision;
            } catch (error) {
              logger.error('Failed to create architecture decision', error);
              throw error;
            }
          },
          { permissions: [PERMISSIONS.ARCHITECTURE_WRITE] }
        ),

        updateArchitectureDecision: withAuthorization(
          async (_: any, { id, input }: any, context: any) => {
            try {
              const decision = await this.decisionService.updateDecision(id, input);
              
              // Trigger impact analysis for affected requirements
              const mappings = await this.getMappingsByArchitectureDecision(id);
              await Promise.all(
                mappings.map((mapping: any) =>
                  this.integrationService.analyzeRequirementImpact(mapping.requirementId)
                )
              );

              return decision;
            } catch (error) {
              logger.error('Failed to update architecture decision', error);
              throw error;
            }
          },
          { permissions: [PERMISSIONS.ARCHITECTURE_WRITE] }
        ),

        approveArchitectureDecision: withAuthorization(
          async (_: any, { id }: { id: string }) => {
            try {
              return await this.decisionService.approveDecision(id);
            } catch (error) {
              logger.error('Failed to approve architecture decision', error);
              throw error;
            }
          },
          { permissions: [PERMISSIONS.ARCHITECTURE_APPROVE] }
        ),

        deprecateArchitectureDecision: withAuthorization(
          async (_: any, { id, reason, replacementId }: any) => {
            try {
              return await this.decisionService.deprecateDecision(id, reason, replacementId);
            } catch (error) {
              logger.error('Failed to deprecate architecture decision', error);
              throw error;
            }
          },
          { permissions: [PERMISSIONS.ARCHITECTURE_WRITE] }
        ),

        // Architecture Pattern Mutations with Authorization
        createArchitecturePattern: withAuthorization(
          async (_: any, { input }: any) => {
            try {
              return await this.patternService.createPattern(input);
            } catch (error) {
              logger.error('Failed to create architecture pattern', error);
              throw error;
            }
          },
          { permissions: [PERMISSIONS.ARCHITECTURE_WRITE] }
        ),

        // Technology Stack Mutations with Authorization
        createTechnologyStack: withAuthorization(
          async (_: any, { input }: any) => {
            try {
              return await this.technologyStackService.createTechnologyStack(input);
            } catch (error) {
              logger.error('Failed to create technology stack', error);
              throw error;
            }
          },
          { permissions: [PERMISSIONS.ARCHITECTURE_WRITE] }
        ),

        // Integration Mutations with Authorization
        createRequirementArchitectureMapping: withAuthorization(
          async (_: any, { input }: any) => {
            try {
              return await this.integrationService.createMapping(input);
            } catch (error) {
              logger.error('Failed to create requirement architecture mapping', error);
              throw error;
            }
          },
          { permissions: [PERMISSIONS.ARCHITECTURE_WRITE] }
        ),
      },

      // Field Resolvers with Authorization
      ArchitectureDecision: {
        requirements: async (parent: any, _: any, context: any) => {
          AuthorizationGuard.authorize(context, { permissions: [PERMISSIONS.REQUIREMENTS_READ] });
          
          const query = `
            MATCH (a:ArchitectureDecision {id: $id})
            MATCH (m:RequirementArchitectureMapping)-[:MAPS_TO_DECISION]->(a)
            MATCH (r:Requirement {id: m.requirementId})
            RETURN DISTINCT r
          `;
          
          const results = await this.neo4j.executeQuery(query, { id: parent.id });
          return results.map(result => this.mapNodeToObject(result.r));
        },

        patterns: async (parent: any, _: any, context: any) => {
          AuthorizationGuard.authorize(context, { permissions: [PERMISSIONS.ARCHITECTURE_READ] });
          
          const query = `
            MATCH (a:ArchitectureDecision {id: $id})
            MATCH (a)-[:USES_PATTERN]->(p:ArchitecturePattern)
            RETURN p
          `;
          
          const results = await this.neo4j.executeQuery(query, { id: parent.id });
          return results.map(result => this.mapNodeToObject(result.p));
        },
      },

      RequirementArchitectureMapping: {
        requirement: async (parent: any, _: any, context: any) => {
          AuthorizationGuard.authorize(context, { permissions: [PERMISSIONS.REQUIREMENTS_READ] });
          return await this.requirementsService.getRequirementById(parent.requirementId);
        },

        architectureDecision: async (parent: any, _: any, context: any) => {
          AuthorizationGuard.authorize(context, { permissions: [PERMISSIONS.ARCHITECTURE_READ] });
          if (!parent.architectureDecisionId) return null;
          return await this.decisionService.getDecisionById(parent.architectureDecisionId);
        },
      },
    };
  }

  // Helper methods
  private async getMappingsByArchitectureDecision(architectureDecisionId: string): Promise<any[]> {
    const query = `
      MATCH (m:RequirementArchitectureMapping {architectureDecisionId: $architectureDecisionId})
      RETURN m
    `;
    
    const results = await this.neo4j.executeQuery(query, { architectureDecisionId });
    return results.map(result => this.mapNodeToObject(result.m));
  }

  private mapNodeToObject(node: any): any {
    if (!node || !node.properties) return null;
    return { ...node.properties };
  }
}

export const architectureResolvers = new ArchitectureResolvers().getResolvers();