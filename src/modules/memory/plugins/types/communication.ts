// Plugin Communication Types
// Inter-plugin communication and messaging interfaces

export enum MessageType {
  BROADCAST = 'broadcast',
  DIRECT = 'direct',
  REQUEST = 'request',
  RESPONSE = 'response',
  NOTIFICATION = 'notification'
}

export interface PluginMessage {
  id: string;
  type: MessageType;
  from: string;
  to?: string;
  subject: string;
  payload: any;
  timestamp: Date;
  correlationId?: string;
  replyTo?: string;
  ttl?: number;
  priority?: number;
}

export interface MessageRoute {
  from: string;
  to: string;
  allowed: boolean;
  filters: MessageFilter[];
}

export interface MessageFilter {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'gt' | 'lt';
  value: any;
}

// Plugin collaboration interfaces
export interface CollaborationRequest {
  id: string;
  initiator: string;
  participants: string[];
  purpose: string;
  requirements: CollaborationRequirement[];
  deadline?: Date;
  priority: number;
}

export interface CollaborationRequirement {
  capability: string;
  description: string;
  mandatory: boolean;
  parameters?: Record<string, any>;
}

export interface CollaborationResponse {
  requestId: string;
  participant: string;
  accepted: boolean;
  capabilities: string[];
  constraints?: string[];
  estimatedTime?: number;
}

// Shared memory space for plugins
export interface SharedMemorySpace {
  namespace: string;
  owner: string;
  permissions: SharedMemoryPermission[];
  data: Record<string, any>;
  metadata: Record<string, any>;
  ttl?: Date;
}

export interface SharedMemoryPermission {
  pluginId: string;
  access: 'read' | 'write' | 'delete';
  conditions?: string[];
}

// Plugin discovery and capability matching
export interface PluginCapabilityMatch {
  pluginId: string;
  capability: string;
  confidence: number;
  metadata: Record<string, any>;
  constraints: string[];
}

export interface CapabilityRequest {
  id: string;
  requester: string;
  capability: string;
  parameters: Record<string, any>;
  constraints: string[];
  timeout: number;
}

export interface CapabilityResponse {
  requestId: string;
  provider: string;
  result: any;
  success: boolean;
  error?: string;
  executionTime: number;
}

// Inter-plugin communication interfaces
export interface ICommunicationBus {
  sendMessage(message: PluginMessage): Promise<void>;
  broadcastMessage(message: Omit<PluginMessage, 'to'>): Promise<void>;
  subscribeToMessages(pluginId: string, filter: MessageFilter[], handler: MessageHandler): void;
  unsubscribeFromMessages(pluginId: string): void;
  requestCapability(request: CapabilityRequest): Promise<CapabilityResponse>;
  registerCapability(pluginId: string, capability: string, handler: CapabilityHandler): void;
  findPluginsByCapability(capability: string): PluginCapabilityMatch[];
  createSharedMemorySpace(space: Omit<SharedMemorySpace, 'data'>): Promise<string>;
  accessSharedMemorySpace(namespace: string, pluginId: string): Promise<any>;
}

export type MessageHandler = (message: PluginMessage) => Promise<void> | void;
export type CapabilityHandler = (request: CapabilityRequest) => Promise<any>;

// Plugin coordination patterns
export enum CoordinationPattern {
  PIPELINE = 'pipeline',
  SCATTER_GATHER = 'scatter-gather',
  PUBLISH_SUBSCRIBE = 'publish-subscribe',
  REQUEST_REPLY = 'request-reply',
  CONSENSUS = 'consensus',
  WORKFLOW = 'workflow'
}

export interface CoordinationTask {
  id: string;
  pattern: CoordinationPattern;
  participants: string[];
  steps: CoordinationStep[];
  metadata: Record<string, any>;
  timeout?: number;
}

export interface CoordinationStep {
  id: string;
  type: 'action' | 'decision' | 'aggregation';
  participant: string;
  input: any;
  output?: any;
  dependencies: string[];
  timeout?: number;
}

// Plugin network topology
export interface PluginTopology {
  nodes: PluginNode[];
  edges: PluginEdge[];
  metadata: Record<string, any>;
}

export interface PluginNode {
  id: string;
  type: string;
  capabilities: string[];
  load: number;
  connections: string[];
}

export interface PluginEdge {
  from: string;
  to: string;
  type: string;
  weight: number;
  latency: number;
}
