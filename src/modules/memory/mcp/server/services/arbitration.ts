/**
 * Memory Arbitration Service
 * Handles intelligent decision-making for memory storage operations
 */

import winston from 'winston';
import {
  MemoryStoreParams,
  MCPServerContext,
} from '../../types';

interface ArbitrationResult {
  action: 'create' | 'update' | 'merge' | 'skip';
  confidence: number;
  reasoning: string;
  existingMemoryId?: string;
  similarMemories?: Array<{
    id: string;
    similarity: number;
    content: string;
  }>;
}

interface SimilarityAnalysis {
  id: string;
  similarity: number;
  content: string;
  metadata: any;
}

export class ArbitrationService {
  private logger: winston.Logger;

  constructor() {
    this.setupLogger();
  }

  private setupLogger(): void {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'arbitration-service' },
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

  public async arbitrate(
    params: MemoryStoreParams,
    context: MCPServerContext
  ): Promise<ArbitrationResult> {
    try {
      this.logger.info(`Starting arbitration for memory storage`, {
        type: params.type,
        workspace: params.workspace,
        contentLength: params.content.length
      });

      // Step 1: Find similar memories
      const similarMemories = await this.findSimilarMemories(params);
      
      // Step 2: Analyze similarity scores
      const analysis = await this.analyzeSimilarity(params, similarMemories);
      
      // Step 3: Make arbitration decision
      const decision = await this.makeDecision(params, analysis, context);
      
      this.logger.info(`Arbitration decision made`, {
        action: decision.action,
        confidence: decision.confidence,
        similarMemoriesFound: similarMemories.length
      });

      return decision;

    } catch (error) {
      this.logger.error('Arbitration failed:', error);
      
      // Fallback to creating new memory
      return {
        action: 'create',
        confidence: 0.5,
        reasoning: 'Arbitration failed, defaulting to create new memory',
      };
    }
  }

  private async findSimilarMemories(params: MemoryStoreParams): Promise<SimilarityAnalysis[]> {
    // TODO: Implement actual similarity search using vector embeddings
    // For now, return mock similar memories based on content similarity
    
    const mockSimilarMemories: SimilarityAnalysis[] = [];
    
    // Simulate finding similar memories based on content keywords
    const keywords = this.extractKeywords(params.content);
    
    if (keywords.length > 0) {
      // Mock some similar memories
      mockSimilarMemories.push({
        id: 'mock-memory-1',
        similarity: 0.87,
        content: `Similar content containing keywords: ${keywords.slice(0, 3).join(', ')}`,
        metadata: { 
          type: params.type,
          confidence: 0.85,
          quality: 0.9
        }
      });

      if (keywords.length > 3) {
        mockSimilarMemories.push({
          id: 'mock-memory-2',
          similarity: 0.73,
          content: `Another similar memory with overlapping concepts`,
          metadata: { 
            type: params.type,
            confidence: 0.75,
            quality: 0.8
          }
        });
      }
    }

    return mockSimilarMemories.sort((a, b) => b.similarity - a.similarity);
  }

  private extractKeywords(content: string): string[] {
    // Simple keyword extraction - in production, use proper NLP
    return content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word))
      .slice(0, 10); // Top 10 keywords
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
      'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
      'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy',
      'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'that', 'with',
      'have', 'this', 'will', 'your', 'from', 'they', 'know', 'want', 'been',
      'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just',
      'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them',
      'well', 'were'
    ]);
    
    return stopWords.has(word);
  }

  private async analyzeSimilarity(
    params: MemoryStoreParams,
    similarMemories: SimilarityAnalysis[]
  ): Promise<{
    maxSimilarity: number;
    bestMatch?: SimilarityAnalysis;
    threshold: number;
    recommendation: string;
  }> {
    const threshold = params.arbitration?.threshold || 0.85;
    const bestMatch = similarMemories.length > 0 ? similarMemories[0] : undefined;
    const maxSimilarity = bestMatch ? bestMatch.similarity : 0;

    let recommendation = 'create';
    
    if (maxSimilarity > threshold) {
      if (maxSimilarity > 0.95) {
        recommendation = 'skip'; // Nearly identical content
      } else if (maxSimilarity > 0.90) {
        recommendation = 'update'; // Very similar, update existing
      } else {
        recommendation = 'merge'; // Similar enough to merge
      }
    }

    return {
      maxSimilarity,
      bestMatch,
      threshold,
      recommendation
    };
  }

  private async makeDecision(
    params: MemoryStoreParams,
    analysis: any,
    context: MCPServerContext
  ): Promise<ArbitrationResult> {
    const { maxSimilarity, bestMatch, threshold, recommendation } = analysis;
    
    // Apply business rules and context
    let finalDecision = recommendation;
    let confidence = this.calculateConfidence(params, analysis, context);
    let reasoning = this.generateReasoning(params, analysis, finalDecision);

    // Override based on context and business rules
    if (params.arbitration?.allowUpdate === false && finalDecision === 'update') {
      finalDecision = 'create';
      reasoning += ' (Update not allowed by parameters)';
    }

    // Quality-based decisions
    if (bestMatch && params.metadata?.confidence) {
      const newConfidence = params.metadata.confidence;
      const existingConfidence = bestMatch.metadata.confidence;
      
      if (newConfidence > existingConfidence + 0.2 && finalDecision === 'skip') {
        finalDecision = 'update';
        reasoning += ' (New memory has significantly higher confidence)';
      }
    }

    // Workspace-specific rules
    if (params.type === 'workspace' && params.workspace) {
      if (finalDecision === 'merge' && bestMatch?.metadata.type !== 'workspace') {
        finalDecision = 'create';
        reasoning += ' (Workspace memories should not merge with non-workspace memories)';
      }
    }

    // System-1 vs System-2 rules
    if (params.type === 'system1' && bestMatch?.metadata.type === 'system2') {
      // Don't merge different memory types
      if (finalDecision === 'merge') {
        finalDecision = 'create';
        reasoning += ' (Different memory types should not merge)';
      }
    }

    return {
      action: finalDecision as 'create' | 'update' | 'merge' | 'skip',
      confidence,
      reasoning,
      existingMemoryId: bestMatch?.id,
      similarMemories: analysis.maxSimilarity > 0.5 ? [{
        id: bestMatch?.id || '',
        similarity: maxSimilarity,
        content: bestMatch?.content || ''
      }] : undefined
    };
  }

  private calculateConfidence(
    params: MemoryStoreParams,
    analysis: any,
    context: MCPServerContext
  ): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on similarity strength
    if (analysis.maxSimilarity > 0.9) {
      confidence += 0.3;
    } else if (analysis.maxSimilarity > 0.8) {
      confidence += 0.2;
    } else if (analysis.maxSimilarity > 0.7) {
      confidence += 0.1;
    }

    // Increase confidence based on content quality indicators
    if (params.content.length > 200) confidence += 0.05;
    if (params.metadata?.tags && params.metadata.tags.length > 0) confidence += 0.05;
    if (params.metadata?.source) confidence += 0.05;
    if (params.metadata?.confidence && params.metadata.confidence > 0.8) confidence += 0.1;

    // Decrease confidence for edge cases
    if (analysis.maxSimilarity > 0.75 && analysis.maxSimilarity < 0.85) {
      confidence -= 0.1; // Ambiguous similarity range
    }

    // Context-based adjustments
    if (context.user?.permissions.includes('memory:expert')) {
      confidence += 0.05; // Expert users get slightly higher confidence
    }

    return Math.min(Math.max(confidence, 0.1), 0.95); // Clamp between 0.1 and 0.95
  }

  private generateReasoning(
    params: MemoryStoreParams,
    analysis: any,
    decision: string
  ): string {
    const { maxSimilarity, bestMatch, threshold } = analysis;
    
    let reasoning = '';

    switch (decision) {
      case 'create':
        if (maxSimilarity < threshold) {
          reasoning = `No similar memories found above threshold (${threshold}). Creating new memory.`;
        } else {
          reasoning = `Similar memory found (${maxSimilarity.toFixed(2)}) but business rules require creating new memory.`;
        }
        break;

      case 'update':
        reasoning = `High similarity (${maxSimilarity.toFixed(2)}) with existing memory ${bestMatch?.id}. Updating existing memory with new information.`;
        break;

      case 'merge':
        reasoning = `Moderate similarity (${maxSimilarity.toFixed(2)}) with existing memory ${bestMatch?.id}. Merging memories to combine insights.`;
        break;

      case 'skip':
        reasoning = `Very high similarity (${maxSimilarity.toFixed(2)}) with existing memory ${bestMatch?.id}. Content appears to be duplicate, skipping storage.`;
        break;

      default:
        reasoning = 'Unknown arbitration decision';
    }

    // Add additional context
    if (params.type) {
      reasoning += ` Memory type: ${params.type}.`;
    }

    if (params.workspace) {
      reasoning += ` Workspace: ${params.workspace}.`;
    }

    return reasoning;
  }

  // Public method to validate arbitration parameters
  public validateArbitrationParams(params: MemoryStoreParams): string[] {
    const errors: string[] = [];

    if (params.arbitration?.threshold) {
      const threshold = params.arbitration.threshold;
      if (threshold < 0 || threshold > 1) {
        errors.push('Arbitration threshold must be between 0 and 1');
      }
    }

    if (params.type === 'workspace' && !params.workspace) {
      errors.push('Workspace memory type requires workspace parameter');
    }

    if (params.metadata?.confidence) {
      const confidence = params.metadata.confidence;
      if (confidence < 0 || confidence > 1) {
        errors.push('Confidence must be between 0 and 1');
      }
    }

    return errors;
  }

  // Method to get arbitration statistics
  public async getArbitrationStats(): Promise<{
    totalArbitrations: number;
    actionCounts: Record<string, number>;
    averageConfidence: number;
    averageProcessingTime: number;
  }> {
    // TODO: Implement actual statistics tracking
    return {
      totalArbitrations: 0,
      actionCounts: {
        create: 0,
        update: 0,
        merge: 0,
        skip: 0
      },
      averageConfidence: 0,
      averageProcessingTime: 0
    };
  }
}