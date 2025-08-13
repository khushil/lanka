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
  Tooltip
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Refresh, TrendingUp, CheckCircle, Schedule, Block } from '@mui/icons-material';
import { RequirementsMetrics } from '../../types/analytics';
import { analyticsService } from '../../services/analytics';

interface RequirementsAnalyticsProps {
  refreshInterval?: number;
}

export const RequirementsAnalytics: React.FC<RequirementsAnalyticsProps> = ({
  refreshInterval = 300000 // 5 minutes
}) => {
  const [metrics, setMetrics] = useState<RequirementsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchMetrics = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const data = await analyticsService.getRequirementsMetrics();
      setMetrics(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch requirements metrics');
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

  const completionPercentage = (metrics.completedRequirements / metrics.totalRequirements) * 100;
  const pendingPercentage = (metrics.pendingRequirements / metrics.totalRequirements) * 100;
  const blockedPercentage = (metrics.blockedRequirements / metrics.totalRequirements) * 100;

  // Format trend data for chart
  const trendData = metrics.requirementsTrend.map(item => ({
    date: new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: item.value
  }));

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">
          Requirements Analytics
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
        {/* Summary Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircle color="success" />
                <Typography variant="h6" color="success.main">
                  Completed
                </Typography>
              </Box>
              <Typography variant="h4">{metrics.completedRequirements}</Typography>
              <Typography variant="body2" color="text.secondary">
                {completionPercentage.toFixed(1)}% of total
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Schedule color="warning" />
                <Typography variant="h6" color="warning.main">
                  Pending
                </Typography>
              </Box>
              <Typography variant="h4">{metrics.pendingRequirements}</Typography>
              <Typography variant="body2" color="text.secondary">
                {pendingPercentage.toFixed(1)}% of total
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Block color="error" />
                <Typography variant="h6" color="error.main">
                  Blocked
                </Typography>
              </Box>
              <Typography variant="h4">{metrics.blockedRequirements}</Typography>
              <Typography variant="body2" color="text.secondary">
                {blockedPercentage.toFixed(1)}% of total
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TrendingUp color="info" />
                <Typography variant="h6" color="info.main">
                  Avg. Completion
                </Typography>
              </Box>
              <Typography variant="h4">{metrics.averageTimeToComplete.toFixed(1)}</Typography>
              <Typography variant="body2" color="text.secondary">
                days per requirement
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Completion Progress */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Overall Progress" />
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    Progress: {metrics.completedRequirements} of {metrics.totalRequirements} completed
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    {metrics.completionRate.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={metrics.completionRate}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4
                    }
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Chip
                  size="small"
                  label={`${metrics.completedRequirements} Completed`}
                  color="success"
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={`${metrics.pendingRequirements} Pending`}
                  color="warning"
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={`${metrics.blockedRequirements} Blocked`}
                  color="error"
                  variant="outlined"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Charts Row */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Requirements by Category" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={metrics.requirementsByCategory}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                  >
                    {metrics.requirementsByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Requirements by Priority" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.requirementsByPriority} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="priority" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="#8884d8">
                    {metrics.requirementsByPriority.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Trend Chart */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Requirements Completion Trend (Last 30 Days)" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#2196F3"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};