import { jest } from '@jest/globals';
import { Memory, MemoryType } from '../../src/types/memory';

export class StorageMocks {
  static createNeo4jDriverMock() {
    const sessionMock = {
      run: jest.fn(),
      close: jest.fn(),
      lastBookmarks: jest.fn(),
      beginTransaction: jest.fn(),
    };

    const driverMock = {
      session: jest.fn(() => sessionMock),
      close: jest.fn(),
      supportsMultiDb: jest.fn(() => false),
      verifyConnectivity: jest.fn(),
    };

    return { driver: driverMock, session: sessionMock };
  }

  static createQdrantClientMock() {
    return {
      getCollections: jest.fn(() => Promise.resolve({ collections: [] })),
      createCollection: jest.fn(() => Promise.resolve()),
      upsert: jest.fn(() => Promise.resolve()),
      search: jest.fn(() => Promise.resolve([])),
      retrieve: jest.fn(() => Promise.resolve([])),
      delete: jest.fn(() => Promise.resolve()),
      getCollection: jest.fn(() => Promise.resolve({})),
    };
  }

  static createPostgresMock() {
    return {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
      release: jest.fn(),
    };
  }

  static createRedisMock() {
    const data = new Map();
    
    return {
      get: jest.fn((key: string) => Promise.resolve(data.get(key))),
      set: jest.fn((key: string, value: string) => {
        data.set(key, value);
        return Promise.resolve('OK');
      }),
      del: jest.fn((key: string) => {
        const existed = data.has(key);
        data.delete(key);
        return Promise.resolve(existed ? 1 : 0);
      }),
      exists: jest.fn((key: string) => Promise.resolve(data.has(key) ? 1 : 0)),
      expire: jest.fn(() => Promise.resolve(1)),
      ttl: jest.fn(() => Promise.resolve(3600)),
      flushdb: jest.fn(() => {
        data.clear();
        return Promise.resolve('OK');
      }),
      keys: jest.fn((pattern: string) => {
        const keys = Array.from(data.keys());
        if (pattern === '*') return Promise.resolve(keys);
        // Simple pattern matching
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return Promise.resolve(keys.filter(key => regex.test(key)));
      }),
    };
  }

  static createStorageLayerMock() {
    const memories = new Map<string, Memory>();
    
    return {
      storeMemory: jest.fn((memory: Memory) => {
        memories.set(memory.id, memory);
        return Promise.resolve(memory);
      }),
      
      retrieveMemory: jest.fn((id: string) => {
        return Promise.resolve(memories.get(id));
      }),
      
      updateMemory: jest.fn((id: string, updates: Partial<Memory>) => {
        const existing = memories.get(id);
        if (existing) {
          const updated = { ...existing, ...updates };
          memories.set(id, updated);
          return Promise.resolve(updated);
        }
        return Promise.resolve(undefined);
      }),
      
      deleteMemory: jest.fn((id: string) => {
        const existed = memories.has(id);
        memories.delete(id);
        return Promise.resolve(existed);
      }),
      
      searchMemories: jest.fn((query: string, type?: MemoryType) => {
        const results = Array.from(memories.values());
        return Promise.resolve({
          memories: type ? results.filter(m => m.type === type) : results,
          total: results.length,
        });
      }),
      
      getRelatedMemories: jest.fn((memoryId: string) => {
        return Promise.resolve([]);
      }),
      
      clear: jest.fn(() => {
        memories.clear();
        return Promise.resolve();
      }),
    };
  }

  static createMCPServerMock() {
    return {
      start: jest.fn(() => Promise.resolve()),
      stop: jest.fn(() => Promise.resolve()),
      handleRequest: jest.fn(),
      registerHandler: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };
  }

  static createPluginManagerMock() {
    const plugins = new Map();
    
    return {
      loadPlugin: jest.fn((name: string, config: any) => {
        plugins.set(name, { name, config, enabled: true });
        return Promise.resolve();
      }),
      
      unloadPlugin: jest.fn((name: string) => {
        plugins.delete(name);
        return Promise.resolve();
      }),
      
      getPlugin: jest.fn((name: string) => {
        return Promise.resolve(plugins.get(name));
      }),
      
      listPlugins: jest.fn(() => {
        return Promise.resolve(Array.from(plugins.values()));
      }),
      
      executeHook: jest.fn((hookName: string, data: any) => {
        return Promise.resolve([]);
      }),
    };
  }
}

export default StorageMocks;