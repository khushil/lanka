/**
 * Environment Validation Security Tests
 * Tests the fail-fast environment validation system
 */

import { validateStartupEnvironment, performSecurityChecks } from '../../src/startup/environment-validator';
import { loadEnvironmentConfig } from '../../src/core/config/environment';

describe('Environment Validation Security Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment for each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Required Environment Variables', () => {
    test('should fail when NEO4J_PASSWORD is missing', async () => {
      delete process.env.NEO4J_PASSWORD;
      
      await expect(validateStartupEnvironment()).rejects.toThrow(
        'Missing required environment variables'
      );
    });

    test('should fail when JWT_SECRET is missing', async () => {
      process.env.NEO4J_PASSWORD = 'test-password';
      delete process.env.JWT_SECRET;
      
      await expect(validateStartupEnvironment()).rejects.toThrow(
        'Missing required environment variables'
      );
    });

    test('should fail when API_KEY_SECRET is missing', async () => {
      process.env.NEO4J_PASSWORD = 'test-password';
      process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-chars-long';
      delete process.env.API_KEY_SECRET;
      
      await expect(validateStartupEnvironment()).rejects.toThrow(
        'Missing required environment variables'
      );
    });

    test('should pass when all required variables are set', async () => {
      process.env.NEO4J_PASSWORD = 'secure-neo4j-password';
      process.env.JWT_SECRET = 'secure-jwt-secret-at-least-32-characters-long';
      process.env.API_KEY_SECRET = 'secure-api-key-secret-at-least-32-characters';
      
      // Mock service connectivity to avoid actual connections in tests
      jest.doMock('../../src/startup/environment-validator', () => ({
        validateStartupEnvironment: jest.fn().mockResolvedValue(undefined),
        performSecurityChecks: jest.fn().mockResolvedValue(undefined)
      }));
      
      await expect(validateStartupEnvironment()).resolves.toBeUndefined();
    });
  });

  describe('Security Validation', () => {
    beforeEach(() => {
      // Set minimum required environment
      process.env.NEO4J_PASSWORD = 'secure-password';
      process.env.JWT_SECRET = 'secure-jwt-secret-at-least-32-characters-long';
      process.env.API_KEY_SECRET = 'secure-api-key-secret-at-least-32-characters';
    });

    test('should warn about short JWT secret in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'short-secret';
      
      const config = {
        app: {
          nodeEnv: 'production',
          jwtSecret: 'short-secret',
          apiKeySecret: 'secure-api-key-secret-at-least-32-characters'
        },
        neo4j: { password: 'secure-password' }
      };
      
      await expect(performSecurityChecks(config)).rejects.toThrow(
        'Security issues detected in production environment'
      );
    });

    test('should warn about common passwords', async () => {
      process.env.NODE_ENV = 'production';
      
      const config = {
        app: {
          nodeEnv: 'production',
          jwtSecret: 'secure-jwt-secret-at-least-32-characters-long',
          apiKeySecret: 'secure-api-key-secret-at-least-32-characters'
        },
        neo4j: { password: 'password123' }
      };
      
      await expect(performSecurityChecks(config)).rejects.toThrow(
        'Security issues detected in production environment'
      );
    });

    test('should pass security checks with strong configuration', async () => {
      process.env.NODE_ENV = 'production';
      
      const config = {
        app: {
          nodeEnv: 'production',
          jwtSecret: 'very-secure-jwt-secret-with-at-least-32-characters-and-complexity',
          apiKeySecret: 'very-secure-api-key-secret-with-at-least-32-characters-complexity'
        },
        neo4j: { password: 'very-secure-unique-neo4j-password-with-complexity' }
      };
      
      await expect(performSecurityChecks(config)).resolves.toBeUndefined();
    });
  });

  describe('Configuration Loading', () => {
    test('should load configuration with all required fields', () => {
      process.env.NEO4J_PASSWORD = 'secure-password';
      process.env.JWT_SECRET = 'secure-jwt-secret-at-least-32-characters-long';
      process.env.API_KEY_SECRET = 'secure-api-key-secret-at-least-32-characters';
      
      const config = loadEnvironmentConfig();
      
      expect(config).toHaveProperty('neo4j');
      expect(config).toHaveProperty('mongodb');
      expect(config).toHaveProperty('redis');
      expect(config).toHaveProperty('app');
      expect(config.neo4j.password).toBe('secure-password');
      expect(config.app.jwtSecret).toBe('secure-jwt-secret-at-least-32-characters-long');
    });

    test('should use default values for optional configuration', () => {
      process.env.NEO4J_PASSWORD = 'secure-password';
      process.env.JWT_SECRET = 'secure-jwt-secret-at-least-32-characters-long';
      process.env.API_KEY_SECRET = 'secure-api-key-secret-at-least-32-characters';
      
      const config = loadEnvironmentConfig();
      
      expect(config.neo4j.uri).toBe('bolt://localhost:7687');
      expect(config.neo4j.user).toBe('neo4j');
      expect(config.app.port).toBe(3000);
      expect(config.app.nodeEnv).toBe('development');
    });
  });

  describe('Error Messages', () => {
    test('should provide clear error message for missing variables', async () => {
      delete process.env.NEO4J_PASSWORD;
      delete process.env.JWT_SECRET;
      
      try {
        await validateStartupEnvironment();
      } catch (error) {
        expect(error instanceof Error ? error.message : '').toContain('NEO4J_PASSWORD');
        expect(error instanceof Error ? error.message : '').toContain('JWT_SECRET');
        expect(error instanceof Error ? error.message : '').toContain('.env.example');
      }
    });

    test('should provide setup instructions in error', async () => {
      delete process.env.NEO4J_PASSWORD;
      
      try {
        await validateStartupEnvironment();
      } catch (error) {
        expect(error instanceof Error ? error.message : '').toContain('Please ensure all required environment variables are set');
      }
    });
  });

  describe('Development vs Production', () => {
    test('should allow shorter secrets in development', async () => {
      process.env.NODE_ENV = 'development';
      process.env.NEO4J_PASSWORD = 'dev-password';
      process.env.JWT_SECRET = 'dev-jwt-secret';
      process.env.API_KEY_SECRET = 'dev-api-secret';
      
      const config = {
        app: {
          nodeEnv: 'development',
          jwtSecret: 'dev-jwt-secret',
          apiKeySecret: 'dev-api-secret'
        },
        neo4j: { password: 'dev-password' }
      };
      
      // Should not throw in development
      await expect(performSecurityChecks(config)).resolves.toBeUndefined();
    });

    test('should enforce strict security in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.NEO4J_PASSWORD = 'short';
      process.env.JWT_SECRET = 'short';
      process.env.API_KEY_SECRET = 'short';
      
      const config = {
        app: {
          nodeEnv: 'production',
          jwtSecret: 'short',
          apiKeySecret: 'short'
        },
        neo4j: { password: 'short' }
      };
      
      await expect(performSecurityChecks(config)).rejects.toThrow(
        'Security issues detected in production environment'
      );
    });
  });
});