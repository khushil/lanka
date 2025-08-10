export interface DevOpsConfiguration {
  project: {
    name: string;
    type: 'web-application' | 'microservices' | 'mobile-app' | 'backend-service';
    technologies: string[];
    environments: string[];
  };
  requirements: {
    cicd?: {
      platform: 'github-actions' | 'jenkins' | 'gitlab-ci' | 'circleci';
      triggers: string[];
      stages: string[];
    };
    deployment?: {
      strategy: 'blue-green' | 'canary' | 'rolling';
      rollback: boolean;
      zeroDowntime: boolean;
    };
    infrastructure?: {
      provider: 'aws' | 'azure' | 'gcp';
      container: 'kubernetes' | 'docker-swarm';
      scaling: boolean;
    };
    monitoring?: {
      metrics: boolean;
      logging: boolean;
      alerting: boolean;
    };
  };
}

export interface CICDConfiguration {
  platform: 'github-actions' | 'jenkins' | 'gitlab-ci' | 'circleci';
  currentWorkflow: {
    name: string;
    steps: any[];
    triggers: string[];
  };
  metrics: {
    averageBuildTime: number;
    successRate: number;
    failureReasons: string[];
  };
}

export interface WorkflowTemplate {
  platform: string;
  name: string;
  content: string;
  features: string[];
  estimatedBuildTime: number;
  securityFeatures: string[];
}

export interface PipelineOptimization {
  originalMetrics: any;
  optimizedWorkflow: WorkflowTemplate;
  improvements: any[];
  projectedMetrics: any;
  implementation: any;
}

export interface DeploymentStrategy {
  type: 'blue-green' | 'canary' | 'rolling';
  configuration: any;
  automationSteps: any[];
  rollbackProcedure: any;
}

export interface DeploymentConfiguration {
  application: {
    name: string;
    type: string;
    runtime: string;
    dependencies: string[];
    version?: string;
  };
  target: {
    platform: string;
    provider: string;
    region: string;
  };
  requirements: {
    zeroDowntime?: boolean;
    rollbackCapability?: boolean;
    trafficSplitting?: boolean;
    gradualRollout?: boolean;
  };
}

export interface Environment {
  name: string;
  type: 'dev' | 'staging' | 'prod';
  requirements?: {
    performance?: string;
    security?: string;
    monitoring?: string;
    backup?: boolean;
    compliance?: string[];
  };
}

export interface InfrastructureRequirements {
  provider: 'aws' | 'azure' | 'gcp';
  region: string;
  components: {
    compute?: {
      type: string;
      instances: Array<{
        name: string;
        type: string;
        count: number;
      }>;
    };
    database?: {
      type: string;
      engine?: string;
      version?: string;
      instanceClass?: string;
      storage?: number;
      multiAZ?: boolean;
      tier?: string;
      capacity?: number;
    };
    networking?: {
      vpc: { cidr: string };
      subnets?: Array<{
        name: string;
        cidr: string;
        az?: string;
      }>;
      loadBalancer?: {
        type: string;
        scheme?: string;
      };
    };
    storage?: {
      s3Buckets?: Array<{
        name: string;
        versioning?: boolean;
        lifecycle?: boolean;
      }>;
    };
  };
  security?: {
    encryption?: boolean;
    backups?: boolean;
    monitoring?: boolean;
  };
}

export interface IaCTemplate {
  provider: string;
  files: Record<string, string>;
  modules: any[];
  variables: any;
  outputs: any;
}

export interface MonitoringRequirements {
  targets: Array<{
    name: string;
    url: string;
    interval: string;
  }>;
  retention: string;
  storage: string;
  alerting?: {
    enabled: boolean;
    rules: Array<{
      name: string;
      condition: string;
      for: string;
      severity: string;
    }>;
  };
  grafana?: {
    enabled: boolean;
    dashboards: string[];
  };
}

export interface AlertingConfig {
  application?: {
    rules: Array<{
      name: string;
      expr: string;
      for: string;
      severity: string;
      summary?: string;
      description?: string;
    }>;
  };
  infrastructure?: {
    rules: Array<{
      name: string;
      expr: string;
      for: string;
      severity: string;
      summary?: string;
      description?: string;
    }>;
  };
  business?: {
    rules: Array<{
      name: string;
      expr: string;
      for: string;
      severity: string;
      summary?: string;
      description?: string;
    }>;
  };
}

export interface MetricsConfig {
  http?: string[];
  database?: string[];
  cache?: string[];
  business?: string[];
}

export interface IncidentAlert {
  id: string;
  severity: 'critical' | 'major' | 'minor' | 'warning';
  service: string;
  title: string;
  description: string;
  metrics?: {
    errorRate?: number;
    responseTime?: number;
    availability?: number;
  };
  timestamp: Date;
  source: string;
  tags?: string[];
}

export interface ResponsePlan {
  incident: any;
  immediateActions: any[];
  diagnostics: any;
  communication: any;
  escalation: any;
}

export interface EscalationPolicy {
  name: string;
  levels: Array<{
    level: number;
    name: string;
    contacts: any[];
    timeout: string;
  }>;
  rules: any[];
  schedule: any;
  overrides: any;
}

export interface ProductionMetrics {
  performance?: {
    responseTime?: {
      p50?: number;
      p95?: number;
      p99?: number;
    };
    errorRate?: {
      percentage: number;
    };
    throughput?: {
      requestsPerSecond: number;
    };
  };
  features?: Array<{
    name: string;
    usage: number;
    performance: number;
  }>;
  issues?: Array<{
    type: string;
    severity: string;
    description: string;
    frequency: number;
    impact: string;
  }>;
}

export interface FeedbackLoop {
  insights: Array<{
    category: string;
    priority: string;
    title: string;
    description: string;
    metrics?: any;
    recommendations?: any[];
  }>;
  developmentActions: Array<{
    type: string;
    priority: string;
    title: string;
    description: string;
    assignee?: string;
    sprint?: string;
    estimatedEffort?: string;
  }>;
  monitoring?: {
    newMetrics: any[];
    alerts: any[];
  };
  testing?: {
    scenarios: any[];
    automation: any[];
  };
}

export interface PerformanceInsights {
  summary: {
    overallHealth: string;
    criticalIssues: number;
    warnings: number;
    recommendations: number;
  };
  bottlenecks: Array<{
    component: string;
    type: string;
    severity: string;
    impact: string;
    solution: {
      immediate: string[];
      longTerm: string[];
    };
  }>;
  optimizations: Array<{
    category: string;
    description: string;
    expectedImprovement: string;
    implementation: {
      effort: string;
      timeline: string;
      steps: string[];
    };
  }>;
  trends: {
    performance: {
      direction: string;
      changeRate: number;
    };
    usage: {
      growth: number;
      forecast: any[];
    };
  };
  alerts: Array<{
    metric: string;
    threshold: number;
    current: number;
    severity: string;
  }>;
}

export interface PipelineRequest {
  projectId: string;
  configuration: DevOpsConfiguration;
  priority: 'low' | 'medium' | 'high';
}

export interface InfrastructureRequest {
  projectId: string;
  requirements: InfrastructureRequirements;
  timeline: string;
}

export interface CloudProvider {
  name: 'aws' | 'azure' | 'gcp';
  region: string;
  credentials?: any;
}