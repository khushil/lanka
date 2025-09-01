import { v4 as uuidv4 } from 'uuid';
import { Neo4jService } from '../../../../core/database/neo4j';
import { logger } from '../../../../core/logging/logger';
import {
  TechnologyStack,
  CostEstimate,
  PerformanceMetrics,
} from '../../types/architecture.types';

/**
 * Service responsible for cost calculation logic
 * Extracted from TechnologyStackService to improve maintainability
 */
export class CostCalculationService {
  constructor(private neo4j: Neo4jService) {}

  /**
   * Calculate Total Cost of Ownership (TCO) for a technology stack
   */
  async calculateTCO(
    stackId: string,
    duration: number = 36, // months
    scaling?: {
      growthRate: number; // percentage per year
      peakFactor: number; // peak load multiplier
    }
  ): Promise<{
    total: number;
    breakdown: {
      licensing: number;
      infrastructure: number;
      personnel: number;
      training: number;
      maintenance: number;
      opportunity: number;
    };
    monthlyAverage: number;
    recommendations: string[];
  }> {
    const stack = await this.getStackById(stackId);
    if (!stack) {
      throw new Error('Technology stack not found');
    }

    const baseCost = stack.costEstimate;
    const growthFactor = scaling ? Math.pow(1 + scaling.growthRate / 100, duration / 12) : 1;
    
    // Calculate different cost components
    const licensing = this.calculateLicensingCosts(stack, duration);
    const infrastructure = baseCost.monthly * duration * growthFactor;
    const personnel = await this.calculatePersonnelCosts(stack, duration);
    const training = await this.calculateTrainingCosts(stack);
    const maintenance = infrastructure * 0.2; // 20% of infrastructure for maintenance
    const opportunity = await this.calculateOpportunityCost(stack, duration);
    
    const total = licensing + infrastructure + personnel + training + maintenance + opportunity;
    
    const recommendations = this.generateCostOptimizationRecommendations(
      stack,
      { licensing, infrastructure, personnel, training, maintenance, opportunity }
    );

    return {
      total,
      breakdown: {
        licensing,
        infrastructure,
        personnel,
        training,
        maintenance,
        opportunity,
      },
      monthlyAverage: total / duration,
      recommendations,
    };
  }

  /**
   * Compare costs between multiple technology stacks
   */
  async compareCosts(
    stackIds: string[],
    duration: number = 36,
    scaling?: {
      growthRate: number;
      peakFactor: number;
    }
  ): Promise<{
    comparison: Array<{
      stackId: string;
      name: string;
      totalCost: number;
      monthlyAverage: number;
      costRank: number;
    }>;
    recommendations: string[];
    savings: {
      cheapest: string;
      mostExpensive: string;
      potentialSavings: number;
    };
  }> {
    const costAnalyses = await Promise.all(
      stackIds.map(async (stackId) => {
        const analysis = await this.calculateTCO(stackId, duration, scaling);
        const stack = await this.getStackById(stackId);
        return {
          stackId,
          name: stack?.name || 'Unknown',
          analysis,
        };
      })
    );

    // Sort by total cost
    const sortedByPrice = costAnalyses.sort((a, b) => a.analysis.total - b.analysis.total);
    
    const comparison = sortedByPrice.map((item, index) => ({
      stackId: item.stackId,
      name: item.name,
      totalCost: item.analysis.total,
      monthlyAverage: item.analysis.monthlyAverage,
      costRank: index + 1,
    }));

    const recommendations = this.generateCostComparisonRecommendations(sortedByPrice);

    const cheapest = sortedByPrice[0];
    const mostExpensive = sortedByPrice[sortedByPrice.length - 1];
    const potentialSavings = mostExpensive.analysis.total - cheapest.analysis.total;

    return {
      comparison,
      recommendations,
      savings: {
        cheapest: cheapest.name,
        mostExpensive: mostExpensive.name,
        potentialSavings,
      },
    };
  }

  /**
   * Estimate cost impact of scaling scenarios
   */
  async estimateScalingCosts(
    stackId: string,
    scenarios: Array<{
      name: string;
      userGrowth: number; // percentage increase
      dataGrowth: number; // percentage increase
      performanceRequirements: 'MAINTAIN' | 'IMPROVE';
      duration: number; // months
    }>
  ): Promise<{
    scenarios: Array<{
      name: string;
      estimatedCost: number;
      costIncrease: number;
      recommendations: string[];
    }>;
    optimalScenario: string;
  }> {
    const baseStack = await this.getStackById(stackId);
    if (!baseStack) {
      throw new Error('Technology stack not found');
    }

    const scenarioAnalyses = [];

    for (const scenario of scenarios) {
      const scalingFactor = Math.max(
        1 + scenario.userGrowth / 100,
        1 + scenario.dataGrowth / 100
      );

      const performanceFactor = scenario.performanceRequirements === 'IMPROVE' ? 1.3 : 1;
      const totalScalingFactor = scalingFactor * performanceFactor;

      const baseTCO = await this.calculateTCO(stackId, scenario.duration);
      const scaledCost = baseTCO.total * totalScalingFactor;
      const costIncrease = scaledCost - baseTCO.total;

      const recommendations = this.generateScalingRecommendations(
        baseStack,
        scenario,
        scalingFactor
      );

      scenarioAnalyses.push({
        name: scenario.name,
        estimatedCost: scaledCost,
        costIncrease,
        recommendations,
      });
    }

    // Find optimal scenario (best value for performance)
    const optimalScenario = scenarioAnalyses.reduce((optimal, current) => {
      const optimalValue = optimal.costIncrease / optimal.estimatedCost;
      const currentValue = current.costIncrease / current.estimatedCost;
      return currentValue < optimalValue ? current : optimal;
    });

    return {
      scenarios: scenarioAnalyses,
      optimalScenario: optimalScenario.name,
    };
  }

  /**
   * Track actual costs vs estimated costs for learning
   */
  async trackActualCosts(
    stackId: string,
    projectId: string,
    actualCosts: {
      licensing: number;
      infrastructure: number;
      personnel: number;
      training: number;
      maintenance: number;
      total: number;
      duration: number;
    }
  ): Promise<void> {
    const query = `
      MATCH (ts:TechnologyStack {id: $stackId})
      MATCH (p:Project {id: $projectId})
      CREATE (cost:ActualCost {
        id: $id,
        stackId: $stackId,
        projectId: $projectId,
        licensing: $licensing,
        infrastructure: $infrastructure,
        personnel: $personnel,
        training: $training,
        maintenance: $maintenance,
        total: $total,
        duration: $duration,
        trackedAt: $trackedAt
      })
      CREATE (ts)-[:HAS_ACTUAL_COST]->(cost)
      CREATE (p)-[:INCURRED_COST]->(cost)
    `;

    await this.neo4j.executeQuery(query, {
      id: uuidv4(),
      stackId,
      projectId,
      ...actualCosts,
      trackedAt: new Date().toISOString(),
    });

    logger.info(`Tracked actual costs for stack ${stackId} in project ${projectId}`);
  }

  // Private helper methods

  private calculateLicensingCosts(stack: TechnologyStack, duration: number): number {
    let totalLicensing = 0;
    
    stack.layers.forEach(layer => {
      layer.technologies.forEach(tech => {
        if (tech.license !== 'Open Source' && tech.license !== 'MIT' && tech.license !== 'Apache') {
          // Estimate commercial licensing costs based on technology type
          const baseCost = this.estimateLicenseCost(tech.name, tech.license);
          totalLicensing += baseCost * duration;
        }
      });
    });
    
    return totalLicensing;
  }

  private async calculatePersonnelCosts(stack: TechnologyStack, duration: number): Promise<number> {
    // Estimate based on learning curve and team size
    const avgSalary = 120000 / 12; // Monthly developer salary
    const teamSize = 5; // Assumed team size
    
    let personnelCost = avgSalary * teamSize * duration;
    
    // Adjust for learning curve
    const learningCurveMultiplier = this.calculateLearningCurveMultiplier(stack);
    personnelCost *= learningCurveMultiplier;
    
    return personnelCost;
  }

  private async calculateTrainingCosts(stack: TechnologyStack): Promise<number> {
    let trainingCost = 0;
    
    stack.layers.forEach(layer => {
      layer.technologies.forEach(tech => {
        const techTrainingCost = this.estimateTrainingCost(tech.name, tech.learningCurve);
        trainingCost += techTrainingCost;
      });
    });
    
    return trainingCost;
  }

  private async calculateOpportunityCost(stack: TechnologyStack, duration: number): Promise<number> {
    // Opportunity cost of not choosing alternative solutions
    const baseOpportunityCost = 1000 * duration;
    
    // Reduce opportunity cost for mature, proven stacks
    const maturityFactor = stack.layers.every(layer =>
      layer.technologies.every(tech => tech.maturity === 'MATURE')
    ) ? 0.5 : 1;
    
    // Increase opportunity cost for stacks with vendor lock-in
    const lockInFactor = this.hasVendorLockIn(stack) ? 1.5 : 1;
    
    return baseOpportunityCost * maturityFactor * lockInFactor;
  }

  private generateCostOptimizationRecommendations(
    stack: TechnologyStack,
    breakdown: any
  ): string[] {
    const recommendations: string[] = [];
    
    if (breakdown.licensing > breakdown.infrastructure) {
      recommendations.push('Consider open-source alternatives to reduce licensing costs');
    }
    
    if (breakdown.personnel > breakdown.infrastructure * 2) {
      recommendations.push('Invest in automation and tooling to reduce personnel costs');
    }
    
    if (breakdown.training > 10000) {
      recommendations.push('Consider technologies with lower learning curves or existing team expertise');
    }
    
    const hasCloud = this.hasCloudTechnologies(stack);
    if (hasCloud) {
      recommendations.push('Implement auto-scaling and reserved instances for cloud cost optimization');
    }
    
    if (breakdown.opportunity > breakdown.total * 0.2) {
      recommendations.push('Consider more mature and proven technology alternatives');
    }
    
    return recommendations;
  }

  private generateCostComparisonRecommendations(sortedAnalyses: any[]): string[] {
    const recommendations: string[] = [];
    
    const cheapest = sortedAnalyses[0];
    const mostExpensive = sortedAnalyses[sortedAnalyses.length - 1];
    
    recommendations.push(`${cheapest.name} offers the most cost-effective solution`);
    
    if (mostExpensive.analysis.total > cheapest.analysis.total * 2) {
      recommendations.push(`${mostExpensive.name} costs ${((mostExpensive.analysis.total / cheapest.analysis.total) * 100).toFixed(0)}% more than the cheapest option`);
    }
    
    // Find stacks with high training costs
    const highTrainingStacks = sortedAnalyses.filter(
      s => s.analysis.breakdown.training > 15000
    );
    
    if (highTrainingStacks.length > 0) {
      recommendations.push(`Consider training costs for: ${highTrainingStacks.map(s => s.name).join(', ')}`);
    }
    
    return recommendations;
  }

  private generateScalingRecommendations(
    stack: TechnologyStack,
    scenario: any,
    scalingFactor: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (scalingFactor > 2) {
      recommendations.push('Consider microservices architecture for better scalability');
    }
    
    if (scenario.dataGrowth > 200) {
      recommendations.push('Implement data partitioning and caching strategies');
    }
    
    if (scenario.userGrowth > 300 && !this.hasAutoScaling(stack)) {
      recommendations.push('Add container orchestration for automatic scaling');
    }
    
    return recommendations;
  }

  private estimateLicenseCost(techName: string, license: string): number {
    // Simplified cost estimation based on technology type and license
    const baseCosts: { [key: string]: number } = {
      'database': 500,
      'middleware': 300,
      'application-server': 400,
      'monitoring': 200,
      'security': 600,
    };

    const techType = this.categorizeTechnology(techName);
    const baseCost = baseCosts[techType] || 300;

    // Adjust based on license type
    switch (license) {
      case 'Enterprise': return baseCost * 2;
      case 'Commercial': return baseCost * 1.5;
      case 'Professional': return baseCost;
      default: return baseCost * 0.8;
    }
  }

  private estimateTrainingCost(techName: string, learningCurve: string): number {
    const baseCosts = {
      'HIGH': 8000,
      'MEDIUM': 3000,
      'LOW': 1000,
    };

    return baseCosts[learningCurve as keyof typeof baseCosts] || 3000;
  }

  private calculateLearningCurveMultiplier(stack: TechnologyStack): number {
    let multiplier = 1;
    
    const hasHighLearningCurve = stack.layers.some(layer =>
      layer.technologies.some(tech => tech.learningCurve === 'HIGH')
    );
    
    if (hasHighLearningCurve) {
      multiplier *= 1.3; // 30% increase for steep learning curves
    }

    const newTechCount = stack.layers.reduce((count, layer) => 
      count + layer.technologies.filter(tech => tech.maturity === 'EMERGING' || tech.maturity === 'EXPERIMENTAL').length
    , 0);

    if (newTechCount > 2) {
      multiplier *= 1.2; // 20% increase for multiple new technologies
    }
    
    return multiplier;
  }

  private hasVendorLockIn(stack: TechnologyStack): boolean {
    return stack.layers.some(layer =>
      layer.technologies.some(tech =>
        tech.name.toLowerCase().includes('aws') ||
        tech.name.toLowerCase().includes('azure') ||
        tech.name.toLowerCase().includes('oracle') ||
        tech.license === 'Proprietary'
      )
    );
  }

  private hasCloudTechnologies(stack: TechnologyStack): boolean {
    return stack.layers.some(layer =>
      layer.technologies.some(tech =>
        tech.name.toLowerCase().includes('cloud') ||
        tech.name.toLowerCase().includes('aws') ||
        tech.name.toLowerCase().includes('azure') ||
        tech.name.toLowerCase().includes('gcp')
      )
    );
  }

  private hasAutoScaling(stack: TechnologyStack): boolean {
    return stack.layers.some(layer =>
      layer.technologies.some(tech =>
        tech.name.toLowerCase().includes('kubernetes') ||
        tech.name.toLowerCase().includes('serverless') ||
        tech.name.toLowerCase().includes('auto-scale')
      )
    );
  }

  private categorizeTechnology(techName: string): string {
    const name = techName.toLowerCase();
    
    if (name.includes('database') || name.includes('sql') || name.includes('nosql')) {
      return 'database';
    }
    if (name.includes('server') || name.includes('tomcat') || name.includes('jetty')) {
      return 'application-server';
    }
    if (name.includes('monitor') || name.includes('metric') || name.includes('log')) {
      return 'monitoring';
    }
    if (name.includes('security') || name.includes('auth') || name.includes('crypto')) {
      return 'security';
    }
    
    return 'middleware';
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