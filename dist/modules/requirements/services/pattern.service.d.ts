import { Neo4jService } from '../../../core/database/neo4j';
import { RequirementType, RequirementPattern } from '../types/requirement.types';
export interface PatternExtractionResult {
    pattern: RequirementPattern;
    frequency: number;
    projects: string[];
    averageSuccessRate: number;
}
export interface PatternApplication {
    patternId: string;
    requirementId: string;
    adaptations: string[];
    success?: boolean;
    feedback?: string;
}
export declare class PatternService {
    private neo4j;
    constructor(neo4j: Neo4jService);
    extractPatterns(projectId?: string, minFrequency?: number): Promise<PatternExtractionResult[]>;
    createPattern(input: Omit<RequirementPattern, 'id' | 'createdAt' | 'successMetrics'>): Promise<RequirementPattern>;
    applyPattern(patternId: string, requirementId: string, adaptations?: string[]): Promise<PatternApplication>;
    getPatternsByType(type: RequirementType): Promise<RequirementPattern[]>;
    updatePatternSuccess(patternId: string, requirementId: string, success: boolean, feedback?: string): Promise<void>;
    findSimilarPatterns(patternId: string, threshold?: number): Promise<RequirementPattern[]>;
    getPatternMetrics(): Promise<any>;
    private createPatternFromRequirements;
    private extractCommonWords;
    private analyzeStructure;
    private generateTemplate;
    private generateConditions;
    private mapToPattern;
}
//# sourceMappingURL=pattern.service.d.ts.map