import { v4 as uuidv4 } from 'uuid';
import { Neo4jService } from '../../../core/database/neo4j';
import { logger } from '../../../core/logging/logger';
import {
  TechnologyStack,
  TechnologyLayer,
  Technology,
  CompatibilityMatrix,
  PerformanceMetrics,
  CostEstimate,
} from '../types/architecture.types';
import { TechnologyAnalysisService } from './technology-stack/analysis.service';
import { RecommendationService } from './technology-stack/recommendation.service';
import { CostCalculationService } from './technology-stack/cost-calculation.service';

/**
 * Refactored TechnologyStackService - Core orchestration logic only
 * Analysis, recommendation, and cost calculation logic extracted to separate services
 * Now maintains single responsibility principle with < 300 lines
 */
export class TechnologyStackService {
  private analysisService: TechnologyAnalysisService;
  private recommendationService: RecommendationService;
  private costCalculationService: CostCalculationService;

  constructor(private neo4j: Neo4jService) {
    this.analysisService = new TechnologyAnalysisService(neo4j);
    this.recommendationService = new RecommendationService(neo4j);
    this.costCalculationService = new CostCalculationService(neo4j);
  }

  async createTechnologyStack(input: {
    name: string;
    description: string;
    layers: TechnologyLayer[];
    compatibility?: CompatibilityMatrix;
    performanceMetrics?: PerformanceMetrics;
    costEstimate?: CostEstimate;
  }): Promise<TechnologyStack> {
    try {
      const stack: TechnologyStack = {
        id: uuidv4(),
        name: input.name,
        description: input.description,
        layers: input.layers,
        compatibility: input.compatibility || {
          compatible: [],
          incompatible: [],
          requires: {},
        },
        performanceMetrics: input.performanceMetrics || {},
        costEstimate: input.costEstimate || {
          upfront: 0,
          monthly: 0,
          yearly: 0,
          currency: 'USD',
          breakdown: [],
        },
        createdAt: new Date().toISOString(),
      };

      const query = `
        CREATE (ts:TechnologyStack {
          id: $id,
          name: $name,
          description: $description,
          layers: $layers,
          compatibility: $compatibility,
          performanceMetrics: $performanceMetrics,
          costEstimate: $costEstimate,
          teamExpertise: 0,
          successRate: 0,
          createdAt: $createdAt
        })
        RETURN ts
      `;

      await this.neo4j.executeQuery(query, {
        ...stack,
        layers: JSON.stringify(stack.layers),
        compatibility: JSON.stringify(stack.compatibility),
        performanceMetrics: JSON.stringify(stack.performanceMetrics),
        costEstimate: JSON.stringify(stack.costEstimate),
      });

      logger.info(`Created technology stack: ${stack.id}`);
      return stack;
    } catch (error) {
      logger.error('Failed to create technology stack', error);
      throw error;
    }
  }

  async recommendTechnologyStack(
    requirementIds: string[],
    constraints?: {
      budget?: number;
      teamSkills?: string[];
      preferredVendors?: string[];
      excludeTechnologies?: string[];
    }
  ): Promise<{ stack: TechnologyStack; score: number; rationale: string }[]> {
    return this.recommendationService.recommendTechnologyStacks(requirementIds, constraints);
  }

  async evaluateStackCompatibility(
    stackId: string,
    existingTechnologies: string[]
  ): Promise<{
    compatible: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const stack = await this.getTechnologyStackById(stackId);
    if (!stack) {
      throw new Error('Technology stack not found');
    }

    return this.analysisService.evaluateStackCompatibility(stack, existingTechnologies);
  }

  async predictPerformance(
    stackId: string,
    workloadCharacteristics: {
      requestsPerSecond?: number;
      dataVolumeGB?: number;
      concurrentUsers?: number;
      complexity?: 'LOW' | 'MEDIUM' | 'HIGH';
    }
  ): Promise<PerformanceMetrics> {
    const stack = await this.getTechnologyStackById(stackId);
    if (!stack) {
      throw new Error('Technology stack not found');
    }

    return this.analysisService.predictPerformance(stack, workloadCharacteristics);
  }

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
    return this.costCalculationService.calculateTCO(stackId, duration, scaling);
  }

  async trackStackSuccess(
    stackId: string,
    projectId: string,
    metrics: {
      implementationTime: number;
      defectRate: number;
      performanceAchieved: PerformanceMetrics;
      teamSatisfaction: number;
      actualCost: CostEstimate;
    }
  ): Promise<void> {
    const query = `
      MATCH (ts:TechnologyStack {id: $stackId})
      MATCH (p:Project {id: $projectId})
      CREATE (p)-[:USED_STACK {
        implementationTime: $implementationTime,
        defectRate: $defectRate,
        performanceAchieved: $performanceAchieved,
        teamSatisfaction: $teamSatisfaction,
        actualCost: $actualCost,
        trackedAt: $trackedAt
      }]->(ts)
      
      WITH ts, $teamSatisfaction as satisfaction, $defectRate as defects
      SET ts.successRate = CASE
        WHEN ts.successRate = 0 THEN satisfaction
        ELSE (ts.successRate + satisfaction) / 2
      END,
      ts.teamExpertise = ts.teamExpertise + 0.1,
      ts.updatedAt = $trackedAt
    `;

    await this.neo4j.executeQuery(query, {
      stackId,
      projectId,
      ...metrics,
      performanceAchieved: JSON.stringify(metrics.performanceAchieved),
      actualCost: JSON.stringify(metrics.actualCost),
      trackedAt: new Date().toISOString(),
    });

    logger.info(`Tracked success metrics for stack ${stackId} in project ${projectId}`);
  }

  async findAlternativeTechnologies(
    technology: string,
    criteria?: {
      maxCost?: number;
      minMaturity?: string;
      requiredFeatures?: string[];
    }
  ): Promise<Technology[]> {
    return this.analysisService.findAlternativeTechnologies(technology, criteria);
  }

  async getTechnologyStacks(filters: {
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

  async updateTechnologyStack(id: string, input: {
    name?: string;
    description?: string;
    layers?: TechnologyLayer[];
    compatibility?: CompatibilityMatrix;
    performanceMetrics?: PerformanceMetrics;
    costEstimate?: CostEstimate;
    teamExpertise?: number;
  }): Promise<TechnologyStack | null> {
    const updateFields: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (input.name) updateFields.name = input.name;
    if (input.description) updateFields.description = input.description;
    if (input.layers) updateFields.layers = JSON.stringify(input.layers);
    if (input.compatibility) updateFields.compatibility = JSON.stringify(input.compatibility);
    if (input.performanceMetrics) updateFields.performanceMetrics = JSON.stringify(input.performanceMetrics);
    if (input.costEstimate) updateFields.costEstimate = JSON.stringify(input.costEstimate);
    if (input.teamExpertise !== undefined) updateFields.teamExpertise = input.teamExpertise;

    const setClause = Object.keys(updateFields)
      .map(key => `ts.${key} = $${key}`)
      .join(', ');

    const query = `
      MATCH (ts:TechnologyStack {id: $id})
      SET ${setClause}
      RETURN ts
    `;

    const results = await this.neo4j.executeQuery(query, {
      id,
      ...updateFields,
    });

    if (results.length === 0) return null;
    return this.mapToTechnologyStack(results[0].ts);
  }

  async recommendTechnologies(requirementIds: string[], patternIds: string[], constraints: string[]): Promise<any[]> {
    return this.recommendationService.recommendTechnologies(requirementIds, patternIds, constraints);
  }

  public async getTechnologyStackById(stackId: string): Promise<TechnologyStack | null> {
    const query = `
      MATCH (ts:TechnologyStack {id: $stackId})
      RETURN ts
    `;

    const results = await this.neo4j.executeQuery(query, { stackId });
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