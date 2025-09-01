/**
 * WebSocket Transport Implementation for MCP Protocol
 * Provides real-time bidirectional communication with memory event subscriptions
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { IncomingMessage } from 'http';
import { MCPTransport, MCPMessage, TransportConfig } from '../types';
import winston from 'winston';

export class WebSocketTransport extends EventEmitter implements MCPTransport {
  private config: TransportConfig;
  private server: WebSocket.Server | null = null;
  private clients: Map<string, WebSocket> = new Map();
  private logger: winston.Logger;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(config: TransportConfig) {
    super();
    this.config = config;
    this.setupLogger();
  }

  private setupLogger(): void {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'mcp-websocket-transport' },
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

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const options: WebSocket.ServerOptions = {
          port: this.config.port || 8080,
          host: this.config.host || 'localhost',
          path: this.config.path || '/mcp',
        };

        // Add SSL configuration if provided
        if (this.config.ssl) {
          // Would need to implement SSL configuration here
          this.logger.warn('SSL configuration not yet implemented for WebSocket transport');
        }

        this.server = new WebSocket.Server(options);

        this.server.on('connection', this.handleConnection.bind(this));
        this.server.on('error', (error) => {
          this.logger.error('WebSocket server error:', error);
          this.emit('error', error);
          reject(error);
        });

        this.server.on('listening', () => {
          this.logger.info(`WebSocket server listening on ${options.host}:${options.port}${options.path}`);
          this.startHeartbeat();
          resolve();
        });

      } catch (error) {
        this.logger.error('Failed to start WebSocket server:', error);
        reject(error);
      }
    });
  }

  public async disconnect(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.server) {
      // Close all client connections
      for (const [clientId, ws] of this.clients) {
        ws.close(1000, 'Server shutting down');
        this.clients.delete(clientId);
      }

      // Close server
      return new Promise((resolve) => {
        this.server!.close(() => {
          this.logger.info('WebSocket server closed');
          resolve();
        });
      });
    }
  }

  public isConnected(): boolean {
    return this.server !== null && this.clients.size > 0;
  }

  public async send(message: MCPMessage, clientId?: string): Promise<void> {
    const messageStr = JSON.stringify(message);

    if (clientId) {
      // Send to specific client
      const ws = this.clients.get(clientId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      } else {
        throw new Error(`Client ${clientId} not connected`);
      }
    } else {
      // Broadcast to all clients
      for (const [id, ws] of this.clients) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        } else {
          this.clients.delete(id);
        }
      }
    }
  }

  private handleConnection(ws: WebSocket, request: IncomingMessage): void {
    const clientId = this.generateClientId();
    this.clients.set(clientId, ws);

    this.logger.info(`Client ${clientId} connected from ${request.socket.remoteAddress}`);

    // Authenticate if required
    if (this.config.auth && this.config.auth.type !== 'none') {
      if (!this.authenticateClient(request)) {
        ws.close(1008, 'Authentication failed');
        this.clients.delete(clientId);
        return;
      }
    }

    // Set up client event handlers
    ws.on('message', (data: WebSocket.RawData) => {
      this.handleMessage(data, clientId);
    });

    ws.on('close', (code: number, reason: Buffer) => {
      this.logger.info(`Client ${clientId} disconnected: ${code} ${reason.toString()}`);
      this.clients.delete(clientId);
      this.emit('disconnect', clientId);
    });

    ws.on('error', (error: Error) => {
      this.logger.error(`Client ${clientId} error:`, error);
      this.clients.delete(clientId);
      this.emit('error', error);
    });

    ws.on('pong', () => {
      // Client responded to ping, mark as alive
      (ws as any).isAlive = true;
    });

    // Mark client as alive for heartbeat
    (ws as any).isAlive = true;

    this.emit('connect', clientId);
  }

  private handleMessage(data: WebSocket.RawData, clientId: string): void {
    try {
      let messageStr: string;
      
      if (Buffer.isBuffer(data)) {
        messageStr = data.toString('utf8');
      } else if (typeof data === 'string') {
        messageStr = data;
      } else if (Array.isArray(data)) {
        messageStr = Buffer.concat(data).toString('utf8');
      } else {
        throw new Error('Unsupported message format');
      }

      const message: MCPMessage = JSON.parse(messageStr);
      
      // Validate message format
      if (!this.isValidMCPMessage(message)) {
        throw new Error('Invalid MCP message format');
      }

      this.emit('message', message, clientId);

    } catch (error) {
      this.logger.error(`Error parsing message from client ${clientId}:`, error);
      
      // Send parse error response
      const errorResponse = {
        jsonrpc: '2.0' as const,
        id: null,
        error: {
          code: -32700,
          message: 'Parse error',
          data: error instanceof Error ? error.message : 'Unknown parse error'
        }
      };
      
      const ws = this.clients.get(clientId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(errorResponse));
      }
    }
  }

  private isValidMCPMessage(message: any): message is MCPMessage {
    return (
      typeof message === 'object' &&
      message !== null &&
      message.jsonrpc === '2.0' &&
      (
        // Request
        (typeof message.method === 'string' && message.id !== undefined) ||
        // Response
        (message.id !== undefined && (message.result !== undefined || message.error !== undefined)) ||
        // Notification
        (typeof message.method === 'string' && message.id === undefined)
      )
    );
  }

  private authenticateClient(request: IncomingMessage): boolean {
    if (!this.config.auth || this.config.auth.type === 'none') {
      return true;
    }

    const authHeader = request.headers.authorization;
    
    switch (this.config.auth.type) {
      case 'bearer':
        return authHeader === `Bearer ${this.config.auth.token}`;
      
      case 'apikey':
        const apiKeyHeader = request.headers['x-api-key'];
        return apiKeyHeader === this.config.auth.apiKey;
      
      case 'basic':
        if (!authHeader || !authHeader.startsWith('Basic ')) {
          return false;
        }
        const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
        const [username, password] = credentials.split(':');
        return username === this.config.auth.username && password === this.config.auth.password;
      
      default:
        return false;
    }
  }

  private generateClientId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const deadClients: string[] = [];

      for (const [clientId, ws] of this.clients) {
        if (!(ws as any).isAlive) {
          // Client didn't respond to last ping, mark as dead
          ws.terminate();
          deadClients.push(clientId);
        } else {
          // Send ping and mark as not alive until pong received
          (ws as any).isAlive = false;
          ws.ping();
        }
      }

      // Remove dead clients
      for (const clientId of deadClients) {
        this.clients.delete(clientId);
        this.emit('disconnect', clientId);
      }

    }, 30000); // Heartbeat every 30 seconds
  }

  // Memory-specific methods for real-time updates
  public async subscribeToMemoryUpdates(clientId: string, workspace?: string): Promise<void> {
    const ws = this.clients.get(clientId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error(`Client ${clientId} not connected`);
    }

    // Store subscription info on the WebSocket
    (ws as any).memorySubscriptions = (ws as any).memorySubscriptions || new Set();
    (ws as any).memorySubscriptions.add(workspace || '*');

    this.logger.info(`Client ${clientId} subscribed to memory updates for workspace: ${workspace || 'all'}`);
  }

  public async unsubscribeFromMemoryUpdates(clientId: string, workspace?: string): Promise<void> {
    const ws = this.clients.get(clientId);
    if (!ws) return;

    if ((ws as any).memorySubscriptions) {
      (ws as any).memorySubscriptions.delete(workspace || '*');
    }

    this.logger.info(`Client ${clientId} unsubscribed from memory updates for workspace: ${workspace || 'all'}`);
  }

  public async broadcastMemoryUpdate(event: string, data: any, workspace?: string): Promise<void> {
    const notification = {
      jsonrpc: '2.0' as const,
      method: `memory/${event}`,
      params: {
        workspace,
        data,
        timestamp: new Date().toISOString()
      }
    };

    const messageStr = JSON.stringify(notification);

    for (const [clientId, ws] of this.clients) {
      if (ws.readyState !== WebSocket.OPEN) {
        this.clients.delete(clientId);
        continue;
      }

      const subscriptions = (ws as any).memorySubscriptions;
      if (subscriptions && (subscriptions.has('*') || subscriptions.has(workspace))) {
        ws.send(messageStr);
      }
    }
  }

  // Get connected clients count
  public getClientCount(): number {
    return this.clients.size;
  }

  // Get client info
  public getClientInfo(): Array<{ id: string; connected: boolean; subscriptions: string[] }> {
    const clientInfo: Array<{ id: string; connected: boolean; subscriptions: string[] }> = [];

    for (const [clientId, ws] of this.clients) {
      const subscriptions = (ws as any).memorySubscriptions 
        ? Array.from((ws as any).memorySubscriptions) 
        : [];

      clientInfo.push({
        id: clientId,
        connected: ws.readyState === WebSocket.OPEN,
        subscriptions
      });
    }

    return clientInfo;
  }
}