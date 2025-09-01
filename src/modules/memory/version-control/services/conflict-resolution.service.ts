import { Injectable, Logger } from '@nestjs/common';
import { MergeConflict, MergeStrategy, ConflictResolutionStrategy } from '../types';
import { LLMService } from '../../llm/llm.service';

@Injectable()
export class ConflictResolutionService {
  private readonly logger = new Logger(ConflictResolutionService.name);

  constructor(private readonly llmService: LLMService) {}

  /**
   * Resolve a merge conflict using the specified strategy
   */
  async resolveConflict(
    conflict: MergeConflict,
    strategy: MergeStrategy,
  ): Promise<MergeConflict> {
    this.logger.log(`Resolving conflict for memory ${conflict.memoryId} using strategy ${strategy}`);

    try {
      switch (strategy) {
        case MergeStrategy.AUTO:
          return await this.autoResolve(conflict);
        case MergeStrategy.LLM_ASSISTED:
          return await this.llmAssistedResolve(conflict);
        case MergeStrategy.THREE_WAY:
          return await this.threeWayMerge(conflict);
        case MergeStrategy.OURS:
          return this.takeOurs(conflict);
        case MergeStrategy.THEIRS:
          return this.takeTheirs(conflict);
        case MergeStrategy.MANUAL:
          // Manual resolution requires human intervention
          return conflict;
        default:
          throw new Error(`Unknown resolution strategy: ${strategy}`);
      }
    } catch (error) {
      this.logger.error(`Failed to resolve conflict: ${error.message}`, error.stack);
      return conflict; // Return unresolved conflict
    }
  }

  /**
   * Automatically resolve conflict using heuristics
   */
  private async autoResolve(conflict: MergeConflict): Promise<MergeConflict> {
    // Determine resolution strategy based on conflict type
    switch (conflict.conflictType) {
      case 'semantic':
        return await this.resolveSemanticConflict(conflict);
      case 'structural':
        return await this.resolveStructuralConflict(conflict);
      case 'temporal':
        return await this.resolveTemporalConflict(conflict);
      default:
        return conflict; // Can't auto-resolve unknown types
    }
  }

  /**
   * Resolve semantic conflicts using LLM analysis
   */
  private async resolveSemanticConflict(conflict: MergeConflict): Promise<MergeConflict> {
    const prompt = `
      Resolve this semantic conflict between two memory updates:

      Memory ID: ${conflict.memoryId}
      Conflict Type: ${conflict.conflictType}
      
      Source Value (${conflict.sourceBranch}):
      ${JSON.stringify(conflict.conflictDetails.sourceValue, null, 2)}
      
      Target Value (${conflict.targetBranch}):
      ${JSON.stringify(conflict.conflictDetails.targetValue, null, 2)}
      
      Base Value (if available):
      ${conflict.conflictDetails.baseValue ? JSON.stringify(conflict.conflictDetails.baseValue, null, 2) : 'None'}

      Please provide a resolution that:
      1. Preserves the intent of both changes where possible
      2. Creates a coherent, non-contradictory result
      3. Maintains semantic consistency
      4. Explains the reasoning clearly

      Response format:
      {
        "canResolve": boolean,
        "resolvedValue": any,
        "rationale": "detailed explanation of the resolution",
        "confidence": number (0-1),
        "strategy": "semantic_merge" | "temporal_precedence" | "confidence_based"
      }
    `;

    const resolution = await this.llmService.analyze(prompt);

    if (resolution.canResolve && resolution.confidence >= 0.7) {
      return {
        ...conflict,
        resolution: {
          strategy: 'llm',
          resolvedValue: resolution.resolvedValue,
          rationale: resolution.rationale,
          confidence: resolution.confidence,
        },
      };
    }

    return conflict; // Can't resolve with sufficient confidence
  }

  /**
   * Resolve structural conflicts
   */
  private async resolveStructuralConflict(conflict: MergeConflict): Promise<MergeConflict> {
    // Analyze structural changes
    const sourceStructure = this.analyzeStructure(conflict.conflictDetails.sourceValue);
    const targetStructure = this.analyzeStructure(conflict.conflictDetails.targetValue);
    
    // Try to merge structures
    const mergedStructure = this.mergeStructures(sourceStructure, targetStructure);
    
    if (mergedStructure) {
      return {
        ...conflict,
        resolution: {
          strategy: 'automatic',
          resolvedValue: mergedStructure,
          rationale: 'Automatically merged non-conflicting structural changes',
          confidence: 0.8,
        },
      };
    }

    return conflict; // Can't auto-resolve structural conflicts
  }

  /**
   * Resolve temporal conflicts (prefer more recent)
   */
  private async resolveTemporalConflict(conflict: MergeConflict): Promise<MergeConflict> {
    // For temporal conflicts, we typically prefer the more recent change
    // This assumes the conflict includes temporal information
    
    return {
      ...conflict,
      resolution: {
        strategy: 'automatic',
        resolvedValue: conflict.conflictDetails.targetValue, // Assume target is more recent
        rationale: 'Resolved temporal conflict by preferring more recent change',
        confidence: 0.9,
      },
    };
  }

  /**
   * LLM-assisted conflict resolution
   */
  private async llmAssistedResolve(conflict: MergeConflict): Promise<MergeConflict> {
    const prompt = `
      You are an expert at resolving memory conflicts in a cognitive AI system.
      Analyze this conflict and provide a resolution:

      Conflict Details:
      - Memory ID: ${conflict.memoryId}
      - Type: ${conflict.conflictType}
      - Field: ${conflict.conflictDetails.field}
      
      Source Branch (${conflict.sourceBranch}):
      ${JSON.stringify(conflict.conflictDetails.sourceValue, null, 2)}
      
      Target Branch (${conflict.targetBranch}):
      ${JSON.stringify(conflict.conflictDetails.targetValue, null, 2)}
      
      Base Value:
      ${conflict.conflictDetails.baseValue ? JSON.stringify(conflict.conflictDetails.baseValue, null, 2) : 'None'}

      Consider:
      1. Semantic compatibility of the changes
      2. Preservation of information from both sources
      3. Consistency with the overall knowledge graph
      4. User intent behind each change

      Provide a resolution that synthesizes the best aspects of both approaches.
      
      Response format:
      {
        "resolution": {
          "resolvedValue": any,
          "rationale": "detailed explanation",
          "confidence": number (0-1),
          "strategy": "llm_synthesis"
        }
      }
    `;

    const response = await this.llmService.analyze(prompt);
    
    return {
      ...conflict,
      resolution: {
        strategy: 'llm',
        resolvedValue: response.resolution.resolvedValue,
        rationale: response.resolution.rationale,
        confidence: response.resolution.confidence,
      },
    };
  }

  /**
   * Three-way merge resolution
   */
  private async threeWayMerge(conflict: MergeConflict): Promise<MergeConflict> {
    const { sourceValue, targetValue, baseValue } = conflict.conflictDetails;
    
    if (!baseValue) {
      // No common base, fall back to LLM resolution
      return await this.llmAssistedResolve(conflict);
    }

    // Perform three-way merge logic
    const merged = this.performThreeWayMerge(baseValue, sourceValue, targetValue);
    
    if (merged.success) {
      return {
        ...conflict,
        resolution: {
          strategy: 'automatic',
          resolvedValue: merged.result,
          rationale: 'Successfully performed three-way merge',
          confidence: merged.confidence,
        },
      };
    }

    return conflict; // Fall back to manual resolution
  }

  /**
   * Take "ours" resolution (source branch wins)
   */
  private takeOurs(conflict: MergeConflict): MergeConflict {
    return {
      ...conflict,
      resolution: {
        strategy: 'manual',
        resolvedValue: conflict.conflictDetails.sourceValue,
        rationale: 'Resolved by taking source branch version',
        confidence: 1.0,
      },
    };
  }

  /**
   * Take "theirs" resolution (target branch wins)
   */
  private takeTheirs(conflict: MergeConflict): MergeConflict {
    return {
      ...conflict,
      resolution: {
        strategy: 'manual',
        resolvedValue: conflict.conflictDetails.targetValue,
        rationale: 'Resolved by taking target branch version',
        confidence: 1.0,
      },
    };
  }

  /**
   * Analyze structure of a value
   */
  private analyzeStructure(value: any): any {
    if (typeof value === 'object' && value !== null) {
      const structure = {
        type: Array.isArray(value) ? 'array' : 'object',
        keys: Array.isArray(value) ? value.length : Object.keys(value),
        depth: this.calculateDepth(value),
      };
      return structure;
    }
    return { type: typeof value, value };
  }

  /**
   * Calculate object depth
   */
  private calculateDepth(obj: any): number {
    if (typeof obj !== 'object' || obj === null) return 0;
    
    let maxDepth = 0;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const depth = 1 + this.calculateDepth(obj[key]);
        maxDepth = Math.max(maxDepth, depth);
      }
    }
    return maxDepth;
  }

  /**
   * Merge two structures
   */
  private mergeStructures(source: any, target: any): any | null {
    // Simple structural merge logic
    if (source.type !== target.type) return null;
    
    if (source.type === 'object') {
      const merged = { ...source.value, ...target.value };
      return merged;
    }
    
    if (source.type === 'array') {
      // For arrays, concatenate and remove duplicates
      const merged = [...new Set([...source.value, ...target.value])];
      return merged;
    }
    
    return null; // Can't merge primitive types automatically
  }

  /**
   * Perform three-way merge
   */
  private performThreeWayMerge(
    base: any,
    source: any,
    target: any,
  ): { success: boolean; result?: any; confidence: number } {
    // Simplified three-way merge logic
    if (JSON.stringify(source) === JSON.stringify(target)) {
      // No conflict - both branches made same change
      return { success: true, result: source, confidence: 1.0 };
    }
    
    if (JSON.stringify(base) === JSON.stringify(source)) {
      // Source unchanged, target changed
      return { success: true, result: target, confidence: 0.9 };
    }
    
    if (JSON.stringify(base) === JSON.stringify(target)) {
      // Target unchanged, source changed
      return { success: true, result: source, confidence: 0.9 };
    }
    
    // Both changed differently - need manual resolution
    return { success: false, confidence: 0.0 };
  }
}