/**
 * MCP Protocol Types and Interfaces for LANKA Memory System
 * Implements Model Context Protocol specification with memory-specific extensions
 */

import { EventEmitter } from 'events';

// Core MCP Protocol Types
export interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface MCPRequest extends MCPMessage {
  method: string;
  params?: any;
}

export interface MCPResponse extends MCPMessage {
  id: string | number;
  result?: any;
  error?: MCPError;
}

export interface MCPNotification extends MCPMessage {
  method: string;
  params?: any;
}

// MCP Server Capabilities
export interface MCPServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: {};
}

export interface MCPClientCapabilities {
  roots?: {
    listChanged?: boolean;
  };
  sampling?: {};
}

// Memory-Specific MCP Extensions
export interface MemoryMCPCapabilities extends MCPServerCapabilities {
  memory?: {
    search?: boolean;
    store?: boolean;
    relate?: boolean;
    evolve?: boolean;
    federate?: boolean;
    subscribe?: boolean;
  };
}

// Tool Definitions
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  content: MCPContent[];
  isError?: boolean;
}

// Resource Definitions
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  metadata?: Record<string, any>;
}

export interface MCPResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
  metadata?: Record<string, any>;
}

// Content Types
export type MCPContent = 
  | { type: 'text'; text: string; }
  | { type: 'image'; data: string; mimeType: string; }
  | { type: 'resource'; resource: { uri: string; text?: string; blob?: string; mimeType?: string; } };

// Memory-Specific Types
export interface MemorySearchParams {
  query: string;
  type?: 'semantic' | 'structural' | 'hybrid';
  workspace?: string;
  limit?: number;
  filters?: {
    memoryType?: 'system1' | 'system2' | 'workspace';
    quality?: number;
    timeRange?: { start: Date; end: Date; };
    tags?: string[];
  };
}

export interface MemoryStoreParams {
  content: string;
  type: 'system1' | 'system2' | 'workspace';
  workspace?: string;
  metadata?: {
    tags?: string[];
    confidence?: number;
    source?: string;
    context?: string;
  };
  arbitration?: {
    enabled?: boolean;
    threshold?: number;
    allowUpdate?: boolean;
  };
}

export interface MemoryRelateParams {
  sourceMemoryId: string;
  targetMemoryId: string;
  relationshipType: 'IMPLEMENTS' | 'EVOLVED_FROM' | 'CONTRADICTS' | 'DEPENDS_ON' | 'SIMILAR_TO' | 'VALIDATES';
  metadata?: {
    strength?: number;
    confidence?: number;
    context?: string;
  };
}

export interface MemoryEvolveParams {
  memoryId?: string;
  workspace?: string;
  trigger: 'usage_pattern' | 'contradiction' | 'validation' | 'manual';
  context?: string;
}

export interface MemoryFederateParams {
  memories: string[];
  targetInstance: string;
  mode: 'share' | 'sync' | 'merge';
  privacyLevel: 'patterns_only' | 'anonymized' | 'full';
}

// Memory Objects
export interface Memory {
  id: string;
  content: string;
  type: 'system1' | 'system2' | 'workspace';
  workspace?: string;
  embedding?: number[];
  quality: number;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
  accessCount: number;
  lastAccessAt: Date;
  tags: string[];
  metadata: Record<string, any>;
}

export interface MemoryRelationship {
  id: string;
  sourceMemoryId: string;
  targetMemoryId: string;
  type: string;
  strength: number;
  confidence: number;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface MemoryCollection {
  workspace: string;
  memories: Memory[];
  relationships: MemoryRelationship[];
  statistics: {
    totalMemories: number;
    memoryTypes: Record<string, number>;
    averageQuality: number;
    lastUpdate: Date;
  };
}

// Transport Layer Types
export interface TransportConfig {
  type: 'websocket' | 'http2' | 'stdio';
  host?: string;
  port?: number;
  path?: string;
  ssl?: {
    cert?: string;
    key?: string;
    ca?: string;
  };
  auth?: {
    type: 'bearer' | 'apikey' | 'basic' | 'none';
    token?: string;
    apiKey?: string;
    username?: string;
    password?: string;
  };
}

export interface MCPTransport extends EventEmitter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: MCPMessage): Promise<void>;
  isConnected(): boolean;
}

// Server Types
export interface MCPServerConfig {
  name: string;
  version: string;
  mode: 'default' | 'aggregator';
  transport: TransportConfig;
  capabilities: MemoryMCPCapabilities;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  auth?: {
    required: boolean;
    providers: string[];
  };
  memory?: {
    neo4jUri: string;
    vectorDb: {
      type: 'qdrant' | 'milvus';
      uri: string;
    };
    redis: {
      uri: string;
    };
  };
  aggregator?: {
    servers: Array<{
      name: string;
      uri: string;
      auth?: any;
    }>;
  };
}

export interface MCPServerContext {
  clientId?: string;
  workspace?: string;
  user?: {
    id: string;
    permissions: string[];
  };
  session: {
    id: string;
    startedAt: Date;
    metadata: Record<string, any>;
  };
}

// Handler Types
export type MCPToolHandler = (
  params: any,
  context: MCPServerContext
) => Promise<MCPToolResult>;

export type MCPResourceHandler = (
  uri: string,
  context: MCPServerContext
) => Promise<MCPContent[]>;

export type MCPPromptHandler = (
  name: string,
  args: Record<string, any>,
  context: MCPServerContext
) => Promise<MCPContent[]>;

// Events
export interface MCPServerEvents {
  'client:connected': (clientId: string) => void;
  'client:disconnected': (clientId: string) => void;
  'tool:called': (tool: string, params: any, context: MCPServerContext) => void;
  'resource:accessed': (uri: string, context: MCPServerContext) => void;
  'memory:stored': (memory: Memory, context: MCPServerContext) => void;
  'memory:updated': (memory: Memory, context: MCPServerContext) => void;
  'memory:related': (relationship: MemoryRelationship, context: MCPServerContext) => void;
  'error': (error: Error, context?: MCPServerContext) => void;
}

// Error Codes (following JSON-RPC 2.0 specification)
export enum MCPErrorCode {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  SERVER_ERROR_START = -32099,
  SERVER_ERROR_END = -32000,
  // Memory-specific errors
  MEMORY_NOT_FOUND = -32001,
  MEMORY_VALIDATION_ERROR = -32002,
  MEMORY_ARBITRATION_FAILED = -32003,
  MEMORY_FEDERATION_ERROR = -32004,
  INSUFFICIENT_PERMISSIONS = -32005,
  RATE_LIMIT_EXCEEDED = -32006,
  WORKSPACE_NOT_FOUND = -32007,
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export interface PaginationParams {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}