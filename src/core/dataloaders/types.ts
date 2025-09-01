import DataLoader from 'dataloader';

// Core interfaces for DataLoader implementations
export interface DataLoaderContext {
  neo4j: any;
  logger: any;
  metrics?: PerformanceMetrics;
}

export interface PerformanceMetrics {
  recordBatchLoad(loaderType: string, batchSize: number, duration: number): void;
  recordCacheHit(loaderType: string, key: string): void;
  recordCacheMiss(loaderType: string, key: string): void;
  getMetrics(): LoaderMetrics;
}

export interface LoaderMetrics {
  [loaderType: string]: {
    totalRequests: number;
    batchedRequests: number;
    cacheHits: number;
    cacheMisses: number;
    averageBatchSize: number;
    averageLoadTime: number;
    totalLoadTime: number;
  };
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size
  enabled?: boolean;
}

export interface LoaderOptions {
  cache?: CacheOptions;
  batchScheduleFn?: (callback: () => void) => void;
  maxBatchSize?: number;
}

// Entity type definitions
export interface Requirement {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface ArchitectureDecision {
  id: string;
  title: string;
  description: string;
  status: string;
  rationale: string;
  consequences: string;
  alternatives?: string;
  technologyStackId?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface ArchitecturePattern {
  id: string;
  name: string;
  description: string;
  category: string;
  applicability: string;
  consequences: string;
  implementation: string;
  examples?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface TechnologyStack {
  id: string;
  name: string;
  description: string;
  technologies: any[];
  compatibility: string;
  maturity: string;
  performance: number;
  cost: number;
  maintainability: number;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface Relationship {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  properties?: Record<string, any>;
  createdAt: string;
  [key: string]: any;
}

// DataLoader type definitions
export type RequirementLoader = DataLoader<string, Requirement | null>;
export type ArchitectureDecisionLoader = DataLoader<string, ArchitectureDecision | null>;
export type ArchitecturePatternLoader = DataLoader<string, ArchitecturePattern | null>;
export type TechnologyStackLoader = DataLoader<string, TechnologyStack | null>;
export type UserLoader = DataLoader<string, User | null>;
export type RelationshipLoader = DataLoader<string, Relationship[]>;
export type RequirementsByProjectLoader = DataLoader<string, Requirement[]>;
export type ArchitectureDecisionsByRequirementLoader = DataLoader<string, ArchitectureDecision[]>;
export type RequirementsByArchitectureLoader = DataLoader<string, Requirement[]>;

// Custom batch loading function types
export type BatchLoadFn<K, V> = (keys: readonly K[]) => Promise<(V | Error)[]>;

export interface DataLoaders {
  // Entity loaders
  requirements: RequirementLoader;
  architectureDecisions: ArchitectureDecisionLoader;
  architecturePatterns: ArchitecturePatternLoader;
  technologyStacks: TechnologyStackLoader;
  users: UserLoader;
  
  // Relationship loaders
  relationships: RelationshipLoader;
  requirementsByProject: RequirementsByProjectLoader;
  architectureDecisionsByRequirement: ArchitectureDecisionsByRequirementLoader;
  requirementsByArchitecture: RequirementsByArchitectureLoader;
  
  // Cache management
  clearAll(): void;
  clearByPattern(pattern: string): void;
  prime<K, V>(loader: DataLoader<K, V>, key: K, value: V): void;
}