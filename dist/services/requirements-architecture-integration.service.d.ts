import { Neo4jService } from '../core/database/neo4j';
import { RequirementArchitectureMapping, RequirementMappingType, RequirementArchitectureRecommendation, ArchitectureRequirementAlignment, RequirementImpactAnalysis, IntegrationMetrics, RequirementChangeEvent, IntegrationHealthCheck } from '../types/integration.types';
export declare class RequirementsArchitectureIntegrationService {
    private neo4j;
    private requirementsService;
    private decisionService;
    private patternService;
    private technologyStackService;
    constructor(neo4j: Neo4jService);
    /**
     * Create a mapping between a requirement and architecture component
     */
    createMapping(input: {
        requirementId: string;
        architectureDecisionId?: string;
        architecturePatternId?: string;
        technologyStackId?: string;
        mappingType: RequirementMappingType;
        confidence: number;
        rationale: string;
    }): Promise<RequirementArchitectureMapping>;
    /**
     * Generate architecture recommendations based on requirements
     */
    generateRecommendations(requirementId: string): Promise<RequirementArchitectureRecommendation>;
    /**
     * Validate alignment between requirements and architecture decisions
     */
    validateAlignment(requirementId: string, architectureDecisionId: string): Promise<ArchitectureRequirementAlignment>;
    /**
     * Analyze impact of requirement changes on architecture
     */
    analyzeRequirementImpact(requirementId: string): Promise<RequirementImpactAnalysis>;
    /**
     * Get integration metrics for monitoring and reporting
     */
    getIntegrationMetrics(projectId?: string): Promise<IntegrationMetrics>;
    /**
     * Handle requirement change events and trigger architecture updates
     */
    handleRequirementChange(event: RequirementChangeEvent): Promise<void>;
    /**
     * Perform integration health check
     */
    performHealthCheck(): Promise<IntegrationHealthCheck>;
    private getRelatedRequirements;
    private findSuitablePatterns;
    private findSuitableTechnologies;
    private extractArchitecturalConstraints;
    private mapQualityAttributes;
    private generateImplementationStrategy;
    private calculateRecommendationConfidence;
    private generateRecommendationReasoning;
    private storeRecommendation;
    private assessAlignment;
    private identifyCascadingChanges;
    private assessChangeRisk;
    private calculateChangeComplexity;
    private estimateChangeEffort;
    private calculateRecommendationAccuracy;
    private calculateImplementationProgress;
    private updateAffectedMappings;
    private revalidateAffectedAlignments;
    private isSignificantChange;
    private generateHealthRecommendations;
    private mapToRequirement;
}
//# sourceMappingURL=requirements-architecture-integration.service.d.ts.map