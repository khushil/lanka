# LANKA Memory System

The LANKA Memory System is a sophisticated cognitive memory architecture that enhances AI coding assistants with intelligent learning capabilities. It combines Neo4j graph relationships with vector embeddings to create a dual representation that understands both meaning and structure.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    LANKA Memory System                          │
├─────────────────────────────────────────────────────────────────┤
│  Memory Orchestrator (Central Nervous System)                  │
│  ┌─────────────────┬─────────────────┬─────────────────────┐    │
│  │ Ingestion       │ Reasoning       │ Evolution           │    │
│  │ Pipeline        │ Pipeline        │ Engine              │    │
│  └─────────────────┴─────────────────┴─────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│  Memory Arbitration Intelligence (LLM-Powered)                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Similarity Analysis    • Risk Assessment              │    │
│  │ • Quality Gates         • Contradiction Detection       │    │
│  │ • LLM Decision Making   • Audit Trail Generation        │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│  Graph-Vector Hybrid Storage                                   │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│  │   Neo4j      │   Qdrant/    │ PostgreSQL   │   Redis      │  │
│  │  (Graph)     │   Milvus     │  (Audit)     │  (Cache)     │  │
│  │              │ (Vectors)    │              │              │  │
│  └──────────────┴──────────────┴──────────────┴──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Concepts

### Memory Types

1. **System-1 Memories**: Immediate pattern recognition
   - Fast retrieval through vector similarity
   - Coding patterns, best practices, common solutions
   - Optimized for instant recall

2. **System-2 Memories**: Deliberate reasoning processes
   - Step-by-step problem-solving traces
   - Complex debugging workflows
   - Architectural decisions with rationale

3. **Workspace Memories**: Shared team knowledge
   - Project-scoped conventions
   - Agreed-upon patterns
   - Collaborative decisions

### Dual Representation

- **Vector Representation**: Enables semantic search
- **Graph Representation**: Captures relationships and evolution

## Installation & Configuration

### Environment Variables

```bash
# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_DATABASE=lanka_memory
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password

# Vector Database Configuration
VECTOR_PROVIDER=qdrant  # or milvus, pinecone
VECTOR_ENDPOINT=http://localhost:6333
VECTOR_API_KEY=your_api_key_if_needed

# PostgreSQL (Audit Storage)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=lanka_audit
POSTGRES_USERNAME=postgres
POSTGRES_PASSWORD=your_password

# Redis (Caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password

# LLM Configuration
LLM_PROVIDER=openai  # or anthropic, local
LLM_MODEL=gpt-4
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=2048

# Embedding Configuration
EMBEDDING_MODEL=code-bert
EMBEDDING_DIMENSION=768
EMBEDDING_BATCH_SIZE=32
EMBEDDING_CACHE_ENABLED=true

# Quality Gates
MIN_QUALITY_SCORE=0.6
REQUIRED_GATES=novelty,accuracy
REVIEW_THRESHOLD=0.8

# Evolution Engine
EVOLUTION_INTERVAL_HOURS=24
DEPRECATION_THRESHOLD_DAYS=90
MERGE_SIMILARITY_THRESHOLD=0.85
```

### Docker Compose Setup

```yaml
version: '3.8'
services:
  neo4j:
    image: neo4j:5.0
    environment:
      - NEO4J_AUTH=neo4j/your_password
      - NEO4J_dbms_default__database=lanka_memory
    ports:
      - "7474:7474"
      - "7687:7687"
    volumes:
      - neo4j_data:/data

  qdrant:
    image: qdrant/qdrant
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage

  postgres:
    image: postgres:14
    environment:
      - POSTGRES_DB=lanka_audit
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=your_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  neo4j_data:
  qdrant_data:
  postgres_data:
  redis_data:
```

## Usage Examples

### Basic Memory Creation

```typescript
import { MemoryOrchestratorService } from './services/memory-orchestrator.service';

// Inject the service
constructor(private readonly memoryOrchestrator: MemoryOrchestratorService) {}

// Create a System-1 memory (pattern)
const result = await this.memoryOrchestrator.ingestMemory(
  'Use async/await instead of callbacks for better error handling and readability',
  'system1',
  'my-project',
  {
    source: 'code_review',
    tags: ['javascript', 'async', 'best_practice'],
    metadata: {
      pattern: 'async_await_pattern',
      confidence: 0.9
    }
  }
);

console.log('Arbitration result:', result.decision);
```

### Complex Reasoning Memory

```typescript
// Create a System-2 memory (reasoning trace)
const reasoningMemory = await this.memoryOrchestrator.ingestMemory(`
## Debugging Memory Leak in React Component

### Problem
Component re-renders infinitely causing memory usage to spike

### Analysis Steps
1. Used React DevTools Profiler to identify component
2. Found useEffect with missing dependency array
3. Effect was creating new objects on every render
4. Objects weren't being garbage collected

### Solution
Added dependency array and memoized expensive operations:
\`\`\`javascript
const memoizedValue = useMemo(() => expensiveCalculation(data), [data]);
useEffect(() => {
  // side effect
}, [dependency]);
\`\`\`

### Validation
- Memory usage dropped by 80%
- Performance improved significantly
- No more infinite re-renders
`,
  'system2',
  'react-dashboard',
  {
    source: 'debugging',
    tags: ['react', 'memory_leak', 'useEffect', 'performance'],
    metadata: {
      problem: 'memory_leak_react',
      solution_validated: true,
      performance_impact: 'high'
    }
  }
);
```

### Memory Search

```typescript
// Semantic search across all memories
const searchResults = await this.memoryOrchestrator.searchMemories({
  text: 'react performance optimization',
  workspace: 'react-dashboard',
  type: ['system1', 'system2'],
  minConfidence: 0.7,
  limit: 10
});

searchResults.forEach(result => {
  console.log(`Score: ${result.score.toFixed(3)}`);
  console.log(`Memory: ${result.memory.content.substring(0, 100)}...`);
  console.log(`Relevance: Semantic=${result.relevance.semantic.toFixed(3)}, Structural=${result.relevance.structural.toFixed(3)}`);
});
```

### Batch Memory Creation

```typescript
const memories = [
  {
    content: 'Always validate user input at API boundaries',
    type: 'system1' as const,
    workspace: 'api-service',
    context: {
      source: 'security_review',
      tags: ['security', 'validation', 'api']
    }
  },
  {
    content: 'Use TypeScript strict mode for better type safety',
    type: 'system1' as const,
    workspace: 'api-service',
    context: {
      source: 'code_review',
      tags: ['typescript', 'type_safety']
    }
  }
];

const batchResults = await this.memoryOrchestrator.batchIngestMemories(memories);
console.log(`Processed ${batchResults.length} memories`);
```

### Evolution and Analytics

```typescript
// Trigger evolution for a specific memory
await this.memoryOrchestrator.evolveMemory('memory_id_123');

// Get workspace analytics
const analytics = await this.memoryOrchestrator.getMemoryAnalytics('my-project');
console.log('Total memories:', analytics.totalMemories);
console.log('Quality distribution:', analytics.qualityDistribution);

// Health check
const health = await this.memoryOrchestrator.healthCheck();
console.log('System status:', health.status);
```

## API Endpoints

### Memory Management

```http
# Create memory
POST /memory
Content-Type: application/json
{
  "content": "Memory content here",
  "type": "system1",
  "workspace": "my-project",
  "source": "conversation",
  "tags": ["javascript", "async"]
}

# Search memories
GET /memory/search?text=async%20patterns&workspace=my-project&limit=10

# Get specific memory
GET /memory/{id}

# Trigger evolution
PUT /memory/{id}/evolve
```

### Analytics & Monitoring

```http
# Get analytics
GET /memory/analytics/my-project

# Audit events
GET /memory/audit/events?workspace=my-project&eventType=arbitration

# Health check
GET /memory/health

# Compliance report
GET /memory/audit/compliance/my-project?startDate=2024-01-01&endDate=2024-02-01
```

## Quality Gates Configuration

Quality gates ensure only valuable memories enter the system:

```typescript
const qualityGates = [
  {
    name: 'novelty',
    threshold: 0.4,
    weight: 0.25,
    required: true,
    validator: {
      type: 'rule_based',
      config: { minLength: 10, requiresEvidence: false }
    }
  },
  {
    name: 'accuracy',
    threshold: 0.5,
    weight: 0.30,
    required: true,
    validator: {
      type: 'llm_assessment',
      config: { temperature: 0.3 }
    }
  }
];
```

## Memory Evolution

The Evolution Engine continuously improves memory quality:

- **Usage Analysis**: Tracks access patterns and success rates
- **Contradiction Detection**: Identifies conflicting memories
- **Merge Opportunities**: Finds similar memories that could be combined
- **Strength Updates**: Adjusts memory importance based on usage
- **Deprecation**: Removes outdated or unused memories

## Audit & Compliance

Every operation is audited for transparency:

```typescript
// Query audit events
const auditEvents = await auditService.queryAuditEvents({
  workspace: 'my-project',
  eventType: ['arbitration', 'evolution'],
  startDate: new Date('2024-01-01'),
  limit: 100
});

// Generate compliance report
const report = await auditService.generateComplianceReport(
  'my-project',
  startDate,
  endDate
);
```

## Best Practices

### Memory Content Guidelines

1. **Be Specific**: Include context and reasoning
2. **Add Examples**: Show practical usage
3. **Include Validation**: Mention testing or verification
4. **Structure Well**: Use headings, bullets, code blocks
5. **Tag Appropriately**: Use relevant, consistent tags

### Workspace Organization

- Use consistent workspace naming
- Scope memories appropriately
- Set up proper access controls
- Regular evolution analysis
- Monitor quality trends

### Performance Optimization

- Enable embedding caching
- Use appropriate batch sizes
- Regular cleanup of old audit events
- Monitor memory usage
- Optimize vector indices

## Troubleshooting

### Common Issues

1. **Low Quality Scores**: Review content structure and add more detail
2. **Poor Search Results**: Check embedding model and vector indices
3. **Slow Performance**: Enable caching and optimize batch sizes
4. **Storage Issues**: Monitor disk space and connection health

### Debugging Tools

```typescript
// Cache statistics
const stats = await embeddingService.getCacheStats();

// Health diagnostics
const health = await memoryOrchestrator.healthCheck();

// Audit query for debugging
const events = await auditService.queryAuditEvents({
  outcome: ['failure'],
  limit: 50
});
```

## Contributing

The memory system is designed to be extensible through:

- Custom quality validators
- Additional embedding models
- New evolution strategies
- Plugin architecture for domain-specific logic

## Security Considerations

- Input validation at all entry points
- Workspace isolation enforcement
- Sensitive information detection
- Audit trail integrity
- Access control integration

## License

This module is part of the LANKA system and follows the same licensing terms.