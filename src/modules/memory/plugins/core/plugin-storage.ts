// Plugin Storage Implementation
// Secure storage system for plugins with namespace isolation

import { PluginStorage as IPluginStorage } from '../types';

export class PluginStorage implements IPluginStorage {
  private pluginId: string;
  private storage: Map<string, StorageEntry> = new Map();
  private maxStorageSize = 10 * 1024 * 1024; // 10MB limit per plugin
  private currentSize = 0;

  constructor(pluginId: string) {
    this.pluginId = pluginId;
    this.loadFromPersistentStorage();
  }

  async get(key: string): Promise<any> {
    const fullKey = this.getNamespacedKey(key);
    const entry = this.storage.get(fullKey);
    
    if (!entry) {
      return undefined;
    }

    // Check TTL
    if (entry.ttl && entry.ttl < Date.now()) {
      await this.delete(key);
      return undefined;
    }

    return this.deserializeValue(entry.value);
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const fullKey = this.getNamespacedKey(key);
    const serialized = this.serializeValue(value);
    const size = new Blob([JSON.stringify(serialized)]).size;
    
    // Check storage limit
    const existingEntry = this.storage.get(fullKey);
    const existingSize = existingEntry ? 
      new Blob([JSON.stringify(existingEntry.value)]).size : 0;
    
    if (this.currentSize - existingSize + size > this.maxStorageSize) {
      throw new Error(`Storage limit exceeded for plugin ${this.pluginId}`);
    }

    const entry: StorageEntry = {
      value: serialized,
      timestamp: Date.now(),
      ttl: ttl ? Date.now() + ttl : undefined
    };

    this.storage.set(fullKey, entry);
    this.currentSize = this.currentSize - existingSize + size;
    
    await this.saveToPersistentStorage();
  }

  async delete(key: string): Promise<void> {
    const fullKey = this.getNamespacedKey(key);
    const entry = this.storage.get(fullKey);
    
    if (entry) {
      const size = new Blob([JSON.stringify(entry.value)]).size;
      this.currentSize -= size;
      this.storage.delete(fullKey);
      await this.saveToPersistentStorage();
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    const prefix = this.getNamespacedKey('');
    const keys: string[] = [];
    
    for (const [fullKey, entry] of this.storage.entries()) {
      if (fullKey.startsWith(prefix)) {
        // Check TTL
        if (entry.ttl && entry.ttl < Date.now()) {
          this.storage.delete(fullKey);
          continue;
        }
        
        const key = fullKey.substring(prefix.length);
        if (!pattern || this.matchesPattern(key, pattern)) {
          keys.push(key);
        }
      }
    }
    
    return keys;
  }

  async clear(): Promise<void> {
    const prefix = this.getNamespacedKey('');
    const keysToDelete: string[] = [];
    
    for (const fullKey of this.storage.keys()) {
      if (fullKey.startsWith(prefix)) {
        keysToDelete.push(fullKey);
      }
    }
    
    for (const key of keysToDelete) {
      this.storage.delete(key);
    }
    
    this.currentSize = 0;
    await this.saveToPersistentStorage();
  }

  // Storage management methods
  
  getStorageInfo(): {
    pluginId: string;
    currentSize: number;
    maxSize: number;
    entryCount: number;
    utilizationPercent: number;
  } {
    const prefix = this.getNamespacedKey('');
    const entryCount = Array.from(this.storage.keys())
      .filter(key => key.startsWith(prefix)).length;
    
    return {
      pluginId: this.pluginId,
      currentSize: this.currentSize,
      maxSize: this.maxStorageSize,
      entryCount,
      utilizationPercent: (this.currentSize / this.maxStorageSize) * 100
    };
  }

  async cleanup(): Promise<number> {
    let cleaned = 0;
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.storage.entries()) {
      if (entry.ttl && entry.ttl < now) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      const entry = this.storage.get(key);
      if (entry) {
        const size = new Blob([JSON.stringify(entry.value)]).size;
        this.currentSize -= size;
        this.storage.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      await this.saveToPersistentStorage();
    }
    
    return cleaned;
  }

  // Private methods
  
  private getNamespacedKey(key: string): string {
    return `plugin:${this.pluginId}:${key}`;
  }

  private serializeValue(value: any): string {
    try {
      return JSON.stringify(value);
    } catch (error) {
      throw new Error(`Cannot serialize value for plugin storage: ${error}`);
    }
  }

  private deserializeValue(serialized: string): any {
    try {
      return JSON.parse(serialized);
    } catch (error) {
      throw new Error(`Cannot deserialize value from plugin storage: ${error}`);
    }
  }

  private matchesPattern(key: string, pattern: string): boolean {
    // Simple glob-like pattern matching
    const regex = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${regex}$`).test(key);
  }

  private async loadFromPersistentStorage(): Promise<void> {
    // In a real implementation, this would load from disk/database
    // For now, we'll use in-memory storage
    // TODO: Implement persistent storage backend
  }

  private async saveToPersistentStorage(): Promise<void> {
    // In a real implementation, this would save to disk/database
    // For now, we'll use in-memory storage
    // TODO: Implement persistent storage backend
  }
}

interface StorageEntry {
  value: string;
  timestamp: number;
  ttl?: number;
}
