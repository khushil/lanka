// Plugin Manager Implementation
// Core plugin management system for LANKA Memory System

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Worker } from 'worker_threads';

import {
  IPlugin,
  PluginFactory,
  PluginManifest,
  PluginState,
  PluginContext,
  PluginManagerConfig,
  PluginRegistryEntry,
  PluginInstallResult,
  PluginOperationResult,
  PluginMetrics,
  HookExecutionResult,
  CapabilityExecutionResult,
  PluginPermission
} from '../types';

import { DependencyResolver } from './dependency-resolver';
import { PluginSandbox } from '../security/plugin-sandbox';
import { PluginValidator } from '../security/plugin-validator';
import { EventBus } from '../communication/event-bus';
import { PluginLogger } from './plugin-logger';
import { PluginStorage } from './plugin-storage';
import { GraphAPI } from './graph-api';
import { MemoryAPI } from './memory-api';

export class PluginManager extends EventEmitter {
  private registry: Map<string, PluginRegistryEntry> = new Map();
  private dependencyResolver: DependencyResolver;
  private sandbox: PluginSandbox;
  private validator: PluginValidator;
  private eventBus: EventBus;
  private config: PluginManagerConfig;
  private isInitialized = false;
  private shutdownInProgress = false;

  constructor(config: PluginManagerConfig) {
    super();
    this.config = {
      maxConcurrentPlugins: 20,
      enableHotReload: false,
      defaultResourceLimits: {
        maxMemoryMB: 100,
        maxExecutionTimeMs: 30000,
        maxConcurrentOperations: 10,
        maxGraphTraversalDepth: 5,
        maxHttpRequests: 100
      },
      trustedPlugins: [],
      ...config
    };

    this.dependencyResolver = new DependencyResolver();
    this.sandbox = new PluginSandbox(this.config.sandboxConfig);
    this.validator = new PluginValidator();
    this.eventBus = new EventBus();
  }

  /**
   * Initialize the plugin manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('Plugin manager is already initialized');
    }

    try {
      // Initialize subsystems
      await this.sandbox.initialize();
      await this.validator.initialize();
      await this.eventBus.initialize();

      // Discover and validate plugin directory
      await this.ensurePluginDirectory();

      // Load trusted plugins automatically
      if (this.config.trustedPlugins && this.config.trustedPlugins.length > 0) {
        await this.loadTrustedPlugins();
      }

      this.isInitialized = true;
      this.emit('manager:initialized');

      console.log(`Plugin manager initialized with ${this.registry.size} plugins`);
    } catch (error) {
      console.error('Failed to initialize plugin manager:', error);
      throw error;
    }
  }

  /**
   * Shutdown the plugin manager and all plugins
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized || this.shutdownInProgress) {
      return;
    }

    this.shutdownInProgress = true;
    console.log('Shutting down plugin manager...');

    try {
      // Unload all plugins in dependency order
      const unloadOrder = this.dependencyResolver.getUnloadOrder(
        Array.from(this.registry.keys())
      );

      for (const pluginId of unloadOrder) {
        try {
          await this.unloadPlugin(pluginId);
        } catch (error) {
          console.error(`Error unloading plugin ${pluginId}:`, error);
        }
      }

      // Shutdown subsystems
      await this.eventBus.shutdown();
      await this.sandbox.shutdown();

      this.registry.clear();
      this.isInitialized = false;
      this.emit('manager:shutdown');

      console.log('Plugin manager shutdown complete');
    } catch (error) {
      console.error('Error during plugin manager shutdown:', error);
      throw error;
    } finally {
      this.shutdownInProgress = false;
    }
  }

  /**
   * Discover available plugins in the plugin directory
   */
  async discoverPlugins(): Promise<PluginManifest[]> {
    const pluginDir = this.config.pluginDirectory;
    const manifests: PluginManifest[] = [];

    try {
      const entries = await fs.readdir(pluginDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          try {
            const manifest = await this.loadManifest(path.join(pluginDir, entry.name));
            if (manifest) {
              manifests.push(manifest);
            }
          } catch (error) {
            console.warn(`Failed to load manifest for ${entry.name}:`, error);
          }
        }
      }

      return manifests;
    } catch (error) {
      console.error('Error discovering plugins:', error);
      return [];
    }
  }

  /**
   * Load a plugin by name or path
   */
  async loadPlugin(pluginId: string, options: {
    enabled?: boolean;
    config?: Record<string, any>;
  } = {}): Promise<PluginInstallResult> {
    try {
      if (this.registry.has(pluginId)) {
        return {
          success: false,
          error: `Plugin ${pluginId} is already loaded`
        };
      }

      // Load plugin manifest and factory
      const pluginPath = path.join(this.config.pluginDirectory, pluginId);
      const manifest = await this.loadManifest(pluginPath);
      
      if (!manifest) {
        return {
          success: false,
          error: `Plugin manifest not found for ${pluginId}`
        };
      }

      // Validate plugin manifest
      const validationResult = await this.validator.validateManifest(manifest);
      if (!validationResult.valid) {
        return {
          success: false,
          error: `Invalid plugin manifest: ${validationResult.errors.join(', ')}`
        };
      }

      // Load plugin factory
      const factory = await this.loadPluginFactory(pluginPath, manifest);
      if (!factory) {
        return {
          success: false,
          error: `Failed to load plugin factory for ${pluginId}`
        };
      }

      // Check dependencies
      const dependencyCheck = await this.dependencyResolver.checkDependencies(
        manifest.dependencies
      );
      if (!dependencyCheck.satisfied) {
        return {
          success: false,
          error: `Missing dependencies: ${dependencyCheck.missing.join(', ')}`
        };
      }

      // Create plugin registry entry
      const entry: PluginRegistryEntry = {
        manifest,
        factory,
        state: PluginState.LOADED,
        metrics: this.createInitialMetrics(pluginId),
        dependencies: manifest.dependencies.map(dep => ({
          name: typeof dep === 'string' ? dep : dep.name || dep,
          version: typeof dep === 'object' ? dep.version : undefined,
          optional: typeof dep === 'object' ? dep.optional : false
        })),
        dependents: []
      };

      // Register plugin
      this.registry.set(pluginId, entry);
      this.dependencyResolver.addPlugin(pluginId, entry.dependencies);

      // Initialize plugin if enabled
      if (options.enabled !== false) {
        const initResult = await this.initializePlugin(pluginId, options.config);
        if (!initResult.success) {
          this.registry.delete(pluginId);
          return {
            success: false,
            error: initResult.error
          };
        }
      }

      this.emit('plugin:loaded', { pluginId, manifest });
      
      return {
        success: true,
        pluginId,
        warnings: validationResult.warnings
      };
    } catch (error) {
      console.error(`Error loading plugin ${pluginId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginId: string): Promise<PluginOperationResult> {
    try {
      const entry = this.registry.get(pluginId);
      if (!entry) {
        return {
          success: false,
          error: `Plugin ${pluginId} is not loaded`
        };
      }

      // Check if other plugins depend on this one
      const dependents = this.dependencyResolver.getDependents(pluginId);
      if (dependents.length > 0) {
        return {
          success: false,
          error: `Cannot unload plugin ${pluginId}: required by ${dependents.join(', ')}`
        };
      }

      // Update state
      entry.state = PluginState.UNLOADING;

      // Shutdown plugin instance if active
      if (entry.instance && entry.state === PluginState.ACTIVE) {
        try {
          await entry.instance.shutdown();
        } catch (error) {
          console.warn(`Error shutting down plugin ${pluginId}:`, error);
        }
      }

      // Clean up context
      if (entry.context) {
        entry.context.eventBus.removeAllListeners();
      }

      // Remove from registry
      this.registry.delete(pluginId);
      this.dependencyResolver.removePlugin(pluginId);

      this.emit('plugin:unloaded', { pluginId, reason: 'manual' });

      return { success: true };
    } catch (error) {
      console.error(`Error unloading plugin ${pluginId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute a plugin hook
   */
  async executeHook(hookName: string, ...args: any[]): Promise<HookExecutionResult[]> {
    const results: HookExecutionResult[] = [];
    const hookMethodName = `on${hookName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())}`;

    for (const [pluginId, entry] of this.registry) {
      if (entry.state !== PluginState.ACTIVE || !entry.instance) {
        continue;
      }

      if (entry.manifest.hooks.includes(hookName) && 
          typeof entry.instance[hookMethodName] === 'function') {
        try {
          const startTime = Date.now();
          const result = await this.executeInSandbox(
            pluginId,
            () => entry.instance![hookMethodName](...args)
          );
          
          this.updateExecutionMetrics(pluginId, Date.now() - startTime);
          
          results.push({
            proceed: true,
            modifications: result,
            metadata: { pluginId, executionTime: Date.now() - startTime }
          });
        } catch (error) {
          console.error(`Hook ${hookName} failed in plugin ${pluginId}:`, error);
          this.updateErrorMetrics(pluginId, error);
          
          results.push({
            proceed: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            metadata: { pluginId }
          });
        }
      }
    }

    return results;
  }

  /**
   * Execute a plugin capability
   */
  async executeCapability(
    pluginId: string, 
    capability: string, 
    ...args: any[]
  ): Promise<CapabilityExecutionResult> {
    try {
      const entry = this.registry.get(pluginId);
      if (!entry || entry.state !== PluginState.ACTIVE || !entry.instance) {
        return {
          success: false,
          error: `Plugin ${pluginId} is not active`
        };
      }

      if (!entry.manifest.capabilities.includes(capability)) {
        return {
          success: false,
          error: `Plugin ${pluginId} does not support capability ${capability}`
        };
      }

      if (typeof entry.instance[capability] !== 'function') {
        return {
          success: false,
          error: `Capability ${capability} is not implemented in plugin ${pluginId}`
        };
      }

      const startTime = Date.now();
      const result = await this.executeInSandbox(
        pluginId,
        () => entry.instance![capability](...args)
      );
      const executionTime = Date.now() - startTime;

      this.updateExecutionMetrics(pluginId, executionTime);

      return {
        success: true,
        data: result,
        metrics: {
          executionTime,
          memoryUsage: 0, // TODO: Implement memory tracking
          apiCalls: 0,    // TODO: Implement API call tracking
          cacheHits: 0,   // TODO: Implement cache tracking
          cacheMisses: 0
        }
      };
    } catch (error) {
      console.error(`Capability ${capability} failed in plugin ${pluginId}:`, error);
      this.updateErrorMetrics(pluginId, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if a plugin is loaded
   */
  isPluginLoaded(pluginId: string): boolean {
    return this.registry.has(pluginId);
  }

  /**
   * Get plugin metadata
   */
  getPluginMetadata(pluginId: string): PluginManifest | null {
    const entry = this.registry.get(pluginId);
    return entry ? entry.manifest : null;
  }

  /**
   * List all loaded plugins
   */
  listLoadedPlugins(): Array<{ name: string; state: PluginState; metadata: PluginManifest }> {
    return Array.from(this.registry.entries()).map(([id, entry]) => ({
      name: id,
      state: entry.state,
      metadata: entry.manifest
    }));
  }

  /**
   * Get plugin metrics
   */
  getPluginMetrics(pluginId: string): PluginMetrics | null {
    const entry = this.registry.get(pluginId);
    return entry ? entry.metrics : null;
  }

  // Private methods

  private async ensurePluginDirectory(): Promise<void> {
    try {
      await fs.access(this.config.pluginDirectory);
    } catch {
      await fs.mkdir(this.config.pluginDirectory, { recursive: true });
    }
  }

  private async loadTrustedPlugins(): Promise<void> {
    for (const pluginId of this.config.trustedPlugins!) {
      try {
        await this.loadPlugin(pluginId, { enabled: true });
      } catch (error) {
        console.warn(`Failed to load trusted plugin ${pluginId}:`, error);
      }
    }
  }

  private async loadManifest(pluginPath: string): Promise<PluginManifest | null> {
    try {
      const manifestPath = path.join(pluginPath, 'manifest.json');
      const manifestData = await fs.readFile(manifestPath, 'utf-8');
      return JSON.parse(manifestData);
    } catch {
      // Try package.json as fallback
      try {
        const packagePath = path.join(pluginPath, 'package.json');
        const packageData = await fs.readFile(packagePath, 'utf-8');
        const pkg = JSON.parse(packageData);
        
        if (pkg.lanka && pkg.lanka.plugin) {
          return {
            name: pkg.name,
            version: pkg.version,
            description: pkg.description,
            author: pkg.author,
            license: pkg.license,
            ...pkg.lanka.plugin
          };
        }
      } catch {}
      
      return null;
    }
  }

  private async loadPluginFactory(pluginPath: string, manifest: PluginManifest): Promise<PluginFactory | null> {
    try {
      const mainFile = path.join(pluginPath, 'index.js');
      const module = await import(mainFile);
      return module.default || module;
    } catch (error) {
      console.error(`Failed to load plugin factory from ${pluginPath}:`, error);
      return null;
    }
  }

  private async initializePlugin(pluginId: string, config?: Record<string, any>): Promise<PluginOperationResult> {
    try {
      const entry = this.registry.get(pluginId)!;
      entry.state = PluginState.INITIALIZING;

      // Create plugin instance
      entry.instance = entry.factory();

      // Validate plugin instance
      const instanceValidation = this.validator.validateInstance(entry.instance, entry.manifest);
      if (!instanceValidation.valid) {
        return {
          success: false,
          error: `Invalid plugin instance: ${instanceValidation.errors.join(', ')}`
        };
      }

      // Create plugin context
      entry.context = await this.createPluginContext(pluginId, config);

      // Initialize plugin
      await this.executeInSandbox(
        pluginId,
        () => entry.instance!.initialize(entry.context!)
      );

      entry.state = PluginState.ACTIVE;
      entry.metrics.loadTime = new Date();

      this.emit('plugin:initialized', { pluginId });

      return { success: true };
    } catch (error) {
      console.error(`Failed to initialize plugin ${pluginId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async createPluginContext(pluginId: string, config?: Record<string, any>): Promise<PluginContext> {
    const entry = this.registry.get(pluginId)!;
    
    return {
      pluginId,
      permissions: entry.manifest.requiredPermissions || [],
      config: config || {},
      resourceLimits: this.config.defaultResourceLimits!,
      eventBus: this.eventBus.createPluginEventBus(pluginId),
      logger: new PluginLogger(pluginId),
      storage: new PluginStorage(pluginId),
      graph: new GraphAPI(pluginId, entry.manifest.requiredPermissions || []),
      memory: new MemoryAPI(pluginId, entry.manifest.requiredPermissions || [])
    };
  }

  private async executeInSandbox<T>(pluginId: string, operation: () => Promise<T> | T): Promise<T> {
    return this.sandbox.execute(pluginId, operation);
  }

  private createInitialMetrics(pluginId: string): PluginMetrics {
    return {
      pluginId,
      state: PluginState.LOADED,
      loadTime: new Date(),
      executionCount: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      errorCount: 0,
      memoryUsage: 0,
      resourceUsage: {
        memory: 0,
        cpu: 0,
        httpRequests: 0,
        graphOperations: 0,
        storageOperations: 0
      }
    };
  }

  private updateExecutionMetrics(pluginId: string, executionTime: number): void {
    const entry = this.registry.get(pluginId);
    if (entry) {
      entry.metrics.executionCount++;
      entry.metrics.totalExecutionTime += executionTime;
      entry.metrics.averageExecutionTime = entry.metrics.totalExecutionTime / entry.metrics.executionCount;
    }
  }

  private updateErrorMetrics(pluginId: string, error: any): void {
    const entry = this.registry.get(pluginId);
    if (entry) {
      entry.metrics.errorCount++;
      entry.metrics.lastError = error instanceof Error ? error.message : String(error);
    }
  }
}
