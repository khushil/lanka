import { Neo4jService } from '../core/database/neo4j';
import { RequirementsService } from '../modules/requirements/services/requirements.service';
import { ArchitectureService } from '../modules/architecture/services/architecture.service';
import { DevelopmentService } from '../modules/development/services/development.service';
import { logger } from '../core/logging/logger';

export interface Services {
  requirements: RequirementsService;
  architecture: ArchitectureService;
  development: DevelopmentService;
  neo4j: Neo4jService;
}

export async function initializeServices(): Promise<Services> {
  logger.info('Initializing LANKA services...');

  const neo4j = Neo4jService.getInstance();
  
  const requirements = new RequirementsService(neo4j);
  const architecture = new ArchitectureService(neo4j);
  const development = new DevelopmentService(neo4j);

  logger.info('All services initialized successfully');

  return {
    requirements,
    architecture,
    development,
    neo4j,
  };
}