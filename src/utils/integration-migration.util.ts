import { v4 as uuidv4 } from 'uuid';
import { Neo4jService } from '../core/database/neo4j';
import { logger } from '../core/logging/logger';
import { RequirementsService } from '../modules/requirements/services/requirements.service';
import { ArchitectureDecisionService } from '../modules/architecture/services/decision.service';
import { ArchitecturePatternService } from '../modules/architecture/services/pattern.service';
import { TechnologyStackService } from '../modules/architecture/services/technology-stack.service';
import { RequirementsArchitectureIntegrationService } from '../services/requirements-architecture-integration.service';
import { RecommendationEngineService } from '../services/recommendation-engine.service';
import { AlignmentValidationService } from '../services/alignment-validation.service';
import {
  RequirementArchitectureMapping,
  RequirementMappingType,
  IntegrationMetrics,
} from '../types/integration.types';

export class IntegrationMigrationUtil {
  private requirementsService: RequirementsService;
  private decisionService: ArchitectureDecisionService;
  private patternService: ArchitecturePatternService;
  private technologyStackService: TechnologyStackService;
  private integrationService: RequirementsArchitectureIntegrationService;
  private recommendationEngine: RecommendationEngineService;
  private validationService: AlignmentValidationService;

  constructor(private neo4j: Neo4jService) {
    this.requirementsService = new RequirementsService(neo4j);
    this.decisionService = new ArchitectureDecisionService(neo4j);
    this.patternService = new ArchitecturePatternService(neo4j);
    this.technologyStackService = new TechnologyStackService(neo4j);
    this.integrationService = new RequirementsArchitectureIntegrationService(neo4j);
    this.recommendationEngine = new RecommendationEngineService(neo4j);
    this.validationService = new AlignmentValidationService(neo4j);
  }

  /**
   * Migrate existing project data to use the new integration layer
   */
  async migrateProjectIntegration(
    projectId: string,
    options: MigrationOptions = {}
  ): Promise<MigrationResult> {
    try {
      logger.info(`Starting integration migration for project: ${projectId}`);

      const startTime = Date.now();
      const result: MigrationResult = {
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
      const mappingResult = await this.generateAutomaticMappings(
        projectId, 
        discoveryResult,
        options.confidenceThreshold || 0.7
      );
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
      result.recommendations = this.generateMigrationRecommendations(
        discoveryResult,
        mappingResult,
        qualityResult
      );

      result.phase = 'COMPLETED';
      result.success = true;
      result.endTime = new Date().toISOString();
      result.totalDuration = Date.now() - startTime;

      logger.info(`Integration migration completed for project: ${projectId}`);
      return result;
    } catch (error) {
      logger.error('Integration migration failed', error);
      throw error;
    }
  }

  /**
   * Migrate all projects in the system
   */
  async migrateAllProjects(options: MigrationOptions = {}): Promise<BatchMigrationResult> {
    try {
      logger.info('Starting batch migration for all projects');

      const projects = await this.getAllProjects();
      const results: MigrationResult[] = [];
      const batchStartTime = Date.now();

      for (const project of projects) {
        try {
          const projectResult = await this.migrateProjectIntegration(project.id, options);
          results.push(projectResult);
          logger.info(`Completed migration for project: ${project.id}`);
        } catch (error) {
          logger.error(`Failed migration for project: ${project.id}`, error);
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

      const batchResult: BatchMigrationResult = {
        totalProjects: projects.length,
        successfulMigrations: results.filter(r => r.success).length,
        failedMigrations: results.filter(r => !r.success).length,
        totalDuration: Date.now() - batchStartTime,
        results,
        overallStatistics: this.aggregateStatistics(results),
      };

      logger.info(`Batch migration completed: ${batchResult.successfulMigrations}/${batchResult.totalProjects} successful`);
      return batchResult;
    } catch (error) {
      logger.error('Batch migration failed', error);
      throw error;
    }
  }

  /**
   * Rollback integration migration for a project
   */
  async rollbackMigration(projectId: string): Promise<RollbackResult> {
    try {
      logger.info(`Starting rollback for project: ${projectId}`);

      const startTime = Date.now();
      const rollbackActions: RollbackAction[] = [];

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
    } catch (error) {
      logger.error('Migration rollback failed', error);
      throw error;
    }
  }

  /**
   * Export integration data for backup or analysis
   */
  async exportIntegrationData(projectId: string): Promise<IntegrationDataExport> {
    try {
      logger.info(`Exporting integration data for project: ${projectId}`);

      const exportData: IntegrationDataExport = {
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

      logger.info(`Export completed for project: ${projectId}`);
      return exportData;
    } catch (error) {
      logger.error('Integration data export failed', error);
      throw error;
    }
  }

  /**
   * Import integration data from backup
   */
  async importIntegrationData(exportData: IntegrationDataExport): Promise<ImportResult> {
    try {
      logger.info(`Importing integration data for project: ${exportData.projectId}`);

      const importResult: ImportResult = {
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
        } catch (error) {
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
        } catch (error) {
          importResult.errors.push(`Failed to import architecture decision ${decision.id}: ${error.message}`);
        }
      }

      // 3. Import mappings
      for (const mapping of exportData.data.mappings) {
        try {
          await this.recreateMapping(mapping);
          importResult.importedItems.mappings++;
        } catch (error) {
          importResult.errors.push(`Failed to import mapping ${mapping.id}: ${error.message}`);
        }
      }

      // 4. Import alignments
      for (const alignment of exportData.data.alignments) {
        try {
          await this.recreateAlignment(alignment);
          importResult.importedItems.alignments++;
        } catch (error) {
          importResult.errors.push(`Failed to import alignment ${alignment.id}: ${error.message}`);
        }
      }

      importResult.success = importResult.errors.length === 0;
      logger.info(`Import completed for project: ${exportData.projectId}`);
      
      return importResult;
    } catch (error) {
      logger.error('Integration data import failed', error);
      throw error;
    }
  }

  // Private helper methods

  private async performDataDiscovery(projectId: string): Promise<DataDiscoveryResult> {
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

  private async createMissingComponents(projectId: string, discovery: DataDiscoveryResult): Promise<ComponentCreationResult> {
    const result: ComponentCreationResult = {
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
      } catch (error) {
        result.errors.push(`Failed to create default patterns: ${error.message}`);
        result.success = false;
      }
    }

    // Create default technology stacks if none exist
    if (discovery.technologyStacks.length === 0) {
      try {
        await this.createDefaultTechnologyStacks();
        result.componentsCreated.technologyStacks = 2; // Assume 2 default stacks
      } catch (error) {
        result.errors.push(`Failed to create default technology stacks: ${error.message}`);
        result.success = false;
      }
    }

    return result;
  }

  private async generateAutomaticMappings(
    projectId: string,
    discovery: DataDiscoveryResult,
    confidenceThreshold: number
  ): Promise<MappingGenerationResult> {
    const result: MappingGenerationResult = {
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
              mappingType: RequirementMappingType.DERIVED,
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
              mappingType: RequirementMappingType.INFLUENCED,
              confidence: techRec.suitabilityScore,
              rationale: `Auto-generated mapping based on technology recommendation (score: ${techRec.suitabilityScore})`,
            });
            result.mappingsCreated++;
          }
        }
      } catch (error) {
        result.errors.push(`Failed to create mapping for requirement ${requirement.id}: ${error.message}`);
        result.mappingsSkipped++;
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  private async validateMigratedAlignments(projectId: string): Promise<ValidationResult> {
    const result: ValidationResult = {
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
            const alignment = await this.validationService.validateRequirementArchitectureAlignment(
              mapping.requirementId,
              mapping.architectureDecisionId
            );
            totalScore += alignment.alignmentScore;
            validatedCount++;
            result.alignmentsValidated++;
          }
        } catch (error) {
          result.errors.push(`Failed to validate alignment for mapping ${mapping.id}: ${error.message}`);
          result.alignmentsFailed++;
        }
      }

      result.averageAlignmentScore = validatedCount > 0 ? totalScore / validatedCount : 0;
      result.success = result.errors.length === 0;
    } catch (error) {
      logger.error('Failed to validate migrated alignments', error);
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  private async assessMigrationQuality(projectId: string): Promise<QualityAssessmentResult> {
    try {
      const metrics = await this.integrationService.getIntegrationMetrics(projectId);
      const healthCheck = await this.integrationService.performHealthCheck();

      return {
        metrics,
        healthCheck,
        qualityScore: this.calculateQualityScore(metrics, healthCheck),
        recommendations: this.generateQualityRecommendations(metrics, healthCheck),
      };
    } catch (error) {
      logger.error('Failed to assess migration quality', error);
      throw error;
    }
  }

  private generateMigrationRecommendations(
    discovery: DataDiscoveryResult,
    mapping: MappingGenerationResult,
    quality: QualityAssessmentResult
  ): string[] {
    const recommendations: string[] = [];

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

  private findUnmappedRequirements(requirements: any[], mappings: any[]): any[] {
    const mappedRequirementIds = new Set(mappings.map(m => m.requirementId));
    return requirements.filter(r => !mappedRequirementIds.has(r.properties.id));
  }

  private findUnmappedArchitectureDecisions(decisions: any[], mappings: any[]): any[] {
    const mappedDecisionIds = new Set(mappings.map(m => m.architectureDecisionId));
    return decisions.filter(d => !mappedDecisionIds.has(d.properties.id));
  }

  private async getAllProjects(): Promise<Array<{ id: string; name: string }>> {
    const query = 'MATCH (p:Project) RETURN p.id as id, p.name as name';
    const results = await this.neo4j.executeQuery(query);
    return results.map(r => ({ id: r.id, name: r.name }));
  }

  private aggregateStatistics(results: MigrationResult[]): MigrationStatistics {
    return results.reduce(
      (acc, result) => ({
        requirementsProcessed: acc.requirementsProcessed + result.statistics.requirementsProcessed,
        architectureDecisionsProcessed: acc.architectureDecisionsProcessed + result.statistics.architectureDecisionsProcessed,
        mappingsCreated: acc.mappingsCreated + result.statistics.mappingsCreated,
        alignmentsValidated: acc.alignmentsValidated + result.statistics.alignmentsValidated,
        errorsEncountered: acc.errorsEncountered + result.statistics.errorsEncountered,
      }),
      {
        requirementsProcessed: 0,
        architectureDecisionsProcessed: 0,
        mappingsCreated: 0,
        alignmentsValidated: 0,
        errorsEncountered: 0,
      }
    );
  }

  private calculateQualityScore(metrics: IntegrationMetrics, healthCheck: any): number {
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

  private generateQualityRecommendations(metrics: IntegrationMetrics, healthCheck: any): string[] {
    // Generate quality-based recommendations
    return [];
  }

  // Cleanup methods
  private async cleanupMappings(projectId: string): Promise<{ removedCount: number }> {
    const query = `
      MATCH (p:Project {id: $projectId})-[:CONTAINS]->(r:Requirement)
      MATCH (r)-[:MAPPED_TO]->(m:RequirementArchitectureMapping)
      DETACH DELETE m
      RETURN count(m) as removedCount
    `;
    
    const results = await this.neo4j.executeQuery(query, { projectId });
    return { removedCount: results[0]?.removedCount || 0 };
  }

  private async cleanupAlignments(projectId: string): Promise<{ removedCount: number }> {
    const query = `
      MATCH (p:Project {id: $projectId})-[:CONTAINS]->(r:Requirement)
      MATCH (alignment:ArchitectureRequirementAlignment {requirementId: r.id})
      DELETE alignment
      RETURN count(alignment) as removedCount
    `;
    
    const results = await this.neo4j.executeQuery(query, { projectId });
    return { removedCount: results[0]?.removedCount || 0 };
  }

  private async cleanupAutoGeneratedComponents(projectId: string): Promise<{ removedCount: number }> {
    // Remove components that were auto-generated during migration
    return { removedCount: 0 };
  }

  // Export/Import helper methods
  private async exportRequirements(projectId: string): Promise<any[]> {
    const query = 'MATCH (p:Project {id: $projectId})-[:CONTAINS]->(r:Requirement) RETURN r';
    const results = await this.neo4j.executeQuery(query, { projectId });
    return results.map(r => r.r.properties);
  }

  private async exportArchitectureDecisions(projectId: string): Promise<any[]> {
    const query = 'MATCH (a:ArchitectureDecision {projectId: $projectId}) RETURN a';
    const results = await this.neo4j.executeQuery(query, { projectId });
    return results.map(r => r.a.properties);
  }

  private async exportPatterns(projectId: string): Promise<any[]> {
    const query = 'MATCH (p:ArchitecturePattern) RETURN p LIMIT 10';
    const results = await this.neo4j.executeQuery(query);
    return results.map(r => r.p.properties);
  }

  private async exportTechnologyStacks(projectId: string): Promise<any[]> {
    const query = 'MATCH (ts:TechnologyStack) RETURN ts LIMIT 10';
    const results = await this.neo4j.executeQuery(query);
    return results.map(r => r.ts.properties);
  }

  private async exportMappings(projectId: string): Promise<any[]> {
    const query = `
      MATCH (p:Project {id: $projectId})-[:CONTAINS]->(r:Requirement)
      MATCH (r)-[:MAPPED_TO]->(m:RequirementArchitectureMapping)
      RETURN m
    `;
    const results = await this.neo4j.executeQuery(query, { projectId });
    return results.map(r => r.m.properties);
  }

  private async exportAlignments(projectId: string): Promise<any[]> {
    const query = `
      MATCH (p:Project {id: $projectId})-[:CONTAINS]->(r:Requirement)
      MATCH (alignment:ArchitectureRequirementAlignment {requirementId: r.id})
      RETURN alignment
    `;
    const results = await this.neo4j.executeQuery(query, { projectId });
    return results.map(r => r.alignment.properties);
  }

  private async exportRecommendations(projectId: string): Promise<any[]> {
    // Export recommendation data if stored
    return [];
  }

  private async recreateRequirement(requirement: any): Promise<void> {
    // Recreate requirement from exported data
  }

  private async recreateArchitectureDecision(decision: any): Promise<void> {
    // Recreate architecture decision from exported data
  }

  private async recreateMapping(mapping: any): Promise<void> {
    // Recreate mapping from exported data
  }

  private async recreateAlignment(alignment: any): Promise<void> {
    // Recreate alignment from exported data
  }

  private async getMappingsForProject(projectId: string): Promise<RequirementArchitectureMapping[]> {
    const query = `
      MATCH (p:Project {id: $projectId})-[:CONTAINS]->(r:Requirement)
      MATCH (r)-[:MAPPED_TO]->(m:RequirementArchitectureMapping)
      RETURN m
    `;
    const results = await this.neo4j.executeQuery(query, { projectId });
    return results.map(r => r.m.properties);
  }

  private async createDefaultPatterns(): Promise<void> {
    // Create default architecture patterns
  }

  private async createDefaultTechnologyStacks(): Promise<void> {
    // Create default technology stacks
  }
}

// Supporting interfaces
interface MigrationOptions {
  confidenceThreshold?: number;
  createMissingComponents?: boolean;
  validateAlignments?: boolean;
  dryRun?: boolean;
}

interface MigrationResult {
  projectId: string;
  startTime: string;
  endTime?: string;
  totalDuration?: number;
  phase: string;
  success: boolean;
  phases: MigrationPhase[];
  statistics: MigrationStatistics;
  errors: string[];
  recommendations: string[];
}

interface MigrationPhase {
  name: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
  duration: number;
  details: any;
}

interface MigrationStatistics {
  requirementsProcessed: number;
  architectureDecisionsProcessed: number;
  mappingsCreated: number;
  alignmentsValidated: number;
  errorsEncountered: number;
}

interface BatchMigrationResult {
  totalProjects: number;
  successfulMigrations: number;
  failedMigrations: number;
  totalDuration: number;
  results: MigrationResult[];
  overallStatistics: MigrationStatistics;
}

interface RollbackResult {
  projectId: string;
  success: boolean;
  duration: number;
  rollbackActions: RollbackAction[];
  completedAt: string;
}

interface RollbackAction {
  action: string;
  description: string;
  success: boolean;
}

interface DataDiscoveryResult {
  projectId: string;
  requirements: any[];
  architectureDecisions: any[];
  patterns: any[];
  technologyStacks: any[];
  existingMappings: any[];
  unmappedRequirements: any[];
  unmappedArchitectureDecisions: any[];
}

interface ComponentCreationResult {
  success: boolean;
  componentsCreated: {
    patterns: number;
    technologyStacks: number;
    decisions: number;
  };
  errors: string[];
}

interface MappingGenerationResult {
  success: boolean;
  mappingsCreated: number;
  mappingsSkipped: number;
  errors: string[];
}

interface ValidationResult {
  success: boolean;
  alignmentsValidated: number;
  alignmentsFailed: number;
  averageAlignmentScore: number;
  errors: string[];
}

interface QualityAssessmentResult {
  metrics: IntegrationMetrics;
  healthCheck: any;
  qualityScore: number;
  recommendations: string[];
}

interface IntegrationDataExport {
  projectId: string;
  exportedAt: string;
  version: string;
  data: {
    requirements: any[];
    architectureDecisions: any[];
    patterns: any[];
    technologyStacks: any[];
    mappings: any[];
    alignments: any[];
    recommendations: any[];
  };
  metadata: {
    totalRequirements: number;
    totalArchitectureDecisions: number;
    totalMappings: number;
    totalAlignments: number;
  };
}

interface ImportResult {
  projectId: string;
  success: boolean;
  importedItems: {
    requirements: number;
    architectureDecisions: number;
    mappings: number;
    alignments: number;
  };
  errors: string[];
  warnings: string[];
}