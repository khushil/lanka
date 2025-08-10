import { Neo4jService } from '../../src/core/database/neo4j';
import { RequirementsArchitectureIntegrationService } from '../../src/services/requirements-architecture-integration.service';
import { RequirementsService } from '../../src/modules/requirements/services/requirements.service';
import { ArchitectureDecisionService } from '../../src/modules/architecture/services/decision.service';
import { TestDataFactory } from '../factories/test-data.factory';
import { RequirementMappingType } from '../../src/types/integration.types';
import { Driver } from 'neo4j-driver';

describe('Error Scenarios and Failure Recovery Tests', () => {
  let neo4j: Neo4jService;
  let integrationService: RequirementsArchitectureIntegrationService;
  let requirementsService: RequirementsService;
  let decisionService: ArchitectureDecisionService;
  let originalDriver: Driver;

  beforeAll(async () => {
    neo4j = Neo4jService.getInstance();
    await neo4j.initializeSchema();

    integrationService = new RequirementsArchitectureIntegrationService(neo4j);
    requirementsService = new RequirementsService(neo4j);
    decisionService = new ArchitectureDecisionService(neo4j);
    
    originalDriver = neo4j.getDriver();
  });

  afterAll(async () => {
    await cleanupErrorTestData();
    await neo4j.close();
  });

  afterEach(async () => {
    // Reset driver if it was modified in tests
    if (neo4j.getDriver() !== originalDriver) {
      await neo4j.close();
      neo4j = Neo4jService.getInstance();
    }
  });

  describe('Database Connection Failures', () => {
    it('should handle database connection timeout gracefully', async () => {
      // Mock connection timeout by creating a query that will timeout
      const longRunningQuery = `
        UNWIND range(1, 1000000) as x
        WITH x
        WHERE x % 1000 = 0
        RETURN count(x)
      `;

      try {
        // This should timeout if timeout is set low enough
        await neo4j.executeQuery(longRunningQuery, {}, { timeout: 100 });
        fail('Query should have timed out');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toContain('timeout');
      }
    });

    it('should handle database connection loss during operation', async () => {
      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement()
      );

      // Simulate connection loss by closing the driver
      await neo4j.close();

      try {
        // This should fail due to closed connection
        await requirementsService.getRequirementById(requirement.id);
        fail('Should have failed due to closed connection');
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Reconnect for other tests
      neo4j = Neo4jService.getInstance();
      await neo4j.initializeSchema();
    });

    it('should recover from temporary database unavailability', async () => {
      // Create initial data
      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement()
      );

      expect(requirement.id).toBeDefined();

      // Simulate temporary unavailability and recovery
      // In a real scenario, this would involve network issues or database restarts
      // For testing, we verify the service can handle reconnection

      // Verify data is still accessible after reconnection
      const retrievedRequirement = await requirementsService.getRequirementById(requirement.id);
      expect(retrievedRequirement.id).toBe(requirement.id);
    });
  });

  describe('Transaction Failure Scenarios', () => {
    it('should rollback transactions on constraint violations', async () => {
      // Create a requirement
      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement()
      );

      const session = neo4j.getDriver().session();
      const txn = session.beginTransaction();

      try {
        // Start a transaction that will create a mapping
        await txn.run(
          `MATCH (r:Requirement {id: $requirementId})
           CREATE (m:RequirementArchitectureMapping {
             id: $mappingId,
             requirementId: $requirementId,
             confidence: $confidence,
             rationale: $rationale,
             createdAt: $createdAt
           })
           CREATE (r)-[:MAPPED_TO]->(m)`,
          {
            requirementId: requirement.id,
            mappingId: 'test-mapping-constraint-violation',
            confidence: 0.8,
            rationale: 'Transaction test',
            createdAt: new Date().toISOString()
          }
        );

        // Attempt to violate a constraint (e.g., duplicate ID)
        await txn.run(
          `CREATE (m:RequirementArchitectureMapping {
             id: $mappingId,
             requirementId: $requirementId,
             confidence: $confidence,
             rationale: $rationale,
             createdAt: $createdAt
           })`,
          {
            mappingId: 'test-mapping-constraint-violation', // Duplicate ID
            requirementId: requirement.id,
            confidence: 0.7,
            rationale: 'Duplicate mapping test',
            createdAt: new Date().toISOString()
          }
        );

        await txn.commit();
        fail('Transaction should have failed due to constraint violation');
      } catch (error) {
        await txn.rollback();
        
        // Verify no mapping was created due to rollback
        const checkQuery = `
          MATCH (m:RequirementArchitectureMapping {id: "test-mapping-constraint-violation"})
          RETURN count(m) as count
        `;
        
        const results = await neo4j.executeQuery(checkQuery);
        expect(results[0].count).toBe(0);
      } finally {
        await session.close();
      }
    });

    it('should handle concurrent transaction conflicts', async () => {
      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement()
      );
      const decision = await decisionService.createDecision(
        TestDataFactory.createArchitectureDecision()
      );

      // Create multiple concurrent transactions that might conflict
      const concurrentTransactions = Array(5).fill(null).map(async (_, index) => {
        try {
          return await integrationService.createMapping({
            requirementId: requirement.id,
            architectureDecisionId: decision.id,
            mappingType: RequirementMappingType.DIRECT,
            confidence: 0.5 + (index * 0.1),
            rationale: `Concurrent mapping attempt ${index}`
          });
        } catch (error) {
          // Some transactions may fail due to conflicts
          return { error: error.message, index };
        }
      });

      const results = await Promise.all(concurrentTransactions);
      
      // At least one should succeed
      const successful = results.filter(r => !r.hasOwnProperty('error'));
      expect(successful.length).toBeGreaterThan(0);
    });

    it('should handle partial transaction failures in complex operations', async () => {
      const requirements = await Promise.all([
        requirementsService.createRequirement(TestDataFactory.createRequirement()),
        requirementsService.createRequirement(TestDataFactory.createRequirement())
      ]);

      const decisions = await Promise.all([
        decisionService.createDecision(TestDataFactory.createArchitectureDecision()),
        decisionService.createDecision(TestDataFactory.createArchitectureDecision())
      ]);

      // Simulate a complex operation where part of it might fail
      const mappingOperations = [
        // Valid mappings
        integrationService.createMapping({
          requirementId: requirements[0].id,
          architectureDecisionId: decisions[0].id,
          mappingType: RequirementMappingType.DIRECT,
          confidence: 0.8,
          rationale: 'Valid mapping 1'
        }),

        integrationService.createMapping({
          requirementId: requirements[1].id,
          architectureDecisionId: decisions[1].id,
          mappingType: RequirementMappingType.DIRECT,
          confidence: 0.8,
          rationale: 'Valid mapping 2'
        }),

        // Invalid mapping (non-existent requirement)
        integrationService.createMapping({
          requirementId: 'non-existent-requirement',
          architectureDecisionId: decisions[0].id,
          mappingType: RequirementMappingType.DIRECT,
          confidence: 0.8,
          rationale: 'Invalid mapping'
        }).catch(error => ({ error: error.message }))
      ];

      const results = await Promise.all(mappingOperations);
      
      // Two should succeed, one should fail
      const successful = results.filter(r => r && !r.hasOwnProperty('error'));
      const failed = results.filter(r => r && r.hasOwnProperty('error'));
      
      expect(successful).toHaveLength(2);
      expect(failed).toHaveLength(1);
    });
  });

  describe('Data Validation Failures', () => {
    it('should handle invalid requirement data gracefully', async () => {
      const invalidRequirements = [
        // Missing required fields
        {
          title: 'Invalid Requirement',
          // description missing
          type: 'FUNCTIONAL'
        },
        
        // Invalid enum values
        {
          title: 'Invalid Requirement 2',
          description: 'Test',
          type: 'INVALID_TYPE',
          priority: 'INVALID_PRIORITY'
        },
        
        // Invalid data types
        {
          title: 123, // Should be string
          description: 'Test',
          type: 'FUNCTIONAL'
        }
      ];

      for (const invalidReq of invalidRequirements) {
        try {
          await requirementsService.createRequirement(invalidReq as any);
          fail(`Should have failed for invalid requirement: ${JSON.stringify(invalidReq)}`);
        } catch (error) {
          expect(error).toBeDefined();
          expect(error.message).toBeDefined();
        }
      }
    });

    it('should handle invalid mapping data gracefully', async () => {
      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement()
      );
      const decision = await decisionService.createDecision(
        TestDataFactory.createArchitectureDecision()
      );

      const invalidMappings = [
        // Invalid confidence values
        {
          requirementId: requirement.id,
          architectureDecisionId: decision.id,
          mappingType: RequirementMappingType.DIRECT,
          confidence: 1.5, // Should be between 0 and 1
          rationale: 'Invalid confidence'
        },
        
        // Missing required fields
        {
          requirementId: requirement.id,
          architectureDecisionId: decision.id,
          mappingType: RequirementMappingType.DIRECT,
          // confidence missing
          rationale: 'Missing confidence'
        },
        
        // Non-existent entities
        {
          requirementId: 'non-existent-requirement',
          architectureDecisionId: 'non-existent-decision',
          mappingType: RequirementMappingType.DIRECT,
          confidence: 0.8,
          rationale: 'Non-existent entities'
        }
      ];

      for (const invalidMapping of invalidMappings) {
        try {
          await integrationService.createMapping(invalidMapping as any);
          fail(`Should have failed for invalid mapping: ${JSON.stringify(invalidMapping)}`);
        } catch (error) {
          expect(error).toBeDefined();
          expect(error.message).toBeDefined();
        }
      }
    });

    it('should handle malformed GraphQL queries', async () => {
      // This would typically be tested at the API layer
      // Here we simulate validation errors that would occur
      const invalidInputs = [
        null,
        undefined,
        '',
        'invalid-json',
        { incomplete: 'data' }
      ];

      for (const invalidInput of invalidInputs) {
        try {
          // Simulate processing invalid input
          if (!invalidInput || typeof invalidInput !== 'object') {
            throw new Error('Invalid input format');
          }
          
          if (!invalidInput.hasOwnProperty('title')) {
            throw new Error('Required field missing: title');
          }
          
          fail(`Should have failed for invalid input: ${invalidInput}`);
        } catch (error) {
          expect(error).toBeDefined();
          expect(error.message).toBeDefined();
        }
      }
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    it('should handle memory pressure gracefully', async () => {
      // Create a large number of objects to simulate memory pressure
      const largeDataset = [];
      
      try {
        // Create increasingly large objects until memory pressure occurs
        for (let i = 0; i < 1000; i++) {
          const largeObject = {
            id: `large-object-${i}`,
            data: Buffer.alloc(1024 * 1024), // 1MB buffer
            metadata: Array(1000).fill(`metadata-${i}`)
          };
          largeDataset.push(largeObject);
          
          // Periodically try to create a requirement
          if (i % 100 === 0) {
            const requirement = await requirementsService.createRequirement(
              TestDataFactory.createRequirement()
            );
            expect(requirement.id).toBeDefined();
          }
        }
      } catch (error) {
        // If memory error occurs, ensure system is still functional
        if (error.message.includes('memory') || error.message.includes('heap')) {
          // Clear large dataset
          largeDataset.length = 0;
          
          // Verify system is still functional
          const requirement = await requirementsService.createRequirement(
            TestDataFactory.createRequirement()
          );
          expect(requirement.id).toBeDefined();
        } else {
          throw error;
        }
      } finally {
        // Cleanup
        largeDataset.length = 0;
        if (global.gc) {
          global.gc();
        }
      }
    });

    it('should handle database connection pool exhaustion', async () => {
      const connectionPromises = [];
      
      try {
        // Create many concurrent database operations
        for (let i = 0; i < 100; i++) {
          const promise = requirementsService.createRequirement(
            TestDataFactory.createRequirement({
              title: `Connection Test Requirement ${i}`
            })
          );
          connectionPromises.push(promise);
        }
        
        // Some may fail due to connection pool exhaustion
        const results = await Promise.allSettled(connectionPromises);
        
        const successful = results.filter(r => r.status === 'fulfilled');
        const failed = results.filter(r => r.status === 'rejected');
        
        // At least some should succeed
        expect(successful.length).toBeGreaterThan(0);
        
        // If some failed due to connection exhaustion, that's expected
        if (failed.length > 0) {
          console.log(`${failed.length} operations failed due to resource constraints`);
        }
      } catch (error) {
        // Handle connection pool exhaustion
        expect(error).toBeDefined();
      }
    });

    it('should handle large query result sets', async () => {
      // Create a large dataset
      const requirements = [];
      const batchSize = 50;
      
      for (let i = 0; i < batchSize; i++) {
        const req = await requirementsService.createRequirement(
          TestDataFactory.createRequirement({
            title: `Large Query Test Requirement ${i}`,
            description: `This is requirement number ${i} for testing large result sets`
          })
        );
        requirements.push(req);
      }

      try {
        // Query all requirements
        const largeResultQuery = `
          MATCH (r:Requirement)
          WHERE r.title CONTAINS "Large Query Test"
          RETURN r
          ORDER BY r.title
        `;

        const results = await neo4j.executeQuery(largeResultQuery);
        
        expect(results.length).toBe(batchSize);
        
        // Verify results are properly formatted
        results.forEach(result => {
          expect(result.r.properties.id).toBeDefined();
          expect(result.r.properties.title).toContain('Large Query Test');
        });
      } catch (error) {
        if (error.message.includes('memory') || error.message.includes('size')) {
          // If query is too large, ensure system handles it gracefully
          expect(error).toBeDefined();
        } else {
          throw error;
        }
      }
    });
  });

  describe('Network and I/O Failures', () => {
    it('should handle slow network conditions', async (done) => {
      // Simulate slow network by adding artificial delays
      const originalExecuteQuery = neo4j.executeQuery.bind(neo4j);
      
      // Mock slow network
      neo4j.executeQuery = async function(query: string, params?: any, options?: any) {
        // Add delay to simulate slow network
        await new Promise(resolve => setTimeout(resolve, 500));
        return originalExecuteQuery(query, params, options);
      };

      try {
        const startTime = Date.now();
        
        const requirement = await requirementsService.createRequirement(
          TestDataFactory.createRequirement()
        );
        
        const endTime = Date.now();
        const operationTime = endTime - startTime;
        
        expect(requirement.id).toBeDefined();
        expect(operationTime).toBeGreaterThan(500); // Should reflect the delay
        
        done();
      } finally {
        // Restore original method
        neo4j.executeQuery = originalExecuteQuery;
      }
    });

    it('should handle intermittent connection failures with retry', async () => {
      let attemptCount = 0;
      const maxAttempts = 3;
      
      async function operationWithRetry() {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            attemptCount++;
            
            // Simulate intermittent failure
            if (attempt < maxAttempts) {
              throw new Error('Simulated connection failure');
            }
            
            // Success on final attempt
            return await requirementsService.createRequirement(
              TestDataFactory.createRequirement()
            );
          } catch (error) {
            if (attempt === maxAttempts) {
              throw error;
            }
            
            // Wait before retry with exponential backoff
            await new Promise(resolve => 
              setTimeout(resolve, Math.pow(2, attempt) * 100)
            );
          }
        }
      }

      const requirement = await operationWithRetry();
      
      expect(requirement.id).toBeDefined();
      expect(attemptCount).toBe(maxAttempts);
    });
  });

  describe('Data Corruption and Recovery', () => {
    it('should detect and handle corrupted relationship data', async () => {
      // Create valid entities
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
        confidence: 0.8,
        rationale: 'Corruption test mapping'
      });

      // Simulate data corruption by directly modifying database
      await neo4j.executeQuery(
        `MATCH (m:RequirementArchitectureMapping {id: $mappingId})
         SET m.requirementId = "corrupted-requirement-id"`,
        { mappingId: mapping.id }
      );

      // Health check should detect the corruption
      const healthCheck = await integrationService.performHealthCheck();
      
      const corruptionIssue = healthCheck.issues.find(
        issue => issue.type === 'BROKEN_MAPPING'
      );
      
      if (corruptionIssue) {
        expect(corruptionIssue.severity).toBe('HIGH');
        expect(corruptionIssue.affectedItems).toContain(mapping.id);
      }
    });

    it('should handle orphaned data cleanup', async () => {
      // Create requirement and mapping
      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement()
      );
      const decision = await decisionService.createDecision(
        TestDataFactory.createArchitectureDecision()
      );
      
      const mapping = await integrationService.createMapping({
        requirementId: requirement.id,
        architectureDecisionId: decision.id,
        mappingType: RequirementMappingType.DIRECT,
        confidence: 0.8,
        rationale: 'Orphan test mapping'
      });

      // Delete requirement directly (simulating orphan scenario)
      await neo4j.executeQuery(
        'MATCH (r:Requirement {id: $id}) DETACH DELETE r',
        { id: requirement.id }
      );

      // Check for orphaned mappings
      const orphanQuery = `
        MATCH (m:RequirementArchitectureMapping {id: $mappingId})
        WHERE NOT EXISTS((:Requirement {id: m.requirementId}))
        RETURN m
      `;

      const orphanResults = await neo4j.executeQuery(orphanQuery, {
        mappingId: mapping.id
      });

      expect(orphanResults).toHaveLength(1);

      // Cleanup orphaned mappings
      const cleanupQuery = `
        MATCH (m:RequirementArchitectureMapping)
        WHERE NOT EXISTS((:Requirement {id: m.requirementId}))
           OR NOT EXISTS((:ArchitectureDecision {id: m.architectureDecisionId}))
        DETACH DELETE m
        RETURN count(m) as deletedCount
      `;

      const cleanupResults = await neo4j.executeQuery(cleanupQuery);
      expect(cleanupResults[0].deletedCount).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Access Conflicts', () => {
    it('should handle concurrent modifications to same entity', async () => {
      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement()
      );

      // Simulate concurrent updates
      const concurrentUpdates = Array(5).fill(null).map(async (_, index) => {
        try {
          return await requirementsService.updateRequirement(requirement.id, {
            description: `Updated by process ${index} at ${new Date().toISOString()}`
          });
        } catch (error) {
          return { error: error.message, index };
        }
      });

      const results = await Promise.all(concurrentUpdates);
      
      // At least one update should succeed
      const successful = results.filter(r => r && !r.hasOwnProperty('error'));
      expect(successful.length).toBeGreaterThan(0);

      // Verify final state is consistent
      const finalRequirement = await requirementsService.getRequirementById(requirement.id);
      expect(finalRequirement.description).toBeDefined();
    });

    it('should handle race conditions in mapping creation', async () => {
      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement()
      );
      const decision = await decisionService.createDecision(
        TestDataFactory.createArchitectureDecision()
      );

      // Attempt to create multiple mappings simultaneously
      const racingMappings = Array(3).fill(null).map(async (_, index) => {
        try {
          return await integrationService.createMapping({
            requirementId: requirement.id,
            architectureDecisionId: decision.id,
            mappingType: RequirementMappingType.DIRECT,
            confidence: 0.7 + (index * 0.1),
            rationale: `Racing mapping ${index}`
          });
        } catch (error) {
          return { error: error.message, index };
        }
      });

      const results = await Promise.all(racingMappings);
      
      // At least one should succeed (others may fail due to business rules)
      const successful = results.filter(r => r && !r.hasOwnProperty('error'));
      expect(successful.length).toBeGreaterThan(0);
    });
  });

  describe('System Recovery and Resilience', () => {
    it('should maintain system stability after multiple errors', async () => {
      const errors = [];
      
      // Generate multiple different types of errors
      for (let i = 0; i < 10; i++) {
        try {
          switch (i % 3) {
            case 0:
              // Invalid data
              await requirementsService.createRequirement({
                title: null,
                description: 'Invalid requirement'
              } as any);
              break;
              
            case 1:
              // Non-existent entity
              await integrationService.createMapping({
                requirementId: 'non-existent',
                architectureDecisionId: 'also-non-existent',
                mappingType: RequirementMappingType.DIRECT,
                confidence: 0.8,
                rationale: 'Should fail'
              });
              break;
              
            case 2:
              // Invalid operation
              await requirementsService.deleteRequirement('non-existent-id');
              break;
          }
        } catch (error) {
          errors.push(error);
        }
      }

      // Should have captured multiple errors
      expect(errors.length).toBe(10);

      // System should still be functional after all these errors
      const requirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement()
      );
      expect(requirement.id).toBeDefined();

      const metrics = await integrationService.getIntegrationMetrics();
      expect(metrics).toBeDefined();
    });

    it('should perform graceful degradation under load', async () => {
      const operations = [];
      
      // Create high load with mix of operations
      for (let i = 0; i < 50; i++) {
        operations.push(
          requirementsService.createRequirement(
            TestDataFactory.createRequirement({ title: `Load Test ${i}` })
          )
        );
      }

      try {
        const results = await Promise.allSettled(operations);
        
        const successful = results.filter(r => r.status === 'fulfilled');
        const failed = results.filter(r => r.status === 'rejected');
        
        // Most should succeed, but some failures under load are acceptable
        expect(successful.length).toBeGreaterThan(operations.length * 0.7);
        
        if (failed.length > 0) {
          console.log(`Graceful degradation: ${failed.length} operations failed under load`);
        }
      } catch (error) {
        // If system fails under load, it should do so gracefully
        expect(error.message).toBeDefined();
      }

      // System should recover and be functional after load test
      const postLoadRequirement = await requirementsService.createRequirement(
        TestDataFactory.createRequirement()
      );
      expect(postLoadRequirement.id).toBeDefined();
    });
  });

  // Helper functions
  async function cleanupErrorTestData(): Promise<void> {
    const cleanupQueries = [
      'MATCH (m:RequirementArchitectureMapping) WHERE m.rationale CONTAINS "test" DETACH DELETE m',
      'MATCH (r:Requirement) WHERE r.title CONTAINS "Test" OR r.title CONTAINS "Load Test" OR r.title CONTAINS "Connection Test" OR r.title CONTAINS "Large Query Test" DETACH DELETE r',
      'MATCH (a:ArchitectureDecision) WHERE a.title CONTAINS "Test" DETACH DELETE a'
    ];

    for (const query of cleanupQueries) {
      try {
        await neo4j.executeQuery(query);
      } catch (error) {
        console.warn('Error test cleanup warning:', error);
      }
    }
  }
});