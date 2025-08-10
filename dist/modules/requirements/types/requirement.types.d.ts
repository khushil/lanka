export declare enum RequirementType {
    BUSINESS = "BUSINESS",
    FUNCTIONAL = "FUNCTIONAL",
    NON_FUNCTIONAL = "NON_FUNCTIONAL",
    USER_STORY = "USER_STORY",
    ACCEPTANCE_CRITERIA = "ACCEPTANCE_CRITERIA",
    BUSINESS_RULE = "BUSINESS_RULE",
    COMPLIANCE = "COMPLIANCE"
}
export declare enum RequirementStatus {
    DRAFT = "DRAFT",
    REVIEW = "REVIEW",
    APPROVED = "APPROVED",
    IMPLEMENTED = "IMPLEMENTED",
    VALIDATED = "VALIDATED",
    DEPRECATED = "DEPRECATED"
}
export declare enum RequirementPriority {
    CRITICAL = "CRITICAL",
    HIGH = "HIGH",
    MEDIUM = "MEDIUM",
    LOW = "LOW"
}
export interface Requirement {
    id: string;
    title: string;
    description: string;
    type: RequirementType;
    status: RequirementStatus;
    priority?: RequirementPriority;
    createdAt: string;
    updatedAt?: string;
    projectId: string;
    stakeholderId: string;
    embedding?: number[];
    completenessScore?: number;
    qualityScore?: number;
    acceptanceCriteria?: string[];
    businessValue?: string;
    technicalNotes?: string;
    dependencies?: string[];
    tags?: string[];
}
export interface RequirementPattern {
    id: string;
    name: string;
    description: string;
    type: RequirementType;
    template: string;
    applicabilityConditions: string[];
    successMetrics: {
        adoptionRate: number;
        successRate: number;
        qualityScore: number;
    };
    examples: string[];
    createdAt: string;
    updatedAt?: string;
}
export interface RequirementConflict {
    id: string;
    requirement1Id: string;
    requirement2Id: string;
    conflictType: 'LOGICAL' | 'RESOURCE' | 'TIMING' | 'PRIORITY';
    description: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    resolutionSuggestions: string[];
    status: 'OPEN' | 'RESOLVED' | 'IGNORED';
    createdAt: string;
    resolvedAt?: string;
}
export interface RequirementValidation {
    requirementId: string;
    completenessScore: number;
    qualityScore: number;
    issues: ValidationIssue[];
    suggestions: string[];
    validatedAt: string;
}
export interface ValidationIssue {
    type: 'INCOMPLETE' | 'AMBIGUOUS' | 'CONFLICTING' | 'NON_TESTABLE';
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    suggestion?: string;
}
//# sourceMappingURL=requirement.types.d.ts.map