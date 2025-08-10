import { Neo4jService } from '../core/database/neo4j';
import { RequirementsService } from '../modules/requirements/services/requirements.service';
import { ArchitectureService } from '../modules/architecture/services/architecture.service';
import { DevelopmentService } from '../modules/development/services/development.service';
export interface Services {
    requirements: RequirementsService;
    architecture: ArchitectureService;
    development: DevelopmentService;
    neo4j: Neo4jService;
}
export declare function initializeServices(): Promise<Services>;
//# sourceMappingURL=index.d.ts.map