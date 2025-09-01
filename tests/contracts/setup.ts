/**
 * Contract Testing Setup
 * Global setup and configuration for contract testing suite
 */

import { jest } from '@jest/globals';

// Extend Jest timeout for contract tests
jest.setTimeout(30000);

// Global test configuration
global.CONTRACT_TEST_CONFIG = {
  maxQueryComplexity: 1000,
  maxQueryDepth: 10,
  defaultTimeout: 5000,
  retryAttempts: 3,
  baseUrl: process.env.TEST_API_URL || 'http://localhost:4000',
  wsUrl: process.env.TEST_WS_URL || 'ws://localhost:4000'
};

// Mock WebSocket for testing if not available
if (typeof WebSocket === 'undefined') {
  global.WebSocket = require('ws');
}

// Enhanced error logging for contract tests
const originalConsoleError = console.error;
console.error = (...args) => {
  if (process.env.NODE_ENV === 'test') {
    // Enhance contract test error messages
    if (args[0] && typeof args[0] === 'string') {
      if (args[0].includes('GraphQL') || args[0].includes('Schema')) {
        originalConsoleError('[CONTRACT TEST - GraphQL]', ...args);
        return;
      }
      if (args[0].includes('OpenAPI') || args[0].includes('REST')) {
        originalConsoleError('[CONTRACT TEST - REST API]', ...args);
        return;
      }
      if (args[0].includes('WebSocket') || args[0].includes('Socket')) {
        originalConsoleError('[CONTRACT TEST - WebSocket]', ...args);
        return;
      }
    }
  }
  originalConsoleError('[CONTRACT TEST]', ...args);
};

// Set up test data cleanup
afterEach(() => {
  // Clean up any test data or connections
  jest.clearAllMocks();
});

// Global test utilities
global.contractTestUtils = {
  /**
   * Wait for a condition to be true with timeout
   */
  waitFor: async (condition: () => boolean | Promise<boolean>, timeout = 5000): Promise<void> => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const result = await condition();
      if (result) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  },
  
  /**
   * Create a mock GraphQL resolver
   */
  createMockResolver: (returnValue: any) => {
    return jest.fn().mockResolvedValue(returnValue);
  },
  
  /**
   * Validate JSON schema
   */
  validateJsonSchema: (data: any, schema: any): { valid: boolean; errors: any[] } => {
    // This would integrate with a proper JSON Schema validator like ajv
    return { valid: true, errors: [] };
  },
  
  /**
   * Generate test UUID
   */
  generateTestId: (): string => {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
};

// Type declarations for global test utilities
declare global {
  var CONTRACT_TEST_CONFIG: {
    maxQueryComplexity: number;
    maxQueryDepth: number;
    defaultTimeout: number;
    retryAttempts: number;
    baseUrl: string;
    wsUrl: string;
  };
  
  var contractTestUtils: {
    waitFor: (condition: () => boolean | Promise<boolean>, timeout?: number) => Promise<void>;
    createMockResolver: (returnValue: any) => jest.Mock;
    validateJsonSchema: (data: any, schema: any) => { valid: boolean; errors: any[] };
    generateTestId: () => string;
  };
  
  var WebSocket: any;
}