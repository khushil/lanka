module.exports = {
  default: {
    // Feature files configuration
    paths: ['tests/features/**/*.feature'],
    
    // Step definitions configuration
    require: [
      'tests/step-definitions/**/*.steps.ts',
      'tests/support/**/*.ts'
    ],
    
    // TypeScript support
    requireModule: ['ts-node/register'],
    
    // Test environment configuration
    worldParameters: {
      neo4jUri: process.env.NEO4J_TEST_URI || 'bolt://localhost:7688',
      testTimeout: 30000,
      apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000'
    },
    
    // Formatting and reporting
    format: [
      'progress-bar',
      'html:tests/reports/cucumber-report.html',
      'json:tests/reports/cucumber-report.json',
      'junit:tests/reports/cucumber-junit.xml'
    ],
    
    // Parallel execution
    parallel: 2,
    
    // Retry configuration
    retry: 1,
    retryTagFilter: '@retry',
    
    // Tag-based test execution
    tags: 'not @skip and not @wip',
    
    // Timeouts
    timeout: 30000,
    
    // Profiles for different test runs
    profiles: {
      // Development Intelligence specific tests
      development: {
        tags: '@development-intelligence',
        format: ['progress-bar'],
        parallel: 1
      },
      
      // Cross-module integration tests
      integration: {
        tags: '@cross-module-integration',
        format: ['progress-bar', 'json:tests/reports/integration-report.json'],
        parallel: 1,
        timeout: 60000
      },
      
      // Performance tests
      performance: {
        tags: '@performance',
        format: ['progress-bar', 'json:tests/reports/performance-report.json'],
        parallel: 1,
        timeout: 120000
      },
      
      // Smoke tests
      smoke: {
        tags: '@smoke',
        format: ['progress-bar'],
        parallel: 4
      },
      
      // Regression tests
      regression: {
        tags: '@regression',
        format: ['progress-bar', 'html:tests/reports/regression-report.html'],
        parallel: 2,
        timeout: 45000
      },
      
      // CI/CD pipeline tests
      ci: {
        tags: 'not @manual and not @slow',
        format: [
          'progress-bar',
          'json:tests/reports/ci-report.json',
          'junit:tests/reports/ci-junit.xml'
        ],
        parallel: 3,
        retry: 2
      }
    }
  }
};