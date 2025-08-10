import { Session } from 'neo4j-driver';
export declare class Neo4jService {
    private driver;
    private static instance;
    private constructor();
    static getInstance(): Neo4jService;
    private verifyConnectivity;
    getSession(database?: string): Session;
    executeQuery(query: string, params?: Record<string, any>, database?: string): Promise<any>;
    executeTransaction(work: (tx: any) => Promise<any>, database?: string): Promise<any>;
    initializeSchema(): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=neo4j.d.ts.map