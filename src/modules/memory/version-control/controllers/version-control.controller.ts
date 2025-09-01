import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  HttpStatus, 
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { VersionControlService } from '../services/version-control.service';
import { MergeRequestService } from '../services/merge-request.service';
import { VisualizationService } from '../utils/visualization.service';
import { MergeStrategy } from '../types';

@ApiTags('Version Control')
@Controller('memory/version-control')
export class VersionControlController {
  private readonly logger = new Logger(VersionControlController.name);

  constructor(
    private readonly versionControl: VersionControlService,
    private readonly mergeRequestService: MergeRequestService,
    private readonly visualization: VisualizationService,
  ) {}

  // Branch Operations
  @Post('branches')
  @ApiOperation({ summary: 'Create a new branch' })
  async createBranch(
    @Body() body: {
      name: string;
      fromCommitId: string;
      createdBy: string;
      description?: string;
    }
  ) {
    try {
      const branch = await this.versionControl.createBranch(
        body.name,
        body.fromCommitId,
        body.createdBy,
        body.description,
      );
      return { success: true, branch };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('branches')
  @ApiOperation({ summary: 'List all branches' })
  async getBranches() {
    try {
      const branches = await this.versionControl.getAllBranches();
      return { success: true, branches };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('branches/:name')
  @ApiOperation({ summary: 'Get branch details' })
  @ApiParam({ name: 'name', description: 'Branch name' })
  async getBranch(@Param('name') name: string) {
    try {
      const branch = await this.versionControl.getBranch(name);
      if (!branch) {
        throw new HttpException('Branch not found', HttpStatus.NOT_FOUND);
      }
      return { success: true, branch };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Delete('branches/:name')
  @ApiOperation({ summary: 'Delete a branch' })
  @ApiParam({ name: 'name', description: 'Branch name' })
  async deleteBranch(
    @Param('name') name: string,
    @Body() body: { authorId: string }
  ) {
    try {
      await this.versionControl.deleteBranch(name, body.authorId);
      return { success: true, message: `Branch ${name} deleted` };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Commit Operations
  @Post('commits')
  @ApiOperation({ summary: 'Create a new commit' })
  async createCommit(
    @Body() body: {
      memoryId: string;
      branchName: string;
      authorId: string;
      message: string;
      changes: any;
      rationale?: string;
    }
  ) {
    try {
      const commit = await this.versionControl.createCommit(
        body.memoryId,
        body.branchName,
        body.authorId,
        body.message,
        body.changes,
        body.rationale,
      );
      return { success: true, commit };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('commits')
  @ApiOperation({ summary: 'Get commit history' })
  @ApiQuery({ name: 'branch', description: 'Branch name' })
  @ApiQuery({ name: 'limit', description: 'Number of commits to return', required: false })
  async getCommitHistory(
    @Query('branch') branch: string,
    @Query('limit') limit?: number
  ) {
    try {
      const commits = await this.versionControl.getCommitHistory(branch, limit);
      return { success: true, commits };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('commits/:id/diff/:targetId')
  @ApiOperation({ summary: 'Get diff between two commits' })
  @ApiParam({ name: 'id', description: 'Source commit ID' })
  @ApiParam({ name: 'targetId', description: 'Target commit ID' })
  async getDiff(
    @Param('id') fromId: string,
    @Param('targetId') toId: string
  ) {
    try {
      const diff = await this.versionControl.getDiff(fromId, toId);
      return { success: true, diff };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Merge Operations
  @Post('merge')
  @ApiOperation({ summary: 'Merge branches' })
  async mergeBranches(
    @Body() body: {
      sourceBranch: string;
      targetBranch: string;
      strategy?: MergeStrategy;
      authorId: string;
      message?: string;
    }
  ) {
    try {
      const result = await this.versionControl.mergeBranches(
        body.sourceBranch,
        body.targetBranch,
        body.strategy || MergeStrategy.AUTO,
        body.authorId,
        body.message,
      );
      return { success: true, result };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('rollback')
  @ApiOperation({ summary: 'Rollback to a specific commit' })
  async rollback(
    @Body() body: {
      branchName: string;
      commitId: string;
      authorId: string;
    }
  ) {
    try {
      const commit = await this.versionControl.rollback(
        body.branchName,
        body.commitId,
        body.authorId,
      );
      return { success: true, commit };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Merge Request Operations
  @Post('merge-requests')
  @ApiOperation({ summary: 'Create a merge request' })
  async createMergeRequest(
    @Body() body: {
      sourceBranch: string;
      targetBranch: string;
      title: string;
      description: string;
      authorId: string;
      reviewers?: string[];
    }
  ) {
    try {
      const mr = await this.mergeRequestService.createMergeRequest(
        body.sourceBranch,
        body.targetBranch,
        body.title,
        body.description,
        body.authorId,
        body.reviewers,
      );
      return { success: true, mergeRequest: mr };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('merge-requests')
  @ApiOperation({ summary: 'List merge requests' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'authorId', required: false })
  @ApiQuery({ name: 'reviewerId', required: false })
  async getMergeRequests(
    @Query('status') status?: string,
    @Query('authorId') authorId?: string,
    @Query('reviewerId') reviewerId?: string
  ) {
    try {
      const filters: any = {};
      if (status) filters.status = status;
      if (authorId) filters.authorId = authorId;
      if (reviewerId) filters.reviewerId = reviewerId;

      const mergeRequests = await this.mergeRequestService.listMergeRequests(filters);
      return { success: true, mergeRequests };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('merge-requests/:id')
  @ApiOperation({ summary: 'Get merge request details' })
  @ApiParam({ name: 'id', description: 'Merge request ID' })
  async getMergeRequest(@Param('id') id: string) {
    try {
      const mr = await this.mergeRequestService.getMergeRequest(id);
      if (!mr) {
        throw new HttpException('Merge request not found', HttpStatus.NOT_FOUND);
      }
      return { success: true, mergeRequest: mr };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Post('merge-requests/:id/review')
  @ApiOperation({ summary: 'Add review to merge request' })
  @ApiParam({ name: 'id', description: 'Merge request ID' })
  async addReview(
    @Param('id') id: string,
    @Body() body: {
      reviewerId: string;
      status: 'approved' | 'rejected' | 'requested_changes';
      comment?: string;
    }
  ) {
    try {
      const mr = await this.mergeRequestService.addReview(
        id,
        body.reviewerId,
        body.status,
        body.comment,
      );
      return { success: true, mergeRequest: mr };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('merge-requests/:id/merge')
  @ApiOperation({ summary: 'Merge a merge request' })
  @ApiParam({ name: 'id', description: 'Merge request ID' })
  async mergeMergeRequest(
    @Param('id') id: string,
    @Body() body: {
      mergerId: string;
      strategy?: MergeStrategy;
    }
  ) {
    try {
      const result = await this.mergeRequestService.mergeMergeRequest(
        id,
        body.mergerId,
        body.strategy,
      );
      return { success: true, result };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('merge-requests/:id/resolve-conflicts')
  @ApiOperation({ summary: 'Resolve conflicts in merge request' })
  @ApiParam({ name: 'id', description: 'Merge request ID' })
  async resolveConflicts(
    @Param('id') id: string,
    @Body() body: {
      resolutions: Array<{
        conflictIndex: number;
        resolvedValue: any;
        rationale: string;
      }>;
    }
  ) {
    try {
      const mr = await this.mergeRequestService.resolveConflicts(id, body.resolutions);
      return { success: true, mergeRequest: mr };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('merge-requests/:id/auto-resolve')
  @ApiOperation({ summary: 'Auto-resolve conflicts using LLM' })
  @ApiParam({ name: 'id', description: 'Merge request ID' })
  async autoResolveConflicts(@Param('id') id: string) {
    try {
      const mr = await this.mergeRequestService.autoResolveConflicts(id);
      return { success: true, mergeRequest: mr };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('merge-requests/:id/close')
  @ApiOperation({ summary: 'Close merge request' })
  @ApiParam({ name: 'id', description: 'Merge request ID' })
  async closeMergeRequest(
    @Param('id') id: string,
    @Body() body: { userId: string }
  ) {
    try {
      const mr = await this.mergeRequestService.closeMergeRequest(id, body.userId);
      return { success: true, mergeRequest: mr };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Visualization Operations
  @Get('visualize/commit-graph')
  @ApiOperation({ summary: 'Get commit graph visualization data' })
  @ApiQuery({ name: 'branches', description: 'Comma-separated branch names', required: false })
  @ApiQuery({ name: 'limit', description: 'Number of commits', required: false })
  async getCommitGraph(
    @Query('branches') branches?: string,
    @Query('limit') limit?: number
  ) {
    try {
      const branchNames = branches ? branches.split(',') : undefined;
      const graph = await this.visualization.generateCommitGraph(branchNames, limit);
      return { success: true, graph };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('visualize/memory-timeline/:memoryId')
  @ApiOperation({ summary: 'Get memory evolution timeline' })
  @ApiParam({ name: 'memoryId', description: 'Memory ID' })
  async getMemoryTimeline(@Param('memoryId') memoryId: string) {
    try {
      const timeline = await this.visualization.generateMemoryTimeline(memoryId);
      return { success: true, timeline };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('visualize/branch-comparison')
  @ApiOperation({ summary: 'Compare two branches' })
  @ApiQuery({ name: 'branch1', description: 'First branch name' })
  @ApiQuery({ name: 'branch2', description: 'Second branch name' })
  async compareBranches(
    @Query('branch1') branch1: string,
    @Query('branch2') branch2: string
  ) {
    try {
      const comparison = await this.visualization.generateBranchComparison(branch1, branch2);
      return { success: true, comparison };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('visualize/activity-heatmap')
  @ApiOperation({ summary: 'Get activity heatmap' })
  @ApiQuery({ name: 'start', description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'end', description: 'End date (ISO string)' })
  @ApiQuery({ name: 'granularity', description: 'Time granularity', required: false })
  async getActivityHeatmap(
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('granularity') granularity?: 'hour' | 'day' | 'week'
  ) {
    try {
      const timeRange = {
        start: new Date(start),
        end: new Date(end),
      };
      const heatmap = await this.visualization.generateActivityHeatmap(timeRange, granularity);
      return { success: true, heatmap };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Statistics and Analytics
  @Get('stats/merge-requests')
  @ApiOperation({ summary: 'Get merge request statistics' })
  async getMergeRequestStats() {
    try {
      const stats = await this.mergeRequestService.getMergeRequestStats();
      return { success: true, stats };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check for version control system' })
  async healthCheck() {
    try {
      // Basic health checks
      const branches = await this.versionControl.getAllBranches();
      const stats = await this.mergeRequestService.getMergeRequestStats();
      
      return {
        success: true,
        status: 'healthy',
        timestamp: new Date(),
        metrics: {
          totalBranches: branches.length,
          totalMergeRequests: stats.total,
          openMergeRequests: stats.open,
        },
      };
    } catch (error) {
      throw new HttpException(
        'Version control system unhealthy',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }
}