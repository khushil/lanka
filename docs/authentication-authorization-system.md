# Authentication & Authorization System

## Overview

The Lanka platform implements a comprehensive JWT-based authentication and role-based authorization system to secure all GraphQL endpoints and WebSocket connections. This system ensures that only authenticated and authorized users can access platform resources.

## Architecture

### Core Components

1. **AuthMiddleware** - JWT token generation, validation, and management
2. **AuthorizationGuard** - Permission and role-based access control
3. **Permission Matrix** - Defines access patterns for resources and operations
4. **Role System** - Hierarchical role-based permissions

### Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant AuthMiddleware
    participant Database
    participant GraphQL

    Client->>API: POST /auth/login (credentials)
    API->>Database: Verify credentials
    Database-->>API: User data
    API->>AuthMiddleware: Generate tokens
    AuthMiddleware-->>API: JWT + Refresh tokens
    API-->>Client: Authentication response

    Client->>GraphQL: GraphQL request + JWT
    GraphQL->>AuthMiddleware: Validate token
    AuthMiddleware-->>GraphQL: User context
    GraphQL->>AuthorizationGuard: Check permissions
    AuthorizationGuard-->>GraphQL: Authorization result
    GraphQL-->>Client: GraphQL response
```

## Authentication

### JWT Token Structure

```json
{
  "sub": "user-id",
  "username": "username",
  "email": "user@example.com",
  "roles": ["user", "developer"],
  "permissions": ["read", "write", "development:deploy"],
  "iat": 1234567890,
  "exp": 1234567890,
  "iss": "lanka-platform",
  "aud": "lanka-api"
}
```

### Token Types

- **Access Token**: Short-lived (24h) JWT for API access
- **Refresh Token**: Long-lived (7d) token for renewing access tokens

### Authentication Endpoints

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "1",
    "username": "admin",
    "email": "admin@lanka.dev",
    "roles": ["admin"]
  },
  "tokens": {
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Token Refresh
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Authorization

### Role System

The platform uses a hierarchical role system with the following roles:

#### Guest
- **Permissions**: Read-only access
- **Use Case**: Anonymous or limited access users

#### User
- **Permissions**: Read, Write, Requirements (read/write), Memory (read/write)
- **Use Case**: General platform users

#### Developer
- **Permissions**: All User permissions + Development operations + Deployment
- **Use Case**: Software developers working on projects

#### Architect
- **Permissions**: All User permissions + Architecture (read/write/approve) + Requirements (approve)
- **Use Case**: System architects and technical leads

#### Manager
- **Permissions**: All User permissions + Approvals + System monitoring + User management (read)
- **Use Case**: Project managers and team leads

#### Admin
- **Permissions**: All permissions (admin role overrides all checks)
- **Use Case**: System administrators

### Permission System

#### Core Permissions
- `read` - Basic read access
- `write` - Basic write access
- `delete` - Delete resources
- `admin` - Administrative access (overrides all)

#### Module-Specific Permissions
- `requirements:read`, `requirements:write`, `requirements:delete`, `requirements:approve`, `requirements:admin`
- `architecture:read`, `architecture:write`, `architecture:delete`, `architecture:approve`, `architecture:admin`
- `development:read`, `development:write`, `development:delete`, `development:deploy`, `development:admin`
- `memory:read`, `memory:write`, `memory:delete`, `memory:admin`
- `system:config`, `system:monitor`, `system:admin`
- `user:read`, `user:write`, `user:delete`, `user:admin`

### GraphQL Authorization

All GraphQL resolvers are protected with authorization guards:

```typescript
// Query with read permission requirement
requirements: withAuthorization(
  async (_, args, context) => {
    return context.services.requirements.getRequirements(args);
  },
  { permissions: [PERMISSIONS.REQUIREMENTS_READ] }
),

// Mutation with write permission requirement
createRequirement: withAuthorization(
  async (_, { input }, context) => {
    return context.services.requirements.createRequirement(input);
  },
  { permissions: [PERMISSIONS.REQUIREMENTS_WRITE] }
),

// Admin-only operation
approveRequirement: withAuthorization(
  async (_, { id }, context) => {
    return context.services.requirements.approveRequirement(id);
  },
  { permissions: [PERMISSIONS.REQUIREMENTS_APPROVE] }
),
```

### WebSocket Authorization

WebSocket connections require authentication tokens:

```javascript
// Connection with token in headers
const ws = new WebSocket('ws://localhost:3000/graphql', {
  headers: {
    authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }
});

// Connection with token in connection params
const ws = new WebSocket('ws://localhost:3000/graphql', [], {
  connectionParams: {
    authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }
});

// Connection with token in URL
const ws = new WebSocket('ws://localhost:3000/graphql?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
```

## Usage Examples

### Client-Side Authentication

```javascript
// Login
const loginResponse = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' })
});

const { tokens, user } = await loginResponse.json();

// Store tokens
localStorage.setItem('accessToken', tokens.access);
localStorage.setItem('refreshToken', tokens.refresh);

// GraphQL request with authentication
const graphqlResponse = await fetch('/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokens.access}`
  },
  body: JSON.stringify({
    query: `
      query GetRequirements {
        requirements {
          id
          title
          status
        }
      }
    `
  })
});
```

### Refresh Token Handling

```javascript
async function refreshToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  
  const response = await fetch('/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  if (response.ok) {
    const { tokens } = await response.json();
    localStorage.setItem('accessToken', tokens.access);
    localStorage.setItem('refreshToken', tokens.refresh);
    return tokens.access;
  } else {
    // Refresh failed, redirect to login
    window.location.href = '/login';
    return null;
  }
}

// Automatic token refresh on 401 errors
async function graphqlRequest(query, variables) {
  let token = localStorage.getItem('accessToken');
  
  let response = await fetch('/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ query, variables })
  });

  if (response.status === 401) {
    token = await refreshToken();
    if (token) {
      response = await fetch('/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query, variables })
      });
    }
  }

  return response.json();
}
```

### Server-Side Authorization Decorators

```typescript
import { RequireAuth, RequirePermissions, RequireRoles, RequireAdmin } from '../core/auth/guards/authorization.guard';

class MyResolver {
  // Require authentication
  @RequireAuth()
  async getProfile(_: any, args: any, context: any) {
    return context.auth.user;
  }

  // Require specific permissions
  @RequirePermissions([PERMISSIONS.REQUIREMENTS_WRITE])
  async createRequirement(_: any, args: any, context: any) {
    // Implementation
  }

  // Require specific roles
  @RequireRoles([ROLES.MANAGER.name, ROLES.ADMIN.name])
  async approveRequirement(_: any, args: any, context: any) {
    // Implementation
  }

  // Require admin privileges
  @RequireAdmin()
  async deleteUser(_: any, args: any, context: any) {
    // Implementation
  }
}
```

## Security Features

### Token Security
- **JWT Signing**: Tokens are signed with a secret key
- **Token Expiration**: Access tokens expire after 24 hours
- **Token Blacklisting**: Revoked tokens are blacklisted
- **Secure Headers**: Security headers are applied to all responses

### Rate Limiting
- **Request Limits**: 100 requests per minute per IP
- **Failed Login Protection**: Progressive delays for failed attempts
- **Token Generation Limits**: Prevent token farming

### Security Headers
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
```

### Input Validation
- **Request Size Limits**: 10MB maximum request size
- **SQL Injection Protection**: Input sanitization
- **XSS Protection**: Content security policies
- **Path Traversal Protection**: Path validation

## Configuration

### Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRY=24h
JWT_ISSUER=lanka-platform
JWT_AUDIENCE=lanka-api
REFRESH_TOKEN_EXPIRY=7d

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Server Configuration
PORT=3000
NODE_ENV=production
```

### Custom Configuration

```typescript
// Custom auth middleware configuration
const authMiddleware = new AuthMiddleware({
  jwtSecret: 'custom-secret',
  jwtExpiry: '12h',
  refreshTokenExpiry: '30d',
  issuer: 'custom-issuer',
  audience: 'custom-audience',
});
```

## Error Handling

### Authentication Errors

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| TOKEN_EXPIRED | 401 | JWT token has expired |
| INVALID_TOKEN | 401 | JWT token is malformed or invalid |
| TOKEN_REVOKED | 401 | Token has been blacklisted |
| AUTHENTICATION_REQUIRED | 401 | No authentication provided |

### Authorization Errors

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| INSUFFICIENT_PERMISSIONS | 403 | User lacks required permissions |
| ROLE_REQUIRED | 403 | User lacks required role |
| RESOURCE_ACCESS_DENIED | 403 | Access denied to specific resource |

### Example Error Responses

```json
// Authentication Error
{
  "errors": [
    {
      "message": "Authentication required",
      "extensions": {
        "code": "UNAUTHENTICATED"
      }
    }
  ]
}

// Authorization Error
{
  "errors": [
    {
      "message": "Insufficient permissions",
      "extensions": {
        "code": "FORBIDDEN",
        "requiredPermissions": ["requirements:write"],
        "userPermissions": ["requirements:read"]
      }
    }
  ]
}
```

## Testing

### Unit Tests

```bash
# Run authentication unit tests
npm test tests/unit/auth.unit.test.ts

# Run authorization unit tests
npm test tests/unit/auth.unit.test.ts
```

### Integration Tests

```bash
# Run authentication integration tests
npm test tests/integration/auth.integration.test.ts

# Test specific authentication flows
npm test -- --grep "Authentication Endpoints"
```

### Test Coverage

The authentication system maintains >95% test coverage including:
- Token generation and validation
- Permission checking and authorization
- Role-based access control
- Error handling and edge cases
- Security measures and rate limiting

## Performance Considerations

### Token Validation
- **Caching**: User context is cached for the duration of the request
- **Async Validation**: Token validation is performed asynchronously
- **Minimal Database Queries**: User data is embedded in JWT payload

### Authorization Checks
- **Early Termination**: Authorization checks fail fast
- **Permission Caching**: Effective permissions are computed once per request
- **Role Hierarchy**: Optimized role permission lookup

### Memory Management
- **Token Cleanup**: Expired tokens are periodically cleaned up
- **Blacklist Management**: Token blacklist is size-limited
- **Rate Limit Cleanup**: Rate limit entries are garbage collected

## Monitoring and Logging

### Authentication Logs
```
INFO: User logged in successfully (userId: 123, username: admin)
WARN: Failed login attempt (username: admin, ip: 192.168.1.1)
ERROR: Token verification failed (error: TokenExpiredError)
```

### Authorization Logs
```
WARN: Unauthorized access attempt (userId: 123, requiredPermissions: [admin], userPermissions: [read])
INFO: GraphQL operation started (operation: GetRequirements, userId: 123)
```

### Security Monitoring
- **Failed Login Tracking**: Monitor for brute force attempts
- **Permission Violations**: Track unauthorized access attempts
- **Token Usage**: Monitor token generation and validation patterns
- **Rate Limiting**: Track rate limit violations

## Migration Guide

### From No Authentication
1. Install authentication middleware
2. Add JWT secret to environment variables
3. Update GraphQL context to include authentication
4. Apply authorization guards to resolvers
5. Update client applications to handle authentication

### From Basic Auth
1. Replace basic auth middleware with JWT middleware
2. Update login endpoints to return JWT tokens
3. Migrate user sessions to JWT tokens
4. Update client applications to use Bearer tokens

## Best Practices

### Security
- **Use Strong Secrets**: Use cryptographically strong JWT secrets
- **Regular Secret Rotation**: Rotate JWT secrets periodically
- **HTTPS Only**: Always use HTTPS in production
- **Token Storage**: Store tokens securely on client side
- **Permission Principle**: Grant minimum required permissions

### Development
- **Test Coverage**: Maintain high test coverage for auth code
- **Error Handling**: Provide clear error messages without leaking sensitive information
- **Logging**: Log all authentication and authorization events
- **Documentation**: Keep permission matrix and role definitions up to date

### Production
- **Environment Variables**: Use environment variables for all secrets
- **Rate Limiting**: Implement proper rate limiting
- **Monitoring**: Monitor for security events and anomalies
- **Backup**: Backup authentication configuration
- **Updates**: Keep dependencies updated for security patches

## Troubleshooting

### Common Issues

#### Token Validation Failures
- **Check JWT Secret**: Ensure JWT_SECRET environment variable is set
- **Verify Token Format**: Ensure token is properly formatted Bearer token
- **Check Token Expiration**: Verify token hasn't expired

#### Permission Denied Errors
- **Verify User Roles**: Check user has required roles
- **Check Permission Matrix**: Ensure permissions are correctly defined
- **Review Authorization Logic**: Verify authorization guards are applied correctly

#### WebSocket Connection Issues
- **Token in Headers**: Ensure token is passed in connection headers or params
- **CORS Settings**: Verify CORS settings allow WebSocket connections
- **Token Format**: Check token format matches expected format

### Debug Mode

Enable debug logging for authentication:

```bash
DEBUG=lanka:auth npm start
```

This will output detailed authentication and authorization logs to help troubleshoot issues.