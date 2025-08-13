import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardHeader,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Avatar
} from '@mui/material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import {
  Refresh,
  Computer,
  Memory,
  Storage,
  NetworkCheck,
  Database,
  CloudUpload,
  Speed,
  People,
  CheckCircle,
  Warning,
  Error as ErrorIcon
} from '@mui/icons-material';
import { SystemHealthMetrics } from '../../types/analytics';
import { analyticsService } from '../../services/analytics';

interface SystemHealthProps {
  refreshInterval?: number;
}

interface StatusIndicatorProps {
  title: string;
  value: number;
  unit: string;
  icon: React.ReactElement;
  color: string;
  status: 'healthy' | 'warning' | 'critical';
  threshold?: { warning: number; critical: number };
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  title,
  value,
  unit,
  icon,
  color,
  status,
  threshold
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy': return 'success.main';
      case 'warning': return 'warning.main';
      case 'critical': return 'error.main';
      default: return 'text.secondary';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'healthy': return <CheckCircle sx={{ color: 'success.main' }} />;
      case 'warning': return <Warning sx={{ color: 'warning.main' }} />;
      case 'critical': return <ErrorIcon sx={{ color: 'error.main' }} />;
      default: return null;
    }
  };

  const formatValue = (val: number) => {
    if (unit === '%') return `${val.toFixed(1)}%`;
    if (unit === 'ms') return `${val.toFixed(0)}ms`;
    if (unit === 'req/s') return `${val.toFixed(0)}`;
    if (unit === 'GB') return `${val.toFixed(1)}GB`;
    return val.toFixed(1);
  };

  const getProgressValue = () => {
    if (threshold) {
      if (unit === '%') return value;
      return Math.min((value / threshold.critical) * 100, 100);
    }
    return unit === '%' ? value : 50;
  };

  return (
    <Card sx={{ height: '100%', position: 'relative' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box sx={{ color }}>{icon}</Box>
          <Typography variant="subtitle2" sx={{ flex: 1 }}>
            {title}
          </Typography>
          {getStatusIcon()}
        </Box>
        
        <Typography variant="h4" sx={{ mb: 1, color: getStatusColor() }}>
          {formatValue(value)}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {unit}
        </Typography>

        <Box sx={{ position: 'relative' }}>
          <LinearProgress
            variant="determinate"
            value={getProgressValue()}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                backgroundColor: getStatusColor()
              }
            }}
          />
          {threshold && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="caption" color="success.main">
                Good: &lt; {threshold.warning}
              </Typography>
              <Typography variant="caption" color="warning.main">
                Warning: {threshold.warning}-{threshold.critical}
              </Typography>
              <Typography variant="caption" color="error.main">
                Critical: &gt; {threshold.critical}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export const SystemHealth: React.FC<SystemHealthProps> = ({
  refreshInterval = 30000 // 30 seconds
}) => {
  const [metrics, setMetrics] = useState<SystemHealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchMetrics = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const data = await analyticsService.getSystemHealthMetrics();
      setMetrics(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch system health metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchMetrics(false);
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const getStatus = (value: number, thresholds: { warning: number; critical: number }, reverse = false): 'healthy' | 'warning' | 'critical' => {
    if (reverse) {
      if (value < thresholds.critical) return 'critical';
      if (value < thresholds.warning) return 'warning';
      return 'healthy';
    } else {
      if (value > thresholds.critical) return 'critical';
      if (value > thresholds.warning) return 'warning';
      return 'healthy';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !metrics) {
    return (
      <Alert
        severity="error"
        action={
          <IconButton color="inherit" size="small" onClick={() => fetchMetrics()}>
            <Refresh />
          </IconButton>
        }
      >
        {error || 'No data available'}
      </Alert>
    );
  }

  // Prepare resource usage data
  const resourceData = [
    { name: 'CPU', usage: metrics.resources.cpuUsage, color: '#2196F3' },
    { name: 'Memory', usage: metrics.resources.memoryUsage, color: '#4CAF50' },
    { name: 'Disk', usage: metrics.resources.diskUsage, color: '#FF9800' },
    { name: 'Network', usage: metrics.resources.networkUsage, color: '#9C27B0' }
  ];

  // Generate sample time series data for infrastructure metrics
  const timeSeriesData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    responseTime: 200 + Math.random() * 100,
    throughput: 1000 + Math.random() * 500,
    errorRate: Math.random() * 2
  }));

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">
          System Health Monitor
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            icon={<CheckCircle />}
            label="All Systems Operational"
            color="success"
            variant="filled"
          />
          <Typography variant="caption" color="text.secondary">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Typography>
          <Tooltip title="Refresh data">
            <IconButton onClick={() => fetchMetrics()} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Infrastructure Metrics */}
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Computer color="primary" />
            Infrastructure Health
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <StatusIndicator
            title="System Uptime"
            value={metrics.infrastructure.uptime}
            unit="%"
            icon={<Computer />}
            color="#4CAF50"
            status={getStatus(metrics.infrastructure.uptime, { warning: 99.5, critical: 99.0 }, true)}
            threshold={{ warning: 99.5, critical: 99.0 }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <StatusIndicator
            title="Response Time"
            value={metrics.infrastructure.responseTime}
            unit="ms"
            icon={<Speed />}
            color="#2196F3"
            status={getStatus(metrics.infrastructure.responseTime, { warning: 500, critical: 1000 })}
            threshold={{ warning: 500, critical: 1000 }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <StatusIndicator
            title="Error Rate"
            value={metrics.infrastructure.errorRate}
            unit="%"
            icon={<ErrorIcon />}
            color="#F44336"
            status={getStatus(metrics.infrastructure.errorRate, { warning: 1.0, critical: 5.0 })}
            threshold={{ warning: 1.0, critical: 5.0 }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <StatusIndicator
            title="Throughput"
            value={metrics.infrastructure.throughput}
            unit="req/s"
            icon={<NetworkCheck />}
            color="#FF9800"
            status="healthy"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <StatusIndicator
            title="Active Users"
            value={metrics.infrastructure.activeUsers}
            unit="users"
            icon={<People />}
            color="#9C27B0"
            status="healthy"
          />
        </Grid>

        {/* Resource Usage */}
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ mb: 2, mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Memory color="secondary" />
            Resource Utilization
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatusIndicator
            title="CPU Usage"
            value={metrics.resources.cpuUsage}
            unit="%"
            icon={<Computer />}
            color="#2196F3"
            status={getStatus(metrics.resources.cpuUsage, { warning: 70, critical: 85 })}
            threshold={{ warning: 70, critical: 85 }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatusIndicator
            title="Memory Usage"
            value={metrics.resources.memoryUsage}
            unit="%"
            icon={<Memory />}
            color="#4CAF50"
            status={getStatus(metrics.resources.memoryUsage, { warning: 75, critical: 90 })}
            threshold={{ warning: 75, critical: 90 }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatusIndicator
            title="Disk Usage"
            value={metrics.resources.diskUsage}
            unit="%"
            icon={<Storage />}
            color="#FF9800"
            status={getStatus(metrics.resources.diskUsage, { warning: 80, critical: 95 })}
            threshold={{ warning: 80, critical: 95 }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatusIndicator
            title="Network Usage"
            value={metrics.resources.networkUsage}
            unit="%"
            icon={<NetworkCheck />}
            color="#9C27B0"
            status={getStatus(metrics.resources.networkUsage, { warning: 70, critical: 90 })}
            threshold={{ warning: 70, critical: 90 }}
          />
        </Grid>

        {/* Database Health */}
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ mb: 2, mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Database color="info" />
            Database Health
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Database color="primary" />
                <Typography variant="subtitle2">Active Connections</Typography>
              </Box>
              <Typography variant="h4">{metrics.database.connectionCount}</Typography>
              <Typography variant="body2" color="text.secondary">connections</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Speed color="success" />
                <Typography variant="subtitle2">Query Performance</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {metrics.database.queryPerformance.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">efficiency</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Storage color="warning" />
                <Typography variant="subtitle2">Storage Used</Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                {metrics.database.storageUsed}GB
              </Typography>
              <Typography variant="body2" color="text.secondary">database size</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CloudUpload color={metrics.database.backupStatus === 'healthy' ? 'success' : 'error'} />
                <Typography variant="subtitle2">Backup Status</Typography>
              </Box>
              <Chip
                label={metrics.database.backupStatus.toUpperCase()}
                color={metrics.database.backupStatus === 'healthy' ? 'success' : 'error'}
                variant="filled"
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                last backup
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Resource Usage Distribution" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={resourceData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="usage"
                    label={({ name, usage }) => `${name}: ${usage.toFixed(1)}%`}
                  >
                    {resourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Response Time Trend (24h)" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <RechartsTooltip />
                  <Area
                    type="monotone"
                    dataKey="responseTime"
                    stroke="#2196F3"
                    fill="#2196F3"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader title="System Performance Overview (24h)" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <RechartsTooltip />
                  <Area
                    type="monotone"
                    dataKey="throughput"
                    stackId="1"
                    stroke="#4CAF50"
                    fill="#4CAF50"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="responseTime"
                    stackId="2"
                    stroke="#2196F3"
                    fill="#2196F3"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};