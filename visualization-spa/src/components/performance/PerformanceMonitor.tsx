/**
 * Performance Monitoring Component
 * Real-time performance tracking and visualization for the Lanka SPA
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  Divider
} from '@mui/material';
import {
  Speed,
  Memory,
  Timeline,
  ExpandMore,
  Warning,
  Error as ErrorIcon,
  CheckCircle,
  Visibility,
  VisibilityOff,
  Refresh,
  Settings,
  TrendingUp,
  TrendingDown
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  usePerformanceMonitor,
  globalPerformanceMonitor 
} from '../../utils/performanceOptimization';

// ============================================================================
// PERFORMANCE METRICS INTERFACES
// ============================================================================

interface FPSMetrics {
  current: number;
  average: number;
  min: number;
  max: number;
  history: number[];
}

interface MemoryMetrics {
  used: number;
  total: number;
  limit: number;
  trend: 'stable' | 'increasing' | 'decreasing';
}

interface BundleMetrics {
  totalSize: number;
  loadedChunks: string[];
  pendingChunks: string[];
  errorChunks: string[];
}

interface VisualizationMetrics {
  activeComponents: number;
  renderTime: number;
  domNodes: number;
  threeJsObjects: number;
  d3Elements: number;
}

// ============================================================================
// MAIN PERFORMANCE MONITOR COMPONENT
// ============================================================================

const PerformanceMonitor: React.FC<{
  visible?: boolean;
  position?: 'fixed' | 'relative';
  compact?: boolean;
}> = ({ 
  visible = true, 
  position = 'fixed',
  compact = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [showDetails, setShowDetails] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [fpsMetrics, setFpsMetrics] = useState<FPSMetrics>({
    current: 0,
    average: 0,
    min: 0,
    max: 0,
    history: []
  });
  const [memoryMetrics, setMemoryMetrics] = useState<MemoryMetrics>({
    used: 0,
    total: 0,
    limit: 0,
    trend: 'stable'
  });
  const [bundleMetrics, setBundleMetrics] = useState<BundleMetrics>({
    totalSize: 0,
    loadedChunks: [],
    pendingChunks: [],
    errorChunks: []
  });
  const [visualizationMetrics, setVisualizationMetrics] = useState<VisualizationMetrics>({
    activeComponents: 0,
    renderTime: 0,
    domNodes: 0,
    threeJsObjects: 0,
    d3Elements: 0
  });

  const {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring
  } = usePerformanceMonitor();

  // Update FPS metrics
  useEffect(() => {
    if (metrics.fps !== undefined) {
      setFpsMetrics(prev => {
        const newHistory = [...prev.history, metrics.fps!].slice(-60); // Keep last 60 readings
        const average = newHistory.reduce((a, b) => a + b, 0) / newHistory.length;
        
        return {
          current: metrics.fps!,
          average: Math.round(average),
          min: Math.min(...newHistory),
          max: Math.max(...newHistory),
          history: newHistory
        };
      });
    }
  }, [metrics.fps]);

  // Update memory metrics
  useEffect(() => {
    if (metrics.memoryUsage !== undefined) {
      const memInfo = (performance as any).memory;
      const limit = memInfo?.jsHeapSizeLimit || 0;
      const total = memInfo?.totalJSHeapSize || 0;
      
      setMemoryMetrics(prev => {
        let trend: 'stable' | 'increasing' | 'decreasing' = 'stable';
        if (metrics.memoryUsage! > prev.used * 1.1) trend = 'increasing';
        else if (metrics.memoryUsage! < prev.used * 0.9) trend = 'decreasing';
        
        return {
          used: metrics.memoryUsage!,
          total: total / (1024 * 1024),
          limit: limit / (1024 * 1024),
          trend
        };
      });
    }
  }, [metrics.memoryUsage]);

  // Update visualization metrics
  useEffect(() => {
    if (metrics.domNodes !== undefined) {
      setVisualizationMetrics(prev => ({
        ...prev,
        domNodes: metrics.domNodes!,
        renderTime: metrics.renderTime || 0,
        activeComponents: document.querySelectorAll('[data-visualization]').length,
        threeJsObjects: document.querySelectorAll('canvas[data-engine="three"]').length,
        d3Elements: document.querySelectorAll('[data-d3]').length
      }));
    }
  }, [metrics.domNodes, metrics.renderTime]);

  // Monitor bundle loading
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webpackChunkName' in window) {
      // This would need to be integrated with webpack stats
      setBundleMetrics({
        totalSize: 0, // Would be calculated from webpack stats
        loadedChunks: [],
        pendingChunks: [],
        errorChunks: []
      });
    }
  }, []);

  // Performance alerts
  const alerts = useMemo(() => {
    const alerts = [];
    
    if (fpsMetrics.current < 30) {
      alerts.push({
        type: 'error' as const,
        message: `Low FPS detected: ${fpsMetrics.current}fps`,
        suggestion: 'Consider reducing visual complexity or enabling performance mode'
      });
    } else if (fpsMetrics.current < 50) {
      alerts.push({
        type: 'warning' as const,
        message: `Below optimal FPS: ${fpsMetrics.current}fps`,
        suggestion: 'Monitor performance with current visualizations'
      });
    }
    
    if (memoryMetrics.used > memoryMetrics.limit * 0.8) {
      alerts.push({
        type: 'error' as const,
        message: 'High memory usage detected',
        suggestion: 'Consider refreshing the page or reducing active visualizations'
      });
    } else if (memoryMetrics.trend === 'increasing') {
      alerts.push({
        type: 'warning' as const,
        message: 'Memory usage is increasing',
        suggestion: 'Monitor for potential memory leaks'
      });
    }
    
    if (visualizationMetrics.domNodes > 5000) {
      alerts.push({
        type: 'warning' as const,
        message: `High DOM node count: ${visualizationMetrics.domNodes}`,
        suggestion: 'Consider using virtual scrolling or reducing rendered elements'
      });
    }
    
    return alerts;
  }, [fpsMetrics, memoryMetrics, visualizationMetrics]);

  const handleToggleMonitoring = useCallback(() => {
    if (isMonitoring) {
      stopMonitoring();
    } else {
      startMonitoring();
    }
  }, [isMonitoring, startMonitoring, stopMonitoring]);

  if (!visible) return null;

  const containerStyle = position === 'fixed' ? {
    position: 'fixed' as const,
    top: 16,
    right: 16,
    zIndex: 9999,
    maxWidth: 400,
    width: compact ? 'auto' : 400
  } : {
    width: '100%',
    maxWidth: compact ? 300 : 600
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      style={containerStyle}
    >
      <Card elevation={8} sx={{ bgcolor: 'background.paper', backdropFilter: 'blur(10px)' }}>
        {/* Header */}
        <Box sx={{ 
          p: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          bgcolor: 'primary.main',
          color: 'primary.contrastText'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Speed fontSize="small" />
            <Typography variant="subtitle2" fontWeight="bold">
              Performance Monitor
            </Typography>
            <Chip
              size="small"
              label={isMonitoring ? 'Active' : 'Paused'}
              color={isMonitoring ? 'success' : 'warning'}
              variant="outlined"
              sx={{ 
                borderColor: 'currentColor',
                color: 'inherit',
                '& .MuiChip-label': { fontSize: '0.7rem' }
              }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title={isMonitoring ? 'Pause Monitoring' : 'Start Monitoring'}>
              <IconButton 
                size="small" 
                onClick={handleToggleMonitoring}
                sx={{ color: 'inherit' }}
              >
                {isMonitoring ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Refresh Metrics">
              <IconButton size="small" sx={{ color: 'inherit' }}>
                <Refresh />
              </IconButton>
            </Tooltip>
            
            <Tooltip title={isExpanded ? 'Collapse' : 'Expand'}>
              <IconButton 
                size="small" 
                onClick={() => setIsExpanded(!isExpanded)}
                sx={{ color: 'inherit' }}
              >
                <ExpandMore 
                  sx={{ 
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s'
                  }} 
                />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Compact View */}
        {!isExpanded && (
          <CardContent sx={{ p: 1 }}>
            <Grid container spacing={1}>
              <Grid item xs={4}>
                <Box textAlign="center">
                  <Typography variant="caption" color="textSecondary">FPS</Typography>
                  <Typography variant="h6" color={fpsMetrics.current < 30 ? 'error' : 'primary'}>
                    {fpsMetrics.current}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box textAlign="center">
                  <Typography variant="caption" color="textSecondary">Memory</Typography>
                  <Typography variant="h6" color={memoryMetrics.used > 100 ? 'warning' : 'primary'}>
                    {memoryMetrics.used.toFixed(1)}MB
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box textAlign="center">
                  <Typography variant="caption" color="textSecondary">DOM</Typography>
                  <Typography variant="h6" color={visualizationMetrics.domNodes > 3000 ? 'warning' : 'primary'}>
                    {visualizationMetrics.domNodes}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        )}

        {/* Expanded View */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CardContent sx={{ p: 2 }}>
                {/* Alerts */}
                {alertsEnabled && alerts.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    {alerts.map((alert, index) => (
                      <Alert 
                        key={index} 
                        severity={alert.type} 
                        sx={{ mb: 1 }}
                        icon={alert.type === 'error' ? <ErrorIcon /> : <Warning />}
                      >
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {alert.message}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {alert.suggestion}
                          </Typography>
                        </Box>
                      </Alert>
                    ))}
                  </Box>
                )}

                {/* Core Metrics */}
                <Grid container spacing={2}>
                  {/* FPS Metrics */}
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent sx={{ p: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Speed fontSize="small" sx={{ mr: 1 }} />
                          <Typography variant="subtitle2">Frame Rate</Typography>
                          {fpsMetrics.current >= 50 ? (
                            <CheckCircle color="success" fontSize="small" sx={{ ml: 'auto' }} />
                          ) : fpsMetrics.current >= 30 ? (
                            <Warning color="warning" fontSize="small" sx={{ ml: 'auto' }} />
                          ) : (
                            <ErrorIcon color="error" fontSize="small" sx={{ ml: 'auto' }} />
                          )}
                        </Box>
                        
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="textSecondary">Current</Typography>
                            <Typography variant="h6" color="primary">
                              {fpsMetrics.current} fps
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="textSecondary">Average</Typography>
                            <Typography variant="h6">
                              {fpsMetrics.average} fps
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="textSecondary">Min</Typography>
                            <Typography variant="body2">
                              {fpsMetrics.min} fps
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="textSecondary">Max</Typography>
                            <Typography variant="body2">
                              {fpsMetrics.max} fps
                            </Typography>
                          </Grid>
                        </Grid>

                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, (fpsMetrics.current / 60) * 100)}
                          color={fpsMetrics.current >= 50 ? 'success' : fpsMetrics.current >= 30 ? 'warning' : 'error'}
                          sx={{ mt: 1 }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Memory Metrics */}
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent sx={{ p: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Memory fontSize="small" sx={{ mr: 1 }} />
                          <Typography variant="subtitle2">Memory Usage</Typography>
                          {memoryMetrics.trend === 'increasing' ? (
                            <TrendingUp color="warning" fontSize="small" sx={{ ml: 'auto' }} />
                          ) : memoryMetrics.trend === 'decreasing' ? (
                            <TrendingDown color="success" fontSize="small" sx={{ ml: 'auto' }} />
                          ) : (
                            <CheckCircle color="success" fontSize="small" sx={{ ml: 'auto' }} />
                          )}
                        </Box>
                        
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="textSecondary">Used</Typography>
                            <Typography variant="h6" color="primary">
                              {memoryMetrics.used.toFixed(1)} MB
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="textSecondary">Total</Typography>
                            <Typography variant="h6">
                              {memoryMetrics.total.toFixed(1)} MB
                            </Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="caption" color="textSecondary">Limit</Typography>
                            <Typography variant="body2">
                              {memoryMetrics.limit.toFixed(1)} MB
                            </Typography>
                          </Grid>
                        </Grid>

                        <LinearProgress
                          variant="determinate"
                          value={(memoryMetrics.used / memoryMetrics.limit) * 100}
                          color={memoryMetrics.used > memoryMetrics.limit * 0.8 ? 'error' : 
                                memoryMetrics.used > memoryMetrics.limit * 0.6 ? 'warning' : 'success'}
                          sx={{ mt: 1 }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Visualization Metrics */}
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent sx={{ p: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Timeline fontSize="small" sx={{ mr: 1 }} />
                          <Typography variant="subtitle2">Visualization Performance</Typography>
                        </Box>
                        
                        <Grid container spacing={2}>
                          <Grid item xs={6} md={3}>
                            <Typography variant="caption" color="textSecondary">Active Components</Typography>
                            <Typography variant="h6" color="primary">
                              {visualizationMetrics.activeComponents}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="caption" color="textSecondary">DOM Nodes</Typography>
                            <Typography variant="h6" color={visualizationMetrics.domNodes > 3000 ? 'warning' : 'primary'}>
                              {visualizationMetrics.domNodes}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="caption" color="textSecondary">3D Objects</Typography>
                            <Typography variant="h6">
                              {visualizationMetrics.threeJsObjects}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="caption" color="textSecondary">D3 Elements</Typography>
                            <Typography variant="h6">
                              {visualizationMetrics.d3Elements}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Settings */}
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={alertsEnabled}
                        onChange={(e) => setAlertsEnabled(e.target.checked)}
                      />
                    }
                    label="Performance Alerts"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={showDetails}
                        onChange={(e) => setShowDetails(e.target.checked)}
                      />
                    }
                    label="Show Details"
                  />
                </Box>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

export default PerformanceMonitor;