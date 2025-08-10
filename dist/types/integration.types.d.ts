import { RequirementType } from '../modules/requirements/types/requirement.types';
import { ArchitecturePattern, TechnologyStack, ArchitectureDecisionStatus } from '../modules/architecture/types/architecture.types';
/**
 * Integration types for connecting Requirements and Architecture modules
 */
export interface RequirementArchitectureMapping {
    id: string;
    requirementId: string;
    architectureDecisionId?: string;
    architecturePatternId?: string;
    technologyStackId?: string;
    mappingType: RequirementMappingType;
    confidence: number;
    rationale: string;
    implementationGuidance?: string;
    tradeOffs?: ArchitecturalTradeOff[];
    createdAt: string;
    updatedAt?: string;
    validatedAt?: string;
    validatedBy?: string;
}
export declare enum RequirementMappingType {
    DIRECT = "DIRECT",
    DERIVED = "DERIVED",
    INFLUENCED = "INFLUENCED",
    CONSTRAINT = "CONSTRAINT",
    QUALITY_ATTRIBUTE = "QUALITY_ATTRIBUTE"
}
export interface ArchitecturalTradeOff {
    aspect: string;
    benefit: string;
    cost: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    mitigationStrategy?: string;
}
export interface RequirementArchitectureRecommendation {
    requirementId: string;
    recommendedPatterns: PatternRecommendation[];
    recommendedTechnologies: TechnologyRecommendation[];
    architecturalConstraints: ArchitecturalConstraint[];
    qualityAttributes: QualityAttributeMapping[];
    implementationStrategy: ImplementationStrategy;
    confidence: number;
    reasoning: string[];
    alternativeApproaches?: AlternativeApproach[];
}
export interface PatternRecommendation {
    patternId: string;
    pattern: ArchitecturePattern;
    applicabilityScore: number;
    benefits: string[];
    risks: string[];
    implementationComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
    prerequisites: string[];
}
export interface TechnologyRecommendation {
    technologyStackId: string;
    technologyStack: TechnologyStack;
    suitabilityScore: number;
    alignmentReason: string;
    implementationEffort: number;
    learningCurveImpact: 'MINIMAL' | 'MODERATE' | 'SIGNIFICANT';
    riskFactors: string[];
}
export interface ArchitecturalConstraint {
    type: ConstraintType;
    description: string;
    impact: 'LOW' | 'MEDIUM' | 'HIGH';
    mandatory: boolean;
    validationCriteria?: string[];
}
export declare enum ConstraintType {
    PERFORMANCE = "PERFORMANCE",
    SECURITY = "SECURITY",
    SCALABILITY = "SCALABILITY",
    COMPLIANCE = "COMPLIANCE",
    INTEGRATION = "INTEGRATION",
    OPERATIONAL = "OPERATIONAL",
    BUDGET = "BUDGET"
}
export interface QualityAttributeMapping {
    requirementId: string;
    qualityAttribute: string;
    targetValue?: string;
    measurementCriteria: string;
    architecturalImplication: string;
    verificationMethod: string;
}
export interface ImplementationStrategy {
    approach: 'BIG_BANG' | 'INCREMENTAL' | 'PARALLEL' | 'PHASED';
    phases?: ImplementationPhase[];
    dependencies: string[];
    riskMitigations: string[];
    estimatedEffort: number;
    timeline: string;
}
export interface ImplementationPhase {
    name: string;
    description: string;
    requirementIds: string[];
    architectureComponents: string[];
    dependencies: string[];
    deliverables: string[];
    estimatedDuration: number;
}
export interface AlternativeApproach {
    name: string;
    description: string;
    patterns: string[];
    technologies: string[];
    pros: string[];
    cons: string[];
    suitabilityConditions: string[];
}
export interface ArchitectureRequirementAlignment {
    requirementId: string;
    architectureDecisionId: string;
    alignmentScore: number;
    alignmentType: AlignmentType;
    gaps: string[];
    recommendations: string[];
    validationStatus: ValidationStatus;
    lastAssessed: string;
}
export declare enum AlignmentType {
    FULLY_ALIGNED = "FULLY_ALIGNED",
    PARTIALLY_ALIGNED = "PARTIALLY_ALIGNED",
    MISALIGNED = "MISALIGNED",
    NOT_APPLICABLE = "NOT_APPLICABLE"
}
export declare enum ValidationStatus {
    PENDING = "PENDING",
    VALIDATED = "VALIDATED",
    NEEDS_REVIEW = "NEEDS_REVIEW",
    REJECTED = "REJECTED"
}
export interface CrossModuleQuery {
    type: 'REQUIREMENTS_TO_ARCHITECTURE' | 'ARCHITECTURE_TO_REQUIREMENTS';
    filters: CrossModuleFilters;
    includes?: CrossModuleIncludes;
}
export interface CrossModuleFilters {
    projectId?: string;
    requirementTypes?: RequirementType[];
    architectureDecisionStatus?: ArchitectureDecisionStatus[];
    dateRange?: {
        start: string;
        end: string;
    };
    confidenceThreshold?: number;
    alignmentScore?: {
        min: number;
        max: number;
    };
}
export interface CrossModuleIncludes {
    requirements?: boolean;
    architectureDecisions?: boolean;
    patterns?: boolean;
    technologyStacks?: boolean;
    mappings?: boolean;
    recommendations?: boolean;
    validations?: boolean;
}
export interface IntegrationMetrics {
    totalRequirements: number;
    mappedRequirements: number;
    unmappedRequirements: number;
    averageConfidence: number;
    alignmentDistribution: Record<AlignmentType, number>;
    validationCoverage: number;
    recommendationAccuracy: number;
    implementationProgress: number;
}
export interface RequirementImpactAnalysis {
    requirementId: string;
    impactedArchitectureDecisions: string[];
    impactedPatterns: string[];
    impactedTechnologies: string[];
    cascadingChanges: CascadingChange[];
    riskAssessment: RiskAssessment;
    changeComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
    estimatedEffort: number;
}
export interface CascadingChange {
    targetType: 'REQUIREMENT' | 'ARCHITECTURE_DECISION' | 'PATTERN' | 'TECHNOLOGY';
    targetId: string;
    changeType: 'UPDATE' | 'DEPRECATE' | 'CREATE' | 'VALIDATE';
    reason: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
export interface RiskAssessment {
    overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    riskFactors: RiskFactor[];
    mitigationStrategies: string[];
    contingencyPlan?: string;
}
export interface RiskFactor {
    category: 'TECHNICAL' | 'BUSINESS' | 'OPERATIONAL' | 'COMPLIANCE';
    description: string;
    probability: number;
    impact: number;
    score: number;
}
export interface RequirementChangeEvent {
    type: 'REQUIREMENT_CREATED' | 'REQUIREMENT_UPDATED' | 'REQUIREMENT_STATUS_CHANGED';
    requirementId: string;
    changes: Record<string, any>;
    timestamp: string;
    userId?: string;
}
export interface ArchitectureChangeEvent {
    type: 'ARCHITECTURE_DECISION_CREATED' | 'ARCHITECTURE_DECISION_UPDATED' | 'PATTERN_APPLIED';
    architectureId: string;
    changes: Record<string, any>;
    timestamp: string;
    userId?: string;
}
export interface IntegrationHealthCheck {
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    lastChecked: string;
    issues: HealthIssue[];
    metrics: IntegrationMetrics;
    recommendations: string[];
}
export interface HealthIssue {
    type: 'ORPHANED_REQUIREMENT' | 'BROKEN_MAPPING' | 'STALE_RECOMMENDATION' | 'VALIDATION_FAILURE';
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    affectedItems: string[];
    suggestedActions: string[];
}
//# sourceMappingURL=integration.types.d.ts.map