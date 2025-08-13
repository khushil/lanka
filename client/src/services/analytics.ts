import { api } from './api';
import {
  AnalyticsDashboard,
  AnalyticsMetric,
  RequirementsMetrics,
  DevelopmentMetrics,
  SystemHealthMetrics,
  MetricCategory,
  TimeSeriesData
} from '../types/analytics';

class AnalyticsService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private getCacheKey(endpoint: string, params?: any): string {
    return `${endpoint}_${JSON.stringify(params)}`;
  }

  private isValidCache(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  private async fetchWithCache<T>(endpoint: string, params?: any): Promise<T> {
    const cacheKey = this.getCacheKey(endpoint, params);
    const cached = this.cache.get(cacheKey);

    if (cached && this.isValidCache(cached.timestamp)) {
      return cached.data;
    }

    try {
      const response = await api.get(endpoint, { params });
      const data = response.data;

      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error(`Analytics API error for ${endpoint}:`, error);
      // Return mock data for development
      return this.generateMockData(endpoint, params);
    }
  }

  private generateMockData(endpoint: string, _params?: any): any {
    // Generate mock data based on endpoint
    switch (endpoint) {
      case '/analytics/dashboard':
        return this.generateMockDashboard();
      case '/analytics/requirements':
        return this.generateMockRequirements();
      case '/analytics/development':
        return this.generateMockDevelopment();
      case '/analytics/system-health':
        return this.generateMockSystemHealth();
      case '/analytics/metrics':
        return this.generateMockMetrics();
      default:
        return {};
    }
  }

  private generateMockDashboard(): AnalyticsDashboard {
    return {
      overview: this.generateMockMetrics(),
      requirements: this.generateMockRequirements(),
      development: this.generateMockDevelopment(),
      systemHealth: this.generateMockSystemHealth(),
      lastUpdated: new Date()
    };
  }

  private generateMockMetrics(): AnalyticsMetric[] {
    return [
      {
        id: '1',
        name: 'Total Requirements',
        value: 124,
        previousValue: 118,
        unit: 'count',
        category: MetricCategory.REQUIREMENTS,
        timestamp: new Date(),
        trend: 'up',
        change: 5.1
      },
      {
        id: '2',
        name: 'Code Coverage',
        value: 87.5,
        previousValue: 85.2,
        unit: '%',
        category: MetricCategory.QUALITY,
        timestamp: new Date(),
        trend: 'up',
        change: 2.7
      },
      {
        id: '3',
        name: 'System Uptime',
        value: 99.9,
        previousValue: 99.7,
        unit: '%',
        category: MetricCategory.PERFORMANCE,
        timestamp: new Date(),
        trend: 'up',
        change: 0.2
      },
      {
        id: '4',
        name: 'Security Score',
        value: 92.3,
        previousValue: 89.1,
        unit: 'score',
        category: MetricCategory.SECURITY,
        timestamp: new Date(),
        trend: 'up',
        change: 3.6
      }
    ];
  }

  private generateMockRequirements(): RequirementsMetrics {
    return {
      totalRequirements: 124,
      completedRequirements: 89,
      pendingRequirements: 28,
      blockedRequirements: 7,
      completionRate: 71.8,
      averageTimeToComplete: 5.2,
      requirementsByCategory: [
        { category: 'Functional', count: 67, percentage: 54.0, color: '#2196F3' },
        { category: 'Non-Functional', count: 32, percentage: 25.8, color: '#4CAF50' },
        { category: 'Technical', count: 25, percentage: 20.2, color: '#FF9800' }
      ],
      requirementsByPriority: [
        { priority: 'critical', count: 15, percentage: 12.1, color: '#F44336' },
        { priority: 'high', count: 42, percentage: 33.9, color: '#FF9800' },
        { priority: 'medium', count: 51, percentage: 41.1, color: '#2196F3' },
        { priority: 'low', count: 16, percentage: 12.9, color: '#4CAF50' }
      ],
      requirementsTrend: this.generateTimeSeriesData('requirements', 30)
    };
  }

  private generateMockDevelopment(): DevelopmentMetrics {
    return {
      codeQuality: {
        maintainabilityIndex: 82.5,
        technicalDebt: 15.2,
        testCoverage: 87.5,
        codeComplexity: 3.2,
        duplicateCode: 2.1
      },
      velocity: {
        averageVelocity: 42.5,
        burndownRate: 85.3,
        cycleTime: 3.8,
        leadTime: 7.2,
        throughput: 28.5
      },
      deployment: {
        deploymentFrequency: 12.5,
        deploymentSuccess: 94.2,
        meanTimeToRecovery: 0.8,
        changeFailureRate: 5.8
      }
    };
  }

  private generateMockSystemHealth(): SystemHealthMetrics {
    return {
      infrastructure: {
        uptime: 99.9,
        responseTime: 245,
        errorRate: 0.05,
        throughput: 1250,
        activeUsers: 89
      },
      resources: {
        cpuUsage: 34.2,
        memoryUsage: 67.8,
        diskUsage: 45.3,
        networkUsage: 23.7
      },
      database: {
        connectionCount: 45,
        queryPerformance: 89.2,
        storageUsed: 234.5,
        backupStatus: 'healthy'
      }
    };
  }

  private generateTimeSeriesData(metric: string, days: number): TimeSeriesData[] {
    const data: TimeSeriesData[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      // Generate realistic trending data
      let baseValue;
      switch (metric) {
        case 'requirements':
          baseValue = 120;
          break;
        case 'coverage':
          baseValue = 85;
          break;
        case 'uptime':
          baseValue = 99.5;
          break;
        default:
          baseValue = 50;
      }

      const variation = (Math.random() - 0.5) * 10;
      const trend = i < days / 2 ? (days - i) * 0.5 : 0;

      data.push({
        timestamp: date,
        value: Math.max(0, baseValue + variation + trend),
        metric
      });
    }

    return data;
  }

  // Public API methods
  async getDashboard(): Promise<AnalyticsDashboard> {
    return this.fetchWithCache<AnalyticsDashboard>('/analytics/dashboard');
  }

  async getRequirementsMetrics(): Promise<RequirementsMetrics> {
    return this.fetchWithCache<RequirementsMetrics>('/analytics/requirements');
  }

  async getDevelopmentMetrics(): Promise<DevelopmentMetrics> {
    return this.fetchWithCache<DevelopmentMetrics>('/analytics/development');
  }

  async getSystemHealthMetrics(): Promise<SystemHealthMetrics> {
    return this.fetchWithCache<SystemHealthMetrics>('/analytics/system-health');
  }

  async getMetrics(category?: MetricCategory): Promise<AnalyticsMetric[]> {
    return this.fetchWithCache<AnalyticsMetric[]>('/analytics/metrics', { category });
  }

  async getTimeSeriesData(
    metric: string,
    startDate: Date,
    endDate: Date,
    interval: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<TimeSeriesData[]> {
    return this.fetchWithCache<TimeSeriesData[]>('/analytics/timeseries', {
      metric,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      interval
    });
  }

  // Cache management
  clearCache(): void {
    this.cache.clear();
  }

  invalidateCache(endpoint?: string): void {
    if (endpoint) {
      const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(endpoint));
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  // Real-time data subscription
  subscribeToRealTimeUpdates(callback: (data: any) => void): () => void {
    // In a real implementation, this would use WebSocket
    const interval = setInterval(async () => {
      try {
        const dashboard = await this.getDashboard();
        callback(dashboard);
      } catch (error) {
        console.error('Error fetching real-time analytics:', error);
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }
}

export const analyticsService = new AnalyticsService();