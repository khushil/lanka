import { Neo4jService } from '../../../core/database/neo4j';
import { logger } from '../../../core/logging/logger';
import { v4 as uuidv4 } from 'uuid';

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

export class CollaborationService {
  constructor(private neo4j: Neo4jService) {}

  async createStakeholder(input: Omit<Stakeholder, 'id'>): Promise<Stakeholder> {
    const stakeholder: Stakeholder = {
      id: uuidv4(),
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
    logger.info(`Created stakeholder: ${stakeholder.id}`);
    
    return stakeholder;
  }

  async addComment(
    requirementId: string,
    stakeholderId: string,
    content: string,
    mentions?: string[]
  ): Promise<Comment> {
    const comment: Comment = {
      id: uuidv4(),
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

    logger.info(`Added comment ${comment.id} to requirement ${requirementId}`);
    return comment;
  }

  async createApprovalWorkflow(
    requirementId: string,
    approvers: { stakeholderId: string; role: string }[]
  ): Promise<ApprovalWorkflow> {
    const workflow: ApprovalWorkflow = {
      id: uuidv4(),
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

    logger.info(`Created approval workflow ${workflow.id} for requirement ${requirementId}`);
    return workflow;
  }

  async processApproval(
    workflowId: string,
    stakeholderId: string,
    decision: 'APPROVED' | 'REJECTED',
    comments?: string
  ): Promise<ApprovalWorkflow> {
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
    } else if (currentStep === approvers.length - 1) {
      // Last approver approved
      newStatus = 'APPROVED';
    } else {
      // Move to next approver
      newCurrentStep = currentStep + 1;
      newStatus = 'IN_PROGRESS';
      
      // Notify next approver
      await this.notifyApprover(
        approvers[newCurrentStep].stakeholderId,
        workflow.requirementId
      );
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

    logger.info(`Processed approval for workflow ${workflowId}: ${decision}`);
    
    return {
      ...workflow,
      approvers,
      currentStep: newCurrentStep,
      status: newStatus,
    };
  }

  async findExpertStakeholders(
    domain: string,
    requirementType?: string
  ): Promise<Stakeholder[]> {
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

  async getCollaborationMetrics(projectId: string): Promise<any> {
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

  private async notifyStakeholders(
    stakeholderIds: string[],
    requirementId: string,
    commentId: string
  ): Promise<void> {
    // In production, this would send actual notifications (email, Slack, etc.)
    for (const stakeholderId of stakeholderIds) {
      const notification = {
        id: uuidv4(),
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
    
    logger.info(`Notified ${stakeholderIds.length} stakeholders about comment`);
  }

  private async notifyApprover(
    stakeholderId: string,
    requirementId: string
  ): Promise<void> {
    const notification = {
      id: uuidv4(),
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
    logger.info(`Notified stakeholder ${stakeholderId} about approval request`);
  }

  private async updateRequirementStatus(
    requirementId: string,
    status: string
  ): Promise<void> {
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

  private mapToStakeholder(node: any): Stakeholder {
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