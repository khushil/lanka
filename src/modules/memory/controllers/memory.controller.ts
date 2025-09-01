/**
 * LANKA Memory System - Memory Controller
 * REST API endpoints for memory system operations
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MemoryOrchestratorService } from '../services/memory-orchestrator.service';
import { AuditService } from '../services/audit.service';
import {
  Memory,
  MemoryQuery,
  MemorySearchResult,
  MemoryArbitrationResult,
} from '../types/memory.types';

// DTOs for API validation
class CreateMemoryDto {
  content: string;
  type: 'system1' | 'system2' | 'workspace';
  workspace: string;
  source: string;
  tags: string[];
  metadata?: Record<string, unknown>;
}

class SearchMemoryDto {
  text?: string;
  workspace?: string;
  type?: string[];
  tags?: string[];
  minConfidence?: number;
  maxAge?: number;
  limit?: number;
  includeDeprecated?: boolean;
}

class BatchCreateMemoryDto {
  memories: CreateMemoryDto[];
}

@ApiTags('memory')
@Controller('memory')
@ApiBearerAuth()
export class MemoryController {
  private readonly logger = new Logger(MemoryController.name);

  constructor(
    private readonly memoryOrchestrator: MemoryOrchestratorService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new memory' })
  @ApiResponse({ status: 201, description: 'Memory created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid memory data' })
  @ApiResponse({ status: 409, description: 'Memory already exists' })
  async createMemory(
    @Body(ValidationPipe) createMemoryDto: CreateMemoryDto,
  ): Promise<{ arbitrationResult: MemoryArbitrationResult }> {
    this.logger.log(`Creating ${createMemoryDto.type} memory for workspace ${createMemoryDto.workspace}`);

    try {
      const result = await this.memoryOrchestrator.ingestMemory(
        createMemoryDto.content,
        createMemoryDto.type,
        createMemoryDto.workspace,
        {
          source: createMemoryDto.source,
          tags: createMemoryDto.tags,
          metadata: createMemoryDto.metadata,
        },
      );

      return { arbitrationResult: result };
    } catch (error) {
      this.logger.error(`Failed to create memory: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('batch')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create multiple memories in batch' })
  @ApiResponse({ status: 201, description: 'Batch creation completed' })
  async batchCreateMemories(
    @Body(ValidationPipe) batchCreateDto: BatchCreateMemoryDto,
  ): Promise<{ results: MemoryArbitrationResult[] }> {
    this.logger.log(`Batch creating ${batchCreateDto.memories.length} memories`);

    try {
      const results = await this.memoryOrchestrator.batchIngestMemories(
        batchCreateDto.memories.map(memory => ({
          content: memory.content,
          type: memory.type,
          workspace: memory.workspace,
          context: {
            source: memory.source,
            tags: memory.tags,
            metadata: memory.metadata,
          },
        })),
      );

      return { results };
    } catch (error) {
      this.logger.error(`Batch memory creation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('search')
  @ApiOperation({ summary: 'Search memories' })
  @ApiResponse({ status: 200, description: 'Search results returned' })
  async searchMemories(
    @Query(ValidationPipe) searchDto: SearchMemoryDto,
  ): Promise<{ 
    results: MemorySearchResult[]; 
    totalCount: number;
    searchTime: number;
  }> {
    this.logger.debug(`Searching memories: ${JSON.stringify(searchDto)}`);

    const startTime = Date.now();

    try {
      const query: MemoryQuery = {
        text: searchDto.text,
        workspace: searchDto.workspace,
        type: searchDto.type as Memory['type'][],
        tags: searchDto.tags,
        minConfidence: searchDto.minConfidence,
        maxAge: searchDto.maxAge,
        limit: searchDto.limit || 20,
        includeDeprecated: searchDto.includeDeprecated || false,
      };

      const results = await this.memoryOrchestrator.searchMemories(query);
      const searchTime = Date.now() - startTime;

      return {
        results,
        totalCount: results.length,
        searchTime,
      };
    } catch (error) {
      this.logger.error(`Memory search failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get memory by ID' })
  @ApiResponse({ status: 200, description: 'Memory found' })
  @ApiResponse({ status: 404, description: 'Memory not found' })
  async getMemoryById(@Param('id') id: string): Promise<{ memory: Memory | null }> {
    this.logger.debug(`Fetching memory ${id}`);

    try {
      const memory = await this.memoryOrchestrator.getMemoryById(id);
      return { memory };
    } catch (error) {
      this.logger.error(`Failed to fetch memory ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Put(':id/evolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger memory evolution' })
  @ApiResponse({ status: 200, description: 'Evolution completed' })
  @ApiResponse({ status: 404, description: 'Memory not found' })
  async evolveMemory(@Param('id') id: string): Promise<{ message: string }> {
    this.logger.log(`Triggering evolution for memory ${id}`);

    try {
      await this.memoryOrchestrator.evolveMemory(id);
      return { message: `Memory ${id} evolution completed` };
    } catch (error) {
      this.logger.error(`Memory evolution failed for ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('analytics/:workspace?')
  @ApiOperation({ summary: 'Get memory analytics' })
  @ApiResponse({ status: 200, description: 'Analytics data returned' })
  async getAnalytics(
    @Param('workspace') workspace?: string,
  ): Promise<{
    analytics: {
      totalMemories: number;
      memoryTypes: Record<string, number>;
      qualityDistribution: Record<string, number>;
      usagePatterns: Record<string, number>;
      evolutionHistory: any[];
    };
  }> {
    this.logger.debug(`Fetching analytics for workspace: ${workspace || 'all'}`);

    try {
      const analytics = await this.memoryOrchestrator.getMemoryAnalytics(workspace);
      return { analytics };
    } catch (error) {
      this.logger.error(`Analytics fetch failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('audit/events')
  @ApiOperation({ summary: 'Query audit events' })
  @ApiResponse({ status: 200, description: 'Audit events returned' })
  async getAuditEvents(
    @Query('memoryId') memoryId?: string,
    @Query('workspace') workspace?: string,
    @Query('eventType') eventType?: string,
    @Query('outcome') outcome?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{
    events: any[];
    totalCount: number;
    hasMore: boolean;
  }> {
    this.logger.debug('Fetching audit events');

    try {
      const query = {
        memoryId,
        workspace,
        eventType: eventType ? [eventType] : undefined,
        outcome: outcome ? [outcome] : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: limit || 50,
        offset: offset || 0,
      };

      const result = await this.auditService.queryAuditEvents(query);
      return result;
    } catch (error) {
      this.logger.error(`Audit query failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('audit/statistics/:workspace?')
  @ApiOperation({ summary: 'Get audit statistics' })
  @ApiResponse({ status: 200, description: 'Audit statistics returned' })
  async getAuditStatistics(
    @Param('workspace') workspace?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<{ statistics: any }> {
    this.logger.debug(`Fetching audit statistics for workspace: ${workspace || 'all'}`);

    try {
      const statistics = await this.auditService.getAuditStatistics(
        workspace,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );

      return { statistics };
    } catch (error) {
      this.logger.error(`Audit statistics fetch failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('audit/compliance/:workspace')
  @ApiOperation({ summary: 'Generate compliance report' })
  @ApiResponse({ status: 200, description: 'Compliance report generated' })
  async getComplianceReport(
    @Param('workspace') workspace: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<{ report: any }> {
    this.logger.log(`Generating compliance report for workspace ${workspace}`);

    try {
      const report = await this.auditService.generateComplianceReport(
        workspace,
        new Date(startDate),
        new Date(endDate),
      );

      return { report };
    } catch (error) {
      this.logger.error(`Compliance report generation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Check memory system health' })
  @ApiResponse({ status: 200, description: 'Health status returned' })
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, { status: string; latency?: number; error?: string }>;
    timestamp: string;
  }> {
    this.logger.debug('Performing health check');

    try {
      const health = await this.memoryOrchestrator.healthCheck();
      return {
        ...health,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`, error.stack);
      
      return {
        status: 'unhealthy',
        components: {
          overall: { status: 'unhealthy', error: error.message },
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('maintenance/evolution')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger global evolution analysis' })
  @ApiResponse({ status: 200, description: 'Evolution analysis completed' })
  async triggerGlobalEvolution(
    @Query('workspace') workspace?: string,
  ): Promise<{
    message: string;
    stats: {
      analyzed: number;
      strengthUpdates: number;
      contradictionsResolved: number;
      mergesExecuted: number;
      deprecations: number;
    };
  }> {
    this.logger.log(`Triggering global evolution analysis for workspace: ${workspace || 'all'}`);

    try {
      // This would trigger the evolution engine's global analysis
      const stats = {
        analyzed: 0,
        strengthUpdates: 0,
        contradictionsResolved: 0,
        mergesExecuted: 0,
        deprecations: 0,
      };

      return {
        message: 'Global evolution analysis completed',
        stats,
      };
    } catch (error) {
      this.logger.error(`Global evolution failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Delete('maintenance/cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clean up old audit events' })
  @ApiResponse({ status: 200, description: 'Cleanup completed' })
  async cleanupAuditEvents(
    @Query('retentionDays') retentionDays?: number,
  ): Promise<{ message: string; deletedCount: number }> {
    this.logger.log(`Cleaning up audit events older than ${retentionDays || 90} days`);

    try {
      const deletedCount = await this.auditService.cleanupOldAuditEvents(retentionDays);
      
      return {
        message: 'Audit cleanup completed',
        deletedCount,
      };
    } catch (error) {
      this.logger.error(`Audit cleanup failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('debug/cache-stats')
  @ApiOperation({ summary: 'Get cache statistics (debug endpoint)' })
  @ApiResponse({ status: 200, description: 'Cache statistics returned' })
  async getCacheStats(): Promise<{ cacheStats: any }> {
    this.logger.debug('Fetching cache statistics');

    try {
      // This would get cache statistics from embedding service
      const cacheStats = {
        embeddings: {
          size: 0,
          hitRate: 0,
          memoryUsage: 0,
        },
        // Could add more cache types here
      };

      return { cacheStats };
    } catch (error) {
      this.logger.error(`Cache stats fetch failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}