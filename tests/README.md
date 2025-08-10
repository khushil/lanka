# Development Intelligence BDD Test Suite

This directory contains comprehensive Behavior-Driven Development (BDD) tests for the LANKA Development Intelligence module, implemented using Cucumber.js and Gherkin syntax.

## 📁 Directory Structure

```
tests/
├── features/                           # Gherkin feature files
│   ├── architecture.feature            # Architecture Intelligence tests
│   ├── requirements.feature            # Requirements Intelligence tests
│   ├── development-intelligence.feature # Core Development Intelligence
│   ├── code-generation-engine.feature  # Code Generation Engine
│   ├── test-generation-intelligence.feature # Test Generation
│   ├── devops-pipeline-automation.feature   # DevOps Automation
│   ├── cross-module-integration.feature     # Cross-module Integration
│   ├── bug-pattern-detection.feature        # Bug Detection
│   ├── performance-anti-pattern-detection.feature # Performance Detection
│   └── development-workflow-automation.feature    # Workflow Automation
├── step-definitions/                   # Cucumber step implementations
│   └── development-intelligence.steps.ts
├── support/                           # Test support files
│   ├── hooks.ts                       # Test hooks and setup
│   └── world.ts                       # Custom World class
├── reports/                           # Generated test reports
├── cucumber.config.js                 # Cucumber configuration
└── README.md                         # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Neo4j test database
- Docker (optional, for containerized testing)

### Installation

```bash
# Install dependencies
npm install

# Setup test environment
npm run setup
```

### Running Tests

```bash
# Run all BDD tests
npm run test:bdd

# Run with custom runner (recommended)
npm run test:bdd:runner

# Run specific test profiles
npm run test:bdd:smoke          # Quick smoke tests
npm run test:bdd:integration    # Integration tests
npm run test:bdd:performance    # Performance tests
npm run test:bdd:regression     # Full regression suite
npm run test:bdd:ci            # CI-optimized tests

# Run with custom options
./scripts/run-bdd-tests.sh -p smoke -j 4 -v
```

## 📋 Feature Files Overview

### 1. Code Generation Engine (`code-generation-engine.feature`)
Tests the AI-powered code generation capabilities:
- Code generation from functional requirements
- Multi-technology stack support
- Design pattern implementation
- Quality constraints adherence
- Security requirements integration
- Language-specific code generation

**Key Scenarios:**
- Generate TypeScript API code from requirements
- Full-stack code generation with consistent contracts
- Performance-optimized code generation
- Secure authentication code generation

### 2. Test Generation Intelligence (`test-generation-intelligence.feature`)
Tests automated test suite generation:
- Unit test generation from code
- Integration test creation
- End-to-end test scenarios
- Performance and security test generation
- Cross-browser compatibility tests

**Key Scenarios:**
- Generate Jest unit tests with >90% coverage
- Create Playwright E2E tests from user journeys
- Generate k6 performance tests
- Security vulnerability testing

### 3. DevOps Pipeline Automation (`devops-pipeline-automation.feature`)
Tests CI/CD pipeline intelligence:
- Pipeline generation and optimization
- Multi-environment deployment
- Infrastructure as Code integration
- Quality gates and compliance
- Multi-cloud deployment orchestration

**Key Scenarios:**
- Generate GitHub Actions workflows
- Implement blue-green deployments
- Container security scanning
- Feature flag deployment strategies

### 4. Cross-Module Integration (`cross-module-integration.feature`)
Tests seamless integration between modules:
- End-to-end requirement to code flow
- Architecture decision impact propagation
- Requirements change management
- Cross-module consistency validation

**Key Scenarios:**
- Complete requirement → architecture → code flow
- Pattern reuse across project lifecycle
- Stakeholder collaboration workflows
- Cross-module impact analysis

### 5. Bug Pattern Detection (`bug-pattern-detection.feature`)
Tests intelligent bug detection:
- Common anti-pattern identification
- Security vulnerability detection
- Memory leak detection
- Performance issue identification

**Key Scenarios:**
- Null pointer dereference detection
- SQL injection vulnerability scanning
- Race condition identification
- API design anti-pattern detection

### 6. Performance Anti-Pattern Detection (`performance-anti-pattern-detection.feature`)
Tests performance optimization intelligence:
- Database query optimization
- Memory allocation analysis
- Algorithm complexity detection
- Caching strategy recommendations

**Key Scenarios:**
- N+1 query pattern detection
- Memory allocation hotspot identification
- Frontend performance optimization
- Microservices communication analysis

### 7. Development Workflow Automation (`development-workflow-automation.feature`)
Tests workflow optimization:
- Intelligent task assignment
- Automated code review workflows
- Development velocity optimization
- Quality gate automation

**Key Scenarios:**
- Task assignment based on expertise
- Automated merge conflict resolution
- Technical debt management
- Cross-team collaboration optimization

## 🏃‍♂️ Test Execution Profiles

### Default Profile
- Runs all tests with standard settings
- Moderate parallelization (2 processes)
- Comprehensive reporting

### Development Profile
- Development Intelligence specific tests
- Single process execution
- Detailed progress feedback

### Integration Profile
- Cross-module integration tests
- Extended timeout (60s)
- Comprehensive traceability validation

### Performance Profile  
- Performance and load tests
- Extended timeout (120s)
- Resource utilization monitoring

### Smoke Profile
- Quick validation tests
- High parallelization (4 processes)
- Essential functionality verification

### CI Profile
- Optimized for continuous integration
- Excludes manual and slow tests
- Retry on failure
- Multiple output formats

## 🔧 Configuration

### Environment Variables

```bash
# Test database connection
NEO4J_TEST_URI=bolt://localhost:7688
NEO4J_TEST_USER=neo4j
NEO4J_TEST_PASSWORD=testpassword

# API configuration
API_BASE_URL=http://localhost:3000

# Test execution settings
TEST_TIMEOUT=30000
PARALLEL_PROCESSES=2
```

### Cucumber Configuration

The test suite uses `cucumber.config.js` for configuration:

- **Paths**: Feature file locations
- **Step Definitions**: TypeScript step implementations
- **Formatters**: HTML, JSON, JUnit reports
- **Profiles**: Different execution modes
- **Tags**: Test filtering and organization

## 📊 Reporting

Test execution generates multiple report formats:

- **HTML Report**: `tests/reports/cucumber-report.html`
- **JSON Report**: `tests/reports/cucumber-report.json` 
- **JUnit Report**: `tests/reports/cucumber-junit.xml`

### Report Features

- Scenario execution status
- Step-by-step details
- Failure analysis
- Performance metrics
- Screenshots (for UI tests)
- Execution timeline

## 🏷️ Tag Strategy

Tests are organized using Cucumber tags:

### Functional Tags
- `@development-intelligence`: Core module tests
- `@code-generation`: Code generation tests
- `@test-generation`: Test creation tests
- `@pipeline-automation`: DevOps tests
- `@cross-module-integration`: Integration tests

### Execution Tags
- `@smoke`: Essential functionality tests
- `@regression`: Full regression suite
- `@performance`: Performance tests
- `@security`: Security tests
- `@manual`: Manual execution tests

### Quality Tags
- `@skip`: Skip these tests
- `@wip`: Work in progress tests
- `@retry`: Tests that can be retried
- `@slow`: Long-running tests

## 🧪 Writing New Tests

### 1. Create Feature File

```gherkin
Feature: New Development Feature
  As a developer
  I want to test new functionality
  So that I can ensure quality

  Scenario: Test new feature
    Given I have the required setup
    When I execute the feature
    Then I should see expected results
```

### 2. Implement Step Definitions

```typescript
Given('I have the required setup', async function() {
  // Setup code
});

When('I execute the feature', async function() {
  // Execution code
});

Then('I should see expected results', async function() {
  // Assertion code
});
```

### 3. Add to Test Runner

Update the appropriate profile in `cucumber.config.js` or use tags to include in existing profiles.

## 🐛 Debugging Tests

### Debug Mode
```bash
# Run with debug output
npm run test:bdd:debug

# Run single feature with verbose logging
./scripts/run-bdd-tests.sh -f code-generation-engine -v
```

### Log Analysis
- Check `tests/reports/` for detailed execution logs
- Use `@retry` tag for flaky tests
- Enable verbose mode for detailed step output

## 🚀 Continuous Integration

### GitHub Actions Integration

```yaml
- name: Run BDD Tests
  run: |
    npm run test:bdd:ci
    
- name: Upload Test Reports
  uses: actions/upload-artifact@v3
  with:
    name: bdd-test-reports
    path: tests/reports/
```

### Jenkins Integration

```groovy
stage('BDD Tests') {
    steps {
        sh 'npm run test:bdd:ci'
    }
    post {
        always {
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'tests/reports',
                reportFiles: 'cucumber-report.html',
                reportName: 'BDD Test Report'
            ])
        }
    }
}
```

## 📈 Best Practices

### Test Organization
1. **Feature-focused**: Group scenarios by business capability
2. **Scenario independence**: Each scenario should be self-contained
3. **Clear naming**: Use descriptive scenario and step names
4. **Tag strategically**: Use tags for filtering and organization

### Step Definitions
1. **Reusable steps**: Create generic, reusable step definitions
2. **Clear assertions**: Use descriptive assertion messages
3. **Proper cleanup**: Clean up test data after scenarios
4. **Error handling**: Handle exceptions gracefully

### Data Management
1. **Test isolation**: Don't share data between scenarios
2. **Factory patterns**: Use factories for test data creation
3. **Database cleanup**: Clean up test data after execution
4. **Mock external services**: Use mocks for external dependencies

### Performance
1. **Parallel execution**: Use parallel execution for faster feedback
2. **Selective testing**: Use tags to run relevant test subsets
3. **Resource optimization**: Monitor resource usage during tests
4. **Cleanup optimization**: Optimize cleanup operations

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Start test database
   docker-compose -f docker-compose.test.yml up -d neo4j-test
   ```

2. **Step Definition Not Found**
   - Check step definition file is in `step-definitions/` directory
   - Verify import statements in step definition files

3. **Test Timeouts**
   - Increase timeout in `cucumber.config.js`
   - Check for hanging promises in step definitions

4. **Report Generation Issues**
   - Ensure reports directory exists and is writable
   - Check cucumber-html-reporter dependency

### Getting Help

1. Check test logs in `tests/reports/`
2. Run with verbose output: `./scripts/run-bdd-tests.sh -v`
3. Review step definition implementations
4. Check test environment setup

## 🤝 Contributing

### Adding New Tests
1. Create feature file with clear scenarios
2. Implement step definitions with proper error handling
3. Add appropriate tags for filtering
4. Update this README if adding new concepts

### Improving Existing Tests
1. Enhance scenario coverage
2. Improve step definition reusability  
3. Optimize test execution performance
4. Update documentation

---

**Happy Testing! 🧪✨**

For more information about the LANKA Development Intelligence system, see the main project README.