import { Injectable } from '@nestjs/common';
import { MemoryDiff } from '../types';
import * as diff from 'diff';

@Injectable()
export class DiffService {
  /**
   * Generate a diff between two values
   */
  generateDiff(before: any, after: any): MemoryDiff[] {
    const diffs: MemoryDiff[] = [];
    
    if (before === null && after !== null) {
      return [{
        type: 'added',
        path: 'root',
        newValue: after,
      }];
    }
    
    if (before !== null && after === null) {
      return [{
        type: 'removed',
        path: 'root',
        oldValue: before,
      }];
    }
    
    if (typeof before !== typeof after) {
      return [{
        type: 'modified',
        path: 'root',
        oldValue: before,
        newValue: after,
      }];
    }
    
    if (typeof before === 'object' && before !== null && after !== null) {
      return this.generateObjectDiff(before, after, 'root');
    }
    
    if (typeof before === 'string' && typeof after === 'string') {
      return this.generateStringDiff(before, after);
    }
    
    if (before !== after) {
      return [{
        type: 'modified',
        path: 'root',
        oldValue: before,
        newValue: after,
        similarity: this.calculateSimilarity(before, after),
      }];
    }
    
    return []; // No differences
  }

  /**
   * Generate diff for objects
   */
  private generateObjectDiff(before: any, after: any, basePath: string): MemoryDiff[] {
    const diffs: MemoryDiff[] = [];
    
    if (Array.isArray(before) && Array.isArray(after)) {
      return this.generateArrayDiff(before, after, basePath);
    }
    
    // Get all keys from both objects
    const allKeys = new Set([
      ...Object.keys(before || {}),
      ...Object.keys(after || {}),
    ]);
    
    for (const key of allKeys) {
      const path = basePath === 'root' ? key : `${basePath}.${key}`;
      const beforeValue = before?.[key];
      const afterValue = after?.[key];
      
      if (!(key in before) && key in after) {
        diffs.push({
          type: 'added',
          path,
          newValue: afterValue,
        });
      } else if (key in before && !(key in after)) {
        diffs.push({
          type: 'removed',
          path,
          oldValue: beforeValue,
        });
      } else if (beforeValue !== afterValue) {
        if (typeof beforeValue === 'object' && typeof afterValue === 'object' 
            && beforeValue !== null && afterValue !== null) {
          // Recurse for nested objects
          const nestedDiffs = this.generateObjectDiff(beforeValue, afterValue, path);
          diffs.push(...nestedDiffs);
        } else {
          diffs.push({
            type: 'modified',
            path,
            oldValue: beforeValue,
            newValue: afterValue,
            similarity: this.calculateSimilarity(beforeValue, afterValue),
          });
        }
      }
    }
    
    return diffs;
  }

  /**
   * Generate diff for arrays
   */
  private generateArrayDiff(before: any[], after: any[], basePath: string): MemoryDiff[] {
    const diffs: MemoryDiff[] = [];
    
    // Use Myers' algorithm for array diffing
    const changes = diff.diffArrays(before, after);
    
    let index = 0;
    for (const change of changes) {
      if (change.removed) {
        for (let i = 0; i < change.count!; i++) {
          diffs.push({
            type: 'removed',
            path: `${basePath}[${index + i}]`,
            oldValue: change.value[i],
          });
        }
      } else if (change.added) {
        for (let i = 0; i < change.count!; i++) {
          diffs.push({
            type: 'added',
            path: `${basePath}[${index + i}]`,
            newValue: change.value[i],
          });
        }
        index += change.count!;
      } else {
        // Unchanged elements
        index += change.count!;
      }
    }
    
    return diffs;
  }

  /**
   * Generate diff for strings
   */
  private generateStringDiff(before: string, after: string): MemoryDiff[] {
    const changes = diff.diffWords(before, after);
    const diffs: MemoryDiff[] = [];
    
    let hasChanges = false;
    const parts: string[] = [];
    
    for (const change of changes) {
      if (change.removed) {
        hasChanges = true;
        parts.push(`[-${change.value}-]`);
      } else if (change.added) {
        hasChanges = true;
        parts.push(`[+${change.value}+]`);
      } else {
        parts.push(change.value);
      }
    }
    
    if (hasChanges) {
      diffs.push({
        type: 'modified',
        path: 'text',
        oldValue: before,
        newValue: after,
        similarity: this.calculateStringSimilarity(before, after),
      });
    }
    
    return diffs;
  }

  /**
   * Calculate similarity between two values
   */
  private calculateSimilarity(a: any, b: any): number {
    if (a === b) return 1.0;
    
    if (typeof a !== typeof b) return 0.0;
    
    if (typeof a === 'string' && typeof b === 'string') {
      return this.calculateStringSimilarity(a, b);
    }
    
    if (typeof a === 'object' && a !== null && b !== null) {
      return this.calculateObjectSimilarity(a, b);
    }
    
    return 0.0;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(a: string, b: string): number {
    if (a === b) return 1.0;
    if (a.length === 0 || b.length === 0) return 0.0;
    
    const maxLength = Math.max(a.length, b.length);
    const distance = this.levenshteinDistance(a, b);
    
    return (maxLength - distance) / maxLength;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    
    for (let i = 0; i <= a.length; i++) {
      matrix[0][i] = i;
    }
    
    for (let j = 0; j <= b.length; j++) {
      matrix[j][0] = j;
    }
    
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[b.length][a.length];
  }

  /**
   * Calculate object similarity based on shared properties
   */
  private calculateObjectSimilarity(a: any, b: any): number {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    const allKeys = new Set([...aKeys, ...bKeys]);
    
    if (allKeys.size === 0) return 1.0;
    
    let matchingKeys = 0;
    let totalSimilarity = 0;
    
    for (const key of allKeys) {
      if (key in a && key in b) {
        matchingKeys++;
        totalSimilarity += this.calculateSimilarity(a[key], b[key]);
      }
    }
    
    // Weighted average of key overlap and value similarity
    const keyOverlap = matchingKeys / allKeys.size;
    const avgValueSimilarity = matchingKeys > 0 ? totalSimilarity / matchingKeys : 0;
    
    return (keyOverlap + avgValueSimilarity) / 2;
  }

  /**
   * Format diff for display
   */
  formatDiff(diffs: MemoryDiff[]): string {
    if (diffs.length === 0) {
      return 'No changes';
    }
    
    const lines: string[] = [];
    
    for (const diff of diffs) {
      switch (diff.type) {
        case 'added':
          lines.push(`+ ${diff.path}: ${JSON.stringify(diff.newValue)}`);
          break;
        case 'removed':
          lines.push(`- ${diff.path}: ${JSON.stringify(diff.oldValue)}`);
          break;
        case 'modified':
          lines.push(`~ ${diff.path}:`);
          lines.push(`  - ${JSON.stringify(diff.oldValue)}`);
          lines.push(`  + ${JSON.stringify(diff.newValue)}`);
          if (diff.similarity !== undefined) {
            lines.push(`  (similarity: ${(diff.similarity * 100).toFixed(1)}%)`);
          }
          break;
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Get diff statistics
   */
  getDiffStats(diffs: MemoryDiff[]) {
    return {
      total: diffs.length,
      added: diffs.filter(d => d.type === 'added').length,
      removed: diffs.filter(d => d.type === 'removed').length,
      modified: diffs.filter(d => d.type === 'modified').length,
      averageSimilarity: diffs
        .filter(d => d.similarity !== undefined)
        .reduce((sum, d) => sum + (d.similarity || 0), 0) / 
        diffs.filter(d => d.similarity !== undefined).length || 0,
    };
  }
}