import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MCPMemoryServer } from '../../../src/mcp/mcp-memory-server';
import { StorageMocks } from '../../mocks/storage-mocks';
import { MemoryFixtures } from '../../fixtures/memory-fixtures';
import { MemoryType } from '../../../src/types/memory';

describe('MCPMemoryServer', () => {
  let server: MCPMemoryServer;
  let mockOrchestrator: any;
  let mockTransport: any;

  beforeEach(async () => {
    mockOrchestrator = {
      ingestMemory: jest.fn(),
      searchMemories: jest.fn(),
      getRelatedMemories: jest.fn(),
      evaluateMemoryQuality: jest.fn(),
      detectConflicts: jest.fn(),
      mergeSimilarMemories: jest.fn(),
    };

    mockTransport = {
      start: jest.fn(),
      stop: jest.fn(),
      send: jest.fn(),
      onRequest: jest.fn(),
      onNotification: jest.fn(),
    };

    server = new MCPMemoryServer({
      orchestrator: mockOrchestrator,
      transport: mockTransport,
      config: {
        serverName: 'lanka-memory',
        version: '1.0.0',
      }
    });

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
    jest.clearAllMocks();
  });

  describe('MCP Protocol Compliance', () => {
    it('should respond to initialize request', async () => {
      // Arrange
      const initializeRequest = {
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        },
        id: 1,
      };

      // Act
      const response = await server.handleRequest(initializeRequest);

      // Assert
      expect(response).toEqual({
        id: 1,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            resources: { subscribe: true, listChanged: true },
            tools: {},
            prompts: {},
          },
          serverInfo: {
            name: 'lanka-memory',
            version: '1.0.0',
          }
        }
      });
    });

    it('should handle tool list requests', async () => {
      // Arrange
      const listToolsRequest = {
        method: 'tools/list',
        params: {},
        id: 2,
      };

      // Act
      const response = await server.handleRequest(listToolsRequest);

      // Assert
      expect(response.result.tools).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'memory-search',
            description: expect.any(String),
            inputSchema: expect.any(Object),
          }),
          expect.objectContaining({
            name: 'memory-store',
            description: expect.any(String),
            inputSchema: expect.any(Object),
          }),
          expect.objectContaining({
            name: 'memory-relate',
            description: expect.any(String),
            inputSchema: expect.any(Object),
          })
        ])
      );
    });

    it('should handle resource list requests', async () => {
      // Arrange
      const listResourcesRequest = {
        method: 'resources/list',
        params: {},
        id: 3,
      };

      // Act
      const response = await server.handleRequest(listResourcesRequest);

      // Assert
      expect(response.result.resources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            uri: 'memory://system-1',
            name: 'System-1 Memories',
            mimeType: 'application/json',
          }),
          expect.objectContaining({
            uri: 'memory://system-2',
            name: 'System-2 Memories',
            mimeType: 'application/json',
          }),
          expect.objectContaining({
            uri: 'memory://workspace',
            name: 'Workspace Memories',
            mimeType: 'application/json',
          })
        ])
      );
    });

    it('should handle invalid requests gracefully', async () => {
      // Arrange
      const invalidRequest = {
        method: 'invalid/method',
        params: {},
        id: 999,
      };

      // Act
      const response = await server.handleRequest(invalidRequest);

      // Assert
      expect(response).toEqual({
        id: 999,
        error: {
          code: -32601,
          message: 'Method not found',
          data: { method: 'invalid/method' }
        }
      });
    });
  });

  describe('Memory Search Tool', () => {
    it('should execute memory search with semantic query', async () => {
      // Arrange
      const searchMemories = [
        MemoryFixtures.createSystem1Memory({ id: 'search_001' }),
        MemoryFixtures.createSystem2Memory({ id: 'search_002' }),
      ];

      mockOrchestrator.searchMemories.mockResolvedValue({
        memories: searchMemories,
        total: 2,
        searchTime: 50,
      });

      const toolRequest = {
        method: 'tools/call',
        params: {
          name: 'memory-search',
          arguments: {
            query: 'async programming patterns',
            type: 'system-1',
            limit: 10,
          }
        },
        id: 4,
      };

      // Act
      const response = await server.handleRequest(toolRequest);

      // Assert
      expect(mockOrchestrator.searchMemories).toHaveBeenCalledWith(
        'async programming patterns',
        {
          type: MemoryType.SYSTEM_1,
          limit: 10,
        }
      );

      expect(response.result.content).toEqual([{
        type: 'text',
        text: expect.stringContaining('Found 2 memories'),
      }]);
    });

    it('should handle search with workspace filtering', async () => {
      // Arrange
      const workspaceMemories = [
        MemoryFixtures.createWorkspaceMemory({
          id: 'workspace_001',
          metadata: {
            ...MemoryFixtures.createWorkspaceMemory().metadata,
            workspace: 'team-alpha',
          }
        })
      ];

      mockOrchestrator.searchMemories.mockResolvedValue({
        memories: workspaceMemories,
        total: 1,
        searchTime: 30,
      });

      const toolRequest = {
        method: 'tools/call',
        params: {
          name: 'memory-search',
          arguments: {
            query: 'team conventions',
            workspace: 'team-alpha',
            limit: 5,
          }
        },
        id: 5,
      };

      // Act
      const response = await server.handleRequest(toolRequest);

      // Assert
      expect(mockOrchestrator.searchMemories).toHaveBeenCalledWith(
        'team conventions',
        {
          workspace: 'team-alpha',
          limit: 5,
        }
      );
    });

    it('should handle empty search results', async () => {
      // Arrange
      mockOrchestrator.searchMemories.mockResolvedValue({
        memories: [],
        total: 0,
        searchTime: 10,
      });

      const toolRequest = {
        method: 'tools/call',
        params: {
          name: 'memory-search',
          arguments: {
            query: 'nonexistent pattern',
          }
        },
        id: 6,
      };

      // Act
      const response = await server.handleRequest(toolRequest);

      // Assert
      expect(response.result.content[0].text).toContain('No memories found');
    });
  });

  describe('Memory Store Tool', () => {
    it('should store new memory with arbitration', async () => {
      // Arrange
      const candidateMemory = MemoryFixtures.createSystem1Memory();
      mockOrchestrator.ingestMemory.mockResolvedValue({
        success: true,
        memory: candidateMemory,
        action: 'ADD_NEW',
      });

      const toolRequest = {
        method: 'tools/call',
        params: {
          name: 'memory-store',
          arguments: {
            content: candidateMemory.content,
            type: 'system-1',
            workspace: 'default',
            tags: ['javascript', 'async'],
          }
        },
        id: 7,
      };

      // Act
      const response = await server.handleRequest(toolRequest);

      // Assert
      expect(mockOrchestrator.ingestMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          content: candidateMemory.content,
          type: MemoryType.SYSTEM_1,
          metadata: expect.objectContaining({
            workspace: 'default',
            tags: ['javascript', 'async'],
          })
        })
      );

      expect(response.result.content[0].text).toContain('Successfully stored memory');
    });

    it('should handle memory rejection', async () => {
      // Arrange
      mockOrchestrator.ingestMemory.mockResolvedValue({
        success: false,
        action: 'REJECT',
        reason: 'Quality below threshold',
      });

      const toolRequest = {
        method: 'tools/call',
        params: {
          name: 'memory-store',
          arguments: {
            content: 'vague advice',
            type: 'system-1',
          }
        },
        id: 8,
      };

      // Act
      const response = await server.handleRequest(toolRequest);

      // Assert
      expect(response.result.content[0].text).toContain('Memory was rejected');
      expect(response.result.content[0].text).toContain('Quality below threshold');
    });

    it('should validate required parameters', async () => {
      // Arrange
      const toolRequest = {
        method: 'tools/call',
        params: {
          name: 'memory-store',
          arguments: {
            // Missing required 'content' parameter
            type: 'system-1',
          }
        },
        id: 9,
      };

      // Act
      const response = await server.handleRequest(toolRequest);

      // Assert
      expect(response.error).toEqual({
        code: -32602,
        message: 'Invalid params',
        data: expect.objectContaining({
          errors: expect.arrayContaining([
            expect.stringContaining('content')
          ])
        })
      });
    });
  });

  describe('Memory Relationship Tool', () => {
    it('should create memory relationships', async () => {
      // Arrange
      const sourceId = 'mem_001';
      const targetId = 'mem_002';
      const relationType = 'IMPLEMENTS';

      const toolRequest = {
        method: 'tools/call',
        params: {
          name: 'memory-relate',
          arguments: {
            sourceId,
            targetId,
            relationship: relationType,
            context: 'pattern implementation',
          }
        },
        id: 10,
      };

      // Act
      const response = await server.handleRequest(toolRequest);

      // Assert
      expect(response.result.content[0].text).toContain('Created relationship');
      expect(response.result.content[0].text).toContain(relationType);
    });

    it('should retrieve related memories', async () => {
      // Arrange
      const memoryId = 'mem_001';
      const relatedMemories = [
        MemoryFixtures.createSystem1Memory({ id: 'related_001' }),
        MemoryFixtures.createSystem2Memory({ id: 'related_002' }),
      ];

      mockOrchestrator.getRelatedMemories.mockResolvedValue(relatedMemories);

      const toolRequest = {
        method: 'tools/call',
        params: {
          name: 'memory-relate',
          arguments: {
            memoryId,
            action: 'get-related',
            maxDepth: 2,
          }
        },
        id: 11,
      };

      // Act
      const response = await server.handleRequest(toolRequest);

      // Assert
      expect(mockOrchestrator.getRelatedMemories).toHaveBeenCalledWith(
        memoryId,
        { maxDepth: 2 }
      );
      expect(response.result.content[0].text).toContain('Found 2 related memories');
    });
  });

  describe('Resource Access', () => {
    it('should provide system-1 memories as resource', async () => {
      // Arrange
      const system1Memories = [
        MemoryFixtures.createSystem1Memory({ id: 'sys1_001' }),
        MemoryFixtures.createSystem1Memory({ id: 'sys1_002' }),
      ];

      mockOrchestrator.searchMemories.mockResolvedValue({
        memories: system1Memories,
        total: 2,
      });

      const resourceRequest = {
        method: 'resources/read',
        params: {
          uri: 'memory://system-1',
        },
        id: 12,
      };

      // Act
      const response = await server.handleRequest(resourceRequest);

      // Assert
      expect(response.result.contents[0].uri).toBe('memory://system-1');
      expect(response.result.contents[0].mimeType).toBe('application/json');
      
      const data = JSON.parse(response.result.contents[0].text);
      expect(data.memories).toHaveLength(2);
      expect(data.type).toBe('system-1');
    });

    it('should handle resource not found', async () => {
      // Arrange
      const resourceRequest = {
        method: 'resources/read',
        params: {
          uri: 'memory://invalid-resource',
        },
        id: 13,
      };

      // Act
      const response = await server.handleRequest(resourceRequest);

      // Assert
      expect(response.error).toEqual({
        code: -32603,
        message: 'Internal error',
        data: { uri: 'memory://invalid-resource' }
      });
    });

    it('should support resource subscriptions', async () => {
      // Arrange
      const subscribeRequest = {
        method: 'resources/subscribe',
        params: {
          uri: 'memory://system-1',
        },
        id: 14,
      };

      // Act
      const response = await server.handleRequest(subscribeRequest);

      // Assert
      expect(response.result).toEqual({});
      expect(server.hasSubscriber('memory://system-1')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle orchestrator errors gracefully', async () => {
      // Arrange
      mockOrchestrator.searchMemories.mockRejectedValue(
        new Error('Database connection failed')
      );

      const toolRequest = {
        method: 'tools/call',
        params: {
          name: 'memory-search',
          arguments: { query: 'test' }
        },
        id: 15,
      };

      // Act
      const response = await server.handleRequest(toolRequest);

      // Assert
      expect(response.error).toEqual({
        code: -32603,
        message: 'Internal error',
        data: { error: 'Database connection failed' }
      });
    });

    it('should validate tool arguments', async () => {
      // Arrange
      const toolRequest = {
        method: 'tools/call',
        params: {
          name: 'memory-search',
          arguments: {
            query: '', // Empty query
            limit: -1, // Invalid limit
          }
        },
        id: 16,
      };

      // Act
      const response = await server.handleRequest(toolRequest);

      // Assert
      expect(response.error.code).toBe(-32602);
      expect(response.error.message).toBe('Invalid params');
    });

    it('should handle concurrent requests', async () => {
      // Arrange
      const requests = Array.from({ length: 10 }, (_, i) => ({
        method: 'tools/call',
        params: {
          name: 'memory-search',
          arguments: { query: `test query ${i}` }
        },
        id: 100 + i,
      }));

      mockOrchestrator.searchMemories.mockResolvedValue({
        memories: [],
        total: 0,
      });

      // Act
      const responses = await Promise.all(
        requests.map(req => server.handleRequest(req))
      );

      // Assert
      expect(responses).toHaveLength(10);
      expect(responses.every(r => r.result)).toBe(true);
      expect(mockOrchestrator.searchMemories).toHaveBeenCalledTimes(10);
    });
  });

  describe('Performance and Optimization', () => {
    it('should cache frequent resource requests', async () => {
      // Arrange
      const resourceRequest = {
        method: 'resources/read',
        params: { uri: 'memory://system-1' },
        id: 17,
      };

      mockOrchestrator.searchMemories.mockResolvedValue({
        memories: [MemoryFixtures.createSystem1Memory()],
        total: 1,
      });

      // Act - Make the same request twice
      await server.handleRequest(resourceRequest);
      await server.handleRequest({ ...resourceRequest, id: 18 });

      // Assert - Orchestrator should only be called once due to caching
      expect(mockOrchestrator.searchMemories).toHaveBeenCalledTimes(1);
    });

    it('should handle high-frequency tool calls efficiently', async () => {
      // Arrange
      const start = Date.now();
      const requests = Array.from({ length: 100 }, (_, i) => ({
        method: 'tools/call',
        params: {
          name: 'memory-search',
          arguments: { query: 'pattern', limit: 5 }
        },
        id: 200 + i,
      }));

      mockOrchestrator.searchMemories.mockResolvedValue({
        memories: [],
        total: 0,
        searchTime: 10,
      });

      // Act
      await Promise.all(requests.map(req => server.handleRequest(req)));
      const duration = Date.now() - start;

      // Assert
      expect(duration).toBeLessThan(2000); // Should handle 100 requests in under 2 seconds
    });
  });
});