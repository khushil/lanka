import { Neo4jService } from '../../../core/database/neo4j';
import { ArchitecturePattern, ArchitecturePatternType, PatternComponent, QualityAttribute } from '../types/architecture.types';
export declare class ArchitecturePatternService {
    private neo4j;
    constructor(neo4j: Neo4jService);
    createPattern(input: {
        name: string;
        type: ArchitecturePatternType;
        description: string;
        applicabilityConditions: string[];
        components: PatternComponent[];
        qualityAttributes: QualityAttribute[];
        knownUses?: string[];
    }): Promise<ArchitecturePattern>;
    findPatternsByType(type: ArchitecturePatternType): Promise<ArchitecturePattern[]>;
    recommendPatternsForRequirements(requirementIds: string[]): Promise<{
        pattern: ArchitecturePattern;
        score: number;
    }[]>;
    extractPatternsFromSuccessfulProjects(minSuccessRate?: number): Promise<ArchitecturePattern[]>;
    updatePatternSuccess(patternId: string, projectId: string, success: boolean, metrics?: any): Promise<void>;
    findSimilarPatterns(patternId: string, threshold?: number): Promise<ArchitecturePattern[]>;
    getPatternMetrics(): Promise<any>;
    private identifyNewPatterns;
    getPatternById(id: string): Promise<ArchitecturePattern | null>;
    getPatterns(filters: {
        type?: ArchitecturePatternType;
        applicabilityConditions?: string[];
        limit?: number;
        offset?: number;
    }): Promise<ArchitecturePattern[]>;
    updatePattern(id: string, input: {
        name?: string;
        type?: ArchitecturePatternType;
        description?: string;
        applicabilityConditions?: string[];
        components?: PatternComponent[];
        qualityAttributes?: QualityAttribute[];
        knownUses?: string[];
    }): Promise<ArchitecturePattern | null>;
    recommendPatterns(requirementIds: string[], constraints: string[]): Promise<any[]>;
    private mapToPattern;
}
//# sourceMappingURL=pattern.service.d.ts.map