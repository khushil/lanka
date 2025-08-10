import { Before, After, BeforeAll, AfterAll, Status } from '@cucumber/cucumber';
import { Neo4jService } from '../../src/core/database/neo4j';
import { logger } from '../../src/core/logging/logger';

let globalNeo4j: Neo4jService;

/**
 * Global test hooks for Development Intelligence BDD tests
 * Handles test environment setup, cleanup, and reporting
 */

BeforeAll(async function() {
  logger.info('Initializing BDD test environment');
  
  // Initialize test database connection
  globalNeo4j = new Neo4jService(
    process.env.NEO4J_TEST_URI || 'bolt://localhost:7688',
    {
      username: process.env.NEO4J_TEST_USER || 'neo4j',
      password: process.env.NEO4J_TEST_PASSWORD || 'testpassword'
    }
  );
  
  try {
    await globalNeo4j.connect();
    logger.info('Test database connection established');
    
    // Setup test constraints and indexes
    await setupTestDatabase();
    
    // Clear any existing test data
    await clearTestData();
    
    logger.info('BDD test environment ready');
  } catch (error) {
    logger.error('Failed to initialize test environment', error);
    throw error;
  }
});

AfterAll(async function() {
  logger.info('Cleaning up BDD test environment');
  
  try {
    // Clear all test data
    await clearTestData();
    
    // Close database connection
    await globalNeo4j.close();
    
    logger.info('BDD test environment cleaned up');
  } catch (error) {
    logger.error('Error during test cleanup', error);
  }
});

Before(async function(scenario) {
  logger.info(`Starting scenario: ${scenario.pickle.name}`);
  
  // Set up scenario-specific test data
  this.scenarioName = scenario.pickle.name;
  this.scenarioTags = scenario.pickle.tags.map((tag: any) => tag.name);
  this.startTime = Date.now();
  
  // Skip scenarios marked as @skip
  if (this.scenarioTags.includes('@skip')) {
    return 'skipped';
  }
  
  // Initialize test context for this scenario
  this.testContext = {
    neo4j: globalNeo4j,
    testData: {},
    results: {},
    cleanup: []
  };
});

After(async function(scenario) {
  const duration = Date.now() - this.startTime;
  
  try {
    // Cleanup scenario-specific data
    if (this.testContext && this.testContext.cleanup) {
      for (const cleanupFn of this.testContext.cleanup) {
        await cleanupFn();
      }
    }
    
    // Clear scenario-specific test data
    await clearScenarioData(this.scenarioName);
    
    // Log scenario completion
    const status = scenario.result?.status || Status.UNKNOWN;
    logger.info(`Scenario completed: ${this.scenarioName} - ${status} (${duration}ms)`);
    
    // Take screenshot on failure (for web-based tests)
    if (status === Status.FAILED && this.browser) {
      const screenshot = await this.browser.takeScreenshot();
      this.attach(screenshot, 'image/png');
    }
    
    // Attach logs if scenario failed
    if (status === Status.FAILED) {
      const logs = await getScenarioLogs(this.scenarioName);
      this.attach(logs, 'text/plain');
    }
    
  } catch (error) {
    logger.error(`Error in After hook for ${this.scenarioName}`, error);
  }
});

// Tag-specific hooks
Before({ tags: '@performance' }, async function() {
  // Setup performance monitoring
  this.performanceMonitor = {
    startTime: Date.now(),
    memoryStart: process.memoryUsage()
  };
  
  logger.info('Performance monitoring enabled for scenario');
});

After({ tags: '@performance' }, async function() {
  // Collect performance metrics
  const endTime = Date.now();
  const memoryEnd = process.memoryUsage();
  
  const metrics = {
    duration: endTime - this.performanceMonitor.startTime,
    memoryDelta: {
      rss: memoryEnd.rss - this.performanceMonitor.memoryStart.rss,
      heapUsed: memoryEnd.heapUsed - this.performanceMonitor.memoryStart.heapUsed,
      heapTotal: memoryEnd.heapTotal - this.performanceMonitor.memoryStart.heapTotal,
      external: memoryEnd.external - this.performanceMonitor.memoryStart.external
    }
  };
  
  this.attach(JSON.stringify(metrics, null, 2), 'application/json');
  logger.info('Performance metrics collected', metrics);
});

Before({ tags: '@integration' }, async function() {
  // Setup integration test environment
  logger.info('Setting up integration test environment');
  
  // Ensure all modules are properly initialized
  await ensureModulesReady();
  
  // Setup test data for cross-module scenarios
  await setupIntegrationTestData();
});

Before({ tags: '@security' }, async function() {
  // Setup security test environment
  logger.info('Setting up security test environment');
  
  // Configure security scanning tools
  await configureSecurityTools();
});

// Helper functions
async function setupTestDatabase(): Promise<void> {
  const queries = [
    // Create constraints
    'CREATE CONSTRAINT project_id IF NOT EXISTS FOR (p:Project) REQUIRE p.id IS UNIQUE',
    'CREATE CONSTRAINT requirement_id IF NOT EXISTS FOR (r:Requirement) REQUIRE r.id IS UNIQUE',
    'CREATE CONSTRAINT architecture_id IF NOT EXISTS FOR (a:ArchitectureDecision) REQUIRE a.id IS UNIQUE',
    'CREATE CONSTRAINT development_task_id IF NOT EXISTS FOR (d:DevelopmentTask) REQUIRE d.id IS UNIQUE',
    
    // Create indexes for performance
    'CREATE INDEX project_name IF NOT EXISTS FOR (p:Project) ON (p.name)',
    'CREATE INDEX requirement_type IF NOT EXISTS FOR (r:Requirement) ON (r.type)',
    'CREATE INDEX architecture_status IF NOT EXISTS FOR (a:ArchitectureDecision) ON (a.status)',
    'CREATE INDEX task_status IF NOT EXISTS FOR (d:DevelopmentTask) ON (d.status)'
  ];
  
  for (const query of queries) {
    try {
      await globalNeo4j.executeQuery(query);
    } catch (error) {
      // Ignore constraint/index already exists errors
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  }
}

async function clearTestData(): Promise<void> {
  const deleteQueries = [
    'MATCH (n:TestData) DETACH DELETE n',
    'MATCH (n) WHERE n.testScenario IS NOT NULL DETACH DELETE n',
    'MATCH (n) WHERE any(label IN labels(n) WHERE label STARTS WITH "Test") DETACH DELETE n'
  ];
  
  for (const query of deleteQueries) {
    await globalNeo4j.executeQuery(query);
  }
}

async function clearScenarioData(scenarioName: string): Promise<void> {
  const query = `
    MATCH (n) 
    WHERE n.testScenario = $scenarioName 
    DETACH DELETE n
  `;
  
  await globalNeo4j.executeQuery(query, { scenarioName });
}

async function ensureModulesReady(): Promise<void> {
  // Verify all required services are available
  const healthChecks = [
    () => globalNeo4j.isConnected(),
    // Add other module health checks as needed
  ];
  
  for (const check of healthChecks) {
    if (!check()) {
      throw new Error('Module health check failed');
    }
  }
}

async function setupIntegrationTestData(): Promise<void> {
  // Create sample data for integration tests
  const setupQueries = [
    `CREATE (p:Project {
      id: 'integration-test-project',
      name: 'Integration Test Project',
      testScenario: 'integration-setup'
    })`,
    
    `CREATE (r:Requirement {
      id: 'integration-test-requirement',
      title: 'Integration Test Requirement',
      type: 'FUNCTIONAL',
      testScenario: 'integration-setup'
    })`,
    
    `CREATE (a:ArchitectureDecision {
      id: 'integration-test-architecture',
      title: 'Integration Test Architecture',
      status: 'APPROVED',
      testScenario: 'integration-setup'
    })`
  ];
  
  for (const query of setupQueries) {
    await globalNeo4j.executeQuery(query);
  }
}

async function configureSecurityTools(): Promise<void> {
  // Configure security testing tools
  logger.info('Security tools configured for testing');
}

async function getScenarioLogs(scenarioName: string): Promise<string> {
  // Collect relevant logs for the scenario
  return `Logs for scenario: ${scenarioName}\nImplement log collection logic here`;
}

export { globalNeo4j };