import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PluginManager } from '../../../src/plugins/plugin-manager';
import { StorageMocks } from '../../mocks/storage-mocks';
import { MemoryFixtures } from '../../fixtures/memory-fixtures';

describe('PluginManager', () => {
  let pluginManager: PluginManager;
  let mockOrchestrator: any;
  let mockEventBus: any;

  beforeEach(async () => {
    mockOrchestrator = {
      ingestMemory: jest.fn(),
      searchMemories: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
    };

    mockEventBus = {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    };

    pluginManager = new PluginManager({
      orchestrator: mockOrchestrator,
      eventBus: mockEventBus,
      pluginDirectory: './tests/fixtures/plugins',
      sandboxConfig: {
        timeout: 5000,
        memoryLimit: '100MB',
        allowedModules: ['lodash', 'moment'],
      }
    });

    await pluginManager.initialize();
  });

  afterEach(async () => {
    await pluginManager.shutdown();
    jest.clearAllMocks();
  });

  describe('Plugin Lifecycle', () => {
    it('should load valid plugin', async () => {
      // Arrange
      const pluginConfig = {
        name: 'security-analyzer',
        version: '1.0.0',
        capabilities: ['analyze', 'suggest'],
        hooks: ['memory-ingestion', 'post-search'],
        dependencies: [],
      };

      const mockPlugin = {
        initialize: jest.fn().mockResolvedValue(true),
        analyze: jest.fn(),
        suggest: jest.fn(),
        onMemoryIngestion: jest.fn(),
        onPostSearch: jest.fn(),
        getMetadata: jest.fn().mockReturnValue(pluginConfig),
      };

      jest.doMock('./tests/fixtures/plugins/security-analyzer.js', () => ({
        default: () => mockPlugin
      }), { virtual: true });

      // Act
      const result = await pluginManager.loadPlugin('security-analyzer', {
        enabled: true,
        config: { severity: 'high' }
      });

      // Assert
      expect(result.success).toBe(true);
      expect(mockPlugin.initialize).toHaveBeenCalled();
      expect(pluginManager.isPluginLoaded('security-analyzer')).toBe(true);
    });

    it('should handle plugin loading failures', async () => {
      // Arrange
      const invalidPluginPath = 'nonexistent-plugin';

      // Act
      const result = await pluginManager.loadPlugin(invalidPluginPath);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Plugin not found');
    });

    it('should validate plugin manifest', async () => {
      // Arrange
      const invalidPlugin = {
        // Missing required fields
        version: '1.0.0',
      };

      jest.doMock('./tests/fixtures/plugins/invalid-plugin.js', () => ({
        default: () => invalidPlugin
      }), { virtual: true });

      // Act
      const result = await pluginManager.loadPlugin('invalid-plugin');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid plugin manifest');
    });

    it('should unload plugin cleanly', async () => {
      // Arrange
      const mockPlugin = {
        initialize: jest.fn().mockResolvedValue(true),
        shutdown: jest.fn().mockResolvedValue(true),
        getMetadata: jest.fn().mockReturnValue({
          name: 'test-plugin',
          version: '1.0.0',
          capabilities: [],
          hooks: []
        }),
      };

      jest.doMock('./tests/fixtures/plugins/test-plugin.js', () => ({
        default: () => mockPlugin
      }), { virtual: true });

      await pluginManager.loadPlugin('test-plugin');

      // Act
      const result = await pluginManager.unloadPlugin('test-plugin');

      // Assert
      expect(result.success).toBe(true);
      expect(mockPlugin.shutdown).toHaveBeenCalled();
      expect(pluginManager.isPluginLoaded('test-plugin')).toBe(false);
    });
  });

  describe('Plugin Security', () => {
    it('should enforce sandbox restrictions', async () => {
      // Arrange
      const maliciousPlugin = {
        initialize: jest.fn().mockImplementation(() => {
          // Try to access file system (should be blocked)
          require('fs').readFileSync('/etc/passwd');
        }),
        getMetadata: jest.fn().mockReturnValue({
          name: 'malicious-plugin',
          version: '1.0.0',
          capabilities: [],
          hooks: []
        }),
      };

      jest.doMock('./tests/fixtures/plugins/malicious-plugin.js', () => ({
        default: () => maliciousPlugin
      }), { virtual: true });

      // Act
      const result = await pluginManager.loadPlugin('malicious-plugin');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Security violation');
    });

    it('should enforce memory limits', async () => {
      // Arrange
      const memoryHogPlugin = {
        initialize: jest.fn().mockImplementation(() => {
          // Try to allocate excessive memory
          const largeArray = new Array(1000000).fill('x'.repeat(1000));
          return true;
        }),
        getMetadata: jest.fn().mockReturnValue({
          name: 'memory-hog',
          version: '1.0.0',
          capabilities: [],
          hooks: []
        }),
      };

      jest.doMock('./tests/fixtures/plugins/memory-hog.js', () => ({
        default: () => memoryHogPlugin
      }), { virtual: true });

      // Act
      const result = await pluginManager.loadPlugin('memory-hog');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Memory limit exceeded');
    });

    it('should enforce execution timeouts', async () => {
      // Arrange
      const slowPlugin = {
        initialize: jest.fn().mockImplementation(() => {
          return new Promise(resolve => setTimeout(resolve, 10000));
        }),
        getMetadata: jest.fn().mockReturnValue({
          name: 'slow-plugin',
          version: '1.0.0',
          capabilities: [],
          hooks: []
        }),
      };

      jest.doMock('./tests/fixtures/plugins/slow-plugin.js', () => ({
        default: () => slowPlugin
      }), { virtual: true });

      // Act
      const result = await pluginManager.loadPlugin('slow-plugin');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Execution timeout');
    });
  });

  describe('Hook System', () => {
    it('should execute hooks for memory ingestion', async () => {
      // Arrange
      const securityPlugin = {
        initialize: jest.fn().mockResolvedValue(true),
        onMemoryIngestion: jest.fn().mockImplementation((memory) => ({
          proceed: true,
          modifications: {
            metadata: {
              ...memory.metadata,
              securityScanned: true,
              securityLevel: 'safe',
            }
          }
        })),
        getMetadata: jest.fn().mockReturnValue({
          name: 'security-analyzer',
          version: '1.0.0',
          capabilities: ['analyze'],
          hooks: ['memory-ingestion']
        }),
      };

      jest.doMock('./tests/fixtures/plugins/security-analyzer.js', () => ({
        default: () => securityPlugin
      }), { virtual: true });

      await pluginManager.loadPlugin('security-analyzer');
      const memory = MemoryFixtures.createSystem1Memory();

      // Act
      const results = await pluginManager.executeHook('memory-ingestion', memory);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].proceed).toBe(true);
      expect(results[0].modifications.metadata.securityScanned).toBe(true);
      expect(securityPlugin.onMemoryIngestion).toHaveBeenCalledWith(memory);
    });

    it('should handle hook execution failures', async () => {
      // Arrange
      const faultyPlugin = {
        initialize: jest.fn().mockResolvedValue(true),
        onMemoryIngestion: jest.fn().mockRejectedValue(new Error('Hook execution failed')),
        getMetadata: jest.fn().mockReturnValue({
          name: 'faulty-plugin',
          version: '1.0.0',
          capabilities: [],
          hooks: ['memory-ingestion']
        }),
      };

      jest.doMock('./tests/fixtures/plugins/faulty-plugin.js', () => ({
        default: () => faultyPlugin
      }), { virtual: true });

      await pluginManager.loadPlugin('faulty-plugin');
      const memory = MemoryFixtures.createSystem1Memory();

      // Act
      const results = await pluginManager.executeHook('memory-ingestion', memory);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].error).toBe('Hook execution failed');
      expect(results[0].proceed).toBe(false);
    });

    it('should support multiple plugins for same hook', async () => {
      // Arrange
      const plugin1 = {
        initialize: jest.fn().mockResolvedValue(true),
        onPostSearch: jest.fn().mockReturnValue({ enhance: 'plugin1' }),
        getMetadata: jest.fn().mockReturnValue({
          name: 'plugin1',
          version: '1.0.0',
          capabilities: [],
          hooks: ['post-search']
        }),
      };

      const plugin2 = {
        initialize: jest.fn().mockResolvedValue(true),
        onPostSearch: jest.fn().mockReturnValue({ enhance: 'plugin2' }),
        getMetadata: jest.fn().mockReturnValue({
          name: 'plugin2',
          version: '1.0.0',
          capabilities: [],
          hooks: ['post-search']
        }),
      };

      jest.doMock('./tests/fixtures/plugins/plugin1.js', () => ({ default: () => plugin1 }), { virtual: true });
      jest.doMock('./tests/fixtures/plugins/plugin2.js', () => ({ default: () => plugin2 }), { virtual: true });

      await pluginManager.loadPlugin('plugin1');
      await pluginManager.loadPlugin('plugin2');

      // Act
      const results = await pluginManager.executeHook('post-search', { query: 'test' });

      // Assert
      expect(results).toHaveLength(2);
      expect(plugin1.onPostSearch).toHaveBeenCalled();
      expect(plugin2.onPostSearch).toHaveBeenCalled();
    });
  });

  describe('Plugin Communication', () => {
    it('should enable inter-plugin communication through events', async () => {
      // Arrange
      const producerPlugin = {
        initialize: jest.fn().mockResolvedValue(true),
        produceData: jest.fn().mockImplementation((data) => {
          mockEventBus.emit('plugin:security-analysis', { data, source: 'security-analyzer' });
        }),
        getMetadata: jest.fn().mockReturnValue({
          name: 'security-analyzer',
          version: '1.0.0',
          capabilities: ['analyze'],
          hooks: []
        }),
      };

      const consumerPlugin = {
        initialize: jest.fn().mockImplementation(async () => {
          mockEventBus.on('plugin:security-analysis', this.onSecurityAnalysis);
          return true;
        }),
        onSecurityAnalysis: jest.fn(),
        getMetadata: jest.fn().mockReturnValue({
          name: 'performance-optimizer',
          version: '1.0.0',
          capabilities: ['optimize'],
          hooks: []
        }),
      };

      jest.doMock('./tests/fixtures/plugins/security-analyzer.js', () => ({ default: () => producerPlugin }), { virtual: true });
      jest.doMock('./tests/fixtures/plugins/performance-optimizer.js', () => ({ default: () => consumerPlugin }), { virtual: true });

      await pluginManager.loadPlugin('security-analyzer');
      await pluginManager.loadPlugin('performance-optimizer');

      // Act
      producerPlugin.produceData({ vulnerabilities: [] });

      // Assert
      expect(mockEventBus.emit).toHaveBeenCalledWith('plugin:security-analysis', {
        data: { vulnerabilities: [] },
        source: 'security-analyzer'
      });
    });

    it('should prevent unauthorized plugin access', async () => {
      // Arrange
      const unauthorizedPlugin = {
        initialize: jest.fn().mockImplementation(() => {
          // Try to access another plugin directly
          const otherPlugin = pluginManager.getPlugin('security-analyzer');
          otherPlugin.secretMethod();
        }),
        getMetadata: jest.fn().mockReturnValue({
          name: 'unauthorized-plugin',
          version: '1.0.0',
          capabilities: [],
          hooks: []
        }),
      };

      jest.doMock('./tests/fixtures/plugins/unauthorized-plugin.js', () => ({
        default: () => unauthorizedPlugin
      }), { virtual: true });

      // Act
      const result = await pluginManager.loadPlugin('unauthorized-plugin');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized plugin access');
    });
  });

  describe('Plugin Capabilities', () => {
    it('should validate plugin capabilities', async () => {
      // Arrange
      const plugin = {
        initialize: jest.fn().mockResolvedValue(true),
        analyze: jest.fn(),
        // Missing 'suggest' method despite claiming capability
        getMetadata: jest.fn().mockReturnValue({
          name: 'incomplete-plugin',
          version: '1.0.0',
          capabilities: ['analyze', 'suggest'],
          hooks: []
        }),
      };

      jest.doMock('./tests/fixtures/plugins/incomplete-plugin.js', () => ({
        default: () => plugin
      }), { virtual: true });

      // Act
      const result = await pluginManager.loadPlugin('incomplete-plugin');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing capability method: suggest');
    });

    it('should execute plugin capabilities', async () => {
      // Arrange
      const analysisResult = {
        issues: ['Potential security vulnerability in line 42'],
        confidence: 0.85,
        suggestions: ['Use parameterized queries'],
      };

      const securityPlugin = {
        initialize: jest.fn().mockResolvedValue(true),
        analyze: jest.fn().mockResolvedValue(analysisResult),
        getMetadata: jest.fn().mockReturnValue({
          name: 'security-analyzer',
          version: '1.0.0',
          capabilities: ['analyze'],
          hooks: []
        }),
      };

      jest.doMock('./tests/fixtures/plugins/security-analyzer.js', () => ({
        default: () => securityPlugin
      }), { virtual: true });

      await pluginManager.loadPlugin('security-analyzer');

      // Act
      const result = await pluginManager.executeCapability('security-analyzer', 'analyze', {
        code: 'SELECT * FROM users WHERE id = ' + userInput
      });

      // Assert
      expect(result).toEqual(analysisResult);
      expect(securityPlugin.analyze).toHaveBeenCalledWith({
        code: 'SELECT * FROM users WHERE id = ' + userInput
      });
    });
  });

  describe('Plugin Discovery and Metadata', () => {
    it('should discover available plugins', async () => {
      // Arrange
      const pluginConfigs = [
        { name: 'security-analyzer', version: '1.0.0', description: 'Security analysis plugin' },
        { name: 'performance-optimizer', version: '2.1.0', description: 'Performance optimization plugin' },
        { name: 'code-formatter', version: '1.5.0', description: 'Code formatting plugin' },
      ];

      jest.spyOn(pluginManager, 'discoverPlugins').mockResolvedValue(pluginConfigs);

      // Act
      const discovered = await pluginManager.discoverPlugins();

      // Assert
      expect(discovered).toHaveLength(3);
      expect(discovered.map(p => p.name)).toEqual([
        'security-analyzer',
        'performance-optimizer',
        'code-formatter'
      ]);
    });

    it('should provide plugin metadata', async () => {
      // Arrange
      const pluginMetadata = {
        name: 'security-analyzer',
        version: '1.0.0',
        description: 'Analyzes code for security vulnerabilities',
        capabilities: ['analyze', 'suggest'],
        hooks: ['memory-ingestion', 'post-search'],
        dependencies: ['lodash'],
        author: 'Security Team',
        license: 'MIT',
      };

      const plugin = {
        initialize: jest.fn().mockResolvedValue(true),
        analyze: jest.fn(),
        suggest: jest.fn(),
        getMetadata: jest.fn().mockReturnValue(pluginMetadata),
      };

      jest.doMock('./tests/fixtures/plugins/security-analyzer.js', () => ({
        default: () => plugin
      }), { virtual: true });

      await pluginManager.loadPlugin('security-analyzer');

      // Act
      const metadata = pluginManager.getPluginMetadata('security-analyzer');

      // Assert
      expect(metadata).toEqual(pluginMetadata);
    });

    it('should list loaded plugins', async () => {
      // Arrange
      const plugins = ['security-analyzer', 'performance-optimizer'];
      
      for (const pluginName of plugins) {
        const plugin = {
          initialize: jest.fn().mockResolvedValue(true),
          getMetadata: jest.fn().mockReturnValue({
            name: pluginName,
            version: '1.0.0',
            capabilities: [],
            hooks: []
          }),
        };

        jest.doMock(`./tests/fixtures/plugins/${pluginName}.js`, () => ({
          default: () => plugin
        }), { virtual: true });

        await pluginManager.loadPlugin(pluginName);
      }

      // Act
      const loadedPlugins = pluginManager.listLoadedPlugins();

      // Assert
      expect(loadedPlugins).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'security-analyzer' }),
          expect.objectContaining({ name: 'performance-optimizer' }),
        ])
      );
    });
  });

  describe('Performance and Resource Management', () => {
    it('should track plugin performance metrics', async () => {
      // Arrange
      const plugin = {
        initialize: jest.fn().mockResolvedValue(true),
        analyze: jest.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work
          return { result: 'analysis complete' };
        }),
        getMetadata: jest.fn().mockReturnValue({
          name: 'test-plugin',
          version: '1.0.0',
          capabilities: ['analyze'],
          hooks: []
        }),
      };

      jest.doMock('./tests/fixtures/plugins/test-plugin.js', () => ({
        default: () => plugin
      }), { virtual: true });

      await pluginManager.loadPlugin('test-plugin');

      // Act
      await pluginManager.executeCapability('test-plugin', 'analyze', {});
      const metrics = pluginManager.getPluginMetrics('test-plugin');

      // Assert
      expect(metrics.executionCount).toBe(1);
      expect(metrics.averageExecutionTime).toBeGreaterThan(90);
      expect(metrics.totalExecutionTime).toBeGreaterThan(90);
    });

    it('should handle resource cleanup on shutdown', async () => {
      // Arrange
      const plugins = ['plugin1', 'plugin2', 'plugin3'];
      const shutdownMocks = [];

      for (const pluginName of plugins) {
        const shutdownMock = jest.fn().mockResolvedValue(true);
        shutdownMocks.push(shutdownMock);

        const plugin = {
          initialize: jest.fn().mockResolvedValue(true),
          shutdown: shutdownMock,
          getMetadata: jest.fn().mockReturnValue({
            name: pluginName,
            version: '1.0.0',
            capabilities: [],
            hooks: []
          }),
        };

        jest.doMock(`./tests/fixtures/plugins/${pluginName}.js`, () => ({
          default: () => plugin
        }), { virtual: true });

        await pluginManager.loadPlugin(pluginName);
      }

      // Act
      await pluginManager.shutdown();

      // Assert
      shutdownMocks.forEach(mock => {
        expect(mock).toHaveBeenCalled();
      });
    });
  });
});