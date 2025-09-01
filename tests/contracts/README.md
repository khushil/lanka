# API Contract Testing Suite

Comprehensive contract testing implementation for the Lanka platform API layer, ensuring backward compatibility, schema evolution tracking, and real-time validation.

## Overview

This contract testing suite validates API contracts across multiple layers:

- **GraphQL Schema Contracts** - Schema validation, complexity analysis, and evolution tracking
- **REST API Contracts** - OpenAPI specification compliance and endpoint validation  
- **WebSocket Contracts** - Real-time message format and connection handling
- **Integration Contracts** - Cross-module compatibility and performance validation

## Test Structure

```
tests/contracts/
├── graphql/                 # GraphQL contract tests
│   ├── schema-validation.test.ts
│   └── query-complexity.test.ts
├── rest/                    # REST API contract tests
│   └── openapi-validation.test.ts
├── websocket/               # WebSocket contract tests
│   └── connection-contracts.test.ts
├── integration/             # Cross-cutting contract tests
│   ├── schema-evolution.test.ts
│   └── contract-testing-pipeline.test.ts
├── fixtures/                # Test data and schemas
└── results/                 # Test reports and artifacts
```

## Running Contract Tests

### All Contract Tests
```bash
npm run test:contracts
```

### Specific Test Suites
```bash
# GraphQL contracts only
npm run test:contracts:graphql

# REST API contracts only  
npm run test:contracts:rest

# WebSocket contracts only
npm run test:contracts:websocket

# Integration contracts only
npm run test:contracts:integration
```

### CI/CD Pipeline Integration
```bash
# Run contract validation pipeline
npm run contracts:validate

# Generate contract documentation
npm run contracts:docs

# Monitor contract compliance
npm run contracts:monitor
```

## GraphQL Contract Testing

### Schema Validation
Tests GraphQL schema structure, type definitions, and field resolution:

```typescript
// Example: Schema structure validation
test('should have valid GraphQL schema', () => {
  const errors = validateSchema(schema);
  expect(errors).toHaveLength(0);
});
```

### Query Complexity Analysis
Validates query depth limits and complexity scoring:

```typescript
// Example: Complexity limit testing
test('should reject overly complex queries', async () => {
  const complexQuery = `query { ... }`;
  const result = await server.executeOperation({ query: complexQuery });
  expect(result.errors).toBeDefined();
});
```

### Schema Evolution Tracking
Detects breaking and dangerous changes between schema versions:

```typescript
// Example: Breaking change detection
test('should detect field removal as breaking change', () => {
  const breakingChanges = findBreakingChanges(baselineSchema, currentSchema);
  // Validate changes are documented or acceptable
});
```

## REST API Contract Testing

### OpenAPI Specification Validation
Ensures API endpoints comply with OpenAPI 3.0 specification:

```typescript
// Example: Endpoint contract validation
test('should validate requirements endpoint contracts', async () => {
  const response = await request(app)
    .get('/requirements?limit=10')
    .expect(200);
    
  // Validate against OpenAPI schema
  const isValid = validateResponseSchema(response.body, openAPISpec);
  expect(isValid).toBe(true);
});
```

### Error Response Contract Validation
Tests standardized error response formats:

```typescript
// Example: Error format validation
test('should return proper 400 error format', async () => {
  const response = await request(app)
    .post('/requirements')
    .send({}) // Invalid input
    .expect(400);
    
  expect(response.body).toMatchSchema(errorResponseSchema);
});
```

## WebSocket Contract Testing

### Connection Contract Validation
Tests WebSocket connection handling and authentication:

```typescript
// Example: Connection validation
test('should establish connection with proper authentication', (done) => {
  const client = ioClient(serverUrl, { auth: { token: 'test-token' } });
  client.on('connect', () => {
    expect(client.connected).toBe(true);
    done();
  });
});
```

### Message Format Validation
Validates real-time message structures and event handling:

```typescript
// Example: Message format validation
test('should validate requirement update message format', (done) => {
  client.on('requirement_updated', (message) => {
    expect(message).toMatchObject({
      type: 'requirement_updated',
      data: expect.objectContaining({
        id: expect.any(String),
        timestamp: expect.any(String)
      })
    });
    done();
  });
});
```

### Subscription Contract Testing
Tests real-time subscription filtering and broadcasting:

```typescript
// Example: Subscription filtering
test('should respect subscription filters', (done) => {
  client1.emit('subscribe', { topic: 'requirements', filters: { projectId: '123' } });
  // Test that only filtered events are received
});
```

## Integration Contract Testing

### Schema Evolution and Breaking Changes
Comprehensive testing for API evolution and backward compatibility:

- Baseline schema comparison
- Breaking change documentation requirements
- Migration guide generation
- Client impact analysis

### Pipeline Integration
CI/CD integration for automated contract validation:

- Pre-commit schema validation
- Performance contract testing
- Documentation synchronization
- Monitoring and alerting integration

## Configuration

### Test Configuration
Contract testing configuration in `jest.config.js`:

```javascript
module.exports = {
  displayName: 'Contract Tests',
  testTimeout: 30000,
  globals: {
    MAX_QUERY_COMPLEXITY: 1000,
    MAX_QUERY_DEPTH: 10
  }
};
```

### Pipeline Configuration
CI/CD pipeline configuration for automated validation:

```yaml
# .github/workflows/contract-tests.yml
name: Contract Tests
on: [push, pull_request]
jobs:
  contract-validation:
    steps:
      - run: npm run contracts:validate
      - run: npm run test:contracts
```

## Best Practices

### GraphQL Contract Testing
1. **Schema First**: Always validate schema changes before implementation
2. **Complexity Limits**: Set and enforce query complexity limits
3. **Evolution Tracking**: Maintain baseline schemas for comparison
4. **Documentation**: Keep schema documentation synchronized

### REST API Contract Testing  
1. **OpenAPI Compliance**: Ensure all endpoints match OpenAPI specification
2. **Example Validation**: Test all documented examples work correctly
3. **Error Consistency**: Maintain consistent error response formats
4. **Version Management**: Handle API versioning gracefully

### WebSocket Contract Testing
1. **Message Validation**: Validate all real-time message formats
2. **Connection Handling**: Test connection, reconnection, and cleanup
3. **Performance Testing**: Validate under concurrent connection load
4. **Subscription Logic**: Test filtering and broadcasting accuracy

### Integration Testing
1. **Cross-Module Validation**: Test contracts across module boundaries
2. **Performance Contracts**: Validate response time and complexity limits
3. **Monitoring Integration**: Set up continuous contract monitoring
4. **Documentation Sync**: Keep contract documentation up-to-date

## Troubleshooting

### Common Issues

1. **Schema Validation Failures**
   - Check for missing required fields
   - Validate GraphQL syntax
   - Ensure proper type definitions

2. **Query Complexity Errors**
   - Reduce query nesting depth
   - Add pagination to large result sets
   - Use fragments to optimize queries

3. **WebSocket Connection Issues**
   - Verify authentication tokens
   - Check network connectivity
   - Validate message formats

4. **Performance Contract Failures**
   - Optimize database queries
   - Add proper indexing
   - Implement caching where appropriate

### Debug Mode
Run tests with debug logging:

```bash
DEBUG=contract-tests npm run test:contracts
```

### Test Reports
Contract test reports are generated in:
- `tests/contracts/coverage/` - Coverage reports
- `tests/contracts/test-results/` - JUnit XML and HTML reports

## Monitoring and Alerting

### Production Contract Monitoring
The contract testing suite integrates with production monitoring to:

- Track API performance against contracts
- Monitor schema evolution impact
- Alert on contract violations
- Generate compliance reports

### Metrics Tracked
- Schema complexity over time
- Query performance trends  
- API error rates
- Compatibility scores
- Breaking change frequency

## Contributing

### Adding New Contract Tests
1. Create test files in appropriate directory
2. Follow naming convention: `*.contract.test.ts`
3. Include both positive and negative test cases
4. Update documentation and examples

### Updating Baseline Schemas
1. Review schema changes for breaking changes
2. Document changes in migration guide
3. Update baseline schema files
4. Run full test suite validation

For more information, see the [API Documentation](../../docs/api/) and [Testing Guidelines](../../docs/testing/).