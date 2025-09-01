import { Injectable } from '@nestjs/common';
import { MemoryCommit, MemoryBranch, MemoryDiff } from '../types';
import { VersionControlService } from '../services/version-control.service';
import { DiffService } from '../services/diff.service';

interface VisualizationNode {
  id: string;
  type: 'commit' | 'branch' | 'tag';
  label: string;
  timestamp?: Date;
  author?: string;
  message?: string;
  branch?: string;
  x?: number;
  y?: number;
  parents?: string[];
  children?: string[];
}

interface VisualizationEdge {
  source: string;
  target: string;
  type: 'parent' | 'branch' | 'merge';
  label?: string;
}

interface CommitGraph {
  nodes: VisualizationNode[];
  edges: VisualizationEdge[];
  branches: string[];
  timeline: Array<{
    date: Date;
    commits: string[];
  }>;
}

@Injectable()
export class VisualizationService {
  constructor(
    private readonly versionControl: VersionControlService,
    private readonly diffService: DiffService,
  ) {}

  /**
   * Generate commit graph visualization data
   */
  async generateCommitGraph(
    branchNames?: string[],
    limit: number = 100,
    timeRange?: { start: Date; end: Date },
  ): Promise<CommitGraph> {
    const branches = branchNames || await this.getAllBranchNames();
    const commitMap = new Map<string, MemoryCommit>();
    const nodes: VisualizationNode[] = [];
    const edges: VisualizationEdge[] = [];
    
    // Collect all commits from specified branches
    for (const branchName of branches) {
      try {
        const commits = await this.versionControl.getCommitHistory(branchName, limit);
        
        for (const commit of commits) {
          // Filter by time range if specified
          if (timeRange && (commit.timestamp < timeRange.start || commit.timestamp > timeRange.end)) {
            continue;
          }
          
          if (!commitMap.has(commit.id)) {
            commitMap.set(commit.id, commit);
            
            nodes.push({
              id: commit.id,
              type: 'commit',
              label: this.truncateMessage(commit.message),
              timestamp: commit.timestamp,
              author: commit.authorId,
              message: commit.message,
              branch: commit.branchName,
              parents: commit.parentIds,
            });
            
            // Add edges for parent relationships
            for (const parentId of commit.parentIds) {
              edges.push({
                source: parentId,
                target: commit.id,
                type: 'parent',
              });
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to get commits for branch ${branchName}:`, error.message);
      }
    }

    // Calculate layout positions
    this.calculateLayout(nodes, edges);
    
    // Generate timeline
    const timeline = this.generateTimeline(Array.from(commitMap.values()));
    
    return {
      nodes,
      edges,
      branches,
      timeline,
    };
  }

  /**
   * Generate memory evolution timeline
   */
  async generateMemoryTimeline(memoryId: string): Promise<{
    commits: Array<{
      id: string;
      timestamp: Date;
      message: string;
      author: string;
      branch: string;
      changes: MemoryDiff[];
      changesSummary: string;
    }>;
    branches: Array<{
      name: string;
      commits: string[];
      mergedInto?: string;
      mergedAt?: Date;
    }>;
    statistics: {
      totalCommits: number;
      totalBranches: number;
      firstCommit: Date;
      lastCommit: Date;
      mostActiveAuthor: string;
      changeVelocity: number; // changes per day
    };
  }> {
    // This would need to be implemented with proper queries to get memory-specific commits
    // For now, return a basic structure
    return {
      commits: [],
      branches: [],
      statistics: {
        totalCommits: 0,
        totalBranches: 0,
        firstCommit: new Date(),
        lastCommit: new Date(),
        mostActiveAuthor: '',
        changeVelocity: 0,
      },
    };
  }

  /**
   * Generate diff visualization
   */
  generateDiffVisualization(diffs: MemoryDiff[]): {
    summary: {
      added: number;
      removed: number;
      modified: number;
      total: number;
    };
    sections: Array<{
      path: string;
      type: 'added' | 'removed' | 'modified';
      oldValue?: any;
      newValue?: any;
      similarity?: number;
      visualization: string;
    }>;
    heatmap: Array<{
      path: string;
      intensity: number; // 0-1, based on amount of change
    }>;
  } {
    const stats = this.diffService.getDiffStats(diffs);
    
    const sections = diffs.map(diff => ({
      path: diff.path,
      type: diff.type,
      oldValue: diff.oldValue,
      newValue: diff.newValue,
      similarity: diff.similarity,
      visualization: this.generateDiffVisualizationString(diff),
    }));

    const heatmap = this.generateChangeHeatmap(diffs);

    return {
      summary: {
        added: stats.added,
        removed: stats.removed,
        modified: stats.modified,
        total: stats.total,
      },
      sections,
      heatmap,
    };
  }

  /**
   * Generate branch comparison visualization
   */
  async generateBranchComparison(branch1: string, branch2: string): Promise<{
    ahead: number; // commits in branch1 not in branch2
    behind: number; // commits in branch2 not in branch1
    commonAncestor?: string;
    divergencePoint?: Date;
    conflicts: Array<{
      memoryId: string;
      type: string;
      path: string;
      description: string;
    }>;
    mergePreview: {
      canAutoMerge: boolean;
      conflictCount: number;
      estimatedEffort: 'low' | 'medium' | 'high';
    };
  }> {
    // This would require implementation of actual branch comparison logic
    return {
      ahead: 0,
      behind: 0,
      conflicts: [],
      mergePreview: {
        canAutoMerge: true,
        conflictCount: 0,
        estimatedEffort: 'low',
      },
    };
  }

  /**
   * Generate commit network analysis
   */
  async generateCommitNetwork(): Promise<{
    nodes: Array<{
      id: string;
      type: 'author' | 'branch' | 'memory';
      label: string;
      size: number;
      connections: number;
    }>;
    edges: Array<{
      source: string;
      target: string;
      weight: number;
      type: 'authored' | 'modified' | 'branched';
    }>;
    metrics: {
      centralityScores: Record<string, number>;
      clusteringCoefficient: number;
      networkDensity: number;
    };
  }> {
    // This would analyze the commit network to identify patterns
    return {
      nodes: [],
      edges: [],
      metrics: {
        centralityScores: {},
        clusteringCoefficient: 0,
        networkDensity: 0,
      },
    };
  }

  /**
   * Generate activity heatmap
   */
  async generateActivityHeatmap(
    timeRange: { start: Date; end: Date },
    granularity: 'hour' | 'day' | 'week' = 'day',
  ): Promise<{
    data: Array<{
      timestamp: Date;
      commits: number;
      authors: number;
      memories: number;
      activity: number; // 0-1 normalized
    }>;
    summary: {
      totalCommits: number;
      activeAuthors: Set<string>;
      peakActivity: Date;
      quietestPeriod: Date;
    };
  }> {
    // This would analyze commit activity over time
    return {
      data: [],
      summary: {
        totalCommits: 0,
        activeAuthors: new Set(),
        peakActivity: new Date(),
        quietestPeriod: new Date(),
      },
    };
  }

  /**
   * Calculate layout positions for commit graph
   */
  private calculateLayout(nodes: VisualizationNode[], edges: VisualizationEdge[]): void {
    // Simple force-directed layout algorithm
    const width = 800;
    const height = 600;
    const iterations = 100;
    
    // Initialize random positions
    nodes.forEach((node, index) => {
      node.x = Math.random() * width;
      node.y = (index / nodes.length) * height; // Vertical ordering by time
    });

    // Apply forces
    for (let i = 0; i < iterations; i++) {
      // Repulsion force between all nodes
      for (let j = 0; j < nodes.length; j++) {
        for (let k = j + 1; k < nodes.length; k++) {
          const node1 = nodes[j];
          const node2 = nodes[k];
          const dx = node1.x! - node2.x!;
          const dy = node1.y! - node2.y!;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 50 / distance;
          
          node1.x! += (dx / distance) * force;
          node1.y! += (dy / distance) * force;
          node2.x! -= (dx / distance) * force;
          node2.y! -= (dy / distance) * force;
        }
      }

      // Attraction force for connected nodes
      edges.forEach(edge => {
        const source = nodes.find(n => n.id === edge.source);
        const target = nodes.find(n => n.id === edge.target);
        
        if (source && target) {
          const dx = target.x! - source.x!;
          const dy = target.y! - source.y!;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = distance * 0.01;
          
          source.x! += (dx / distance) * force;
          source.y! += (dy / distance) * force;
          target.x! -= (dx / distance) * force;
          target.y! -= (dy / distance) * force;
        }
      });

      // Keep nodes within bounds
      nodes.forEach(node => {
        node.x = Math.max(10, Math.min(width - 10, node.x!));
        node.y = Math.max(10, Math.min(height - 10, node.y!));
      });
    }
  }

  /**
   * Generate timeline from commits
   */
  private generateTimeline(commits: MemoryCommit[]): Array<{ date: Date; commits: string[] }> {
    const timelineMap = new Map<string, string[]>();
    
    commits.forEach(commit => {
      const dateKey = commit.timestamp.toISOString().split('T')[0];
      if (!timelineMap.has(dateKey)) {
        timelineMap.set(dateKey, []);
      }
      timelineMap.get(dateKey)!.push(commit.id);
    });
    
    return Array.from(timelineMap.entries())
      .map(([dateString, commitIds]) => ({
        date: new Date(dateString),
        commits: commitIds,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Get all branch names
   */
  private async getAllBranchNames(): Promise<string[]> {
    const branches = await this.versionControl.getAllBranches();
    return branches.map(b => b.name);
  }

  /**
   * Truncate commit message for display
   */
  private truncateMessage(message: string, maxLength: number = 50): string {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength - 3) + '...';
  }

  /**
   * Generate diff visualization string
   */
  private generateDiffVisualizationString(diff: MemoryDiff): string {
    switch (diff.type) {
      case 'added':
        return `+ ${JSON.stringify(diff.newValue)}`;
      case 'removed':
        return `- ${JSON.stringify(diff.oldValue)}`;
      case 'modified':
        const similarity = diff.similarity ? ` (${Math.round(diff.similarity * 100)}% similar)` : '';
        return `~ ${JSON.stringify(diff.oldValue)} → ${JSON.stringify(diff.newValue)}${similarity}`;
      default:
        return '';
    }
  }

  /**
   * Generate change heatmap
   */
  private generateChangeHeatmap(diffs: MemoryDiff[]): Array<{ path: string; intensity: number }> {
    const pathChanges = new Map<string, number>();
    
    diffs.forEach(diff => {
      const basePath = diff.path.split('.')[0] || diff.path;
      pathChanges.set(basePath, (pathChanges.get(basePath) || 0) + 1);
    });
    
    const maxChanges = Math.max(...pathChanges.values(), 1);
    
    return Array.from(pathChanges.entries()).map(([path, changes]) => ({
      path,
      intensity: changes / maxChanges,
    }));
  }
}