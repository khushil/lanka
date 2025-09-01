import { v4 as uuidv4 } from 'uuid';
import { Neo4jService } from '../../../../core/database/neo4j';
import { logger } from '../../../../core/logging/logger';
import {
  TechnologyStack,
  PerformanceMetrics,
  Technology,
} from '../../types/architecture.types';

/**
 * Service responsible for technology analysis logic
 * Extracted from TechnologyStackService to improve maintainability
 */
export class TechnologyAnalysisService {
  constructor(private neo4j: Neo4jService) {}

  /**
   * Analyze requirements to determine technology needs
   */
  async analyzeRequirements(requirementIds: string[]): Promise<any> {
    const query = `
      UNWIND $requirementIds AS reqId
      MATCH (r:Requirement {id: reqId})
      WITH collect(r) as requirements
      RETURN {
        types: [r IN requirements | r.type],
        priorities: [r IN requirements | r.priority],
        hasRealTime: ANY(r IN requirements WHERE r.description CONTAINS 'real-time'),
        hasHighVolume: ANY(r IN requirements WHERE r.description CONTAINS 'high volume' OR r.description CONTAINS 'scale'),
        hasSecurity: ANY(r IN requirements WHERE r.type = 'NON_FUNCTIONAL' AND r.description CONTAINS 'security'),
        hasCompliance: ANY(r IN requirements WHERE r.type = 'COMPLIANCE')
      } as analysis
    `;

    const results = await this.neo4j.executeQuery(query, { requirementIds });
    return results[0]?.analysis || {};
  }

  /**
   * Evaluate stack compatibility with existing technologies
   */
  async evaluateStackCompatibility(
    stack: TechnologyStack,
    existingTechnologies: string[]
  ): Promise<{
    compatible: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let compatible = true;

    // Check for incompatibilities
    for (const existing of existingTechnologies) {
      for (const incompatible of stack.compatibility.incompatible) {
        if (incompatible.includes(existing)) {
          compatible = false;
          issues.push(`${existing} is incompatible with stack technologies`);
        }
      }
    }

    // Check for missing requirements
    for (const [tech, requires] of Object.entries(stack.compatibility.requires)) {
      for (const required of requires) {
        if (!existingTechnologies.includes(required)) {
          recommendations.push(`${tech} requires ${required} to be added`);
        }
      }
    }

    // Analyze version compatibility
    const versionIssues = await this.checkVersionCompatibility(stack, existingTechnologies);
    issues.push(...versionIssues);

    return {
      compatible: compatible && issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Predict performance based on workload characteristics
   */
  async predictPerformance(
    stack: TechnologyStack,
    workloadCharacteristics: {
      requestsPerSecond?: number;
      dataVolumeGB?: number;
      concurrentUsers?: number;
      complexity?: 'LOW' | 'MEDIUM' | 'HIGH';
    }
  ): Promise<PerformanceMetrics> {
    // Get historical performance data for similar stacks
    const historicalData = await this.getHistoricalPerformance(stack.id);
    
    // Calculate predicted performance based on workload
    const baseMetrics = stack.performanceMetrics;
    const workloadFactor = this.calculateWorkloadFactor(workloadCharacteristics);
    
    const predictedMetrics: PerformanceMetrics = {
      throughput: (baseMetrics.throughput || 1000) / workloadFactor,
      latency: (baseMetrics.latency || 100) * workloadFactor,
      scalability: this.predictScalability(stack, workloadCharacteristics),
      reliability: this.predictReliability(stack, historicalData),
      maintainability: baseMetrics.maintainability || 0.8,
    };

    // Store prediction for future learning
    await this.storePrediction(stack.id, workloadCharacteristics, predictedMetrics);

    return predictedMetrics;
  }

  /**
   * Find alternative technologies based on criteria
   */
  async findAlternativeTechnologies(
    technology: string,
    criteria?: {
      maxCost?: number;
      minMaturity?: string;
      requiredFeatures?: string[];
    }
  ): Promise<Technology[]> {
    const alternatives = await this.searchAlternatives(technology, criteria);
    
    // Score alternatives based on various factors
    const scored = alternatives.map(alt => ({
      ...alt,
      score: this.scoreAlternative(alt, technology, criteria),
    }));
    
    // Sort by score and return top alternatives
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ score, ...tech }) => tech);
  }

  /**
   * Analyze technology maturity and adoption
   */
  async analyzeTechnologyMaturity(technologyName: string): Promise<{
    maturityLevel: 'EXPERIMENTAL' | 'EMERGING' | 'STABLE' | 'MATURE' | 'LEGACY' | 'DEPRECATED';
    adoptionRate: number;
    communitySupport: number;
    marketTrends: string[];
    riskFactors: string[];
  }> {
    // In a real implementation, this would analyze various data sources
    // For now, provide a simplified analysis
    
    return {
      maturityLevel: 'STABLE',
      adoptionRate: 0.75,
      communitySupport: 0.8,
      marketTrends: [
        'Growing adoption in enterprise',
        'Strong community contributions',
        'Regular updates and improvements',
      ],
      riskFactors: [
        'Potential vendor lock-in',
        'Learning curve for new team members',
      ],
    };
  }

  /**
   * Compare multiple technology stacks
   */
  async compareStacks(stackIds: string[]): Promise<{
    comparison: Array<{
      stackId: string;
      name: string;
      strengths: string[];
      weaknesses: string[];
      overallScore: number;
    }>;
    recommendations: string[];
  }> {
    const stacks = await Promise.all(
      stackIds.map(id => this.getStackById(id))
    );

    const comparison = stacks.filter(Boolean).map(stack => {
      const strengths = this.identifyStrengths(stack!);
      const weaknesses = this.identifyWeaknesses(stack!);
      const overallScore = this.calculateOverallScore(stack!);

      return {
        stackId: stack!.id,
        name: stack!.name,
        strengths,
        weaknesses,
        overallScore,
      };
    });

    const recommendations = this.generateComparisonRecommendations(comparison);

    return {
      comparison,
      recommendations,
    };
  }

  // Private helper methods

  private async checkVersionCompatibility(
    stack: TechnologyStack,
    existingTechnologies: string[]
  ): Promise<string[]> {
    const issues: string[] = [];
    
    // Simplified version compatibility check
    // In production, this would check against a compatibility matrix database
    stack.layers.forEach(layer => {
      layer.technologies.forEach(tech => {
        if (tech.maturity === 'DEPRECATED') {
          issues.push(`${tech.name} is deprecated and should be replaced`);
        }
        if (tech.maturity === 'EXPERIMENTAL' && existingTechnologies.length > 0) {
          issues.push(`${tech.name} is experimental and may not be stable with existing systems`);
        }
      });
    });

    return issues;
  }

  private async getHistoricalPerformance(stackId: string): Promise<any[]> {
    const query = `
      MATCH (ts:TechnologyStack {id: $stackId})
      MATCH (p:Project)-[used:USED_STACK]->(ts)
      RETURN used.performanceAchieved as performance, p.name as projectName
      ORDER BY used.trackedAt DESC
      LIMIT 10
    `;

    const results = await this.neo4j.executeQuery(query, { stackId });
    return results.map((r: any) => ({
      performance: JSON.parse(r.performance || '{}'),
      projectName: r.projectName,
    }));
  }

  private calculateWorkloadFactor(workload: any): number {
    let factor = 1;
    
    if (workload.requestsPerSecond) {
      factor *= Math.log10(workload.requestsPerSecond) / 2;
    }
    if (workload.dataVolumeGB) {
      factor *= Math.log10(workload.dataVolumeGB + 1) / 3;
    }
    if (workload.concurrentUsers) {
      factor *= Math.log10(workload.concurrentUsers) / 2.5;
    }
    if (workload.complexity === 'HIGH') {
      factor *= 1.5;
    } else if (workload.complexity === 'MEDIUM') {
      factor *= 1.2;
    }
    
    return Math.max(factor, 1);
  }

  private predictScalability(stack: TechnologyStack, workload: any): string {
    const hasAutoScaling = stack.layers.some(layer =>
      layer.technologies.some(tech =>
        tech.name.toLowerCase().includes('kubernetes') ||
        tech.name.toLowerCase().includes('serverless')
      )
    );
    
    if (hasAutoScaling) {
      return 'Elastic scaling with automatic resource provisioning';
    }
    
    if (workload.concurrentUsers && workload.concurrentUsers > 10000) {
      return 'Horizontal scaling required for high concurrency';
    }
    
    return 'Standard vertical and horizontal scaling';
  }

  private predictReliability(stack: TechnologyStack, historicalData: any[]): number {
    if (historicalData.length === 0) {
      return stack.performanceMetrics.reliability || 0.95;
    }
    
    const avgReliability = historicalData.reduce((sum, data) => 
      sum + (data.performance.reliability || 0.95), 0
    ) / historicalData.length;
    
    return avgReliability;
  }

  private async storePrediction(
    stackId: string,
    workload: any,
    prediction: PerformanceMetrics
  ): Promise<void> {
    const query = `
      MATCH (ts:TechnologyStack {id: $stackId})
      CREATE (pred:PerformancePrediction {
        id: $id,
        stackId: $stackId,
        workload: $workload,
        prediction: $prediction,
        createdAt: $createdAt
      })
      CREATE (ts)-[:HAS_PREDICTION]->(pred)
    `;

    await this.neo4j.executeQuery(query, {
      id: uuidv4(),
      stackId,
      workload: JSON.stringify(workload),
      prediction: JSON.stringify(prediction),
      createdAt: new Date().toISOString(),
    });
  }

  private async searchAlternatives(
    technology: string,
    _criteria?: any
  ): Promise<Technology[]> {
    // Simplified alternative search
    // In production, this would query a technology database
    const alternatives: Technology[] = [
      {
        name: `${technology}-alternative-1`,
        version: 'latest',
        license: 'Open Source',
        maturity: 'MATURE',
        communitySupport: 0.9,
        learningCurve: 'MEDIUM',
      },
      {
        name: `${technology}-alternative-2`,
        version: 'latest',
        license: 'Commercial',
        maturity: 'STABLE',
        communitySupport: 0.7,
        learningCurve: 'LOW',
      },
    ];
    
    return alternatives;
  }

  private scoreAlternative(
    alternative: Technology,
    _original: string,
    _criteria?: any
  ): number {
    let score = 0;
    
    // Score based on maturity
    if (alternative.maturity === 'MATURE') score += 30;
    else if (alternative.maturity === 'STABLE') score += 20;
    
    // Score based on community support
    score += alternative.communitySupport * 25;
    
    // Score based on learning curve
    if (alternative.learningCurve === 'LOW') score += 20;
    else if (alternative.learningCurve === 'MEDIUM') score += 10;
    
    // Score based on license
    if (alternative.license === 'Open Source' || alternative.license === 'MIT') {
      score += 15;
    }
    
    return score;
  }

  private async getStackById(id: string): Promise<TechnologyStack | null> {
    const query = `
      MATCH (ts:TechnologyStack {id: $id})
      RETURN ts
    `;

    const results = await this.neo4j.executeQuery(query, { id });
    if (results.length === 0) return null;
    
    return this.mapToTechnologyStack(results[0].ts);
  }

  private identifyStrengths(stack: TechnologyStack): string[] {
    const strengths: string[] = [];
    
    if (stack.successRate && stack.successRate > 0.8) {
      strengths.push('High success rate in projects');
    }
    
    if (stack.teamExpertise && stack.teamExpertise > 0.7) {
      strengths.push('Strong team expertise available');
    }
    
    if (stack.performanceMetrics.latency && stack.performanceMetrics.latency < 100) {
      strengths.push('Low latency performance');
    }
    
    if (stack.performanceMetrics.scalability) {
      strengths.push('Good scalability characteristics');
    }
    
    return strengths;
  }

  private identifyWeaknesses(stack: TechnologyStack): string[] {
    const weaknesses: string[] = [];
    
    if (stack.successRate && stack.successRate < 0.6) {
      weaknesses.push('Low success rate in projects');
    }
    
    if (stack.teamExpertise && stack.teamExpertise < 0.4) {
      weaknesses.push('Limited team expertise');
    }
    
    // Check for deprecated technologies
    const hasDeprecated = stack.layers.some(layer =>
      layer.technologies.some(tech => tech.maturity === 'DEPRECATED')
    );
    if (hasDeprecated) {
      weaknesses.push('Contains deprecated technologies');
    }
    
    // Check for high learning curve technologies
    const hasHighLearningCurve = stack.layers.some(layer =>
      layer.technologies.some(tech => tech.learningCurve === 'HIGH')
    );
    if (hasHighLearningCurve) {
      weaknesses.push('High learning curve for team adoption');
    }
    
    return weaknesses;
  }

  private calculateOverallScore(stack: TechnologyStack): number {
    let score = 0;
    
    // Success rate component (40% weight)
    score += (stack.successRate || 0) * 40;
    
    // Team expertise component (20% weight)
    score += (stack.teamExpertise || 0) * 20;
    
    // Performance component (25% weight)
    const performanceScore = (
      (stack.performanceMetrics.reliability || 0) +
      (stack.performanceMetrics.maintainability || 0)
    ) / 2;
    score += performanceScore * 25;
    
    // Maturity component (15% weight)
    const maturityScore = stack.layers.reduce((avg, layer) => {
      const layerMaturityScore = layer.technologies.reduce((sum, tech) => {
        switch (tech.maturity) {
          case 'MATURE': return sum + 1;
          case 'STABLE': return sum + 0.8;
          case 'EMERGING': return sum + 0.6;
          case 'EXPERIMENTAL': return sum + 0.3;
          case 'DEPRECATED': return sum + 0.1;
          default: return sum + 0.5;
        }
      }, 0) / layer.technologies.length;
      return avg + layerMaturityScore;
    }, 0) / stack.layers.length;
    
    score += maturityScore * 15;
    
    return Math.min(score, 100); // Cap at 100
  }

  private generateComparisonRecommendations(comparison: any[]): string[] {
    const recommendations: string[] = [];
    
    const topStack = comparison.sort((a, b) => b.overallScore - a.overallScore)[0];
    if (topStack) {
      recommendations.push(`${topStack.name} has the highest overall score (${topStack.overallScore.toFixed(1)})`);
    }
    
    const strongPerformers = comparison.filter(c => c.overallScore > 80);
    if (strongPerformers.length > 1) {
      recommendations.push(`Consider evaluating multiple high-scoring options: ${strongPerformers.map(c => c.name).join(', ')}`);
    }
    
    const riskStacks = comparison.filter(c => c.weaknesses.length > 2);
    if (riskStacks.length > 0) {
      recommendations.push(`Exercise caution with: ${riskStacks.map(c => c.name).join(', ')} due to multiple risk factors`);
    }
    
    return recommendations;
  }

  private mapToTechnologyStack(node: any): TechnologyStack {
    const props = node.properties;
    return {
      id: props.id,
      name: props.name,
      description: props.description,
      layers: JSON.parse(props.layers || '[]'),
      compatibility: JSON.parse(props.compatibility || '{}'),
      performanceMetrics: JSON.parse(props.performanceMetrics || '{}'),
      costEstimate: JSON.parse(props.costEstimate || '{}'),
      teamExpertise: props.teamExpertise,
      successRate: props.successRate,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }
}