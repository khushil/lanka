"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirementsService = void 0;
const uuid_1 = require("uuid");
const logger_1 = require("../../../core/logging/logger");
const requirement_types_1 = require("../types/requirement.types");
const nlp_service_1 = require("./nlp.service");
const similarity_service_1 = require("./similarity.service");
class RequirementsService {
    neo4j;
    nlpService;
    similarityService;
    constructor(neo4j) {
        this.neo4j = neo4j;
        this.nlpService = new nlp_service_1.NLPService();
        this.similarityService = new similarity_service_1.SimilarityService(neo4j);
    }
    async createRequirement(input) {
        try {
            const id = (0, uuid_1.v4)();
            // Analyze requirement with NLP
            const analysis = await this.nlpService.analyzeRequirement(input.description);
            const requirement = {
                id,
                title: input.title || analysis.suggestedTitle,
                description: input.description,
                type: input.type || analysis.type,
                status: requirement_types_1.RequirementStatus.DRAFT,
                priority: analysis.priority,
                createdAt: new Date().toISOString(),
                projectId: input.projectId,
                stakeholderId: input.stakeholderId,
                embedding: analysis.embedding,
                completenessScore: analysis.completenessScore,
                qualityScore: analysis.qualityScore,
            };
            // Store in Neo4j
            const query = `
        CREATE (r:Requirement {
          id: $id,
          title: $title,
          description: $description,
          type: $type,
          status: $status,
          priority: $priority,
          createdAt: $createdAt,
          embedding: $embedding,
          completenessScore: $completenessScore,
          qualityScore: $qualityScore
        })
        WITH r
        MATCH (p:Project {id: $projectId})
        MATCH (s:Stakeholder {id: $stakeholderId})
        CREATE (p)-[:CONTAINS]->(r)
        CREATE (s)-[:OWNS]->(r)
        RETURN r
      `;
            await this.neo4j.executeQuery(query, requirement);
            logger_1.logger.info(`Created requirement: ${id}`);
            // Find similar requirements
            const similar = await this.similarityService.findSimilarRequirements(requirement);
            if (similar.length > 0) {
                await this.linkSimilarRequirements(id, similar);
            }
            return requirement;
        }
        catch (error) {
            logger_1.logger.error('Failed to create requirement', error);
            throw error;
        }
    }
    async findSimilarRequirements(requirementId) {
        const query = `
      MATCH (r:Requirement {id: $requirementId})
      MATCH (other:Requirement)
      WHERE other.id <> r.id
      WITH r, other, 
           gds.similarity.cosine(r.embedding, other.embedding) AS similarity
      WHERE similarity > 0.7
      RETURN other, similarity
      ORDER BY similarity DESC
      LIMIT 10
    `;
        const results = await this.neo4j.executeQuery(query, { requirementId });
        return results;
    }
    async detectConflicts(requirementId) {
        const query = `
      MATCH (r:Requirement {id: $requirementId})
      MATCH (r)<-[:CONTAINS]-(p:Project)-[:CONTAINS]->(other:Requirement)
      WHERE other.id <> r.id
      WITH r, other
      WHERE (
        (r.type = 'NON_FUNCTIONAL' AND other.type = 'NON_FUNCTIONAL') OR
        (r.priority = 'CRITICAL' AND other.priority = 'CRITICAL')
      )
      RETURN other, 'potential_conflict' as conflictType
    `;
        const results = await this.neo4j.executeQuery(query, { requirementId });
        return results;
    }
    async extractPatterns(projectId) {
        const query = `
      MATCH (p:Project {id: $projectId})-[:CONTAINS]->(r:Requirement)
      WHERE r.status = 'IMPLEMENTED' AND r.qualityScore > 0.8
      WITH r.type as type, 
           collect(r) as requirements,
           avg(r.qualityScore) as avgQuality
      WHERE size(requirements) > 3
      RETURN type, requirements, avgQuality
      ORDER BY avgQuality DESC
    `;
        const results = await this.neo4j.executeQuery(query, { projectId });
        return results;
    }
    async getRequirementById(id) {
        const query = `
      MATCH (r:Requirement {id: $id})
      OPTIONAL MATCH (r)<-[:OWNS]-(s:Stakeholder)
      OPTIONAL MATCH (r)<-[:CONTAINS]-(p:Project)
      RETURN r, s, p
    `;
        const results = await this.neo4j.executeQuery(query, { id });
        if (results.length === 0)
            return null;
        const record = results[0];
        return this.mapToRequirement(record.r);
    }
    async updateRequirementStatus(id, status) {
        const query = `
      MATCH (r:Requirement {id: $id})
      SET r.status = $status,
          r.updatedAt = $updatedAt
      RETURN r
    `;
        const results = await this.neo4j.executeQuery(query, {
            id,
            status,
            updatedAt: new Date().toISOString(),
        });
        if (results.length === 0)
            return null;
        return this.mapToRequirement(results[0].r);
    }
    async linkSimilarRequirements(requirementId, similarRequirements) {
        for (const similar of similarRequirements) {
            const query = `
        MATCH (r1:Requirement {id: $id1})
        MATCH (r2:Requirement {id: $id2})
        CREATE (r1)-[:SIMILAR_TO {score: $score}]->(r2)
      `;
            await this.neo4j.executeQuery(query, {
                id1: requirementId,
                id2: similar.id,
                score: similar.similarity,
            });
        }
    }
    mapToRequirement(node) {
        return {
            id: node.properties.id,
            title: node.properties.title,
            description: node.properties.description,
            type: node.properties.type,
            status: node.properties.status,
            priority: node.properties.priority,
            createdAt: node.properties.createdAt,
            updatedAt: node.properties.updatedAt,
            projectId: node.properties.projectId,
            stakeholderId: node.properties.stakeholderId,
            embedding: node.properties.embedding,
            completenessScore: node.properties.completenessScore,
            qualityScore: node.properties.qualityScore,
        };
    }
}
exports.RequirementsService = RequirementsService;
//# sourceMappingURL=requirements.service.js.map