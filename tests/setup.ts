import { Neo4jService } from '../src/core/database/neo4j';
import { logger } from '../src/core/logging/logger';

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Set test database URLs
  process.env.NEO4J_URI = process.env.NEO4J_TEST_URI || 'bolt://localhost:7687';
  process.env.NEO4J_USER = process.env.NEO4J_TEST_USER || 'neo4j';
  process.env.NEO4J_PASSWORD = process.env.NEO4J_TEST_PASSWORD || 'lanka2025';
  
  // Suppress logs during tests
  logger.transports.forEach(transport => {
    transport.silent = true;
  });
});

// Global test cleanup
afterAll(async () => {
  // Close all database connections
  const neo4j = Neo4jService.getInstance();
  if (neo4j) {
    await neo4j.close();
  }
});

// Set longer timeout for integration tests
jest.setTimeout(60000);

// Mock external services for unit tests
jest.mock('../src/core/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    transports: [{ silent: false }]
  }
}));