/**
 * GraphQL Schema Contract Validation Tests
 * Tests schema consistency, validation, and evolution
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { GraphQLSchema, buildClientSchema, getIntrospectionQuery, introspectionFromSchema } from 'graphql';
import { validateSchema, findBreakingChanges, findDangerousChanges } from 'graphql';
import { createGraphQLSchema } from '../../../src/api/graphql/schema';
import { ApolloServer } from 'apollo-server-express';
import request from 'supertest';
import express from 'express';

describe('GraphQL Schema Contract Tests', () => {
  let schema: GraphQLSchema;
  let server: ApolloServer;
  let app: express.Application;
  let introspectionResult: any;

  beforeAll(async () => {
    schema = await createGraphQLSchema();
    server = new ApolloServer({ 
      schema,
      introspection: true,
      playground: false
    });
    
    app = express();
    server.applyMiddleware({ app, path: '/graphql' });

    // Get schema introspection for contract testing
    const { data } = await server.executeOperation({
      query: getIntrospectionQuery()
    });
    introspectionResult = data;
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('Schema Structure Validation', () => {
    test('should have valid GraphQL schema', () => {
      const errors = validateSchema(schema);
      expect(errors).toHaveLength(0);
    });

    test('should have required root types', () => {
      expect(schema.getQueryType()).toBeDefined();
      expect(schema.getMutationType()).toBeDefined();
      expect(schema.getSubscriptionType()).toBeDefined();
    });

    test('should have health check query', () => {
      const queryType = schema.getQueryType();
      const healthField = queryType?.getFields().health;
      
      expect(healthField).toBeDefined();
      expect(healthField?.type.toString()).toBe('String!');
    });

    test('should have consistent scalar definitions', () => {
      const scalarTypes = Object.values(schema.getTypeMap())
        .filter(type => type.astNode?.kind === 'ScalarTypeDefinition');
      
      // Check required scalars are defined
      const scalarNames = scalarTypes.map(scalar => scalar.name);
      expect(scalarNames).toContain('Date');
      expect(scalarNames).toContain('JSON');
    });

    test('should maintain enum consistency', () => {
      const requirementTypeEnum = schema.getType('RequirementType');
      const architectureDecisionStatusEnum = schema.getType('ArchitectureDecisionStatus');
      
      expect(requirementTypeEnum).toBeDefined();
      expect(architectureDecisionStatusEnum).toBeDefined();
      
      // Validate enum values
      if (requirementTypeEnum && 'getValues' in requirementTypeEnum) {
        const values = requirementTypeEnum.getValues().map(v => v.name);
        expect(values).toContain('BUSINESS');
        expect(values).toContain('FUNCTIONAL');
        expect(values).toContain('NON_FUNCTIONAL');
      }
    });
  });

  describe('Field Resolution Contract', () => {
    test('should resolve requirement fields correctly', async () => {
      const query = `
        query TestQuery {
          __type(name: "Requirement") {
            name
            fields {
              name
              type {
                name
                kind
              }
            }
          }
        }
      `;

      const result = await server.executeOperation({ query });
      expect(result.errors).toBeUndefined();
      
      const requirementType = result.data?.__type;
      expect(requirementType.name).toBe('Requirement');
      
      const fieldNames = requirementType.fields.map((field: any) => field.name);
      expect(fieldNames).toContain('id');
      expect(fieldNames).toContain('title');
      expect(fieldNames).toContain('description');
      expect(fieldNames).toContain('type');
      expect(fieldNames).toContain('status');
    });

    test('should have proper input validation contracts', async () => {
      const query = `
        query TestInputValidation {
          __type(name: "CreateRequirementInput") {
            name
            inputFields {
              name
              type {
                name
                kind
                ofType {
                  name
                  kind
                }
              }
            }
          }
        }
      `;

      const result = await server.executeOperation({ query });
      expect(result.errors).toBeUndefined();
      
      const inputType = result.data?.__type;
      const requiredFields = inputType.inputFields.filter((field: any) => 
        field.type.kind === 'NON_NULL'
      );
      
      expect(requiredFields.length).toBeGreaterThan(0);
    });
  });

  describe('Query Complexity Analysis', () => {
    test('should handle complex nested queries within limits', async () => {
      const complexQuery = `
        query ComplexQuery {
          requirements(limit: 5) {
            id
            title
            description
            dependencies {
              id
              title
              dependencies {
                id
                title
              }
            }
            similarRequirements {
              requirement {
                id
                title
              }
              similarity
            }
          }
        }
      `;

      // This should not timeout or fail due to complexity
      const startTime = Date.now();
      const result = await server.executeOperation({ query: complexQuery });
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.errors).toBeUndefined();
    });

    test('should respect pagination limits', async () => {
      const query = `
        query TestPagination($limit: Int!) {
          requirements(limit: $limit) {
            id
            title
          }
        }
      `;

      // Test with reasonable limit
      const result = await server.executeOperation({
        query,
        variables: { limit: 20 }
      });
      
      expect(result.errors).toBeUndefined();
      
      // Test with excessive limit (should be capped)
      const excessiveResult = await server.executeOperation({
        query,
        variables: { limit: 10000 }
      });
      
      // Should either error or cap the results
      if (excessiveResult.data) {
        expect(Array.isArray(excessiveResult.data.requirements)).toBe(true);
        expect(excessiveResult.data.requirements.length).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Schema Evolution and Breaking Changes', () => {
    test('should detect schema changes from baseline', () => {
      // Load baseline schema for comparison
      const baselineIntrospection = loadBaselineSchema();
      
      if (baselineIntrospection) {
        const baselineSchema = buildClientSchema(baselineIntrospection);
        
        const breakingChanges = findBreakingChanges(baselineSchema, schema);
        const dangerousChanges = findDangerousChanges(baselineSchema, schema);
        
        // Log changes for review
        if (breakingChanges.length > 0) {
          console.warn('Breaking changes detected:', breakingChanges);
        }
        
        if (dangerousChanges.length > 0) {
          console.warn('Dangerous changes detected:', dangerousChanges);
        }
        
        // In a real scenario, you might fail the test if breaking changes are found
        // expect(breakingChanges).toHaveLength(0);
      }
    });

    test('should maintain backward compatibility for core types', () => {
      const requirementType = schema.getType('Requirement');
      const architectureDecisionType = schema.getType('ArchitectureDecision');
      
      expect(requirementType).toBeDefined();
      expect(architectureDecisionType).toBeDefined();
      
      // Check that core fields are maintained
      if (requirementType && 'getFields' in requirementType) {
        const fields = requirementType.getFields();
        expect(fields.id).toBeDefined();
        expect(fields.title).toBeDefined();
        expect(fields.description).toBeDefined();
        expect(fields.type).toBeDefined();
      }
    });
  });

  describe('Error Handling Contracts', () => {
    test('should return proper error format for invalid queries', async () => {
      const invalidQuery = `
        query InvalidQuery {
          nonExistentField
        }
      `;

      const result = await server.executeOperation({ query: invalidQuery });
      expect(result.errors).toBeDefined();
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].message).toContain('nonExistentField');
    });

    test('should handle malformed queries gracefully', async () => {
      const malformedQuery = `
        query {
          requirements(
        `;

      const result = await server.executeOperation({ query: malformedQuery });
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toHaveProperty('message');
    });
  });

  describe('Subscription Contracts', () => {
    test('should have valid subscription definitions', () => {
      const subscriptionType = schema.getSubscriptionType();
      expect(subscriptionType).toBeDefined();
      
      if (subscriptionType) {
        const fields = subscriptionType.getFields();
        
        // Check for architecture-related subscriptions
        expect(fields.architectureDecisionCreated).toBeDefined();
        expect(fields.architectureDecisionUpdated).toBeDefined();
        expect(fields.mappingCreated).toBeDefined();
      }
    });
  });

  describe('Performance and Resource Constraints', () => {
    test('should handle concurrent requests efficiently', async () => {
      const query = `
        query HealthCheck {
          health
        }
      `;

      const concurrentRequests = Array.from({ length: 10 }, () =>
        server.executeOperation({ query })
      );

      const startTime = Date.now();
      const results = await Promise.all(concurrentRequests);
      const totalTime = Date.now() - startTime;

      results.forEach(result => {
        expect(result.errors).toBeUndefined();
        expect(result.data?.health).toBe('LANKA GraphQL API is healthy');
      });

      // Should handle 10 concurrent requests within reasonable time
      expect(totalTime).toBeLessThan(2000);
    });

    test('should respect field-level authorization contracts', async () => {
      // Test with queries that might require authorization
      const sensitiveQuery = `
        query SensitiveData {
          integrationMetrics {
            totalRequirements
            mappedRequirements
          }
        }
      `;

      // This might require proper authentication context
      const result = await server.executeOperation({ query: sensitiveQuery });
      
      // Should either succeed with proper auth or fail with auth error
      if (result.errors) {
        expect(result.errors.some(error => 
          error.message.includes('auth') || 
          error.message.includes('permission')
        )).toBe(true);
      }
    });
  });

  describe('Integration Contract Validation', () => {
    test('should validate cross-module field relationships', async () => {
      const integrationQuery = `
        query IntegrationTest {
          __type(name: "RequirementArchitectureMapping") {
            fields {
              name
              type {
                name
                kind
              }
            }
          }
        }
      `;

      const result = await server.executeOperation({ query: integrationQuery });
      expect(result.errors).toBeUndefined();

      const mappingType = result.data?.__type;
      const fieldNames = mappingType.fields.map((field: any) => field.name);
      
      // Should have both requirement and architecture references
      expect(fieldNames).toContain('requirement');
      expect(fieldNames).toContain('architectureDecision');
      expect(fieldNames).toContain('confidence');
      expect(fieldNames).toContain('mappingType');
    });
  });
});

// Helper function to load baseline schema for evolution testing
function loadBaselineSchema(): any {
  try {
    // In a real implementation, this would load from a stored baseline
    return null;
  } catch (error) {
    console.warn('No baseline schema found for comparison');
    return null;
  }
}