import { FederationService, FederationConfig } from '../../../../src/modules/memory/federation/core/FederationService';
import { MemoryPattern } from '../../../../src/modules/memory/federation/training/ModelTrainer';

describe('FederationService', () => {
  let federationService: FederationService;
  let mockConfig: FederationConfig;

  beforeEach(() => {
    mockConfig = {
      instanceId: 'test-instance-1',
      federationEnabled: true,
      privacyLevel: 'moderate',
      maxParticipants: 5,
      roundTimeout: 60000,
      minimumParticipants: 2,
      aggregationStrategy: 'fedavg',
      privacyBudget: {
        epsilon: 3.0,
        delta: 1e-4,
        total: 100.0,
        consumed: 0.0
      },
      modelConfig: {
        architecture: 'neural_network',
        inputDimensions: 128,
        hiddenLayers: [64, 32],
        outputDimensions: 16,
        learningRate: 0.001,
        epochs: 10
      }
    };

    federationService = new FederationService(mockConfig);
  });

  afterEach(async () => {
    if (federationService) {
      await federationService.shutdown();
    }
  });

  describe('initialization', () => {
    test('should initialize successfully', async () => {
      await expect(federationService.initialize()).resolves.not.toThrow();
    });

    test('should emit initialized event', async () => {
      const initializePromise = new Promise(resolve => {
        federationService.once('initialized', resolve);
      });

      await federationService.initialize();
      await expect(initializePromise).resolves.toBeDefined();
    });
  });

  describe('federation management', () => {
    beforeEach(async () => {
      await federationService.initialize();
    });

    test('should join federation network', async () => {
      const networkId = 'test-network';
      const discoveryNodes = ['node1.example.com', 'node2.example.com'];

      const joinPromise = new Promise(resolve => {
        federationService.once('joined', resolve);
      });

      await federationService.joinFederation(networkId, discoveryNodes);
      const joinResult = await joinPromise;

      expect(joinResult).toMatchObject({ networkId });
    });

    test('should handle training round', async () => {
      const mockPatterns: MemoryPattern[] = [
        {
          id: 'pattern-1',
          type: 'system1',
          content: 'async function test() { await fetch("/api"); }',
          embeddings: new Float32Array([0.1, 0.2, 0.3]),
          relationships: ['error-handling'],
          usage_count: 5,
          success_rate: 0.9,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'pattern-2',
          type: 'system2',
          content: 'try-catch block for error handling',
          embeddings: new Float32Array([0.2, 0.3, 0.4]),
          relationships: ['async-patterns'],
          usage_count: 10,
          success_rate: 0.85,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      const roundStartedPromise = new Promise(resolve => {
        federationService.once('roundStarted', resolve);
      });

      await federationService.startTrainingRound(mockPatterns);
      const roundResult = await roundStartedPromise;

      expect(roundResult).toHaveProperty('round');
      expect(typeof roundResult.round).toBe('number');
    });

    test('should update configuration', async () => {
      const updates = {
        privacyLevel: 'strict' as const,
        maxParticipants: 8
      };

      const configUpdatedPromise = new Promise(resolve => {
        federationService.once('configUpdated', resolve);
      });

      await federationService.updateConfig(updates);
      const updateResult = await configUpdatedPromise;

      expect(updateResult).toMatchObject(updates);
    });

    test('should handle opt-out', async () => {
      const optOutPromise = new Promise(resolve => {
        federationService.once('optedOut', resolve);
      });

      await federationService.optOut();
      await optOutPromise;

      const status = federationService.getStatus();
      expect(status).toBeDefined();
    });

    test('should handle opt-in', async () => {
      const optInPromise = new Promise(resolve => {
        federationService.once('optedIn', resolve);
      });

      await federationService.optIn();
      await optInPromise;

      const status = federationService.getStatus();
      expect(status).toBeDefined();
    });
  });

  describe('status and metrics', () => {
    beforeEach(async () => {
      await federationService.initialize();
    });

    test('should return federation status', () => {
      const status = federationService.getStatus();

      expect(status).toMatchObject({
        totalRounds: expect.any(Number),
        activeParticipants: expect.any(Number),
        globalAccuracy: expect.any(Number),
        privacyBudgetRemaining: expect.any(Number),
        communicationOverhead: expect.any(Number),
        convergenceRate: expect.any(Number),
        lastUpdate: expect.any(Date)
      });
    });

    test('should return analytics', () => {
      const analytics = federationService.getAnalytics();
      expect(analytics).toBeDefined();
    });
  });

  describe('privacy protection', () => {
    beforeEach(async () => {
      await federationService.initialize();
    });

    test('should respect privacy budget', async () => {
      const patterns: MemoryPattern[] = Array.from({ length: 100 }, (_, i) => ({
        id: `pattern-${i}`,
        type: 'system1',
        content: `function test${i}() { return ${i}; }`,
        embeddings: new Float32Array(Array.from({ length: 10 }, () => Math.random())),
        relationships: [],
        usage_count: Math.floor(Math.random() * 10),
        success_rate: Math.random(),
        created_at: new Date(),
        updated_at: new Date()
      }));

      // Should handle large pattern sets without violating privacy
      await expect(federationService.startTrainingRound(patterns)).resolves.not.toThrow();
    });

    test('should handle privacy budget exhaustion', async () => {
      // Set very low privacy budget
      await federationService.updateConfig({
        privacyBudget: {
          epsilon: 0.1,
          delta: 1e-5,
          total: 1.0,
          consumed: 0.9
        }
      });

      const budgetExhaustedPromise = new Promise(resolve => {
        federationService.once('privacyBudgetExhausted', resolve);
      });

      const patterns: MemoryPattern[] = [{
        id: 'pattern-1',
        type: 'system1',
        content: 'test pattern',
        embeddings: new Float32Array([0.1, 0.2]),
        relationships: [],
        usage_count: 1,
        success_rate: 1.0,
        created_at: new Date(),
        updated_at: new Date()
      }];

      // May trigger budget exhaustion
      await federationService.startTrainingRound(patterns);
      
      // Wait a bit to see if budget exhaustion event is emitted
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  describe('error handling', () => {
    test('should handle initialization errors gracefully', async () => {
      // Create service with invalid config
      const invalidConfig = {
        ...mockConfig,
        modelConfig: {
          ...mockConfig.modelConfig,
          inputDimensions: -1 // Invalid
        }
      };

      const invalidService = new FederationService(invalidConfig);
      
      // Should not throw but should handle gracefully
      await expect(invalidService.initialize()).rejects.toThrow();
    });

    test('should handle training with empty patterns', async () => {
      await federationService.initialize();

      // Should handle empty pattern array gracefully
      await expect(federationService.startTrainingRound([])).resolves.not.toThrow();
    });

    test('should handle network errors gracefully', async () => {
      await federationService.initialize();

      const invalidNodes = ['invalid-node-1', 'invalid-node-2'];
      
      // Should handle invalid discovery nodes gracefully
      await expect(federationService.joinFederation('test-network', invalidNodes))
        .rejects.toThrow();
    });
  });

  describe('performance', () => {
    beforeEach(async () => {
      await federationService.initialize();
    });

    test('should handle large pattern sets efficiently', async () => {
      const largePatternSet: MemoryPattern[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `pattern-${i}`,
        type: i % 2 === 0 ? 'system1' : 'system2',
        content: `function test${i}() { return ${i}; }`,
        embeddings: new Float32Array(Array.from({ length: 128 }, () => Math.random())),
        relationships: [`rel-${i % 10}`],
        usage_count: Math.floor(Math.random() * 100),
        success_rate: Math.random(),
        created_at: new Date(Date.now() - Math.random() * 86400000),
        updated_at: new Date()
      }));

      const startTime = Date.now();
      await federationService.startTrainingRound(largePatternSet);
      const endTime = Date.now();

      // Should complete within reasonable time (10 seconds)
      expect(endTime - startTime).toBeLessThan(10000);
    });

    test('should maintain performance with multiple rounds', async () => {
      const patterns: MemoryPattern[] = [{
        id: 'pattern-1',
        type: 'system1',
        content: 'test pattern',
        embeddings: new Float32Array([0.1, 0.2, 0.3]),
        relationships: [],
        usage_count: 1,
        success_rate: 1.0,
        created_at: new Date(),
        updated_at: new Date()
      }];

      const roundTimes: number[] = [];

      // Run multiple rounds
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await federationService.startTrainingRound(patterns);
        const endTime = Date.now();
        roundTimes.push(endTime - startTime);
      }

      // Performance shouldn't degrade significantly
      const firstRoundTime = roundTimes[0];
      const lastRoundTime = roundTimes[roundTimes.length - 1];
      expect(lastRoundTime).toBeLessThan(firstRoundTime * 2);
    });
  });

  describe('integration', () => {
    test('should handle complete federation lifecycle', async () => {
      const events: string[] = [];
      
      federationService.on('initialized', () => events.push('initialized'));
      federationService.on('joined', () => events.push('joined'));
      federationService.on('roundStarted', () => events.push('roundStarted'));
      federationService.on('roundCompleted', () => events.push('roundCompleted'));
      federationService.on('globalModelUpdated', () => events.push('globalModelUpdated'));
      federationService.on('optedOut', () => events.push('optedOut'));

      // Initialize
      await federationService.initialize();
      
      // Join network (will likely fail in test but should emit event)
      try {
        await federationService.joinFederation('test-network', ['node1']);
      } catch (error) {
        // Expected to fail in test environment
      }
      
      // Start training
      const patterns: MemoryPattern[] = [{
        id: 'pattern-1',
        type: 'system1',
        content: 'integration test pattern',
        embeddings: new Float32Array([0.1, 0.2, 0.3]),
        relationships: [],
        usage_count: 1,
        success_rate: 1.0,
        created_at: new Date(),
        updated_at: new Date()
      }];
      
      await federationService.startTrainingRound(patterns);
      
      // Opt out
      await federationService.optOut();
      
      // Should have received initialization and training events
      expect(events).toContain('initialized');
      expect(events).toContain('roundStarted');
      expect(events).toContain('optedOut');
    });
  });
});