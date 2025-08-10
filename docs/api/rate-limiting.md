# LANKA API Rate Limiting & Usage Guidelines

## Overview

The LANKA API implements comprehensive rate limiting to ensure fair usage, maintain service quality, and prevent abuse. This guide covers rate limit policies, monitoring, and best practices for handling limits gracefully.

## Rate Limit Policies

### Tier-Based Limits

#### Free Tier
- **Requests per Hour**: 1,000
- **Requests per Day**: 10,000
- **Requests per Month**: 100,000
- **Concurrent Requests**: 10
- **GraphQL Query Depth**: 5 levels
- **Burst Allowance**: 100 requests/minute

#### Professional Tier
- **Requests per Hour**: 5,000
- **Requests per Day**: 50,000
- **Requests per Month**: 500,000
- **Concurrent Requests**: 50
- **GraphQL Query Depth**: 10 levels
- **Burst Allowance**: 500 requests/minute

#### Enterprise Tier
- **Requests per Hour**: 20,000
- **Requests per Day**: 200,000
- **Requests per Month**: 2,000,000
- **Concurrent Requests**: 200
- **GraphQL Query Depth**: 15 levels
- **Burst Allowance**: 1,000 requests/minute

#### Custom Enterprise
- **Negotiated Limits**: Based on specific needs
- **SLA Guarantees**: 99.9% uptime
- **Dedicated Resources**: Available
- **Priority Support**: 24/7

### Endpoint-Specific Limits

Different endpoints have varying computational costs and different limits:

```yaml
endpoints:
  # Authentication
  /auth/login: 10 requests/minute
  /auth/refresh: 60 requests/hour
  
  # Read Operations (Higher Limits)
  GET /requirements: 1000 requests/hour
  GET /architecture/decisions: 1000 requests/hour
  GET /integration/metrics: 500 requests/hour
  
  # Write Operations (Moderate Limits)
  POST /requirements: 100 requests/hour
  PUT /requirements/*: 200 requests/hour
  POST /architecture/decisions: 50 requests/hour
  
  # AI Operations (Lower Limits)
  GET /integration/recommendations/*: 50 requests/hour
  POST /integration/validation: 100 requests/hour
  
  # Bulk Operations (Strict Limits)
  POST /requirements/batch: 10 requests/hour
  POST /integration/mappings/batch: 20 requests/hour
  
  # Search Operations
  GET /search: 500 requests/hour
  POST /graphql: 2000 requests/hour (complexity-based)
```

### GraphQL Complexity Analysis

GraphQL queries are rate-limited based on query complexity rather than just request count:

```javascript
// Query complexity calculation
const complexityRules = {
  // Base cost per field
  fieldCost: 1,
  
  // Multipliers for specific field types
  multipliers: {
    requirement: 2,
    architectureDecision: 3,
    recommendation: 5,
    mapping: 2,
    analysis: 4
  },
  
  // List field costs
  listMultiplier: 1.5,
  
  // Nested relationship costs
  depthMultiplier: 1.2,
  
  // Maximum allowed complexity
  maxComplexity: {
    free: 100,
    professional: 500,
    enterprise: 1000
  }
};

// Example query costs:
// Simple requirement query: 5 points
// Requirement with mappings: 15 points
// Complex recommendation query: 45 points
```

---

## Rate Limit Headers

All API responses include rate limit information in headers:

### Standard Headers

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642777200
X-RateLimit-Window: 3600
X-RateLimit-Scope: user
X-RateLimit-Policy: professional
```

#### Header Descriptions

- **X-RateLimit-Limit**: Maximum requests allowed in the current window
- **X-RateLimit-Remaining**: Requests remaining in the current window
- **X-RateLimit-Reset**: Unix timestamp when the rate limit resets
- **X-RateLimit-Window**: Size of the rate limit window in seconds
- **X-RateLimit-Scope**: Rate limit scope (user, organization, api-key)
- **X-RateLimit-Policy**: Applied rate limit policy name

### GraphQL-Specific Headers

```http
X-RateLimit-Complexity-Limit: 500
X-RateLimit-Complexity-Remaining: 455
X-RateLimit-Complexity-Cost: 45
X-RateLimit-Query-Depth: 4
X-RateLimit-Query-Depth-Limit: 10
```

### Burst Protection Headers

```http
X-RateLimit-Burst-Limit: 500
X-RateLimit-Burst-Remaining: 487
X-RateLimit-Burst-Reset: 1642775460
```

---

## Rate Limit Responses

### 429 Too Many Requests

When rate limits are exceeded, the API returns a 429 status with details:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 1000,
      "remaining": 0,
      "reset_at": "2024-01-15T11:00:00Z",
      "window": 3600,
      "scope": "user",
      "policy": "professional",
      "retry_after": 1800
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-123e4567-e89b-12d3-a456-426614174000"
  }
}
```

### Additional Rate Limit Headers on 429

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 1800
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1642777200
X-RateLimit-Scope: user
X-RateLimit-Policy: professional
```

---

## Client Implementation Strategies

### 1. Rate Limit Monitoring

```javascript
class RateLimitMonitor {
  constructor() {
    this.limits = new Map();
    this.warnings = new Set();
  }

  updateFromHeaders(headers, endpoint) {
    const limit = parseInt(headers.get('X-RateLimit-Limit'));
    const remaining = parseInt(headers.get('X-RateLimit-Remaining'));
    const reset = parseInt(headers.get('X-RateLimit-Reset'));
    const window = parseInt(headers.get('X-RateLimit-Window'));
    
    const limitInfo = {
      limit,
      remaining,
      reset,
      window,
      endpoint,
      timestamp: Date.now()
    };
    
    this.limits.set(endpoint, limitInfo);
    
    // Issue warnings when approaching limits
    const usagePercentage = ((limit - remaining) / limit) * 100;
    
    if (usagePercentage > 80 && !this.warnings.has(endpoint)) {
      console.warn(`Approaching rate limit for ${endpoint}: ${remaining}/${limit} remaining`);
      this.warnings.add(endpoint);
    }
    
    if (usagePercentage < 50) {
      this.warnings.delete(endpoint);
    }
    
    return limitInfo;
  }

  getStatus(endpoint) {
    return this.limits.get(endpoint) || null;
  }

  getAllStatus() {
    return Array.from(this.limits.entries()).map(([endpoint, info]) => ({
      endpoint,
      ...info,
      usagePercentage: ((info.limit - info.remaining) / info.limit) * 100
    }));
  }

  shouldWait(endpoint) {
    const status = this.getStatus(endpoint);
    if (!status) return false;
    
    return status.remaining <= 5; // Conservative threshold
  }

  getWaitTime(endpoint) {
    const status = this.getStatus(endpoint);
    if (!status) return 0;
    
    const now = Math.floor(Date.now() / 1000);
    const resetTime = status.reset;
    
    return Math.max(0, (resetTime - now) * 1000);
  }
}
```

### 2. Automatic Throttling

```javascript
class ThrottledAPIClient {
  constructor(baseClient, options = {}) {
    this.baseClient = baseClient;
    this.rateLimitMonitor = new RateLimitMonitor();
    this.requestQueue = new Map();
    this.options = {
      respectRateLimits: true,
      warningThreshold: 0.8,
      safetyBuffer: 10,
      ...options
    };
  }

  async request(endpoint, options = {}) {
    if (this.options.respectRateLimits) {
      await this.waitForRateLimit(endpoint);
    }

    try {
      const response = await this.baseClient.request(endpoint, options);
      
      // Update rate limit information
      this.rateLimitMonitor.updateFromHeaders(response.headers, endpoint);
      
      return response;
    } catch (error) {
      if (error.status === 429) {
        return this.handleRateLimitExceeded(endpoint, options, error);
      }
      throw error;
    }
  }

  async waitForRateLimit(endpoint) {
    if (this.rateLimitMonitor.shouldWait(endpoint)) {
      const waitTime = this.rateLimitMonitor.getWaitTime(endpoint);
      
      console.log(`Rate limit reached for ${endpoint}. Waiting ${waitTime}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  async handleRateLimitExceeded(endpoint, options, error) {
    const retryAfter = error.details?.retry_after || 60;
    const waitTime = retryAfter * 1000;
    
    console.warn(`Rate limit exceeded for ${endpoint}. Retrying in ${retryAfter}s...`);
    
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Retry the request
    return this.request(endpoint, options);
  }

  // Get rate limit status for monitoring
  getRateLimitStatus() {
    return this.rateLimitMonitor.getAllStatus();
  }
}
```

### 3. Request Queuing and Batching

```javascript
class QueuedAPIClient {
  constructor(baseClient, options = {}) {
    this.baseClient = baseClient;
    this.queues = new Map();
    this.options = {
      maxConcurrent: 10,
      batchSize: 10,
      batchDelay: 100,
      ...options
    };
  }

  async queuedRequest(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.queues.has(endpoint)) {
        this.queues.set(endpoint, []);
        this.processQueue(endpoint);
      }

      this.queues.get(endpoint).push({
        options,
        resolve,
        reject,
        timestamp: Date.now()
      });
    });
  }

  async processQueue(endpoint) {
    const queue = this.queues.get(endpoint);
    if (!queue || queue.length === 0) {
      this.queues.delete(endpoint);
      return;
    }

    // Process requests in batches
    const batch = queue.splice(0, this.options.batchSize);
    const batchPromises = batch.map(request => 
      this.baseClient.request(endpoint, request.options)
        .then(request.resolve)
        .catch(request.reject)
    );

    try {
      await Promise.all(batchPromises);
    } catch (error) {
      console.error(`Batch processing failed for ${endpoint}:`, error);
    }

    // Continue processing remaining requests
    if (queue.length > 0) {
      setTimeout(() => this.processQueue(endpoint), this.options.batchDelay);
    } else {
      this.queues.delete(endpoint);
    }
  }

  // Batch similar requests together
  async batchRequirements(requirementIds) {
    if (requirementIds.length <= 20) {
      return this.baseClient.request('/requirements/batch', {
        method: 'POST',
        body: JSON.stringify({ ids: requirementIds })
      });
    }

    // Split into multiple batches
    const batches = [];
    for (let i = 0; i < requirementIds.length; i += 20) {
      batches.push(requirementIds.slice(i, i + 20));
    }

    const batchPromises = batches.map(batch =>
      this.baseClient.request('/requirements/batch', {
        method: 'POST',
        body: JSON.stringify({ ids: batch })
      })
    );

    const results = await Promise.all(batchPromises);
    return results.flat();
  }
}
```

### 4. Caching Strategy

```javascript
class CachedAPIClient {
  constructor(baseClient, options = {}) {
    this.baseClient = baseClient;
    this.cache = new Map();
    this.options = {
      defaultTTL: 300000, // 5 minutes
      maxCacheSize: 1000,
      ...options
    };
  }

  async cachedRequest(endpoint, options = {}) {
    const cacheKey = this.getCacheKey(endpoint, options);
    const cached = this.cache.get(cacheKey);

    // Return cached response if valid
    if (cached && Date.now() < cached.expiresAt) {
      console.log(`Cache hit for ${endpoint}`);
      return cached.response;
    }

    // Make API request
    const response = await this.baseClient.request(endpoint, options);

    // Cache the response
    this.setCacheEntry(cacheKey, response, options.cacheTTL);

    return response;
  }

  getCacheKey(endpoint, options) {
    const queryString = new URLSearchParams(options.params || {}).toString();
    return `${endpoint}?${queryString}`;
  }

  setCacheEntry(key, response, ttl) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.options.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      response,
      expiresAt: Date.now() + (ttl || this.options.defaultTTL),
      createdAt: Date.now()
    });
  }

  clearCache(pattern) {
    if (pattern) {
      // Clear entries matching pattern
      for (const [key] of this.cache) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.options.maxCacheSize,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        age: Date.now() - value.createdAt,
        ttl: value.expiresAt - Date.now()
      }))
    };
  }
}
```

---

## Best Practices

### 1. Efficient API Usage

```javascript
// ✅ Good: Batch related requests
const requirements = await api.batchRequest('/requirements/batch', {
  method: 'POST',
  body: JSON.stringify({ ids: requirementIds })
});

// ❌ Bad: Multiple individual requests
const requirements = await Promise.all(
  requirementIds.map(id => api.request(`/requirements/${id}`))
);
```

```javascript
// ✅ Good: Use appropriate pagination
const allRequirements = [];
let offset = 0;
const limit = 100; // Maximum efficient batch size

while (true) {
  const batch = await api.request('/requirements', {
    params: { limit, offset }
  });
  
  allRequirements.push(...batch.data);
  
  if (!batch.pagination.hasNext) break;
  offset += limit;
}

// ❌ Bad: Requesting all data at once
const allRequirements = await api.request('/requirements', {
  params: { limit: 10000 }
});
```

### 2. GraphQL Query Optimization

```graphql
# ✅ Good: Request only needed fields
query GetRequirements($limit: Int!) {
  requirements(limit: $limit) {
    id
    title
    status
    priority
  }
}

# ❌ Bad: Over-fetching data
query GetRequirements($limit: Int!) {
  requirements(limit: $limit) {
    id
    title
    description
    type
    status
    priority
    completenessScore
    qualityScore
    acceptanceCriteria
    businessValue
    createdAt
    updatedAt
    project {
      id
      name
      description
      requirements {  # This creates N+1 queries
        id
        title
        description
      }
    }
    stakeholder {
      id
      name
      email
      requirements {  # Another N+1 query
        id
        title
      }
    }
  }
}
```

### 3. Rate Limit Monitoring Dashboard

```javascript
class RateLimitDashboard {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.metrics = {
      requests: 0,
      rateLimitHits: 0,
      averageResponseTime: 0,
      errorRate: 0
    };
  }

  createDashboard() {
    return {
      getCurrentStatus: () => this.apiClient.getRateLimitStatus(),
      
      getUsageMetrics: () => {
        const status = this.apiClient.getRateLimitStatus();
        return status.map(endpoint => ({
          endpoint: endpoint.endpoint,
          usage: `${endpoint.limit - endpoint.remaining}/${endpoint.limit}`,
          usagePercentage: endpoint.usagePercentage,
          resetTime: new Date(endpoint.reset * 1000).toISOString(),
          status: endpoint.usagePercentage > 80 ? 'WARNING' : 'OK'
        }));
      },

      getRecommendations: () => {
        const recommendations = [];
        const status = this.apiClient.getRateLimitStatus();
        
        for (const endpoint of status) {
          if (endpoint.usagePercentage > 90) {
            recommendations.push({
              type: 'CRITICAL',
              message: `${endpoint.endpoint} is near rate limit`,
              action: 'Consider implementing caching or reducing request frequency'
            });
          } else if (endpoint.usagePercentage > 75) {
            recommendations.push({
              type: 'WARNING',
              message: `${endpoint.endpoint} usage is high`,
              action: 'Monitor usage and consider optimizations'
            });
          }
        }
        
        return recommendations;
      }
    };
  }

  startMonitoring() {
    setInterval(() => {
      const status = this.apiClient.getRateLimitStatus();
      console.table(status.map(s => ({
        Endpoint: s.endpoint,
        'Usage': `${s.limit - s.remaining}/${s.limit}`,
        'Percentage': `${s.usagePercentage.toFixed(1)}%`,
        'Reset': new Date(s.reset * 1000).toLocaleTimeString()
      })));
    }, 30000); // Every 30 seconds
  }
}
```

### 4. Upgrade Recommendations

```javascript
class UsageAnalyzer {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.usageHistory = [];
  }

  analyzeUsage() {
    const status = this.apiClient.getRateLimitStatus();
    const currentTime = Date.now();
    
    // Track usage over time
    this.usageHistory.push({
      timestamp: currentTime,
      status: status.map(s => ({
        endpoint: s.endpoint,
        usagePercentage: s.usagePercentage
      }))
    });

    // Keep only last 24 hours of data
    const oneDayAgo = currentTime - (24 * 60 * 60 * 1000);
    this.usageHistory = this.usageHistory.filter(
      entry => entry.timestamp > oneDayAgo
    );

    return this.generateRecommendations();
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Calculate average usage
    const avgUsage = this.calculateAverageUsage();
    
    if (avgUsage > 80) {
      recommendations.push({
        type: 'UPGRADE_REQUIRED',
        message: 'Consider upgrading to a higher tier',
        details: 'Your average usage exceeds 80% of your current limits',
        suggestedTier: this.suggestTier(avgUsage)
      });
    } else if (avgUsage > 60) {
      recommendations.push({
        type: 'UPGRADE_SUGGESTED',
        message: 'Consider upgrading for better performance',
        details: 'Higher tiers offer better limits and features',
        suggestedTier: this.suggestTier(avgUsage)
      });
    }

    return recommendations;
  }

  calculateAverageUsage() {
    if (this.usageHistory.length === 0) return 0;
    
    const totalUsage = this.usageHistory.reduce((sum, entry) => {
      const entryAvg = entry.status.reduce((s, endpoint) => 
        s + endpoint.usagePercentage, 0) / entry.status.length;
      return sum + entryAvg;
    }, 0);

    return totalUsage / this.usageHistory.length;
  }

  suggestTier(avgUsage) {
    if (avgUsage > 90) return 'enterprise';
    if (avgUsage > 70) return 'professional';
    return 'professional';
  }
}
```

This comprehensive rate limiting guide provides developers with all the tools needed to efficiently work within API limits while building robust, scalable applications.