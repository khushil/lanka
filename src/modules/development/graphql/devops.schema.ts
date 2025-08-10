import { gql } from 'apollo-server-express';

export const devopsTypeDefs = gql`
  # DevOps Configuration Types
  type DevOpsProject {
    name: String!
    type: ProjectType!
    technologies: [String!]!
    environments: [String!]!
  }

  type CICDRequirements {
    platform: CICDPlatform!
    triggers: [String!]!
    stages: [String!]!
  }

  type DeploymentRequirements {
    strategy: DeploymentStrategy!
    rollback: Boolean!
    zeroDowntime: Boolean!
  }

  type InfrastructureRequirements {
    provider: CloudProvider!
    container: ContainerPlatform!
    scaling: Boolean!
  }

  type MonitoringRequirements {
    metrics: Boolean!
    logging: Boolean!
    alerting: Boolean!
  }

  type DevOpsConfiguration {
    project: DevOpsProject!
    requirements: DevOpsRequirements!
  }

  type DevOpsRequirements {
    cicd: CICDRequirements
    deployment: DeploymentRequirements
    infrastructure: InfrastructureRequirements
    monitoring: MonitoringRequirements
  }

  # Pipeline Types
  type WorkflowTemplate {
    platform: String!
    name: String!
    content: String!
    features: [String!]!
    estimatedBuildTime: Int!
    securityFeatures: [String!]!
  }

  type PipelineOptimization {
    originalMetrics: CICDMetrics!
    optimizedWorkflow: WorkflowTemplate!
    improvements: [PipelineImprovement!]!
    projectedMetrics: CICDMetrics!
    implementation: ImplementationPlan!
  }

  type CICDMetrics {
    averageBuildTime: Int!
    successRate: Float!
    failureReasons: [String!]!
  }

  type PipelineImprovement {
    category: String!
    description: String!
    impact: ImpactLevel!
    implementation: String!
  }

  type ImplementationPlan {
    steps: [ImplementationStep!]!
    risks: [Risk!]!
    rollbackPlan: String!
  }

  type ImplementationStep {
    phase: String!
    description: String!
    duration: String!
  }

  type Risk {
    risk: String!
    mitigation: String!
  }

  # Deployment Types
  type DeploymentStrategy {
    type: String!
    configuration: JSON!
    automationSteps: [AutomationStep!]!
    rollbackProcedure: RollbackProcedure!
  }

  type AutomationStep {
    step: String!
    command: String
    validation: JSON!
    trafficWeight: Int
  }

  type RollbackProcedure {
    trigger: String!
    steps: [String!]!
    timeLimit: Int!
  }

  type EnvironmentConfig {
    environment: String!
    infrastructure: JSON!
    configuration: JSON!
    secrets: JSON!
  }

  # Infrastructure Types
  type TerraformConfiguration {
    provider: String!
    files: JSON!
    modules: [TerraformModule!]!
    variables: JSON!
    outputs: JSON!
  }

  type TerraformModule {
    name: String!
    source: String!
    version: String
  }

  type KubernetesManifests {
    deployment: String!
    service: String!
    configmap: String!
    secret: String!
    ingress: String!
    hpa: String!
    networkPolicy: String!
    serviceMonitor: String!
    statefulset: String
    volumeClaimTemplate: String
  }

  type DockerConfiguration {
    dockerfile: String!
    dockerignore: String!
    composefile: String!
    buildScript: String!
    optimizations: [DockerOptimization!]!
  }

  type DockerOptimization {
    type: String!
    description: String!
  }

  type HelmChart {
    chartYaml: String!
    valuesYaml: String!
    templates: JSON!
    helmignore: String!
  }

  # Monitoring Types
  type PrometheusConfiguration {
    prometheusYml: String!
    alertRulesYml: String!
    dockerComposeYml: String!
    grafanaDashboards: JSON!
    kubernetes: JSON!
  }

  type GrafanaDashboard {
    dashboard: JSON!
    alerts: [GrafanaAlert!]!
  }

  type GrafanaAlert {
    name: String!
    condition: [JSON!]!
    frequency: String!
  }

  type AlertingRules {
    prometheusAlertsYml: String!
    groups: [AlertGroup!]!
    alertmanager: JSON!
  }

  type AlertGroup {
    name: String!
    rules: [AlertRule!]!
  }

  type AlertRule {
    alert: String!
    expr: String!
    for: String!
    labels: JSON!
    annotations: JSON!
  }

  # Incident Response Types
  type IncidentResponse {
    incident: Incident!
    immediateActions: [ImmediateAction!]!
    diagnostics: Diagnostics!
    communication: CommunicationPlan!
    escalation: EscalationInfo!
  }

  type Incident {
    id: String!
    severity: AlertSeverity!
    status: IncidentStatus!
    title: String!
    createdAt: String!
    assignedTo: String!
    escalationLevel: Int!
  }

  type ImmediateAction {
    action: String!
    description: String!
    automated: Boolean!
    command: String
    priority: Priority!
  }

  type Diagnostics {
    automated: [AutomatedCheck!]!
    manual: [String!]!
  }

  type AutomatedCheck {
    check: String!
    command: String!
    expected: String!
  }

  type CommunicationPlan {
    internal: InternalComm!
    external: ExternalComm!
  }

  type InternalComm {
    channels: [String!]!
    initialMessage: String!
  }

  type ExternalComm {
    statusPage: StatusPageUpdate!
    customers: CustomerComm!
  }

  type StatusPageUpdate {
    update: String!
    impact: String!
  }

  type CustomerComm {
    notify: Boolean!
    message: String!
  }

  type EscalationInfo {
    level: Int!
    nextEscalation: String!
    policy: JSON!
  }

  type Runbook {
    metadata: RunbookMetadata!
    overview: RunbookOverview!
    commonIssues: [CommonIssue!]!
    diagnostics: RunbookDiagnostics!
    escalation: JSON!
    recoveryProcedures: JSON!
  }

  type RunbookMetadata {
    service: String!
    version: String!
    lastUpdated: String!
    maintainers: [String!]!
  }

  type RunbookOverview {
    description: String!
    architecture: JSON!
    dependencies: [String!]!
    sla: JSON!
  }

  type CommonIssue {
    title: String!
    symptoms: [String!]!
    causes: [String!]!
    resolution: IssueResolution!
    preventiveMeasures: [String!]!
  }

  type IssueResolution {
    steps: [String!]!
    commands: [String!]!
    verification: String!
  }

  type RunbookDiagnostics {
    healthChecks: [HealthCheck!]!
    logs: JSON!
    metrics: JSON!
  }

  type HealthCheck {
    name: String!
    endpoint: String
    command: String!
    expectedResponse: String
  }

  # Production Feedback Types
  type ProductionMetrics {
    timeRange: TimeRange!
    services: JSON!
    business: BusinessMetrics!
    alerts: [ProductionAlert!]!
  }

  type TimeRange {
    start: String!
    end: String!
    granularity: String!
  }

  type BusinessMetrics {
    userEngagement: UserEngagement!
    transactions: TransactionMetrics!
    features: [FeatureMetrics!]!
  }

  type UserEngagement {
    activeUsers: Int!
    sessionDuration: Float!
    bounceRate: Float!
  }

  type TransactionMetrics {
    completed: Int!
    failed: Int!
    revenue: Float!
  }

  type FeatureMetrics {
    name: String!
    usage: Float!
    performance: Float!
  }

  type ProductionAlert {
    service: String!
    metric: String!
    severity: AlertSeverity!
    value: Float!
    threshold: Float!
  }

  type FeedbackLoop {
    insights: [ProductionInsight!]!
    developmentActions: [DevelopmentAction!]!
    monitoring: MonitoringRecommendations!
    testing: TestingRecommendations!
  }

  type ProductionInsight {
    category: String!
    priority: Priority!
    title: String!
    description: String!
    metrics: JSON!
    recommendations: [ActionRecommendation!]!
  }

  type ActionRecommendation {
    action: String!
    description: String!
    effort: EffortLevel!
    impact: ImpactLevel!
  }

  type DevelopmentAction {
    type: String!
    priority: Priority!
    title: String!
    description: String!
    assignee: String
    sprint: String
    estimatedEffort: String
  }

  type MonitoringRecommendations {
    newMetrics: [MetricRecommendation!]!
    alerts: [AlertRecommendation!]!
  }

  type MetricRecommendation {
    name: String!
    description: String!
    threshold: Float!
  }

  type AlertRecommendation {
    condition: String!
    severity: AlertSeverity!
  }

  type TestingRecommendations {
    scenarios: [TestScenario!]!
    automation: [TestAutomation!]!
  }

  type TestScenario {
    type: String!
    description: String!
    criteria: JSON!
  }

  type TestAutomation {
    test: String!
    frequency: String!
  }

  type PerformanceInsights {
    summary: PerformanceSummary!
    bottlenecks: [Bottleneck!]!
    optimizations: [Optimization!]!
    trends: PerformanceTrends!
    alerts: [PerformanceAlert!]!
  }

  type PerformanceSummary {
    overallHealth: HealthStatus!
    criticalIssues: Int!
    warnings: Int!
    recommendations: Int!
  }

  type Bottleneck {
    component: String!
    type: String!
    severity: AlertSeverity!
    impact: String!
    solution: Solution!
  }

  type Solution {
    immediate: [String!]!
    longTerm: [String!]!
  }

  type Optimization {
    category: String!
    description: String!
    expectedImprovement: String!
    implementation: OptimizationImpl!
  }

  type OptimizationImpl {
    effort: EffortLevel!
    timeline: String!
    steps: [String!]!
  }

  type PerformanceTrends {
    performance: TrendData!
    usage: UsageTrends!
  }

  type TrendData {
    direction: TrendDirection!
    changeRate: Float!
  }

  type UsageTrends {
    growth: Float!
    forecast: [ForecastData!]!
  }

  type ForecastData {
    period: String!
    expectedGrowth: Float!
  }

  type PerformanceAlert {
    metric: String!
    threshold: Float!
    current: Float!
    severity: AlertSeverity!
  }

  # DevOps Hub Types
  type DevOpsPipeline {
    configuration: DevOpsConfiguration!
    components: DevOpsComponents!
    integrations: DevOpsIntegrations!
    timeline: [TimelinePhase!]!
    validation: ValidationPlan!
  }

  type DevOpsComponents {
    cicd: CICDComponent!
    deployment: DeploymentComponent!
    infrastructure: InfrastructureComponent!
    monitoring: MonitoringComponent!
  }

  type CICDComponent {
    platform: String!
    workflow: WorkflowTemplate!
    optimization: JSON!
  }

  type DeploymentComponent {
    strategy: DeploymentStrategy!
    environments: [EnvironmentConfig!]!
    automation: JSON!
  }

  type InfrastructureComponent {
    terraform: TerraformConfiguration!
    kubernetes: KubernetesManifests!
    monitoring: JSON!
  }

  type MonitoringComponent {
    prometheus: PrometheusConfiguration!
    grafana: GrafanaDashboard!
    alerting: AlertingRules!
  }

  type DevOpsIntegrations {
    slack: JSON!
    github: JSON!
    aws: JSON!
  }

  type TimelinePhase {
    phase: String!
    duration: String!
    dependencies: [String!]!
    tasks: [String!]!
  }

  type ValidationPlan {
    tests: [ValidationTest!]!
    checks: [String!]!
    metrics: [ValidationMetric!]!
  }

  type ValidationTest {
    name: String!
    description: String!
    criteria: [String!]!
  }

  type ValidationMetric {
    name: String!
    target: String!
    current: String!
  }

  # Enums
  enum ProjectType {
    WEB_APPLICATION
    MICROSERVICES
    MOBILE_APP
    BACKEND_SERVICE
  }

  enum CICDPlatform {
    GITHUB_ACTIONS
    JENKINS
    GITLAB_CI
    CIRCLECI
  }

  enum DeploymentStrategy {
    BLUE_GREEN
    CANARY
    ROLLING
  }

  enum CloudProvider {
    AWS
    AZURE
    GCP
  }

  enum ContainerPlatform {
    KUBERNETES
    DOCKER_SWARM
  }

  enum AlertSeverity {
    CRITICAL
    MAJOR
    MINOR
    WARNING
  }

  enum IncidentStatus {
    INVESTIGATING
    IDENTIFIED
    MONITORING
    RESOLVED
  }

  enum Priority {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  enum ImpactLevel {
    LOW
    MEDIUM
    HIGH
  }

  enum EffortLevel {
    LOW
    MEDIUM
    HIGH
  }

  enum HealthStatus {
    EXCELLENT
    GOOD
    FAIR
    POOR
  }

  enum TrendDirection {
    IMPROVING
    STABLE
    DEGRADING
  }

  # Input Types
  input DevOpsConfigurationInput {
    project: DevOpsProjectInput!
    requirements: DevOpsRequirementsInput!
  }

  input DevOpsProjectInput {
    name: String!
    type: ProjectType!
    technologies: [String!]!
    environments: [String!]!
  }

  input DevOpsRequirementsInput {
    cicd: CICDRequirementsInput
    deployment: DeploymentRequirementsInput
    infrastructure: InfrastructureRequirementsInput
    monitoring: MonitoringRequirementsInput
  }

  input CICDRequirementsInput {
    platform: CICDPlatform!
    triggers: [String!]!
    stages: [String!]!
  }

  input DeploymentRequirementsInput {
    strategy: DeploymentStrategy!
    rollback: Boolean!
    zeroDowntime: Boolean!
  }

  input InfrastructureRequirementsInput {
    provider: CloudProvider!
    container: ContainerPlatform!
    scaling: Boolean!
  }

  input MonitoringRequirementsInput {
    metrics: Boolean!
    logging: Boolean!
    alerting: Boolean!
  }

  input CICDConfigurationInput {
    platform: CICDPlatform!
    currentWorkflow: WorkflowInput!
    metrics: CICDMetricsInput!
  }

  input WorkflowInput {
    name: String!
    steps: [JSON!]!
    triggers: [String!]!
  }

  input CICDMetricsInput {
    averageBuildTime: Int!
    successRate: Float!
    failureReasons: [String!]!
  }

  input IncidentAlertInput {
    id: String!
    severity: AlertSeverity!
    service: String!
    title: String!
    description: String!
    metrics: IncidentMetricsInput
    source: String!
    tags: [String!]
  }

  input IncidentMetricsInput {
    errorRate: Float
    responseTime: Float
    availability: Float
  }

  input ProductionMetricsConfigInput {
    timeRange: String!
    services: [String!]!
    metrics: [String!]!
    granularity: String!
  }

  # Scalar
  scalar JSON

  # Queries
  type Query {
    # DevOps Pipeline Queries
    getDevOpsPipeline(configuration: DevOpsConfigurationInput!): DevOpsPipeline!
    
    # CI/CD Queries
    analyzeCICDPipeline(config: CICDConfigurationInput!): JSON!
    generateWorkflowTemplate(
      projectName: String!
      technologies: [String!]!
      platform: CICDPlatform!
    ): WorkflowTemplate!
    
    # Deployment Queries
    generateDeploymentStrategy(
      appName: String!
      strategy: DeploymentStrategy!
    ): DeploymentStrategy!
    
    # Infrastructure Queries
    generateTerraformConfig(
      provider: CloudProvider!
      region: String!
    ): TerraformConfiguration!
    generateKubernetesManifests(
      appName: String!
      image: String!
    ): KubernetesManifests!
    
    # Monitoring Queries
    generatePrometheusConfig(
      services: [String!]!
    ): PrometheusConfiguration!
    generateGrafanaDashboard(
      appName: String!
      metrics: [String!]!
    ): GrafanaDashboard!
    
    # Incident Response Queries
    generateRunbook(
      serviceName: String!
      serviceType: String!
    ): Runbook!
    
    # Production Feedback Queries
    collectProductionMetrics(
      config: ProductionMetricsConfigInput!
    ): ProductionMetrics!
    generatePerformanceInsights(
      serviceName: String!
    ): PerformanceInsights!
  }

  # Mutations
  type Mutation {
    # DevOps Pipeline Mutations
    orchestrateDevOpsPipeline(
      configuration: DevOpsConfigurationInput!
    ): DevOpsPipeline!
    
    # CI/CD Mutations
    optimizeCICDPipeline(
      config: CICDConfigurationInput!
    ): PipelineOptimization!
    
    # Incident Response Mutations
    createIncidentResponse(
      alert: IncidentAlertInput!
    ): IncidentResponse!
    automateIncidentMitigation(
      incidentId: String!
      incidentType: String!
    ): JSON!
    
    # Production Feedback Mutations
    generateFeedbackLoop(
      metricsData: JSON!
    ): FeedbackLoop!
    createDevelopmentTickets(
      feedback: JSON!
    ): JSON!
    
    # DevOps Hub Mutations
    generateSecurityStrategy(
      requirements: JSON!
    ): JSON!
    analyzeDevOpsMaturity(
      currentState: JSON!
    ): JSON!
  }

  # Subscriptions
  type Subscription {
    # Real-time incident updates
    incidentUpdates(serviceNames: [String!]!): IncidentResponse!
    
    # Real-time performance metrics
    performanceMetrics(services: [String!]!): ProductionMetrics!
    
    # Pipeline status updates
    pipelineStatus(pipelineId: String!): JSON!
    
    # Deployment status updates
    deploymentStatus(deploymentId: String!): JSON!
  }
`;