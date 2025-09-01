# LANKA Memory System Test Suite

Comprehensive test suite for the LANKA Memory System, covering unit tests, integration tests, performance benchmarks, and BDD scenarios.

## Test Structure

```
tests/
├── unit/                 # Unit tests for individual components
│   ├── memory/          # Memory orchestrator and arbitration
│   ├── storage/         # Storage layer tests
│   ├── mcp/            # MCP server interface tests
│   └── plugins/        # Plugin system tests
├── integration/         # Integration tests
│   ├── lanka/          # LANKA integration tests
│   ├── federation/     # Federation and cross-system tests
│   └── events/         # Event-driven workflow tests
├── performance/         # Performance and scalability tests
├── bdd/                # Behavior-driven development scenarios
├── fixtures/           # Test data factories and fixtures
└── mocks/              # Mock implementations
```

## Running Tests

### All Tests
```bash
npm test
```

### By Category
```bash
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:performance   # Performance tests only
npm run test:bdd          # BDD scenarios only
```

### Development
```bash
npm run test:watch        # Watch mode for unit tests
npm run test:coverage     # With coverage report
npm run test:debug        # Debug mode
```

### CI/CD
```bash
npm run test:ci           # CI optimized run
```

## Test Categories

### Unit Tests
- **Memory Orchestrator**: Core memory management logic
- **Arbitration Engine**: Memory decision algorithms  
- **Storage Layer**: Database and caching operations
- **MCP Server**: Protocol compliance and tool interfaces
- **Plugin Manager**: Plugin lifecycle and security

### Integration Tests
- **LANKA Integration**: Memory system with LANKA core
- **Cross-Module Sharing**: Memory sharing between modules
- **Event Coordination**: Event-driven workflows
- **Federation**: Multi-instance memory sharing

### Performance Tests
- **Memory Ingestion**: Batch processing performance
- **Search Performance**: Semantic and graph search speed
- **Arbitration Speed**: Decision-making performance
- **Scalability**: Large dataset handling
- **Resource Usage**: Memory and CPU efficiency

### BDD Scenarios
- **Memory Lifecycle**: End-to-end memory workflows
- **Quality Gates**: Memory quality enforcement
- **Plugin Integration**: Plugin enhancement workflows
- **Workspace Isolation**: Team boundary enforcement

## Test Data and Fixtures

### Memory Fixtures
- `MemoryFixtures.createSystem1Memory()` - Pattern recognition memories
- `MemoryFixtures.createSystem2Memory()` - Reasoning trace memories
- `MemoryFixtures.createWorkspaceMemory()` - Team-scoped memories
- `MemoryFixtures.createPerformanceTestData(n)` - Large datasets

### Mock Services
- `StorageMocks.createStorageLayerMock()` - Storage operations
- `StorageMocks.createNeo4jDriverMock()` - Graph database
- `StorageMocks.createQdrantClientMock()` - Vector database
- `StorageMocks.createRedisMock()` - Caching layer

## Performance Benchmarks

### Target Metrics
- Memory ingestion: <100ms per memory
- Batch ingestion: <5s for 1000 memories
- Semantic search: <500ms for 10k memories
- Graph traversal (depth 2): <200ms
- Arbitration: <100ms per decision

### Scalability Targets
- Support 100k+ memories
- Linear scaling with memory count
- Stable performance under concurrent load
- Memory usage <50MB per 1000 memories

## Quality Gates

### Coverage Requirements
- Statements: >80%
- Branches: >75%  
- Functions: >80%
- Lines: >80%

### Test Quality
- Fast execution (<100ms per unit test)
- Isolated and independent tests
- Clear, descriptive test names
- Comprehensive edge case coverage

## BDD Test Patterns

Tests use Given-When-Then structure:

```typescript
describe('Feature: Memory Ingestion', () => {
  it('should accept high-quality memories', async () => {
    // Given a high-quality memory
    await given('a high-quality memory', async () => {
      // Setup code
    });

    // When the memory is ingested  
    const result = await when('the memory is ingested', async () => {
      return await orchestrator.ingestMemory(memory);
    })();

    // Then it should be accepted
    await then('it should be accepted', async () => {
      expect(result.success).toBe(true);
    })();
  });
});
```

## Mock Strategy

### Unit Test Mocks
- Mock all external dependencies
- Focus on component behavior
- Use Jest mocks with type safety

### Integration Test Mocks  
- Mock only external services
- Use real implementations where possible
- Test actual component interactions

### Performance Test Mocks
- Simulate realistic latencies
- Model actual resource usage
- Enable controlled benchmarking

## Contributing

### Adding Tests
1. Follow existing naming conventions
2. Place tests in appropriate category
3. Use provided fixtures and mocks
4. Include performance considerations

### Test Maintenance
1. Update tests with API changes
2. Maintain mock implementations
3. Keep fixtures current
4. Monitor performance benchmarks

### Quality Standards
- All new features require tests
- Maintain coverage thresholds
- Document complex test scenarios
- Review test code like production code