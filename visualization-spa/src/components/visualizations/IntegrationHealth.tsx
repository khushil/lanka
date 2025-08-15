import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  CircularProgress,
  Tooltip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Error,
  Info,
  TrendingUp,
  TrendingDown,
  Speed,
  Memory,
  Storage,
  NetworkCheck,
  Security,
  BugReport,
  Refresh,
  ExpandMore,
  Timeline,
  Dashboard
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface HealthMetric {
  name: string;
  value: number;
  threshold: number;
  status: 'healthy' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  unit: string;
  description: string;
}

interface ServiceHealth {
  serviceName: string;
  status: 'online' | 'offline' | 'degraded';
  uptime: number;
  responseTime: number;
  errorRate: number;
  lastCheck: string;
  endpoints: Array<{
    name: string;
    status: 'healthy' | 'warning' | 'error';
    responseTime: number;
  }>;
}

interface SystemAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  source: string;
  acknowledged: boolean;
  resolved: boolean;
}

interface IntegrationHealthMetrics {
  overallHealth: number;
  systemMetrics: HealthMetric[];
  services: ServiceHealth[];
  alerts: SystemAlert[];
  historicalData: Array<{
    timestamp: number;
    overallHealth: number;
    cpuUsage: number;
    memoryUsage: number;
    networkLatency: number;
    errorRate: number;
  }>;
  resourceUsage: {
    cpu: { current: number; average: number; peak: number };
    memory: { current: number; average: number; peak: number };
    disk: { current: number; average: number; peak: number };
    network: { inbound: number; outbound: number; latency: number };
  };
}

interface IntegrationHealthProps {
  metrics: IntegrationHealthMetrics | null;
  isConnected: boolean;
  showDetails: boolean;
}

const IntegrationHealth: React.FC<IntegrationHealthProps> = ({
  metrics,
  isConnected,
  showDetails
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('6h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getHealthColor = (value: number): string => {
    if (value >= 90) return '#4CAF50';
    if (value >= 70) return '#FF9800';
    return '#F44336';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return <CheckCircle color="success" />;
      case 'warning':
      case 'degraded':
        return <Warning color="warning" />;
      case 'critical':
      case 'error':
      case 'offline':
        return <Error color="error" />;
      default:
        return <Info color="info" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp color="success" />;
      case 'down':
        return <TrendingDown color="error" />;
      default:
        return <Timeline color="info" />;
    }
  };

  const formatTimestamp = (timestamp: string | number) => {
    return new Date(timestamp).toLocaleString();
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        // Trigger data refresh
        console.log('Auto-refreshing health metrics');
      }, 30000); // Refresh every 30 seconds
    } else if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh]);

  if (!metrics) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Typography variant="h6" color="textSecondary">
          No health metrics available
        </Typography>
      </Box>
    );
  }

  const alertCounts = {
    critical: metrics.alerts.filter(a => a.severity === 'critical' && !a.resolved).length,
    warning: metrics.alerts.filter(a => a.severity === 'warning' && !a.resolved).length,
    info: metrics.alerts.filter(a => a.severity === 'info' && !a.resolved).length
  };

  const pieData = [
    { name: 'Healthy', value: metrics.services.filter(s => s.status === 'online').length, color: '#4CAF50' },
    { name: 'Degraded', value: metrics.services.filter(s => s.status === 'degraded').length, color: '#FF9800' },
    { name: 'Offline', value: metrics.services.filter(s => s.status === 'offline').length, color: '#F44336' }
  ];

  return (
    <Box sx={{ width: '100%', height: '100%', overflow: 'auto', p: 2 }}>
      {/* Connection Status */}
      <Box sx={{ mb: 2 }}>
        <Alert 
          severity={isConnected ? 'success' : 'warning'}
          action={
            <IconButton size="small" onClick={() => window.location.reload()}>
              <Refresh />
            </IconButton>
          }
        >
          {isConnected ? 'Real-time monitoring active' : 'Connection lost - data may be outdated'}
        </Alert>
      </Box>

      {/* Overall Health Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={3}>
                <Box display="flex" alignItems="center" justifyContent="center">
                  <Box position="relative" display="inline-flex">
                    <CircularProgress
                      variant="determinate"
                      value={metrics.overallHealth}
                      size={120}
                      thickness={6}
                      sx={{
                        color: getHealthColor(metrics.overallHealth),
                        '& .MuiCircularProgress-circle': {
                          strokeLinecap: 'round',
                        },
                      }}
                    />
                    <Box
                      sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: 'absolute',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column'
                      }}
                    >
                      <Typography variant="h4" component="div" color="white" fontWeight="bold">
                        {Math.round(metrics.overallHealth)}%
                      </Typography>
                      <Typography variant="caption" color="white">
                        Health Score
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={9}>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Box textAlign="center">
                      <Typography variant="h5" color="white" fontWeight="bold">
                        {metrics.services.filter(s => s.status === 'online').length}
                      </Typography>
                      <Typography variant="body2" color="rgba(255,255,255,0.8)">
                        Services Online
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6} sm={3}>
                    <Box textAlign="center">
                      <Typography variant="h5" color="white" fontWeight="bold">
                        {alertCounts.critical}
                      </Typography>
                      <Typography variant="body2" color="rgba(255,255,255,0.8)">
                        Critical Alerts
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6} sm={3}>
                    <Box textAlign="center">
                      <Typography variant="h5" color="white" fontWeight="bold">
                        {Math.round(metrics.resourceUsage.cpu.current)}%
                      </Typography>
                      <Typography variant="body2" color="rgba(255,255,255,0.8)">
                        CPU Usage
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6} sm={3}>
                    <Box textAlign="center">
                      <Typography variant="h5" color="white" fontWeight="bold">
                        {Math.round(metrics.resourceUsage.memory.current)}%
                      </Typography>
                      <Typography variant="body2" color="rgba(255,255,255,0.8)">
                        Memory Usage
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </motion.div>

      {showDetails && (
        <Grid container spacing={3}>
          {/* System Metrics */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  System Metrics
                </Typography>
                
                {metrics.systemMetrics.map((metric, index) => (
                  <motion.div
                    key={metric.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Box sx={{ mb: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getStatusIcon(metric.status)}
                          <Typography variant="body2" fontWeight="medium">
                            {metric.name}
                          </Typography>
                          {getTrendIcon(metric.trend)}
                        </Box>
                        <Tooltip title={metric.description}>
                          <Chip
                            label={`${metric.value}${metric.unit}`}
                            size="small"
                            color={metric.status === 'healthy' ? 'success' : metric.status === 'warning' ? 'warning' : 'error'}
                          />
                        </Tooltip>
                      </Box>
                      
                      <LinearProgress
                        variant="determinate"
                        value={(metric.value / metric.threshold) * 100}
                        color={metric.status === 'healthy' ? 'success' : metric.status === 'warning' ? 'warning' : 'error'}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                      
                      <Typography variant="caption" color="textSecondary">
                        Threshold: {metric.threshold}{metric.unit}
                      </Typography>
                    </Box>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </Grid>
          
          {/* Services Status */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Services Status
                  </Typography>
                  
                  <Box width={100} height={100}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={20}
                          outerRadius={40}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>
                
                <List dense>
                  {metrics.services.map((service, index) => (
                    <motion.div
                      key={service.serviceName}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <ListItem
                        sx={{
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1
                        }}
                      >
                        <ListItemIcon>
                          {getStatusIcon(service.status)}
                        </ListItemIcon>
                        
                        <ListItemText
                          primary={service.serviceName}
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                Uptime: {service.uptime.toFixed(2)}% | Response: {service.responseTime}ms
                              </Typography>
                              <Typography variant="caption" display="block">
                                Error Rate: {service.errorRate.toFixed(2)}% | Last Check: {formatTimestamp(service.lastCheck)}
                              </Typography>
                            </Box>
                          }
                        />
                        
                        <Box>
                          <Chip
                            label={service.status}
                            size="small"
                            color={
                              service.status === 'online' ? 'success' :
                              service.status === 'degraded' ? 'warning' : 'error'
                            }
                          />
                        </Box>
                      </ListItem>
                    </motion.div>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Historical Data Chart */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Health Trends (Last {selectedTimeRange})
                </Typography>
                
                <Box height={300}>
                  <ResponsiveContainer>
                    <LineChart data={metrics.historicalData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                        stroke="#888"
                      />
                      <YAxis stroke="#888" />
                      
                      <Line
                        type="monotone"
                        dataKey="overallHealth"
                        stroke="#4CAF50"
                        strokeWidth={2}
                        dot={false}
                        name="Overall Health"
                      />
                      
                      <Line
                        type="monotone"
                        dataKey="cpuUsage"
                        stroke="#2196F3"
                        strokeWidth={2}
                        dot={false}
                        name="CPU Usage"
                      />
                      
                      <Line
                        type="monotone"
                        dataKey="memoryUsage"
                        stroke="#FF9800"
                        strokeWidth={2}
                        dot={false}
                        name="Memory Usage"
                      />
                      
                      <Line
                        type="monotone"
                        dataKey="networkLatency"
                        stroke="#9C27B0"
                        strokeWidth={2}
                        dot={false}
                        name="Network Latency"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Resource Usage */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Resource Usage
                </Typography>
                
                <Grid container spacing={2}>
                  {[
                    { name: 'CPU', data: metrics.resourceUsage.cpu, icon: <Speed />, color: '#4CAF50' },
                    { name: 'Memory', data: metrics.resourceUsage.memory, icon: <Memory />, color: '#2196F3' },
                    { name: 'Disk', data: metrics.resourceUsage.disk, icon: <Storage />, color: '#FF9800' }
                  ].map((resource) => (
                    <Grid item xs={12} key={resource.name}>
                      <Paper sx={{ p: 2 }}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          {resource.icon}
                          <Typography variant="subtitle2">
                            {resource.name}
                          </Typography>
                        </Box>
                        
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="caption">Current: {resource.data.current.toFixed(1)}%</Typography>
                          <Typography variant="caption">Avg: {resource.data.average.toFixed(1)}%</Typography>
                          <Typography variant="caption">Peak: {resource.data.peak.toFixed(1)}%</Typography>
                        </Box>
                        
                        <LinearProgress
                          variant="determinate"
                          value={resource.data.current}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: 'rgba(0,0,0,0.1)',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: resource.color
                            }
                          }}
                        />
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Active Alerts */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Active Alerts ({metrics.alerts.filter(a => !a.resolved).length})
                </Typography>
                
                <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {metrics.alerts
                    .filter(alert => !alert.resolved)
                    .sort((a, b) => {
                      const severityOrder = { critical: 3, error: 2, warning: 1, info: 0 };
                      return severityOrder[b.severity] - severityOrder[a.severity];
                    })
                    .map((alert, index) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <ListItem
                          sx={{
                            border: 1,
                            borderColor: alert.severity === 'critical' ? 'error.main' :
                                       alert.severity === 'warning' ? 'warning.main' : 'info.main',
                            borderRadius: 1,
                            mb: 1,
                            bgcolor: alert.acknowledged ? 'action.hover' : 'background.paper'
                          }}
                        >
                          <ListItemIcon>
                            {alert.severity === 'critical' && <Error color="error" />}
                            {alert.severity === 'error' && <Error color="error" />}
                            {alert.severity === 'warning' && <Warning color="warning" />}
                            {alert.severity === 'info' && <Info color="info" />}
                          </ListItemIcon>
                          
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2" fontWeight="medium">
                                  {alert.title}
                                </Typography>
                                <Chip
                                  label={alert.severity}
                                  size="small"
                                  color={
                                    alert.severity === 'critical' || alert.severity === 'error' ? 'error' :
                                    alert.severity === 'warning' ? 'warning' : 'info'
                                  }
                                />
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="caption" display="block">
                                  {alert.description}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {alert.source} • {formatTimestamp(alert.timestamp)}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      </motion.div>
                    ))
                  }
                  
                  {metrics.alerts.filter(a => !a.resolved).length === 0 && (
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary="No active alerts"
                        secondary="All systems are functioning normally"
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default IntegrationHealth;
export { IntegrationHealth };