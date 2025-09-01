import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { LANKAMemoryIntegration } from '../../../src/integration/lanka-memory-integration';
import { StorageMocks } from '../../mocks/storage-mocks';
import { MemoryFixtures } from '../../fixtures/memory-fixtures';
import { MemoryType } from '../../../src/types/memory';

describe('LANKA Memory Integration', () => {
  let integration: LANKAMemoryIntegration;
  let mockLankaCore: any;
  let mockMemoryOrchestrator: any;
  let mockEventBus: any;

  beforeEach(async () => {
    mockLankaCore = {
      getKnowledgeGraph: jest.fn(),
      addNode: jest.fn(),
      addRelationship: jest.fn(),
      executeQuery: jest.fn(),
      getArchitecturalPatterns: jest.fn(),
      generateCodeStructure: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
    };

    mockMemoryOrchestrator = {
      ingestMemory: jest.fn(),
      searchMemories: jest.fn(),
      getRelatedMemories: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
    };

    mockEventBus = {
      on: jest.fn(),
      emit: jest.fn(),
      subscribe: jest.fn(),
    };

    integration = new LANKAMemoryIntegration({
      lankaCore: mockLankaCore,
      memoryOrchestrator: mockMemoryOrchestrator,
      eventBus: mockEventBus,
    });

    await integration.initialize();
  });

  afterEach(async () => {
    await integration.shutdown();
    jest.clearAllMocks();
  });

  describe('Knowledge Graph Integration', () => {
    it('should extend LANKA graph with memory nodes', async () => {
      // Arrange
      const existingGraph = {
        nodes: [
          { id: 'arch_001', type: 'ARCHITECTURE', properties: { name: 'microservices' } },
          { id: 'pattern_001', type: 'PATTERN', properties: { name: 'event-sourcing' } },
        ],
        relationships: [
          { id: 'rel_001', from: 'arch_001', to: 'pattern_001', type: 'USES' },
        ]
      };

      const memories = [
        MemoryFixtures.createSystem1Memory({
          id: 'mem_001',
          content: 'Microservices should use event sourcing for data consistency',
        }),
        MemoryFixtures.createSystem2Memory({
          id: 'mem_002',
          content: 'Debugging distributed transactions in event-sourced systems',
        }),
      ];

      mockLankaCore.getKnowledgeGraph.mockResolvedValue(existingGraph);
      mockMemoryOrchestrator.searchMemories.mockResolvedValue({
        memories,
        total: 2,
      });

      // Act
      await integration.extendGraphWithMemories();

      // Assert
      expect(mockLankaCore.addNode).toHaveBeenCalledTimes(2);
      expect(mockLankaCore.addNode).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mem_001',
          type: 'MEMORY',
          subtype: 'SYSTEM_1',
          properties: expect.objectContaining({
            content: memories[0].content,
          })
        })
      );

      expect(mockLankaCore.addRelationship).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'mem_001',
          to: 'arch_001',
          type: 'RELATES_TO',
          properties: { confidence: expect.any(Number) }
        })
      );
    });

    it('should query memories when LANKA generates architecture', async () => {
      // Arrange
      const architectureRequest = {
        domain: 'e-commerce',
        requirements: ['scalability', 'consistency', 'performance'],
        context: 'microservices',
      };

      const relevantMemories = [
        MemoryFixtures.createSystem2Memory({
          content: 'E-commerce scaling: implement CQRS pattern for read/write separation',
        }),
        MemoryFixtures.createWorkspaceMemory({
          content: 'Team decision: use PostgreSQL for transactional data, Redis for caching',
        }),
      ];

      mockMemoryOrchestrator.searchMemories.mockResolvedValue({
        memories: relevantMemories,
        total: 2,
      });

      mockLankaCore.generateCodeStructure.mockResolvedValue({
        structure: { /* architecture result */ },
        confidence: 0.85,
      });

      // Act
      const result = await integration.enhanceArchitectureGeneration(architectureRequest);

      // Assert
      expect(mockMemoryOrchestrator.searchMemories).toHaveBeenCalledWith(
        expect.stringContaining('e-commerce'),
        expect.objectContaining({
          type: MemoryType.SYSTEM_2,
        })
      );

      expect(mockLankaCore.generateCodeStructure).toHaveBeenCalledWith(
        expect.objectContaining({
          ...architectureRequest,
          memoryContext: relevantMemories,
        })
      );

      expect(result.enhanced).toBe(true);
      expect(result.memoryInfluence).toBe(2);
    });

    it('should create memories from LANKA architectural decisions', async () => {
      // Arrange
      const architecturalDecision = {
        id: 'arch_decision_001',
        type: 'pattern_selection',
        pattern: 'Event Sourcing',
        rationale: 'Provides audit trail and temporal querying capabilities',
        context: {
          domain: 'financial-services',
          requirements: ['auditability', 'eventual-consistency'],
        },
        confidence: 0.92,
        metadata: {
          generated_by: 'lanka-v2',
          timestamp: new Date(),
        }
      };

      mockMemoryOrchestrator.ingestMemory.mockResolvedValue({
        success: true,
        memory: expect.any(Object),
        action: 'ADD_NEW',
      });

      // Act
      await integration.captureArchitecturalDecision(architecturalDecision);

      // Assert
      expect(mockMemoryOrchestrator.ingestMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MemoryType.SYSTEM_2,
          content: expect.stringContaining('Event Sourcing'),
          metadata: expect.objectContaining({
            source: 'lanka-architecture',
            confidence: 0.92,
            domain: 'financial-services',
          })
        })
      );
    });
  });

  describe('Pattern Recognition Integration', () => {
    it('should learn from LANKA pattern applications', async () => {
      // Arrange
      const patternApplication = {
        pattern: 'Factory Method',
        context: {
          language: 'TypeScript',
          domain: 'user-management',
          codeStructure: {
            classes: ['UserFactory', 'AdminUser', 'RegularUser'],
            interfaces: ['User'],
          }
        },
        outcome: {
          success: true,
          metrics: {
            codeQuality: 0.88,
            maintainability: 0.91,
            testability: 0.85,
          }
        }
      };

      mockMemoryOrchestrator.ingestMemory.mockResolvedValue({
        success: true,
        memory: expect.any(Object),
        action: 'ADD_NEW',
      });

      // Act
      await integration.learnFromPatternApplication(patternApplication);

      // Assert
      expect(mockMemoryOrchestrator.ingestMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MemoryType.SYSTEM_1,
          content: expect.stringContaining('Factory Method'),
          metadata: expect.objectContaining({
            pattern: 'Factory Method',
            language: 'TypeScript',
            outcome: 'successful',
            qualityMetrics: patternApplication.outcome.metrics,
          })
        })
      );
    });

    it('should suggest patterns based on memory analysis', async () => {
      // Arrange
      const codeContext = {
        language: 'Java',
        domain: 'payment-processing',
        currentCode: 'class PaymentProcessor { /* ... */ }',
        requirements: ['extensibility', 'testability'],
      };

      const patternMemories = [
        MemoryFixtures.createSystem1Memory({
          content: 'Strategy pattern excellent for payment processing extensibility',
          metadata: {
            ...MemoryFixtures.createSystem1Memory().metadata,
            pattern: 'Strategy',
            domain: 'payment-processing',
            tags: ['extensibility', 'payments'],
          }
        }),
        MemoryFixtures.createSystem2Memory({
          content: 'Implemented Strategy pattern for payment methods, improved testability by 40%',
          metadata: {
            ...MemoryFixtures.createSystem2Memory().metadata,
            pattern: 'Strategy',
            outcome: 'successful',
            metrics: { testability: 0.9 },
          }
        }),
      ];

      mockMemoryOrchestrator.searchMemories.mockResolvedValue({
        memories: patternMemories,
        total: 2,
      });

      mockLankaCore.getArchitecturalPatterns.mockResolvedValue([
        { name: 'Strategy', confidence: 0.95, applicability: 'high' },
        { name: 'Factory', confidence: 0.7, applicability: 'medium' },
      ]);

      // Act
      const suggestions = await integration.suggestPatternsWithMemory(codeContext);

      // Assert
      expect(mockMemoryOrchestrator.searchMemories).toHaveBeenCalledWith(
        expect.stringContaining('payment-processing'),
        expect.objectContaining({
          tags: expect.arrayContaining(['extensibility']),
        })
      );

      expect(suggestions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            pattern: 'Strategy',
            confidence: expect.any(Number),
            memorySupport: 2,
            reasoning: expect.any(String),
          })
        ])
      );
    });
  });

  describe('Cross-Module Memory Sharing', () => {
    it('should share architectural insights between modules', async () => {
      // Arrange
      const architecturalInsight = {
        module: 'database-layer',
        insight: {
          pattern: 'Repository with Unit of Work',
          context: 'ORM abstraction for complex queries',
          benefits: ['testability', 'maintainability', 'performance'],
          implementation: {
            interfaces: ['Repository<T>', 'UnitOfWork'],
            classes: ['GenericRepository', 'DatabaseUnitOfWork'],
          }
        }
      };

      const relatedModules = ['service-layer', 'api-layer'];

      mockMemoryOrchestrator.searchMemories.mockResolvedValue({
        memories: [],
        total: 0,
      });

      mockMemoryOrchestrator.ingestMemory.mockResolvedValue({
        success: true,
        memory: expect.any(Object),
        action: 'ADD_NEW',
      });

      // Act
      await integration.shareArchitecturalInsight(architecturalInsight, relatedModules);

      // Assert
      expect(mockMemoryOrchestrator.ingestMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MemoryType.WORKSPACE,
          content: expect.stringContaining('Repository with Unit of Work'),
          metadata: expect.objectContaining({
            sourceModule: 'database-layer',
            applicableModules: relatedModules,
            insightType: 'architectural-pattern',
          })
        })
      );
    });

    it('should detect memory conflicts across modules', async () => {
      // Arrange
      const conflictingMemories = [
        MemoryFixtures.createWorkspaceMemory({
          id: 'module_a_mem',
          content: 'Always use synchronous database operations for data consistency',
          metadata: {
            ...MemoryFixtures.createWorkspaceMemory().metadata,
            sourceModule: 'module-a',
            workspace: 'shared',
          }
        }),
        MemoryFixtures.createWorkspaceMemory({
          id: 'module_b_mem',
          content: 'Use asynchronous database operations for better performance',
          metadata: {
            ...MemoryFixtures.createWorkspaceMemory().metadata,
            sourceModule: 'module-b',
            workspace: 'shared',
          }
        }),
      ];

      mockMemoryOrchestrator.searchMemories.mockResolvedValue({
        memories: conflictingMemories,
        total: 2,
      });

      // Act
      const conflicts = await integration.detectCrossModuleConflicts('shared');

      // Assert
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toEqual(
        expect.objectContaining({
          type: 'cross-module-conflict',
          modules: ['module-a', 'module-b'],
          conflictType: 'contradictory-practices',
          severity: 'medium',
        })
      );
    });
  });

  describe('Event-Driven Coordination', () => {
    it('should handle LANKA code generation events', async () => {
      // Arrange
      const codeGenerationEvent = {
        type: 'code-generated',
        data: {
          request: {
            functionality: 'user authentication',
            patterns: ['Factory', 'Strategy'],
          },
          generated: {
            files: ['AuthFactory.ts', 'AuthStrategy.ts'],
            structure: { /* code structure */ },
            patterns_used: ['Factory', 'Strategy'],
          },
          quality: {
            score: 0.87,
            metrics: {
              complexity: 'medium',
              testability: 'high',
              maintainability: 'high',
            }
          }
        }
      };

      mockMemoryOrchestrator.ingestMemory.mockResolvedValue({
        success: true,
        memory: expect.any(Object),
        action: 'ADD_NEW',
      });

      // Simulate event emission
      const eventHandler = mockEventBus.on.mock.calls.find(
        call => call[0] === 'lanka:code-generated'
      )?.[1];

      // Act
      if (eventHandler) {
        await eventHandler(codeGenerationEvent);
      }

      // Assert
      expect(mockMemoryOrchestrator.ingestMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MemoryType.SYSTEM_2,
          content: expect.stringContaining('user authentication'),
          metadata: expect.objectContaining({
            source: 'lanka-generation',
            patterns_used: ['Factory', 'Strategy'],
            quality_score: 0.87,
          })
        })
      );
    });

    it('should enhance memory searches with LANKA context', async () => {
      // Arrange
      const memorySearchEvent = {
        type: 'memory-search',
        data: {
          query: 'database connection patterns',
          context: {
            currentProject: 'e-commerce-api',
            activeModules: ['user-service', 'order-service'],
            technologies: ['TypeScript', 'PostgreSQL', 'Redis'],
          }
        }
      };

      const contextualMemories = [
        MemoryFixtures.createSystem1Memory({
          content: 'Database connection pooling for high-traffic applications',
        }),
        MemoryFixtures.createSystem2Memory({
          content: 'Implemented connection pool for e-commerce, reduced latency by 30%',
        }),
      ];

      mockMemoryOrchestrator.searchMemories.mockResolvedValue({
        memories: contextualMemories,
        total: 2,
      });

      mockLankaCore.executeQuery.mockResolvedValue({
        nodes: [{ id: 'pattern_db_pool', type: 'PATTERN' }],
        relationships: [],
      });

      // Simulate event emission
      const eventHandler = mockEventBus.on.mock.calls.find(
        call => call[0] === 'memory:search-requested'
      )?.[1];

      // Act
      if (eventHandler) {
        await eventHandler(memorySearchEvent);
      }

      // Assert
      expect(mockMemoryOrchestrator.searchMemories).toHaveBeenCalledWith(
        expect.stringContaining('database connection patterns'),
        expect.objectContaining({
          context: expect.objectContaining({
            technologies: ['TypeScript', 'PostgreSQL', 'Redis'],
            projectType: 'e-commerce-api',
          })
        })
      );
    });

    it('should coordinate memory updates with LANKA graph changes', async () => {
      // Arrange
      const graphUpdateEvent = {
        type: 'graph-updated',
        data: {
          operation: 'add-relationship',
          relationship: {
            from: 'service_a',
            to: 'service_b',
            type: 'DEPENDS_ON',
            properties: { strength: 0.8 }
          },
          context: {
            reason: 'architectural refactoring',
            impact: 'dependency_change',
          }
        }
      };

      const affectedMemories = [
        MemoryFixtures.createWorkspaceMemory({
          id: 'service_mem_001',
          content: 'Service A operates independently',
        }),
      ];

      mockMemoryOrchestrator.searchMemories.mockResolvedValue({
        memories: affectedMemories,
        total: 1,
      });

      mockMemoryOrchestrator.ingestMemory.mockResolvedValue({
        success: true,
        memory: expect.any(Object),
        action: 'UPDATE_EXISTING',
      });

      // Simulate event emission
      const eventHandler = mockEventBus.on.mock.calls.find(
        call => call[0] === 'lanka:graph-updated'
      )?.[1];

      // Act
      if (eventHandler) {
        await eventHandler(graphUpdateEvent);
      }

      // Assert
      expect(mockMemoryOrchestrator.searchMemories).toHaveBeenCalledWith(
        expect.stringContaining('service_a OR service_b'),
        expect.any(Object)
      );

      expect(mockMemoryOrchestrator.ingestMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Service A now depends on Service B'),
          metadata: expect.objectContaining({
            trigger: 'graph-update',
            impact: 'dependency_change',
          })
        })
      );
    });
  });

  describe('Performance Integration', () => {
    it('should optimize memory queries using LANKA graph structure', async () => {
      // Arrange
      const searchQuery = 'microservices communication patterns';
      
      mockLankaCore.executeQuery.mockResolvedValue({
        nodes: [
          { id: 'pattern_001', type: 'PATTERN', properties: { name: 'Event Bus' } },
          { id: 'pattern_002', type: 'PATTERN', properties: { name: 'API Gateway' } },
        ],
        relationships: [
          { from: 'pattern_001', to: 'pattern_002', type: 'COMPLEMENTS' },
        ]
      });

      mockMemoryOrchestrator.searchMemories.mockResolvedValue({
        memories: [MemoryFixtures.createSystem1Memory()],
        total: 1,
        searchTime: 45,
      });

      // Act
      const start = Date.now();
      const result = await integration.optimizedMemorySearch(searchQuery);
      const duration = Date.now() - start;

      // Assert
      expect(duration).toBeLessThan(500); // Should be fast due to optimization
      expect(mockLankaCore.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('MATCH'),
        expect.objectContaining({
          query: expect.stringContaining('microservices')
        })
      );
      expect(result.optimizationApplied).toBe(true);
      expect(result.graphPrefiltering).toBe(true);
    });

    it('should cache frequently accessed memory-graph combinations', async () => {
      // Arrange
      const commonQuery = 'authentication patterns';
      
      // First call
      await integration.optimizedMemorySearch(commonQuery);
      
      // Second call (should use cache)
      const start = Date.now();
      const result = await integration.optimizedMemorySearch(commonQuery);
      const duration = Date.now() - start;

      // Assert
      expect(duration).toBeLessThan(50); // Should be very fast due to caching
      expect(result.fromCache).toBe(true);
      expect(mockLankaCore.executeQuery).toHaveBeenCalledTimes(1); // Only first call
    });
  });
});