import { RequirementType, RequirementPriority } from '../types/requirement.types';
export interface RequirementAnalysis {
    type: RequirementType;
    priority: RequirementPriority;
    suggestedTitle: string;
    entities: string[];
    keywords: string[];
    embedding: number[];
    completenessScore: number;
    qualityScore: number;
    suggestions: string[];
}
export declare class NLPService {
    analyzeRequirement(text: string): Promise<RequirementAnalysis>;
    private classifyRequirementType;
    private determinePriority;
    private generateTitle;
    private extractEntities;
    private extractKeywords;
    private generateEmbedding;
    private assessQuality;
}
//# sourceMappingURL=nlp.service.d.ts.map