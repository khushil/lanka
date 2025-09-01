#!/usr/bin/env node
/**
 * Lanka Platform Environment Validator
 * Validates environment configuration before application startup
 */

import { validateEnvironment, checkEnvironmentSetup, loadEnvironmentConfig } from '../core/config/environment';
import { logger } from '../core/logging/logger';

/**
 * Main validation function
 * Exits process with error code if validation fails
 */
async function validateStartupEnvironment(): Promise<void> {
  try {
    console.log('🔍 Lanka Platform - Environment Validation');
    console.log('==========================================\n');

    // Load and validate environment configuration
    const config = loadEnvironmentConfig();
    
    // Perform additional security checks
    await performSecurityChecks(config);
    
    // Check service connectivity if in development
    if (process.env.NODE_ENV === 'development') {
      await checkServiceConnectivity(config);
    }
    
    console.log('✅ Environment validation completed successfully\n');
    
  } catch (error) {
    console.error('❌ Environment validation failed:');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('\n💡 Suggestions:');
    console.error('  1. Copy .env.example to .env.local');
    console.error('  2. Set all required environment variables');
    console.error('  3. Ensure all services are running (for development)');
    console.error('  4. Check network connectivity and firewall settings\n');
    
    process.exit(1);
  }
}

/**
 * Perform additional security checks
 */
async function performSecurityChecks(config: any): Promise<void> {
  const issues: string[] = [];
  
  // Check for weak secrets in production
  if (config.app.nodeEnv === 'production') {
    if (config.app.jwtSecret.length < 32) {
      issues.push('JWT_SECRET should be at least 32 characters in production');
    }
    
    if (config.app.apiKeySecret.length < 32) {
      issues.push('API_KEY_SECRET should be at least 32 characters in production');
    }
    
    // Check for default passwords
    const commonPasswords = ['password', '123456', 'admin', 'test', 'lanka2025'];
    if (commonPasswords.some(pwd => config.neo4j.password.includes(pwd))) {
      issues.push('Neo4j password appears to use common/default password');
    }
  }
  
  // Check for exposed secrets in environment
  const suspiciousEnvVars = Object.keys(process.env).filter(key => 
    key.toLowerCase().includes('secret') || 
    key.toLowerCase().includes('password') || 
    key.toLowerCase().includes('key')
  );
  
  for (const envVar of suspiciousEnvVars) {
    const value = process.env[envVar];
    if (value && (value.includes('localhost') || value.includes('127.0.0.1'))) {
      continue; // Skip localhost references
    }
    
    if (value && value.length < 8) {
      issues.push(`${envVar} appears to be too short for security`);
    }
  }
  
  if (issues.length > 0) {
    console.warn('⚠️  Security Warnings:');
    issues.forEach(issue => console.warn(`  - ${issue}`));
    console.warn('');
    
    if (config.app.nodeEnv === 'production') {
      throw new Error('Security issues detected in production environment');
    }
  }
}

/**
 * Check service connectivity (development only)
 */
async function checkServiceConnectivity(config: any): Promise<void> {
  const connectionTests: Array<{ name: string; test: () => Promise<boolean> }> = [];
  
  // Neo4j connectivity test
  connectionTests.push({
    name: 'Neo4j',
    test: async () => {
      try {
        const neo4j = await import('neo4j-driver');
        const driver = neo4j.default.driver(
          config.neo4j.uri,
          neo4j.default.auth.basic(config.neo4j.user, config.neo4j.password)
        );
        await driver.verifyConnectivity();
        await driver.close();
        return true;
      } catch (error) {
        return false;
      }
    }
  });
  
  // MongoDB connectivity test
  if (config.mongodb.password) {
    connectionTests.push({
      name: 'MongoDB',
      test: async () => {
        try {
          const { MongoClient } = await import('mongodb');
          const uri = config.mongodb.username && config.mongodb.password
            ? config.mongodb.uri.replace('://', `://${config.mongodb.username}:${config.mongodb.password}@`)
            : config.mongodb.uri;
          
          const client = new MongoClient(uri);
          await client.connect();
          await client.db().admin().ping();
          await client.close();
          return true;
        } catch (error) {
          return false;
        }
      }
    });
  }
  
  // Redis connectivity test
  connectionTests.push({
    name: 'Redis',
    test: async () => {
      try {
        const redis = await import('redis');
        const client = redis.createClient({
          url: config.redis.url,
          password: config.redis.password
        });
        
        await client.connect();
        await client.ping();
        await client.disconnect();
        return true;
      } catch (error) {
        return false;
      }
    }
  });
  
  // Run connectivity tests
  console.log('🔗 Testing service connectivity...');
  let failedConnections = 0;
  
  for (const test of connectionTests) {
    try {
      const connected = await Promise.race([
        test.test(),
        new Promise<boolean>(resolve => setTimeout(() => resolve(false), 5000))
      ]);
      
      if (connected) {
        console.log(`  ✅ ${test.name} - Connected`);
      } else {
        console.log(`  ❌ ${test.name} - Connection failed`);
        failedConnections++;
      }
    } catch (error) {
      console.log(`  ❌ ${test.name} - Connection error: ${error}`);
      failedConnections++;
    }
  }
  
  if (failedConnections > 0) {
    console.warn(`\n⚠️  ${failedConnections} service(s) failed connectivity test`);
    console.warn('   Application may not function correctly until services are available');
  }
  
  console.log('');
}

/**
 * Development helper command
 */
function showEnvironmentStatus(): void {
  console.log('📊 Environment Status Check');
  console.log('============================\n');
  
  checkEnvironmentSetup();
  
  console.log('\n📖 Quick Setup Guide:');
  console.log('1. Copy .env.example to .env.local');
  console.log('2. Update required environment variables');
  console.log('3. Start required services with: docker-compose up -d');
  console.log('4. Run validation with: npm run validate:env\n');
}

// CLI Interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'check':
    case 'status':
      showEnvironmentStatus();
      break;
      
    case 'validate':
    default:
      validateStartupEnvironment().catch((error) => {
        console.error('Validation failed:', error);
        process.exit(1);
      });
      break;
  }
}

export { validateStartupEnvironment, performSecurityChecks };