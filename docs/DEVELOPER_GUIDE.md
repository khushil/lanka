# LANKA Developer Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Architecture Overview](#architecture-overview)
3. [Development Workflow](#development-workflow)
4. [Module Development](#module-development)
5. [Testing Strategy](#testing-strategy)
6. [API Documentation](#api-documentation)
7. [Contributing Guidelines](#contributing-guidelines)

## Getting Started

### Prerequisites
- Node.js 18+ 
- Docker and Docker Compose
- Git
- npm or yarn

### Initial Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd lanka
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start infrastructure services**
```bash
docker-compose up -d
```

5. **Initialize the database**
```bash
npm run setup:db
```

6. **Start development server**
```bash
npm run dev
```

The server will be available at `http://localhost:3000`
GraphQL Playground: `http://localhost:3000/graphql`

## Architecture Overview

LANKA follows a modular, graph-based architecture with three core modules:

### Core Infrastructure
- **Neo4j**: Graph database for knowledge storage
- **MongoDB**: Document store for unstructured data
- **Redis**: Caching and session management
- **Elasticsearch**: Full-text search and analytics
- **Kafka**: Event streaming and async processing

### Module Structure
```
src/
├── core/           # Core services (database, logging, auth)
├── modules/        # Feature modules
│   ├── requirements/   # CLAUDE001 - Requirements Intelligence
│   ├── architecture/   # CLAUDE002 - Architecture Intelligence
│   └── development/    # CLAUDE003 - Development Intelligence
├── services/       # Shared services
├── api/           # GraphQL API layer
└── utils/         # Utility functions
```

### Key Design Patterns

1. **Graph-First Data Model**: All entities are nodes with semantic relationships
2. **Service Layer Pattern**: Business logic separated from API layer
3. **Repository Pattern**: Data access abstracted through services
4. **Event-Driven Architecture**: Async processing via Kafka
5. **AI-Native Design**: ML models integrated at service level

## Development Workflow

### Git Workflow

We follow Git Flow with feature branches:

1. **Create feature branch**
```bash
git checkout -b feature/your-feature-name
```

2. **Make changes following TDD/BDD**
- Write tests first
- Implement functionality
- Refactor as needed

3. **Commit with conventional commits**
```bash
git commit -m "feat: Add requirement similarity matching"
git commit -m "fix: Resolve Neo4j connection timeout"
git commit -m "docs: Update API documentation"
```

4. **Push and create PR**
```bash
git push origin feature/your-feature-name
```

5. **After review, merge to master**

### Code Style

- TypeScript with strict mode enabled
- ESLint for linting
- Prettier for formatting
- Follow functional programming principles where appropriate

## Module Development

### Creating a New Service

1. **Define types**
```typescript
// src/modules/yourmodule/types/yourmodule.types.ts
export interface YourEntity {
  id: string;
  // ... properties
}
```

2. **Implement service**
```typescript
// src/modules/yourmodule/services/yourmodule.service.ts
export class YourModuleService {
  constructor(private neo4j: Neo4jService) {}
  
  async create(input: CreateInput): Promise<YourEntity> {
    // Implementation
  }
}
```

3. **Add GraphQL schema**
```typescript
// src/modules/yourmodule/graphql/yourmodule.schema.ts
export const yourModuleTypeDefs = `
  type YourEntity {
    id: ID!
    # ... fields
  }
`;
```

4. **Implement resolvers**
```typescript
// src/modules/yourmodule/graphql/yourmodule.resolvers.ts
export const yourModuleResolvers = {
  Query: {
    yourEntity: async (_, args, context) => {
      // Implementation
    }
  }
};
```

### Working with Neo4j

**Creating nodes:**
```typescript
const query = `
  CREATE (n:NodeType {
    id: $id,
    property: $value
  })
  RETURN n
`;
await neo4j.executeQuery(query, params);
```

**Creating relationships:**
```typescript
const query = `
  MATCH (a:NodeA {id: $aId})
  MATCH (b:NodeB {id: $bId})
  CREATE (a)-[:RELATIONSHIP_TYPE {property: $value}]->(b)
`;
```

**Pattern matching:**
```typescript
const query = `
  MATCH (n:Node)-[:RELATES_TO]->(related)
  WHERE n.property = $value
  RETURN n, collect(related) as relatedNodes
`;
```

## Testing Strategy

### Test Types

1. **Unit Tests**: Test individual functions and services
2. **Integration Tests**: Test API endpoints and database interactions
3. **BDD Tests**: Cucumber scenarios for feature validation
4. **E2E Tests**: Full system workflow testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run BDD tests
npm run test:bdd

# Run specific test file
npm test -- requirements.service.test.ts

# Run in watch mode
npm run test:watch
```

### Writing Tests

**Unit Test Example:**
```typescript
describe('RequirementsService', () => {
  it('should create a requirement', async () => {
    const input = { description: 'Test requirement' };
    const result = await service.createRequirement(input);
    expect(result.id).toBeDefined();
  });
});
```

**BDD Test Example:**
```gherkin
Feature: Requirements Management
  Scenario: Create new requirement
    Given I have a business need
    When I submit the requirement
    Then it should be stored in the graph
```

## API Documentation

### GraphQL Queries

**Get requirement by ID:**
```graphql
query GetRequirement($id: ID!) {
  requirement(id: $id) {
    id
    title
    description
    type
    status
    similarRequirements {
      requirement {
        id
        title
      }
      similarity
    }
  }
}
```

**Find similar requirements:**
```graphql
query FindSimilar($requirementId: ID!) {
  findSimilarRequirements(requirementId: $requirementId) {
    requirement {
      id
      title
    }
    similarity
    adaptationGuidelines
  }
}
```

### GraphQL Mutations

**Create requirement:**
```graphql
mutation CreateRequirement($input: CreateRequirementInput!) {
  createRequirement(input: $input) {
    id
    title
    status
  }
}
```

### REST Endpoints

- `GET /health` - Health check
- `GET /metrics` - System metrics
- `POST /graphql` - GraphQL endpoint

## Contributing Guidelines

### Code Review Checklist

- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Type definitions complete
- [ ] Error handling implemented
- [ ] Logging added for debugging
- [ ] Performance considered
- [ ] Security reviewed

### Performance Considerations

1. **Use indexes on frequently queried properties**
2. **Batch operations when possible**
3. **Implement caching for expensive operations**
4. **Use pagination for large result sets**
5. **Profile and optimize Cypher queries**

### Security Best Practices

1. **Input validation on all user inputs**
2. **Parameterized queries to prevent injection**
3. **Authentication and authorization checks**
4. **Rate limiting on API endpoints**
5. **Sensitive data encryption**
6. **Audit logging for critical operations**

## Debugging

### Enable debug logging:
```typescript
logger.level = 'debug';
```

### Neo4j query debugging:
```typescript
// Enable query logging
NEO4J_DEBUG=true npm run dev
```

### Common Issues

**Neo4j connection issues:**
- Check Docker container is running: `docker ps`
- Verify credentials in `.env`
- Check Neo4j logs: `docker logs lanka-neo4j`

**GraphQL schema errors:**
- Validate schema: `npm run validate:schema`
- Check resolver implementations match schema

## Resources

- [Neo4j Documentation](https://neo4j.com/docs/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing](https://jestjs.io/docs/getting-started)

## Support

For questions or issues:
1. Check existing issues in GitHub
2. Consult team documentation in `/docs`
3. Ask in team Slack channel
4. Create detailed bug report with reproduction steps