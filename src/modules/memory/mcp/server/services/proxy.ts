/**
 * Proxy Service for Aggregator MCP Server
 * Handles communication with other MCP servers
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import winston from 'winston';
import {
  MCPMessage,
  MCPRequest,
  MCPResponse,
  MCPTool,
  MCPToolResult,
  MCPServerContext,
  MCPErrorCode,
} from '../../types';

interface ProxyConnection {
  name: string;
  uri: string;
  ws?: WebSocket;
  auth?: any;
  connected: boolean;
  lastActivity: Date;
  pendingRequests: Map<string | number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timestamp: Date;
  }>;
}

export class ProxyService extends EventEmitter {
  private connections: Map<string, ProxyConnection> = new Map();
  private logger: winston.Logger;
  private requestTimeout: number = 30000; // 30 seconds
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.setupLogger();
    this.startCleanupTimer();
  }

  private setupLogger(): void {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'proxy-service' },
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

  private startCleanupTimer(): void {
    // Clean up expired requests every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredRequests();
    }, 60000);
  }

  public async connect(name: string, uri: string, auth?: any): Promise<void> {
    try {
      if (this.connections.has(name)) {
        const existing = this.connections.get(name)!;
        if (existing.connected) {
          return; // Already connected
        }
        // Clean up old connection
        await this.disconnect(name);
      }

      const connection: ProxyConnection = {
        name,
        uri,
        auth,
        connected: false,
        lastActivity: new Date(),
        pendingRequests: new Map(),
      };

      const ws = new WebSocket(uri, {
        headers: this.buildAuthHeaders(auth),
      });

      connection.ws = ws;

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          connection.connected = true;
          connection.lastActivity = new Date();
          this.connections.set(name, connection);
          
          this.logger.info(`Connected to proxied server: ${name} at ${uri}`);
          resolve();
        });

        ws.on('error', (error) => {
          this.logger.error(`Connection failed to ${name}:`, error);
          reject(error);
        });

        ws.on('close', (code, reason) => {
          connection.connected = false;
          this.logger.info(`Connection closed to ${name}: ${code} ${reason}`);
          this.emit('disconnected', name);
        });

        ws.on('message', (data) => {
          this.handleMessage(name, data);
        });
      });

      // Initialize the connection with the proxied server
      await this.initializeConnection(name);

    } catch (error) {
      this.logger.error(`Failed to connect to ${name}:`, error);
      throw error;
    }
  }

  public async disconnect(name: string): Promise<void> {
    const connection = this.connections.get(name);
    if (!connection) return;

    // Reject all pending requests
    for (const [requestId, pending] of connection.pendingRequests) {
      pending.reject(new Error('Connection closed'));
    }
    connection.pendingRequests.clear();

    if (connection.ws) {
      connection.ws.close();
    }

    connection.connected = false;
    this.connections.delete(name);
    
    this.logger.info(`Disconnected from proxied server: ${name}`);
  }

  private buildAuthHeaders(auth?: any): Record<string, string> {
    const headers: Record<string, string> = {};

    if (auth) {
      switch (auth.type) {
        case 'bearer':
          headers['Authorization'] = `Bearer ${auth.token}`;
          break;
        case 'apikey':
          headers['X-API-Key'] = auth.apiKey;
          break;
        case 'basic':
          const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
          break;
      }
    }

    return headers;
  }

  private async initializeConnection(serverName: string): Promise<void> {
    // Send initialize request to establish protocol
    const initRequest: MCPRequest = {
      jsonrpc: '2.0',
      id: this.generateRequestId(),
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: { listChanged: true },
          resources: { subscribe: true },
        },
        clientInfo: {
          name: 'LANKA-Memory-Aggregator',
          version: '1.0.0',
        },
      },
    };

    try {
      const response = await this.sendRequest(serverName, initRequest);
      this.logger.debug(`Initialized connection to ${serverName}:`, response);
    } catch (error) {
      this.logger.error(`Failed to initialize connection to ${serverName}:`, error);
      throw error;
    }
  }

  private handleMessage(serverName: string, data: WebSocket.RawData): void {
    try {
      const message: MCPMessage = JSON.parse(data.toString());
      const connection = this.connections.get(serverName);
      
      if (!connection) {
        this.logger.error(`Received message from unknown server: ${serverName}`);
        return;
      }

      connection.lastActivity = new Date();

      if (message.id !== undefined && (message.result !== undefined || message.error !== undefined)) {
        // This is a response to a request
        const pending = connection.pendingRequests.get(message.id);
        if (pending) {
          connection.pendingRequests.delete(message.id);
          
          if (message.error) {
            pending.reject(new Error(`Remote error: ${message.error.message}`));
          } else {
            pending.resolve(message.result);
          }
        }
      } else if (message.method) {
        // This is a notification or request from the server
        this.emit('message', serverName, message);
      }

    } catch (error) {
      this.logger.error(`Error parsing message from ${serverName}:`, error);
    }
  }

  private async sendRequest(serverName: string, request: MCPRequest): Promise<any> {
    const connection = this.connections.get(serverName);
    if (!connection || !connection.connected || !connection.ws) {
      throw new Error(`Server ${serverName} is not connected`);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        connection.pendingRequests.delete(request.id!);
        reject(new Error(`Request timeout for ${serverName}`));
      }, this.requestTimeout);

      connection.pendingRequests.set(request.id!, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        timestamp: new Date(),
      });

      connection.ws!.send(JSON.stringify(request));
      connection.lastActivity = new Date();
    });
  }

  public async listTools(serverName: string): Promise<MCPTool[]> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: this.generateRequestId(),
      method: 'tools/list',
    };

    try {
      const response = await this.sendRequest(serverName, request);
      return response.tools || [];
    } catch (error) {
      this.logger.error(`Failed to list tools from ${serverName}:`, error);
      throw error;
    }
  }

  public async callTool(
    serverName: string,
    toolName: string,
    args: any,
    context: MCPServerContext
  ): Promise<MCPToolResult> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: this.generateRequestId(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    };

    try {
      this.logger.debug(`Calling tool ${toolName} on server ${serverName}`);
      const response = await this.sendRequest(serverName, request);
      
      // Ensure response has the correct format
      if (!response.content) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      }

      return {
        content: response.content,
        isError: response.isError || false,
      };

    } catch (error) {
      this.logger.error(`Tool call failed (${serverName}:${toolName}):`, error);
      throw error;
    }
  }

  public async readResource(serverName: string, uri: string): Promise<any> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: this.generateRequestId(),
      method: 'resources/read',
      params: { uri },
    };

    try {
      const response = await this.sendRequest(serverName, request);
      return response.contents || [];
    } catch (error) {
      this.logger.error(`Resource read failed (${serverName}:${uri}):`, error);
      throw error;
    }
  }

  public async healthCheck(serverName: string): Promise<boolean> {
    const connection = this.connections.get(serverName);
    if (!connection || !connection.connected) {
      return false;
    }

    try {
      // Send a simple ping/health check request
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: this.generateRequestId(),
        method: 'tools/list', // Use tools/list as a simple health check
      };

      await this.sendRequest(serverName, request);
      return true;

    } catch (error) {
      this.logger.debug(`Health check failed for ${serverName}:`, error);
      return false;
    }
  }

  public isConnected(serverName: string): boolean {
    const connection = this.connections.get(serverName);
    return connection?.connected || false;
  }

  public getConnectionStatus(): Array<{
    name: string;
    uri: string;
    connected: boolean;
    lastActivity: Date;
    pendingRequests: number;
  }> {
    return Array.from(this.connections.values()).map(conn => ({
      name: conn.name,
      uri: conn.uri,
      connected: conn.connected,
      lastActivity: conn.lastActivity,
      pendingRequests: conn.pendingRequests.size,
    }));
  }

  public async reconnect(serverName: string): Promise<void> {
    const connection = this.connections.get(serverName);
    if (!connection) {
      throw new Error(`Server ${serverName} not found`);
    }

    await this.disconnect(serverName);
    await this.connect(connection.name, connection.uri, connection.auth);
  }

  private generateRequestId(): string {
    return `proxy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanupExpiredRequests(): void {
    const now = new Date();
    const timeoutMs = this.requestTimeout;

    for (const connection of this.connections.values()) {
      const expiredRequests: Array<string | number> = [];
      
      for (const [requestId, pending] of connection.pendingRequests) {
        if (now.getTime() - pending.timestamp.getTime() > timeoutMs) {
          expiredRequests.push(requestId);
          pending.reject(new Error('Request expired'));
        }
      }

      for (const requestId of expiredRequests) {
        connection.pendingRequests.delete(requestId);
      }
    }
  }

  public async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Disconnect from all servers
    const disconnectPromises = Array.from(this.connections.keys())
      .map(serverName => this.disconnect(serverName));

    await Promise.all(disconnectPromises);
    
    this.logger.info('Proxy service closed');
  }

  // Statistics and monitoring
  public getStatistics(): {
    totalConnections: number;
    activeConnections: number;
    totalPendingRequests: number;
    averageResponseTime: number;
    errorRate: number;
  } {
    const connections = Array.from(this.connections.values());
    const activeConnections = connections.filter(c => c.connected).length;
    const totalPendingRequests = connections.reduce((sum, c) => sum + c.pendingRequests.size, 0);

    // TODO: Implement proper statistics tracking
    return {
      totalConnections: connections.length,
      activeConnections,
      totalPendingRequests,
      averageResponseTime: 0, // Placeholder
      errorRate: 0, // Placeholder
    };
  }
}