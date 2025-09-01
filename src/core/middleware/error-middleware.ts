/**
 * Express Error Middleware for Lanka Platform
 * Handles all HTTP errors with consistent formatting
 */

import { Request, Response, NextFunction } from 'express';
import { 
  LankaError, 
  ErrorWrapper, 
  ErrorResponseFormatter, 
  globalErrorHandler,
  errorMetricsCollector
} from '../errors';

export interface ErrorMiddlewareOptions {
  includeStack?: boolean;
  includeContext?: boolean;
  enableMetrics?: boolean;
  corsEnabled?: boolean;
  rateLimitHeaders?: boolean;
}

/**
 * Main error handling middleware
 */
export const errorHandler = (options: ErrorMiddlewareOptions = {}) => {
  const {
    includeStack = process.env.NODE_ENV === 'development',
    includeContext = process.env.NODE_ENV === 'development',
    enableMetrics = true,
    corsEnabled = true,
    rateLimitHeaders = true
  } = options;

  return (error: Error, req: Request, res: Response, next: NextFunction): void => {
    // Skip if response already sent
    if (res.headersSent) {
      return next(error);
    }

    // Wrap error in LankaError format
    const lankaError = ErrorWrapper.wrap(error, {
      operation: req.route?.path || req.path || 'unknown_route',
      userId: (req as any).user?.id,
      sessionId: req.sessionID,
      requestId: req.headers['x-request-id'] as string,
      metadata: {
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress,
        body: req.method !== 'GET' ? req.body : undefined,
        query: Object.keys(req.query).length > 0 ? req.query : undefined
      }
    });

    // Record error metrics
    if (enableMetrics) {
      errorMetricsCollector.recordError(lankaError);
    }

    // Handle error through global handler
    globalErrorHandler.handleError(lankaError);

    // Set CORS headers if enabled
    if (corsEnabled) {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
    }

    // Set rate limit headers if applicable
    if (rateLimitHeaders && lankaError.name === 'RateLimitError') {
      const retryAfter = (lankaError as any).retryAfter;
      if (retryAfter) {
        res.header('Retry-After', retryAfter.toString());
        res.header('X-RateLimit-Reset', new Date(Date.now() + retryAfter * 1000).toISOString());
      }
    }

    // Format and send response
    const { statusCode, body } = ErrorResponseFormatter.createHttpErrorResponse(
      lankaError,
      req.headers['x-request-id'] as string,
      {
        includeStack,
        includeContext,
        includeTimestamp: true,
        includeSuggestions: true
      }
    );

    res.status(statusCode).json(body);
  };
};

/**
 * Async error wrapper middleware
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not found handler middleware
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = ErrorWrapper.notFound(
    'NF_6000' as any,
    'Route',
    {
      identifier: `${req.method} ${req.path}`,
      metadata: {
        method: req.method,
        path: req.path,
        availableRoutes: 'Check API documentation'
      }
    }
  );

  next(error);
};

/**
 * Request validation middleware
 */
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // This would use a validation library like Joi or Yup
      // For now, it's a placeholder
      const validationResult = schema.validate({
        body: req.body,
        query: req.query,
        params: req.params
      });

      if (validationResult.error) {
        const fieldErrors: Record<string, string[]> = {};
        
        validationResult.error.details?.forEach((detail: any) => {
          const field = detail.path.join('.');
          if (!fieldErrors[field]) {
            fieldErrors[field] = [];
          }
          fieldErrors[field].push(detail.message);
        });

        const validationError = ErrorWrapper.validation(
          'VAL_3000' as any,
          'Request validation failed',
          {
            fieldErrors,
            operation: `validate_${req.method.toLowerCase()}_request`
          }
        );

        return next(validationError);
      }

      next();
    } catch (error) {
      next(ErrorWrapper.wrap(error, { operation: 'request_validation' }));
    }
  };
};

/**
 * Rate limiting middleware
 */
export const rateLimiter = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100,
    message = 'Too many requests from this IP',
    skipSuccessfulRequests = false
  } = options;

  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    if (Math.random() < 0.01) { // 1% chance to cleanup
      for (const [k, v] of requests.entries()) {
        if (now > v.resetTime) {
          requests.delete(k);
        }
      }
    }

    // Get or create request record
    let record = requests.get(key);
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
      requests.set(key, record);
    }

    // Check if limit exceeded
    if (record.count >= max) {
      const rateLimitError = ErrorWrapper.rateLimit(
        'RL_8000' as any,
        message,
        {
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
          metadata: {
            ip: key,
            limit: max,
            windowMs,
            count: record.count
          }
        }
      );

      return next(rateLimitError);
    }

    // Increment counter (conditionally)
    const shouldSkip = skipSuccessfulRequests && res.statusCode < 400;
    if (!shouldSkip) {
      record.count++;
    }

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': max.toString(),
      'X-RateLimit-Remaining': Math.max(0, max - record.count).toString(),
      'X-RateLimit-Reset': new Date(record.resetTime).toISOString()
    });

    next();
  };
};

/**
 * Request timeout middleware
 */
export const timeoutHandler = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        const timeoutError = ErrorWrapper.technical(
          'TEC_2006' as any,
          `Request timeout after ${timeoutMs}ms`,
          {
            operation: 'request_timeout',
            retryable: true,
            metadata: {
              timeoutMs,
              method: req.method,
              path: req.path
            }
          }
        );
        
        next(timeoutError);
      }
    }, timeoutMs);

    // Clear timeout when response is finished
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));

    next();
  };
};

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Started`);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    
    console[logLevel](`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    
    // Record response time for metrics
    errorMetricsCollector.recordResponseTime(
      `${req.method} ${req.route?.path || req.path}`,
      duration,
      res.statusCode >= 400
    );
  });

  next();
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'",
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });

  next();
};

/**
 * Health check middleware
 */
export const healthCheck = (req: Request, res: Response, next: NextFunction): void => {
  if (req.path === '/health') {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.APP_VERSION || '1.0.0'
    };

    res.json(health);
    return;
  }

  if (req.path === '/health/detailed') {
    const errorStats = errorMetricsCollector.getErrorStats();
    const detailedHealth = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.APP_VERSION || '1.0.0',
      errors: errorStats,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };

    res.json(detailedHealth);
    return;
  }

  next();
};

/**
 * CORS middleware
 */
export const cors = (options: {
  origin?: string | string[] | boolean;
  methods?: string[];
  allowedHeaders?: string[];
  credentials?: boolean;
} = {}) => {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials = false
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Set CORS headers
    if (typeof origin === 'string') {
      res.header('Access-Control-Allow-Origin', origin);
    } else if (Array.isArray(origin)) {
      const requestOrigin = req.headers.origin;
      if (requestOrigin && origin.includes(requestOrigin)) {
        res.header('Access-Control-Allow-Origin', requestOrigin);
      }
    } else if (origin === true) {
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    }

    res.header('Access-Control-Allow-Methods', methods.join(', '));
    res.header('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    
    if (credentials) {
      res.header('Access-Control-Allow-Credentials', 'true');
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    next();
  };
};

/**
 * Create comprehensive middleware stack
 */
export const createMiddlewareStack = (options: {
  enableCors?: boolean;
  enableRateLimit?: boolean;
  enableTimeout?: boolean;
  enableSecurity?: boolean;
  enableHealthCheck?: boolean;
  enableRequestLogger?: boolean;
  rateLimitOptions?: Parameters<typeof rateLimiter>[0];
  timeoutMs?: number;
  corsOptions?: Parameters<typeof cors>[0];
}) => {
  const middleware: Array<(req: Request, res: Response, next: NextFunction) => void> = [];

  if (options.enableRequestLogger !== false) {
    middleware.push(requestLogger);
  }

  if (options.enableSecurity !== false) {
    middleware.push(securityHeaders);
  }

  if (options.enableCors !== false) {
    middleware.push(cors(options.corsOptions));
  }

  if (options.enableHealthCheck !== false) {
    middleware.push(healthCheck);
  }

  if (options.enableTimeout !== false) {
    middleware.push(timeoutHandler(options.timeoutMs));
  }

  if (options.enableRateLimit !== false) {
    middleware.push(rateLimiter(options.rateLimitOptions));
  }

  return middleware;
};