/**
 * LANKA Memory System - Evolution Engine Service
 * Continuously improves memory quality through usage analysis and contradiction resolution
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  Memory,
  MemoryRelationship,
  EvolutionHistory,
  MergeStrategy,
  MemorySystemConfig,
} from '../types/memory.types';

interface UsageAnalysis {
  accessFrequency: number;
  recentActivity: number;
  successRate: number;
  contextDiversity: number;
  strengthTrend: 'increasing' | 'stable' | 'decreasing';
  recommendations: string[];
}

interface ContradictionDetection {
  conflictingMemoryId: string;
  conflictType: 'semantic' | 'factual' | 'temporal';
  severity: number; // 0-1
  evidence: string[];
  suggestedResolution: 'merge' | 'deprecate' | 'manual_review';
}

interface MergeOpportunity {
  candidateMemoryId: string;
  similarity: number;
  mergeStrategy: MergeStrategy;
  expectedBenefit: number;
  riskAssessment: number;
}

@Injectable()
export class EvolutionEngineService {
  private readonly logger = new Logger(EvolutionEngineService.name);

  constructor(private readonly config: MemorySystemConfig) {
    this.initializeEvolutionEngine();
  }

  /**
   * Analyze usage patterns to identify evolution opportunities
   */
  async analyzeUsagePatterns(memory: Memory): Promise<UsageAnalysis> {
    this.logger.debug(`Analyzing usage patterns for memory ${memory.id}`);

    try {
      const accessFrequency = this.calculateAccessFrequency(memory);
      const recentActivity = this.calculateRecentActivity(memory);
      const successRate = await this.calculateSuccessRate(memory);
      const contextDiversity = await this.calculateContextDiversity(memory);
      const strengthTrend = this.analyzeStrengthTrend(memory);

      const recommendations = this.generateUsageRecommendations({
        accessFrequency,
        recentActivity,
        successRate,
        contextDiversity,
        strengthTrend,
      });

      return {
        accessFrequency,
        recentActivity,
        successRate,
        contextDiversity,
        strengthTrend,
        recommendations,
      };
    } catch (error) {
      this.logger.error(`Usage pattern analysis failed for ${memory.id}: ${error.message}`);
      throw new Error(`Usage analysis failed: ${error.message}`);
    }
  }

  /**
   * Detect contradictions between memories
   */
  async detectContradictions(memory: Memory): Promise<ContradictionDetection[]> {
    this.logger.debug(`Detecting contradictions for memory ${memory.id}`);

    try {
      const contradictions: ContradictionDetection[] = [];

      // Find potentially conflicting memories
      const candidates = await this.findConflictCandidates(memory);

      for (const candidate of candidates) {
        const contradiction = await this.analyzeContradiction(memory, candidate);
        if (contradiction.severity > 0.3) {
          contradictions.push(contradiction);
        }
      }

      this.logger.debug(`Found ${contradictions.length} contradictions for memory ${memory.id}`);
      return contradictions;
    } catch (error) {
      this.logger.error(`Contradiction detection failed for ${memory.id}: ${error.message}`);
      return [];
    }
  }

  /**
   * Find opportunities to merge similar memories
   */
  async findMergeOpportunities(memory: Memory): Promise<MergeOpportunity[]> {
    this.logger.debug(`Finding merge opportunities for memory ${memory.id}`);

    try {
      const opportunities: MergeOpportunity[] = [];
      
      // Find similar memories that could benefit from merging
      const candidates = await this.findMergeCandidates(memory);

      for (const candidate of candidates) {
        const opportunity = await this.evaluateMergeOpportunity(memory, candidate);
        if (opportunity.expectedBenefit > 0.6 && opportunity.riskAssessment < 0.3) {
          opportunities.push(opportunity);
        }
      }

      this.logger.debug(`Found ${opportunities.length} merge opportunities for memory ${memory.id}`);
      return opportunities;
    } catch (error) {
      this.logger.error(`Merge opportunity detection failed for ${memory.id}: ${error.message}`);
      return [];
    }
  }

  /**
   * Resolve contradictions between memories
   */
  async resolveContradictions(
    memory: Memory,
    contradictions: ContradictionDetection[],
  ): Promise<void> {
    this.logger.log(`Resolving ${contradictions.length} contradictions for memory ${memory.id}`);

    for (const contradiction of contradictions) {
      try {
        await this.resolveIndividualContradiction(memory, contradiction);
      } catch (error) {
        this.logger.error(
          `Failed to resolve contradiction with ${contradiction.conflictingMemoryId}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Execute memory merges
   */
  async executeMerges(memory: Memory, opportunities: MergeOpportunity[]): Promise<void> {
    this.logger.log(`Executing ${opportunities.length} merges for memory ${memory.id}`);

    for (const opportunity of opportunities) {
      try {
        await this.executeMerge(memory, opportunity);
      } catch (error) {
        this.logger.error(
          `Failed to execute merge with ${opportunity.candidateMemoryId}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Update memory strength based on usage analysis
   */
  async updateMemoryStrength(memory: Memory, analysis: UsageAnalysis): Promise<void> {
    this.logger.debug(`Updating strength for memory ${memory.id}`);

    try {
      // Calculate new strength based on usage patterns
      const newStrength = this.calculateNewStrength(memory, analysis);
      
      // Apply decay based on time and activity
      const decayedStrength = this.applyStrengthDecay(memory, newStrength);

      // Update memory with new strength
      await this.updateMemoryProperties(memory.id, {
        strengthScore: decayedStrength,
        updatedAt: new Date(),
      });

      // Record evolution event
      await this.recordEvolutionEvent(memory.id, {
        version: (memory.metadata.version || 1) + 1,
        change: 'strength_update',
        reason: `Updated based on usage analysis: ${analysis.strengthTrend}`,
        timestamp: new Date(),
        author: 'evolution_engine',
        impact: 'minor',
      });

      this.logger.debug(`Memory ${memory.id} strength updated to ${decayedStrength.toFixed(3)}`);
    } catch (error) {
      this.logger.error(`Failed to update memory strength for ${memory.id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Perform periodic evolution analysis across all memories
   */
  async performGlobalEvolution(workspace?: string): Promise<{
    analyzed: number;
    strengthUpdates: number;
    contradictionsResolved: number;
    mergesExecuted: number;
    deprecations: number;
  }> {
    this.logger.log('Starting global evolution analysis');
    
    const stats = {
      analyzed: 0,
      strengthUpdates: 0,
      contradictionsResolved: 0,
      mergesExecuted: 0,
      deprecations: 0,
    };

    try {
      // Get all memories for analysis
      const memories = await this.getMemoriesForEvolution(workspace);
      
      for (const memory of memories) {
        try {
          stats.analyzed++;

          // Analyze and update strength
          const analysis = await this.analyzeUsagePatterns(memory);
          await this.updateMemoryStrength(memory, analysis);
          stats.strengthUpdates++;

          // Handle contradictions
          const contradictions = await this.detectContradictions(memory);
          if (contradictions.length > 0) {
            await this.resolveContradictions(memory, contradictions);
            stats.contradictionsResolved += contradictions.length;
          }

          // Handle merges
          const mergeOpportunities = await this.findMergeOpportunities(memory);
          if (mergeOpportunities.length > 0) {
            await this.executeMerges(memory, mergeOpportunities);
            stats.mergesExecuted += mergeOpportunities.length;
          }

          // Check for deprecation
          if (this.shouldDeprecateMemory(memory, analysis)) {
            await this.deprecateMemory(memory);
            stats.deprecations++;
          }

        } catch (error) {
          this.logger.error(`Evolution failed for memory ${memory.id}: ${error.message}`);
        }

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      this.logger.log(`Global evolution completed: ${JSON.stringify(stats)}`);
      return stats;
    } catch (error) {
      this.logger.error(`Global evolution failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Private implementation methods

  private initializeEvolutionEngine(): void {
    this.logger.log('Initializing Evolution Engine');
    
    // Set up periodic evolution analysis
    const intervalHours = this.config.evolution.analysisInterval;
    setInterval(() => {
      this.performGlobalEvolution().catch(error => {
        this.logger.error(`Scheduled evolution failed: ${error.message}`);
      });
    }, intervalHours * 60 * 60 * 1000);
  }

  private calculateAccessFrequency(memory: Memory): number {
    const daysSinceCreated = (Date.now() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated < 1) return memory.accessCount; // Avoid division by zero
    
    return memory.accessCount / daysSinceCreated;
  }

  private calculateRecentActivity(memory: Memory): number {
    const daysSinceLastAccess = (Date.now() - memory.lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    // Recent activity decays exponentially
    return Math.exp(-daysSinceLastAccess / 7); // 7-day half-life
  }

  private async calculateSuccessRate(memory: Memory): Promise<number> {
    // This would analyze how often this memory led to successful outcomes
    // For now, use a heuristic based on access patterns and quality
    
    const baseSuccess = memory.quality.overall;
    const usageBonus = Math.min(memory.accessCount / 50, 0.3); // Up to 30% bonus for usage
    const confidenceBonus = memory.confidence * 0.2;
    
    return Math.min(baseSuccess + usageBonus + confidenceBonus, 1);
  }

  private async calculateContextDiversity(memory: Memory): Promise<number> {
    // This would analyze how many different contexts this memory has been used in
    // For now, use tags and relationships as a proxy
    
    const tagDiversity = memory.metadata.tags.length * 0.1;
    const relationshipDiversity = memory.metadata.relationships.length * 0.05;
    
    return Math.min(tagDiversity + relationshipDiversity, 1);
  }

  private analyzeStrengthTrend(memory: Memory): 'increasing' | 'stable' | 'decreasing' {
    // This would analyze historical strength data
    // For now, use simple heuristics
    
    const recentActivity = this.calculateRecentActivity(memory);
    const accessFrequency = this.calculateAccessFrequency(memory);
    
    if (recentActivity > 0.7 && accessFrequency > 1) return 'increasing';
    if (recentActivity < 0.3 || accessFrequency < 0.1) return 'decreasing';
    return 'stable';
  }

  private generateUsageRecommendations(analysis: {
    accessFrequency: number;
    recentActivity: number;
    successRate: number;
    contextDiversity: number;
    strengthTrend: string;
  }): string[] {
    const recommendations: string[] = [];

    if (analysis.accessFrequency < 0.1) {
      recommendations.push('Low access frequency - consider deprecation or improved discoverability');
    }

    if (analysis.recentActivity < 0.2) {
      recommendations.push('Low recent activity - memory may be becoming obsolete');
    }

    if (analysis.successRate < 0.5) {
      recommendations.push('Low success rate - review and improve memory quality');
    }

    if (analysis.contextDiversity < 0.3) {
      recommendations.push('Limited context diversity - add more tags or relationships');
    }

    if (analysis.strengthTrend === 'decreasing') {
      recommendations.push('Declining strength trend - investigate causes and improve content');
    }

    return recommendations;
  }

  private async findConflictCandidates(memory: Memory): Promise<Memory[]> {
    // Find memories that might conflict with this one
    // This would use semantic similarity and workspace overlap
    
    // Placeholder implementation
    return [];
  }

  private async analyzeContradiction(
    memory1: Memory,
    memory2: Memory,
  ): Promise<ContradictionDetection> {
    // Analyze if two memories contradict each other
    
    const conflictType = this.determineConflictType(memory1, memory2);
    const severity = await this.calculateConflictSeverity(memory1, memory2, conflictType);
    const evidence = this.gatherConflictEvidence(memory1, memory2);
    const suggestedResolution = this.suggestResolution(memory1, memory2, severity);

    return {
      conflictingMemoryId: memory2.id,
      conflictType,
      severity,
      evidence,
      suggestedResolution,
    };
  }

  private determineConflictType(memory1: Memory, memory2: Memory): 'semantic' | 'factual' | 'temporal' {
    // Simple heuristic for conflict type
    if (memory1.workspace !== memory2.workspace) return 'semantic';
    
    const time1 = memory1.createdAt.getTime();
    const time2 = memory2.createdAt.getTime();
    if (Math.abs(time1 - time2) < 24 * 60 * 60 * 1000) return 'temporal';
    
    return 'factual';
  }

  private async calculateConflictSeverity(
    memory1: Memory,
    memory2: Memory,
    conflictType: string,
  ): Promise<number> {
    // Calculate how severe the conflict is
    let severity = 0.5; // Base severity

    // Higher severity for same workspace
    if (memory1.workspace === memory2.workspace) severity += 0.2;
    
    // Higher severity for recent memories
    const recentThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (Date.now() - Math.max(memory1.createdAt.getTime(), memory2.createdAt.getTime()) < recentThreshold) {
      severity += 0.2;
    }

    return Math.min(severity, 1);
  }

  private gatherConflictEvidence(memory1: Memory, memory2: Memory): string[] {
    const evidence: string[] = [];
    
    if (memory1.workspace === memory2.workspace) {
      evidence.push('Same workspace context');
    }
    
    const sharedTags = memory1.metadata.tags.filter(tag => memory2.metadata.tags.includes(tag));
    if (sharedTags.length > 0) {
      evidence.push(`Shared tags: ${sharedTags.join(', ')}`);
    }

    return evidence;
  }

  private suggestResolution(
    memory1: Memory,
    memory2: Memory,
    severity: number,
  ): 'merge' | 'deprecate' | 'manual_review' {
    if (severity > 0.8) return 'manual_review';
    if (memory1.quality.overall > memory2.quality.overall * 1.2) return 'deprecate';
    return 'merge';
  }

  private async findMergeCandidates(memory: Memory): Promise<Memory[]> {
    // Find memories that could be beneficially merged
    // This would use similarity analysis
    
    // Placeholder implementation
    return [];
  }

  private async evaluateMergeOpportunity(
    memory1: Memory,
    memory2: Memory,
  ): Promise<MergeOpportunity> {
    const similarity = await this.calculateMemorySimilarity(memory1, memory2);
    const mergeStrategy = this.determineMergeStrategy(memory1, memory2, similarity);
    const expectedBenefit = this.calculateMergeBenefit(memory1, memory2, similarity);
    const riskAssessment = this.assessMergeRisk(memory1, memory2);

    return {
      candidateMemoryId: memory2.id,
      similarity,
      mergeStrategy,
      expectedBenefit,
      riskAssessment,
    };
  }

  private async calculateMemorySimilarity(memory1: Memory, memory2: Memory): Promise<number> {
    // Calculate semantic similarity between memories
    // This would use embedding similarity
    
    // Placeholder: use simple heuristics
    let similarity = 0;
    
    // Workspace similarity
    if (memory1.workspace === memory2.workspace) similarity += 0.3;
    
    // Tag similarity
    const sharedTags = memory1.metadata.tags.filter(tag => memory2.metadata.tags.includes(tag));
    similarity += (sharedTags.length / Math.max(memory1.metadata.tags.length, memory2.metadata.tags.length, 1)) * 0.4;
    
    // Type similarity
    if (memory1.type === memory2.type) similarity += 0.3;
    
    return Math.min(similarity, 1);
  }

  private determineMergeStrategy(memory1: Memory, memory2: Memory, similarity: number): MergeStrategy {
    if (similarity > 0.9) return 'replace';
    if (similarity > 0.7) return 'synthesize';
    return 'append';
  }

  private calculateMergeBenefit(memory1: Memory, memory2: Memory, similarity: number): number {
    // Calculate expected benefit from merging
    let benefit = similarity * 0.5; // Base benefit from similarity
    
    // Benefit from consolidation
    if (memory1.accessCount + memory2.accessCount > 10) benefit += 0.3;
    
    // Quality improvement potential
    const qualityGap = Math.abs(memory1.quality.overall - memory2.quality.overall);
    if (qualityGap > 0.2) benefit += 0.2;
    
    return Math.min(benefit, 1);
  }

  private assessMergeRisk(memory1: Memory, memory2: Memory): number {
    let risk = 0.1; // Base risk
    
    // Risk from quality difference
    const qualityGap = Math.abs(memory1.quality.overall - memory2.quality.overall);
    risk += qualityGap * 0.3;
    
    // Risk from different workspaces
    if (memory1.workspace !== memory2.workspace) risk += 0.4;
    
    // Risk from high usage
    const totalUsage = memory1.accessCount + memory2.accessCount;
    if (totalUsage > 50) risk += 0.2;
    
    return Math.min(risk, 1);
  }

  private async resolveIndividualContradiction(
    memory: Memory,
    contradiction: ContradictionDetection,
  ): Promise<void> {
    this.logger.debug(`Resolving contradiction between ${memory.id} and ${contradiction.conflictingMemoryId}`);

    switch (contradiction.suggestedResolution) {
      case 'merge':
        await this.mergeContradictingMemories(memory.id, contradiction.conflictingMemoryId);
        break;
      case 'deprecate':
        await this.deprecateInferiorMemory(memory.id, contradiction.conflictingMemoryId);
        break;
      case 'manual_review':
        await this.flagForManualReview(memory.id, contradiction.conflictingMemoryId, contradiction);
        break;
    }
  }

  private async executeMerge(memory: Memory, opportunity: MergeOpportunity): Promise<void> {
    this.logger.debug(`Executing merge between ${memory.id} and ${opportunity.candidateMemoryId}`);
    
    // Implementation would depend on merge strategy
    switch (opportunity.mergeStrategy) {
      case 'append':
        await this.appendMemories(memory.id, opportunity.candidateMemoryId);
        break;
      case 'replace':
        await this.replaceMemory(memory.id, opportunity.candidateMemoryId);
        break;
      case 'synthesize':
        await this.synthesizeMemories(memory.id, opportunity.candidateMemoryId);
        break;
      case 'version':
        await this.versionMemories(memory.id, opportunity.candidateMemoryId);
        break;
    }
  }

  private calculateNewStrength(memory: Memory, analysis: UsageAnalysis): number {
    const currentStrength = (memory as any).strengthScore || 0.5;
    
    let adjustment = 0;
    
    // Adjust based on usage frequency
    if (analysis.accessFrequency > 1) adjustment += 0.1;
    if (analysis.accessFrequency < 0.1) adjustment -= 0.1;
    
    // Adjust based on recent activity
    adjustment += (analysis.recentActivity - 0.5) * 0.2;
    
    // Adjust based on success rate
    adjustment += (analysis.successRate - 0.5) * 0.3;
    
    return Math.max(0, Math.min(1, currentStrength + adjustment));
  }

  private applyStrengthDecay(memory: Memory, baseStrength: number): number {
    const daysSinceLastAccess = (Date.now() - memory.lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24);
    const decayRate = this.config.evolution.usageWeightDecay;
    
    // Apply exponential decay
    const decayFactor = Math.exp(-daysSinceLastAccess * decayRate / 30); // 30-day half-life
    
    return baseStrength * decayFactor;
  }

  private shouldDeprecateMemory(memory: Memory, analysis: UsageAnalysis): boolean {
    const daysSinceLastAccess = (Date.now() - memory.lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    return (
      daysSinceLastAccess > this.config.evolution.deprecationThreshold &&
      analysis.accessFrequency < 0.01 &&
      analysis.successRate < 0.3
    );
  }

  // Placeholder methods for storage operations
  private async getMemoriesForEvolution(workspace?: string): Promise<Memory[]> {
    // Would fetch memories from storage service
    return [];
  }

  private async updateMemoryProperties(memoryId: string, updates: any): Promise<void> {
    // Would update memory in storage
  }

  private async recordEvolutionEvent(memoryId: string, event: EvolutionHistory): Promise<void> {
    // Would record evolution event in storage
  }

  private async mergeContradictingMemories(id1: string, id2: string): Promise<void> {
    // Implementation for merging contradicting memories
  }

  private async deprecateInferiorMemory(id1: string, id2: string): Promise<void> {
    // Implementation for deprecating the inferior memory
  }

  private async flagForManualReview(id1: string, id2: string, contradiction: ContradictionDetection): Promise<void> {
    // Implementation for flagging memories for manual review
  }

  private async appendMemories(id1: string, id2: string): Promise<void> {
    // Implementation for append merge strategy
  }

  private async replaceMemory(id1: string, id2: string): Promise<void> {
    // Implementation for replace merge strategy
  }

  private async synthesizeMemories(id1: string, id2: string): Promise<void> {
    // Implementation for synthesize merge strategy
  }

  private async versionMemories(id1: string, id2: string): Promise<void> {
    // Implementation for version merge strategy
  }

  private async deprecateMemory(memory: Memory): Promise<void> {
    // Implementation for memory deprecation
  }
}