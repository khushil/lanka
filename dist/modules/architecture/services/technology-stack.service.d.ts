import { Neo4jService } from '../../../core/database/neo4j';
import { TechnologyStack, TechnologyLayer, Technology, CompatibilityMatrix, PerformanceMetrics, CostEstimate } from '../types/architecture.types';
/**
 * Refactored TechnologyStackService - Core orchestration logic only
 * Analysis, recommendation, and cost calculation logic extracted to separate services
 * Now maintains single responsibility principle with < 300 lines
 */
export declare class TechnologyStackService {
    private neo4j;
    private analysisService;
    private recommendationService;
    private costCalculationService;
    constructor(neo4j: Neo4jService);
    createTechnologyStack(input: {
        name: string;
        description: string;
        layers: TechnologyLayer[];
        compatibility?: CompatibilityMatrix;
        performanceMetrics?: PerformanceMetrics;
        costEstimate?: CostEstimate;
    }): Promise<TechnologyStack>;
    recommendTechnologyStack(requirementIds: string[], constraints?: {
        budget?: number;
        teamSkills?: string[];
        preferredVendors?: string[];
        excludeTechnologies?: string[];
    }): Promise<{
        stack: TechnologyStack;
        score: number;
        rationale: string;
    }[]>;
    evaluateStackCompatibility(stackId: string, existingTechnologies: string[]): Promise<{
        compatible: boolean;
        issues: string[];
        recommendations: string[];
    }>;
    predictPerformance(stackId: string, workloadCharacteristics: {
        requestsPerSecond?: number;
        dataVolumeGB?: number;
        concurrentUsers?: number;
        complexity?: 'LOW' | 'MEDIUM' | 'HIGH';
    }): Promise<PerformanceMetrics>;
    calculateTCO(stackId: string, duration?: number, // months
    scaling?: {
        growthRate: number;
        peakFactor: number;
    }): Promise<{
        total: number;
        breakdown: {
            licensing: number;
            infrastructure: number;
            personnel: number;
            training: number;
            maintenance: number;
            opportunity: number;
        };
        monthlyAverage: number;
        recommendations: string[];
    }>;
    trackStackSuccess(stackId: string, projectId: string, metrics: {
        implementationTime: number;
        defectRate: number;
        performanceAchieved: PerformanceMetrics;
        teamSatisfaction: number;
        actualCost: CostEstimate;
    }): Promise<void>;
    findAlternativeTechnologies(technology: string, criteria?: {
        maxCost?: number;
        minMaturity?: string;
        requiredFeatures?: string[];
    }): Promise<Technology[]>;
    getTechnologyStacks(filters: {
        teamExpertise?: number;
        performanceRequirements?: string;
        limit?: number;
        offset?: number;
    }): Promise<TechnologyStack[]>;
    updateTechnologyStack(id: string, input: {
        name?: string;
        description?: string;
        layers?: TechnologyLayer[];
        compatibility?: CompatibilityMatrix;
        performanceMetrics?: PerformanceMetrics;
        costEstimate?: CostEstimate;
        teamExpertise?: number;
    }): Promise<TechnologyStack | null>;
    recommendTechnologies(requirementIds: string[], patternIds: string[], constraints: string[]): Promise<any[]>;
    getTechnologyStackById(stackId: string): Promise<TechnologyStack | null>;
    private mapToTechnologyStack;
}
//# sourceMappingURL=technology-stack.service.d.ts.map