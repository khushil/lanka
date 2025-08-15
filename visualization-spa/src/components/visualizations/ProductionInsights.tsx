import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Grid,
  Alert
} from '@mui/material';
import {
  ShowChart,
  Speed,
  Security,
  Storage,
  CloudUpload,
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Error,
  Refresh,
  Timeline,
  Monitor,
  Memory,
  Analytics
} from '@mui/icons-material';

interface ProductionInsightsProps {
  viewMode?: 'overview' | 'detailed';
  isLoading?: boolean;
  autoRefresh?: boolean;
}

interface SystemMetrics {
  uptime: number; // percentage
  responseTime: number; // milliseconds
  errorRate: number; // percentage
  throughput: number; // requests per second
  cpuUsage: number; // percentage
  memoryUsage: number; // percentage
  diskUsage: number; // percentage
  networkLatency: number; // milliseconds
}

interface PerformanceAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  lastChecked: Date;
  uptime: number;
}

const ProductionInsights: React.FC<ProductionInsightsProps> = ({
  viewMode = 'overview',
  isLoading = false,
  autoRefresh = true
}) => {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');
  const [selectedService, setSelectedService] = useState<string>('all');

  // Mock data generation
  useEffect(() => {
    const generateMockMetrics = (): SystemMetrics => ({
      uptime: 99.5 + Math.random() * 0.5,
      responseTime: 150 + Math.random() * 100,
      errorRate: Math.random() * 2,
      throughput: 1200 + Math.random() * 300,
      cpuUsage: 45 + Math.random() * 30,
      memoryUsage: 60 + Math.random() * 25,
      diskUsage: 70 + Math.random() * 20,
      networkLatency: 10 + Math.random() * 15
    });

    const generateMockAlerts = (): PerformanceAlert[] => [
      {
        id: '1',
        type: 'warning',
        message: 'High memory usage detected on server-01',
        timestamp: new Date(Date.now() - 1800000),
        resolved: false
      },
      {
        id: '2',
        type: 'error',
        message: 'Database connection timeout',
        timestamp: new Date(Date.now() - 3600000),
        resolved: true
      },
      {
        id: '3',
        type: 'info',
        message: 'Scheduled maintenance completed successfully',
        timestamp: new Date(Date.now() - 7200000),
        resolved: true
      }
    ];

    const generateMockServices = (): ServiceStatus[] => [
      {
        name: 'API Gateway',
        status: 'healthy',
        responseTime: 45,
        lastChecked: new Date(),
        uptime: 99.8
      },
      {
        name: 'User Service',
        status: 'healthy',
        responseTime: 120,
        lastChecked: new Date(),
        uptime: 99.9
      },
      {
        name: 'Payment Service',
        status: 'degraded',
        responseTime: 350,
        lastChecked: new Date(),
        uptime: 98.5
      },
      {
        name: 'Database',
        status: 'healthy',
        responseTime: 25,
        lastChecked: new Date(),
        uptime: 99.95
      },
      {
        name: 'Cache Redis',
        status: 'healthy',
        responseTime: 5,
        lastChecked: new Date(),
        uptime: 99.99
      }
    ];

    setSystemMetrics(generateMockMetrics());
    setAlerts(generateMockAlerts());
    setServices(generateMockServices());
  }, []);

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'down':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle sx={{ fontSize: 20, color: 'success.main' }} />;
      case 'degraded':
        return <Warning sx={{ fontSize: 20, color: 'warning.main' }} />;
      case 'down':
        return <Error sx={{ fontSize: 20, color: 'error.main' }} />;
      default:
        return <CheckCircle sx={{ fontSize: 20, color: 'grey.400' }} />;
    }
  };

  const getMetricColor = (value: number, metric: string) => {
    switch (metric) {
      case 'uptime':
        return value >= 99 ? 'success.main' : value >= 95 ? 'warning.main' : 'error.main';
      case 'responseTime':
        return value <= 200 ? 'success.main' : value <= 500 ? 'warning.main' : 'error.main';
      case 'errorRate':
        return value <= 1 ? 'success.main' : value <= 5 ? 'warning.main' : 'error.main';
      case 'usage':
        return value <= 70 ? 'success.main' : value <= 85 ? 'warning.main' : 'error.main';
      default:
        return 'primary.main';
    }
  };

  const handleRefresh = useCallback(() => {
    // Mock refresh logic
    console.log('Refreshing production metrics...');
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* System Metrics Overview */}
      {systemMetrics && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
          {[
            { 
              label: 'Uptime', 
              value: `${systemMetrics.uptime.toFixed(2)}%`, 
              icon: <ShowChart sx={{ fontSize: 20 }} />, 
              color: getMetricColor(systemMetrics.uptime, 'uptime') 
            },
            { 
              label: 'Response Time', 
              value: `${systemMetrics.responseTime.toFixed(0)}ms`, 
              icon: <Speed sx={{ fontSize: 20 }} />, 
              color: getMetricColor(systemMetrics.responseTime, 'responseTime') 
            },
            { 
              label: 'Error Rate', 
              value: `${systemMetrics.errorRate.toFixed(2)}%`, 
              icon: <Warning sx={{ fontSize: 20 }} />, 
              color: getMetricColor(systemMetrics.errorRate, 'errorRate') 
            },
            { 
              label: 'Throughput', 
              value: `${systemMetrics.throughput.toFixed(0)} req/s`, 
              icon: <Analytics sx={{ fontSize: 20 }} />, 
              color: 'primary.main' 
            }
          ].map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ p: 1, backgroundColor: 'primary.50', borderRadius: 1 }}>
                      {metric.icon}
                    </Box>
                    <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">{metric.label}</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: metric.color }}>
                      {metric.value}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </Box>
      )}

      {/* Resource Usage */}
      {systemMetrics && (
        <Card>
          <CardHeader>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Monitor sx={{ fontSize: 20 }} />
                Resource Usage
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={handleRefresh}
                startIcon={<Refresh />}
              >
                Refresh
              </Button>
            </Box>
          </CardHeader>
          <CardContent>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2">CPU Usage</Typography>
                  <Typography variant="body2" sx={{ color: getMetricColor(systemMetrics.cpuUsage, 'usage') }}>
                    {systemMetrics.cpuUsage.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={systemMetrics.cpuUsage} 
                  sx={{ 
                    height: 8, 
                    backgroundColor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getMetricColor(systemMetrics.cpuUsage, 'usage')
                    }
                  }} 
                />
              </Box>
              
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2">Memory Usage</Typography>
                  <Typography variant="body2" sx={{ color: getMetricColor(systemMetrics.memoryUsage, 'usage') }}>
                    {systemMetrics.memoryUsage.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={systemMetrics.memoryUsage} 
                  sx={{ 
                    height: 8, 
                    backgroundColor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getMetricColor(systemMetrics.memoryUsage, 'usage')
                    }
                  }} 
                />
              </Box>
              
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2">Disk Usage</Typography>
                  <Typography variant="body2" sx={{ color: getMetricColor(systemMetrics.diskUsage, 'usage') }}>
                    {systemMetrics.diskUsage.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={systemMetrics.diskUsage} 
                  sx={{ 
                    height: 8, 
                    backgroundColor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getMetricColor(systemMetrics.diskUsage, 'usage')
                    }
                  }} 
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Service Status */}
      <Card>
        <CardHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CloudUpload sx={{ fontSize: 20 }} />
              Service Status
            </Typography>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                label="Time Range"
              >
                <MenuItem value="1h">Last Hour</MenuItem>
                <MenuItem value="24h">Last 24 Hours</MenuItem>
                <MenuItem value="7d">Last 7 Days</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardHeader>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {services.map((service) => (
              <Paper 
                key={service.name} 
                variant="outlined" 
                sx={{ p: 2 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {getStatusIcon(service.status)}
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {service.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Last checked: {service.lastChecked.toLocaleTimeString()}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">
                        {service.responseTime}ms
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {service.uptime.toFixed(2)}% uptime
                      </Typography>
                    </Box>
                    <Chip 
                      label={service.status}
                      color={getStatusColor(service.status) as any}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning sx={{ fontSize: 20 }} />
            Recent Alerts
          </Typography>
        </CardHeader>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {alerts.length === 0 ? (
              <Alert severity="success">No recent alerts</Alert>
            ) : (
              alerts.map((alert) => (
                <Alert 
                  key={alert.id} 
                  severity={alert.type as any}
                  variant={alert.resolved ? "outlined" : "standard"}
                  sx={{ opacity: alert.resolved ? 0.7 : 1 }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    <Box>
                      <Typography variant="body2">{alert.message}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {alert.timestamp.toLocaleString()}
                      </Typography>
                    </Box>
                    {alert.resolved && (
                      <Chip label="Resolved" size="small" color="success" variant="outlined" />
                    )}
                  </Box>
                </Alert>
              ))
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Performance Statistics */}
      <Card>
        <CardHeader>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Timeline sx={{ fontSize: 20 }} />
            Performance Statistics
          </Typography>
        </CardHeader>
        <CardContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">99.8%</Typography>
              <Typography variant="body2" color="text.secondary">Avg Uptime</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main">156ms</Typography>
              <Typography variant="body2" color="text.secondary">Avg Response</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">0.8%</Typography>
              <Typography variant="body2" color="text.secondary">Error Rate</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">1.2M</Typography>
              <Typography variant="body2" color="text.secondary">Daily Requests</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProductionInsights;