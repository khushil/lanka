export declare const requirementsResolvers: {
    Query: {
        requirement: (_: any, { id }: {
            id: string;
        }, context: any) => Promise<any>;
        requirements: (_: any, args: {
            projectId?: string;
            type?: string;
            status?: string;
            limit?: number;
            offset?: number;
        }, context: any) => Promise<any>;
        findSimilarRequirements: (_: any, { requirementId, threshold }: {
            requirementId: string;
            threshold?: number;
        }, context: any) => Promise<any>;
        detectConflicts: (_: any, { requirementId }: {
            requirementId: string;
        }, context: any) => Promise<any>;
        extractPatterns: (_: any, { projectId }: {
            projectId: string;
        }, context: any) => Promise<any>;
        analyzeRequirement: (_: any, { description }: {
            description: string;
        }, context: any) => Promise<{
            requirement: {
                id: string;
                title: string;
                description: string;
                type: import("../types/requirement.types").RequirementType;
                status: string;
                priority: import("../types/requirement.types").RequirementPriority;
                createdAt: string;
            };
            completenessScore: number;
            qualityScore: number;
            suggestions: string[];
            similarRequirements: never[];
            recommendedExperts: never[];
        }>;
    };
    Mutation: {
        createRequirement: (_: any, { input }: {
            input: any;
        }, context: any) => Promise<any>;
        updateRequirement: (_: any, { id, input }: {
            id: string;
            input: any;
        }, context: any) => Promise<any>;
        approveRequirement: (_: any, { id }: {
            id: string;
        }, context: any) => Promise<any>;
        linkRequirements: (_: any, { requirement1Id, requirement2Id, relationship, }: {
            requirement1Id: string;
            requirement2Id: string;
            relationship: string;
        }, context: any) => Promise<boolean>;
        resolveConflict: (_: any, { conflictId, resolution }: {
            conflictId: string;
            resolution: string;
        }, context: any) => Promise<any>;
    };
    Requirement: {
        similarRequirements: (parent: any, _: any, context: any) => Promise<any>;
        conflicts: (parent: any, _: any, context: any) => Promise<any>;
    };
};
//# sourceMappingURL=requirements.resolvers.d.ts.map