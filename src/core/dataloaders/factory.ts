import { DataLoaderContext, DataLoaders, LoaderOptions } from './types';
import { DataLoaderPerformanceMetrics, globalMetrics } from './performance-metrics';
import { logger } from '../logging/logger';

// Import all loader implementations
import { 
  RequirementDataLoader, 
  RequirementsByProjectDataLoader, 
  RequirementsByFiltersDataLoader 
} from './requirement-loader';

import { 
  ArchitectureDecisionDataLoader,
  ArchitecturePatternDataLoader,
  TechnologyStackDataLoader,
  ArchitectureDecisionsByRequirementDataLoader
} from './architecture-loader';

import { 
  UserDataLoader,
  UsersByRoleDataLoader,
  UsersByTeamDataLoader
} from './user-loader';

import { 
  RelationshipDataLoader,
  RelationshipsByTypeDataLoader,
  RequirementDependenciesDataLoader,
  RequirementConflictsDataLoader,
  SimilarRequirementsDataLoader
} from './relationship-loader';

/**
 * Factory class for creating and managing DataLoader instances
 * Provides centralized creation, configuration, and lifecycle management
 */
export class DataLoaderFactory {
  private context: DataLoaderContext;
  private defaultOptions: LoaderOptions;
  private metrics: DataLoaderPerformanceMetrics;

  constructor(context: DataLoaderContext, defaultOptions: LoaderOptions = {}) {
    this.context = {
      ...context,
      metrics: context.metrics || globalMetrics
    };
    
    this.defaultOptions = {
      cache: {
        enabled: true,
        ttl: 300000, // 5 minutes default
        maxSize: 1000,
        ...defaultOptions.cache
      },
      maxBatchSize: 100,
      ...defaultOptions
    };

    this.metrics = context.metrics || globalMetrics;
    
    logger.info('DataLoader factory initialized', {
      hasMetrics: !!context.metrics,
      defaultCacheEnabled: this.defaultOptions.cache?.enabled,
      defaultTTL: this.defaultOptions.cache?.ttl,
      defaultMaxBatchSize: this.defaultOptions.maxBatchSize
    });
  }

  /**
   * Create a complete set of DataLoaders for a GraphQL request
   */
  createDataLoaders(customOptions: Partial<LoaderOptions> = {}): DataLoaders {
    const options = this.mergeOptions(customOptions);
    
    try {
      // Create all entity loaders
      const requirements = new RequirementDataLoader(this.context, options).getLoader();
      const architectureDecisions = new ArchitectureDecisionDataLoader(this.context, options).getLoader();
      const architecturePatterns = new ArchitecturePatternDataLoader(this.context, options).getLoader();
      const technologyStacks = new TechnologyStackDataLoader(this.context, options).getLoader();
      const users = new UserDataLoader(this.context, options).getLoader();

      // Create relationship loaders
      const relationships = new RelationshipDataLoader(this.context, options).getLoader();
      const requirementsByProject = new RequirementsByProjectDataLoader(this.context, options).getLoader();
      const architectureDecisionsByRequirement = new ArchitectureDecisionsByRequirementDataLoader(this.context, options).getLoader();
      
      // Create a proxy for requirements by architecture (reverse lookup)
      const requirementsByArchitecture = new RequirementsByArchitectureDataLoader(
        this.context, 
        options, 
        requirements, 
        architectureDecisions
      ).getLoader();

      const dataLoaders: DataLoaders = {
        // Entity loaders
        requirements,
        architectureDecisions,
        architecturePatterns,
        technologyStacks,
        users,
        
        // Relationship loaders
        relationships,
        requirementsByProject,
        architectureDecisionsByRequirement,
        requirementsByArchitecture,
        
        // Cache management methods
        clearAll: () => {
          this.clearAllLoaders([
            requirements, architectureDecisions, architecturePatterns,
            technologyStacks, users, relationships, requirementsByProject,
            architectureDecisionsByRequirement, requirementsByArchitecture
          ]);
        },
        
        clearByPattern: (pattern: string) => {
          this.clearByPatternInternal(pattern, {
            requirements, architectureDecisions, architecturePatterns,
            technologyStacks, users, relationships, requirementsByProject,
            architectureDecisionsByRequirement, requirementsByArchitecture
          });
        },
        
        prime: <K, V>(loader: any, key: K, value: V) => {
          loader.prime(key, value);
        }
      };

      logger.debug('DataLoaders created successfully', {
        loaderCount: 9,
        cacheEnabled: options.cache?.enabled,
        maxBatchSize: options.maxBatchSize
      });

      return dataLoaders;
      
    } catch (error) {
      logger.error('Failed to create DataLoaders', error);
      throw new Error(`DataLoader factory failed: ${error.message}`);
    }
  }

  /**
   * Create specialized loaders for specific use cases
   */
  createSpecializedLoaders(customOptions: Partial<LoaderOptions> = {}) {
    const options = this.mergeOptions(customOptions);

    return {
      // User-related loaders
      usersByRole: new UsersByRoleDataLoader(this.context, options).getLoader(),
      usersByTeam: new UsersByTeamDataLoader(this.context, options).getLoader(),
      
      // Requirement-related loaders
      requirementsByFilters: new RequirementsByFiltersDataLoader(this.context, options).getLoader(),
      requirementDependencies: new RequirementDependenciesDataLoader(this.context, options).getLoader(),
      requirementConflicts: new RequirementConflictsDataLoader(this.context, options).getLoader(),
      similarRequirements: new SimilarRequirementsDataLoader(this.context, options).getLoader(),
      
      // Relationship loaders
      relationshipsByType: new RelationshipsByTypeDataLoader(this.context, options).getLoader(),
    };
  }

  /**
   * Create performance-optimized loaders for high-volume scenarios
   */
  createHighVolumeLoaders(customOptions: Partial<LoaderOptions> = {}): DataLoaders {
    const highVolumeOptions = this.mergeOptions({
      ...customOptions,
      maxBatchSize: 200, // Larger batch sizes
      cache: {
        enabled: true,
        ttl: 600000, // 10 minutes cache
        maxSize: 5000, // Larger cache
        ...customOptions.cache
      }
    });

    return this.createDataLoaders(highVolumeOptions);
  }

  /**
   * Create memory-efficient loaders for resource-constrained environments
   */
  createLightweightLoaders(customOptions: Partial<LoaderOptions> = {}): DataLoaders {
    const lightweightOptions = this.mergeOptions({
      ...customOptions,
      maxBatchSize: 50, // Smaller batch sizes
      cache: {
        enabled: true,
        ttl: 180000, // 3 minutes cache
        maxSize: 200, // Smaller cache
        ...customOptions.cache
      }
    });

    return this.createDataLoaders(lightweightOptions);
  }

  /**
   * Get performance metrics for all loaders
   */
  getPerformanceMetrics() {
    return this.metrics.getMetrics();
  }

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport() {
    return this.metrics.getPerformanceReport();
  }

  /**
   * Reset all performance metrics
   */
  resetMetrics() {
    this.metrics.reset();
  }

  /**
   * Start periodic performance reporting
   */
  startPerformanceReporting(intervalMs: number = 300000) {
    this.metrics.startPeriodicReporting(intervalMs);
  }

  /**
   * Merge default options with custom options
   */
  private mergeOptions(customOptions: Partial<LoaderOptions>): LoaderOptions {
    return {
      ...this.defaultOptions,
      ...customOptions,
      cache: {
        ...this.defaultOptions.cache,
        ...customOptions.cache
      }
    };
  }

  /**
   * Clear all caches for provided loaders
   */
  private clearAllLoaders(loaders: any[]) {
    loaders.forEach(loader => {
      if (loader && typeof loader.clearAll === 'function') {
        loader.clearAll();
      }
    });
    
    logger.debug('Cleared all DataLoader caches', {
      loaderCount: loaders.length
    });
  }

  /**
   * Clear caches by pattern
   */
  private clearByPatternInternal(pattern: string, loaders: Record<string, any>) {
    const regex = new RegExp(pattern);
    let clearedCount = 0;

    Object.entries(loaders).forEach(([name, loader]) => {
      if (regex.test(name)) {
        loader.clearAll();
        clearedCount++;
      }
    });

    logger.debug('Cleared DataLoader caches by pattern', {
      pattern,
      clearedCount,
      totalLoaders: Object.keys(loaders).length
    });
  }
}

/**
 * Helper class for reverse lookup from architecture decisions to requirements
 */
class RequirementsByArchitectureDataLoader {
  private context: DataLoaderContext;
  private requirementsLoader: any;
  private architectureDecisionsLoader: any;

  constructor(
    context: DataLoaderContext, 
    options: LoaderOptions,
    requirementsLoader: any,
    architectureDecisionsLoader: any
  ) {
    this.context = context;
    this.requirementsLoader = requirementsLoader;
    this.architectureDecisionsLoader = architectureDecisionsLoader;
  }

  getLoader() {
    return {
      load: async (architectureDecisionId: string) => {
        return this.loadRequirementsByArchitecture(architectureDecisionId);
      },
      loadMany: async (architectureDecisionIds: string[]) => {
        return Promise.all(
          architectureDecisionIds.map(id => this.loadRequirementsByArchitecture(id))
        );
      },
      clear: () => {}, // No-op as this uses other loaders
      clearAll: () => {}, // No-op as this uses other loaders
      prime: () => {} // No-op as this uses other loaders
    };
  }

  private async loadRequirementsByArchitecture(architectureDecisionId: string) {
    try {
      const query = `
        MATCH (a:ArchitectureDecision {id: $architectureDecisionId})
        MATCH (m:RequirementArchitectureMapping)-[:MAPS_TO_DECISION]->(a)
        RETURN collect(m.requirementId) as requirementIds
      `;

      const results = await this.context.neo4j.executeQuery(query, { architectureDecisionId });
      const requirementIds = results[0]?.requirementIds || [];

      if (requirementIds.length === 0) {
        return [];
      }

      // Use the requirements loader to batch load the actual requirement data
      return await this.requirementsLoader.loadMany(requirementIds);

    } catch (error) {
      logger.error('Failed to load requirements by architecture', {
        architectureDecisionId,
        error: error.message
      });
      return [];
    }
  }
}

/**
 * Create a global DataLoader factory instance
 */
export function createDataLoaderFactory(
  neo4j: any, 
  options: LoaderOptions = {}
): DataLoaderFactory {
  const context: DataLoaderContext = {
    neo4j,
    logger,
    metrics: globalMetrics
  };

  return new DataLoaderFactory(context, options);
}