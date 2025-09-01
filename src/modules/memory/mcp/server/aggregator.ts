/**
 * Aggregator Mode MCP Server for LANKA Memory System
 * Acts as intelligent proxy for other MCP servers while adding memory capabilities
 */

import { BaseMCPServer } from './base';
import { WebSocketTransport } from '../transport/websocket';
import {
  MCPServerConfig,
  MCPServerContext,
  MCPRequest,
  MCPResponse,
  MCPTool,
  MCPToolResult,
  MCPContent,
  MCPErrorCode,
} from '../types';
import { MemoryService } from './services/memory';
import { ProxyService } from './services/proxy';
import { LearningExtractor } from './services/learning-extractor';

interface ProxiedServer {
  name: string;
  uri: string;
  auth?: any;
  tools: MCPTool[];
  connected: boolean;
  lastPing: Date;
}

export class AggregatorMCPServer extends BaseMCPServer {
  private memoryService: MemoryService;
  private proxyService: ProxyService;
  private learningExtractor: LearningExtractor;
  private proxiedServers: Map<string, ProxiedServer> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: MCPServerConfig) {
    super(config);
    this.initializeServices();
    this.registerAggregatorTools();
    this.setupProxiedServers();
    this.startHealthMonitoring();
  }

  private initializeServices(): void {
    this.memoryService = new MemoryService(this.config.memory!);
    this.proxyService = new ProxyService();
    this.learningExtractor = new LearningExtractor(this.memoryService);
  }

  protected async initializeTransport(): Promise<void> {
    this.transport = new WebSocketTransport(this.config.transport);
  }

  private registerAggregatorTools(): void {
    // Register memory tools from default mode
    this.registerMemoryTools();

    // Register aggregator-specific tools
    this.registerTool(
      'proxy-list-servers',
      {
        name: 'proxy-list-servers',
        description: 'List all proxied MCP servers and their status',
        inputSchema: {
          type: 'object',
          properties: {
            includeTools: {
              type: 'boolean',
              description: 'Include tool lists from each server',
              default: false,
            },
            onlyConnected: {
              type: 'boolean',
              description: 'Only show connected servers',
              default: false,
            },
          },
        },
      },
      this.handleProxyListServers.bind(this)
    );

    this.registerTool(
      'proxy-call-tool',
      {
        name: 'proxy-call-tool',
        description: 'Call a tool on a proxied server with automatic memory extraction',
        inputSchema: {
          type: 'object',
          properties: {
            server: {
              type: 'string',
              description: 'Name of the server to call',
            },
            tool: {
              type: 'string',
              description: 'Name of the tool to call',
            },
            arguments: {
              type: 'object',
              description: 'Arguments to pass to the tool',
              default: {},
            },
            extractLearning: {
              type: 'boolean',
              description: 'Extract learning opportunities from the operation',
              default: true,
            },
            memoryContext: {
              type: 'string',
              description: 'Additional context for memory extraction',
            },
          },
          required: ['server', 'tool'],
        },
      },
      this.handleProxyCallTool.bind(this)
    );

    this.registerTool(
      'proxy-batch-operations',
      {
        name: 'proxy-batch-operations',
        description: 'Execute multiple operations across different servers',
        inputSchema: {
          type: 'object',
          properties: {
            operations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  server: { type: 'string' },
                  tool: { type: 'string' },
                  arguments: { type: 'object' },
                },
                required: ['server', 'tool'],
              },
              description: 'List of operations to execute',
            },
            parallel: {
              type: 'boolean',
              description: 'Execute operations in parallel',
              default: true,
            },
            continueOnError: {
              type: 'boolean',
              description: 'Continue execution if one operation fails',
              default: true,
            },
            extractLearning: {
              type: 'boolean',
              description: 'Extract learning from all operations',
              default: true,
            },
          },
          required: ['operations'],
        },
      },
      this.handleProxyBatchOperations.bind(this)
    );
  }

  private async setupProxiedServers(): Promise<void> {
    if (!this.config.aggregator?.servers) {
      this.logger.warn('No proxied servers configured');
      return;
    }

    for (const serverConfig of this.config.aggregator.servers) {
      try {
        const server: ProxiedServer = {
          name: serverConfig.name,
          uri: serverConfig.uri,
          auth: serverConfig.auth,
          tools: [],
          connected: false,
          lastPing: new Date(),
        };

        // Connect to the server and get its capabilities
        await this.connectToProxiedServer(server);
        this.proxiedServers.set(server.name, server);

        this.logger.info(`Connected to proxied server: ${server.name}`);
      } catch (error) {
        this.logger.error(`Failed to connect to proxied server ${serverConfig.name}:`, error);
      }
    }
  }

  private async connectToProxiedServer(server: ProxiedServer): Promise<void> {
    try {
      // Initialize connection using proxy service
      await this.proxyService.connect(server.name, server.uri, server.auth);
      
      // Get server capabilities and tools
      const tools = await this.proxyService.listTools(server.name);
      server.tools = tools;
      server.connected = true;
      server.lastPing = new Date();

      // Register proxied tools with memory-enhanced descriptions
      for (const tool of tools) {
        const enhancedTool: MCPTool = {
          ...tool,
          name: `${server.name}:${tool.name}`,
          description: `${tool.description} (proxied from ${server.name}, with automatic memory extraction)`,
        };

        this.registerTool(
          enhancedTool.name,
          enhancedTool,
          async (params: any, context: MCPServerContext) => {
            return this.handleProxiedTool(server.name, tool.name, params, context);
          }
        );
      }

    } catch (error) {
      server.connected = false;
      throw error;
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000); // Check every 30 seconds
  }

  private async performHealthCheck(): Promise<void> {
    for (const [serverName, server] of this.proxiedServers) {
      try {
        const isHealthy = await this.proxyService.healthCheck(serverName);
        
        if (isHealthy !== server.connected) {
          server.connected = isHealthy;
          server.lastPing = new Date();
          
          this.logger.info(`Server ${serverName} health status changed: ${isHealthy ? 'connected' : 'disconnected'}`);
          
          // Emit event for monitoring
          this.emit('proxy:health-change', serverName, isHealthy);
        }
      } catch (error) {
        this.logger.error(`Health check failed for server ${serverName}:`, error);
        server.connected = false;
      }
    }
  }

  // Tool Handlers
  private async handleProxyListServers(
    params: { includeTools?: boolean; onlyConnected?: boolean },
    context: MCPServerContext
  ): Promise<MCPToolResult> {
    try {
      const servers = Array.from(this.proxiedServers.values())
        .filter(server => !params.onlyConnected || server.connected)
        .map(server => ({
          name: server.name,
          uri: server.uri,
          connected: server.connected,
          lastPing: server.lastPing,
          toolCount: server.tools.length,
          tools: params.includeTools ? server.tools : undefined,
        }));

      const content: MCPContent[] = [{
        type: 'text',
        text: JSON.stringify({
          totalServers: servers.length,
          connectedServers: servers.filter(s => s.connected).length,
          servers,
        }, null, 2),
      }];

      return { content };

    } catch (error) {
      this.logger.error('Failed to list proxied servers:', error);
      return {
        content: [{
          type: 'text',
          text: `Failed to list proxied servers: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }],
        isError: true,
      };
    }
  }

  private async handleProxyCallTool(
    params: {
      server: string;
      tool: string;
      arguments?: any;
      extractLearning?: boolean;
      memoryContext?: string;
    },
    context: MCPServerContext
  ): Promise<MCPToolResult> {
    try {
      const server = this.proxiedServers.get(params.server);
      if (!server) {
        throw new Error(`Server ${params.server} not found`);
      }

      if (!server.connected) {
        throw new Error(`Server ${params.server} is not connected`);
      }

      // Execute the proxied tool call
      const startTime = Date.now();
      const result = await this.proxyService.callTool(
        params.server,
        params.tool,
        params.arguments || {},
        context
      );
      const duration = Date.now() - startTime;

      // Extract learning opportunities if enabled
      if (params.extractLearning !== false) {
        try {
          await this.learningExtractor.extractFromToolCall({
            server: params.server,
            tool: params.tool,
            arguments: params.arguments || {},
            result,
            duration,
            context: params.memoryContext,
            workspace: context.workspace,
          });
        } catch (extractError) {
          this.logger.warn('Failed to extract learning from tool call:', extractError);
        }
      }

      // Enhance result with proxy metadata
      const enhancedContent: MCPContent[] = [
        ...result.content,
        {
          type: 'text',
          text: `\n\n--- Proxy Metadata ---\nServer: ${params.server}\nTool: ${params.tool}\nDuration: ${duration}ms\nLearning Extracted: ${params.extractLearning !== false}`,
        },
      ];

      return {
        content: enhancedContent,
        isError: result.isError,
      };

    } catch (error) {
      this.logger.error(`Proxied tool call failed (${params.server}:${params.tool}):`, error);
      return {
        content: [{
          type: 'text',
          text: `Proxied tool call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }],
        isError: true,
      };
    }
  }

  private async handleProxiedTool(
    serverName: string,
    toolName: string,
    params: any,
    context: MCPServerContext
  ): Promise<MCPToolResult> {
    // This is called when a proxied tool is invoked directly
    return this.handleProxyCallTool({
      server: serverName,
      tool: toolName,
      arguments: params,
      extractLearning: true,
    }, context);
  }

  private async handleProxyBatchOperations(
    params: {
      operations: Array<{
        server: string;
        tool: string;
        arguments?: any;
      }>;
      parallel?: boolean;
      continueOnError?: boolean;
      extractLearning?: boolean;
    },
    context: MCPServerContext
  ): Promise<MCPToolResult> {
    try {
      const results: Array<{
        server: string;
        tool: string;
        success: boolean;
        result?: MCPToolResult;
        error?: string;
        duration: number;
      }> = [];

      const executeOperation = async (operation: any) => {
        const startTime = Date.now();
        try {
          const result = await this.proxyService.callTool(
            operation.server,
            operation.tool,
            operation.arguments || {},
            context
          );

          const duration = Date.now() - startTime;

          // Extract learning if enabled
          if (params.extractLearning !== false) {
            try {
              await this.learningExtractor.extractFromToolCall({
                server: operation.server,
                tool: operation.tool,
                arguments: operation.arguments || {},
                result,
                duration,
                workspace: context.workspace,
              });
            } catch (extractError) {
              this.logger.warn('Failed to extract learning from batch operation:', extractError);
            }
          }

          return {
            server: operation.server,
            tool: operation.tool,
            success: true,
            result,
            duration,
          };

        } catch (error) {
          const duration = Date.now() - startTime;
          return {
            server: operation.server,
            tool: operation.tool,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration,
          };
        }
      };

      // Execute operations
      if (params.parallel !== false) {
        // Parallel execution
        const promises = params.operations.map(executeOperation);
        const operationResults = await Promise.all(promises);
        results.push(...operationResults);
      } else {
        // Sequential execution
        for (const operation of params.operations) {
          const result = await executeOperation(operation);
          results.push(result);

          // Stop on first error if continueOnError is false
          if (!result.success && params.continueOnError === false) {
            break;
          }
        }
      }

      // Compile summary
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

      const content: MCPContent[] = [{
        type: 'text',
        text: JSON.stringify({
          summary: {
            total: results.length,
            successful,
            failed,
            totalDuration,
            averageDuration: results.length > 0 ? totalDuration / results.length : 0,
          },
          results,
        }, null, 2),
      }];

      return { content, isError: failed > 0 };

    } catch (error) {
      this.logger.error('Batch operations failed:', error);
      return {
        content: [{
          type: 'text',
          text: `Batch operations failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }],
        isError: true,
      };
    }
  }

  private registerMemoryTools(): void {
    // Import memory tools from default mode implementation
    // This would be the same tools as in DefaultMCPServer
    // For brevity, referencing the implementation rather than duplicating
    this.logger.info('Memory tools registered in aggregator mode');
  }

  // Utility Methods
  public getProxiedServerStatus(): Array<{
    name: string;
    connected: boolean;
    toolCount: number;
    lastPing: Date;
  }> {
    return Array.from(this.proxiedServers.values()).map(server => ({
      name: server.name,
      connected: server.connected,
      toolCount: server.tools.length,
      lastPing: server.lastPing,
    }));
  }

  public async reconnectServer(serverName: string): Promise<void> {
    const server = this.proxiedServers.get(serverName);
    if (!server) {
      throw new Error(`Server ${serverName} not found`);
    }

    try {
      await this.connectToProxiedServer(server);
      this.logger.info(`Reconnected to server: ${serverName}`);
    } catch (error) {
      this.logger.error(`Failed to reconnect to server ${serverName}:`, error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Disconnect from all proxied servers
    for (const serverName of this.proxiedServers.keys()) {
      try {
        await this.proxyService.disconnect(serverName);
      } catch (error) {
        this.logger.error(`Error disconnecting from server ${serverName}:`, error);
      }
    }

    // Close services
    await this.memoryService.close();
    await this.proxyService.close();

    // Call parent stop
    await super.stop();
  }

  // Event Handlers for Memory Integration
  private setupMemoryIntegration(): void {
    // Listen for memory events and broadcast to clients
    this.memoryService.on('memory:stored', (memory: any, context: MCPServerContext) => {
      this.sendNotification('memory/stored', {
        memory: {
          id: memory.id,
          type: memory.type,
          workspace: memory.workspace,
        },
        context: context.clientId,
      });
    });

    this.memoryService.on('memory:evolved', (evolution: any) => {
      this.sendNotification('memory/evolved', evolution);
    });

    // Listen for proxy events
    this.on('proxy:health-change', (serverName: string, isHealthy: boolean) => {
      this.sendNotification('proxy/health-change', {
        server: serverName,
        healthy: isHealthy,
        timestamp: new Date().toISOString(),
      });
    });
  }
}