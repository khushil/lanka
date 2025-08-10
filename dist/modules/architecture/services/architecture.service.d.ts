import { Neo4jService } from '../../../core/database/neo4j';
export declare class ArchitectureService {
    private neo4j;
    constructor(neo4j: Neo4jService);
    createArchitectureDecision(input: any): Promise<any>;
    findArchitecturePatterns(requirementId: string): Promise<any[]>;
    optimizeForEnvironment(architectureId: string, environment: string): Promise<any>;
}
//# sourceMappingURL=architecture.service.d.ts.map