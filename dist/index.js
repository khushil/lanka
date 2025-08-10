"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const logger_1 = require("./core/logging/logger");
const neo4j_1 = require("./core/database/neo4j");
const services_1 = require("./services");
const schema_1 = require("./api/graphql/schema");
const PORT = process.env.PORT || 3000;
async function startServer() {
    try {
        logger_1.logger.info('Starting LANKA server...');
        // Initialize database
        const neo4j = neo4j_1.Neo4jService.getInstance();
        await neo4j.initializeSchema();
        // Initialize services
        const services = await (0, services_1.initializeServices)();
        // Create Express app
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        // Health check endpoint
        app.get('/health', (req, res) => {
            res.json({ status: 'healthy', timestamp: new Date().toISOString() });
        });
        // Create GraphQL server
        const schema = await (0, schema_1.createGraphQLSchema)();
        const apolloServer = new server_1.ApolloServer({
            schema,
            includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',
        });
        await apolloServer.start();
        app.use('/graphql', (0, express4_1.expressMiddleware)(apolloServer, {
            context: async ({ req }) => ({
                services,
                user: req.headers.authorization,
            }),
        }));
        app.listen(PORT, () => {
            logger_1.logger.info(`LANKA server is running on http://localhost:${PORT}`);
            logger_1.logger.info(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
        });
        // Graceful shutdown
        process.on('SIGTERM', async () => {
            logger_1.logger.info('SIGTERM signal received: closing server');
            await apolloServer.stop();
            await neo4j.close();
            process.exit(0);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=index.js.map