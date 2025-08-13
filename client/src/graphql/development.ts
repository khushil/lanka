import { gql } from '@apollo/client';

// Code Generation Queries
export const GENERATE_CODE = gql`
  mutation GenerateCode($input: CodeGenerationInput!) {
    generateCode(input: $input) {
      id
      code
      language
      qualityScore
      suggestions
      dependencies
      template {
        id
        name
        type
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_CODE_TEMPLATES = gql`
  query GetCodeTemplates($language: String, $type: TemplateType) {
    codeTemplates(language: $language, type: $type) {
      id
      name
      description
      type
      language
      complexity
      content
      parameters
      examples
      createdAt
      updatedAt
    }
  }
`;

export const SAVE_GENERATED_CODE = gql`
  mutation SaveGeneratedCode($input: SaveCodeInput!) {
    saveGeneratedCode(input: $input) {
      id
      filename
      path
      content
      metadata
      version
      createdAt
    }
  }
`;

// Test Generation Queries
export const GENERATE_TESTS = gql`
  mutation GenerateTests($input: TestGenerationInput!) {
    generateTests(input: $input) {
      id
      testSuite {
        id
        name
        type
        coverage
        tests {
          id
          name
          description
          priority
          status
          code
          executionTime
        }
      }
      coverageReport {
        overall
        lines
        functions
        branches
        statements
        uncoveredLines
      }
      mutationResults {
        totalMutants
        killedMutants
        survivedMutants
        score
        details {
          file
          line
          mutation
          status
        }
      }
      createdAt
    }
  }
`;

export const RUN_TESTS = gql`
  mutation RunTests($input: RunTestsInput!) {
    runTests(input: $input) {
      id
      status
      results {
        passed
        failed
        pending
        total
        executionTime
      }
      testResults {
        id
        name
        status
        duration
        error
        stackTrace
      }
      coverage {
        overall
        lines
        functions
        branches
        statements
      }
      createdAt
    }
  }
`;

export const GET_TEST_FRAMEWORKS = gql`
  query GetTestFrameworks {
    testFrameworks {
      id
      name
      language
      type
      features
      configuration
    }
  }
`;

// Code Analysis Queries
export const ANALYZE_CODE = gql`
  mutation AnalyzeCode($input: CodeAnalysisInput!) {
    analyzeCode(input: $input) {
      id
      bugPatterns {
        id
        type
        severity
        file
        line
        column
        message
        description
        suggestion
        confidence
      }
      performanceIssues {
        id
        type
        severity
        file
        line
        impact
        description
        solution
        estimatedImprovement
      }
      securityVulnerabilities {
        id
        type
        severity
        file
        line
        cwe
        description
        remediation
        riskScore
      }
      refactoringOpportunities {
        id
        type
        priority
        file
        line
        description
        benefit
        effort
      }
      complexityMetrics {
        file
        cyclomaticComplexity
        cognitiveComplexity
        linesOfCode
        maintainabilityIndex
        technicalDebt
      }
      createdAt
    }
  }
`;

export const GET_ANALYSIS_HISTORY = gql`
  query GetAnalysisHistory($projectId: ID!, $limit: Int, $offset: Int) {
    analysisHistory(projectId: $projectId, limit: $limit, offset: $offset) {
      id
      type
      status
      summary {
        bugsFound
        performanceIssues
        securityVulnerabilities
        refactoringOpportunities
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_CODE_QUALITY_TRENDS = gql`
  query GetCodeQualityTrends($projectId: ID!, $timeRange: String!) {
    codeQualityTrends(projectId: $projectId, timeRange: $timeRange) {
      timestamp
      qualityScore
      maintainabilityIndex
      technicalDebt
      bugCount
      securityIssues
      testCoverage
    }
  }
`;

// DevOps Configuration Queries
export const GET_DEVOPS_CONFIG = gql`
  query GetDevOpsConfig($projectId: ID!) {
    devopsConfig(projectId: $projectId) {
      id
      pipelines {
        id
        name
        status
        branch
        lastRun
        duration
        stages {
          id
          name
          status
          duration
          logs
        }
      }
      deploymentTargets {
        id
        name
        environment
        status
        version
        lastDeployed
        url
        configuration
      }
      infrastructureTemplates {
        id
        name
        type
        description
        resources
        template
        parameters
      }
      monitoringConfigs {
        id
        name
        type
        status
        config
        alerts
      }
    }
  }
`;

export const CREATE_PIPELINE = gql`
  mutation CreatePipeline($input: CreatePipelineInput!) {
    createPipeline(input: $input) {
      id
      name
      configuration
      status
      stages {
        id
        name
        configuration
        dependencies
      }
      createdAt
    }
  }
`;

export const TRIGGER_PIPELINE = gql`
  mutation TriggerPipeline($pipelineId: ID!, $branch: String, $parameters: JSON) {
    triggerPipeline(pipelineId: $pipelineId, branch: $branch, parameters: $parameters) {
      id
      runId
      status
      triggeredBy
      triggeredAt
      estimatedDuration
    }
  }
`;

export const DEPLOY_APPLICATION = gql`
  mutation DeployApplication($input: DeploymentInput!) {
    deployApplication(input: $input) {
      id
      deploymentId
      target {
        id
        name
        environment
      }
      status
      version
      rollbackVersion
      deployedAt
      deployedBy
    }
  }
`;

export const GET_INFRASTRUCTURE_TEMPLATES = gql`
  query GetInfrastructureTemplates($type: InfrastructureType, $provider: String) {
    infrastructureTemplates(type: $type, provider: $provider) {
      id
      name
      type
      provider
      description
      resources
      template
      parameters
      examples
      tags
    }
  }
`;

export const PROVISION_INFRASTRUCTURE = gql`
  mutation ProvisionInfrastructure($input: ProvisionInfrastructureInput!) {
    provisionInfrastructure(input: $input) {
      id
      status
      resources {
        id
        type
        name
        status
        configuration
      }
      logs
      estimatedTime
      createdAt
    }
  }
`;

// Production Metrics Queries
export const GET_PRODUCTION_METRICS = gql`
  query GetProductionMetrics($timeRange: String!, $environment: String) {
    productionMetrics(timeRange: $timeRange, environment: $environment) {
      errors {
        id
        message
        type
        frequency
        lastOccurred
        affectedUsers
        stackTrace
        severity
        trend
      }
      performance {
        timestamp
        responseTime
        throughput
        errorRate
        cpuUsage
        memoryUsage
        diskUsage
        networkIO
      }
      userBehavior {
        id
        action
        page
        userCount
        avgDuration
        conversionRate
        bounceRate
        timestamp
      }
      featureUsage {
        id
        name
        usage
        trend
        userSatisfaction
        lastUpdated
        adoption
        retention
      }
      systemHealth {
        status
        uptime
        availability
        serviceStatus {
          name
          status
          latency
          errorRate
        }
      }
    }
  }
`;

export const GET_ERROR_ANALYTICS = gql`
  query GetErrorAnalytics($timeRange: String!, $severity: String, $type: String) {
    errorAnalytics(timeRange: $timeRange, severity: $severity, type: $type) {
      summary {
        totalErrors
        newErrors
        resolvedErrors
        affectedUsers
        errorRate
      }
      trends {
        timestamp
        count
        severity
        type
      }
      topErrors {
        id
        message
        frequency
        impact
        firstSeen
        lastSeen
      }
      resolutionTime {
        average
        median
        percentile95
      }
    }
  }
`;

export const GET_PERFORMANCE_INSIGHTS = gql`
  query GetPerformanceInsights($timeRange: String!, $metric: String) {
    performanceInsights(timeRange: $timeRange, metric: $metric) {
      summary {
        avgResponseTime
        p95ResponseTime
        throughput
        errorRate
        uptime
      }
      trends {
        timestamp
        responseTime
        throughput
        errorRate
        activeUsers
      }
      bottlenecks {
        id
        type
        description
        impact
        location
        suggestion
      }
      recommendations {
        id
        type
        priority
        title
        description
        impact
        effort
        roi
      }
    }
  }
`;

export const GET_USER_BEHAVIOR_ANALYTICS = gql`
  query GetUserBehaviorAnalytics($timeRange: String!, $segment: String) {
    userBehaviorAnalytics(timeRange: $timeRange, segment: $segment) {
      summary {
        activeUsers
        sessions
        pageViews
        avgSessionDuration
        bounceRate
      }
      userJourney {
        step
        users
        conversionRate
        dropOffRate
        avgTime
      }
      featureAdoption {
        feature
        adoption
        retention
        satisfaction
        trend
      }
      heatmapData {
        page
        element
        clicks
        hovers
        scrollDepth
      }
    }
  }
`;

export const GET_IMPROVEMENT_SUGGESTIONS = gql`
  query GetImprovementSuggestions($projectId: ID!, $category: String) {
    improvementSuggestions(projectId: $projectId, category: $category) {
      id
      type
      priority
      title
      description
      impact
      effort
      roi
      category
      tags
      evidence {
        type
        data
        source
      }
      implementation {
        steps
        timeline
        resources
      }
      createdAt
      updatedAt
    }
  }
`;

// Real-time Subscriptions
export const PIPELINE_STATUS_SUBSCRIPTION = gql`
  subscription PipelineStatusUpdates($pipelineId: ID!) {
    pipelineStatusUpdates(pipelineId: $pipelineId) {
      id
      status
      currentStage
      progress
      logs
      timestamp
    }
  }
`;

export const DEPLOYMENT_STATUS_SUBSCRIPTION = gql`
  subscription DeploymentStatusUpdates($deploymentId: ID!) {
    deploymentStatusUpdates(deploymentId: $deploymentId) {
      id
      status
      progress
      logs
      healthChecks
      timestamp
    }
  }
`;

export const PRODUCTION_ALERTS_SUBSCRIPTION = gql`
  subscription ProductionAlerts($environment: String!) {
    productionAlerts(environment: $environment) {
      id
      type
      severity
      message
      source
      timestamp
      metadata
    }
  }
`;

export const ERROR_TRACKING_SUBSCRIPTION = gql`
  subscription ErrorTracking {
    errorTracking {
      id
      message
      type
      severity
      stackTrace
      userAgent
      timestamp
      user {
        id
        email
      }
    }
  }
`;

// Input Types (TypeScript interfaces for better type safety)
export interface CodeGenerationInput {
  template: string;
  language: string;
  requirements: string;
  architecture?: string;
  parameters?: Record<string, any>;
}

export interface TestGenerationInput {
  sourceCode: string;
  framework: string;
  testType: 'unit' | 'integration' | 'e2e' | 'snapshot' | 'performance';
  coverage?: boolean;
  mutation?: boolean;
}

export interface CodeAnalysisInput {
  projectId: string;
  files?: string[];
  analysisType: 'all' | 'bugs' | 'performance' | 'security' | 'refactoring' | 'complexity';
  excludePatterns?: string[];
}

export interface CreatePipelineInput {
  name: string;
  projectId: string;
  configuration: Record<string, any>;
  triggers: string[];
  stages: PipelineStageInput[];
}

export interface PipelineStageInput {
  name: string;
  type: string;
  configuration: Record<string, any>;
  dependencies?: string[];
}

export interface DeploymentInput {
  targetId: string;
  version: string;
  configuration?: Record<string, any>;
  rollbackVersion?: string;
}

export interface ProvisionInfrastructureInput {
  templateId: string;
  parameters: Record<string, any>;
  environment: string;
  region?: string;
}

export interface SaveCodeInput {
  code: string;
  filename: string;
  path: string;
  metadata?: Record<string, any>;
}

export interface RunTestsInput {
  testSuiteId?: string;
  framework: string;
  testFiles?: string[];
  configuration?: Record<string, any>;
}