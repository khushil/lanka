"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchitecturePatternService = void 0;
const uuid_1 = require("uuid");
const logger_1 = require("../../../core/logging/logger");
class ArchitecturePatternService {
    neo4j;
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async createPattern(input) {
        try {
            const pattern = {
                id: (0, uuid_1.v4)(),
                name: input.name,
                type: input.type,
                description: input.description,
                applicabilityConditions: input.applicabilityConditions,
                components: input.components,
                qualityAttributes: input.qualityAttributes,
                knownUses: input.knownUses || [],
                successRate: 0,
                adoptionCount: 0,
                createdAt: new Date().toISOString(),
            };
            const query = `
        CREATE (ap:ArchitecturePattern {
          id: $id,
          name: $name,
          type: $type,
          description: $description,
          applicabilityConditions: $applicabilityConditions,
          components: $components,
          qualityAttributes: $qualityAttributes,
          knownUses: $knownUses,
          successRate: $successRate,
          adoptionCount: $adoptionCount,
          createdAt: $createdAt
        })
        RETURN ap
      `;
            await this.neo4j.executeQuery(query, {
                ...pattern,
                applicabilityConditions: JSON.stringify(pattern.applicabilityConditions),
                components: JSON.stringify(pattern.components),
                qualityAttributes: JSON.stringify(pattern.qualityAttributes),
                knownUses: JSON.stringify(pattern.knownUses),
            });
            logger_1.logger.info(`Created architecture pattern: ${pattern.id}`);
            return pattern;
        }
        catch (error) {
            logger_1.logger.error('Failed to create architecture pattern', error);
            throw error;
        }
    }
    async findPatternsByType(type) {
        const query = `
      MATCH (ap:ArchitecturePattern {type: $type})
      RETURN ap
      ORDER BY ap.successRate DESC, ap.adoptionCount DESC
    `;
        const results = await this.neo4j.executeQuery(query, { type });
        return results.map((r) => this.mapToPattern(r.ap));
    }
    async recommendPatternsForRequirements(requirementIds) {
        const query = `
      UNWIND $requirementIds AS reqId
      MATCH (r:Requirement {id: reqId})
      WITH collect(r) as requirements, collect(r.type) as reqTypes
      
      MATCH (ap:ArchitecturePattern)
      WITH ap, requirements, reqTypes,
           size([condition IN ap.applicabilityConditions 
                WHERE ANY(type IN reqTypes WHERE condition CONTAINS type)]) as matchCount
      WHERE matchCount > 0
      
      WITH ap, matchCount * ap.successRate * LOG(ap.adoptionCount + 1) as score
      ORDER BY score DESC
      LIMIT 5
      
      RETURN ap, score
    `;
        const results = await this.neo4j.executeQuery(query, { requirementIds });
        return results.map((r) => ({
            pattern: this.mapToPattern(r.ap),
            score: r.score,
        }));
    }
    async extractPatternsFromSuccessfulProjects(minSuccessRate = 0.8) {
        const query = `
      MATCH (ad:ArchitectureDecision)-[:RESULTED_IN]->(outcome:Outcome)
      WHERE outcome.success = true AND outcome.qualityScore > $minSuccessRate
      WITH ad, count(outcome) as successCount
      WHERE successCount >= 3
      
      // Extract common patterns
      WITH collect(ad) as decisions
      UNWIND decisions as decision
      MATCH (decision)-[:USES_PATTERN]->(ap:ArchitecturePattern)
      WITH ap, count(decision) as usageCount, avg(decision.qualityScore) as avgQuality
      
      SET ap.successRate = avgQuality,
          ap.adoptionCount = ap.adoptionCount + usageCount
      
      RETURN ap
      ORDER BY ap.successRate DESC
    `;
        const results = await this.neo4j.executeQuery(query, { minSuccessRate });
        const patterns = results.map((r) => this.mapToPattern(r.ap));
        // Also create new patterns from successful decisions without existing patterns
        await this.identifyNewPatterns(minSuccessRate);
        return patterns;
    }
    async updatePatternSuccess(patternId, projectId, success, metrics) {
        const query = `
      MATCH (ap:ArchitecturePattern {id: $patternId})
      MATCH (p:Project {id: $projectId})
      CREATE (p)-[:USED_PATTERN {
        success: $success,
        metrics: $metrics,
        usedAt: $usedAt
      }]->(ap)
      
      WITH ap, $success as wasSuccessful
      SET ap.adoptionCount = ap.adoptionCount + 1,
          ap.successRate = CASE
            WHEN wasSuccessful = true
            THEN (ap.successRate * ap.adoptionCount + 1) / (ap.adoptionCount + 1)
            ELSE (ap.successRate * ap.adoptionCount) / (ap.adoptionCount + 1)
          END,
          ap.updatedAt = $updatedAt
    `;
        await this.neo4j.executeQuery(query, {
            patternId,
            projectId,
            success,
            metrics: JSON.stringify(metrics || {}),
            usedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        logger_1.logger.info(`Updated pattern ${patternId} success metrics`);
    }
    async findSimilarPatterns(patternId, threshold = 0.7) {
        const query = `
      MATCH (ap1:ArchitecturePattern {id: $patternId})
      MATCH (ap2:ArchitecturePattern)
      WHERE ap2.id <> ap1.id AND ap2.type = ap1.type
      
      WITH ap1, ap2,
           size([attr1 IN ap1.qualityAttributes 
                WHERE ANY(attr2 IN ap2.qualityAttributes WHERE attr1.name = attr2.name)]) * 1.0 /
           size(ap1.qualityAttributes + ap2.qualityAttributes) as similarity
      WHERE similarity > $threshold
      
      RETURN ap2
      ORDER BY similarity DESC
      LIMIT 5
    `;
        const results = await this.neo4j.executeQuery(query, {
            patternId,
            threshold,
        });
        return results.map((r) => this.mapToPattern(r.ap2));
    }
    async getPatternMetrics() {
        const query = `
      MATCH (ap:ArchitecturePattern)
      OPTIONAL MATCH (ap)<-[:USES_PATTERN]-(ad:ArchitectureDecision)
      OPTIONAL MATCH (ap)<-[:USED_PATTERN]-(p:Project)
      
      WITH ap,
           count(DISTINCT ad) as decisionCount,
           count(DISTINCT p) as projectCount
           
      RETURN {
        totalPatterns: count(ap),
        avgSuccessRate: avg(ap.successRate),
        avgAdoptionCount: avg(ap.adoptionCount),
        totalDecisions: sum(decisionCount),
        totalProjects: sum(projectCount),
        patternTypes: collect(DISTINCT ap.type)
      } as metrics
    `;
        const results = await this.neo4j.executeQuery(query);
        return results[0]?.metrics || {};
    }
    async identifyNewPatterns(minSuccessRate) {
        const query = `
      MATCH (ad:ArchitectureDecision)-[:RESULTED_IN]->(outcome:Outcome)
      WHERE outcome.success = true 
        AND outcome.qualityScore > $minSuccessRate
        AND NOT EXISTS((ad)-[:USES_PATTERN]->(:ArchitecturePattern))
      WITH ad, collect(outcome) as outcomes
      WHERE size(outcomes) >= 2
      
      // Group by similar characteristics
      WITH collect(ad) as similarDecisions
      WHERE size(similarDecisions) >= 3
      
      // Create new pattern from these decisions
      WITH similarDecisions[0] as representative, similarDecisions
      CREATE (ap:ArchitecturePattern {
        id: $patternId,
        name: 'Extracted Pattern - ' + representative.title,
        type: 'EXTRACTED',
        description: 'Pattern extracted from successful implementations',
        applicabilityConditions: [],
        components: [],
        qualityAttributes: [],
        knownUses: [decision.id IN similarDecisions],
        successRate: $minSuccessRate,
        adoptionCount: size(similarDecisions),
        createdAt: $createdAt
      })
      
      WITH ap, similarDecisions
      UNWIND similarDecisions as decision
      CREATE (decision)-[:EXEMPLIFIES]->(ap)
    `;
        try {
            await this.neo4j.executeQuery(query, {
                minSuccessRate,
                patternId: (0, uuid_1.v4)(),
                createdAt: new Date().toISOString(),
            });
            logger_1.logger.info('Identified and created new patterns from successful projects');
        }
        catch (error) {
            logger_1.logger.error('Failed to identify new patterns', error);
        }
    }
    async getPatternById(id) {
        const query = `
      MATCH (ap:ArchitecturePattern {id: $id})
      RETURN ap
    `;
        const results = await this.neo4j.executeQuery(query, { id });
        if (results.length === 0)
            return null;
        return this.mapToPattern(results[0].ap);
    }
    async getPatterns(filters) {
        let query = `
      MATCH (ap:ArchitecturePattern)
    `;
        const conditions = [];
        const params = {
            limit: filters.limit || 20,
            offset: filters.offset || 0,
        };
        if (filters.type) {
            conditions.push('ap.type = $type');
            params.type = filters.type;
        }
        if (filters.applicabilityConditions && filters.applicabilityConditions.length > 0) {
            conditions.push('ANY(condition IN ap.applicabilityConditions WHERE condition IN $conditions)');
            params.conditions = filters.applicabilityConditions;
        }
        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }
        query += `
      RETURN ap
      ORDER BY ap.successRate DESC, ap.adoptionCount DESC
      SKIP $offset
      LIMIT $limit
    `;
        const results = await this.neo4j.executeQuery(query, params);
        return results.map((result) => this.mapToPattern(result.ap));
    }
    async updatePattern(id, input) {
        const updateFields = {
            updatedAt: new Date().toISOString(),
        };
        if (input.name)
            updateFields.name = input.name;
        if (input.type)
            updateFields.type = input.type;
        if (input.description)
            updateFields.description = input.description;
        if (input.applicabilityConditions)
            updateFields.applicabilityConditions = JSON.stringify(input.applicabilityConditions);
        if (input.components)
            updateFields.components = JSON.stringify(input.components);
        if (input.qualityAttributes)
            updateFields.qualityAttributes = JSON.stringify(input.qualityAttributes);
        if (input.knownUses)
            updateFields.knownUses = JSON.stringify(input.knownUses);
        const setClause = Object.keys(updateFields)
            .map(key => `ap.${key} = $${key}`)
            .join(', ');
        const query = `
      MATCH (ap:ArchitecturePattern {id: $id})
      SET ${setClause}
      RETURN ap
    `;
        const results = await this.neo4j.executeQuery(query, {
            id,
            ...updateFields,
        });
        if (results.length === 0)
            return null;
        return this.mapToPattern(results[0].ap);
    }
    async recommendPatterns(requirementIds, constraints) {
        // This would implement sophisticated pattern recommendation logic
        // For now, return basic pattern recommendations
        const patterns = await this.getPatterns({ limit: 5 });
        return patterns.map(pattern => ({
            pattern,
            applicabilityScore: 0.8,
            benefits: ['Proven architecture pattern', 'Good community support'],
            risks: ['Learning curve required', 'May be over-engineering for simple use cases'],
            implementationComplexity: 'MEDIUM',
            prerequisites: ['Understanding of pattern concepts'],
        }));
    }
    mapToPattern(node) {
        const props = node.properties;
        return {
            id: props.id,
            name: props.name,
            type: props.type,
            description: props.description,
            applicabilityConditions: JSON.parse(props.applicabilityConditions || '[]'),
            components: JSON.parse(props.components || '[]'),
            qualityAttributes: JSON.parse(props.qualityAttributes || '[]'),
            knownUses: JSON.parse(props.knownUses || '[]'),
            successRate: props.successRate || 0,
            adoptionCount: props.adoptionCount || 0,
            createdAt: props.createdAt,
            updatedAt: props.updatedAt,
        };
    }
}
exports.ArchitecturePatternService = ArchitecturePatternService;
//# sourceMappingURL=pattern.service.js.map