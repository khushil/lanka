/**
 * Error Wrapper Unit Tests
 * Tests for the centralized error handling wrapper functionality
 */

import {
  ErrorWrapper,
  LankaError,
  ErrorCode,
  ErrorCategory,
  ErrorSeverity,
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
} from '../../../../src/core/errors';

describe('ErrorWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('wrap()', () => {
    it('should wrap a standard Error into LankaError', () => {
      const originalError = new Error('Test error');
      const wrappedError = ErrorWrapper.wrap(originalError);

      expect(wrappedError).toBeInstanceOf(LankaError);
      expect(wrappedError.message).toBe('Test error');
      expect(wrappedError.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
      expect(wrappedError.category).toBe(ErrorCategory.SYSTEM);
    });

    it('should return LankaError as-is when already wrapped', () => {
      const originalError = new TechnicalError(
        ErrorCode.DATABASE_CONNECTION_FAILED,
        'Database connection failed'
      );
      const wrappedError = ErrorWrapper.wrap(originalError);

      expect(wrappedError).toBe(originalError);
      expect(wrappedError.code).toBe(ErrorCode.DATABASE_CONNECTION_FAILED);
    });

    it('should wrap string errors into SystemError', () => {
      const wrappedError = ErrorWrapper.wrap('String error message');

      expect(wrappedError).toBeInstanceOf(SystemError);
      expect(wrappedError.message).toBe('String error message');
      expect(wrappedError.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
    });

    it('should handle unknown error types', () => {
      const unknownError = { weird: 'object' };
      const wrappedError = ErrorWrapper.wrap(unknownError);

      expect(wrappedError).toBeInstanceOf(SystemError);
      expect(wrappedError.message).toBe('An unknown error occurred');
      expect(wrappedError.context?.metadata?.originalError).toBe(unknownError);
    });

    it('should add context information', () => {
      const error = new Error('Test error');
      const wrappedError = ErrorWrapper.wrap(error, {
        operation: 'test_operation',
        userId: 'user123',
        metadata: { key: 'value' }
      });

      expect(wrappedError.context?.operation).toBe('test_operation');
      expect(wrappedError.context?.userId).toBe('user123');
      expect(wrappedError.context?.metadata?.key).toBe('value');
    });
  });

  describe('specific error creators', () => {
    describe('business()', () => {
      it('should create BusinessError with correct properties', () => {
        const error = ErrorWrapper.business(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          'Business rule violated',
          {
            userMessage: 'This action violates business rules',
            suggestions: ['Review requirements', 'Contact admin']
          }
        );

        expect(error).toBeInstanceOf(BusinessError);
        expect(error.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);
        expect(error.category).toBe(ErrorCategory.BUSINESS);
        expect(error.severity).toBe(ErrorSeverity.MEDIUM);
        expect(error.userMessage).toBe('This action violates business rules');
        expect(error.suggestions).toEqual(['Review requirements', 'Contact admin']);
      });
    });

    describe('technical()', () => {
      it('should create TechnicalError with correct properties', () => {
        const error = ErrorWrapper.technical(
          ErrorCode.DATABASE_CONNECTION_FAILED,
          'Database connection failed',
          {
            retryable: true,
            severity: ErrorSeverity.HIGH
          }
        );

        expect(error).toBeInstanceOf(TechnicalError);
        expect(error.code).toBe(ErrorCode.DATABASE_CONNECTION_FAILED);
        expect(error.category).toBe(ErrorCategory.TECHNICAL);
        expect(error.severity).toBe(ErrorSeverity.HIGH);
        expect(error.retryable).toBe(true);
      });
    });

    describe('validation()', () => {
      it('should create ValidationError with field errors', () => {
        const fieldErrors = {
          email: ['Invalid email format'],
          password: ['Password too weak', 'Must contain special characters']
        };

        const error = ErrorWrapper.validation(
          ErrorCode.INVALID_INPUT,
          'Validation failed',
          { fieldErrors }
        );

        expect(error).toBeInstanceOf(ValidationError);
        expect(error.code).toBe(ErrorCode.INVALID_INPUT);
        expect(error.category).toBe(ErrorCategory.VALIDATION);
        expect(error.fieldErrors).toEqual(fieldErrors);
      });
    });

    describe('authentication()', () => {
      it('should create AuthenticationError with correct properties', () => {
        const error = ErrorWrapper.authentication(
          ErrorCode.INVALID_CREDENTIALS,
          'Invalid credentials',
          { userMessage: 'Please check your username and password' }
        );

        expect(error).toBeInstanceOf(AuthenticationError);
        expect(error.code).toBe(ErrorCode.INVALID_CREDENTIALS);
        expect(error.category).toBe(ErrorCategory.AUTHENTICATION);
        expect(error.httpStatusCode).toBe(401);
      });
    });

    describe('notFound()', () => {
      it('should create NotFoundError with resource information', () => {
        const error = ErrorWrapper.notFound(
          ErrorCode.USER_NOT_FOUND,
          'User',
          { identifier: 'user123' }
        );

        expect(error).toBeInstanceOf(NotFoundError);
        expect(error.code).toBe(ErrorCode.USER_NOT_FOUND);
        expect(error.category).toBe(ErrorCategory.NOT_FOUND);
        expect(error.message).toBe("User with identifier 'user123' not found");
      });
    });

    describe('rateLimit()', () => {
      it('should create RateLimitError with retry information', () => {
        const error = ErrorWrapper.rateLimit(
          ErrorCode.RATE_LIMIT_EXCEEDED,
          'Rate limit exceeded',
          { retryAfter: 60 }
        );

        expect(error).toBeInstanceOf(RateLimitError);
        expect(error.retryAfter).toBe(60);
        expect(error.retryable).toBe(true);
        expect(error.httpStatusCode).toBe(429);
      });
    });

    describe('externalService()', () => {
      it('should create ExternalServiceError with service information', () => {
        const error = ErrorWrapper.externalService(
          ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          'PaymentService',
          'Service timeout',
          { retryable: true }
        );

        expect(error).toBeInstanceOf(ExternalServiceError);
        expect(error.serviceName).toBe('PaymentService');
        expect(error.message).toBe("External service 'PaymentService' error: Service timeout");
        expect(error.retryable).toBe(true);
      });
    });
  });

  describe('retry()', () => {
    it('should retry operation on retryable errors', async () => {
      let attempts = 0;
      const operation = jest.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new TechnicalError(
            ErrorCode.DATABASE_CONNECTION_FAILED,
            'Connection failed',
            undefined,
            true // retryable
          );
        }
        return 'success';
      });

      const result = await ErrorWrapper.retry(operation, {
        maxAttempts: 3,
        delay: 10,
        backoffMultiplier: 1
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = jest.fn(async () => {
        throw new ValidationError(ErrorCode.INVALID_INPUT, 'Invalid input');
      });

      await expect(
        ErrorWrapper.retry(operation, { maxAttempts: 3 })
      ).rejects.toThrow('Invalid input');

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should throw after max attempts exceeded', async () => {
      const operation = jest.fn(async () => {
        throw new TechnicalError(
          ErrorCode.DATABASE_CONNECTION_FAILED,
          'Always fails',
          undefined,
          true
        );
      });

      await expect(
        ErrorWrapper.retry(operation, { maxAttempts: 2, delay: 1 })
      ).rejects.toThrow('Always fails');

      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('timeout()', () => {
    it('should timeout long-running operations', async () => {
      const operation = () => new Promise(resolve => 
        setTimeout(() => resolve('success'), 100)
      );

      await expect(
        ErrorWrapper.timeout(operation, 50)
      ).rejects.toThrow('Operation timed out after 50ms');
    });

    it('should return result for fast operations', async () => {
      const operation = async () => 'fast result';

      const result = await ErrorWrapper.timeout(operation, 100);
      expect(result).toBe('fast result');
    });
  });

  describe('createCircuitBreaker()', () => {
    it('should open circuit after failure threshold', async () => {
      const operation = jest.fn(async () => {
        throw new Error('Service unavailable');
      });

      const circuitBreaker = ErrorWrapper.createCircuitBreaker(operation, {
        failureThreshold: 2,
        recoveryTimeout: 100,
        monitorWindow: 1000
      });

      // First failure
      await expect(circuitBreaker()).rejects.toThrow('Service unavailable');
      
      // Second failure - circuit should open
      await expect(circuitBreaker()).rejects.toThrow('Service unavailable');
      
      // Third call - circuit is open
      await expect(circuitBreaker()).rejects.toThrow('Circuit breaker is open');
      
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should allow operation when circuit is closed', async () => {
      const operation = jest.fn(async () => 'success');

      const circuitBreaker = ErrorWrapper.createCircuitBreaker(operation);
      
      const result = await circuitBreaker();
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('chain()', () => {
    it('should chain multiple related errors', () => {
      const primaryError = new BusinessError(
        ErrorCode.BUSINESS_RULE_VIOLATION,
        'Primary error'
      );

      const relatedError1 = new ValidationError(
        ErrorCode.INVALID_INPUT,
        'Validation error'
      );

      const relatedError2 = new TechnicalError(
        ErrorCode.DATABASE_QUERY_FAILED,
        'Database error'
      );

      const chainedError = ErrorWrapper.chain(
        primaryError,
        relatedError1,
        relatedError2
      );

      expect(chainedError.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);
      expect(chainedError.relatedErrors).toHaveLength(2);
      expect(chainedError.relatedErrors[0].code).toBe(ErrorCode.INVALID_INPUT);
      expect(chainedError.relatedErrors[1].code).toBe(ErrorCode.DATABASE_QUERY_FAILED);
    });
  });

  describe('error serialization', () => {
    it('should serialize error to JSON correctly', () => {
      const error = new BusinessError(
        ErrorCode.BUSINESS_RULE_VIOLATION,
        'Business rule violated',
        'User-friendly message',
        { userId: 'user123' },
        ['Suggestion 1', 'Suggestion 2']
      );

      const json = error.toJSON();

      expect(json).toEqual({
        code: ErrorCode.BUSINESS_RULE_VIOLATION,
        category: ErrorCategory.BUSINESS,
        severity: ErrorSeverity.MEDIUM,
        message: 'Business rule violated',
        userMessage: 'User-friendly message',
        context: { userId: 'user123' },
        retryable: false,
        httpStatusCode: 422,
        suggestions: ['Suggestion 1', 'Suggestion 2'],
        relatedErrors: []
      });
    });

    it('should convert error to string correctly', () => {
      const error = new TechnicalError(
        ErrorCode.DATABASE_CONNECTION_FAILED,
        'Database connection failed'
      );

      const stringRepresentation = error.toString();
      expect(stringRepresentation).toBe('[TEC_2000] TECHNICAL: Database connection failed');
    });
  });

  describe('HTTP status code mapping', () => {
    it('should map error categories to correct HTTP status codes', () => {
      const testCases = [
        { error: new ValidationError(ErrorCode.INVALID_INPUT, 'test'), expectedCode: 400 },
        { error: new AuthenticationError(ErrorCode.AUTHENTICATION_FAILED, 'test'), expectedCode: 401 },
        { error: new AuthorizationError(ErrorCode.ACCESS_DENIED, 'test'), expectedCode: 403 },
        { error: new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, 'test'), expectedCode: 404 },
        { error: new ConflictError(ErrorCode.RESOURCE_CONFLICT, 'test'), expectedCode: 409 },
        { error: new RateLimitError(ErrorCode.RATE_LIMIT_EXCEEDED, 'test'), expectedCode: 429 },
        { error: new BusinessError(ErrorCode.BUSINESS_RULE_VIOLATION, 'test'), expectedCode: 422 },
        { error: new ExternalServiceError(ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE, 'service', 'test'), expectedCode: 503 },
        { error: new TechnicalError(ErrorCode.DATABASE_CONNECTION_FAILED, 'test'), expectedCode: 500 },
        { error: new SystemError(ErrorCode.INTERNAL_SERVER_ERROR, 'test'), expectedCode: 500 }
      ];

      testCases.forEach(({ error, expectedCode }) => {
        expect(error.httpStatusCode).toBe(expectedCode);
      });
    });
  });

  describe('error context handling', () => {
    it('should preserve and enhance error context', () => {
      const originalError = new TechnicalError(
        ErrorCode.DATABASE_CONNECTION_FAILED,
        'Original error',
        { userId: 'user123', operation: 'original' }
      );

      const enhancedError = ErrorWrapper.wrap(originalError, {
        operation: 'enhanced_operation',
        requestId: 'req123',
        metadata: { additional: 'data' }
      });

      expect(enhancedError.context?.userId).toBe('user123');
      expect(enhancedError.context?.operation).toBe('enhanced_operation');
      expect(enhancedError.context?.requestId).toBe('req123');
      expect(enhancedError.context?.metadata?.additional).toBe('data');
    });
  });
});

describe('Error Type Guards', () => {
  it('should correctly identify LankaError types', () => {
    const errors = [
      new BusinessError(ErrorCode.BUSINESS_RULE_VIOLATION, 'test'),
      new TechnicalError(ErrorCode.DATABASE_CONNECTION_FAILED, 'test'),
      new ValidationError(ErrorCode.INVALID_INPUT, 'test'),
      new AuthenticationError(ErrorCode.AUTHENTICATION_FAILED, 'test'),
      new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, 'test')
    ];

    errors.forEach(error => {
      expect(error instanceof LankaError).toBe(true);
      expect(error.code).toBeDefined();
      expect(error.category).toBeDefined();
      expect(error.severity).toBeDefined();
    });
  });
});