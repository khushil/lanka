import { Neo4jService } from '../core/database/neo4j';
import { ArchitectureRequirementAlignment } from '../types/integration.types';
export declare class AlignmentValidationService {
    private neo4j;
    private validationRules;
    private alignmentThresholds;
    constructor(neo4j: Neo4jService);
    /**
     * Validate alignment between a requirement and architecture decision
     */
    validateRequirementArchitectureAlignment(requirementId: string, architectureDecisionId: string, userId?: string): Promise<ArchitectureRequirementAlignment>;
    /**
     * Batch validate alignments for multiple requirement-architecture pairs
     */
    batchValidateAlignments(pairs: Array<{
        requirementId: string;
        architectureDecisionId: string;
    }>, userId?: string): Promise<ArchitectureRequirementAlignment[]>;
    /**
     * Validate alignment between requirement and pattern
     */
    validateRequirementPatternAlignment(requirementId: string, patternId: string): Promise<PatternAlignment>;
    /**
     * Validate alignment between requirement and technology stack
     */
    validateRequirementTechnologyAlignment(requirementId: string, technologyStackId: string): Promise<TechnologyAlignment>;
    /**
     * Validate mapping consistency across all architecture components
     */
    validateMappingConsistency(mappingId: string): Promise<MappingConsistencyResult>;
    /**
     * Validate cross-module data integrity
     */
    validateCrossModuleIntegrity(): Promise<IntegrityValidationResult>;
    /**
     * Auto-correct common integrity issues
     */
    autoCorrectIntegrityIssues(dryRun?: boolean): Promise<AutoCorrectionResult>;
    private initializeValidationRules;
    private initializeAlignmentThresholds;
    private performAlignmentAnalysis;
    private determineAlignmentType;
    private performPatternAlignment;
    private performTechnologyAlignment;
    private storeAlignmentValidation;
    private validatePerformanceAlignment;
    private validateScalabilityAlignment;
    private validateFeatureSupport;
    private validateInterfaceCompatibility;
    private validateRegulatoryCompliance;
    private validateSecurityStandards;
    private getRequirement;
    private getArchitectureDecision;
    private getArchitecturePattern;
    private getTechnologyStack;
    private getMapping;
    private findOrphanedMappings;
    private findUnmappedApprovedRequirements;
    private findUnmappedArchitectureDecisions;
    private findStaleAlignments;
    private generateAutoMappings;
    private calculateOverallSeverity;
    private generateIntegrityRecommendations;
    private mapNodeToRequirement;
    private mapNodeToArchitectureDecision;
    private mapNodeToArchitecturePattern;
    private mapNodeToTechnologyStack;
    private mapNodeToMapping;
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
export {};
//# sourceMappingURL=alignment-validation.service.d.ts.map