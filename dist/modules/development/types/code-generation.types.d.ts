/**
 * Code Generation Engine Types
 * Defines the core types for the code generation functionality
 */
export declare enum ProgrammingLanguage {
    TYPESCRIPT = "TYPESCRIPT",
    JAVASCRIPT = "JAVASCRIPT",
    PYTHON = "PYTHON",
    JAVA = "JAVA",
    GO = "GO",
    RUST = "RUST",
    CSHARP = "CSHARP",
    PHP = "PHP",
    RUBY = "RUBY",
    KOTLIN = "KOTLIN",
    SWIFT = "SWIFT"
}
export declare enum CodeTemplateType {
    COMPONENT = "COMPONENT",
    SERVICE = "SERVICE",
    MODEL = "MODEL",
    CONTROLLER = "CONTROLLER",
    TEST = "TEST",
    CONFIG = "CONFIG",
    MIDDLEWARE = "MIDDLEWARE",
    UTILITY = "UTILITY",
    API_ENDPOINT = "API_ENDPOINT",
    DATABASE_MIGRATION = "DATABASE_MIGRATION"
}
export declare enum GenerationStrategy {
    TEMPLATE_BASED = "TEMPLATE_BASED",
    AI_ASSISTED = "AI_ASSISTED",
    HYBRID = "HYBRID",
    PATTERN_MATCHING = "PATTERN_MATCHING"
}
export declare enum ValidationLevel {
    SYNTAX = "SYNTAX",
    SEMANTIC = "SEMANTIC",
    QUALITY = "QUALITY",
    SECURITY = "SECURITY",
    PERFORMANCE = "PERFORMANCE",
    FULL = "FULL"
}
export interface CodeGenerationRequest {
    id: string;
    requirementIds: string[];
    architectureIds: string[];
    language: ProgrammingLanguage;
    templateType: CodeTemplateType;
    strategy: GenerationStrategy;
    context: GenerationContext;
    customPrompts?: string[];
    validationLevel: ValidationLevel;
    outputPath?: string;
    createdAt: string;
    requestedBy: string;
}
export interface GenerationContext {
    projectId: string;
    framework?: string;
    libraries: string[];
    patterns: string[];
    conventions: CodingConvention[];
    constraints: string[];
    existingCodebase?: CodebaseInfo;
    teamPreferences: Record<string, any>;
    environment: 'development' | 'staging' | 'production';
}
export interface CodingConvention {
    type: 'NAMING' | 'FORMATTING' | 'STRUCTURE' | 'DOCUMENTATION' | 'TESTING';
    rules: ConventionRule[];
}
export interface ConventionRule {
    name: string;
    description: string;
    pattern?: string;
    example: string;
    severity: 'ERROR' | 'WARNING' | 'INFO';
}
export interface CodebaseInfo {
    structure: DirectoryStructure;
    dependencies: Dependency[];
    patterns: DetectedPattern[];
    metrics: CodebaseMetrics;
}
export interface DirectoryStructure {
    path: string;
    type: 'DIRECTORY' | 'FILE';
    children?: DirectoryStructure[];
    language?: ProgrammingLanguage;
    purpose?: string;
}
export interface Dependency {
    name: string;
    version: string;
    type: 'RUNTIME' | 'DEVELOPMENT' | 'PEER' | 'OPTIONAL';
    source: string;
}
export interface DetectedPattern {
    name: string;
    type: string;
    confidence: number;
    locations: string[];
    examples: string[];
}
export interface CodebaseMetrics {
    linesOfCode: number;
    fileCount: number;
    complexity: number;
    testCoverage: number;
    duplication: number;
    maintainability: number;
}
export interface CodeGenerationResult {
    id: string;
    requestId: string;
    generatedFiles: GeneratedFile[];
    metadata: GenerationMetadata;
    validation: ValidationResult;
    suggestions: CodeSuggestion[];
    status: GenerationStatus;
    createdAt: string;
    completedAt?: string;
}
export interface GeneratedFile {
    path: string;
    content: string;
    language: ProgrammingLanguage;
    type: CodeTemplateType;
    size: number;
    checksum: string;
    dependencies: string[];
    imports: string[];
    exports: string[];
    functions: FunctionInfo[];
    classes: ClassInfo[];
    interfaces: InterfaceInfo[];
}
export interface GenerationMetadata {
    aiModel?: string;
    template?: string;
    processingTime: number;
    tokenUsage?: TokenUsage;
    confidence: number;
    strategy: GenerationStrategy;
    version: string;
    parameters: Record<string, any>;
}
export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost?: number;
}
export interface ValidationResult {
    level: ValidationLevel;
    isValid: boolean;
    score: number;
    issues: ValidationIssue[];
    metrics: QualityMetrics;
    suggestions: string[];
    validatedAt: string;
}
export interface ValidationIssue {
    id: string;
    type: 'SYNTAX' | 'SEMANTIC' | 'QUALITY' | 'SECURITY' | 'PERFORMANCE' | 'STYLE';
    severity: 'ERROR' | 'WARNING' | 'INFO';
    message: string;
    location: IssueLocation;
    rule?: string;
    suggestion?: string;
    fixable: boolean;
}
export interface IssueLocation {
    file: string;
    line: number;
    column: number;
    length?: number;
    context?: string;
}
export interface QualityMetrics {
    complexity: number;
    maintainability: number;
    reliability: number;
    security: number;
    performance: number;
    testability: number;
    readability: number;
    reusability: number;
    overall: number;
}
export interface CodeSuggestion {
    id: string;
    type: 'OPTIMIZATION' | 'REFACTOR' | 'BEST_PRACTICE' | 'SECURITY' | 'PERFORMANCE';
    title: string;
    description: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    effort: 'LOW' | 'MEDIUM' | 'HIGH';
    code?: string;
    diff?: string;
    benefits: string[];
    examples?: string[];
}
export interface FunctionInfo {
    name: string;
    parameters: ParameterInfo[];
    returnType: string;
    visibility: 'PUBLIC' | 'PRIVATE' | 'PROTECTED' | 'INTERNAL';
    isAsync: boolean;
    complexity: number;
    documentation?: string;
}
export interface ParameterInfo {
    name: string;
    type: string;
    optional: boolean;
    defaultValue?: string;
    description?: string;
}
export interface ClassInfo {
    name: string;
    extends?: string;
    implements: string[];
    properties: PropertyInfo[];
    methods: FunctionInfo[];
    visibility: 'PUBLIC' | 'PRIVATE' | 'PROTECTED' | 'INTERNAL';
    isAbstract: boolean;
    documentation?: string;
}
export interface PropertyInfo {
    name: string;
    type: string;
    visibility: 'PUBLIC' | 'PRIVATE' | 'PROTECTED' | 'INTERNAL';
    isStatic: boolean;
    isReadonly: boolean;
    defaultValue?: string;
    documentation?: string;
}
export interface InterfaceInfo {
    name: string;
    extends: string[];
    properties: PropertyInfo[];
    methods: FunctionInfo[];
    documentation?: string;
}
export declare enum GenerationStatus {
    PENDING = "PENDING",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED"
}
export interface CodeTemplate {
    id: string;
    name: string;
    description: string;
    type: CodeTemplateType;
    language: ProgrammingLanguage;
    template: string;
    variables: TemplateVariable[];
    conditions: TemplateCondition[];
    fragments: TemplateFragment[];
    metadata: TemplateMetadata;
    createdAt: string;
    updatedAt?: string;
}
export interface TemplateVariable {
    name: string;
    type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'OBJECT' | 'ARRAY';
    description: string;
    required: boolean;
    defaultValue?: any;
    validation?: string;
    examples: any[];
}
export interface TemplateCondition {
    expression: string;
    description: string;
    trueTemplate?: string;
    falseTemplate?: string;
}
export interface TemplateFragment {
    name: string;
    content: string;
    reusable: boolean;
    dependencies: string[];
}
export interface TemplateMetadata {
    version: string;
    author: string;
    tags: string[];
    category: string;
    usageCount: number;
    rating: number;
    lastUsed?: string;
}
export interface AIModelConfig {
    provider: 'OPENAI' | 'HUGGINGFACE' | 'CUSTOM';
    model: string;
    version: string;
    endpoint?: string;
    apiKey?: string;
    parameters: ModelParameters;
    capabilities: ModelCapabilities;
}
export interface ModelParameters {
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
    stopSequences?: string[];
    customParams?: Record<string, any>;
}
export interface ModelCapabilities {
    supportsCodeGeneration: boolean;
    supportsMultipleLanguages: boolean;
    supportsContextLearning: boolean;
    maxContextLength: number;
    supportedLanguages: ProgrammingLanguage[];
}
export interface GenerationHistory {
    requestId: string;
    resultId: string;
    timestamp: string;
    user: string;
    success: boolean;
    duration: number;
    metrics: GenerationHistoryMetrics;
}
export interface GenerationHistoryMetrics {
    filesGenerated: number;
    linesGenerated: number;
    tokensUsed: number;
    cost: number;
    qualityScore: number;
    validationScore: number;
}
export interface BatchGenerationRequest {
    id: string;
    requests: CodeGenerationRequest[];
    batchOptions: BatchOptions;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    createdAt: string;
    requestedBy: string;
}
export interface BatchOptions {
    parallel: boolean;
    maxConcurrency: number;
    continueOnError: boolean;
    timeout: number;
    retryCount: number;
}
export interface BatchGenerationResult {
    batchId: string;
    results: CodeGenerationResult[];
    summary: BatchSummary;
    status: GenerationStatus;
    completedAt?: string;
}
export interface BatchSummary {
    totalRequests: number;
    successful: number;
    failed: number;
    cancelled: number;
    totalDuration: number;
    totalCost: number;
    averageQualityScore: number;
}
//# sourceMappingURL=code-generation.types.d.ts.map