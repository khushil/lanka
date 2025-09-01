# LANKA Memory System - Integration Guide

## 📋 Overview

This guide provides comprehensive instructions for integrating the LANKA Memory System with existing modules (Requirements, Architecture, and Development Intelligence).

## 🔗 Integration Points

### 1. Requirements Intelligence Integration

#### Memory Capture from Requirements

```typescript
// src/modules/requirements/services/requirements.service.ts

import { MemoryOrchestrator } from '@modules/memory';

export class RequirementsService {
  constructor(
    private memoryOrchestrator: MemoryOrchestrator
  ) {}

  async createRequirement(input: CreateRequirementInput): Promise<Requirement> {
    // Existing requirement creation logic
    const requirement = await this.neo4j.create(input);
    
    // Capture requirement patterns as memories
    await this.captureRequirementMemory(requirement);
    
    return requirement;
  }

  private async captureRequirementMemory(requirement: Requirement) {
    // Extract patterns from requirement
    const patterns = await this.extractPatterns(requirement);
    
    // Store as System-2 memory (deliberate reasoning)
    for (const pattern of patterns) {
      await this.memoryOrchestrator.ingestMemory({
        content: pattern.description,
        type: 'system2',
        metadata: {
          source: 'requirements',
          requirementId: requirement.id,
          project: requirement.projectId,
          confidence: pattern.confidence
        },
        workspace: requirement.workspaceId,
        tags: ['requirement-pattern', ...pattern.tags]
      });
    }
  }

  async findSimilarRequirements(requirementId: string): Promise<SimilarRequirement[]> {
    const requirement = await this.findById(requirementId);
    
    // Use memory system for enhanced similarity search
    const memories = await this.memoryOrchestrator.searchMemories({
      query: requirement.description,
      searchType: 'hybrid',
      filters: {
        type: 'system2',
        tags: ['requirement-pattern']
      },
      limit: 10
    });
    
    // Map memories back to requirements
    return this.mapMemoriesToRequirements(memories);
  }
}
```

#### GraphQL Schema Extension

```graphql
# src/modules/requirements/graphql/requirements.schema.ts

extend type Requirement {
  # Memory-enhanced fields
  relatedMemories: [Memory!]!
  learnedPatterns: [Pattern!]!
  adaptationSuggestions: [Suggestion!]!
}

extend type Query {
  # Memory-enhanced queries
  searchRequirementsWithMemory(
    query: String!
    useMemory: Boolean = true
  ): [Requirement!]!
}
```

### 2. Architecture Intelligence Integration

#### Architecture Decision Memory Formation

```typescript
// src/modules/architecture/services/architecture.service.ts

import { MemoryOrchestrator } from '@modules/memory';
import { MemoryVersionControl } from '@modules/memory/version-control';

export class ArchitectureService {
  constructor(
    private memoryOrchestrator: MemoryOrchestrator,
    private memoryVersionControl: MemoryVersionControl
  ) {}

  async createArchitectureDecision(input: CreateArchitectureDecisionInput): Promise<ArchitectureDecision> {
    const decision = await this.neo4j.create(input);
    
    // Create versioned memory for architecture decision
    const memory = await this.createArchitectureMemory(decision);
    
    // Create memory branch for this architectural context
    await this.memoryVersionControl.createBranch(
      `architecture/${decision.id}`,
      memory.commitId
    );
    
    return decision;
  }

  private async createArchitectureMemory(decision: ArchitectureDecision) {
    // Store architectural patterns as System-2 memories
    const memory = await this.memoryOrchestrator.ingestMemory({
      content: this.formatArchitecturalKnowledge(decision),
      type: 'system2',
      metadata: {
        source: 'architecture',
        decisionId: decision.id,
        patterns: decision.patterns.map(p => p.id),
        rationale: decision.rationale,
        tradeoffs: decision.tradeoffs
      },
      workspace: decision.workspaceId,
      tags: ['architecture-decision', ...decision.tags]
    });

    // Create relationships in the graph
    await this.createMemoryRelationships(memory, decision);
    
    return memory;
  }

  async recommendPatterns(context: ArchitectureContext): Promise<PatternRecommendation[]> {
    // Search memories for relevant patterns
    const memories = await this.memoryOrchestrator.searchMemories({
      query: this.buildPatternQuery(context),
      searchType: 'graph', // Use graph traversal for pattern relationships
      filters: {
        tags: ['architecture-pattern'],
        workspace: context.workspaceId
      },
      depth: 2 // Traverse related patterns
    });

    // Use memory evolution data for ranking
    const evolvedMemories = await Promise.all(
      memories.map(m => this.memoryOrchestrator.getMemoryEvolution(m.id))
    );

    return this.rankPatternsByEvolution(memories, evolvedMemories);
  }
}
```

### 3. Development Intelligence Integration

#### Code Generation with Memory Enhancement

```typescript
// src/modules/development/services/code-generation.service.ts

import { MemoryOrchestrator } from '@modules/memory';
import { MemoryPlugin } from '@modules/memory/plugins';

export class CodeGenerationService {
  constructor(
    private memoryOrchestrator: MemoryOrchestrator,
    private pluginManager: PluginManager
  ) {}

  async generateCode(spec: CodeSpecification): Promise<GeneratedCode> {
    // Search for relevant code patterns in memory
    const codePatterns = await this.searchCodePatterns(spec);
    
    // Enhance specification with learned patterns
    const enhancedSpec = this.enhanceWithMemories(spec, codePatterns);
    
    // Generate code with memory context
    const code = await this.aiGenerator.generate(enhancedSpec);
    
    // Store successful generation as System-1 memory
    await this.storeCodeMemory(spec, code);
    
    // Trigger plugin analysis
    await this.pluginManager.emit('code-generated', { spec, code });
    
    return code;
  }

  private async searchCodePatterns(spec: CodeSpecification): Promise<Memory[]> {
    return this.memoryOrchestrator.searchMemories({
      query: `${spec.language} ${spec.framework} ${spec.functionality}`,
      searchType: 'hybrid',
      filters: {
        type: 'system1', // Fast pattern retrieval
        tags: ['code-pattern', spec.language]
      },
      limit: 20
    });
  }

  private async storeCodeMemory(spec: CodeSpecification, code: GeneratedCode) {
    // Only store high-quality code as memories
    if (code.qualityScore > 0.8) {
      await this.memoryOrchestrator.ingestMemory({
        content: this.extractCodePattern(code),
        type: 'system1',
        metadata: {
          source: 'code-generation',
          language: spec.language,
          framework: spec.framework,
          qualityScore: code.qualityScore,
          usage: 'template'
        },
        workspace: spec.workspaceId,
        tags: ['code-pattern', spec.language, ...spec.tags]
      });
    }
  }
}
```

#### Testing Intelligence with Memory

```typescript
// src/modules/development/services/testing-intelligence.service.ts

export class TestingIntelligenceService {
  constructor(
    private memoryOrchestrator: MemoryOrchestrator,
    private federationService: FederationService
  ) {}

  async generateTestCases(code: string): Promise<TestCase[]> {
    // Search for test patterns in local and federated memories
    const localPatterns = await this.searchTestPatterns(code, 'local');
    const federatedPatterns = await this.searchTestPatterns(code, 'federated');
    
    // Combine and rank patterns
    const patterns = this.combinePatterns(localPatterns, federatedPatterns);
    
    // Generate test cases based on patterns
    const testCases = await this.generateFromPatterns(code, patterns);
    
    // Learn from generated tests
    await this.learnFromTests(testCases);
    
    return testCases;
  }

  private async searchTestPatterns(code: string, source: 'local' | 'federated') {
    if (source === 'federated') {
      // Use federated learning for global patterns
      return this.federationService.searchGlobalPatterns({
        query: this.extractTestContext(code),
        type: 'test-pattern'
      });
    }
    
    return this.memoryOrchestrator.searchMemories({
      query: this.extractTestContext(code),
      searchType: 'semantic',
      filters: {
        tags: ['test-pattern']
      }
    });
  }

  private async learnFromTests(testCases: TestCase[]) {
    // Store successful test patterns as memories
    const successfulTests = testCases.filter(t => t.executionResult?.passed);
    
    for (const test of successfulTests) {
      await this.memoryOrchestrator.ingestMemory({
        content: this.formatTestPattern(test),
        type: 'system1',
        metadata: {
          source: 'test-generation',
          testType: test.type,
          coverage: test.coverage,
          effectiveness: test.effectiveness
        },
        tags: ['test-pattern', test.framework]
      });
    }
  }
}
```

### 4. Cross-Module Integration Service

```typescript
// src/services/memory-integration.service.ts

import { MemoryOrchestrator } from '@modules/memory';
import { RequirementsService } from '@modules/requirements';
import { ArchitectureService } from '@modules/architecture';
import { DevelopmentService } from '@modules/development';

@Injectable()
export class MemoryIntegrationService {
  constructor(
    private memory: MemoryOrchestrator,
    private requirements: RequirementsService,
    private architecture: ArchitectureService,
    private development: DevelopmentService
  ) {}

  /**
   * Create memories from complete workflow
   */
  async captureWorkflowKnowledge(workflowId: string): Promise<void> {
    const workflow = await this.getWorkflow(workflowId);
    
    // Extract knowledge from each phase
    const requirementPatterns = await this.extractRequirementPatterns(workflow);
    const architectureDecisions = await this.extractArchitectureDecisions(workflow);
    const codeImplementations = await this.extractCodeImplementations(workflow);
    
    // Create interconnected memories
    await this.createInterconnectedMemories({
      requirements: requirementPatterns,
      architecture: architectureDecisions,
      code: codeImplementations
    });
    
    // Evolve existing memories based on new knowledge
    await this.evolveRelatedMemories(workflow);
  }

  /**
   * Enhanced search across all modules using memory
   */
  async intelligentSearch(query: string, context: SearchContext): Promise<SearchResults> {
    // Search memories first for learned patterns
    const memories = await this.memory.searchMemories({
      query,
      searchType: 'hybrid',
      workspace: context.workspace
    });
    
    // Use memories to enhance module-specific searches
    const enhancedQuery = this.enhanceQueryWithMemories(query, memories);
    
    // Parallel search across modules
    const [requirements, architecture, code] = await Promise.all([
      this.requirements.search(enhancedQuery),
      this.architecture.search(enhancedQuery),
      this.development.search(enhancedQuery)
    ]);
    
    // Rank results using memory relationships
    return this.rankWithMemoryContext(requirements, architecture, code, memories);
  }

  /**
   * Automated learning from successful projects
   */
  async learnFromProject(projectId: string): Promise<LearningReport> {
    const project = await this.getProject(projectId);
    
    // Identify successful patterns
    const successPatterns = await this.identifySuccessPatterns(project);
    
    // Create high-quality memories
    const memories = await Promise.all(
      successPatterns.map(pattern => 
        this.memory.ingestMemory({
          content: pattern.description,
          type: pattern.isReusable ? 'system1' : 'system2',
          metadata: {
            projectId,
            successMetrics: pattern.metrics,
            applicability: pattern.applicability
          },
          workspace: project.workspace,
          tags: pattern.tags
        })
      )
    );
    
    // Share valuable patterns through federation
    if (project.shareLearnings) {
      await this.federateValuableMemories(memories);
    }
    
    return {
      memoriesCreated: memories.length,
      patternsIdentified: successPatterns.length,
      federationStatus: project.shareLearnings ? 'shared' : 'local'
    };
  }
}
```

## 🔄 Event-Driven Integration

### Memory Event Listeners

```typescript
// src/modules/memory/events/memory-events.ts

export enum MemoryEvents {
  MEMORY_CREATED = 'memory.created',
  MEMORY_UPDATED = 'memory.updated',
  MEMORY_EVOLVED = 'memory.evolved',
  MEMORY_FEDERATED = 'memory.federated',
  CONFLICT_DETECTED = 'memory.conflict.detected',
  PATTERN_EMERGED = 'memory.pattern.emerged'
}

// src/app.module.ts

@Module({
  imports: [
    MemoryModule,
    RequirementsModule,
    ArchitectureModule,
    DevelopmentModule
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: (eventBus: EventBus) => () => {
        // Register cross-module event handlers
        eventBus.on(MemoryEvents.PATTERN_EMERGED, async (event) => {
          // Notify relevant modules about new patterns
          await notifyModulesAboutPattern(event.pattern);
        });
        
        eventBus.on(RequirementEvents.REQUIREMENT_APPROVED, async (event) => {
          // Create memory from approved requirement
          await createRequirementMemory(event.requirement);
        });
        
        eventBus.on(DevelopmentEvents.CODE_DEPLOYED, async (event) => {
          // Learn from successful deployment
          await learnFromDeployment(event.deployment);
        });
      },
      deps: [EventBus]
    }
  ]
})
export class AppModule {}
```

## 🗄️ Database Schema Integration

### Neo4j Schema Extensions

```cypher
// Add Memory nodes and relationships to existing schema

// Create Memory node type
CREATE CONSTRAINT memory_id_unique ON (m:Memory) ASSERT m.id IS UNIQUE;
CREATE INDEX memory_embedding ON :Memory(embedding);
CREATE INDEX memory_workspace ON :Memory(workspace);

// Relationships between existing nodes and memories
// Requirement -> Memory
CREATE (r:Requirement)-[:GENERATES_MEMORY]->(m:Memory)
CREATE (r:Requirement)-[:USES_MEMORY]->(m:Memory)

// ArchitectureDecision -> Memory
CREATE (ad:ArchitectureDecision)-[:CREATES_MEMORY]->(m:Memory)
CREATE (ad:ArchitectureDecision)-[:INFORMED_BY_MEMORY]->(m:Memory)

// CodeComponent -> Memory
CREATE (cc:CodeComponent)-[:PRODUCES_MEMORY]->(m:Memory)
CREATE (cc:CodeComponent)-[:BASED_ON_MEMORY]->(m:Memory)

// Memory -> Memory relationships
CREATE (m1:Memory)-[:EVOLVED_FROM]->(m2:Memory)
CREATE (m1:Memory)-[:SIMILAR_TO {score: 0.95}]->(m2:Memory)
CREATE (m1:Memory)-[:CONTRADICTS]->(m2:Memory)
CREATE (m1:Memory)-[:DEPENDS_ON]->(m2:Memory)
```

## 🚀 Migration Strategy

### Phase 1: Non-Invasive Integration (Week 1-2)
1. Deploy memory system alongside existing modules
2. Add event listeners without modifying existing code
3. Begin capturing memories from existing operations
4. Monitor memory quality and system performance

### Phase 2: Read Integration (Week 3-4)
1. Add memory search to existing search operations
2. Enhance recommendations with memory context
3. Display memory insights in UI (optional)
4. Measure improvement in search relevance

### Phase 3: Write Integration (Week 5-6)
1. Modify services to create memories
2. Implement memory-based validations
3. Add memory evolution triggers
4. Enable cross-module memory sharing

### Phase 4: Advanced Features (Week 7-8)
1. Enable plugin system
2. Activate federated learning
3. Implement version control workflows
4. Deploy production monitoring

## 📊 Integration Testing

### Test Scenarios

```typescript
// tests/integration/memory-integration.spec.ts

describe('Memory System Integration', () => {
  it('should capture memories from requirement creation', async () => {
    // Create requirement
    const requirement = await requirementsService.create({
      description: 'User authentication with MFA'
    });
    
    // Verify memory was created
    const memories = await memoryService.search({
      query: 'authentication MFA',
      filters: { source: 'requirements' }
    });
    
    expect(memories).toHaveLength(1);
    expect(memories[0].metadata.requirementId).toBe(requirement.id);
  });

  it('should enhance architecture recommendations with memories', async () => {
    // Create memories from previous projects
    await createTestMemories([
      { content: 'Microservices work well for this scale', tags: ['architecture'] },
      { content: 'Event-driven patterns reduce coupling', tags: ['architecture'] }
    ]);
    
    // Get recommendations
    const recommendations = await architectureService.recommendPatterns({
      scale: 'large',
      requirements: ['scalability', 'maintainability']
    });
    
    // Verify memory enhancement
    expect(recommendations).toContainEqual(
      expect.objectContaining({ source: 'memory' })
    );
  });

  it('should federate valuable memories across instances', async () => {
    // Create high-value memory
    const memory = await memoryService.create({
      content: 'Critical security pattern',
      quality: { score: 0.95 }
    });
    
    // Trigger federation
    await federationService.shareMemory(memory.id);
    
    // Verify on federated instance
    const federatedMemories = await federatedInstance.search({
      query: 'security pattern'
    });
    
    expect(federatedMemories).toContainEqual(
      expect.objectContaining({ federationId: memory.id })
    );
  });
});
```

## 🔧 Configuration

### Module Configuration

```typescript
// src/config/memory.config.ts

export const memoryConfig = {
  // Integration settings
  integration: {
    requirements: {
      enabled: true,
      capturePatterns: true,
      enhanceSearch: true
    },
    architecture: {
      enabled: true,
      captureDecisions: true,
      enhanceRecommendations: true
    },
    development: {
      enabled: true,
      captureCode: true,
      enhanceGeneration: true
    }
  },
  
  // Memory creation thresholds
  thresholds: {
    requirements: {
      minComplexity: 0.6,
      minNovelty: 0.3
    },
    architecture: {
      minImpact: 0.7,
      minConfidence: 0.8
    },
    development: {
      minQuality: 0.75,
      minReusability: 0.6
    }
  },
  
  // Federation settings
  federation: {
    enabled: true,
    shareThreshold: 0.85,
    privacyLevel: 'strict'
  }
};
```

## 📈 Monitoring Integration

### Metrics to Track

```typescript
// src/monitoring/memory-metrics.ts

export const memoryMetrics = {
  // Memory creation metrics
  memoriesCreatedByModule: new Counter({
    name: 'memories_created_total',
    labelNames: ['module', 'type']
  }),
  
  // Memory usage metrics
  memorySearchesByModule: new Counter({
    name: 'memory_searches_total',
    labelNames: ['module', 'search_type']
  }),
  
  // Memory effectiveness
  memoryHitRate: new Gauge({
    name: 'memory_hit_rate',
    labelNames: ['module']
  }),
  
  // Cross-module metrics
  crossModuleMemoryUsage: new Counter({
    name: 'cross_module_memory_usage',
    labelNames: ['source_module', 'target_module']
  })
};
```

## 🎯 Success Criteria

Integration is successful when:
- ✅ All modules create relevant memories automatically
- ✅ Search operations show 25%+ improvement in relevance
- ✅ Pattern recommendations improve by 30%+
- ✅ Code generation quality increases by 20%+
- ✅ New developer onboarding time reduces by 40%+
- ✅ Cross-module insights lead to architectural improvements
- ✅ Federation enables learning from other teams

## 📖 Additional Resources

- [Memory System Overview](./MEMORY_SYSTEM_OVERVIEW.md)
- [API Reference](./API_REFERENCE.md)
- [Plugin Development](./plugins/PLUGIN_GUIDE.md)
- [Federation Protocol](./federation/PROTOCOL.md)

---

**Version**: 1.0.0  
**Last Updated**: 2025-09-01  
**Integration Status**: Ready for Production