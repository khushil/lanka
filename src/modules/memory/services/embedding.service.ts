/**
 * LANKA Memory System - Embedding Service
 * Generates and manages vector embeddings for semantic search
 */

import { Injectable, Logger } from '@nestjs/common';
import { MemorySystemConfig, EmbeddingConfig } from '../types/memory.types';

interface EmbeddingCache {
  [key: string]: {
    embedding: number[];
    timestamp: number;
    hits: number;
  };
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly embeddingCache: EmbeddingCache = {};
  private readonly config: EmbeddingConfig;
  
  // Cache settings
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_SIZE = 10000;

  constructor(systemConfig: MemorySystemConfig) {
    this.config = systemConfig.embedding;
    this.initializeEmbeddingService();
  }

  /**
   * Generate embedding for text content
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      if (this.config.cacheEnabled) {
        const cached = this.getCachedEmbedding(text);
        if (cached) {
          this.logger.debug(`Cache hit for embedding (${Date.now() - startTime}ms)`);
          return cached;
        }
      }

      // Preprocess text
      const processedText = this.preprocessText(text);

      // Generate embedding
      const embedding = await this.callEmbeddingModel(processedText);

      // Validate embedding
      this.validateEmbedding(embedding);

      // Cache result
      if (this.config.cacheEnabled) {
        this.cacheEmbedding(text, embedding);
      }

      const duration = Date.now() - startTime;
      this.logger.debug(`Generated embedding for ${text.length} chars (${duration}ms)`);

      return embedding;
    } catch (error) {
      this.logger.error(`Failed to generate embedding: ${error.message}`, error.stack);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    const startTime = Date.now();
    this.logger.debug(`Generating batch embeddings for ${texts.length} texts`);

    try {
      // Separate cached and non-cached texts
      const results: (number[] | null)[] = new Array(texts.length);
      const uncachedIndices: number[] = [];
      const uncachedTexts: string[] = [];

      if (this.config.cacheEnabled) {
        for (let i = 0; i < texts.length; i++) {
          const cached = this.getCachedEmbedding(texts[i]);
          if (cached) {
            results[i] = cached;
          } else {
            uncachedIndices.push(i);
            uncachedTexts.push(texts[i]);
          }
        }
      } else {
        uncachedIndices.push(...Array.from({ length: texts.length }, (_, i) => i));
        uncachedTexts.push(...texts);
      }

      // Process uncached texts in batches
      if (uncachedTexts.length > 0) {
        const batchSize = this.config.batchSize;
        for (let i = 0; i < uncachedTexts.length; i += batchSize) {
          const batch = uncachedTexts.slice(i, i + batchSize);
          const batchIndices = uncachedIndices.slice(i, i + batchSize);
          
          const batchEmbeddings = await this.processBatch(batch);
          
          // Store results
          for (let j = 0; j < batchEmbeddings.length; j++) {
            const originalIndex = batchIndices[j];
            results[originalIndex] = batchEmbeddings[j];
            
            // Cache result
            if (this.config.cacheEnabled) {
              this.cacheEmbedding(texts[originalIndex], batchEmbeddings[j]);
            }
          }
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(`Batch embedding completed: ${texts.length} texts (${duration}ms)`);

      return results.filter(r => r !== null) as number[][];
    } catch (error) {
      this.logger.error(`Batch embedding failed: ${error.message}`, error.stack);
      throw new Error(`Batch embedding failed: ${error.message}`);
    }
  }

  /**
   * Calculate semantic similarity between two embeddings
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    // Cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Re-embed existing memories with updated model
   */
  async reembedMemories(memoryIds: string[]): Promise<void> {
    this.logger.log(`Starting re-embedding process for ${memoryIds.length} memories`);

    const batchSize = this.config.batchSize;
    let processed = 0;

    for (let i = 0; i < memoryIds.length; i += batchSize) {
      const batch = memoryIds.slice(i, i + batchSize);
      
      try {
        await this.reembedBatch(batch);
        processed += batch.length;
        
        this.logger.debug(`Re-embedding progress: ${processed}/${memoryIds.length}`);
        
        // Small delay to prevent overwhelming the system
        if (i + batchSize < memoryIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        this.logger.error(`Failed to re-embed batch starting at ${i}: ${error.message}`);
        // Continue with next batch
      }
    }

    this.logger.log(`Re-embedding completed: ${processed}/${memoryIds.length} memories`);
  }

  /**
   * Health check for embedding service
   */
  async healthCheck(): Promise<void> {
    try {
      const testText = "This is a test for embedding service health check.";
      const embedding = await this.generateEmbedding(testText);
      
      if (!embedding || embedding.length !== this.config.dimension) {
        throw new Error('Invalid embedding response');
      }

      this.logger.debug('Embedding service health check passed');
    } catch (error) {
      this.logger.error('Embedding service health check failed', error.stack);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    oldestEntry: Date;
    memoryUsage: number;
  } {
    const entries = Object.values(this.embeddingCache);
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    const totalRequests = entries.length > 0 ? totalHits + entries.length : 1;
    
    return {
      size: entries.length,
      hitRate: totalHits / totalRequests,
      oldestEntry: new Date(Math.min(...entries.map(e => e.timestamp))),
      memoryUsage: this.estimateCacheMemoryUsage(),
    };
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    const size = Object.keys(this.embeddingCache).length;
    Object.keys(this.embeddingCache).forEach(key => {
      delete this.embeddingCache[key];
    });
    this.logger.log(`Cleared embedding cache: ${size} entries`);
  }

  // Private implementation methods

  private initializeEmbeddingService(): void {
    this.logger.log(`Initializing embedding service with model: ${this.config.model}`);
    
    // Set up cache cleanup interval
    if (this.config.cacheEnabled) {
      setInterval(() => {
        this.cleanupCache();
      }, 60 * 60 * 1000); // Clean up every hour
    }
  }

  private preprocessText(text: string): string {
    // Clean and normalize text for better embeddings
    let processed = text.trim();
    
    // Remove excessive whitespace
    processed = processed.replace(/\s+/g, ' ');
    
    // Truncate if too long (model specific limits)
    const maxTokens = 8192; // Typical limit for many embedding models
    if (processed.length > maxTokens * 4) { // Rough estimate: 4 chars per token
      processed = processed.substring(0, maxTokens * 4);
      this.logger.warn(`Text truncated from ${text.length} to ${processed.length} characters`);
    }
    
    return processed;
  }

  private async callEmbeddingModel(text: string): Promise<number[]> {
    // This would integrate with the actual embedding model
    // Implementation depends on the model provider
    
    switch (this.config.model) {
      case 'code-bert':
        return this.callCodeBertModel(text);
      case 'openai-ada-002':
        return this.callOpenAIModel(text);
      case 'sentence-transformers':
        return this.callSentenceTransformersModel(text);
      case 'local-model':
        return this.callLocalModel(text);
      default:
        throw new Error(`Unknown embedding model: ${this.config.model}`);
    }
  }

  private async callCodeBertModel(text: string): Promise<number[]> {
    // CodeBERT integration - specialized for code understanding
    // This is a placeholder for the actual implementation
    
    try {
      // Would make HTTP request to CodeBERT service or use local model
      const response = await this.makeModelRequest('/embed/codebert', { text });
      return response.embedding;
    } catch (error) {
      throw new Error(`CodeBERT embedding failed: ${error.message}`);
    }
  }

  private async callOpenAIModel(text: string): Promise<number[]> {
    // OpenAI Ada-002 integration
    try {
      const response = await this.makeModelRequest('/embed/openai', { 
        text,
        model: 'text-embedding-ada-002'
      });
      return response.embedding;
    } catch (error) {
      throw new Error(`OpenAI embedding failed: ${error.message}`);
    }
  }

  private async callSentenceTransformersModel(text: string): Promise<number[]> {
    // Sentence Transformers integration
    try {
      const response = await this.makeModelRequest('/embed/sentence-transformers', { text });
      return response.embedding;
    } catch (error) {
      throw new Error(`Sentence Transformers embedding failed: ${error.message}`);
    }
  }

  private async callLocalModel(text: string): Promise<number[]> {
    // Local model integration (e.g., via ONNX or TensorFlow Serving)
    try {
      const response = await this.makeModelRequest('/embed/local', { text });
      return response.embedding;
    } catch (error) {
      throw new Error(`Local model embedding failed: ${error.message}`);
    }
  }

  private async makeModelRequest(endpoint: string, data: any): Promise<any> {
    // Placeholder for actual HTTP client implementation
    // This would use axios, fetch, or similar to call the embedding service
    
    // For now, return a mock embedding of the correct dimension
    return {
      embedding: Array.from({ length: this.config.dimension }, () => Math.random() - 0.5),
    };
  }

  private async processBatch(texts: string[]): Promise<number[][]> {
    // Process texts in batch for efficiency
    const processedTexts = texts.map(text => this.preprocessText(text));
    
    try {
      const response = await this.makeModelRequest('/embed/batch', { 
        texts: processedTexts 
      });
      return response.embeddings;
    } catch (error) {
      // Fallback to individual processing
      this.logger.warn(`Batch processing failed, falling back to individual: ${error.message}`);
      
      const embeddings: number[][] = [];
      for (const text of processedTexts) {
        const embedding = await this.callEmbeddingModel(text);
        embeddings.push(embedding);
      }
      return embeddings;
    }
  }

  private validateEmbedding(embedding: number[]): void {
    if (!Array.isArray(embedding)) {
      throw new Error('Embedding must be an array');
    }
    
    if (embedding.length !== this.config.dimension) {
      throw new Error(`Embedding dimension mismatch: expected ${this.config.dimension}, got ${embedding.length}`);
    }
    
    if (!embedding.every(val => typeof val === 'number' && !isNaN(val))) {
      throw new Error('Embedding contains invalid values');
    }
  }

  private getCachedEmbedding(text: string): number[] | null {
    const key = this.getCacheKey(text);
    const cached = this.embeddingCache[key];
    
    if (!cached) {
      return null;
    }
    
    // Check if cache entry is still valid
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      delete this.embeddingCache[key];
      return null;
    }
    
    // Update hit count
    cached.hits++;
    
    return cached.embedding;
  }

  private cacheEmbedding(text: string, embedding: number[]): void {
    const key = this.getCacheKey(text);
    
    // Check cache size limit
    if (Object.keys(this.embeddingCache).length >= this.MAX_CACHE_SIZE) {
      this.evictOldestCacheEntry();
    }
    
    this.embeddingCache[key] = {
      embedding: [...embedding], // Deep copy
      timestamp: Date.now(),
      hits: 0,
    };
  }

  private getCacheKey(text: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `embed_${hash}_${text.length}`;
  }

  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;
    
    Object.keys(this.embeddingCache).forEach(key => {
      const entry = this.embeddingCache[key];
      if (now - entry.timestamp > this.CACHE_TTL) {
        delete this.embeddingCache[key];
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  private evictOldestCacheEntry(): void {
    let oldestKey = '';
    let oldestTimestamp = Date.now();
    
    Object.keys(this.embeddingCache).forEach(key => {
      const entry = this.embeddingCache[key];
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    });
    
    if (oldestKey) {
      delete this.embeddingCache[oldestKey];
    }
  }

  private estimateCacheMemoryUsage(): number {
    const entries = Object.values(this.embeddingCache);
    if (entries.length === 0) return 0;
    
    // Rough estimate: embedding array + metadata
    const avgEmbeddingSize = this.config.dimension * 8; // 8 bytes per float64
    const avgMetadataSize = 100; // Rough estimate for timestamps, etc.
    
    return entries.length * (avgEmbeddingSize + avgMetadataSize);
  }

  private async reembedBatch(memoryIds: string[]): Promise<void> {
    // This would fetch memory content and re-embed with current model
    // Implementation would depend on integration with storage service
    
    this.logger.debug(`Re-embedding batch of ${memoryIds.length} memories`);
    
    // Placeholder implementation
    for (const id of memoryIds) {
      try {
        // 1. Fetch memory content from storage
        // 2. Generate new embedding
        // 3. Update storage with new embedding
        
        // For now, just simulate the process
        await new Promise(resolve => setTimeout(resolve, 10));
      } catch (error) {
        this.logger.error(`Failed to re-embed memory ${id}: ${error.message}`);
      }
    }
  }
}