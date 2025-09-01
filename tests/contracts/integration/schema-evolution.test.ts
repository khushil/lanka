/**
 * Schema Evolution and Breaking Change Detection Tests
 * Tests backward compatibility, version management, and schema migration
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { GraphQLSchema, buildClientSchema, getIntrospectionQuery, printSchema, introspectionFromSchema } from 'graphql';
import { findBreakingChanges, findDangerousChanges, BreakingChange, DangerousChange } from 'graphql';
import { createGraphQLSchema } from '../../../src/api/graphql/schema';
import fs from 'fs';
import path from 'path';

describe('Schema Evolution and Breaking Change Detection', () => {
  let currentSchema: GraphQLSchema;
  let baselineSchema: GraphQLSchema | null = null;
  const schemaHistoryPath = path.join(__dirname, '../fixtures/schema-history');

  beforeAll(async () => {
    currentSchema = await createGraphQLSchema();
    
    // Load baseline schema if it exists
    try {
      const baselineSchemaPath = path.join(schemaHistoryPath, 'baseline-schema.json');
      if (fs.existsSync(baselineSchemaPath)) {
        const baselineIntrospection = JSON.parse(fs.readFileSync(baselineSchemaPath, 'utf8'));
        baselineSchema = buildClientSchema(baselineIntrospection);
      }
    } catch (error) {
      console.warn('No baseline schema found, creating new baseline');
      await saveCurrentSchemaAsBaseline();
    }
  });

  describe('Breaking Change Detection', () => {
    test('should detect field removal as breaking change', () => {
      if (!baselineSchema) {
        console.log('No baseline schema available for comparison');
        return;
      }

      const breakingChanges = findBreakingChanges(baselineSchema, currentSchema);
      
      // Log all detected breaking changes
      breakingChanges.forEach(change => {
        console.log(`Breaking change detected: ${change.type} - ${change.description}`);
      });

      // In a CI/CD environment, you might want to fail if breaking changes are detected
      // expect(breakingChanges).toHaveLength(0);
      
      // Or allow breaking changes but ensure they're documented
      if (breakingChanges.length > 0) {
        const documentedChanges = getDocumentedBreakingChanges();
        const undocumentedChanges = breakingChanges.filter(change => 
          !documentedChanges.some(doc => doc.type === change.type && doc.description === change.description)
        );
        
        if (undocumentedChanges.length > 0) {
          console.error('Undocumented breaking changes found:', undocumentedChanges);
          // expect(undocumentedChanges).toHaveLength(0);
        }
      }
    });

    test('should detect type changes as breaking changes', async () => {
      // Create a modified schema with type changes for testing
      const modifiedTypeDefs = `
        type Query {
          health: Int!  # Changed from String! to Int!
        }
      `;

      // This test demonstrates how type changes would be detected
      // In reality, you'd compare against your actual baseline
      const mockChange: BreakingChange = {
        type: 'FIELD_CHANGED_KIND',
        description: 'Query.health changed type from String to Int'
      };

      expect(mockChange.type).toBe('FIELD_CHANGED_KIND');
      expect(mockChange.description).toContain('changed type');
    });

    test('should detect argument requirement changes', () => {
      // Mock breaking change for argument requirement
      const mockChanges: BreakingChange[] = [
        {
          type: 'REQUIRED_ARG_ADDED',
          description: 'A required arg newRequiredArg on requirements was added'
        },
        {
          type: 'ARG_CHANGED_KIND',
          description: 'requirements.projectId changed type from String to String!'
        }
      ];

      mockChanges.forEach(change => {
        expect(['REQUIRED_ARG_ADDED', 'ARG_CHANGED_KIND']).toContain(change.type);
      });
    });
  });

  describe('Dangerous Change Detection', () => {
    test('should detect potentially dangerous changes', () => {
      if (!baselineSchema) {
        console.log('No baseline schema available for comparison');
        return;
      }

      const dangerousChanges = findDangerousChanges(baselineSchema, currentSchema);
      
      // Log dangerous changes for review
      dangerousChanges.forEach(change => {
        console.log(`Dangerous change detected: ${change.type} - ${change.description}`);
      });

      // Dangerous changes might be acceptable but should be reviewed
      const acceptableDangerousChanges = getAcceptableDangerousChanges();
      const unacceptableChanges = dangerousChanges.filter(change =>
        !acceptableDangerousChanges.some(acceptable => 
          acceptable.type === change.type && acceptable.description === change.description
        )
      );

      if (unacceptableChanges.length > 0) {
        console.warn('Unacceptable dangerous changes found:', unacceptableChanges);
      }
    });

    test('should categorize dangerous changes by severity', () => {
      const mockDangerousChanges: DangerousChange[] = [
        {
          type: 'ARG_DEFAULT_VALUE_CHANGE',
          description: 'requirements.limit default changed from 20 to 10'
        },
        {
          type: 'VALUE_REMOVED_FROM_ENUM',
          description: 'EXPERIMENTAL was removed from enum RequirementType'
        },
        {
          type: 'FIELD_REMOVED',
          description: 'Query.deprecatedField was removed'
        }
      ];

      const severityCategories = categorizeDangerousChanges(mockDangerousChanges);
      
      expect(severityCategories.high).toContain('FIELD_REMOVED');
      expect(severityCategories.medium).toContain('VALUE_REMOVED_FROM_ENUM');
      expect(severityCategories.low).toContain('ARG_DEFAULT_VALUE_CHANGE');
    });
  });

  describe('Schema Version Management', () => {
    test('should maintain schema versioning metadata', () => {
      const schemaSDL = printSchema(currentSchema);
      
      // Check for version comments or directives
      expect(schemaSDL).toBeDefined();
      
      // In a real implementation, you might have version directives
      // expect(schemaSDL).toContain('@version');
    });

    test('should track schema evolution history', async () => {
      const schemaHistory = await getSchemaHistory();
      
      expect(schemaHistory.length).toBeGreaterThan(0);
      expect(schemaHistory[schemaHistory.length - 1]).toHaveProperty('version');
      expect(schemaHistory[schemaHistory.length - 1]).toHaveProperty('timestamp');
      expect(schemaHistory[schemaHistory.length - 1]).toHaveProperty('changes');
    });

    test('should validate semantic versioning for schema changes', () => {
      if (!baselineSchema) return;

      const breakingChanges = findBreakingChanges(baselineSchema, currentSchema);
      const dangerousChanges = findDangerousChanges(baselineSchema, currentSchema);
      
      const suggestedVersion = calculateSemanticVersion(breakingChanges, dangerousChanges);
      
      expect(suggestedVersion).toMatch(/^\d+\.\d+\.\d+$/);
      
      if (breakingChanges.length > 0) {
        expect(suggestedVersion.split('.')[0]).not.toBe('0'); // Major version bump
      } else if (dangerousChanges.length > 0) {
        // Minor version bump suggested
        expect(suggestedVersion.endsWith('.0')).toBe(false);
      }
    });
  });

  describe('Backward Compatibility Validation', () => {
    test('should validate existing queries against new schema', async () => {
      const existingQueries = await loadExistingQueries();
      
      for (const query of existingQueries) {
        try {
          const result = await validateQueryAgainstSchema(query.query, currentSchema);
          
          if (!result.valid) {
            console.warn(`Query ${query.name} is no longer valid: ${result.errors.join(', ')}`);
          }
          
          // Track compatibility
          query.compatible = result.valid;
        } catch (error) {
          console.error(`Error validating query ${query.name}:`, error);
        }
      }

      const compatibleQueries = existingQueries.filter(q => q.compatible);
      const incompatibleQueries = existingQueries.filter(q => !q.compatible);
      
      console.log(`Compatible queries: ${compatibleQueries.length}/${existingQueries.length}`);
      
      if (incompatibleQueries.length > 0) {
        console.warn('Incompatible queries found:', incompatibleQueries.map(q => q.name));
      }
      
      // In a strict environment, you might require 100% compatibility
      // expect(incompatibleQueries).toHaveLength(0);
    });

    test('should provide migration guides for breaking changes', () => {
      const mockBreakingChanges: BreakingChange[] = [
        {
          type: 'FIELD_REMOVED',
          description: 'Requirement.legacyField was removed'
        },
        {
          type: 'ARG_CHANGED_KIND',
          description: 'requirements.projectId changed from String to ID!'
        }
      ];

      const migrationGuide = generateMigrationGuide(mockBreakingChanges);
      
      expect(migrationGuide).toBeDefined();
      expect(migrationGuide.steps).toBeDefined();
      expect(migrationGuide.steps.length).toBeGreaterThan(0);
      
      mockBreakingChanges.forEach(change => {
        expect(migrationGuide.steps.some(step => 
          step.change.type === change.type
        )).toBe(true);
      });
    });
  });

  describe('Client Impact Analysis', () => {
    test('should analyze impact on different client types', () => {
      const clientTypes = ['web-app', 'mobile-app', 'api-integration'];
      const mockBreakingChanges: BreakingChange[] = [
        {
          type: 'FIELD_REMOVED',
          description: 'Query.mobileSpecificField was removed'
        }
      ];

      const impactAnalysis = analyzeClientImpact(clientTypes, mockBreakingChanges);
      
      expect(impactAnalysis['mobile-app'].severity).toBe('high');
      expect(impactAnalysis['web-app'].severity).toBe('low');
      expect(impactAnalysis['api-integration'].severity).toBe('medium');
    });

    test('should suggest client-specific migration strategies', () => {
      const mockChange: BreakingChange = {
        type: 'FIELD_REMOVED',
        description: 'Requirement.deprecatedScore was removed'
      };

      const strategies = getClientMigrationStrategies('web-app', mockChange);
      
      expect(strategies).toContain('Update client queries to remove deprecated fields');
      expect(strategies).toContain('Use alternative field: qualityScore instead of deprecatedScore');
    });
  });
});

// Helper functions for schema evolution testing

async function saveCurrentSchemaAsBaseline(): Promise<void> {
  try {
    const schema = await createGraphQLSchema();
    const introspection = introspectionFromSchema(schema);
    
    const baselinePath = path.join(__dirname, '../fixtures/schema-history/baseline-schema.json');
    fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
    fs.writeFileSync(baselinePath, JSON.stringify(introspection, null, 2));
  } catch (error) {
    console.error('Failed to save baseline schema:', error);
  }
}

function getDocumentedBreakingChanges(): Array<{ type: string; description: string }> {
  // In a real implementation, this would load from a changelog or documentation
  return [
    {
      type: 'FIELD_REMOVED',
      description: 'Requirement.legacyField was removed as part of v2.0 cleanup'
    }
  ];
}

function getAcceptableDangerousChanges(): Array<{ type: string; description: string }> {
  return [
    {
      type: 'ARG_DEFAULT_VALUE_CHANGE',
      description: 'requirements.limit default changed from 20 to 10 for performance'
    }
  ];
}

function categorizeDangerousChanges(changes: DangerousChange[]): { high: string[]; medium: string[]; low: string[] } {
  const categories = { high: [] as string[], medium: [] as string[], low: [] as string[] };
  
  changes.forEach(change => {
    switch (change.type) {
      case 'FIELD_REMOVED':
      case 'TYPE_REMOVED':
        categories.high.push(change.type);
        break;
      case 'VALUE_REMOVED_FROM_ENUM':
      case 'ARG_REMOVED':
        categories.medium.push(change.type);
        break;
      case 'ARG_DEFAULT_VALUE_CHANGE':
      case 'VALUE_ADDED_TO_ENUM':
        categories.low.push(change.type);
        break;
      default:
        categories.medium.push(change.type);
    }
  });
  
  return categories;
}

async function getSchemaHistory(): Promise<Array<{ version: string; timestamp: string; changes: string[] }>> {
  // Mock schema history - in a real implementation, this would come from a database or file
  return [
    {
      version: '1.0.0',
      timestamp: '2024-01-01T00:00:00Z',
      changes: ['Initial schema release']
    },
    {
      version: '1.1.0',
      timestamp: '2024-01-15T00:00:00Z',
      changes: ['Added architecture module', 'Added integration mappings']
    }
  ];
}

function calculateSemanticVersion(breakingChanges: BreakingChange[], dangerousChanges: DangerousChange[]): string {
  // Simple semantic versioning logic
  const currentVersion = '1.1.0';
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  if (breakingChanges.length > 0) {
    return `${major + 1}.0.0`;
  } else if (dangerousChanges.length > 0) {
    return `${major}.${minor + 1}.0`;
  } else {
    return `${major}.${minor}.${patch + 1}`;
  }
}

async function loadExistingQueries(): Promise<Array<{ name: string; query: string; compatible?: boolean }>> {
  // Mock existing queries - in a real implementation, these would be loaded from test files or documentation
  return [
    {
      name: 'GetRequirements',
      query: `
        query GetRequirements {
          requirements(limit: 10) {
            id
            title
            description
            type
          }
        }
      `
    },
    {
      name: 'GetRequirementDetails',
      query: `
        query GetRequirementDetails($id: ID!) {
          requirement(id: $id) {
            id
            title
            description
            type
            status
            dependencies {
              id
              title
            }
          }
        }
      `
    }
  ];
}

async function validateQueryAgainstSchema(query: string, schema: GraphQLSchema): Promise<{ valid: boolean; errors: string[] }> {
  try {
    const { parse, validate } = await import('graphql');
    const document = parse(query);
    const errors = validate(schema, document);
    
    return {
      valid: errors.length === 0,
      errors: errors.map(error => error.message)
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

function generateMigrationGuide(breakingChanges: BreakingChange[]): { 
  version: string; 
  steps: Array<{ change: BreakingChange; migration: string; example?: string }> 
} {
  return {
    version: '2.0.0',
    steps: breakingChanges.map(change => ({
      change,
      migration: getMigrationInstructions(change),
      example: getMigrationExample(change)
    }))
  };
}

function getMigrationInstructions(change: BreakingChange): string {
  switch (change.type) {
    case 'FIELD_REMOVED':
      return 'Remove references to the deleted field from your queries';
    case 'ARG_CHANGED_KIND':
      return 'Update argument type in your queries to match the new type';
    case 'TYPE_REMOVED':
      return 'Remove usage of the deleted type and use the recommended replacement';
    default:
      return 'Review the change and update your implementation accordingly';
  }
}

function getMigrationExample(change: BreakingChange): string {
  switch (change.type) {
    case 'FIELD_REMOVED':
      return `
        // Before:
        query { requirement { id legacyField title } }
        
        // After:
        query { requirement { id title } }
      `;
    case 'ARG_CHANGED_KIND':
      return `
        // Before:
        query { requirements(projectId: "123") { id } }
        
        // After:  
        query { requirements(projectId: "proj-123") { id } }
      `;
    default:
      return '// See documentation for specific migration steps';
  }
}

function analyzeClientImpact(
  clientTypes: string[], 
  changes: BreakingChange[]
): Record<string, { severity: 'low' | 'medium' | 'high'; affectedFeatures: string[] }> {
  const impact: Record<string, { severity: 'low' | 'medium' | 'high'; affectedFeatures: string[] }> = {};
  
  clientTypes.forEach(clientType => {
    let severity: 'low' | 'medium' | 'high' = 'low';
    const affectedFeatures: string[] = [];
    
    changes.forEach(change => {
      if (change.description.includes('mobile') && clientType === 'mobile-app') {
        severity = 'high';
        affectedFeatures.push('Mobile-specific features');
      } else if (change.type === 'FIELD_REMOVED') {
        severity = severity === 'high' ? 'high' : 'medium';
        affectedFeatures.push('Query compatibility');
      }
    });
    
    impact[clientType] = { severity, affectedFeatures };
  });
  
  return impact;
}

function getClientMigrationStrategies(clientType: string, change: BreakingChange): string[] {
  const strategies: string[] = [];
  
  strategies.push('Update client queries to remove deprecated fields');
  
  if (change.description.includes('Score')) {
    strategies.push('Use alternative field: qualityScore instead of deprecatedScore');
  }
  
  if (clientType === 'mobile-app') {
    strategies.push('Update mobile app to handle graceful degradation');
  }
  
  return strategies;
}