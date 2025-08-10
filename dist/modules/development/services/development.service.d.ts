import { Neo4jService } from '../../../core/database/neo4j';
export declare class DevelopmentService {
    private neo4j;
    constructor(neo4j: Neo4jService);
    generateCode(requirementId: string, architectureId: string): Promise<any>;
    generateTests(codeComponentId: string): Promise<any[]>;
    analyzeCICD(projectId: string): Promise<any>;
}
//# sourceMappingURL=development.service.d.ts.map