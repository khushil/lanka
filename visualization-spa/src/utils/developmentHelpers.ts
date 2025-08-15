// Development-specific utility functions for code metrics and quality calculations

export interface CodeMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  maintainabilityIndex: number;
  technicalDebt: number; // in minutes
  duplicatedLines: number;
  duplicationRatio: number;
}

export interface QualityGate {
  metric: string;
  condition: 'LT' | 'GT' | 'EQ';
  threshold: number;
  value: number;
  status: 'OK' | 'WARN' | 'ERROR';
}

export interface TestMetrics {
  overallCoverage: number;
  lineCoverage: number;
  branchCoverage: number;
  functionCoverage: number;
  statementCoverage: number;
  testCount: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  executionTime: number;
}

export interface SecurityMetrics {
  vulnerabilities: {
    blocker: number;
    critical: number;
    major: number;
    minor: number;
    info: number;
  };
  securityHotspots: number;
  securityRating: 'A' | 'B' | 'C' | 'D' | 'E';
  securityDebt: number; // in minutes
}

export interface PerformanceMetrics {
  buildTime: number;
  testExecutionTime: number;
  deploymentTime: number;
  startupTime: number;
  memoryUsage: number;
  bundleSize: number;
}

/**
 * Calculate cyclomatic complexity from code structure
 */
export const calculateCyclomaticComplexity = (code: string): number => {
  if (!code || typeof code !== 'string') return 1;
  
  // Count decision points in code
  const patterns = [
    /\bif\s*\(/gi,           // if statements
    /\belse\s+if\s*\(/gi,    // else if statements
    /\bwhile\s*\(/gi,        // while loops
    /\bfor\s*\(/gi,          // for loops
    /\bdo\s*\{/gi,           // do-while loops
    /\bswitch\s*\(/gi,       // switch statements
    /\bcase\s+/gi,           // case statements
    /\bcatch\s*\(/gi,        // catch blocks
    /\b&&\b/gi,              // logical AND
    /\b\|\|\b/gi,            // logical OR
    /\?.*:/gi,               // ternary operators
  ];
  
  let complexity = 1; // Start with 1 for the main execution path
  
  patterns.forEach(pattern => {
    const matches = code.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  });
  
  return Math.min(complexity, 50); // Cap at 50 for sanity
};

/**
 * Calculate maintainability index
 * Based on the formula: 171 - 5.2 * ln(HV) - 0.23 * CC - 16.2 * ln(LOC)
 */
export const calculateMaintainabilityIndex = (metrics: Partial<CodeMetrics>): number => {
  const {
    linesOfCode = 100,
    cyclomaticComplexity = 5,
    // Simplified Halstead Volume approximation
  } = metrics;
  
  const halsteadVolume = Math.max(1, linesOfCode * 0.5); // Simplified approximation
  
  const mi = 171 - 
    5.2 * Math.log(halsteadVolume) - 
    0.23 * cyclomaticComplexity - 
    16.2 * Math.log(linesOfCode);
  
  // Normalize to 0-100 scale
  return Math.max(0, Math.min(100, mi));
};

/**
 * Calculate technical debt in minutes
 */
export const calculateTechnicalDebt = (issues: {
  type: 'bug' | 'vulnerability' | 'code_smell';
  severity: 'blocker' | 'critical' | 'major' | 'minor' | 'info';
  effort: number;
}[]): number => {
  return issues.reduce((total, issue) => {
    // Weight by severity
    const severityMultiplier = {
      blocker: 4,
      critical: 3,
      major: 2,
      minor: 1,
      info: 0.5
    };
    
    return total + (issue.effort * severityMultiplier[issue.severity]);
  }, 0);
};

/**
 * Calculate code duplication ratio
 */
export const calculateDuplicationRatio = (totalLines: number, duplicatedLines: number): number => {
  if (totalLines === 0) return 0;
  return Math.min(100, (duplicatedLines / totalLines) * 100);
};

/**
 * Generate quality gates based on metrics
 */
export const generateQualityGates = (metrics: CodeMetrics & TestMetrics): QualityGate[] => {
  const gates: QualityGate[] = [
    {
      metric: 'Coverage',
      condition: 'GT',
      threshold: 80,
      value: metrics.overallCoverage,
      status: metrics.overallCoverage >= 80 ? 'OK' : metrics.overallCoverage >= 60 ? 'WARN' : 'ERROR'
    },
    {
      metric: 'Duplication',
      condition: 'LT',
      threshold: 3,
      value: metrics.duplicationRatio,
      status: metrics.duplicationRatio < 3 ? 'OK' : metrics.duplicationRatio < 5 ? 'WARN' : 'ERROR'
    },
    {
      metric: 'Maintainability',
      condition: 'GT',
      threshold: 70,
      value: metrics.maintainabilityIndex,
      status: metrics.maintainabilityIndex >= 70 ? 'OK' : metrics.maintainabilityIndex >= 50 ? 'WARN' : 'ERROR'
    },
    {
      metric: 'Complexity',
      condition: 'LT',
      threshold: 10,
      value: metrics.cyclomaticComplexity,
      status: metrics.cyclomaticComplexity < 10 ? 'OK' : metrics.cyclomaticComplexity < 15 ? 'WARN' : 'ERROR'
    }
  ];
  
  return gates;
};

/**
 * Calculate overall quality score from multiple metrics
 */
export const calculateOverallQuality = (metrics: {
  maintainabilityIndex: number;
  testCoverage: number;
  duplicationRatio: number;
  cyclomaticComplexity: number;
  securityRating: 'A' | 'B' | 'C' | 'D' | 'E';
}): number => {
  const {
    maintainabilityIndex,
    testCoverage,
    duplicationRatio,
    cyclomaticComplexity,
    securityRating
  } = metrics;
  
  // Security rating to numeric score
  const securityScore = {
    'A': 100,
    'B': 80,
    'C': 60,
    'D': 40,
    'E': 20
  }[securityRating];
  
  // Complexity score (inverted - lower is better)
  const complexityScore = Math.max(0, 100 - (cyclomaticComplexity * 5));
  
  // Duplication score (inverted - lower is better)
  const duplicationScore = Math.max(0, 100 - (duplicationRatio * 10));
  
  // Weighted average
  const weights = {
    maintainability: 0.25,
    coverage: 0.25,
    security: 0.20,
    complexity: 0.15,
    duplication: 0.15
  };
  
  const weightedScore = (
    maintainabilityIndex * weights.maintainability +
    testCoverage * weights.coverage +
    securityScore * weights.security +
    complexityScore * weights.complexity +
    duplicationScore * weights.duplication
  );
  
  return Math.round(Math.max(0, Math.min(100, weightedScore)));
};

/**
 * Format technical debt duration
 */
export const formatTechnicalDebt = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
};

/**
 * Calculate code health trend
 */
export const calculateHealthTrend = (historicalData: {
  date: string;
  qualityScore: number;
}[]): 'improving' | 'stable' | 'declining' => {
  if (historicalData.length < 2) return 'stable';
  
  const recent = historicalData.slice(-7); // Last 7 data points
  const older = historicalData.slice(-14, -7); // Previous 7 data points
  
  if (recent.length === 0 || older.length === 0) return 'stable';
  
  const recentAvg = recent.reduce((sum, d) => sum + d.qualityScore, 0) / recent.length;
  const olderAvg = older.reduce((sum, d) => sum + d.qualityScore, 0) / older.length;
  
  const difference = recentAvg - olderAvg;
  
  if (difference > 2) return 'improving';
  if (difference < -2) return 'declining';
  return 'stable';
};

/**
 * Generate improvement suggestions based on metrics
 */
export const generateImprovementSuggestions = (metrics: CodeMetrics & TestMetrics & SecurityMetrics): string[] => {
  const suggestions: string[] = [];
  
  // Coverage suggestions
  if (metrics.overallCoverage < 80) {
    suggestions.push('Increase test coverage by adding unit tests for uncovered code paths');
  }
  
  if (metrics.branchCoverage < 70) {
    suggestions.push('Improve branch coverage by testing all conditional statements');
  }
  
  // Complexity suggestions
  if (metrics.cyclomaticComplexity > 10) {
    suggestions.push('Reduce cyclomatic complexity by breaking down large functions');
  }
  
  if (metrics.cognitiveComplexity > 15) {
    suggestions.push('Simplify code logic to improve cognitive complexity');
  }
  
  // Duplication suggestions
  if (metrics.duplicationRatio > 5) {
    suggestions.push('Refactor duplicated code blocks into reusable functions or components');
  }
  
  // Maintainability suggestions
  if (metrics.maintainabilityIndex < 70) {
    suggestions.push('Improve code maintainability by reducing complexity and increasing documentation');
  }
  
  // Security suggestions
  if (metrics.vulnerabilities.critical > 0 || metrics.vulnerabilities.blocker > 0) {
    suggestions.push('Address critical and blocker security vulnerabilities immediately');
  }
  
  if (metrics.securityHotspots > 5) {
    suggestions.push('Review and resolve security hotspots to improve security posture');
  }
  
  // Technical debt suggestions
  if (metrics.technicalDebt > 480) { // More than 8 hours
    suggestions.push('Allocate time to reduce technical debt by addressing code smells and bugs');
  }
  
  // Default suggestion if no issues found
  if (suggestions.length === 0) {
    suggestions.push('Code quality looks good! Consider adding more comprehensive integration tests');
  }
  
  return suggestions.slice(0, 5); // Limit to top 5 suggestions
};

/**
 * Calculate code freshness (how recently code was modified)
 */
export const calculateCodeFreshness = (lastModified: Date): {
  freshness: 'fresh' | 'aging' | 'stale';
  daysSinceModified: number;
} => {
  const now = new Date();
  const daysSinceModified = Math.floor((now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24));
  
  let freshness: 'fresh' | 'aging' | 'stale';
  
  if (daysSinceModified <= 30) {
    freshness = 'fresh';
  } else if (daysSinceModified <= 90) {
    freshness = 'aging';
  } else {
    freshness = 'stale';
  }
  
  return { freshness, daysSinceModified };
};

/**
 * Estimate effort required to fix issues
 */
export const estimateFixEffort = (issues: {
  type: 'bug' | 'vulnerability' | 'code_smell';
  severity: 'blocker' | 'critical' | 'major' | 'minor' | 'info';
}[]): {
  totalEffort: number; // in minutes
  breakdown: Record<string, number>;
} => {
  const effortMap = {
    // Type effort (base minutes)
    bug: { blocker: 240, critical: 120, major: 60, minor: 30, info: 15 },
    vulnerability: { blocker: 300, critical: 180, major: 90, minor: 45, info: 20 },
    code_smell: { blocker: 180, critical: 90, major: 45, minor: 20, info: 10 }
  };
  
  const breakdown: Record<string, number> = {
    bugs: 0,
    vulnerabilities: 0,
    code_smells: 0
  };
  
  let totalEffort = 0;
  
  issues.forEach(issue => {
    const effort = effortMap[issue.type][issue.severity];
    totalEffort += effort;
    
    if (issue.type === 'bug') {
      breakdown.bugs += effort;
    } else if (issue.type === 'vulnerability') {
      breakdown.vulnerabilities += effort;
    } else {
      breakdown.code_smells += effort;
    }
  });
  
  return { totalEffort, breakdown };
};

/**
 * Calculate development velocity metrics
 */
export const calculateVelocityMetrics = (commits: {
  date: Date;
  linesAdded: number;
  linesDeleted: number;
  filesChanged: number;
}[]): {
  commitsPerDay: number;
  linesPerDay: number;
  filesPerDay: number;
  velocity: 'high' | 'medium' | 'low';
} => {
  if (commits.length === 0) {
    return { commitsPerDay: 0, linesPerDay: 0, filesPerDay: 0, velocity: 'low' };
  }
  
  const daysCovered = Math.max(1, Math.ceil(
    (commits[commits.length - 1].date.getTime() - commits[0].date.getTime()) / (1000 * 60 * 60 * 24)
  ));
  
  const totalLines = commits.reduce((sum, commit) => sum + commit.linesAdded + commit.linesDeleted, 0);
  const totalFiles = commits.reduce((sum, commit) => sum + commit.filesChanged, 0);
  
  const commitsPerDay = commits.length / daysCovered;
  const linesPerDay = totalLines / daysCovered;
  const filesPerDay = totalFiles / daysCovered;
  
  // Determine velocity based on activity levels
  let velocity: 'high' | 'medium' | 'low';
  
  if (commitsPerDay >= 3 && linesPerDay >= 200) {
    velocity = 'high';
  } else if (commitsPerDay >= 1 && linesPerDay >= 50) {
    velocity = 'medium';
  } else {
    velocity = 'low';
  }
  
  return {
    commitsPerDay: Number(commitsPerDay.toFixed(2)),
    linesPerDay: Number(linesPerDay.toFixed(0)),
    filesPerDay: Number(filesPerDay.toFixed(1)),
    velocity
  };
};

export default {
  calculateCyclomaticComplexity,
  calculateMaintainabilityIndex,
  calculateTechnicalDebt,
  calculateDuplicationRatio,
  generateQualityGates,
  calculateOverallQuality,
  formatTechnicalDebt,
  calculateHealthTrend,
  generateImprovementSuggestions,
  calculateCodeFreshness,
  estimateFixEffort,
  calculateVelocityMetrics
};
