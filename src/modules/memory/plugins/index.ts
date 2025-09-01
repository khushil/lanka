// LANKA Memory System Plugin Architecture
// Main entry point for the plugin system

// Core plugin management
export { PluginManager } from './core/plugin-manager';
export { DependencyResolver } from './core/dependency-resolver';
export { PluginLifecycleManager } from './core/lifecycle-manager';
export { PluginLogger } from './core/plugin-logger';
export { PluginStorage } from './core/plugin-storage';
export { GraphAPI } from './core/graph-api';
export { MemoryAPI } from './core/memory-api';

// Security components
export { PluginSandbox } from './security/plugin-sandbox';
export { PluginValidator } from './security/plugin-validator';

// Communication system
export { EventBus, PluginEventBus } from './communication/event-bus';
export { CommunicationBus } from './communication/communication-bus';

// Type definitions
export * from './types';

// Example plugin factories (for reference and testing)
export { default as createSecurityAnalyzerPlugin } from './examples/security-analyzer';
export { default as createPerformanceAnalyzerPlugin } from './examples/performance-analyzer';
export { default as createPatternDetectorPlugin } from './examples/pattern-detector';
export { default as createDocumentationGeneratorPlugin } from './examples/documentation-generator';

// Plugin template for development
export { default as createBasicPluginTemplate } from './templates/basic-plugin';

/**
 * Initialize the plugin system with the given configuration
 * 
 * @param config Plugin system configuration
 * @returns Initialized plugin manager
 */
export async function initializePluginSystem(config: PluginSystemConfig): Promise<PluginManager> {
  const pluginManager = new PluginManager({
    pluginDirectory: config.pluginDirectory || './plugins',
    sandboxConfig: {
      timeout: config.sandboxTimeout || 30000,
      memoryLimit: config.sandboxMemoryLimit || '100MB',
      allowedModules: config.allowedModules || [],
      allowNetworking: config.allowNetworking || false,
      allowFileSystem: config.allowFileSystem || false
    },
    maxConcurrentPlugins: config.maxConcurrentPlugins || 20,
    enableHotReload: config.enableHotReload || false,
    trustedPlugins: config.trustedPlugins || []
  });

  await pluginManager.initialize();
  
  // Load built-in example plugins if requested
  if (config.loadExamplePlugins) {
    await loadExamplePlugins(pluginManager);
  }
  
  return pluginManager;
}

/**
 * Load example plugins for demonstration and testing
 */
async function loadExamplePlugins(pluginManager: PluginManager): Promise<void> {
  const examplePlugins = [
    'security-analyzer',
    'performance-analyzer', 
    'pattern-detector',
    'documentation-generator'
  ];
  
  for (const pluginName of examplePlugins) {
    try {
      await pluginManager.loadPlugin(pluginName, {
        enabled: true,
        config: getDefaultPluginConfig(pluginName)
      });
      console.log(`Loaded example plugin: ${pluginName}`);
    } catch (error) {
      console.warn(`Failed to load example plugin ${pluginName}:`, error);
    }
  }
}

/**
 * Get default configuration for example plugins
 */
function getDefaultPluginConfig(pluginName: string): Record<string, any> {
  const configs: Record<string, any> = {
    'security-analyzer': {
      severityThreshold: 'medium',
      scanDepth: 3,
      enableRealtimeScanning: true
    },
    'performance-analyzer': {
      monitoringInterval: 60000,
      performanceThresholds: {
        searchLatency: 1000,
        memoryIngestion: 500,
        graphTraversal: 2000
      },
      enableProfiling: true
    },
    'pattern-detector': {
      patternThreshold: 0.75,
      learningRate: 0.1,
      enableEvolution: true,
      maxPatterns: 10000
    },
    'documentation-generator': {
      outputFormats: ['markdown', 'html'],
      autoGenerate: true,
      documentationTypes: ['api', 'guide', 'tutorial', 'reference'],
      qualityThreshold: 0.7
    }
  };
  
  return configs[pluginName] || {};
}

/**
 * Create a plugin development environment
 */
export async function createPluginDevEnvironment(config: PluginDevConfig): Promise<PluginDevEnvironment> {
  const pluginManager = await initializePluginSystem({
    ...config,
    enableHotReload: true,
    loadExamplePlugins: config.loadExamplePlugins !== false
  });
  
  return {
    pluginManager,
    
    // Development utilities
    async reloadPlugin(pluginId: string): Promise<void> {
      await pluginManager.unloadPlugin(pluginId);
      await pluginManager.loadPlugin(pluginId, { enabled: true });
    },
    
    async testPlugin(pluginId: string, testData: any): Promise<any> {
      const plugin = pluginManager.getPluginMetadata(pluginId);
      if (!plugin) {
        throw new Error(`Plugin ${pluginId} not found`);
      }
      
      // Execute plugin capabilities with test data
      const results: Record<string, any> = {};
      
      for (const capability of plugin.capabilities) {
        try {
          results[capability] = await pluginManager.executeCapability(
            pluginId,
            capability,
            testData
          );
        } catch (error) {
          results[capability] = { error: error.message };
        }
      }
      
      return results;
    },
    
    getMetrics(): PluginSystemMetrics {
      return {
        loadedPlugins: pluginManager.listLoadedPlugins().length,
        activePlugins: pluginManager.listLoadedPlugins()
          .filter(p => p.state === 'active').length,
        totalMemoryUsage: pluginManager.listLoadedPlugins()
          .reduce((total, plugin) => {
            const metrics = pluginManager.getPluginMetrics(plugin.name);
            return total + (metrics?.memoryUsage || 0);
          }, 0),
        totalExecutions: pluginManager.listLoadedPlugins()
          .reduce((total, plugin) => {
            const metrics = pluginManager.getPluginMetrics(plugin.name);
            return total + (metrics?.executionCount || 0);
          }, 0)
      };
    }
  };
}

// Configuration interfaces
export interface PluginSystemConfig {
  pluginDirectory?: string;
  sandboxTimeout?: number;
  sandboxMemoryLimit?: string;
  allowedModules?: string[];
  allowNetworking?: boolean;
  allowFileSystem?: boolean;
  maxConcurrentPlugins?: number;
  enableHotReload?: boolean;
  trustedPlugins?: string[];
  loadExamplePlugins?: boolean;
}

export interface PluginDevConfig extends PluginSystemConfig {
  loadExamplePlugins?: boolean;
}

export interface PluginDevEnvironment {
  pluginManager: PluginManager;
  reloadPlugin(pluginId: string): Promise<void>;
  testPlugin(pluginId: string, testData: any): Promise<any>;
  getMetrics(): PluginSystemMetrics;
}

export interface PluginSystemMetrics {
  loadedPlugins: number;
  activePlugins: number;
  totalMemoryUsage: number;
  totalExecutions: number;
}

/**
 * Utility function to validate plugin manifest
 */
export function validatePluginManifest(manifest: any): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const validator = new PluginValidator();
  return validator.validateManifest(manifest);
}

/**
 * Utility function to create plugin template
 */
export async function createPluginTemplate(
  name: string,
  options: PluginTemplateOptions
): Promise<void> {
  const templatePath = `./plugins/templates/${options.template || 'basic-plugin'}`;
  const targetPath = `./plugins/${name}`;
  
  // Copy template files
  await copyDirectory(templatePath, targetPath);
  
  // Update manifest with plugin details
  const manifestPath = `${targetPath}/manifest.json`;
  const manifest = JSON.parse(await readFile(manifestPath));
  
  manifest.name = name;
  manifest.description = options.description || `${name} plugin`;
  manifest.author = options.author || 'Unknown';
  manifest.capabilities = options.capabilities || ['process'];
  manifest.hooks = options.hooks || ['memory-ingestion'];
  
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log(`Created plugin template: ${name}`);
}

export interface PluginTemplateOptions {
  template?: string;
  description?: string;
  author?: string;
  capabilities?: string[];
  hooks?: string[];
}

// Utility functions (simplified implementations)
async function copyDirectory(src: string, dest: string): Promise<void> {
  // Implementation would copy directory recursively
  console.log(`Copying ${src} to ${dest}`);
}

async function readFile(path: string): Promise<string> {
  // Implementation would read file
  return '{}';
}

async function writeFile(path: string, content: string): Promise<void> {
  // Implementation would write file
  console.log(`Writing to ${path}`);
}
