export const architectureTypeDefs = `
  enum ArchitectureDecisionStatus {
    DRAFT
    PROPOSED
    APPROVED
    IMPLEMENTED
    DEPRECATED
    SUPERSEDED
  }

  enum ArchitecturePatternType {
    MICROSERVICES
    MONOLITHIC
    SERVERLESS
    EVENT_DRIVEN
    LAYERED
    HEXAGONAL
    CQRS
    SAGA
  }

  enum CloudProvider {
    AWS
    AZURE
    GCP
    ONPREMISES
    HYBRID
  }

  enum RequirementMappingType {
    DIRECT
    DERIVED
    INFLUENCED
    CONSTRAINT
    QUALITY_ATTRIBUTE
  }

  enum AlignmentType {
    FULLY_ALIGNED
    PARTIALLY_ALIGNED
    MISALIGNED
    NOT_APPLICABLE
  }

  enum ValidationStatus {
    PENDING
    VALIDATED
    NEEDS_REVIEW
    REJECTED
  }

  type ArchitectureDecision {
    id: ID!
    title: String!
    description: String!
    rationale: String!
    status: ArchitectureDecisionStatus!
    alternatives: [Alternative!]!
    consequences: [String!]!
    tradeOffs: [TradeOff!]!
    createdAt: Date!
    updatedAt: Date
    approvedAt: Date
    deprecatedAt: Date
    project: Project
    requirements: [Requirement!]!
    patterns: [ArchitecturePattern!]
    technologyStack: TechnologyStack
    mappings: [RequirementArchitectureMapping!]!
    alignments: [ArchitectureRequirementAlignment!]!
  }

  type Alternative {
    title: String!
    description: String!
    pros: [String!]!
    cons: [String!]!
    rejectionReason: String
  }

  type TradeOff {
    aspect: String!
    gain: String!
    loss: String!
    mitigation: String
  }

  type ArchitecturePattern {
    id: ID!
    name: String!
    type: ArchitecturePatternType!
    description: String!
    applicabilityConditions: [String!]!
    components: [PatternComponent!]!
    qualityAttributes: [QualityAttribute!]!
    knownUses: [String!]!
    successRate: Float!
    adoptionCount: Int!
    createdAt: Date!
    updatedAt: Date
    decisions: [ArchitectureDecision!]!
    recommendations: [PatternRecommendation!]!
  }

  type PatternComponent {
    name: String!
    responsibility: String!
    interactions: [String!]!
    constraints: [String!]
  }

  type QualityAttribute {
    name: String!
    impact: String!
    description: String!
    metric: String
  }

  type TechnologyStack {
    id: ID!
    name: String!
    description: String!
    layers: [TechnologyLayer!]!
    compatibility: CompatibilityMatrix!
    performanceMetrics: PerformanceMetrics!
    costEstimate: CostEstimate!
    teamExpertise: Float
    successRate: Float
    createdAt: Date!
    updatedAt: Date
    decisions: [ArchitectureDecision!]!
    recommendations: [TechnologyRecommendation!]!
  }

  type TechnologyLayer {
    name: String!
    technologies: [Technology!]!
    purpose: String!
    alternatives: [Technology!]
  }

  type Technology {
    name: String!
    version: String!
    license: String!
    vendor: String
    maturity: String!
    communitySupport: Float!
    learningCurve: String!
  }

  type CompatibilityMatrix {
    compatible: [[String!]!]!
    incompatible: [[String!]!]!
    requires: JSON!
  }

  type PerformanceMetrics {
    throughput: Float
    latency: Float
    scalability: String
    reliability: Float
    maintainability: Float
  }

  type CostEstimate {
    upfront: Float!
    monthly: Float!
    yearly: Float!
    currency: String!
    breakdown: [CostBreakdown!]!
  }

  type CostBreakdown {
    category: String!
    service: String!
    quantity: Float!
    unitCost: Float!
    totalCost: Float!
  }

  type CloudConfiguration {
    provider: CloudProvider!
    services: [CloudService!]!
    regions: [String!]!
    availability: String!
    compliance: [String!]!
    costOptimizations: [OptimizationStrategy!]!
  }

  type CloudService {
    name: String!
    type: String!
    configuration: JSON!
    estimatedCost: Float!
    alternativeServices: [String!]
  }

  type OptimizationStrategy {
    name: String!
    description: String!
    potentialSavings: Float!
    implementation: String!
    tradeOffs: [String!]
  }

  # Integration Types

  type RequirementArchitectureMapping {
    id: ID!
    requirement: Requirement!
    architectureDecision: ArchitectureDecision
    architecturePattern: ArchitecturePattern
    technologyStack: TechnologyStack
    mappingType: RequirementMappingType!
    confidence: Float!
    rationale: String!
    implementationGuidance: String
    tradeOffs: [ArchitecturalTradeOff!]
    createdAt: Date!
    updatedAt: Date
    validatedAt: Date
    validatedBy: String
  }

  type ArchitecturalTradeOff {
    aspect: String!
    benefit: String!
    cost: String!
    riskLevel: String!
    mitigationStrategy: String
  }

  type RequirementArchitectureRecommendation {
    id: ID!
    requirement: Requirement!
    recommendedPatterns: [PatternRecommendation!]!
    recommendedTechnologies: [TechnologyRecommendation!]!
    architecturalConstraints: [ArchitecturalConstraint!]!
    qualityAttributes: [QualityAttributeMapping!]!
    implementationStrategy: ImplementationStrategy!
    confidence: Float!
    reasoning: [String!]!
    alternativeApproaches: [AlternativeApproach!]
    createdAt: Date!
    updatedAt: Date
  }

  type PatternRecommendation {
    pattern: ArchitecturePattern!
    applicabilityScore: Float!
    benefits: [String!]!
    risks: [String!]!
    implementationComplexity: String!
    prerequisites: [String!]!
  }

  type TechnologyRecommendation {
    technologyStack: TechnologyStack!
    suitabilityScore: Float!
    alignmentReason: String!
    implementationEffort: Float!
    learningCurveImpact: String!
    riskFactors: [String!]!
  }

  type ArchitecturalConstraint {
    type: String!
    description: String!
    impact: String!
    mandatory: Boolean!
    validationCriteria: [String!]
  }

  type QualityAttributeMapping {
    requirement: Requirement!
    qualityAttribute: String!
    targetValue: String
    measurementCriteria: String!
    architecturalImplication: String!
    verificationMethod: String!
  }

  type ImplementationStrategy {
    approach: String!
    phases: [ImplementationPhase!]
    dependencies: [String!]!
    riskMitigations: [String!]!
    estimatedEffort: Float!
    timeline: String!
  }

  type ImplementationPhase {
    name: String!
    description: String!
    requirements: [Requirement!]!
    architectureComponents: [String!]!
    dependencies: [String!]!
    deliverables: [String!]!
    estimatedDuration: Float!
  }

  type AlternativeApproach {
    name: String!
    description: String!
    patterns: [String!]!
    technologies: [String!]!
    pros: [String!]!
    cons: [String!]!
    suitabilityConditions: [String!]!
  }

  type ArchitectureRequirementAlignment {
    id: ID!
    requirement: Requirement!
    architectureDecision: ArchitectureDecision!
    alignmentScore: Float!
    alignmentType: AlignmentType!
    gaps: [String!]!
    recommendations: [String!]!
    validationStatus: ValidationStatus!
    lastAssessed: Date!
    assessedBy: String
  }

  type RequirementImpactAnalysis {
    id: ID!
    requirement: Requirement!
    impactedArchitectureDecisions: [ArchitectureDecision!]!
    impactedPatterns: [ArchitecturePattern!]!
    impactedTechnologies: [TechnologyStack!]!
    cascadingChanges: [CascadingChange!]!
    riskAssessment: RiskAssessment!
    changeComplexity: String!
    estimatedEffort: Float!
    createdAt: Date!
  }

  type CascadingChange {
    targetType: String!
    targetId: String!
    changeType: String!
    reason: String!
    priority: String!
  }

  type RiskAssessment {
    overallRisk: String!
    riskFactors: [RiskFactor!]!
    mitigationStrategies: [String!]!
    contingencyPlan: String
  }

  type RiskFactor {
    category: String!
    description: String!
    probability: Float!
    impact: Float!
    score: Float!
  }

  type IntegrationMetrics {
    totalRequirements: Int!
    mappedRequirements: Int!
    unmappedRequirements: Int!
    averageConfidence: Float!
    alignmentDistribution: JSON!
    validationCoverage: Float!
    recommendationAccuracy: Float!
    implementationProgress: Float!
  }

  type IntegrationHealthCheck {
    status: String!
    lastChecked: Date!
    issues: [HealthIssue!]!
    metrics: IntegrationMetrics!
    recommendations: [String!]!
  }

  type HealthIssue {
    type: String!
    description: String!
    severity: String!
    affectedItems: [String!]!
    suggestedActions: [String!]!
  }

  # Input Types

  input CreateArchitectureDecisionInput {
    title: String!
    description: String!
    rationale: String!
    requirementIds: [ID!]!
    patternIds: [ID!]
    technologyStackId: ID
    alternatives: [AlternativeInput!]
    consequences: [String!]
    tradeOffs: [TradeOffInput!]
  }

  input AlternativeInput {
    title: String!
    description: String!
    pros: [String!]!
    cons: [String!]!
    rejectionReason: String
  }

  input TradeOffInput {
    aspect: String!
    gain: String!
    loss: String!
    mitigation: String
  }

  input UpdateArchitectureDecisionInput {
    title: String
    description: String
    rationale: String
    status: ArchitectureDecisionStatus
    alternatives: [AlternativeInput!]
    consequences: [String!]
    tradeOffs: [TradeOffInput!]
  }

  input CreateArchitecturePatternInput {
    name: String!
    type: ArchitecturePatternType!
    description: String!
    applicabilityConditions: [String!]!
    components: [PatternComponentInput!]!
    qualityAttributes: [QualityAttributeInput!]!
    knownUses: [String!]!
  }

  input PatternComponentInput {
    name: String!
    responsibility: String!
    interactions: [String!]!
    constraints: [String!]
  }

  input QualityAttributeInput {
    name: String!
    impact: String!
    description: String!
    metric: String
  }

  input CreateTechnologyStackInput {
    name: String!
    description: String!
    layers: [TechnologyLayerInput!]!
    teamExpertise: Float
  }

  input TechnologyLayerInput {
    name: String!
    technologies: [TechnologyInput!]!
    purpose: String!
    alternatives: [TechnologyInput!]
  }

  input TechnologyInput {
    name: String!
    version: String!
    license: String!
    vendor: String
    maturity: String!
    communitySupport: Float!
    learningCurve: String!
  }

  input CreateMappingInput {
    requirementId: ID!
    architectureDecisionId: ID
    architecturePatternId: ID
    technologyStackId: ID
    mappingType: RequirementMappingType!
    confidence: Float!
    rationale: String!
    implementationGuidance: String
  }

  input CrossModuleFiltersInput {
    projectId: ID
    requirementTypes: [RequirementType!]
    architectureDecisionStatus: [ArchitectureDecisionStatus!]
    dateRange: DateRangeInput
    confidenceThreshold: Float
    alignmentScore: ScoreRangeInput
  }

  input DateRangeInput {
    start: Date!
    end: Date!
  }

  input ScoreRangeInput {
    min: Float!
    max: Float!
  }

  # Extended Queries and Mutations

  extend type Query {
    # Architecture Decision Queries
    architectureDecision(id: ID!): ArchitectureDecision
    architectureDecisions(
      projectId: ID
      status: ArchitectureDecisionStatus
      requirementId: ID
      limit: Int = 20
      offset: Int = 0
    ): [ArchitectureDecision!]!

    # Architecture Pattern Queries
    architecturePattern(id: ID!): ArchitecturePattern
    architecturePatterns(
      type: ArchitecturePatternType
      applicabilityConditions: [String!]
      limit: Int = 20
      offset: Int = 0
    ): [ArchitecturePattern!]!

    # Technology Stack Queries
    technologyStack(id: ID!): TechnologyStack
    technologyStacks(
      teamExpertise: Float
      performanceRequirements: String
      limit: Int = 20
      offset: Int = 0
    ): [TechnologyStack!]!

    # Integration Queries
    requirementArchitectureMappings(
      requirementId: ID
      architectureDecisionId: ID
      confidence: Float
      limit: Int = 20
      offset: Int = 0
    ): [RequirementArchitectureMapping!]!

    generateArchitectureRecommendations(
      requirementId: ID!
    ): RequirementArchitectureRecommendation!

    validateRequirementAlignment(
      requirementId: ID!
      architectureDecisionId: ID!
    ): ArchitectureRequirementAlignment!

    analyzeRequirementImpact(
      requirementId: ID!
    ): RequirementImpactAnalysis!

    getIntegrationMetrics(
      projectId: ID
    ): IntegrationMetrics!

    performIntegrationHealthCheck: IntegrationHealthCheck!

    # Cross-Module Search
    searchArchitectureByRequirement(
      requirementId: ID!
      includePatterns: Boolean = true
      includeTechnologies: Boolean = true
    ): [ArchitectureDecision!]!

    searchRequirementsByArchitecture(
      architectureDecisionId: ID!
      includeRelated: Boolean = true
    ): [Requirement!]!

    # Pattern and Technology Recommendations
    recommendPatterns(
      requirementIds: [ID!]!
      constraints: [String!]
    ): [PatternRecommendation!]!

    recommendTechnologies(
      requirementIds: [ID!]!
      patternIds: [ID!]
      constraints: [String!]
    ): [TechnologyRecommendation!]!
  }

  extend type Mutation {
    # Architecture Decision Mutations
    createArchitectureDecision(
      input: CreateArchitectureDecisionInput!
    ): ArchitectureDecision!

    updateArchitectureDecision(
      id: ID!
      input: UpdateArchitectureDecisionInput!
    ): ArchitectureDecision!

    approveArchitectureDecision(id: ID!): ArchitectureDecision!

    deprecateArchitectureDecision(
      id: ID!
      reason: String!
      replacementId: ID
    ): ArchitectureDecision!

    # Architecture Pattern Mutations
    createArchitecturePattern(
      input: CreateArchitecturePatternInput!
    ): ArchitecturePattern!

    updateArchitecturePattern(
      id: ID!
      input: CreateArchitecturePatternInput!
    ): ArchitecturePattern!

    # Technology Stack Mutations
    createTechnologyStack(
      input: CreateTechnologyStackInput!
    ): TechnologyStack!

    updateTechnologyStack(
      id: ID!
      input: CreateTechnologyStackInput!
    ): TechnologyStack!

    # Integration Mutations
    createRequirementArchitectureMapping(
      input: CreateMappingInput!
    ): RequirementArchitectureMapping!

    updateMappingConfidence(
      id: ID!
      confidence: Float!
      rationale: String
    ): RequirementArchitectureMapping!

    validateMapping(
      id: ID!
      validated: Boolean!
      validatorId: ID!
      notes: String
    ): RequirementArchitectureMapping!

    # Batch Operations
    batchCreateMappings(
      mappings: [CreateMappingInput!]!
    ): [RequirementArchitectureMapping!]!

    batchValidateAlignments(
      alignments: [ID!]!
      validatorId: ID!
    ): [ArchitectureRequirementAlignment!]!

    # Optimization Operations
    optimizeArchitectureForRequirements(
      requirementIds: [ID!]!
      constraints: [String!]
    ): RequirementArchitectureRecommendation!

    rebalanceArchitectureDecisions(
      projectId: ID!
      strategy: String = "BALANCED"
    ): [ArchitectureDecision!]!

    # Data Migration and Cleanup
    migrateExistingMappings(
      projectId: ID!
      dryRun: Boolean = true
    ): [RequirementArchitectureMapping!]!

    cleanupBrokenMappings(
      projectId: ID
    ): Int!
  }

  # Subscriptions for real-time updates
  extend type Subscription {
    architectureDecisionCreated(projectId: ID!): ArchitectureDecision!
    architectureDecisionUpdated(projectId: ID!): ArchitectureDecision!
    mappingCreated(requirementId: ID): RequirementArchitectureMapping!
    mappingValidated(requirementId: ID): RequirementArchitectureMapping!
    recommendationGenerated(requirementId: ID!): RequirementArchitectureRecommendation!
    integrationHealthUpdated: IntegrationHealthCheck!
  }
`;