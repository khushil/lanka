import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Button,
  Chip,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Container,
  Grid,
  Paper
} from '@mui/material';
import {
  Code,
  Science,
  Timeline,
  BarChart,
  ShowChart,
  Visibility,
  Settings,
  Download,
  Refresh,
  FlashOn,
  TrendingUp,
  Warning,
  CheckCircle,
  Schedule
} from '@mui/icons-material';

// Import visualization components
import CodeGenerationWorkspace from '../components/visualizations/CodeGenerationWorkspace';
import TestCoverageMap from '../components/visualizations/TestCoverageMap';
import DevOpsPipeline from '../components/visualizations/DevOpsPipeline';
import CodeQualityHeatmap from '../components/visualizations/CodeQualityHeatmap';
import ProductionInsights from '../components/visualizations/ProductionInsights';

// Import hooks and utilities
import { useDevelopmentData } from '../hooks/useDevelopmentData';

// Utility functions for formatting
const formatters = {
  formatDuration: (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
};

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
  component: React.ComponentType<any>;
  metrics?: {
    primary: { label: string; value: string | number; trend?: 'up' | 'down' | 'stable' };
    secondary?: { label: string; value: string | number }[];
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`development-tabpanel-${index}`}
      aria-labelledby={`development-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const DevelopmentVisual: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
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
      icon: <Code sx={{ fontSize: 20 }} />,
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
      icon: <Science sx={{ fontSize: 20 }} />,
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
      icon: <Timeline sx={{ fontSize: 20 }} />,
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
      icon: <BarChart sx={{ fontSize: 20 }} />,
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
      icon: <ShowChart sx={{ fontSize: 20 }} />,
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
      activeTab: visualizationTabs[activeTab]?.id,
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

  const getStatusIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />;
      case 'down':
        return <Warning sx={{ fontSize: 16, color: 'warning.main' }} />;
      default:
        return <CheckCircle sx={{ fontSize: 16, color: 'primary.main' }} />;
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (error) {
    return (
      <Box sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #ffebee 0%, #fce4ec 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Card sx={{ maxWidth: 400, width: '100%' }}>
          <CardContent sx={{ p: 3, textAlign: 'center' }}>
            <Warning sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Failed to Load Development Data
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {error}
            </Typography>
            <Button 
              onClick={handleRefresh} 
              disabled={isRefreshing}
              variant="contained"
              startIcon={<Refresh sx={{ transform: isRefreshing ? 'rotate(180deg)' : 'none' }} />}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
      py: 4
    }}>
      <Container maxWidth="xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ 
                p: 1.5, 
                background: 'linear-gradient(135deg, #1976d2, #9c27b0)',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FlashOn sx={{ fontSize: 32, color: 'white' }} />
              </Box>
              <Box>
                <Typography variant="h4" component="h1" sx={{ 
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #1976d2, #9c27b0)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 0.5
                }}>
                  Development Intelligence
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Comprehensive visual analytics for modern software development
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  variant={viewMode === 'overview' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setViewMode('overview')}
                  startIcon={<Visibility />}
                >
                  Overview
                </Button>
                <Button
                  variant={viewMode === 'detailed' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setViewMode('detailed')}
                  startIcon={<Settings />}
                >
                  Detailed
                </Button>
              </Box>
              
              <Button
                variant="outlined"
                size="small"
                onClick={handleRefresh}
                disabled={isRefreshing}
                startIcon={<Refresh sx={{ transform: isRefreshing ? 'rotate(180deg)' : 'none' }} />}
              >
                Refresh
              </Button>
              
              <Button
                variant="outlined"
                size="small"
                onClick={handleExportData}
                startIcon={<Download />}
              >
                Export
              </Button>
            </Box>
          </Box>

          {/* Quick Metrics Overview */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {visualizationTabs.map((tab, index) => (
              <Grid item xs={12} sm={6} lg={2.4} key={tab.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 4
                      },
                      border: activeTab === index ? 2 : 0,
                      borderColor: 'primary.main',
                      backgroundColor: activeTab === index ? 'primary.50' : 'background.paper'
                    }}
                    onClick={() => setActiveTab(index)}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{
                          p: 1,
                          borderRadius: 1,
                          backgroundColor: activeTab === index ? 'primary.main' : 'grey.100',
                          color: activeTab === index ? 'white' : 'text.secondary'
                        }}>
                          {tab.icon}
                        </Box>
                        {tab.metrics?.primary.trend && getStatusIcon(tab.metrics.primary.trend)}
                      </Box>
                      
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                        {tab.name}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Typography variant="h6" color="primary.main" sx={{ fontWeight: 'bold' }}>
                          {tab.metrics?.primary.value}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {tab.metrics?.primary.label}
                        </Typography>
                      </Box>
                      
                      {tab.metrics?.secondary && (
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                          {tab.metrics.secondary.map((metric, idx) => (
                            <Box key={idx} sx={{ textAlign: 'center' }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                                {metric.value}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                {metric.label}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </motion.div>

        {/* Main Visualization Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Paper sx={{ 
            boxShadow: 4,
            borderRadius: 2,
            overflow: 'hidden',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)'
          }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': {
                  minHeight: 72,
                  textTransform: 'none',
                  fontSize: '1rem'
                }
              }}
            >
              {visualizationTabs.map((tab, index) => (
                <Tab
                  key={index}
                  icon={tab.icon}
                  label={tab.name}
                  iconPosition="start"
                  sx={{ gap: 1 }}
                />
              ))}
            </Tabs>

            {/* Tab Panels */}
            <AnimatePresence mode="wait">
              {visualizationTabs.map((tab, index) => (
                <TabPanel key={index} value={activeTab} index={index}>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{ p: 1, backgroundColor: 'primary.50', borderRadius: 1 }}>
                            {tab.icon}
                          </Box>
                          <Box>
                            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                              {tab.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {tab.description}
                            </Typography>
                          </Box>
                        </Box>
                        
                        {isLoading && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={20} />
                            <Typography variant="body2" color="text.secondary">
                              Loading data...
                            </Typography>
                          </Box>
                        )}
                      </Box>
                      
                      {tab.metrics && (
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 3, 
                          p: 2, 
                          backgroundColor: 'grey.50',
                          borderRadius: 1
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              {tab.metrics.primary.label}:
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                              {tab.metrics.primary.value}
                            </Typography>
                            {tab.metrics.primary.trend && getStatusIcon(tab.metrics.primary.trend)}
                          </Box>
                          
                          {tab.metrics.secondary && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              {tab.metrics.secondary.map((metric, idx) => (
                                <Chip 
                                  key={idx} 
                                  label={`${metric.label}: ${metric.value}`}
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>
                    
                    <Box sx={{ minHeight: 600, position: 'relative' }}>
                      <tab.component 
                        viewMode={viewMode}
                        isLoading={isLoading}
                        autoRefresh={autoRefresh}
                      />
                    </Box>
                  </motion.div>
                </TabPanel>
              ))}
            </AnimatePresence>
          </Paper>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              LANKA Development Intelligence • Real-time insights powered by AI
            </Typography>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};

export default DevelopmentVisual;