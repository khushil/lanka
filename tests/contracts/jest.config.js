/**
 * Jest Configuration for Contract Testing
 * Specialized configuration for API contract validation
 */

module.exports = {
  displayName: 'Contract Tests',
  
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/**/*.test.ts',
    '<rootDir>/**/*.spec.ts'
  ],
  
  // TypeScript support
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        compilerOptions: {
          module: 'commonjs',
          target: 'es2020',
          lib: ['es2020'],
          allowSyntheticDefaultImports: true,
          esModuleInterop: true
        }
      }
    }]
  },
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../src/$1',
    '^@tests/(.*)$': '<rootDir>/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/setup.ts'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/**/*.ts',
    '!<rootDir>/**/*.test.ts',
    '!<rootDir>/**/*.spec.ts',
    '!<rootDir>/node_modules/**',
    '!<rootDir>/coverage/**',
    '!<rootDir>/fixtures/**'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Test timeout for contract tests
  testTimeout: 30000,
  
  // Reporters for CI/CD integration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/test-results',
      outputName: 'contract-tests.xml',
      classNameTemplate: 'Contract.{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }],
    ['jest-html-reporters', {
      publicPath: '<rootDir>/test-results',
      filename: 'contract-test-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'Contract Test Results'
    }]
  ],
  
  // Global variables for contract testing
  globals: {
    'ts-jest': {
      useESM: false
    },
    CONTRACT_TEST_MODE: true,
    MAX_QUERY_COMPLEXITY: 1000,
    MAX_QUERY_DEPTH: 10,
    DEFAULT_TEST_TIMEOUT: 5000
  },
  
  // Test sequencing
  testSequencer: './test-sequencer.js'
};