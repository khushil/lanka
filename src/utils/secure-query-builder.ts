import { logger } from '../core/logging/logger';

/**
 * Secure Query Builder for Neo4j
 * Prevents injection attacks through parameterization and validation
 */
export class SecureQueryBuilder {
  private static readonly ALLOWED_RELATIONSHIPS = new Set([
    'DEPENDS_ON',
    'CONFLICTS_WITH',
    'IMPLEMENTS',
    'EXTENDS',
    'SIMILAR_TO',
    'RELATED_TO',
    'TRACES_TO',
    'VALIDATES',
    'APPROVES',
    'BLOCKS',
    'ENHANCES',
    'REPLACES'
  ]);

  private static readonly ALLOWED_LABELS = new Set([
    'Requirement',
    'Project',
    'Stakeholder',
    'Architecture',
    'Component',
    'Conflict'
  ]);

  private static readonly ALLOWED_PROPERTIES = new Set([
    'id',
    'title',
    'description',
    'type',
    'status',
    'priority',
    'createdAt',
    'updatedAt',
    'version',
    'tags',
    'resolution',
    'resolvedAt'
  ]);

  /**
   * Safely build UPDATE queries with parameterized SET clauses
   */
  public static buildSecureUpdateQuery(
    nodeLabel: string,
    nodeId: string,
    updateFields: Record<string, any>
  ): { query: string; params: Record<string, any> } {
    // Validate node label
    if (!this.ALLOWED_LABELS.has(nodeLabel)) {
      throw new Error(`Invalid node label: ${nodeLabel}`);
    }

    // Validate and sanitize update fields
    const validFields: Record<string, any> = {};
    const setStatements: string[] = [];

    for (const [key, value] of Object.entries(updateFields)) {
      if (!this.ALLOWED_PROPERTIES.has(key)) {
        logger.warn(`Attempted to update invalid property: ${key}`);
        continue;
      }

      // Additional validation based on property type
      if (key === 'status' && !this.isValidStatus(value)) {
        throw new Error(`Invalid status value: ${value}`);
      }

      if (key === 'priority' && !this.isValidPriority(value)) {
        throw new Error(`Invalid priority value: ${value}`);
      }

      validFields[key] = value;
      setStatements.push(`n.${key} = $${key}`);
    }

    if (setStatements.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Add timestamp
    setStatements.push('n.updatedAt = $updatedAt');
    validFields.updatedAt = new Date().toISOString();

    const query = `
      MATCH (n:${nodeLabel} {id: $nodeId})
      SET ${setStatements.join(', ')}
      RETURN n
    `;

    const params = {
      nodeId,
      ...validFields
    };

    logger.info('Built secure update query', { nodeLabel, nodeId, fieldCount: Object.keys(validFields).length });

    return { query, params };
  }

  /**
   * Safely build relationship creation queries
   */
  public static buildSecureRelationshipQuery(
    sourceNodeLabel: string,
    sourceNodeId: string,
    targetNodeLabel: string,
    targetNodeId: string,
    relationshipType: string,
    properties: Record<string, any> = {}
  ): { query: string; params: Record<string, any> } {
    // Validate relationship type
    if (!this.ALLOWED_RELATIONSHIPS.has(relationshipType)) {
      throw new Error(`Invalid relationship type: ${relationshipType}`);
    }

    // Validate node labels
    if (!this.ALLOWED_LABELS.has(sourceNodeLabel)) {
      throw new Error(`Invalid source node label: ${sourceNodeLabel}`);
    }

    if (!this.ALLOWED_LABELS.has(targetNodeLabel)) {
      throw new Error(`Invalid target node label: ${targetNodeLabel}`);
    }

    // Sanitize relationship properties
    const validProperties: Record<string, any> = {};
    for (const [key, value] of Object.entries(properties)) {
      if (this.ALLOWED_PROPERTIES.has(key)) {
        validProperties[key] = value;
      }
    }

    // Build property string for relationship
    const propString = Object.keys(validProperties).length > 0 
      ? `{${Object.keys(validProperties).map(key => `${key}: $rel_${key}`).join(', ')}}`
      : '';

    const query = `
      MATCH (source:${sourceNodeLabel} {id: $sourceId})
      MATCH (target:${targetNodeLabel} {id: $targetId})
      CREATE (source)-[:${relationshipType} ${propString}]->(target)
      RETURN source, target
    `;

    // Prefix relationship properties to avoid conflicts
    const relParams: Record<string, any> = {};
    for (const [key, value] of Object.entries(validProperties)) {
      relParams[`rel_${key}`] = value;
    }

    const params = {
      sourceId: sourceNodeId,
      targetId: targetNodeId,
      ...relParams
    };

    logger.info('Built secure relationship query', { 
      sourceNodeLabel, 
      targetNodeLabel, 
      relationshipType,
      propertiesCount: Object.keys(validProperties).length 
    });

    return { query, params };
  }

  /**
   * Build secure filter queries with proper WHERE clauses
   */
  public static buildSecureFilterQuery(
    nodeLabel: string,
    filters: Record<string, any>,
    limit: number = 20,
    offset: number = 0
  ): { query: string; params: Record<string, any> } {
    // Validate node label
    if (!this.ALLOWED_LABELS.has(nodeLabel)) {
      throw new Error(`Invalid node label: ${nodeLabel}`);
    }

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: Record<string, any> = {
      limit: Math.min(limit, 100), // Cap at 100 for security
      offset: Math.max(offset, 0)
    };

    for (const [key, value] of Object.entries(filters)) {
      if (!this.ALLOWED_PROPERTIES.has(key)) {
        logger.warn(`Ignored invalid filter property: ${key}`);
        continue;
      }

      if (value !== undefined && value !== null) {
        conditions.push(`n.${key} = $${key}`);
        params[key] = value;
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      MATCH (n:${nodeLabel})
      ${whereClause}
      RETURN n
      SKIP $offset
      LIMIT $limit
    `;

    logger.info('Built secure filter query', { 
      nodeLabel, 
      conditionsCount: conditions.length,
      limit,
      offset 
    });

    return { query, params };
  }

  /**
   * Build secure text search queries using full-text indexes
   */
  public static buildSecureSearchQuery(
    nodeLabel: string,
    searchTerm: string,
    searchFields: string[] = ['title', 'description'],
    limit: number = 20
  ): { query: string; params: Record<string, any> } {
    // Validate inputs
    if (!this.ALLOWED_LABELS.has(nodeLabel)) {
      throw new Error(`Invalid node label: ${nodeLabel}`);
    }

    // Validate search fields
    const validSearchFields = searchFields.filter(field => 
      this.ALLOWED_PROPERTIES.has(field)
    );

    if (validSearchFields.length === 0) {
      throw new Error('No valid search fields provided');
    }

    // Sanitize search term to prevent injection
    const sanitizedSearchTerm = this.sanitizeSearchTerm(searchTerm);
    
    if (!sanitizedSearchTerm) {
      throw new Error('Invalid search term');
    }

    // Use full-text search index
    const indexName = `${nodeLabel.toLowerCase()}_search`;
    
    const query = `
      CALL db.index.fulltext.queryNodes($indexName, $searchTerm)
      YIELD node, score
      WHERE node:${nodeLabel}
      RETURN node, score
      ORDER BY score DESC
      LIMIT $limit
    `;

    const params = {
      indexName,
      searchTerm: sanitizedSearchTerm,
      limit: Math.min(limit, 50)
    };

    logger.info('Built secure search query', { nodeLabel, searchTerm: sanitizedSearchTerm, limit });

    return { query, params };
  }

  /**
   * Validate status values
   */
  private static isValidStatus(status: string): boolean {
    const validStatuses = ['DRAFT', 'PENDING', 'APPROVED', 'IMPLEMENTED', 'CANCELLED', 'RESOLVED'];
    return validStatuses.includes(status);
  }

  /**
   * Validate priority values
   */
  private static isValidPriority(priority: string): boolean {
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    return validPriorities.includes(priority);
  }

  /**
   * Sanitize search terms to prevent injection
   */
  private static sanitizeSearchTerm(searchTerm: string): string {
    if (typeof searchTerm !== 'string') {
      return '';
    }

    // Remove potentially dangerous characters and escape special ones
    return searchTerm
      .replace(/[^\w\s-]/g, ' ') // Remove special chars except word chars, spaces, and hyphens
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .slice(0, 100); // Limit length
  }

  /**
   * Validate and sanitize input parameters
   */
  public static validateAndSanitizeInput(input: any): any {
    if (typeof input === 'string') {
      // Basic string sanitization
      return input.slice(0, 1000).trim(); // Limit length and trim
    }

    if (typeof input === 'number') {
      // Validate numeric input
      if (!isFinite(input)) {
        throw new Error('Invalid numeric input');
      }
      return input;
    }

    if (typeof input === 'boolean') {
      return input;
    }

    if (input === null || input === undefined) {
      return input;
    }

    if (Array.isArray(input)) {
      // Recursively validate array elements
      return input.slice(0, 100).map(item => this.validateAndSanitizeInput(item));
    }

    if (typeof input === 'object') {
      // Recursively validate object properties
      const sanitized: any = {};
      let propCount = 0;
      
      for (const [key, value] of Object.entries(input)) {
        if (propCount >= 50) break; // Limit object size
        
        // Validate key
        if (typeof key === 'string' && key.length <= 100) {
          sanitized[key] = this.validateAndSanitizeInput(value);
          propCount++;
        }
      }
      
      return sanitized;
    }

    // Invalid input type
    throw new Error(`Invalid input type: ${typeof input}`);
  }

  /**
   * Build APOC-based dynamic relationship query safely
   */
  public static buildAPOCRelationshipQuery(
    sourceNodeId: string,
    targetNodeId: string,
    relationshipType: string,
    properties: Record<string, any> = {}
  ): { query: string; params: Record<string, any> } {
    // Validate relationship type
    if (!this.ALLOWED_RELATIONSHIPS.has(relationshipType)) {
      throw new Error(`Invalid relationship type: ${relationshipType}`);
    }

    // Sanitize properties
    const validProperties = this.validateAndSanitizeInput(properties);

    const query = `
      MATCH (source {id: $sourceId})
      MATCH (target {id: $targetId})
      CALL apoc.create.relationship(source, $relationshipType, $properties, target)
      YIELD rel
      RETURN rel
    `;

    const params = {
      sourceId: sourceNodeId,
      targetId: targetNodeId,
      relationshipType,
      properties: validProperties
    };

    logger.info('Built APOC relationship query', { relationshipType, sourceNodeId, targetNodeId });

    return { query, params };
  }
}

/**
 * Input validation utilities
 */
export class InputValidator {
  /**
   * Validate GraphQL input parameters
   */
  public static validateGraphQLInput(input: any, schema: Record<string, any>): boolean {
    for (const [key, rules] of Object.entries(schema)) {
      const value = input[key];
      
      if (rules.required && (value === undefined || value === null)) {
        throw new Error(`Required field missing: ${key}`);
      }

      if (value !== undefined && value !== null) {
        this.validateFieldValue(key, value, rules);
      }
    }

    return true;
  }

  private static validateFieldValue(fieldName: string, value: any, rules: any): void {
    // Type validation
    if (rules.type && typeof value !== rules.type) {
      throw new Error(`Invalid type for field ${fieldName}: expected ${rules.type}, got ${typeof value}`);
    }

    // String validation
    if (rules.type === 'string') {
      if (rules.maxLength && value.length > rules.maxLength) {
        throw new Error(`Field ${fieldName} exceeds maximum length of ${rules.maxLength}`);
      }
      
      if (rules.minLength && value.length < rules.minLength) {
        throw new Error(`Field ${fieldName} is below minimum length of ${rules.minLength}`);
      }
      
      if (rules.pattern && !rules.pattern.test(value)) {
        throw new Error(`Field ${fieldName} does not match required pattern`);
      }
    }

    // Number validation
    if (rules.type === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        throw new Error(`Field ${fieldName} is below minimum value of ${rules.min}`);
      }
      
      if (rules.max !== undefined && value > rules.max) {
        throw new Error(`Field ${fieldName} exceeds maximum value of ${rules.max}`);
      }
    }

    // Array validation
    if (Array.isArray(value) && rules.items) {
      if (rules.maxItems && value.length > rules.maxItems) {
        throw new Error(`Field ${fieldName} exceeds maximum array length of ${rules.maxItems}`);
      }
      
      value.forEach((item, index) => {
        this.validateFieldValue(`${fieldName}[${index}]`, item, rules.items);
      });
    }
  }
}