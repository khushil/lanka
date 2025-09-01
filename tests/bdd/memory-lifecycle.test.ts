import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MemoryOrchestrator } from '../../src/memory/memory-orchestrator';
import { StorageMocks } from '../mocks/storage-mocks';
import { MemoryFixtures } from '../fixtures/memory-fixtures';
import { MemoryType, ArbitrationAction } from '../../src/types/memory';

describe('Memory Lifecycle BDD Scenarios', () => {
  let orchestrator: MemoryOrchestrator;
  let mockStorage: any;
  let mockArbitrator: any;
  let mockPluginManager: any;

  // BDD Helper Functions
  const given = (description: string, setupFn: () => void | Promise<void>) => setupFn;
  const when = (description: string, actionFn: () => any | Promise<any>) => actionFn;
  const then = (description: string, assertionFn: () => void | Promise<void>) => assertionFn;
  const and = (description: string, fn: () => void | Promise<void>) => fn;

  beforeEach(async () => {
    mockStorage = StorageMocks.createStorageLayerMock();
    mockArbitrator = {
      arbitrateMemory: jest.fn(),
      evaluateQuality: jest.fn(),
      detectConflicts: jest.fn(),
    };
    mockPluginManager = StorageMocks.createPluginManagerMock();

    orchestrator = new MemoryOrchestrator({
      storage: mockStorage,
      arbitrator: mockArbitrator,
      pluginManager: mockPluginManager,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Feature: Memory Ingestion Workflow', () => {
    describe('Scenario: Successfully ingesting a high-quality memory', () => {
      it('should accept and store a well-formed memory with high confidence', async () => {
        // Given a developer has discovered a valuable coding pattern
        await given('a developer has discovered a valuable coding pattern', async () => {
          const highQualityMemory = MemoryFixtures.createSystem1Memory({
            content: 'Use async/await with proper error handling using try-catch blocks',
            metadata: {
              ...MemoryFixtures.createSystem1Memory().metadata,
              confidence: 0.95,
              validationScore: 0.9,
              tags: ['javascript', 'async', 'error-handling', 'best-practice'],
            }
          });

          mockArbitrator.arbitrateMemory.mockResolvedValue(
            MemoryFixtures.createArbitrationDecision({
              action: ArbitrationAction.ADD_NEW,
              confidence: 0.9,
              reasoning: 'High-quality pattern with clear guidance and good validation',
              qualityScore: 0.92,
            })
          );

          mockStorage.storeMemory.mockResolvedValue(highQualityMemory);
          
          this.candidateMemory = highQualityMemory;
        });

        // When the memory is submitted for ingestion
        const result = await when('the memory is submitted for ingestion', async () => {
          return await orchestrator.ingestMemory(this.candidateMemory);
        })();

        // Then the memory should be accepted
        await then('the memory should be accepted', async () => {
          expect(result.success).toBe(true);
          expect(result.action).toBe(ArbitrationAction.ADD_NEW);
        })();

        // And it should be stored in the knowledge base
        await and('it should be stored in the knowledge base', async () => {
          expect(mockStorage.storeMemory).toHaveBeenCalledWith(this.candidateMemory);
        })();

        // And plugins should be notified for additional processing
        await and('plugins should be notified for additional processing', async () => {
          expect(mockPluginManager.executeHook).toHaveBeenCalledWith(
            'memory-ingestion',
            this.candidateMemory
          );
        })();
      });
    });

    describe('Scenario: Rejecting a low-quality memory', () => {
      it('should reject vague or low-confidence memories', async () => {
        // Given a developer submits vague coding advice
        await given('a developer submits vague coding advice', async () => {
          const lowQualityMemory = MemoryFixtures.createSystem1Memory({
            content: 'code should be good',
            metadata: {
              ...MemoryFixtures.createSystem1Memory().metadata,
              confidence: 0.2,
              validationScore: 0.1,
              tags: ['vague'],
            }
          });

          mockArbitrator.arbitrateMemory.mockResolvedValue(
            MemoryFixtures.createArbitrationDecision({
              action: ArbitrationAction.REJECT,
              confidence: 0.95,
              reasoning: 'Memory is too vague and lacks specific actionable guidance',
              qualityScore: 0.15,
            })
          );

          this.poorMemory = lowQualityMemory;
        });

        // When the memory undergoes quality evaluation
        const result = await when('the memory undergoes quality evaluation', async () => {
          return await orchestrator.ingestMemory(this.poorMemory);
        })();

        // Then the memory should be rejected
        await then('the memory should be rejected', async () => {
          expect(result.success).toBe(false);
          expect(result.action).toBe(ArbitrationAction.REJECT);
        })();

        // And no storage should occur
        await and('no storage should occur', async () => {
          expect(mockStorage.storeMemory).not.toHaveBeenCalled();
        })();

        // And the developer should receive feedback on why it was rejected
        await and('the developer should receive feedback on why it was rejected', async () => {
          expect(result.reason).toContain('too vague');
        })();
      });
    });

    describe('Scenario: Updating existing memory with improved version', () => {
      it('should update existing memory when a better version is provided', async () => {
        // Given an existing memory about async patterns
        await given('an existing memory about async patterns', async () => {
          const existingMemory = MemoryFixtures.createSystem1Memory({
            id: 'existing_async_001',
            content: 'Use async/await for promises',
            metadata: {
              ...MemoryFixtures.createSystem1Memory().metadata,
              confidence: 0.8,
              accessCount: 5,
            }
          });

          const improvedMemory = MemoryFixtures.createSystem1Memory({
            content: 'Use async/await for promises with comprehensive error handling and timeout management',
            metadata: {
              ...MemoryFixtures.createSystem1Memory().metadata,
              confidence: 0.95,
              validationScore: 0.9,
            }
          });

          mockArbitrator.arbitrateMemory.mockResolvedValue(
            MemoryFixtures.createArbitrationDecision({
              action: ArbitrationAction.UPDATE_EXISTING,
              confidence: 0.88,
              reasoning: 'Improved version with additional error handling guidance',
              targetMemoryId: 'existing_async_001',
              similarMemories: [{ id: 'existing_async_001', similarity: 0.85, reason: 'Same topic, enhanced content' }],
            })
          );

          mockStorage.retrieveMemory.mockResolvedValue(existingMemory);
          mockStorage.updateMemory.mockResolvedValue({
            ...existingMemory,
            content: improvedMemory.content,
            metadata: { ...existingMemory.metadata, confidence: 0.95 },
          });

          this.existingMemory = existingMemory;
          this.improvedMemory = improvedMemory;
        });

        // When an improved version of the memory is submitted
        const result = await when('an improved version of the memory is submitted', async () => {
          return await orchestrator.ingestMemory(this.improvedMemory);
        })();

        // Then the existing memory should be updated
        await then('the existing memory should be updated', async () => {
          expect(result.success).toBe(true);
          expect(result.action).toBe(ArbitrationAction.UPDATE_EXISTING);
        })();

        // And the original memory content should be enhanced
        await and('the original memory content should be enhanced', async () => {
          expect(mockStorage.updateMemory).toHaveBeenCalledWith(
            'existing_async_001',
            expect.objectContaining({
              content: this.improvedMemory.content,
            })
          );
        })();

        // And the memory's metadata should reflect the improvement
        await and("the memory's metadata should reflect the improvement", async () => {
          expect(mockStorage.updateMemory).toHaveBeenCalledWith(
            'existing_async_001',
            expect.objectContaining({
              metadata: expect.objectContaining({
                confidence: 0.95,
              })
            })
          );
        })();
      });
    });
  });

  describe('Feature: Memory Search and Retrieval', () => {
    describe('Scenario: Finding memories by semantic similarity', () => {
      it('should retrieve relevant memories based on meaning, not exact keywords', async () => {
        // Given a knowledge base with various programming memories
        await given('a knowledge base with various programming memories', async () => {
          const memories = [
            MemoryFixtures.createSystem1Memory({
              id: 'async_001',
              content: 'Use async/await for asynchronous operations',
              metadata: { ...MemoryFixtures.createSystem1Memory().metadata, tags: ['javascript', 'async'] }
            }),
            MemoryFixtures.createSystem1Memory({
              id: 'promise_001',
              content: 'Promise chains can be hard to debug, prefer async/await',
              metadata: { ...MemoryFixtures.createSystem1Memory().metadata, tags: ['javascript', 'promises'] }
            }),
            MemoryFixtures.createSystem1Memory({
              id: 'database_001',
              content: 'Use connection pooling for database operations',
              metadata: { ...MemoryFixtures.createSystem1Memory().metadata, tags: ['database', 'performance'] }
            }),
          ];

          mockStorage.searchMemories.mockResolvedValue({
            memories: [memories[0], memories[1]], // Return async-related memories
            total: 2,
            searchTime: 45,
          });

          this.availableMemories = memories;
        });

        // When a developer searches for "handling asynchronous code"
        const searchResult = await when('a developer searches for "handling asynchronous code"', async () => {
          return await orchestrator.searchMemories('handling asynchronous code', {
            limit: 10,
            type: MemoryType.SYSTEM_1,
          });
        })();

        // Then memories about async patterns should be returned
        await then('memories about async patterns should be returned', async () => {
          expect(searchResult.memories).toHaveLength(2);
          expect(searchResult.memories[0].id).toBe('async_001');
          expect(searchResult.memories[1].id).toBe('promise_001');
        })();

        // And database-related memories should not be included
        await and('database-related memories should not be included', async () => {
          const databaseMemory = searchResult.memories.find(m => m.id === 'database_001');
          expect(databaseMemory).toBeUndefined();
        })();

        // And the search should complete quickly
        await and('the search should complete quickly', async () => {
          expect(searchResult.searchTime).toBeLessThan(100);
        })();
      });
    });

    describe('Scenario: Retrieving related memories through graph traversal', () => {
      it('should find connected memories through relationship paths', async () => {
        // Given memories connected through evolutionary relationships
        await given('memories connected through evolutionary relationships', async () => {
          const baseMemory = MemoryFixtures.createSystem1Memory({
            id: 'base_pattern_001',
            content: 'Observer pattern for event handling',
          });

          const relatedMemories = [
            MemoryFixtures.createSystem1Memory({
              id: 'evolved_001',
              content: 'Event emitter implementation using Observer pattern',
              relationships: [{ type: 'IMPLEMENTS', targetId: 'base_pattern_001' }],
            }),
            MemoryFixtures.createSystem2Memory({
              id: 'experience_001',
              content: 'Successfully implemented Observer pattern in notification system, improved decoupling',
              relationships: [{ type: 'APPLIES', targetId: 'base_pattern_001' }],
            }),
          ];

          mockStorage.getRelatedMemories.mockResolvedValue(relatedMemories);
          this.startingMemory = baseMemory;
          this.expectedRelated = relatedMemories;
        });

        // When a developer requests related memories
        const relatedMemories = await when('a developer requests related memories', async () => {
          return await orchestrator.getRelatedMemories(this.startingMemory.id, {
            maxDepth: 2,
            relationshipTypes: ['IMPLEMENTS', 'APPLIES', 'EVOLVED_FROM'],
          });
        })();

        // Then implementation and application memories should be found
        await then('implementation and application memories should be found', async () => {
          expect(relatedMemories).toHaveLength(2);
          expect(relatedMemories.map(m => m.id)).toEqual(['evolved_001', 'experience_001']);
        })();

        // And the traversal should respect relationship types
        await and('the traversal should respect relationship types', async () => {
          expect(mockStorage.getRelatedMemories).toHaveBeenCalledWith(
            this.startingMemory.id,
            expect.objectContaining({
              relationshipTypes: ['IMPLEMENTS', 'APPLIES', 'EVOLVED_FROM'],
            })
          );
        })();
      });
    });
  });

  describe('Feature: Memory Quality and Evolution', () => {
    describe('Scenario: Detecting and resolving memory conflicts', () => {
      it('should identify contradictory memories and suggest resolution', async () => {
        // Given memories with conflicting advice
        await given('memories with conflicting advice', async () => {
          const conflictingMemories = [
            MemoryFixtures.createSystem1Memory({
              id: 'sync_approach_001',
              content: 'Use synchronous file operations for configuration loading',
              metadata: { ...MemoryFixtures.createSystem1Memory().metadata, context: 'startup' }
            }),
            MemoryFixtures.createSystem1Memory({
              id: 'async_approach_001',
              content: 'Always use asynchronous file operations to avoid blocking',
              metadata: { ...MemoryFixtures.createSystem1Memory().metadata, context: 'runtime' }
            }),
          ];

          mockArbitrator.detectConflicts.mockResolvedValue([
            {
              type: 'CONTRADICTION',
              memories: conflictingMemories,
              confidence: 0.85,
              reasoning: 'Contradictory advice about file operation approach',
              severity: 'medium',
            }
          ]);

          this.conflicts = conflictingMemories;
        });

        // When the system analyzes for conflicts
        const detectedConflicts = await when('the system analyzes for conflicts', async () => {
          return await orchestrator.detectConflicts();
        })();

        // Then contradictions should be identified
        await then('contradictions should be identified', async () => {
          expect(detectedConflicts).toHaveLength(1);
          expect(detectedConflicts[0].type).toBe('CONTRADICTION');
          expect(detectedConflicts[0].memories).toHaveLength(2);
        })();

        // And context-based resolution should be suggested
        await and('context-based resolution should be suggested', async () => {
          expect(detectedConflicts[0].reasoning).toContain('Contradictory advice');
          expect(detectedConflicts[0].severity).toBe('medium');
        })();

        // When conflicts are resolved
        const resolution = await when('conflicts are resolved', async () => {
          const resolvedMemory = MemoryFixtures.createSystem1Memory({
            id: 'resolved_001',
            content: 'Use sync file operations for startup config, async for runtime operations',
            metadata: {
              ...MemoryFixtures.createSystem1Memory().metadata,
              resolution: 'contextual',
              resolvedConflicts: ['sync_approach_001', 'async_approach_001'],
            }
          });

          mockStorage.storeMemory.mockResolvedValue(resolvedMemory);
          return await orchestrator.resolveConflicts(this.conflicts, 'contextual');
        })();

        // Then a unified memory should be created
        await then('a unified memory should be created', async () => {
          expect(resolution.success).toBe(true);
          expect(resolution.resolution).toBe('contextual');
        })();
      });
    });

    describe('Scenario: Memory strengthening through validation', () => {
      it('should increase memory confidence when patterns prove successful', async () => {
        // Given a memory with moderate confidence
        await given('a memory with moderate confidence', async () => {
          const memory = MemoryFixtures.createSystem1Memory({
            id: 'pattern_001',
            content: 'Use factory pattern for object creation flexibility',
            metadata: {
              ...MemoryFixtures.createSystem1Memory().metadata,
              confidence: 0.7,
              validationScore: 0.6,
              accessCount: 3,
            }
          });

          mockStorage.retrieveMemory.mockResolvedValue(memory);
          this.targetMemory = memory;
        });

        // When the pattern is successfully applied multiple times
        await when('the pattern is successfully applied multiple times', async () => {
          const validationEvents = [
            { outcome: 'successful', metrics: { maintainability: 0.9, flexibility: 0.85 } },
            { outcome: 'successful', metrics: { maintainability: 0.88, flexibility: 0.9 } },
            { outcome: 'successful', metrics: { maintainability: 0.92, flexibility: 0.87 } },
          ];

          for (const validation of validationEvents) {
            await orchestrator.validateMemory(this.targetMemory.id, validation);
          }

          return validationEvents;
        })();

        // Then the memory confidence should increase
        await then('the memory confidence should increase', async () => {
          expect(mockStorage.updateMemory).toHaveBeenCalledWith(
            this.targetMemory.id,
            expect.objectContaining({
              metadata: expect.objectContaining({
                confidence: expect.any(Number),
                validationScore: expect.any(Number),
              })
            })
          );

          const lastUpdate = mockStorage.updateMemory.mock.calls.slice(-1)[0][1];
          expect(lastUpdate.metadata.confidence).toBeGreaterThan(0.7);
          expect(lastUpdate.metadata.validationScore).toBeGreaterThan(0.6);
        })();

        // And usage statistics should be tracked
        await and('usage statistics should be tracked', async () => {
          const lastUpdate = mockStorage.updateMemory.mock.calls.slice(-1)[0][1];
          expect(lastUpdate.metadata.accessCount).toBeGreaterThan(3);
        })();
      });
    });
  });

  describe('Feature: Plugin Integration Workflows', () => {
    describe('Scenario: Plugin enhances memory with security analysis', () => {
      it('should allow plugins to enrich memories with specialized insights', async () => {
        // Given a memory about database operations
        await given('a memory about database operations', async () => {
          const databaseMemory = MemoryFixtures.createSystem1Memory({
            content: 'Use parameterized queries for database operations',
            metadata: {
              ...MemoryFixtures.createSystem1Memory().metadata,
              tags: ['database', 'sql'],
            }
          });

          // Mock security plugin enhancement
          mockPluginManager.executeHook.mockResolvedValue([
            {
              pluginName: 'security-analyzer',
              proceed: true,
              modifications: {
                metadata: {
                  securityLevel: 'high',
                  securityScanned: true,
                  vulnerabilityPrevention: ['sql-injection'],
                  complianceStandards: ['OWASP'],
                }
              },
              analysis: {
                securityRisk: 'low',
                recommendations: ['Always validate input parameters', 'Use prepared statements'],
              }
            }
          ]);

          this.originalMemory = databaseMemory;
        });

        // When the memory is processed through security plugin
        const result = await when('the memory is processed through security plugin', async () => {
          return await orchestrator.ingestMemory(this.originalMemory);
        })();

        // Then the memory should be enhanced with security metadata
        await then('the memory should be enhanced with security metadata', async () => {
          expect(mockPluginManager.executeHook).toHaveBeenCalledWith(
            'memory-ingestion',
            this.originalMemory
          );

          const enhancedMemory = mockStorage.storeMemory.mock.calls[0][0];
          expect(enhancedMemory.metadata.securityScanned).toBe(true);
          expect(enhancedMemory.metadata.securityLevel).toBe('high');
        })();

        // And security-specific insights should be preserved
        await and('security-specific insights should be preserved', async () => {
          const enhancedMemory = mockStorage.storeMemory.mock.calls[0][0];
          expect(enhancedMemory.metadata.vulnerabilityPrevention).toContain('sql-injection');
          expect(enhancedMemory.metadata.complianceStandards).toContain('OWASP');
        })();
      });
    });

    describe('Scenario: Cross-plugin knowledge synthesis', () => {
      it('should combine insights from multiple plugins', async () => {
        // Given multiple plugins analyzing the same memory
        await given('multiple plugins analyzing the same memory', async () => {
          const performanceMemory = MemoryFixtures.createSystem1Memory({
            content: 'Cache frequently accessed data to improve response times',
          });

          mockPluginManager.executeHook.mockResolvedValue([
            {
              pluginName: 'performance-analyzer',
              proceed: true,
              modifications: {
                metadata: {
                  performanceImpact: 'high',
                  cacheStrategy: 'in-memory',
                  expectedSpeedup: '3x',
                }
              }
            },
            {
              pluginName: 'security-analyzer',
              proceed: true,
              modifications: {
                metadata: {
                  securityConsiderations: ['cache-poisoning', 'data-leakage'],
                  securityMitigations: ['input-validation', 'cache-encryption'],
                }
              }
            },
            {
              pluginName: 'cost-analyzer',
              proceed: true,
              modifications: {
                metadata: {
                  memoryUsage: 'medium',
                  costImpact: 'moderate-increase',
                  tradeoffs: ['memory-for-speed'],
                }
              }
            }
          ]);

          this.multiAnalyzedMemory = performanceMemory;
        });

        // When the memory undergoes multi-plugin analysis
        const result = await when('the memory undergoes multi-plugin analysis', async () => {
          return await orchestrator.ingestMemory(this.multiAnalyzedMemory);
        })();

        // Then insights from all plugins should be synthesized
        await then('insights from all plugins should be synthesized', async () => {
          const enhancedMemory = mockStorage.storeMemory.mock.calls[0][0];
          
          expect(enhancedMemory.metadata.performanceImpact).toBe('high');
          expect(enhancedMemory.metadata.securityConsiderations).toEqual(['cache-poisoning', 'data-leakage']);
          expect(enhancedMemory.metadata.costImpact).toBe('moderate-increase');
        })();

        // And the memory should reflect comprehensive analysis
        await and('the memory should reflect comprehensive analysis', async () => {
          const enhancedMemory = mockStorage.storeMemory.mock.calls[0][0];
          
          expect(enhancedMemory.metadata.analysisPlugins).toBeDefined();
          expect(enhancedMemory.metadata.multiFacetAnalysis).toBe(true);
        })();
      });
    });
  });

  describe('Feature: Workspace Memory Isolation', () => {
    describe('Scenario: Team-specific memory boundaries', () => {
      it('should maintain workspace isolation while allowing controlled sharing', async () => {
        // Given memories from different team workspaces
        await given('memories from different team workspaces', async () => {
          const teamAMemory = MemoryFixtures.createWorkspaceMemory({
            id: 'team_a_001',
            content: 'Team A uses microservices architecture',
            metadata: {
              ...MemoryFixtures.createWorkspaceMemory().metadata,
              workspace: 'team-a',
              visibility: 'private',
            }
          });

          const teamBMemory = MemoryFixtures.createWorkspaceMemory({
            id: 'team_b_001', 
            content: 'Team B uses monolithic architecture',
            metadata: {
              ...MemoryFixtures.createWorkspaceMemory().metadata,
              workspace: 'team-b',
              visibility: 'private',
            }
          });

          // Team A should only see their memories
          mockStorage.searchMemories.mockImplementation((query, options) => {
            if (options?.workspace === 'team-a') {
              return Promise.resolve({ memories: [teamAMemory], total: 1 });
            } else if (options?.workspace === 'team-b') {
              return Promise.resolve({ memories: [teamBMemory], total: 1 });
            }
            return Promise.resolve({ memories: [], total: 0 });
          });

          this.teamAMemory = teamAMemory;
          this.teamBMemory = teamBMemory;
        });

        // When Team A searches for architecture patterns
        const teamAResults = await when('Team A searches for architecture patterns', async () => {
          return await orchestrator.searchMemories('architecture patterns', {
            workspace: 'team-a',
            limit: 10,
          });
        })();

        // Then only Team A's memories should be returned
        await then("only Team A's memories should be returned", async () => {
          expect(teamAResults.memories).toHaveLength(1);
          expect(teamAResults.memories[0].id).toBe('team_a_001');
          expect(teamAResults.memories[0].metadata.workspace).toBe('team-a');
        })();

        // And Team B's memories should not be accessible
        await and("Team B's memories should not be accessible", async () => {
          const teamBMemoryInResults = teamAResults.memories.find(m => m.id === 'team_b_001');
          expect(teamBMemoryInResults).toBeUndefined();
        })();

        // When Team B performs the same search
        const teamBResults = await when('Team B performs the same search', async () => {
          return await orchestrator.searchMemories('architecture patterns', {
            workspace: 'team-b',
            limit: 10,
          });
        })();

        // Then only Team B's memories should be returned
        await then("only Team B's memories should be returned", async () => {
          expect(teamBResults.memories).toHaveLength(1);
          expect(teamBResults.memories[0].id).toBe('team_b_001');
          expect(teamBResults.memories[0].metadata.workspace).toBe('team-b');
        })();
      });
    });
  });
});