import { Session } from 'neo4j-driver';
export declare class Neo4jService {
    private driver;
    private static instance;
    private sessionPool;
    private poolCleanupInterval;
    private maxPoolSize;
    private sessionTTL;
    private isShuttingDown;
    private constructor();
    static getInstance(): Neo4jService;
    private verifyConnectivity;
    getSession(database?: string): Session;
    executeQuery(query: string, params?: Record<string, any>, database?: string, usePool?: boolean): Promise<any>;
    executeTransaction(work: (tx: any) => Promise<any>, database?: string, usePool?: boolean): Promise<any>;
    initializeSchema(): Promise<void>;
    close(): Promise<void>;
    private startPoolCleanup;
    private cleanupExpiredSessions;
    private cleanupSession;
    private safeCloseSession;
    getPoolStats(): {
        poolSize: number;
        maxPoolSize: number;
        activeSessions: number;
    };
    executeStreamingQuery(query: string, params?: Record<string, any>, database?: string, batchSize?: number): Promise<AsyncGenerator<any[], void, unknown>>;
    private createStreamingQuery;
}
//# sourceMappingURL=neo4j.d.ts.map