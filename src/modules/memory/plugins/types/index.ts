// Plugin System Type Definitions
// Core interfaces and types for the LANKA Memory System Plugin Architecture

import { EventEmitter } from 'events';

// Plugin lifecycle states
export enum PluginState {
  UNLOADED = 'unloaded',
  LOADING = 'loading', 
  LOADED = 'loaded',
  INITIALIZING = 'initializing',
  ACTIVE = 'active',
  ERROR = 'error',
  DISABLED = 'disabled',
  UNLOADING = 'unloading'
}

// Plugin hook execution points
export enum PluginHook {
  // Memory lifecycle hooks
  MEMORY_INGESTION = 'memory-ingestion',
  MEMORY_ARBITRATION = 'memory-arbitration',
  MEMORY_STORED = 'memory-stored',
  MEMORY_RETRIEVED = 'memory-retrieved',
  MEMORY_UPDATED = 'memory-updated',
  MEMORY_DELETED = 'memory-deleted',
  
  // Search and query hooks
  PRE_SEARCH = 'pre-search',
  POST_SEARCH = 'post-search',
  QUERY_ENHANCEMENT = 'query-enhancement',
  RESULT_ENHANCEMENT = 'result-enhancement',
  
  // Graph operations
  NODE_CREATED = 'node-created',
  RELATIONSHIP_CREATED = 'relationship-created',
  GRAPH_TRAVERSAL = 'graph-traversal',
  
  // System events
  SYSTEM_STARTUP = 'system-startup',
  SYSTEM_SHUTDOWN = 'system-shutdown',
  WORKSPACE_CHANGED = 'workspace-changed',
  
  // Error handling
  ERROR_OCCURRED = 'error-occurred',
  CONTRADICTION_DETECTED = 'contradiction-detected'
}

// Memory types the plugin system works with
export interface MemoryNode {
  id: string;
  type: 'system1' | 'system2' | 'workspace';
  content: string;
  embedding?: number[];
  metadata: Record<string, any>;
  timestamp: Date;
  workspace?: string;
  quality: number;
  relationships: MemoryRelationship[];
}

export interface MemoryRelationship {
  type: string;
  target: string;
  properties?: Record<string, any>;
  strength: number;
}

// Plugin manifest structure
export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  capabilities: string[];
  hooks: PluginHook[];
  dependencies: string[];
  requiredPermissions: PluginPermission[];
  resourceLimits?: PluginResourceLimits;
  configuration?: PluginConfigSchema;
}

// Plugin permissions system
export enum PluginPermission {
  READ_MEMORY = 'read-memory',
  WRITE_MEMORY = 'write-memory',
  DELETE_MEMORY = 'delete-memory',
  CREATE_RELATIONSHIPS = 'create-relationships',
  MODIFY_GRAPH = 'modify-graph',
  ACCESS_EMBEDDINGS = 'access-embeddings',
  EXTERNAL_HTTP = 'external-http',
  FILE_SYSTEM = 'file-system',
  PLUGIN_COMMUNICATION = 'plugin-communication',
  SYSTEM_EVENTS = 'system-events'
}

// Resource limits for plugins
export interface PluginResourceLimits {
  maxMemoryMB?: number;
  maxExecutionTimeMs?: number;
  maxConcurrentOperations?: number;
  maxGraphTraversalDepth?: number;
  maxHttpRequests?: number;
}

// Plugin configuration schema
export interface PluginConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required?: boolean;
    default?: any;
    description?: string;
    validation?: string; // regex or validation function name
  };
}

// Plugin execution context
export interface PluginContext {
  pluginId: string;
  workspace?: string;
  permissions: PluginPermission[];
  config: Record<string, any>;
  resourceLimits: PluginResourceLimits;
  eventBus: EventEmitter;
  logger: PluginLogger;
  storage: PluginStorage;
  graph: GraphAPI;
  memory: MemoryAPI;
}

// Plugin logger interface
export interface PluginLogger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string | Error, meta?: any): void;
}

// Plugin storage interface
export interface PluginStorage {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  keys(pattern?: string): Promise<string[]>;
  clear(): Promise<void>;
}

// Graph API for plugins
export interface GraphAPI {
  createNode(type: string, properties: Record<string, any>): Promise<string>;
  updateNode(id: string, properties: Record<string, any>): Promise<void>;
  deleteNode(id: string): Promise<void>;
  createRelationship(fromId: string, toId: string, type: string, properties?: Record<string, any>): Promise<string>;
  findNodes(query: GraphQuery): Promise<MemoryNode[]>;
  traverseGraph(startId: string, traversal: GraphTraversal): Promise<MemoryNode[]>;
  analyzePattern(pattern: GraphPattern): Promise<PatternMatch[]>;
}

// Memory API for plugins
export interface MemoryAPI {
  store(memory: Partial<MemoryNode>): Promise<string>;
  retrieve(id: string): Promise<MemoryNode | null>;
  search(query: MemorySearchQuery): Promise<MemoryNode[]>;
  update(id: string, updates: Partial<MemoryNode>): Promise<void>;
  delete(id: string): Promise<void>;
  createEmbedding(text: string): Promise<number[]>;
  findSimilar(embedding: number[], threshold?: number): Promise<MemoryNode[]>;
}

// Graph query structures
export interface GraphQuery {
  nodeType?: string;
  properties?: Record<string, any>;
  relationships?: RelationshipQuery[];
  limit?: number;
  workspace?: string;
}

export interface RelationshipQuery {
  type: string;
  direction: 'incoming' | 'outgoing' | 'both';
  properties?: Record<string, any>;
}

export interface GraphTraversal {
  relationshipTypes: string[];
  direction: 'incoming' | 'outgoing' | 'both';
  maxDepth: number;
  filter?: (node: MemoryNode) => boolean;
}

export interface GraphPattern {
  nodes: PatternNode[];
  relationships: PatternRelationship[];
}

export interface PatternNode {
  id: string;
  type?: string;
  properties?: Record<string, any>;
}

export interface PatternRelationship {
  fromId: string;
  toId: string;
  type?: string;
  properties?: Record<string, any>;
}

export interface PatternMatch {
  confidence: number;
  nodes: Record<string, MemoryNode>;
  relationships: Record<string, MemoryRelationship>;
}

// Memory search query
export interface MemorySearchQuery {
  text?: string;
  embedding?: number[];
  type?: 'system1' | 'system2' | 'workspace';
  workspace?: string;
  metadata?: Record<string, any>;
  limit?: number;
  threshold?: number;
}

// Plugin hook execution result
export interface HookExecutionResult {
  proceed: boolean;
  modifications?: any;
  error?: string;
  metadata?: Record<string, any>;
}

// Plugin capability execution result
export interface CapabilityExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  metrics?: PluginExecutionMetrics;
}

// Plugin execution metrics
export interface PluginExecutionMetrics {
  executionTime: number;
  memoryUsage: number;
  apiCalls: number;
  cacheHits: number;
  cacheMisses: number;
}

// Plugin communication message
export interface PluginMessage {
  from: string;
  to?: string; // undefined for broadcast
  type: string;
  payload: any;
  timestamp: Date;
  correlationId?: string;
}

// Plugin installation result
export interface PluginInstallResult {
  success: boolean;
  pluginId?: string;
  error?: string;
  warnings?: string[];
}

// Plugin operation result
export interface PluginOperationResult {
  success: boolean;
  error?: string;
  data?: any;
}

// Plugin metrics for monitoring
export interface PluginMetrics {
  pluginId: string;
  state: PluginState;
  loadTime: Date;
  executionCount: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
  errorCount: number;
  lastError?: string;
  memoryUsage: number;
  resourceUsage: PluginResourceUsage;
}

export interface PluginResourceUsage {
  memory: number;
  cpu: number;
  httpRequests: number;
  graphOperations: number;
  storageOperations: number;
}

// Base plugin interface that all plugins must implement
export interface IPlugin {
  // Plugin metadata
  getMetadata(): PluginManifest;
  
  // Lifecycle methods
  initialize(context: PluginContext): Promise<void>;
  shutdown(): Promise<void>;
  
  // Hook methods (optional - implement based on manifest.hooks)
  onMemoryIngestion?(memory: MemoryNode): Promise<HookExecutionResult>;
  onMemoryArbitration?(memories: MemoryNode[]): Promise<HookExecutionResult>;
  onMemoryStored?(memory: MemoryNode): Promise<HookExecutionResult>;
  onMemoryRetrieved?(memory: MemoryNode): Promise<HookExecutionResult>;
  onMemoryUpdated?(memory: MemoryNode, oldMemory: MemoryNode): Promise<HookExecutionResult>;
  onMemoryDeleted?(memoryId: string): Promise<HookExecutionResult>;
  onPreSearch?(query: MemorySearchQuery): Promise<HookExecutionResult>;
  onPostSearch?(results: MemoryNode[], query: MemorySearchQuery): Promise<HookExecutionResult>;
  onQueryEnhancement?(query: MemorySearchQuery): Promise<HookExecutionResult>;
  onResultEnhancement?(results: MemoryNode[]): Promise<HookExecutionResult>;
  onNodeCreated?(node: MemoryNode): Promise<HookExecutionResult>;
  onRelationshipCreated?(relationship: MemoryRelationship): Promise<HookExecutionResult>;
  onGraphTraversal?(startNode: MemoryNode, traversal: GraphTraversal): Promise<HookExecutionResult>;
  onSystemStartup?(): Promise<HookExecutionResult>;
  onSystemShutdown?(): Promise<HookExecutionResult>;
  onWorkspaceChanged?(workspace: string): Promise<HookExecutionResult>;
  onErrorOccurred?(error: Error, context: any): Promise<HookExecutionResult>;
  onContradictionDetected?(contradictingMemories: MemoryNode[]): Promise<HookExecutionResult>;
  
  // Capability methods (implement based on manifest.capabilities)
  [capability: string]: any;
}

// Plugin factory function type
export type PluginFactory = () => IPlugin;

// Plugin manager configuration
export interface PluginManagerConfig {
  pluginDirectory: string;
  sandboxConfig: SandboxConfig;
  maxConcurrentPlugins?: number;
  enableHotReload?: boolean;
  defaultResourceLimits?: PluginResourceLimits;
  trustedPlugins?: string[];
}

// Sandbox configuration
export interface SandboxConfig {
  timeout: number;
  memoryLimit: string;
  allowedModules: string[];
  blockedModules?: string[];
  allowNetworking?: boolean;
  allowFileSystem?: boolean;
}

// Plugin dependency information
export interface PluginDependency {
  name: string;
  version?: string;
  optional?: boolean;
}

// Plugin registry entry
export interface PluginRegistryEntry {
  manifest: PluginManifest;
  factory: PluginFactory;
  instance?: IPlugin;
  context?: PluginContext;
  state: PluginState;
  metrics: PluginMetrics;
  dependencies: PluginDependency[];
  dependents: string[];
}

export * from './events';
export * from './security';
export * from './communication';
