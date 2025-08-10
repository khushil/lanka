export const requirementsTypeDefs = `
  enum RequirementType {
    BUSINESS
    FUNCTIONAL
    NON_FUNCTIONAL
    USER_STORY
    ACCEPTANCE_CRITERIA
    BUSINESS_RULE
    COMPLIANCE
  }

  enum RequirementStatus {
    DRAFT
    REVIEW
    APPROVED
    IMPLEMENTED
    VALIDATED
    DEPRECATED
  }

  enum RequirementPriority {
    CRITICAL
    HIGH
    MEDIUM
    LOW
  }

  type Requirement {
    id: ID!
    title: String!
    description: String!
    type: RequirementType!
    status: RequirementStatus!
    priority: RequirementPriority
    createdAt: Date!
    updatedAt: Date
    project: Project
    stakeholder: Stakeholder
    completenessScore: Float
    qualityScore: Float
    acceptanceCriteria: [String]
    businessValue: String
    dependencies: [Requirement]
    similarRequirements: [SimilarRequirement]
    conflicts: [RequirementConflict]
  }

  type SimilarRequirement {
    requirement: Requirement!
    similarity: Float!
    projectName: String!
    successMetrics: SuccessMetrics
    adaptationGuidelines: [String]
  }

  type SuccessMetrics {
    implementationTime: Int
    defectRate: Float
    stakeholderSatisfaction: Float
  }

  type RequirementConflict {
    id: ID!
    requirement1: Requirement!
    requirement2: Requirement!
    conflictType: String!
    description: String!
    severity: String!
    resolutionSuggestions: [String]
    status: String!
  }

  type RequirementPattern {
    id: ID!
    name: String!
    description: String!
    type: RequirementType!
    template: String!
    applicabilityConditions: [String]
    successRate: Float
    adoptionRate: Float
    examples: [String]
  }

  type RequirementAnalysis {
    requirement: Requirement!
    completenessScore: Float!
    qualityScore: Float!
    suggestions: [String]
    similarRequirements: [SimilarRequirement]
    recommendedExperts: [Expert]
  }

  type Expert {
    id: ID!
    name: String!
    email: String
    expertise: [String]
    successRate: Float
  }

  type Project {
    id: ID!
    name: String!
    description: String
    requirements: [Requirement]
    createdAt: Date!
  }

  type Stakeholder {
    id: ID!
    name: String!
    email: String!
    role: String
    requirements: [Requirement]
  }

  input CreateRequirementInput {
    title: String
    description: String!
    type: RequirementType
    projectId: ID!
    stakeholderId: ID!
    priority: RequirementPriority
    acceptanceCriteria: [String]
    businessValue: String
  }

  input UpdateRequirementInput {
    title: String
    description: String
    type: RequirementType
    status: RequirementStatus
    priority: RequirementPriority
    acceptanceCriteria: [String]
    businessValue: String
  }

  extend type Query {
    requirement(id: ID!): Requirement
    requirements(
      projectId: ID
      type: RequirementType
      status: RequirementStatus
      limit: Int = 20
      offset: Int = 0
    ): [Requirement]
    
    findSimilarRequirements(
      requirementId: ID!
      threshold: Float = 0.7
    ): [SimilarRequirement]
    
    detectConflicts(requirementId: ID!): [RequirementConflict]
    
    extractPatterns(projectId: ID!): [RequirementPattern]
    
    analyzeRequirement(description: String!): RequirementAnalysis
  }

  extend type Mutation {
    createRequirement(input: CreateRequirementInput!): Requirement
    
    updateRequirement(
      id: ID!
      input: UpdateRequirementInput!
    ): Requirement
    
    approveRequirement(id: ID!): Requirement
    
    linkRequirements(
      requirement1Id: ID!
      requirement2Id: ID!
      relationship: String!
    ): Boolean
    
    resolveConflict(
      conflictId: ID!
      resolution: String!
    ): RequirementConflict
  }
`;