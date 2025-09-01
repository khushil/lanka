import { jest } from '@jest/globals';

export default async function setup() {
  console.log('Setting up integration test environment...');
  
  // Set integration test environment variables
  process.env.NODE_ENV = 'integration-test';
  process.env.LOG_LEVEL = 'error';
  process.env.TEST_TIMEOUT = '30000';
  
  // Mock external services for integration tests
  process.env.NEO4J_URI = 'bolt://localhost:7687';
  process.env.NEO4J_USER = 'test';
  process.env.NEO4J_PASSWORD = 'test';
  
  process.env.QDRANT_URL = 'http://localhost:6333';
  process.env.REDIS_URL = 'redis://localhost:6379/1';
  process.env.POSTGRES_URL = 'postgresql://test:test@localhost:5432/lanka_test';
  
  // Initialize test containers or services here if needed
  console.log('Integration test environment ready');
};