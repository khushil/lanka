/**
 * LANKA Memory System - Memory Arbitration Intelligence Service
 * LLM-powered decision making for memory operations
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  MemoryArbitrationResult,
  SimilarMemory,
  QualityScore,
  Memory,
  ArbitrationAudit,
  RiskAssessment,
  MemorySystemConfig,
} from '../types/memory.types';

interface ArbitrationInput {
  content: string;
  type: Memory['type'];
  workspace: string;
  embedding: number[];
  similarMemories: SimilarMemory[];
  qualityScore: QualityScore;
  context: any;
}

@Injectable()
export class MemoryArbitrationService {
  private readonly logger = new Logger(MemoryArbitrationService.name);

  constructor(private readonly config: MemorySystemConfig) {}

  /**
   * Core arbitration logic that decides what to do with incoming memory
   */
  async arbitrateMemory(input: ArbitrationInput): Promise<MemoryArbitrationResult> {
    const startTime = Date.now();
    const arbitrationId = this.generateArbitrationId();

    this.logger.debug(`Starting memory arbitration ${arbitrationId} for ${input.type} memory`);

    try {
      // Step 1: Analyze similarity with existing memories
      const similarityAnalysis = await this.analyzeSimilarity(input);

      // Step 2: Assess risks of the proposed memory
      const riskAssessment = await this.assessRisks(input, similarityAnalysis);

      // Step 3: Get LLM arbitration decision
      const llmDecision = await this.getLLMArbitration(input, similarityAnalysis, riskAssessment);

      // Step 4: Apply business rules and constraints
      const finalDecision = await this.applyBusinessRules(llmDecision, input, riskAssessment);

      // Step 5: Create audit trail
      const auditTrail = this.createAuditTrail({
        arbitrationId,
        input,
        similarityAnalysis,
        riskAssessment,
        llmDecision,
        finalDecision,
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `Memory arbitration ${arbitrationId} completed: ${finalDecision.decision} (${duration}ms)`,
      );

      return {
        ...finalDecision,
        auditTrail,
      };
    } catch (error) {
      this.logger.error(
        `Memory arbitration ${arbitrationId} failed: ${error.message}`,
        error.stack,
      );
      
      return this.createFailsafeDecision(arbitrationId, input, error.message);
    }
  }

  /**
   * Health check for arbitration service
   */
  async healthCheck(): Promise<void> {
    try {
      // Test LLM connectivity with a simple arbitration
      await this.testLLMConnection();
      this.logger.debug('Memory arbitration service health check passed');
    } catch (error) {
      this.logger.error('Memory arbitration service health check failed', error.stack);
      throw error;
    }
  }

  // Private implementation methods

  private async analyzeSimilarity(input: ArbitrationInput): Promise<{
    highestSimilarity: number;
    semanticMatches: SimilarMemory[];
    structuralMatches: SimilarMemory[];
    contextualMatches: SimilarMemory[];
    duplicateCandidate?: SimilarMemory;
  }> {
    const semanticMatches = input.similarMemories.filter(
      m => m.type === 'semantic' && m.similarity > this.config.arbitration.similarity.semanticThreshold,
    );

    const structuralMatches = input.similarMemories.filter(
      m => m.type === 'structural' && m.similarity > this.config.arbitration.similarity.structuralThreshold,
    );

    const contextualMatches = input.similarMemories.filter(
      m => m.type === 'contextual' && m.similarity > this.config.arbitration.similarity.contextualThreshold,
    );

    const highestSimilarity = Math.max(
      ...input.similarMemories.map(m => m.similarity),
      0,
    );

    // Check for potential duplicates (very high semantic similarity)
    const duplicateCandidate = semanticMatches.find(m => m.similarity > 0.95);

    return {
      highestSimilarity,
      semanticMatches,
      structuralMatches,
      contextualMatches,
      duplicateCandidate,
    };
  }

  private async assessRisks(
    input: ArbitrationInput,
    similarityAnalysis: any,
  ): Promise<RiskAssessment> {
    // Contradiction risk: high if similar memories have conflicting information
    const contradictionRisk = this.calculateContradictionRisk(input, similarityAnalysis);

    // Obsolescence risk: high if this memory makes existing ones outdated
    const obsolescenceRisk = this.calculateObsolescenceRisk(input, similarityAnalysis);

    // Security risk: assess if memory contains sensitive information
    const securityRisk = this.calculateSecurityRisk(input);

    // Quality risk: assess if memory could degrade overall quality
    const qualityRisk = this.calculateQualityRisk(input);

    const overall = (contradictionRisk + obsolescenceRisk + securityRisk + qualityRisk) / 4;

    return {
      contradiction: contradictionRisk,
      obsolescence: obsolescenceRisk,
      security: securityRisk,
      quality: qualityRisk,
      overall,
    };
  }

  private async getLLMArbitration(
    input: ArbitrationInput,
    similarityAnalysis: any,
    riskAssessment: RiskAssessment,
  ): Promise<{
    decision: MemoryArbitrationResult['decision'];
    confidence: number;
    reasoning: string;
    targetMemoryId?: string;
    mergeStrategy?: string;
  }> {
    const prompt = this.buildArbitrationPrompt(input, similarityAnalysis, riskAssessment);
    
    try {
      // Call LLM service (implementation depends on provider)
      const response = await this.callLLM(prompt);
      const parsed = this.parseLLMResponse(response);

      // Validate LLM response
      if (!this.isValidLLMResponse(parsed)) {
        throw new Error('Invalid LLM response format');
      }

      return parsed;
    } catch (error) {
      this.logger.warn(`LLM arbitration failed, falling back to rule-based: ${error.message}`);
      return this.getRuleBasedDecision(input, similarityAnalysis, riskAssessment);
    }
  }

  private buildArbitrationPrompt(
    input: ArbitrationInput,
    similarityAnalysis: any,
    riskAssessment: RiskAssessment,
  ): string {
    return `
# Memory Arbitration Decision

You are an intelligent memory arbitration system for a cognitive development assistant. Analyze the following information and make a decision about what to do with new incoming memory.

## New Memory Information
- Type: ${input.type}
- Content: "${input.content}"
- Workspace: ${input.workspace}
- Quality Score: ${input.qualityScore.overall.toFixed(2)} (novelty: ${input.qualityScore.novelty.toFixed(2)}, accuracy: ${input.qualityScore.accuracy.toFixed(2)}, utility: ${input.qualityScore.utility.toFixed(2)})

## Similar Existing Memories
- Highest similarity: ${similarityAnalysis.highestSimilarity.toFixed(2)}
- Semantic matches: ${similarityAnalysis.semanticMatches.length}
- Structural matches: ${similarityAnalysis.structuralMatches.length}
- Duplicate candidate: ${similarityAnalysis.duplicateCandidate ? 'Yes' : 'No'}

## Risk Assessment
- Contradiction risk: ${riskAssessment.contradiction.toFixed(2)}
- Obsolescence risk: ${riskAssessment.obsolescence.toFixed(2)}
- Security risk: ${riskAssessment.security.toFixed(2)}
- Quality risk: ${riskAssessment.quality.toFixed(2)}
- Overall risk: ${riskAssessment.overall.toFixed(2)}

## Decision Options
1. ADD - Store as new memory (use when novel and valuable)
2. UPDATE - Update existing similar memory (use when improving existing knowledge)
3. MERGE - Combine with existing memory (use when complementary information)
4. REJECT - Don't store (use when low quality or redundant)
5. DEPRECATE - Mark existing memory as outdated (use when new info supersedes old)

## Instructions
Provide your decision as JSON:
{
  "decision": "ADD|UPDATE|MERGE|REJECT|DEPRECATE",
  "confidence": 0.0-1.0,
  "reasoning": "detailed explanation of your decision",
  "targetMemoryId": "id of target memory for UPDATE/MERGE/DEPRECATE (optional)",
  "mergeStrategy": "append|replace|synthesize (for MERGE only)"
}

Consider:
- Quality threshold: ${this.config.arbitration.quality.minimumScore}
- Novelty vs redundancy tradeoff
- Risk vs benefit analysis
- Workspace context and relevance
- Long-term knowledge base health
`;
  }

  private async callLLM(prompt: string): Promise<string> {
    // Implementation depends on LLM provider
    // This is a placeholder for the actual LLM integration
    
    switch (this.config.arbitration.llm.provider) {
      case 'openai':
        return this.callOpenAI(prompt);
      case 'anthropic':
        return this.callAnthropic(prompt);
      case 'local':
        return this.callLocalModel(prompt);
      default:
        throw new Error(`Unsupported LLM provider: ${this.config.arbitration.llm.provider}`);
    }
  }

  private async callOpenAI(prompt: string): Promise<string> {
    // OpenAI API integration
    // This would use the actual OpenAI client
    return '{"decision": "ADD", "confidence": 0.8, "reasoning": "High quality novel information"}';
  }

  private async callAnthropic(prompt: string): Promise<string> {
    // Anthropic API integration
    // This would use the actual Anthropic client
    return '{"decision": "ADD", "confidence": 0.8, "reasoning": "High quality novel information"}';
  }

  private async callLocalModel(prompt: string): Promise<string> {
    // Local model integration (e.g., via Ollama)
    return '{"decision": "ADD", "confidence": 0.8, "reasoning": "High quality novel information"}';
  }

  private parseLLMResponse(response: string): any {
    try {
      // Extract JSON from response (may include markdown formatting)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${error.message}`);
    }
  }

  private isValidLLMResponse(response: any): boolean {
    return (
      response &&
      typeof response.decision === 'string' &&
      ['ADD', 'UPDATE', 'MERGE', 'REJECT', 'DEPRECATE'].includes(response.decision) &&
      typeof response.confidence === 'number' &&
      response.confidence >= 0 &&
      response.confidence <= 1 &&
      typeof response.reasoning === 'string' &&
      response.reasoning.length > 0
    );
  }

  private getRuleBasedDecision(
    input: ArbitrationInput,
    similarityAnalysis: any,
    riskAssessment: RiskAssessment,
  ): any {
    // Fallback rule-based decision logic
    
    // If duplicate candidate exists, reject
    if (similarityAnalysis.duplicateCandidate) {
      return {
        decision: 'REJECT',
        confidence: 0.9,
        reasoning: 'Duplicate content detected',
      };
    }

    // If high risk, reject
    if (riskAssessment.overall > 0.7) {
      return {
        decision: 'REJECT',
        confidence: 0.8,
        reasoning: 'High risk assessment',
      };
    }

    // If high quality and novel, add
    if (input.qualityScore.overall > 0.8 && input.qualityScore.novelty > 0.6) {
      return {
        decision: 'ADD',
        confidence: 0.7,
        reasoning: 'High quality novel information',
      };
    }

    // If moderate similarity and quality, update
    if (similarityAnalysis.highestSimilarity > 0.6 && input.qualityScore.overall > 0.6) {
      return {
        decision: 'UPDATE',
        confidence: 0.6,
        reasoning: 'Improvement to existing memory',
        targetMemoryId: similarityAnalysis.semanticMatches[0]?.memoryId,
      };
    }

    // Default to reject if uncertain
    return {
      decision: 'REJECT',
      confidence: 0.5,
      reasoning: 'Insufficient confidence for storage',
    };
  }

  private applyBusinessRules(
    llmDecision: any,
    input: ArbitrationInput,
    riskAssessment: RiskAssessment,
  ): Omit<MemoryArbitrationResult, 'auditTrail'> {
    let finalDecision = { ...llmDecision };

    // Business rule: Never store if security risk is too high
    if (riskAssessment.security > 0.8) {
      finalDecision = {
        decision: 'REJECT',
        confidence: 1.0,
        reasoning: `Security risk too high (${riskAssessment.security.toFixed(2)}). Original decision: ${llmDecision.reasoning}`,
      };
    }

    // Business rule: Require human review for high-risk decisions
    const reviewRequired = riskAssessment.overall > this.config.arbitration.quality.reviewThreshold;

    return {
      ...finalDecision,
      reviewRequired,
    };
  }

  private createAuditTrail(params: {
    arbitrationId: string;
    input: ArbitrationInput;
    similarityAnalysis: any;
    riskAssessment: RiskAssessment;
    llmDecision: any;
    finalDecision: any;
  }): ArbitrationAudit {
    return {
      arbitrationId: params.arbitrationId,
      timestamp: new Date(),
      inputHash: this.hashInput(params.input),
      similarMemories: params.input.similarMemories,
      llmReasoning: params.llmDecision.reasoning,
      qualityAssessment: params.input.qualityScore,
      riskAssessment: params.riskAssessment,
      reviewRequired: params.finalDecision.reviewRequired || false,
    };
  }

  private createFailsafeDecision(
    arbitrationId: string,
    input: ArbitrationInput,
    errorMessage: string,
  ): MemoryArbitrationResult {
    return {
      decision: 'REJECT',
      confidence: 0.0,
      reasoning: `Arbitration failed: ${errorMessage}`,
      auditTrail: {
        arbitrationId,
        timestamp: new Date(),
        inputHash: this.hashInput(input),
        similarMemories: input.similarMemories,
        llmReasoning: `Error: ${errorMessage}`,
        qualityAssessment: input.qualityScore,
        riskAssessment: {
          contradiction: 0,
          obsolescence: 0,
          security: 1, // High security risk for failed arbitration
          quality: 1, // High quality risk
          overall: 1,
        },
        reviewRequired: true,
      },
    };
  }

  private calculateContradictionRisk(input: ArbitrationInput, similarity: any): number {
    // Simple heuristic: high semantic similarity might indicate contradiction
    const semanticSimilarity = similarity.highestSimilarity;
    
    if (semanticSimilarity > 0.8 && input.qualityScore.novelty > 0.6) {
      return 0.7; // High similarity but novel might be contradictory
    }
    
    return Math.min(semanticSimilarity * 0.5, 0.3);
  }

  private calculateObsolescenceRisk(input: ArbitrationInput, similarity: any): number {
    // Risk that new memory makes existing ones obsolete
    const evolutionIndicators = ['new approach', 'better way', 'updated', 'replaced'];
    const hasEvolutionMarkers = evolutionIndicators.some(indicator =>
      input.content.toLowerCase().includes(indicator),
    );

    return hasEvolutionMarkers && similarity.semanticMatches.length > 0 ? 0.6 : 0.2;
  }

  private calculateSecurityRisk(input: ArbitrationInput): number {
    // Check for potential sensitive information
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /key.*=.*[a-zA-Z0-9]{10,}/i,
      /token.*[a-zA-Z0-9]{20,}/i,
      /api.*key/i,
    ];

    const hasSensitiveContent = sensitivePatterns.some(pattern =>
      pattern.test(input.content),
    );

    return hasSensitiveContent ? 0.9 : 0.1;
  }

  private calculateQualityRisk(input: ArbitrationInput): number {
    // Risk of degrading overall knowledge quality
    return Math.max(0, (0.5 - input.qualityScore.overall) * 2);
  }

  private async testLLMConnection(): Promise<void> {
    const testPrompt = 'Respond with: {"status": "ok", "message": "test successful"}';
    const response = await this.callLLM(testPrompt);
    
    try {
      const parsed = JSON.parse(response);
      if (parsed.status !== 'ok') {
        throw new Error('Test response invalid');
      }
    } catch (error) {
      throw new Error(`LLM connection test failed: ${error.message}`);
    }
  }

  private generateArbitrationId(): string {
    return `arb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private hashInput(input: ArbitrationInput): string {
    // Simple hash for audit trail
    const content = `${input.content}${input.type}${input.workspace}`;
    return Buffer.from(content).toString('base64').substr(0, 16);
  }
}