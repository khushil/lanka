# LANKA Memory System - MCP Server

A production-ready Model Context Protocol (MCP) server that provides intelligent memory capabilities for AI coding assistants.

## 🚀 Quick Start

### Prerequisites

```bash
# Start required services
docker run -d --name neo4j -p 7687:7687 -p 7474:7474 neo4j:latest
docker run -d --name qdrant -p 6333:6333 qdrant/qdrant
docker run -d --name redis -p 6379:6379 redis:alpine
```

### Installation

```bash
npm install
npm run build
```

### Start Default Server

```bash
# Development mode
npm run mcp:server:default

# Production mode
npm run mcp:server:production
```

### Test the Implementation

```bash
# Run comprehensive tests
npm run mcp:test

# Run usage examples
npm run mcp:examples
```

## 🏗️ Architecture

### Server Modes

**Default Mode**: Direct memory operations with natural language interface
```typescript
import { createDefaultServer } from './index';

const server = await createDefaultServer({
  transport: { type: 'websocket', port: 8080 },
  memory: {
    neo4jUri: 'neo4j://localhost:7687',
    vectorDb: { type: 'qdrant', uri: 'http://localhost:6333' },
    redis: { uri: 'redis://localhost:6379' },
  },
});
```

**Aggregator Mode**: Intelligent proxy for other MCP servers with memory enhancement
```typescript
import { createAggregatorServer } from './index';

const server = await createAggregatorServer([
  { name: 'file-ops', uri: 'ws://localhost:8082/mcp' },
  { name: 'git-ops', uri: 'ws://localhost:8083/mcp' },
]);
```

### Core Components

```
├── server/
│   ├── base.ts              # Base MCP server implementation
│   ├── default.ts           # Default mode server
│   ├── aggregator.ts        # Aggregator mode server
│   ├── factory.ts           # Server factory & configuration
│   ├── middleware/
│   │   ├── auth.ts          # Authentication middleware
│   │   └── security.ts      # Security & validation middleware
│   └── services/
│       ├── memory.ts        # Core memory operations
│       ├── arbitration.ts   # Memory arbitration logic
│       ├── vector.ts        # Vector similarity search
│       ├── graph.ts         # Neo4j graph operations
│       ├── proxy.ts         # MCP server proxying
│       └── learning-extractor.ts  # Learning from tool usage
├── transport/
│   └── websocket.ts         # WebSocket transport layer
└── types.ts                 # TypeScript definitions
```

## 🔧 Configuration

### Environment Variables

```bash
# Database connections
NEO4J_URI=neo4j://localhost:7687
VECTOR_DB_URI=http://localhost:6333
REDIS_URI=redis://localhost:6379

# Server configuration
HOST=localhost
PORT=8080
MCP_AUTH_TOKEN=your-auth-token

# SSL (production)
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
```

### Configuration Options

```typescript
interface MCPServerConfig {
  name: string;
  version: string;
  mode: 'default' | 'aggregator';
  
  transport: {
    type: 'websocket' | 'http2';
    host: string;
    port: number;
    auth?: AuthConfig;
    ssl?: SSLConfig;
  };
  
  memory: {
    neo4jUri: string;
    vectorDb: { type: 'qdrant' | 'milvus'; uri: string };
    redis: { uri: string };
  };
  
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  
  aggregator?: {
    servers: Array<{ name: string; uri: string; auth?: any }>;
  };
}
```

## 🛠️ Memory Tools

### memory-search
Search memories using semantic, structural, or hybrid queries.

```json
{
  "name": "memory-search",
  "arguments": {
    "query": "error handling patterns",
    "type": "hybrid",
    "limit": 10,
    "filters": {
      "memoryType": "system1",
      "quality": 0.8,
      "tags": ["error-handling", "best-practices"]
    }
  }
}
```

### memory-store
Store new memories with intelligent arbitration.

```json
{
  "name": "memory-store",
  "arguments": {
    "content": "Use try-catch blocks with async/await for clean error handling",
    "type": "system1",
    "metadata": {
      "tags": ["javascript", "error-handling", "async"],
      "confidence": 0.9
    },
    "arbitration": {
      "enabled": true,
      "threshold": 0.85
    }
  }
}
```

### memory-relate
Create semantic relationships between memories.

```json
{
  "name": "memory-relate",
  "arguments": {
    "sourceMemoryId": "mem_123",
    "targetMemoryId": "mem_456",
    "relationshipType": "IMPLEMENTS",
    "metadata": {
      "strength": 0.8,
      "confidence": 0.9
    }
  }
}
```

### memory-evolve
Trigger memory evolution and optimization.

```json
{
  "name": "memory-evolve",
  "arguments": {
    "workspace": "my-project",
    "trigger": "usage_pattern",
    "context": "Optimizing based on recent access patterns"
  }
}
```

### memory-federate
Share memories across instances with privacy controls.

```json
{
  "name": "memory-federate",
  "arguments": {
    "memories": ["mem_123", "mem_456"],
    "targetInstance": "https://partner.example.com/mcp",
    "mode": "share",
    "privacyLevel": "patterns_only"
  }
}
```

## 🔒 Security Features

### Authentication Methods

```typescript
// Bearer Token
const auth = AuthMiddleware.createBearerAuth('secret-token');

// API Key
const auth = AuthMiddleware.createApiKeyAuth(['key1', 'key2']);

// JWT
const auth = AuthMiddleware.createJWTAuth('jwt-secret');

// Basic Auth
const auth = AuthMiddleware.createBasicAuth([
  { username: 'user', password: 'hash', permissions: ['memory:read'] }
]);
```

### Security Middleware

```typescript
const security = SecurityMiddleware.createStrict('encryption-key');

// Features:
// - Input sanitization
// - XSS prevention
// - SQL injection protection
// - Rate limiting
// - Request size limits
// - Audit logging
```

## 📊 Monitoring & Analytics

### Health Check
```bash
curl http://localhost:8080/health
```

### Memory Statistics
```json
{
  "method": "resources/read",
  "params": {
    "uri": "memory://stats/workspace"
  }
}
```

### Quality Metrics
```json
{
  "method": "resources/read", 
  "params": {
    "uri": "memory://quality/workspace"
  }
}
```

## 🧪 Testing

### Unit Tests
```bash
npm run mcp:test
```

### Integration Tests
```bash
RUN_INTEGRATION_TESTS=true npm run mcp:test
```

### Load Testing
```bash
npm run test:performance
```

## 🚀 Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 8080
CMD ["npm", "run", "mcp:server:production"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  lanka-mcp:
    build: .
    ports: ["8080:8080"]
    environment:
      - NEO4J_URI=neo4j://neo4j:7687
      - VECTOR_DB_URI=http://qdrant:6333
      - REDIS_URI=redis://redis:6379
    depends_on: [neo4j, qdrant, redis]
  
  neo4j:
    image: neo4j:5
    ports: ["7474:7474", "7687:7687"]
    environment: [NEO4J_AUTH=none]
    
  qdrant:
    image: qdrant/qdrant
    ports: ["6333:6333"]
    
  redis:
    image: redis:alpine
    ports: ["6379:6379"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lanka-mcp-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: lanka-mcp
  template:
    metadata:
      labels:
        app: lanka-mcp
    spec:
      containers:
      - name: lanka-mcp
        image: lanka/mcp-server:latest
        ports:
        - containerPort: 8080
        env:
        - name: NEO4J_URI
          value: "neo4j://neo4j-service:7687"
        - name: VECTOR_DB_URI
          value: "http://qdrant-service:6333"
        - name: REDIS_URI
          value: "redis://redis-service:6379"
```

## 🔧 Development

### Local Setup

```bash
git clone <repository>
cd src/modules/memory/mcp
npm install
npm run build
```

### Running Tests

```bash
# Unit tests
npm test

# Integration tests (requires services)
docker-compose up -d
RUN_INTEGRATION_TESTS=true npm test

# Memory-specific tests
npm run mcp:test
```

### Debugging

```bash
# Enable debug logging
DEBUG=lanka:memory:* npm run mcp:server:default

# Or set log level
LOG_LEVEL=debug npm run mcp:server:default
```

## 📚 Examples

See `/examples/mcp-server-usage.ts` for comprehensive examples including:

- Basic server setup
- Client connections
- Memory operations
- Authentication
- Security configuration
- Aggregator mode usage
- Real-time subscriptions
- Batch operations

## 🤝 Contributing

1. Follow existing code patterns
2. Add comprehensive tests
3. Update documentation
4. Ensure security compliance
5. Test with multiple database backends

## 📄 License

MIT License - see main project license file.

## 🆘 Support

- Documentation: `/docs/MCP_SERVER_DOCUMENTATION.md`
- Issues: GitHub Issues
- Examples: `/examples/mcp-server-usage.ts`
- Tests: `/tests/memory/mcp/`