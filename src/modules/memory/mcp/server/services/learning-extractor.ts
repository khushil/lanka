/**
 * Learning Extractor Service
 * Extracts learning opportunities from tool usage and operations
 */

import winston from 'winston';
import { MemoryService } from './memory';
import {
  MCPToolResult,
  MemoryStoreParams,
} from '../../types';

interface ToolCallData {
  server: string;
  tool: string;
  arguments: any;
  result: MCPToolResult;
  duration: number;
  context?: string;
  workspace?: string;
}

interface LearningPattern {
  type: 'success_pattern' | 'error_pattern' | 'performance_insight' | 'usage_pattern';
  confidence: number;
  description: string;
  evidence: any;
  actionable: boolean;
}

export class LearningExtractor {
  private memoryService: MemoryService;
  private logger: winston.Logger;
  private extractionRules: Map<string, (data: ToolCallData) => Promise<LearningPattern[]>> = new Map();

  constructor(memoryService: MemoryService) {
    this.memoryService = memoryService;
    this.setupLogger();
    this.initializeExtractionRules();
  }

  private setupLogger(): void {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'learning-extractor' },
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

  private initializeExtractionRules(): void {
    // File operation patterns
    this.extractionRules.set('file', this.extractFileOperationLearning.bind(this));
    
    // Git operation patterns
    this.extractionRules.set('git', this.extractGitOperationLearning.bind(this));
    
    // Build/compilation patterns
    this.extractionRules.set('build', this.extractBuildOperationLearning.bind(this));
    
    // Testing patterns
    this.extractionRules.set('test', this.extractTestOperationLearning.bind(this));
    
    // Code analysis patterns
    this.extractionRules.set('analyze', this.extractAnalysisLearning.bind(this));
    
    // Performance patterns
    this.extractionRules.set('performance', this.extractPerformanceLearning.bind(this));
    
    // Error handling patterns
    this.extractionRules.set('error', this.extractErrorLearning.bind(this));
  }

  public async extractFromToolCall(data: ToolCallData): Promise<void> {
    try {
      this.logger.debug(`Extracting learning from ${data.server}:${data.tool}`);

      // Determine tool category for pattern matching
      const toolCategory = this.categorizeTool(data.tool);
      
      // Extract patterns using relevant rules
      const patterns = await this.extractPatterns(data, toolCategory);
      
      // Filter high-confidence, actionable patterns
      const valuablePatterns = patterns.filter(p => 
        p.confidence > 0.6 && p.actionable
      );

      if (valuablePatterns.length === 0) {
        this.logger.debug(`No valuable patterns found for ${data.server}:${data.tool}`);
        return;
      }

      // Convert patterns to memories
      const memories = await this.patternsToMemories(valuablePatterns, data);
      
      // Store memories
      for (const memory of memories) {
        try {
          await this.memoryService.storeMemory(memory);
          this.logger.debug(`Stored learning memory: ${memory.content.substring(0, 50)}...`);
        } catch (error) {
          this.logger.warn('Failed to store learning memory:', error);
        }
      }

      this.logger.info(`Extracted ${memories.length} learning memories from ${data.server}:${data.tool}`);

    } catch (error) {
      this.logger.error('Learning extraction failed:', error);
    }
  }

  private categorizeTool(toolName: string): string {
    const toolLower = toolName.toLowerCase();
    
    if (toolLower.includes('file') || toolLower.includes('read') || toolLower.includes('write')) {
      return 'file';
    }
    if (toolLower.includes('git') || toolLower.includes('commit') || toolLower.includes('branch')) {
      return 'git';
    }
    if (toolLower.includes('build') || toolLower.includes('compile') || toolLower.includes('bundle')) {
      return 'build';
    }
    if (toolLower.includes('test') || toolLower.includes('spec') || toolLower.includes('jest')) {
      return 'test';
    }
    if (toolLower.includes('analyze') || toolLower.includes('lint') || toolLower.includes('check')) {
      return 'analyze';
    }
    if (toolLower.includes('perf') || toolLower.includes('benchmark') || toolLower.includes('profile')) {
      return 'performance';
    }
    if (toolLower.includes('error') || toolLower.includes('debug') || toolLower.includes('trace')) {
      return 'error';
    }

    return 'generic';
  }

  private async extractPatterns(data: ToolCallData, category: string): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];

    // Apply category-specific extraction rules
    const extractor = this.extractionRules.get(category);
    if (extractor) {
      const categoryPatterns = await extractor(data);
      patterns.push(...categoryPatterns);
    }

    // Apply generic patterns
    const genericPatterns = await this.extractGenericPatterns(data);
    patterns.push(...genericPatterns);

    return patterns;
  }

  // Category-specific extraction methods
  private async extractFileOperationLearning(data: ToolCallData): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];

    // Analyze file operation success/failure
    if (!data.result.isError) {
      // Successful file operations
      if (data.duration < 100) {
        patterns.push({
          type: 'performance_insight',
          confidence: 0.8,
          description: `Fast file operation: ${data.tool} completed in ${data.duration}ms`,
          evidence: {
            tool: data.tool,
            duration: data.duration,
            arguments: data.arguments,
          },
          actionable: true,
        });
      }

      // File path patterns
      if (data.arguments.path || data.arguments.filePath) {
        const path = data.arguments.path || data.arguments.filePath;
        patterns.push({
          type: 'usage_pattern',
          confidence: 0.7,
          description: `Successful file access pattern: ${path}`,
          evidence: {
            path,
            operation: data.tool,
            success: true,
          },
          actionable: true,
        });
      }
    } else {
      // Failed file operations
      patterns.push({
        type: 'error_pattern',
        confidence: 0.9,
        description: `File operation failed: ${data.tool} - ${this.extractErrorMessage(data.result)}`,
        evidence: {
          tool: data.tool,
          arguments: data.arguments,
          error: data.result.content,
        },
        actionable: true,
      });
    }

    return patterns;
  }

  private async extractGitOperationLearning(data: ToolCallData): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];

    if (!data.result.isError) {
      // Successful git operations
      patterns.push({
        type: 'success_pattern',
        confidence: 0.8,
        description: `Git operation succeeded: ${data.tool}`,
        evidence: {
          tool: data.tool,
          arguments: data.arguments,
          duration: data.duration,
        },
        actionable: true,
      });

      // Analyze commit patterns
      if (data.tool.includes('commit') && data.arguments.message) {
        patterns.push({
          type: 'usage_pattern',
          confidence: 0.7,
          description: `Commit message pattern: "${data.arguments.message}"`,
          evidence: {
            messageLength: data.arguments.message.length,
            hasConventionalFormat: this.isConventionalCommit(data.arguments.message),
          },
          actionable: true,
        });
      }
    }

    return patterns;
  }

  private async extractBuildOperationLearning(data: ToolCallData): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];

    if (!data.result.isError) {
      // Successful builds
      if (data.duration > 0) {
        const buildSpeed = data.duration < 10000 ? 'fast' : data.duration < 30000 ? 'moderate' : 'slow';
        
        patterns.push({
          type: 'performance_insight',
          confidence: 0.8,
          description: `Build performance: ${buildSpeed} (${data.duration}ms)`,
          evidence: {
            tool: data.tool,
            duration: data.duration,
            category: buildSpeed,
          },
          actionable: true,
        });
      }
    } else {
      // Build failures
      const errorContent = this.extractErrorMessage(data.result);
      patterns.push({
        type: 'error_pattern',
        confidence: 0.9,
        description: `Build failed: ${errorContent}`,
        evidence: {
          tool: data.tool,
          error: errorContent,
          arguments: data.arguments,
        },
        actionable: true,
      });
    }

    return patterns;
  }

  private async extractTestOperationLearning(data: ToolCallData): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];

    if (!data.result.isError) {
      // Analyze test results
      const resultText = this.extractContentText(data.result);
      
      // Look for test metrics in the output
      const testMetrics = this.parseTestMetrics(resultText);
      if (testMetrics) {
        patterns.push({
          type: 'success_pattern',
          confidence: 0.9,
          description: `Test execution: ${testMetrics.passed}/${testMetrics.total} tests passed`,
          evidence: testMetrics,
          actionable: true,
        });
      }
    }

    return patterns;
  }

  private async extractAnalysisLearning(data: ToolCallData): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];

    // Code analysis tools often provide insights
    const resultText = this.extractContentText(data.result);
    
    // Look for issues or warnings
    const issueCount = this.countIssues(resultText);
    if (issueCount >= 0) {
      patterns.push({
        type: 'usage_pattern',
        confidence: 0.8,
        description: `Code analysis found ${issueCount} issues`,
        evidence: {
          tool: data.tool,
          issueCount,
          codeQuality: issueCount === 0 ? 'excellent' : issueCount < 5 ? 'good' : 'needs improvement',
        },
        actionable: true,
      });
    }

    return patterns;
  }

  private async extractPerformanceLearning(data: ToolCallData): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];

    // Any operation taking longer than 5 seconds is worth noting
    if (data.duration > 5000) {
      patterns.push({
        type: 'performance_insight',
        confidence: 0.8,
        description: `Slow operation: ${data.tool} took ${data.duration}ms`,
        evidence: {
          tool: data.tool,
          server: data.server,
          duration: data.duration,
          arguments: data.arguments,
        },
        actionable: true,
      });
    }

    return patterns;
  }

  private async extractErrorLearning(data: ToolCallData): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];

    if (data.result.isError) {
      const errorMessage = this.extractErrorMessage(data.result);
      
      patterns.push({
        type: 'error_pattern',
        confidence: 0.9,
        description: `Error pattern: ${data.tool} failed with: ${errorMessage}`,
        evidence: {
          tool: data.tool,
          server: data.server,
          error: errorMessage,
          arguments: data.arguments,
          context: data.context,
        },
        actionable: true,
      });
    }

    return patterns;
  }

  private async extractGenericPatterns(data: ToolCallData): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];

    // Generic usage pattern
    patterns.push({
      type: 'usage_pattern',
      confidence: 0.6,
      description: `Tool usage: ${data.server}:${data.tool}`,
      evidence: {
        server: data.server,
        tool: data.tool,
        success: !data.result.isError,
        duration: data.duration,
        hasArguments: Object.keys(data.arguments || {}).length > 0,
      },
      actionable: false, // Generic patterns are less actionable
    });

    return patterns;
  }

  private async patternsToMemories(patterns: LearningPattern[], data: ToolCallData): Promise<MemoryStoreParams[]> {
    return patterns.map(pattern => {
      // Determine memory type based on pattern type
      let memoryType: 'system1' | 'system2' | 'workspace';
      
      if (pattern.type === 'success_pattern' || pattern.type === 'usage_pattern') {
        memoryType = 'system1'; // Quick recognition patterns
      } else if (pattern.type === 'error_pattern' || pattern.type === 'performance_insight') {
        memoryType = 'system2'; // Deliberate reasoning patterns
      } else {
        memoryType = 'workspace'; // Context-specific patterns
      }

      return {
        content: this.formatLearningMemory(pattern, data),
        type: memoryType,
        workspace: data.workspace || 'default',
        metadata: {
          tags: this.generateTags(pattern, data),
          confidence: pattern.confidence,
          source: 'learning-extractor',
          context: `Tool usage: ${data.server}:${data.tool}`,
          extractionData: {
            server: data.server,
            tool: data.tool,
            patternType: pattern.type,
            evidence: pattern.evidence,
          },
        },
      };
    });
  }

  private formatLearningMemory(pattern: LearningPattern, data: ToolCallData): string {
    const sections = [
      `## Learning: ${pattern.description}`,
      '',
      `**Context:** ${data.server}:${data.tool}`,
      `**Pattern Type:** ${pattern.type}`,
      `**Confidence:** ${(pattern.confidence * 100).toFixed(0)}%`,
      `**Duration:** ${data.duration}ms`,
      '',
    ];

    if (pattern.evidence) {
      sections.push('**Evidence:**');
      sections.push('```json');
      sections.push(JSON.stringify(pattern.evidence, null, 2));
      sections.push('```');
      sections.push('');
    }

    if (pattern.actionable) {
      sections.push('**Actionable:** This pattern can inform future decisions');
    }

    if (data.context) {
      sections.push('');
      sections.push(`**Additional Context:** ${data.context}`);
    }

    return sections.join('\n');
  }

  private generateTags(pattern: LearningPattern, data: ToolCallData): string[] {
    const tags = [
      'learning',
      pattern.type.replace('_', '-'),
      data.server,
      data.tool,
    ];

    // Add category-specific tags
    const category = this.categorizeTool(data.tool);
    if (category !== 'generic') {
      tags.push(category);
    }

    // Add performance tags
    if (data.duration < 1000) {
      tags.push('fast');
    } else if (data.duration > 5000) {
      tags.push('slow');
    }

    // Add error tags
    if (data.result.isError) {
      tags.push('error');
    } else {
      tags.push('success');
    }

    return tags;
  }

  // Utility methods
  private extractContentText(result: MCPToolResult): string {
    return result.content
      .filter(c => c.type === 'text')
      .map(c => (c as any).text)
      .join('\n');
  }

  private extractErrorMessage(result: MCPToolResult): string {
    const text = this.extractContentText(result);
    // Try to extract meaningful error message
    const lines = text.split('\n');
    const errorLine = lines.find(line => 
      line.toLowerCase().includes('error') || 
      line.toLowerCase().includes('failed') ||
      line.toLowerCase().includes('exception')
    );
    
    return errorLine || text.substring(0, 200);
  }

  private isConventionalCommit(message: string): boolean {
    const conventionalPattern = /^(feat|fix|docs|style|refactor|perf|test|chore)(\(.+\))?: .{1,50}/;
    return conventionalPattern.test(message);
  }

  private parseTestMetrics(resultText: string): { passed: number; total: number; duration?: number } | null {
    // Try to parse common test output formats
    const patterns = [
      /(\d+) passing/,
      /Tests:\s*(\d+) passed.*?(\d+) total/,
      /(\d+)\/(\d+) tests passed/,
    ];

    for (const pattern of patterns) {
      const match = resultText.match(pattern);
      if (match) {
        return {
          passed: parseInt(match[1]),
          total: parseInt(match[2] || match[1]),
        };
      }
    }

    return null;
  }

  private countIssues(resultText: string): number {
    const issuePatterns = [
      /(\d+) error/gi,
      /(\d+) warning/gi,
      /(\d+) problem/gi,
    ];

    let totalIssues = 0;
    for (const pattern of issuePatterns) {
      const matches = resultText.match(pattern);
      if (matches) {
        for (const match of matches) {
          const count = parseInt(match.match(/\d+/)![0]);
          totalIssues += count;
        }
      }
    }

    return totalIssues;
  }
}