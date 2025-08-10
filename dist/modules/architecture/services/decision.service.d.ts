import { Neo4jService } from '../../../core/database/neo4j';
import { ArchitectureDecision, ArchitectureDecisionStatus, Alternative, TradeOff } from '../types/architecture.types';
export declare class ArchitectureDecisionService {
    private neo4j;
    constructor(neo4j: Neo4jService);
    createDecision(input: {
        title: string;
        description: string;
        rationale: string;
        alternatives?: Alternative[];
        consequences?: string[];
        tradeOffs?: TradeOff[];
        projectId: string;
        requirementIds: string[];
    }): Promise<ArchitectureDecision>;
    updateDecisionStatus(id: string, status: ArchitectureDecisionStatus): Promise<ArchitectureDecision | null>;
    linkToPattern(decisionId: string, patternId: string, adaptations?: string[]): Promise<void>;
    findDecisionsByProject(projectId: string): Promise<ArchitectureDecision[]>;
    findSimilarDecisions(decisionId: string, threshold?: number): Promise<any[]>;
    getDecisionMetrics(decisionId: string): Promise<any>;
    private suggestPatterns;
    getDecisionById(id: string): Promise<ArchitectureDecision | null>;
    getDecisions(filters: {
        projectId?: string;
        status?: ArchitectureDecisionStatus;
        requirementId?: string;
        limit?: number;
        offset?: number;
    }): Promise<ArchitectureDecision[]>;
    updateDecision(id: string, input: {
        title?: string;
        description?: string;
        rationale?: string;
        status?: ArchitectureDecisionStatus;
        alternatives?: Alternative[];
        consequences?: string[];
        tradeOffs?: TradeOff[];
    }): Promise<ArchitectureDecision | null>;
    approveDecision(id: string): Promise<ArchitectureDecision | null>;
    deprecateDecision(id: string, reason: string, replacementId?: string): Promise<ArchitectureDecision | null>;
    private mapToArchitectureDecision;
}
//# sourceMappingURL=decision.service.d.ts.map