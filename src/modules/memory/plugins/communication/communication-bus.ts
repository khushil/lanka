// Communication Bus Implementation
// Inter-plugin messaging and capability system

import { EventEmitter } from 'events';
import {
  ICommunicationBus,
  PluginMessage,
  MessageType,
  MessageFilter,
  MessageHandler,
  CapabilityRequest,
  CapabilityResponse,
  CapabilityHandler,
  PluginCapabilityMatch,
  SharedMemorySpace,
  SharedMemoryPermission
} from '../types';

export class CommunicationBus extends EventEmitter implements ICommunicationBus {
  private messageRoutes: Map<string, MessageRoute[]> = new Map();
  private messageHandlers: Map<string, MessageHandlerEntry[]> = new Map();
  private capabilityHandlers: Map<string, CapabilityHandlerEntry[]> = new Map();
  private sharedMemorySpaces: Map<string, SharedMemorySpace> = new Map();
  private messageHistory: PluginMessage[] = [];
  private maxHistorySize = 10000;

  async initialize(): Promise<void> {
    console.log('Initializing communication bus...');
    
    // Set up message routing
    this.setupMessageRouting();
    
    // Set up capability discovery
    this.setupCapabilityDiscovery();
    
    console.log('Communication bus initialized');
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down communication bus...');
    
    // Clean up all handlers and routes
    this.messageRoutes.clear();
    this.messageHandlers.clear();
    this.capabilityHandlers.clear();
    this.sharedMemorySpaces.clear();
    this.messageHistory = [];
    
    this.removeAllListeners();
    
    console.log('Communication bus shutdown complete');
  }

  async sendMessage(message: PluginMessage): Promise<void> {
    // Validate message
    this.validateMessage(message);
    
    // Check routing permissions
    if (!this.canRoute(message.from, message.to)) {
      throw new Error(`Message routing not allowed from ${message.from} to ${message.to}`);
    }

    // Add to history
    this.addToMessageHistory(message);

    // Route message to target
    if (message.to) {
      await this.routeDirectMessage(message);
    } else {
      await this.broadcastMessage(message);
    }

    console.log(`Message sent from ${message.from} to ${message.to || 'broadcast'}`);
  }

  async broadcastMessage(message: Omit<PluginMessage, 'to'>): Promise<void> {
    const broadcastMessage: PluginMessage = {
      ...message,
      type: MessageType.BROADCAST,
      to: undefined
    };

    this.validateMessage(broadcastMessage);
    this.addToMessageHistory(broadcastMessage);

    // Send to all registered handlers
    for (const [pluginId, handlers] of this.messageHandlers) {
      if (pluginId !== message.from) { // Don't send back to sender
        for (const handler of handlers) {
          if (this.messageMatchesFilters(broadcastMessage, handler.filters)) {
            try {
              await handler.handler(broadcastMessage);
            } catch (error) {
              console.error(`Error handling broadcast in plugin ${pluginId}:`, error);
            }
          }
        }
      }
    }

    console.log(`Broadcast message sent from ${message.from}`);
  }

  subscribeToMessages(
    pluginId: string, 
    filters: MessageFilter[], 
    handler: MessageHandler
  ): void {
    if (!this.messageHandlers.has(pluginId)) {
      this.messageHandlers.set(pluginId, []);
    }

    const handlers = this.messageHandlers.get(pluginId)!;
    handlers.push({
      handler,
      filters,
      subscribedAt: new Date()
    });

    console.log(`Plugin ${pluginId} subscribed to messages`);
  }

  unsubscribeFromMessages(pluginId: string): void {
    this.messageHandlers.delete(pluginId);
    console.log(`Plugin ${pluginId} unsubscribed from messages`);
  }

  async requestCapability(request: CapabilityRequest): Promise<CapabilityResponse> {
    const startTime = Date.now();
    
    try {
      // Find plugins that can handle this capability
      const matches = this.findPluginsByCapability(request.capability);
      
      if (matches.length === 0) {
        return {
          requestId: request.id,
          provider: '',
          result: null,
          success: false,
          error: `No plugins found for capability: ${request.capability}`,
          executionTime: Date.now() - startTime
        };
      }

      // Select best match (highest confidence)
      const bestMatch = matches.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );

      // Get capability handlers for the best match
      const handlers = this.capabilityHandlers.get(bestMatch.pluginId);
      const handler = handlers?.find(h => h.capability === request.capability);

      if (!handler) {
        return {
          requestId: request.id,
          provider: bestMatch.pluginId,
          result: null,
          success: false,
          error: `Capability handler not found for ${request.capability}`,
          executionTime: Date.now() - startTime
        };
      }

      // Execute capability with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Capability request timeout')), request.timeout);
      });

      const resultPromise = handler.handler(request);
      const result = await Promise.race([resultPromise, timeoutPromise]);

      return {
        requestId: request.id,
        provider: bestMatch.pluginId,
        result,
        success: true,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        requestId: request.id,
        provider: '',
        result: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      };
    }
  }

  registerCapability(
    pluginId: string, 
    capability: string, 
    handler: CapabilityHandler
  ): void {
    if (!this.capabilityHandlers.has(pluginId)) {
      this.capabilityHandlers.set(pluginId, []);
    }

    const handlers = this.capabilityHandlers.get(pluginId)!;
    handlers.push({
      capability,
      handler,
      registeredAt: new Date()
    });

    console.log(`Plugin ${pluginId} registered capability: ${capability}`);
  }

  findPluginsByCapability(capability: string): PluginCapabilityMatch[] {
    const matches: PluginCapabilityMatch[] = [];

    for (const [pluginId, handlers] of this.capabilityHandlers) {
      for (const handler of handlers) {
        if (handler.capability === capability) {
          matches.push({
            pluginId,
            capability,
            confidence: this.calculateCapabilityConfidence(pluginId, capability),
            metadata: {
              registeredAt: handler.registeredAt,
              handlerCount: handlers.length
            },
            constraints: []
          });
        }
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  async createSharedMemorySpace(
    space: Omit<SharedMemorySpace, 'data'>
  ): Promise<string> {
    const fullSpace: SharedMemorySpace = {
      ...space,
      data: {},
      metadata: {
        ...space.metadata,
        createdAt: new Date().toISOString()
      }
    };

    this.sharedMemorySpaces.set(space.namespace, fullSpace);
    
    console.log(`Created shared memory space: ${space.namespace} (owner: ${space.owner})`);
    
    return space.namespace;
  }

  async accessSharedMemorySpace(namespace: string, pluginId: string): Promise<any> {
    const space = this.sharedMemorySpaces.get(namespace);
    if (!space) {
      throw new Error(`Shared memory space not found: ${namespace}`);
    }

    // Check permissions
    const hasPermission = space.owner === pluginId || 
      space.permissions.some(p => p.pluginId === pluginId && p.access === 'read');
    
    if (!hasPermission) {
      throw new Error(`No permission to access shared memory space: ${namespace}`);
    }

    // Check TTL
    if (space.ttl && new Date() > space.ttl) {
      this.sharedMemorySpaces.delete(namespace);
      throw new Error(`Shared memory space expired: ${namespace}`);
    }

    console.log(`Plugin ${pluginId} accessed shared memory space: ${namespace}`);
    
    return { ...space.data }; // Return copy to prevent modification
  }

  // Message routing and filtering

  private async routeDirectMessage(message: PluginMessage): Promise<void> {
    const targetHandlers = this.messageHandlers.get(message.to!);
    if (!targetHandlers) {
      console.warn(`No message handlers found for plugin: ${message.to}`);
      return;
    }

    for (const handler of targetHandlers) {
      if (this.messageMatchesFilters(message, handler.filters)) {
        try {
          await handler.handler(message);
        } catch (error) {
          console.error(`Error handling message in plugin ${message.to}:`, error);
        }
      }
    }
  }

  private messageMatchesFilters(message: PluginMessage, filters: MessageFilter[]): boolean {
    if (filters.length === 0) return true;

    return filters.every(filter => {
      const fieldValue = this.getNestedField(message, filter.field);
      
      switch (filter.operator) {
        case 'equals':
          return fieldValue === filter.value;
        case 'contains':
          return typeof fieldValue === 'string' && fieldValue.includes(filter.value);
        case 'matches':
          return typeof fieldValue === 'string' && new RegExp(filter.value).test(fieldValue);
        case 'gt':
          return typeof fieldValue === 'number' && fieldValue > filter.value;
        case 'lt':
          return typeof fieldValue === 'number' && fieldValue < filter.value;
        default:
          return false;
      }
    });
  }

  private getNestedField(obj: any, field: string): any {
    return field.split('.').reduce((current, key) => current?.[key], obj);
  }

  private canRoute(from: string, to?: string): boolean {
    // For now, allow all routing
    // In a production system, implement proper routing policies
    return true;
  }

  private validateMessage(message: PluginMessage): void {
    if (!message.id || typeof message.id !== 'string') {
      throw new Error('Message ID is required');
    }
    
    if (!message.from || typeof message.from !== 'string') {
      throw new Error('Message sender is required');
    }
    
    if (!message.subject || typeof message.subject !== 'string') {
      throw new Error('Message subject is required');
    }
    
    if (!Object.values(MessageType).includes(message.type)) {
      throw new Error('Invalid message type');
    }
    
    // Check message size
    const messageSize = JSON.stringify(message).length;
    if (messageSize > 1024 * 1024) { // 1MB limit
      throw new Error('Message too large (max 1MB)');
    }
  }

  private addToMessageHistory(message: PluginMessage): void {
    this.messageHistory.push(message);
    
    // Limit history size
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
    }
  }

  private calculateCapabilityConfidence(pluginId: string, capability: string): number {
    // Simple confidence calculation based on plugin track record
    // In a real system, this would use historical performance data
    return 0.8 + Math.random() * 0.2; // 80-100% confidence
  }

  private setupMessageRouting(): void {
    // Set up default message routes
    // In a real system, this would load from configuration
  }

  private setupCapabilityDiscovery(): void {
    // Set up capability discovery mechanisms
    // Could include auto-discovery, registry updates, etc.
  }

  // Monitoring and metrics

  getMessageMetrics(): MessageMetrics {
    const totalMessages = this.messageHistory.length;
    const totalHandlers = Array.from(this.messageHandlers.values())
      .reduce((total, handlers) => total + handlers.length, 0);
    const totalCapabilities = Array.from(this.capabilityHandlers.values())
      .reduce((total, handlers) => total + handlers.length, 0);
    const sharedSpaces = this.sharedMemorySpaces.size;

    return {
      totalMessages,
      totalHandlers,
      totalCapabilities,
      sharedSpaces,
      activePlugins: this.messageHandlers.size
    };
  }

  getMessageHistory(pluginId?: string, limit = 100): PluginMessage[] {
    let history = [...this.messageHistory];
    
    if (pluginId) {
      history = history.filter(msg => msg.from === pluginId || msg.to === pluginId);
    }
    
    return history.slice(-limit);
  }
}

// Helper interfaces
interface MessageRoute {
  from: string;
  to: string;
  allowed: boolean;
  filters: MessageFilter[];
}

interface MessageHandlerEntry {
  handler: MessageHandler;
  filters: MessageFilter[];
  subscribedAt: Date;
}

interface CapabilityHandlerEntry {
  capability: string;
  handler: CapabilityHandler;
  registeredAt: Date;
}

interface MessageMetrics {
  totalMessages: number;
  totalHandlers: number;
  totalCapabilities: number;
  sharedSpaces: number;
  activePlugins: number;
}
