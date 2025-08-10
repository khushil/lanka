# LANKA API Authentication & Authorization Guide

## Overview

The LANKA API uses JWT (JSON Web Token) based authentication with role-based access control (RBAC) to secure all endpoints. This guide covers authentication flows, token management, permissions, and security best practices.

## Table of Contents

- [Authentication Methods](#authentication-methods)
- [Token Management](#token-management)
- [Authorization & Permissions](#authorization--permissions)
- [Security Best Practices](#security-best-practices)
- [Code Examples](#code-examples)
- [Troubleshooting](#troubleshooting)

---

## Authentication Methods

### 1. Email/Password Authentication

Primary authentication method for user accounts:

```http
POST /v2/auth/login
Content-Type: application/json

{
  "email": "developer@company.com",
  "password": "your-secure-password",
  "rememberMe": true
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "rt_1234567890abcdef...",
  "expiresIn": 3600,
  "tokenType": "Bearer",
  "user": {
    "id": "user-123e4567-e89b-12d3-a456-426614174000",
    "email": "developer@company.com",
    "name": "John Developer",
    "organization": "ACME Corp",
    "roles": ["developer", "architect"],
    "permissions": [
      "requirements:read",
      "requirements:write",
      "architecture:read",
      "architecture:write",
      "integration:read"
    ]
  },
  "organization": {
    "id": "org-123e4567-e89b-12d3-a456-426614174000",
    "name": "ACME Corp",
    "plan": "professional",
    "limits": {
      "requestsPerHour": 5000,
      "requirementsPerProject": 10000,
      "architectureDecisionsPerProject": 1000
    }
  }
}
```

### 2. API Key Authentication

For service-to-service integration and automation:

```http
POST /v2/auth/api-keys
Authorization: Bearer <user-jwt-token>
Content-Type: application/json

{
  "name": "CI/CD Integration",
  "description": "API key for automated requirement synchronization",
  "permissions": [
    "requirements:read",
    "requirements:write",
    "integration:read"
  ],
  "expiresIn": "90d",
  "ipWhitelist": ["192.168.1.0/24", "10.0.0.100"]
}
```

**Response:**
```json
{
  "apiKey": {
    "id": "key-123e4567-e89b-12d3-a456-426614174000",
    "name": "CI/CD Integration",
    "key": "lka_live_1234567890abcdef...",
    "permissions": [
      "requirements:read",
      "requirements:write",
      "integration:read"
    ],
    "createdAt": "2024-01-15T10:30:00Z",
    "expiresAt": "2024-04-15T10:30:00Z",
    "lastUsedAt": null,
    "ipWhitelist": ["192.168.1.0/24", "10.0.0.100"]
  }
}
```

**Using API Key:**
```http
GET /v2/requirements
Authorization: Bearer lka_live_1234567890abcdef...
```

### 3. OAuth 2.0 Integration

For third-party application integration:

```http
GET /v2/auth/oauth/authorize?
  client_id=your-client-id&
  redirect_uri=https://yourapp.com/callback&
  response_type=code&
  scope=requirements:read architecture:read&
  state=random-state-string
```

**Token Exchange:**
```http
POST /v2/auth/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
client_id=your-client-id&
client_secret=your-client-secret&
code=authorization-code&
redirect_uri=https://yourapp.com/callback
```

---

## Token Management

### Token Structure

LANKA JWT tokens contain the following claims:

```json
{
  "iss": "https://api.lanka.ai",
  "sub": "user-123e4567-e89b-12d3-a456-426614174000",
  "aud": "lanka-api",
  "exp": 1642777200,
  "iat": 1642690800,
  "nbf": 1642690800,
  "jti": "jwt-123e4567-e89b-12d3-a456-426614174000",
  "user": {
    "id": "user-123e4567-e89b-12d3-a456-426614174000",
    "email": "developer@company.com",
    "name": "John Developer",
    "organization_id": "org-123e4567-e89b-12d3-a456-426614174000",
    "roles": ["developer", "architect"],
    "permissions": [
      "requirements:read",
      "requirements:write",
      "architecture:read"
    ]
  },
  "org": {
    "id": "org-123e4567-e89b-12d3-a456-426614174000",
    "name": "ACME Corp",
    "plan": "professional"
  }
}
```

### Token Refresh

Refresh tokens have a longer lifetime (30 days by default) and are used to obtain new access tokens:

```http
POST /v2/auth/refresh
Content-Type: application/json

{
  "refreshToken": "rt_1234567890abcdef..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}
```

### Automatic Token Refresh Implementation

```javascript
class TokenManager {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null;
    this.refreshPromise = null;
  }

  setTokens({ accessToken, refreshToken, expiresIn }) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiresAt = Date.now() + (expiresIn * 1000);
  }

  async getValidToken() {
    // Return current token if still valid (with 1 minute buffer)
    if (this.accessToken && Date.now() < this.expiresAt - 60000) {
      return this.accessToken;
    }

    // Refresh token if needed
    if (this.refreshToken && !this.refreshPromise) {
      this.refreshPromise = this.refreshAccessToken();
    }

    if (this.refreshPromise) {
      await this.refreshPromise;
      this.refreshPromise = null;
    }

    return this.accessToken;
  }

  async refreshAccessToken() {
    try {
      const response = await fetch('https://api.lanka.ai/v2/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const tokens = await response.json();
      this.setTokens(tokens);
    } catch (error) {
      // Clear tokens and require re-authentication
      this.accessToken = null;
      this.refreshToken = null;
      this.expiresAt = null;
      throw new AuthenticationError('Token refresh failed');
    }
  }

  isAuthenticated() {
    return this.accessToken && Date.now() < this.expiresAt;
  }

  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null;
  }
}
```

---

## Authorization & Permissions

### Permission System

LANKA uses a hierarchical permission system with the following format:
`resource:action` or `resource:action:scope`

#### Core Resources

- **requirements**: Requirement management
- **architecture**: Architecture decisions, patterns, and stacks
- **integration**: Cross-module mappings and recommendations
- **projects**: Project management
- **analytics**: Metrics and reporting
- **admin**: Administrative functions

#### Actions

- **read**: View and query resources
- **write**: Create and update resources
- **delete**: Remove resources
- **manage**: Full control (includes read, write, delete)

#### Permission Examples

```
requirements:read                   # Read all requirements
requirements:write:own             # Write own requirements
requirements:manage:project        # Manage project requirements
architecture:read                  # Read architecture decisions
architecture:write:approved        # Write approved decisions only
integration:read                   # Read integration data
integration:write                  # Create/update mappings
projects:manage:own               # Manage own projects
analytics:read:organization       # Read org analytics
admin:manage:users               # Manage users (admin only)
```

### Role-Based Access Control

#### Predefined Roles

**Viewer**
```json
{
  "role": "viewer",
  "permissions": [
    "requirements:read",
    "architecture:read",
    "integration:read",
    "projects:read",
    "analytics:read:own"
  ]
}
```

**Developer**
```json
{
  "role": "developer",
  "permissions": [
    "requirements:read",
    "requirements:write:own",
    "architecture:read",
    "integration:read",
    "integration:write",
    "projects:read",
    "projects:write:own",
    "analytics:read:project"
  ]
}
```

**Architect**
```json
{
  "role": "architect",
  "permissions": [
    "requirements:read",
    "requirements:write",
    "architecture:read",
    "architecture:write",
    "architecture:manage:approved",
    "integration:read",
    "integration:write",
    "integration:manage",
    "projects:read",
    "projects:write",
    "analytics:read:organization"
  ]
}
```

**Project Manager**
```json
{
  "role": "project_manager",
  "permissions": [
    "requirements:manage:project",
    "architecture:read",
    "integration:read",
    "projects:manage:assigned",
    "analytics:read:project",
    "analytics:read:organization"
  ]
}
```

**Admin**
```json
{
  "role": "admin",
  "permissions": [
    "requirements:manage",
    "architecture:manage",
    "integration:manage",
    "projects:manage",
    "analytics:manage",
    "admin:manage:users",
    "admin:manage:organization",
    "admin:manage:billing"
  ]
}
```

### Permission Checking

API endpoints validate permissions before processing requests:

```http
GET /v2/requirements/req-123
Authorization: Bearer <token>
```

**Permission Check Flow:**
1. Extract JWT token and validate signature
2. Check token expiration
3. Extract user permissions from token
4. Validate required permission (`requirements:read`)
5. Check resource-specific permissions (project access, ownership, etc.)
6. Process request if authorized

**Error Responses:**

**403 Forbidden - Insufficient Permissions**
```json
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Insufficient permissions to access this resource",
    "details": {
      "required_permission": "requirements:write",
      "user_permissions": [
        "requirements:read",
        "architecture:read"
      ],
      "resource_type": "requirement",
      "resource_id": "req-123e4567-e89b-12d3-a456-426614174000"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-123e4567-e89b-12d3-a456-426614174000"
  }
}
```

---

## Security Best Practices

### 1. Token Security

**Secure Storage:**
```javascript
// ❌ Don't store tokens in localStorage
localStorage.setItem('token', accessToken);

// ✅ Use secure, httpOnly cookies or secure storage
// Server-side cookie setting
res.cookie('accessToken', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600000 // 1 hour
});

// Or use secure token storage library
import SecureStorage from 'secure-web-storage';
const storage = new SecureStorage(localStorage, {
  hash: function hash(key) {
    return btoa(key);
  },
  encrypt: function encrypt(data) {
    return btoa(data);
  },
  decrypt: function decrypt(data) {
    return atob(data);
  }
});
```

**Token Transmission:**
```javascript
// ✅ Always use HTTPS in production
const apiCall = async (endpoint, options = {}) => {
  const token = await tokenManager.getValidToken();
  
  return fetch(`https://api.lanka.ai/v2${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
};
```

### 2. API Key Security

**Environment Variables:**
```bash
# ✅ Store API keys in environment variables
LANKA_API_KEY=lka_live_1234567890abcdef...
LANKA_API_URL=https://api.lanka.ai/v2

# ❌ Don't commit API keys to code
const apiKey = "lka_live_1234567890abcdef..."; // DON'T DO THIS
```

**Key Rotation:**
```javascript
class APIKeyManager {
  constructor() {
    this.primaryKey = process.env.LANKA_API_KEY_PRIMARY;
    this.secondaryKey = process.env.LANKA_API_KEY_SECONDARY;
    this.keyRotationDate = new Date(process.env.LANKA_KEY_ROTATION_DATE || 0);
  }

  getCurrentKey() {
    // Use secondary key after rotation date
    if (Date.now() > this.keyRotationDate.getTime()) {
      return this.secondaryKey || this.primaryKey;
    }
    return this.primaryKey;
  }

  async rotateKey() {
    // Implement key rotation logic
    const newKey = await this.createNewAPIKey();
    
    // Update environment/configuration
    await this.updateConfiguration({
      LANKA_API_KEY_SECONDARY: this.primaryKey,
      LANKA_API_KEY_PRIMARY: newKey.key,
      LANKA_KEY_ROTATION_DATE: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    });
    
    // Revoke old secondary key after grace period
    setTimeout(() => {
      this.revokeAPIKey(this.secondaryKey);
    }, 24 * 60 * 60 * 1000); // 24 hours
  }
}
```

### 3. Request Security

**Request Signing (Optional, for high-security scenarios):**
```javascript
import crypto from 'crypto';

class SecureAPIClient {
  constructor(apiKey, secretKey) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
  }

  signRequest(method, path, body = '', timestamp) {
    const payload = `${method}\n${path}\n${body}\n${timestamp}`;
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(payload)
      .digest('hex');
  }

  async secureRequest(endpoint, options = {}) {
    const timestamp = Math.floor(Date.now() / 1000);
    const body = options.body || '';
    const method = options.method || 'GET';
    const signature = this.signRequest(method, endpoint, body, timestamp);

    return fetch(`https://api.lanka.ai/v2${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Lanka-Timestamp': timestamp.toString(),
        'X-Lanka-Signature': signature,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  }
}
```

### 4. Rate Limiting & Abuse Prevention

**Implement Client-Side Rate Limiting:**
```javascript
class RateLimitedClient {
  constructor(requestsPerSecond = 10) {
    this.requestsPerSecond = requestsPerSecond;
    this.requestTimes = [];
  }

  async rateLimitedRequest(endpoint, options = {}) {
    await this.waitForRateLimit();
    return this.apiCall(endpoint, options);
  }

  async waitForRateLimit() {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    // Remove requests older than 1 second
    this.requestTimes = this.requestTimes.filter(time => time > oneSecondAgo);
    
    // Wait if we're at the rate limit
    if (this.requestTimes.length >= this.requestsPerSecond) {
      const oldestRequest = Math.min(...this.requestTimes);
      const waitTime = 1000 - (now - oldestRequest);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requestTimes.push(Date.now());
  }
}
```

---

## Code Examples

### React Authentication Hook

```javascript
import { useState, useEffect, useContext, createContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  const tokenManager = new TokenManager();

  useEffect(() => {
    // Load existing token on app start
    const savedToken = localStorage.getItem('lanka_refresh_token');
    if (savedToken) {
      tokenManager.refreshToken = savedToken;
      refreshAuth();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch('https://api.lanka.ai/v2/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const authData = await response.json();
      
      tokenManager.setTokens(authData);
      setUser(authData.user);
      setToken(authData.accessToken);
      
      // Store refresh token securely
      localStorage.setItem('lanka_refresh_token', authData.refreshToken);
      
      return authData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Revoke tokens on server
      await fetch('https://api.lanka.ai/v2/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await tokenManager.getValidToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          refreshToken: tokenManager.refreshToken 
        })
      });
    } catch (error) {
      console.error('Logout error:', error);
    }

    // Clear local state
    tokenManager.logout();
    setUser(null);
    setToken(null);
    localStorage.removeItem('lanka_refresh_token');
  };

  const refreshAuth = async () => {
    try {
      const validToken = await tokenManager.getValidToken();
      if (validToken) {
        // Get current user info
        const response = await fetch('https://api.lanka.ai/v2/auth/me', {
          headers: { 'Authorization': `Bearer ${validToken}` }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData.user);
          setToken(validToken);
        }
      }
    } catch (error) {
      console.error('Auth refresh error:', error);
      // Clear invalid tokens
      localStorage.removeItem('lanka_refresh_token');
    } finally {
      setLoading(false);
    }
  };

  const apiCall = async (endpoint, options = {}) => {
    const validToken = await tokenManager.getValidToken();
    if (!validToken) {
      throw new Error('No valid token available');
    }

    return fetch(`https://api.lanka.ai/v2${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${validToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      logout,
      refreshAuth,
      apiCall,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### Node.js Express Middleware

```javascript
const jwt = require('jsonwebtoken');
const { promisify } = require('util');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication token required',
          details: {
            hint: 'Include Authorization header with Bearer token'
          },
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token with LANKA API
    const response = await fetch('https://api.lanka.ai/v2/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Authentication token is invalid or expired',
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }

    const tokenData = await response.json();
    
    // Add user and permissions to request
    req.user = tokenData.user;
    req.permissions = tokenData.user.permissions;
    req.organization = tokenData.organization;
    
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication service error',
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  }
};

const authorize = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.permissions || !req.permissions.includes(requiredPermission)) {
      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions to access this resource',
          details: {
            required_permission: requiredPermission,
            user_permissions: req.permissions || []
          },
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }
    next();
  };
};

// Usage
app.get('/api/requirements', 
  authenticate, 
  authorize('requirements:read'), 
  (req, res) => {
    // Handle request
  }
);
```

---

## Troubleshooting

### Common Authentication Issues

#### 1. Token Expiration

**Problem:** API calls return 401 after some time
**Solution:** Implement automatic token refresh

```javascript
// Check token expiration before API calls
const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const decoded = jwt.decode(token);
    return Date.now() >= decoded.exp * 1000;
  } catch (error) {
    return true;
  }
};
```

#### 2. Permission Denied

**Problem:** 403 Forbidden responses
**Solution:** Check required permissions

```javascript
// Debug permission issues
const debugPermissions = async () => {
  const response = await fetch('https://api.lanka.ai/v2/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const userData = await response.json();
  console.log('User permissions:', userData.user.permissions);
  console.log('Required permission:', 'requirements:write');
  console.log('Has permission:', userData.user.permissions.includes('requirements:write'));
};
```

#### 3. CORS Issues

**Problem:** Browser blocks API calls due to CORS
**Solution:** Configure proper CORS headers or use server-side proxy

```javascript
// Server-side proxy for development
const { createProxyMiddleware } = require('http-proxy-middleware');

app.use('/api', createProxyMiddleware({
  target: 'https://api.lanka.ai/v2',
  changeOrigin: true,
  pathRewrite: {
    '^/api': ''
  },
  onProxyReq: (proxyReq, req, res) => {
    // Add authentication header
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }
  }
}));
```

#### 4. Rate Limiting

**Problem:** 429 Too Many Requests
**Solution:** Implement exponential backoff

```javascript
const retryWithBackoff = async (apiCall, maxRetries = 3) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      if (error.status === 429 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
};
```

### Debugging Tools

**Token Decoder:**
```javascript
const debugToken = (token) => {
  try {
    const decoded = jwt.decode(token, { complete: true });
    console.log('Token Header:', decoded.header);
    console.log('Token Payload:', decoded.payload);
    console.log('Token Expires:', new Date(decoded.payload.exp * 1000));
    console.log('Token Valid:', Date.now() < decoded.payload.exp * 1000);
  } catch (error) {
    console.error('Invalid token:', error);
  }
};
```

**API Response Logger:**
```javascript
const logAPIResponse = (response, requestDetails) => {
  console.log('API Request:', requestDetails);
  console.log('Response Status:', response.status);
  console.log('Response Headers:', Object.fromEntries(response.headers));
  
  if (response.status >= 400) {
    response.clone().json().then(errorData => {
      console.error('API Error:', errorData);
    });
  }
};
```

This comprehensive authentication guide provides all the information needed to securely integrate with the LANKA API, from basic token management to advanced security practices.