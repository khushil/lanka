/**
 * Graph Service for Memory System
 * Handles Neo4j operations and graph traversal algorithms
 */

import Neo4j from 'neo4j-driver';
import winston from 'winston';

interface GraphNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

interface GraphRelationship {
  id: string;
  type: string;
  startNodeId: string;
  endNodeId: string;
  properties: Record<string, any>;
}

interface GraphPath {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
  length: number;
}

interface TraversalOptions {
  maxDepth?: number;
  relationshipTypes?: string[];
  direction?: 'OUTGOING' | 'INCOMING' | 'BOTH';
  nodeFilter?: (node: GraphNode) => boolean;
  relationshipFilter?: (rel: GraphRelationship) => boolean;
}

export class GraphService {
  private driver: Neo4j.Driver;
  private logger: winston.Logger;

  constructor(neo4jUri: string, auth?: { username: string; password: string }) {
    this.setupLogger();
    this.driver = Neo4j.driver(
      neo4jUri, 
      auth ? Neo4j.auth.basic(auth.username, auth.password) : undefined
    );
    this.testConnection();
  }

  private setupLogger(): void {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'graph-service' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ],
    });
  }

  private async testConnection(): Promise<void> {
    try {
      const session = this.driver.session();
      await session.run('RETURN 1');
      await session.close();
      this.logger.info('Neo4j connection established');
    } catch (error) {
      this.logger.error('Neo4j connection test failed:', error);
      throw error;
    }
  }

  // Core Graph Operations
  public async createNode(
    labels: string[],
    properties: Record<string, any>
  ): Promise<GraphNode> {
    const session = this.driver.session();
    
    try {
      const labelsStr = labels.map(label => `:${label}`).join('');
      const propsStr = Object.keys(properties)
        .map(key => `${key}: $${key}`)
        .join(', ');
      
      const query = `CREATE (n${labelsStr} {${propsStr}}) RETURN n`;
      const result = await session.run(query, properties);
      
      const record = result.records[0];
      const node = record.get('n');
      
      return {
        id: node.identity.toString(),
        labels: node.labels,
        properties: node.properties
      };
      
    } finally {
      await session.close();
    }
  }

  public async createRelationship(
    startNodeId: string,
    endNodeId: string,
    type: string,
    properties: Record<string, any> = {}
  ): Promise<GraphRelationship> {
    const session = this.driver.session();
    
    try {
      const propsStr = Object.keys(properties).length > 0 
        ? '{' + Object.keys(properties).map(key => `${key}: $${key}`).join(', ') + '}'
        : '';
      
      const query = `
        MATCH (start) WHERE id(start) = $startNodeId
        MATCH (end) WHERE id(end) = $endNodeId
        CREATE (start)-[r:${type} ${propsStr}]->(end)
        RETURN r, id(start) as startId, id(end) as endId
      `;
      
      const params = {
        startNodeId: parseInt(startNodeId),
        endNodeId: parseInt(endNodeId),
        ...properties
      };
      
      const result = await session.run(query, params);
      const record = result.records[0];
      const rel = record.get('r');
      
      return {
        id: rel.identity.toString(),
        type: rel.type,
        startNodeId: record.get('startId').toString(),
        endNodeId: record.get('endId').toString(),
        properties: rel.properties
      };
      
    } finally {
      await session.close();
    }
  }

  public async findNodeById(id: string): Promise<GraphNode | null> {
    const session = this.driver.session();
    
    try {
      const query = 'MATCH (n) WHERE id(n) = $id RETURN n';
      const result = await session.run(query, { id: parseInt(id) });
      
      if (result.records.length === 0) {
        return null;
      }
      
      const node = result.records[0].get('n');
      return {
        id: node.identity.toString(),
        labels: node.labels,
        properties: node.properties
      };
      
    } finally {
      await session.close();
    }
  }

  public async findNodesByLabel(
    label: string,
    properties?: Record<string, any>
  ): Promise<GraphNode[]> {
    const session = this.driver.session();
    
    try {
      let query = `MATCH (n:${label})`;
      const params: Record<string, any> = {};
      
      if (properties && Object.keys(properties).length > 0) {
        const whereConditions = Object.keys(properties)
          .map(key => {
            params[key] = properties[key];
            return `n.${key} = $${key}`;
          })
          .join(' AND ');
        query += ` WHERE ${whereConditions}`;
      }
      
      query += ' RETURN n';
      
      const result = await session.run(query, params);
      
      return result.records.map(record => {
        const node = record.get('n');
        return {
          id: node.identity.toString(),
          labels: node.labels,
          properties: node.properties
        };
      });
      
    } finally {
      await session.close();
    }
  }

  // Advanced Graph Traversal
  public async traverseFromNode(
    startNodeId: string,
    options: TraversalOptions = {}
  ): Promise<GraphPath[]> {
    const session = this.driver.session();
    
    try {
      const {
        maxDepth = 3,
        relationshipTypes = [],
        direction = 'BOTH'
      } = options;
      
      let relationshipPattern = '';
      if (relationshipTypes.length > 0) {
        const typesStr = relationshipTypes.map(type => `:${type}`).join('|');
        relationshipPattern = `[r${typesStr}]`;
      } else {
        relationshipPattern = '[r]';
      }
      
      let directionPattern = '';
      switch (direction) {
        case 'OUTGOING':
          directionPattern = `-${relationshipPattern}->`;
          break;
        case 'INCOMING':
          directionPattern = `<-${relationshipPattern}-`;
          break;
        case 'BOTH':
        default:
          directionPattern = `-${relationshipPattern}-`;
          break;
      }
      
      const query = `
        MATCH path = (start)${directionPattern}*(end)
        WHERE id(start) = $startNodeId
        AND length(path) <= $maxDepth
        AND length(path) > 0
        RETURN path
        ORDER BY length(path)
      `;
      
      const result = await session.run(query, {
        startNodeId: parseInt(startNodeId),
        maxDepth
      });
      
      return result.records.map(record => {
        const path = record.get('path');
        
        const nodes: GraphNode[] = path.segments.map((segment: any) => ({
          id: segment.start.identity.toString(),
          labels: segment.start.labels,
          properties: segment.start.properties
        }));
        
        // Add the last node
        if (path.segments.length > 0) {
          const lastSegment = path.segments[path.segments.length - 1];
          nodes.push({
            id: lastSegment.end.identity.toString(),
            labels: lastSegment.end.labels,
            properties: lastSegment.end.properties
          });
        }
        
        const relationships: GraphRelationship[] = path.segments.map((segment: any) => ({
          id: segment.relationship.identity.toString(),
          type: segment.relationship.type,
          startNodeId: segment.start.identity.toString(),
          endNodeId: segment.end.identity.toString(),
          properties: segment.relationship.properties
        }));
        
        return {
          nodes,
          relationships,
          length: path.length
        };
      });
      
    } finally {
      await session.close();
    }
  }

  // Memory-Specific Graph Operations
  public async findMemoryEvolution(memoryId: string): Promise<GraphPath[]> {
    return this.traverseFromNode(memoryId, {
      relationshipTypes: ['EVOLVED_FROM', 'EVOLVED_TO'],
      maxDepth: 5,
      direction: 'BOTH'
    });
  }

  public async findMemoryDependencies(memoryId: string): Promise<GraphNode[]> {
    const session = this.driver.session();
    
    try {
      const query = `
        MATCH (m:Memory)-[:DEPENDS_ON]->(dep:Memory)
        WHERE m.id = $memoryId
        RETURN dep
        ORDER BY dep.quality DESC, dep.updatedAt DESC
      `;
      
      const result = await session.run(query, { memoryId });
      
      return result.records.map(record => {
        const node = record.get('dep');
        return {
          id: node.identity.toString(),
          labels: node.labels,
          properties: node.properties
        };
      });
      
    } finally {
      await session.close();
    }
  }

  public async findMemoryContradictions(memoryId: string): Promise<GraphNode[]> {
    const session = this.driver.session();
    
    try {
      const query = `
        MATCH (m:Memory)-[:CONTRADICTS]-(contradiction:Memory)
        WHERE m.id = $memoryId
        RETURN contradiction
        ORDER BY contradiction.confidence DESC
      `;
      
      const result = await session.run(query, { memoryId });
      
      return result.records.map(record => {
        const node = record.get('contradiction');
        return {
          id: node.identity.toString(),
          labels: node.labels,
          properties: node.properties
        };
      });
      
    } finally {
      await session.close();
    }
  }

  public async analyzeMemoryConnectivity(workspace?: string): Promise<{
    totalNodes: number;
    totalRelationships: number;
    averageDegree: number;
    clustersCount: number;
    stronglyConnectedComponents: number;
  }> {
    const session = this.driver.session();
    
    try {
      const whereClause = workspace ? 'WHERE n.workspace = $workspace' : '';
      const params = workspace ? { workspace } : {};
      
      // Basic connectivity metrics
      const basicQuery = `
        MATCH (n:Memory)
        ${whereClause}
        OPTIONAL MATCH (n)-[r]-(connected)
        ${whereClause.replace('n.workspace', 'connected.workspace')}
        RETURN 
          count(DISTINCT n) as totalNodes,
          count(DISTINCT r) as totalRelationships,
          avg(count(r)) as avgDegree
      `;
      
      const basicResult = await session.run(basicQuery, params);
      const basicRecord = basicResult.records[0];
      
      // TODO: Implement more advanced graph analysis
      // For now, return basic metrics with placeholder values
      return {
        totalNodes: basicRecord.get('totalNodes').toNumber(),
        totalRelationships: basicRecord.get('totalRelationships').toNumber(),
        averageDegree: basicRecord.get('avgDegree') || 0,
        clustersCount: 0, // TODO: Implement clustering analysis
        stronglyConnectedComponents: 0 // TODO: Implement SCC analysis
      };
      
    } finally {
      await session.close();
    }
  }

  public async findShortestPath(
    startMemoryId: string,
    endMemoryId: string,
    maxLength: number = 6
  ): Promise<GraphPath | null> {
    const session = this.driver.session();
    
    try {
      const query = `
        MATCH (start:Memory {id: $startId}), (end:Memory {id: $endId})
        MATCH path = shortestPath((start)-[*..${maxLength}]-(end))
        RETURN path
      `;
      
      const result = await session.run(query, {
        startId: startMemoryId,
        endId: endMemoryId
      });
      
      if (result.records.length === 0) {
        return null;
      }
      
      const path = result.records[0].get('path');
      
      const nodes: GraphNode[] = path.segments.map((segment: any) => ({
        id: segment.start.identity.toString(),
        labels: segment.start.labels,
        properties: segment.start.properties
      }));
      
      // Add the last node
      if (path.segments.length > 0) {
        const lastSegment = path.segments[path.segments.length - 1];
        nodes.push({
          id: lastSegment.end.identity.toString(),
          labels: lastSegment.end.labels,
          properties: lastSegment.end.properties
        });
      }
      
      const relationships: GraphRelationship[] = path.segments.map((segment: any) => ({
        id: segment.relationship.identity.toString(),
        type: segment.relationship.type,
        startNodeId: segment.start.identity.toString(),
        endNodeId: segment.end.identity.toString(),
        properties: segment.relationship.properties
      }));
      
      return {
        nodes,
        relationships,
        length: path.length
      };
      
    } finally {
      await session.close();
    }
  }

  // Graph Maintenance Operations
  public async deleteNode(nodeId: string): Promise<void> {
    const session = this.driver.session();
    
    try {
      const query = `
        MATCH (n) WHERE id(n) = $nodeId
        DETACH DELETE n
      `;
      
      await session.run(query, { nodeId: parseInt(nodeId) });
      
    } finally {
      await session.close();
    }
  }

  public async deleteRelationship(relationshipId: string): Promise<void> {
    const session = this.driver.session();
    
    try {
      const query = `
        MATCH ()-[r]-() WHERE id(r) = $relationshipId
        DELETE r
      `;
      
      await session.run(query, { relationshipId: parseInt(relationshipId) });
      
    } finally {
      await session.close();
    }
  }

  public async updateNodeProperties(
    nodeId: string,
    properties: Record<string, any>
  ): Promise<void> {
    const session = this.driver.session();
    
    try {
      const setClause = Object.keys(properties)
        .map(key => `n.${key} = $${key}`)
        .join(', ');
      
      const query = `
        MATCH (n) WHERE id(n) = $nodeId
        SET ${setClause}
      `;
      
      await session.run(query, {
        nodeId: parseInt(nodeId),
        ...properties
      });
      
    } finally {
      await session.close();
    }
  }

  public async getGraphStatistics(): Promise<{
    nodeCount: number;
    relationshipCount: number;
    labelCounts: Record<string, number>;
    relationshipTypeCounts: Record<string, number>;
  }> {
    const session = this.driver.session();
    
    try {
      const query = `
        CALL db.stats.retrieve('GRAPH') YIELD data
        RETURN data
      `;
      
      // Fallback to basic queries if stats procedure is not available
      const nodeCountQuery = 'MATCH (n) RETURN count(n) as nodeCount';
      const relCountQuery = 'MATCH ()-[r]->() RETURN count(r) as relCount';
      
      const [nodeResult, relResult] = await Promise.all([
        session.run(nodeCountQuery),
        session.run(relCountQuery)
      ]);
      
      return {
        nodeCount: nodeResult.records[0].get('nodeCount').toNumber(),
        relationshipCount: relResult.records[0].get('relCount').toNumber(),
        labelCounts: {}, // TODO: Implement label counting
        relationshipTypeCounts: {} // TODO: Implement relationship type counting
      };
      
    } finally {
      await session.close();
    }
  }

  public async close(): Promise<void> {
    await this.driver.close();
    this.logger.info('Graph service closed');
  }
}