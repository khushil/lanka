import { v4 as uuidv4 } from 'uuid';
import { Neo4jService } from '../../../core/database/neo4j';
import { logger } from '../../../core/logging/logger';
import { Requirement, RequirementType, RequirementStatus } from '../types/requirement.types';
import { NLPService } from './nlp.service';
import { SimilarityService } from './similarity.service';
import { SecureQueryBuilder } from '../../../utils/secure-query-builder';

export class RequirementsService {
  private nlpService: NLPService;
  private similarityService: SimilarityService;

  constructor(private neo4j: Neo4jService) {
    this.nlpService = new NLPService();
    this.similarityService = new SimilarityService(neo4j);
  }

  async createRequirement(input: {
    description: string;
    title?: string;
    type?: RequirementType;
    projectId: string;
    stakeholderId: string;
  }): Promise<Requirement> {
    try {
      const id = uuidv4();
      
      // Analyze requirement with NLP
      const analysis = await this.nlpService.analyzeRequirement(input.description);
      
      const requirement: Requirement = {
        id,
        title: input.title || analysis.suggestedTitle,
        description: input.description,
        type: input.type || analysis.type,
        status: RequirementStatus.DRAFT,
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
      
      logger.info(`Created requirement: ${id}`);
      
      // Find similar requirements
      const similar = await this.similarityService.findSimilarRequirements(requirement);
      if (similar.length > 0) {
        await this.linkSimilarRequirements(id, similar);
      }

      return requirement;
    } catch (error) {
      logger.error('Failed to create requirement', error);
      throw error;
    }
  }

  async findSimilarRequirements(requirementId: string): Promise<any[]> {
    // Use parameterized query to prevent injection
    const query = `
      MATCH (r:Requirement {id: $requirementId})
      MATCH (other:Requirement)
      WHERE other.id <> r.id AND other.embedding IS NOT NULL AND r.embedding IS NOT NULL
      WITH r, other, 
           gds.similarity.cosine(r.embedding, other.embedding) AS similarity
      WHERE similarity > $threshold
      RETURN other, similarity
      ORDER BY similarity DESC
      LIMIT $limit
    `;

    const params = {
      requirementId: SecureQueryBuilder.validateAndSanitizeInput(requirementId),
      threshold: 0.7,
      limit: 10
    };

    const results = await this.neo4j.executeQuery(query, params);
    return results;
  }

  async detectConflicts(requirementId: string): Promise<any[]> {
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

  async extractPatterns(projectId: string): Promise<any[]> {
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

  async getRequirementById(id: string): Promise<Requirement | null> {
    const query = `
      MATCH (r:Requirement {id: $id})
      OPTIONAL MATCH (r)<-[:OWNS]-(s:Stakeholder)
      OPTIONAL MATCH (r)<-[:CONTAINS]-(p:Project)
      RETURN r, s, p
    `;

    const results = await this.neo4j.executeQuery(query, { id });
    if (results.length === 0) return null;

    const record = results[0];
    return this.mapToRequirement(record.r);
  }

  async updateRequirementStatus(
    id: string,
    status: RequirementStatus
  ): Promise<Requirement | null> {
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

    if (results.length === 0) return null;
    return this.mapToRequirement(results[0].r);
  }

  private async linkSimilarRequirements(
    requirementId: string,
    similarRequirements: any[]
  ): Promise<void> {
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

  private mapToRequirement(node: any): Requirement {
    return {
      id: node.properties.id,
      title: node.properties.title,
      description: node.properties.description,
      type: node.properties.type as RequirementType,
      status: node.properties.status as RequirementStatus,
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