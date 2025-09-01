import { SecureQueryBuilder, InputValidator } from '../../../src/utils/secure-query-builder';

jest.mock('../../../src/core/logging/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('SecureQueryBuilder', () => {
  describe('buildSecureUpdateQuery', () => {
    it('should build secure update query with valid inputs', () => {
      // Arrange
      const nodeLabel = 'Requirement';
      const nodeId = 'req-123';
      const updateFields = {
        title: 'Updated Title',
        description: 'Updated description',
        status: 'APPROVED'
      };

      // Act
      const result = SecureQueryBuilder.buildSecureUpdateQuery(nodeLabel, nodeId, updateFields);

      // Assert
      expect(result.query).toContain('MATCH (n:Requirement {id: $nodeId})');
      expect(result.query).toContain('SET n.title = $title');
      expect(result.query).toContain('SET n.description = $description');
      expect(result.query).toContain('SET n.status = $status');
      expect(result.query).toContain('SET n.updatedAt = $updatedAt');
      expect(result.query).toContain('RETURN n');

      expect(result.params).toMatchObject({
        nodeId: 'req-123',
        title: 'Updated Title',
        description: 'Updated description',
        status: 'APPROVED',
        updatedAt: expect.any(String)
      });
    });

    it('should reject invalid node labels', () => {
      // Arrange
      const invalidLabel = 'InvalidNode';
      const nodeId = 'test-id';
      const updateFields = { title: 'Test' };

      // Act & Assert
      expect(() => {
        SecureQueryBuilder.buildSecureUpdateQuery(invalidLabel, nodeId, updateFields);
      }).toThrow('Invalid node label: InvalidNode');
    });

    it('should filter out invalid properties', () => {
      // Arrange
      const nodeLabel = 'Requirement';
      const nodeId = 'req-123';
      const updateFields = {
        title: 'Valid Title',
        maliciousProperty: 'DROP DATABASE',
        invalidField: 'should be filtered'
      };

      // Act
      const result = SecureQueryBuilder.buildSecureUpdateQuery(nodeLabel, nodeId, updateFields);

      // Assert
      expect(result.query).toContain('n.title = $title');
      expect(result.query).not.toContain('maliciousProperty');
      expect(result.query).not.toContain('invalidField');
      expect(result.params).toHaveProperty('title');
      expect(result.params).not.toHaveProperty('maliciousProperty');
      expect(result.params).not.toHaveProperty('invalidField');
    });

    it('should validate status values', () => {
      // Arrange
      const nodeLabel = 'Requirement';
      const nodeId = 'req-123';
      const invalidStatusFields = { status: 'MALICIOUS_STATUS' };

      // Act & Assert
      expect(() => {
        SecureQueryBuilder.buildSecureUpdateQuery(nodeLabel, nodeId, invalidStatusFields);
      }).toThrow('Invalid status value: MALICIOUS_STATUS');
    });

    it('should validate priority values', () => {
      // Arrange
      const nodeLabel = 'Requirement';
      const nodeId = 'req-123';
      const invalidPriorityFields = { priority: 'INVALID_PRIORITY' };

      // Act & Assert
      expect(() => {
        SecureQueryBuilder.buildSecureUpdateQuery(nodeLabel, nodeId, invalidPriorityFields);
      }).toThrow('Invalid priority value: INVALID_PRIORITY');
    });

    it('should reject updates with no valid fields', () => {
      // Arrange
      const nodeLabel = 'Requirement';
      const nodeId = 'req-123';
      const invalidFields = { 
        maliciousField1: 'value1',
        maliciousField2: 'value2'
      };

      // Act & Assert
      expect(() => {
        SecureQueryBuilder.buildSecureUpdateQuery(nodeLabel, nodeId, invalidFields);
      }).toThrow('No valid fields to update');
    });

    it('should always add updatedAt timestamp', () => {
      // Arrange
      const nodeLabel = 'Requirement';
      const nodeId = 'req-123';
      const updateFields = { title: 'Test' };

      // Act
      const result = SecureQueryBuilder.buildSecureUpdateQuery(nodeLabel, nodeId, updateFields);

      // Assert
      expect(result.query).toContain('n.updatedAt = $updatedAt');
      expect(result.params).toHaveProperty('updatedAt');
      expect(new Date(result.params.updatedAt)).toBeInstanceOf(Date);
    });
  });

  describe('buildSecureRelationshipQuery', () => {
    it('should build secure relationship creation query', () => {
      // Arrange
      const sourceLabel = 'Requirement';
      const sourceId = 'req-123';
      const targetLabel = 'Project';
      const targetId = 'proj-456';
      const relationshipType = 'DEPENDS_ON';
      const properties = { 
        createdAt: '2023-01-01',
        version: 1
      };

      // Act
      const result = SecureQueryBuilder.buildSecureRelationshipQuery(
        sourceLabel,
        sourceId,
        targetLabel,
        targetId,
        relationshipType,
        properties
      );

      // Assert
      expect(result.query).toContain('MATCH (source:Requirement {id: $sourceId})');
      expect(result.query).toContain('MATCH (target:Project {id: $targetId})');
      expect(result.query).toContain('CREATE (source)-[:DEPENDS_ON {createdAt: $rel_createdAt, version: $rel_version}]->(target)');
      expect(result.query).toContain('RETURN source, target');

      expect(result.params).toMatchObject({
        sourceId: 'req-123',
        targetId: 'proj-456',
        rel_createdAt: '2023-01-01',
        rel_version: 1
      });
    });

    it('should reject invalid relationship types', () => {
      // Act & Assert
      expect(() => {
        SecureQueryBuilder.buildSecureRelationshipQuery(
          'Requirement',
          'req-123',
          'Project',
          'proj-456',
          'MALICIOUS_REL',
          {}
        );
      }).toThrow('Invalid relationship type: MALICIOUS_REL');
    });

    it('should reject invalid source node labels', () => {
      // Act & Assert
      expect(() => {
        SecureQueryBuilder.buildSecureRelationshipQuery(
          'InvalidLabel',
          'req-123',
          'Project',
          'proj-456',
          'DEPENDS_ON',
          {}
        );
      }).toThrow('Invalid source node label: InvalidLabel');
    });

    it('should reject invalid target node labels', () => {
      // Act & Assert
      expect(() => {
        SecureQueryBuilder.buildSecureRelationshipQuery(
          'Requirement',
          'req-123',
          'InvalidLabel',
          'proj-456',
          'DEPENDS_ON',
          {}
        );
      }).toThrow('Invalid target node label: InvalidLabel');
    });

    it('should handle relationships without properties', () => {
      // Act
      const result = SecureQueryBuilder.buildSecureRelationshipQuery(
        'Requirement',
        'req-123',
        'Project',
        'proj-456',
        'DEPENDS_ON'
      );

      // Assert
      expect(result.query).toContain('CREATE (source)-[:DEPENDS_ON ]->(target)');
      expect(result.params).toEqual({
        sourceId: 'req-123',
        targetId: 'proj-456'
      });
    });

    it('should filter out invalid relationship properties', () => {
      // Arrange
      const properties = {
        createdAt: '2023-01-01', // Valid
        maliciousProperty: 'DROP TABLE', // Invalid
        validProperty: 'valid value' // Invalid (not in allowed list)
      };

      // Act
      const result = SecureQueryBuilder.buildSecureRelationshipQuery(
        'Requirement',
        'req-123',
        'Project',
        'proj-456',
        'DEPENDS_ON',
        properties
      );

      // Assert
      expect(result.query).toContain('createdAt: $rel_createdAt');
      expect(result.query).not.toContain('maliciousProperty');
      expect(result.query).not.toContain('validProperty');
      expect(result.params).toHaveProperty('rel_createdAt');
      expect(result.params).not.toHaveProperty('rel_maliciousProperty');
    });
  });

  describe('buildSecureFilterQuery', () => {
    it('should build secure filter query with valid filters', () => {
      // Arrange
      const nodeLabel = 'Requirement';
      const filters = {
        status: 'APPROVED',
        priority: 'HIGH',
        type: 'FUNCTIONAL'
      };
      const limit = 10;
      const offset = 5;

      // Act
      const result = SecureQueryBuilder.buildSecureFilterQuery(nodeLabel, filters, limit, offset);

      // Assert
      expect(result.query).toContain('MATCH (n:Requirement)');
      expect(result.query).toContain('WHERE n.status = $status AND n.priority = $priority AND n.type = $type');
      expect(result.query).toContain('RETURN n');
      expect(result.query).toContain('SKIP $offset');
      expect(result.query).toContain('LIMIT $limit');

      expect(result.params).toMatchObject({
        status: 'APPROVED',
        priority: 'HIGH',
        type: 'FUNCTIONAL',
        limit: 10,
        offset: 5
      });
    });

    it('should handle empty filters', () => {
      // Act
      const result = SecureQueryBuilder.buildSecureFilterQuery('Requirement', {});

      // Assert
      expect(result.query).not.toContain('WHERE');
      expect(result.params).toMatchObject({
        limit: 20,
        offset: 0
      });
    });

    it('should cap limit at maximum value', () => {
      // Act
      const result = SecureQueryBuilder.buildSecureFilterQuery('Requirement', {}, 200);

      // Assert
      expect(result.params.limit).toBe(100);
    });

    it('should ensure offset is non-negative', () => {
      // Act
      const result = SecureQueryBuilder.buildSecureFilterQuery('Requirement', {}, 10, -5);

      // Assert
      expect(result.params.offset).toBe(0);
    });

    it('should filter out null and undefined values', () => {
      // Arrange
      const filters = {
        status: 'APPROVED',
        priority: null,
        type: undefined,
        description: 'test'
      };

      // Act
      const result = SecureQueryBuilder.buildSecureFilterQuery('Requirement', filters);

      // Assert
      expect(result.query).toContain('n.status = $status');
      expect(result.query).toContain('n.description = $description');
      expect(result.query).not.toContain('n.priority');
      expect(result.query).not.toContain('n.type');
      expect(result.params).not.toHaveProperty('priority');
      expect(result.params).not.toHaveProperty('type');
    });
  });

  describe('buildSecureSearchQuery', () => {
    it('should build secure full-text search query', () => {
      // Arrange
      const nodeLabel = 'Requirement';
      const searchTerm = 'authentication system';
      const searchFields = ['title', 'description'];
      const limit = 15;

      // Act
      const result = SecureQueryBuilder.buildSecureSearchQuery(nodeLabel, searchTerm, searchFields, limit);

      // Assert
      expect(result.query).toContain('CALL db.index.fulltext.queryNodes($indexName, $searchTerm)');
      expect(result.query).toContain('WHERE node:Requirement');
      expect(result.query).toContain('ORDER BY score DESC');
      expect(result.query).toContain('LIMIT $limit');

      expect(result.params).toMatchObject({
        indexName: 'requirement_search',
        searchTerm: 'authentication system',
        limit: 15
      });
    });

    it('should sanitize search terms', () => {
      // Arrange
      const maliciousSearchTerm = 'test"; DROP DATABASE; --';

      // Act
      const result = SecureQueryBuilder.buildSecureSearchQuery('Requirement', maliciousSearchTerm);

      // Assert
      expect(result.params.searchTerm).toBe('test DROP DATABASE');
      expect(result.params.searchTerm).not.toContain('"');
      expect(result.params.searchTerm).not.toContain(';');
      expect(result.params.searchTerm).not.toContain('--');
    });

    it('should handle empty search terms', () => {
      // Act & Assert
      expect(() => {
        SecureQueryBuilder.buildSecureSearchQuery('Requirement', '');
      }).toThrow('Invalid search term');

      expect(() => {
        SecureQueryBuilder.buildSecureSearchQuery('Requirement', '   ');
      }).toThrow('Invalid search term');
    });

    it('should filter out invalid search fields', () => {
      // Arrange
      const invalidFields = ['title', 'maliciousField', 'description', 'anotherInvalidField'];

      // Act - Should not throw due to filtering
      const result = SecureQueryBuilder.buildSecureSearchQuery('Requirement', 'test', invalidFields);

      // Assert - Should work with valid fields only
      expect(result).toBeDefined();
      expect(result.params.searchTerm).toBe('test');
    });

    it('should throw when no valid search fields provided', () => {
      // Act & Assert
      expect(() => {
        SecureQueryBuilder.buildSecureSearchQuery('Requirement', 'test', ['maliciousField']);
      }).toThrow('No valid search fields provided');
    });

    it('should cap search limit', () => {
      // Act
      const result = SecureQueryBuilder.buildSecureSearchQuery('Requirement', 'test', ['title'], 100);

      // Assert
      expect(result.params.limit).toBe(50); // Should be capped at 50
    });
  });

  describe('validateAndSanitizeInput', () => {
    it('should handle string inputs correctly', () => {
      // Arrange
      const input = 'test string';

      // Act
      const result = SecureQueryBuilder.validateAndSanitizeInput(input);

      // Assert
      expect(result).toBe('test string');
    });

    it('should truncate long strings', () => {
      // Arrange
      const longInput = 'A'.repeat(1500);

      // Act
      const result = SecureQueryBuilder.validateAndSanitizeInput(longInput);

      // Assert
      expect(result).toHaveLength(1000);
      expect(result).toBe('A'.repeat(1000));
    });

    it('should handle numeric inputs', () => {
      // Act & Assert
      expect(SecureQueryBuilder.validateAndSanitizeInput(42)).toBe(42);
      expect(SecureQueryBuilder.validateAndSanitizeInput(3.14)).toBe(3.14);
      expect(SecureQueryBuilder.validateAndSanitizeInput(0)).toBe(0);
      expect(SecureQueryBuilder.validateAndSanitizeInput(-5)).toBe(-5);
    });

    it('should reject infinite numbers', () => {
      // Act & Assert
      expect(() => {
        SecureQueryBuilder.validateAndSanitizeInput(Infinity);
      }).toThrow('Invalid numeric input');

      expect(() => {
        SecureQueryBuilder.validateAndSanitizeInput(-Infinity);
      }).toThrow('Invalid numeric input');

      expect(() => {
        SecureQueryBuilder.validateAndSanitizeInput(NaN);
      }).toThrow('Invalid numeric input');
    });

    it('should handle boolean inputs', () => {
      // Act & Assert
      expect(SecureQueryBuilder.validateAndSanitizeInput(true)).toBe(true);
      expect(SecureQueryBuilder.validateAndSanitizeInput(false)).toBe(false);
    });

    it('should handle null and undefined', () => {
      // Act & Assert
      expect(SecureQueryBuilder.validateAndSanitizeInput(null)).toBeNull();
      expect(SecureQueryBuilder.validateAndSanitizeInput(undefined)).toBeUndefined();
    });

    it('should sanitize arrays recursively', () => {
      // Arrange
      const input = ['valid', 'A'.repeat(1500), 42, true, null];

      // Act
      const result = SecureQueryBuilder.validateAndSanitizeInput(input);

      // Assert
      expect(result).toEqual(['valid', 'A'.repeat(1000), 42, true, null]);
    });

    it('should limit array size', () => {
      // Arrange
      const largeArray = Array.from({ length: 150 }, (_, i) => i);

      // Act
      const result = SecureQueryBuilder.validateAndSanitizeInput(largeArray);

      // Assert
      expect(result).toHaveLength(100);
    });

    it('should sanitize objects recursively', () => {
      // Arrange
      const input = {
        validString: 'test',
        longString: 'A'.repeat(1500),
        number: 42,
        nested: {
          value: 'nested test'
        }
      };

      // Act
      const result = SecureQueryBuilder.validateAndSanitizeInput(input);

      // Assert
      expect(result).toEqual({
        validString: 'test',
        longString: 'A'.repeat(1000),
        number: 42,
        nested: {
          value: 'nested test'
        }
      });
    });

    it('should limit object property count', () => {
      // Arrange
      const largeObject: Record<string, number> = {};
      for (let i = 0; i < 60; i++) {
        largeObject[`prop${i}`] = i;
      }

      // Act
      const result = SecureQueryBuilder.validateAndSanitizeInput(largeObject);

      // Assert
      expect(Object.keys(result)).toHaveLength(50);
    });

    it('should filter out invalid object keys', () => {
      // Arrange
      const longKey = 'A'.repeat(150);
      const input = {
        validKey: 'valid',
        [longKey]: 'invalid key too long'
      };

      // Act
      const result = SecureQueryBuilder.validateAndSanitizeInput(input);

      // Assert
      expect(result).toHaveProperty('validKey');
      expect(result).not.toHaveProperty(longKey);
    });

    it('should reject invalid input types', () => {
      // Act & Assert
      expect(() => {
        SecureQueryBuilder.validateAndSanitizeInput(Symbol('test'));
      }).toThrow('Invalid input type: symbol');

      expect(() => {
        SecureQueryBuilder.validateAndSanitizeInput(() => {});
      }).toThrow('Invalid input type: function');
    });
  });
});

describe('InputValidator', () => {
  describe('validateGraphQLInput', () => {
    it('should validate required fields', () => {
      // Arrange
      const input = { name: 'test' };
      const schema = {
        name: { required: true, type: 'string' },
        email: { required: true, type: 'string' }
      };

      // Act & Assert
      expect(() => {
        InputValidator.validateGraphQLInput(input, schema);
      }).toThrow('Required field missing: email');
    });

    it('should validate field types', () => {
      // Arrange
      const input = { name: 123 };
      const schema = {
        name: { type: 'string' }
      };

      // Act & Assert
      expect(() => {
        InputValidator.validateGraphQLInput(input, schema);
      }).toThrow('Invalid type for field name: expected string, got number');
    });

    it('should validate string length constraints', () => {
      // Arrange
      const schema = {
        shortString: { type: 'string', minLength: 5, maxLength: 10 }
      };

      // Act & Assert
      expect(() => {
        InputValidator.validateGraphQLInput({ shortString: '123' }, schema);
      }).toThrow('Field shortString is below minimum length of 5');

      expect(() => {
        InputValidator.validateGraphQLInput({ shortString: '12345678901' }, schema);
      }).toThrow('Field shortString exceeds maximum length of 10');
    });

    it('should validate string patterns', () => {
      // Arrange
      const schema = {
        email: { type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
      };

      // Act & Assert
      expect(() => {
        InputValidator.validateGraphQLInput({ email: 'invalid-email' }, schema);
      }).toThrow('Field email does not match required pattern');

      // Should pass with valid email
      expect(() => {
        InputValidator.validateGraphQLInput({ email: 'test@example.com' }, schema);
      }).not.toThrow();
    });

    it('should validate number ranges', () => {
      // Arrange
      const schema = {
        age: { type: 'number', min: 0, max: 150 }
      };

      // Act & Assert
      expect(() => {
        InputValidator.validateGraphQLInput({ age: -5 }, schema);
      }).toThrow('Field age is below minimum value of 0');

      expect(() => {
        InputValidator.validateGraphQLInput({ age: 200 }, schema);
      }).toThrow('Field age exceeds maximum value of 150');
    });

    it('should validate array constraints', () => {
      // Arrange
      const schema = {
        tags: { 
          type: 'object',
          maxItems: 3,
          items: { type: 'string', maxLength: 10 }
        }
      };

      // Act & Assert
      expect(() => {
        InputValidator.validateGraphQLInput({ 
          tags: ['tag1', 'tag2', 'tag3', 'tag4'] 
        }, schema);
      }).toThrow('Field tags exceeds maximum array length of 3');

      expect(() => {
        InputValidator.validateGraphQLInput({ 
          tags: ['validtag', 'this-tag-is-way-too-long'] 
        }, schema);
      }).toThrow('Field tags[1] exceeds maximum length of 10');
    });

    it('should pass validation with valid input', () => {
      // Arrange
      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
        tags: ['user', 'active']
      };
      
      const schema = {
        name: { required: true, type: 'string', maxLength: 50 },
        email: { required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        age: { type: 'number', min: 0, max: 150 },
        tags: { 
          type: 'object',
          maxItems: 5,
          items: { type: 'string', maxLength: 20 }
        }
      };

      // Act & Assert
      expect(() => {
        InputValidator.validateGraphQLInput(input, schema);
      }).not.toThrow();
    });

    it('should handle optional fields correctly', () => {
      // Arrange
      const input = { name: 'John' };
      const schema = {
        name: { required: true, type: 'string' },
        email: { type: 'string' } // Optional
      };

      // Act & Assert
      expect(() => {
        InputValidator.validateGraphQLInput(input, schema);
      }).not.toThrow();
    });
  });
});