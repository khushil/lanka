import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  GraphData, 
  MetricData, 
  HeatmapData, 
  VisualizationDataResponse,
  FilterState 
} from '../types/visualizations';

// Mock API functions - replace with actual API calls
const mockApiCall = <T>(data: T, delay: number = 1000): Promise<VisualizationDataResponse<T>> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        data,
        metadata: {
          timestamp: Date.now(),
          version: '1.0.0',
          source: 'mock-api',
          count: Array.isArray(data) ? data.length : 1
        },
        success: true
      });
    }, delay);
  });
};

export const useVisualizationData = <T>(
  endpoint: string,
  options: {
    filters?: FilterState;
    refreshInterval?: number;
    enabled?: boolean;
  } = {}
) => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { filters, refreshInterval = 0, enabled = true } = options;

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      // Mock data based on endpoint
      let mockData: any;
      
      switch (endpoint) {
        case '/api/requirements':
          mockData = generateMockGraphData(filters);
          break;
        case '/api/metrics':
          mockData = generateMockMetrics();
          break;
        case '/api/heatmap':
          mockData = generateMockHeatmapData();
          break;
        default:
          mockData = {};
      }

      const response = await mockApiCall(mockData, 500);
      
      if (response.success) {
        setData(response.data);
        setLastUpdate(response.metadata.timestamp);
      } else {
        throw new Error(response.error || 'Failed to fetch data');
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, filters, enabled]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Setup refresh interval
  useEffect(() => {
    if (refreshInterval > 0 && enabled) {
      refreshIntervalRef.current = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [refreshInterval, enabled, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    lastUpdate,
    refresh,
    setData
  };
};

// Mock data generators
const generateMockGraphData = (filters?: FilterState): GraphData => {
  const categories = ['Security', 'Infrastructure', 'Features', 'Performance'];
  const priorities = ['low', 'medium', 'high', 'critical'] as const;
  const statuses = ['draft', 'review', 'approved', 'implemented'] as const;

  const nodes = Array.from({ length: 20 }, (_, i) => ({
    id: `node-${i}`,
    title: `Requirement ${i + 1}`,
    category: categories[Math.floor(Math.random() * categories.length)],
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    complexity: Math.floor(Math.random() * 10) + 1,
    group: Math.floor(Math.random() * 4)
  })).filter(node => {
    if (filters?.category && filters.category !== 'all' && node.category !== filters.category) {
      return false;
    }
    if (filters?.search && !node.title.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const links = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (Math.random() > 0.7) {
        links.push({
          source: nodes[i].id,
          target: nodes[j].id,
          strength: Math.random(),
          type: ['dependency', 'similarity', 'stakeholder'][Math.floor(Math.random() * 3)] as any
        });
      }
    }
  }

  return { nodes, links };
};

const generateMockMetrics = (): MetricData[] => [
  {
    label: 'Active Projects',
    value: 24,
    trend: 'up',
    change: 2,
    icon: '📊'
  },
  {
    label: 'Team Members',
    value: 47,
    trend: 'stable',
    change: 0,
    icon: '👥'
  },
  {
    label: 'Code Quality',
    value: 96.8,
    trend: 'up',
    change: 1.2,
    unit: '%',
    icon: '⭐'
  },
  {
    label: 'Uptime',
    value: 99.9,
    trend: 'stable',
    change: 0,
    unit: '%',
    icon: '🚀'
  }
];

const generateMockHeatmapData = (): HeatmapData => {
  const labels = [
    'User Auth System',
    'Database Schema',
    'API Rate Limiting',
    'Real-time Notifications',
    'WebSocket Management',
    'Data Visualization',
    'Security Framework',
    'Performance Monitoring'
  ];

  const matrix = labels.map(() => 
    labels.map(() => Math.random())
  );

  return { matrix, labels };
};

// Specialized hooks for different data types
export const useGraphData = (filters?: FilterState) => {
  return useVisualizationData<GraphData>('/api/requirements', { filters });
};

export const useMetricsData = (refreshInterval: number = 5000) => {
  return useVisualizationData<MetricData[]>('/api/metrics', { refreshInterval });
};

export const useHeatmapData = () => {
  return useVisualizationData<HeatmapData>('/api/heatmap');
};

// Real-time data hook with WebSocket support
export const useRealTimeData = <T>(
  endpoint: string,
  initialData?: T
) => {
  const [data, setData] = useState<T | undefined>(initialData);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Mock WebSocket connection
    const connectWebSocket = () => {
      try {
        // In a real app, this would be a WebSocket connection
        setIsConnected(true);
        setError(null);

        // Simulate real-time updates
        const interval = setInterval(() => {
          if (endpoint === '/ws/metrics') {
            setData(generateMockMetrics() as T);
          }
        }, 2000);

        return () => clearInterval(interval);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Connection failed');
        setIsConnected(false);
      }
    };

    const cleanup = connectWebSocket();

    return () => {
      cleanup?.();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [endpoint]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return {
    data,
    isConnected,
    error,
    sendMessage,
    setData
  };
};

// Data caching hook
export const useCachedData = <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300000 // 5 minutes
) => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCachedData = useCallback(() => {
    try {
      const cached = localStorage.getItem(`viz_cache_${key}`);
      if (cached) {
        const { data: cachedData, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < ttl) {
          return cachedData;
        }
      }
    } catch (err) {
      console.warn('Failed to read from cache:', err);
    }
    return null;
  }, [key, ttl]);

  const setCachedData = useCallback((data: T) => {
    try {
      localStorage.setItem(`viz_cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.warn('Failed to write to cache:', err);
    }
  }, [key]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const cachedData = getCachedData();
      if (cachedData) {
        setData(cachedData);
        setIsLoading(false);
        return;
      }

      const freshData = await fetcher();
      setData(freshData);
      setCachedData(freshData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [fetcher, getCachedData, setCachedData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(`viz_cache_${key}`);
    } catch (err) {
      console.warn('Failed to clear cache:', err);
    }
  }, [key]);

  return {
    data,
    isLoading,
    error,
    refresh: fetchData,
    clearCache
  };
};