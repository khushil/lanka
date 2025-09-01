/**
 * Base MCP Server Implementation for LANKA Memory System
 * Provides core MCP functionality with memory-specific extensions
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import winston from 'winston';
import {
  MCPMessage,
  MCPRequest,
  MCPResponse,
  MCPNotification,
  MCPError,
  MCPErrorCode,
  MCPServerConfig,
  MCPServerContext,
  MCPServerEvents,
  MCPTool,
  MCPResource,
  MCPToolHandler,
  MCPResourceHandler,
  MCPPromptHandler,
  MemoryMCPCapabilities,
  MCPTransport,
} from '../types';

export abstract class BaseMCPServer extends EventEmitter {
  protected config: MCPServerConfig;
  protected transport: MCPTransport;
  protected logger: winston.Logger;
  protected tools: Map<string, { definition: MCPTool; handler: MCPToolHandler }> = new Map();
  protected resources: Map<string, { definition: MCPResource; handler: MCPResourceHandler }> = new Map();
  protected prompts: Map<string, MCPPromptHandler> = new Map();
  protected clients: Map<string, MCPServerContext> = new Map();
  protected requestHandlers: Map<string, (request: MCPRequest, context: MCPServerContext) => Promise<any>> = new Map();
  
  // Rate limiting
  private rateLimitMap: Map<string, { requests: number; window: number }> = new Map();
  
  constructor(config: MCPServerConfig) {
    super();
    this.config = config;
    this.setupLogger();
    this.setupDefaultHandlers();
  }

  private setupLogger(): void {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: `mcp-server-${this.config.name}` },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ],
    });
  }

  private setupDefaultHandlers(): void {
    // Initialize protocol handlers
    this.requestHandlers.set('initialize', this.handleInitialize.bind(this));
    this.requestHandlers.set('tools/list', this.handleToolsList.bind(this));
    this.requestHandlers.set('tools/call', this.handleToolCall.bind(this));
    this.requestHandlers.set('resources/list', this.handleResourcesList.bind(this));
    this.requestHandlers.set('resources/read', this.handleResourceRead.bind(this));
    this.requestHandlers.set('prompts/list', this.handlePromptsList.bind(this));
    this.requestHandlers.set('prompts/get', this.handlePromptGet.bind(this));
  }

  public async start(): Promise<void> {
    try {
      await this.initializeTransport();
      this.setupTransportEventHandlers();
      await this.transport.connect();
      this.logger.info(`MCP Server ${this.config.name} started successfully`);
    } catch (error) {
      this.logger.error('Failed to start MCP server:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      await this.transport.disconnect();
      this.clients.clear();
      this.logger.info(`MCP Server ${this.config.name} stopped`);
    } catch (error) {
      this.logger.error('Error stopping MCP server:', error);
      throw error;
    }
  }

  protected abstract initializeTransport(): Promise<void>;

  private setupTransportEventHandlers(): void {
    this.transport.on('message', this.handleMessage.bind(this));
    this.transport.on('connect', this.handleClientConnect.bind(this));
    this.transport.on('disconnect', this.handleClientDisconnect.bind(this));
    this.transport.on('error', this.handleTransportError.bind(this));
  }

  private async handleMessage(message: MCPMessage, clientId?: string): Promise<void> {
    try {
      if (!clientId) {
        clientId = randomUUID();
      }

      const context = this.getOrCreateContext(clientId);
      
      if (!this.checkRateLimit(context)) {
        await this.sendError(clientId, MCPErrorCode.RATE_LIMIT_EXCEEDED, 'Rate limit exceeded', message.id);
        return;
      }

      if (message.method) {
        // Request or notification
        if (message.id !== undefined) {
          // Request
          await this.handleRequest(message as MCPRequest, context);
        } else {
          // Notification
          await this.handleNotification(message as MCPNotification, context);
        }
      } else if (message.result !== undefined || message.error !== undefined) {
        // Response - handle if needed
        await this.handleResponse(message as MCPResponse, context);
      }
    } catch (error) {
      this.logger.error('Error handling message:', error);
      if (message.id !== undefined) {
        await this.sendError(
          clientId!,
          MCPErrorCode.INTERNAL_ERROR,
          'Internal server error',
          message.id
        );
      }
    }
  }

  private async handleRequest(request: MCPRequest, context: MCPServerContext): Promise<void> {
    const handler = this.requestHandlers.get(request.method);
    
    if (!handler) {
      await this.sendError(
        context.session.id,
        MCPErrorCode.METHOD_NOT_FOUND,
        `Method ${request.method} not found`,
        request.id
      );
      return;
    }

    try {
      const result = await handler(request, context);
      await this.sendResponse(context.session.id, result, request.id);
    } catch (error) {
      this.logger.error(`Error in handler for ${request.method}:`, error);
      await this.sendError(
        context.session.id,
        MCPErrorCode.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Unknown error',
        request.id
      );
    }
  }

  private async handleNotification(notification: MCPNotification, context: MCPServerContext): Promise<void> {
    // Handle notifications based on method
    switch (notification.method) {
      case 'notifications/cancelled':
        // Handle request cancellation
        break;
      case 'logging/setLevel':
        this.setLogLevel(notification.params?.level);
        break;
      default:
        this.logger.warn(`Unknown notification method: ${notification.method}`);
    }
  }

  private async handleResponse(response: MCPResponse, context: MCPServerContext): Promise<void> {
    // Handle responses if server acts as client to other servers
    this.emit('response', response, context);
  }

  private getOrCreateContext(clientId: string): MCPServerContext {
    let context = this.clients.get(clientId);
    
    if (!context) {
      context = {
        clientId,
        session: {
          id: clientId,
          startedAt: new Date(),
          metadata: {},
        },
      };
      this.clients.set(clientId, context);
    }
    
    return context;
  }

  private checkRateLimit(context: MCPServerContext): boolean {
    if (!this.config.rateLimit) return true;
    
    const now = Date.now();
    const windowMs = this.config.rateLimit.windowMs;
    const maxRequests = this.config.rateLimit.maxRequests;
    const key = context.clientId || context.session.id;
    
    const current = this.rateLimitMap.get(key);
    
    if (!current || now - current.window > windowMs) {
      this.rateLimitMap.set(key, { requests: 1, window: now });
      return true;
    }
    
    if (current.requests >= maxRequests) {
      return false;
    }
    
    current.requests++;
    return true;
  }

  private handleClientConnect(clientId: string): void {
    this.logger.info(`Client connected: ${clientId}`);
    this.emit('client:connected', clientId);
  }

  private handleClientDisconnect(clientId: string): void {
    this.clients.delete(clientId);
    this.rateLimitMap.delete(clientId);
    this.logger.info(`Client disconnected: ${clientId}`);
    this.emit('client:disconnected', clientId);
  }

  private handleTransportError(error: Error): void {
    this.logger.error('Transport error:', error);
    this.emit('error', error);
  }

  // Protocol Handlers
  private async handleInitialize(request: MCPRequest, context: MCPServerContext): Promise<any> {
    const { protocolVersion, capabilities, clientInfo } = request.params || {};
    
    if (protocolVersion !== '2024-11-05') {
      throw new Error('Unsupported protocol version');
    }

    // Update context with client info
    if (clientInfo) {
      context.session.metadata.clientInfo = clientInfo;
    }

    return {
      protocolVersion: '2024-11-05',
      capabilities: this.getCapabilities(),
      serverInfo: {
        name: this.config.name,
        version: this.config.version,
      },
    };
  }

  private async handleToolsList(request: MCPRequest, context: MCPServerContext): Promise<any> {
    const tools = Array.from(this.tools.values()).map(t => t.definition);
    return { tools };
  }

  private async handleToolCall(request: MCPRequest, context: MCPServerContext): Promise<any> {
    const { name, arguments: args } = request.params || {};
    
    if (!name) {
      throw new Error('Tool name is required');
    }

    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    this.emit('tool:called', name, args, context);
    
    try {
      const result = await tool.handler(args, context);
      return result;
    } catch (error) {
      this.logger.error(`Tool ${name} execution failed:`, error);
      throw error;
    }
  }

  private async handleResourcesList(request: MCPRequest, context: MCPServerContext): Promise<any> {
    const resources = Array.from(this.resources.values()).map(r => r.definition);
    return { resources };
  }

  private async handleResourceRead(request: MCPRequest, context: MCPServerContext): Promise<any> {
    const { uri } = request.params || {};
    
    if (!uri) {
      throw new Error('Resource URI is required');
    }

    const resource = this.findResourceByUri(uri);
    if (!resource) {
      throw new Error(`Resource ${uri} not found`);
    }

    this.emit('resource:accessed', uri, context);
    
    try {
      const contents = await resource.handler(uri, context);
      return { contents };
    } catch (error) {
      this.logger.error(`Resource ${uri} read failed:`, error);
      throw error;
    }
  }

  private async handlePromptsList(request: MCPRequest, context: MCPServerContext): Promise<any> {
    const prompts = Array.from(this.prompts.keys()).map(name => ({
      name,
      description: `Prompt: ${name}`,
    }));
    return { prompts };
  }

  private async handlePromptGet(request: MCPRequest, context: MCPServerContext): Promise<any> {
    const { name, arguments: args } = request.params || {};
    
    if (!name) {
      throw new Error('Prompt name is required');
    }

    const handler = this.prompts.get(name);
    if (!handler) {
      throw new Error(`Prompt ${name} not found`);
    }

    try {
      const messages = await handler(name, args || {}, context);
      return { messages };
    } catch (error) {
      this.logger.error(`Prompt ${name} execution failed:`, error);
      throw error;
    }
  }

  // Utility Methods
  private findResourceByUri(uri: string): { definition: MCPResource; handler: MCPResourceHandler } | undefined {
    for (const [, resource] of this.resources) {
      if (resource.definition.uri === uri) {
        return resource;
      }
    }
    return undefined;
  }

  protected getCapabilities(): MemoryMCPCapabilities {
    return {
      tools: {
        listChanged: true,
      },
      resources: {
        subscribe: true,
        listChanged: true,
      },
      prompts: {
        listChanged: true,
      },
      logging: {},
      memory: {
        search: true,
        store: true,
        relate: true,
        evolve: true,
        federate: true,
        subscribe: true,
      },
    };
  }

  protected async sendResponse(clientId: string, result: any, requestId: string | number): Promise<void> {
    const response: MCPResponse = {
      jsonrpc: '2.0',
      id: requestId,
      result,
    };
    
    await this.transport.send(response);
  }

  protected async sendError(
    clientId: string,
    code: MCPErrorCode,
    message: string,
    requestId?: string | number,
    data?: any
  ): Promise<void> {
    const error: MCPError = { code, message, data };
    const response: MCPResponse = {
      jsonrpc: '2.0',
      id: requestId || null,
      error,
    };
    
    await this.transport.send(response);
  }

  protected async sendNotification(method: string, params?: any): Promise<void> {
    const notification: MCPNotification = {
      jsonrpc: '2.0',
      method,
      params,
    };
    
    await this.transport.send(notification);
  }

  private setLogLevel(level: string): void {
    if (['error', 'warn', 'info', 'debug'].includes(level)) {
      this.logger.level = level;
    }
  }

  // Public API for registering handlers
  public registerTool(name: string, definition: MCPTool, handler: MCPToolHandler): void {
    this.tools.set(name, { definition, handler });
    this.logger.debug(`Registered tool: ${name}`);
  }

  public registerResource(uri: string, definition: MCPResource, handler: MCPResourceHandler): void {
    this.resources.set(uri, { definition, handler });
    this.logger.debug(`Registered resource: ${uri}`);
  }

  public registerPrompt(name: string, handler: MCPPromptHandler): void {
    this.prompts.set(name, handler);
    this.logger.debug(`Registered prompt: ${name}`);
  }

  public unregisterTool(name: string): void {
    this.tools.delete(name);
    this.logger.debug(`Unregistered tool: ${name}`);
  }

  public unregisterResource(uri: string): void {
    this.resources.delete(uri);
    this.logger.debug(`Unregistered resource: ${uri}`);
  }

  public unregisterPrompt(name: string): void {
    this.prompts.delete(name);
    this.logger.debug(`Unregistered prompt: ${name}`);
  }
}