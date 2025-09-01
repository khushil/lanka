"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TechnologyStackService = void 0;
const uuid_1 = require("uuid");
const logger_1 = require("../../../core/logging/logger");
const analysis_service_1 = require("./technology-stack/analysis.service");
const recommendation_service_1 = require("./technology-stack/recommendation.service");
const cost_calculation_service_1 = require("./technology-stack/cost-calculation.service");
/**
 * Refactored TechnologyStackService - Core orchestration logic only
 * Analysis, recommendation, and cost calculation logic extracted to separate services
 * Now maintains single responsibility principle with < 300 lines
 */
class TechnologyStackService {
    neo4j;
    analysisService;
    recommendationService;
    costCalculationService;
    constructor(neo4j) {
        this.neo4j = neo4j;
        this.analysisService = new analysis_service_1.TechnologyAnalysisService(neo4j);
        this.recommendationService = new recommendation_service_1.RecommendationService(neo4j);
        this.costCalculationService = new cost_calculation_service_1.CostCalculationService(neo4j);
    }
    async createTechnologyStack(input) {
        try {
            const stack = {
                id: (0, uuid_1.v4)(),
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
            logger_1.logger.info(`Created technology stack: ${stack.id}`);
            return stack;
        }
        catch (error) {
            logger_1.logger.error('Failed to create technology stack', error);
            throw error;
        }
    }
    async recommendTechnologyStack(requirementIds, constraints) {
        return this.recommendationService.recommendTechnologyStacks(requirementIds, constraints);
    }
    async evaluateStackCompatibility(stackId, existingTechnologies) {
        const stack = await this.getTechnologyStackById(stackId);
        if (!stack) {
            throw new Error('Technology stack not found');
        }
        return this.analysisService.evaluateStackCompatibility(stack, existingTechnologies);
    }
    async predictPerformance(stackId, workloadCharacteristics) {
        const stack = await this.getTechnologyStackById(stackId);
        if (!stack) {
            throw new Error('Technology stack not found');
        }
        return this.analysisService.predictPerformance(stack, workloadCharacteristics);
    }
    async calculateTCO(stackId, duration = 36, // months
    scaling) {
        return this.costCalculationService.calculateTCO(stackId, duration, scaling);
    }
    async trackStackSuccess(stackId, projectId, metrics) {
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
        logger_1.logger.info(`Tracked success metrics for stack ${stackId} in project ${projectId}`);
    }
    async findAlternativeTechnologies(technology, criteria) {
        return this.analysisService.findAlternativeTechnologies(technology, criteria);
    }
    async getTechnologyStacks(filters) {
        let query = `
      MATCH (ts:TechnologyStack)
    `;
        const conditions = [];
        const params = {
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
        return results.map((result) => this.mapToTechnologyStack(result.ts));
    }
    async updateTechnologyStack(id, input) {
        const updateFields = {
            updatedAt: new Date().toISOString(),
        };
        if (input.name)
            updateFields.name = input.name;
        if (input.description)
            updateFields.description = input.description;
        if (input.layers)
            updateFields.layers = JSON.stringify(input.layers);
        if (input.compatibility)
            updateFields.compatibility = JSON.stringify(input.compatibility);
        if (input.performanceMetrics)
            updateFields.performanceMetrics = JSON.stringify(input.performanceMetrics);
        if (input.costEstimate)
            updateFields.costEstimate = JSON.stringify(input.costEstimate);
        if (input.teamExpertise !== undefined)
            updateFields.teamExpertise = input.teamExpertise;
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
        if (results.length === 0)
            return null;
        return this.mapToTechnologyStack(results[0].ts);
    }
    async recommendTechnologies(requirementIds, patternIds, constraints) {
        return this.recommendationService.recommendTechnologies(requirementIds, patternIds, constraints);
    }
    async getTechnologyStackById(stackId) {
        const query = `
      MATCH (ts:TechnologyStack {id: $stackId})
      RETURN ts
    `;
        const results = await this.neo4j.executeQuery(query, { stackId });
        if (results.length === 0)
            return null;
        return this.mapToTechnologyStack(results[0].ts);
    }
    mapToTechnologyStack(node) {
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
exports.TechnologyStackService = TechnologyStackService;
//# sourceMappingURL=technology-stack.service.js.map