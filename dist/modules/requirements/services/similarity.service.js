"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimilarityService = void 0;
const logger_1 = require("../../../core/logging/logger");
class SimilarityService {
    neo4j;
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async findSimilarRequirements(requirement, threshold = 0.7) {
        try {
            // For initial implementation, use simple text similarity
            // In production, use vector similarity with embeddings
            const query = `
        MATCH (other:Requirement)<-[:CONTAINS]-(p:Project)
        WHERE other.id <> $requirementId
        WITH other, p,
             apoc.text.jaroWinklerDistance(
               toLower($description),
               toLower(other.description)
             ) AS textSimilarity
        WHERE textSimilarity > $threshold
        OPTIONAL MATCH (other)-[:SATISFIES]->(outcome:Outcome)
        RETURN 
          other.id AS id,
          other.title AS title,
          other.description AS description,
          textSimilarity AS similarity,
          p.name AS projectName,
          collect(outcome) AS outcomes
        ORDER BY textSimilarity DESC
        LIMIT 10
      `;
            const results = await this.neo4j.executeQuery(query, {
                requirementId: requirement.id,
                description: requirement.description,
                threshold,
            });
            return results.map(record => this.mapToSimilarRequirement(record));
        }
        catch (error) {
            logger_1.logger.error('Failed to find similar requirements', error);
            // Return empty array if similarity search fails
            return [];
        }
    }
    async calculateCrossProjectSimilarity(requirementId) {
        const query = `
      MATCH (r:Requirement {id: $requirementId})
      MATCH (other:Requirement)<-[:CONTAINS]-(p:Project)
      WHERE other.id <> r.id AND p.id <> r.projectId
      WITH r, other, p,
           apoc.text.jaroWinklerDistance(
             toLower(r.description),
             toLower(other.description)
           ) AS similarity
      WHERE similarity > 0.5
      WITH p.id AS projectId, avg(similarity) AS avgSimilarity
      RETURN projectId, avgSimilarity
      ORDER BY avgSimilarity DESC
    `;
        const results = await this.neo4j.executeQuery(query, { requirementId });
        const similarityMap = new Map();
        results.forEach(record => {
            similarityMap.set(record.projectId, record.avgSimilarity);
        });
        return similarityMap;
    }
    async findExpertiseForRequirement(requirement) {
        const query = `
      MATCH (similar:Requirement)<-[:OWNS]-(expert:Stakeholder)
      WHERE similar.type = $type
      WITH expert, count(similar) AS requirementCount,
           avg(similar.qualityScore) AS avgQuality
      WHERE requirementCount > 3 AND avgQuality > 0.7
      RETURN 
        expert.id AS expertId,
        expert.name AS expertName,
        expert.email AS expertEmail,
        requirementCount,
        avgQuality
      ORDER BY avgQuality DESC, requirementCount DESC
      LIMIT 5
    `;
        const results = await this.neo4j.executeQuery(query, {
            type: requirement.type,
        });
        return results;
    }
    mapToSimilarRequirement(record) {
        const similar = {
            id: record.id,
            title: record.title,
            description: record.description,
            similarity: record.similarity,
            projectName: record.projectName,
        };
        // Extract success metrics from outcomes if available
        if (record.outcomes && record.outcomes.length > 0) {
            const metrics = record.outcomes[0];
            similar.successMetrics = {
                implementationTime: metrics.implementationTime,
                defectRate: metrics.defectRate,
                stakeholderSatisfaction: metrics.satisfaction,
            };
        }
        // Add adaptation guidelines based on similarity
        similar.adaptationGuidelines = this.generateAdaptationGuidelines(record.similarity);
        return similar;
    }
    generateAdaptationGuidelines(similarity) {
        const guidelines = [];
        if (similarity > 0.9) {
            guidelines.push('This requirement is nearly identical - consider direct reuse');
            guidelines.push('Review implementation details for minor context differences');
        }
        else if (similarity > 0.8) {
            guidelines.push('Strong similarity - adapt existing solution with minor modifications');
            guidelines.push('Pay attention to project-specific constraints');
        }
        else if (similarity > 0.7) {
            guidelines.push('Moderate similarity - use as template but expect customization');
            guidelines.push('Review acceptance criteria for alignment');
        }
        guidelines.push('Consult with the original implementation team if possible');
        guidelines.push('Document any adaptations for future reference');
        return guidelines;
    }
}
exports.SimilarityService = SimilarityService;
//# sourceMappingURL=similarity.service.js.map