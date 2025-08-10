import { Neo4jService } from '../../../core/database/neo4j';
import { Requirement } from '../types/requirement.types';
export interface SimilarRequirement {
    id: string;
    title: string;
    description: string;
    similarity: number;
    projectName: string;
    successMetrics?: {
        implementationTime?: number;
        defectRate?: number;
        stakeholderSatisfaction?: number;
    };
    adaptationGuidelines?: string[];
}
export declare class SimilarityService {
    private neo4j;
    constructor(neo4j: Neo4jService);
    findSimilarRequirements(requirement: Requirement, threshold?: number): Promise<SimilarRequirement[]>;
    calculateCrossProjectSimilarity(requirementId: string): Promise<Map<string, number>>;
    findExpertiseForRequirement(requirement: Requirement): Promise<any[]>;
    private mapToSimilarRequirement;
    private generateAdaptationGuidelines;
}
//# sourceMappingURL=similarity.service.d.ts.map