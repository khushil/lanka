"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TechnologyStackService = void 0;
const uuid_1 = require("uuid");
const logger_1 = require("../../../core/logging/logger");
class TechnologyStackService {
    neo4j;
    constructor(neo4j) {
        this.neo4j = neo4j;
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
        try {
            // Analyze requirements to determine technology needs
            const requirementAnalysis = await this.analyzeRequirements(requirementIds);
            // Find successful stacks from similar projects
            const candidateStacks = await this.findCandidateStacks(requirementAnalysis, constraints);
            // Score and rank stacks
            const recommendations = await this.scoreAndRankStacks(candidateStacks, requirementAnalysis, constraints);
            return recommendations;
        }
        catch (error) {
            logger_1.logger.error('Failed to recommend technology stack', error);
            throw error;
        }
    }
    async evaluateStackCompatibility(stackId, existingTechnologies) {
        const stack = await this.getTechnologyStackById(stackId);
        if (!stack) {
            throw new Error('Technology stack not found');
        }
        const issues = [];
        const recommendations = [];
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
    async predictPerformance(stackId, workloadCharacteristics) {
        const stack = await this.getTechnologyStackById(stackId);
        if (!stack) {
            throw new Error('Technology stack not found');
        }
        // Get historical performance data for similar stacks
        const historicalData = await this.getHistoricalPerformance(stackId);
        // Calculate predicted performance based on workload
        const baseMetrics = stack.performanceMetrics;
        const workloadFactor = this.calculateWorkloadFactor(workloadCharacteristics);
        const predictedMetrics = {
            throughput: (baseMetrics.throughput || 1000) / workloadFactor,
            latency: (baseMetrics.latency || 100) * workloadFactor,
            scalability: this.predictScalability(stack, workloadCharacteristics),
            reliability: this.predictReliability(stack, historicalData),
            maintainability: baseMetrics.maintainability || 0.8,
        };
        // Store prediction for future learning
        await this.storePrediction(stackId, workloadCharacteristics, predictedMetrics);
        return predictedMetrics;
    }
    async calculateTCO(stackId, duration = 36, // months
    scaling) {
        const stack = await this.getTechnologyStackById(stackId);
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
        const recommendations = this.generateCostOptimizationRecommendations(stack, { licensing, infrastructure, personnel, training, maintenance, opportunity });
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
    async analyzeRequirements(requirementIds) {
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
    async findCandidateStacks(_requirementAnalysis, constraints) {
        let query = `
      MATCH (ts:TechnologyStack)
      WHERE ts.successRate > 0.7
    `;
        if (constraints?.budget) {
            query += ` AND ts.costEstimate.monthly <= ${constraints.budget}`;
        }
        query += ` RETURN ts ORDER BY ts.successRate DESC, ts.teamExpertise DESC LIMIT 10`;
        const results = await this.neo4j.executeQuery(query);
        return results.map((r) => this.mapToTechnologyStack(r.ts));
    }
    async scoreAndRankStacks(stacks, requirementAnalysis, constraints) {
        const scoredStacks = [];
        for (const stack of stacks) {
            let score = 0;
            const rationale = [];
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
    async checkVersionCompatibility(stack, existingTechnologies) {
        const issues = [];
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
    async getHistoricalPerformance(stackId) {
        const query = `
      MATCH (ts:TechnologyStack {id: $stackId})
      MATCH (p:Project)-[used:USED_STACK]->(ts)
      RETURN used.performanceAchieved as performance, p.name as projectName
      ORDER BY used.trackedAt DESC
      LIMIT 10
    `;
        const results = await this.neo4j.executeQuery(query, { stackId });
        return results.map((r) => ({
            performance: JSON.parse(r.performance || '{}'),
            projectName: r.projectName,
        }));
    }
    calculateWorkloadFactor(workload) {
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
        }
        else if (workload.complexity === 'MEDIUM') {
            factor *= 1.2;
        }
        return Math.max(factor, 1);
    }
    predictScalability(stack, workload) {
        const hasAutoScaling = stack.layers.some(layer => layer.technologies.some(tech => tech.name.toLowerCase().includes('kubernetes') ||
            tech.name.toLowerCase().includes('serverless')));
        if (hasAutoScaling) {
            return 'Elastic scaling with automatic resource provisioning';
        }
        if (workload.concurrentUsers && workload.concurrentUsers > 10000) {
            return 'Horizontal scaling required for high concurrency';
        }
        return 'Standard vertical and horizontal scaling';
    }
    predictReliability(stack, historicalData) {
        if (historicalData.length === 0) {
            return stack.performanceMetrics.reliability || 0.95;
        }
        const avgReliability = historicalData.reduce((sum, data) => sum + (data.performance.reliability || 0.95), 0) / historicalData.length;
        return avgReliability;
    }
    async storePrediction(stackId, workload, prediction) {
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
            id: (0, uuid_1.v4)(),
            stackId,
            workload: JSON.stringify(workload),
            prediction: JSON.stringify(prediction),
            createdAt: new Date().toISOString(),
        });
    }
    calculateLicensingCosts(stack, duration) {
        let totalLicensing = 0;
        stack.layers.forEach(layer => {
            layer.technologies.forEach(tech => {
                if (tech.license !== 'Open Source' && tech.license !== 'MIT' && tech.license !== 'Apache') {
                    // Estimate commercial licensing costs
                    totalLicensing += 500 * duration; // Simplified estimation
                }
            });
        });
        return totalLicensing;
    }
    async calculatePersonnelCosts(stack, duration) {
        // Estimate based on learning curve and team size
        const avgSalary = 120000 / 12; // Monthly
        const teamSize = 5; // Assumed team size
        let personnelCost = avgSalary * teamSize * duration;
        // Adjust for learning curve
        const hasHighLearningCurve = stack.layers.some(layer => layer.technologies.some(tech => tech.learningCurve === 'HIGH'));
        if (hasHighLearningCurve) {
            personnelCost *= 1.2; // 20% increase for training time
        }
        return personnelCost;
    }
    async calculateTrainingCosts(stack) {
        let trainingCost = 0;
        stack.layers.forEach(layer => {
            layer.technologies.forEach(tech => {
                if (tech.learningCurve === 'HIGH') {
                    trainingCost += 5000; // Per technology training cost
                }
                else if (tech.learningCurve === 'MEDIUM') {
                    trainingCost += 2000;
                }
            });
        });
        return trainingCost;
    }
    async calculateOpportunityCost(stack, duration) {
        // Opportunity cost of not choosing alternative solutions
        // Simplified calculation based on potential efficiency gains
        const baseOpportunityCost = 1000 * duration;
        // Reduce opportunity cost for mature, proven stacks
        const maturityFactor = stack.layers.every(layer => layer.technologies.every(tech => tech.maturity === 'MATURE')) ? 0.5 : 1;
        return baseOpportunityCost * maturityFactor;
    }
    generateCostOptimizationRecommendations(stack, breakdown) {
        const recommendations = [];
        if (breakdown.licensing > breakdown.infrastructure) {
            recommendations.push('Consider open-source alternatives to reduce licensing costs');
        }
        if (breakdown.personnel > breakdown.infrastructure * 2) {
            recommendations.push('Invest in automation and tooling to reduce personnel costs');
        }
        if (breakdown.training > 10000) {
            recommendations.push('Consider technologies with lower learning curves or existing team expertise');
        }
        const hasCloud = stack.layers.some(layer => layer.technologies.some(tech => tech.name.toLowerCase().includes('cloud') ||
            tech.name.toLowerCase().includes('aws') ||
            tech.name.toLowerCase().includes('azure')));
        if (hasCloud) {
            recommendations.push('Implement auto-scaling and reserved instances for cloud cost optimization');
        }
        return recommendations;
    }
    async searchAlternatives(technology, _criteria) {
        // Simplified alternative search
        // In production, this would query a technology database
        const alternatives = [
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
    scoreAlternative(alternative, _original, _criteria) {
        let score = 0;
        // Score based on maturity
        if (alternative.maturity === 'MATURE')
            score += 30;
        else if (alternative.maturity === 'STABLE')
            score += 20;
        // Score based on community support
        score += alternative.communitySupport * 25;
        // Score based on learning curve
        if (alternative.learningCurve === 'LOW')
            score += 20;
        else if (alternative.learningCurve === 'MEDIUM')
            score += 10;
        // Score based on license
        if (alternative.license === 'Open Source' || alternative.license === 'MIT') {
            score += 15;
        }
        return score;
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
        // This would implement sophisticated technology recommendation logic
        // For now, return basic technology recommendations
        const stacks = await this.getTechnologyStacks({ limit: 3 });
        return stacks.map(stack => ({
            technologyStack: stack,
            suitabilityScore: 0.75,
            alignmentReason: 'Good fit for project requirements and patterns',
            implementationEffort: 40,
            learningCurveImpact: 'MODERATE',
            riskFactors: ['Vendor dependency', 'Technology evolution risk'],
        }));
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