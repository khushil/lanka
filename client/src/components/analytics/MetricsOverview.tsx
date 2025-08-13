import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Card,
  CardContent
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  MoreVert,
  Refresh,
  Assessment,
  Speed,
  Security,
  BugReport,
  Code
} from '@mui/icons-material';
import { AnalyticsMetric, MetricCategory } from '../../types/analytics';
import { analyticsService } from '../../services/analytics';

interface MetricsOverviewProps {
  refreshInterval?: number;
  categories?: MetricCategory[];
}

interface MetricCardProps {
  metric: AnalyticsMetric;
  onRefresh?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({ metric, onRefresh }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const getTrendIcon = () => {
    switch (metric.trend) {
      case 'up':
        return <TrendingUp sx={{ color: 'success.main' }} />;
      case 'down':
        return <TrendingDown sx={{ color: 'error.main' }} />;
      case 'stable':
        return <TrendingFlat sx={{ color: 'info.main' }} />;
      default:
        return <TrendingFlat sx={{ color: 'text.secondary' }} />;
    }
  };

  const getTrendColor = () => {
    switch (metric.trend) {
      case 'up': return 'success.main';
      case 'down': return 'error.main';
      case 'stable': return 'info.main';
      default: return 'text.secondary';
    }
  };

  const getCategoryIcon = () => {
    const iconProps = { sx: { fontSize: 20 } };
    switch (metric.category) {
      case MetricCategory.REQUIREMENTS:
        return <Assessment {...iconProps} />;
      case MetricCategory.DEVELOPMENT:
        return <Code {...iconProps} />;
      case MetricCategory.PERFORMANCE:
        return <Speed {...iconProps} />;
      case MetricCategory.QUALITY:
        return <BugReport {...iconProps} />;
      case MetricCategory.SECURITY:
        return <Security {...iconProps} />;
      default:
        return <Assessment {...iconProps} />;
    }
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === '%') {
      return `${value.toFixed(1)}%`;
    }
    if (unit === 'count') {
      return value.toLocaleString();
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(1);
  };

  const formatChange = (change?: number) => {
    if (!change) return '';
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  return (
    <Card
      elevation={2}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          transform: 'translateY(-2px)'
        },
        transition: 'all 0.2s ease-in-out'
      }}
    >
      <CardContent sx={{ flex: 1, pb: '16px !important' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getCategoryIcon()}
            <Chip
              size="small"
              label={metric.category}
              variant="outlined"
              sx={{ height: 20, fontSize: 10 }}
            />
          </Box>
          <IconButton
            size="small"
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{ mt: -1, mr: -1 }}
          >
            <MoreVert />
          </IconButton>
        </Box>

        {/* Title */}
        <Typography
          variant="h6"
          sx={{
            fontSize: 14,
            fontWeight: 500,
            mb: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {metric.name}
        </Typography>

        {/* Value */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="h4" sx={{ fontSize: 28, fontWeight: 600 }}>
            {formatValue(metric.value, metric.unit)}
          </Typography>
          {metric.unit !== 'count' && (
            <Typography variant="body2" color="text.secondary">
              {metric.unit}
            </Typography>
          )}
        </Box>

        {/* Trend and Change */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {getTrendIcon()}
            <Typography
              variant="body2"
              sx={{
                color: getTrendColor(),
                fontWeight: 500
              }}
            >
              {formatChange(metric.change)}
            </Typography>
          </Box>
          
          <Typography variant="caption" color="text.secondary">
            vs previous period
          </Typography>
        </Box>

        {/* Previous Value */}
        {metric.previousValue !== undefined && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Previous: {formatValue(metric.previousValue, metric.unit)}
          </Typography>
        )}
      </CardContent>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => { onRefresh?.(); setAnchorEl(null); }}>
          <Refresh sx={{ mr: 1 }} />
          Refresh
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>
          View Details
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>
          Export Data
        </MenuItem>
      </Menu>
    </Card>
  );
};

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({
  refreshInterval = 60000,
  categories
}) => {
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchMetrics = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      let allMetrics: AnalyticsMetric[] = [];

      if (categories && categories.length > 0) {
        // Fetch metrics for each category
        const promises = categories.map(category => analyticsService.getMetrics(category));
        const results = await Promise.all(promises);
        allMetrics = results.flat();
      } else {
        // Fetch all metrics
        allMetrics = await analyticsService.getMetrics();
      }

      setMetrics(allMetrics);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchMetrics();
  }, [categories]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchMetrics(false); // Don't show loading for auto-refresh
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, categories]);

  const handleRefresh = () => {
    fetchMetrics();
  };

  if (loading && metrics.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <IconButton color="inherit" size="small" onClick={handleRefresh}>
            <Refresh />
          </IconButton>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">
          Key Metrics Overview
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Typography>
          <Tooltip title="Refresh metrics">
            <IconButton onClick={handleRefresh} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Metrics Grid */}
      <Grid container spacing={3}>
        {metrics.map((metric) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={metric.id}>
            <MetricCard metric={metric} onRefresh={handleRefresh} />
          </Grid>
        ))}
      </Grid>

      {metrics.length === 0 && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Assessment sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No metrics available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Metrics will appear here once data is available
          </Typography>
        </Paper>
      )}
    </Box>
  );
};