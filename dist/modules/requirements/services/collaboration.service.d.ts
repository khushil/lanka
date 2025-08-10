import { Neo4jService } from '../../../core/database/neo4j';
export interface Stakeholder {
    id: string;
    name: string;
    email: string;
    role: string;
    department?: string;
    expertise?: string[];
    availability?: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
}
export interface Comment {
    id: string;
    requirementId: string;
    stakeholderId: string;
    content: string;
    createdAt: string;
    updatedAt?: string;
    mentions?: string[];
    resolved?: boolean;
}
export interface ApprovalWorkflow {
    id: string;
    requirementId: string;
    approvers: ApprovalStep[];
    currentStep: number;
    status: 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED';
    createdAt: string;
    completedAt?: string;
}
export interface ApprovalStep {
    stakeholderId: string;
    role: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    comments?: string;
    timestamp?: string;
}
export declare class CollaborationService {
    private neo4j;
    constructor(neo4j: Neo4jService);
    createStakeholder(input: Omit<Stakeholder, 'id'>): Promise<Stakeholder>;
    addComment(requirementId: string, stakeholderId: string, content: string, mentions?: string[]): Promise<Comment>;
    createApprovalWorkflow(requirementId: string, approvers: {
        stakeholderId: string;
        role: string;
    }[]): Promise<ApprovalWorkflow>;
    processApproval(workflowId: string, stakeholderId: string, decision: 'APPROVED' | 'REJECTED', comments?: string): Promise<ApprovalWorkflow>;
    findExpertStakeholders(domain: string, requirementType?: string): Promise<Stakeholder[]>;
    getCollaborationMetrics(projectId: string): Promise<any>;
    private notifyStakeholders;
    private notifyApprover;
    private updateRequirementStatus;
    private mapToStakeholder;
}
//# sourceMappingURL=collaboration.service.d.ts.map