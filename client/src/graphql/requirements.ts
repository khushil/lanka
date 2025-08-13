import { gql } from '@apollo/client';

export const GET_REQUIREMENTS = gql`
  query GetRequirements(
    $filter: RequirementFilterInput
    $sort: RequirementSortInput
    $pagination: PaginationInput
  ) {
    requirements(filter: $filter, sort: $sort, pagination: $pagination) {
      data {
        id
        title
        description
        category
        priority
        status
        stakeholders
        relatedRequirements
        projectId
        createdBy
        createdAt
        updatedAt
        implementationStatus
        tags
        businessValue
        effort
        risk
      }
      pagination {
        total
        page
        limit
        totalPages
      }
    }
  }
`;

export const GET_REQUIREMENT_BY_ID = gql`
  query GetRequirementById($id: ID!) {
    requirement(id: $id) {
      id
      title
      description
      category
      priority
      status
      stakeholders
      relatedRequirements
      projectId
      createdBy
      createdAt
      updatedAt
      implementationStatus
      tags
      businessValue
      effort
      risk
      comments {
        id
        userId
        userName
        content
        createdAt
        parentId
        reactions {
          id
          userId
          type
        }
      }
      relationships {
        id
        fromRequirementId
        toRequirementId
        relationshipType
        description
      }
    }
  }
`;

export const CREATE_REQUIREMENT = gql`
  mutation CreateRequirement($input: RequirementInput!) {
    createRequirement(input: $input) {
      id
      title
      description
      category
      priority
      status
      stakeholders
      relatedRequirements
      projectId
      createdBy
      createdAt
      updatedAt
      tags
      businessValue
      effort
      risk
    }
  }
`;

export const UPDATE_REQUIREMENT = gql`
  mutation UpdateRequirement($id: ID!, $input: RequirementInput!) {
    updateRequirement(id: $id, input: $input) {
      id
      title
      description
      category
      priority
      status
      stakeholders
      relatedRequirements
      projectId
      createdBy
      createdAt
      updatedAt
      tags
      businessValue
      effort
      risk
    }
  }
`;

export const DELETE_REQUIREMENT = gql`
  mutation DeleteRequirement($id: ID!) {
    deleteRequirement(id: $id)
  }
`;

export const FIND_SIMILAR_REQUIREMENTS = gql`
  query FindSimilarRequirements($requirementId: ID!, $threshold: Float) {
    findSimilarRequirements(requirementId: $requirementId, threshold: $threshold) {
      id
      requirementId
      similarRequirement {
        id
        title
        description
        category
        priority
        projectId
        createdAt
      }
      similarityScore
      matchingFields
      projectName
    }
  }
`;

export const GET_REQUIREMENTS_GRAPH = gql`
  query GetRequirementsGraph($projectId: ID, $filter: RequirementFilterInput) {
    requirementsGraph(projectId: $projectId, filter: $filter) {
      nodes {
        id
        label
        type
        category
        priority
        status
        x
        y
      }
      edges {
        id
        source
        target
        type
        label
        weight
      }
    }
  }
`;

export const ADD_REQUIREMENT_COMMENT = gql`
  mutation AddRequirementComment($input: RequirementCommentInput!) {
    addRequirementComment(input: $input) {
      id
      requirementId
      userId
      userName
      content
      createdAt
      parentId
      reactions {
        id
        userId
        type
      }
    }
  }
`;

export const UPDATE_REQUIREMENT_STATUS = gql`
  mutation UpdateRequirementStatus($id: ID!, $status: RequirementStatus!) {
    updateRequirementStatus(id: $id, status: $status) {
      id
      status
      updatedAt
    }
  }
`;

export const BULK_UPDATE_REQUIREMENTS = gql`
  mutation BulkUpdateRequirements($ids: [ID!]!, $updates: RequirementBulkUpdateInput!) {
    bulkUpdateRequirements(ids: $ids, updates: $updates) {
      success
      updatedCount
      errors {
        id
        message
      }
    }
  }
`;

export const GET_REQUIREMENTS_ANALYTICS = gql`
  query GetRequirementsAnalytics($projectId: ID, $timeRange: TimeRangeInput) {
    requirementsAnalytics(projectId: $projectId, timeRange: $timeRange) {
      totalRequirements
      byStatus {
        status
        count
        percentage
      }
      byCategory {
        category
        count
        percentage
      }
      byPriority {
        priority
        count
        percentage
      }
      implementationProgress {
        total
        completed
        inProgress
        notStarted
        percentage
      }
      trendsOverTime {
        date
        created
        completed
        cumulative
      }
      stakeholderEngagement {
        stakeholder
        requirementsCount
        commentsCount
        lastActivity
      }
    }
  }
`;

export const EXPORT_REQUIREMENTS = gql`
  query ExportRequirements($filter: RequirementFilterInput, $format: ExportFormat!) {
    exportRequirements(filter: $filter, format: $format) {
      url
      filename
      expiresAt
    }
  }
`;

// Subscription for real-time updates
export const REQUIREMENT_UPDATED = gql`
  subscription RequirementUpdated($projectId: ID!) {
    requirementUpdated(projectId: $projectId) {
      id
      title
      status
      updatedAt
      updatedBy
      changeType
    }
  }
`;