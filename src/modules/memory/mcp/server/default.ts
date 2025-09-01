/**
 * Default Mode MCP Server for LANKA Memory System
 * Provides natural language interface for memory operations
 */

import { BaseMCPServer } from './base';
import { WebSocketTransport } from '../transport/websocket';
import {
  MCPServerConfig,
  MCPServerContext,
  MCPTool,
  MCPToolResult,
  MCPContent,
  Memory,
  MemorySearchParams,
  MemoryStoreParams,
  MemoryRelateParams,
  MemoryEvolveParams,
  MemoryFederateParams,
  MCPErrorCode,
} from '../types';
import { MemoryService } from './services/memory';
import { ArbitrationService } from './services/arbitration';
import { VectorService } from './services/vector';
import { GraphService } from './services/graph';

export class DefaultMCPServer extends BaseMCPServer {
  private memoryService: MemoryService;
  private arbitrationService: ArbitrationService;
  private vectorService: VectorService;
  private graphService: GraphService;

  constructor(config: MCPServerConfig) {
    super(config);
    this.initializeServices();
    this.registerMemoryTools();
    this.registerMemoryResources();
  }

  private initializeServices(): void {
    // Initialize memory-related services
    this.memoryService = new MemoryService(this.config.memory!);
    this.arbitrationService = new ArbitrationService();
    this.vectorService = new VectorService(this.config.memory!.vectorDb);
    this.graphService = new GraphService(this.config.memory!.neo4jUri);
  }

  protected async initializeTransport(): Promise<void> {
    this.transport = new WebSocketTransport(this.config.transport);
  }

  private registerMemoryTools(): void {
    // Memory Search Tool
    this.registerTool(
      'memory-search',
      {
        name: 'memory-search',
        description: 'Search memories using semantic, structural, or hybrid queries',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query in natural language',
            },
            type: {
              type: 'string',
              enum: ['semantic', 'structural', 'hybrid'],
              description: 'Type of search to perform',
              default: 'hybrid',
            },
            workspace: {
              type: 'string',
              description: 'Workspace to search in (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return',
              default: 10,
            },
            filters: {
              type: 'object',
              properties: {
                memoryType: {
                  type: 'string',
                  enum: ['system1', 'system2', 'workspace'],
                },
                quality: {
                  type: 'number',
                  description: 'Minimum quality threshold (0-1)',
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by tags',
                },
                timeRange: {
                  type: 'object',
                  properties: {
                    start: { type: 'string', format: 'date-time' },
                    end: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          required: ['query'],
        },
      },
      this.handleMemorySearch.bind(this)
    );

    // Memory Store Tool
    this.registerTool(
      'memory-store',
      {
        name: 'memory-store',
        description: 'Store new memories with automatic arbitration and quality assessment',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The memory content to store',
            },
            type: {
              type: 'string',
              enum: ['system1', 'system2', 'workspace'],
              description: 'Type of memory to create',
            },
            workspace: {
              type: 'string',
              description: 'Workspace for the memory (required for workspace memories)',
            },
            metadata: {
              type: 'object',
              properties: {
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Tags for categorization',
                },
                confidence: {
                  type: 'number',
                  description: 'Confidence in the memory (0-1)',
                },
                source: {
                  type: 'string',
                  description: 'Source of the memory',
                },
                context: {
                  type: 'string',
                  description: 'Additional context information',
                },
              },
            },
            arbitration: {
              type: 'object',
              properties: {
                enabled: {
                  type: 'boolean',
                  description: 'Whether to enable arbitration',
                  default: true,
                },
                threshold: {
                  type: 'number',
                  description: 'Similarity threshold for arbitration',
                  default: 0.85,
                },
                allowUpdate: {
                  type: 'boolean',
                  description: 'Allow updating existing memories',
                  default: true,
                },
              },
            },
          },
          required: ['content', 'type'],
        },
      },
      this.handleMemoryStore.bind(this)
    );

    // Memory Relate Tool
    this.registerTool(
      'memory-relate',
      {
        name: 'memory-relate',
        description: 'Create relationships between memories',
        inputSchema: {
          type: 'object',
          properties: {
            sourceMemoryId: {
              type: 'string',
              description: 'ID of the source memory',
            },
            targetMemoryId: {
              type: 'string',
              description: 'ID of the target memory',
            },
            relationshipType: {
              type: 'string',
              enum: ['IMPLEMENTS', 'EVOLVED_FROM', 'CONTRADICTS', 'DEPENDS_ON', 'SIMILAR_TO', 'VALIDATES'],
              description: 'Type of relationship to create',
            },
            metadata: {
              type: 'object',
              properties: {
                strength: {
                  type: 'number',
                  description: 'Strength of the relationship (0-1)',
                  default: 0.5,
                },
                confidence: {
                  type: 'number',
                  description: 'Confidence in the relationship (0-1)',
                  default: 0.5,
                },
                context: {
                  type: 'string',
                  description: 'Context for the relationship',
                },
              },
            },
          },
          required: ['sourceMemoryId', 'targetMemoryId', 'relationshipType'],
        },
      },
      this.handleMemoryRelate.bind(this)
    );

    // Memory Evolve Tool
    this.registerTool(
      'memory-evolve',
      {
        name: 'memory-evolve',
        description: 'Trigger memory evolution based on usage patterns or contradictions',
        inputSchema: {
          type: 'object',
          properties: {
            memoryId: {
              type: 'string',
              description: 'Specific memory ID to evolve (optional)',
            },
            workspace: {
              type: 'string',
              description: 'Workspace to evolve memories for (optional)',
            },
            trigger: {
              type: 'string',
              enum: ['usage_pattern', 'contradiction', 'validation', 'manual'],
              description: 'What triggered the evolution',
            },
            context: {
              type: 'string',
              description: 'Additional context for the evolution',
            },
          },
          required: ['trigger'],
        },
      },
      this.handleMemoryEvolve.bind(this)
    );

    // Memory Federate Tool
    this.registerTool(
      'memory-federate',
      {
        name: 'memory-federate',
        description: 'Share memories across instances with privacy controls',
        inputSchema: {
          type: 'object',
          properties: {
            memories: {
              type: 'array',
              items: { type: 'string' },
              description: 'Memory IDs to federate',
            },
            targetInstance: {
              type: 'string',
              description: 'Target instance URL or identifier',
            },
            mode: {
              type: 'string',
              enum: ['share', 'sync', 'merge'],
              description: 'Federation mode',
            },
            privacyLevel: {
              type: 'string',
              enum: ['patterns_only', 'anonymized', 'full'],
              description: 'Level of privacy protection',
            },
          },
          required: ['memories', 'targetInstance', 'mode', 'privacyLevel'],
        },
      },
      this.handleMemoryFederate.bind(this)
    );
  }

  private registerMemoryResources(): void {
    // Memory Collections Resource
    this.registerResource(
      'memory://collections/{workspace}',
      {
        uri: 'memory://collections/{workspace}',
        name: 'Memory Collections',
        description: 'Access memory collections by workspace',
        mimeType: 'application/json',
      },
      this.handleMemoryCollectionsResource.bind(this)
    );

    // Memory Statistics Resource
    this.registerResource(
      'memory://stats/{workspace}',
      {
        uri: 'memory://stats/{workspace}',
        name: 'Memory Statistics',
        description: 'Get memory statistics and analytics',
        mimeType: 'application/json',
      },
      this.handleMemoryStatsResource.bind(this)
    );

    // Memory Quality Metrics Resource
    this.registerResource(
      'memory://quality/{workspace}',
      {
        uri: 'memory://quality/{workspace}',
        name: 'Memory Quality Metrics',
        description: 'Access memory quality metrics and trends',
        mimeType: 'application/json',
      },
      this.handleMemoryQualityResource.bind(this)
    );
  }

  // Tool Handlers
  private async handleMemorySearch(params: MemorySearchParams, context: MCPServerContext): Promise<MCPToolResult> {
    try {
      this.logger.info(`Memory search requested by ${context.clientId}:`, params);

      // Validate permissions
      if (params.workspace && !this.hasWorkspaceAccess(context, params.workspace)) {
        throw new Error('Insufficient permissions for workspace');
      }

      const results = await this.memoryService.searchMemories(params);
      
      const content: MCPContent[] = [{
        type: 'text',
        text: JSON.stringify({
          query: params.query,
          type: params.type || 'hybrid',
          results: results.map(memory => ({
            id: memory.id,
            content: memory.content,
            type: memory.type,
            quality: memory.quality,
            confidence: memory.confidence,
            tags: memory.tags,
            createdAt: memory.createdAt,
            relevanceScore: memory.metadata.relevanceScore || 0,
          })),
          total: results.length,
        }, null, 2),
      }];

      this.emit('memory:searched', params, results, context);
      
      return { content };

    } catch (error) {
      this.logger.error('Memory search failed:', error);
      return {
        content: [{
          type: 'text',
          text: `Memory search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }],
        isError: true,
      };
    }
  }

  private async handleMemoryStore(params: MemoryStoreParams, context: MCPServerContext): Promise<MCPToolResult> {
    try {
      this.logger.info(`Memory store requested by ${context.clientId}:`, { ...params, content: params.content.substring(0, 100) + '...' });

      // Validate permissions
      if (params.workspace && !this.hasWorkspaceAccess(context, params.workspace)) {
        throw new Error('Insufficient permissions for workspace');
      }

      // Perform arbitration if enabled
      let arbitrationResult = null;
      if (params.arbitration?.enabled !== false) {
        arbitrationResult = await this.arbitrationService.arbitrate(params, context);
      }

      const memory = await this.memoryService.storeMemory(params, arbitrationResult);
      
      const content: MCPContent[] = [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          memory: {
            id: memory.id,
            type: memory.type,
            quality: memory.quality,
            confidence: memory.confidence,
          },
          arbitration: arbitrationResult,
        }, null, 2),
      }];

      this.emit('memory:stored', memory, context);
      
      return { content };

    } catch (error) {
      this.logger.error('Memory store failed:', error);
      return {
        content: [{
          type: 'text',
          text: `Memory store failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }],
        isError: true,
      };
    }
  }

  private async handleMemoryRelate(params: MemoryRelateParams, context: MCPServerContext): Promise<MCPToolResult> {
    try {
      this.logger.info(`Memory relate requested by ${context.clientId}:`, params);

      const relationship = await this.memoryService.createRelationship(params);
      
      const content: MCPContent[] = [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          relationship: {
            id: relationship.id,
            type: relationship.type,
            strength: relationship.strength,
            confidence: relationship.confidence,
          },
        }, null, 2),
      }];

      this.emit('memory:related', relationship, context);
      
      return { content };

    } catch (error) {
      this.logger.error('Memory relate failed:', error);
      return {
        content: [{
          type: 'text',
          text: `Memory relate failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }],
        isError: true,
      };
    }
  }

  private async handleMemoryEvolve(params: MemoryEvolveParams, context: MCPServerContext): Promise<MCPToolResult> {
    try {
      this.logger.info(`Memory evolve requested by ${context.clientId}:`, params);

      const results = await this.memoryService.evolveMemories(params);
      
      const content: MCPContent[] = [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          evolved: results.evolved.length,
          merged: results.merged.length,
          deprecated: results.deprecated.length,
          details: results,
        }, null, 2),
      }];
      
      return { content };

    } catch (error) {
      this.logger.error('Memory evolve failed:', error);
      return {
        content: [{
          type: 'text',
          text: `Memory evolve failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }],
        isError: true,
      };
    }
  }

  private async handleMemoryFederate(params: MemoryFederateParams, context: MCPServerContext): Promise<MCPToolResult> {
    try {
      this.logger.info(`Memory federate requested by ${context.clientId}:`, params);

      const results = await this.memoryService.federateMemories(params);
      
      const content: MCPContent[] = [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          shared: results.shared,
          failed: results.failed,
          privacyLevel: params.privacyLevel,
        }, null, 2),
      }];
      
      return { content };

    } catch (error) {
      this.logger.error('Memory federate failed:', error);
      return {
        content: [{
          type: 'text',
          text: `Memory federate failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }],
        isError: true,
      };
    }
  }

  // Resource Handlers
  private async handleMemoryCollectionsResource(uri: string, context: MCPServerContext): Promise<MCPContent[]> {
    const workspace = this.extractWorkspaceFromUri(uri);
    
    if (!this.hasWorkspaceAccess(context, workspace)) {
      throw new Error('Insufficient permissions for workspace');
    }

    const collection = await this.memoryService.getMemoryCollection(workspace);
    
    return [{
      type: 'text',
      text: JSON.stringify(collection, null, 2),
    }];
  }

  private async handleMemoryStatsResource(uri: string, context: MCPServerContext): Promise<MCPContent[]> {
    const workspace = this.extractWorkspaceFromUri(uri);
    
    if (!this.hasWorkspaceAccess(context, workspace)) {
      throw new Error('Insufficient permissions for workspace');
    }

    const stats = await this.memoryService.getMemoryStatistics(workspace);
    
    return [{
      type: 'text',
      text: JSON.stringify(stats, null, 2),
    }];
  }

  private async handleMemoryQualityResource(uri: string, context: MCPServerContext): Promise<MCPContent[]> {
    const workspace = this.extractWorkspaceFromUri(uri);
    
    if (!this.hasWorkspaceAccess(context, workspace)) {
      throw new Error('Insufficient permissions for workspace');
    }

    const quality = await this.memoryService.getQualityMetrics(workspace);
    
    return [{
      type: 'text',
      text: JSON.stringify(quality, null, 2),
    }];
  }

  // Utility Methods
  private hasWorkspaceAccess(context: MCPServerContext, workspace: string): boolean {
    // Implement workspace access control
    // 1. Validate user permissions for workspace
    // 2. Check if user has read/write access
    // 3. Apply row-level security if needed
    // 4. Log access attempts for audit
    
    // For production, implement proper access control:
    // const hasAccess = await this.checkWorkspaceAccess(context.user.id, workspace);
    // if (!hasAccess) {
    //   throw new Error(`User does not have access to workspace ${workspace}`);
    // }
    
    // For now, allow access if user has workspace permission or it's their workspace
    return context.workspace === workspace || 
           (context.user?.permissions.includes('workspace:all')) ||
           (context.user?.permissions.includes(`workspace:${workspace}`));
  }

  private extractWorkspaceFromUri(uri: string): string {
    const match = uri.match(/memory:\/\/\w+\/(.+)/);
    return match ? match[1] : 'default';
  }
}