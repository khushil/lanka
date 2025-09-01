/**
 * Error Wrapper Utility for Lanka Platform
 * Provides centralized error handling and wrapping functionality
 */

import { 
  LankaError, 
  ErrorCode, 
  ErrorCategory, 
  ErrorSeverity, 
  ErrorContext,
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
import { logger } from '../logging/logger';

export interface ErrorWrapperOptions {
  operation?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
  suppressLogging?: boolean;
}

/**
 * Error Wrapper Class - Central error handling utility
 */
export class ErrorWrapper {
  /**
   * Wrap and standardize errors from any source
   */
  static wrap(
    error: Error | LankaError | string | unknown,
    options: ErrorWrapperOptions = {}
  ): LankaError {
    // If it's already a LankaError, enhance context and return
    if (error instanceof LankaError) {
      const enhancedError = this.enhanceError(error, options);
      this.logError(enhancedError, options);
      return enhancedError;
    }

    // If it's a standard Error, convert to LankaError
    if (error instanceof Error) {
      const lankaError = this.convertStandardError(error, options);
      this.logError(lankaError, options);
      return lankaError;
    }

    // If it's a string, create a system error
    if (typeof error === 'string') {
      const lankaError = new SystemError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        error,
        this.buildContext(options)
      );
      this.logError(lankaError, options);
      return lankaError;
    }

    // Unknown error type
    const unknownError = new SystemError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'An unknown error occurred',
      this.buildContext(options, { originalError: error })
    );
    this.logError(unknownError, options);
    return unknownError;
  }

  /**
   * Create specific error types with consistent formatting
   */
  static business(
    code: ErrorCode,
    message: string,
    options: ErrorWrapperOptions & { 
      userMessage?: string;
      suggestions?: string[];
    } = {}
  ): BusinessError {
    const error = new BusinessError(
      code,
      message,
      options.userMessage,
      this.buildContext(options),
      options.suggestions
    );
    this.logError(error, options);
    return error;
  }

  static technical(
    code: ErrorCode,
    message: string,
    options: ErrorWrapperOptions & {
      retryable?: boolean;
      severity?: ErrorSeverity;
    } = {}
  ): TechnicalError {
    const error = new TechnicalError(
      code,
      message,
      this.buildContext(options),
      options.retryable,
      options.severity
    );
    this.logError(error, options);
    return error;
  }

  static validation(
    code: ErrorCode,
    message: string,
    options: ErrorWrapperOptions & {
      fieldErrors?: Record<string, string[]>;
    } = {}
  ): ValidationError {
    const error = new ValidationError(
      code,
      message,
      options.fieldErrors,
      this.buildContext(options)
    );
    this.logError(error, options);
    return error;
  }

  static authentication(
    code: ErrorCode,
    message: string,
    options: ErrorWrapperOptions & {
      userMessage?: string;
    } = {}
  ): AuthenticationError {
    const error = new AuthenticationError(
      code,
      message,
      options.userMessage,
      this.buildContext(options)
    );
    this.logError(error, options);
    return error;
  }

  static authorization(
    code: ErrorCode,
    message: string,
    options: ErrorWrapperOptions & {
      userMessage?: string;
    } = {}
  ): AuthorizationError {
    const error = new AuthorizationError(
      code,
      message,
      options.userMessage,
      this.buildContext(options)
    );
    this.logError(error, options);
    return error;
  }

  static notFound(
    code: ErrorCode,
    resource: string,
    options: ErrorWrapperOptions & {
      identifier?: string;
    } = {}
  ): NotFoundError {
    const error = new NotFoundError(
      code,
      resource,
      options.identifier,
      this.buildContext(options)
    );
    this.logError(error, options);
    return error;
  }

  static conflict(
    code: ErrorCode,
    message: string,
    options: ErrorWrapperOptions & {
      userMessage?: string;
      suggestions?: string[];
    } = {}
  ): ConflictError {
    const error = new ConflictError(
      code,
      message,
      options.userMessage,
      this.buildContext(options),
      options.suggestions
    );
    this.logError(error, options);
    return error;
  }

  static rateLimit(
    code: ErrorCode,
    message: string,
    options: ErrorWrapperOptions & {
      retryAfter?: number;
    } = {}
  ): RateLimitError {
    const error = new RateLimitError(
      code,
      message,
      options.retryAfter,
      this.buildContext(options)
    );
    this.logError(error, options);
    return error;
  }

  static externalService(
    code: ErrorCode,
    serviceName: string,
    message: string,
    options: ErrorWrapperOptions & {
      retryable?: boolean;
    } = {}
  ): ExternalServiceError {
    const error = new ExternalServiceError(
      code,
      serviceName,
      message,
      this.buildContext(options),
      options.retryable
    );
    this.logError(error, options);
    return error;
  }

  static system(
    code: ErrorCode,
    message: string,
    options: ErrorWrapperOptions & {
      severity?: ErrorSeverity;
    } = {}
  ): SystemError {
    const error = new SystemError(
      code,
      message,
      this.buildContext(options),
      options.severity
    );
    this.logError(error, options);
    return error;
  }

  /**
   * Chain multiple errors together
   */
  static chain(
    primaryError: LankaError,
    ...relatedErrors: LankaError[]
  ): LankaError {
    const enhanced = new LankaError({
      ...primaryError.toJSON(),
      relatedErrors: relatedErrors.map(e => e.toJSON())
    });
    return enhanced;
  }

  /**
   * Retry wrapper for operations that might fail
   */
  static async retry<T>(
    operation: () => Promise<T>,
    options: {
      maxAttempts?: number;
      delay?: number;
      backoffMultiplier?: number;
      retryCondition?: (error: Error) => boolean;
      context?: ErrorWrapperOptions;
    } = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      delay = 1000,
      backoffMultiplier = 2,
      retryCondition = (error: Error) => error instanceof TechnicalError && error.retryable,
      context = {}
    } = options;

    let lastError: Error;
    let currentDelay = delay;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if we should retry
        if (attempt < maxAttempts && retryCondition(lastError)) {
          logger.warn(`Operation failed, retrying in ${currentDelay}ms (attempt ${attempt}/${maxAttempts})`, {
            error: lastError.message,
            ...context
          });
          
          await this.sleep(currentDelay);
          currentDelay *= backoffMultiplier;
        } else {
          break;
        }
      }
    }

    // All retries exhausted, throw the wrapped error
    throw this.wrap(lastError!, {
      ...context,
      metadata: {
        ...context.metadata,
        totalAttempts: maxAttempts,
        finalAttempt: true
      }
    });
  }

  /**
   * Timeout wrapper for operations
   */
  static async timeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    options: ErrorWrapperOptions = {}
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(this.technical(
          ErrorCode.TIMEOUT_ERROR,
          `Operation timed out after ${timeoutMs}ms`,
          options
        ));
      }, timeoutMs);
    });

    return Promise.race([operation(), timeoutPromise]);
  }

  /**
   * Circuit breaker pattern
   */
  static createCircuitBreaker<T extends any[], R>(
    operation: (...args: T) => Promise<R>,
    options: {
      failureThreshold?: number;
      recoveryTimeout?: number;
      monitorWindow?: number;
      context?: ErrorWrapperOptions;
    } = {}
  ) {
    const {
      failureThreshold = 5,
      recoveryTimeout = 60000,
      monitorWindow = 300000,
      context = {}
    } = options;

    let failures = 0;
    let lastFailureTime = 0;
    let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    return async (...args: T): Promise<R> => {
      const now = Date.now();

      // Reset failure count if monitor window has passed
      if (now - lastFailureTime > monitorWindow) {
        failures = 0;
      }

      // Check circuit state
      if (state === 'OPEN') {
        if (now - lastFailureTime < recoveryTimeout) {
          throw this.system(
            ErrorCode.SERVICE_UNAVAILABLE,
            'Circuit breaker is open - service temporarily unavailable',
            { ...context, metadata: { circuitState: state, failures } }
          );
        } else {
          state = 'HALF_OPEN';
        }
      }

      try {
        const result = await operation(...args);
        
        // Success - reset circuit
        if (state === 'HALF_OPEN') {
          state = 'CLOSED';
          failures = 0;
        }
        
        return result;
      } catch (error) {
        failures++;
        lastFailureTime = now;

        if (failures >= failureThreshold) {
          state = 'OPEN';
        } else if (state === 'HALF_OPEN') {
          state = 'OPEN';
        }

        throw this.wrap(error instanceof Error ? error : new Error(String(error)), {
          ...context,
          metadata: {
            ...context.metadata,
            circuitState: state,
            failures
          }
        });
      }
    };
  }

  /**
   * Private helper methods
   */
  private static enhanceError(error: LankaError, options: ErrorWrapperOptions): LankaError {
    const enhancedContext = {
      ...error.context,
      ...this.buildContext(options)
    };

    return new LankaError({
      ...error.toJSON(),
      context: enhancedContext
    });
  }

  private static convertStandardError(error: Error, options: ErrorWrapperOptions): LankaError {
    const context = this.buildContext(options, { 
      originalError: error.name,
      originalStack: error.stack 
    });

    // Map common error types
    if (error.name === 'ValidationError') {
      return new ValidationError(ErrorCode.INVALID_INPUT, error.message, {}, context);
    }

    if (error.name === 'TypeError' || error.name === 'ReferenceError') {
      return new SystemError(ErrorCode.CONFIGURATION_ERROR, error.message, context);
    }

    if (error.message.toLowerCase().includes('timeout')) {
      return new TechnicalError(ErrorCode.TIMEOUT_ERROR, error.message, context, true);
    }

    if (error.message.toLowerCase().includes('network') || 
        error.message.toLowerCase().includes('connection')) {
      return new TechnicalError(ErrorCode.NETWORK_ERROR, error.message, context, true);
    }

    // Default to system error
    return new SystemError(ErrorCode.INTERNAL_SERVER_ERROR, error.message, context);
  }

  private static buildContext(
    options: ErrorWrapperOptions,
    additionalData?: Record<string, any>
  ): ErrorContext {
    return {
      userId: options.userId,
      sessionId: options.sessionId,
      requestId: options.requestId,
      operation: options.operation,
      metadata: {
        ...options.metadata,
        ...additionalData
      },
      timestamp: new Date()
    };
  }

  private static logError(error: LankaError, options: ErrorWrapperOptions): void {
    if (options.suppressLogging) {
      return;
    }

    const logLevel = options.logLevel || this.getDefaultLogLevel(error.severity);
    const logData = {
      errorCode: error.code,
      category: error.category,
      severity: error.severity,
      message: error.message,
      context: error.context,
      stack: error.stack
    };

    switch (logLevel) {
      case 'error':
        logger.error('Lanka Error', logData);
        break;
      case 'warn':
        logger.warn('Lanka Error', logData);
        break;
      case 'info':
        logger.info('Lanka Error', logData);
        break;
      case 'debug':
        logger.debug('Lanka Error', logData);
        break;
    }
  }

  private static getDefaultLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' | 'debug' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'error';
    }
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Convenience functions for common error patterns
export const wrapError = ErrorWrapper.wrap;
export const businessError = ErrorWrapper.business;
export const technicalError = ErrorWrapper.technical;
export const validationError = ErrorWrapper.validation;
export const authenticationError = ErrorWrapper.authentication;
export const authorizationError = ErrorWrapper.authorization;
export const notFoundError = ErrorWrapper.notFound;
export const conflictError = ErrorWrapper.conflict;
export const rateLimitError = ErrorWrapper.rateLimit;
export const externalServiceError = ErrorWrapper.externalService;
export const systemError = ErrorWrapper.system;
export const retryOperation = ErrorWrapper.retry;
export const timeoutOperation = ErrorWrapper.timeout;
export const createCircuitBreaker = ErrorWrapper.createCircuitBreaker;