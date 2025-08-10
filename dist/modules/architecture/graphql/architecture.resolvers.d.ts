export declare class ArchitectureResolvers {
    private neo4j;
    private integrationService;
    private decisionService;
    private patternService;
    private technologyStackService;
    private architectureService;
    private requirementsService;
    constructor();
    getResolvers(): {
        Query: {
            architectureDecision: (_: any, { id }: {
                id: string;
            }) => Promise<import("../types/architecture.types").ArchitectureDecision | null>;
            architectureDecisions: (_: any, args: any) => Promise<import("../types/architecture.types").ArchitectureDecision[]>;
            architecturePattern: (_: any, { id }: {
                id: string;
            }) => Promise<import("../types/architecture.types").ArchitecturePattern | null>;
            architecturePatterns: (_: any, args: any) => Promise<import("../types/architecture.types").ArchitecturePattern[]>;
            technologyStack: (_: any, { id }: {
                id: string;
            }) => Promise<import("../types/architecture.types").TechnologyStack | null>;
            technologyStacks: (_: any, args: any) => Promise<import("../types/architecture.types").TechnologyStack[]>;
            requirementArchitectureMappings: (_: any, args: any) => Promise<any>;
            generateArchitectureRecommendations: (_: any, { requirementId }: {
                requirementId: string;
            }) => Promise<import("../../../types/integration.types").RequirementArchitectureRecommendation>;
            validateRequirementAlignment: (_: any, { requirementId, architectureDecisionId }: any) => Promise<import("../../../types/integration.types").ArchitectureRequirementAlignment>;
            analyzeRequirementImpact: (_: any, { requirementId }: {
                requirementId: string;
            }) => Promise<import("../../../types/integration.types").RequirementImpactAnalysis>;
            getIntegrationMetrics: (_: any, { projectId }: {
                projectId?: string;
            }) => Promise<import("../../../types/integration.types").IntegrationMetrics>;
            performIntegrationHealthCheck: () => Promise<import("../../../types/integration.types").IntegrationHealthCheck>;
            searchArchitectureByRequirement: (_: any, { requirementId, includePatterns, includeTechnologies }: any) => Promise<any>;
            searchRequirementsByArchitecture: (_: any, { architectureDecisionId, includeRelated }: any) => Promise<any>;
            recommendPatterns: (_: any, { requirementIds, constraints }: any) => Promise<any[]>;
            recommendTechnologies: (_: any, { requirementIds, patternIds, constraints }: any) => Promise<any[]>;
        };
        Mutation: {
            createArchitectureDecision: (_: any, { input }: any) => Promise<import("../types/architecture.types").ArchitectureDecision>;
            updateArchitectureDecision: (_: any, { id, input }: any) => Promise<import("../types/architecture.types").ArchitectureDecision | null>;
            approveArchitectureDecision: (_: any, { id }: {
                id: string;
            }) => Promise<import("../types/architecture.types").ArchitectureDecision | null>;
            deprecateArchitectureDecision: (_: any, { id, reason, replacementId }: any) => Promise<import("../types/architecture.types").ArchitectureDecision | null>;
            createArchitecturePattern: (_: any, { input }: any) => Promise<import("../types/architecture.types").ArchitecturePattern>;
            updateArchitecturePattern: (_: any, { id, input }: any) => Promise<import("../types/architecture.types").ArchitecturePattern | null>;
            createTechnologyStack: (_: any, { input }: any) => Promise<import("../types/architecture.types").TechnologyStack>;
            updateTechnologyStack: (_: any, { id, input }: any) => Promise<import("../types/architecture.types").TechnologyStack | null>;
            createRequirementArchitectureMapping: (_: any, { input }: any) => Promise<import("../../../types/integration.types").RequirementArchitectureMapping>;
            updateMappingConfidence: (_: any, { id, confidence, rationale }: any) => Promise<any>;
            validateMapping: (_: any, { id, validated, validatorId, notes }: any) => Promise<any>;
            batchCreateMappings: (_: any, { mappings }: {
                mappings: any[];
            }) => Promise<import("../../../types/integration.types").RequirementArchitectureMapping[]>;
            batchValidateAlignments: (_: any, { alignments, validatorId }: any) => Promise<any[]>;
            optimizeArchitectureForRequirements: (_: any, { requirementIds, constraints }: any) => Promise<import("../../../types/integration.types").RequirementArchitectureRecommendation>;
            rebalanceArchitectureDecisions: (_: any, { projectId, strategy }: any) => Promise<any>;
            migrateExistingMappings: (_: any, { projectId, dryRun }: any) => Promise<import("../../../types/integration.types").RequirementArchitectureMapping[]>;
            cleanupBrokenMappings: (_: any, { projectId }: {
                projectId?: string;
            }) => Promise<any>;
        };
        ArchitectureDecision: {
            requirements: (parent: any) => Promise<any>;
            patterns: (parent: any) => Promise<any>;
            technologyStack: (parent: any) => Promise<any>;
            mappings: (parent: any) => Promise<any>;
            alignments: (parent: any) => Promise<any>;
        };
        RequirementArchitectureMapping: {
            requirement: (parent: any) => Promise<import("../../requirements/types/requirement.types").Requirement | null>;
            architectureDecision: (parent: any) => Promise<import("../types/architecture.types").ArchitectureDecision | null>;
            architecturePattern: (parent: any) => Promise<import("../types/architecture.types").ArchitecturePattern | null>;
            technologyStack: (parent: any) => Promise<import("../types/architecture.types").TechnologyStack | null>;
        };
    };
    private getMappingsByArchitectureDecision;
    private mapNodeToObject;
}
export declare const architectureResolvers: {
    Query: {
        architectureDecision: (_: any, { id }: {
            id: string;
        }) => Promise<import("../types/architecture.types").ArchitectureDecision | null>;
        architectureDecisions: (_: any, args: any) => Promise<import("../types/architecture.types").ArchitectureDecision[]>;
        architecturePattern: (_: any, { id }: {
            id: string;
        }) => Promise<import("../types/architecture.types").ArchitecturePattern | null>;
        architecturePatterns: (_: any, args: any) => Promise<import("../types/architecture.types").ArchitecturePattern[]>;
        technologyStack: (_: any, { id }: {
            id: string;
        }) => Promise<import("../types/architecture.types").TechnologyStack | null>;
        technologyStacks: (_: any, args: any) => Promise<import("../types/architecture.types").TechnologyStack[]>;
        requirementArchitectureMappings: (_: any, args: any) => Promise<any>;
        generateArchitectureRecommendations: (_: any, { requirementId }: {
            requirementId: string;
        }) => Promise<import("../../../types/integration.types").RequirementArchitectureRecommendation>;
        validateRequirementAlignment: (_: any, { requirementId, architectureDecisionId }: any) => Promise<import("../../../types/integration.types").ArchitectureRequirementAlignment>;
        analyzeRequirementImpact: (_: any, { requirementId }: {
            requirementId: string;
        }) => Promise<import("../../../types/integration.types").RequirementImpactAnalysis>;
        getIntegrationMetrics: (_: any, { projectId }: {
            projectId?: string;
        }) => Promise<import("../../../types/integration.types").IntegrationMetrics>;
        performIntegrationHealthCheck: () => Promise<import("../../../types/integration.types").IntegrationHealthCheck>;
        searchArchitectureByRequirement: (_: any, { requirementId, includePatterns, includeTechnologies }: any) => Promise<any>;
        searchRequirementsByArchitecture: (_: any, { architectureDecisionId, includeRelated }: any) => Promise<any>;
        recommendPatterns: (_: any, { requirementIds, constraints }: any) => Promise<any[]>;
        recommendTechnologies: (_: any, { requirementIds, patternIds, constraints }: any) => Promise<any[]>;
    };
    Mutation: {
        createArchitectureDecision: (_: any, { input }: any) => Promise<import("../types/architecture.types").ArchitectureDecision>;
        updateArchitectureDecision: (_: any, { id, input }: any) => Promise<import("../types/architecture.types").ArchitectureDecision | null>;
        approveArchitectureDecision: (_: any, { id }: {
            id: string;
        }) => Promise<import("../types/architecture.types").ArchitectureDecision | null>;
        deprecateArchitectureDecision: (_: any, { id, reason, replacementId }: any) => Promise<import("../types/architecture.types").ArchitectureDecision | null>;
        createArchitecturePattern: (_: any, { input }: any) => Promise<import("../types/architecture.types").ArchitecturePattern>;
        updateArchitecturePattern: (_: any, { id, input }: any) => Promise<import("../types/architecture.types").ArchitecturePattern | null>;
        createTechnologyStack: (_: any, { input }: any) => Promise<import("../types/architecture.types").TechnologyStack>;
        updateTechnologyStack: (_: any, { id, input }: any) => Promise<import("../types/architecture.types").TechnologyStack | null>;
        createRequirementArchitectureMapping: (_: any, { input }: any) => Promise<import("../../../types/integration.types").RequirementArchitectureMapping>;
        updateMappingConfidence: (_: any, { id, confidence, rationale }: any) => Promise<any>;
        validateMapping: (_: any, { id, validated, validatorId, notes }: any) => Promise<any>;
        batchCreateMappings: (_: any, { mappings }: {
            mappings: any[];
        }) => Promise<import("../../../types/integration.types").RequirementArchitectureMapping[]>;
        batchValidateAlignments: (_: any, { alignments, validatorId }: any) => Promise<any[]>;
        optimizeArchitectureForRequirements: (_: any, { requirementIds, constraints }: any) => Promise<import("../../../types/integration.types").RequirementArchitectureRecommendation>;
        rebalanceArchitectureDecisions: (_: any, { projectId, strategy }: any) => Promise<any>;
        migrateExistingMappings: (_: any, { projectId, dryRun }: any) => Promise<import("../../../types/integration.types").RequirementArchitectureMapping[]>;
        cleanupBrokenMappings: (_: any, { projectId }: {
            projectId?: string;
        }) => Promise<any>;
    };
    ArchitectureDecision: {
        requirements: (parent: any) => Promise<any>;
        patterns: (parent: any) => Promise<any>;
        technologyStack: (parent: any) => Promise<any>;
        mappings: (parent: any) => Promise<any>;
        alignments: (parent: any) => Promise<any>;
    };
    RequirementArchitectureMapping: {
        requirement: (parent: any) => Promise<import("../../requirements/types/requirement.types").Requirement | null>;
        architectureDecision: (parent: any) => Promise<import("../types/architecture.types").ArchitectureDecision | null>;
        architecturePattern: (parent: any) => Promise<import("../types/architecture.types").ArchitecturePattern | null>;
        technologyStack: (parent: any) => Promise<import("../types/architecture.types").TechnologyStack | null>;
    };
};
//# sourceMappingURL=architecture.resolvers.d.ts.map