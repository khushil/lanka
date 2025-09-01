# LANKA Memory System - MCP Server Documentation

## Overview

The LANKA Memory System MCP (Model Context Protocol) Server provides intelligent memory capabilities for AI coding assistants through a standards-compliant interface. The server implements both **Default Mode** for direct memory operations and **Aggregator Mode** for intelligent proxying of other MCP servers while adding memory enhancement capabilities.

## Architecture

### Core Components

```
┌─────────────────────────────────────────┐
│              MCP Server                 │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────┐  │
│  │ Default     │  │ Aggregator      │  │
│  │ Mode        │  │ Mode            │  │
│  └─────────────┘  └─────────────────┘  │
├─────────────────────────────────────────┤
│           Transport Layer               │
│  ┌─────────────┐  ┌─────────────────┐  │
│  │ WebSocket   │  │ HTTP/2          │  │
│  └─────────────┘  └─────────────────┘  │
├─────────────────────────────────────────┤
│            Memory Services              │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ │
│  │ Memory  │ │ Vector  │ │ Graph    │ │
│  │ Service │ │ Service │ │ Service  │ │
│  └─────────┘ └─────────┘ └──────────┘ │
├─────────────────────────────────────────┤
│             Storage Layer               │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ │
│  │ Neo4j   │ │ Vector  │ │ Redis    │ │
│  │         │ │ DB      │ │          │ │
│  └─────────┘ └─────────┘ └──────────┘ │
└─────────────────────────────────────────┘
```

### Memory Types

The system implements three distinct memory types based on cognitive science:

1. **System-1 Memories**: Fast pattern recognition (muscle memory for developers)
2. **System-2 Memories**: Deliberate reasoning processes and complex problem-solving
3. **Workspace Memories**: Shared team knowledge scoped by project boundaries

## Installation & Setup

### Prerequisites

```bash
# Required services
docker run -d --name neo4j -p 7687:7687 -p 7474:7474 neo4j:latest
docker run -d --name qdrant -p 6333:6333 qdrant/qdrant
docker run -d --name redis -p 6379:6379 redis:alpine
```

### Installation

```bash
npm install @lanka/memory-mcp
```

### Basic Setup

```typescript
import { createDefaultServer, createAggregatorServer } from '@lanka/memory-mcp';

// Default Mode Server
const defaultServer = await createDefaultServer({
  transport: {
    type: 'websocket',
    host: 'localhost',
    port: 8080,
  },
  memory: {
    neo4jUri: 'neo4j://localhost:7687',
    vectorDb: {
      type: 'qdrant',
      uri: 'http://localhost:6333',
    },
    redis: {
      uri: 'redis://localhost:6379',
    },
  },
});

// Aggregator Mode Server
const aggregatorServer = await createAggregatorServer([
  { name: 'file-server', uri: 'ws://localhost:8082/mcp' },
  { name: 'git-server', uri: 'ws://localhost:8083/mcp' },
]);
```

## API Reference

### Memory Tools

#### memory-search

Search memories using semantic, structural, or hybrid queries.

```json
{
  "name": "memory-search",
  "arguments": {
    "query": "error handling in async functions",
    "type": "hybrid",
    "workspace": "my-project",
    "limit": 10,
    "filters": {
      "memoryType": "system1",
      "quality": 0.8,
      "tags": ["javascript", "async"]
    }
  }
}
```

**Response:**
```json
{
  "content": [{
    "type": "text",
    "text": "{\"query\":\"error handling in async functions\",\"type\":\"hybrid\",\"results\":[{\"id\":\"mem_123\",\"content\":\"Use try-catch blocks with async/await for clean error handling\",\"quality\":0.9,\"relevanceScore\":0.95}]}"
  }]
}
```

#### memory-store

Store new memories with automatic arbitration and quality assessment.

```json
{
  "name": "memory-store",
  "arguments": {
    "content": "Always validate input at API boundaries to prevent injection attacks",
    "type": "system1",
    "workspace": "security-patterns",
    "metadata": {
      "tags": ["security", "validation", "api"],
      "confidence": 0.9,
      "source": "security-review"
    },
    "arbitration": {
      "enabled": true,
      "threshold": 0.85,
      "allowUpdate": true
    }
  }
}
```

#### memory-relate

Create relationships between memories.

```json
{
  "name": "memory-relate",
  "arguments": {
    "sourceMemoryId": "mem_123",
    "targetMemoryId": "mem_456",
    "relationshipType": "IMPLEMENTS",
    "metadata": {
      "strength": 0.8,
      "confidence": 0.9,
      "context": "Both patterns implement input validation"
    }
  }
}
```

#### memory-evolve

Trigger memory evolution based on usage patterns or contradictions.

```json
{
  "name": "memory-evolve",
  "arguments": {
    "workspace": "my-project",
    "trigger": "contradiction",
    "context": "New security standards require updated validation patterns"
  }
}
```

#### memory-federate

Share memories across instances with privacy controls.

```json
{
  "name": "memory-federate",
  "arguments": {
    "memories": ["mem_123", "mem_456"],
    "targetInstance": "https://partner-instance.example.com/mcp",
    "mode": "share",
    "privacyLevel": "patterns_only"
  }
}
```

### Resources

#### memory://collections/{workspace}

Access memory collections by workspace.

```
GET memory://collections/my-project
```

#### memory://stats/{workspace}

Get memory statistics and analytics.

```
GET memory://stats/my-project
```

#### memory://quality/{workspace}

Access memory quality metrics and trends.

```
GET memory://quality/my-project
```

## Configuration

### Default Mode Configuration

```typescript
const config: MCPServerConfig = {
  name: 'lanka-memory-server',
  version: '1.0.0',
  mode: 'default',
  transport: {
    type: 'websocket',
    host: 'localhost',
    port: 8080,
    auth: {
      type: 'bearer',
      token: process.env.MCP_AUTH_TOKEN,
    },
  },
  capabilities: {
    memory: {
      search: true,
      store: true,
      relate: true,
      evolve: true,
      federate: true,
      subscribe: true,
    },
  },
  memory: {
    neo4jUri: 'neo4j://localhost:7687',
    vectorDb: {
      type: 'qdrant',
      uri: 'http://localhost:6333',
    },
    redis: {
      uri: 'redis://localhost:6379',
    },
  },
  rateLimit: {
    windowMs: 60000,
    maxRequests: 100,
  },
};
```

### Aggregator Mode Configuration

```typescript
const config: MCPServerConfig = {
  // ... base config
  mode: 'aggregator',
  aggregator: {
    servers: [
      {
        name: 'file-ops',
        uri: 'ws://localhost:8082/mcp',
        auth: { type: 'apikey', apiKey: 'server-key' },
      },
      {
        name: 'git-ops',
        uri: 'ws://localhost:8083/mcp',
        auth: { type: 'bearer', token: 'bearer-token' },
      },
    ],
  },
};
```

### Security Configuration

```typescript
// Authentication
const auth = AuthMiddleware.createJWTAuth('your-jwt-secret');

// Security
const security = SecurityMiddleware.createStrict('encryption-key');

// Applied automatically based on config
```

## Usage Examples

### Client Connection

```typescript
import WebSocket from 'ws';

const client = new WebSocket('ws://localhost:8080/mcp');

// Initialize connection
client.on('open', () => {
  const initMessage = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'my-client', version: '1.0.0' },
    },
  };
  client.send(JSON.stringify(initMessage));
});

// Handle responses
client.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('Received:', message);
});
```

### Memory Operations

```typescript
// Store a coding pattern
const storePattern = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/call',
  params: {
    name: 'memory-store',
    arguments: {
      content: 'Use const assertions with as const for immutable type inference',
      type: 'system1',
      metadata: {
        tags: ['typescript', 'const-assertions', 'types'],
        confidence: 0.95,
      },
    },
  },
};

// Search for patterns
const searchPattern = {
  jsonrpc: '2.0',
  id: 3,
  method: 'tools/call',
  params: {
    name: 'memory-search',
    arguments: {
      query: 'typescript type inference patterns',
      type: 'semantic',
      limit: 5,
    },
  },
};
```

### Aggregator Mode Usage

```typescript
// List available proxied servers
const listServers = {
  jsonrpc: '2.0',
  id: 4,
  method: 'tools/call',
  params: {
    name: 'proxy-list-servers',
    arguments: {
      includeTools: true,
    },
  },
};

// Call tool on proxied server with memory extraction
const proxyCall = {
  jsonrpc: '2.0',
  id: 5,
  method: 'tools/call',
  params: {
    name: 'proxy-call-tool',
    arguments: {
      server: 'file-ops',
      tool: 'read-file',
      arguments: { path: './src/main.ts' },
      extractLearning: true,
      memoryContext: 'Reading main application entry point',
    },
  },
};
```

## Advanced Features

### Memory Arbitration

The system uses intelligent arbitration to decide whether to create, update, merge, or skip memories:

```typescript
// High-level arbitration process
const arbitrationResult = await arbitrationService.arbitrate({
  content: 'New coding pattern',
  type: 'system1',
  arbitration: {
    threshold: 0.85,
    allowUpdate: true,
  },
}, context);

// Actions: 'create' | 'update' | 'merge' | 'skip'
// Based on similarity analysis and quality assessment
```

### Graph Traversal

Complex memory relationships can be explored:

```typescript
// Find memory evolution chains
const evolution = await graphService.findMemoryEvolution('mem_123');

// Find dependency networks
const dependencies = await graphService.findMemoryDependencies('mem_123');

// Analyze connectivity patterns
const connectivity = await graphService.analyzeMemoryConnectivity('workspace');
```

### Event Subscriptions

Subscribe to real-time memory updates:

```typescript
// Memory stored event
client.on('message', (data) => {
  const message = JSON.parse(data.toString());
  if (message.method === 'memory/stored') {
    console.log('New memory stored:', message.params);
  }
});

// Memory evolution event
// Memory relationship created event
// Server health changes (aggregator mode)
```

## Deployment

### Development

```bash
# Start development server
npm run dev

# Or using the CLI
npx @lanka/memory-mcp default
```

### Production

```bash
# Environment variables
export NEO4J_URI=neo4j://production-neo4j:7687
export VECTOR_DB_URI=http://production-qdrant:6333
export REDIS_URI=redis://production-redis:6379
export MCP_AUTH_TOKEN=your-production-token

# Start production server
npx @lanka/memory-mcp production
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 8080
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  memory-server:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NEO4J_URI=neo4j://neo4j:7687
      - VECTOR_DB_URI=http://qdrant:6333
      - REDIS_URI=redis://redis:6379
    depends_on:
      - neo4j
      - qdrant
      - redis

  neo4j:
    image: neo4j:5
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      - NEO4J_AUTH=none

  qdrant:
    image: qdrant/qdrant
    ports:
      - "6333:6333"

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

## Security

### Authentication Methods

- **Bearer Token**: Simple token-based auth
- **API Key**: Key-based authentication with permissions
- **JWT**: Stateless token authentication
- **Basic Auth**: Username/password authentication

### Security Features

- Input sanitization and validation
- XSS and injection attack prevention
- Rate limiting per client
- Request size limits
- IP-based blocking
- Audit logging
- Sensitive data encryption

### Best Practices

1. **Always enable authentication in production**
2. **Use HTTPS/WSS for encrypted transport**
3. **Implement proper rate limiting**
4. **Monitor security audit logs**
5. **Regularly rotate authentication tokens**
6. **Validate all input parameters**
7. **Use workspace-based access control**

## Monitoring & Observability

### Metrics

```typescript
// Server metrics
const stats = server.getStats();
console.log(stats);
// {
//   clientCount: 5,
//   totalRequests: 1250,
//   averageResponseTime: 45,
//   memoryOperations: 320,
//   errors: 2
// }

// Security metrics
const securityStats = security.getSecurityStats();
console.log(securityStats);

// Memory service metrics
const memoryStats = await memoryService.getMemoryStatistics('workspace');
```

### Health Checks

```typescript
// Built-in health check endpoint
GET /health

// Response
{
  "status": "healthy",
  "services": {
    "neo4j": "connected",
    "vectorDb": "connected",
    "redis": "connected"
  },
  "uptime": 86400,
  "version": "1.0.0"
}
```

## Troubleshooting

### Common Issues

1. **Connection Refused**: Check that all required services (Neo4j, Redis, Vector DB) are running
2. **Authentication Failures**: Verify auth tokens and configuration
3. **Memory Storage Failures**: Check Neo4j connectivity and workspace permissions
4. **Search Not Working**: Ensure vector database is properly indexed
5. **Rate Limit Errors**: Adjust rate limiting configuration

### Debug Mode

```bash
# Enable debug logging
DEBUG=lanka:memory:* npx @lanka/memory-mcp default

# Or set log level in code
const server = new DefaultMCPServer({
  ...config,
  logLevel: 'debug',
});
```

### Performance Tuning

1. **Adjust vector database index parameters**
2. **Optimize Neo4j memory configuration**
3. **Configure Redis as LRU cache**
4. **Set appropriate rate limits**
5. **Monitor memory usage and GC**
6. **Use connection pooling**

## Contributing

See the main LANKA documentation for contribution guidelines. The MCP server implementation follows the same patterns and standards as the core LANKA system.

## License

MIT License - see LICENSE file for details.