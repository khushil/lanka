import { StartedNeo4jContainer } from '@testcontainers/neo4j';

export default async function globalTeardown(): Promise<void> {
  console.log('Tearing down integration test environment...');

  try {
    // Stop Neo4j test container
    const neo4jContainer = (global as any).__NEO4J_CONTAINER__ as StartedNeo4jContainer;
    if (neo4jContainer) {
      await neo4jContainer.stop();
      console.log('Neo4j test container stopped.');
    }

    // Clean up environment variables
    delete process.env.NEO4J_TEST_URI;
    delete process.env.NEO4J_TEST_USER;
    delete process.env.NEO4J_TEST_PASSWORD;

    console.log('Integration test environment cleanup completed.');
  } catch (error) {
    console.error('Failed to tear down integration test environment:', error);
    throw error;
  }
}