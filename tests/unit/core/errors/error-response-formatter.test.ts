/**
 * Error Response Formatter Unit Tests
 * Tests for error response formatting functionality
 */

import {
  ErrorResponseFormatter,
  ValidationError,
  BusinessError,
  TechnicalError,
  NotFoundError,
  RateLimitError,
  ErrorCode,
  ErrorSeverity
} from '../../../../src/core/errors';

describe('ErrorResponseFormatter', () => {
  describe('formatError()', () => {
    it('should format basic error correctly', () => {
      const error = new BusinessError(
        ErrorCode.BUSINESS_RULE_VIOLATION,
        'Business rule violated',
        'This action is not allowed'
      );

      const formatted = ErrorResponseFormatter.formatError(error);

      expect(formatted).toEqual({
        success: false,
        error: {
          code: ErrorCode.BUSINESS_RULE_VIOLATION,
          message: 'This action is not allowed',
          category: 'BUSINESS',
          severity: 'MEDIUM',
          timestamp: expect.any(String),
          suggestions: []
        }
      });
    });

    it('should include suggestions when available', () => {
      const error = new BusinessError(
        ErrorCode.BUSINESS_RULE_VIOLATION,
        'Business rule violated',
        'This action is not allowed',
        undefined,
        ['Review requirements', 'Contact administrator']
      );

      const formatted = ErrorResponseFormatter.formatError(error);

      expect(formatted.error.suggestions).toEqual([
        'Review requirements',
        'Contact administrator'
      ]);
    });

    it('should include field errors for validation errors', () => {
      const fieldErrors = {
        email: ['Invalid email format', 'Email already exists'],
        password: ['Password too weak']
      };

      const error = new ValidationError(
        ErrorCode.INVALID_INPUT,
        'Validation failed',
        fieldErrors
      );

      const formatted = ErrorResponseFormatter.formatError(error);

      expect(formatted.error.fieldErrors).toEqual(fieldErrors);
    });

    it('should include retry information for retryable errors', () => {
      const error = new RateLimitError(
        ErrorCode.RATE_LIMIT_EXCEEDED,
        'Rate limit exceeded',
        60
      );

      const formatted = ErrorResponseFormatter.formatError(error);

      expect(formatted.error.retryable).toBe(true);
      expect(formatted.error.retryAfter).toBe(60);
    });

    it('should include stack trace in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new TechnicalError(
        ErrorCode.DATABASE_CONNECTION_FAILED,
        'Database connection failed'
      );

      const formatted = ErrorResponseFormatter.formatError(error, {
        includeStack: true
      });

      expect(formatted.error.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should exclude sensitive information in production', () => {
      const error = new TechnicalError(
        ErrorCode.DATABASE_CONNECTION_FAILED,
        'Database connection failed',
        {
          userId: 'user123',
          metadata: {
            password: 'secret123',
            token: 'bearer-token',
            dbConnectionString: 'postgres://user:pass@host/db'
          }
        }
      );

      const formatted = ErrorResponseFormatter.formatError(error, {
        includeContext: true,
        includeStack: false
      });

      expect(formatted.error.context?.userId).toBe('user123');
      expect(formatted.error.context?.metadata?.password).toBe('[REDACTED]');
      expect(formatted.error.context?.metadata?.token).toBe('[REDACTED]');
    });
  });

  describe('formatSuccess()', () => {
    it('should format successful response correctly', () => {
      const data = { id: '123', name: 'Test Item' };
      const formatted = ErrorResponseFormatter.formatSuccess(data);

      expect(formatted).toEqual({
        success: true,
        data: { id: '123', name: 'Test Item' },
        timestamp: expect.any(String)
      });
    });

    it('should include pagination information', () => {
      const data = [{ id: '1' }, { id: '2' }];
      const pagination = {
        page: 2,
        limit: 10,
        total: 25,
        hasMore: true
      };

      const formatted = ErrorResponseFormatter.formatSuccess(data, {
        pagination
      });

      expect(formatted.pagination).toEqual(pagination);
    });

    it('should include metadata when specified', () => {
      const data = { message: 'Success' };
      const meta = { version: '1.0.0', requestId: 'req123' };

      const formatted = ErrorResponseFormatter.formatSuccess(data, {
        includeMeta: true,
        meta
      });

      expect(formatted.meta).toEqual(meta);
    });
  });

  describe('formatMultipleErrors()', () => {
    it('should format multiple errors with primary error', () => {
      const primaryError = new BusinessError(
        ErrorCode.BUSINESS_RULE_VIOLATION,
        'Primary error',
        'Primary user message'
      );

      const secondaryError = new ValidationError(
        ErrorCode.INVALID_INPUT,
        'Secondary error',
        { field: ['Field error'] }
      );

      const techError = new TechnicalError(
        ErrorCode.DATABASE_CONNECTION_FAILED,
        'Technical error'
      );

      const formatted = ErrorResponseFormatter.formatMultipleErrors([
        secondaryError, // Lower severity
        primaryError,   // Medium severity
        techError      // High severity
      ]);

      // Should use the highest severity error as primary
      expect(formatted.error.code).toBe(ErrorCode.DATABASE_CONNECTION_FAILED);
      expect(formatted.error.severity).toBe('HIGH');
      expect(formatted.error.relatedErrors).toHaveLength(2);
    });

    it('should handle single error in array', () => {
      const error = new NotFoundError(
        ErrorCode.RESOURCE_NOT_FOUND,
        'Resource',
        'item123'
      );

      const formatted = ErrorResponseFormatter.formatMultipleErrors([error]);

      expect(formatted.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(formatted.error.relatedErrors).toBeUndefined();
    });

    it('should throw error for empty array', () => {
      expect(() => {
        ErrorResponseFormatter.formatMultipleErrors([]);
      }).toThrow('Cannot format empty error array');
    });
  });

  describe('formatValidationErrors()', () => {
    it('should format field validation errors', () => {
      const fieldErrors = {
        username: ['Username is required', 'Username must be unique'],
        email: ['Invalid email format'],
        age: ['Age must be a positive number']
      };

      const formatted = ErrorResponseFormatter.formatValidationErrors(fieldErrors);

      expect(formatted.success).toBe(false);
      expect(formatted.error.code).toBe('VAL_3000');
      expect(formatted.error.message).toBe('Validation failed');
      expect(formatted.error.fieldErrors).toEqual(fieldErrors);
    });
  });

  describe('createHttpErrorResponse()', () => {
    it('should create HTTP error response with status code', () => {
      const error = new NotFoundError(
        ErrorCode.RESOURCE_NOT_FOUND,
        'User',
        'user123'
      );

      const { statusCode, body } = ErrorResponseFormatter.createHttpErrorResponse(
        error,
        'req123'
      );

      expect(statusCode).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(body.meta?.requestId).toBe('req123');
    });

    it('should include API version in metadata', () => {
      const originalVersion = process.env.API_VERSION;
      process.env.API_VERSION = '2.0.0';

      const error = new BusinessError(
        ErrorCode.BUSINESS_RULE_VIOLATION,
        'Test error'
      );

      const { body } = ErrorResponseFormatter.createHttpErrorResponse(error, 'req123');

      expect(body.meta?.version).toBe('2.0.0');

      process.env.API_VERSION = originalVersion;
    });
  });

  describe('createGraphQLErrorResponse()', () => {
    it('should create GraphQL error response format', () => {
      const error = new ValidationError(
        ErrorCode.INVALID_INPUT,
        'Invalid input provided',
        { username: ['Username is required'] }
      );

      const path = ['user', 'create'];
      const formatted = ErrorResponseFormatter.createGraphQLErrorResponse(error, path);

      expect(formatted.message).toBe('Invalid input provided');
      expect(formatted.extensions.code).toBe(ErrorCode.INVALID_INPUT);
      expect(formatted.extensions.category).toBe('VALIDATION');
      expect(formatted.extensions.fieldErrors).toEqual({ username: ['Username is required'] });
      expect(formatted.path).toEqual(path);
    });

    it('should include retryable information in extensions', () => {
      const error = new TechnicalError(
        ErrorCode.DATABASE_CONNECTION_FAILED,
        'Database connection failed',
        undefined,
        true // retryable
      );

      const formatted = ErrorResponseFormatter.createGraphQLErrorResponse(error);

      expect(formatted.extensions.retryable).toBe(true);
    });
  });

  describe('localization support', () => {
    beforeAll(() => {
      // Register test messages
      ErrorResponseFormatter.registerErrorMessages('es', {
        [ErrorCode.INVALID_INPUT]: 'Entrada inválida',
        [ErrorCode.RESOURCE_NOT_FOUND]: 'Recurso no encontrado'
      });
    });

    it('should use localized messages when available', () => {
      const error = new ValidationError(
        ErrorCode.INVALID_INPUT,
        'Invalid input',
        {}
      );

      const formatted = ErrorResponseFormatter.formatError(error, {
        localization: { locale: 'es' }
      });

      expect(formatted.error.message).toBe('Entrada inválida');
    });

    it('should fallback to default locale when localization not available', () => {
      const error = new ValidationError(
        ErrorCode.SCHEMA_VALIDATION_FAILED,
        'Schema validation failed',
        {}
      );

      const formatted = ErrorResponseFormatter.formatError(error, {
        localization: { locale: 'es', fallback: 'en' }
      });

      // Should fallback to original message since no Spanish translation
      expect(formatted.error.message).toBe('Schema validation failed');
    });
  });

  describe('pagination helpers', () => {
    it('should create paginated response correctly', () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const pagination = { page: 2, limit: 10, total: 25 };

      const formatted = ErrorResponseFormatter.createPaginatedResponse(
        data,
        pagination
      );

      expect(formatted.success).toBe(true);
      expect(formatted.data).toEqual(data);
      expect(formatted.pagination).toEqual({
        ...pagination,
        hasMore: true // (2 * 10) < 25
      });
    });

    it('should indicate no more pages when at the end', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = { page: 3, limit: 10, total: 22 };

      const formatted = ErrorResponseFormatter.createPaginatedResponse(
        data,
        pagination
      );

      expect(formatted.pagination?.hasMore).toBe(false); // (3 * 10) >= 22
    });
  });

  describe('response with warnings', () => {
    it('should create response with warnings in metadata', () => {
      const data = { result: 'success' };
      const warnings = [
        'Feature will be deprecated in v2.0',
        'Consider using the new endpoint'
      ];

      const formatted = ErrorResponseFormatter.createResponseWithWarnings(
        data,
        warnings
      );

      expect(formatted.success).toBe(true);
      expect(formatted.data).toEqual(data);
      expect(formatted.meta?.warnings).toEqual(warnings);
    });
  });

  describe('documentation links', () => {
    beforeAll(() => {
      ErrorResponseFormatter.registerDocumentationLinks({
        [ErrorCode.INVALID_INPUT]: '/docs/validation-guide',
        [ErrorCode.RATE_LIMIT_EXCEEDED]: '/docs/rate-limits'
      });
    });

    it('should include documentation links for registered error codes', () => {
      const error = new ValidationError(
        ErrorCode.INVALID_INPUT,
        'Invalid input'
      );

      const formatted = ErrorResponseFormatter.formatError(error);

      expect(formatted.error.documentation).toBe('/docs/validation-guide');
    });

    it('should not include documentation link for unregistered codes', () => {
      const error = new TechnicalError(
        ErrorCode.DATABASE_CONNECTION_FAILED,
        'Database error'
      );

      const formatted = ErrorResponseFormatter.formatError(error);

      expect(formatted.error.documentation).toBeUndefined();
    });
  });
});