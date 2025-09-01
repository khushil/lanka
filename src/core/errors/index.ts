/**
 * Lanka Platform Error Handling System
 * Centralized exports for all error handling components
 */

// Error Types and Base Classes
export {
  ErrorCategory,
  ErrorSeverity,
  ErrorCode,
  ErrorContext,
  ErrorDetails,
  LankaError,
  BusinessError,
  TechnicalError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  SystemError
} from './error-types';

// Error Wrapper and Convenience Functions
export {
  ErrorWrapper,
  ErrorWrapperOptions,
  wrapError,
  businessError,
  technicalError,
  validationError,
  authenticationError,
  authorizationError,
  notFoundError,
  conflictError,
  rateLimitError,
  externalServiceError,
  systemError,
  retryOperation,
  timeoutOperation,
  createCircuitBreaker
} from './error-wrapper';

// Global Error Handler
export {
  GlobalErrorHandler,
  ErrorHandlerOptions,
  globalErrorHandler,
  errorMiddleware,
  formatGraphQLError
} from './global-error-handler';

// Error Response Formatter
export {
  ErrorResponseFormatter,
  ErrorResponseOptions,
  SuccessResponseOptions,
  FormattedErrorResponse,
  FormattedSuccessResponse,
  formatError,
  formatSuccess,
  formatValidationErrors,
  createHttpErrorResponse,
  createGraphQLErrorResponse
} from './error-response-formatter';

// Error Metrics and Tracking
export {
  ErrorMetricsCollector,
  ErrorMetrics,
  ErrorTrend,
  ErrorAlert,
  errorMetricsCollector
} from './error-metrics';

// Utility functions for common error patterns
export const createValidationError = (
  field: string,
  message: string,
  value?: any
): ValidationError => {
  return validationError(ErrorCode.INVALID_INPUT, `Validation failed for ${field}`, {
    fieldErrors: { [field]: [message] },
    metadata: { field, value }
  });
};

export const createNotFoundError = (
  resource: string,
  identifier?: string
): NotFoundError => {
  const code = resource.toLowerCase().includes('user') 
    ? ErrorCode.USER_NOT_FOUND
    : resource.toLowerCase().includes('requirement')
    ? ErrorCode.REQUIREMENT_NOT_FOUND
    : resource.toLowerCase().includes('project')
    ? ErrorCode.PROJECT_NOT_FOUND
    : ErrorCode.RESOURCE_NOT_FOUND;
  
  return notFoundError(code, resource, { identifier });
};

export const createDuplicateError = (
  resource: string,
  field: string,
  value: string
): ConflictError => {
  return conflictError(
    ErrorCode.DUPLICATE_ENTRY,
    `${resource} with ${field} '${value}' already exists`,
    {
      userMessage: `This ${field} is already in use`,
      suggestions: [`Try a different ${field}`, `Check if you already have this ${resource}`],
      metadata: { resource, field, value }
    }
  );
};

export const createDatabaseError = (
  operation: string,
  cause?: Error
): TechnicalError => {
  const isConnectionError = cause?.message.toLowerCase().includes('connection');
  
  return technicalError(
    isConnectionError ? ErrorCode.DATABASE_CONNECTION_FAILED : ErrorCode.DATABASE_QUERY_FAILED,
    `Database ${operation} failed: ${cause?.message || 'Unknown error'}`,
    {
      operation: `database_${operation}`,
      retryable: isConnectionError,
      severity: ErrorSeverity.HIGH,
      metadata: { operation, originalError: cause?.name }
    }
  );
};

export const createRateLimitError = (
  resource: string,
  limit: number,
  retryAfter?: number
): RateLimitError => {
  return rateLimitError(
    ErrorCode.RATE_LIMIT_EXCEEDED,
    `Rate limit exceeded for ${resource}. Maximum ${limit} requests allowed.`,
    {
      retryAfter,
      metadata: { resource, limit }
    }
  );
};

export const createAuthenticationError = (
  reason: 'invalid_credentials' | 'token_expired' | 'token_invalid' | 'account_locked' = 'invalid_credentials'
): AuthenticationError => {
  const errorMap = {
    invalid_credentials: {
      code: ErrorCode.INVALID_CREDENTIALS,
      message: 'Invalid credentials provided',
      userMessage: 'Please check your email and password'
    },
    token_expired: {
      code: ErrorCode.TOKEN_EXPIRED,
      message: 'Authentication token has expired',
      userMessage: 'Your session has expired. Please log in again'
    },
    token_invalid: {
      code: ErrorCode.TOKEN_INVALID,
      message: 'Invalid authentication token',
      userMessage: 'Invalid authentication. Please log in again'
    },
    account_locked: {
      code: ErrorCode.ACCOUNT_LOCKED,
      message: 'Account is locked',
      userMessage: 'Your account has been locked. Please contact support'
    }
  };

  const errorInfo = errorMap[reason];
  return authenticationError(errorInfo.code, errorInfo.message, {
    userMessage: errorInfo.userMessage,
    metadata: { reason }
  });
};

export const createAuthorizationError = (
  resource: string,
  action: string,
  requiredRole?: string
): AuthorizationError => {
  const message = `Access denied for ${action} on ${resource}`;
  const userMessage = requiredRole 
    ? `This action requires ${requiredRole} role`
    : `You don't have permission to ${action} this ${resource}`;

  return authorizationError(
    ErrorCode.ACCESS_DENIED,
    message,
    {
      userMessage,
      metadata: { resource, action, requiredRole }
    }
  );
};

export const createBusinessRuleError = (
  rule: string,
  context?: Record<string, any>
): BusinessError => {
  return businessError(
    ErrorCode.BUSINESS_RULE_VIOLATION,
    `Business rule violation: ${rule}`,
    {
      userMessage: `This operation violates business rules: ${rule}`,
      suggestions: ['Review the business requirements', 'Contact administrator if this seems incorrect'],
      metadata: { rule, ...context }
    }
  );
};

export const createExternalServiceError = (
  serviceName: string,
  operation: string,
  cause?: Error,
  retryable: boolean = true
): ExternalServiceError => {
  return externalServiceError(
    ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
    serviceName,
    `Failed to ${operation}: ${cause?.message || 'Service unavailable'}`,
    {
      retryable,
      metadata: { operation, originalError: cause?.name }
    }
  );
};

// Error boundary for React components (if using frontend)
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: LankaError;
  errorId?: string;
}

// Common error handling patterns
export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: { operation: string; userId?: string; metadata?: Record<string, any> }
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw wrapError(error, context);
    }
  };
};

// Async error boundary for promises
export const asyncErrorBoundary = async <T>(
  operation: Promise<T>,
  context: { operation: string; userId?: string; metadata?: Record<string, any> }
): Promise<T> => {
  try {
    return await operation;
  } catch (error) {
    throw wrapError(error, context);
  }
};

// Type guards for error types
export const isLankaError = (error: unknown): error is LankaError => {
  return error instanceof LankaError;
};

export const isValidationError = (error: unknown): error is ValidationError => {
  return error instanceof ValidationError;
};

export const isAuthenticationError = (error: unknown): error is AuthenticationError => {
  return error instanceof AuthenticationError;
};

export const isAuthorizationError = (error: unknown): error is AuthorizationError => {
  return error instanceof AuthorizationError;
};

export const isNotFoundError = (error: unknown): error is NotFoundError => {
  return error instanceof NotFoundError;
};

export const isRetryableError = (error: unknown): boolean => {
  return isLankaError(error) && error.retryable;
};

export const isCriticalError = (error: unknown): boolean => {
  return isLankaError(error) && error.severity === ErrorSeverity.CRITICAL;
};