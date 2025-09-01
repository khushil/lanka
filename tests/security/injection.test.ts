import { SecureQueryBuilder, InputValidator } from '../../src/utils/secure-query-builder';
import { Neo4jService } from '../../src/core/database/neo4j';

describe('Injection Protection Tests', () => {
  let neo4jService: Neo4jService;

  beforeAll(async () => {
    neo4jService = Neo4jService.getInstance();
  });

  afterAll(async () => {
    await neo4jService.close();
  });

  describe('SecureQueryBuilder', () => {
    describe('buildSecureUpdateQuery', () => {
      it('should prevent malicious node label injection', () => {
        expect(() => {
          SecureQueryBuilder.buildSecureUpdateQuery(
            'Requirement; DROP ALL CONSTRAINTS',
            'test-id',
            { title: 'Test' }
          );
        }).toThrow('Invalid node label');
      });

      it('should filter out invalid property names', () => {
        const { query, params } = SecureQueryBuilder.buildSecureUpdateQuery(
          'Requirement',
          'test-id',
          {
            title: 'Valid Title',
            maliciousProperty: 'DROP DATABASE',
            description: 'Valid Description'
          }
        );

        expect(query).not.toContain('maliciousProperty');
        expect(params).not.toHaveProperty('maliciousProperty');
        expect(params).toHaveProperty('title');
        expect(params).toHaveProperty('description');
      });

      it('should validate status values', () => {
        expect(() => {
          SecureQueryBuilder.buildSecureUpdateQuery(
            'Requirement',
            'test-id',
            { status: 'INVALID_STATUS; DROP TABLE users' }
          );
        }).toThrow('Invalid status value');
      });

      it('should validate priority values', () => {
        expect(() => {
          SecureQueryBuilder.buildSecureUpdateQuery(
            'Requirement',
            'test-id',
            { priority: 'SUPER_HIGH; MATCH (n) DETACH DELETE n' }
          );
        }).toThrow('Invalid priority value');
      });

      it('should build valid parameterized query for legitimate updates', () => {
        const { query, params } = SecureQueryBuilder.buildSecureUpdateQuery(
          'Requirement',
          'test-id',
          {
            title: 'Updated Title',
            description: 'Updated Description',
            status: 'APPROVED'
          }
        );

        expect(query).toContain('MATCH (n:Requirement {id: $nodeId})');
        expect(query).toContain('SET n.title = $title');
        expect(query).toContain('n.description = $description');
        expect(query).toContain('n.status = $status');
        expect(query).toContain('n.updatedAt = $updatedAt');
        
        expect(params).toEqual({
          nodeId: 'test-id',
          title: 'Updated Title',
          description: 'Updated Description',
          status: 'APPROVED',
          updatedAt: expect.any(String)
        });
      });
    });

    describe('buildSecureRelationshipQuery', () => {
      it('should prevent malicious relationship type injection', () => {
        expect(() => {
          SecureQueryBuilder.buildSecureRelationshipQuery(
            'Requirement',
            'source-id',
            'Requirement',
            'target-id',
            'MALICIOUS_REL; MATCH (n) DETACH DELETE n'
          );
        }).toThrow('Invalid relationship type');
      });

      it('should only allow whitelisted relationship types', () => {
        const validRelationship = 'DEPENDS_ON';
        const { query, params } = SecureQueryBuilder.buildSecureRelationshipQuery(
          'Requirement',
          'source-id',
          'Requirement',
          'target-id',
          validRelationship
        );

        expect(query).toContain(`[:${validRelationship}`);
        expect(params).toHaveProperty('sourceId', 'source-id');
        expect(params).toHaveProperty('targetId', 'target-id');
      });

      it('should validate node labels', () => {
        expect(() => {
          SecureQueryBuilder.buildSecureRelationshipQuery(
            'MALICIOUS_LABEL; DROP ALL CONSTRAINTS',
            'source-id',
            'Requirement',
            'target-id',
            'DEPENDS_ON'
          );
        }).toThrow('Invalid source node label');

        expect(() => {
          SecureQueryBuilder.buildSecureRelationshipQuery(
            'Requirement',
            'source-id',
            'MALICIOUS_LABEL; MATCH (n) DELETE n',
            'target-id',
            'DEPENDS_ON'
          );
        }).toThrow('Invalid target node label');
      });

      it('should sanitize relationship properties', () => {
        const { query, params } = SecureQueryBuilder.buildSecureRelationshipQuery(
          'Requirement',
          'source-id',
          'Requirement',
          'target-id',
          'DEPENDS_ON',
          {
            description: 'Valid description',
            maliciousProperty: 'DROP DATABASE',
            createdAt: '2024-01-01T00:00:00Z'
          }
        );

        expect(params).toHaveProperty('rel_description');
        expect(params).toHaveProperty('rel_createdAt');
        expect(params).not.toHaveProperty('rel_maliciousProperty');
      });
    });

    describe('buildAPOCRelationshipQuery', () => {
      it('should use APOC procedures safely', () => {
        const { query, params } = SecureQueryBuilder.buildAPOCRelationshipQuery(
          'source-id',
          'target-id',
          'DEPENDS_ON',
          { description: 'Test relationship' }
        );

        expect(query).toContain('CALL apoc.create.relationship');
        expect(query).not.toContain('${');
        expect(params).toHaveProperty('relationshipType', 'DEPENDS_ON');
        expect(params).toHaveProperty('sourceId', 'source-id');
        expect(params).toHaveProperty('targetId', 'target-id');
      });
    });

    describe('buildSecureFilterQuery', () => {
      it('should prevent injection in filter conditions', () => {
        const { query, params } = SecureQueryBuilder.buildSecureFilterQuery(
          'Requirement',
          {
            status: 'APPROVED',
            maliciousFilter: 'OR 1=1; DROP TABLE users'
          },
          10,
          0
        );

        expect(query).toContain('WHERE n.status = $status');
        expect(query).not.toContain('maliciousFilter');
        expect(params).toHaveProperty('status', 'APPROVED');
        expect(params).not.toHaveProperty('maliciousFilter');
      });

      it('should limit query results for security', () => {
        const { query, params } = SecureQueryBuilder.buildSecureFilterQuery(
          'Requirement',
          {},
          1000, // Request 1000 items
          0
        );

        expect(params.limit).toBe(100); // Should be capped at 100
      });
    });

    describe('buildSecureSearchQuery', () => {
      it('should sanitize search terms', () => {
        const { query, params } = SecureQueryBuilder.buildSecureSearchQuery(
          'Requirement',
          'test; DROP TABLE users',
          ['title', 'description'],
          10
        );

        expect(params.searchTerm).toBe('test  DROP TABLE users'); // Special chars removed
        expect(params.searchTerm).not.toContain(';');
      });

      it('should validate search fields', () => {
        const { query, params } = SecureQueryBuilder.buildSecureSearchQuery(
          'Requirement',
          'test search',
          ['title', 'maliciousField', 'description'], // Contains invalid field
          10
        );

        // Should still work but ignore invalid field
        expect(query).toContain('CALL db.index.fulltext.queryNodes');
      });
    });

    describe('validateAndSanitizeInput', () => {
      it('should sanitize string inputs', () => {
        const input = 'valid string; DROP TABLE users';
        const sanitized = SecureQueryBuilder.validateAndSanitizeInput(input);
        
        expect(sanitized).toBe('valid string  DROP TABLE users');
      });

      it('should limit string length', () => {
        const longString = 'a'.repeat(2000);
        const sanitized = SecureQueryBuilder.validateAndSanitizeInput(longString);
        
        expect(sanitized.length).toBe(1000);
      });

      it('should validate numeric inputs', () => {
        expect(() => {
          SecureQueryBuilder.validateAndSanitizeInput(Infinity);
        }).toThrow('Invalid numeric input');

        expect(() => {
          SecureQueryBuilder.validateAndSanitizeInput(NaN);
        }).toThrow('Invalid numeric input');

        expect(SecureQueryBuilder.validateAndSanitizeInput(42)).toBe(42);
      });

      it('should handle arrays safely', () => {
        const largeArray = Array(200).fill('item');
        const sanitized = SecureQueryBuilder.validateAndSanitizeInput(largeArray);
        
        expect(Array.isArray(sanitized)).toBe(true);
        expect(sanitized.length).toBe(100); // Should be limited
      });

      it('should handle objects safely', () => {
        const largeObject: Record<string, any> = {};
        for (let i = 0; i < 100; i++) {
          largeObject[`key${i}`] = `value${i}`;
        }
        
        const sanitized = SecureQueryBuilder.validateAndSanitizeInput(largeObject);
        
        expect(typeof sanitized).toBe('object');
        expect(Object.keys(sanitized).length).toBeLessThanOrEqual(50);
      });
    });
  });

  describe('InputValidator', () => {
    describe('validateGraphQLInput', () => {
      it('should validate required fields', () => {
        expect(() => {
          InputValidator.validateGraphQLInput(\n            {},\n            { name: { required: true, type: 'string' } }\n          );\n        }).toThrow('Required field missing: name');\n      });\n\n      it('should validate field types', () => {\n        expect(() => {\n          InputValidator.validateGraphQLInput(\n            { age: 'not-a-number' },\n            { age: { type: 'number' } }\n          );\n        }).toThrow('Invalid type for field age');\n      });\n\n      it('should validate string length constraints', () => {\n        expect(() => {\n          InputValidator.validateGraphQLInput(\n            { name: 'a'.repeat(300) },\n            { name: { type: 'string', maxLength: 255 } }\n          );\n        }).toThrow('exceeds maximum length');\n\n        expect(() => {\n          InputValidator.validateGraphQLInput(\n            { name: 'ab' },\n            { name: { type: 'string', minLength: 5 } }\n          );\n        }).toThrow('below minimum length');\n      });\n\n      it('should validate numeric ranges', () => {\n        expect(() => {\n          InputValidator.validateGraphQLInput(\n            { score: 150 },\n            { score: { type: 'number', max: 100 } }\n          );\n        }).toThrow('exceeds maximum value');\n\n        expect(() => {\n          InputValidator.validateGraphQLInput(\n            { score: -5 },\n            { score: { type: 'number', min: 0 } }\n          );\n        }).toThrow('below minimum value');\n      });\n\n      it('should validate array constraints', () => {\n        expect(() => {\n          InputValidator.validateGraphQLInput(\n            { tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'] },\n            { tags: { maxItems: 5, items: { type: 'string' } } }\n          );\n        }).toThrow('exceeds maximum array length');\n      });\n\n      it('should pass valid input', () => {\n        expect(() => {\n          InputValidator.validateGraphQLInput(\n            {\n              name: 'Valid Name',\n              age: 25,\n              tags: ['tag1', 'tag2']\n            },\n            {\n              name: { required: true, type: 'string', maxLength: 100 },\n              age: { type: 'number', min: 0, max: 120 },\n              tags: { maxItems: 10, items: { type: 'string' } }\n            }\n          );\n        }).not.toThrow();\n      });\n    });\n  });\n\n  describe('Integration Tests', () => {\n    it('should prevent SQL injection in real database queries', async () => {\n      const maliciousInput = {\n        title: \"'; DROP TABLE requirements; --\",\n        description: 'UNION SELECT * FROM users',\n        status: 'APPROVED; DELETE FROM projects'\n      };\n\n      expect(() => {\n        SecureQueryBuilder.buildSecureUpdateQuery(\n          'Requirement',\n          'test-id',\n          maliciousInput\n        );\n      }).toThrow(); // Should throw due to invalid status\n    });\n\n    it('should handle legitimate complex updates safely', async () => {\n      const legitimateInput = {\n        title: 'System Performance Requirements',\n        description: 'The system should handle 10,000+ concurrent users with <2s response time',\n        status: 'APPROVED',\n        priority: 'HIGH'\n      };\n\n      const { query, params } = SecureQueryBuilder.buildSecureUpdateQuery(\n        'Requirement',\n        'req-123',\n        legitimateInput\n      );\n\n      // Verify the query is properly parameterized\n      expect(query).not.toContain(legitimateInput.title);\n      expect(query).not.toContain(legitimateInput.description);\n      expect(params).toHaveProperty('title', legitimateInput.title);\n      expect(params).toHaveProperty('description', legitimateInput.description);\n    });\n  });\n});\n"
  