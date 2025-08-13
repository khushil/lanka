// Analytics Types
export interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  unit: string;
  category: MetricCategory;
  timestamp: Date;
  trend: 'up' | 'down' | 'stable';
  change?: number; // Percentage change
}

export enum MetricCategory {
  REQUIREMENTS = 'requirements',
  DEVELOPMENT = 'development',
  ARCHITECTURE = 'architecture',
  PERFORMANCE = 'performance',
  QUALITY = 'quality',
  SECURITY = 'security',
  USAGE = 'usage'
}

export interface RequirementsMetrics {
  totalRequirements: number;
  completedRequirements: number;
  pendingRequirements: number;
  blockedRequirements: number;
  completionRate: number;
  averageTimeToComplete: number; // in days
  requirementsByCategory: CategoryBreakdown[];
  requirementsByPriority: PriorityBreakdown[];
  requirementsTrend: TimeSeriesData[];
}

export interface DevelopmentMetrics {
  codeQuality: {
    maintainabilityIndex: number;
    technicalDebt: number;
    testCoverage: number;
    codeComplexity: number;
    duplicateCode: number;
  };
  velocity: {
    averageVelocity: number;
    burndownRate: number;
    cycleTime: number;
    leadTime: number;
    throughput: number;
  };
  deployment: {
    deploymentFrequency: number;
    deploymentSuccess: number;
    meanTimeToRecovery: number;
    changeFailureRate: number;
  };
}

export interface SystemHealthMetrics {
  infrastructure: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    throughput: number;
    activeUsers: number;
  };
  resources: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkUsage: number;
  };
  database: {
    connectionCount: number;
    queryPerformance: number;
    storageUsed: number;
    backupStatus: 'healthy' | 'warning' | 'error';
  };
}

export interface CategoryBreakdown {
  category: string;
  count: number;
  percentage: number;
  color: string;
}

export interface PriorityBreakdown {
  priority: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  percentage: number;
  color: string;
}

export interface AnalyticsDashboard {
  overview: AnalyticsMetric[];
  requirements: RequirementsMetrics;
  development: DevelopmentMetrics;
  systemHealth: SystemHealthMetrics;
  lastUpdated: Date;
}

export interface ChartConfiguration {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  title: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  colors?: string[];
}