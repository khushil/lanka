/**
 * Authentication Middleware for MCP Server
 * Provides comprehensive authentication and authorization for memory operations
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import winston from 'winston';
import { MCPServerContext, MCPRequest, MCPResponse, MCPErrorCode } from '../../types';

interface AuthConfig {
  type: 'bearer' | 'apikey' | 'basic' | 'jwt' | 'none';
  secret?: string;
  apiKeys?: string[];
  users?: Array<{ username: string; password: string; permissions: string[] }>;
  jwtSecret?: string;
  jwtExpiry?: string;
  workspaceAccess?: 'open' | 'restricted' | 'owner-only';
}

interface AuthResult {
  authenticated: boolean;
  user?: {
    id: string;
    username: string;
    permissions: string[];
  };
  error?: string;
  statusCode?: number;
}

interface PermissionCheck {
  required: string[];
  workspace?: string;
  operation: string;
}

export class AuthMiddleware {
  private config: AuthConfig;
  private logger: winston.Logger;
  private tokenBlacklist: Set<string> = new Set();
  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(config: AuthConfig) {
    this.config = config;
    this.setupLogger();
    this.validateConfig();
  }

  private setupLogger(): void {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'auth-middleware' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ],
    });
  }

  private validateConfig(): void {
    if (this.config.type === 'jwt' && !this.config.jwtSecret) {
      throw new Error('JWT secret is required for JWT authentication');
    }

    if (this.config.type === 'apikey' && (!this.config.apiKeys || this.config.apiKeys.length === 0)) {
      throw new Error('API keys must be provided for API key authentication');
    }

    if (this.config.type === 'basic' && (!this.config.users || this.config.users.length === 0)) {
      throw new Error('Users must be configured for basic authentication');
    }
  }

  public async authenticate(request: MCPRequest, context: MCPServerContext): Promise<AuthResult> {
    if (this.config.type === 'none') {
      return { authenticated: true };
    }

    try {
      // Extract authentication credentials from headers or context
      const credentials = this.extractCredentials(request, context);
      
      if (!credentials) {
        return {
          authenticated: false,
          error: 'Authentication credentials required',
          statusCode: 401,
        };
      }

      // Check rate limiting
      const rateLimitCheck = this.checkRateLimit(credentials.identifier);
      if (!rateLimitCheck.allowed) {
        return {
          authenticated: false,
          error: 'Rate limit exceeded',
          statusCode: 429,
        };
      }

      // Authenticate based on type
      const authResult = await this.performAuthentication(credentials);
      
      if (!authResult.authenticated) {
        // Increment failed attempts for rate limiting
        this.recordFailedAttempt(credentials.identifier);
      }

      return authResult;

    } catch (error) {
      this.logger.error('Authentication error:', error);
      return {
        authenticated: false,
        error: 'Authentication failed',
        statusCode: 500,
      };
    }
  }

  private extractCredentials(request: MCPRequest, context: MCPServerContext): {
    type: string;
    value: string;
    identifier: string;
  } | null {
    // Check for authorization header in context metadata
    const authHeader = context.session.metadata.authorization || 
                      context.session.metadata.headers?.authorization;

    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        return {
          type: 'bearer',
          value: token,
          identifier: token.substring(0, 10), // Use token prefix for rate limiting
        };
      }

      if (authHeader.startsWith('Basic ')) {
        const credentials = Buffer.from(authHeader.substring(6), 'base64').toString();
        return {
          type: 'basic',
          value: credentials,
          identifier: credentials.split(':')[0], // Use username for rate limiting
        };
      }
    }

    // Check for API key in headers
    const apiKey = context.session.metadata.apiKey || 
                   context.session.metadata.headers?.['x-api-key'];
    
    if (apiKey) {
      return {
        type: 'apikey',
        value: apiKey,
        identifier: apiKey.substring(0, 10),
      };
    }

    // Check for JWT token
    const jwtToken = context.session.metadata.token ||
                     context.session.metadata.jwt;

    if (jwtToken) {
      return {
        type: 'jwt',
        value: jwtToken,
        identifier: jwtToken.substring(0, 10),
      };
    }

    return null;
  }

  private async performAuthentication(credentials: {
    type: string;
    value: string;
    identifier: string;
  }): Promise<AuthResult> {
    switch (credentials.type) {
      case 'bearer':
        return this.authenticateBearer(credentials.value);
      
      case 'apikey':
        return this.authenticateApiKey(credentials.value);
      
      case 'basic':
        return this.authenticateBasic(credentials.value);
      
      case 'jwt':
        return this.authenticateJWT(credentials.value);
      
      default:
        return {
          authenticated: false,
          error: 'Unsupported authentication type',
          statusCode: 400,
        };
    }
  }

  private async authenticateBearer(token: string): Promise<AuthResult> {
    if (this.tokenBlacklist.has(token)) {
      return {
        authenticated: false,
        error: 'Token has been revoked',
        statusCode: 401,
      };
    }

    // Simple bearer token validation (in production, validate against database)
    if (token === this.config.secret) {
      return {
        authenticated: true,
        user: {
          id: 'bearer-user',
          username: 'bearer-user',
          permissions: ['memory:read', 'memory:write', 'memory:admin'],
        },
      };
    }

    return {
      authenticated: false,
      error: 'Invalid bearer token',
      statusCode: 401,
    };
  }

  private async authenticateApiKey(apiKey: string): Promise<AuthResult> {
    if (!this.config.apiKeys?.includes(apiKey)) {
      return {
        authenticated: false,
        error: 'Invalid API key',
        statusCode: 401,
      };
    }

    // In production, look up API key permissions from database
    return {
      authenticated: true,
      user: {
        id: `apikey-${apiKey.substring(0, 8)}`,
        username: `apikey-user`,
        permissions: ['memory:read', 'memory:write'],
      },
    };
  }

  private async authenticateBasic(credentials: string): Promise<AuthResult> {
    const [username, password] = credentials.split(':');
    
    if (!username || !password) {
      return {
        authenticated: false,
        error: 'Invalid basic auth credentials',
        statusCode: 401,
      };
    }

    const user = this.config.users?.find(u => u.username === username);
    if (!user) {
      return {
        authenticated: false,
        error: 'User not found',
        statusCode: 401,
      };
    }

    // Compare passwords (in production, use proper password hashing)
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return {
        authenticated: false,
        error: 'Invalid password',
        statusCode: 401,
      };
    }

    return {
      authenticated: true,
      user: {
        id: username,
        username,
        permissions: user.permissions,
      },
    };
  }

  private async authenticateJWT(token: string): Promise<AuthResult> {
    try {
      if (this.tokenBlacklist.has(token)) {
        return {
          authenticated: false,
          error: 'Token has been revoked',
          statusCode: 401,
        };
      }

      const payload = jwt.verify(token, this.config.jwtSecret!) as any;
      
      return {
        authenticated: true,
        user: {
          id: payload.sub || payload.userId,
          username: payload.username || payload.name,
          permissions: payload.permissions || ['memory:read'],
        },
      };

    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          authenticated: false,
          error: 'Token expired',
          statusCode: 401,
        };
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return {
          authenticated: false,
          error: 'Invalid token',
          statusCode: 401,
        };
      }

      throw error;
    }
  }

  public authorize(user: any, check: PermissionCheck): boolean {
    if (!user || !user.permissions) {
      return false;
    }

    // Check if user has admin permissions
    if (user.permissions.includes('memory:admin') || user.permissions.includes('*')) {
      return true;
    }

    // Check required permissions
    for (const permission of check.required) {
      if (!user.permissions.includes(permission)) {
        return false;
      }
    }

    // Check workspace access
    if (check.workspace && this.config.workspaceAccess !== 'open') {
      const hasWorkspaceAccess = 
        user.permissions.includes(`workspace:${check.workspace}`) ||
        user.permissions.includes('workspace:*');

      if (!hasWorkspaceAccess) {
        // For owner-only access, check if user owns the workspace
        if (this.config.workspaceAccess === 'owner-only') {
          return user.id === check.workspace || user.workspaces?.includes(check.workspace);
        }
        return false;
      }
    }

    return true;
  }

  // Rate limiting
  private checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const maxRequests = 100;

    let entry = this.rateLimitMap.get(identifier);
    
    if (!entry || now > entry.resetTime) {
      entry = { count: 1, resetTime: now + windowMs };
      this.rateLimitMap.set(identifier, entry);
      return { allowed: true, remaining: maxRequests - 1, resetTime: entry.resetTime };
    }

    if (entry.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetTime: entry.resetTime };
    }

    entry.count++;
    return { allowed: true, remaining: maxRequests - entry.count, resetTime: entry.resetTime };
  }

  private recordFailedAttempt(identifier: string): void {
    // Increment rate limit counter for failed attempts
    const entry = this.rateLimitMap.get(identifier);
    if (entry) {
      entry.count += 2; // Penalize failed attempts more heavily
    }
  }

  // Token management
  public generateJWT(userId: string, username: string, permissions: string[]): string {
    if (!this.config.jwtSecret) {
      throw new Error('JWT secret not configured');
    }

    const payload = {
      sub: userId,
      username,
      permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    };

    return jwt.sign(payload, this.config.jwtSecret);
  }

  public revokeToken(token: string): void {
    this.tokenBlacklist.add(token);
    this.logger.info(`Token revoked: ${token.substring(0, 10)}...`);
  }

  public clearExpiredTokens(): void {
    // Clean up expired tokens from blacklist
    // In production, implement proper token cleanup
    this.logger.debug('Token cleanup performed');
  }

  // Middleware factory methods
  public static createBearerAuth(secret: string): AuthMiddleware {
    return new AuthMiddleware({
      type: 'bearer',
      secret,
    });
  }

  public static createApiKeyAuth(apiKeys: string[]): AuthMiddleware {
    return new AuthMiddleware({
      type: 'apikey',
      apiKeys,
    });
  }

  public static createJWTAuth(jwtSecret: string, expiry: string = '24h'): AuthMiddleware {
    return new AuthMiddleware({
      type: 'jwt',
      jwtSecret,
      jwtExpiry: expiry,
    });
  }

  public static createBasicAuth(users: Array<{ username: string; password: string; permissions: string[] }>): AuthMiddleware {
    return new AuthMiddleware({
      type: 'basic',
      users,
    });
  }

  public static createNoAuth(): AuthMiddleware {
    return new AuthMiddleware({
      type: 'none',
    });
  }

  // Utility methods
  public getAuthStats(): {
    authenticationType: string;
    activeUsers: number;
    blacklistedTokens: number;
    rateLimitEntries: number;
  } {
    return {
      authenticationType: this.config.type,
      activeUsers: this.config.users?.length || 0,
      blacklistedTokens: this.tokenBlacklist.size,
      rateLimitEntries: this.rateLimitMap.size,
    };
  }

  public cleanup(): void {
    // Clean up expired rate limit entries
    const now = Date.now();
    for (const [identifier, entry] of this.rateLimitMap) {
      if (now > entry.resetTime) {
        this.rateLimitMap.delete(identifier);
      }
    }

    this.logger.debug('Auth middleware cleanup completed');
  }
}