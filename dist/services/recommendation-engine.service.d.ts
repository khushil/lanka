import { Neo4jService } from '../core/database/neo4j';
import { Requirement } from '../modules/requirements/types/requirement.types';
import { PatternRecommendation, TechnologyRecommendation, ArchitecturalConstraint, QualityAttributeMapping, ImplementationStrategy, AlternativeApproach } from '../types/integration.types';
export declare class RecommendationEngineService {
    private neo4j;
    private patternWeights;
    private qualityAttributeMap;
    private constraintExtractors;
    constructor(neo4j: Neo4jService);
    /**
     * Generate comprehensive architecture recommendations based on requirements
     */
    generateRecommendations(requirements: Requirement[], projectContext?: any): Promise<{
        patterns: PatternRecommendation[];
        technologies: TechnologyRecommendation[];
        constraints: ArchitecturalConstraint[];
        qualityAttributes: QualityAttributeMapping[];
        implementationStrategy: ImplementationStrategy;
        alternatives: AlternativeApproach[];
    }>;
    /**
     * Recommend architecture patterns based on requirements
     */
    recommendPatterns(requirements: Requirement[], characteristics?: ArchitecturalCharacteristics): Promise<PatternRecommendation[]>;
    /**
     * Recommend technology stacks based on patterns and requirements
     */
    recommendTechnologies(requirements: Requirement[], patternRecommendations: PatternRecommendation[], characteristics?: ArchitecturalCharacteristics): Promise<TechnologyRecommendation[]>;
    /**
     * Extract architectural constraints from requirements
     */
    extractConstraints(requirements: Requirement[]): ArchitecturalConstraint[];
    /**
     * Map requirements to quality attributes
     */
    mapQualityAttributes(requirements: Requirement[]): QualityAttributeMapping[];
    /**
     * Generate implementation strategy
     */
    generateImplementationStrategy(requirements: Requirement[], patterns: PatternRecommendation[], technologies: TechnologyRecommendation[]): ImplementationStrategy;
    /**
     * Generate alternative approaches
     */
    generateAlternativeApproaches(requirements: Requirement[], primaryPatterns: PatternRecommendation[], primaryTechnologies: TechnologyRecommendation[]): AlternativeApproach[];
    private initializePatternWeights;
    private initializeQualityAttributeMap;
    private initializeConstraintExtractors;
    private extractArchitecturalCharacteristics;
    private getAvailablePatterns;
    private getAvailableTechnologyStacks;
    private calculatePatternScore;
    private calculateRequirementPatternAlignment;
    private calculateTechnologySuitability;
    private calculatePatternBenefits;
    private calculatePatternRisks;
    private extractKeywordBasedConstraints;
    private extractNonFunctionalConstraints;
    private extractComplianceConstraints;
    private extractBusinessRuleConstraints;
    private deduplicateConstraints;
    private identifyQualityAttributes;
    private mapNodeToArchitecturePattern;
    private mapNodeToTechnologyStack;
    private hasScalabilityKeywords;
    private hasSecurityKeywords;
    private extractPerformanceRequirements;
    private assessTeamExpertise;
    private calculateCharacteristicBonus;
    private requirementMatchesQualityAttribute;
    private calculatePatternCompatibility;
    private calculateTechnologyRequirementAlignment;
    private hasScalabilityRequirements;
    private hasCloudNativePattern;
    private hasHighScalabilityRequirements;
    private assessImplementationComplexity;
    private identifyPrerequisites;
    private generateAlignmentReason;
    private estimateImplementationEffort;
    private assessLearningCurveImpact;
    private identifyTechnologyRisks;
    private assessOverallComplexity;
    private identifyDependencies;
    private generatePhases;
    private generateRiskMitigations;
    private estimateOverallEffort;
    private generateTimeline;
    private extractTargetValue;
    private defineMeasurementCriteria;
    private deriveArchitecturalImplication;
    private defineVerificationMethod;
}
interface ArchitecturalCharacteristics {
    scalabilityNeeds: 'LOW' | 'MEDIUM' | 'HIGH';
    performanceRequirements: string[];
    securityRequirements: string[];
    complianceRequirements: string[];
    integrationComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
    dataConsistencyNeeds: 'STRONG' | 'EVENTUAL' | 'WEAK';
    teamExpertise: number;
}
export {};
//# sourceMappingURL=recommendation-engine.service.d.ts.map