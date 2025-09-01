"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Neo4jService = void 0;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const logger_1 = require("../logging/logger");
const environment_1 = require("../config/environment");
class Neo4jService {
    driver;
    static instance;
    sessionPool = new Map();
    poolCleanupInterval = null;
    maxPoolSize = 10;
    sessionTTL = 30000; // 30 seconds
    isShuttingDown = false;
    constructor() {
        // Use validated environment configuration
        const config = (0, environment_1.loadEnvironmentConfig)();
        const { uri, user, password } = config.neo4j;
        this.driver = neo4j_driver_1.default.driver(uri, neo4j_driver_1.default.auth.basic(user, password), {
            maxConnectionPoolSize: 20,
            connectionAcquisitionTimeout: 30000,
            maxConnectionLifetime: 30 * 60 * 1000, // 30 minutes
            connectionTimeout: 20000,
            disableLosslessIntegers: true,
            useBigInt: false,
            logging: {
                level: 'info',
                logger: (level, message) => logger_1.logger.log(level, message),
            },
        });
        // Start session pool cleanup
        this.startPoolCleanup();
        this.verifyConnectivity();
    }
    static getInstance() {
        if (!Neo4jService.instance) {
            Neo4jService.instance = new Neo4jService();
        }
        return Neo4jService.instance;
    }
    async verifyConnectivity() {
        try {
            await this.driver.verifyConnectivity();
            logger_1.logger.info('Neo4j connection established successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to connect to Neo4j', error);
            throw error;
        }
    }
    getSession(database) {
        if (this.isShuttingDown) {
            throw new Error('Neo4j service is shutting down');
        }
        const key = `${database || 'default'}_${neo4j_driver_1.default.session.WRITE}`;
        const poolEntry = this.sessionPool.get(key);
        // Reuse existing session if available and not expired
        if (poolEntry && Date.now() - poolEntry.lastUsed < this.sessionTTL) {
            poolEntry.lastUsed = Date.now();
            return poolEntry.session;
        }
        // Clean up expired session
        if (poolEntry) {
            this.cleanupSession(key, poolEntry.session);
        }
        // Create new session if pool has space
        if (this.sessionPool.size < this.maxPoolSize) {
            const session = this.driver.session({
                database: database || neo4j_driver_1.default.session.WRITE,
                defaultAccessMode: neo4j_driver_1.default.session.WRITE,
            });
            this.sessionPool.set(key, {
                session,
                lastUsed: Date.now()
            });
            return session;
        }
        // Pool is full, return a new session without pooling
        return this.driver.session({
            database: database || neo4j_driver_1.default.session.WRITE,
            defaultAccessMode: neo4j_driver_1.default.session.WRITE,
        });
    }
    async executeQuery(query, params = {}, database, usePool = false) {
        let session;
        let shouldClose = true;
        if (usePool) {
            session = this.getSession(database);
            shouldClose = false; // Pool manages session lifecycle
        }
        else {
            session = this.driver.session({
                database: database || neo4j_driver_1.default.session.WRITE,
                defaultAccessMode: neo4j_driver_1.default.session.WRITE,
            });
        }
        try {
            // Add query timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Query timeout')), 30000);
            });
            const queryPromise = session.run(query, params);
            const result = await Promise.race([queryPromise, timeoutPromise]);
            return result.records.map((record) => record.toObject());
        }
        catch (error) {
            logger_1.logger.error('Query execution failed', { query, params, error });
            throw error;
        }
        finally {
            if (shouldClose) {
                await this.safeCloseSession(session);
            }
        }
    }
    async executeTransaction(work, database, usePool = false) {
        let session;
        let shouldClose = true;
        if (usePool) {
            session = this.getSession(database);
            shouldClose = false;
        }
        else {
            session = this.driver.session({
                database: database || neo4j_driver_1.default.session.WRITE,
                defaultAccessMode: neo4j_driver_1.default.session.WRITE,
            });
        }
        try {
            // Add transaction timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Transaction timeout')), 60000);
            });
            const transactionPromise = session.executeWrite(work);
            return await Promise.race([transactionPromise, timeoutPromise]);
        }
        catch (error) {
            logger_1.logger.error('Transaction execution failed', error);
            throw error;
        }
        finally {
            if (shouldClose) {
                await this.safeCloseSession(session);
            }
        }
    }
    async initializeSchema() {
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
                logger_1.logger.info(`Created constraint: ${constraint.split(' ')[2]}`);
            }
            catch (error) {
                if (!error.message?.includes('already exists')) {
                    throw error;
                }
            }
        }
        for (const index of indexes) {
            try {
                await this.executeQuery(index);
                logger_1.logger.info(`Created index: ${index.split(' ')[2]}`);
            }
            catch (error) {
                if (!error.message?.includes('already exists')) {
                    throw error;
                }
            }
        }
    }
    async close() {
        this.isShuttingDown = true;
        // Stop pool cleanup
        if (this.poolCleanupInterval) {
            clearInterval(this.poolCleanupInterval);
            this.poolCleanupInterval = null;
        }
        // Close all pooled sessions
        const closePromises = [];
        for (const [key, poolEntry] of this.sessionPool) {
            closePromises.push(this.safeCloseSession(poolEntry.session));
        }
        await Promise.all(closePromises);
        this.sessionPool.clear();
        // Close driver
        await this.driver.close();
        logger_1.logger.info('Neo4j connection closed');
    }
    startPoolCleanup() {
        this.poolCleanupInterval = setInterval(() => {
            this.cleanupExpiredSessions();
        }, 10000); // Clean up every 10 seconds
    }
    cleanupExpiredSessions() {
        if (this.isShuttingDown)
            return;
        const now = Date.now();
        const expiredKeys = [];
        for (const [key, poolEntry] of this.sessionPool) {
            if (now - poolEntry.lastUsed > this.sessionTTL) {
                expiredKeys.push(key);
            }
        }
        expiredKeys.forEach(key => {
            const poolEntry = this.sessionPool.get(key);
            if (poolEntry) {
                this.cleanupSession(key, poolEntry.session);
            }
        });
    }
    cleanupSession(key, session) {
        this.sessionPool.delete(key);
        this.safeCloseSession(session).catch(error => {
            logger_1.logger.warn(`Failed to close session ${key}:`, error);
        });
    }
    async safeCloseSession(session) {
        try {
            await session.close();
        }
        catch (error) {
            logger_1.logger.warn('Failed to close session gracefully:', error);
        }
    }
    getPoolStats() {
        return {
            poolSize: this.sessionPool.size,
            maxPoolSize: this.maxPoolSize,
            activeSessions: Array.from(this.sessionPool.values())
                .filter(entry => Date.now() - entry.lastUsed < this.sessionTTL).length
        };
    }
    async executeStreamingQuery(query, params = {}, database, batchSize = 1000) {
        return this.createStreamingQuery(query, params, database, batchSize);
    }
    async *createStreamingQuery(query, params, database, batchSize = 1000) {
        const session = this.driver.session({
            database: database || neo4j_driver_1.default.session.WRITE,
            defaultAccessMode: neo4j_driver_1.default.session.READ,
        });
        try {
            let skip = 0;
            let hasMore = true;
            while (hasMore) {
                const paginatedQuery = `${query} SKIP ${skip} LIMIT ${batchSize}`;
                const result = await session.run(paginatedQuery, params);
                const records = result.records.map(record => record.toObject());
                if (records.length === 0) {
                    hasMore = false;
                }
                else {
                    yield records;
                    skip += batchSize;
                    // Check if we got fewer records than requested (end of data)
                    if (records.length < batchSize) {
                        hasMore = false;
                    }
                }
            }
        }
        finally {
            await this.safeCloseSession(session);
        }
    }
}
exports.Neo4jService = Neo4jService;
//# sourceMappingURL=neo4j.js.map