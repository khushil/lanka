import neo4j, { Driver, Session } from 'neo4j-driver';
import { logger } from '../logging/logger';

export class Neo4jService {
  private driver: Driver;
  private static instance: Neo4jService;

  private constructor() {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'lanka2025';

    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 60000,
      logging: {
        level: 'info',
        logger: (level, message) => logger.log(level, message),
      },
    });

    this.verifyConnectivity();
  }

  public static getInstance(): Neo4jService {
    if (!Neo4jService.instance) {
      Neo4jService.instance = new Neo4jService();
    }
    return Neo4jService.instance;
  }

  private async verifyConnectivity(): Promise<void> {
    try {
      await this.driver.verifyConnectivity();
      logger.info('Neo4j connection established successfully');
    } catch (error) {
      logger.error('Failed to connect to Neo4j', error);
      throw error;
    }
  }

  public getSession(database?: string): Session {
    return this.driver.session({
      database: database || neo4j.session.WRITE,
      defaultAccessMode: neo4j.session.WRITE,
    });
  }

  public async executeQuery(
    query: string,
    params: Record<string, any> = {},
    database?: string
  ): Promise<any> {
    const session = this.getSession(database);
    try {
      const result = await session.run(query, params);
      return result.records.map(record => record.toObject());
    } catch (error) {
      logger.error('Query execution failed', { query, params, error });
      throw error;
    } finally {
      await session.close();
    }
  }

  public async executeTransaction(
    work: (tx: any) => Promise<any>,
    database?: string
  ): Promise<any> {
    const session = this.getSession(database);
    try {
      return await session.executeWrite(work);
    } catch (error) {
      logger.error('Transaction execution failed', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  public async initializeSchema(): Promise<void> {
    const constraints = [
      // Core entity constraints
      'CREATE CONSTRAINT requirement_id IF NOT EXISTS FOR (r:Requirement) REQUIRE r.id IS UNIQUE',
      'CREATE CONSTRAINT architecture_id IF NOT EXISTS FOR (a:ArchitectureDecision) REQUIRE a.id IS UNIQUE',
      'CREATE CONSTRAINT architecture_pattern_id IF NOT EXISTS FOR (ap:ArchitecturePattern) REQUIRE ap.id IS UNIQUE',
      'CREATE CONSTRAINT technology_stack_id IF NOT EXISTS FOR (ts:TechnologyStack) REQUIRE ts.id IS UNIQUE',
      'CREATE CONSTRAINT code_component_id IF NOT EXISTS FOR (c:CodeComponent) REQUIRE c.id IS UNIQUE',
      'CREATE CONSTRAINT organization_id IF NOT EXISTS FOR (o:Organization) REQUIRE o.id IS UNIQUE',
      'CREATE CONSTRAINT project_id IF NOT EXISTS FOR (p:Project) REQUIRE p.id IS UNIQUE',
      'CREATE CONSTRAINT stakeholder_id IF NOT EXISTS FOR (s:Stakeholder) REQUIRE s.id IS UNIQUE',
      
      // Integration constraints
      'CREATE CONSTRAINT mapping_id IF NOT EXISTS FOR (m:RequirementArchitectureMapping) REQUIRE m.id IS UNIQUE',
      'CREATE CONSTRAINT alignment_composite IF NOT EXISTS FOR (al:ArchitectureRequirementAlignment) REQUIRE (al.requirementId, al.architectureDecisionId) IS UNIQUE',
      'CREATE CONSTRAINT recommendation_id IF NOT EXISTS FOR (rec:RequirementArchitectureRecommendation) REQUIRE rec.id IS UNIQUE',
      'CREATE CONSTRAINT impact_analysis_id IF NOT EXISTS FOR (ia:RequirementImpactAnalysis) REQUIRE ia.id IS UNIQUE',
    ];

    const indexes = [
      // Core entity indexes
      'CREATE INDEX requirement_type IF NOT EXISTS FOR (r:Requirement) ON (r.type)',
      'CREATE INDEX requirement_status IF NOT EXISTS FOR (r:Requirement) ON (r.status)',
      'CREATE INDEX requirement_priority IF NOT EXISTS FOR (r:Requirement) ON (r.priority)',
      'CREATE INDEX requirement_project IF NOT EXISTS FOR (r:Requirement) ON (r.projectId)',
      'CREATE INDEX architecture_status IF NOT EXISTS FOR (a:ArchitectureDecision) ON (a.status)',
      'CREATE INDEX architecture_project IF NOT EXISTS FOR (a:ArchitectureDecision) ON (a.projectId)',
      'CREATE INDEX architecture_pattern_type IF NOT EXISTS FOR (ap:ArchitecturePattern) ON (ap.type)',
      'CREATE INDEX technology_stack_expertise IF NOT EXISTS FOR (ts:TechnologyStack) ON (ts.teamExpertise)',
      'CREATE INDEX code_language IF NOT EXISTS FOR (c:CodeComponent) ON (c.language)',
      
      // Integration indexes
      'CREATE INDEX mapping_requirement IF NOT EXISTS FOR (m:RequirementArchitectureMapping) ON (m.requirementId)',
      'CREATE INDEX mapping_architecture_decision IF NOT EXISTS FOR (m:RequirementArchitectureMapping) ON (m.architectureDecisionId)',
      'CREATE INDEX mapping_architecture_pattern IF NOT EXISTS FOR (m:RequirementArchitectureMapping) ON (m.architecturePatternId)',
      'CREATE INDEX mapping_technology_stack IF NOT EXISTS FOR (m:RequirementArchitectureMapping) ON (m.technologyStackId)',
      'CREATE INDEX mapping_confidence IF NOT EXISTS FOR (m:RequirementArchitectureMapping) ON (m.confidence)',
      'CREATE INDEX mapping_type IF NOT EXISTS FOR (m:RequirementArchitectureMapping) ON (m.mappingType)',
      'CREATE INDEX alignment_requirement IF NOT EXISTS FOR (al:ArchitectureRequirementAlignment) ON (al.requirementId)',
      'CREATE INDEX alignment_architecture IF NOT EXISTS FOR (al:ArchitectureRequirementAlignment) ON (al.architectureDecisionId)',
      'CREATE INDEX alignment_score IF NOT EXISTS FOR (al:ArchitectureRequirementAlignment) ON (al.alignmentScore)',
      'CREATE INDEX alignment_type IF NOT EXISTS FOR (al:ArchitectureRequirementAlignment) ON (al.alignmentType)',
      'CREATE INDEX alignment_status IF NOT EXISTS FOR (al:ArchitectureRequirementAlignment) ON (al.validationStatus)',
      
      // Date indexes for temporal queries
      'CREATE INDEX requirement_created IF NOT EXISTS FOR (r:Requirement) ON (r.createdAt)',
      'CREATE INDEX architecture_created IF NOT EXISTS FOR (a:ArchitectureDecision) ON (a.createdAt)',
      'CREATE INDEX mapping_created IF NOT EXISTS FOR (m:RequirementArchitectureMapping) ON (m.createdAt)',
      'CREATE INDEX alignment_assessed IF NOT EXISTS FOR (al:ArchitectureRequirementAlignment) ON (al.lastAssessed)',
      
      // Full-text search indexes
      'CREATE FULLTEXT INDEX requirement_search IF NOT EXISTS FOR (r:Requirement) ON EACH [r.description, r.title, r.businessValue, r.technicalNotes]',
      'CREATE FULLTEXT INDEX architecture_search IF NOT EXISTS FOR (a:ArchitectureDecision) ON EACH [a.description, a.title, a.rationale]',
      'CREATE FULLTEXT INDEX pattern_search IF NOT EXISTS FOR (ap:ArchitecturePattern) ON EACH [ap.description, ap.name]',
      'CREATE FULLTEXT INDEX technology_search IF NOT EXISTS FOR (ts:TechnologyStack) ON EACH [ts.description, ts.name]',
      'CREATE FULLTEXT INDEX mapping_search IF NOT EXISTS FOR (m:RequirementArchitectureMapping) ON EACH [m.rationale, m.implementationGuidance]',
    ];

    for (const constraint of constraints) {
      try {
        await this.executeQuery(constraint);
        logger.info(`Created constraint: ${constraint.split(' ')[2]}`);
      } catch (error: any) {
        if (!error.message?.includes('already exists')) {
          throw error;
        }
      }
    }

    for (const index of indexes) {
      try {
        await this.executeQuery(index);
        logger.info(`Created index: ${index.split(' ')[2]}`);
      } catch (error: any) {
        if (!error.message?.includes('already exists')) {
          throw error;
        }
      }
    }
  }

  public async close(): Promise<void> {
    await this.driver.close();
    logger.info('Neo4j connection closed');
  }
}