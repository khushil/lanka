/**
 * LANKA Memory System - Core Types and Interfaces
 * Defines the foundational types for the cognitive memory system
 */

export interface BaseMemory {
  id: string;
  content: string;
  embedding: number[];
  confidence: number;
  workspace: string;
  createdAt: Date;
  updatedAt: Date;
  accessCount: number;
  lastAccessedAt: Date;
  quality: QualityScore;
  metadata: MemoryMetadata;
}

/**
 * System-1 Memory: Immediate pattern recognition (muscle memory)
 * Optimized for fast retrieval through vector similarity search
 */
export interface System1Memory extends BaseMemory {
  type: 'system1';
  pattern: string;
  trigger: string[];
  responseTime: number; // milliseconds for retrieval
  strengthScore: number; // 0-1, based on usage frequency
  relatedPatterns: string[];
}

/**
 * System-2 Memory: Deliberate reasoning processes
 * Preserves step-by-step thinking and problem-solving
 */
export interface System2Memory extends BaseMemory {
  type: 'system2';
  reasoning: ReasoningTrace;
  problem: string;
  solution: string;
  steps: ReasoningStep[];
  complexity: ComplexityLevel;
  validationCount: number;
  teachingValue: number; // 0-1 score
}

/**
 * Workspace Memory: Shared team knowledge
 * Scoped by project boundaries and team conventions
 */
export interface WorkspaceMemory extends BaseMemory {
  type: 'workspace';
  scope: WorkspaceScope;
  convention: string;
  agreement: TeamAgreement;
  evolution: EvolutionHistory[];
  consensus: ConsensusLevel;
  contributors: string[];
}

export type Memory = System1Memory | System2Memory | WorkspaceMemory;

export interface ReasoningTrace {
  id: string;
  startTime: Date;
  endTime: Date;
  context: string;
  goal: string;
  assumptions: string[];
  constraints: string[];
  approach: string;
  validation: ValidationResult[];
}

export interface ReasoningStep {
  order: number;
  description: string;
  rationale: string;
  confidence: number;
  alternatives: string[];
  timeSpent: number; // milliseconds
}

export interface ValidationResult {
  method: 'testing' | 'peer_review' | 'usage' | 'logical_proof';
  result: 'success' | 'failure' | 'partial';
  evidence: string;
  timestamp: Date;
}

export interface MemoryMetadata {
  source: 'conversation' | 'code_change' | 'debugging' | 'tool_usage';
  context: string;
  tags: string[];
  relationships: MemoryRelationship[];
  version: number;
  deprecationReason?: string;
}

export interface MemoryRelationship {
  type: 'IMPLEMENTS' | 'EVOLVED_FROM' | 'CONTRADICTS' | 'DEPENDS_ON' | 'SUGGESTS' | 'REPLACES';
  targetId: string;
  strength: number; // 0-1
  context: string;
  createdAt: Date;
}

export interface QualityScore {
  novelty: number; // 0-1, how different from existing memories
  accuracy: number; // 0-1, confidence in correctness
  utility: number; // 0-1, practical value for development
  clarity: number; // 0-1, how well explained/documented
  validation: number; // 0-1, how well tested/proven
  overall: number; // computed weighted average
}

export interface MemoryArbitrationResult {
  decision: 'ADD' | 'UPDATE' | 'MERGE' | 'REJECT' | 'DEPRECATE';
  confidence: number;
  reasoning: string;
  targetMemoryId?: string; // for UPDATE/MERGE operations
  mergeStrategy?: MergeStrategy;
  auditTrail: ArbitrationAudit;
}

export interface ArbitrationAudit {
  arbitrationId: string;
  timestamp: Date;
  inputHash: string;
  similarMemories: SimilarMemory[];
  llmReasoning: string;
  qualityAssessment: QualityScore;
  riskAssessment: RiskAssessment;
  reviewRequired: boolean;
}

export interface SimilarMemory {
  memoryId: string;
  similarity: number;
  type: 'semantic' | 'structural' | 'contextual';
  comparisonMethod: string;
}

export interface RiskAssessment {
  contradiction: number; // 0-1, risk of contradicting existing knowledge
  obsolescence: number; // 0-1, risk of making existing memories obsolete
  security: number; // 0-1, risk of exposing sensitive information
  quality: number; // 0-1, risk of degrading knowledge quality
  overall: number;
}

export interface QualityGate {
  name: string;
  threshold: number;
  weight: number;
  validator: QualityValidator;
  required: boolean;
}

export interface QualityValidator {
  type: 'rule_based' | 'ml_model' | 'llm_assessment' | 'peer_review';
  config: Record<string, unknown>;
  implementation: string; // function name or model path
}

export type ComplexityLevel = 'simple' | 'moderate' | 'complex' | 'expert';
export type ConsensusLevel = 'individual' | 'team' | 'organization' | 'community';
export type MergeStrategy = 'append' | 'replace' | 'synthesize' | 'version';

export interface WorkspaceScope {
  project: string;
  modules: string[];
  team: string;
  visibility: 'private' | 'team' | 'organization' | 'public';
}

export interface TeamAgreement {
  decision: string;
  rationale: string;
  alternatives: string[];
  decisionDate: Date;
  reviewDate?: Date;
  participants: string[];
  consensus: number; // 0-1
}

export interface EvolutionHistory {
  version: number;
  change: string;
  reason: string;
  timestamp: Date;
  author: string;
  impact: 'minor' | 'major' | 'breaking';
}

/**
 * Memory Search and Retrieval Types
 */
export interface MemoryQuery {
  text?: string;
  embedding?: number[];
  workspace?: string;
  type?: Memory['type'][];
  tags?: string[];
  minConfidence?: number;
  maxAge?: number; // days
  limit?: number;
  includeDeprecated?: boolean;
}

export interface MemorySearchResult {
  memory: Memory;
  score: number;
  relevance: RelevanceBreakdown;
  context: SearchContext;
}

export interface RelevanceBreakdown {
  semantic: number; // vector similarity
  structural: number; // graph relationships
  temporal: number; // recency bonus
  quality: number; // quality score weight
  workspace: number; // workspace relevance
  combined: number; // final weighted score
}

export interface SearchContext {
  query: MemoryQuery;
  totalResults: number;
  searchTime: number;
  strategy: 'vector_only' | 'graph_only' | 'hybrid';
  graphTraversals?: GraphTraversal[];
}

export interface GraphTraversal {
  path: string[];
  relationshipTypes: string[];
  depth: number;
  strength: number;
}

/**
 * Storage and Indexing Types
 */
export interface VectorIndex {
  collection: string;
  dimension: number;
  metric: 'cosine' | 'euclidean' | 'dot_product';
  indexType: 'hnsw' | 'flat' | 'ivf';
  parameters: Record<string, unknown>;
}

export interface GraphNode {
  id: string;
  labels: string[];
  properties: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface GraphRelationship {
  id: string;
  type: string;
  startNodeId: string;
  endNodeId: string;
  properties: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Configuration and System Types
 */
export interface MemorySystemConfig {
  storage: StorageConfig;
  arbitration: ArbitrationConfig;
  qualityGates: QualityGate[];
  embedding: EmbeddingConfig;
  evolution: EvolutionConfig;
}

export interface StorageConfig {
  neo4j: {
    uri: string;
    database: string;
    username: string;
    password: string;
  };
  vector: {
    provider: 'qdrant' | 'milvus' | 'pinecone';
    endpoint: string;
    apiKey?: string;
    collections: VectorIndex[];
  };
  postgres: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    keyPrefix: string;
  };
}

export interface ArbitrationConfig {
  llm: {
    provider: 'openai' | 'anthropic' | 'local';
    model: string;
    temperature: number;
    maxTokens: number;
  };
  similarity: {
    semanticThreshold: number;
    structuralThreshold: number;
    contextualThreshold: number;
  };
  quality: {
    minimumScore: number;
    requiredGates: string[];
    reviewThreshold: number;
  };
}

export interface EmbeddingConfig {
  model: string;
  dimension: number;
  batchSize: number;
  cacheEnabled: boolean;
  reembeddingStrategy: 'lazy' | 'eager' | 'scheduled';
}

export interface EvolutionConfig {
  analysisInterval: number; // hours
  usageWeightDecay: number; // 0-1
  contradictionResolution: 'automatic' | 'manual' | 'consensus';
  deprecationThreshold: number; // days since last access
  mergeSimilarityThreshold: number;
}