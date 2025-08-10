import 'dotenv/config';
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { logger } from './core/logging/logger';
import { Neo4jService } from './core/database/neo4j';
import { initializeServices } from './services';
import { createGraphQLSchema } from './api/graphql/schema';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    logger.info('Starting LANKA server...');

    // Initialize database
    const neo4j = Neo4jService.getInstance();
    await neo4j.initializeSchema();

    // Initialize services
    const services = await initializeServices();

    // Create Express app
    const app = express();
    app.use(express.json());

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // Create GraphQL server
    const schema = await createGraphQLSchema();
    const apolloServer = new ApolloServer({
      schema,
      includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',
    });

    await apolloServer.start();

    app.use(
      '/graphql',
      expressMiddleware(apolloServer, {
        context: async ({ req }) => ({
          services,
          user: req.headers.authorization,
        }),
      })
    );

    app.listen(PORT, () => {
      logger.info(`LANKA server is running on http://localhost:${PORT}`);
      logger.info(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM signal received: closing server');
      await apolloServer.stop();
      await neo4j.close();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

startServer();