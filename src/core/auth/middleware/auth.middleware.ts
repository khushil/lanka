/**
 * Authentication Middleware for Lanka Platform
 * Provides JWT-based authentication for GraphQL API
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../../logging/logger';

export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
  lastLogin?: Date;
}

export interface AuthContext {
  user: User | null;
  isAuthenticated: boolean;
  permissions: string[];
  roles: string[];
}

interface AuthConfig {
  jwtSecret: string;
  jwtExpiry: string;
  refreshTokenExpiry: string;
  issuer: string;
  audience: string;
}

interface TokenPayload {
  sub: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export class AuthMiddleware {
  private config: AuthConfig;
  private tokenBlacklist: Set<string> = new Set();
  private refreshTokens: Map<string, { userId: string; expires: Date }> = new Map();

  constructor() {
    this.config = {
      jwtSecret: process.env.JWT_SECRET || 'lanka-platform-secret-key',
      jwtExpiry: process.env.JWT_EXPIRY || '24h',
      refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d',
      issuer: process.env.JWT_ISSUER || 'lanka-platform',
      audience: process.env.JWT_AUDIENCE || 'lanka-api',
    };

    if (this.config.jwtSecret === 'lanka-platform-secret-key') {
      logger.warn('Using default JWT secret. Please set JWT_SECRET environment variable in production.');
    }
  }

  /**
   * Express middleware for JWT authentication
   */
  public authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        const context: AuthContext = {
          user: null,
          isAuthenticated: false,
          permissions: [],
          roles: [],
        };
        (req as any).auth = context;
        next();
        return;
      }

      if (this.tokenBlacklist.has(token)) {
        logger.warn('Attempted to use blacklisted token', { 
          token: token.substring(0, 10) + '...',
          ip: req.ip,
        });
        res.status(401).json({ error: 'Token has been revoked' });
        return;
      }

      const payload = await this.verifyToken(token);
      const user = await this.getUserFromPayload(payload);

      if (!user || !user.isActive) {
        logger.warn('Authentication failed: inactive user', { userId: payload.sub });
        res.status(401).json({ error: 'User account is inactive' });
        return;
      }

      const context: AuthContext = {
        user,
        isAuthenticated: true,
        permissions: user.permissions,
        roles: user.roles,
      };

      (req as any).auth = context;
      logger.debug('User authenticated successfully', { 
        userId: user.id, 
        username: user.username,
        roles: user.roles,
      });

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.info('Token expired', { error: error.message });
        res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
        return;
      }

      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid JWT token', { error: error.message });
        res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
        return;
      }

      logger.error('Authentication error', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  };

  /**
   * GraphQL context authentication
   */
  public authenticateGraphQLContext = async (req: Request): Promise<AuthContext> => {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        return {
          user: null,
          isAuthenticated: false,
          permissions: [],
          roles: [],
        };
      }

      if (this.tokenBlacklist.has(token)) {
        throw new Error('Token has been revoked');
      }

      const payload = await this.verifyToken(token);
      const user = await this.getUserFromPayload(payload);

      if (!user || !user.isActive) {
        throw new Error('User account is inactive');
      }

      return {
        user,
        isAuthenticated: true,
        permissions: user.permissions,
        roles: user.roles,
      };
    } catch (error) {
      logger.warn('GraphQL authentication failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        user: null,
        isAuthenticated: false,
        permissions: [],
        roles: [],
      };
    }
  };

  /**
   * WebSocket authentication
   */
  public authenticateWebSocket = async (token: string): Promise<AuthContext> => {
    try {
      if (!token) {
        throw new Error('No token provided');
      }

      if (this.tokenBlacklist.has(token)) {
        throw new Error('Token has been revoked');
      }

      const payload = await this.verifyToken(token);
      const user = await this.getUserFromPayload(payload);

      if (!user || !user.isActive) {
        throw new Error('User account is inactive');
      }

      return {
        user,
        isAuthenticated: true,
        permissions: user.permissions,
        roles: user.roles,
      };
    } catch (error) {
      logger.warn('WebSocket authentication failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw new Error('WebSocket authentication failed');
    }
  };

  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check for token in query parameters (for WebSocket upgrades)
    if (req.query.token && typeof req.query.token === 'string') {
      return req.query.token;
    }

    // Check for token in cookies
    if (req.cookies && req.cookies.authToken) {
      return req.cookies.authToken;
    }

    return null;
  }

  private async verifyToken(token: string): Promise<TokenPayload> {
    return new Promise((resolve, reject) => {
      jwt.verify(token, this.config.jwtSecret, {
        issuer: this.config.issuer,
        audience: this.config.audience,
      }, (err, payload) => {
        if (err) {
          reject(err);
        } else {
          resolve(payload as TokenPayload);
        }
      });
    });
  }

  private async getUserFromPayload(payload: TokenPayload): Promise<User | null> {
    // In a real application, this would query the database
    // For now, we'll create a user from the token payload
    return {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
      isActive: true,
      lastLogin: new Date(),
    };
  }

  /**
   * Generate JWT token for user
   */
  public generateToken(user: User): string {
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiry,
      issuer: this.config.issuer,
      audience: this.config.audience,
    });
  }

  /**
   * Generate refresh token
   */
  public generateRefreshToken(userId: string): string {
    const token = jwt.sign(
      { sub: userId, type: 'refresh' },
      this.config.jwtSecret,
      { expiresIn: this.config.refreshTokenExpiry }
    );

    const expires = new Date();
    expires.setDate(expires.getDate() + 7); // 7 days
    this.refreshTokens.set(token, { userId, expires });

    return token;
  }

  /**
   * Refresh access token using refresh token
   */
  public async refreshToken(refreshToken: string): Promise<{ accessToken: string; newRefreshToken: string } | null> {
    try {
      const tokenData = this.refreshTokens.get(refreshToken);
      if (!tokenData || tokenData.expires < new Date()) {
        this.refreshTokens.delete(refreshToken);
        return null;
      }

      // Verify the refresh token
      const payload = jwt.verify(refreshToken, this.config.jwtSecret) as any;
      if (payload.type !== 'refresh' || payload.sub !== tokenData.userId) {
        return null;
      }

      // Get user data (in real app, fetch from database)
      const user: User = {
        id: tokenData.userId,
        username: `user_${tokenData.userId}`,
        email: `user_${tokenData.userId}@example.com`,
        roles: ['user'],
        permissions: ['read', 'write'],
        isActive: true,
      };

      // Generate new tokens
      const newAccessToken = this.generateToken(user);
      const newRefreshToken = this.generateRefreshToken(user.id);

      // Remove old refresh token
      this.refreshTokens.delete(refreshToken);

      return {
        accessToken: newAccessToken,
        newRefreshToken,
      };
    } catch (error) {
      logger.error('Error refreshing token', error);
      return null;
    }
  }

  /**
   * Revoke token (add to blacklist)
   */
  public revokeToken(token: string): void {
    this.tokenBlacklist.add(token);
    logger.info('Token revoked', { token: token.substring(0, 10) + '...' });
  }

  /**
   * Revoke refresh token
   */
  public revokeRefreshToken(refreshToken: string): void {
    this.refreshTokens.delete(refreshToken);
    logger.info('Refresh token revoked');
  }

  /**
   * Hash password for storage
   */
  public async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Clean up expired tokens and refresh tokens
   */
  public cleanup(): void {
    const now = new Date();
    
    // Clean up expired refresh tokens
    for (const [token, data] of this.refreshTokens) {
      if (data.expires < now) {
        this.refreshTokens.delete(token);
      }
    }

    logger.debug('Auth middleware cleanup completed', {
      blacklistedTokens: this.tokenBlacklist.size,
      activeRefreshTokens: this.refreshTokens.size,
    });
  }
}

// Singleton instance
export const authMiddleware = new AuthMiddleware();