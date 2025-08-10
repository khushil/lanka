/**
 * Development Intelligence Types
 * Defines the core types for the development intelligence module
 */
export interface DevelopmentTask {
    id: string;
    title: string;
    description: string;
    type: TaskType;
    priority: Priority;
    status: TaskStatus;
    assignee?: string;
    estimatedHours?: number;
    actualHours?: number;
    requirements: string[];
    architecture: string[];
    dependencies: string[];
    testCriteria: string[];
    createdAt: Date;
    updatedAt: Date;
    dueDate?: Date;
    tags: string[];
    metadata: Record<string, unknown>;
}
export declare enum TaskType {
    FEATURE = "FEATURE",
    BUG_FIX = "BUG_FIX",
    REFACTOR = "REFACTOR",
    DOCUMENTATION = "DOCUMENTATION",
    TESTING = "TESTING",
    DEPLOYMENT = "DEPLOYMENT",
    RESEARCH = "RESEARCH",
    OPTIMIZATION = "OPTIMIZATION"
}
export declare enum Priority {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    CRITICAL = "CRITICAL"
}
export declare enum TaskStatus {
    BACKLOG = "BACKLOG",
    TODO = "TODO",
    IN_PROGRESS = "IN_PROGRESS",
    IN_REVIEW = "IN_REVIEW",
    TESTING = "TESTING",
    DONE = "DONE",
    BLOCKED = "BLOCKED"
}
export interface CodeGeneration {
    id: string;
    taskId: string;
    language: string;
    framework?: string;
    template: string;
    generatedCode: string;
    quality: QualityMetrics;
    suggestions: string[];
    createdAt: Date;
    metadata: Record<string, unknown>;
}
export interface QualityMetrics {
    complexity: number;
    maintainability: number;
    testability: number;
    performance: number;
    security: number;
    overall: number;
    issues: QualityIssue[];
}
export interface QualityIssue {
    type: 'ERROR' | 'WARNING' | 'INFO';
    severity: Priority;
    message: string;
    line?: number;
    column?: number;
    rule?: string;
}
export interface DevelopmentWorkflow {
    id: string;
    name: string;
    description: string;
    steps: WorkflowStep[];
    triggers: WorkflowTrigger[];
    conditions: WorkflowCondition[];
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface WorkflowStep {
    id: string;
    name: string;
    type: StepType;
    config: Record<string, unknown>;
    dependencies: string[];
    timeout?: number;
    retryCount?: number;
}
export declare enum StepType {
    CODE_GENERATION = "CODE_GENERATION",
    QUALITY_CHECK = "QUALITY_CHECK",
    TESTING = "TESTING",
    DEPLOYMENT = "DEPLOYMENT",
    NOTIFICATION = "NOTIFICATION",
    APPROVAL = "APPROVAL",
    CUSTOM = "CUSTOM"
}
export interface WorkflowTrigger {
    type: 'MANUAL' | 'SCHEDULE' | 'EVENT' | 'WEBHOOK';
    config: Record<string, unknown>;
}
export interface WorkflowCondition {
    field: string;
    operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS';
    value: unknown;
}
export interface DevelopmentMetrics {
    taskId: string;
    velocity: number;
    codeQuality: number;
    testCoverage: number;
    bugRate: number;
    deploymentFrequency: number;
    leadTime: number;
    cycleTime: number;
    meanTimeToRestore: number;
    changeFailureRate: number;
    timestamp: Date;
}
export interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
    skills: string[];
    preferences: DeveloperPreferences;
    performance: PerformanceMetrics;
    availability: Availability;
}
export interface DeveloperPreferences {
    languages: string[];
    frameworks: string[];
    methodologies: string[];
    workingHours: TimeRange;
    timezone: string;
}
export interface PerformanceMetrics {
    velocity: number;
    quality: number;
    collaboration: number;
    innovation: number;
    reliability: number;
}
export interface Availability {
    status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
    until?: Date;
    capacity: number;
}
export interface TimeRange {
    start: string;
    end: string;
}
export interface DevelopmentInsight {
    id: string;
    type: InsightType;
    title: string;
    description: string;
    impact: Priority;
    confidence: number;
    recommendations: string[];
    data: Record<string, unknown>;
    createdAt: Date;
    expiresAt?: Date;
}
export declare enum InsightType {
    PERFORMANCE = "PERFORMANCE",
    QUALITY = "QUALITY",
    PRODUCTIVITY = "PRODUCTIVITY",
    TECHNICAL_DEBT = "TECHNICAL_DEBT",
    SECURITY = "SECURITY",
    RESOURCE_UTILIZATION = "RESOURCE_UTILIZATION"
}
export interface DevelopmentContext {
    projectId: string;
    requirements: string[];
    architecture: string[];
    constraints: string[];
    preferences: Record<string, unknown>;
    history: ContextHistory[];
}
export interface ContextHistory {
    action: string;
    timestamp: Date;
    actor: string;
    details: Record<string, unknown>;
}
export interface TestCase {
    id: string;
    name: string;
    description: string;
    type: TestCaseType;
    framework: TestFramework;
    priority: Priority;
    complexity: number;
    estimatedDuration: number;
    requirements: string[];
    tags: string[];
    code: string;
    setup?: string;
    teardown?: string;
    assertions: TestAssertion[];
    coverage: CoverageData;
    status: TestStatus;
    createdAt: Date;
    updatedAt: Date;
    metadata: Record<string, unknown>;
}
export declare enum TestCaseType {
    UNIT = "UNIT",
    INTEGRATION = "INTEGRATION",
    E2E = "E2E",
    PERFORMANCE = "PERFORMANCE",
    SECURITY = "SECURITY",
    ACCESSIBILITY = "ACCESSIBILITY",
    VISUAL = "VISUAL",
    API = "API",
    REGRESSION = "REGRESSION",
    SMOKE = "SMOKE"
}
export declare enum TestFramework {
    JEST = "JEST",
    MOCHA = "MOCHA",
    JASMINE = "JASMINE",
    VITEST = "VITEST",
    PLAYWRIGHT = "PLAYWRIGHT",
    CYPRESS = "CYPRESS",
    SELENIUM = "SELENIUM",
    PUPPETEER = "PUPPETEER",
    SUPERTEST = "SUPERTEST",
    STORYBOOK = "STORYBOOK"
}
export declare enum TestStatus {
    PENDING = "PENDING",
    RUNNING = "RUNNING",
    PASSED = "PASSED",
    FAILED = "FAILED",
    SKIPPED = "SKIPPED",
    TIMEOUT = "TIMEOUT",
    ERROR = "ERROR"
}
export interface TestAssertion {
    type: AssertionType;
    expected: unknown;
    actual?: unknown;
    matcher: string;
    message?: string;
    negated?: boolean;
}
export declare enum AssertionType {
    EQUALITY = "EQUALITY",
    TRUTHINESS = "TRUTHINESS",
    COMPARISON = "COMPARISON",
    PATTERN = "PATTERN",
    TYPE = "TYPE",
    PROPERTY = "PROPERTY",
    EXCEPTION = "EXCEPTION",
    ASYNC = "ASYNC"
}
export interface CoverageData {
    statements: CoverageMetric;
    branches: CoverageMetric;
    functions: CoverageMetric;
    lines: CoverageMetric;
    overall: number;
    uncoveredLines: number[];
    uncoveredBranches: string[];
    timestamp: Date;
}
export interface CoverageMetric {
    total: number;
    covered: number;
    percentage: number;
}
export interface TestSuite {
    id: string;
    name: string;
    description: string;
    testCases: string[];
    configuration: TestConfiguration;
    coverage: CoverageData;
    results: TestResults;
    performance: TestPerformance;
    createdAt: Date;
    updatedAt: Date;
}
export interface TestConfiguration {
    framework: TestFramework;
    timeout: number;
    retries: number;
    parallel: boolean;
    maxWorkers?: number;
    setupFiles: string[];
    teardownFiles: string[];
    environment: Record<string, string>;
    reporters: string[];
    coverage: CoverageConfiguration;
}
export interface CoverageConfiguration {
    enabled: boolean;
    threshold: CoverageThreshold;
    include: string[];
    exclude: string[];
    reporters: string[];
}
export interface CoverageThreshold {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
}
export interface TestResults {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    failures: TestFailure[];
    performance: TestPerformance;
    timestamp: Date;
}
export interface TestFailure {
    testId: string;
    error: string;
    stackTrace: string;
    screenshot?: string;
    logs: string[];
    metadata: Record<string, unknown>;
}
export interface TestPerformance {
    averageTestDuration: number;
    slowestTests: TestDurationData[];
    memoryUsage: MemoryUsage;
    cpuUsage: number;
    networkRequests: number;
}
export interface TestDurationData {
    testId: string;
    duration: number;
    status: TestStatus;
}
export interface MemoryUsage {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
}
export interface TestGenerationRequest {
    sourceCode: string;
    language: string;
    framework: TestFramework;
    testType: TestCaseType;
    requirements?: string[];
    existingTests?: string[];
    coverageGoals?: CoverageThreshold;
    complexity?: number;
    patterns?: string[];
}
export interface TestGenerationResponse {
    testCases: TestCase[];
    coverage: CoverageGap[];
    recommendations: string[];
    confidence: number;
    metadata: Record<string, unknown>;
}
export interface CoverageGap {
    type: 'STATEMENT' | 'BRANCH' | 'FUNCTION' | 'LINE';
    location: CodeLocation;
    reason: string;
    priority: Priority;
    suggestedTests: string[];
}
export interface CodeLocation {
    file: string;
    line: number;
    column: number;
    function?: string;
    block?: string;
}
export interface MutationTestResult {
    id: string;
    originalCode: string;
    mutatedCode: string;
    mutationType: MutationType;
    location: CodeLocation;
    killed: boolean;
    survivedTests: string[];
    killedBy?: string;
    score: number;
    timestamp: Date;
}
export declare enum MutationType {
    ARITHMETIC = "ARITHMETIC",
    CONDITIONAL = "CONDITIONAL",
    LOGICAL = "LOGICAL",
    RELATIONAL = "RELATIONAL",
    ASSIGNMENT = "ASSIGNMENT",
    UNARY = "UNARY",
    STATEMENT = "STATEMENT",
    LITERAL = "LITERAL"
}
export interface TestPrioritization {
    testId: string;
    priority: number;
    factors: PriorityFactor[];
    reasoning: string;
    estimatedImpact: number;
    riskLevel: Priority;
}
export interface PriorityFactor {
    name: string;
    weight: number;
    value: number;
    contribution: number;
}
export interface QualityPrediction {
    testId: string;
    qualityScore: number;
    riskFactors: RiskFactor[];
    recommendations: string[];
    confidence: number;
    predictedIssues: PredictedIssue[];
    historicalData: HistoricalQuality[];
}
export interface RiskFactor {
    category: string;
    level: Priority;
    description: string;
    mitigation: string[];
    weight: number;
}
export interface PredictedIssue {
    type: string;
    probability: number;
    severity: Priority;
    description: string;
    prevention: string[];
}
export interface HistoricalQuality {
    timestamp: Date;
    qualityScore: number;
    testsPassed: number;
    testsFailed: number;
    coverage: number;
    issues: number;
}
export interface TestIntelligenceMetrics {
    totalTests: number;
    testEfficiency: number;
    coverageEffectiveness: number;
    defectDetectionRate: number;
    testMaintenanceCost: number;
    automationRate: number;
    testExecutionTime: number;
    qualityTrend: number;
    riskReduction: number;
    timestamp: Date;
}
export interface TestOptimization {
    id: string;
    type: OptimizationType;
    description: string;
    impact: number;
    effort: number;
    priority: Priority;
    implementation: string[];
    expectedBenefits: string[];
    risks: string[];
    metadata: Record<string, unknown>;
}
export declare enum OptimizationType {
    PARALLEL_EXECUTION = "PARALLEL_EXECUTION",
    TEST_SELECTION = "TEST_SELECTION",
    MOCK_OPTIMIZATION = "MOCK_OPTIMIZATION",
    SETUP_OPTIMIZATION = "SETUP_OPTIMIZATION",
    ASSERTION_IMPROVEMENT = "ASSERTION_IMPROVEMENT",
    FLAKY_TEST_FIX = "FLAKY_TEST_FIX",
    COVERAGE_IMPROVEMENT = "COVERAGE_IMPROVEMENT",
    PERFORMANCE_TUNING = "PERFORMANCE_TUNING"
}
//# sourceMappingURL=development.types.d.ts.map