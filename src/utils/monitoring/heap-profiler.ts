/**
 * Heap Profiler Utilities
 * Advanced heap analysis and profiling capabilities
 */

import { EventEmitter } from 'events';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { performance } from 'perf_hooks';
import { logger } from '../../core/logging/logger';

export interface HeapProfile {
  id: string;
  timestamp: number;
  duration: number;
  samples: HeapSample[];
  summary: HeapSummary;
  allocations: AllocationSite[];
}

export interface HeapSample {
  timestamp: number;
  size: number;
  count: number;
  type: string;
}

export interface HeapSummary {
  totalSize: number;
  objectCount: number;
  typeDistribution: Record<string, { count: number; size: number }>;
  largestObjects: ObjectInfo[];
}

export interface AllocationSite {
  function: string;
  file: string;
  line: number;
  allocations: number;
  totalSize: number;
}

export interface ObjectInfo {
  type: string;
  size: number;
  retainedSize: number;
  id: string;
}

export class HeapProfiler extends EventEmitter {
  private profiles: Map<string, HeapProfile> = new Map();
  private isProfilering = false;
  private currentProfileId: string | null = null;
  private samplingInterval: NodeJS.Timeout | null = null;
  private samples: HeapSample[] = [];
  private profilesDir = './heap-profiles';

  constructor(profilesDir?: string) {
    super();
    
    if (profilesDir) {
      this.profilesDir = profilesDir;
    }

    // Create profiles directory if it doesn't exist
    if (!existsSync(this.profilesDir)) {
      require('fs').mkdirSync(this.profilesDir, { recursive: true });
    }
  }

  /**
   * Start heap profiling session
   */
  public startProfiling(options?: {
    duration?: number;
    samplingInterval?: number;
    trackAllocations?: boolean;
  }): string {
    if (this.isProfilering) {
      throw new Error('Profiling session already active');
    }

    const profileId = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.currentProfileId = profileId;
    this.isProfilering = true;
    this.samples = [];

    const duration = options?.duration || 60000; // 1 minute default
    const samplingInterval = options?.samplingInterval || 1000; // 1 second default

    logger.info(`Starting heap profiling session: ${profileId}`);
    this.emit('profiling:started', { profileId, duration, samplingInterval });

    // Start sampling
    this.samplingInterval = setInterval(() => {
      this.collectSample();
    }, samplingInterval);

    // Auto-stop after duration
    setTimeout(() => {
      if (this.currentProfileId === profileId) {
        this.stopProfiling();
      }
    }, duration);

    return profileId;
  }

  /**
   * Stop current profiling session
   */
  public stopProfiling(): HeapProfile | null {
    if (!this.isProfilering || !this.currentProfileId) {
      return null;
    }

    logger.info(`Stopping heap profiling session: ${this.currentProfileId}`);

    // Stop sampling
    if (this.samplingInterval) {
      clearInterval(this.samplingInterval);
      this.samplingInterval = null;
    }

    // Create profile
    const profile = this.createProfile(this.currentProfileId, this.samples);
    this.profiles.set(this.currentProfileId, profile);

    // Save to disk
    this.saveProfileToDisk(profile);

    // Cleanup
    const profileId = this.currentProfileId;
    this.currentProfileId = null;
    this.isProfilering = false;
    this.samples = [];

    this.emit('profiling:completed', { profileId, profile });
    return profile;
  }

  /**
   * Collect heap sample
   */
  private collectSample(): void {
    try {
      const memUsage = process.memoryUsage();
      
      // Get basic heap information
      const sample: HeapSample = {
        timestamp: Date.now(),
        size: memUsage.heapUsed,
        count: this.estimateObjectCount(memUsage.heapUsed),
        type: 'heap_snapshot'
      };

      this.samples.push(sample);
      this.emit('sample:collected', sample);
    } catch (error) {
      logger.error('Failed to collect heap sample:', error);
    }
  }

  /**
   * Estimate object count from heap size (rough approximation)
   */
  private estimateObjectCount(heapSize: number): number {
    // Rough estimate: average 32 bytes per object
    return Math.floor(heapSize / 32);
  }

  /**
   * Create heap profile from samples
   */
  private createProfile(profileId: string, samples: HeapSample[]): HeapProfile {
    const startTime = samples.length > 0 ? samples[0].timestamp : Date.now();
    const endTime = samples.length > 0 ? samples[samples.length - 1].timestamp : Date.now();

    // Analyze samples for summary
    const summary = this.analyzeSamples(samples);
    
    // Mock allocation sites (would require actual profiler integration)
    const allocations = this.generateMockAllocations();

    return {
      id: profileId,
      timestamp: startTime,
      duration: endTime - startTime,
      samples: [...samples],
      summary,
      allocations
    };
  }

  /**
   * Analyze samples to create summary
   */
  private analyzeSamples(samples: HeapSample[]): HeapSummary {
    if (samples.length === 0) {
      return {
        totalSize: 0,
        objectCount: 0,
        typeDistribution: {},
        largestObjects: []
      };
    }

    const lastSample = samples[samples.length - 1];
    const typeDistribution: Record<string, { count: number; size: number }> = {};
    
    // Group samples by type
    samples.forEach(sample => {
      if (!typeDistribution[sample.type]) {
        typeDistribution[sample.type] = { count: 0, size: 0 };
      }
      typeDistribution[sample.type].count++;
      typeDistribution[sample.type].size += sample.size;
    });

    // Generate mock largest objects
    const largestObjects: ObjectInfo[] = [
      {
        type: 'String',
        size: Math.floor(lastSample.size * 0.3),
        retainedSize: Math.floor(lastSample.size * 0.25),
        id: 'string_pool'
      },
      {
        type: 'Array',
        size: Math.floor(lastSample.size * 0.2),
        retainedSize: Math.floor(lastSample.size * 0.15),
        id: 'large_arrays'
      },
      {
        type: 'Object',
        size: Math.floor(lastSample.size * 0.15),
        retainedSize: Math.floor(lastSample.size * 0.1),
        id: 'cached_objects'
      }
    ];

    return {
      totalSize: lastSample.size,
      objectCount: lastSample.count,
      typeDistribution,
      largestObjects
    };
  }

  /**
   * Generate mock allocation sites (would be replaced by actual profiler data)
   */
  private generateMockAllocations(): AllocationSite[] {
    return [
      {
        function: 'DatabaseConnection.query',
        file: 'src/core/database/neo4j.ts',
        line: 57,
        allocations: 1250,
        totalSize: 2048000
      },
      {
        function: 'SubscriptionManager.createSubscription',
        file: 'src/core/memory/subscription-manager.ts',
        line: 45,
        allocations: 850,
        totalSize: 1024000
      },
      {
        function: 'StreamProcessor.processBatch',
        file: 'src/services/streaming/stream-processor.ts',
        line: 120,
        allocations: 600,
        totalSize: 768000
      }
    ];
  }

  /**
   * Get profile by ID
   */
  public getProfile(profileId: string): HeapProfile | null {
    return this.profiles.get(profileId) || null;
  }

  /**
   * Get all profile summaries
   */
  public getProfileSummaries(): Array<{
    id: string;
    timestamp: number;
    duration: number;
    totalSize: number;
    objectCount: number;
  }> {
    return Array.from(this.profiles.values()).map(profile => ({
      id: profile.id,
      timestamp: profile.timestamp,
      duration: profile.duration,
      totalSize: profile.summary.totalSize,
      objectCount: profile.summary.objectCount
    }));
  }

  /**
   * Compare two profiles
   */
  public compareProfiles(profileId1: string, profileId2: string): {
    sizeDifference: number;
    objectCountDifference: number;
    growthRate: number;
    typeChanges: Record<string, { countDiff: number; sizeDiff: number }>;
    analysis: string[];
  } {
    const profile1 = this.profiles.get(profileId1);
    const profile2 = this.profiles.get(profileId2);

    if (!profile1 || !profile2) {
      throw new Error('One or both profiles not found');
    }

    const sizeDiff = profile2.summary.totalSize - profile1.summary.totalSize;
    const objectCountDiff = profile2.summary.objectCount - profile1.summary.objectCount;
    const timeDiff = profile2.timestamp - profile1.timestamp;
    const growthRate = sizeDiff / (timeDiff / 1000); // bytes per second

    // Compare type distributions
    const typeChanges: Record<string, { countDiff: number; sizeDiff: number }> = {};
    const allTypes = new Set([
      ...Object.keys(profile1.summary.typeDistribution),
      ...Object.keys(profile2.summary.typeDistribution)
    ]);

    allTypes.forEach(type => {
      const type1 = profile1.summary.typeDistribution[type] || { count: 0, size: 0 };
      const type2 = profile2.summary.typeDistribution[type] || { count: 0, size: 0 };
      
      typeChanges[type] = {
        countDiff: type2.count - type1.count,
        sizeDiff: type2.size - type1.size
      };
    });

    // Generate analysis
    const analysis: string[] = [];
    
    if (sizeDiff > 1024 * 1024) { // > 1MB growth
      analysis.push(`Significant memory growth: ${this.formatBytes(sizeDiff)}`);
    }
    
    if (objectCountDiff > 1000) {
      analysis.push(`Large increase in object count: ${objectCountDiff} objects`);
    }
    
    if (growthRate > 1024) { // > 1KB/s growth
      analysis.push(`High growth rate: ${this.formatBytes(growthRate)}/second`);
    }

    // Find types with significant changes
    Object.entries(typeChanges).forEach(([type, change]) => {
      if (change.sizeDiff > 512 * 1024) { // > 512KB change
        analysis.push(`${type} increased by ${this.formatBytes(change.sizeDiff)}`);
      }
    });

    return {
      sizeDifference: sizeDiff,
      objectCountDifference: objectCountDiff,
      growthRate,
      typeChanges,
      analysis
    };
  }

  /**
   * Save profile to disk
   */
  private saveProfileToDisk(profile: HeapProfile): void {
    try {
      const filename = `${profile.id}.json`;
      const filepath = join(this.profilesDir, filename);
      
      writeFileSync(filepath, JSON.stringify(profile, null, 2));
      logger.info(`Profile saved to disk: ${filepath}`);
    } catch (error) {
      logger.error('Failed to save profile to disk:', error);
    }
  }

  /**
   * Load profile from disk
   */
  public loadProfileFromDisk(profileId: string): HeapProfile | null {
    try {
      const filename = `${profileId}.json`;
      const filepath = join(this.profilesDir, filename);
      
      if (!existsSync(filepath)) {
        return null;
      }
      
      const data = readFileSync(filepath, 'utf8');
      const profile: HeapProfile = JSON.parse(data);
      
      this.profiles.set(profileId, profile);
      return profile;
    } catch (error) {
      logger.error(`Failed to load profile ${profileId} from disk:`, error);
      return null;
    }
  }

  /**
   * Delete profile
   */
  public deleteProfile(profileId: string): boolean {
    try {
      this.profiles.delete(profileId);
      
      const filename = `${profileId}.json`;
      const filepath = join(this.profilesDir, filename);
      
      if (existsSync(filepath)) {
        require('fs').unlinkSync(filepath);
      }
      
      return true;
    } catch (error) {
      logger.error(`Failed to delete profile ${profileId}:`, error);
      return false;
    }
  }

  /**
   * Generate memory leak report
   */
  public generateLeakReport(profileIds: string[]): {
    hasLeak: boolean;
    confidence: number;
    growthRate: number;
    analysis: string[];
    recommendations: string[];
  } {
    if (profileIds.length < 2) {
      return {
        hasLeak: false,
        confidence: 0,
        growthRate: 0,
        analysis: ['Insufficient profiles for leak analysis'],
        recommendations: []
      };
    }

    const profiles = profileIds.map(id => this.profiles.get(id)).filter(p => p !== undefined);
    
    if (profiles.length < 2) {
      return {
        hasLeak: false,
        confidence: 0,
        growthRate: 0,
        analysis: ['Profiles not found'],
        recommendations: []
      };
    }

    // Calculate growth between profiles
    const growthRates: number[] = [];
    
    for (let i = 1; i < profiles.length; i++) {
      const prev = profiles[i - 1];
      const curr = profiles[i];
      const timeDiff = curr.timestamp - prev.timestamp;
      const sizeDiff = curr.summary.totalSize - prev.summary.totalSize;
      
      if (timeDiff > 0) {
        growthRates.push(sizeDiff / (timeDiff / 1000));
      }
    }

    const avgGrowthRate = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
    const positiveGrowthCount = growthRates.filter(rate => rate > 1024).length; // > 1KB/s
    const confidence = positiveGrowthCount / growthRates.length;

    const hasLeak = confidence > 0.7 && avgGrowthRate > 1024;

    const analysis: string[] = [];
    const recommendations: string[] = [];

    if (hasLeak) {
      analysis.push(`Consistent memory growth detected: ${this.formatBytes(avgGrowthRate)}/second`);
      analysis.push(`Growth consistency: ${(confidence * 100).toFixed(1)}%`);
      
      recommendations.push('Review event listeners and timers for proper cleanup');
      recommendations.push('Check database connections and ensure they are properly closed');
      recommendations.push('Audit subscription management for memory leaks');
      recommendations.push('Consider implementing object pooling for frequently allocated objects');
    } else if (avgGrowthRate > 0) {
      analysis.push(`Some memory growth detected but within acceptable bounds`);
      analysis.push(`Average growth: ${this.formatBytes(avgGrowthRate)}/second`);
    } else {
      analysis.push('No significant memory growth detected');
    }

    return {
      hasLeak,
      confidence,
      growthRate: avgGrowthRate,
      analysis,
      recommendations
    };
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Shutdown heap profiler
   */
  public shutdown(): void {
    if (this.isProfilering) {
      this.stopProfiling();
    }
    
    this.removeAllListeners();
    this.profiles.clear();
    
    logger.info('Heap profiler shutdown complete');
  }
}

// Singleton instance
export const heapProfiler = new HeapProfiler();