// Basic Plugin Template
// Template for creating LANKA Memory System plugins

import {
  IPlugin,
  PluginManifest,
  PluginContext,
  MemoryNode,
  HookExecutionResult,
  MemorySearchQuery
} from '../../types';

// Export plugin factory function
export default function createMyPlugin(): IPlugin {
  return new MyPlugin();
}

/**
 * Basic plugin implementation
 * 
 * This template demonstrates the essential structure of a LANKA plugin.
 * Implement the required methods and add your custom logic.
 */
class MyPlugin implements IPlugin {
  private context!: PluginContext;
  private isInitialized = false;

  /**
   * Return plugin metadata
   * This should match your manifest.json file
   */
  getMetadata(): PluginManifest {
    return {
      name: 'my-plugin',
      version: '1.0.0',
      description: 'A basic LANKA Memory System plugin template',
      author: 'Your Name',
      license: 'MIT',
      capabilities: ['process', 'analyze'],
      hooks: ['memory-ingestion', 'post-search'],
      dependencies: [],
      requiredPermissions: [
        'read-memory',
        'plugin-communication'
      ],
      resourceLimits: {
        maxMemoryMB: 100,
        maxExecutionTimeMs: 5000,
        maxConcurrentOperations: 3
      }
    };
  }

  /**
   * Initialize the plugin
   * 
   * @param context Plugin context with access to system APIs
   */
  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    
    this.context.logger.info('Initializing My Plugin');
    
    try {
      // Initialize your plugin here
      await this.setupPlugin();
      
      // Subscribe to events if needed
      this.context.eventBus.subscribe(
        'plugin:my-event',
        this.handleMyEvent.bind(this)
      );
      
      this.isInitialized = true;
      this.context.logger.info('My Plugin initialized successfully');
      
    } catch (error) {
      this.context.logger.error('Failed to initialize My Plugin', error);
      throw error;
    }
  }

  /**
   * Shutdown the plugin
   * 
   * Clean up resources and persist state if needed
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }
    
    this.context.logger.info('Shutting down My Plugin');
    
    try {
      // Cleanup your plugin here
      await this.cleanupPlugin();
      
      // Remove event listeners
      this.context.eventBus.removeAllListeners();
      
      this.isInitialized = false;
      this.context.logger.info('My Plugin shutdown complete');
      
    } catch (error) {
      this.context.logger.error('Error during My Plugin shutdown', error);
    }
  }

  // Hook implementations

  /**
   * Memory ingestion hook
   * 
   * Called when new memories are being ingested into the system
   * 
   * @param memory The memory being ingested
   * @returns Hook execution result
   */
  async onMemoryIngestion(memory: MemoryNode): Promise<HookExecutionResult> {
    try {
      if (!this.context.config.enableFeature) {
        return { proceed: true };
      }
      
      this.context.logger.debug(`Processing memory ingestion: ${memory.id}`);
      
      // Your processing logic here
      const result = await this.processMemory(memory);
      
      if (result.shouldModify) {
        return {
          proceed: true,
          modifications: {
            metadata: {
              ...memory.metadata,
              myPluginProcessed: true,
              myPluginResult: result.data,
              processedAt: new Date().toISOString()
            }
          },
          metadata: {
            pluginResult: result,
            pluginId: this.context.pluginId
          }
        };
      }
      
      return { proceed: true };
      
    } catch (error) {
      this.context.logger.error('Error in onMemoryIngestion hook', error);
      
      // Don't block the pipeline on plugin errors
      return {
        proceed: true,
        error: `Plugin error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Post-search hook
   * 
   * Called after search operations to potentially modify results
   * 
   * @param results Search results
   * @param query Original search query
   * @returns Hook execution result
   */
  async onPostSearch(
    results: MemoryNode[],
    query: MemorySearchQuery
  ): Promise<HookExecutionResult> {
    try {
      if (!this.context.config.enableFeature) {
        return { proceed: true };
      }
      
      this.context.logger.debug(
        `Processing post-search: ${results.length} results for query`
      );
      
      // Your search result processing logic here
      const enhancedResults = await this.enhanceSearchResults(results, query);
      
      return {
        proceed: true,
        modifications: enhancedResults,
        metadata: {
          pluginEnhanced: true,
          pluginId: this.context.pluginId
        }
      };
      
    } catch (error) {
      this.context.logger.error('Error in onPostSearch hook', error);
      
      // Return original results on error
      return { proceed: true };
    }
  }

  // Capability implementations

  /**
   * Process capability
   * 
   * Main processing function exposed as a capability
   * 
   * @param input Input data to process
   * @returns Processing result
   */
  async process(input: any): Promise<any> {
    this.context.logger.debug('Processing input via capability');
    
    try {
      // Validate input
      if (!input) {
        throw new Error('Input is required');
      }
      
      // Your processing logic here
      const result = await this.performProcessing(input);
      
      // Log successful processing
      this.context.logger.debug('Processing completed successfully');
      
      return result;
      
    } catch (error) {
      this.context.logger.error('Error in process capability', error);
      throw error;
    }
  }

  /**
   * Analyze capability
   * 
   * Analysis function exposed as a capability
   * 
   * @param data Data to analyze
   * @returns Analysis result
   */
  async analyze(data: any): Promise<AnalysisResult> {
    this.context.logger.debug('Analyzing data via capability');
    
    try {
      // Validate data
      if (!data) {
        throw new Error('Data is required for analysis');
      }
      
      // Your analysis logic here
      const analysis = await this.performAnalysis(data);
      
      return {
        confidence: analysis.confidence || 0.5,
        insights: analysis.insights || [],
        recommendations: analysis.recommendations || [],
        metadata: {
          analyzedAt: new Date().toISOString(),
          pluginVersion: this.getMetadata().version
        }
      };
      
    } catch (error) {
      this.context.logger.error('Error in analyze capability', error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Setup plugin during initialization
   */
  private async setupPlugin(): Promise<void> {
    // Load any configuration or data needed by your plugin
    
    // Example: Load stored data
    try {
      const storedData = await this.context.storage.get('plugin-data');
      if (storedData) {
        this.context.logger.debug('Loaded plugin data from storage');
      }
    } catch (error) {
      this.context.logger.warn('No stored data found, starting fresh');
    }
    
    // Example: Initialize external connections
    // await this.connectToExternalService();
  }

  /**
   * Cleanup plugin during shutdown
   */
  private async cleanupPlugin(): Promise<void> {
    // Save any state that should persist
    
    // Example: Save data to storage
    try {
      await this.context.storage.set('plugin-data', {
        shutdownTime: new Date().toISOString(),
        // ... other data to persist
      });
    } catch (error) {
      this.context.logger.error('Error saving plugin data', error);
    }
    
    // Example: Close external connections
    // await this.disconnectFromExternalService();
  }

  /**
   * Process a memory during ingestion
   */
  private async processMemory(memory: MemoryNode): Promise<ProcessingResult> {
    // Implement your memory processing logic here
    
    const threshold = this.context.config.threshold || 0.5;
    
    // Example processing
    const score = this.calculateScore(memory.content);
    const shouldModify = score > threshold;
    
    return {
      shouldModify,
      data: {
        score,
        threshold,
        processed: true
      }
    };
  }

  /**
   * Enhance search results
   */
  private async enhanceSearchResults(
    results: MemoryNode[],
    query: MemorySearchQuery
  ): Promise<MemoryNode[]> {
    // Implement your search result enhancement logic here
    
    return results.map(result => ({
      ...result,
      metadata: {
        ...result.metadata,
        enhancedByPlugin: true,
        enhancementScore: this.calculateEnhancementScore(result, query)
      }
    }));
  }

  /**
   * Main processing function
   */
  private async performProcessing(input: any): Promise<any> {
    // Implement your core processing logic here
    
    return {
      processed: true,
      inputType: typeof input,
      timestamp: new Date().toISOString(),
      result: `Processed: ${JSON.stringify(input).slice(0, 100)}`
    };
  }

  /**
   * Main analysis function
   */
  private async performAnalysis(data: any): Promise<any> {
    // Implement your core analysis logic here
    
    return {
      confidence: 0.8,
      insights: [
        'This is a sample insight',
        'Analysis completed successfully'
      ],
      recommendations: [
        'Consider implementing additional features',
        'Monitor performance metrics'
      ]
    };
  }

  /**
   * Calculate a score for memory content
   */
  private calculateScore(content: string): number {
    // Simple example scoring - replace with your logic
    return Math.min(content.length / 1000, 1.0);
  }

  /**
   * Calculate enhancement score for search results
   */
  private calculateEnhancementScore(
    result: MemoryNode,
    query: MemorySearchQuery
  ): number {
    // Simple example - replace with your logic
    if (query.text && result.content.includes(query.text)) {
      return 0.9;
    }
    return 0.5;
  }

  /**
   * Handle custom events
   */
  private async handleMyEvent(event: any): Promise<void> {
    this.context.logger.debug('Handling custom event', event);
    
    // Implement your event handling logic here
  }
}

// Supporting interfaces

interface ProcessingResult {
  shouldModify: boolean;
  data: any;
}

interface AnalysisResult {
  confidence: number;
  insights: string[];
  recommendations: string[];
  metadata: {
    analyzedAt: string;
    pluginVersion: string;
  };
}
