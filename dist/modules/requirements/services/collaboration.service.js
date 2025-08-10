"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollaborationService = void 0;
const logger_1 = require("../../../core/logging/logger");
const uuid_1 = require("uuid");
class CollaborationService {
    neo4j;
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async createStakeholder(input) {
        const stakeholder = {
            id: (0, uuid_1.v4)(),
            ...input,
            availability: 'AVAILABLE',
        };
        const query = `
      CREATE (s:Stakeholder {
        id: $id,
        name: $name,
        email: $email,
        role: $role,
        department: $department,
        expertise: $expertise,
        availability: $availability
      })
      RETURN s
    `;
        await this.neo4j.executeQuery(query, stakeholder);
        logger_1.logger.info(`Created stakeholder: ${stakeholder.id}`);
        return stakeholder;
    }
    async addComment(requirementId, stakeholderId, content, mentions) {
        const comment = {
            id: (0, uuid_1.v4)(),
            requirementId,
            stakeholderId,
            content,
            createdAt: new Date().toISOString(),
            mentions,
            resolved: false,
        };
        const query = `
      MATCH (r:Requirement {id: $requirementId})
      MATCH (s:Stakeholder {id: $stakeholderId})
      CREATE (c:Comment {
        id: $id,
        content: $content,
        createdAt: $createdAt,
        mentions: $mentions,
        resolved: false
      })
      CREATE (s)-[:AUTHORED]->(c)
      CREATE (c)-[:COMMENTS_ON]->(r)
      RETURN c
    `;
        await this.neo4j.executeQuery(query, comment);
        // Notify mentioned stakeholders
        if (mentions && mentions.length > 0) {
            await this.notifyStakeholders(mentions, requirementId, comment.id);
        }
        logger_1.logger.info(`Added comment ${comment.id} to requirement ${requirementId}`);
        return comment;
    }
    async createApprovalWorkflow(requirementId, approvers) {
        const workflow = {
            id: (0, uuid_1.v4)(),
            requirementId,
            approvers: approvers.map(a => ({
                stakeholderId: a.stakeholderId,
                role: a.role,
                status: 'PENDING',
            })),
            currentStep: 0,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
        };
        const query = `
      MATCH (r:Requirement {id: $requirementId})
      CREATE (w:ApprovalWorkflow {
        id: $id,
        requirementId: $requirementId,
        approvers: $approvers,
        currentStep: $currentStep,
        status: $status,
        createdAt: $createdAt
      })
      CREATE (w)-[:APPROVES]->(r)
      RETURN w
    `;
        await this.neo4j.executeQuery(query, {
            ...workflow,
            approvers: JSON.stringify(workflow.approvers),
        });
        // Notify first approver
        await this.notifyApprover(workflow.approvers[0].stakeholderId, requirementId);
        logger_1.logger.info(`Created approval workflow ${workflow.id} for requirement ${requirementId}`);
        return workflow;
    }
    async processApproval(workflowId, stakeholderId, decision, comments) {
        // Get current workflow
        const getQuery = `
      MATCH (w:ApprovalWorkflow {id: $workflowId})
      RETURN w
    `;
        const results = await this.neo4j.executeQuery(getQuery, { workflowId });
        if (results.length === 0) {
            throw new Error('Workflow not found');
        }
        const workflow = results[0].w.properties;
        const approvers = JSON.parse(workflow.approvers);
        const currentStep = workflow.currentStep;
        // Update current approver's decision
        approvers[currentStep] = {
            ...approvers[currentStep],
            status: decision,
            comments,
            timestamp: new Date().toISOString(),
        };
        let newStatus = workflow.status;
        let newCurrentStep = currentStep;
        if (decision === 'REJECTED') {
            newStatus = 'REJECTED';
        }
        else if (currentStep === approvers.length - 1) {
            // Last approver approved
            newStatus = 'APPROVED';
        }
        else {
            // Move to next approver
            newCurrentStep = currentStep + 1;
            newStatus = 'IN_PROGRESS';
            // Notify next approver
            await this.notifyApprover(approvers[newCurrentStep].stakeholderId, workflow.requirementId);
        }
        // Update workflow
        const updateQuery = `
      MATCH (w:ApprovalWorkflow {id: $workflowId})
      SET w.approvers = $approvers,
          w.currentStep = $currentStep,
          w.status = $status,
          w.completedAt = $completedAt
      RETURN w
    `;
        await this.neo4j.executeQuery(updateQuery, {
            workflowId,
            approvers: JSON.stringify(approvers),
            currentStep: newCurrentStep,
            status: newStatus,
            completedAt: newStatus === 'APPROVED' || newStatus === 'REJECTED'
                ? new Date().toISOString()
                : null,
        });
        // Update requirement status if workflow is complete
        if (newStatus === 'APPROVED') {
            await this.updateRequirementStatus(workflow.requirementId, 'APPROVED');
        }
        logger_1.logger.info(`Processed approval for workflow ${workflowId}: ${decision}`);
        return {
            ...workflow,
            approvers,
            currentStep: newCurrentStep,
            status: newStatus,
        };
    }
    async findExpertStakeholders(domain, requirementType) {
        const query = `
      MATCH (s:Stakeholder)
      WHERE $domain IN s.expertise
      ${requirementType ? 'AND EXISTS((s)-[:OWNS]->(:Requirement {type: $requirementType}))' : ''}
      WITH s, count((s)-[:OWNS]->(:Requirement)) as requirementCount
      WHERE requirementCount > 3
      RETURN s
      ORDER BY requirementCount DESC
      LIMIT 5
    `;
        const results = await this.neo4j.executeQuery(query, {
            domain,
            requirementType,
        });
        return results.map(r => this.mapToStakeholder(r.s));
    }
    async getCollaborationMetrics(projectId) {
        const query = `
      MATCH (p:Project {id: $projectId})-[:CONTAINS]->(r:Requirement)
      OPTIONAL MATCH (r)<-[:COMMENTS_ON]-(c:Comment)
      OPTIONAL MATCH (r)<-[:APPROVES]-(w:ApprovalWorkflow)
      WITH p, 
           count(DISTINCT r) as totalRequirements,
           count(DISTINCT c) as totalComments,
           count(DISTINCT w) as totalWorkflows,
           avg(CASE WHEN w.status = 'APPROVED' THEN 1 ELSE 0 END) as approvalRate
      RETURN {
        projectId: p.id,
        totalRequirements: totalRequirements,
        totalComments: totalComments,
        totalWorkflows: totalWorkflows,
        approvalRate: approvalRate,
        avgCommentsPerRequirement: toFloat(totalComments) / totalRequirements
      } as metrics
    `;
        const results = await this.neo4j.executeQuery(query, { projectId });
        return results[0]?.metrics || {};
    }
    async notifyStakeholders(stakeholderIds, requirementId, commentId) {
        // In production, this would send actual notifications (email, Slack, etc.)
        for (const stakeholderId of stakeholderIds) {
            const notification = {
                id: (0, uuid_1.v4)(),
                stakeholderId,
                type: 'COMMENT_MENTION',
                requirementId,
                commentId,
                createdAt: new Date().toISOString(),
                read: false,
            };
            const query = `
        MATCH (s:Stakeholder {id: $stakeholderId})
        CREATE (n:Notification {
          id: $id,
          type: $type,
          requirementId: $requirementId,
          commentId: $commentId,
          createdAt: $createdAt,
          read: false
        })
        CREATE (s)-[:HAS_NOTIFICATION]->(n)
      `;
            await this.neo4j.executeQuery(query, notification);
        }
        logger_1.logger.info(`Notified ${stakeholderIds.length} stakeholders about comment`);
    }
    async notifyApprover(stakeholderId, requirementId) {
        const notification = {
            id: (0, uuid_1.v4)(),
            stakeholderId,
            type: 'APPROVAL_REQUEST',
            requirementId,
            createdAt: new Date().toISOString(),
            read: false,
        };
        const query = `
      MATCH (s:Stakeholder {id: $stakeholderId})
      CREATE (n:Notification {
        id: $id,
        type: $type,
        requirementId: $requirementId,
        createdAt: $createdAt,
        read: false
      })
      CREATE (s)-[:HAS_NOTIFICATION]->(n)
    `;
        await this.neo4j.executeQuery(query, notification);
        logger_1.logger.info(`Notified stakeholder ${stakeholderId} about approval request`);
    }
    async updateRequirementStatus(requirementId, status) {
        const query = `
      MATCH (r:Requirement {id: $requirementId})
      SET r.status = $status,
          r.updatedAt = $updatedAt
    `;
        await this.neo4j.executeQuery(query, {
            requirementId,
            status,
            updatedAt: new Date().toISOString(),
        });
    }
    mapToStakeholder(node) {
        return {
            id: node.properties.id,
            name: node.properties.name,
            email: node.properties.email,
            role: node.properties.role,
            department: node.properties.department,
            expertise: node.properties.expertise,
            availability: node.properties.availability,
        };
    }
}
exports.CollaborationService = CollaborationService;
//# sourceMappingURL=collaboration.service.js.map