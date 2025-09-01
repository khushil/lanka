/**
 * LANKA Memory System MCP Server
 * Main entry point for Model Context Protocol implementation
 */

export * from './types';
export * from './server/base';
export * from './server/default';
export * from './server/aggregator';
export * from './server/factory';
export * from './transport/websocket';

// Service exports
export { MemoryService } from './server/services/memory';
export { ArbitrationService } from './server/services/arbitration';
export { VectorService } from './server/services/vector';
export { GraphService } from './server/services/graph';
export { ProxyService } from './server/services/proxy';
export { LearningExtractor } from './server/services/learning-extractor';

// Main server creation utilities
import { MCPServerFactory } from './server/factory';
import { MCPServerConfig } from './types';

/**
 * Create and start a default mode MCP server
 */
export async function createDefaultServer(config?: Partial<MCPServerConfig>) {
  const fullConfig = MCPServerFactory.createDefaultConfig(config);
  return MCPServerFactory.startServer(fullConfig);
}

/**
 * Create and start an aggregator mode MCP server
 */
export async function createAggregatorServer(
  proxiedServers: Array<{ name: string; uri: string; auth?: any }>,
  config?: Partial<MCPServerConfig>
) {
  const fullConfig = MCPServerFactory.createAggregatorConfig(proxiedServers, config);
  return MCPServerFactory.startServer(fullConfig);
}

/**
 * Create development server with default settings
 */
export async function createDevelopmentServer() {
  const config = MCPServerFactory.createDevelopmentConfig();
  return MCPServerFactory.startServer(config);
}

/**
 * Create production server with security settings
 */
export async function createProductionServer(
  neo4jUri: string,
  vectorDbUri: string,
  redisUri: string,
  host?: string,
  port?: number
) {
  const config = MCPServerFactory.createProductionConfig(
    neo4jUri, 
    vectorDbUri, 
    redisUri, 
    host, 
    port
  );
  return MCPServerFactory.startServer(config);
}

/**
 * Validate server configuration and connections
 */
export async function validateServerConfig(config: MCPServerConfig): Promise<boolean> {
  return MCPServerFactory.validateConnections(config);
}

// CLI interface for standalone usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const mode = args[0] || 'default';
  
  async function main() {
    try {
      let server;
      
      switch (mode) {
        case 'default':
          server = await createDevelopmentServer();
          break;
          
        case 'aggregator':
          // Example aggregator with mock servers
          server = await createAggregatorServer([
            { name: 'file-server', uri: 'ws://localhost:8082/mcp' },
            { name: 'git-server', uri: 'ws://localhost:8083/mcp' },
          ]);
          break;
          
        case 'production':
          server = await createProductionServer(
            process.env.NEO4J_URI || 'neo4j://localhost:7687',
            process.env.VECTOR_DB_URI || 'http://localhost:6333',
            process.env.REDIS_URI || 'redis://localhost:6379',
            process.env.HOST,
            process.env.PORT ? parseInt(process.env.PORT) : undefined
          );
          break;
          
        default:
          throw new Error(`Unknown mode: ${mode}`);
      }
      
      console.log(`LANKA Memory MCP Server started in ${mode} mode`);
      
      // Graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\nShutting down gracefully...');
        await MCPServerFactory.stopServer(server);
        process.exit(0);
      });
      
      process.on('SIGTERM', async () => {
        console.log('\nReceived SIGTERM, shutting down...');
        await MCPServerFactory.stopServer(server);
        process.exit(0);
      });
      
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
  
  main();
}