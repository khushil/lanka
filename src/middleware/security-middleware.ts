import { Request, Response, NextFunction } from 'express';
import { InputValidator } from '../utils/secure-query-builder';
import { logger } from '../core/logging/logger';

/**
 * Security middleware for GraphQL and REST endpoints
 * Provides input validation, rate limiting, and attack detection
 */
export class SecurityMiddleware {
  private static readonly MAX_REQUEST_SIZE = 1024 * 1024; // 1MB
  private static readonly MAX_QUERY_DEPTH = 10;
  private static readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private static readonly RATE_LIMIT_MAX_REQUESTS = 100;

  private static requestCounts = new Map<string, { count: number; resetTime: number }>();

  /**
   * Validate GraphQL query depth to prevent DoS attacks
   */
  public static validateQueryDepth = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      if (req.body?.query) {
        const depth = SecurityMiddleware.calculateQueryDepth(req.body.query);
        
        if (depth > SecurityMiddleware.MAX_QUERY_DEPTH) {
          logger.warn('Query depth limit exceeded', { 
            depth, 
            maxDepth: SecurityMiddleware.MAX_QUERY_DEPTH,
            ip: req.ip,
            query: req.body.query.substring(0, 200) 
          });
          
          res.status(400).json({
            error: 'Query too complex',
            code: 'QUERY_DEPTH_EXCEEDED',
            maxDepth: SecurityMiddleware.MAX_QUERY_DEPTH
          });
          return;
        }
      }
      
      next();
    } catch (error) {
      logger.error('Query depth validation failed', { error, ip: req.ip });
      res.status(400).json({ error: 'Invalid query format' });
    }
  };

  /**
   * Rate limiting middleware
   */
  public static rateLimit = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    for (const [key, value] of SecurityMiddleware.requestCounts.entries()) {
      if (now > value.resetTime) {
        SecurityMiddleware.requestCounts.delete(key);
      }
    }
    
    const clientData = SecurityMiddleware.requestCounts.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      // Reset or initialize counter
      SecurityMiddleware.requestCounts.set(clientId, {
        count: 1,
        resetTime: now + SecurityMiddleware.RATE_LIMIT_WINDOW
      });
      next();
      return;
    }
    
    if (clientData.count >= SecurityMiddleware.RATE_LIMIT_MAX_REQUESTS) {
      logger.warn('Rate limit exceeded', { 
        clientId, 
        count: clientData.count,
        resetTime: new Date(clientData.resetTime).toISOString()
      });
      
      res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        resetTime: clientData.resetTime
      });
      return;
    }
    
    clientData.count++;
    next();
  };

  /**
   * Request size validation
   */
  public static validateRequestSize = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    
    if (contentLength > SecurityMiddleware.MAX_REQUEST_SIZE) {
      logger.warn('Request size limit exceeded', { 
        contentLength,
        maxSize: SecurityMiddleware.MAX_REQUEST_SIZE,
        ip: req.ip
      });
      
      res.status(413).json({
        error: 'Request too large',
        code: 'REQUEST_SIZE_EXCEEDED',
        maxSize: SecurityMiddleware.MAX_REQUEST_SIZE
      });
      return;
    }
    
    next();
  };

  /**
   * Input sanitization middleware
   */
  public static sanitizeInput = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      if (req.body) {
        req.body = SecurityMiddleware.sanitizeObject(req.body);
      }
      
      if (req.query) {
        req.query = SecurityMiddleware.sanitizeObject(req.query);
      }
      
      if (req.params) {
        req.params = SecurityMiddleware.sanitizeObject(req.params);
      }
      
      next();
    } catch (error) {
      logger.error('Input sanitization failed', { error, ip: req.ip });
      res.status(400).json({ error: 'Invalid input format' });
    }
  };

  /**
   * Security headers middleware
   */
  public static setSecurityHeaders = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    // Prevent XSS attacks
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Prevent information disclosure
    res.removeHeader('X-Powered-By');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self'",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '));
    
    next();
  };

  /**
   * GraphQL-specific security checks
   */
  public static validateGraphQLRequest = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      if (!req.body?.query) {
        res.status(400).json({ error: 'Query is required' });
        return;
      }
      
      const query = req.body.query;
      
      // Check for potentially dangerous operations
      const dangerousOperations = [
        /\bDROP\b/i,
        /\bDELETE\b/i,
        /\bCREATE\s+CONSTRAINT\b/i,
        /\bDROP\s+CONSTRAINT\b/i,
        /\bCREATE\s+INDEX\b/i,
        /\bDROP\s+INDEX\b/i,
        /__schema/i,
        /__type/i
      ];
      
      for (const pattern of dangerousOperations) {
        if (pattern.test(query)) {
          logger.warn('Potentially dangerous GraphQL operation detected', {
            query: query.substring(0, 200),
            pattern: pattern.source,
            ip: req.ip
          });
          
          res.status(400).json({
            error: 'Query contains unauthorized operations',
            code: 'DANGEROUS_OPERATION'
          });
          return;
        }
      }
      
      // Validate variables if present
      if (req.body.variables) {
        const validationErrors = SecurityMiddleware.validateGraphQLVariables(req.body.variables);
        if (validationErrors.length > 0) {
          res.status(400).json({
            error: 'Invalid variables',
            code: 'INVALID_VARIABLES',
            details: validationErrors
          });
          return;
        }
      }
      
      next();
    } catch (error) {
      logger.error('GraphQL validation failed', { error, ip: req.ip });
      res.status(400).json({ error: 'Invalid GraphQL request' });
    }
  };

  /**
   * Calculate query depth recursively
   */
  private static calculateQueryDepth(query: string): number {
    // Simple implementation - counts nested braces
    let depth = 0;
    let maxDepth = 0;
    let inString = false;
    let escapeNext = false;
    
    for (const char of query) {
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') {
          depth++;
          maxDepth = Math.max(maxDepth, depth);
        } else if (char === '}') {
          depth--;
        }
      }
    }
    
    return maxDepth;
  }

  /**
   * Validate GraphQL variables
   */
  private static validateGraphQLVariables(variables: any): string[] {
    const errors: string[] = [];
    
    try {
      if (typeof variables !== 'object' || variables === null) {
        errors.push('Variables must be an object');
        return errors;
      }
      
      // Recursively validate variable values
      const validateValue = (value: any, path: string): void => {
        if (typeof value === 'string') {
          if (value.length > 10000) {
            errors.push(`String variable ${path} exceeds maximum length`);
          }
          
          // Check for potential injection patterns
          const injectionPatterns = [
            /\bDROP\b/i,
            /\bDELETE\b/i,
            /\bUNION\s+SELECT\b/i,
            /\bEXEC\b/i,
            /<script>/i,
            /javascript:/i
          ];
          
          for (const pattern of injectionPatterns) {
            if (pattern.test(value)) {
              errors.push(`Variable ${path} contains potentially malicious content`);
              break;
            }
          }
        } else if (typeof value === 'number') {
          if (!Number.isFinite(value)) {
            errors.push(`Variable ${path} is not a valid number`);
          }
        } else if (Array.isArray(value)) {
          if (value.length > 1000) {
            errors.push(`Array variable ${path} exceeds maximum length`);
          }
          
          value.forEach((item, index) => {
            validateValue(item, `${path}[${index}]`);
          });
        } else if (typeof value === 'object' && value !== null) {
          if (Object.keys(value).length > 100) {
            errors.push(`Object variable ${path} has too many properties`);
          }
          
          Object.entries(value).forEach(([key, val]) => {
            validateValue(val, `${path}.${key}`);
          });
        }
      };
      
      Object.entries(variables).forEach(([key, value]) => {
        validateValue(value, key);
      });
    } catch (error) {
      errors.push('Variables validation failed');
    }
    
    return errors;
  }

  /**
   * Sanitize object recursively
   */
  private static sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return obj.replace(/[<>&"']/g, (char) => {
        switch (char) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '"': return '&quot;';
          case "'": return '&#x27;';
          default: return char;
        }
      });
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => SecurityMiddleware.sanitizeObject(item));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize key names too
        const sanitizedKey = key.replace(/[^\w.-]/g, '');
        if (sanitizedKey.length > 0 && sanitizedKey.length <= 100) {
          sanitized[sanitizedKey] = SecurityMiddleware.sanitizeObject(value);
        }
      }
      return sanitized;
    }
    
    return obj;
  }

  /**
   * Combine all security middlewares
   */
  public static createSecurityStack() {
    return [
      SecurityMiddleware.setSecurityHeaders,
      SecurityMiddleware.rateLimit,
      SecurityMiddleware.validateRequestSize,
      SecurityMiddleware.sanitizeInput,
      SecurityMiddleware.validateQueryDepth,
      SecurityMiddleware.validateGraphQLRequest
    ];
  }
}

/**
 * Security audit logger
 */
export class SecurityAuditLogger {
  private static events: Array<{
    timestamp: string;
    event: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: any;
    ip?: string;
  }> = [];

  public static logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: any,
    ip?: string
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      severity,
      details,
      ip
    };

    this.events.push(logEntry);

    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }

    // Log to console based on severity
    const logMessage = `Security Event: ${event}`;
    const logData = { severity, details, ip };

    switch (severity) {
      case 'critical':
        logger.error(logMessage, logData);
        break;
      case 'high':
        logger.error(logMessage, logData);
        break;
      case 'medium':
        logger.warn(logMessage, logData);
        break;
      case 'low':
        logger.info(logMessage, logData);
        break;
    }
  }

  public static getSecurityEvents(limit: number = 100): Array<any> {
    return this.events.slice(-limit);
  }

  public static getSecurityEventsByType(eventType: string, limit: number = 100): Array<any> {
    return this.events
      .filter(event => event.event === eventType)
      .slice(-limit);
  }

  public static getSecurityEventsBySeverity(severity: string, limit: number = 100): Array<any> {
    return this.events
      .filter(event => event.severity === severity)
      .slice(-limit);
  }
}