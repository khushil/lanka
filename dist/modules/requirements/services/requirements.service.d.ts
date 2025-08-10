import { Neo4jService } from '../../../core/database/neo4j';
import { Requirement, RequirementType, RequirementStatus } from '../types/requirement.types';
export declare class RequirementsService {
    private neo4j;
    private nlpService;
    private similarityService;
    constructor(neo4j: Neo4jService);
    createRequirement(input: {
        description: string;
        title?: string;
        type?: RequirementType;
        projectId: string;
        stakeholderId: string;
    }): Promise<Requirement>;
    findSimilarRequirements(requirementId: string): Promise<any[]>;
    detectConflicts(requirementId: string): Promise<any[]>;
    extractPatterns(projectId: string): Promise<any[]>;
    getRequirementById(id: string): Promise<Requirement | null>;
    updateRequirementStatus(id: string, status: RequirementStatus): Promise<Requirement | null>;
    private linkSimilarRequirements;
    private mapToRequirement;
}
//# sourceMappingURL=requirements.service.d.ts.map