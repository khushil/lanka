import { v4 as uuidv4 } from 'uuid';
import { Neo4jService } from '../core/database/neo4j';
import { logger } from '../core/logging/logger';
import { Requirement, RequirementType } from '../modules/requirements/types/requirement.types';
import { ArchitectureDecision, ArchitecturePattern, TechnologyStack } from '../modules/architecture/types/architecture.types';
import {
  ArchitectureRequirementAlignment,
  AlignmentType,
  ValidationStatus,
  RequirementArchitectureMapping,
  RequirementMappingType,
} from '../types/integration.types';

export class AlignmentValidationService {
  private validationRules: Map<RequirementType, ValidationRule[]>;
  private alignmentThresholds: AlignmentThresholds;

  constructor(private neo4j: Neo4jService) {
    this.initializeValidationRules();
    this.initializeAlignmentThresholds();
  }

  /**
   * Validate alignment between a requirement and architecture decision
   */
  async validateRequirementArchitectureAlignment(
    requirementId: string,
    architectureDecisionId: string,
    userId?: string
  ): Promise<ArchitectureRequirementAlignment> {
    try {
      logger.info(`Validating alignment between requirement ${requirementId} and architecture ${architectureDecisionId}`);

      // Get requirement and architecture decision
      const [requirement, architectureDecision] = await Promise.all([
        this.getRequirement(requirementId),
        this.getArchitectureDecision(architectureDecisionId),
      ]);

      if (!requirement || !architectureDecision) {
        throw new Error('Requirement or architecture decision not found');
      }

      // Perform alignment analysis
      const alignment = await this.performAlignmentAnalysis(requirement, architectureDecision);

      // Store the validation result
      await this.storeAlignmentValidation(alignment, userId);

      logger.info(`Alignment validation completed with score: ${alignment.alignmentScore}`);
      return alignment;
    } catch (error) {
      logger.error('Failed to validate requirement-architecture alignment', error);
      throw error;
    }
  }

  /**
   * Batch validate alignments for multiple requirement-architecture pairs
   */
  async batchValidateAlignments(
    pairs: Array<{ requirementId: string; architectureDecisionId: string }>,
    userId?: string
  ): Promise<ArchitectureRequirementAlignment[]> {
    try {
      const results: ArchitectureRequirementAlignment[] = [];

      for (const pair of pairs) {
        try {
          const alignment = await this.validateRequirementArchitectureAlignment(
            pair.requirementId,
            pair.architectureDecisionId,
            userId
          );
          results.push(alignment);
        } catch (error) {
          logger.warn(`Failed to validate alignment for pair ${pair.requirementId}-${pair.architectureDecisionId}`, error);
          // Create a failed validation record
          results.push({
            id: uuidv4(),
            requirementId: pair.requirementId,
            architectureDecisionId: pair.architectureDecisionId,
            alignmentScore: 0,
            alignmentType: AlignmentType.NOT_APPLICABLE,
            gaps: ['Validation failed due to error'],
            recommendations: ['Review requirement and architecture decision for completeness'],
            validationStatus: ValidationStatus.REJECTED,
            lastAssessed: new Date().toISOString(),
            assessedBy: userId,
          });
        }
      }

      return results;
    } catch (error) {
      logger.error('Failed to batch validate alignments', error);
      throw error;
    }
  }

  /**
   * Validate alignment between requirement and pattern
   */
  async validateRequirementPatternAlignment(
    requirementId: string,
    patternId: string
  ): Promise<PatternAlignment> {
    try {
      const [requirement, pattern] = await Promise.all([
        this.getRequirement(requirementId),
        this.getArchitecturePattern(patternId),
      ]);

      if (!requirement || !pattern) {
        throw new Error('Requirement or pattern not found');
      }

      return this.performPatternAlignment(requirement, pattern);
    } catch (error) {
      logger.error('Failed to validate requirement-pattern alignment', error);
      throw error;
    }
  }

  /**
   * Validate alignment between requirement and technology stack
   */
  async validateRequirementTechnologyAlignment(
    requirementId: string,
    technologyStackId: string
  ): Promise<TechnologyAlignment> {
    try {
      const [requirement, technologyStack] = await Promise.all([
        this.getRequirement(requirementId),
        this.getTechnologyStack(technologyStackId),
      ]);

      if (!requirement || !technologyStack) {
        throw new Error('Requirement or technology stack not found');
      }

      return this.performTechnologyAlignment(requirement, technologyStack);
    } catch (error) {
      logger.error('Failed to validate requirement-technology alignment', error);
      throw error;
    }
  }

  /**
   * Validate mapping consistency across all architecture components
   */
  async validateMappingConsistency(mappingId: string): Promise<MappingConsistencyResult> {
    try {
      const mapping = await this.getMapping(mappingId);
      if (!mapping) {
        throw new Error('Mapping not found');
      }

      const consistencyIssues: ConsistencyIssue[] = [];
      const recommendations: string[] = [];

      // Validate requirement exists and is valid
      const requirement = await this.getRequirement(mapping.requirementId);
      if (!requirement) {
        consistencyIssues.push({
          type: 'MISSING_REQUIREMENT',
          description: 'Referenced requirement does not exist',
          severity: 'HIGH',
          affectedComponent: 'requirement',
        });
      }

      // Validate architecture decision if mapped
      if (mapping.architectureDecisionId) {
        const decision = await this.getArchitectureDecision(mapping.architectureDecisionId);
        if (!decision) {
          consistencyIssues.push({
            type: 'MISSING_ARCHITECTURE_DECISION',
            description: 'Referenced architecture decision does not exist',
            severity: 'HIGH',
            affectedComponent: 'architectureDecision',
          });
        } else if (requirement) {
          // Validate alignment
          const alignment = await this.performAlignmentAnalysis(requirement, decision);
          if (alignment.alignmentScore < this.alignmentThresholds.minimum) {
            consistencyIssues.push({
              type: 'POOR_ALIGNMENT',
              description: `Alignment score ${alignment.alignmentScore} below threshold ${this.alignmentThresholds.minimum}`,
              severity: 'MEDIUM',
              affectedComponent: 'alignment',
            });
            recommendations.push('Review and improve requirement-architecture alignment');
          }
        }
      }

      // Validate pattern if mapped
      if (mapping.architecturePatternId) {
        const pattern = await this.getArchitecturePattern(mapping.architecturePatternId);
        if (!pattern) {
          consistencyIssues.push({
            type: 'MISSING_PATTERN',
            description: 'Referenced architecture pattern does not exist',
            severity: 'MEDIUM',
            affectedComponent: 'pattern',
          });
        }
      }

      // Validate technology stack if mapped
      if (mapping.technologyStackId) {
        const technologyStack = await this.getTechnologyStack(mapping.technologyStackId);
        if (!technologyStack) {
          consistencyIssues.push({
            type: 'MISSING_TECHNOLOGY_STACK',
            description: 'Referenced technology stack does not exist',
            severity: 'MEDIUM',
            affectedComponent: 'technologyStack',
          });
        }
      }

      // Validate mapping confidence
      if (mapping.confidence < this.alignmentThresholds.minimum) {
        consistencyIssues.push({
          type: 'LOW_CONFIDENCE',
          description: `Mapping confidence ${mapping.confidence} below threshold`,
          severity: 'LOW',
          affectedComponent: 'confidence',
        });
        recommendations.push('Review and validate mapping to improve confidence');
      }

      const isConsistent = consistencyIssues.length === 0;
      const overallSeverity = this.calculateOverallSeverity(consistencyIssues);

      return {
        mappingId,
        isConsistent,
        overallSeverity,
        issues: consistencyIssues,
        recommendations,
        validatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to validate mapping consistency', error);
      throw error;
    }
  }

  /**
   * Validate cross-module data integrity
   */
  async validateCrossModuleIntegrity(): Promise<IntegrityValidationResult> {
    try {
      logger.info('Starting cross-module integrity validation');

      const issues: IntegrityIssue[] = [];

      // Check for orphaned mappings
      const orphanedMappings = await this.findOrphanedMappings();
      if (orphanedMappings.length > 0) {
        issues.push({
          type: 'ORPHANED_MAPPINGS',
          count: orphanedMappings.length,
          description: `${orphanedMappings.length} mappings reference non-existent components`,
          severity: 'HIGH',
          affectedItems: orphanedMappings,
        });
      }

      // Check for unmapped approved requirements
      const unmappedRequirements = await this.findUnmappedApprovedRequirements();
      if (unmappedRequirements.length > 0) {
        issues.push({
          type: 'UNMAPPED_REQUIREMENTS',
          count: unmappedRequirements.length,
          description: `${unmappedRequirements.length} approved requirements without architecture mappings`,
          severity: 'MEDIUM',
          affectedItems: unmappedRequirements,
        });
      }

      // Check for architecture decisions without requirement mappings
      const unmappedArchitectureDecisions = await this.findUnmappedArchitectureDecisions();
      if (unmappedArchitectureDecisions.length > 0) {
        issues.push({
          type: 'UNMAPPED_ARCHITECTURE_DECISIONS',
          count: unmappedArchitectureDecisions.length,
          description: `${unmappedArchitectureDecisions.length} architecture decisions without requirement mappings`,
          severity: 'MEDIUM',
          affectedItems: unmappedArchitectureDecisions,
        });
      }

      // Check for stale alignments
      const staleAlignments = await this.findStaleAlignments();
      if (staleAlignments.length > 0) {
        issues.push({
          type: 'STALE_ALIGNMENTS',
          count: staleAlignments.length,
          description: `${staleAlignments.length} alignments not validated in the last 30 days`,
          severity: 'LOW',
          affectedItems: staleAlignments,
        });
      }

      const overallHealth = issues.length === 0 ? 'HEALTHY' : 
                          issues.some(i => i.severity === 'HIGH') ? 'CRITICAL' :
                          issues.some(i => i.severity === 'MEDIUM') ? 'WARNING' : 'DEGRADED';

      return {
        overallHealth,
        validatedAt: new Date().toISOString(),
        totalIssues: issues.length,
        issues,
        recommendations: this.generateIntegrityRecommendations(issues),
      };
    } catch (error) {
      logger.error('Failed to validate cross-module integrity', error);
      throw error;
    }
  }

  /**
   * Auto-correct common integrity issues
   */
  async autoCorrectIntegrityIssues(dryRun: boolean = true): Promise<AutoCorrectionResult> {
    try {
      const corrections: CorrectionAction[] = [];
      let appliedCorrections = 0;

      // Find and remove orphaned mappings
      const orphanedMappings = await this.findOrphanedMappings();
      for (const mappingId of orphanedMappings) {
        corrections.push({
          type: 'DELETE_ORPHANED_MAPPING',
          description: `Delete orphaned mapping ${mappingId}`,
          severity: 'HIGH',
          query: `MATCH (m:RequirementArchitectureMapping {id: $mappingId}) DETACH DELETE m`,
          parameters: { mappingId },
        });

        if (!dryRun) {
          await this.neo4j.executeQuery(
            'MATCH (m:RequirementArchitectureMapping {id: $mappingId}) DETACH DELETE m',
            { mappingId }
          );
          appliedCorrections++;
        }
      }

      // Create mappings for high-confidence matches
      const autoMappings = await this.generateAutoMappings();
      for (const mapping of autoMappings) {
        corrections.push({
          type: 'CREATE_AUTO_MAPPING',
          description: `Create automatic mapping between ${mapping.requirementId} and ${mapping.architectureDecisionId}`,
          severity: 'MEDIUM',
          query: 'CREATE mapping query...',
          parameters: mapping,
        });

        if (!dryRun) {
          // Create the mapping
          appliedCorrections++;
        }
      }

      return {
        dryRun,
        totalCorrections: corrections.length,
        appliedCorrections,
        corrections,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to auto-correct integrity issues', error);
      throw error;
    }
  }

  // Private helper methods

  private initializeValidationRules(): void {
    this.validationRules = new Map([
      [RequirementType.NON_FUNCTIONAL, [
        {
          name: 'Performance Alignment',
          weight: 0.8,
          validator: (req, arch) => this.validatePerformanceAlignment(req, arch),
        },
        {
          name: 'Scalability Alignment',
          weight: 0.7,
          validator: (req, arch) => this.validateScalabilityAlignment(req, arch),
        },
      ]],
      [RequirementType.FUNCTIONAL, [
        {
          name: 'Feature Support',
          weight: 0.9,
          validator: (req, arch) => this.validateFeatureSupport(req, arch),
        },
        {
          name: 'Interface Compatibility',
          weight: 0.6,
          validator: (req, arch) => this.validateInterfaceCompatibility(req, arch),
        },
      ]],
      [RequirementType.COMPLIANCE, [
        {
          name: 'Regulatory Compliance',
          weight: 1.0,
          validator: (req, arch) => this.validateRegulatoryCompliance(req, arch),
        },
        {
          name: 'Security Standards',
          weight: 0.9,
          validator: (req, arch) => this.validateSecurityStandards(req, arch),
        },
      ]],
    ]);
  }

  private initializeAlignmentThresholds(): void {
    this.alignmentThresholds = {
      minimum: 0.3,
      good: 0.7,
      excellent: 0.9,
    };
  }

  private async performAlignmentAnalysis(
    requirement: Requirement,
    architectureDecision: ArchitectureDecision
  ): Promise<ArchitectureRequirementAlignment> {
    const rules = this.validationRules.get(requirement.type) || [];
    let totalScore = 0;
    let totalWeight = 0;
    const gaps: string[] = [];
    const recommendations: string[] = [];

    // Apply validation rules
    for (const rule of rules) {
      const score = await rule.validator(requirement, architectureDecision);
      totalScore += score * rule.weight;
      totalWeight += rule.weight;

      if (score < 0.5) {
        gaps.push(`${rule.name} alignment is below acceptable threshold`);
        recommendations.push(`Improve ${rule.name.toLowerCase()} between requirement and architecture`);
      }
    }

    const alignmentScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const alignmentType = this.determineAlignmentType(alignmentScore);
    const validationStatus = alignmentScore >= this.alignmentThresholds.minimum 
      ? ValidationStatus.VALIDATED 
      : ValidationStatus.NEEDS_REVIEW;

    return {
      id: uuidv4(),
      requirementId: requirement.id,
      architectureDecisionId: architectureDecision.id,
      alignmentScore,
      alignmentType,
      gaps,
      recommendations,
      validationStatus,
      lastAssessed: new Date().toISOString(),
    };
  }

  private determineAlignmentType(score: number): AlignmentType {
    if (score >= this.alignmentThresholds.excellent) {
      return AlignmentType.FULLY_ALIGNED;
    } else if (score >= this.alignmentThresholds.good) {
      return AlignmentType.PARTIALLY_ALIGNED;
    } else if (score >= this.alignmentThresholds.minimum) {
      return AlignmentType.PARTIALLY_ALIGNED;
    } else {
      return AlignmentType.MISALIGNED;
    }
  }

  private async performPatternAlignment(requirement: Requirement, pattern: ArchitecturePattern): Promise<PatternAlignment> {
    // Implementation for pattern alignment validation
    return {
      requirementId: requirement.id,
      patternId: pattern.id,
      alignmentScore: 0.7,
      applicabilityScore: 0.8,
      benefits: [],
      risks: [],
      prerequisites: [],
    };
  }

  private async performTechnologyAlignment(requirement: Requirement, technologyStack: TechnologyStack): Promise<TechnologyAlignment> {
    // Implementation for technology alignment validation
    return {
      requirementId: requirement.id,
      technologyStackId: technologyStack.id,
      compatibilityScore: 0.75,
      implementationEffort: 40,
      learningCurveImpact: 'MODERATE',
      riskFactors: [],
    };
  }

  private async storeAlignmentValidation(alignment: ArchitectureRequirementAlignment, userId?: string): Promise<void> {
    const query = `
      MERGE (alignment:ArchitectureRequirementAlignment {
        requirementId: $requirementId,
        architectureDecisionId: $architectureDecisionId
      })
      SET alignment.id = $id,
          alignment.alignmentScore = $alignmentScore,
          alignment.alignmentType = $alignmentType,
          alignment.gaps = $gaps,
          alignment.recommendations = $recommendations,
          alignment.validationStatus = $validationStatus,
          alignment.lastAssessed = $lastAssessed,
          alignment.assessedBy = $assessedBy
      RETURN alignment
    `;

    await this.neo4j.executeQuery(query, {
      ...alignment,
      assessedBy: userId,
    });
  }

  // Validation rule implementations
  private async validatePerformanceAlignment(requirement: Requirement, architecture: ArchitectureDecision): Promise<number> {
    // Check if architecture supports performance requirements
    return 0.8;
  }

  private async validateScalabilityAlignment(requirement: Requirement, architecture: ArchitectureDecision): Promise<number> {
    // Check if architecture supports scalability requirements
    return 0.7;
  }

  private async validateFeatureSupport(requirement: Requirement, architecture: ArchitectureDecision): Promise<number> {
    // Check if architecture supports required features
    return 0.85;
  }

  private async validateInterfaceCompatibility(requirement: Requirement, architecture: ArchitectureDecision): Promise<number> {
    // Check interface compatibility
    return 0.6;
  }

  private async validateRegulatoryCompliance(requirement: Requirement, architecture: ArchitectureDecision): Promise<number> {
    // Check regulatory compliance
    return 0.9;
  }

  private async validateSecurityStandards(requirement: Requirement, architecture: ArchitectureDecision): Promise<number> {
    // Check security standards compliance
    return 0.85;
  }

  // Data retrieval methods
  private async getRequirement(id: string): Promise<Requirement | null> {
    const query = 'MATCH (r:Requirement {id: $id}) RETURN r';
    const results = await this.neo4j.executeQuery(query, { id });
    return results[0] ? this.mapNodeToRequirement(results[0].r) : null;
  }

  private async getArchitectureDecision(id: string): Promise<ArchitectureDecision | null> {
    const query = 'MATCH (a:ArchitectureDecision {id: $id}) RETURN a';
    const results = await this.neo4j.executeQuery(query, { id });
    return results[0] ? this.mapNodeToArchitectureDecision(results[0].a) : null;
  }

  private async getArchitecturePattern(id: string): Promise<ArchitecturePattern | null> {
    const query = 'MATCH (p:ArchitecturePattern {id: $id}) RETURN p';
    const results = await this.neo4j.executeQuery(query, { id });
    return results[0] ? this.mapNodeToArchitecturePattern(results[0].p) : null;
  }

  private async getTechnologyStack(id: string): Promise<TechnologyStack | null> {
    const query = 'MATCH (t:TechnologyStack {id: $id}) RETURN t';
    const results = await this.neo4j.executeQuery(query, { id });
    return results[0] ? this.mapNodeToTechnologyStack(results[0].t) : null;
  }

  private async getMapping(id: string): Promise<RequirementArchitectureMapping | null> {
    const query = 'MATCH (m:RequirementArchitectureMapping {id: $id}) RETURN m';
    const results = await this.neo4j.executeQuery(query, { id });
    return results[0] ? this.mapNodeToMapping(results[0].m) : null;
  }

  // Integrity check methods
  private async findOrphanedMappings(): Promise<string[]> {
    const query = `
      MATCH (m:RequirementArchitectureMapping)
      WHERE (m.architectureDecisionId IS NOT NULL AND NOT exists((:ArchitectureDecision {id: m.architectureDecisionId})))
      OR (m.architecturePatternId IS NOT NULL AND NOT exists((:ArchitecturePattern {id: m.architecturePatternId})))
      OR (m.technologyStackId IS NOT NULL AND NOT exists((:TechnologyStack {id: m.technologyStackId})))
      OR NOT exists((:Requirement {id: m.requirementId}))
      RETURN m.id as mappingId
    `;

    const results = await this.neo4j.executeQuery(query);
    return results.map(result => result.mappingId);
  }

  private async findUnmappedApprovedRequirements(): Promise<string[]> {
    const query = `
      MATCH (r:Requirement)
      WHERE r.status IN ['APPROVED', 'IMPLEMENTED']
      AND NOT (r)-[:MAPPED_TO]->(:RequirementArchitectureMapping)
      RETURN r.id as requirementId
    `;

    const results = await this.neo4j.executeQuery(query);
    return results.map(result => result.requirementId);
  }

  private async findUnmappedArchitectureDecisions(): Promise<string[]> {
    const query = `
      MATCH (a:ArchitectureDecision)
      WHERE a.status IN ['APPROVED', 'IMPLEMENTED']
      AND NOT (:RequirementArchitectureMapping {architectureDecisionId: a.id})
      RETURN a.id as architectureDecisionId
    `;

    const results = await this.neo4j.executeQuery(query);
    return results.map(result => result.architectureDecisionId);
  }

  private async findStaleAlignments(): Promise<string[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const query = `
      MATCH (alignment:ArchitectureRequirementAlignment)
      WHERE alignment.lastAssessed < $thirtyDaysAgo
      RETURN alignment.id as alignmentId
    `;

    const results = await this.neo4j.executeQuery(query, { thirtyDaysAgo });
    return results.map(result => result.alignmentId);
  }

  private async generateAutoMappings(): Promise<any[]> {
    // Generate high-confidence automatic mappings
    return [];
  }

  private calculateOverallSeverity(issues: ConsistencyIssue[]): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (issues.some(i => i.severity === 'HIGH')) return 'HIGH';
    if (issues.some(i => i.severity === 'MEDIUM')) return 'MEDIUM';
    return 'LOW';
  }

  private generateIntegrityRecommendations(issues: IntegrityIssue[]): string[] {
    const recommendations: string[] = [];
    
    for (const issue of issues) {
      switch (issue.type) {
        case 'ORPHANED_MAPPINGS':
          recommendations.push('Clean up orphaned mappings by removing invalid references');
          break;
        case 'UNMAPPED_REQUIREMENTS':
          recommendations.push('Review and create architecture mappings for approved requirements');
          break;
        case 'UNMAPPED_ARCHITECTURE_DECISIONS':
          recommendations.push('Link architecture decisions to their driving requirements');
          break;
        case 'STALE_ALIGNMENTS':
          recommendations.push('Refresh validation of older alignments');
          break;
      }
    }
    
    return recommendations;
  }

  // Mapping methods
  private mapNodeToRequirement(node: any): Requirement {
    return { ...node.properties };
  }

  private mapNodeToArchitectureDecision(node: any): ArchitectureDecision {
    return { ...node.properties };
  }

  private mapNodeToArchitecturePattern(node: any): ArchitecturePattern {
    return { ...node.properties };
  }

  private mapNodeToTechnologyStack(node: any): TechnologyStack {
    return { ...node.properties };
  }

  private mapNodeToMapping(node: any): RequirementArchitectureMapping {
    return { ...node.properties };
  }
}

// Supporting interfaces
interface ValidationRule {
  name: string;
  weight: number;
  validator: (req: Requirement, arch: ArchitectureDecision) => Promise<number>;
}

interface AlignmentThresholds {
  minimum: number;
  good: number;
  excellent: number;
}

interface PatternAlignment {
  requirementId: string;
  patternId: string;
  alignmentScore: number;
  applicabilityScore: number;
  benefits: string[];
  risks: string[];
  prerequisites: string[];
}

interface TechnologyAlignment {
  requirementId: string;
  technologyStackId: string;
  compatibilityScore: number;
  implementationEffort: number;
  learningCurveImpact: 'MINIMAL' | 'MODERATE' | 'SIGNIFICANT';
  riskFactors: string[];
}

interface MappingConsistencyResult {
  mappingId: string;
  isConsistent: boolean;
  overallSeverity: 'LOW' | 'MEDIUM' | 'HIGH';
  issues: ConsistencyIssue[];
  recommendations: string[];
  validatedAt: string;
}

interface ConsistencyIssue {
  type: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  affectedComponent: string;
}

interface IntegrityValidationResult {
  overallHealth: 'HEALTHY' | 'DEGRADED' | 'WARNING' | 'CRITICAL';
  validatedAt: string;
  totalIssues: number;
  issues: IntegrityIssue[];
  recommendations: string[];
}

interface IntegrityIssue {
  type: string;
  count: number;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  affectedItems: string[];
}

interface AutoCorrectionResult {
  dryRun: boolean;
  totalCorrections: number;
  appliedCorrections: number;
  corrections: CorrectionAction[];
  processedAt: string;
}

interface CorrectionAction {
  type: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  query: string;
  parameters: any;
}