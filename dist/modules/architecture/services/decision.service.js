"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchitectureDecisionService = void 0;
const uuid_1 = require("uuid");
const logger_1 = require("../../../core/logging/logger");
const architecture_types_1 = require("../types/architecture.types");
class ArchitectureDecisionService {
    neo4j;
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async createDecision(input) {
        try {
            const decision = {
                id: (0, uuid_1.v4)(),
                title: input.title,
                description: input.description,
                rationale: input.rationale,
                status: architecture_types_1.ArchitectureDecisionStatus.DRAFT,
                alternatives: input.alternatives || [],
                consequences: input.consequences || [],
                tradeOffs: input.tradeOffs || [],
                createdAt: new Date().toISOString(),
                projectId: input.projectId,
                requirementIds: input.requirementIds,
            };
            // Store in Neo4j
            const query = `
        CREATE (ad:ArchitectureDecision {
          id: $id,
          title: $title,
          description: $description,
          rationale: $rationale,
          status: $status,
          alternatives: $alternatives,
          consequences: $consequences,
          tradeOffs: $tradeOffs,
          createdAt: $createdAt,
          projectId: $projectId
        })
        WITH ad
        MATCH (p:Project {id: $projectId})
        CREATE (p)-[:HAS_ARCHITECTURE]->(ad)
        WITH ad
        UNWIND $requirementIds AS reqId
        MATCH (r:Requirement {id: reqId})
        CREATE (ad)-[:ADDRESSES]->(r)
        RETURN ad
      `;
            await this.neo4j.executeQuery(query, {
                ...decision,
                alternatives: JSON.stringify(decision.alternatives),
                consequences: JSON.stringify(decision.consequences),
                tradeOffs: JSON.stringify(decision.tradeOffs),
                requirementIds: input.requirementIds,
            });
            logger_1.logger.info(`Created architecture decision: ${decision.id}`);
            // Find and suggest relevant patterns
            await this.suggestPatterns(decision.id);
            return decision;
        }
        catch (error) {
            logger_1.logger.error('Failed to create architecture decision', error);
            throw error;
        }
    }
    async updateDecisionStatus(id, status) {
        const updateFields = {
            status,
            updatedAt: new Date().toISOString(),
        };
        if (status === architecture_types_1.ArchitectureDecisionStatus.APPROVED) {
            updateFields.approvedAt = new Date().toISOString();
        }
        else if (status === architecture_types_1.ArchitectureDecisionStatus.DEPRECATED) {
            updateFields.deprecatedAt = new Date().toISOString();
        }
        const setClause = Object.keys(updateFields)
            .map(key => `ad.${key} = $${key}`)
            .join(', ');
        const query = `
      MATCH (ad:ArchitectureDecision {id: $id})
      SET ${setClause}
      RETURN ad
    `;
        const results = await this.neo4j.executeQuery(query, {
            id,
            ...updateFields,
        });
        if (results.length === 0)
            return null;
        return this.mapToArchitectureDecision(results[0].ad);
    }
    async linkToPattern(decisionId, patternId, adaptations) {
        const query = `
      MATCH (ad:ArchitectureDecision {id: $decisionId})
      MATCH (p:ArchitecturePattern {id: $patternId})
      CREATE (ad)-[:USES_PATTERN {
        adaptations: $adaptations,
        appliedAt: $appliedAt
      }]->(p)
    `;
        await this.neo4j.executeQuery(query, {
            decisionId,
            patternId,
            adaptations: JSON.stringify(adaptations || []),
            appliedAt: new Date().toISOString(),
        });
        logger_1.logger.info(`Linked decision ${decisionId} to pattern ${patternId}`);
    }
    async findDecisionsByProject(projectId) {
        const query = `
      MATCH (p:Project {id: $projectId})-[:HAS_ARCHITECTURE]->(ad:ArchitectureDecision)
      OPTIONAL MATCH (ad)-[:ADDRESSES]->(r:Requirement)
      OPTIONAL MATCH (ad)-[:USES_PATTERN]->(pattern:ArchitecturePattern)
      RETURN ad, collect(DISTINCT r.id) as requirementIds, collect(DISTINCT pattern.id) as patternIds
      ORDER BY ad.createdAt DESC
    `;
        const results = await this.neo4j.executeQuery(query, { projectId });
        return results.map((record) => ({
            ...this.mapToArchitectureDecision(record.ad),
            requirementIds: record.requirementIds,
            patternIds: record.patternIds,
        }));
    }
    async findSimilarDecisions(decisionId, threshold = 0.7) {
        const query = `
      MATCH (ad1:ArchitectureDecision {id: $decisionId})
      MATCH (ad1)-[:ADDRESSES]->(r1:Requirement)
      WITH ad1, collect(r1.type) as types1
      
      MATCH (ad2:ArchitectureDecision)
      WHERE ad2.id <> ad1.id
      MATCH (ad2)-[:ADDRESSES]->(r2:Requirement)
      WITH ad1, types1, ad2, collect(r2.type) as types2
      
      WITH ad1, ad2,
           size([t IN types1 WHERE t IN types2]) * 1.0 / size(types1 + types2) as similarity
      WHERE similarity > $threshold
      
      OPTIONAL MATCH (ad2)<-[:HAS_ARCHITECTURE]-(p:Project)
      RETURN ad2, similarity, p.name as projectName
      ORDER BY similarity DESC
      LIMIT 10
    `;
        const results = await this.neo4j.executeQuery(query, {
            decisionId,
            threshold,
        });
        return results.map((record) => ({
            decision: this.mapToArchitectureDecision(record.ad2),
            similarity: record.similarity,
            projectName: record.projectName,
        }));
    }
    async getDecisionMetrics(decisionId) {
        const query = `
      MATCH (ad:ArchitectureDecision {id: $decisionId})
      OPTIONAL MATCH (ad)-[:ADDRESSES]->(r:Requirement)
      OPTIONAL MATCH (ad)-[:USES_PATTERN]->(p:ArchitecturePattern)
      OPTIONAL MATCH (ad)-[:HAS_STACK]->(ts:TechnologyStack)
      OPTIONAL MATCH (ad)-[:RESULTED_IN]->(outcome:Outcome)
      
      WITH ad,
           count(DISTINCT r) as requirementCount,
           count(DISTINCT p) as patternCount,
           ts,
           collect(outcome) as outcomes
           
      RETURN {
        decisionId: ad.id,
        requirementsCovered: requirementCount,
        patternsUsed: patternCount,
        estimatedCost: ts.costEstimate,
        actualOutcomes: outcomes,
        status: ad.status
      } as metrics
    `;
        const results = await this.neo4j.executeQuery(query, { decisionId });
        return results[0]?.metrics || {};
    }
    async suggestPatterns(decisionId) {
        // Find patterns based on similar requirements
        const query = `
      MATCH (ad:ArchitectureDecision {id: $decisionId})-[:ADDRESSES]->(r:Requirement)
      WITH ad, collect(r.type) as requirementTypes
      
      MATCH (p:ArchitecturePattern)
      WHERE ANY(condition IN p.applicabilityConditions WHERE condition IN requirementTypes)
      
      WITH ad, p, p.successRate * p.adoptionCount as score
      ORDER BY score DESC
      LIMIT 5
      
      CREATE (ad)-[:SUGGESTED_PATTERN {
        score: score,
        suggestedAt: datetime()
      }]->(p)
    `;
        await this.neo4j.executeQuery(query, { decisionId });
        logger_1.logger.info(`Suggested patterns for decision ${decisionId}`);
    }
    async getDecisionById(id) {
        const query = `
      MATCH (ad:ArchitectureDecision {id: $id})
      OPTIONAL MATCH (ad)-[:ADDRESSES]->(r:Requirement)
      RETURN ad, collect(r.id) as requirementIds
    `;
        const results = await this.neo4j.executeQuery(query, { id });
        if (results.length === 0)
            return null;
        const decision = this.mapToArchitectureDecision(results[0].ad);
        decision.requirementIds = results[0].requirementIds;
        return decision;
    }
    async getDecisions(filters) {
        let query = `
      MATCH (ad:ArchitectureDecision)
    `;
        const conditions = [];
        const params = {
            limit: filters.limit || 20,
            offset: filters.offset || 0,
        };
        if (filters.projectId) {
            conditions.push('ad.projectId = $projectId');
            params.projectId = filters.projectId;
        }
        if (filters.status) {
            conditions.push('ad.status = $status');
            params.status = filters.status;
        }
        if (filters.requirementId) {
            query += ` MATCH (ad)-[:ADDRESSES]->(r:Requirement {id: $requirementId})`;
            params.requirementId = filters.requirementId;
        }
        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }
        query += `
      OPTIONAL MATCH (ad)-[:ADDRESSES]->(r:Requirement)
      RETURN ad, collect(r.id) as requirementIds
      ORDER BY ad.createdAt DESC
      SKIP $offset
      LIMIT $limit
    `;
        const results = await this.neo4j.executeQuery(query, params);
        return results.map((result) => {
            const decision = this.mapToArchitectureDecision(result.ad);
            decision.requirementIds = result.requirementIds;
            return decision;
        });
    }
    async updateDecision(id, input) {
        const updateFields = {
            updatedAt: new Date().toISOString(),
        };
        if (input.title)
            updateFields.title = input.title;
        if (input.description)
            updateFields.description = input.description;
        if (input.rationale)
            updateFields.rationale = input.rationale;
        if (input.status)
            updateFields.status = input.status;
        if (input.alternatives)
            updateFields.alternatives = JSON.stringify(input.alternatives);
        if (input.consequences)
            updateFields.consequences = JSON.stringify(input.consequences);
        if (input.tradeOffs)
            updateFields.tradeOffs = JSON.stringify(input.tradeOffs);
        const setClause = Object.keys(updateFields)
            .map(key => `ad.${key} = $${key}`)
            .join(', ');
        const query = `
      MATCH (ad:ArchitectureDecision {id: $id})
      SET ${setClause}
      RETURN ad
    `;
        const results = await this.neo4j.executeQuery(query, {
            id,
            ...updateFields,
        });
        if (results.length === 0)
            return null;
        return this.mapToArchitectureDecision(results[0].ad);
    }
    async approveDecision(id) {
        return this.updateDecisionStatus(id, architecture_types_1.ArchitectureDecisionStatus.APPROVED);
    }
    async deprecateDecision(id, reason, replacementId) {
        const query = `
      MATCH (ad:ArchitectureDecision {id: $id})
      SET ad.status = $status,
          ad.deprecatedAt = $deprecatedAt,
          ad.deprecationReason = $reason,
          ad.replacementId = $replacementId
      RETURN ad
    `;
        const results = await this.neo4j.executeQuery(query, {
            id,
            status: architecture_types_1.ArchitectureDecisionStatus.DEPRECATED,
            deprecatedAt: new Date().toISOString(),
            reason,
            replacementId,
        });
        if (results.length === 0)
            return null;
        return this.mapToArchitectureDecision(results[0].ad);
    }
    mapToArchitectureDecision(node) {
        const props = node.properties;
        return {
            id: props.id,
            title: props.title,
            description: props.description,
            rationale: props.rationale,
            status: props.status,
            alternatives: JSON.parse(props.alternatives || '[]'),
            consequences: JSON.parse(props.consequences || '[]'),
            tradeOffs: JSON.parse(props.tradeOffs || '[]'),
            createdAt: props.createdAt,
            updatedAt: props.updatedAt,
            approvedAt: props.approvedAt,
            deprecatedAt: props.deprecatedAt,
            projectId: props.projectId,
            requirementIds: [],
        };
    }
}
exports.ArchitectureDecisionService = ArchitectureDecisionService;
//# sourceMappingURL=decision.service.js.map