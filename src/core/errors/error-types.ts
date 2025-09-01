/**
 * Lanka Platform Error Types and Categorization System
 * Provides standardized error handling across all services
 */

export enum ErrorCategory {
  BUSINESS = 'BUSINESS',
  TECHNICAL = 'TECHNICAL',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  SYSTEM = 'SYSTEM'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum ErrorCode {
  // Business Logic Errors (1000-1999)
  BUSINESS_RULE_VIOLATION = 'BLE_1000',
  INVALID_STATE_TRANSITION = 'BLE_1001',
  BUSINESS_CONSTRAINT_VIOLATION = 'BLE_1002',
  WORKFLOW_VIOLATION = 'BLE_1003',
  
  // Technical Errors (2000-2999)
  DATABASE_CONNECTION_FAILED = 'TEC_2000',
  DATABASE_QUERY_FAILED = 'TEC_2001',
  CACHE_CONNECTION_FAILED = 'TEC_2002',
  CACHE_OPERATION_FAILED = 'TEC_2003',
  FILE_SYSTEM_ERROR = 'TEC_2004',
  NETWORK_ERROR = 'TEC_2005',
  TIMEOUT_ERROR = 'TEC_2006',
  
  // Validation Errors (3000-3999)
  INVALID_INPUT = 'VAL_3000',
  MISSING_REQUIRED_FIELD = 'VAL_3001',
  INVALID_FORMAT = 'VAL_3002',
  OUT_OF_RANGE = 'VAL_3003',
  SCHEMA_VALIDATION_FAILED = 'VAL_3004',
  
  // Authentication Errors (4000-4999)
  AUTHENTICATION_FAILED = 'AUTH_4000',
  INVALID_CREDENTIALS = 'AUTH_4001',
  TOKEN_EXPIRED = 'AUTH_4002',
  TOKEN_INVALID = 'AUTH_4003',
  ACCOUNT_LOCKED = 'AUTH_4004',
  ACCOUNT_SUSPENDED = 'AUTH_4005',
  
  // Authorization Errors (5000-5999)
  ACCESS_DENIED = 'AUTHZ_5000',
  INSUFFICIENT_PERMISSIONS = 'AUTHZ_5001',
  RESOURCE_FORBIDDEN = 'AUTHZ_5002',
  ROLE_REQUIRED = 'AUTHZ_5003',
  
  // Not Found Errors (6000-6999)
  RESOURCE_NOT_FOUND = 'NF_6000',
  USER_NOT_FOUND = 'NF_6001',
  REQUIREMENT_NOT_FOUND = 'NF_6002',
  PROJECT_NOT_FOUND = 'NF_6003',
  TEMPLATE_NOT_FOUND = 'NF_6004',
  
  // Conflict Errors (7000-7999)
  RESOURCE_CONFLICT = 'CON_7000',
  DUPLICATE_ENTRY = 'CON_7001',
  VERSION_CONFLICT = 'CON_7002',
  STATE_CONFLICT = 'CON_7003',
  
  // Rate Limit Errors (8000-8999)
  RATE_LIMIT_EXCEEDED = 'RL_8000',
  QUOTA_EXCEEDED = 'RL_8001',
  THROTTLE_LIMIT_REACHED = 'RL_8002',
  
  // External Service Errors (9000-9999)
  EXTERNAL_SERVICE_UNAVAILABLE = 'EXT_9000',
  EXTERNAL_API_ERROR = 'EXT_9001',
  INTEGRATION_FAILURE = 'EXT_9002',
  WEBHOOK_DELIVERY_FAILED = 'EXT_9003',
  
  // System Errors (10000-10999)
  INTERNAL_SERVER_ERROR = 'SYS_10000',
  SERVICE_UNAVAILABLE = 'SYS_10001',
  MEMORY_LIMIT_EXCEEDED = 'SYS_10002',
  DISK_SPACE_FULL = 'SYS_10003',
  CONFIGURATION_ERROR = 'SYS_10004'
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  operation?: string;
  resource?: string;
  metadata?: Record<string, any>;
  stack?: string;
  timestamp?: Date;
}

export interface ErrorDetails {
  code: ErrorCode;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage?: string;
  context?: ErrorContext;
  retryable?: boolean;
  httpStatusCode?: number;
  suggestions?: string[];
  relatedErrors?: ErrorDetails[];
}

/**
 * Base error class for Lanka Platform
 */
export class LankaError extends Error {
  public readonly code: ErrorCode;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly userMessage?: string;
  public readonly context?: ErrorContext;
  public readonly retryable: boolean;
  public readonly httpStatusCode: number;
  public readonly suggestions: string[];
  public readonly relatedErrors: ErrorDetails[];
  public readonly timestamp: Date;

  constructor(details: ErrorDetails) {
    super(details.message);
    this.name = 'LankaError';
    this.code = details.code;
    this.category = details.category;
    this.severity = details.severity;
    this.userMessage = details.userMessage;
    this.context = details.context;
    this.retryable = details.retryable || false;
    this.httpStatusCode = details.httpStatusCode || this.getDefaultHttpStatusCode();
    this.suggestions = details.suggestions || [];
    this.relatedErrors = details.relatedErrors || [];
    this.timestamp = new Date();

    // Maintain proper stack trace
    Error.captureStackTrace(this, LankaError);
  }

  private getDefaultHttpStatusCode(): number {
    switch (this.category) {
      case ErrorCategory.VALIDATION:
        return 400;
      case ErrorCategory.AUTHENTICATION:
        return 401;
      case ErrorCategory.AUTHORIZATION:
        return 403;
      case ErrorCategory.NOT_FOUND:
        return 404;
      case ErrorCategory.CONFLICT:
        return 409;
      case ErrorCategory.RATE_LIMIT:
        return 429;
      case ErrorCategory.BUSINESS:
      case ErrorCategory.EXTERNAL_SERVICE:
        return 422;
      case ErrorCategory.SYSTEM:
      case ErrorCategory.TECHNICAL:
        return 500;
      default:
        return 500;
    }
  }

  toJSON(): ErrorDetails {
    return {
      code: this.code,
      category: this.category,
      severity: this.severity,
      message: this.message,
      userMessage: this.userMessage,
      context: this.context,
      retryable: this.retryable,
      httpStatusCode: this.httpStatusCode,
      suggestions: this.suggestions,
      relatedErrors: this.relatedErrors
    };
  }

  toString(): string {
    return `[${this.code}] ${this.category}: ${this.message}`;
  }
}

/**
 * Business Logic Error
 */
export class BusinessError extends LankaError {
  constructor(
    code: ErrorCode,
    message: string,
    userMessage?: string,
    context?: ErrorContext,
    suggestions?: string[]
  ) {
    super({
      code,
      category: ErrorCategory.BUSINESS,
      severity: ErrorSeverity.MEDIUM,
      message,
      userMessage,
      context,
      httpStatusCode: 422,
      suggestions
    });
    this.name = 'BusinessError';
  }
}

/**
 * Technical Error
 */
export class TechnicalError extends LankaError {
  constructor(
    code: ErrorCode,
    message: string,
    context?: ErrorContext,
    retryable: boolean = false,
    severity: ErrorSeverity = ErrorSeverity.HIGH
  ) {
    super({
      code,
      category: ErrorCategory.TECHNICAL,
      severity,
      message,
      userMessage: 'A technical error occurred. Please try again later.',
      context,
      retryable,
      httpStatusCode: 500
    });
    this.name = 'TechnicalError';
  }
}

/**
 * Validation Error
 */
export class ValidationError extends LankaError {
  public readonly fieldErrors: Record<string, string[]>;

  constructor(
    code: ErrorCode,
    message: string,
    fieldErrors: Record<string, string[]> = {},
    context?: ErrorContext
  ) {
    super({
      code,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      message,
      userMessage: message,
      context,
      httpStatusCode: 400
    });
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }

  toJSON(): ErrorDetails & { fieldErrors: Record<string, string[]> } {
    return {
      ...super.toJSON(),
      fieldErrors: this.fieldErrors
    };
  }
}

/**
 * Authentication Error
 */
export class AuthenticationError extends LankaError {
  constructor(
    code: ErrorCode,
    message: string,
    userMessage?: string,
    context?: ErrorContext
  ) {
    super({
      code,
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
      message,
      userMessage: userMessage || 'Authentication failed',
      context,
      httpStatusCode: 401
    });
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization Error
 */
export class AuthorizationError extends LankaError {
  constructor(
    code: ErrorCode,
    message: string,
    userMessage?: string,
    context?: ErrorContext
  ) {
    super({
      code,
      category: ErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.MEDIUM,
      message,
      userMessage: userMessage || 'Access denied',
      context,
      httpStatusCode: 403
    });
    this.name = 'AuthorizationError';
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends LankaError {
  constructor(
    code: ErrorCode,
    resource: string,
    identifier?: string,
    context?: ErrorContext
  ) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    
    super({
      code,
      category: ErrorCategory.NOT_FOUND,
      severity: ErrorSeverity.LOW,
      message,
      userMessage: message,
      context,
      httpStatusCode: 404
    });
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict Error
 */
export class ConflictError extends LankaError {
  constructor(
    code: ErrorCode,
    message: string,
    userMessage?: string,
    context?: ErrorContext,
    suggestions?: string[]
  ) {
    super({
      code,
      category: ErrorCategory.CONFLICT,
      severity: ErrorSeverity.MEDIUM,
      message,
      userMessage: userMessage || message,
      context,
      httpStatusCode: 409,
      suggestions
    });
    this.name = 'ConflictError';
  }
}

/**
 * Rate Limit Error
 */
export class RateLimitError extends LankaError {
  public readonly retryAfter?: number;

  constructor(
    code: ErrorCode,
    message: string,
    retryAfter?: number,
    context?: ErrorContext
  ) {
    super({
      code,
      category: ErrorCategory.RATE_LIMIT,
      severity: ErrorSeverity.MEDIUM,
      message,
      userMessage: 'Rate limit exceeded. Please try again later.',
      context,
      retryable: true,
      httpStatusCode: 429,
      suggestions: retryAfter ? [`Retry after ${retryAfter} seconds`] : []
    });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * External Service Error
 */
export class ExternalServiceError extends LankaError {
  public readonly serviceName: string;

  constructor(
    code: ErrorCode,
    serviceName: string,
    message: string,
    context?: ErrorContext,
    retryable: boolean = true
  ) {
    super({
      code,
      category: ErrorCategory.EXTERNAL_SERVICE,
      severity: ErrorSeverity.HIGH,
      message: `External service '${serviceName}' error: ${message}`,
      userMessage: 'An external service is temporarily unavailable. Please try again later.',
      context,
      retryable,
      httpStatusCode: 503,
      suggestions: retryable ? ['Please retry the operation'] : []
    });
    this.name = 'ExternalServiceError';
    this.serviceName = serviceName;
  }
}

/**
 * System Error
 */
export class SystemError extends LankaError {
  constructor(
    code: ErrorCode,
    message: string,
    context?: ErrorContext,
    severity: ErrorSeverity = ErrorSeverity.CRITICAL
  ) {
    super({
      code,
      category: ErrorCategory.SYSTEM,
      severity,
      message,
      userMessage: 'A system error occurred. Our team has been notified.',
      context,
      retryable: false,
      httpStatusCode: 500
    });
    this.name = 'SystemError';
  }
}