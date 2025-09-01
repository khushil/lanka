/**
 * Environment Configuration and Validation
 * Centralized environment variable management with validation
 */

export interface EnvironmentConfig {
  // Database Configuration
  neo4j: {
    uri: string;
    user: string;
    password: string;
  };
  mongodb: {
    uri: string;
    database: string;
    username?: string;
    password?: string;
  };
  redis: {
    url: string;
    password?: string;
  };
  
  // Search Configuration
  elasticsearch: {
    url: string;
    username?: string;
    password?: string;
  };
  
  // Messaging Configuration
  kafka: {
    brokers: string[];
    clientId: string;
    username?: string;
    password?: string;
  };
  
  // Application Configuration
  app: {
    port: number;
    nodeEnv: string;
    jwtSecret: string;
    apiKeySecret: string;
  };
  
  // External Services
  openai: {
    apiKey?: string;
  };
}

const requiredEnvVars = [
  'NEO4J_PASSWORD',
  'JWT_SECRET',
  'API_KEY_SECRET'
] as const;

const optionalEnvVars = [
  'NEO4J_URI',
  'NEO4J_USER',
  'MONGODB_URI',
  'MONGODB_DATABASE',
  'MONGODB_USERNAME',
  'MONGODB_PASSWORD',
  'REDIS_URL',
  'REDIS_PASSWORD',
  'ELASTICSEARCH_URL',
  'ELASTICSEARCH_USERNAME',
  'ELASTICSEARCH_PASSWORD',
  'KAFKA_BROKERS',
  'KAFKA_CLIENT_ID',
  'KAFKA_USERNAME',
  'KAFKA_PASSWORD',
  'PORT',
  'NODE_ENV',
  'OPENAI_API_KEY'
] as const;

/**
 * Validates that all required environment variables are present
 * Throws detailed error messages for missing variables
 */
export function validateEnvironment(): void {
  const missingVars: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  // Check for common security issues
  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      warnings.push('JWT_SECRET should be at least 32 characters in production');
    }
    
    if (process.env.API_KEY_SECRET && process.env.API_KEY_SECRET.length < 32) {
      warnings.push('API_KEY_SECRET should be at least 32 characters in production');
    }
  }

  // Report missing variables
  if (missingVars.length > 0) {
    const errorMessage = [
      'Missing required environment variables:',
      ...missingVars.map(varName => `  - ${varName}`),
      '',
      'Please ensure all required environment variables are set.',
      'See .env.example for configuration template.'
    ].join('\n');
    
    throw new Error(errorMessage);
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn('Environment configuration warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  console.info('✓ Environment validation passed');
}

/**
 * Loads and validates environment configuration
 * Returns typed configuration object
 */
export function loadEnvironmentConfig(): EnvironmentConfig {
  validateEnvironment();

  return {
    neo4j: {
      uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
      user: process.env.NEO4J_USER || 'neo4j',
      password: process.env.NEO4J_PASSWORD!
    },
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      database: process.env.MONGODB_DATABASE || 'lanka',
      username: process.env.MONGODB_USERNAME,
      password: process.env.MONGODB_PASSWORD
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD
    },
    elasticsearch: {
      url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      username: process.env.ELASTICSEARCH_USERNAME,
      password: process.env.ELASTICSEARCH_PASSWORD
    },
    kafka: {
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      clientId: process.env.KAFKA_CLIENT_ID || 'lanka-client',
      username: process.env.KAFKA_USERNAME,
      password: process.env.KAFKA_PASSWORD
    },
    app: {
      port: parseInt(process.env.PORT || '3000', 10),
      nodeEnv: process.env.NODE_ENV || 'development',
      jwtSecret: process.env.JWT_SECRET!,
      apiKeySecret: process.env.API_KEY_SECRET!
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY
    }
  };
}

/**
 * Development helper to check environment setup
 */
export function checkEnvironmentSetup(): void {
  console.log('Environment Setup Check:');
  console.log('========================');
  
  const allVars = [...requiredEnvVars, ...optionalEnvVars];
  
  for (const varName of allVars) {
    const value = process.env[varName];
    const isRequired = requiredEnvVars.includes(varName as any);
    const status = value ? '✓' : (isRequired ? '✗' : '○');
    const indicator = value ? 'SET' : (isRequired ? 'MISSING' : 'OPTIONAL');
    
    console.log(`${status} ${varName.padEnd(25)} ${indicator}`);
  }
  
  console.log('');
  console.log('Legend: ✓ = Set, ✗ = Missing Required, ○ = Optional Not Set');
}