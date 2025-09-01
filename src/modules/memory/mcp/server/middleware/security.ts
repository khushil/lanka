/**
 * Security Middleware for MCP Server
 * Provides comprehensive security measures for memory operations
 */

import crypto from 'crypto';
import winston from 'winston';
import { MCPRequest, MCPServerContext, MCPErrorCode } from '../../types';

interface SecurityConfig {
  enableInputSanitization: boolean;
  enableOutputFiltering: boolean;
  maxRequestSize: number;
  maxMemorySize: number;
  allowedOrigins?: string[];
  blockedIPs?: string[];
  enableCSPValidation: boolean;
  rateLimitWindow: number;
  rateLimitMax: number;
  enableAuditLogging: boolean;
  encryptSensitiveData: boolean;
  encryptionKey?: string;
}

interface SecurityViolation {
  type: 'input_injection' | 'xss' | 'size_limit' | 'rate_limit' | 'blocked_ip' | 'suspicious_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  clientId?: string;
  timestamp: Date;
  data?: any;
}

interface AuditLogEntry {
  timestamp: Date;
  clientId: string;
  operation: string;
  resource?: string;
  result: 'success' | 'failure' | 'blocked';
  violation?: SecurityViolation;
  metadata?: any;
}

export class SecurityMiddleware {
  private config: SecurityConfig;
  private logger: winston.Logger;
  private auditLogger: winston.Logger;
  private violations: Map<string, SecurityViolation[]> = new Map();
  private rateLimits: Map<string, { count: number; resetTime: number }> = new Map();
  private suspiciousPatterns: RegExp[];
  private encryptionKey?: Buffer;

  constructor(config: SecurityConfig) {
    this.config = config;
    this.setupLoggers();
    this.initializeSecurity();
    this.setupSuspiciousPatterns();
  }

  private setupLoggers(): void {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'security-middleware' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ],
    });

    // Separate audit logger for security events
    this.auditLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'security-audit' },
      transports: [
        new winston.transports.File({ filename: 'security-audit.log' }),
        new winston.transports.Console({
          level: 'warn',
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ],
    });
  }

  private initializeSecurity(): void {
    if (this.config.encryptSensitiveData && this.config.encryptionKey) {
      this.encryptionKey = Buffer.from(this.config.encryptionKey, 'hex');
    }

    this.logger.info('Security middleware initialized with config:', {
      inputSanitization: this.config.enableInputSanitization,
      outputFiltering: this.config.enableOutputFiltering,
      maxRequestSize: this.config.maxRequestSize,
      auditLogging: this.config.enableAuditLogging,
    });
  }

  private setupSuspiciousPatterns(): void {
    this.suspiciousPatterns = [
      // SQL Injection patterns
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      
      // XSS patterns
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      
      // Command injection patterns
      /[;&|`$(){}[\]]/g,
      /\b(eval|exec|system|shell_exec|passthru|wget|curl)\b/gi,
      
      // Path traversal patterns
      /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c/gi,
      
      // NoSQL injection patterns
      /\$where|\$ne|\$gt|\$lt|\$regex/gi,
      
      // Memory system specific patterns
      /__(proto|constructor|prototype)__|eval\(|Function\(/gi,
    ];
  }

  public async validateRequest(request: MCPRequest, context: MCPServerContext): Promise<{
    valid: boolean;
    violations: SecurityViolation[];
    sanitizedRequest?: MCPRequest;
  }> {
    const violations: SecurityViolation[] = [];
    let sanitizedRequest = { ...request };

    try {
      // Check request size
      const requestSize = JSON.stringify(request).length;
      if (requestSize > this.config.maxRequestSize) {
        violations.push({
          type: 'size_limit',
          severity: 'medium',
          description: `Request size ${requestSize} exceeds limit ${this.config.maxRequestSize}`,
          clientId: context.clientId,
          timestamp: new Date(),
          data: { size: requestSize, limit: this.config.maxRequestSize },
        });
      }

      // Check rate limiting
      const rateLimitViolation = this.checkRateLimit(context.clientId || context.session.id);
      if (rateLimitViolation) {
        violations.push(rateLimitViolation);
      }

      // Check blocked IPs
      const ipViolation = this.checkBlockedIP(context);
      if (ipViolation) {
        violations.push(ipViolation);
      }

      // Input sanitization
      if (this.config.enableInputSanitization) {
        const sanitizationResult = await this.sanitizeInput(sanitizedRequest, context);
        violations.push(...sanitizationResult.violations);
        sanitizedRequest = sanitizationResult.sanitizedRequest;
      }

      // Memory-specific validation
      if (request.method === 'tools/call' && request.params?.name?.startsWith('memory-')) {
        const memoryViolations = await this.validateMemoryOperation(request, context);
        violations.push(...memoryViolations);
      }

      // Log violations
      for (const violation of violations) {
        this.recordViolation(violation);
      }

      // Log audit entry
      if (this.config.enableAuditLogging) {
        this.logAuditEntry({
          timestamp: new Date(),
          clientId: context.clientId || context.session.id,
          operation: request.method || 'unknown',
          result: violations.length > 0 ? 'blocked' : 'success',
          violation: violations.length > 0 ? violations[0] : undefined,
          metadata: {
            requestSize,
            violationCount: violations.length,
          },
        });
      }

      return {
        valid: violations.filter(v => v.severity === 'high' || v.severity === 'critical').length === 0,
        violations,
        sanitizedRequest,
      };

    } catch (error) {
      this.logger.error('Security validation error:', error);
      
      const criticalViolation: SecurityViolation = {
        type: 'suspicious_pattern',
        severity: 'critical',
        description: 'Security validation failed',
        clientId: context.clientId,
        timestamp: new Date(),
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
      };

      return {
        valid: false,
        violations: [criticalViolation],
      };
    }
  }

  private async sanitizeInput(request: MCPRequest, context: MCPServerContext): Promise<{
    sanitizedRequest: MCPRequest;
    violations: SecurityViolation[];
  }> {
    const violations: SecurityViolation[] = [];
    const sanitizedRequest = JSON.parse(JSON.stringify(request)); // Deep clone

    // Recursively sanitize all string values
    const sanitizeValue = (value: any, path: string): any => {
      if (typeof value === 'string') {
        const originalValue = value;
        
        // Check for suspicious patterns
        for (const pattern of this.suspiciousPatterns) {
          if (pattern.test(value)) {
            violations.push({
              type: 'input_injection',
              severity: 'high',
              description: `Suspicious pattern detected in ${path}`,
              clientId: context.clientId,
              timestamp: new Date(),
              data: { path, pattern: pattern.source, value: value.substring(0, 100) },
            });
          }
        }

        // Basic sanitization
        let sanitized = value;
        
        // Remove potentially dangerous HTML/JS
        sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        sanitized = sanitized.replace(/javascript:/gi, '');
        sanitized = sanitized.replace(/on\w+\s*=/gi, '');
        
        // Escape potential SQL injection
        sanitized = sanitized.replace(/'/g, "''");
        
        // Remove control characters
        sanitized = sanitized.replace(/[\x00-\x1f\x7f-\x9f]/g, '');
        
        // Limit length for memory content
        if (path.includes('content') && sanitized.length > this.config.maxMemorySize) {
          sanitized = sanitized.substring(0, this.config.maxMemorySize);
          violations.push({
            type: 'size_limit',
            severity: 'medium',
            description: `Memory content truncated at ${this.config.maxMemorySize} characters`,
            clientId: context.clientId,
            timestamp: new Date(),
            data: { path, originalLength: value.length, truncatedLength: sanitized.length },
          });
        }

        if (sanitized !== originalValue) {
          this.logger.debug(`Sanitized input at ${path}:`, {
            original: originalValue.substring(0, 50),
            sanitized: sanitized.substring(0, 50),
          });
        }

        return sanitized;
      }

      if (Array.isArray(value)) {
        return value.map((item, index) => sanitizeValue(item, `${path}[${index}]`));
      }

      if (value && typeof value === 'object') {
        const sanitized: any = {};
        for (const [key, val] of Object.entries(value)) {
          // Sanitize keys as well
          const sanitizedKey = typeof key === 'string' ? this.sanitizeKey(key) : key;
          sanitized[sanitizedKey] = sanitizeValue(val, `${path}.${sanitizedKey}`);
        }
        return sanitized;
      }

      return value;
    };

    // Sanitize the entire request
    if (request.params) {
      sanitizedRequest.params = sanitizeValue(request.params, 'params');
    }

    return { sanitizedRequest, violations };
  }

  private sanitizeKey(key: string): string {
    // Remove potentially dangerous characters from object keys
    return key.replace(/[^a-zA-Z0-9_-]/g, '');
  }

  private async validateMemoryOperation(request: MCPRequest, context: MCPServerContext): Promise<SecurityViolation[]> {
    const violations: SecurityViolation[] = [];
    const toolName = request.params?.name;
    const args = request.params?.arguments || {};

    switch (toolName) {
      case 'memory-store':
        // Validate memory storage
        if (args.content && typeof args.content === 'string') {
          if (args.content.length > this.config.maxMemorySize) {
            violations.push({
              type: 'size_limit',
              severity: 'medium',
              description: `Memory content exceeds size limit`,
              clientId: context.clientId,
              timestamp: new Date(),
              data: { size: args.content.length, limit: this.config.maxMemorySize },
            });
          }

          // Check for sensitive data patterns
          const sensitivePatterns = [
            /(?:password|pwd|secret|key|token|api[_-]?key)\s*[:=]\s*[\w.-]+/gi,
            /(?:credit[_-]?card|cc[_-]?number|card[_-]?number)\s*[:=]\s*\d+/gi,
            /(?:ssn|social[_-]?security)\s*[:=]\s*\d{3}-?\d{2}-?\d{4}/gi,
          ];

          for (const pattern of sensitivePatterns) {
            if (pattern.test(args.content)) {
              violations.push({
                type: 'suspicious_pattern',
                severity: 'high',
                description: 'Potential sensitive data in memory content',
                clientId: context.clientId,
                timestamp: new Date(),
                data: { pattern: pattern.source },
              });
            }
          }
        }
        break;

      case 'memory-search':
        // Validate search queries
        if (args.query && typeof args.query === 'string') {
          // Check for injection attempts in search queries
          const searchInjectionPatterns = [
            /[\{\}]/g, // MongoDB injection
            /\$[a-zA-Z]+/g, // MongoDB operators
            /UNION|SELECT|INSERT|UPDATE|DELETE/gi, // SQL injection
          ];

          for (const pattern of searchInjectionPatterns) {
            if (pattern.test(args.query)) {
              violations.push({
                type: 'input_injection',
                severity: 'high',
                description: 'Potential injection in search query',
                clientId: context.clientId,
                timestamp: new Date(),
                data: { query: args.query.substring(0, 100), pattern: pattern.source },
              });
            }
          }
        }
        break;

      case 'memory-federate':
        // Validate federation requests
        if (args.targetInstance) {
          // Ensure target instance is from allowed domains
          if (this.config.allowedOrigins && !this.isAllowedOrigin(args.targetInstance)) {
            violations.push({
              type: 'suspicious_pattern',
              severity: 'high',
              description: 'Federation target not in allowed origins',
              clientId: context.clientId,
              timestamp: new Date(),
              data: { target: args.targetInstance },
            });
          }
        }
        break;
    }

    return violations;
  }

  private checkRateLimit(clientId: string): SecurityViolation | null {
    const now = Date.now();
    const entry = this.rateLimits.get(clientId);

    if (!entry || now > entry.resetTime) {
      this.rateLimits.set(clientId, {
        count: 1,
        resetTime: now + this.config.rateLimitWindow,
      });
      return null;
    }

    if (entry.count >= this.config.rateLimitMax) {
      return {
        type: 'rate_limit',
        severity: 'medium',
        description: `Rate limit exceeded: ${entry.count}/${this.config.rateLimitMax}`,
        clientId,
        timestamp: new Date(),
        data: { count: entry.count, limit: this.config.rateLimitMax },
      };
    }

    entry.count++;
    return null;
  }

  private checkBlockedIP(context: MCPServerContext): SecurityViolation | null {
    if (!this.config.blockedIPs || this.config.blockedIPs.length === 0) {
      return null;
    }

    const clientIP = context.session.metadata.remoteAddress || 
                     context.session.metadata.ip ||
                     context.session.metadata.clientIP;

    if (clientIP && this.config.blockedIPs.includes(clientIP)) {
      return {
        type: 'blocked_ip',
        severity: 'critical',
        description: `Request from blocked IP address`,
        clientId: context.clientId,
        timestamp: new Date(),
        data: { ip: clientIP },
      };
    }

    return null;
  }

  private isAllowedOrigin(origin: string): boolean {
    if (!this.config.allowedOrigins) return true;
    
    try {
      const url = new URL(origin);
      const hostname = url.hostname;
      
      return this.config.allowedOrigins.some(allowed => {
        if (allowed === '*') return true;
        if (allowed.startsWith('*.')) {
          const domain = allowed.substring(2);
          return hostname.endsWith(domain);
        }
        return hostname === allowed;
      });
    } catch {
      return false;
    }
  }

  private recordViolation(violation: SecurityViolation): void {
    const clientId = violation.clientId || 'unknown';
    
    if (!this.violations.has(clientId)) {
      this.violations.set(clientId, []);
    }
    
    this.violations.get(clientId)!.push(violation);
    
    // Log based on severity
    const logData = {
      type: violation.type,
      severity: violation.severity,
      description: violation.description,
      clientId: violation.clientId,
      data: violation.data,
    };

    switch (violation.severity) {
      case 'critical':
        this.logger.error('Critical security violation:', logData);
        break;
      case 'high':
        this.logger.warn('High security violation:', logData);
        break;
      case 'medium':
        this.logger.info('Medium security violation:', logData);
        break;
      case 'low':
        this.logger.debug('Low security violation:', logData);
        break;
    }
  }

  private logAuditEntry(entry: AuditLogEntry): void {
    this.auditLogger.info('Security audit log:', entry);
  }

  // Data encryption/decryption for sensitive information
  public encryptSensitiveData(data: string): string {
    if (!this.encryptionKey || !this.config.encryptSensitiveData) {
      return data;
    }

    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return `encrypted:${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error('Encryption failed:', error);
      return data; // Fallback to plain text
    }
  }

  public decryptSensitiveData(encryptedData: string): string {
    if (!this.encryptionKey || !this.config.encryptSensitiveData || !encryptedData.startsWith('encrypted:')) {
      return encryptedData;
    }

    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) return encryptedData;

      const iv = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed:', error);
      return encryptedData; // Return as-is if decryption fails
    }
  }

  // Monitoring and statistics
  public getSecurityStats(): {
    totalViolations: number;
    violationsByType: Record<string, number>;
    violationsBySeverity: Record<string, number>;
    activeRateLimits: number;
    recentViolations: SecurityViolation[];
  } {
    let totalViolations = 0;
    const violationsByType: Record<string, number> = {};
    const violationsBySeverity: Record<string, number> = {};
    const recentViolations: SecurityViolation[] = [];
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const violations of this.violations.values()) {
      for (const violation of violations) {
        totalViolations++;
        
        violationsByType[violation.type] = (violationsByType[violation.type] || 0) + 1;
        violationsBySeverity[violation.severity] = (violationsBySeverity[violation.severity] || 0) + 1;
        
        if (violation.timestamp > oneDayAgo) {
          recentViolations.push(violation);
        }
      }
    }

    return {
      totalViolations,
      violationsByType,
      violationsBySeverity,
      activeRateLimits: this.rateLimits.size,
      recentViolations: recentViolations.slice(0, 100), // Limit recent violations
    };
  }

  // Cleanup old violations and rate limits
  public cleanup(): void {
    const now = Date.now();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);

    // Clean up old violations
    for (const [clientId, violations] of this.violations) {
      const recentViolations = violations.filter(v => v.timestamp > oneHourAgo);
      if (recentViolations.length === 0) {
        this.violations.delete(clientId);
      } else {
        this.violations.set(clientId, recentViolations);
      }
    }

    // Clean up expired rate limits
    for (const [clientId, entry] of this.rateLimits) {
      if (now > entry.resetTime) {
        this.rateLimits.delete(clientId);
      }
    }

    this.logger.debug('Security middleware cleanup completed');
  }

  // Factory methods for common configurations
  public static createDefault(): SecurityMiddleware {
    return new SecurityMiddleware({
      enableInputSanitization: true,
      enableOutputFiltering: true,
      maxRequestSize: 10 * 1024 * 1024, // 10MB
      maxMemorySize: 1024 * 1024, // 1MB
      enableCSPValidation: true,
      rateLimitWindow: 60000, // 1 minute
      rateLimitMax: 100,
      enableAuditLogging: true,
      encryptSensitiveData: false,
    });
  }

  public static createStrict(encryptionKey?: string): SecurityMiddleware {
    return new SecurityMiddleware({
      enableInputSanitization: true,
      enableOutputFiltering: true,
      maxRequestSize: 5 * 1024 * 1024, // 5MB
      maxMemorySize: 512 * 1024, // 512KB
      enableCSPValidation: true,
      rateLimitWindow: 60000,
      rateLimitMax: 50, // Stricter rate limit
      enableAuditLogging: true,
      encryptSensitiveData: !!encryptionKey,
      encryptionKey,
    });
  }
}