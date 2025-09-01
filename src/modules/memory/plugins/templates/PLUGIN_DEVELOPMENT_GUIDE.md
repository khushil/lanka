# LANKA Memory System Plugin Development Guide

This guide provides comprehensive instructions for developing plugins for the LANKA Memory System. Plugins enable you to extend the system's capabilities with custom functionality while maintaining security and performance.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Plugin Architecture](#plugin-architecture)
3. [Development Environment](#development-environment)
4. [Plugin Structure](#plugin-structure)
5. [API Reference](#api-reference)
6. [Hooks System](#hooks-system)
7. [Capabilities](#capabilities)
8. [Security Guidelines](#security-guidelines)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Best Practices](#best-practices)
12. [Examples](#examples)

## Quick Start

### 1. Create a New Plugin

```bash
# Copy the basic plugin template
cp -r src/modules/memory/plugins/templates/basic-plugin my-awesome-plugin
cd my-awesome-plugin

# Update the manifest.json with your plugin details
# Update index.ts with your plugin logic
```

### 2. Install Your Plugin

```typescript
import { PluginManager } from '../core/plugin-manager';

const pluginManager = new PluginManager({
  pluginDirectory: './plugins',
  sandboxConfig: {
    timeout: 30000,
    memoryLimit: '100MB',
    allowedModules: ['lodash']
  }
});

// Install and load your plugin
await pluginManager.loadPlugin('my-awesome-plugin', {
  enabled: true,
  config: {
    enableFeature: true,
    threshold: 0.8
  }
});
```

## Plugin Architecture

LANKA plugins follow a modular architecture with several key components:

### Core Components

- **Plugin Manager**: Handles plugin lifecycle, security, and coordination
- **Event Bus**: Enables communication between plugins and the system
- **Hook System**: Provides integration points in the memory pipeline
- **Capability System**: Exposes plugin functionality to other components
- **Security Sandbox**: Ensures plugins run in isolated environments

### Plugin Lifecycle

1. **Discovery**: Plugin Manager finds available plugins
2. **Validation**: Manifest and code validation
3. **Loading**: Plugin code is loaded into memory
4. **Initialization**: Plugin setup and resource allocation
5. **Active**: Plugin processes events and provides capabilities
6. **Shutdown**: Clean resource cleanup and state persistence

## Development Environment

### Prerequisites

- Node.js 18+ with TypeScript support
- Access to LANKA Memory System core modules
- Understanding of memory system concepts

### Setup

```bash
# Install dependencies
npm install typescript @types/node

# Set up development environment
npm run dev:setup
```

### Project Structure

```
my-plugin/
├── manifest.json          # Plugin metadata and configuration
├── index.ts              # Main plugin implementation  
├── package.json          # NPM package configuration (optional)
├── README.md             # Plugin documentation
├── tests/                # Unit and integration tests
│   ├── plugin.test.ts
│   └── integration.test.ts
└── docs/                 # Additional documentation
    └── api.md
```

## Plugin Structure

### Manifest File (manifest.json)

```json
{
  "name": "my-awesome-plugin",
  "version": "1.0.0",
  "description": "Plugin description",
  "author": "Your Name",
  "license": "MIT",
  "capabilities": ["process", "analyze"],
  "hooks": ["memory-ingestion", "post-search"],
  "dependencies": [],
  "requiredPermissions": [
    "read-memory",
    "write-memory",
    "plugin-communication"
  ],
  "resourceLimits": {
    "maxMemoryMB": 100,
    "maxExecutionTimeMs": 5000,
    "maxConcurrentOperations": 3
  },
  "configuration": {
    "threshold": {
      "type": "number",
      "default": 0.5,
      "description": "Processing threshold"
    }
  }
}
```

### Plugin Implementation

```typescript
import { 
  IPlugin, 
  PluginContext, 
  MemoryNode, 
  HookExecutionResult 
} from '../../types';

export default function createMyPlugin(): IPlugin {
  return new MyPlugin();
}

class MyPlugin implements IPlugin {
  private context!: PluginContext;
  
  getMetadata(): PluginManifest {
    // Return plugin metadata matching manifest.json
  }
  
  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    // Initialize your plugin
  }
  
  async shutdown(): Promise<void> {
    // Clean up resources
  }
  
  // Hook implementations
  async onMemoryIngestion(memory: MemoryNode): Promise<HookExecutionResult> {
    // Process memory during ingestion
  }
  
  // Capability implementations
  async process(input: any): Promise<any> {
    // Implement your processing capability
  }
}
```

## API Reference

### Plugin Context

The plugin context provides access to system APIs:

```typescript
interface PluginContext {
  pluginId: string;                    // Unique plugin identifier
  workspace?: string;                  // Current workspace
  permissions: PluginPermission[];     // Granted permissions
  config: Record<string, any>;        // Plugin configuration
  resourceLimits: PluginResourceLimits; // Resource constraints
  eventBus: EventEmitter;             // Event communication
  logger: PluginLogger;               // Structured logging
  storage: PluginStorage;             // Persistent storage
  graph: GraphAPI;                    // Graph database access
  memory: MemoryAPI;                  // Memory operations
}
```

### Memory API

```typescript
interface MemoryAPI {
  store(memory: Partial<MemoryNode>): Promise<string>;
  retrieve(id: string): Promise<MemoryNode | null>;
  search(query: MemorySearchQuery): Promise<MemoryNode[]>;
  update(id: string, updates: Partial<MemoryNode>): Promise<void>;
  delete(id: string): Promise<void>;
  createEmbedding(text: string): Promise<number[]>;
  findSimilar(embedding: number[], threshold?: number): Promise<MemoryNode[]>;
}
```

### Graph API

```typescript
interface GraphAPI {
  createNode(type: string, properties: Record<string, any>): Promise<string>;
  updateNode(id: string, properties: Record<string, any>): Promise<void>;
  deleteNode(id: string): Promise<void>;
  createRelationship(
    fromId: string, 
    toId: string, 
    type: string, 
    properties?: Record<string, any>
  ): Promise<string>;
  findNodes(query: GraphQuery): Promise<MemoryNode[]>;
  traverseGraph(startId: string, traversal: GraphTraversal): Promise<MemoryNode[]>;
}
```

## Hooks System

Hooks provide integration points in the memory system pipeline:

### Available Hooks

- **memory-ingestion**: Called when memories are being ingested
- **memory-arbitration**: Called during memory conflict resolution
- **memory-stored**: Called after memories are successfully stored
- **memory-retrieved**: Called when memories are retrieved
- **memory-updated**: Called when memories are updated
- **memory-deleted**: Called when memories are deleted
- **pre-search**: Called before search operations
- **post-search**: Called after search operations
- **query-enhancement**: Called to enhance search queries
- **result-enhancement**: Called to enhance search results
- **node-created**: Called when graph nodes are created
- **relationship-created**: Called when graph relationships are created
- **graph-traversal**: Called during graph traversals
- **system-startup**: Called during system initialization
- **system-shutdown**: Called during system shutdown
- **workspace-changed**: Called when workspace changes
- **error-occurred**: Called when errors occur
- **contradiction-detected**: Called when memory contradictions are found

### Hook Implementation

```typescript
// Memory ingestion hook
async onMemoryIngestion(memory: MemoryNode): Promise<HookExecutionResult> {
  try {
    // Your processing logic here
    const result = await this.processMemory(memory);
    
    return {
      proceed: true,
      modifications: {
        metadata: {
          ...memory.metadata,
          processedBy: this.context.pluginId,
          processingResult: result
        }
      },
      metadata: {
        pluginId: this.context.pluginId,
        processingTime: Date.now()
      }
    };
  } catch (error) {
    this.context.logger.error('Hook execution failed', error);
    return {
      proceed: false,
      error: error.message
    };
  }
}

// Post-search hook
async onPostSearch(
  results: MemoryNode[], 
  query: MemorySearchQuery
): Promise<HookExecutionResult> {
  // Enhance search results
  const enhancedResults = results.map(result => ({
    ...result,
    metadata: {
      ...result.metadata,
      searchRelevanceScore: this.calculateRelevance(result, query)
    }
  }));
  
  return {
    proceed: true,
    modifications: enhancedResults
  };
}
```

## Capabilities

Capabilities expose plugin functionality to other system components:

```typescript
class MyPlugin implements IPlugin {
  // Capability: process data
  async process(input: ProcessingInput): Promise<ProcessingResult> {
    this.validateInput(input);
    
    const result = await this.performProcessing(input);
    
    return {
      success: true,
      data: result,
      metadata: {
        processedAt: new Date(),
        processingTime: result.duration
      }
    };
  }
  
  // Capability: analyze data
  async analyze(data: any): Promise<AnalysisResult> {
    const analysis = await this.performAnalysis(data);
    
    return {
      insights: analysis.insights,
      confidence: analysis.confidence,
      recommendations: analysis.recommendations
    };
  }
}
```

## Security Guidelines

### Permissions

Declare all required permissions in your manifest:

```json
{
  "requiredPermissions": [
    "read-memory",           // Read memory data
    "write-memory",          // Modify memory data  
    "delete-memory",         // Delete memories
    "create-relationships",  // Create graph relationships
    "modify-graph",          // Modify graph structure
    "access-embeddings",     // Access vector embeddings
    "external-http",         // Make HTTP requests
    "file-system",          // Access file system
    "plugin-communication", // Communicate with other plugins
    "system-events"          // Access system-level events
  ]
}
```

### Resource Limits

Set appropriate resource limits:

```json
{
  "resourceLimits": {
    "maxMemoryMB": 100,                // Maximum memory usage
    "maxExecutionTimeMs": 5000,       // Maximum execution time
    "maxConcurrentOperations": 3,     // Concurrent operation limit
    "maxGraphTraversalDepth": 5,      // Graph traversal depth limit
    "maxHttpRequests": 100            // HTTP request limit
  }
}
```

### Input Validation

```typescript
class MyPlugin implements IPlugin {
  async process(input: any): Promise<any> {
    // Validate input
    if (!input || typeof input !== 'object') {
      throw new Error('Invalid input: object required');
    }
    
    // Sanitize sensitive data
    const sanitized = this.sanitizeInput(input);
    
    // Process safely
    return await this.safeProcessing(sanitized);
  }
  
  private sanitizeInput(input: any): any {
    // Remove or mask sensitive information
    const sanitized = { ...input };
    
    // Example: Remove password fields
    if (sanitized.password) {
      delete sanitized.password;
    }
    
    return sanitized;
  }
}
```

## Testing

### Unit Tests

```typescript
// tests/plugin.test.ts
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import createMyPlugin from '../index';
import { MockPluginContext } from '../../testing/mocks';

describe('MyPlugin', () => {
  let plugin: IPlugin;
  let mockContext: MockPluginContext;
  
  beforeEach(async () => {
    plugin = createMyPlugin();
    mockContext = new MockPluginContext('my-plugin');
    await plugin.initialize(mockContext);
  });
  
  afterEach(async () => {
    await plugin.shutdown();
  });
  
  it('should process memory correctly', async () => {
    const memory = createTestMemory();
    const result = await plugin.onMemoryIngestion(memory);
    
    expect(result.proceed).toBe(true);
    expect(result.modifications).toBeDefined();
  });
  
  it('should handle errors gracefully', async () => {
    const invalidInput = null;
    
    await expect(plugin.process(invalidInput))
      .rejects.toThrow('Invalid input');
  });
});
```

### Integration Tests

```typescript
// tests/integration.test.ts
import { PluginManager } from '../../core/plugin-manager';
import { MemoryFixtures } from '../../testing/fixtures';

describe('MyPlugin Integration', () => {
  let pluginManager: PluginManager;
  
  beforeEach(async () => {
    pluginManager = new PluginManager({
      pluginDirectory: './test-plugins',
      sandboxConfig: { timeout: 5000, memoryLimit: '50MB' }
    });
    
    await pluginManager.initialize();
    await pluginManager.loadPlugin('my-plugin');
  });
  
  it('should integrate with memory system', async () => {
    const memory = MemoryFixtures.createSystem1Memory();
    const results = await pluginManager.executeHook('memory-ingestion', memory);
    
    expect(results).toHaveLength(1);
    expect(results[0].proceed).toBe(true);
  });
});
```

## Deployment

### Local Development

```bash
# Install plugin locally
cp -r my-plugin /path/to/lanka/plugins/

# Load plugin in LANKA
const pluginManager = new PluginManager({ pluginDirectory: './plugins' });
await pluginManager.loadPlugin('my-plugin');
```

### Production Deployment

```bash
# Package plugin
npm pack

# Deploy to plugin registry (if available)
npm publish --registry=https://your-plugin-registry.com

# Install from registry
npm install @your-org/my-plugin
```

### Plugin Registry

```json
// package.json
{
  "name": "@your-org/my-plugin",
  "version": "1.0.0",
  "main": "dist/index.js",
  "files": ["dist", "manifest.json"],
  "keywords": ["lanka", "memory-system", "plugin"],
  "lanka": {
    "plugin": true,
    "manifestPath": "./manifest.json"
  }
}
```

## Best Practices

### 1. Error Handling

```typescript
class MyPlugin implements IPlugin {
  async onMemoryIngestion(memory: MemoryNode): Promise<HookExecutionResult> {
    try {
      // Plugin logic here
      const result = await this.processMemory(memory);
      return { proceed: true, modifications: result };
    } catch (error) {
      // Log error but don't block the pipeline
      this.context.logger.error('Processing failed', { error, memoryId: memory.id });
      
      // Let the memory continue through the pipeline
      return { proceed: true, error: error.message };
    }
  }
}
```

### 2. Asynchronous Operations

```typescript
class MyPlugin implements IPlugin {
  async process(input: any): Promise<any> {
    // Use Promise.all for parallel operations
    const [analysis, validation, enrichment] = await Promise.all([
      this.analyzeInput(input),
      this.validateInput(input),
      this.enrichInput(input)
    ]);
    
    return { analysis, validation, enrichment };
  }
  
  // Use timeouts for external calls
  private async callExternalAPI(data: any): Promise<any> {
    const timeout = this.context.resourceLimits.maxExecutionTimeMs || 5000;
    
    return Promise.race([
      fetch('https://api.example.com/analyze', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeout)
      )
    ]);
  }
}
```

### 3. Memory Management

```typescript
class MyPlugin implements IPlugin {
  private cache = new Map<string, any>();
  
  async process(input: any): Promise<any> {
    // Implement caching to reduce memory pressure
    const cacheKey = this.generateCacheKey(input);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const result = await this.expensiveOperation(input);
    
    // Limit cache size
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(cacheKey, result);
    return result;
  }
  
  async shutdown(): Promise<void> {
    // Clear cache on shutdown
    this.cache.clear();
  }
}
```

### 4. Logging and Monitoring

```typescript
class MyPlugin implements IPlugin {
  async process(input: any): Promise<any> {
    const startTime = Date.now();
    
    this.context.logger.info('Processing started', {
      inputSize: JSON.stringify(input).length,
      timestamp: new Date().toISOString()
    });
    
    try {
      const result = await this.performProcessing(input);
      
      this.context.logger.info('Processing completed', {
        duration: Date.now() - startTime,
        resultSize: JSON.stringify(result).length
      });
      
      return result;
    } catch (error) {
      this.context.logger.error('Processing failed', {
        error: error.message,
        duration: Date.now() - startTime,
        stack: error.stack
      });
      
      throw error;
    }
  }
}
```

### 5. Configuration Management

```typescript
class MyPlugin implements IPlugin {
  private config: PluginConfig;
  
  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    
    // Merge default config with user config
    this.config = {
      threshold: 0.5,
      batchSize: 100,
      enableCaching: true,
      ...context.config
    };
    
    // Validate configuration
    this.validateConfig();
    
    this.context.logger.info('Plugin initialized', {
      config: this.config
    });
  }
  
  private validateConfig(): void {
    if (this.config.threshold < 0 || this.config.threshold > 1) {
      throw new Error('Threshold must be between 0 and 1');
    }
    
    if (this.config.batchSize < 1) {
      throw new Error('Batch size must be positive');
    }
  }
}
```

## Examples

See the example plugins in the `examples/` directory:

- [Security Analyzer](./examples/security-analyzer/) - Advanced security analysis
- [Performance Analyzer](./examples/performance-analyzer/) - Performance monitoring
- [Pattern Detector](./examples/pattern-detector/) - Pattern recognition and learning
- [Documentation Generator](./examples/documentation-generator/) - Automated documentation

## Advanced Topics

### Plugin Communication

```typescript
// Plugin A - Producer
class ProducerPlugin implements IPlugin {
  async process(data: any): Promise<any> {
    const result = await this.analyze(data);
    
    // Emit event for other plugins
    this.context.eventBus.emit('analysis-completed', {
      pluginId: this.context.pluginId,
      result,
      timestamp: new Date()
    });
    
    return result;
  }
}

// Plugin B - Consumer
class ConsumerPlugin implements IPlugin {
  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    
    // Subscribe to events from other plugins
    context.eventBus.subscribe('analysis-completed', this.handleAnalysis.bind(this));
  }
  
  private async handleAnalysis(event: any): Promise<void> {
    this.context.logger.info('Received analysis result', event);
    
    // Process the analysis result
    await this.processAnalysisResult(event.result);
  }
}
```

### Custom Graph Operations

```typescript
class GraphPlugin implements IPlugin {
  async createCustomRelationships(memory: MemoryNode): Promise<void> {
    // Find related memories
    const similar = await this.context.memory.findSimilar(
      memory.embedding!, 
      0.8
    );
    
    // Create custom relationships
    for (const related of similar) {
      await this.context.graph.createRelationship(
        memory.id,
        related.id,
        'SEMANTICALLY_SIMILAR',
        {
          similarity: this.calculateSimilarity(memory, related),
          createdBy: this.context.pluginId,
          createdAt: new Date().toISOString()
        }
      );
    }
  }
}
```

### Performance Optimization

```typescript
class OptimizedPlugin implements IPlugin {
  private processingQueue: ProcessingQueue;
  
  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    
    // Initialize batch processing queue
    this.processingQueue = new ProcessingQueue({
      batchSize: 10,
      maxWaitTime: 1000,
      processor: this.processBatch.bind(this)
    });
  }
  
  async process(input: any): Promise<any> {
    // Queue input for batch processing
    return await this.processingQueue.add(input);
  }
  
  private async processBatch(items: any[]): Promise<any[]> {
    // Process items in batch for better performance
    const results = await Promise.all(
      items.map(item => this.processItem(item))
    );
    
    return results;
  }
}
```

## Troubleshooting

### Common Issues

1. **Plugin Not Loading**
   - Check manifest.json syntax
   - Verify plugin directory structure
   - Check console logs for validation errors

2. **Hook Not Executing**
   - Verify hook name in manifest matches implementation
   - Check if plugin is active
   - Ensure proper method signature

3. **Permission Denied**
   - Add required permissions to manifest
   - Check if sandbox restrictions are blocking operations

4. **Memory/Timeout Issues**
   - Increase resource limits in manifest
   - Optimize plugin code for performance
   - Implement proper cleanup in shutdown method

### Debug Mode

```typescript
// Enable debug logging
const pluginManager = new PluginManager({
  pluginDirectory: './plugins',
  enableDebug: true,
  sandboxConfig: {
    timeout: 30000,
    memoryLimit: '200MB'
  }
});

// Plugin debug logging
class MyPlugin implements IPlugin {
  async process(input: any): Promise<any> {
    this.context.logger.debug('Processing input', { 
      inputType: typeof input,
      inputKeys: Object.keys(input || {})
    });
    
    // Your code here
  }
}
```

## Contributing

To contribute to the plugin system:

1. Follow the coding standards outlined in this guide
2. Include comprehensive tests for your changes
3. Update documentation as needed
4. Submit pull requests with clear descriptions

## Support

For plugin development support:

- Check the API documentation
- Review example plugins
- Join the developer community discussions
- Report issues in the project repository

---

**Remember**: Plugins should enhance the memory system without compromising security, performance, or reliability. Always test thoroughly and follow security best practices.
