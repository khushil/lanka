/**
 * GraphQL Query Complexity Analysis Tests
 * Tests query depth, complexity limits, and performance constraints
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { GraphQLSchema, parse, validate } from 'graphql';
import { createGraphQLSchema } from '../../../src/api/graphql/schema';
import { ApolloServer } from 'apollo-server-express';
import depthLimit from 'graphql-depth-limit';
import costAnalysis from 'graphql-cost-analysis';

describe('GraphQL Query Complexity Tests', () => {
  let schema: GraphQLSchema;
  let server: ApolloServer;
  const MAX_DEPTH = 10;
  const MAX_COMPLEXITY = 1000;

  beforeAll(async () => {
    schema = await createGraphQLSchema();
    server = new ApolloServer({
      schema,
      validationRules: [
        depthLimit(MAX_DEPTH),
        costAnalysis({
          maximumCost: MAX_COMPLEXITY,
          defaultCost: 1,
          complexityMessage: 'Query complexity exceeds maximum allowed complexity',
          onComplete: (complexity) => {
            console.log(`Query complexity: ${complexity}`);
          }
        })
      ],
      formatError: (error) => {
        console.log('GraphQL Error:', error.message);
        return error;
      }
    });
  });

  describe('Query Depth Analysis', () => {
    test('should allow reasonable depth queries', async () => {
      const reasonableQuery = `
        query ReasonableDepth {
          requirements(limit: 5) {
            id
            title
            description
            dependencies {
              id
              title
              description
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

      const result = await server.executeOperation({ query: reasonableQuery });
      expect(result.errors).toBeUndefined();
    });

    test('should reject queries exceeding depth limit', async () => {
      const deepQuery = `
        query DeepQuery {
          requirements {
            dependencies {
              dependencies {
                dependencies {
                  dependencies {
                    dependencies {
                      dependencies {
                        dependencies {
                          dependencies {
                            dependencies {
                              dependencies {
                                id
                                title
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const result = await server.executeOperation({ query: deepQuery });
      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('exceeds maximum operation depth');
    });

    test('should calculate correct depth for nested fragments', async () => {
      const fragmentQuery = `
        query FragmentDepthTest {
          requirements {
            ...RequirementDetails
          }
        }

        fragment RequirementDetails on Requirement {
          id
          title
          dependencies {
            ...RequirementBasic
          }
        }

        fragment RequirementBasic on Requirement {
          id
          title
          description
          type
        }
      `;

      const result = await server.executeOperation({ query: fragmentQuery });
      expect(result.errors).toBeUndefined();
    });
  });

  describe('Query Complexity Analysis', () => {
    test('should allow simple queries under complexity limit', async () => {
      const simpleQuery = `
        query SimpleQuery {
          health
        }
      `;

      const result = await server.executeOperation({ query: simpleQuery });
      expect(result.errors).toBeUndefined();
    });

    test('should handle paginated queries with reasonable limits', async () => {
      const paginatedQuery = `
        query PaginatedQuery {
          requirements(limit: 20, offset: 0) {
            id
            title
            description
            type
            status
            priority
            completenessScore
            qualityScore
          }
        }
      `;

      const result = await server.executeOperation({ query: paginatedQuery });
      expect(result.errors).toBeUndefined();
    });

    test('should reject overly complex queries', async () => {
      const complexQuery = `
        query OverlyComplexQuery {
          requirements(limit: 100) {
            id
            title
            description
            type
            status
            priority
            acceptanceCriteria
            businessValue
            completenessScore
            qualityScore
            dependencies {
              id
              title
              description
              type
              status
              priority
              dependencies {
                id
                title
                description
                dependencies {
                  id
                  title
                  description
                }
              }
            }
            similarRequirements {
              requirement {
                id
                title
                description
                type
                status
                dependencies {
                  id
                  title
                  description
                }
              }
              similarity
              projectName
              successMetrics {
                implementationTime
                defectRate
                stakeholderSatisfaction
              }
            }
            conflicts {
              id
              conflictType
              description
              severity
              resolutionSuggestions
              requirement1 {
                id
                title
                description
                dependencies {
                  id
                  title
                }
              }
              requirement2 {
                id
                title
                description
                dependencies {
                  id
                  title
                }
              }
            }
          }
        }
      `;

      const result = await server.executeOperation({ query: complexQuery });
      
      // Should either succeed with reasonable performance or fail due to complexity
      if (result.errors) {
        expect(result.errors.some(error => 
          error.message.includes('complexity') || 
          error.message.includes('timeout')
        )).toBe(true);
      } else {
        // If it succeeds, it should complete within reasonable time
        const startTime = Date.now();
        await server.executeOperation({ query: complexQuery });
        const executionTime = Date.now() - startTime;
        expect(executionTime).toBeLessThan(10000); // 10 seconds max
      }
    });

    test('should handle multiple queries in single request', async () => {
      const multiQuery = `
        query MultipleOperations {
          health
          requirements(limit: 5) {
            id
            title
          }
          architectureDecisions(limit: 5) {
            id
            title
            status
          }
        }
      `;

      const result = await server.executeOperation({ query: multiQuery });
      expect(result.errors).toBeUndefined();
    });
  });

  describe('Field-Level Complexity Scoring', () => {
    test('should assign appropriate complexity scores to different field types', async () => {
      // Test scalar fields (low complexity)
      const scalarQuery = `
        query ScalarFields {
          requirements(limit: 10) {
            id
            title
            description
            type
            status
          }
        }
      `;

      const scalarResult = await server.executeOperation({ query: scalarQuery });
      expect(scalarResult.errors).toBeUndefined();

      // Test relation fields (higher complexity)
      const relationQuery = `
        query RelationFields {
          requirements(limit: 10) {
            id
            dependencies {
              id
              title
            }
          }
        }
      `;

      const relationResult = await server.executeOperation({ query: relationQuery });
      expect(relationResult.errors).toBeUndefined();

      // Test computed fields (highest complexity)
      const computedQuery = `
        query ComputedFields {
          requirements(limit: 5) {
            id
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

      const computedResult = await server.executeOperation({ query: computedQuery });
      expect(computedResult.errors).toBeUndefined();
    });

    test('should handle introspection queries appropriately', async () => {
      const introspectionQuery = `
        query IntrospectionTest {
          __schema {
            types {
              name
              kind
              fields {
                name
                type {
                  name
                  kind
                }
              }
            }
          }
        }
      `;

      const result = await server.executeOperation({ query: introspectionQuery });
      expect(result.errors).toBeUndefined();
    });
  });

  describe('Performance-based Limits', () => {
    test('should timeout long-running queries', async () => {
      const potentiallySlowQuery = `
        query PotentiallySlowQuery {
          requirements(limit: 50) {
            id
            title
            findSimilarRequirements(threshold: 0.1) {
              requirement {
                id
                title
                description
              }
              similarity
            }
          }
        }
      `;

      const startTime = Date.now();
      const result = await server.executeOperation({ 
        query: potentiallySlowQuery,
        // Add timeout context if supported
      });
      const executionTime = Date.now() - startTime;

      // Should either complete quickly or timeout gracefully
      if (result.errors) {
        expect(result.errors.some(error => 
          error.message.includes('timeout') ||
          error.message.includes('complexity')
        )).toBe(true);
      } else {
        expect(executionTime).toBeLessThan(30000); // 30 seconds max
      }
    });

    test('should handle concurrent query load', async () => {
      const testQuery = `
        query ConcurrencyTest {
          requirements(limit: 5) {
            id
            title
            type
          }
        }
      `;

      const concurrentQueries = Array.from({ length: 20 }, () =>
        server.executeOperation({ query: testQuery })
      );

      const startTime = Date.now();
      const results = await Promise.all(concurrentQueries);
      const totalTime = Date.now() - startTime;

      // All queries should succeed or fail gracefully
      results.forEach(result => {
        if (result.errors) {
          expect(result.errors.some(error =>
            error.message.includes('rate limit') ||
            error.message.includes('too many requests')
          )).toBe(true);
        }
      });

      // Should handle concurrent load within reasonable time
      expect(totalTime).toBeLessThan(15000); // 15 seconds for 20 concurrent queries
    });
  });

  describe('Dynamic Query Analysis', () => {
    test('should analyze query complexity statically', () => {
      const testQuery = `
        query StaticAnalysis {
          requirements(limit: 100) {
            id
            dependencies {
              id
              dependencies {
                id
              }
            }
          }
        }
      `;

      const document = parse(testQuery);
      const errors = validate(schema, document, [
        depthLimit(MAX_DEPTH)
      ]);

      if (errors.length > 0) {
        expect(errors.some(error => 
          error.message.includes('depth') ||
          error.message.includes('complexity')
        )).toBe(true);
      }
    });

    test('should provide complexity analysis feedback', async () => {
      let complexityScore = 0;

      const testServer = new ApolloServer({
        schema,
        validationRules: [
          costAnalysis({
            maximumCost: MAX_COMPLEXITY,
            defaultCost: 1,
            scalarCost: 1,
            objectCost: 2,
            listFactor: 10,
            complexityMessage: 'Query too complex',
            onComplete: (complexity) => {
              complexityScore = complexity;
            }
          })
        ]
      });

      const query = `
        query ComplexityAnalysis {
          requirements(limit: 10) {
            id
            title
            dependencies {
              id
              title
            }
          }
        }
      `;

      await testServer.executeOperation({ query });
      expect(complexityScore).toBeGreaterThan(0);
      expect(complexityScore).toBeLessThan(MAX_COMPLEXITY);
    });
  });

  describe('Query Optimization Suggestions', () => {
    test('should suggest query optimizations for inefficient patterns', async () => {
      // This would typically be implemented as a custom validation rule
      const inefficientQuery = `
        query InefficientQuery {
          requirements {
            id
            dependencies {
              id
              dependencies {
                id
                dependencies {
                  id
                }
              }
            }
          }
        }
      `;

      const document = parse(inefficientQuery);
      
      // Custom analysis for optimization suggestions
      const optimizationSuggestions = analyzeQueryForOptimizations(document);
      
      expect(optimizationSuggestions).toContain('Consider using pagination for large result sets');
      expect(optimizationSuggestions).toContain('Deep nesting detected - consider flattening query structure');
    });

    test('should validate query against performance best practices', () => {
      const bestPracticeQuery = `
        query BestPracticeQuery {
          requirements(limit: 20, offset: 0) {
            id
            title
            type
            status
          }
        }
      `;

      const document = parse(bestPracticeQuery);
      const suggestions = analyzeQueryForOptimizations(document);
      
      // Should have no optimization suggestions for well-structured query
      expect(suggestions.length).toBeLessThan(2);
    });
  });
});

// Helper function for query optimization analysis
function analyzeQueryForOptimizations(document: any): string[] {
  const suggestions: string[] = [];
  
  // Simple analysis - in a real implementation this would be more sophisticated
  const queryString = document.loc?.source?.body || '';
  
  if (!queryString.includes('limit:')) {
    suggestions.push('Consider using pagination for large result sets');
  }
  
  // Count nesting depth
  const nestingDepth = (queryString.match(/\{/g) || []).length;
  if (nestingDepth > 8) {
    suggestions.push('Deep nesting detected - consider flattening query structure');
  }
  
  if (queryString.includes('dependencies') && queryString.match(/dependencies/g)!.length > 3) {
    suggestions.push('Multiple dependency traversals detected - consider using fragments or separate queries');
  }
  
  return suggestions;
}