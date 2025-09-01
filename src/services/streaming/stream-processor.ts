/**
 * Stream Processing Service with Backpressure Handling
 * Provides memory-efficient processing of large datasets
 */

import { Readable, Transform, Writable, pipeline } from 'stream';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import { logger } from '../../core/logging/logger';

const pipelineAsync = promisify(pipeline);

export interface StreamProcessorOptions {
  batchSize?: number;
  maxConcurrency?: number;
  highWaterMark?: number;
  backpressureThreshold?: number;
  memoryLimit?: number;
}

export interface ProcessorStats {
  processed: number;
  failed: number;
  inProgress: number;
  memoryUsage: number;
  queueSize: number;
  backpressureActive: boolean;
}

export class StreamProcessor extends EventEmitter {
  private options: Required<StreamProcessorOptions>;
  private stats: ProcessorStats;
  private isProcessing = false;
  private memoryMonitor: NodeJS.Timeout | null = null;
  private processingQueue: Array<() => Promise<void>> = [];
  private concurrentCount = 0;

  constructor(options: StreamProcessorOptions = {}) {
    super();
    
    this.options = {
      batchSize: options.batchSize || 1000,
      maxConcurrency: options.maxConcurrency || 5,
      highWaterMark: options.highWaterMark || 16 * 1024, // 16KB
      backpressureThreshold: options.backpressureThreshold || 0.8,
      memoryLimit: options.memoryLimit || 512 * 1024 * 1024, // 512MB
    };

    this.stats = {
      processed: 0,
      failed: 0,
      inProgress: 0,
      memoryUsage: 0,
      queueSize: 0,
      backpressureActive: false,
    };

    this.startMemoryMonitoring();
  }

  /**
   * Process data stream with automatic backpressure handling
   */
  public async processStream<T, R>(
    source: AsyncIterable<T> | T[],
    processor: (batch: T[]) => Promise<R[]>,
    options?: { 
      onProgress?: (stats: ProcessorStats) => void;
      onError?: (error: Error, item: T) => void;
    }
  ): Promise<R[]> {
    if (this.isProcessing) {
      throw new Error('Stream processor is already running');
    }

    this.isProcessing = true;
    const results: R[] = [];
    let batch: T[] = [];

    try {
      const iterable = Array.isArray(source) ? source : source;
      
      for await (const item of iterable) {
        batch.push(item);

        if (batch.length >= this.options.batchSize) {
          await this.processBatch(batch, processor, results, options);
          batch = [];
          
          // Update progress
          if (options?.onProgress) {
            options.onProgress(this.getStats());
          }
          
          // Check backpressure
          await this.handleBackpressure();
        }
      }

      // Process remaining items
      if (batch.length > 0) {
        await this.processBatch(batch, processor, results, options);
      }

      logger.info(`Stream processing completed. Processed: ${this.stats.processed}, Failed: ${this.stats.failed}`);
      return results;

    } catch (error) {
      logger.error('Stream processing failed:', error);
      throw error;
    } finally {
      this.isProcessing = false;
      this.resetStats();
    }
  }

  /**
   * Create a transform stream for processing
   */
  public createTransformStream<T, R>(
    processor: (item: T) => Promise<R>,
    options?: { parallel?: boolean }
  ): Transform {
    const parallel = options?.parallel ?? false;
    const processingMap = new Map<string, Promise<any>>();

    return new Transform({
      objectMode: true,
      highWaterMark: this.options.highWaterMark,
      
      async transform(chunk: T, encoding, callback) {
        try {
          if (parallel && this.concurrentCount < this.options.maxConcurrency) {
            // Process in parallel
            const id = Math.random().toString(36);
            this.concurrentCount++;
            
            const processingPromise = processor(chunk)
              .then(result => {
                this.stats.processed++;
                this.push(result);
                return result;
              })
              .catch(error => {
                this.stats.failed++;
                this.emit('error', error);
                throw error;
              })
              .finally(() => {
                this.concurrentCount--;
                processingMap.delete(id);
              });
            
            processingMap.set(id, processingPromise);
            callback();
          } else {
            // Process sequentially
            const result = await processor(chunk);
            this.stats.processed++;
            callback(null, result);
          }
        } catch (error) {
          this.stats.failed++;
          callback(error);
        }
      },

      async flush(callback) {
        // Wait for all parallel operations to complete
        if (processingMap.size > 0) {
          await Promise.all(processingMap.values());
        }
        callback();
      }
    });
  }

  /**
   * Create a readable stream from async iterator
   */
  public createReadableStream<T>(source: AsyncIterable<T>): Readable {
    const iterator = source[Symbol.asyncIterator]();
    
    return new Readable({
      objectMode: true,
      highWaterMark: this.options.highWaterMark,
      
      async read() {
        try {
          const { value, done } = await iterator.next();
          
          if (done) {
            this.push(null); // End stream
          } else {
            this.push(value);
          }
        } catch (error) {
          this.destroy(error);
        }
      }
    });
  }

  /**
   * Create a writable stream that collects results
   */
  public createCollectorStream<T>(): { stream: Writable; getResults: () => T[] } {
    const results: T[] = [];
    
    const stream = new Writable({
      objectMode: true,
      highWaterMark: this.options.highWaterMark,
      
      write(chunk: T, encoding, callback) {
        results.push(chunk);
        callback();
      }
    });

    return {
      stream,
      getResults: () => [...results] // Return copy to prevent mutations
    };
  }

  /**
   * Pipeline multiple streams with error handling
   */
  public async createPipeline(streams: NodeJS.ReadWriteStream[]): Promise<void> {
    return pipelineAsync(...streams);
  }

  /**
   * Process batch with concurrency control
   */
  private async processBatch<T, R>(
    batch: T[],
    processor: (batch: T[]) => Promise<R[]>,
    results: R[],
    options?: {
      onProgress?: (stats: ProcessorStats) => void;
      onError?: (error: Error, item: T) => void;
    }
  ): Promise<void> {
    if (this.concurrentCount >= this.options.maxConcurrency) {
      await this.waitForSlot();
    }

    this.concurrentCount++;
    this.stats.inProgress = this.concurrentCount;

    try {
      const batchResults = await processor(batch);
      results.push(...batchResults);
      this.stats.processed += batch.length;
    } catch (error) {
      this.stats.failed += batch.length;
      
      if (options?.onError) {
        batch.forEach(item => options.onError!(error as Error, item));
      } else {
        throw error;
      }
    } finally {
      this.concurrentCount--;
      this.stats.inProgress = this.concurrentCount;
    }
  }

  /**
   * Handle backpressure by monitoring memory usage
   */
  private async handleBackpressure(): Promise<void> {
    const memoryUsage = process.memoryUsage();
    this.stats.memoryUsage = memoryUsage.heapUsed;
    
    const memoryRatio = memoryUsage.heapUsed / this.options.memoryLimit;
    
    if (memoryRatio > this.options.backpressureThreshold) {
      this.stats.backpressureActive = true;
      logger.warn(`Backpressure activated. Memory usage: ${Math.round(memoryRatio * 100)}%`);
      
      // Wait for memory to decrease
      await this.waitForMemoryRelease();
      
      this.stats.backpressureActive = false;
    }
  }

  /**
   * Wait for memory to be released
   */
  private async waitForMemoryRelease(): Promise<void> {
    return new Promise((resolve) => {
      const checkMemory = () => {
        const memoryUsage = process.memoryUsage();
        const memoryRatio = memoryUsage.heapUsed / this.options.memoryLimit;
        
        if (memoryRatio <= this.options.backpressureThreshold * 0.7) {
          resolve();
        } else {
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
          setTimeout(checkMemory, 100);
        }
      };
      
      setTimeout(checkMemory, 100);
    });
  }

  /**
   * Wait for available processing slot
   */
  private async waitForSlot(): Promise<void> {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (this.concurrentCount < this.options.maxConcurrency) {
          resolve();
        } else {
          setTimeout(checkSlot, 10);
        }
      };
      checkSlot();
    });
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    this.memoryMonitor = setInterval(() => {
      const memoryUsage = process.memoryUsage();
      this.stats.memoryUsage = memoryUsage.heapUsed;
      
      // Emit memory stats
      this.emit('memory', {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        rss: memoryUsage.rss,
        external: memoryUsage.external,
      });
    }, 5000);
  }

  /**
   * Get current processing statistics
   */
  public getStats(): ProcessorStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  private resetStats(): void {
    this.stats = {
      processed: 0,
      failed: 0,
      inProgress: 0,
      memoryUsage: process.memoryUsage().heapUsed,
      queueSize: 0,
      backpressureActive: false,
    };
  }

  /**
   * Shutdown stream processor
   */
  public shutdown(): void {
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
      this.memoryMonitor = null;
    }
    
    this.removeAllListeners();
    this.isProcessing = false;
    
    logger.info('Stream processor shutdown complete');
  }
}

export const streamProcessor = new StreamProcessor();