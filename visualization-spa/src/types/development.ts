// Development module type definitions

export interface CodeGenerationTemplate {
  id: string;
  name: string;
  description: string;
  type: 'component' | 'api' | 'service' | 'utility' | 'test';
  language: string;
  complexity: number;
  estimatedTime: number;
  parameters: TemplateParameter[];
  examples: string[];
  tags: string[];
}

export interface TemplateParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  defaultValue?: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: string[];
  };
}

export interface GeneratedCode {
  id: string;
  code: string;
  language: string;
  qualityScore: number;
  suggestions: string[];
  dependencies: string[];
  template: {
    id: string;
    name: string;
    type: string;
  };
  metadata: {
    linesOfCode: number;
    complexity: number;
    maintainabilityIndex: number;
    testCoverage?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface TestSuite {
  id: string;
  name: string;
  type: 'unit' | 'integration' | 'e2e' | 'snapshot' | 'performance';
  framework: string;
  coverage: CoverageReport;
  tests: TestCase[];
  mutationResults?: MutationTestResults;
  createdAt: Date;
  lastRun?: Date;
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  priority: 'low' | 'medium' | 'high' | 'critical';
  code: string;
  executionTime: number;
  error?: {
    message: string;
    stackTrace: string;
    expected?: any;
    actual?: any;
  };
  tags: string[];
}

export interface CoverageReport {
  overall: number;
  lines: number;
  functions: number;
  branches: number;
  statements: number;
  uncoveredLines: number[];
  filesCoverage: FileCoverage[];
}

export interface FileCoverage {
  path: string;
  name: string;
  coverage: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  uncoveredLines: number[];
  size: number;
}

export interface MutationTestResults {
  totalMutants: number;
  killedMutants: number;
  survivedMutants: number;
  score: number;
  details: MutationDetail[];
}

export interface MutationDetail {
  file: string;
  line: number;
  mutation: string;
  status: 'killed' | 'survived' | 'timeout' | 'error';
  description: string;
}

export interface CodeAnalysisResult {
  id: string;
  status: 'running' | 'completed' | 'failed';
  summary: {
    bugsFound: number;
    performanceIssues: number;
    securityVulnerabilities: number;
    refactoringOpportunities: number;
    qualityScore: number;
  };
  bugPatterns: BugPattern[];
  performanceIssues: PerformanceIssue[];
  securityVulnerabilities: SecurityVulnerability[];
  refactoringOpportunities: RefactoringOpportunity[];
  complexityMetrics: ComplexityMetrics[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BugPattern {
  id: string;
  type: string;
  severity: 'info' | 'minor' | 'major' | 'critical' | 'blocker';
  file: string;
  line: number;
  column: number;
  message: string;
  description: string;
  suggestion: string;
  confidence: number;
  ruleId: string;
}

export interface PerformanceIssue {
  id: string;
  type: string;
  severity: 'info' | 'minor' | 'major' | 'critical' | 'blocker';
  file: string;
  line: number;
  impact: 'low' | 'medium' | 'high';
  description: string;
  solution: string;
  estimatedImprovement: string;
  category: 'memory' | 'cpu' | 'io' | 'network' | 'algorithm';
}

export interface SecurityVulnerability {
  id: string;
  type: string;
  severity: 'info' | 'minor' | 'major' | 'critical' | 'blocker';
  file: string;
  line: number;
  cwe: string;
  description: string;
  remediation: string;
  riskScore: number;
  owasp: string[];
  references: string[];
}

export interface RefactoringOpportunity {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high';
  file: string;
  line: number;
  description: string;
  benefit: string;
  effort: 'low' | 'medium' | 'high';
  category: 'maintainability' | 'readability' | 'performance' | 'design';
  suggestedApproach: string;
}

export interface ComplexityMetrics {
  file: string;
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  linesOfCode: number;
  maintainabilityIndex: number;
  technicalDebt: number; // in minutes
  functions: FunctionComplexity[];
}

export interface FunctionComplexity {
  name: string;
  line: number;
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  linesOfCode: number;
  parameters: number;
  issues: string[];
}

export interface DevOpsPipeline {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'success' | 'failed' | 'cancelled';
  branch: string;
  configuration: PipelineConfiguration;
  stages: PipelineStage[];
  runs: PipelineRun[];
  triggers: PipelineTrigger[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PipelineConfiguration {
  version: string;
  environment: Record<string, string>;
  notifications: NotificationConfig[];
  timeout: number;
  retryPolicy: {
    enabled: boolean;
    maxAttempts: number;
    backoffStrategy: 'linear' | 'exponential';
  };
}

export interface PipelineStage {
  id: string;
  name: string;
  type: 'build' | 'test' | 'security' | 'deploy' | 'approval' | 'custom';
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  configuration: Record<string, any>;
  dependencies: string[];
  parallelExecution: boolean;
  timeout: number;
  artifacts?: ArtifactConfig[];
}

export interface PipelineRun {
  id: string;
  runNumber: number;
  status: 'running' | 'success' | 'failed' | 'cancelled';
  triggeredBy: string;
  triggeredAt: Date;
  completedAt?: Date;
  duration: number;
  branch: string;
  commit: {
    sha: string;
    message: string;
    author: string;
  };
  stageResults: StageResult[];
  artifacts: Artifact[];
}

export interface StageResult {
  stageId: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startTime: Date;
  endTime?: Date;
  duration: number;
  logs: LogEntry[];
  artifacts: Artifact[];
  error?: {
    code: string;
    message: string;
    details: string;
  };
}

export interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warning' | 'error';
  message: string;
  source: string;
  metadata?: Record<string, any>;
}

export interface Artifact {
  id: string;
  name: string;
  type: string;
  size: number;
  checksum: string;
  url: string;
  metadata: Record<string, any>;
  createdAt: Date;
  expiresAt?: Date;
}

export interface ArtifactConfig {
  name: string;
  path: string;
  type: 'build' | 'test' | 'report' | 'package' | 'documentation';
  retention: number; // days
  compress: boolean;
}

export interface PipelineTrigger {
  id: string;
  type: 'manual' | 'push' | 'pull_request' | 'schedule' | 'webhook';
  configuration: {
    branches?: string[];
    schedule?: string;
    conditions?: Record<string, any>;
  };
  enabled: boolean;
}

export interface NotificationConfig {
  type: 'email' | 'slack' | 'webhook';
  target: string;
  events: string[];
  template?: string;
}

export interface DeploymentTarget {
  id: string;
  name: string;
  environment: 'development' | 'staging' | 'production' | 'testing';
  status: 'healthy' | 'degraded' | 'down' | 'maintenance';
  version: string;
  lastDeployed: Date;
  url: string;
  configuration: DeploymentConfiguration;
  healthChecks: HealthCheck[];
  rollbackVersion?: string;
}

export interface DeploymentConfiguration {
  strategy: 'rolling' | 'blue_green' | 'canary' | 'recreate';
  replicas: number;
  resources: {
    cpu: string;
    memory: string;
    storage?: string;
  };
  environment: Record<string, string>;
  volumes?: VolumeMount[];
  networking: {
    ports: number[];
    protocol: 'http' | 'https' | 'tcp' | 'udp';
    loadBalancer?: LoadBalancerConfig;
  };
}

export interface HealthCheck {
  type: 'http' | 'tcp' | 'command';
  configuration: {
    endpoint?: string;
    port?: number;
    command?: string;
    expectedResponse?: string;
  };
  interval: number;
  timeout: number;
  retries: number;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastCheck: Date;
}

export interface VolumeMount {
  name: string;
  mountPath: string;
  type: 'persistent' | 'configMap' | 'secret' | 'emptyDir';
  size?: string;
  accessMode?: 'ReadWriteOnce' | 'ReadOnlyMany' | 'ReadWriteMany';
}

export interface LoadBalancerConfig {
  type: 'application' | 'network';
  algorithm: 'round_robin' | 'least_connections' | 'ip_hash';
  healthCheck: {
    path: string;
    interval: number;
    timeout: number;
    threshold: number;
  };
}

export interface ProductionMetrics {
  errors: ErrorMetric[];
  performance: PerformanceMetric[];
  userBehavior: UserBehaviorMetric[];
  featureUsage: FeatureUsageMetric[];
  systemHealth: SystemHealthMetric;
}

export interface ErrorMetric {
  id: string;
  message: string;
  type: string;
  frequency: number;
  lastOccurred: Date;
  affectedUsers: number;
  stackTrace: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  trend: 'increasing' | 'stable' | 'decreasing';
  resolution?: {
    status: 'open' | 'investigating' | 'resolved';
    assignee?: string;
    estimatedFix?: Date;
  };
}

export interface PerformanceMetric {
  timestamp: Date;
  responseTime: number;
  throughput: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIO: number;
  activeConnections: number;
  queueDepth?: number;
}

export interface UserBehaviorMetric {
  id: string;
  action: string;
  page: string;
  userCount: number;
  avgDuration: number;
  conversionRate: number;
  bounceRate: number;
  timestamp: Date;
  segment?: string;
  cohort?: string;
}

export interface FeatureUsageMetric {
  id: string;
  name: string;
  usage: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  userSatisfaction: number;
  lastUpdated: Date;
  adoption: number;
  retention: number;
  segments: {
    newUsers: number;
    returningUsers: number;
    powerUsers: number;
  };
}

export interface SystemHealthMetric {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  availability: number;
  lastIncident?: Date;
  serviceStatus: ServiceStatus[];
  dependencies: DependencyStatus[];
}

export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  errorRate: number;
  throughput: number;
  lastHealthCheck: Date;
  endpoints: EndpointStatus[];
}

export interface EndpointStatus {
  path: string;
  method: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  errorRate: number;
  requestCount: number;
}

export interface DependencyStatus {
  name: string;
  type: 'database' | 'cache' | 'queue' | 'external_api' | 'service';
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  availability: number;
  lastCheck: Date;
}

export interface ImprovementSuggestion {
  id: string;
  type: 'performance' | 'security' | 'maintainability' | 'user_experience' | 'cost';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  roi: number;
  category: string;
  tags: string[];
  evidence: Evidence[];
  implementation: ImplementationPlan;
  createdAt: Date;
  updatedAt: Date;
}

export interface Evidence {
  type: 'metric' | 'analysis' | 'user_feedback' | 'benchmark';
  data: any;
  source: string;
  confidence: number;
}

export interface ImplementationPlan {
  steps: string[];
  timeline: string;
  resources: string[];
  risks: string[];
  dependencies: string[];
  successCriteria: string[];
}

// Export development visualization props interfaces
export interface DevelopmentVisualizationProps {
  viewMode?: 'overview' | 'detailed';
  isLoading?: boolean;
  autoRefresh?: boolean;
  projectId?: string;
  timeRange?: '1h' | '6h' | '24h' | '7d' | '30d';
  refreshInterval?: number;
}

export interface VisualizationTheme {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  background: string;
  surface: string;
  text: string;
}

export interface AnimationConfig {
  duration: number;
  ease: string;
  delay?: number;
  stagger?: number;
}

// Re-export common types
export type { ChartType, ColorScheme } from './visualizations';
