import { gql } from '@apollo/client';

// Architecture Patterns
export const GET_ARCHITECTURE_PATTERNS = gql`
  query GetArchitecturePatterns($category: String, $tags: [String!]) {
    architecturePatterns(category: $category, tags: $tags) {
      id
      name
      description
      category
      tags
      complexity
      usageCount
      successRate
      components {
        id
        name
        type
        position {
          x
          y
        }
        properties
      }
      connections {
        id
        source
        target
        type
        properties
      }
      benefits
      tradeoffs
      examples {
        company
        useCase
        outcome
      }
      metrics {
        performance
        scalability
        maintainability
        security
      }
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_ARCHITECTURE_PATTERN = gql`
  mutation CreateArchitecturePattern($input: ArchitecturePatternInput!) {
    createArchitecturePattern(input: $input) {
      id
      name
      description
      category
      tags
    }
  }
`;

// Technology Stacks
export const GET_TECHNOLOGY_STACKS = gql`
  query GetTechnologyStacks($requirements: TechnologyRequirementsInput!) {
    technologyStacks(requirements: $requirements) {
      id
      name
      description
      category
      technologies {
        name
        version
        type
        popularity
        learningCurve
        communitySupport
        maintenance
        license
      }
      compatibility
      totalCost {
        development
        hosting
        maintenance
        licensing
      }
      performance {
        throughput
        latency
        scalability
        reliability
      }
      pros
      cons
      useCases
      companies
      marketShare
      trend
      recommendation {
        score
        reasoning
      }
    }
  }
`;

export const COMPARE_TECHNOLOGY_STACKS = gql`
  query CompareTechnologyStacks($stackIds: [ID!]!) {
    compareTechnologyStacks(stackIds: $stackIds) {
      stacks {
        id
        name
        technologies {
          name
          type
        }
      }
      comparison {
        criteria
        scores
        weights
        recommendation
      }
      costAnalysis {
        development
        hosting
        maintenance
        total
      }
      performanceMetrics {
        throughput
        latency
        scalability
      }
    }
  }
`;

// Cloud Recommendations
export const GET_CLOUD_RECOMMENDATIONS = gql`
  query GetCloudRecommendations($architecture: ArchitectureInput!, $requirements: CloudRequirementsInput!) {
    cloudRecommendations(architecture: $architecture, requirements: $requirements) {
      provider
      services {
        component
        service
        tier
        configuration
        cost {
          monthly
          yearly
          payAsYouGo
        }
        performance {
          cpu
          memory
          storage
          bandwidth
        }
        alternatives {
          service
          costDifference
          performanceDifference
        }
      }
      totalCost {
        monthly
        yearly
        breakdown {
          compute
          storage
          network
          services
        }
      }
      deployment {
        regions
        availabilityZones
        networking
        security
      }
      optimization {
        suggestions
        potentialSavings
        performanceImpact
      }
    }
  }
`;

export const GENERATE_INFRASTRUCTURE_CODE = gql`
  mutation GenerateInfrastructureCode($input: InfrastructureCodeInput!) {
    generateInfrastructureCode(input: $input) {
      terraform {
        main
        variables
        outputs
        modules
      }
      kubernetes {
        deployments
        services
        ingress
        configMaps
      }
      docker {
        dockerfile
        dockerCompose
      }
      cloudFormation {
        template
        parameters
      }
      ansible {
        playbooks
        inventory
      }
    }
  }
`;

// Architecture Decision Records
export const GET_ARCHITECTURE_DECISIONS = gql`
  query GetArchitectureDecisions($projectId: ID!, $status: DecisionStatus) {
    architectureDecisions(projectId: $projectId, status: $status) {
      id
      title
      status
      context
      decision
      consequences
      alternatives {
        option
        pros
        cons
        impact
      }
      stakeholders {
        name
        role
        approval
        comments
      }
      tags
      priority
      impact {
        technical
        business
        timeline
        cost
      }
      createdBy {
        id
        name
      }
      createdAt
      decidedAt
      reviewedAt
      updatedAt
    }
  }
`;

export const CREATE_ARCHITECTURE_DECISION = gql`
  mutation CreateArchitectureDecision($input: ArchitectureDecisionInput!) {
    createArchitectureDecision(input: $input) {
      id
      title
      status
      context
      decision
      consequences
      createdAt
    }
  }
`;

export const UPDATE_ARCHITECTURE_DECISION = gql`
  mutation UpdateArchitectureDecision($id: ID!, $input: ArchitectureDecisionUpdateInput!) {
    updateArchitectureDecision(id: $id, input: $input) {
      id
      title
      status
      decision
      updatedAt
    }
  }
`;

// Architecture Analysis
export const ANALYZE_ARCHITECTURE = gql`
  query AnalyzeArchitecture($architecture: ArchitectureInput!) {
    analyzeArchitecture(architecture: $architecture) {
      complexity {
        score
        factors
        recommendations
      }
      security {
        vulnerabilities
        recommendations
        compliance
      }
      performance {
        bottlenecks
        optimization
        scalability
      }
      maintainability {
        score
        codeSmells
        refactoring
      }
      cost {
        estimation
        breakdown
        optimization
      }
      antiPatterns {
        detected
        impact
        solutions
      }
    }
  }
`;

// Architecture Validation
export const VALIDATE_ARCHITECTURE = gql`
  mutation ValidateArchitecture($architecture: ArchitectureInput!, $constraints: [ConstraintInput!]!) {
    validateArchitecture(architecture: $architecture, constraints: $constraints) {
      isValid
      violations {
        constraint
        severity
        message
        suggestions
      }
      score
      improvements {
        suggestion
        impact
        effort
      }
    }
  }
`;

// Export Types
export interface ArchitecturePattern {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  complexity: number;
  usageCount: number;
  successRate: number;
  components: Component[];
  connections: Connection[];
  benefits: string[];
  tradeoffs: string[];
  examples: Example[];
  metrics: Metrics;
  createdAt: string;
  updatedAt: string;
}

export interface Component {
  id: string;
  name: string;
  type: string;
  position: Position;
  properties: Record<string, any>;
}

export interface Connection {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, any>;
}

export interface Position {
  x: number;
  y: number;
}

export interface Example {
  company: string;
  useCase: string;
  outcome: string;
}

export interface Metrics {
  performance: number;
  scalability: number;
  maintainability: number;
  security: number;
}

export interface TechnologyStack {
  id: string;
  name: string;
  description: string;
  category: string;
  technologies: Technology[];
  compatibility: number;
  totalCost: Cost;
  performance: Performance;
  pros: string[];
  cons: string[];
  useCases: string[];
  companies: string[];
  marketShare: number;
  trend: string;
  recommendation: Recommendation;
}

export interface Technology {
  name: string;
  version: string;
  type: string;
  popularity: number;
  learningCurve: number;
  communitySupport: number;
  maintenance: number;
  license: string;
}

export interface Cost {
  development: number;
  hosting: number;
  maintenance: number;
  licensing: number;
}

export interface Performance {
  throughput: number;
  latency: number;
  scalability: number;
  reliability: number;
}

export interface Recommendation {
  score: number;
  reasoning: string;
}

export interface CloudRecommendation {
  provider: string;
  services: CloudService[];
  totalCost: TotalCost;
  deployment: Deployment;
  optimization: Optimization;
}

export interface CloudService {
  component: string;
  service: string;
  tier: string;
  configuration: Record<string, any>;
  cost: ServiceCost;
  performance: ServicePerformance;
  alternatives: Alternative[];
}

export interface ServiceCost {
  monthly: number;
  yearly: number;
  payAsYouGo: number;
}

export interface ServicePerformance {
  cpu: string;
  memory: string;
  storage: string;
  bandwidth: string;
}

export interface Alternative {
  service: string;
  costDifference: number;
  performanceDifference: number;
}

export interface TotalCost {
  monthly: number;
  yearly: number;
  breakdown: CostBreakdown;
}

export interface CostBreakdown {
  compute: number;
  storage: number;
  network: number;
  services: number;
}

export interface Deployment {
  regions: string[];
  availabilityZones: string[];
  networking: Record<string, any>;
  security: Record<string, any>;
}

export interface Optimization {
  suggestions: string[];
  potentialSavings: number;
  performanceImpact: string;
}

export interface ArchitectureDecision {
  id: string;
  title: string;
  status: DecisionStatus;
  context: string;
  decision: string;
  consequences: string;
  alternatives: Alternative[];
  stakeholders: Stakeholder[];
  tags: string[];
  priority: Priority;
  impact: Impact;
  createdBy: User;
  createdAt: string;
  decidedAt?: string;
  reviewedAt?: string;
  updatedAt: string;
}

export interface Stakeholder {
  name: string;
  role: string;
  approval: boolean;
  comments: string;
}

export interface Impact {
  technical: number;
  business: number;
  timeline: number;
  cost: number;
}

export interface User {
  id: string;
  name: string;
}

export enum DecisionStatus {
  PROPOSED = 'PROPOSED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUPERSEDED = 'SUPERSEDED'
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}