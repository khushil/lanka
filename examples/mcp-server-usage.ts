/**
 * LANKA Memory MCP Server - Usage Examples
 * Demonstrates various ways to use the MCP server for memory operations
 */

import {
  createDefaultServer,
  createAggregatorServer,
  MCPServerFactory,
  AuthMiddleware,
  SecurityMiddleware,
  MCPServerConfig,
} from '../src/modules/memory/mcp';

// Example 1: Basic Default Server Setup
export async function basicDefaultServerExample() {
  console.log('=== Basic Default Server Example ===');

  const server = await createDefaultServer({
    name: 'example-memory-server',
    transport: {
      type: 'websocket',
      host: 'localhost',
      port: 8080,
    },
    memory: {
      neo4jUri: 'neo4j://localhost:7687',
      vectorDb: {
        type: 'qdrant',
        uri: 'http://localhost:6333',
      },
      redis: {
        uri: 'redis://localhost:6379',
      },
    },
  });

  console.log('Server started on ws://localhost:8080/mcp');

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    await server.stop();
    process.exit(0);
  });

  return server;
}

// Example 2: Secure Production Server
export async function secureProductionServerExample() {
  console.log('=== Secure Production Server Example ===');

  const config = MCPServerFactory.createProductionConfig(
    process.env.NEO4J_URI || 'neo4j://localhost:7687',
    process.env.VECTOR_DB_URI || 'http://localhost:6333',
    process.env.REDIS_URI || 'redis://localhost:6379',
    '0.0.0.0',
    8080
  );

  // Add custom security configuration
  config.rateLimit = {
    windowMs: 60000, // 1 minute
    maxRequests: 50,  // 50 requests per minute
  };

  config.auth = {
    required: true,
    providers: ['jwt'],
  };

  const server = await MCPServerFactory.startServer(config);
  console.log('Secure production server started');

  return server;
}

// Example 3: Aggregator Server with Multiple Backends
export async function aggregatorServerExample() {
  console.log('=== Aggregator Server Example ===');

  const proxiedServers = [
    {
      name: 'file-operations',
      uri: 'ws://localhost:8082/mcp',
      auth: { type: 'apikey', apiKey: 'file-server-key' },
    },
    {
      name: 'git-operations',
      uri: 'ws://localhost:8083/mcp',
      auth: { type: 'bearer', token: 'git-server-token' },
    },
    {
      name: 'build-system',
      uri: 'ws://localhost:8084/mcp',
      auth: { type: 'none' },
    },
  ];

  const server = await createAggregatorServer(proxiedServers, {
    name: 'example-aggregator',
    transport: {
      port: 8081,
      path: '/mcp-aggregator',
    },
  });

  console.log('Aggregator server started on ws://localhost:8081/mcp-aggregator');
  return server;
}

// Example 4: Custom Authentication Setup
export async function customAuthExample() {
  console.log('=== Custom Authentication Example ===');

  const config: MCPServerConfig = {
    name: 'auth-example-server',
    version: '1.0.0',
    mode: 'default',
    transport: {
      type: 'websocket',
      host: 'localhost',
      port: 8085,
    },
    capabilities: {
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
      neo4jUri: 'neo4j://localhost:7687',
      vectorDb: { type: 'qdrant', uri: 'http://localhost:6333' },
      redis: { uri: 'redis://localhost:6379' },
    },
  };

  // Create server with custom auth
  const server = MCPServerFactory.create(config);

  // Add custom authentication middleware
  const jwtAuth = AuthMiddleware.createJWTAuth('my-jwt-secret', '24h');
  const security = SecurityMiddleware.createStrict();

  await server.start();
  console.log('Server with custom auth started');

  return server;
}

// Example 5: Client Connection and Usage
export async function clientUsageExample() {
  console.log('=== Client Usage Example ===');

  const WebSocket = require('ws');

  const client = new WebSocket('ws://localhost:8080/mcp');

  return new Promise<void>((resolve, reject) => {
    client.on('open', async () => {
      console.log('Connected to MCP server');

      try {
        // Initialize the connection
        await sendRequest(client, {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'example-client', version: '1.0.0' },
          },
        });

        // List available tools
        const toolsResponse = await sendRequest(client, {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
        });
        console.log('Available tools:', toolsResponse.result.tools.map((t: any) => t.name));

        // Store a memory
        const storeResponse = await sendRequest(client, {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'memory-store',
            arguments: {
              content: 'Always use TypeScript strict mode for better type safety',
              type: 'system1',
              metadata: {
                tags: ['typescript', 'configuration', 'best-practices'],
                confidence: 0.95,
                source: 'team-guidelines',
              },
            },
          },
        });
        console.log('Memory stored:', JSON.parse(storeResponse.result.content[0].text));

        // Search for memories
        const searchResponse = await sendRequest(client, {
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: {
            name: 'memory-search',
            arguments: {
              query: 'typescript configuration best practices',
              type: 'hybrid',
              limit: 5,
            },
          },
        });
        console.log('Search results:', JSON.parse(searchResponse.result.content[0].text));

        // Create memory relationship
        const relateResponse = await sendRequest(client, {
          jsonrpc: '2.0',
          id: 5,
          method: 'tools/call',
          params: {
            name: 'memory-relate',
            arguments: {
              sourceMemoryId: 'mem_typescript_strict',
              targetMemoryId: 'mem_typescript_config',
              relationshipType: 'IMPLEMENTS',
              metadata: {
                strength: 0.8,
                confidence: 0.9,
              },
            },
          },
        });

        console.log('Memory relationship created');
        client.close();
        resolve();

      } catch (error) {
        console.error('Client error:', error);
        reject(error);
      }
    });

    client.on('error', reject);
  });
}

// Example 6: Batch Memory Operations
export async function batchMemoryOperationsExample() {
  console.log('=== Batch Memory Operations Example ===');

  const WebSocket = require('ws');
  const client = new WebSocket('ws://localhost:8081/mcp-aggregator');

  return new Promise<void>((resolve, reject) => {
    client.on('open', async () => {
      try {
        // Initialize connection
        await sendRequest(client, {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'batch-client', version: '1.0.0' },
          },
        });

        // Batch operations across multiple servers
        const batchResponse = await sendRequest(client, {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'proxy-batch-operations',
            arguments: {
              operations: [
                {
                  server: 'file-operations',
                  tool: 'read-file',
                  arguments: { path: './src/config.ts' },
                },
                {
                  server: 'git-operations',
                  tool: 'get-status',
                  arguments: {},
                },
                {
                  server: 'build-system',
                  tool: 'run-tests',
                  arguments: { pattern: '*.spec.ts' },
                },
              ],
              parallel: true,
              extractLearning: true,
            },
          },
        });

        console.log('Batch operations completed:', JSON.parse(batchResponse.result.content[0].text));

        client.close();
        resolve();

      } catch (error) {
        reject(error);
      }
    });

    client.on('error', reject);
  });
}

// Example 7: Memory Analytics and Quality Metrics
export async function memoryAnalyticsExample() {
  console.log('=== Memory Analytics Example ===');

  const WebSocket = require('ws');
  const client = new WebSocket('ws://localhost:8080/mcp');

  return new Promise<void>((resolve, reject) => {
    client.on('open', async () => {
      try {
        await sendRequest(client, {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'analytics-client', version: '1.0.0' },
          },
        });

        // Get memory statistics
        const statsResponse = await sendRequest(client, {
          jsonrpc: '2.0',
          id: 2,
          method: 'resources/read',
          params: {
            uri: 'memory://stats/my-workspace',
          },
        });

        console.log('Memory statistics:', JSON.parse(statsResponse.result.contents[0].text));

        // Get quality metrics
        const qualityResponse = await sendRequest(client, {
          jsonrpc: '2.0',
          id: 3,
          method: 'resources/read',
          params: {
            uri: 'memory://quality/my-workspace',
          },
        });

        console.log('Quality metrics:', JSON.parse(qualityResponse.result.contents[0].text));

        // Trigger memory evolution
        const evolveResponse = await sendRequest(client, {
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: {
            name: 'memory-evolve',
            arguments: {
              workspace: 'my-workspace',
              trigger: 'usage_pattern',
              context: 'Optimizing based on recent access patterns',
            },
          },
        });

        console.log('Memory evolution results:', JSON.parse(evolveResponse.result.content[0].text));

        client.close();
        resolve();

      } catch (error) {
        reject(error);
      }
    });
  });
}

// Example 8: Real-time Memory Subscriptions
export async function memorySubscriptionsExample() {
  console.log('=== Memory Subscriptions Example ===');

  const WebSocket = require('ws');
  const client = new WebSocket('ws://localhost:8080/mcp');

  return new Promise<void>((resolve, reject) => {
    client.on('open', async () => {
      try {
        await sendRequest(client, {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: { resources: { subscribe: true } },
            clientInfo: { name: 'subscription-client', version: '1.0.0' },
          },
        });

        // Subscribe to memory updates
        client.on('message', (data: Buffer) => {
          const message = JSON.parse(data.toString());
          
          // Handle notifications
          if (message.method?.startsWith('memory/')) {
            console.log(`Memory event: ${message.method}`, message.params);
          }
        });

        // Store some memories to trigger events
        await sendRequest(client, {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'memory-store',
            arguments: {
              content: 'Use dependency injection for better testability',
              type: 'system2',
              metadata: { tags: ['architecture', 'testing'] },
            },
          },
        });

        // Keep connection alive for a bit to receive events
        setTimeout(() => {
          client.close();
          resolve();
        }, 5000);

      } catch (error) {
        reject(error);
      }
    });
  });
}

// Utility function to send requests and wait for responses
function sendRequest(client: any, request: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const handler = (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.id === request.id) {
          client.removeListener('message', handler);
          if (message.error) {
            reject(new Error(message.error.message));
          } else {
            resolve(message);
          }
        }
      } catch (error) {
        reject(error);
      }
    };

    client.on('message', handler);
    client.send(JSON.stringify(request));

    // Timeout after 30 seconds
    setTimeout(() => {
      client.removeListener('message', handler);
      reject(new Error('Request timeout'));
    }, 30000);
  });
}

// Main execution function
async function main() {
  const examples = [
    basicDefaultServerExample,
    // secureProductionServerExample,
    // aggregatorServerExample,
    // customAuthExample,
    // clientUsageExample,
    // batchMemoryOperationsExample,
    // memoryAnalyticsExample,
    // memorySubscriptionsExample,
  ];

  for (const example of examples) {
    try {
      await example();
      console.log(`✅ ${example.name} completed successfully\n`);
    } catch (error) {
      console.error(`❌ ${example.name} failed:`, error);
      console.log('');
    }
  }

  console.log('All examples completed. Press Ctrl+C to exit.');
}

// Run examples if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  basicDefaultServerExample,
  secureProductionServerExample,
  aggregatorServerExample,
  customAuthExample,
  clientUsageExample,
  batchMemoryOperationsExample,
  memoryAnalyticsExample,
  memorySubscriptionsExample,
};