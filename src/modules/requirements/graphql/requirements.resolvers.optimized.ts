import { RequirementsService } from '../services/requirements.service';
import { logger } from '../../../core/logging/logger';

/**
 * Optimized Requirements Resolvers using DataLoaders
 * Eliminates N+1 queries for requirement-related operations
 */
export class OptimizedRequirementsResolvers {
  private requirementsService: RequirementsService;

  constructor(neo4j: any) {
    this.requirementsService = new RequirementsService(neo4j);
  }

  getResolvers() {
    return {
      Query: {
        // Single requirement query - Using DataLoader
        requirement: async (_: any, { id }: { id: string }, context: any) => {
          try {
            return await context.dataLoaders.requirements.load(id);
          } catch (error) {
            logger.error('Failed to get requirement', error);
            throw error;
          }
        },

        // Requirements list query - Optimized with caching
        requirements: async (
          _: any,
          args: {
            projectId?: string;
            type?: string;
            status?: string;
            priority?: string;
            assigneeId?: string;
            limit?: number;
            offset?: number;
          },
          context: any
        ) => {
          try {
            // Check if we can use the project-based DataLoader
            if (args.projectId && !args.type && !args.status && !args.priority && !args.assigneeId) {
              const requirements = await context.dataLoaders.requirementsByProject.load(args.projectId);
              
              // Apply limit/offset if needed
              const start = args.offset || 0;
              const end = start + (args.limit || 50);
              
              return requirements.slice(start, end);
            }

            // For complex queries, use the filter-based DataLoader
            const specialized = context.dataLoaderFactory.createSpecializedLoaders();
            const filterKey = specialized.requirementsByFilters.constructor.generateFilterKey(args);
            
            return await specialized.requirementsByFilters.load(filterKey);

          } catch (error) {
            logger.error('Failed to get requirements', error);
            throw error;
          }
        },

        // Requirements by project - Using dedicated DataLoader
        requirementsByProject: async (_: any, { projectId }: { projectId: string }, context: any) => {
          try {
            return await context.dataLoaders.requirementsByProject.load(projectId);
          } catch (error) {
            logger.error('Failed to get requirements by project', error);
            throw error;
          }
        },

        // Similar requirements - Using specialized DataLoader
        findSimilarRequirements: async (
          _: any,
          { requirementId, threshold }: { requirementId: string; threshold?: number },
          context: any
        ) => {
          try {
            const specialized = context.dataLoaderFactory.createSpecializedLoaders();
            const similarities = await specialized.similarRequirements.load(requirementId);
            
            // Filter by threshold if provided
            if (threshold !== undefined) {
              return similarities.filter((sim: any) => sim.similarity >= threshold);
            }
            
            return similarities;
          } catch (error) {
            logger.error('Failed to find similar requirements', error);
            throw error;
          }
        },

        // Requirement dependencies - Using specialized DataLoader
        requirementDependencies: async (_: any, { requirementId }: { requirementId: string }, context: any) => {
          try {
            const specialized = context.dataLoaderFactory.createSpecializedLoaders();
            const dependencyIds = await specialized.requirementDependencies.load(requirementId);
            
            if (dependencyIds.length === 0) return [];
            
            // Load full requirement data for dependencies
            return await context.dataLoaders.requirements.loadMany(dependencyIds);
          } catch (error) {
            logger.error('Failed to get requirement dependencies', error);
            throw error;
          }
        },

        // Requirement conflicts - Using specialized DataLoader  
        requirementConflicts: async (_: any, { requirementId }: { requirementId: string }, context: any) => {
          try {
            const specialized = context.dataLoaderFactory.createSpecializedLoaders();
            const conflictIds = await specialized.requirementConflicts.load(requirementId);
            
            if (conflictIds.length === 0) return [];
            
            // Load full requirement data for conflicts
            return await context.dataLoaders.requirements.loadMany(conflictIds);
          } catch (error) {
            logger.error('Failed to get requirement conflicts', error);
            throw error;
          }
        },

        // Enhanced requirement analysis with batched loading
        analyzeRequirementImpact: async (_: any, { requirementId }: { requirementId: string }, context: any) => {
          try {
            // Load requirement and related data in parallel
            const [requirement, architectureDecisions, dependencies, conflicts] = await Promise.all([
              context.dataLoaders.requirements.load(requirementId),
              context.dataLoaders.architectureDecisionsByRequirement.load(requirementId),
              this.getRequirementDependencies(requirementId, context),
              this.getRequirementConflicts(requirementId, context)
            ]);

            if (!requirement) {
              throw new Error(`Requirement ${requirementId} not found`);
            }

            return {
              requirement,
              architectureDecisions: architectureDecisions || [],
              dependencies: dependencies || [],
              conflicts: conflicts || [],
              impactScore: this.calculateImpactScore(requirement, architectureDecisions, dependencies, conflicts),
              recommendations: await this.generateImpactRecommendations(requirement, architectureDecisions)
            };

          } catch (error) {
            logger.error('Failed to analyze requirement impact', error);
            throw error;
          }
        },

        // Batch requirement validation
        validateRequirements: async (_: any, { requirementIds }: { requirementIds: string[] }, context: any) => {
          try {
            // Load all requirements in batch
            const requirements = await context.dataLoaders.requirements.loadMany(requirementIds);
            
            // Filter out errors and null values
            const validRequirements = requirements.filter((req: any) => req && !(req instanceof Error));
            
            // Batch load related data
            const [allDependencies, allConflicts] = await Promise.all([
              Promise.all(validRequirements.map((req: any) => 
                this.getRequirementDependencies(req.id, context)
              )),
              Promise.all(validRequirements.map((req: any) => 
                this.getRequirementConflicts(req.id, context)
              ))
            ]);

            // Generate validation results
            return validRequirements.map((requirement: any, index: number) => ({
              requirement,
              isValid: this.validateRequirement(requirement, allDependencies[index], allConflicts[index]),
              validationErrors: this.getValidationErrors(requirement, allDependencies[index], allConflicts[index]),
              dependencies: allDependencies[index],
              conflicts: allConflicts[index]
            }));

          } catch (error) {
            logger.error('Failed to validate requirements', error);
            throw error;
          }
        },
      },

      Mutation: {
        // Create requirement with optimized cache management
        createRequirement: async (_: any, { input }: any, context: any) => {
          try {
            const requirement = await this.requirementsService.createRequirement(input);
            
            // Prime the cache with the new requirement
            context.dataLoaders.requirements.prime(requirement.id, requirement);
            
            // Invalidate project-based cache if project is specified
            if (input.projectId) {
              context.dataLoaders.requirementsByProject.clear(input.projectId);
            }

            return requirement;
          } catch (error) {
            logger.error('Failed to create requirement', error);
            throw error;
          }
        },

        // Update requirement with cache invalidation
        updateRequirement: async (_: any, { id, input }: any, context: any) => {
          try {
            const requirement = await this.requirementsService.updateRequirement(id, input);
            
            // Update cache with new data
            context.dataLoaders.requirements.prime(id, requirement);
            
            // Invalidate related caches
            if (requirement.projectId) {
              context.dataLoaders.requirementsByProject.clear(requirement.projectId);
            }

            // Clear dependency and conflict caches for this requirement
            const specialized = context.dataLoaderFactory.createSpecializedLoaders();
            specialized.requirementDependencies.clear(id);
            specialized.requirementConflicts.clear(id);
            specialized.similarRequirements.clear(id);

            return requirement;
          } catch (error) {
            logger.error('Failed to update requirement', error);
            throw error;
          }
        },

        // Delete requirement with comprehensive cache cleanup
        deleteRequirement: async (_: any, { id }: { id: string }, context: any) => {
          try {
            // Get requirement data before deletion for cache cleanup
            const requirement = await context.dataLoaders.requirements.load(id);
            
            const result = await this.requirementsService.deleteRequirement(id);
            
            // Clear all related caches
            context.dataLoaders.requirements.clear(id);
            
            if (requirement?.projectId) {
              context.dataLoaders.requirementsByProject.clear(requirement.projectId);
            }

            // Clear architecture decision mappings
            context.dataLoaders.architectureDecisionsByRequirement.clear(id);

            // Clear specialized caches
            const specialized = context.dataLoaderFactory.createSpecializedLoaders();
            specialized.requirementDependencies.clear(id);
            specialized.requirementConflicts.clear(id);
            specialized.similarRequirements.clear(id);

            return result;
          } catch (error) {
            logger.error('Failed to delete requirement', error);
            throw error;
          }
        },

        // Batch operations
        batchUpdateRequirements: async (_: any, { updates }: { updates: any[] }, context: any) => {
          try {
            const results = await Promise.all(
              updates.map(async (update: any) => {
                const requirement = await this.requirementsService.updateRequirement(update.id, update.input);
                
                // Prime cache with updated data
                context.dataLoaders.requirements.prime(update.id, requirement);
                
                return requirement;
              })
            );

            // Clear project-based caches for all affected projects
            const projectIds = [...new Set(results.map(r => r.projectId).filter(Boolean))];
            projectIds.forEach(projectId => {
              context.dataLoaders.requirementsByProject.clear(projectId);
            });

            return results;
          } catch (error) {
            logger.error('Failed to batch update requirements', error);
            throw error;
          }
        },
      },

      // Optimized Field Resolvers
      Requirement: {
        // Project field - using DataLoader if available
        project: async (parent: any, _: any, context: any) => {
          if (!parent.projectId) return null;
          
          // Use project loader if available in specialized loaders
          try {
            const query = `MATCH (p:Project {id: $projectId}) RETURN p LIMIT 1`;
            const results = await context.services.neo4j.executeQuery(query, { projectId: parent.projectId });
            return results[0]?.p?.properties || null;
          } catch (error) {
            logger.error('Failed to load project for requirement', error);
            return null;
          }
        },

        // Dependencies - using specialized DataLoader
        dependencies: async (parent: any, _: any, context: any) => {
          return await this.getRequirementDependencies(parent.id, context);
        },

        // Conflicts - using specialized DataLoader
        conflicts: async (parent: any, _: any, context: any) => {
          return await this.getRequirementConflicts(parent.id, context);
        },

        // Architecture decisions - using dedicated DataLoader
        architectureDecisions: async (parent: any, _: any, context: any) => {
          return await context.dataLoaders.architectureDecisionsByRequirement.load(parent.id);
        },

        // Similar requirements - using specialized DataLoader
        similarRequirements: async (parent: any, _: any, context: any) => {
          const specialized = context.dataLoaderFactory.createSpecializedLoaders();
          const similarities = await specialized.similarRequirements.load(parent.id);
          
          // Load full requirement data for similar requirements
          const similarIds = similarities.map((sim: any) => sim.requirementId);
          if (similarIds.length === 0) return [];
          
          const requirements = await context.dataLoaders.requirements.loadMany(similarIds);
          
          return requirements.filter(Boolean).map((req: any, index: number) => ({
            requirement: req,
            similarity: similarities[index]?.similarity || 0
          }));
        },

        // Tags - batch load if needed
        tags: async (parent: any, _: any, context: any) => {
          const query = `
            MATCH (r:Requirement {id: $id})-[:HAS_TAG]->(t:Tag)
            RETURN collect(t) as tags
          `;
          
          const results = await context.services.neo4j.executeQuery(query, { id: parent.id });
          return results[0]?.tags?.map((tag: any) => tag.properties) || [];
        },

        // Assignee - using user DataLoader
        assignee: async (parent: any, _: any, context: any) => {
          if (!parent.assigneeId) return null;
          return await context.dataLoaders.users.load(parent.assigneeId);
        },
      },
    };
  }

  // Helper methods
  private async getRequirementDependencies(requirementId: string, context: any) {
    const specialized = context.dataLoaderFactory.createSpecializedLoaders();
    const dependencyIds = await specialized.requirementDependencies.load(requirementId);
    
    if (dependencyIds.length === 0) return [];
    
    const dependencies = await context.dataLoaders.requirements.loadMany(dependencyIds);
    return dependencies.filter(Boolean);
  }

  private async getRequirementConflicts(requirementId: string, context: any) {
    const specialized = context.dataLoaderFactory.createSpecializedLoaders();
    const conflictIds = await specialized.requirementConflicts.load(requirementId);
    
    if (conflictIds.length === 0) return [];
    
    const conflicts = await context.dataLoaders.requirements.loadMany(conflictIds);
    return conflicts.filter(Boolean);
  }

  private calculateImpactScore(requirement: any, architectureDecisions: any[], dependencies: any[], conflicts: any[]): number {
    let score = 1; // Base score
    
    // Add points for architecture decisions
    score += architectureDecisions.length * 0.5;
    
    // Add points for dependencies (both ways)
    score += dependencies.length * 0.3;
    
    // Add points for conflicts (higher impact)
    score += conflicts.length * 0.8;
    
    // Factor in priority
    const priorityMultipliers = { high: 1.5, medium: 1.2, low: 1.0 };
    score *= priorityMultipliers[requirement.priority as keyof typeof priorityMultipliers] || 1.0;
    
    return Math.round(score * 100) / 100;
  }

  private async generateImpactRecommendations(requirement: any, architectureDecisions: any[]) {
    const recommendations = [];
    
    if (architectureDecisions.length === 0) {
      recommendations.push('Consider creating architecture decisions for this requirement');
    }
    
    if (requirement.status === 'draft' && architectureDecisions.length > 0) {
      recommendations.push('Requirement has architecture decisions but is still in draft status');
    }
    
    return recommendations;
  }

  private validateRequirement(requirement: any, dependencies: any[], conflicts: any[]): boolean {
    // Basic validation rules
    if (!requirement.title || requirement.title.trim().length === 0) return false;
    if (!requirement.description || requirement.description.trim().length < 10) return false;
    
    // Check for circular dependencies
    if (this.hasCircularDependencies(requirement, dependencies)) return false;
    
    // Check for active conflicts
    if (conflicts.some((conflict: any) => conflict.status === 'active')) return false;
    
    return true;
  }

  private getValidationErrors(requirement: any, dependencies: any[], conflicts: any[]): string[] {
    const errors = [];
    
    if (!requirement.title || requirement.title.trim().length === 0) {
      errors.push('Title is required');
    }
    
    if (!requirement.description || requirement.description.trim().length < 10) {
      errors.push('Description must be at least 10 characters');
    }
    
    if (this.hasCircularDependencies(requirement, dependencies)) {
      errors.push('Circular dependencies detected');
    }
    
    const activeConflicts = conflicts.filter((conflict: any) => conflict.status === 'active');
    if (activeConflicts.length > 0) {
      errors.push(`Has ${activeConflicts.length} active conflicts`);
    }
    
    return errors;
  }

  private hasCircularDependencies(requirement: any, dependencies: any[]): boolean {
    // Simple circular dependency check - in practice, you'd want a more sophisticated algorithm
    return dependencies.some((dep: any) => dep.id === requirement.id);
  }
}

export const optimizedRequirementsResolvers = new OptimizedRequirementsResolvers(null).getResolvers();