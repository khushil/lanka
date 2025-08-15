import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Code2,
  TestTube2,
  Workflow,
  HeatMap,
  Activity,
  Eye,
  Settings,
  Download,
  RefreshCw,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';

// Import visualization components
import CodeGenerationWorkspace from '@/components/visualizations/CodeGenerationWorkspace';
import TestCoverageMap from '@/components/visualizations/TestCoverageMap';
import DevOpsPipeline from '@/components/visualizations/DevOpsPipeline';
import CodeQualityHeatmap from '@/components/visualizations/CodeQualityHeatmap';
import ProductionInsights from '@/components/visualizations/ProductionInsights';

// Import hooks and utilities
import { useDevelopmentData } from '@/hooks/useDevelopmentData';
import { formatters } from '@/utils';

interface DevelopmentMetrics {
  codeGeneration: {
    totalGenerated: number;
    successRate: number;
    avgQualityScore: number;
    trend: 'up' | 'down' | 'stable';
  };
  testing: {
    overallCoverage: number;
    testCount: number;
    passRate: number;
    trend: 'up' | 'down' | 'stable';
  };
  pipeline: {
    deploymentsToday: number;
    successRate: number;
    avgDuration: number;
    trend: 'up' | 'down' | 'stable';
  };
  quality: {
    overallScore: number;
    technicalDebt: number;
    vulnerabilities: number;
    trend: 'up' | 'down' | 'stable';
  };
  production: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    trend: 'up' | 'down' | 'stable';
  };
}

interface VisualizationTab {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  component: React.ComponentType;
  metrics?: {
    primary: { label: string; value: string | number; trend?: 'up' | 'down' | 'stable' };
    secondary?: { label: string; value: string | number }[];
  };
}

const DevelopmentVisual: React.FC = () => {
  const [activeTab, setActiveTab] = useState('workspace');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const {
    developmentMetrics,
    isLoading,
    error,
    refreshData,
  } = useDevelopmentData({ autoRefresh });

  const visualizationTabs: VisualizationTab[] = [
    {
      id: 'workspace',
      name: 'Code Workspace',
      icon: <Code2 className="h-5 w-5" />,
      description: 'AI-powered code generation with requirements analysis',
      component: CodeGenerationWorkspace,
      metrics: {
        primary: {
          label: 'Generated Today',
          value: developmentMetrics?.codeGeneration.totalGenerated || 0,
          trend: developmentMetrics?.codeGeneration.trend
        },
        secondary: [
          { label: 'Success Rate', value: `${developmentMetrics?.codeGeneration.successRate || 0}%` },
          { label: 'Avg Quality', value: `${developmentMetrics?.codeGeneration.avgQualityScore || 0}/100` }
        ]
      }
    },
    {
      id: 'coverage',
      name: 'Test Coverage',
      icon: <TestTube2 className="h-5 w-5" />,
      description: 'Interactive test coverage analysis and visualization',
      component: TestCoverageMap,
      metrics: {
        primary: {
          label: 'Coverage',
          value: `${developmentMetrics?.testing.overallCoverage || 0}%`,
          trend: developmentMetrics?.testing.trend
        },
        secondary: [
          { label: 'Tests', value: developmentMetrics?.testing.testCount || 0 },
          { label: 'Pass Rate', value: `${developmentMetrics?.testing.passRate || 0}%` }
        ]
      }
    },
    {
      id: 'pipeline',
      name: 'DevOps Pipeline',
      icon: <Workflow className="h-5 w-5" />,
      description: 'Animated CI/CD pipeline visualization with real-time status',
      component: DevOpsPipeline,
      metrics: {
        primary: {
          label: 'Deployments',
          value: developmentMetrics?.pipeline.deploymentsToday || 0,
          trend: developmentMetrics?.pipeline.trend
        },
        secondary: [
          { label: 'Success Rate', value: `${developmentMetrics?.pipeline.successRate || 0}%` },
          { label: 'Avg Duration', value: formatters.formatDuration(developmentMetrics?.pipeline.avgDuration || 0) }
        ]
      }
    },
    {
      id: 'quality',
      name: 'Code Quality',
      icon: <HeatMap className="h-5 w-5" />,
      description: 'Code quality heatmap with technical debt analysis',
      component: CodeQualityHeatmap,
      metrics: {
        primary: {
          label: 'Quality Score',
          value: `${developmentMetrics?.quality.overallScore || 0}/100`,
          trend: developmentMetrics?.quality.trend
        },
        secondary: [
          { label: 'Tech Debt', value: `${developmentMetrics?.quality.technicalDebt || 0}h` },
          { label: 'Vulnerabilities', value: developmentMetrics?.quality.vulnerabilities || 0 }
        ]
      }
    },
    {
      id: 'production',
      name: 'Production Insights',
      icon: <Activity className="h-5 w-5" />,
      description: 'Real-time production metrics and performance dashboard',
      component: ProductionInsights,
      metrics: {
        primary: {
          label: 'Uptime',
          value: `${developmentMetrics?.production.uptime || 0}%`,
          trend: developmentMetrics?.production.trend
        },
        secondary: [
          { label: 'Response Time', value: `${developmentMetrics?.production.responseTime || 0}ms` },
          { label: 'Error Rate', value: `${developmentMetrics?.production.errorRate || 0}%` }
        ]
      }
    }
  ];

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [refreshData]);

  const handleExportData = useCallback(() => {
    const exportData = {
      metrics: developmentMetrics,
      timestamp: new Date().toISOString(),
      activeTab,
      viewMode
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `development-metrics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [developmentMetrics, activeTab, viewMode]);

  const getStatusIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const activeTabConfig = visualizationTabs.find(tab => tab.id === activeTab);
  const ActiveComponent = activeTabConfig?.component;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-red-900/20 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to Load Development Data</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
            <Button onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Development Intelligence
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  Comprehensive visual analytics for modern software development
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'overview' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('overview')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Overview
                </Button>
                <Button
                  variant={viewMode === 'detailed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('detailed')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Detailed
                </Button>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportData}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Quick Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {visualizationTabs.map((tab, index) => (
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    activeTab === tab.id 
                      ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'hover:border-blue-300'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2 rounded-lg ${
                        activeTab === tab.id 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}>
                        {tab.icon}
                      </div>
                      {tab.metrics?.primary.trend && getStatusIcon(tab.metrics.primary.trend)}
                    </div>
                    
                    <h3 className="font-semibold text-sm mb-1">{tab.name}</h3>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {tab.metrics?.primary.value}
                      </span>
                      <span className="text-xs text-gray-500">
                        {tab.metrics?.primary.label}
                      </span>
                    </div>
                    
                    {tab.metrics?.secondary && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {tab.metrics.secondary.map((metric, idx) => (
                          <div key={idx} className="text-gray-600 dark:text-gray-400">
                            <span className="font-medium">{metric.value}</span>
                            <div className="text-[10px]">{metric.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Main Visualization Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="shadow-2xl border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
                  {visualizationTabs.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex items-center gap-3 px-6 py-4 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent rounded-none"
                    >
                      {tab.icon}
                      <div className="text-left">
                        <div className="font-medium">{tab.name}</div>
                        <div className="text-xs text-gray-500 hidden lg:block">
                          {tab.description}
                        </div>
                      </div>
                    </TabsTrigger>
                  ))}
                </TabsList>

                <AnimatePresence mode="wait">
                  {visualizationTabs.map((tab) => (
                    <TabsContent key={tab.id} value={tab.id} className="p-6 mt-0">
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                {tab.icon}
                              </div>
                              <div>
                                <h2 className="text-2xl font-bold">{tab.name}</h2>
                                <p className="text-gray-600 dark:text-gray-300">
                                  {tab.description}
                                </p>
                              </div>
                            </div>
                            
                            {isLoading && (
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Clock className="h-4 w-4 animate-spin" />
                                Loading data...
                              </div>
                            )}
                          </div>
                          
                          {tab.metrics && (
                            <div className="flex items-center gap-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {tab.metrics.primary.label}:
                                </span>
                                <span className="font-semibold text-lg">
                                  {tab.metrics.primary.value}
                                </span>
                                {tab.metrics.primary.trend && getStatusIcon(tab.metrics.primary.trend)}
                              </div>
                              
                              {tab.metrics.secondary && (
                                <div className="flex items-center gap-4">
                                  {tab.metrics.secondary.map((metric, idx) => (
                                    <Badge key={idx} variant="secondary" className="gap-1">
                                      <span className="text-xs">{metric.label}:</span>
                                      <span className="font-medium">{metric.value}</span>
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {ActiveComponent && (
                          <div className="min-h-[600px]">
                            <ActiveComponent 
                              viewMode={viewMode}
                              isLoading={isLoading}
                              autoRefresh={autoRefresh}
                            />
                          </div>
                        )}
                      </motion.div>
                    </TabsContent>
                  ))}
                </AnimatePresence>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">
            LANKA Development Intelligence • Real-time insights powered by AI
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default DevelopmentVisual;
