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
  Divider
} from '@mui/material';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  LineChart,
  Line
} from 'recharts';
import {
  Refresh,
  Code,
  Speed,
  BugReport,
  Deployment,
  Assessment,
  TrendingUp,
  TrendingDown
} from '@mui/icons-material';
import { DevelopmentMetrics as DevelopmentMetricsType } from '../../types/analytics';
import { analyticsService } from '../../services/analytics';

interface DevelopmentMetricsProps {
  refreshInterval?: number;
}

interface MetricCardProps {
  title: string;
  value: number;
  unit: string;
  icon: React.ReactElement;
  color: string;
  trend?: 'up' | 'down' | 'stable';
  target?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  icon,
  color,
  trend,
  target
}) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend) {
      case 'up':
        return <TrendingUp sx={{ color: 'success.main', fontSize: 16 }} />;
      case 'down':
        return <TrendingDown sx={{ color: 'error.main', fontSize: 16 }} />;
      default:
        return null;
    }
  };

  const formatValue = (val: number) => {
    if (unit === '%') {
      return `${val.toFixed(1)}%`;
    }
    if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}k`;
    }
    return val.toFixed(1);
  };

  const progress = target ? Math.min((value / target) * 100, 100) : undefined;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box sx={{ color }}>{icon}</Box>
          <Typography variant="subtitle2" sx={{ flex: 1 }}>
            {title}
          </Typography>
          {getTrendIcon()}
        </Box>
        
        <Typography variant="h4" sx={{ mb: 1, color }}>
          {formatValue(value)}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: target ? 1 : 0 }}>
          {unit}
        </Typography>

        {target && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption">Progress</Typography>
              <Typography variant="caption">{progress?.toFixed(0)}%</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  backgroundColor: color
                }
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Target: {formatValue(target)}
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export const DevelopmentMetrics: React.FC<DevelopmentMetricsProps> = ({
  refreshInterval = 300000 // 5 minutes
}) => {
  const [metrics, setMetrics] = useState<DevelopmentMetricsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchMetrics = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const data = await analyticsService.getDevelopmentMetrics();
      setMetrics(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch development metrics');
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

  // Prepare radar chart data for code quality
  const qualityData = [
    {
      metric: 'Maintainability',
      value: metrics.codeQuality.maintainabilityIndex
    },
    {
      metric: 'Test Coverage',
      value: metrics.codeQuality.testCoverage
    },
    {
      metric: 'Code Quality',
      value: 100 - metrics.codeQuality.duplicateCode // Invert for better visualization
    },
    {
      metric: 'Complexity',
      value: Math.max(0, 100 - (metrics.codeQuality.codeComplexity * 20)) // Scale complexity
    },
    {
      metric: 'Technical Debt',
      value: Math.max(0, 100 - metrics.codeQuality.technicalDebt) // Invert debt
    }
  ];

  // Prepare velocity chart data
  const velocityData = [
    { name: 'Velocity', value: metrics.velocity.averageVelocity },
    { name: 'Burndown', value: metrics.velocity.burndownRate },
    { name: 'Throughput', value: metrics.velocity.throughput }
  ];

  // Prepare deployment metrics
  const deploymentData = [
    { name: 'Frequency', value: metrics.deployment.deploymentFrequency },
    { name: 'Success Rate', value: metrics.deployment.deploymentSuccess },
    { name: 'Recovery Time', value: metrics.deployment.meanTimeToRecovery },
    { name: 'Failure Rate', value: 100 - metrics.deployment.changeFailureRate }
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">
          Development Metrics
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
        {/* Code Quality Metrics */}
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Code color="primary" />
            Code Quality Metrics
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title="Maintainability Index"
            value={metrics.codeQuality.maintainabilityIndex}
            unit="score"
            icon={<Assessment />}
            color="#2196F3"
            target={85}
            trend="up"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title="Test Coverage"
            value={metrics.codeQuality.testCoverage}
            unit="%"
            icon={<BugReport />}
            color="#4CAF50"
            target={90}
            trend="up"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title="Technical Debt"
            value={metrics.codeQuality.technicalDebt}
            unit="hours"
            icon={<Code />}
            color="#FF9800"
            trend="down"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title="Code Complexity"
            value={metrics.codeQuality.codeComplexity}
            unit="avg"
            icon={<Speed />}
            color="#9C27B0"
            trend="stable"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title="Duplicate Code"
            value={metrics.codeQuality.duplicateCode}
            unit="%"
            icon={<Code />}
            color="#F44336"
            trend="down"
          />
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
        </Grid>

        {/* Velocity Metrics */}
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Speed color="success" />
            Team Velocity Metrics
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title="Average Velocity"
            value={metrics.velocity.averageVelocity}
            unit="points/sprint"
            icon={<TrendingUp />}
            color="#4CAF50"
            trend="up"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title="Burndown Rate"
            value={metrics.velocity.burndownRate}
            unit="%"
            icon={<Speed />}
            color="#2196F3"
            trend="up"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title="Cycle Time"
            value={metrics.velocity.cycleTime}
            unit="days"
            icon={<Speed />}
            color="#FF9800"
            trend="down"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title="Lead Time"
            value={metrics.velocity.leadTime}
            unit="days"
            icon={<Speed />}
            color="#9C27B0"
            trend="stable"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title="Throughput"
            value={metrics.velocity.throughput}
            unit="items/week"
            icon={<TrendingUp />}
            color="#00BCD4"
            trend="up"
          />
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
        </Grid>

        {/* Deployment Metrics */}
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Deployment color="info" />
            Deployment Metrics
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Deployment Frequency"
            value={metrics.deployment.deploymentFrequency}
            unit="per week"
            icon={<Deployment />}
            color="#2196F3"
            trend="up"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Deployment Success"
            value={metrics.deployment.deploymentSuccess}
            unit="%"
            icon={<TrendingUp />}
            color="#4CAF50"
            target={95}
            trend="up"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Mean Recovery Time"
            value={metrics.deployment.meanTimeToRecovery}
            unit="hours"
            icon={<Speed />}
            color="#FF9800"
            trend="down"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Change Failure Rate"
            value={metrics.deployment.changeFailureRate}
            unit="%"
            icon={<BugReport />}
            color="#F44336"
            trend="down"
          />
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Code Quality Overview" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={qualityData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar
                    name="Quality Score"
                    dataKey="value"
                    stroke="#2196F3"
                    fill="#2196F3"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <RechartsTooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Team Performance" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={velocityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="value" fill="#4CAF50" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader title="Deployment Performance" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={deploymentData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="value" fill="#2196F3" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};