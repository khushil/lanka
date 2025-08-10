export declare enum ArchitectureDecisionStatus {
    DRAFT = "DRAFT",
    PROPOSED = "PROPOSED",
    APPROVED = "APPROVED",
    IMPLEMENTED = "IMPLEMENTED",
    DEPRECATED = "DEPRECATED",
    SUPERSEDED = "SUPERSEDED"
}
export declare enum ArchitecturePatternType {
    MICROSERVICES = "MICROSERVICES",
    MONOLITHIC = "MONOLITHIC",
    SERVERLESS = "SERVERLESS",
    EVENT_DRIVEN = "EVENT_DRIVEN",
    LAYERED = "LAYERED",
    HEXAGONAL = "HEXAGONAL",
    CQRS = "CQRS",
    SAGA = "SAGA"
}
export declare enum CloudProvider {
    AWS = "AWS",
    AZURE = "AZURE",
    GCP = "GCP",
    ONPREMISES = "ONPREMISES",
    HYBRID = "HYBRID"
}
export interface ArchitectureDecision {
    id: string;
    title: string;
    description: string;
    rationale: string;
    status: ArchitectureDecisionStatus;
    alternatives: Alternative[];
    consequences: string[];
    tradeOffs: TradeOff[];
    createdAt: string;
    updatedAt?: string;
    approvedAt?: string;
    deprecatedAt?: string;
    projectId: string;
    requirementIds: string[];
    patternIds?: string[];
    technologyStackId?: string;
}
export interface Alternative {
    title: string;
    description: string;
    pros: string[];
    cons: string[];
    rejectionReason?: string;
}
export interface TradeOff {
    aspect: string;
    gain: string;
    loss: string;
    mitigation?: string;
}
export interface ArchitecturePattern {
    id: string;
    name: string;
    type: ArchitecturePatternType;
    description: string;
    applicabilityConditions: string[];
    components: PatternComponent[];
    qualityAttributes: QualityAttribute[];
    knownUses: string[];
    successRate: number;
    adoptionCount: number;
    createdAt: string;
    updatedAt?: string;
}
export interface PatternComponent {
    name: string;
    responsibility: string;
    interactions: string[];
    constraints?: string[];
}
export interface QualityAttribute {
    name: string;
    impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    description: string;
    metric?: string;
}
export interface TechnologyStack {
    id: string;
    name: string;
    description: string;
    layers: TechnologyLayer[];
    compatibility: CompatibilityMatrix;
    performanceMetrics: PerformanceMetrics;
    costEstimate: CostEstimate;
    teamExpertise?: number;
    successRate?: number;
    createdAt: string;
    updatedAt?: string;
}
export interface TechnologyLayer {
    name: string;
    technologies: Technology[];
    purpose: string;
    alternatives?: Technology[];
}
export interface Technology {
    name: string;
    version: string;
    license: string;
    vendor?: string;
    maturity: 'EXPERIMENTAL' | 'STABLE' | 'MATURE' | 'DEPRECATED';
    communitySupport: number;
    learningCurve: 'LOW' | 'MEDIUM' | 'HIGH';
}
export interface CompatibilityMatrix {
    compatible: string[][];
    incompatible: string[][];
    requires: Record<string, string[]>;
}
export interface PerformanceMetrics {
    throughput?: number;
    latency?: number;
    scalability?: string;
    reliability?: number;
    maintainability?: number;
}
export interface CostEstimate {
    upfront: number;
    monthly: number;
    yearly: number;
    currency: string;
    breakdown: CostBreakdown[];
}
export interface CostBreakdown {
    category: string;
    service: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
}
export interface CloudConfiguration {
    provider: CloudProvider;
    services: CloudService[];
    regions: string[];
    availability: string;
    compliance: string[];
    costOptimizations: OptimizationStrategy[];
}
export interface CloudService {
    name: string;
    type: string;
    configuration: Record<string, any>;
    estimatedCost: number;
    alternativeServices?: string[];
}
export interface OptimizationStrategy {
    name: string;
    description: string;
    potentialSavings: number;
    implementation: string;
    tradeOffs?: string[];
}
export interface ArchitectureValidation {
    architectureId: string;
    validationDate: string;
    requirementsSatisfied: RequirementValidation[];
    securityAssessment: SecurityAssessment;
    performanceAssessment: PerformanceAssessment;
    scalabilityAssessment: ScalabilityAssessment;
    costEfficiency: number;
    overallScore: number;
    recommendations: string[];
}
export interface RequirementValidation {
    requirementId: string;
    satisfied: boolean;
    coverage: number;
    gaps?: string[];
}
export interface SecurityAssessment {
    score: number;
    vulnerabilities: SecurityVulnerability[];
    recommendations: string[];
    complianceStatus: Record<string, boolean>;
}
export interface SecurityVulnerability {
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    mitigation: string;
}
export interface PerformanceAssessment {
    expectedThroughput: number;
    expectedLatency: number;
    bottlenecks: string[];
    optimizations: string[];
}
export interface ScalabilityAssessment {
    horizontalScaling: boolean;
    verticalScaling: boolean;
    elasticity: string;
    limitations: string[];
}
//# sourceMappingURL=architecture.types.d.ts.map