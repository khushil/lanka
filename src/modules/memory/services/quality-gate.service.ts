/**
 * LANKA Memory System - Quality Gate Service
 * Ensures only high-quality memories enter the system
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  QualityScore,
  QualityGate,
  QualityValidator,
  Memory,
  MemorySystemConfig,
} from '../types/memory.types';

@Injectable()
export class QualityGateService {
  private readonly logger = new Logger(QualityGateService.name);
  private readonly qualityGates: QualityGate[];

  constructor(private readonly config: MemorySystemConfig) {
    this.qualityGates = config.qualityGates;
    this.validateQualityGates();
  }

  /**
   * Assess quality of potential memory against all configured gates
   */
  async assessQuality(
    content: string,
    type: Memory['type'],
    context: {
      source: string;
      tags: string[];
      metadata?: Record<string, unknown>;
    },
  ): Promise<QualityScore> {
    this.logger.debug(`Assessing quality for ${type} memory from ${context.source}`);

    const assessments = await Promise.all(
      this.qualityGates.map(gate => this.assessGate(content, type, context, gate)),
    );

    // Calculate individual quality dimensions
    const novelty = await this.assessNovelty(content, context);
    const accuracy = await this.assessAccuracy(content, context);
    const utility = await this.assessUtility(content, type, context);
    const clarity = await this.assessClarity(content);
    const validation = await this.assessValidation(content, context);

    // Calculate weighted overall score
    const overall = this.calculateOverallScore({
      novelty,
      accuracy,
      utility,
      clarity,
      validation,
    });

    const qualityScore: QualityScore = {
      novelty,
      accuracy,
      utility,
      clarity,
      validation,
      overall,
    };

    this.logger.debug(`Quality assessment completed: ${overall.toFixed(2)} overall`);

    return qualityScore;
  }

  /**
   * Validate if quality score passes minimum requirements
   */
  validateQualityThreshold(qualityScore: QualityScore): {
    passed: boolean;
    failedGates: string[];
    reasons: string[];
  } {
    const failedGates: string[] = [];
    const reasons: string[] = [];

    // Check overall score
    if (qualityScore.overall < this.config.arbitration.quality.minimumScore) {
      failedGates.push('overall_minimum');
      reasons.push(`Overall score ${qualityScore.overall.toFixed(2)} below minimum ${this.config.arbitration.quality.minimumScore}`);
    }

    // Check required gates
    for (const requiredGate of this.config.arbitration.quality.requiredGates) {
      const gate = this.qualityGates.find(g => g.name === requiredGate);
      if (!gate) continue;

      const dimension = this.getQualityDimension(qualityScore, gate.name);
      if (dimension < gate.threshold) {
        failedGates.push(gate.name);
        reasons.push(`${gate.name} score ${dimension.toFixed(2)} below threshold ${gate.threshold}`);
      }
    }

    return {
      passed: failedGates.length === 0,
      failedGates,
      reasons,
    };
  }

  /**
   * Get quality improvement suggestions
   */
  async suggestImprovements(
    content: string,
    qualityScore: QualityScore,
    context: any,
  ): Promise<string[]> {
    const suggestions: string[] = [];

    if (qualityScore.novelty < 0.5) {
      suggestions.push('Consider adding unique insights or different perspectives to increase novelty');
    }

    if (qualityScore.accuracy < 0.6) {
      suggestions.push('Add references, examples, or validation to improve accuracy confidence');
    }

    if (qualityScore.utility < 0.5) {
      suggestions.push('Explain practical applications or when this knowledge would be useful');
    }

    if (qualityScore.clarity < 0.6) {
      suggestions.push('Improve explanation clarity with better structure or examples');
    }

    if (qualityScore.validation < 0.4) {
      suggestions.push('Include evidence, testing results, or peer validation');
    }

    return suggestions;
  }

  // Private assessment methods

  private async assessGate(
    content: string,
    type: Memory['type'],
    context: any,
    gate: QualityGate,
  ): Promise<{ gate: string; score: number; passed: boolean }> {
    try {
      const score = await this.executeValidator(content, type, context, gate.validator);
      return {
        gate: gate.name,
        score,
        passed: score >= gate.threshold,
      };
    } catch (error) {
      this.logger.warn(`Quality gate ${gate.name} assessment failed: ${error.message}`);
      return {
        gate: gate.name,
        score: 0,
        passed: !gate.required,
      };
    }
  }

  private async executeValidator(
    content: string,
    type: Memory['type'],
    context: any,
    validator: QualityValidator,
  ): Promise<number> {
    switch (validator.type) {
      case 'rule_based':
        return this.executeRuleBasedValidator(content, type, context, validator);
      case 'ml_model':
        return this.executeMLValidator(content, type, context, validator);
      case 'llm_assessment':
        return this.executeLLMValidator(content, type, context, validator);
      case 'peer_review':
        return this.executePeerReviewValidator(content, type, context, validator);
      default:
        throw new Error(`Unknown validator type: ${validator.type}`);
    }
  }

  private async executeRuleBasedValidator(
    content: string,
    type: Memory['type'],
    context: any,
    validator: QualityValidator,
  ): Promise<number> {
    const rules = validator.config as { [key: string]: any };
    let score = 0.5; // Base score

    // Length requirements
    if (rules.minLength && content.length < rules.minLength) {
      score -= 0.3;
    }
    if (rules.maxLength && content.length > rules.maxLength) {
      score -= 0.2;
    }

    // Content quality indicators
    const hasCodeExample = /```[\s\S]*```/.test(content);
    const hasExplanation = content.length > 50 && /\b(because|since|therefore|thus|hence)\b/i.test(content);
    const hasStructure = /^#+\s/.test(content) || content.includes('\n-') || content.includes('\n1.');

    if (hasCodeExample) score += 0.2;
    if (hasExplanation) score += 0.2;
    if (hasStructure) score += 0.1;

    // Source reliability
    if (context.source === 'debugging' && content.includes('solution')) score += 0.2;
    if (context.source === 'tool_usage' && content.includes('success')) score += 0.1;

    return Math.max(0, Math.min(1, score));
  }

  private async executeMLValidator(
    content: string,
    type: Memory['type'],
    context: any,
    validator: QualityValidator,
  ): Promise<number> {
    // Placeholder for ML model integration
    // Would load and run a trained quality assessment model
    this.logger.debug(`ML validator ${validator.implementation} not yet implemented`);
    return 0.5;
  }

  private async executeLLMValidator(
    content: string,
    type: Memory['type'],
    context: any,
    validator: QualityValidator,
  ): Promise<number> {
    const prompt = this.buildQualityAssessmentPrompt(content, type, context, validator);
    
    try {
      // This would integrate with the configured LLM
      const response = await this.callLLMForQuality(prompt);
      return this.parseQualityResponse(response);
    } catch (error) {
      this.logger.warn(`LLM quality assessment failed: ${error.message}`);
      return 0.3; // Conservative fallback
    }
  }

  private async executePeerReviewValidator(
    content: string,
    type: Memory['type'],
    context: any,
    validator: QualityValidator,
  ): Promise<number> {
    // Placeholder for peer review system integration
    // Would queue for human review and return cached score if available
    this.logger.debug('Peer review validator not yet implemented');
    return 0.6;
  }

  private async assessNovelty(content: string, context: any): Promise<number> {
    // Check against existing memories for uniqueness
    // This is simplified - real implementation would use similarity search
    
    let noveltyScore = 0.7; // Base assumption of moderate novelty

    // Reduce score for common patterns
    const commonPatterns = [
      /console\.log/,
      /function.*\(\)/,
      /import.*from/,
      /if.*then/,
    ];

    const hasCommonPatterns = commonPatterns.some(pattern => pattern.test(content));
    if (hasCommonPatterns) {
      noveltyScore -= 0.2;
    }

    // Increase score for specific, detailed content
    if (content.length > 200 && content.includes('specific')) {
      noveltyScore += 0.2;
    }

    return Math.max(0, Math.min(1, noveltyScore));
  }

  private async assessAccuracy(content: string, context: any): Promise<number> {
    let accuracyScore = 0.6; // Base assumption

    // Increase score for validated information
    if (context.source === 'debugging' && content.includes('tested')) {
      accuracyScore += 0.3;
    }

    // Increase score for references
    if (content.includes('documentation') || content.includes('official')) {
      accuracyScore += 0.2;
    }

    // Decrease score for uncertain language
    const uncertaintyMarkers = ['maybe', 'might', 'possibly', 'not sure'];
    const hasUncertainty = uncertaintyMarkers.some(marker => 
      content.toLowerCase().includes(marker)
    );
    if (hasUncertainty) {
      accuracyScore -= 0.3;
    }

    return Math.max(0, Math.min(1, accuracyScore));
  }

  private async assessUtility(content: string, type: Memory['type'], context: any): Promise<number> {
    let utilityScore = 0.5;

    // Type-specific utility assessment
    switch (type) {
      case 'system1':
        // Pattern memories should be immediately applicable
        if (content.includes('pattern') && content.includes('use')) {
          utilityScore += 0.3;
        }
        break;
      case 'system2':
        // Reasoning memories should show problem-solving
        if (content.includes('problem') && content.includes('solution')) {
          utilityScore += 0.4;
        }
        break;
      case 'workspace':
        // Team memories should show consensus
        if (content.includes('agreed') || content.includes('decided')) {
          utilityScore += 0.3;
        }
        break;
    }

    // General utility indicators
    if (content.includes('example') || content.includes('usage')) {
      utilityScore += 0.2;
    }

    return Math.max(0, Math.min(1, utilityScore));
  }

  private async assessClarity(content: string): Promise<number> {
    let clarityScore = 0.5;

    // Structure indicators
    const hasHeadings = /^#+\s/m.test(content);
    const hasBullets = content.includes('- ') || content.includes('* ');
    const hasNumbers = /^\d+\.\s/m.test(content);

    if (hasHeadings) clarityScore += 0.2;
    if (hasBullets || hasNumbers) clarityScore += 0.15;

    // Length appropriateness
    const wordCount = content.split(/\s+/).length;
    if (wordCount >= 10 && wordCount <= 300) {
      clarityScore += 0.15;
    }

    // Code clarity
    const codeBlocks = content.match(/```[\s\S]*?```/g);
    if (codeBlocks) {
      const hasComments = codeBlocks.some(block => block.includes('//') || block.includes('/*'));
      if (hasComments) clarityScore += 0.2;
    }

    return Math.max(0, Math.min(1, clarityScore));
  }

  private async assessValidation(content: string, context: any): Promise<number> {
    let validationScore = 0.3; // Low base for unvalidated content

    // Evidence indicators
    const evidenceMarkers = ['tested', 'verified', 'confirmed', 'proven', 'works', 'successful'];
    const hasEvidence = evidenceMarkers.some(marker => 
      content.toLowerCase().includes(marker)
    );
    if (hasEvidence) {
      validationScore += 0.4;
    }

    // Source reliability
    if (context.source === 'tool_usage' && content.includes('output')) {
      validationScore += 0.2;
    }

    // References to authoritative sources
    if (content.includes('documentation') || /https?:\/\//.test(content)) {
      validationScore += 0.3;
    }

    return Math.max(0, Math.min(1, validationScore));
  }

  private calculateOverallScore(dimensions: Omit<QualityScore, 'overall'>): number {
    // Weighted average based on importance
    const weights = {
      novelty: 0.25,
      accuracy: 0.30,
      utility: 0.25,
      clarity: 0.10,
      validation: 0.10,
    };

    return (
      dimensions.novelty * weights.novelty +
      dimensions.accuracy * weights.accuracy +
      dimensions.utility * weights.utility +
      dimensions.clarity * weights.clarity +
      dimensions.validation * weights.validation
    );
  }

  private getQualityDimension(qualityScore: QualityScore, dimensionName: string): number {
    switch (dimensionName) {
      case 'novelty': return qualityScore.novelty;
      case 'accuracy': return qualityScore.accuracy;
      case 'utility': return qualityScore.utility;
      case 'clarity': return qualityScore.clarity;
      case 'validation': return qualityScore.validation;
      case 'overall': return qualityScore.overall;
      default: return 0;
    }
  }

  private validateQualityGates(): void {
    for (const gate of this.qualityGates) {
      if (!gate.name || !gate.validator) {
        throw new Error(`Invalid quality gate configuration: ${JSON.stringify(gate)}`);
      }
      if (gate.threshold < 0 || gate.threshold > 1) {
        throw new Error(`Quality gate threshold must be between 0 and 1: ${gate.name}`);
      }
    }
  }

  private buildQualityAssessmentPrompt(
    content: string,
    type: Memory['type'],
    context: any,
    validator: QualityValidator,
  ): string {
    return `
# Quality Assessment Request

Assess the quality of this ${type} memory content on a scale of 0.0 to 1.0.

## Content to Assess:
"${content}"

## Context:
- Source: ${context.source}
- Tags: ${context.tags?.join(', ') || 'none'}
- Type: ${type}

## Assessment Criteria:
- Novelty: How unique or new is this information?
- Accuracy: How correct and reliable does this seem?
- Utility: How useful would this be for developers?
- Clarity: How well explained and structured is it?
- Validation: How well supported by evidence?

Respond with a single number between 0.0 and 1.0 representing overall quality.
`;
  }

  private async callLLMForQuality(prompt: string): Promise<string> {
    // Placeholder for LLM integration
    // Would use the same LLM service as arbitration
    return '0.7';
  }

  private parseQualityResponse(response: string): number {
    const match = response.match(/([0-1](?:\.\d+)?)/);
    if (match) {
      const score = parseFloat(match[1]);
      return Math.max(0, Math.min(1, score));
    }
    return 0.5; // Fallback
  }
}