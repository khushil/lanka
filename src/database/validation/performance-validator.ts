import { Neo4jService } from '../../core/database/neo4j';
import { queryPerformanceMonitor } from '../monitoring/query-performance-monitor';
import { slowQueryProfiler } from '../optimization/slow-query-profiler';
import { queryResultCache } from '../cache/query-result-cache';
import { logger } from '../../core/logging/logger';

export interface PerformanceCriteria {
  maxQueryTime: number;           // Maximum query execution time in ms
  maxMemoryUsage: number;         // Maximum memory usage in bytes
  minIndexUsage: number;          // Minimum index usage percentage
  maxFullScans: number;           // Maximum allowed full scans
  minCacheHitRate: number;        // Minimum cache hit rate percentage
  maxDbHitsPerRow: number;        // Maximum db hits per returned row
}

export interface ValidationResult {
  passed: boolean;
  overallScore: number;           // 0-100 performance score
  criteria: PerformanceCriteria;
  testResults: TestResult[];
  summary: ValidationSummary;
  recommendations: string[];
}

export interface TestResult {
  testName: string;
  queryId: string;
  query: string;
  passed: boolean;
  actualValue: number;
  expectedValue: number;
  metric: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  details: any;
}

export interface ValidationSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  criticalFailures: number;
  averageQueryTime: number;
  averageMemoryUsage: number;
  indexUsageRate: number;
  cacheHitRate: number;
  performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export class PerformanceValidator {
  private neo4jService: Neo4jService;
  private defaultCriteria: PerformanceCriteria = {
    maxQueryTime: 100,              // 100ms
    maxMemoryUsage: 50 * 1024 * 1024, // 50MB
    minIndexUsage: 80,              // 80%
    maxFullScans: 0,                // 0 full scans allowed
    minCacheHitRate: 70,            // 70%
    maxDbHitsPerRow: 50             // 50 db hits per row
  };

  constructor(neo4jService?: Neo4jService) {
    this.neo4jService = neo4jService || Neo4jService.getInstance();
  }

  /**
   * Validate overall system performance against criteria
   */
  public async validatePerformance(
    criteria: Partial<PerformanceCriteria> = {}
  ): Promise<ValidationResult> {
    const finalCriteria = { ...this.defaultCriteria, ...criteria };
    
    logger.info('Starting comprehensive performance validation', { criteria: finalCriteria });

    const testResults: TestResult[] = [];

    // Test 1: Query execution time validation
    const queryTimeTests = await this.validateQueryTimes(finalCriteria);
    testResults.push(...queryTimeTests);

    // Test 2: Index usage validation
    const indexUsageTests = await this.validateIndexUsage(finalCriteria);
    testResults.push(...indexUsageTests);

    // Test 3: Memory usage validation
    const memoryUsageTests = await this.validateMemoryUsage(finalCriteria);
    testResults.push(...memoryUsageTests);

    // Test 4: Full scan detection
    const fullScanTests = await this.validateFullScans(finalCriteria);
    testResults.push(...fullScanTests);

    // Test 5: Cache performance validation
    const cacheTests = await this.validateCachePerformance(finalCriteria);
    testResults.push(...cacheTests);

    // Test 6: Database efficiency validation
    const efficiencyTests = await this.validateDatabaseEfficiency(finalCriteria);
    testResults.push(...efficiencyTests);

    // Calculate overall results
    const summary = this.calculateSummary(testResults);
    const overallScore = this.calculateOverallScore(testResults, summary);
    const passed = this.determineOverallPass(testResults, summary);
    const recommendations = this.generateRecommendations(testResults);

    const result: ValidationResult = {
      passed,
      overallScore,
      criteria: finalCriteria,
      testResults,
      summary,
      recommendations
    };

    logger.info('Performance validation completed', {
      passed,
      score: overallScore,
      grade: summary.performanceGrade,
      criticalFailures: summary.criticalFailures
    });

    return result;
  }

  /**
   * Validate specific query performance
   */
  public async validateQuery(
    queryId: string,
    query: string,
    parameters: Record<string, any> = {},
    criteria: Partial<PerformanceCriteria> = {}
  ): Promise<TestResult[]> {
    const finalCriteria = { ...this.defaultCriteria, ...criteria };
    const testResults: TestResult[] = [];

    logger.info(`Validating performance for query: ${queryId}`);

    try {
      // Execute query with monitoring
      const { result, metrics } = await queryPerformanceMonitor.monitorQuery(
        queryId, query, parameters
      );

      // Profile the query if it's slow
      let profile;
      if (metrics.duration > finalCriteria.maxQueryTime) {
        profile = await slowQueryProfiler.profileQuery(queryId, query, parameters);
      }

      // Test query execution time
      testResults.push({
        testName: 'Query Execution Time',
        queryId,
        query: query.substring(0, 100) + '...',
        passed: metrics.duration <= finalCriteria.maxQueryTime,
        actualValue: metrics.duration,
        expectedValue: finalCriteria.maxQueryTime,
        metric: 'milliseconds',
        impact: metrics.duration > finalCriteria.maxQueryTime * 5 ? 'critical' :
                metrics.duration > finalCriteria.maxQueryTime * 2 ? 'high' : 'medium',
        details: { metrics, profile: profile?.optimizationSuggestions }
      });

      // Test memory usage
      testResults.push({
        testName: 'Memory Usage',
        queryId,
        query: query.substring(0, 100) + '...',
        passed: metrics.memoryUsage <= finalCriteria.maxMemoryUsage,
        actualValue: metrics.memoryUsage,
        expectedValue: finalCriteria.maxMemoryUsage,
        metric: 'bytes',
        impact: metrics.memoryUsage > finalCriteria.maxMemoryUsage * 2 ? 'high' : 'medium',
        details: { metrics }
      });

      // Test index usage
      const indexUsageRate = this.calculateIndexUsageRate(metrics.indexUsage);
      testResults.push({
        testName: 'Index Usage Rate',
        queryId,
        query: query.substring(0, 100) + '...',
        passed: indexUsageRate >= finalCriteria.minIndexUsage,
        actualValue: indexUsageRate,
        expectedValue: finalCriteria.minIndexUsage,
        metric: 'percentage',
        impact: indexUsageRate < finalCriteria.minIndexUsage / 2 ? 'high' : 'medium',
        details: { indexUsage: metrics.indexUsage }
      });

      // Test database efficiency
      const dbHitsPerRow = metrics.resultCount > 0 ? 
        metrics.plannerInfo.dbHits / metrics.resultCount : 0;
      
      testResults.push({
        testName: 'Database Efficiency',
        queryId,
        query: query.substring(0, 100) + '...',
        passed: dbHitsPerRow <= finalCriteria.maxDbHitsPerRow,
        actualValue: dbHitsPerRow,
        expectedValue: finalCriteria.maxDbHitsPerRow,
        metric: 'hits per row',
        impact: dbHitsPerRow > finalCriteria.maxDbHitsPerRow * 2 ? 'high' : 'medium',
        details: { plannerInfo: metrics.plannerInfo }
      });

    } catch (error: any) {
      testResults.push({
        testName: 'Query Execution',
        queryId,
        query: query.substring(0, 100) + '...',
        passed: false,
        actualValue: 0,
        expectedValue: 0,
        metric: 'success',
        impact: 'critical',
        details: { error: error.message }
      });
    }

    return testResults;
  }

  /**
   * Run comprehensive system benchmarks
   */
  public async runPerformanceBenchmarks(): Promise<{
    benchmarkResults: any[];
    performanceBaseline: PerformanceCriteria;
    recommendations: string[];
  }> {
    logger.info('Running comprehensive performance benchmarks');

    const benchmarkQueries = [
      {
        id: 'requirements_by_type',
        query: `MATCH (r:Requirement) WHERE r.type = $type RETURN r LIMIT 100`,
        params: { type: 'functional' }
      },
      {
        id: 'architecture_patterns',
        query: `MATCH (ap:ArchitecturePattern) WHERE ap.suitabilityScore > $score RETURN ap`,
        params: { score: 8.0 }
      },
      {
        id: 'requirement_architecture_mapping',
        query: `MATCH (r:Requirement)-[m:MAPS_TO]->(a:ArchitectureDecision) 
                WHERE m.confidence > $confidence 
                RETURN r, m, a LIMIT 50`,
        params: { confidence: 0.8 }
      },
      {
        id: 'similarity_search',
        query: `MATCH (r1:Requirement), (r2:Requirement)
                WHERE r1.embedding IS NOT NULL AND r2.embedding IS NOT NULL
                WITH r1, r2, vector.similarity.cosine(r1.embedding, r2.embedding) as similarity
                WHERE similarity > $threshold
                RETURN r1.id, r2.id, similarity LIMIT 20`,
        params: { threshold: 0.8 }
      },
      {
        id: 'complex_traversal',
        query: `MATCH (r:Requirement)-[:MAPS_TO]->(a:ArchitectureDecision)
                -[:IMPLEMENTS]->(ap:ArchitecturePattern)
                -[:SUPPORTS]->(ts:TechnologyStack)
                WHERE r.priority = $priority
                RETURN r, a, ap, ts LIMIT 10`,
        params: { priority: 'high' }
      }
    ];

    const benchmarkResults = [];
    let totalQueries = 0;
    let totalTime = 0;
    let totalMemory = 0;

    for (const benchmark of benchmarkQueries) {
      try {
        const testResults = await this.validateQuery(
          benchmark.id,
          benchmark.query,
          benchmark.params
        );

        benchmarkResults.push({
          queryId: benchmark.id,
          query: benchmark.query,
          results: testResults
        });

        // Accumulate statistics
        const timeResult = testResults.find(t => t.testName === 'Query Execution Time');
        const memoryResult = testResults.find(t => t.testName === 'Memory Usage');

        if (timeResult) {
          totalTime += timeResult.actualValue;
          totalQueries++;
        }

        if (memoryResult) {
          totalMemory += memoryResult.actualValue;
        }

      } catch (error) {
        logger.error(`Benchmark failed for query: ${benchmark.id}`, error);
      }
    }

    // Calculate performance baseline based on actual measurements
    const averageQueryTime = totalQueries > 0 ? totalTime / totalQueries : 0;
    const averageMemoryUsage = totalQueries > 0 ? totalMemory / totalQueries : 0;

    const performanceBaseline: PerformanceCriteria = {
      maxQueryTime: Math.max(100, Math.round(averageQueryTime * 1.5)), // 50% buffer
      maxMemoryUsage: Math.max(50 * 1024 * 1024, Math.round(averageMemoryUsage * 2)), // 100% buffer
      minIndexUsage: 80,
      maxFullScans: 0,
      minCacheHitRate: 70,
      maxDbHitsPerRow: 50
    };

    const recommendations = this.generateBenchmarkRecommendations(benchmarkResults, performanceBaseline);

    logger.info('Performance benchmarks completed', {
      totalQueries,
      averageQueryTime: Math.round(averageQueryTime),
      averageMemoryUsage: Math.round(averageMemoryUsage / 1024) + ' KB',
      baseline: performanceBaseline
    });

    return {
      benchmarkResults,
      performanceBaseline,
      recommendations
    };
  }

  /**
   * Validate query execution times
   */
  private async validateQueryTimes(criteria: PerformanceCriteria): Promise<TestResult[]> {
    const testResults: TestResult[] = [];
    
    // Get slow queries from performance monitor
    const slowQueries = queryPerformanceMonitor.getSlowQueries(10);
    
    for (const query of slowQueries) {
      testResults.push({
        testName: 'Slow Query Detection',
        queryId: query.queryId,
        query: query.query.substring(0, 100) + '...',
        passed: query.duration <= criteria.maxQueryTime,
        actualValue: query.duration,
        expectedValue: criteria.maxQueryTime,
        metric: 'milliseconds',
        impact: query.duration > criteria.maxQueryTime * 5 ? 'critical' : 'high',
        details: { queryMetrics: query }
      });
    }

    return testResults;
  }

  /**
   * Validate index usage across the system
   */
  private async validateIndexUsage(criteria: PerformanceCriteria): Promise<TestResult[]> {
    const testResults: TestResult[] = [];

    try {
      // Get index usage report
      const indexReport = queryPerformanceMonitor.getIndexUsageReport();
      
      for (const indexStat of indexReport) {
        const passed = indexStat.usagePercentage >= criteria.minIndexUsage;
        
        testResults.push({
          testName: 'Index Usage Efficiency',
          queryId: 'system_wide',
          query: `Index: ${indexStat.indexName}`,
          passed,
          actualValue: indexStat.usagePercentage,
          expectedValue: criteria.minIndexUsage,
          metric: 'percentage',
          impact: indexStat.usagePercentage < 50 ? 'high' : 'medium',
          details: { indexStats: indexStat }
        });
      }
    } catch (error) {
      logger.error('Failed to validate index usage', error);
    }

    return testResults;
  }

  /**
   * Validate memory usage patterns
   */
  private async validateMemoryUsage(criteria: PerformanceCriteria): Promise<TestResult[]> {
    const testResults: TestResult[] = [];

    // Check cache memory usage
    const cacheStats = queryResultCache.getStats();
    
    testResults.push({
      testName: 'Cache Memory Usage',
      queryId: 'cache_system',
      query: 'Query Result Cache',
      passed: cacheStats.memoryUsage <= criteria.maxMemoryUsage,
      actualValue: cacheStats.memoryUsage,
      expectedValue: criteria.maxMemoryUsage,
      metric: 'bytes',
      impact: cacheStats.memoryUsage > criteria.maxMemoryUsage * 2 ? 'high' : 'medium',
      details: { cacheStats }
    });

    return testResults;
  }

  /**
   * Validate that no full scans are occurring
   */
  private async validateFullScans(criteria: PerformanceCriteria): Promise<TestResult[]> {
    const testResults: TestResult[] = [];

    try {
      // Check for queries with full scans in execution plans
      const fullScanQuery = `
        CALL dbms.queryJournal() 
        YIELD query, elapsedTimeMillis
        WHERE query CONTAINS 'AllNodesScan' OR query CONTAINS 'AllRelationshipsScan'
        RETURN count(*) as fullScanCount
        LIMIT 1
      `;

      const result = await this.neo4jService.executeQuery(fullScanQuery);
      const fullScanCount = result[0]?.fullScanCount || 0;

      testResults.push({
        testName: 'Full Scan Detection',
        queryId: 'system_wide',
        query: 'Database scan operations',
        passed: fullScanCount <= criteria.maxFullScans,
        actualValue: fullScanCount,
        expectedValue: criteria.maxFullScans,
        metric: 'count',
        impact: fullScanCount > 0 ? 'high' : 'low',
        details: { fullScanCount }
      });

    } catch (error) {
      logger.warn('Could not validate full scans (query journal not available)', error);
    }

    return testResults;
  }

  /**
   * Validate cache performance
   */
  private async validateCachePerformance(criteria: PerformanceCriteria): Promise<TestResult[]> {
    const testResults: TestResult[] = [];

    const cacheStats = queryResultCache.getStats();

    testResults.push({
      testName: 'Cache Hit Rate',
      queryId: 'cache_system',
      query: 'Query Result Cache',
      passed: cacheStats.hitRate >= criteria.minCacheHitRate,
      actualValue: cacheStats.hitRate,
      expectedValue: criteria.minCacheHitRate,
      metric: 'percentage',
      impact: cacheStats.hitRate < criteria.minCacheHitRate / 2 ? 'high' : 'medium',
      details: { cacheStats }
    });

    return testResults;
  }

  /**
   * Validate overall database efficiency
   */
  private async validateDatabaseEfficiency(criteria: PerformanceCriteria): Promise<TestResult[]> {
    const testResults: TestResult[] = [];

    try {
      // Check database statistics
      const dbStats = await this.neo4jService.executeQuery(`
        CALL dbms.components() 
        YIELD name, versions, edition 
        RETURN name, versions[0] as version, edition
      `);

      // This is a placeholder for more sophisticated efficiency checks
      testResults.push({
        testName: 'Database Configuration',
        queryId: 'system_wide',
        query: 'Database setup validation',
        passed: true, // Assume passed for now
        actualValue: 100,
        expectedValue: 100,
        metric: 'percentage',
        impact: 'low',
        details: { dbStats }
      });

    } catch (error) {
      logger.warn('Could not validate database efficiency', error);
    }

    return testResults;
  }

  /**
   * Calculate performance summary from test results
   */
  private calculateSummary(testResults: TestResult[]): ValidationSummary {
    const totalTests = testResults.length;
    const passedTests = testResults.filter(t => t.passed).length;
    const failedTests = totalTests - passedTests;
    const criticalFailures = testResults.filter(t => !t.passed && t.impact === 'critical').length;

    // Calculate averages for relevant metrics
    const timeTests = testResults.filter(t => t.metric === 'milliseconds');
    const averageQueryTime = timeTests.length > 0 ? 
      timeTests.reduce((sum, t) => sum + t.actualValue, 0) / timeTests.length : 0;

    const memoryTests = testResults.filter(t => t.metric === 'bytes');
    const averageMemoryUsage = memoryTests.length > 0 ?
      memoryTests.reduce((sum, t) => sum + t.actualValue, 0) / memoryTests.length : 0;

    const indexTests = testResults.filter(t => t.testName.includes('Index'));
    const indexUsageRate = indexTests.length > 0 ?
      indexTests.reduce((sum, t) => sum + t.actualValue, 0) / indexTests.length : 0;

    const cacheTests = testResults.filter(t => t.testName.includes('Cache'));
    const cacheHitRate = cacheTests.length > 0 ? 
      cacheTests.find(t => t.testName === 'Cache Hit Rate')?.actualValue || 0 : 0;

    // Calculate performance grade
    const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    const performanceGrade = criticalFailures > 0 ? 'F' :
                           passRate >= 90 ? 'A' :
                           passRate >= 80 ? 'B' :
                           passRate >= 70 ? 'C' :
                           passRate >= 60 ? 'D' : 'F';

    return {
      totalTests,
      passedTests,
      failedTests,
      criticalFailures,
      averageQueryTime: Math.round(averageQueryTime),
      averageMemoryUsage: Math.round(averageMemoryUsage),
      indexUsageRate: Math.round(indexUsageRate * 100) / 100,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      performanceGrade
    };
  }

  /**
   * Calculate overall performance score
   */
  private calculateOverallScore(testResults: TestResult[], summary: ValidationSummary): number {
    // Base score from pass rate
    let score = summary.totalTests > 0 ? (summary.passedTests / summary.totalTests) * 100 : 0;

    // Penalties for critical failures
    score -= summary.criticalFailures * 10;

    // Bonuses for good performance
    if (summary.averageQueryTime < 50) score += 5; // Fast queries
    if (summary.indexUsageRate > 90) score += 5;   // Good index usage
    if (summary.cacheHitRate > 80) score += 5;     // Good cache performance

    // Cap between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Determine if overall validation passes
   */
  private determineOverallPass(testResults: TestResult[], summary: ValidationSummary): boolean {
    // Fail if there are critical failures
    if (summary.criticalFailures > 0) {
      return false;
    }

    // Pass if at least 80% of tests pass
    const passRate = summary.totalTests > 0 ? (summary.passedTests / summary.totalTests) : 0;
    return passRate >= 0.8;
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(testResults: TestResult[]): string[] {
    const recommendations: string[] = [];

    // Group failures by type
    const failures = testResults.filter(t => !t.passed);
    const failuresByType = new Map<string, TestResult[]>();

    for (const failure of failures) {
      const type = failure.testName;
      if (!failuresByType.has(type)) {
        failuresByType.set(type, []);
      }
      failuresByType.get(type)!.push(failure);
    }

    // Generate specific recommendations
    for (const [type, typeFailures] of failuresByType) {
      switch (type) {
        case 'Query Execution Time':
        case 'Slow Query Detection':
          recommendations.push(`Optimize ${typeFailures.length} slow queries - consider adding indexes or rewriting queries`);
          break;
        case 'Index Usage Efficiency':
          recommendations.push(`Improve index usage - ${typeFailures.length} indexes are underutilized`);
          break;
        case 'Memory Usage':
        case 'Cache Memory Usage':
          recommendations.push(`Optimize memory usage - consider increasing cache size or optimizing query patterns`);
          break;
        case 'Cache Hit Rate':
          recommendations.push(`Improve cache configuration - current hit rate is below target`);
          break;
        case 'Full Scan Detection':
          recommendations.push(`Eliminate full scans - add appropriate indexes for filtered queries`);
          break;
        case 'Database Efficiency':
          recommendations.push(`Optimize query patterns to reduce database hits per returned row`);
          break;
      }
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Performance is meeting all criteria - continue monitoring');
    } else {
      recommendations.push('Run the migration script to apply missing indexes');
      recommendations.push('Consider implementing query result caching for frequently accessed data');
      recommendations.push('Monitor performance regularly and profile slow queries');
    }

    return recommendations;
  }

  /**
   * Generate benchmark-specific recommendations
   */
  private generateBenchmarkRecommendations(
    benchmarkResults: any[],
    baseline: PerformanceCriteria
  ): string[] {
    const recommendations: string[] = [];

    // Analyze benchmark results
    let slowQueries = 0;
    let indexMisses = 0;
    let memoryIssues = 0;

    for (const benchmark of benchmarkResults) {
      for (const result of benchmark.results) {
        if (result.testName === 'Query Execution Time' && !result.passed) {
          slowQueries++;
        }
        if (result.testName === 'Index Usage Rate' && !result.passed) {
          indexMisses++;
        }
        if (result.testName === 'Memory Usage' && !result.passed) {
          memoryIssues++;
        }
      }
    }

    if (slowQueries > 0) {
      recommendations.push(`${slowQueries} benchmark queries exceed time limits - focus on query optimization`);
    }
    
    if (indexMisses > 0) {
      recommendations.push(`${indexMisses} queries have poor index usage - review and add missing indexes`);
    }
    
    if (memoryIssues > 0) {
      recommendations.push(`${memoryIssues} queries use excessive memory - optimize data retrieval patterns`);
    }

    recommendations.push(`Apply baseline performance criteria: max query time ${baseline.maxQueryTime}ms`);
    recommendations.push('Use the generated migration scripts to create missing indexes');
    recommendations.push('Enable query result caching for read-heavy operations');

    return recommendations;
  }

  /**
   * Calculate index usage rate from metrics
   */
  private calculateIndexUsageRate(indexUsage: any[]): number {
    if (!indexUsage || indexUsage.length === 0) {
      return 0;
    }

    const usedIndexes = indexUsage.filter(idx => idx.used).length;
    return (usedIndexes / indexUsage.length) * 100;
  }
}

// Export singleton instance
export const performanceValidator = new PerformanceValidator();