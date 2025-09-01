/**
 * MCP Server Factory
 * Creates and configures MCP servers based on mode
 */

import { DefaultMCPServer } from './default';
import { AggregatorMCPServer } from './aggregator';
import { MCPServerConfig } from '../types';
import winston from 'winston';

export class MCPServerFactory {
  private static logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: 'mcp-server-factory' },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ],
  });

  public static create(config: MCPServerConfig): DefaultMCPServer | AggregatorMCPServer {
    this.validateConfig(config);
    
    this.logger.info(`Creating MCP server in ${config.mode} mode: ${config.name}`);

    switch (config.mode) {
      case 'default':
        return new DefaultMCPServer(config);
        
      case 'aggregator':
        return new AggregatorMCPServer(config);
        
      default:
        throw new Error(`Unsupported MCP server mode: ${config.mode}`);
    }
  }

  private static validateConfig(config: MCPServerConfig): void {
    const errors: string[] = [];

    // Basic validation
    if (!config.name) {
      errors.push('Server name is required');
    }

    if (!config.version) {
      errors.push('Server version is required');
    }

    if (!config.mode || !['default', 'aggregator'].includes(config.mode)) {
      errors.push('Server mode must be "default" or "aggregator"');
    }

    // Transport validation
    if (!config.transport) {
      errors.push('Transport configuration is required');
    } else {
      if (!config.transport.type || !['websocket', 'http2', 'stdio'].includes(config.transport.type)) {
        errors.push('Transport type must be "websocket", "http2", or "stdio"');
      }

      if (config.transport.type === 'websocket') {
        if (!config.transport.host) {
          errors.push('WebSocket transport requires host');
        }
        if (!config.transport.port) {
          errors.push('WebSocket transport requires port');
        }
      }
    }

    // Memory configuration validation
    if (!config.memory) {
      errors.push('Memory configuration is required');
    } else {
      if (!config.memory.neo4jUri) {
        errors.push('Neo4j URI is required');
      }

      if (!config.memory.vectorDb) {
        errors.push('Vector database configuration is required');
      } else {
        if (!config.memory.vectorDb.type || !['qdrant', 'milvus'].includes(config.memory.vectorDb.type)) {
          errors.push('Vector database type must be "qdrant" or "milvus"');
        }
        if (!config.memory.vectorDb.uri) {
          errors.push('Vector database URI is required');
        }
      }

      if (!config.memory.redis?.uri) {
        errors.push('Redis configuration is required');
      }
    }

    // Aggregator-specific validation
    if (config.mode === 'aggregator') {
      if (!config.aggregator) {
        errors.push('Aggregator configuration is required for aggregator mode');
      } else if (!config.aggregator.servers || config.aggregator.servers.length === 0) {
        errors.push('At least one proxied server must be configured for aggregator mode');
      } else {
        for (const [index, server] of config.aggregator.servers.entries()) {
          if (!server.name) {
            errors.push(`Proxied server at index ${index} requires a name`);
          }
          if (!server.uri) {
            errors.push(`Proxied server at index ${index} requires a URI`);
          }
        }
      }
    }

    // Rate limiting validation
    if (config.rateLimit) {
      if (config.rateLimit.windowMs <= 0) {
        errors.push('Rate limit window must be positive');
      }
      if (config.rateLimit.maxRequests <= 0) {
        errors.push('Rate limit max requests must be positive');
      }
    }

    // Auth validation
    if (config.auth?.required) {
      if (!config.auth.providers || config.auth.providers.length === 0) {
        errors.push('Auth providers must be specified when authentication is required');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }

    this.logger.info('Configuration validation passed');
  }

  public static createDefaultConfig(overrides: Partial<MCPServerConfig> = {}): MCPServerConfig {
    const defaultConfig: MCPServerConfig = {
      name: 'lanka-memory-server',
      version: '1.0.0',
      mode: 'default',
      transport: {
        type: 'websocket',
        host: 'localhost',
        port: 8080,
        path: '/mcp',
        auth: {
          type: 'none',
        },
      },
      capabilities: {
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
      },
      rateLimit: {
        windowMs: 60000, // 1 minute
        maxRequests: 100,
      },
      auth: {
        required: false,
        providers: [],
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
    };

    return this.mergeConfig(defaultConfig, overrides);
  }

  public static createAggregatorConfig(
    proxiedServers: Array<{ name: string; uri: string; auth?: any }>,
    overrides: Partial<MCPServerConfig> = {}
  ): MCPServerConfig {
    const baseConfig = this.createDefaultConfig({
      name: 'lanka-memory-aggregator',
      mode: 'aggregator',
      transport: {
        type: 'websocket',
        host: 'localhost',
        port: 8081,
        path: '/mcp-aggregator',
      },
      ...overrides,
    });

    baseConfig.aggregator = {
      servers: proxiedServers,
    };

    return baseConfig;
  }

  private static mergeConfig(base: MCPServerConfig, overrides: Partial<MCPServerConfig>): MCPServerConfig {
    const merged = { ...base };

    for (const [key, value] of Object.entries(overrides)) {
      if (value !== undefined) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Deep merge objects
          (merged as any)[key] = {
            ...(merged as any)[key],
            ...value,
          };
        } else {
          // Direct assignment for primitives and arrays
          (merged as any)[key] = value;
        }
      }
    }

    return merged;
  }

  public static async startServer(config: MCPServerConfig): Promise<DefaultMCPServer | AggregatorMCPServer> {
    const server = this.create(config);
    
    try {
      await server.start();
      this.logger.info(`MCP server ${config.name} started successfully on ${config.transport.host}:${config.transport.port}`);
      return server;
    } catch (error) {
      this.logger.error(`Failed to start MCP server ${config.name}:`, error);
      throw error;
    }
  }

  public static async stopServer(server: DefaultMCPServer | AggregatorMCPServer): Promise<void> {
    try {
      await server.stop();
      this.logger.info('MCP server stopped successfully');
    } catch (error) {
      this.logger.error('Error stopping MCP server:', error);
      throw error;
    }
  }

  // Helper methods for different deployment scenarios
  public static createDevelopmentConfig(): MCPServerConfig {
    return this.createDefaultConfig({
      transport: {
        type: 'websocket',
        host: 'localhost',
        port: 8080,
        auth: { type: 'none' },
      },
      rateLimit: {
        windowMs: 60000,
        maxRequests: 1000, // Higher limit for development
      },
      auth: {
        required: false,
        providers: [],
      },
    });
  }

  public static createProductionConfig(
    neo4jUri: string,
    vectorDbUri: string,
    redisUri: string,
    host: string = '0.0.0.0',
    port: number = 8080
  ): MCPServerConfig {
    return this.createDefaultConfig({
      transport: {
        type: 'websocket',
        host,
        port,
        auth: {
          type: 'bearer',
          token: process.env.MCP_AUTH_TOKEN,
        },
        ssl: {
          cert: process.env.SSL_CERT_PATH,
          key: process.env.SSL_KEY_PATH,
        },
      },
      rateLimit: {
        windowMs: 60000,
        maxRequests: 50, // Lower limit for production
      },
      auth: {
        required: true,
        providers: ['bearer'],
      },
      memory: {
        neo4jUri,
        vectorDb: {
          type: 'qdrant',
          uri: vectorDbUri,
        },
        redis: {
          uri: redisUri,
        },
      },
    });
  }

  public static createTestConfig(): MCPServerConfig {
    return this.createDefaultConfig({
      name: 'lanka-memory-test',
      transport: {
        type: 'websocket',
        host: 'localhost',
        port: 0, // Random port
        auth: { type: 'none' },
      },
      memory: {
        neo4jUri: 'neo4j://localhost:7687',
        vectorDb: {
          type: 'qdrant',
          uri: 'http://localhost:6333',
        },
        redis: {
          uri: 'redis://localhost:6379/1', // Use different DB for tests
        },
      },
      rateLimit: {
        windowMs: 1000,
        maxRequests: 1000,
      },
    });
  }

  // Configuration validation helpers
  public static async validateConnections(config: MCPServerConfig): Promise<boolean> {
    const errors: string[] = [];

    try {
      // Test Neo4j connection
      const neo4j = require('neo4j-driver');
      const driver = neo4j.driver(config.memory!.neo4jUri);
      const session = driver.session();
      await session.run('RETURN 1');
      await session.close();
      await driver.close();
      this.logger.info('Neo4j connection validated');
    } catch (error) {
      errors.push(`Neo4j connection failed: ${error}`);
    }

    try {
      // Test Redis connection
      const Redis = require('ioredis');
      const redis = new Redis(config.memory!.redis.uri);
      await redis.ping();
      redis.disconnect();
      this.logger.info('Redis connection validated');
    } catch (error) {
      errors.push(`Redis connection failed: ${error}`);
    }

    // TODO: Add vector database connection validation

    if (errors.length > 0) {
      this.logger.error('Connection validation failed:', errors);
      return false;
    }

    this.logger.info('All connections validated successfully');
    return true;
  }
}