import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  Server,
  Zap,
  Shield,
  Eye,
  Download,
  RefreshCw,
  Timer,
  Globe,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  AlertCircle,
  BarChart3,
} from 'lucide-react';

interface ProductionInsightsProps {
  viewMode?: 'overview' | 'detailed';
  isLoading?: boolean;
  autoRefresh?: boolean;
}

interface SystemMetric {
  timestamp: string;
  responseTime: number;
  throughput: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  activeUsers: number;
}

interface ErrorData {
  id: string;
  message: string;
  type: string;
  count: number;
  lastOccurred: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  stackTrace: string;
  affectedUsers: number;
  status: 'open' | 'investigating' | 'resolved';
}

interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  sessionDuration: number;
  bounceRate: number;
  conversionRate: number;
  topPages: Array<{
    path: string;
    views: number;
    avgDuration: number;
    bounceRate: number;
  }>;
  userFlow: Array<{
    step: string;
    users: number;
    dropOff: number;
  }>;
}

interface PerformanceAlert {
  id: string;
  type: 'performance' | 'error' | 'security' | 'capacity';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  affectedServices: string[];
}

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  responseTime: number;
  errorRate: number;
  lastCheck: Date;
  dependencies: string[];
}

const ProductionInsights: React.FC<ProductionInsightsProps> = ({
  viewMode = 'overview',
  isLoading = false,
  autoRefresh = true
}) => {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [selectedMetric, setSelectedMetric] = useState<'performance' | 'errors' | 'users' | 'system'>('performance');
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([]);
  const [errors, setErrors] = useState<ErrorData[]>([]);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth[]>([]);
  const [realTimeData, setRealTimeData] = useState<SystemMetric | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate mock data
  const generateMockSystemMetrics = useCallback((): SystemMetric[] => {
    const now = new Date();
    const points = timeRange === '1h' ? 60 : timeRange === '6h' ? 72 : timeRange === '24h' ? 96 : 168;
    const interval = timeRange === '1h' ? 60000 : timeRange === '6h' ? 300000 : timeRange === '24h' ? 900000 : 3600000;
    
    return Array.from({ length: points }, (_, i) => {
      const timestamp = new Date(now.getTime() - (points - 1 - i) * interval);
      const baseResponseTime = 150;
      const baseThroughput = 1000;
      const baseErrorRate = 0.5;
      
      // Add some realistic patterns
      const hourOfDay = timestamp.getHours();
      const peakHourMultiplier = hourOfDay >= 9 && hourOfDay <= 17 ? 1.5 : 
                                hourOfDay >= 18 && hourOfDay <= 22 ? 1.2 : 0.7;
      
      return {
        timestamp: timestamp.toISOString(),
        responseTime: baseResponseTime + Math.sin(i / 10) * 50 + (Math.random() - 0.5) * 30,
        throughput: baseThroughput * peakHourMultiplier + Math.sin(i / 15) * 200 + (Math.random() - 0.5) * 100,
        errorRate: Math.max(0, baseErrorRate + Math.sin(i / 20) * 0.3 + (Math.random() - 0.5) * 0.2),
        cpuUsage: 30 + Math.sin(i / 8) * 20 + (Math.random() - 0.5) * 10,
        memoryUsage: 45 + Math.sin(i / 12) * 15 + (Math.random() - 0.5) * 8,
        diskUsage: 65 + Math.sin(i / 50) * 5 + (Math.random() - 0.5) * 2,
        activeUsers: Math.floor(baseThroughput * peakHourMultiplier / 10) + Math.floor((Math.random() - 0.5) * 20)
      };
    });
  }, [timeRange]);

  const generateMockErrors = useCallback((): ErrorData[] => {
    const errorTypes = ['DatabaseConnection', 'ValidationError', 'TimeoutException', 'AuthenticationFailure', 'NetworkError'];
    const severities: ('low' | 'medium' | 'high' | 'critical')[] = ['low', 'medium', 'high', 'critical'];
    const statuses: ('open' | 'investigating' | 'resolved')[] = ['open', 'investigating', 'resolved'];
    
    return Array.from({ length: 15 }, (_, i) => ({
      id: `error-${i + 1}`,
      message: `${errorTypes[Math.floor(Math.random() * errorTypes.length)]}: ${getRandomErrorMessage()}`,
      type: errorTypes[Math.floor(Math.random() * errorTypes.length)],
      count: Math.floor(Math.random() * 100) + 1,
      lastOccurred: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      severity: severities[Math.floor(Math.random() * severities.length)],
      stackTrace: generateMockStackTrace(),
      affectedUsers: Math.floor(Math.random() * 50),
      status: statuses[Math.floor(Math.random() * statuses.length)]
    }));
  }, []);

  const getRandomErrorMessage = () => {
    const messages = [
      'Connection timeout after 30 seconds',
      'Failed to validate user input',
      'Database query execution failed',
      'Invalid authentication token',
      'Network request timed out',
      'Memory allocation failed',
      'File not found exception',
      'Permission denied for resource access'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const generateMockStackTrace = () => {
    return `at UserService.validateUser (user.service.ts:45)\n  at AuthController.login (auth.controller.ts:23)\n  at Router.handle (/node_modules/express/lib/router/index.js:281)`;
  };

  const generateMockUserAnalytics = useCallback((): UserAnalytics => {
    return {
      totalUsers: Math.floor(Math.random() * 50000) + 10000,
      activeUsers: Math.floor(Math.random() * 5000) + 1000,
      newUsers: Math.floor(Math.random() * 500) + 100,
      sessionDuration: Math.floor(Math.random() * 600) + 180, // seconds
      bounceRate: Math.random() * 30 + 20, // percentage
      conversionRate: Math.random() * 5 + 2, // percentage
      topPages: [
        { path: '/', views: 15420, avgDuration: 145, bounceRate: 25.3 },
        { path: '/dashboard', views: 8730, avgDuration: 420, bounceRate: 15.2 },
        { path: '/profile', views: 5210, avgDuration: 280, bounceRate: 35.7 },
        { path: '/settings', views: 3140, avgDuration: 380, bounceRate: 28.9 },
        { path: '/reports', views: 2890, avgDuration: 520, bounceRate: 18.4 }
      ],
      userFlow: [
        { step: 'Landing', users: 10000, dropOff: 0 },
        { step: 'Sign Up', users: 7500, dropOff: 25 },
        { step: 'Verification', users: 6800, dropOff: 9.3 },
        { step: 'Onboarding', users: 6200, dropOff: 8.8 },
        { step: 'First Action', users: 5800, dropOff: 6.5 },
        { step: 'Active User', users: 5500, dropOff: 5.2 }
      ]
    };
  }, []);

  const generateMockAlerts = useCallback((): PerformanceAlert[] => {
    const types: ('performance' | 'error' | 'security' | 'capacity')[] = ['performance', 'error', 'security', 'capacity'];
    const severities: ('info' | 'warning' | 'critical')[] = ['info', 'warning', 'critical'];
    const services = ['API Gateway', 'User Service', 'Database', 'Payment Service', 'Notification Service'];
    
    return Array.from({ length: 8 }, (_, i) => ({
      id: `alert-${i + 1}`,
      type: types[Math.floor(Math.random() * types.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      message: getRandomAlertMessage(),
      timestamp: new Date(Date.now() - Math.random() * 6 * 60 * 60 * 1000),
      resolved: Math.random() > 0.3,
      affectedServices: [services[Math.floor(Math.random() * services.length)]]
    }));
  }, []);

  const getRandomAlertMessage = () => {
    const messages = [
      'High response time detected on API endpoints',
      'Unusual spike in error rate',
      'Database connection pool exhausted',
      'Memory usage exceeding 85% threshold',
      'SSL certificate expiring in 7 days',
      'Disk space running low on primary server',
      'Suspicious login activity detected',
      'Service dependency timeout increased'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const generateMockServiceHealth = useCallback((): ServiceHealth[] => {
    const services = [
      { name: 'API Gateway', dependencies: ['User Service', 'Auth Service'] },
      { name: 'User Service', dependencies: ['Database', 'Cache'] },
      { name: 'Payment Service', dependencies: ['Database', 'External API'] },
      { name: 'Notification Service', dependencies: ['Queue', 'SMTP Service'] },
      { name: 'Database', dependencies: [] },
      { name: 'Cache (Redis)', dependencies: [] },
      { name: 'File Storage', dependencies: [] },
      { name: 'Monitoring', dependencies: ['Database'] }
    ];
    
    const statuses: ('healthy' | 'degraded' | 'down')[] = ['healthy', 'degraded', 'down'];
    
    return services.map(service => ({
      name: service.name,
      status: Math.random() > 0.1 ? 'healthy' : Math.random() > 0.5 ? 'degraded' : 'down',
      uptime: Math.random() * 5 + 95, // 95-100%
      responseTime: Math.random() * 100 + 50, // 50-150ms
      errorRate: Math.random() * 2, // 0-2%
      lastCheck: new Date(Date.now() - Math.random() * 60000),
      dependencies: service.dependencies
    }));
  }, []);

  useEffect(() => {
    setSystemMetrics(generateMockSystemMetrics());
    setErrors(generateMockErrors());
    setUserAnalytics(generateMockUserAnalytics());
    setAlerts(generateMockAlerts());
    setServiceHealth(generateMockServiceHealth());
  }, [timeRange, generateMockSystemMetrics, generateMockErrors, generateMockUserAnalytics, generateMockAlerts, generateMockServiceHealth]);

  // Real-time data simulation
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        const latest = systemMetrics[systemMetrics.length - 1];
        if (latest) {
          setRealTimeData({
            timestamp: new Date().toISOString(),
            responseTime: latest.responseTime + (Math.random() - 0.5) * 20,
            throughput: latest.throughput + (Math.random() - 0.5) * 100,
            errorRate: Math.max(0, latest.errorRate + (Math.random() - 0.5) * 0.1),
            cpuUsage: Math.max(0, Math.min(100, latest.cpuUsage + (Math.random() - 0.5) * 5)),
            memoryUsage: Math.max(0, Math.min(100, latest.memoryUsage + (Math.random() - 0.5) * 3)),
            diskUsage: Math.max(0, Math.min(100, latest.diskUsage + (Math.random() - 0.5) * 1)),
            activeUsers: Math.max(0, latest.activeUsers + Math.floor((Math.random() - 0.5) * 10))
          });
        }
      }, 5000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, systemMetrics]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'down':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-red-400 text-white';
      case 'warning':
        return 'bg-yellow-500 text-black';
      case 'medium':
        return 'bg-orange-500 text-white';
      case 'low':
      case 'info':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Chart colors
  const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* Real-time Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Response Time',
            value: `${realTimeData?.responseTime.toFixed(0) || '0'}ms`,
            icon: <Timer className="h-5 w-5 text-blue-500" />,
            trend: 'stable'
          },
          {
            label: 'Throughput',
            value: `${realTimeData?.throughput.toFixed(0) || '0'}/min`,
            icon: <Activity className="h-5 w-5 text-green-500" />,
            trend: 'up'
          },
          {
            label: 'Error Rate',
            value: `${realTimeData?.errorRate.toFixed(2) || '0'}%`,
            icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
            trend: 'down'
          },
          {
            label: 'Active Users',
            value: realTimeData?.activeUsers.toFixed(0) || '0',
            icon: <Users className="h-5 w-5 text-purple-500" />,
            trend: 'up'
          }
        ].map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    {metric.icon}
                  </div>
                  <div className="flex items-center gap-1">
                    {realTimeData && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
                    <span className="text-xs text-gray-500">Live</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{metric.label}</span>
                  <div className="text-xl font-bold">{metric.value}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Time Range Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Production Insights Dashboard
            </CardTitle>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Time Range:</span>
                <Select value={timeRange} onValueChange={(value: '1h' | '6h' | '24h' | '7d') => setTimeRange(value)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1h</SelectItem>
                    <SelectItem value="6h">6h</SelectItem>
                    <SelectItem value="24h">24h</SelectItem>
                    <SelectItem value="7d">7d</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant={selectedMetric === 'performance' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedMetric('performance')}
                >
                  Performance
                </Button>
                <Button
                  variant={selectedMetric === 'errors' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedMetric('errors')}
                >
                  Errors
                </Button>
                <Button
                  variant={selectedMetric === 'users' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedMetric('users')}
                >
                  Users
                </Button>
                <Button
                  variant={selectedMetric === 'system' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedMetric('system')}
                >
                  System
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {selectedMetric === 'performance' && (
              <motion.div
                key="performance"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Response Time Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Response Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={systemMetrics}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="timestamp" 
                            tickFormatter={formatTimestamp}
                            interval="preserveStartEnd"
                          />
                          <YAxis />
                          <Tooltip 
                            labelFormatter={(value) => new Date(value).toLocaleString()}
                            formatter={(value: number) => [`${value.toFixed(0)}ms`, 'Response Time']}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="responseTime" 
                            stroke={chartColors[0]} 
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  
                  {/* Throughput Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Throughput</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={systemMetrics}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="timestamp" 
                            tickFormatter={formatTimestamp}
                            interval="preserveStartEnd"
                          />
                          <YAxis />
                          <Tooltip 
                            labelFormatter={(value) => new Date(value).toLocaleString()}
                            formatter={(value: number) => [`${value.toFixed(0)}/min`, 'Throughput']}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="throughput" 
                            stroke={chartColors[1]} 
                            fill={chartColors[1]}
                            fillOpacity={0.3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Error Rate Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Error Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={systemMetrics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="timestamp" 
                          tickFormatter={formatTimestamp}
                          interval="preserveStartEnd"
                        />
                        <YAxis />
                        <Tooltip 
                          labelFormatter={(value) => new Date(value).toLocaleString()}
                          formatter={(value: number) => [`${value.toFixed(2)}%`, 'Error Rate']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="errorRate" 
                          stroke={chartColors[3]} 
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>
            )}
            
            {selectedMetric === 'errors' && (
              <motion.div
                key="errors"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Error List */}
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Recent Errors</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {errors.slice(0, 10).map((error, index) => (
                            <motion.div
                              key={error.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="p-3 border rounded-lg"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge className={`text-xs ${getSeverityColor(error.severity)}`}>
                                      {error.severity}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {error.type}
                                    </Badge>
                                    <Badge 
                                      variant={error.status === 'resolved' ? 'default' : 'destructive'}
                                      className="text-xs"
                                    >
                                      {error.status}
                                    </Badge>
                                  </div>
                                  
                                  <h4 className="font-medium text-sm mb-1">{error.message}</h4>
                                  
                                  <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                                    <span>Count: {error.count}</span>
                                    <span>Users: {error.affectedUsers}</span>
                                    <span>Last: {error.lastOccurred.toLocaleTimeString()}</span>
                                  </div>
                                </div>
                                
                                <Button size="sm" variant="outline">
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Error Distribution */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Error Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Database', value: 35, color: chartColors[0] },
                              { name: 'Validation', value: 25, color: chartColors[1] },
                              { name: 'Network', value: 20, color: chartColors[2] },
                              { name: 'Auth', value: 15, color: chartColors[3] },
                              { name: 'Other', value: 5, color: chartColors[4] }
                            ]}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, value }) => `${name} ${value}%`}
                          >
                            {chartColors.map((color, index) => (
                              <Cell key={`cell-${index}`} fill={color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}
            
            {selectedMetric === 'users' && userAnalytics && (
              <motion.div
                key="users"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* User Flow */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">User Conversion Funnel</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {userAnalytics.userFlow.map((step, index) => {
                          const percentage = (step.users / userAnalytics.userFlow[0].users) * 100;
                          return (
                            <div key={index} className="relative">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">{step.step}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{step.users.toLocaleString()}</span>
                                  <span className="text-xs text-gray-500">({percentage.toFixed(1)}%)</span>
                                </div>
                              </div>
                              
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                <motion.div
                                  className="bg-blue-500 h-3 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  transition={{ delay: index * 0.1, duration: 0.5 }}
                                />
                              </div>
                              
                              {step.dropOff > 0 && (
                                <div className="text-xs text-red-500 mt-1">
                                  -{step.dropOff}% drop-off
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Top Pages */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Top Pages</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {userAnalytics.topPages.map((page, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{page.path}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {page.views.toLocaleString()} views • {formatDuration(page.avgDuration)} avg
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {page.bounceRate.toFixed(1)}% bounce
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* User Metrics Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Users', value: userAnalytics.totalUsers.toLocaleString(), icon: <Users className="h-4 w-4" /> },
                    { label: 'Session Duration', value: formatDuration(userAnalytics.sessionDuration), icon: <Clock className="h-4 w-4" /> },
                    { label: 'Bounce Rate', value: `${userAnalytics.bounceRate.toFixed(1)}%`, icon: <TrendingDown className="h-4 w-4" /> },
                    { label: 'Conversion Rate', value: `${userAnalytics.conversionRate.toFixed(1)}%`, icon: <TrendingUp className="h-4 w-4" /> }
                  ].map((metric, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          {metric.icon}
                          <span className="text-sm text-gray-600 dark:text-gray-400">{metric.label}</span>
                        </div>
                        <div className="text-lg font-bold">{metric.value}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}
            
            {selectedMetric === 'system' && (
              <motion.div
                key="system"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* System Resource Charts */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">CPU & Memory Usage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={systemMetrics}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="timestamp" 
                            tickFormatter={formatTimestamp}
                            interval="preserveStartEnd"
                          />
                          <YAxis />
                          <Tooltip 
                            labelFormatter={(value) => new Date(value).toLocaleString()}
                            formatter={(value: number, name: string) => [
                              `${value.toFixed(1)}%`, 
                              name === 'cpuUsage' ? 'CPU' : 'Memory'
                            ]}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="cpuUsage" 
                            stroke={chartColors[0]} 
                            strokeWidth={2}
                            dot={false}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="memoryUsage" 
                            stroke={chartColors[1]} 
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  
                  {/* Service Health */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Service Health</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {serviceHealth.map((service, index) => (
                          <motion.div
                            key={service.name}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center justify-between p-2 border rounded"
                          >
                            <div className="flex items-center gap-2">
                              {getStatusIcon(service.status)}
                              <div>
                                <div className="font-medium text-sm">{service.name}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  {service.uptime.toFixed(2)}% uptime • {service.responseTime.toFixed(0)}ms
                                </div>
                              </div>
                            </div>
                            
                            <Badge 
                              variant={service.status === 'healthy' ? 'default' : 
                                      service.status === 'degraded' ? 'secondary' : 'destructive'}
                              className="text-xs"
                            >
                              {service.status}
                            </Badge>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Alerts Panel */}
      {alerts.filter(a => !a.resolved).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Active Alerts ({alerts.filter(a => !a.resolved).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alerts.filter(a => !a.resolved).map((alert, index) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-3 border rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={`text-xs ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {alert.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <h4 className="font-medium text-sm mb-1">{alert.message}</h4>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <Badge variant="outline" className="text-xs">
                      {alert.type}
                    </Badge>
                    <span>Affects: {alert.affectedServices.join(', ')}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProductionInsights;
