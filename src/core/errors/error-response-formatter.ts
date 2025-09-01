/**
 * Error Response Formatter for Lanka Platform
 * Provides consistent error response formatting across all APIs
 */

import { 
  LankaError, 
  ValidationError,
  ErrorSeverity,
  ErrorCategory 
} from './error-types';

export interface ErrorResponseOptions {
  includeStack?: boolean;
  includeContext?: boolean;
  includeTimestamp?: boolean;
  includeSuggestions?: boolean;
  localization?: {
    locale?: string;
    fallback?: string;
  };
}

export interface FormattedErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    category: string;
    severity: string;
    timestamp?: string;
    suggestions?: string[];
    context?: any;
    stack?: string;
    fieldErrors?: Record<string, string[]>;
    retryable?: boolean;
    retryAfter?: number;
    documentation?: string;
  };
  meta?: {
    requestId?: string;
    version?: string;
    endpoint?: string;
  };
}

export interface SuccessResponseOptions {
  includeTimestamp?: boolean;
  includeMeta?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  meta?: Record<string, any>;
}

export interface FormattedSuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  meta?: Record<string, any>;
}

/**
 * Error Response Formatter Class
 */
export class ErrorResponseFormatter {
  private static errorMessages: Record<string, Record<string, string>> = {
    en: {
      'BLE_1000': 'Business rule violation occurred',
      'BLE_1001': 'Invalid state transition attempted',
      'TEC_2000': 'Database connection failed',
      'TEC_2001': 'Database query execution failed',
      'VAL_3000': 'Invalid input provided',
      'VAL_3001': 'Required field is missing',
      'AUTH_4000': 'Authentication failed',
      'AUTH_4001': 'Invalid credentials provided',
      'AUTHZ_5000': 'Access denied',
      'NF_6000': 'Resource not found',
      'CON_7000': 'Resource conflict detected',
      'RL_8000': 'Rate limit exceeded',
      'EXT_9000': 'External service unavailable',
      'SYS_10000': 'Internal server error occurred'
    },
    es: {
      'BLE_1000': 'Se ha violado una regla de negocio',
      'BLE_1001': 'Se intentó una transición de estado inválida',
      'TEC_2000': 'Falló la conexión a la base de datos',
      'VAL_3000': 'Entrada inválida proporcionada',
      'AUTH_4000': 'Falló la autenticación',
      'NF_6000': 'Recurso no encontrado'
    }
  };

  private static documentationLinks: Record<string, string> = {
    'VAL_3000': '/docs/api/validation-errors',
    'VAL_3001': '/docs/api/required-fields',
    'AUTH_4000': '/docs/auth/authentication',
    'AUTH_4001': '/docs/auth/credentials',
    'AUTHZ_5000': '/docs/auth/permissions',
    'NF_6000': '/docs/api/resources',
    'RL_8000': '/docs/api/rate-limits',
    'EXT_9000': '/docs/integrations/external-services'
  };

  /**
   * Format error response
   */
  static formatError(
    error: LankaError,
    options: ErrorResponseOptions = {}
  ): FormattedErrorResponse {
    const {
      includeStack = process.env.NODE_ENV === 'development',
      includeContext = process.env.NODE_ENV === 'development',
      includeTimestamp = true,
      includeSuggestions = true,
      localization = { locale: 'en', fallback: 'en' }
    } = options;

    const localizedMessage = this.getLocalizedMessage(
      error.code,
      error.userMessage || error.message,
      localization.locale || 'en',
      localization.fallback || 'en'
    );

    const response: FormattedErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: localizedMessage,
        category: error.category,
        severity: error.severity
      }
    };

    // Add timestamp
    if (includeTimestamp) {
      response.error.timestamp = error.timestamp.toISOString();
    }

    // Add suggestions
    if (includeSuggestions && error.suggestions.length > 0) {
      response.error.suggestions = error.suggestions;
    }

    // Add context for development
    if (includeContext && error.context) {
      response.error.context = this.sanitizeContext(error.context);
    }

    // Add stack trace for development
    if (includeStack && error.stack) {
      response.error.stack = error.stack;
    }

    // Add field errors for validation errors
    if (error instanceof ValidationError) {
      response.error.fieldErrors = error.fieldErrors;
    }

    // Add retry information
    if (error.retryable) {
      response.error.retryable = true;
      if (error.retryAfter) {
        response.error.retryAfter = error.retryAfter;
      }
    }

    // Add documentation link
    const docLink = this.documentationLinks[error.code];
    if (docLink) {
      response.error.documentation = docLink;
    }

    return response;
  }

  /**
   * Format success response
   */
  static formatSuccess<T>(
    data: T,
    options: SuccessResponseOptions = {}
  ): FormattedSuccessResponse<T> {
    const {
      includeTimestamp = true,
      includeMeta = false,
      pagination,
      meta
    } = options;

    const response: FormattedSuccessResponse<T> = {
      success: true,
      data
    };

    if (includeTimestamp) {
      response.timestamp = new Date().toISOString();
    }

    if (pagination) {
      response.pagination = pagination;
    }

    if (includeMeta && meta) {
      response.meta = meta;
    }

    return response;
  }

  /**
   * Format multiple errors
   */
  static formatMultipleErrors(
    errors: LankaError[],
    options: ErrorResponseOptions = {}
  ): FormattedErrorResponse {
    if (errors.length === 0) {
      throw new Error('Cannot format empty error array');
    }

    if (errors.length === 1) {
      return this.formatError(errors[0], options);
    }

    // Get the highest severity error as the primary error
    const primaryError = errors.reduce((prev, current) => {
      const severityOrder = {
        [ErrorSeverity.CRITICAL]: 4,
        [ErrorSeverity.HIGH]: 3,
        [ErrorSeverity.MEDIUM]: 2,
        [ErrorSeverity.LOW]: 1
      };
      return severityOrder[current.severity] > severityOrder[prev.severity] ? current : prev;
    });

    const response = this.formatError(primaryError, options);
    
    // Add related errors
    response.error.relatedErrors = errors
      .filter(e => e !== primaryError)
      .map(e => ({
        code: e.code,
        message: e.userMessage || e.message,
        category: e.category,
        severity: e.severity
      }));

    return response;
  }

  /**
   * Format validation errors with field-specific messages
   */
  static formatValidationErrors(
    fieldErrors: Record<string, string[]>,
    options: ErrorResponseOptions = {}
  ): FormattedErrorResponse {
    const validationError = new ValidationError(
      'VAL_3000' as any,
      'Validation failed',
      fieldErrors
    );

    return this.formatError(validationError, options);
  }

  /**
   * Create error response for HTTP APIs
   */
  static createHttpErrorResponse(
    error: LankaError,
    requestId?: string,
    options: ErrorResponseOptions = {}
  ): { statusCode: number; body: FormattedErrorResponse } {
    const response = this.formatError(error, options);
    
    if (requestId) {
      response.meta = {
        requestId,
        version: process.env.API_VERSION || '1.0.0'
      };
    }

    return {
      statusCode: error.httpStatusCode,
      body: response
    };
  }

  /**
   * Create error response for GraphQL APIs
   */
  static createGraphQLErrorResponse(
    error: LankaError,
    path?: (string | number)[],
    options: ErrorResponseOptions = {}
  ): any {
    const response = this.formatError(error, options);
    
    return {
      message: response.error.message,
      extensions: {
        code: response.error.code,
        category: response.error.category,
        severity: response.error.severity,
        suggestions: response.error.suggestions,
        ...(response.error.fieldErrors && { fieldErrors: response.error.fieldErrors }),
        ...(response.error.retryable && { retryable: response.error.retryable }),
        ...(response.error.documentation && { documentation: response.error.documentation })
      },
      path
    };
  }

  /**
   * Format error for logging
   */
  static formatForLogging(error: LankaError): Record<string, any> {
    return {
      timestamp: error.timestamp.toISOString(),
      code: error.code,
      category: error.category,
      severity: error.severity,
      message: error.message,
      userMessage: error.userMessage,
      context: this.sanitizeContext(error.context),
      retryable: error.retryable,
      httpStatusCode: error.httpStatusCode,
      suggestions: error.suggestions,
      stack: error.stack
    };
  }

  /**
   * Private helper methods
   */
  private static getLocalizedMessage(
    code: string,
    defaultMessage: string,
    locale: string,
    fallback: string
  ): string {
    const messages = this.errorMessages[locale] || this.errorMessages[fallback];
    return messages?.[code] || defaultMessage;
  }

  private static sanitizeContext(context: any): any {
    if (!context) return undefined;

    // Remove sensitive information
    const sanitized = { ...context };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    
    const sanitizeObject = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;
      
      const result = Array.isArray(obj) ? [] : {};
      
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }
      
      return result;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Register custom error messages for localization
   */
  static registerErrorMessages(locale: string, messages: Record<string, string>): void {
    if (!this.errorMessages[locale]) {
      this.errorMessages[locale] = {};
    }
    Object.assign(this.errorMessages[locale], messages);
  }

  /**
   * Register documentation links
   */
  static registerDocumentationLinks(links: Record<string, string>): void {
    Object.assign(this.documentationLinks, links);
  }

  /**
   * Get all available locales
   */
  static getAvailableLocales(): string[] {
    return Object.keys(this.errorMessages);
  }

  /**
   * Create paginated response
   */
  static createPaginatedResponse<T>(
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
    },
    options: SuccessResponseOptions = {}
  ): FormattedSuccessResponse<T[]> {
    const hasMore = (pagination.page * pagination.limit) < pagination.total;
    
    return this.formatSuccess(data, {
      ...options,
      pagination: {
        ...pagination,
        hasMore
      }
    });
  }

  /**
   * Create response with warnings
   */
  static createResponseWithWarnings<T>(
    data: T,
    warnings: string[],
    options: SuccessResponseOptions = {}
  ): FormattedSuccessResponse<T> {
    return this.formatSuccess(data, {
      ...options,
      meta: {
        ...options.meta,
        warnings
      }
    });
  }
}

// Convenience exports
export const formatError = ErrorResponseFormatter.formatError;
export const formatSuccess = ErrorResponseFormatter.formatSuccess;
export const formatValidationErrors = ErrorResponseFormatter.formatValidationErrors;
export const createHttpErrorResponse = ErrorResponseFormatter.createHttpErrorResponse;
export const createGraphQLErrorResponse = ErrorResponseFormatter.createGraphQLErrorResponse;