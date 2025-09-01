import { Neo4jService } from '../../core/database/neo4j';
import { logger } from '../../core/logging/logger';
import { queryResultCache } from '../cache/query-result-cache';

export interface QueryProfile {
  queryId: string;
  query: string;
  parameters: Record<string, any>;
  executionPlan: ExecutionPlan;
  optimizationSuggestions: OptimizationSuggestion[];
  performanceMetrics: PerformanceMetrics;
  indexRecommendations: IndexRecommendation[];
  estimatedImprovement: number; // Percentage improvement expected
}

export interface ExecutionPlan {
  operatorType: string;
  identifiers: string[];
  arguments: Record<string, any>;
  children: ExecutionPlan[];
  rows: number;
  dbHits: number;
  pageCacheHits: number;
  pageCacheMisses: number;
  time: number;
  cost: number;
}

export interface PerformanceMetrics {
  totalTime: number;
  compilationTime: number;
  executionTime: number;
  rowsReturned: number;
  memoryUsage: number;
  pageReads: number;
  indexSeeks: number;
  indexScans: number;
  nodeScans: number;
  relationshipScans: number;
}

export interface OptimizationSuggestion {
  type: 'index' | 'query_rewrite' | 'parameter_hint' | 'caching' | 'schema_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  suggestion: string;
  expectedImprovement: number;
  effort: 'low' | 'medium' | 'high';
  autoFixable: boolean;
  autoFixQuery?: string;
}

export interface IndexRecommendation {
  indexType: 'composite' | 'range' | 'vector' | 'fulltext' | 'text';
  labels: string[];
  properties: string[];
  createStatement: string;
  estimatedSpeedImprovement: number;
  estimatedSpaceOverhead: number;
  priority: 'low' | 'medium' | 'high';
}

export class SlowQueryProfiler {
  private neo4jService: Neo4jService;
  private profiledQueries: Map<string, QueryProfile> = new Map();
  private slowQueryThreshold: number = 1000; // 1 second
  private profilingEnabled: boolean = true;

  constructor(neo4jService?: Neo4jService) {
    this.neo4jService = neo4jService || Neo4jService.getInstance();
  }

  /**
   * Profile a slow query and generate optimization recommendations
   */
  public async profileQuery(
    queryId: string,
    query: string,
    parameters: Record<string, any> = {}
  ): Promise<QueryProfile> {
    logger.info(`Profiling slow query: ${queryId}`, { 
      query: query.substring(0, 100) + '...' 
    });

    // Execute query with PROFILE to get detailed execution plan
    const profileResult = await this.executeWithProfile(query, parameters);
    
    // Analyze the execution plan
    const executionPlan = this.parseExecutionPlan(profileResult.profile);
    const performanceMetrics = this.extractPerformanceMetrics(profileResult);
    
    // Generate optimization suggestions
    const optimizationSuggestions = this.generateOptimizationSuggestions(
      query, executionPlan, performanceMetrics
    );
    
    // Generate index recommendations
    const indexRecommendations = this.generateIndexRecommendations(
      query, executionPlan
    );
    
    // Calculate estimated improvement
    const estimatedImprovement = this.calculateEstimatedImprovement(
      optimizationSuggestions, indexRecommendations
    );

    const queryProfile: QueryProfile = {
      queryId,
      query: this.sanitizeQuery(query),
      parameters: this.sanitizeParameters(parameters),
      executionPlan,
      optimizationSuggestions,
      performanceMetrics,
      indexRecommendations,
      estimatedImprovement
    };

    // Store the profile for future reference
    this.profiledQueries.set(queryId, queryProfile);

    logger.info(`Query profiling completed for ${queryId}`, {
      suggestions: optimizationSuggestions.length,
      indexRecommendations: indexRecommendations.length,
      estimatedImprovement
    });

    return queryProfile;
  }

  /**
   * Auto-fix optimization issues where possible
   */
  public async autoFixOptimizations(queryId: string): Promise<{
    applied: OptimizationSuggestion[];
    failed: Array<{ suggestion: OptimizationSuggestion; error: string }>;
  }> {
    const profile = this.profiledQueries.get(queryId);
    if (!profile) {
      throw new Error(`No profile found for query: ${queryId}`);
    }

    const applied: OptimizationSuggestion[] = [];
    const failed: Array<{ suggestion: OptimizationSuggestion; error: string }> = [];

    for (const suggestion of profile.optimizationSuggestions) {
      if (!suggestion.autoFixable || !suggestion.autoFixQuery) {
        continue;
      }

      try {
        logger.info(`Applying auto-fix for suggestion: ${suggestion.title}`);
        
        await this.neo4jService.executeQuery(suggestion.autoFixQuery);
        applied.push(suggestion);
        
        logger.info(`Successfully applied auto-fix: ${suggestion.title}`);
      } catch (error: any) {
        failed.push({ suggestion, error: error.message });
        logger.error(`Failed to apply auto-fix: ${suggestion.title}`, error);
      }
    }

    return { applied, failed };
  }

  /**
   * Generate optimized version of a slow query
   */
  public generateOptimizedQuery(
    originalQuery: string,
    suggestions: OptimizationSuggestion[]
  ): string {
    let optimizedQuery = originalQuery;

    for (const suggestion of suggestions) {
      switch (suggestion.type) {
        case 'parameter_hint':
          optimizedQuery = this.addParameterHints(optimizedQuery);
          break;
        case 'query_rewrite':
          optimizedQuery = this.applyQueryRewrite(optimizedQuery, suggestion);
          break;
        case 'index':
          optimizedQuery = this.addIndexHints(optimizedQuery);
          break;
      }
    }

    return optimizedQuery;
  }

  /**
   * Analyze query patterns to identify common performance issues
   */
  public analyzeQueryPatterns(): {
    commonIssues: Array<{ issue: string; frequency: number; impact: string }>;
    recommendations: string[];
  } {
    const issueCounter = new Map<string, number>();
    const totalQueries = this.profiledQueries.size;

    // Analyze all profiled queries for common patterns
    for (const profile of this.profiledQueries.values()) {
      for (const suggestion of profile.optimizationSuggestions) {
        const key = `${suggestion.type}:${suggestion.title}`;
        issueCounter.set(key, (issueCounter.get(key) || 0) + 1);
      }
    }

    // Convert to frequency analysis
    const commonIssues = Array.from(issueCounter.entries())
      .map(([issue, count]) => ({
        issue,
        frequency: (count / totalQueries) * 100,
        impact: count > totalQueries * 0.5 ? 'high' : count > totalQueries * 0.2 ? 'medium' : 'low'
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    // Generate high-level recommendations
    const recommendations = this.generatePatternRecommendations(commonIssues);

    return { commonIssues, recommendations };
  }

  /**
   * Execute query with PROFILE and collect detailed metrics
   */
  private async executeWithProfile(
    query: string, 
    parameters: Record<string, any>
  ): Promise<any> {
    const session = this.neo4jService.getSession();
    
    try {
      // Execute with PROFILE
      const profiledQuery = `PROFILE ${query}`;
      const result = await session.run(profiledQuery, parameters);
      
      return {
        records: result.records,
        summary: result.summary,
        profile: result.summary.profile,
        queryType: result.summary.queryType,
        counters: result.summary.counters
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Parse execution plan from Neo4j profile
   */
  private parseExecutionPlan(profile: any): ExecutionPlan {
    if (!profile) {
      return this.createEmptyExecutionPlan();
    }

    return {
      operatorType: profile.operatorType || 'unknown',
      identifiers: profile.identifiers || [],
      arguments: profile.arguments || {},
      children: (profile.children || []).map((child: any) => this.parseExecutionPlan(child)),
      rows: profile.rows || 0,
      dbHits: profile.dbHits || 0,
      pageCacheHits: profile.pageCacheHits || 0,
      pageCacheMisses: profile.pageCacheMisses || 0,
      time: profile.time || 0,
      cost: this.calculateOperatorCost(profile)
    };
  }

  /**
   * Extract performance metrics from query result summary
   */
  private extractPerformanceMetrics(result: any): PerformanceMetrics {
    const profile = result.profile || {};
    const summary = result.summary || {};

    return {
      totalTime: summary.resultAvailableAfter?.toNumber() || 0,
      compilationTime: summary.resultConsumedAfter?.toNumber() || 0,
      executionTime: (summary.resultAvailableAfter?.toNumber() || 0) - 
                    (summary.resultConsumedAfter?.toNumber() || 0),
      rowsReturned: result.records?.length || 0,
      memoryUsage: this.calculateMemoryUsage(profile),
      pageReads: this.countPageReads(profile),
      indexSeeks: this.countOperatorType(profile, 'NodeIndexSeek'),
      indexScans: this.countOperatorType(profile, 'NodeIndexScan'),
      nodeScans: this.countOperatorType(profile, 'AllNodesScan'),
      relationshipScans: this.countOperatorType(profile, 'AllRelationshipsScan')
    };
  }

  /**
   * Generate optimization suggestions based on execution plan analysis
   */
  private generateOptimizationSuggestions(
    query: string,
    executionPlan: ExecutionPlan,
    metrics: PerformanceMetrics
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Check for missing indexes
    if (metrics.nodeScans > 0) {
      suggestions.push({
        type: 'index',
        severity: 'high',
        title: 'Missing Index for Node Scan',
        description: 'Query is performing full node scans which are inefficient',
        suggestion: 'Add appropriate indexes for filtered properties',
        expectedImprovement: 70,
        effort: 'low',
        autoFixable: true,
        autoFixQuery: this.generateIndexCreateStatement(query)
      });
    }

    // Check for excessive relationship scans
    if (metrics.relationshipScans > 0) {
      suggestions.push({
        type: 'index',
        severity: 'medium',
        title: 'Excessive Relationship Scans',
        description: 'Query is scanning many relationships unnecessarily',
        suggestion: 'Add relationship indexes or use USING INDEX hints',
        expectedImprovement: 50,
        effort: 'medium',
        autoFixable: false
      });
    }

    // Check for high db hits vs rows returned ratio
    const dbHitsPerRow = metrics.rowsReturned > 0 ? 
      this.getTotalDbHits(executionPlan) / metrics.rowsReturned : 0;
    
    if (dbHitsPerRow > 100) {
      suggestions.push({
        type: 'query_rewrite',
        severity: 'high',
        title: 'Inefficient Query Pattern',
        description: `Query requires ${Math.round(dbHitsPerRow)} db hits per returned row`,
        suggestion: 'Rewrite query to reduce unnecessary graph traversals',
        expectedImprovement: 60,
        effort: 'high',
        autoFixable: false
      });
    }

    // Check for cartesian products
    if (this.hasCartesianProduct(executionPlan)) {
      suggestions.push({
        type: 'query_rewrite',
        severity: 'critical',
        title: 'Cartesian Product Detected',
        description: 'Query contains cartesian product which exponentially increases result set',
        suggestion: 'Add explicit relationships between MATCH patterns',
        expectedImprovement: 90,
        effort: 'medium',
        autoFixable: false
      });
    }

    // Check for caching opportunities
    if (this.isCacheable(query) && !queryResultCache.shouldCache(query)) {
      suggestions.push({
        type: 'caching',
        severity: 'medium',
        title: 'Caching Opportunity',
        description: 'Query results could be cached to improve performance',
        suggestion: 'Enable result caching for this query pattern',
        expectedImprovement: 80,
        effort: 'low',
        autoFixable: true,
        autoFixQuery: '' // This would be handled by cache configuration
      });
    }

    // Check for ORDER BY without LIMIT
    if (query.toLowerCase().includes('order by') && !query.toLowerCase().includes('limit')) {
      suggestions.push({
        type: 'query_rewrite',
        severity: 'medium',
        title: 'ORDER BY without LIMIT',
        description: 'Sorting entire result set without limiting results',
        suggestion: 'Add LIMIT clause if you don\\'t need all results',
        expectedImprovement: 40,
        effort: 'low',
        autoFixable: false
      });
    }

    return suggestions.sort((a, b) => {
      // Sort by severity and expected improvement
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aSeverity = severityOrder[a.severity];
      const bSeverity = severityOrder[b.severity];
      
      if (aSeverity !== bSeverity) {
        return bSeverity - aSeverity;
      }
      
      return b.expectedImprovement - a.expectedImprovement;
    });
  }

  /**
   * Generate index recommendations based on query analysis
   */
  private generateIndexRecommendations(
    query: string,
    executionPlan: ExecutionPlan
  ): IndexRecommendation[] {
    const recommendations: IndexRecommendation[] = [];

    // Analyze query for potential composite indexes
    const filters = this.extractFilters(query);
    
    for (const filter of filters) {
      if (filter.properties.length > 1) {
        recommendations.push({
          indexType: 'composite',
          labels: [filter.label],
          properties: filter.properties,
          createStatement: `CREATE INDEX ${filter.label.toLowerCase()}_${filter.properties.join('_')} IF NOT EXISTS FOR (n:${filter.label}) ON (${filter.properties.map(p => `n.${p}`).join(', ')});`,
          estimatedSpeedImprovement: 70,
          estimatedSpaceOverhead: 15,
          priority: 'high'
        });
      }
    }

    // Check for range queries
    const rangeFilters = this.extractRangeFilters(query);
    
    for (const filter of rangeFilters) {
      recommendations.push({
        indexType: 'range',
        labels: [filter.label],
        properties: [filter.property],
        createStatement: `CREATE RANGE INDEX ${filter.label.toLowerCase()}_${filter.property}_range IF NOT EXISTS FOR (n:${filter.label}) ON (n.${filter.property});`,
        estimatedSpeedImprovement: 60,
        estimatedSpaceOverhead: 10,
        priority: 'medium'
      });
    }

    // Check for similarity searches
    if (query.toLowerCase().includes('vector.similarity')) {
      const vectorProperties = this.extractVectorProperties(query);
      
      for (const prop of vectorProperties) {
        recommendations.push({
          indexType: 'vector',
          labels: [prop.label],
          properties: [prop.property],
          createStatement: `CREATE VECTOR INDEX ${prop.label.toLowerCase()}_${prop.property}_vector IF NOT EXISTS FOR (n:${prop.label}) ON (n.${prop.property}) OPTIONS {indexConfig: {\\`vector.dimensions\\`: 384, \\`vector.similarity_function\\`: 'cosine'}};`,
          estimatedSpeedImprovement: 95,
          estimatedSpaceOverhead: 30,
          priority: 'high'
        });
      }
    }

    return recommendations;
  }

  /**
   * Helper methods for query analysis
   */
  private extractFilters(query: string): Array<{ label: string; properties: string[] }> {
    const filters: Array<{ label: string; properties: string[] }> = [];
    
    // Simple regex to extract WHERE clauses (this could be more sophisticated)
    const whereMatches = query.match(/WHERE\s+([^RETURN|ORDER|LIMIT]+)/gi);
    
    if (whereMatches) {
      for (const whereClause of whereMatches) {
        // Extract node.property patterns
        const propertyMatches = whereClause.match(/(\w+)\.(\w+)/g);
        
        if (propertyMatches) {
          const labelProperties = new Map<string, string[]>();
          
          for (const match of propertyMatches) {
            const [nodeVar, property] = match.split('.');
            
            // Find the label for this node variable
            const labelMatch = query.match(new RegExp(`\\(${nodeVar}:([\\w]+)\\)`));
            
            if (labelMatch) {
              const label = labelMatch[1];
              
              if (!labelProperties.has(label)) {
                labelProperties.set(label, []);
              }
              
              labelProperties.get(label)!.push(property);
            }
          }
          
          for (const [label, properties] of labelProperties) {
            filters.push({ label, properties: [...new Set(properties)] });
          }
        }
      }
    }
    
    return filters;
  }

  private extractRangeFilters(query: string): Array<{ label: string; property: string }> {
    const rangeFilters: Array<{ label: string; property: string }> = [];
    
    // Look for range operators
    const rangePatterns = [/>/, /</, />=/, /<=/, /BETWEEN/i];
    
    for (const pattern of rangePatterns) {
      if (pattern.test(query)) {
        // Extract the properties involved in range operations
        const matches = query.match(/(\w+)\.(\w+)\s*[<>=]/g);
        
        if (matches) {
          for (const match of matches) {
            const [nodeVar, property] = match.replace(/\s*[<>=].*/, '').split('.');
            
            // Find the label for this node variable
            const labelMatch = query.match(new RegExp(`\\(${nodeVar}:([\\w]+)\\)`));
            
            if (labelMatch) {
              rangeFilters.push({ label: labelMatch[1], property });
            }
          }
        }
        
        break;
      }
    }
    
    return rangeFilters;
  }

  private extractVectorProperties(query: string): Array<{ label: string; property: string }> {
    const vectorProps: Array<{ label: string; property: string }> = [];
    
    // Look for vector.similarity calls
    const vectorMatches = query.match(/vector\.similarity\.[^(]+\(([^,]+),/g);
    
    if (vectorMatches) {
      for (const match of vectorMatches) {
        const propertyMatch = match.match(/(\w+)\.(\w+)/);
        
        if (propertyMatch) {
          const [nodeVar, property] = propertyMatch;
          
          // Find the label for this node variable
          const labelMatch = query.match(new RegExp(`\\(${nodeVar.split('.')[0]}:([\\w]+)\\)`));
          
          if (labelMatch) {
            vectorProps.push({ label: labelMatch[1], property });
          }
        }
      }
    }
    
    return vectorProps;
  }

  // Additional helper methods
  private calculateOperatorCost(profile: any): number {
    const dbHits = profile.dbHits || 0;
    const rows = profile.rows || 0;
    const pageCacheMisses = profile.pageCacheMisses || 0;
    
    // Simple cost calculation based on db hits, rows, and cache misses
    return dbHits + (rows * 0.1) + (pageCacheMisses * 10);
  }

  private calculateMemoryUsage(profile: any): number {
    // Estimate memory usage based on rows and operator complexity
    return this.getTotalRows(profile) * 100; // Rough estimate: 100 bytes per row
  }

  private countPageReads(profile: any): number {
    return this.getTotalPageCacheHits(profile) + this.getTotalPageCacheMisses(profile);
  }

  private countOperatorType(profile: any, operatorType: string): number {
    if (!profile) return 0;
    
    let count = profile.operatorType === operatorType ? 1 : 0;
    
    if (profile.children) {
      for (const child of profile.children) {
        count += this.countOperatorType(child, operatorType);
      }
    }
    
    return count;
  }

  private getTotalDbHits(plan: ExecutionPlan): number {
    let total = plan.dbHits;
    
    for (const child of plan.children) {
      total += this.getTotalDbHits(child);
    }
    
    return total;
  }

  private getTotalRows(profile: any): number {
    if (!profile) return 0;
    
    let total = profile.rows || 0;
    
    if (profile.children) {
      for (const child of profile.children) {
        total += this.getTotalRows(child);
      }
    }
    
    return total;
  }

  private getTotalPageCacheHits(profile: any): number {
    if (!profile) return 0;
    
    let total = profile.pageCacheHits || 0;
    
    if (profile.children) {
      for (const child of profile.children) {
        total += this.getTotalPageCacheHits(child);
      }
    }
    
    return total;
  }

  private getTotalPageCacheMisses(profile: any): number {
    if (!profile) return 0;
    
    let total = profile.pageCacheMisses || 0;
    
    if (profile.children) {
      for (const child of profile.children) {
        total += this.getTotalPageCacheMisses(child);
      }
    }
    
    return total;
  }

  private hasCartesianProduct(plan: ExecutionPlan): boolean {
    if (plan.operatorType === 'CartesianProduct') {
      return true;
    }
    
    return plan.children.some(child => this.hasCartesianProduct(child));
  }

  private isCacheable(query: string): boolean {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Don't cache write operations
    const writeKeywords = ['create', 'merge', 'set', 'delete', 'remove', 'drop'];
    if (writeKeywords.some(keyword => normalizedQuery.startsWith(keyword))) {
      return false;
    }
    
    // Don't cache real-time sensitive queries
    if (normalizedQuery.includes('now()') || normalizedQuery.includes('datetime()')) {
      return false;
    }
    
    return true;
  }

  private generateIndexCreateStatement(query: string): string {
    // This is a simplified version - in practice, you'd analyze the query more thoroughly
    const filters = this.extractFilters(query);
    
    if (filters.length > 0) {
      const filter = filters[0]; // Take the first filter as an example
      
      if (filter.properties.length === 1) {
        return `CREATE INDEX ${filter.label.toLowerCase()}_${filter.properties[0]} IF NOT EXISTS FOR (n:${filter.label}) ON (n.${filter.properties[0]});`;
      } else if (filter.properties.length > 1) {
        return `CREATE INDEX ${filter.label.toLowerCase()}_${filter.properties.join('_')} IF NOT EXISTS FOR (n:${filter.label}) ON (${filter.properties.map(p => `n.${p}`).join(', ')});`;
      }
    }
    
    return '';
  }

  private addParameterHints(query: string): string {
    // Add USING hints to the query
    if (query.toLowerCase().includes('match') && query.toLowerCase().includes('where')) {
      // This is a simplified example - real implementation would be more sophisticated
      return query.replace(
        /WHERE\s+/i,
        'USING INDEX n:Label(property) WHERE '
      );
    }
    
    return query;
  }

  private applyQueryRewrite(query: string, suggestion: OptimizationSuggestion): string {
    // Apply specific query rewrites based on the suggestion
    // This would contain various query optimization patterns
    return query; // Placeholder - implement specific rewrites
  }

  private addIndexHints(query: string): string {
    // Add index hints to the query
    return query; // Placeholder - implement index hint addition
  }

  private calculateEstimatedImprovement(
    suggestions: OptimizationSuggestion[],
    indexRecommendations: IndexRecommendation[]
  ): number {
    let totalImprovement = 0;
    
    // Calculate weighted improvement based on suggestions
    for (const suggestion of suggestions) {
      const weight = suggestion.severity === 'critical' ? 1.0 :
                    suggestion.severity === 'high' ? 0.8 :
                    suggestion.severity === 'medium' ? 0.6 : 0.4;
      
      totalImprovement += suggestion.expectedImprovement * weight;
    }
    
    // Add index improvements
    for (const index of indexRecommendations) {
      const weight = index.priority === 'high' ? 0.8 :
                    index.priority === 'medium' ? 0.6 : 0.4;
      
      totalImprovement += index.estimatedSpeedImprovement * weight;
    }
    
    // Cap at 95% improvement (never promise 100%)
    return Math.min(95, Math.round(totalImprovement));
  }

  private generatePatternRecommendations(
    commonIssues: Array<{ issue: string; frequency: number; impact: string }>
  ): string[] {
    const recommendations: string[] = [];
    
    for (const issue of commonIssues.slice(0, 5)) {
      if (issue.frequency > 50 && issue.impact === 'high') {
        if (issue.issue.includes('index')) {
          recommendations.push(`Create missing indexes - affects ${Math.round(issue.frequency)}% of queries`);
        } else if (issue.issue.includes('scan')) {
          recommendations.push(`Optimize query patterns to avoid full scans - affects ${Math.round(issue.frequency)}% of queries`);
        } else if (issue.issue.includes('cartesian')) {
          recommendations.push(`Fix cartesian products in query patterns - critical performance issue`);
        }
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('No major pattern issues detected. Consider individual query optimizations.');
    }
    
    return recommendations;
  }

  private createEmptyExecutionPlan(): ExecutionPlan {
    return {
      operatorType: 'unknown',
      identifiers: [],
      arguments: {},
      children: [],
      rows: 0,
      dbHits: 0,
      pageCacheHits: 0,
      pageCacheMisses: 0,
      time: 0,
      cost: 0
    };
  }

  private sanitizeQuery(query: string): string {
    return query.replace(/(['"])(?:(?=(\\?))\\.|(?!\1)[^\\\r\n])*?\1/g, '$1***$1');
  }

  private sanitizeParameters(params: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && (
        key.toLowerCase().includes('password') ||
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('token')
      )) {
        sanitized[key] = '***';
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Get all profiled queries
   */
  public getProfiledQueries(): Map<string, QueryProfile> {
    return new Map(this.profiledQueries);
  }

  /**
   * Clear profiled queries
   */
  public clearProfiles(): void {
    this.profiledQueries.clear();
  }

  /**
   * Set slow query threshold
   */
  public setSlowQueryThreshold(threshold: number): void {
    this.slowQueryThreshold = threshold;
  }

  /**
   * Enable/disable profiling
   */
  public setProfilingEnabled(enabled: boolean): void {
    this.profilingEnabled = enabled;
  }
}

// Export singleton instance
export const slowQueryProfiler = new SlowQueryProfiler();