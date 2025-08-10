import { Neo4jService } from '../../../core/database/neo4j';
import { logger } from '../../../core/logging/logger';
import { v4 as uuidv4 } from 'uuid';
import { RequirementType, RequirementPattern } from '../types/requirement.types';

export interface PatternExtractionResult {
  pattern: RequirementPattern;
  frequency: number;
  projects: string[];
  averageSuccessRate: number;
}

export interface PatternApplication {
  patternId: string;
  requirementId: string;
  adaptations: string[];
  success?: boolean;
  feedback?: string;
}

export class PatternService {
  constructor(private neo4j: Neo4jService) {}

  async extractPatterns(
    projectId?: string,
    minFrequency: number = 3
  ): Promise<PatternExtractionResult[]> {
    try {
      const query = `
        MATCH (r:Requirement)
        WHERE r.status = 'IMPLEMENTED' 
        AND r.qualityScore > 0.8
        ${projectId ? 'AND EXISTS((r)<-[:CONTAINS]-(:Project {id: $projectId}))' : ''}
        WITH r.type as type,
             collect(r) as requirements,
             count(r) as frequency,
             avg(r.qualityScore) as avgQuality,
             collect(DISTINCT r.projectId) as projects
        WHERE frequency >= $minFrequency
        RETURN type, requirements, frequency, avgQuality, projects
        ORDER BY frequency DESC, avgQuality DESC
      `;

      const results = await this.neo4j.executeQuery(query, {
        projectId,
        minFrequency,
      });

      const patterns: PatternExtractionResult[] = [];

      for (const result of results) {
        const pattern = await this.createPatternFromRequirements(
          result.requirements,
          result.type
        );

        patterns.push({
          pattern,
          frequency: result.frequency,
          projects: result.projects,
          averageSuccessRate: result.avgQuality,
        });
      }

      logger.info(`Extracted ${patterns.length} patterns`);
      return patterns;
    } catch (error) {
      logger.error('Failed to extract patterns', error);
      throw error;
    }
  }

  async createPattern(
    input: Omit<RequirementPattern, 'id' | 'createdAt' | 'successMetrics'>
  ): Promise<RequirementPattern> {
    const pattern: RequirementPattern = {
      id: uuidv4(),
      ...input,
      successMetrics: {
        adoptionRate: 0,
        successRate: 0,
        qualityScore: 0,
      },
      createdAt: new Date().toISOString(),
    };

    const query = `
      CREATE (p:Pattern {
        id: $id,
        name: $name,
        description: $description,
        type: $type,
        template: $template,
        applicabilityConditions: $applicabilityConditions,
        examples: $examples,
        createdAt: $createdAt,
        adoptionRate: 0,
        successRate: 0,
        qualityScore: 0
      })
      RETURN p
    `;

    await this.neo4j.executeQuery(query, {
      ...pattern,
      applicabilityConditions: JSON.stringify(pattern.applicabilityConditions),
      examples: JSON.stringify(pattern.examples),
    });

    logger.info(`Created pattern: ${pattern.id}`);
    return pattern;
  }

  async applyPattern(
    patternId: string,
    requirementId: string,
    adaptations?: string[]
  ): Promise<PatternApplication> {
    const application: PatternApplication = {
      patternId,
      requirementId,
      adaptations: adaptations || [],
    };

    // Get pattern details
    const patternQuery = `
      MATCH (p:Pattern {id: $patternId})
      RETURN p
    `;

    const patternResults = await this.neo4j.executeQuery(patternQuery, { patternId });
    if (patternResults.length === 0) {
      throw new Error('Pattern not found');
    }

    const pattern = patternResults[0].p.properties;

    // Apply pattern to requirement
    const applyQuery = `
      MATCH (r:Requirement {id: $requirementId})
      MATCH (p:Pattern {id: $patternId})
      CREATE (r)-[:USES_PATTERN {
        adaptations: $adaptations,
        appliedAt: $appliedAt
      }]->(p)
      SET p.adoptionRate = p.adoptionRate + 1
      RETURN r, p
    `;

    await this.neo4j.executeQuery(applyQuery, {
      requirementId,
      patternId,
      adaptations: JSON.stringify(adaptations),
      appliedAt: new Date().toISOString(),
    });

    logger.info(`Applied pattern ${patternId} to requirement ${requirementId}`);
    return application;
  }

  async getPatternsByType(type: RequirementType): Promise<RequirementPattern[]> {
    const query = `
      MATCH (p:Pattern {type: $type})
      RETURN p
      ORDER BY p.successRate DESC, p.adoptionRate DESC
    `;

    const results = await this.neo4j.executeQuery(query, { type });
    return results.map(r => this.mapToPattern(r.p));
  }

  async updatePatternSuccess(
    patternId: string,
    requirementId: string,
    success: boolean,
    feedback?: string
  ): Promise<void> {
    const query = `
      MATCH (r:Requirement {id: $requirementId})-[rel:USES_PATTERN]->(p:Pattern {id: $patternId})
      SET rel.success = $success,
          rel.feedback = $feedback,
          rel.evaluatedAt = $evaluatedAt,
          p.successRate = CASE 
            WHEN $success = true 
            THEN (p.successRate * p.adoptionRate + 1) / (p.adoptionRate + 1)
            ELSE (p.successRate * p.adoptionRate) / (p.adoptionRate + 1)
          END
    `;

    await this.neo4j.executeQuery(query, {
      patternId,
      requirementId,
      success,
      feedback,
      evaluatedAt: new Date().toISOString(),
    });

    logger.info(`Updated pattern success for ${patternId}: ${success}`);
  }

  async findSimilarPatterns(
    patternId: string,
    threshold: number = 0.7
  ): Promise<RequirementPattern[]> {
    const query = `
      MATCH (p1:Pattern {id: $patternId})
      MATCH (p2:Pattern)
      WHERE p2.id <> p1.id
      AND p2.type = p1.type
      WITH p1, p2,
           apoc.text.jaroWinklerDistance(p1.template, p2.template) as similarity
      WHERE similarity > $threshold
      RETURN p2
      ORDER BY similarity DESC
      LIMIT 5
    `;

    const results = await this.neo4j.executeQuery(query, {
      patternId,
      threshold,
    });

    return results.map(r => this.mapToPattern(r.p2));
  }

  async getPatternMetrics(): Promise<any> {
    const query = `
      MATCH (p:Pattern)
      OPTIONAL MATCH (r:Requirement)-[:USES_PATTERN]->(p)
      WITH p,
           count(r) as usageCount,
           avg(r.qualityScore) as avgQuality
      RETURN {
        totalPatterns: count(p),
        avgAdoptionRate: avg(p.adoptionRate),
        avgSuccessRate: avg(p.successRate),
        mostUsedPattern: max(p.adoptionRate),
        totalApplications: sum(usageCount),
        avgQualityWithPatterns: avg(avgQuality)
      } as metrics
    `;

    const results = await this.neo4j.executeQuery(query);
    return results[0]?.metrics || {};
  }

  private async createPatternFromRequirements(
    requirements: any[],
    type: RequirementType
  ): Promise<RequirementPattern> {
    // Analyze common elements in requirements
    const commonWords = this.extractCommonWords(requirements);
    const commonStructure = this.analyzeStructure(requirements);
    
    const pattern: RequirementPattern = {
      id: uuidv4(),
      name: `${type} Pattern - ${commonWords.slice(0, 3).join(' ')}`,
      description: `Common pattern for ${type} requirements`,
      type,
      template: this.generateTemplate(commonStructure, commonWords),
      applicabilityConditions: this.generateConditions(requirements),
      successMetrics: {
        adoptionRate: 0,
        successRate: requirements.length > 0 
          ? requirements.reduce((sum, r) => sum + (r.properties.qualityScore || 0), 0) / requirements.length
          : 0,
        qualityScore: requirements.length > 0
          ? requirements.reduce((sum, r) => sum + (r.properties.qualityScore || 0), 0) / requirements.length
          : 0,
      },
      examples: requirements.slice(0, 3).map(r => r.properties.description),
      createdAt: new Date().toISOString(),
    };

    // Store pattern in database
    await this.createPattern(pattern);

    return pattern;
  }

  private extractCommonWords(requirements: any[]): string[] {
    const wordFrequency = new Map<string, number>();
    
    for (const req of requirements) {
      const words = req.properties.description
        .toLowerCase()
        .split(/\s+/)
        .filter((word: string) => word.length > 3);
      
      for (const word of words) {
        wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
      }
    }

    // Sort by frequency and return top words
    return Array.from(wordFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private analyzeStructure(requirements: any[]): any {
    // Analyze common structural patterns
    const structures = {
      hasUserStory: 0,
      hasAcceptanceCriteria: 0,
      hasMetrics: 0,
      avgLength: 0,
    };

    for (const req of requirements) {
      const desc = req.properties.description.toLowerCase();
      if (desc.includes('as a') && desc.includes('i want')) {
        structures.hasUserStory++;
      }
      if (desc.includes('given') || desc.includes('when') || desc.includes('then')) {
        structures.hasAcceptanceCriteria++;
      }
      if (/\d+/.test(desc)) {
        structures.hasMetrics++;
      }
      structures.avgLength += desc.length;
    }

    structures.avgLength = structures.avgLength / requirements.length;
    
    return structures;
  }

  private generateTemplate(structure: any, commonWords: string[]): string {
    let template = '';

    if (structure.hasUserStory > structure.hasAcceptanceCriteria) {
      template = 'As a [user role], I want [functionality] so that [business value]';
    } else if (structure.hasAcceptanceCriteria > 0) {
      template = 'Given [context], When [action], Then [expected result]';
    } else {
      template = `The system shall [action] ${commonWords.slice(0, 2).join(' and ')} [conditions]`;
    }

    if (structure.hasMetrics > 0) {
      template += '\nMetrics: [specific measurable criteria]';
    }

    return template;
  }

  private generateConditions(requirements: any[]): string[] {
    const conditions: string[] = [];

    // Analyze when this pattern is applicable
    const types = new Set(requirements.map(r => r.properties.type));
    if (types.size === 1) {
      conditions.push(`Applicable for ${Array.from(types)[0]} requirements`);
    }

    const avgComplexity = requirements.reduce(
      (sum, r) => sum + (r.properties.description.split(/\s+/).length || 0),
      0
    ) / requirements.length;

    if (avgComplexity > 50) {
      conditions.push('Suitable for complex requirements with multiple conditions');
    } else if (avgComplexity < 20) {
      conditions.push('Suitable for simple, straightforward requirements');
    }

    const priorities = requirements.map(r => r.properties.priority).filter(Boolean);
    if (priorities.length > 0) {
      const highPriority = priorities.filter(p => p === 'HIGH' || p === 'CRITICAL').length;
      if (highPriority / priorities.length > 0.5) {
        conditions.push('Commonly used for high-priority requirements');
      }
    }

    return conditions;
  }

  private mapToPattern(node: any): RequirementPattern {
    const props = node.properties;
    return {
      id: props.id,
      name: props.name,
      description: props.description,
      type: props.type,
      template: props.template,
      applicabilityConditions: JSON.parse(props.applicabilityConditions || '[]'),
      successMetrics: {
        adoptionRate: props.adoptionRate || 0,
        successRate: props.successRate || 0,
        qualityScore: props.qualityScore || 0,
      },
      examples: JSON.parse(props.examples || '[]'),
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }
}