import { Memory, MemoryType, ArbitrationDecision } from '../../src/types/memory';

export class MemoryFixtures {
  static createSystem1Memory(overrides: Partial<Memory> = {}): Memory {
    return {
      id: 'mem_sys1_001',
      type: MemoryType.SYSTEM_1,
      content: 'Always use async/await instead of callbacks for Promise handling',
      vector: new Array(768).fill(0).map(() => Math.random()),
      metadata: {
        pattern: 'async-await-pattern',
        confidence: 0.95,
        workspace: 'default',
        tags: ['javascript', 'async', 'best-practice'],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
        accessCount: 5,
        validationScore: 0.9,
      },
      relationships: [
        { type: 'IMPLEMENTS', targetId: 'pattern_async_001' },
        { type: 'EVOLVED_FROM', targetId: 'callback_pattern_001' }
      ],
      ...overrides
    };
  }

  static createSystem2Memory(overrides: Partial<Memory> = {}): Memory {
    return {
      id: 'mem_sys2_001',
      type: MemoryType.SYSTEM_2,
      content: `
        Debugging complex race condition:
        1. Identified multiple async operations modifying shared state
        2. Added proper synchronization with mutex locks
        3. Implemented atomic operations for critical sections
        4. Added comprehensive logging for state transitions
        Result: Race condition eliminated, performance improved by 15%
      `,
      vector: new Array(768).fill(0).map(() => Math.random()),
      metadata: {
        reasoningType: 'problem-solving',
        confidence: 0.92,
        workspace: 'backend-team',
        tags: ['debugging', 'concurrency', 'race-condition'],
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01'),
        accessCount: 12,
        validationScore: 0.95,
        complexity: 'high',
        outcome: 'successful',
      },
      relationships: [
        { type: 'ADDRESSES', targetId: 'problem_race_001' },
        { type: 'USES_TECHNIQUE', targetId: 'mutex_pattern_001' }
      ],
      ...overrides
    };
  }

  static createWorkspaceMemory(overrides: Partial<Memory> = {}): Memory {
    return {
      id: 'mem_ws_001',
      type: MemoryType.WORKSPACE,
      content: 'Team convention: All API responses use camelCase for property names',
      vector: new Array(768).fill(0).map(() => Math.random()),
      metadata: {
        convention: 'api-response-format',
        confidence: 0.98,
        workspace: 'api-team',
        tags: ['api', 'convention', 'naming'],
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-20'),
        accessCount: 8,
        validationScore: 1.0,
        teamConsensus: true,
      },
      relationships: [
        { type: 'AGREED_BY', targetId: 'api_team' },
        { type: 'APPLIES_TO', targetId: 'api_responses' }
      ],
      ...overrides
    };
  }

  static createArbitrationDecision(overrides: Partial<ArbitrationDecision> = {}): ArbitrationDecision {
    return {
      action: 'ADD_NEW',
      confidence: 0.85,
      reasoning: 'New pattern provides valuable async/await guidance with high confidence',
      similarMemories: [
        { id: 'mem_001', similarity: 0.3, reason: 'Related to async patterns but different focus' }
      ],
      qualityScore: 0.9,
      metadata: {
        noveltyThreshold: 0.7,
        confidenceThreshold: 0.8,
        evaluatedAt: new Date(),
        evaluator: 'memory-orchestrator-v1',
      },
      ...overrides
    };
  }

  static createTestDataset(): {
    memories: Memory[];
    queries: Array<{ query: string; expectedResults: string[] }>;
  } {
    const memories = [
      this.createSystem1Memory({ id: 'test_001' }),
      this.createSystem1Memory({ 
        id: 'test_002',
        content: 'Use try-catch blocks for error handling in async functions',
        metadata: { ...this.createSystem1Memory().metadata, tags: ['javascript', 'error-handling'] }
      }),
      this.createSystem2Memory({ id: 'test_003' }),
      this.createWorkspaceMemory({ id: 'test_004' }),
    ];

    const queries = [
      {
        query: 'How to handle async operations?',
        expectedResults: ['test_001', 'test_002']
      },
      {
        query: 'Debugging race conditions',
        expectedResults: ['test_003']
      },
      {
        query: 'API naming conventions',
        expectedResults: ['test_004']
      }
    ];

    return { memories, queries };
  }

  static createPerformanceTestData(count: number = 1000): Memory[] {
    return Array.from({ length: count }, (_, i) => ({
      ...this.createSystem1Memory(),
      id: `perf_test_${i.toString().padStart(6, '0')}`,
      content: `Performance test memory ${i}: ${Math.random().toString(36)}`,
      vector: new Array(768).fill(0).map(() => Math.random()),
    }));
  }

  static createPluginTestMemories(): Memory[] {
    return [
      {
        ...this.createSystem1Memory(),
        id: 'plugin_security_001',
        content: 'Avoid SQL injection by using parameterized queries',
        metadata: {
          ...this.createSystem1Memory().metadata,
          pluginSource: 'security-analyzer',
          securityLevel: 'high',
          tags: ['security', 'sql-injection', 'database']
        }
      },
      {
        ...this.createSystem1Memory(),
        id: 'plugin_performance_001',
        content: 'Use database indexes for frequently queried columns',
        metadata: {
          ...this.createSystem1Memory().metadata,
          pluginSource: 'performance-analyzer',
          performanceImpact: 'high',
          tags: ['performance', 'database', 'optimization']
        }
      }
    ];
  }
}

export default MemoryFixtures;