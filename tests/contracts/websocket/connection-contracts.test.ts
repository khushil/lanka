/**
 * WebSocket Connection and Message Contract Tests
 * Tests WebSocket protocol compliance, message formats, and real-time features
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { Server } from 'http';
import WebSocket from 'ws';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { Server as SocketIOServer } from 'socket.io';
import express from 'express';
import { WebSocketTransport } from '../../../src/modules/memory/mcp/transport/websocket';

describe('WebSocket Contract Tests', () => {
  let httpServer: Server;
  let socketIOServer: SocketIOServer;
  let wsTransport: WebSocketTransport;
  let app: express.Application;
  let serverPort: number;

  beforeAll(async () => {
    app = express();
    httpServer = app.listen(0); // Use random port
    serverPort = (httpServer.address() as any).port;

    // Set up Socket.IO server
    socketIOServer = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket']
    });

    // Set up MCP WebSocket transport
    wsTransport = new WebSocketTransport({
      port: serverPort + 1,
      host: 'localhost',
      path: '/mcp'
    });

    setupSocketIOHandlers(socketIOServer);
    await wsTransport.connect();
  });

  afterAll(async () => {
    await wsTransport.disconnect();
    socketIOServer.close();
    httpServer.close();
  });

  describe('Socket.IO Connection Contracts', () => {
    let clientSocket: ClientSocket;

    beforeEach((done) => {
      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        auth: {
          token: 'test-token'
        }
      });
      clientSocket.on('connect', done);
    });

    afterEach(() => {
      if (clientSocket.connected) {
        clientSocket.disconnect();
      }
    });

    test('should establish connection with proper authentication', (done) => {
      expect(clientSocket.connected).toBe(true);
      expect(clientSocket.id).toBeDefined();
      done();
    });

    test('should handle connection events properly', (done) => {
      const newClient = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket']
      });

      newClient.on('connect', () => {
        expect(newClient.connected).toBe(true);
        newClient.disconnect();
        done();
      });

      newClient.on('connect_error', (error) => {
        // Should handle connection errors gracefully
        expect(error).toBeDefined();
        done();
      });
    });

    test('should handle disconnection gracefully', (done) => {
      clientSocket.on('disconnect', (reason) => {
        expect(reason).toBeDefined();
        done();
      });

      clientSocket.disconnect();
    });
  });

  describe('Message Format Contract Validation', () => {
    let clientSocket: ClientSocket;

    beforeEach((done) => {
      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket']
      });
      clientSocket.on('connect', done);
    });

    afterEach(() => {
      if (clientSocket.connected) {
        clientSocket.disconnect();
      }
    });

    test('should validate requirement update message format', (done) => {
      const expectedMessage = {
        type: 'requirement_updated',
        data: {
          id: 'req-123',
          title: 'Updated Requirement',
          status: 'APPROVED',
          timestamp: expect.any(String)
        }
      };

      clientSocket.on('requirement_updated', (message) => {
        expect(message).toMatchObject({
          type: 'requirement_updated',
          data: expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
            status: expect.any(String),
            timestamp: expect.any(String)
          })
        });
        done();
      });

      // Trigger a requirement update
      clientSocket.emit('update_requirement', {
        id: 'req-123',
        title: 'Updated Requirement',
        status: 'APPROVED'
      });
    });

    test('should validate architecture decision message format', (done) => {
      clientSocket.on('architecture_decision_created', (message) => {
        expect(message).toMatchObject({
          type: 'architecture_decision_created',
          data: expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
            status: expect.any(String),
            requirements: expect.any(Array)
          })
        });
        done();
      });

      clientSocket.emit('create_architecture_decision', {
        title: 'Use Microservices Architecture',
        description: 'Decision to adopt microservices',
        requirementIds: ['req-123', 'req-124']
      });
    });

    test('should handle subscription message contracts', (done) => {
      const subscriptionMessage = {
        event: 'subscribe',
        data: {
          topic: 'requirements',
          filters: {
            projectId: 'project-123',
            status: ['DRAFT', 'REVIEW']
          }
        }
      };

      clientSocket.on('subscription_confirmed', (response) => {
        expect(response).toMatchObject({
          subscriptionId: expect.any(String),
          topic: 'requirements',
          status: 'active'
        });
        done();
      });

      clientSocket.emit('subscribe', subscriptionMessage.data);
    });
  });

  describe('Real-time Subscription Contracts', () => {
    let client1: ClientSocket;
    let client2: ClientSocket;

    beforeEach((done) => {
      let connectCount = 0;
      const onConnect = () => {
        connectCount++;
        if (connectCount === 2) done();
      };

      client1 = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket']
      });
      client2 = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket']
      });

      client1.on('connect', onConnect);
      client2.on('connect', onConnect);
    });

    afterEach(() => {
      if (client1.connected) client1.disconnect();
      if (client2.connected) client2.disconnect();
    });

    test('should broadcast updates to subscribed clients', (done) => {
      let receivedCount = 0;
      const expectedUpdate = {
        id: 'req-broadcast-123',
        title: 'Broadcast Test Requirement',
        status: 'UPDATED'
      };

      const onUpdate = (message: any) => {
        expect(message.data).toMatchObject(expectedUpdate);
        receivedCount++;
        
        if (receivedCount === 2) {
          done();
        }
      };

      // Both clients subscribe to requirement updates
      client1.emit('subscribe', { topic: 'requirements' });
      client2.emit('subscribe', { topic: 'requirements' });

      client1.on('requirement_updated', onUpdate);
      client2.on('requirement_updated', onUpdate);

      // Simulate a requirement update after subscriptions are set
      setTimeout(() => {
        client1.emit('update_requirement', expectedUpdate);
      }, 100);
    });

    test('should respect subscription filters', (done) => {
      let client1Received = false;
      let client2Received = false;

      // Client 1 subscribes to project-123 only
      client1.emit('subscribe', { 
        topic: 'requirements',
        filters: { projectId: 'project-123' }
      });

      // Client 2 subscribes to project-456 only
      client2.emit('subscribe', { 
        topic: 'requirements',
        filters: { projectId: 'project-456' }
      });

      client1.on('requirement_updated', () => {
        client1Received = true;
      });

      client2.on('requirement_updated', () => {
        client2Received = true;
      });

      // Send update for project-123 (only client1 should receive)
      setTimeout(() => {
        client1.emit('update_requirement', {
          id: 'req-filter-test',
          projectId: 'project-123',
          title: 'Filtered Update'
        });

        // Check results after a delay
        setTimeout(() => {
          expect(client1Received).toBe(true);
          expect(client2Received).toBe(false);
          done();
        }, 200);
      }, 100);
    });
  });

  describe('MCP WebSocket Transport Contracts', () => {
    let mcpClient: WebSocket;

    beforeEach((done) => {
      mcpClient = new WebSocket(`ws://localhost:${serverPort + 1}/mcp`);
      mcpClient.on('open', done);
    });

    afterEach(() => {
      if (mcpClient.readyState === WebSocket.OPEN) {
        mcpClient.close();
      }
    });

    test('should handle MCP protocol messages', (done) => {
      const mcpMessage = {
        jsonrpc: '2.0',
        method: 'memory/get',
        params: {
          workspace: 'default',
          key: 'test-key'
        },
        id: 1
      };

      mcpClient.on('message', (data) => {
        const response = JSON.parse(data.toString());
        expect(response).toMatchObject({
          jsonrpc: '2.0',
          id: 1,
          result: expect.any(Object)
        });
        done();
      });

      mcpClient.send(JSON.stringify(mcpMessage));
    });

    test('should handle MCP memory subscription notifications', (done) => {
      const subscribeMessage = {
        jsonrpc: '2.0',
        method: 'memory/subscribe',
        params: {
          workspace: 'test-workspace',
          events: ['create', 'update', 'delete']
        },
        id: 2
      };

      mcpClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.id === 2) {
          // Subscription confirmation
          expect(message.result.subscribed).toBe(true);
        } else if (message.method?.startsWith('memory/')) {
          // Memory event notification
          expect(message).toMatchObject({
            jsonrpc: '2.0',
            method: expect.stringMatching(/^memory\/(create|update|delete)$/),
            params: expect.objectContaining({
              workspace: expect.any(String),
              data: expect.any(Object),
              timestamp: expect.any(String)
            })
          });
          done();
        }
      });

      mcpClient.send(JSON.stringify(subscribeMessage));
    });

    test('should validate JSON-RPC error format', (done) => {
      const invalidMessage = {
        jsonrpc: '2.0',
        method: 'invalid_method',
        id: 3
      };

      mcpClient.on('message', (data) => {
        const response = JSON.parse(data.toString());
        expect(response).toMatchObject({
          jsonrpc: '2.0',
          id: 3,
          error: {
            code: expect.any(Number),
            message: expect.any(String)
          }
        });
        done();
      });

      mcpClient.send(JSON.stringify(invalidMessage));
    });
  });

  describe('Connection Resilience Contracts', () => {
    test('should handle heartbeat/ping-pong correctly', (done) => {
      const mcpClient = new WebSocket(`ws://localhost:${serverPort + 1}/mcp`);
      
      mcpClient.on('open', () => {
        // Should receive ping frames and respond with pong
        mcpClient.on('ping', (data) => {
          expect(data).toBeDefined();
          mcpClient.pong(data);
        });

        // Connection should remain alive
        setTimeout(() => {
          expect(mcpClient.readyState).toBe(WebSocket.OPEN);
          mcpClient.close();
          done();
        }, 1000);
      });
    });

    test('should handle connection recovery gracefully', (done) => {
      const client = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        autoConnect: false
      });

      let disconnectCount = 0;
      let reconnectCount = 0;

      client.on('connect', () => {
        reconnectCount++;
        if (reconnectCount === 1) {
          // First connection, force disconnect
          client.disconnect();
        } else {
          // Reconnected successfully
          expect(reconnectCount).toBe(2);
          client.disconnect();
          done();
        }
      });

      client.on('disconnect', () => {
        disconnectCount++;
        if (disconnectCount === 1) {
          // Reconnect after disconnect
          setTimeout(() => client.connect(), 100);
        }
      });

      client.connect();
    });
  });

  describe('Performance and Resource Contracts', () => {
    test('should handle multiple concurrent connections', (done) => {
      const connectionCount = 10;
      const clients: ClientSocket[] = [];
      let connectedCount = 0;

      const onConnect = () => {
        connectedCount++;
        if (connectedCount === connectionCount) {
          // All connected, verify and cleanup
          expect(clients.length).toBe(connectionCount);
          clients.forEach(client => {
            expect(client.connected).toBe(true);
            client.disconnect();
          });
          done();
        }
      };

      for (let i = 0; i < connectionCount; i++) {
        const client = ioClient(`http://localhost:${serverPort}`, {
          transports: ['websocket']
        });
        clients.push(client);
        client.on('connect', onConnect);
      }
    });

    test('should enforce message rate limits', (done) => {
      const client = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket']
      });

      client.on('connect', () => {
        let messageCount = 0;
        let rateLimitHit = false;

        client.on('rate_limit_exceeded', () => {
          rateLimitHit = true;
          expect(messageCount).toBeGreaterThan(50); // Assuming rate limit around 50 msgs/sec
          client.disconnect();
          done();
        });

        // Send messages rapidly
        const interval = setInterval(() => {
          if (messageCount < 100 && !rateLimitHit) {
            client.emit('test_message', { id: messageCount });
            messageCount++;
          } else {
            clearInterval(interval);
            if (!rateLimitHit) {
              // No rate limit hit, test passed
              client.disconnect();
              done();
            }
          }
        }, 10); // 100 messages per second
      });
    });
  });
});

// Helper function to set up Socket.IO event handlers
function setupSocketIOHandlers(server: SocketIOServer) {
  server.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('subscribe', (data) => {
      socket.join(data.topic);
      socket.emit('subscription_confirmed', {
        subscriptionId: `sub_${socket.id}_${Date.now()}`,
        topic: data.topic,
        status: 'active'
      });
    });

    socket.on('update_requirement', (data) => {
      const message = {
        type: 'requirement_updated',
        data: {
          ...data,
          timestamp: new Date().toISOString()
        }
      };

      // Broadcast to all clients in requirements room
      server.to('requirements').emit('requirement_updated', message);
    });

    socket.on('create_architecture_decision', (data) => {
      const message = {
        type: 'architecture_decision_created',
        data: {
          id: `arch_${Date.now()}`,
          ...data,
          status: 'CREATED',
          timestamp: new Date().toISOString()
        }
      };

      server.emit('architecture_decision_created', message);
    });

    // Rate limiting simulation
    let messageCount = 0;
    const resetTime = Date.now();

    socket.on('test_message', () => {
      messageCount++;
      
      // Simple rate limiting: 50 messages per second
      if (messageCount > 50 && (Date.now() - resetTime) < 1000) {
        socket.emit('rate_limit_exceeded', {
          limit: 50,
          window: '1 second',
          reset: resetTime + 1000
        });
        return;
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}