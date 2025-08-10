# LANKA API Error Handling Guide

## Overview

The LANKA API uses standardized HTTP status codes and structured error responses to communicate issues clearly to client applications. This guide covers error formats, common error scenarios, handling strategies, and best practices.

## Error Response Format

All errors follow a consistent JSON structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "specific_field",
      "value": "invalid_value",
      "constraint": "validation_rule"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-123e4567-e89b-12d3-a456-426614174000",
    "path": "/v2/requirements",
    "method": "POST"
  }
}
```

### Field Descriptions

- **code**: Machine-readable error code for programmatic handling
- **message**: Human-readable description of the error
- **details**: Additional context specific to the error type (optional)
- **timestamp**: ISO 8601 timestamp when the error occurred
- **requestId**: Unique identifier for this request (useful for support)
- **path**: API endpoint where the error occurred
- **method**: HTTP method used

---

## HTTP Status Codes

### 2xx Success
- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **204 No Content**: Successful operation with no response body

### 4xx Client Errors

#### 400 Bad Request
Request validation failed or malformed request.

**Common Scenarios:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "field": "description",
      "issue": "Description is required and cannot be empty",
      "received": ""
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-123e4567-e89b-12d3-a456-426614174000"
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR`: Input validation failed
- `INVALID_JSON`: Request body is not valid JSON
- `MISSING_FIELD`: Required field is missing
- `INVALID_FORMAT`: Field format is incorrect (e.g., invalid UUID)
- `VALUE_OUT_OF_RANGE`: Numeric value outside allowed range

#### 401 Unauthorized
Authentication required or authentication failed.

```json
{
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Authentication token required",
    "details": {
      "hint": "Include Authorization header with Bearer token"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-123e4567-e89b-12d3-a456-426614174000"
  }
}
```

**Error Codes:**
- `AUTHENTICATION_REQUIRED`: No authentication token provided
- `INVALID_TOKEN`: Token is malformed or invalid
- `EXPIRED_TOKEN`: Token has expired
- `REVOKED_TOKEN`: Token has been revoked

#### 403 Forbidden
Access denied due to insufficient permissions.

```json
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Insufficient permissions to access this resource",
    "details": {
      "required_permission": "requirements:write",
      "user_permissions": ["requirements:read", "architecture:read"],
      "resource_type": "requirement",
      "resource_id": "req-123e4567-e89b-12d3-a456-426614174000"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-123e4567-e89b-12d3-a456-426614174000"
  }
}
```

**Error Codes:**
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `RESOURCE_ACCESS_DENIED`: Cannot access specific resource
- `ORGANIZATION_ACCESS_DENIED`: Not member of required organization
- `PROJECT_ACCESS_DENIED`: No access to project

#### 404 Not Found
Requested resource does not exist.

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Requirement not found",
    "details": {
      "resource_type": "Requirement",
      "resource_id": "req-nonexistent-id"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-123e4567-e89b-12d3-a456-426614174000"
  }
}
```

**Error Codes:**
- `RESOURCE_NOT_FOUND`: Specific resource doesn't exist
- `ENDPOINT_NOT_FOUND`: API endpoint doesn't exist
- `PROJECT_NOT_FOUND`: Project doesn't exist
- `USER_NOT_FOUND`: User doesn't exist

#### 409 Conflict
Request conflicts with current resource state.

```json
{
  "error": {
    "code": "STATE_CONFLICT",
    "message": "Cannot update requirement in current status",
    "details": {
      "current_status": "IMPLEMENTED",
      "attempted_action": "update_description",
      "allowed_statuses": ["DRAFT", "REVIEW"]
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-123e4567-e89b-12d3-a456-426614174000"
  }
}
```

**Error Codes:**
- `STATE_CONFLICT`: Resource in wrong state for operation
- `CONCURRENT_MODIFICATION`: Resource modified by another user
- `DUPLICATE_RESOURCE`: Resource already exists
- `DEPENDENCY_CONFLICT`: Operation would break dependencies

#### 422 Unprocessable Entity
Request is well-formed but semantically incorrect.

```json
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Architecture decision cannot be deprecated while active mappings exist",
    "details": {
      "active_mappings": 3,
      "affected_requirements": [
        "req-123e4567-e89b-12d3-a456-426614174001",
        "req-123e4567-e89b-12d3-a456-426614174002"
      ]
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-123e4567-e89b-12d3-a456-426614174000"
  }
}
```

**Error Codes:**
- `BUSINESS_RULE_VIOLATION`: Violates business logic rules
- `CIRCULAR_DEPENDENCY`: Would create circular dependency
- `INVALID_RELATIONSHIP`: Invalid relationship between resources
- `CONSTRAINT_VIOLATION`: Database constraint violation

#### 429 Too Many Requests
Rate limit exceeded.

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "details": {
      "limit": 1000,
      "window": "1 hour",
      "reset_at": "2024-01-15T11:00:00Z",
      "remaining": 0
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-123e4567-e89b-12d3-a456-426614174000"
  }
}
```

**Response Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1642777200
Retry-After: 1800
```

**Error Codes:**
- `RATE_LIMIT_EXCEEDED`: Request rate limit exceeded
- `QUOTA_EXCEEDED`: Monthly/daily quota exceeded
- `CONCURRENT_LIMIT_EXCEEDED`: Too many concurrent requests

### 5xx Server Errors

#### 500 Internal Server Error
Unexpected server error.

```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred",
    "details": {
      "hint": "Please try again later or contact support if the issue persists"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-123e4567-e89b-12d3-a456-426614174000"
  }
}
```

#### 502 Bad Gateway
Upstream service error.

```json
{
  "error": {
    "code": "UPSTREAM_SERVICE_ERROR",
    "message": "External service temporarily unavailable",
    "details": {
      "service": "ai-recommendation-engine",
      "retry_after": 30
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-123e4567-e89b-12d3-a456-426614174000"
  }
}
```

#### 503 Service Unavailable
Service temporarily unavailable (maintenance, overload).

```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Service temporarily unavailable",
    "details": {
      "reason": "scheduled_maintenance",
      "estimated_recovery": "2024-01-15T12:00:00Z"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-123e4567-e89b-12d3-a456-426614174000"
  }
}
```

#### 504 Gateway Timeout
Request timeout.

```json
{
  "error": {
    "code": "REQUEST_TIMEOUT",
    "message": "Request processing timeout",
    "details": {
      "timeout": "30s",
      "hint": "Try reducing request complexity or splitting into multiple requests"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-123e4567-e89b-12d3-a456-426614174000"
  }
}
```

---

## GraphQL Error Format

GraphQL errors follow the GraphQL specification with additional extensions:

```json
{
  "errors": [
    {
      "message": "Requirement not found",
      "locations": [
        {
          "line": 3,
          "column": 5
        }
      ],
      "path": ["requirement"],
      "extensions": {
        "code": "RESOURCE_NOT_FOUND",
        "resourceType": "Requirement",
        "resourceId": "req-invalid-id",
        "timestamp": "2024-01-15T10:30:00Z",
        "requestId": "req-123e4567-e89b-12d3-a456-426614174000",
        "classification": "CLIENT_ERROR"
      }
    }
  ],
  "data": {
    "requirement": null
  }
}
```

### GraphQL Error Classifications

- **CLIENT_ERROR**: 4xx equivalent (validation, not found, etc.)
- **SERVER_ERROR**: 5xx equivalent (internal errors)
- **AUTHENTICATION_ERROR**: Authentication/authorization issues
- **RATE_LIMIT_ERROR**: Rate limiting

---

## Error Handling Best Practices

### 1. Client-Side Error Handling

```javascript
class APIErrorHandler {
  static async handleResponse(response) {
    if (response.ok) {
      return response.json();
    }

    const errorData = await response.json();
    const error = new APIError(errorData.error, response.status);
    
    // Log error details for debugging
    console.error('API Error:', {
      status: response.status,
      code: error.code,
      message: error.message,
      requestId: error.requestId,
      path: error.path
    });

    throw error;
  }

  static handleError(error) {
    if (error instanceof APIError) {
      switch (error.code) {
        case 'AUTHENTICATION_REQUIRED':
        case 'EXPIRED_TOKEN':
          return this.handleAuthError(error);
        
        case 'INSUFFICIENT_PERMISSIONS':
          return this.handlePermissionError(error);
        
        case 'VALIDATION_ERROR':
          return this.handleValidationError(error);
        
        case 'RATE_LIMIT_EXCEEDED':
          return this.handleRateLimitError(error);
        
        case 'RESOURCE_NOT_FOUND':
          return this.handleNotFoundError(error);
        
        default:
          return this.handleGenericError(error);
      }
    }

    return this.handleNetworkError(error);
  }

  static handleAuthError(error) {
    // Redirect to login or refresh token
    AuthService.redirectToLogin();
    return {
      type: 'AUTH_ERROR',
      message: 'Please log in again',
      action: 'REDIRECT_LOGIN'
    };
  }

  static handlePermissionError(error) {
    return {
      type: 'PERMISSION_ERROR',
      message: `You don't have permission to ${error.details.required_permission}`,
      suggestion: 'Contact your administrator to request access'
    };
  }

  static handleValidationError(error) {
    return {
      type: 'VALIDATION_ERROR',
      message: error.message,
      field: error.details.field,
      constraint: error.details.constraint,
      suggestion: this.getValidationSuggestion(error.details)
    };
  }

  static handleRateLimitError(error) {
    const resetTime = new Date(error.details.reset_at);
    return {
      type: 'RATE_LIMIT_ERROR',
      message: 'Too many requests. Please wait before trying again.',
      retryAfter: error.details.reset_at,
      suggestion: `Try again after ${resetTime.toLocaleTimeString()}`
    };
  }

  static getValidationSuggestion(details) {
    switch (details.field) {
      case 'description':
        return 'Please provide a detailed description (minimum 10 characters)';
      case 'email':
        return 'Please enter a valid email address';
      case 'priority':
        return 'Priority must be one of: CRITICAL, HIGH, MEDIUM, LOW';
      default:
        return 'Please check the field value and try again';
    }
  }
}

// Custom error class
class APIError extends Error {
  constructor(errorData, status) {
    super(errorData.message);
    this.name = 'APIError';
    this.code = errorData.code;
    this.status = status;
    this.details = errorData.details;
    this.requestId = errorData.requestId;
    this.path = errorData.path;
    this.timestamp = errorData.timestamp;
  }
}
```

### 2. Retry Logic with Exponential Backoff

```javascript
class RetryHandler {
  static async withRetry(apiCall, options = {}) {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 30000,
      retryCondition = this.shouldRetry
    } = options;

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries || !retryCondition(error)) {
          throw error;
        }

        const delay = Math.min(
          baseDelay * Math.pow(2, attempt),
          maxDelay
        );

        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * 1000;

        console.warn(`Attempt ${attempt + 1} failed, retrying in ${jitteredDelay}ms`, error);
        await new Promise(resolve => setTimeout(resolve, jitteredDelay));
      }
    }

    throw lastError;
  }

  static shouldRetry(error) {
    if (error instanceof APIError) {
      // Retry on server errors and rate limits
      return [500, 502, 503, 504, 429].includes(error.status);
    }

    // Retry on network errors
    return error.name === 'NetworkError' || error.code === 'NETWORK_ERROR';
  }

  static shouldRetryAuth(error) {
    if (error instanceof APIError) {
      // Only retry auth errors for token refresh
      return error.code === 'EXPIRED_TOKEN';
    }
    return false;
  }
}
```

### 3. Circuit Breaker Pattern

```javascript
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 30000;
    this.monitoringPeriod = options.monitoringPeriod || 60000;
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }

  async execute(apiCall) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.recoveryTimeout) {
        throw new Error('Circuit breaker is OPEN');
      }
      
      // Try to recover
      this.state = 'HALF_OPEN';
      this.successCount = 0;
    }

    try {
      const result = await apiCall();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 3) {
        this.state = 'CLOSED';
        this.failureCount = 0;
      }
    } else {
      this.failureCount = 0;
    }
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}
```

### 4. Error Logging and Monitoring

```javascript
class ErrorLogger {
  static async logError(error, context = {}) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message: error.message,
      stack: error.stack,
      code: error.code,
      status: error.status,
      requestId: error.requestId,
      userId: context.userId,
      sessionId: context.sessionId,
      userAgent: context.userAgent,
      path: error.path,
      method: context.method,
      details: error.details
    };

    // Send to logging service
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorLog)
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', errorLog);
    }
  }

  static createErrorContext(req, user) {
    return {
      userId: user?.id,
      sessionId: req.sessionId,
      userAgent: req.headers['user-agent'],
      method: req.method,
      ip: req.ip,
      referer: req.headers.referer
    };
  }
}
```

---

## Error Recovery Strategies

### 1. Automatic Recovery

```javascript
class AutoRecovery {
  static async recoverFromError(error, context) {
    switch (error.code) {
      case 'EXPIRED_TOKEN':
        return this.refreshToken(context);
      
      case 'STALE_DATA':
        return this.refetchData(context);
      
      case 'NETWORK_ERROR':
        return this.retryWithBackoff(context);
      
      case 'QUOTA_EXCEEDED':
        return this.handleQuotaExceeded(context);
      
      default:
        return null; // No automatic recovery available
    }
  }

  static async refreshToken(context) {
    try {
      const newToken = await AuthService.refreshToken();
      context.updateToken(newToken);
      return 'TOKEN_REFRESHED';
    } catch (refreshError) {
      AuthService.redirectToLogin();
      return 'LOGIN_REQUIRED';
    }
  }

  static async refetchData(context) {
    try {
      const freshData = await context.refetch();
      context.updateData(freshData);
      return 'DATA_REFRESHED';
    } catch (refetchError) {
      return null;
    }
  }

  static async handleQuotaExceeded(context) {
    // Implement quota management strategy
    const nextReset = await QuotaService.getNextReset();
    context.scheduleRetry(nextReset);
    return 'RETRY_SCHEDULED';
  }
}
```

### 2. Graceful Degradation

```javascript
class GracefulDegradation {
  static async handleServiceError(error, fallbackOptions) {
    if (error.code === 'AI_SERVICE_UNAVAILABLE') {
      return this.useBasicRecommendations(fallbackOptions);
    }

    if (error.code === 'SEARCH_SERVICE_DOWN') {
      return this.useBasicSearch(fallbackOptions);
    }

    if (error.code === 'ANALYTICS_UNAVAILABLE') {
      return this.skipAnalytics(fallbackOptions);
    }

    return null;
  }

  static async useBasicRecommendations(options) {
    return {
      recommendations: [],
      message: 'AI recommendations temporarily unavailable. Using basic suggestions.',
      degraded: true
    };
  }

  static async useBasicSearch(options) {
    // Implement client-side search
    const basicResults = await ClientSearch.search(options.query, options.data);
    return {
      results: basicResults,
      message: 'Using simplified search. Some features may be limited.',
      degraded: true
    };
  }
}
```

---

## Testing Error Scenarios

### 1. Error Response Testing

```javascript
// Jest test examples
describe('API Error Handling', () => {
  test('handles validation errors correctly', async () => {
    const invalidRequirement = {
      description: '', // Invalid empty description
      projectId: 'invalid-uuid'
    };

    try {
      await api.createRequirement(invalidRequirement);
      fail('Expected validation error');
    } catch (error) {
      expect(error).toBeInstanceOf(APIError);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.status).toBe(400);
      expect(error.details.field).toBe('description');
    }
  });

  test('handles authentication errors correctly', async () => {
    const apiWithInvalidToken = new APIClient('invalid-token');

    try {
      await apiWithInvalidToken.getRequirements();
      fail('Expected authentication error');
    } catch (error) {
      expect(error.code).toBe('INVALID_TOKEN');
      expect(error.status).toBe(401);
    }
  });

  test('handles rate limiting correctly', async () => {
    // Mock rate limit response
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Map([
        ['X-RateLimit-Limit', '1000'],
        ['X-RateLimit-Remaining', '0'],
        ['X-RateLimit-Reset', '1642777200']
      ]),
      json: () => Promise.resolve({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests'
        }
      })
    });

    try {
      await api.getRequirements();
      fail('Expected rate limit error');
    } catch (error) {
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.status).toBe(429);
    }
  });
});
```

### 2. Error Simulation for Development

```javascript
class ErrorSimulator {
  static simulateError(type, probability = 0.1) {
    if (Math.random() < probability) {
      switch (type) {
        case 'network':
          throw new Error('Network connection failed');
        
        case 'timeout':
          return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 1000);
          });
        
        case 'server':
          throw new APIError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Simulated server error'
          }, 500);
        
        case 'rate_limit':
          throw new APIError({
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Simulated rate limit'
          }, 429);
      }
    }
  }
}

// Use in development
if (process.env.NODE_ENV === 'development') {
  // Simulate network errors 5% of the time
  api.interceptors.request.use(config => {
    ErrorSimulator.simulateError('network', 0.05);
    return config;
  });
}
```

This comprehensive error handling guide provides developers with all the tools needed to build robust, resilient applications that gracefully handle and recover from API errors.