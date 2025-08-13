import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  Zap,
  Eye,
  MousePointer,
  Target,
  Lightbulb,
  BarChart3,
  PieChart,
  Activity,
  Filter
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ErrorData {
  id: string;
  message: string;
  type: 'runtime' | 'network' | 'validation' | 'security';
  frequency: number;
  lastOccurred: string;
  affectedUsers: number;
  stackTrace: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

interface PerformanceMetric {
  timestamp: string;
  responseTime: number;
  throughput: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
}

interface UserBehaviorData {
  id: string;
  action: string;
  page: string;
  userCount: number;
  avgDuration: number;
  conversionRate: number;
  timestamp: string;
}

interface FeatureUsage {
  id: string;
  name: string;
  usage: number;
  trend: 'up' | 'down' | 'stable';
  userSatisfaction: number;
  lastUpdated: string;
}

interface Improvement {
  id: string;
  type: 'performance' | 'ux' | 'feature' | 'bug_fix';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: number;
  effort: number;
  roi: number;
}

const ProductionFeedback: React.FC = () => {
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [activeTab, setActiveTab] = useState<string>('errors');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Mock data
  const [errorData, setErrorData] = useState<ErrorData[]>([
    {
      id: 'error-1',
      message: 'Cannot read property of undefined',
      type: 'runtime',
      frequency: 145,
      lastOccurred: '2024-01-15 15:30:00',
      affectedUsers: 23,
      stackTrace: 'TypeError: Cannot read property...',
      severity: 'high'
    },
    {
      id: 'error-2',
      message: 'Network request failed',
      type: 'network',
      frequency: 89,
      lastOccurred: '2024-01-15 15:25:00',
      affectedUsers: 12,
      stackTrace: 'NetworkError: Failed to fetch...',
      severity: 'medium'
    },
    {
      id: 'error-3',
      message: 'Authentication token expired',
      type: 'security',
      frequency: 67,
      lastOccurred: '2024-01-15 15:20:00',
      affectedUsers: 34,
      stackTrace: 'AuthError: Token expired...',
      severity: 'critical'
    }
  ]);

  const performanceData: PerformanceMetric[] = [
    { timestamp: '00:00', responseTime: 250, throughput: 1200, errorRate: 0.5, cpuUsage: 45, memoryUsage: 62 },
    { timestamp: '04:00', responseTime: 180, throughput: 800, errorRate: 0.2, cpuUsage: 35, memoryUsage: 58 },
    { timestamp: '08:00', responseTime: 320, throughput: 2100, errorRate: 1.2, cpuUsage: 72, memoryUsage: 78 },
    { timestamp: '12:00', responseTime: 450, throughput: 2800, errorRate: 2.1, cpuUsage: 89, memoryUsage: 85 },
    { timestamp: '16:00', responseTime: 380, throughput: 2400, errorRate: 1.5, cpuUsage: 78, memoryUsage: 82 },
    { timestamp: '20:00', responseTime: 290, throughput: 1800, errorRate: 0.8, cpuUsage: 56, memoryUsage: 69 }
  ];

  const userBehaviorData: UserBehaviorData[] = [
    { id: 'behavior-1', action: 'Login', page: '/login', userCount: 1250, avgDuration: 15, conversionRate: 92, timestamp: '2024-01-15' },
    { id: 'behavior-2', action: 'Search', page: '/search', userCount: 2100, avgDuration: 45, conversionRate: 68, timestamp: '2024-01-15' },
    { id: 'behavior-3', action: 'Purchase', page: '/checkout', userCount: 450, avgDuration: 180, conversionRate: 34, timestamp: '2024-01-15' },
    { id: 'behavior-4', action: 'Profile Update', page: '/profile', userCount: 320, avgDuration: 120, conversionRate: 78, timestamp: '2024-01-15' }
  ];

  const featureUsageData: FeatureUsage[] = [
    { id: 'feature-1', name: 'Dashboard', usage: 89, trend: 'up', userSatisfaction: 4.2, lastUpdated: '2024-01-15' },
    { id: 'feature-2', name: 'Advanced Search', usage: 67, trend: 'down', userSatisfaction: 3.8, lastUpdated: '2024-01-15' },
    { id: 'feature-3', name: 'Export Feature', usage: 45, trend: 'stable', userSatisfaction: 4.0, lastUpdated: '2024-01-15' },
    { id: 'feature-4', name: 'Mobile App', usage: 73, trend: 'up', userSatisfaction: 4.5, lastUpdated: '2024-01-15' }
  ];

  const improvementSuggestions: Improvement[] = [
    {
      id: 'improvement-1',
      type: 'performance',
      priority: 'high',
      title: 'Optimize Database Queries',
      description: 'Reduce response time by optimizing slow database queries',
      impact: 85,
      effort: 60,
      roi: 4.2
    },
    {
      id: 'improvement-2',
      type: 'ux',
      priority: 'medium',
      title: 'Improve Mobile Navigation',
      description: 'Enhance mobile user experience with better navigation',
      impact: 70,
      effort: 40,
      roi: 3.8
    },
    {
      id: 'improvement-3',
      type: 'feature',
      priority: 'low',
      title: 'Add Dark Mode',
      description: 'Implement dark mode to improve user satisfaction',
      impact: 45,
      effort: 30,
      roi: 2.1
    }
  ];

  const refreshData = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      // Simulate data refresh
      setIsRefreshing(false);
    }, 1000);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const filteredErrors = errorData.filter(error => 
    (filterType === 'all' || error.type === filterType) &&
    (searchQuery === '' || error.message.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Production Insights Dashboard
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="24h">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={refreshData} disabled={isRefreshing} size="sm">
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Active Errors</span>
            </div>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-gray-600">+12% from last period</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Avg Response</span>
            </div>
            <div className="text-2xl font-bold">245ms</div>
            <p className="text-xs text-gray-600">-8% from last period</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Active Users</span>
            </div>
            <div className="text-2xl font-bold">4,521</div>
            <p className="text-xs text-gray-600">+23% from last period</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Satisfaction</span>
            </div>
            <div className="text-2xl font-bold">4.2/5</div>
            <p className="text-xs text-gray-600">+0.3 from last period</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="errors" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Errors ({filteredErrors.length})
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Performance
              </TabsTrigger>
              <TabsTrigger value="behavior" className="flex items-center gap-2">
                <MousePointer className="h-4 w-4" />
                User Behavior
              </TabsTrigger>
              <TabsTrigger value="features" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Feature Usage
              </TabsTrigger>
              <TabsTrigger value="improvements" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Suggestions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="errors" className="space-y-4">
              {/* Filters */}
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="runtime">Runtime</SelectItem>
                      <SelectItem value="network">Network</SelectItem>
                      <SelectItem value="validation">Validation</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  placeholder="Search errors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
              </div>

              {/* Error List */}
              <div className="space-y-4">
                {filteredErrors.map((error) => (
                  <Card key={error.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                          <div>
                            <h4 className="font-medium">{error.message}</h4>
                            <p className="text-sm text-gray-600">
                              Last occurred: {error.lastOccurred}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityColor(error.severity) as any}>
                            {error.severity}
                          </Badge>
                          <Badge variant="outline">{error.type}</Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                        <div>
                          <span className="text-gray-600">Frequency: </span>
                          <span className="font-medium">{error.frequency} times</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Affected Users: </span>
                          <span className="font-medium">{error.affectedUsers}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Type: </span>
                          <span className="font-medium capitalize">{error.type}</span>
                        </div>
                      </div>
                      
                      <details className="cursor-pointer">
                        <summary className="text-sm font-medium mb-2">Stack Trace</summary>
                        <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                          <code className="text-xs">{error.stackTrace}</code>
                        </div>
                      </details>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Response Time Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="timestamp" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="responseTime" stroke="#8884d8" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Throughput & Error Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="timestamp" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="throughput" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                        <Area type="monotone" dataKey="errorRate" stackId="2" stroke="#ffc658" fill="#ffc658" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>System Resource Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="cpuUsage" fill="#8884d8" />
                      <Bar dataKey="memoryUsage" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="behavior" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userBehaviorData.map((behavior) => (
                  <Card key={behavior.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <MousePointer className="h-4 w-4" />
                          <h4 className="font-medium">{behavior.action}</h4>
                        </div>
                        <Badge variant="outline">{behavior.page}</Badge>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Users: </span>
                            <span className="font-medium">{behavior.userCount.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Avg Duration: </span>
                            <span className="font-medium">{behavior.avgDuration}s</span>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-600">Conversion Rate</span>
                            <span className="text-sm font-medium">{behavior.conversionRate}%</span>
                          </div>
                          <Progress value={behavior.conversionRate} className="w-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="features" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {featureUsageData.map((feature) => (
                  <Card key={feature.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{feature.name}</h4>
                        <div className="flex items-center gap-2">
                          {getTrendIcon(feature.trend)}
                          <Badge variant="outline">{feature.usage}% usage</Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-600">Usage</span>
                            <span className="text-sm font-medium">{feature.usage}%</span>
                          </div>
                          <Progress value={feature.usage} className="w-full" />
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-600">Satisfaction</span>
                            <span className="text-sm font-medium">{feature.userSatisfaction}/5</span>
                          </div>
                          <Progress value={(feature.userSatisfaction / 5) * 100} className="w-full" />
                        </div>
                        
                        <p className="text-xs text-gray-600">
                          Updated: {feature.lastUpdated}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="improvements" className="space-y-4">
              <div className="grid gap-4">
                {improvementSuggestions.map((improvement) => (
                  <Card key={improvement.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5" />
                          <div>
                            <h4 className="font-medium">{improvement.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{improvement.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getPriorityColor(improvement.priority) as any}>
                            {improvement.priority} priority
                          </Badge>
                          <Badge variant="outline">{improvement.type}</Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-600">Impact</span>
                            <span className="text-sm font-medium">{improvement.impact}%</span>
                          </div>
                          <Progress value={improvement.impact} className="w-full" />
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-600">Effort</span>
                            <span className="text-sm font-medium">{improvement.effort}%</span>
                          </div>
                          <Progress value={improvement.effort} className="w-full" />
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-600">ROI</span>
                            <span className="text-sm font-medium">{improvement.roi}x</span>
                          </div>
                          <Progress value={(improvement.roi / 5) * 100} className="w-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductionFeedback;