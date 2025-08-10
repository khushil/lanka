import { BaseEntity } from './base.types';

export interface SemanticSearchResult {
  filePath: string;
  content: string;
  relevanceScore: number;
  lineNumber: number;
  context?: string;
  matchedTerms: string[];
}

export interface SemanticSearchOptions {
  includeTests?: boolean;
  maxResults?: number;
  fileTypes?: string[];
  excludePatterns?: string[];
  minRelevanceScore?: number;
}

export interface BugPattern {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: {
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
  };
  suggestion: string;
  confidence: number;
  category: 'logic' | 'syntax' | 'runtime' | 'security' | 'performance';
}

export interface PerformanceIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: {
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
  };
  impact: string;
  suggestion: string;
  estimatedImpact: {
    timeComplexity?: string;
    spaceComplexity?: string;
    networkCalls?: number;
    memoryUsage?: string;
  };
}

export interface SecurityVulnerability {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: {
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
  };
  cwe?: string;
  owasp?: string;
  remediation: string;
  impact: string;
  exploitability: number;
}

export interface QualityMetrics {
  complexity: number;
  maintainability: number;
  testability: number;
  readability: number;
  linesOfCode: number;
  commentRatio: number;
  duplicateCode: {
    percentage: number;
    blocks: Array<{
      lines: number;
      occurrences: number;
      locations: Array<{ file: string; startLine: number; endLine: number }>;
    }>;
  };
  technicalDebt: {
    todos: number;
    fixmes: number;
    hacks: number;
    estimatedHours: number;
  };
}

export interface RefactoringOpportunity {
  type: 'extract_method' | 'extract_class' | 'inline_method' | 'move_method' | 'rename' | 'duplicate_code' | 'large_class' | 'long_parameter_list' | 'long_method';
  description: string;
  location: {
    file: string;
    startLine: number;
    endLine: number;
    startColumn?: number;
    endColumn?: number;
  };
  priority: 'low' | 'medium' | 'high';
  effort: 'small' | 'medium' | 'large';
  benefits: string[];
  suggestedRefactoring: string;
  affectedFiles?: string[];
}

export interface CodeStructureAnalysis {
  functions: Array<{
    name: string;
    parameters: string[];
    returnType?: string;
    complexity: number;
    location: { startLine: number; endLine: number };
  }>;
  classes: Array<{
    name: string;
    methods: Array<{
      name: string;
      parameters: string[];
      returnType?: string;
      visibility: 'public' | 'private' | 'protected';
      isStatic: boolean;
    }>;
    properties: Array<{
      name: string;
      type?: string;
      visibility: 'public' | 'private' | 'protected';
      isStatic: boolean;
    }>;
    location: { startLine: number; endLine: number };
  }>;
  imports: Array<{
    module: string;
    imports: string[];
    location: { line: number };
  }>;
  exports: Array<{
    name: string;
    type: 'default' | 'named';
    location: { line: number };
  }>;
}

export interface CodePattern {
  type: string;
  confidence: number;
  description: string;
  examples?: string[];
  relatedPatterns?: string[];
}

export interface PatternFeedback {
  codeId: string;
  predictedPattern: string;
  actualPattern: string;
  accuracy: number;
  userId?: string;
  timestamp?: Date;
}

export interface ProjectPattern {
  projectId: string;
  patterns: string[];
  metadata: {
    language: string;
    framework?: string;
    domain?: string;
    size: 'small' | 'medium' | 'large';
  };
}

export interface CrossProjectInsight {
  pattern: string;
  frequency: number;
  projects: string[];
  effectiveness: number;
  contexts: string[];
}

export interface PatternRecommendation {
  pattern: string;
  confidence: number;
  reason: string;
  examples?: string[];
  benefits: string[];
  implementation: string;
}

export interface CodeAnalysisOptions {
  enableMLPatterns?: boolean;
  securityLevel?: 'basic' | 'standard' | 'strict';
  performanceThreshold?: number;
  excludePatterns?: string[];
  includeExperimental?: boolean;
  maxFileSize?: number;
  timeout?: number;
}

export interface ArchitectureAlignment {
  score: number;
  issues: Array<{
    type: string;
    description: string;
    severity: 'info' | 'warning' | 'error';
    suggestion: string;
  }>;
  recommendations: string[];
}

export interface CodeAnalysisResult {
  filePath: string;
  language: string;
  metrics: QualityMetrics;
  bugPatterns: BugPattern[];
  performanceIssues: PerformanceIssue[];
  securityVulnerabilities: SecurityVulnerability[];
  refactoringOpportunities: RefactoringOpportunity[];
  codePatterns: CodePattern[];
  errors?: Array<{
    type: string;
    message: string;
    location?: { line: number; column: number };
  }>;
  executionTime: number;
  timestamp: Date;
}

export interface MLModelInfo {
  name: string;
  version: string;
  accuracy: number;
  trainingData: number;
  lastUpdated: Date;
  features: string[];
}

export interface LearnedPatternsExport {
  version: string;
  timestamp: Date;
  patterns: Array<{
    name: string;
    definition: any;
    usage: number;
    effectiveness: number;
  }>;
  metadata: {
    projectCount: number;
    codebaseSize: number;
    languages: string[];
  };
}

export interface DevelopmentRequest extends BaseEntity {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  dependencies?: string[];
  requirements?: string[];
}

export interface DevelopmentTask extends BaseEntity {
  requestId: string;
  title: string;
  description: string;
  type: 'feature' | 'bug' | 'refactor' | 'test' | 'documentation';
  status: 'todo' | 'in_progress' | 'review' | 'testing' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  estimatedHours?: number;
  actualHours?: number;
  branch?: string;
  pullRequest?: string;
  testCoverage?: number;
  codeQualityScore?: number;
}

export interface CodeReview extends BaseEntity {
  taskId: string;
  reviewerId: string;
  status: 'pending' | 'approved' | 'changes_requested' | 'rejected';
  comments: Array<{
    line: number;
    file: string;
    comment: string;
    severity: 'info' | 'suggestion' | 'warning' | 'error';
  }>;
  overallRating: number;
  suggestions: string[];
  securityIssues: SecurityVulnerability[];
  performanceIssues: PerformanceIssue[];
}

export interface TestResult extends BaseEntity {
  taskId: string;
  testSuite: string;
  passed: number;
  failed: number;
  skipped: number;
  coverage: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  duration: number;
  failures: Array<{
    test: string;
    error: string;
    stack?: string;
  }>;
}

export interface DeploymentInfo extends BaseEntity {
  taskId: string;
  environment: 'development' | 'staging' | 'production';
  version: string;
  status: 'pending' | 'in_progress' | 'success' | 'failed' | 'rolled_back';
  deployedAt: Date;
  deployedBy: string;
  rollbackVersion?: string;
  healthChecks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message?: string;
  }>;
}