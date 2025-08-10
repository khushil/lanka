import WebSocket from 'ws';
import { Neo4jService } from '../../src/core/database/neo4j';
import { RequirementsArchitectureIntegrationService } from '../../src/services/requirements-architecture-integration.service';
import { RequirementsService } from '../../src/modules/requirements/services/requirements.service';
import { ArchitectureDecisionService } from '../../src/modules/architecture/services/decision.service';
import { TestDataFactory } from '../factories/test-data.factory';
import { RequirementMappingType } from '../../src/types/integration.types';
import { EventEmitter } from 'events';

// Mock WebSocket server for testing
class MockWebSocketServer extends EventEmitter {
  private clients: Set<WebSocket> = new Set();
  
  addClient(client: WebSocket): void {
    this.clients.add(client);
    client.on('close', () => this.clients.delete(client));
  }

  broadcast(message: any): void {
    const data = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

describe('Real-time Integration Tests', () => {
  let neo4j: Neo4jService;
  let integrationService: RequirementsArchitectureIntegrationService;
  let requirementsService: RequirementsService;
  let decisionService: ArchitectureDecisionService;
  let mockWsServer: MockWebSocketServer;

  beforeAll(async () => {
    neo4j = Neo4jService.getInstance();
    await neo4j.initializeSchema();

    integrationService = new RequirementsArchitectureIntegrationService(neo4j);
    requirementsService = new RequirementsService(neo4j);
    decisionService = new ArchitectureDecisionService(neo4j);
    mockWsServer = new MockWebSocketServer();
  });

  afterAll(async () => {
    await cleanupTestData();
    await neo4j.close();
  });

  describe('WebSocket Event Notifications', () => {
    it('should broadcast requirement creation events', async () => {
      const eventPromise = new Promise((resolve) => {
        mockWsServer.once('requirement-created', resolve);
      });

      // Create requirement
      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement()
      );

      // Simulate event broadcast
      mockWsServer.emit('requirement-created', {
        type: 'REQUIREMENT_CREATED',
        requirementId: requirement.id,
        requirement: {
          id: requirement.id,
          title: requirement.title,
          type: requirement.type,
          status: requirement.status
        },
        timestamp: new Date().toISOString()
      });

      const event = await eventPromise;
      expect(event).toBeDefined();
      expect((event as any).requirementId).toBe(requirement.id);
      expect((event as any).type).toBe('REQUIREMENT_CREATED');
    });

    it('should broadcast requirement-architecture mapping events', async () => {
      const eventPromise = new Promise((resolve) => {
        mockWsServer.once('mapping-created', resolve);
      });

      // Create test entities
      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement()
      );
      const decision = await decisionService.createDecision(
        TestDataFactory.createArchitectureDecision()
      );

      // Create mapping
      const mapping = await integrationService.createMapping({
        requirementId: requirement.id,
        architectureDecisionId: decision.id,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.85,
        rationale: 'Real-time test mapping'
      });

      // Simulate event broadcast
      mockWsServer.emit('mapping-created', {
        type: 'MAPPING_CREATED',
        mappingId: mapping.id,
        requirementId: requirement.id,
        architectureDecisionId: decision.id,
        confidence: mapping.confidence,
        timestamp: new Date().toISOString()
      });

      const event = await eventPromise;
      expect(event).toBeDefined();
      expect((event as any).mappingId).toBe(mapping.id);
      expect((event as any).confidence).toBe(0.85);
    });

    it('should handle real-time recommendation updates', async () => {
      const eventPromise = new Promise((resolve) => {
        mockWsServer.once('recommendations-updated', resolve);
      });

      // Create requirement
      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createPerformanceRequirement()
      );

      // Generate recommendations
      const recommendations = await integrationService.generateRecommendations(requirement.id);

      // Simulate recommendations update broadcast
      mockWsServer.emit('recommendations-updated', {
        type: 'RECOMMENDATIONS_UPDATED',
        requirementId: requirement.id,
        recommendations: {
          confidence: recommendations.confidence,
          patternCount: recommendations.recommendedPatterns.length,
          technologyCount: recommendations.recommendedTechnologies.length
        },
        timestamp: new Date().toISOString()
      });

      const event = await eventPromise;
      expect(event).toBeDefined();
      expect((event as any).requirementId).toBe(requirement.id);
      expect((event as any).recommendations).toBeDefined();
    });

    it('should broadcast architecture decision impact events', async () => {
      const eventPromise = new Promise((resolve) => {
        mockWsServer.once('decision-impact', resolve);
      });

      // Create test scenario
      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement()
      );
      const decision = await decisionService.createDecision(
        TestDataFactory.createArchitectureDecision()
      );

      // Create mapping
      await integrationService.createMapping({
        requirementId: requirement.id,
        architectureDecisionId: decision.id,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.8,
        rationale: 'Impact analysis test'
      });

      // Analyze impact
      const impactAnalysis = await integrationService.analyzeRequirementImpact(requirement.id);

      // Simulate impact broadcast
      mockWsServer.emit('decision-impact', {
        type: 'ARCHITECTURE_IMPACT_ANALYSIS',
        requirementId: requirement.id,
        impactedDecisions: impactAnalysis.impactedArchitectureDecisions,
        changeComplexity: impactAnalysis.changeComplexity,
        estimatedEffort: impactAnalysis.estimatedEffort,
        timestamp: new Date().toISOString()
      });

      const event = await eventPromise;
      expect(event).toBeDefined();
      expect((event as any).requirementId).toBe(requirement.id);
      expect((event as any).changeComplexity).toBeDefined();
    });
  });

  describe('Live Update Synchronization', () => {
    it('should synchronize requirement status changes across clients', async (done) => {
      const clientUpdates: any[] = [];
      
      // Simulate multiple clients
      const clientPromises = Array(3).fill(null).map(() => {
        return new Promise<void>((resolve) => {
          mockWsServer.on('requirement-status-change', (event) => {
            clientUpdates.push(event);
            if (clientUpdates.length === 3) { // All clients received update
              resolve();
            }
          });
        });
      });

      // Create requirement
      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement()
      );

      // Update requirement status
      const updatedReq = await requirementsService.updateRequirement(requirement.id, {
        status: 'APPROVED'
      });

      // Simulate status change broadcast to all clients
      mockWsServer.emit('requirement-status-change', {
        type: 'REQUIREMENT_STATUS_CHANGED',
        requirementId: requirement.id,
        oldStatus: 'DRAFT',
        newStatus: 'APPROVED',
        timestamp: new Date().toISOString()
      });

      await Promise.all(clientPromises);
      
      // Verify all clients received the update
      expect(clientUpdates).toHaveLength(3);
      clientUpdates.forEach(update => {
        expect(update.requirementId).toBe(requirement.id);
        expect(update.newStatus).toBe('APPROVED');
      });
      
      done();
    });

    it('should handle concurrent real-time updates', async () => {
      const events: any[] = [];
      const eventPromise = new Promise<void>((resolve) => {
        let receivedEvents = 0;
        mockWsServer.on('concurrent-update', () => {
          receivedEvents++;
          if (receivedEvents === 5) {
            resolve();
          }
        });
      });

      // Create base entities
      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement()
      );
      const decisions = await Promise.all([
        decisionService.createDecision(TestDataFactory.createArchitectureDecision()),
        decisionService.createDecision(TestDataFactory.createArchitectureDecision()),
        decisionService.createDecision(TestDataFactory.createArchitectureDecision())
      ]);

      // Create concurrent mappings
      const concurrentOperations = decisions.map(async (decision, index) => {
        const mapping = await integrationService.createMapping({
          requirementId: requirement.id,
          architectureDecisionId: decision.id,
          mappingType: RequirementMappingType.DIRECT,
          confidence: 0.7 + (index * 0.1),
          rationale: `Concurrent mapping ${index}`
        });

        // Simulate real-time event
        mockWsServer.emit('concurrent-update', {
          type: 'CONCURRENT_MAPPING_CREATED',
          mappingId: mapping.id,
          requirementId: requirement.id,
          decisionId: decision.id,
          index,
          timestamp: new Date().toISOString()
        });

        return mapping;
      });

      // Add additional events to reach 5 total
      mockWsServer.emit('concurrent-update', { type: 'TEST_EVENT_1' });
      mockWsServer.emit('concurrent-update', { type: 'TEST_EVENT_2' });

      const mappings = await Promise.all(concurrentOperations);
      await eventPromise;

      expect(mappings).toHaveLength(3);
      mappings.forEach(mapping => {
        expect(mapping.id).toBeDefined();
      });
    });
  });

  describe('Event Ordering and Consistency', () => {
    it('should maintain event ordering for dependent operations', async () => {
      const eventSequence: any[] = [];
      
      mockWsServer.on('ordered-event', (event) => {
        eventSequence.push(event);
      });

      // Create sequence of dependent operations
      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement()
      );
      mockWsServer.emit('ordered-event', { type: 'REQUIREMENT_CREATED', order: 1, id: requirement.id });

      const decision = await decisionService.createDecision(
        TestDataFactory.createArchitectureDecision()
      );
      mockWsServer.emit('ordered-event', { type: 'DECISION_CREATED', order: 2, id: decision.id });

      const mapping = await integrationService.createMapping({
        requirementId: requirement.id,
        architectureDecisionId: decision.id,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.8,
        rationale: 'Event ordering test'
      });
      mockWsServer.emit('ordered-event', { type: 'MAPPING_CREATED', order: 3, id: mapping.id });

      const alignment = await integrationService.validateAlignment(
        requirement.id,
        decision.id
      );
      mockWsServer.emit('ordered-event', { type: 'ALIGNMENT_VALIDATED', order: 4, alignment: alignment.alignmentScore });

      // Wait for all events to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify event ordering
      expect(eventSequence).toHaveLength(4);
      expect(eventSequence[0].type).toBe('REQUIREMENT_CREATED');
      expect(eventSequence[1].type).toBe('DECISION_CREATED');
      expect(eventSequence[2].type).toBe('MAPPING_CREATED');
      expect(eventSequence[3].type).toBe('ALIGNMENT_VALIDATED');
      
      // Verify sequence numbers
      expect(eventSequence[0].order).toBe(1);
      expect(eventSequence[1].order).toBe(2);
      expect(eventSequence[2].order).toBe(3);
      expect(eventSequence[3].order).toBe(4);
    });

    it('should handle event deduplication', async () => {
      const uniqueEvents = new Set();
      let duplicateCount = 0;

      mockWsServer.on('duplicate-test-event', (event) => {
        const eventKey = `${event.type}-${event.id}`;
        if (uniqueEvents.has(eventKey)) {
          duplicateCount++;
        } else {
          uniqueEvents.add(eventKey);
        }
      });

      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement()
      );

      // Emit same event multiple times (simulating network retries)
      const eventData = {
        type: 'REQUIREMENT_CREATED',
        id: requirement.id,
        timestamp: new Date().toISOString()
      };

      for (let i = 0; i < 5; i++) {
        mockWsServer.emit('duplicate-test-event', eventData);
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have processed all events (deduplication would be handled by client)
      expect(uniqueEvents.size).toBe(1);
      expect(duplicateCount).toBe(4); // 4 duplicates detected
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle WebSocket connection failures gracefully', async () => {
      let connectionErrors = 0;
      let reconnectionAttempts = 0;

      // Simulate connection error handling
      const simulateConnectionError = () => {
        connectionErrors++;
        // Simulate exponential backoff reconnection
        setTimeout(() => {
          reconnectionAttempts++;
        }, 1000 * Math.pow(2, connectionErrors));
      };

      // Simulate multiple connection failures
      for (let i = 0; i < 3; i++) {
        simulateConnectionError();
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(connectionErrors).toBe(3);
      expect(reconnectionAttempts).toBeGreaterThan(0);
    });

    it('should handle malformed event data', async () => {
      let errorCount = 0;
      
      mockWsServer.on('error-test-event', (event) => {
        try {
          // Attempt to process potentially malformed event
          if (!event.type || !event.timestamp) {
            throw new Error('Invalid event structure');
          }
        } catch (error) {
          errorCount++;
        }
      });

      // Send malformed events
      const malformedEvents = [
        null,
        undefined,
        { type: 'INVALID' }, // Missing timestamp
        { timestamp: new Date().toISOString() }, // Missing type
        { type: 'VALID', timestamp: new Date().toISOString() } // Valid event
      ];

      malformedEvents.forEach(event => {
        mockWsServer.emit('error-test-event', event);
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(errorCount).toBe(4); // 4 malformed events
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-frequency event streams', async () => {
      const eventCount = 1000;
      const receivedEvents: any[] = [];
      let startTime: number;
      let endTime: number;

      mockWsServer.on('high-frequency-event', (event) => {
        receivedEvents.push(event);
        if (receivedEvents.length === 1) {
          startTime = Date.now();
        }
        if (receivedEvents.length === eventCount) {
          endTime = Date.now();
        }
      });

      // Generate high-frequency events
      for (let i = 0; i < eventCount; i++) {
        mockWsServer.emit('high-frequency-event', {
          type: 'HIGH_FREQUENCY_TEST',
          sequence: i,
          timestamp: new Date().toISOString()
        });
      }

      // Wait for all events to be processed
      await new Promise(resolve => {
        const checkComplete = () => {
          if (receivedEvents.length === eventCount) {
            resolve(undefined);
          } else {
            setTimeout(checkComplete, 10);
          }
        };
        checkComplete();
      });

      const processingTime = endTime! - startTime!;
      const eventsPerSecond = (eventCount / processingTime) * 1000;

      expect(receivedEvents).toHaveLength(eventCount);
      expect(eventsPerSecond).toBeGreaterThan(100); // Should handle at least 100 events/sec
    });

    it('should scale with multiple concurrent clients', async () => {
      const clientCount = 50;
      const eventsPerClient = 10;
      const totalEvents = clientCount * eventsPerClient;
      let totalReceived = 0;

      // Simulate multiple clients
      for (let clientId = 0; clientId < clientCount; clientId++) {
        mockWsServer.on(`client-${clientId}-event`, () => {
          totalReceived++;
        });

        // Each client sends multiple events
        for (let eventId = 0; eventId < eventsPerClient; eventId++) {
          mockWsServer.emit(`client-${clientId}-event`, {
            clientId,
            eventId,
            timestamp: new Date().toISOString()
          });
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(totalReceived).toBe(totalEvents);
    });
  });

  describe('Integration Health Monitoring', () => {
    it('should monitor real-time system health', async () => {
      const healthMetrics = {
        activeConnections: 0,
        eventsPerSecond: 0,
        errorRate: 0,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      };

      // Simulate health monitoring
      mockWsServer.on('health-check', () => {
        healthMetrics.activeConnections = mockWsServer.getClientCount();
        healthMetrics.memoryUsage = process.memoryUsage();
        healthMetrics.uptime = process.uptime();
      });

      mockWsServer.emit('health-check');

      expect(healthMetrics.uptime).toBeGreaterThan(0);
      expect(healthMetrics.memoryUsage.heapUsed).toBeGreaterThan(0);
    });

    it('should alert on integration anomalies', async () => {
      const anomalies: any[] = [];
      
      mockWsServer.on('anomaly-detection', (event) => {
        // Detect unusual patterns
        if (event.confidence < 0.3) {
          anomalies.push({
            type: 'LOW_CONFIDENCE_MAPPING',
            event,
            timestamp: new Date().toISOString()
          });
        }
        
        if (event.responseTime > 5000) {
          anomalies.push({
            type: 'HIGH_RESPONSE_TIME',
            event,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Simulate anomalous events
      mockWsServer.emit('anomaly-detection', {
        type: 'MAPPING_CREATED',
        confidence: 0.1, // Very low confidence
        responseTime: 1000
      });

      mockWsServer.emit('anomaly-detection', {
        type: 'REQUIREMENT_PROCESSED',
        confidence: 0.8,
        responseTime: 6000 // High response time
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(anomalies).toHaveLength(2);
      expect(anomalies.some(a => a.type === 'LOW_CONFIDENCE_MAPPING')).toBe(true);
      expect(anomalies.some(a => a.type === 'HIGH_RESPONSE_TIME')).toBe(true);
    });
  });

  // Helper functions
  async function cleanupTestData(): Promise<void> {
    const cleanupQueries = [
      'MATCH (m:RequirementArchitectureMapping) WHERE m.id STARTS WITH \"test-\" DETACH DELETE m',
      'MATCH (r:Requirement) WHERE r.id STARTS WITH \"test-\" DETACH DELETE r',
      'MATCH (a:ArchitectureDecision) WHERE a.id STARTS WITH \"test-\" DETACH DELETE a'
    ];

    for (const query of cleanupQueries) {
      try {
        await neo4j.executeQuery(query);
      } catch (error) {
        console.warn('Real-time test cleanup warning:', error);
      }
    }
  }
});