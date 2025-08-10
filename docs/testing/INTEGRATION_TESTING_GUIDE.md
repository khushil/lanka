# LANKA Integration Testing Guide

## Overview

This guide provides comprehensive documentation for the LANKA project's integration testing infrastructure, covering the Architecture Intelligence and Requirements module integration tests.

## Table of Contents

1. [Test Architecture](#test-architecture)
2. [Test Suites](#test-suites)
3. [Setup and Configuration](#setup-and-configuration)
4. [Running Tests](#running-tests)
5. [Test Data Management](#test-data-management)
6. [Performance Testing](#performance-testing)
7. [CI/CD Integration](#cicd-integration)
8. [Troubleshooting](#troubleshooting)

## Test Architecture

### Framework Stack

- **Testing Framework**: Jest with TypeScript support
- **API Testing**: Supertest for HTTP/GraphQL endpoint testing
- **Database Testing**: Neo4j test containers for isolated database testing
- **Performance Testing**: Artillery.js for load testing
- **Real-time Testing**: WebSocket testing with mock servers
- **Coverage**: Istanbul/NYC for comprehensive coverage reporting

### Test Organization

```
tests/
├── integration/                 # Integration test suites
│   ├── cross-module-flows.test.ts
│   ├── api-integration.test.ts
│   ├── database-integration.test.ts
│   ├── realtime-integration.test.ts
│   ├── performance-integration.test.ts
│   ├── error-scenarios.test.ts
│   ├── globalSetup.ts
│   ├── globalTeardown.ts
│   └── test-reporter.ts
├── factories/                   # Test data factories
│   └── test-data.factory.ts
├── performance/                 # Performance test configs
│   └── load-test.yml
└── setup.ts                    # Global test setup
```

## Test Suites

### 1. Cross-Module Flow Tests (`cross-module-flows.test.ts`)

Tests the complete integration between Requirements and Architecture Intelligence modules.

**Key Test Areas:**
- End-to-end requirement → architecture recommendation flow
- Multi-requirement to multi-architecture mapping
- Requirement change propagation to architecture
- Complex relationship patterns
- Data consistency verification

**Sample Test:**
```typescript
it('should complete full flow: requirement creation → recommendation → mapping → validation', async () => {
  // Create requirement
  const requirement = await requirementsService.createRequirement(testData);
  
  // Generate recommendations
  const recommendations = await integrationService.generateRecommendations(requirement.id);
  
  // Create architecture decision based on recommendations
  const decision = await decisionService.createDecision(decisionData);
  
  // Create mapping
  const mapping = await integrationService.createMapping(mappingData);
  
  // Validate alignment
  const alignment = await integrationService.validateAlignment(requirement.id, decision.id);
  
  // Verify complete integration
  expect(alignment.alignmentScore).toBeGreaterThan(0.7);
});
```

### 2. API Integration Tests (`api-integration.test.ts`)

Tests GraphQL resolvers and REST endpoints with real database connections.

**Key Test Areas:**
- GraphQL query and mutation testing
- Complex nested resolver testing
- Error handling and validation
- Authentication and authorization
- Performance benchmarking

**Sample Test:**
```typescript
it('should fetch requirements with architecture mappings via GraphQL', async () => {
  const query = `
    query GetRequirementsWithMappings($projectId: ID!) {
      requirements(projectId: $projectId) {
        id
        title
        architectureMappings {
          confidence
          architectureDecision {
            title
          }
        }
      }
    }
  `;

  const response = await request(app)
    .post('/graphql')
    .send({ query, variables: { projectId } })
    .expect(200);

  expect(response.body.data.requirements).toBeDefined();
});
```

### 3. Database Integration Tests (`database-integration.test.ts`)

Tests Neo4j database operations, constraints, and relationship integrity.

**Key Test Areas:**
- Schema constraint validation
- Cross-module relationship integrity
- Query performance optimization
- Transaction management
- Data consistency under load

**Sample Test:**
```typescript
it('should maintain referential integrity across requirement-architecture relationships', async () => {
  // Create entities and relationships
  const requirement = await requirementsService.createRequirement(reqData);
  const decision = await decisionService.createDecision(decData);
  const mapping = await integrationService.createMapping(mappingData);

  // Verify relationship chain exists
  const verifyQuery = `
    MATCH (r:Requirement {id: $requirementId})
    MATCH (a:ArchitectureDecision {id: $architectureDecisionId})  
    MATCH (m:RequirementArchitectureMapping {id: $mappingId})
    MATCH (r)-[:MAPPED_TO]->(m)-[:MAPS_TO_DECISION]->(a)
    RETURN count(*) as relationshipCount
  `;

  const results = await neo4j.executeQuery(verifyQuery, params);
  expect(results[0].relationshipCount).toBe(1);
});
```

### 4. Real-time Integration Tests (`realtime-integration.test.ts`)

Tests WebSocket notifications and live update synchronization.

**Key Test Areas:**
- WebSocket event broadcasting
- Real-time recommendation updates
- Live synchronization across clients
- Event ordering and consistency
- Connection failure recovery

### 5. Performance Integration Tests (`performance-integration.test.ts`)

Tests system performance under various loads and conditions.

**Key Test Areas:**
- Individual operation performance
- Batch operation efficiency
- Complex query optimization
- Concurrent operation handling
- Memory usage patterns
- Scalability characteristics

**Performance Thresholds:**
```typescript
const PERFORMANCE_THRESHOLDS = {
  singleQuery: 1000,    // 1 second
  batchOperation: 5000, // 5 seconds
  complexQuery: 3000,   // 3 seconds
  concurrentOps: 10000, // 10 seconds
  memoryLimit: 500 * 1024 * 1024 // 500MB
};
```

### 6. Error Scenario Tests (`error-scenarios.test.ts`)

Tests error handling and system resilience.

**Key Test Areas:**
- Database connection failures
- Transaction rollback scenarios
- Data validation failures
- Resource exhaustion handling
- Network failure recovery
- Concurrent access conflicts

## Setup and Configuration

### Prerequisites

```bash
# Install dependencies
npm install

# Install test containers support  
npm install --save-dev testcontainers @testcontainers/neo4j

# Install performance testing tools
npm install -g artillery
```

### Environment Variables

Create `.env.test` file:
```bash
NODE_ENV=test
NEO4J_TEST_URI=bolt://localhost:7687
NEO4J_TEST_USER=neo4j
NEO4J_TEST_PASSWORD=testpassword
MONGODB_TEST_URI=mongodb://localhost:27017/test
REDIS_TEST_URI=redis://localhost:6379
```

### Database Setup

The test infrastructure uses Neo4j test containers for isolated testing:

```typescript
// Integration tests automatically start Neo4j container
export default async function globalSetup(): Promise<void> {
  neo4jContainer = await new Neo4jContainer('neo4j:5-enterprise')
    .withAuthentication('neo4j', 'testpassword')
    .withApoc()
    .start();
    
  process.env.NEO4J_TEST_URI = neo4jContainer.getBoltUri();
}
```

## Running Tests

### Individual Test Suites

```bash
# Run specific integration test suite
npm test tests/integration/cross-module-flows.test.ts
npm test tests/integration/api-integration.test.ts
npm test tests/integration/database-integration.test.ts
npm test tests/integration/realtime-integration.test.ts
npm test tests/integration/performance-integration.test.ts
npm test tests/integration/error-scenarios.test.ts
```

### Batch Test Execution

```bash
# Run all integration tests
npm run test:integration

# Run with coverage
npm run test:coverage

# Run end-to-end tests
npm run test:e2e

# Run all test types
npm run test:all
```

### Performance Testing

```bash
# Run performance integration tests
npm test tests/integration/performance-integration.test.ts

# Run Artillery load tests (requires running app)
npm run dev &  # Start application
npm run test:performance  # Run Artillery tests
```

### Watch Mode

```bash
# Run tests in watch mode for development
npm run test:watch
```

## Test Data Management

### Test Data Factory

The `TestDataFactory` provides consistent test data generation:

```typescript
// Create individual entities
const requirement = TestDataFactory.createRequirement();
const decision = TestDataFactory.createArchitectureDecision();
const pattern = TestDataFactory.createArchitecturePattern();

// Create complete scenarios
const scenario = TestDataFactory.createIntegrationScenario();

// Create batch data for performance testing
const batchData = TestDataFactory.createBatchTestData(100);
```

### Data Cleanup

Tests automatically clean up data using test-specific prefixes:

```typescript
// Cleanup runs after each test
async function cleanupTestData() {
  const queries = [
    'MATCH (n) WHERE n.id STARTS WITH "test-" DETACH DELETE n',
    'MATCH (n) WHERE n.id STARTS WITH "perf-test-" DETACH DELETE n'
  ];
  
  for (const query of queries) {
    await neo4j.executeQuery(query);
  }
}
```

### Test Isolation

Each test gets isolated data:
- Unique IDs with timestamps
- Separate Neo4j database sessions
- Cleanup between tests
- Container-based database isolation

## Performance Testing

### Load Test Configuration

Artillery configuration (`tests/performance/load-test.yml`):

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm-up"
    - duration: 300  
      arrivalRate: 50
      name: "Sustained load"
  ensure:
    p95: 2000
    p99: 5000
    maxErrorRate: 5%
```

### Performance Scenarios

- **Requirements CRUD** (30% weight)
- **Architecture Decision Operations** (25% weight)  
- **Integration Operations** (35% weight)
- **Complex Query Operations** (10% weight)

### Performance Benchmarks

| Operation | Threshold | Target |
|-----------|-----------|---------|
| Single Query | <1s | <500ms |
| Batch Operations | <5s | <3s |  
| Complex Queries | <3s | <2s |
| Concurrent Ops | <10s | <7s |
| Memory Usage | <500MB | <300MB |

## CI/CD Integration

### GitHub Actions Workflow

The integration tests run automatically on:
- Pull requests to main/develop branches
- Pushes to main/develop branches  
- Daily scheduled runs (2 AM UTC)

### Test Matrix

Tests run in parallel across multiple test suites:
- cross-module-flows
- api-integration  
- database-integration
- realtime-integration
- performance-integration
- error-scenarios

### Coverage Requirements

| Coverage Type | Threshold | Target |
|---------------|-----------|---------|
| Lines | 80% | 90% |
| Functions | 80% | 90% |
| Branches | 75% | 85% |
| Statements | 80% | 90% |

### Integration Services

CI/CD pipeline includes:
- Neo4j Enterprise container
- MongoDB container
- Redis container
- Automated database initialization
- Parallel test execution
- Coverage reporting to Codecov

## Test Reporting

### Automated Reports

Tests generate comprehensive reports:

```typescript
// Test reporter usage
testReporter.addTestResult('cross-module-flows', 'full integration flow', {
  status: 'passed',
  duration: 1250,
  details: { mappingConfidence: 0.95 }
});

testReporter.addPerformanceMetric({
  name: 'requirement-creation',
  value: 245,
  unit: 'ms', 
  threshold: 1000,
  passed: true
});

// Generate comprehensive report
const report = testReporter.generateReport();
await testReporter.exportReport('./test-reports');
```

### Report Formats

- **JSON**: Machine-readable test results
- **HTML**: Visual dashboard with charts
- **Markdown**: Summary for documentation

### Report Contents

- Test execution summary
- Coverage analysis by module
- Performance metrics and trends
- Failed test analysis
- Integration-specific recommendations

## Troubleshooting

### Common Issues

#### Database Connection Issues

```bash
# Check Neo4j container status
docker ps | grep neo4j

# Check connection
cypher-shell -u neo4j -p testpassword "RETURN 1"

# Restart test containers
npm run test:integration -- --forceExit
```

#### Performance Test Failures

```bash
# Check system resources
top
df -h

# Run with verbose logging  
DEBUG=* npm run test:performance

# Adjust performance thresholds
export PERF_THRESHOLD_MULTIPLIER=1.5
npm run test:performance
```

#### Memory Issues

```bash
# Run with garbage collection
node --expose-gc --max-old-space-size=4096 ./node_modules/.bin/jest

# Enable memory profiling
NODE_ENV=test node --inspect ./node_modules/.bin/jest
```

#### Test Data Issues

```bash
# Clean all test data
npm run db:clean-test-data

# Reset test database
npm run db:reset-test

# Verify test data factory
npm run test -- --testNamePattern="TestDataFactory"
```

### Debug Mode

Run tests with debug information:

```bash
# Enable Jest debugging
DEBUG=* npm test

# Run single test with debugging
node --inspect-brk ./node_modules/.bin/jest tests/integration/cross-module-flows.test.ts
```

### Performance Debugging

```bash
# Profile memory usage
node --prof ./node_modules/.bin/jest tests/integration/performance-integration.test.ts

# Generate performance report
node --prof-process isolate-*.log > performance-profile.txt
```

## Best Practices

### Test Writing

1. **Use descriptive test names** that explain the scenario
2. **Follow AAA pattern**: Arrange, Act, Assert
3. **Clean up test data** after each test
4. **Use test data factory** for consistent data generation
5. **Test both success and failure scenarios**

### Performance Considerations

1. **Set reasonable timeouts** for integration tests
2. **Use batch operations** where possible
3. **Monitor memory usage** during test execution
4. **Profile slow tests** and optimize
5. **Use concurrent execution** judiciously

### Maintenance

1. **Update test data** when schemas change
2. **Review performance thresholds** regularly
3. **Keep test containers** up to date
4. **Monitor test execution times** in CI/CD
5. **Update documentation** with code changes

## Integration Test Coverage Goals

- **90%+ integration test coverage** for cross-module functionality
- **All GraphQL resolvers tested** with real database connections
- **All integration points validated** with comprehensive test scenarios
- **Performance baselines established** for integrated operations
- **Error scenarios covered** for all critical integration paths

This comprehensive integration test suite ensures the LANKA project's Architecture Intelligence and Requirements modules work together flawlessly, providing confidence for production deployment.