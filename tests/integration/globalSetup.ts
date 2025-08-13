import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { Neo4jContainer, StartedNeo4jContainer } from '@testcontainers/neo4j';

let neo4jContainer: StartedNeo4jContainer;

export default async function globalSetup(): Promise<void> {
  console.log('Setting up integration test environment...');

  try {
    // Start Neo4j test container
    neo4jContainer = await new Neo4jContainer('neo4j:5-community')
      .withAuthentication('neo4j', 'testpassword')
      .withAdminPassword('testpassword')
      .withApoc()
      .withEnvironment({
        'NEO4J_dbms_memory_pagecache_size': '512M',
        'NEO4J_dbms_memory_heap_initial__size': '512M',
        'NEO4J_dbms_memory_heap_max__size': '1G',
      })
      .start();

    // Set environment variables for tests
    process.env.NEO4J_TEST_URI = neo4jContainer.getBoltUri();
    process.env.NEO4J_TEST_USER = 'neo4j';
    process.env.NEO4J_TEST_PASSWORD = 'testpassword';

    // Store container reference for cleanup
    (global as any).__NEO4J_CONTAINER__ = neo4jContainer;

    console.log(`Neo4j test container started at: ${neo4jContainer.getBoltUri()}`);
    console.log('Integration test environment ready.');
  } catch (error) {
    console.error('Failed to set up integration test environment:', error);
    throw error;
  }
}

export { neo4jContainer };