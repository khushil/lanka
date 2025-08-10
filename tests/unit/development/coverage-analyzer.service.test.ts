/**
 * Coverage Analyzer Service Unit Tests
 * Tests for test coverage analysis and gap detection
 */

import { CoverageAnalyzerService } from '../../../src/modules/development/services/coverage-analyzer.service';
import { Neo4jService } from '../../../src/core/database/neo4j';
import {
  CoverageData,
  CoverageGap,
  CoverageThreshold,
  Priority,
  TestSuite
} from '../../../src/modules/development/types/development.types';

jest.mock('../../../src/core/database/neo4j');
jest.mock('../../../src/core/logging/logger');

describe('CoverageAnalyzerService', () => {
  let service: CoverageAnalyzerService;
  let mockNeo4j: jest.Mocked<Neo4jService>;

  beforeEach(() => {
    mockNeo4j = {
      getSession: jest.fn(),
      executeQuery: jest.fn().mockResolvedValue([]),
      executeTransaction: jest.fn(),
      initializeSchema: jest.fn(),
      close: jest.fn(),
    } as unknown as jest.Mocked<Neo4jService>;

    service = new CoverageAnalyzerService(mockNeo4j);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeCoverage', () => {
    const mockCoverageData: CoverageData = {
      statements: { total: 100, covered: 85, percentage: 85 },
      branches: { total: 50, covered: 40, percentage: 80 },
      functions: { total: 20, covered: 18, percentage: 90 },
      lines: { total: 95, covered: 82, percentage: 86.32 },
      overall: 85.33,
      uncoveredLines: [15, 23, 45, 67, 89],
      uncoveredBranches: ['if-branch-1', 'else-branch-2', 'switch-case-3'],
      timestamp: new Date()
    };

    it('should analyze coverage data and identify gaps', async () => {
      const result = await service.analyzeCoverage(mockCoverageData, {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90
      });

      expect(result).toBeDefined();
      expect(result.gaps).toBeDefined();
      expect(result.gaps.length).toBeGreaterThan(0);
      expect(result.summary).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should identify critical coverage gaps', async () => {
      const poorCoverage: CoverageData = {
        statements: { total: 100, covered: 40, percentage: 40 },
        branches: { total: 50, covered: 15, percentage: 30 },
        functions: { total: 20, covered: 10, percentage: 50 },
        lines: { total: 95, covered: 35, percentage: 36.84 },
        overall: 39,
        uncoveredLines: [1, 2, 3, 5, 8, 13, 21, 34, 55, 89],
        uncoveredBranches: ['main-if', 'error-handling', 'edge-case'],
        timestamp: new Date()
      };

      const result = await service.analyzeCoverage(poorCoverage, {
        statements: 80,
        branches: 75,
        functions: 85,
        lines: 80
      });

      const criticalGaps = result.gaps.filter(gap => gap.priority === Priority.CRITICAL);
      expect(criticalGaps.length).toBeGreaterThan(0);
      expect(result.summary.status).toBe('POOR');
    });

    it('should handle perfect coverage', async () => {
      const perfectCoverage: CoverageData = {
        statements: { total: 100, covered: 100, percentage: 100 },
        branches: { total: 50, covered: 50, percentage: 100 },
        functions: { total: 20, covered: 20, percentage: 100 },
        lines: { total: 95, covered: 95, percentage: 100 },
        overall: 100,
        uncoveredLines: [],
        uncoveredBranches: [],
        timestamp: new Date()
      };

      const result = await service.analyzeCoverage(perfectCoverage, {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90
      });

      expect(result.gaps).toHaveLength(0);
      expect(result.summary.status).toBe('EXCELLENT');
      expect(result.recommendations).toContain('Maintain current coverage levels');
    });
  });

  describe('identifyUncoveredPaths', () => {
    it('should identify uncovered code paths from source', async () => {
      const sourceCode = `
        function processUser(user: any) {
          if (!user) {
            throw new Error('User is required');
          }
          
          if (user.age < 18) {
            return { status: 'minor', message: 'Access denied' };
          } else if (user.age >= 65) {
            return { status: 'senior', discount: 0.1 };
          } else {
            return { status: 'adult' };
          }
          
          // Dead code - never reached
          console.log('This should not execute');
        }
      `;

      const existingTests = [
        'expect(processUser({age: 25})).toEqual({status: "adult"})',
      ];

      const result = await service.identifyUncoveredPaths(sourceCode, existingTests);

      expect(result).toBeDefined();
      expect(result.uncoveredPaths).toBeDefined();
      expect(result.uncoveredPaths.length).toBeGreaterThan(0);
      
      const errorPath = result.uncoveredPaths.find(path => path.type === 'ERROR_HANDLING');
      const seniorPath = result.uncoveredPaths.find(path => path.description.includes('senior'));
      
      expect(errorPath).toBeDefined();
      expect(seniorPath).toBeDefined();
    });

    it('should detect dead code', async () => {
      const sourceCode = `
        function example() {
          return true;
          console.log('Dead code');
        }
      `;

      const result = await service.identifyUncoveredPaths(sourceCode, []);

      const deadCodePath = result.uncoveredPaths.find(path => 
        path.type === 'DEAD_CODE'
      );
      expect(deadCodePath).toBeDefined();
    });
  });

  describe('analyzeBranchCoverage', () => {
    it('should analyze branch coverage in detail', async () => {
      const sourceCode = `
        function validateInput(input: any) {
          if (!input) return false;
          if (typeof input === 'string' && input.length > 0) return true;
          if (Array.isArray(input) && input.length > 0) return true;
          if (typeof input === 'object' && Object.keys(input).length > 0) return true;
          return false;
        }
      `;

      const testCoverage = {
        coveredBranches: ['input-check', 'string-type'],
        uncoveredBranches: ['array-check', 'object-check', 'default-return']
      };

      const result = await service.analyzeBranchCoverage(sourceCode, testCoverage);

      expect(result).toBeDefined();
      expect(result.totalBranches).toBe(5);
      expect(result.coveredBranches).toBe(2);
      expect(result.uncoveredBranches).toBe(3);
      expect(result.branchCoveragePercentage).toBe(40);
      expect(result.missingBranches).toHaveLength(3);
    });

    it('should handle nested conditions', async () => {
      const sourceCode = `
        function complexCondition(a: number, b: number, c: string) {
          if (a > 0) {
            if (b > 0) {
              if (c === 'valid') {
                return 'all-positive-valid';
              } else {
                return 'all-positive-invalid';
              }
            } else {
              return 'a-positive-b-negative';
            }
          } else {
            if (b > 0) {
              return 'a-negative-b-positive';
            } else {
              return 'both-negative';
            }
          }
        }
      `;

      const result = await service.analyzeBranchCoverage(sourceCode, {
        coveredBranches: ['a>0-true', 'b>0-true'],
        uncoveredBranches: ['a>0-false', 'b>0-false', 'c=valid-true', 'c=valid-false']
      });

      expect(result.totalBranches).toBeGreaterThan(4);
      expect(result.missingBranches.length).toBeGreaterThan(0);
    });
  });

  describe('calculateCoverageMetrics', () => {
    it('should calculate comprehensive coverage metrics', async () => {
      const coverageData: CoverageData = {
        statements: { total: 150, covered: 120, percentage: 80 },
        branches: { total: 80, covered: 60, percentage: 75 },
        functions: { total: 30, covered: 25, percentage: 83.33 },
        lines: { total: 140, covered: 115, percentage: 82.14 },
        overall: 80,
        uncoveredLines: Array.from({length: 25}, (_, i) => i + 1),
        uncoveredBranches: Array.from({length: 20}, (_, i) => `branch-${i}`),
        timestamp: new Date()
      };

      const result = await service.calculateCoverageMetrics(coverageData);

      expect(result).toBeDefined();
      expect(result.weightedScore).toBeGreaterThan(0);
      expect(result.weightedScore).toBeLessThanOrEqual(100);
      expect(result.qualityGrade).toBeDefined();
      expect(result.improvementAreas).toBeDefined();
      expect(result.strengths).toBeDefined();
    });

    it('should assign appropriate quality grades', async () => {
      const excellentCoverage: CoverageData = {
        statements: { total: 100, covered: 95, percentage: 95 },
        branches: { total: 50, covered: 48, percentage: 96 },
        functions: { total: 20, covered: 20, percentage: 100 },
        lines: { total: 95, covered: 93, percentage: 97.89 },
        overall: 97,
        uncoveredLines: [15, 67],
        uncoveredBranches: ['edge-case-1', 'error-branch-2'],
        timestamp: new Date()
      };

      const result = await service.calculateCoverageMetrics(excellentCoverage);
      expect(result.qualityGrade).toBe('A');

      const poorCoverage: CoverageData = {
        statements: { total: 100, covered: 45, percentage: 45 },
        branches: { total: 50, covered: 20, percentage: 40 },
        functions: { total: 20, covered: 8, percentage: 40 },
        lines: { total: 95, covered: 40, percentage: 42.11 },
        overall: 42,
        uncoveredLines: Array.from({length: 55}, (_, i) => i + 1),
        uncoveredBranches: Array.from({length: 30}, (_, i) => `branch-${i}`),
        timestamp: new Date()
      };

      const poorResult = await service.calculateCoverageMetrics(poorCoverage);
      expect(poorResult.qualityGrade).toBe('F');
    });
  });

  describe('generateCoverageReport', () => {
    it('should generate comprehensive coverage report', async () => {
      const testSuiteId = 'suite-123';
      
      mockNeo4j.query.mockResolvedValueOnce([{
        suite: {
          id: testSuiteId,
          name: 'User Service Tests',
          coverage: {
            statements: { total: 100, covered: 85, percentage: 85 },
            branches: { total: 50, covered: 42, percentage: 84 },
            functions: { total: 20, covered: 19, percentage: 95 },
            lines: { total: 95, covered: 81, percentage: 85.26 },
            overall: 87.3,
            uncoveredLines: [15, 23, 45],
            uncoveredBranches: ['error-handling', 'edge-case'],
            timestamp: new Date()
          }
        },
        testCases: [
          { id: 'test-1', name: 'should create user', coverage: 90 },
          { id: 'test-2', name: 'should update user', coverage: 85 }
        ]
      }]);

      const result = await service.generateCoverageReport(testSuiteId);

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.gaps).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.testCaseContributions).toBeDefined();
      expect(result.trendAnalysis).toBeDefined();
    });

    it('should include actionable recommendations', async () => {
      const testSuiteId = 'suite-456';
      
      mockNeo4j.query.mockResolvedValue([{
        suite: {
          coverage: {
            statements: { percentage: 60 },
            branches: { percentage: 45 },
            functions: { percentage: 80 },
            lines: { percentage: 65 },
            overall: 62.5,
            uncoveredBranches: ['error-handling', 'validation', 'edge-cases']
          }
        }
      }]);

      const result = await service.generateCoverageReport(testSuiteId);

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
      
      const errorHandlingRec = result.recommendations.find(rec => 
        rec.toLowerCase().includes('error')
      );
      expect(errorHandlingRec).toBeDefined();
    });
  });

  describe('trackCoverageTrends', () => {
    it('should track coverage trends over time', async () => {
      const testSuiteId = 'suite-789';
      
      mockNeo4j.query.mockResolvedValue([
        { timestamp: new Date('2024-01-01'), overall: 75, statements: 80, branches: 70 },
        { timestamp: new Date('2024-01-02'), overall: 78, statements: 82, branches: 74 },
        { timestamp: new Date('2024-01-03'), overall: 81, statements: 85, branches: 77 },
        { timestamp: new Date('2024-01-04'), overall: 83, statements: 87, branches: 79 },
        { timestamp: new Date('2024-01-05'), overall: 85, statements: 89, branches: 81 }
      ]);

      const result = await service.trackCoverageTrends(testSuiteId, 7);

      expect(result).toBeDefined();
      expect(result.trend).toBe('IMPROVING');
      expect(result.changePercentage).toBeGreaterThan(0);
      expect(result.dataPoints).toHaveLength(5);
      expect(result.predictions).toBeDefined();
    });

    it('should detect declining coverage trends', async () => {
      mockNeo4j.query.mockResolvedValue([
        { timestamp: new Date('2024-01-01'), overall: 85, statements: 90, branches: 80 },
        { timestamp: new Date('2024-01-02'), overall: 82, statements: 87, branches: 77 },
        { timestamp: new Date('2024-01-03'), overall: 79, statements: 84, branches: 74 },
        { timestamp: new Date('2024-01-04'), overall: 76, statements: 81, branches: 71 },
        { timestamp: new Date('2024-01-05'), overall: 73, statements: 78, branches: 68 }
      ]);

      const result = await service.trackCoverageTrends('declining-suite', 7);

      expect(result.trend).toBe('DECLINING');
      expect(result.changePercentage).toBeLessThan(0);
      expect(result.alerts).toBeDefined();
      expect(result.alerts.length).toBeGreaterThan(0);
    });
  });

  describe('optimizeCoverageStrategy', () => {
    it('should suggest coverage optimization strategies', async () => {
      const currentCoverage: CoverageData = {
        statements: { total: 200, covered: 140, percentage: 70 },
        branches: { total: 100, covered: 60, percentage: 60 },
        functions: { total: 40, covered: 32, percentage: 80 },
        lines: { total: 180, covered: 126, percentage: 70 },
        overall: 70,
        uncoveredLines: Array.from({length: 54}, (_, i) => i + 10),
        uncoveredBranches: Array.from({length: 40}, (_, i) => `branch-${i}`),
        timestamp: new Date()
      };

      const targetThreshold: CoverageThreshold = {
        statements: 85,
        branches: 80,
        functions: 90,
        lines: 85
      };

      const result = await service.optimizeCoverageStrategy(currentCoverage, targetThreshold);

      expect(result).toBeDefined();
      expect(result.strategies).toBeDefined();
      expect(result.strategies.length).toBeGreaterThan(0);
      expect(result.prioritizedAreas).toBeDefined();
      expect(result.estimatedEffort).toBeDefined();
      expect(result.expectedImpact).toBeDefined();
    });

    it('should prioritize high-impact, low-effort improvements', async () => {
      const currentCoverage: CoverageData = {
        statements: { total: 100, covered: 85, percentage: 85 },
        branches: { total: 50, covered: 30, percentage: 60 }, // Low branch coverage
        functions: { total: 20, covered: 18, percentage: 90 },
        lines: { total: 95, covered: 80, percentage: 84.21 },
        overall: 82,
        uncoveredLines: [5, 10, 15, 20, 25],
        uncoveredBranches: Array.from({length: 20}, (_, i) => `error-branch-${i}`),
        timestamp: new Date()
      };

      const result = await service.optimizeCoverageStrategy(currentCoverage, {
        statements: 90,
        branches: 85,
        functions: 95,
        lines: 90
      });

      const branchStrategy = result.strategies.find(s => 
        s.area === 'BRANCHES'
      );
      expect(branchStrategy).toBeDefined();
      expect(branchStrategy?.priority).toBe(Priority.HIGH);
    });
  });

  describe('error handling', () => {
    it('should handle invalid coverage data', async () => {
      const invalidCoverage = {
        statements: { total: -1, covered: 50, percentage: 150 }
      } as CoverageData;

      await expect(service.analyzeCoverage(invalidCoverage, {
        statements: 80,
        branches: 75,
        functions: 85,
        lines: 80
      })).rejects.toThrow('Invalid coverage data');
    });

    it('should handle database errors gracefully', async () => {
      mockNeo4j.query.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.generateCoverageReport('test-suite'))
        .rejects.toThrow('Failed to generate coverage report');
    });

    it('should validate threshold parameters', async () => {
      const coverage: CoverageData = {
        statements: { total: 100, covered: 80, percentage: 80 },
        branches: { total: 50, covered: 40, percentage: 80 },
        functions: { total: 20, covered: 16, percentage: 80 },
        lines: { total: 95, covered: 76, percentage: 80 },
        overall: 80,
        uncoveredLines: [],
        uncoveredBranches: [],
        timestamp: new Date()
      };

      const invalidThreshold = {
        statements: 150, // Invalid percentage
        branches: -10,   // Invalid percentage
        functions: 50,
        lines: 75
      };

      await expect(service.analyzeCoverage(coverage, invalidThreshold))
        .rejects.toThrow('Invalid threshold values');
    });
  });

  describe('integration scenarios', () => {
    it('should work with multiple test frameworks', async () => {
      const jestCoverage = {
        framework: 'JEST',
        coverage: {
          statements: { total: 100, covered: 85, percentage: 85 },
          branches: { total: 50, covered: 42, percentage: 84 },
          functions: { total: 20, covered: 19, percentage: 95 },
          lines: { total: 95, covered: 81, percentage: 85.26 },
          overall: 87.3
        }
      };

      const result = await service.normalizeFrameworkCoverage(jestCoverage);

      expect(result).toBeDefined();
      expect(result.normalized).toBeTruthy();
      expect(result.coverage).toBeDefined();
    });

    it('should integrate with CI/CD pipeline metrics', async () => {
      const pipelineData = {
        buildId: 'build-123',
        branch: 'feature/new-feature',
        commitHash: 'abc123def456',
        coverage: {
          statements: { total: 150, covered: 135, percentage: 90 },
          branches: { total: 75, covered: 68, percentage: 90.67 },
          functions: { total: 30, covered: 29, percentage: 96.67 },
          lines: { total: 140, covered: 128, percentage: 91.43 },
          overall: 92.19,
          uncoveredLines: [25, 67, 89],
          uncoveredBranches: ['edge-case-1'],
          timestamp: new Date()
        }
      };

      const result = await service.integratePipelineCoverage(pipelineData);

      expect(result).toBeDefined();
      expect(result.baselineDelta).toBeDefined();
      expect(result.qualityGate).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });
  });
});