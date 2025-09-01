import { Neo4jService } from '../../../../core/database/neo4j';
import { logger } from '../../../../core/logging/logger';
import {
  TechnologyStack,
  Technology,
} from '../../types/architecture.types';

/**
 * Service responsible for technology recommendation logic
 * Extracted from TechnologyStackService to improve maintainability
 */
export class RecommendationService {
  constructor(private neo4j: Neo4jService) {}

  /**
   * Recommend technology stacks based on requirements and constraints
   */
  async recommendTechnologyStacks(
    requirementIds: string[],
    constraints?: {
      budget?: number;
      teamSkills?: string[];
      preferredVendors?: string[];
      excludeTechnologies?: string[];
    }
  ): Promise<{ stack: TechnologyStack; score: number; rationale: string }[]> {
    try {
      // Analyze requirements to determine technology needs
      const requirementAnalysis = await this.analyzeRequirements(requirementIds);
      
      // Find successful stacks from similar projects
      const candidateStacks = await this.findCandidateStacks(
        requirementAnalysis,
        constraints
      );
      
      // Score and rank stacks
      const recommendations = await this.scoreAndRankStacks(
        candidateStacks,
        requirementAnalysis,
        constraints
      );

      return recommendations;
    } catch (error) {
      logger.error('Failed to recommend technology stack', error);
      throw error;
    }
  }

  /**
   * Recommend specific technologies based on requirements and patterns
   */
  async recommendTechnologies(
    requirementIds: string[], 
    patternIds: string[], 
    constraints: string[]
  ): Promise<any[]> {
    // This would implement sophisticated technology recommendation logic
    // For now, return basic technology recommendations
    const stacks = await this.getTopTechnologyStacks({ limit: 3 });
    return stacks.map(stack => ({
      technologyStack: stack,
      suitabilityScore: 0.75,
      alignmentReason: 'Good fit for project requirements and patterns',
      implementationEffort: 40,
      learningCurveImpact: 'MODERATE',
      riskFactors: ['Vendor dependency', 'Technology evolution risk'],
    }));
  }

  /**
   * Generate architectural recommendations based on technology analysis
   */
  async generateArchitecturalRecommendations(
    stackId: string,
    projectRequirements: any
  ): Promise<{
    recommendations: Array<{
      type: 'PERFORMANCE' | 'SCALABILITY' | 'SECURITY' | 'MAINTAINABILITY' | 'COST';
      title: string;
      description: string;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      effort: 'LOW' | 'MEDIUM' | 'HIGH';
      impact: 'HIGH' | 'MEDIUM' | 'LOW';
    }>;
    overallScore: number;
  }> {
    const stack = await this.getStackById(stackId);
    if (!stack) {
      throw new Error('Technology stack not found');
    }

    const recommendations = [];

    // Performance recommendations
    if (projectRequirements.hasRealTime && (!stack.performanceMetrics.latency || stack.performanceMetrics.latency > 100)) {
      recommendations.push({
        type: 'PERFORMANCE' as const,
        title: 'Optimize for Low Latency',
        description: 'Consider implementing caching layers and optimizing database queries for real-time requirements',
        priority: 'HIGH' as const,
        effort: 'MEDIUM' as const,
        impact: 'HIGH' as const,
      });
    }

    // Scalability recommendations
    if (projectRequirements.hasHighVolume) {
      const hasAutoScaling = stack.layers.some(layer =>
        layer.technologies.some(tech =>
          tech.name.toLowerCase().includes('kubernetes') ||
          tech.name.toLowerCase().includes('serverless')
        )
      );
      
      if (!hasAutoScaling) {
        recommendations.push({
          type: 'SCALABILITY' as const,
          title: 'Implement Auto-scaling',
          description: 'Add container orchestration or serverless technologies for automatic scaling',
          priority: 'HIGH' as const,
          effort: 'HIGH' as const,
          impact: 'HIGH' as const,
        });
      }
    }

    // Security recommendations
    if (projectRequirements.hasSecurity || projectRequirements.hasCompliance) {
      recommendations.push({
        type: 'SECURITY' as const,
        title: 'Enhance Security Framework',
        description: 'Implement comprehensive security monitoring and compliance tools',
        priority: 'HIGH' as const,
        effort: 'MEDIUM' as const,
        impact: 'HIGH' as const,
      });
    }

    // Cost optimization recommendations
    const hasExpensiveTech = stack.layers.some(layer =>
      layer.technologies.some(tech => 
        tech.license === 'Commercial' || tech.license === 'Enterprise'
      )
    );

    if (hasExpensiveTech) {
      recommendations.push({
        type: 'COST' as const,
        title: 'Evaluate Open Source Alternatives',
        description: 'Consider open source alternatives for commercial technologies to reduce licensing costs',
        priority: 'MEDIUM' as const,
        effort: 'MEDIUM' as const,
        impact: 'MEDIUM' as const,
      });
    }

    // Maintainability recommendations
    const hasHighComplexity = stack.layers.length > 5;
    if (hasHighComplexity) {
      recommendations.push({
        type: 'MAINTAINABILITY' as const,
        title: 'Simplify Architecture',
        description: 'Consider consolidating technologies to reduce complexity and maintenance burden',
        priority: 'MEDIUM' as const,
        effort: 'HIGH' as const,
        impact: 'HIGH' as const,
      });
    }

    // Calculate overall score based on how well the stack fits the requirements
    const overallScore = this.calculateFitnessScore(stack, projectRequirements);

    return {
      recommendations,
      overallScore,
    };
  }

  /**
   * Compare and recommend between multiple technology options
   */
  async compareAndRecommend(
    stackIds: string[],
    criteria: {
      prioritizePerformance?: boolean;
      prioritizeCost?: boolean;
      prioritizeMaintainability?: boolean;
      teamExpertiseWeight?: number;
    }
  ): Promise<{
    recommendation: TechnologyStack;
    comparison: Array<{
      stack: TechnologyStack;
      score: number;
      pros: string[];
      cons: string[];
    }>;
    reasoning: string;
  }> {
    const stacks = await Promise.all(
      stackIds.map(id => this.getStackById(id))
    );

    const validStacks = stacks.filter(Boolean) as TechnologyStack[];
    
    if (validStacks.length === 0) {
      throw new Error('No valid technology stacks found');
    }

    const comparison = validStacks.map(stack => {
      const score = this.calculateWeightedScore(stack, criteria);
      const pros = this.identifyPros(stack);
      const cons = this.identifyCons(stack);

      return {
        stack,
        score,
        pros,
        cons,
      };
    });

    // Sort by score
    const sortedComparison = comparison.sort((a, b) => b.score - a.score);
    const recommendation = sortedComparison[0].stack;
    const reasoning = this.generateRecommendationReasoning(sortedComparison[0], criteria);

    return {
      recommendation,
      comparison: sortedComparison,
      reasoning,
    };
  }

  // Private helper methods

  private async analyzeRequirements(requirementIds: string[]): Promise<any> {
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

  private async findCandidateStacks(
    _requirementAnalysis: any,
    constraints?: any
  ): Promise<TechnologyStack[]> {
    let query = `
      MATCH (ts:TechnologyStack)
      WHERE ts.successRate > 0.7
    `;

    if (constraints?.budget) {
      query += ` AND ts.costEstimate.monthly <= ${constraints.budget}`;
    }

    query += ` RETURN ts ORDER BY ts.successRate DESC, ts.teamExpertise DESC LIMIT 10`;

    const results = await this.neo4j.executeQuery(query);
    return results.map((r: any) => this.mapToTechnologyStack(r.ts));
  }

  private async scoreAndRankStacks(
    stacks: TechnologyStack[],
    requirementAnalysis: any,
    constraints?: any
  ): Promise<{ stack: TechnologyStack; score: number; rationale: string }[]> {
    const scoredStacks = [];

    for (const stack of stacks) {
      let score = 0;
      const rationale: string[] = [];

      // Score based on success rate
      score += (stack.successRate || 0) * 30;
      if (stack.successRate && stack.successRate > 0.8) {
        rationale.push(`High success rate (${(stack.successRate * 100).toFixed(0)}%)`);
      }

      // Score based on team expertise
      score += (stack.teamExpertise || 0) * 20;
      if (stack.teamExpertise && stack.teamExpertise > 0.7) {
        rationale.push('Strong team expertise available');
      }

      // Score based on performance fit
      if (requirementAnalysis.hasRealTime && stack.performanceMetrics.latency) {
        if (stack.performanceMetrics.latency < 100) {
          score += 20;
          rationale.push('Excellent for real-time requirements');
        }
      }

      // Score based on scalability
      if (requirementAnalysis.hasHighVolume && stack.performanceMetrics.scalability) {
        score += 15;
        rationale.push('Proven scalability');
      }

      // Score based on cost efficiency
      if (constraints?.budget) {
        const costEfficiency = constraints.budget / (stack.costEstimate.monthly || 1);
        score += Math.min(costEfficiency * 10, 15);
        if (costEfficiency > 1.5) {
          rationale.push('Cost-effective solution');
        }
      }

      scoredStacks.push({
        stack,
        score,
        rationale: rationale.join(', '),
      });
    }

    return scoredStacks.sort((a, b) => b.score - a.score);
  }

  private async getTopTechnologyStacks(filters: {
    teamExpertise?: number;
    performanceRequirements?: string;
    limit?: number;
    offset?: number;
  }): Promise<TechnologyStack[]> {
    let query = `
      MATCH (ts:TechnologyStack)
    `;

    const conditions: string[] = [];
    const params: any = {
      limit: filters.limit || 20,
      offset: filters.offset || 0,
    };

    if (filters.teamExpertise) {
      conditions.push('ts.teamExpertise >= $teamExpertise');
      params.teamExpertise = filters.teamExpertise;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += `
      RETURN ts
      ORDER BY ts.successRate DESC, ts.teamExpertise DESC
      SKIP $offset
      LIMIT $limit
    `;

    const results = await this.neo4j.executeQuery(query, params);
    return results.map((result: any) => this.mapToTechnologyStack(result.ts));
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

  private calculateFitnessScore(stack: TechnologyStack, requirements: any): number {
    let score = 60; // Base score

    // Performance fitness
    if (requirements.hasRealTime) {
      if (stack.performanceMetrics.latency && stack.performanceMetrics.latency < 50) {
        score += 15;
      } else if (stack.performanceMetrics.latency && stack.performanceMetrics.latency < 100) {
        score += 10;
      }
    }

    // Scalability fitness
    if (requirements.hasHighVolume) {
      const hasAutoScaling = stack.layers.some(layer =>
        layer.technologies.some(tech =>
          tech.name.toLowerCase().includes('kubernetes') ||
          tech.name.toLowerCase().includes('serverless')
        )
      );
      if (hasAutoScaling) score += 15;
    }

    // Security fitness
    if (requirements.hasSecurity) {
      const hasSecurityTech = stack.layers.some(layer =>
        layer.technologies.some(tech =>
          tech.name.toLowerCase().includes('security') ||
          tech.name.toLowerCase().includes('auth')
        )
      );
      if (hasSecurityTech) score += 10;
    }

    return Math.min(score, 100);
  }

  private calculateWeightedScore(stack: TechnologyStack, criteria: any): number {
    let score = 0;
    let totalWeight = 0;

    // Performance weight
    if (criteria.prioritizePerformance) {
      const perfScore = (stack.performanceMetrics.reliability || 0.5) * 100;
      score += perfScore * 0.4;
      totalWeight += 0.4;
    }

    // Cost weight  
    if (criteria.prioritizeCost) {
      const costScore = Math.max(0, 100 - (stack.costEstimate.monthly || 1000) / 10);
      score += costScore * 0.3;
      totalWeight += 0.3;
    }

    // Maintainability weight
    if (criteria.prioritizeMaintainability) {
      const maintScore = (stack.performanceMetrics.maintainability || 0.5) * 100;
      score += maintScore * 0.2;
      totalWeight += 0.2;
    }

    // Team expertise weight
    const expertiseWeight = criteria.teamExpertiseWeight || 0.1;
    const expertiseScore = (stack.teamExpertise || 0.5) * 100;
    score += expertiseScore * expertiseWeight;
    totalWeight += expertiseWeight;

    return totalWeight > 0 ? score / totalWeight : 50;
  }

  private identifyPros(stack: TechnologyStack): string[] {
    const pros: string[] = [];
    
    if (stack.successRate && stack.successRate > 0.8) {
      pros.push('High success rate in projects');
    }
    
    if (stack.teamExpertise && stack.teamExpertise > 0.7) {
      pros.push('Strong team expertise available');
    }
    
    if (stack.performanceMetrics.latency && stack.performanceMetrics.latency < 100) {
      pros.push('Low latency performance');
    }
    
    if (stack.costEstimate.monthly && stack.costEstimate.monthly < 5000) {
      pros.push('Cost-effective solution');
    }
    
    return pros;
  }

  private identifyCons(stack: TechnologyStack): string[] {
    const cons: string[] = [];
    
    if (stack.successRate && stack.successRate < 0.6) {
      cons.push('Lower success rate in projects');
    }
    
    if (stack.teamExpertise && stack.teamExpertise < 0.4) {
      cons.push('Limited team expertise');
    }
    
    // Check for deprecated technologies
    const hasDeprecated = stack.layers.some(layer =>
      layer.technologies.some(tech => tech.maturity === 'DEPRECATED')
    );
    if (hasDeprecated) {
      cons.push('Contains deprecated technologies');
    }
    
    // Check for high learning curve
    const hasHighLearningCurve = stack.layers.some(layer =>
      layer.technologies.some(tech => tech.learningCurve === 'HIGH')
    );
    if (hasHighLearningCurve) {
      cons.push('High learning curve required');
    }
    
    return cons;
  }

  private generateRecommendationReasoning(topChoice: any, criteria: any): string {
    const reasons: string[] = [];
    
    reasons.push(`Selected due to highest overall score (${topChoice.score.toFixed(1)})`);
    
    if (criteria.prioritizePerformance && topChoice.stack.performanceMetrics.reliability > 0.8) {
      reasons.push('excellent performance metrics');
    }
    
    if (criteria.prioritizeCost && topChoice.stack.costEstimate.monthly < 5000) {
      reasons.push('cost-effective pricing');
    }
    
    if (topChoice.stack.successRate > 0.8) {
      reasons.push('proven track record');
    }
    
    return reasons.join(', ');
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