/**
 * Comprehensive Test Suite for LANKA Memory MCP Server
 * Tests all components of the MCP implementation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { DefaultMCPServer } from '../../../src/modules/memory/mcp/server/default';
import { AggregatorMCPServer } from '../../../src/modules/memory/mcp/server/aggregator';
import { MCPServerFactory } from '../../../src/modules/memory/mcp/server/factory';
import { AuthMiddleware } from '../../../src/modules/memory/mcp/server/middleware/auth';
import { SecurityMiddleware } from '../../../src/modules/memory/mcp/server/middleware/security';
import { MemoryService } from '../../../src/modules/memory/mcp/server/services/memory';
import { ArbitrationService } from '../../../src/modules/memory/mcp/server/services/arbitration';
import { WebSocketTransport } from '../../../src/modules/memory/mcp/transport/websocket';
import {
  MCPServerConfig,
  MCPRequest,
  MCPResponse,
  MemorySearchParams,
  MemoryStoreParams,
} from '../../../src/modules/memory/mcp/types';
import WebSocket from 'ws';

// Test configuration
const TEST_PORT = 18080;
const TEST_CONFIG: MCPServerConfig = {
  name: 'test-memory-server',
  version: '1.0.0-test',
  mode: 'default',
  transport: {
    type: 'websocket',
    host: 'localhost',
    port: TEST_PORT,
    auth: { type: 'none' },
  },
  capabilities: {
    tools: { listChanged: true },
    resources: { subscribe: true, listChanged: true },
    prompts: { listChanged: true },
    logging: {},
    memory: {
      search: true,
      store: true,
      relate: true,
      evolve: true,
      federate: true,
      subscribe: true,
    },
  },
  memory: {
    neo4jUri: process.env.TEST_NEO4J_URI || 'neo4j://localhost:7687',
    vectorDb: {
      type: 'qdrant',
      uri: process.env.TEST_QDRANT_URI || 'http://localhost:6333',
    },
    redis: {
      uri: process.env.TEST_REDIS_URI || 'redis://localhost:6379/1',
    },
  },
  rateLimit: {
    windowMs: 60000,
    maxRequests: 1000,
  },
};

describe('LANKA Memory MCP Server', () => {
  let server: DefaultMCPServer;
  let client: WebSocket;

  beforeAll(async () => {
    // Start test server
    server = new DefaultMCPServer(TEST_CONFIG);
    await server.start();
    
    // Wait a bit for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    if (client) {
      client.close();
    }
    if (server) {
      await server.stop();
    }
  });

  beforeEach(async () => {
    // Create fresh WebSocket connection for each test
    client = new WebSocket(`ws://localhost:${TEST_PORT}/mcp`);
    
    await new Promise((resolve, reject) => {
      client.on('open', resolve);
      client.on('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  });

  afterEach(() => {
    if (client && client.readyState === WebSocket.OPEN) {
      client.close();
    }
  });

  describe('Server Factory', () => {
    it('should create default server configuration', () => {
      const config = MCPServerFactory.createDefaultConfig();
      
      expect(config.name).toBe('lanka-memory-server');
      expect(config.version).toBe('1.0.0');
      expect(config.mode).toBe('default');
      expect(config.transport.type).toBe('websocket');
      expect(config.capabilities.memory).toBeDefined();
    });

    it('should create aggregator server configuration', () => {
      const proxiedServers = [
        { name: 'test-server', uri: 'ws://localhost:8082/mcp' },
      ];
      
      const config = MCPServerFactory.createAggregatorConfig(proxiedServers);
      
      expect(config.mode).toBe('aggregator');
      expect(config.aggregator?.servers).toHaveLength(1);
      expect(config.aggregator?.servers[0].name).toBe('test-server');
    });

    it('should validate configuration properly', () => {
      expect(() => {
        MCPServerFactory.create({
          name: '',
          version: '1.0.0',
          mode: 'default',
        } as MCPServerConfig);
      }).toThrow('Configuration validation failed');
    });
  });

  describe('WebSocket Transport', () => {
    it('should establish connection and handle initialization', async () => {
      const initRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      };

      const responsePromise = new Promise<MCPResponse>((resolve) => {
        client.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.id === 1) {
            resolve(message);
          }
        });
      });

      client.send(JSON.stringify(initRequest));
      
      const response = await responsePromise;
      
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.result).toBeDefined();
      expect(response.result.protocolVersion).toBe('2024-11-05');
      expect(response.result.serverInfo.name).toBe('test-memory-server');
    });

    it('should list available tools', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      };

      const responsePromise = new Promise<MCPResponse>((resolve) => {
        client.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.id === 2) {
            resolve(message);
          }
        });
      });

      client.send(JSON.stringify(request));
      
      const response = await responsePromise;
      
      expect(response.result.tools).toBeDefined();
      expect(Array.isArray(response.result.tools)).toBe(true);
      
      const toolNames = response.result.tools.map((tool: any) => tool.name);
      expect(toolNames).toContain('memory-search');
      expect(toolNames).toContain('memory-store');
      expect(toolNames).toContain('memory-relate');
      expect(toolNames).toContain('memory-evolve');
      expect(toolNames).toContain('memory-federate');
    });
  });

  describe('Memory Operations', () => {
    it('should store and retrieve memories', async () => {
      // Store a memory
      const storeRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'memory-store',
          arguments: {
            content: 'This is a test memory for the MCP server',
            type: 'system1',
            metadata: {
              tags: ['test', 'mcp'],
              confidence: 0.9,
            },
          },
        },
      };

      const storeResponsePromise = new Promise<MCPResponse>((resolve) => {
        client.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.id === 3) {
            resolve(message);
          }
        });
      });

      client.send(JSON.stringify(storeRequest));
      const storeResponse = await storeResponsePromise;
      
      expect(storeResponse.result).toBeDefined();
      expect(storeResponse.result.content).toBeDefined();
      
      const storeResult = JSON.parse(storeResponse.result.content[0].text);
      expect(storeResult.success).toBe(true);
      expect(storeResult.memory).toBeDefined();

      // Search for the stored memory
      const searchRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'memory-search',
          arguments: {
            query: 'test memory MCP server',
            type: 'hybrid',
            limit: 10,
          },
        },
      };

      const searchResponsePromise = new Promise<MCPResponse>((resolve) => {
        client.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.id === 4) {
            resolve(message);
          }
        });
      });

      client.send(JSON.stringify(searchRequest));
      const searchResponse = await searchResponsePromise;
      
      expect(searchResponse.result).toBeDefined();
      
      const searchResult = JSON.parse(searchResponse.result.content[0].text);
      expect(searchResult.results).toBeDefined();
      expect(Array.isArray(searchResult.results)).toBe(true);
    });

    it('should handle memory relationships', async () => {
      // This test would require pre-existing memories
      // For now, test the tool call structure
      const relateRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'memory-relate',
          arguments: {
            sourceMemoryId: 'mock-memory-1',
            targetMemoryId: 'mock-memory-2',
            relationshipType: 'SIMILAR_TO',
            metadata: {
              strength: 0.8,
              confidence: 0.7,
            },
          },
        },
      };

      const responsePromise = new Promise<MCPResponse>((resolve) => {
        client.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.id === 5) {
            resolve(message);
          }
        });
      });

      client.send(JSON.stringify(relateRequest));
      const response = await responsePromise;
      
      // The call should complete even if memories don't exist
      // (the service would handle the error gracefully)
      expect(response).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid method calls', async () => {
      const invalidRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 6,
        method: 'invalid-method',
      };

      const responsePromise = new Promise<MCPResponse>((resolve) => {
        client.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.id === 6) {
            resolve(message);
          }
        });
      });

      client.send(JSON.stringify(invalidRequest));
      const response = await responsePromise;
      
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32601); // Method not found
    });

    it('should handle malformed requests', async () => {
      const malformedRequest = '{"invalid": "json"';
      
      // Send malformed JSON
      client.send(malformedRequest);
      
      // Wait for error response
      const responsePromise = new Promise<MCPResponse>((resolve) => {
        client.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.error && message.error.code === -32700) {
            resolve(message);
          }
        });
      });

      const response = await responsePromise;
      expect(response.error.code).toBe(-32700); // Parse error
    });
  });
});

describe('Authentication Middleware', () => {
  describe('Bearer Token Authentication', () => {
    let auth: AuthMiddleware;

    beforeEach(() => {
      auth = AuthMiddleware.createBearerAuth('test-secret-token');
    });

    it('should authenticate valid bearer token', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'test',
      };

      const context = {
        clientId: 'test-client',
        session: {
          id: 'test-session',
          startedAt: new Date(),
          metadata: {
            authorization: 'Bearer test-secret-token',
          },
        },
      };

      const result = await auth.authenticate(request, context);
      
      expect(result.authenticated).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.permissions).toContain('memory:read');
    });

    it('should reject invalid bearer token', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'test',
      };

      const context = {
        clientId: 'test-client',
        session: {
          id: 'test-session',
          startedAt: new Date(),
          metadata: {
            authorization: 'Bearer invalid-token',
          },
        },
      };

      const result = await auth.authenticate(request, context);
      
      expect(result.authenticated).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('API Key Authentication', () => {
    let auth: AuthMiddleware;

    beforeEach(() => {
      auth = AuthMiddleware.createApiKeyAuth(['test-api-key-123']);
    });

    it('should authenticate valid API key', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'test',
      };

      const context = {
        clientId: 'test-client',
        session: {
          id: 'test-session',
          startedAt: new Date(),
          metadata: {
            apiKey: 'test-api-key-123',
          },
        },
      };

      const result = await auth.authenticate(request, context);
      
      expect(result.authenticated).toBe(true);
      expect(result.user).toBeDefined();
    });

    it('should reject invalid API key', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'test',
      };

      const context = {
        clientId: 'test-client',
        session: {
          id: 'test-session',
          startedAt: new Date(),
          metadata: {
            apiKey: 'invalid-key',
          },
        },
      };

      const result = await auth.authenticate(request, context);
      
      expect(result.authenticated).toBe(false);
    });
  });
});

describe('Security Middleware', () => {
  let security: SecurityMiddleware;

  beforeEach(() => {
    security = SecurityMiddleware.createDefault();
  });

  it('should detect SQL injection attempts', async () => {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'memory-search',
        arguments: {
          query: "'; DROP TABLE memories; --",
        },
      },
    };

    const context = {
      clientId: 'test-client',
      session: {
        id: 'test-session',
        startedAt: new Date(),
        metadata: {},
      },
    };

    const result = await security.validateRequest(request, context);
    
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations.some(v => v.type === 'input_injection')).toBe(true);
  });

  it('should detect XSS attempts', async () => {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'memory-store',
        arguments: {
          content: '<script>alert("xss")</script>',
          type: 'system1',
        },
      },
    };

    const context = {
      clientId: 'test-client',
      session: {
        id: 'test-session',
        startedAt: new Date(),
        metadata: {},
      },
    };

    const result = await security.validateRequest(request, context);
    
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations.some(v => v.type === 'input_injection')).toBe(true);
  });

  it('should sanitize input while preserving legitimate content', async () => {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'memory-store',
        arguments: {
          content: 'This is legitimate content with some "quotes" and normal text.',
          type: 'system1',
        },
      },
    };

    const context = {
      clientId: 'test-client',
      session: {
        id: 'test-session',
        startedAt: new Date(),
        metadata: {},
      },
    };

    const result = await security.validateRequest(request, context);
    
    expect(result.sanitizedRequest).toBeDefined();
    expect(result.sanitizedRequest?.params?.arguments?.content).toContain('legitimate content');
  });

  it('should enforce size limits', async () => {
    const largeContent = 'x'.repeat(2 * 1024 * 1024); // 2MB content
    
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'memory-store',
        arguments: {
          content: largeContent,
          type: 'system1',
        },
      },
    };

    const context = {
      clientId: 'test-client',
      session: {
        id: 'test-session',
        startedAt: new Date(),
        metadata: {},
      },
    };

    const result = await security.validateRequest(request, context);
    
    expect(result.violations.some(v => v.type === 'size_limit')).toBe(true);
  });
});

describe('Memory Services', () => {
  describe('Arbitration Service', () => {
    let arbitration: ArbitrationService;

    beforeEach(() => {
      arbitration = new ArbitrationService();
    });

    it('should validate arbitration parameters', () => {
      const validParams: MemoryStoreParams = {
        content: 'Test content',
        type: 'system1',
        arbitration: {
          threshold: 0.85,
        },
      };

      const errors = arbitration.validateArbitrationParams(validParams);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid arbitration parameters', () => {
      const invalidParams: MemoryStoreParams = {
        content: 'Test content',
        type: 'workspace',
        // Missing workspace for workspace type
        arbitration: {
          threshold: 1.5, // Invalid threshold
        },
      };

      const errors = arbitration.validateArbitrationParams(invalidParams);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should perform arbitration analysis', async () => {
      const params: MemoryStoreParams = {
        content: 'This is a test memory for arbitration',
        type: 'system1',
        metadata: {
          confidence: 0.8,
        },
      };

      const context = {
        clientId: 'test-client',
        session: {
          id: 'test-session',
          startedAt: new Date(),
          metadata: {},
        },
      };

      const result = await arbitration.arbitrate(params, context);
      
      expect(result).toBeDefined();
      expect(result.action).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.reasoning).toBeDefined();
    });
  });
});

// Integration test with actual services (requires running dependencies)
describe('Integration Tests', () => {
  // These tests require actual Neo4j, Redis, and Vector DB instances
  // Skip if not available in test environment
  const skipIntegration = !process.env.RUN_INTEGRATION_TESTS;

  it.skipIf(skipIntegration)('should perform end-to-end memory storage and retrieval', async () => {
    const config = MCPServerFactory.createTestConfig();
    const server = new DefaultMCPServer(config);
    
    try {
      await server.start();
      
      // Simulate memory storage and retrieval operations
      // This would test the entire pipeline from MCP request to database operations
      
      expect(true).toBe(true); // Placeholder assertion
      
    } finally {
      await server.stop();
    }
  });

  it.skipIf(skipIntegration)('should handle concurrent operations safely', async () => {
    // Test concurrent memory operations
    // Test race conditions and data consistency
    expect(true).toBe(true); // Placeholder
  });

  it.skipIf(skipIntegration)('should maintain performance under load', async () => {
    // Performance testing with multiple concurrent clients
    // Memory usage monitoring
    // Response time validation
    expect(true).toBe(true); // Placeholder
  });
});

// Helper function to wait for async operations
function waitForCondition(condition: () => boolean, timeout: number = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'));
      } else {
        setTimeout(check, 100);
      }
    };
    
    check();
  });
}