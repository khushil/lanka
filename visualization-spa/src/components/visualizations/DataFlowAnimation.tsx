import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  TrendingUp,
  DataUsage,
  Speed,
  Timeline,
  CheckCircle,
  Error,
  Warning,
  Info,
  PlayArrow,
  Pause
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';

interface DataFlowMetrics {
  throughput: number;
  latency: number;
  errorRate: number;
  activeConnections: number;
  dataPoints: Array<{
    timestamp: number;
    throughput: number;
    latency: number;
    errors: number;
  }>;
  flows: Array<{
    id: string;
    source: string;
    target: string;
    status: 'active' | 'idle' | 'error';
    dataType: 'requirements' | 'architecture' | 'code' | 'feedback';
    volume: number;
    speed: number;
  }>;
}

interface DataFlowAnimationProps {
  metrics: DataFlowMetrics | null;
  isAnimating: boolean;
  animationSpeed: number;
  showDetails: boolean;
}

const DataFlowAnimation: React.FC<DataFlowAnimationProps> = ({
  metrics,
  isAnimating,
  animationSpeed,
  showDetails
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const [selectedFlow, setSelectedFlow] = useState<string | null>(null);
  const [flowStats, setFlowStats] = useState<Map<string, number>>(new Map());

  // Flow colors by data type
  const flowColors = {
    requirements: '#4CAF50',
    architecture: '#2196F3',
    code: '#FF9800',
    feedback: '#9C27B0'
  };

  // Status colors
  const statusColors = {
    active: '#00FF00',
    idle: '#FFA500',
    error: '#FF0000'
  };

  const initializeVisualization = useCallback(() => {
    if (!svgRef.current || !containerRef.current || !metrics) return;

    const container = containerRef.current;
    const svg = d3.select(svgRef.current);
    const width = container.clientWidth;
    const height = container.clientHeight;

    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    // Create gradient definitions
    const defs = svg.append('defs');
    
    Object.entries(flowColors).forEach(([type, color]) => {
      const gradient = defs.append('linearGradient')
        .attr('id', `flow-gradient-${type}`)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%');
      
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', color)
        .attr('stop-opacity', 0);
      
      gradient.append('stop')
        .attr('offset', '50%')
        .attr('stop-color', color)
        .attr('stop-opacity', 1);
      
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', color)
        .attr('stop-opacity', 0);
    });

    // Create main visualization group
    const g = svg.append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Create module positions in a circular layout
    const modules = ['Requirements', 'Architecture', 'Development', 'Integration', 'Analytics'];
    const radius = Math.min(width, height) * 0.3;
    const modulePositions = modules.map((module, i) => ({
      name: module,
      x: radius * Math.cos((i * 2 * Math.PI) / modules.length - Math.PI / 2),
      y: radius * Math.sin((i * 2 * Math.PI) / modules.length - Math.PI / 2)
    }));

    // Draw modules
    const moduleNodes = g.selectAll('.module')
      .data(modulePositions)
      .enter()
      .append('g')
      .attr('class', 'module')
      .attr('transform', d => `translate(${d.x}, ${d.y})`);

    moduleNodes.append('circle')
      .attr('r', 40)
      .attr('fill', (d, i) => Object.values(flowColors)[i % Object.values(flowColors).length])
      .attr('fill-opacity', 0.7)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2);

    moduleNodes.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(d => d.name);

    // Create flow paths
    if (metrics.flows) {
      metrics.flows.forEach((flow, index) => {
        const sourceIndex = modules.findIndex(m => m.toLowerCase().includes(flow.source.toLowerCase()));
        const targetIndex = modules.findIndex(m => m.toLowerCase().includes(flow.target.toLowerCase()));
        
        if (sourceIndex !== -1 && targetIndex !== -1) {
          const source = modulePositions[sourceIndex];
          const target = modulePositions[targetIndex];
          
          // Create curved path
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dr = Math.sqrt(dx * dx + dy * dy) * 0.3;
          
          const path = g.append('path')
            .attr('d', `M${source.x},${source.y}A${dr},${dr} 0 0,1 ${target.x},${target.y}`)
            .attr('stroke', flowColors[flow.dataType] || '#ffffff')
            .attr('stroke-width', Math.max(2, flow.volume * 5))
            .attr('stroke-opacity', 0.6)
            .attr('fill', 'none')
            .attr('class', `flow-path flow-${flow.id}`)
            .style('cursor', 'pointer')
            .on('click', () => setSelectedFlow(flow.id))
            .on('mouseover', function() {
              d3.select(this).attr('stroke-opacity', 1);
            })
            .on('mouseout', function() {
              d3.select(this).attr('stroke-opacity', 0.6);
            });

          // Add flow direction arrow
          const midX = (source.x + target.x) / 2;
          const midY = (source.y + target.y) / 2;
          const angle = Math.atan2(dy, dx);
          
          g.append('polygon')
            .attr('points', '0,-5 10,0 0,5')
            .attr('fill', flowColors[flow.dataType] || '#ffffff')
            .attr('transform', `translate(${midX}, ${midY}) rotate(${angle * 180 / Math.PI})`)
            .attr('class', `flow-arrow flow-${flow.id}`);
        }
      });
    }

    return { svg, g, modulePositions, width, height };
  }, [metrics]);

  const animateFlows = useCallback(() => {
    if (!svgRef.current || !metrics || !isAnimating) return;

    const svg = d3.select(svgRef.current);
    const time = Date.now() * 0.001 * animationSpeed;

    // Animate data particles along flows
    metrics.flows?.forEach((flow, index) => {
      const pathElement = svg.select(`.flow-path.flow-${flow.id}`);
      if (pathElement.empty()) return;

      const pathLength = (pathElement.node() as SVGPathElement)?.getTotalLength() || 0;
      
      // Create animated particles
      const particleCount = Math.max(1, Math.floor(flow.volume * 3));
      
      for (let i = 0; i < particleCount; i++) {
        const offset = (time * flow.speed + i * 0.3) % 1;
        const point = (pathElement.node() as SVGPathElement)?.getPointAtLength(offset * pathLength);
        
        if (point) {
          const particle = svg.select(`.flow-particle-${flow.id}-${i}`);
          
          if (particle.empty()) {
            svg.append('circle')
              .attr('class', `flow-particle-${flow.id}-${i}`)
              .attr('r', 3)
              .attr('fill', flowColors[flow.dataType] || '#ffffff')
              .attr('cx', point.x)
              .attr('cy', point.y);
          } else {
            particle
              .transition()
              .duration(50)
              .attr('cx', point.x)
              .attr('cy', point.y);
          }
        }
      }
    });

    // Update flow statistics
    if (metrics.flows) {
      const newStats = new Map();
      metrics.flows.forEach(flow => {
        const currentCount = flowStats.get(flow.id) || 0;
        newStats.set(flow.id, currentCount + flow.volume);
      });
      setFlowStats(newStats);
    }

    animationRef.current = requestAnimationFrame(animateFlows);
  }, [metrics, isAnimating, animationSpeed, flowStats]);

  useEffect(() => {
    initializeVisualization();
  }, [initializeVisualization]);

  useEffect(() => {
    if (isAnimating) {
      animateFlows();
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animateFlows, isAnimating]);

  useEffect(() => {
    const handleResize = () => {
      initializeVisualization();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initializeVisualization]);

  if (!metrics) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Typography variant="h6" color="textSecondary">
          No data flow metrics available
        </Typography>
      </Box>
    );
  }

  const selectedFlowData = metrics.flows?.find(f => f.id === selectedFlow);

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Main Visualization */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: showDetails ? '70%' : '100%',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)'
        }}
      >
        <svg
          ref={svgRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block'
          }}
        />
      </div>

      {/* Real-time Metrics Panel */}
      {showDetails && (
        <Box sx={{ height: '30%', p: 2, bgcolor: 'background.paper' }}>
          <Grid container spacing={2} sx={{ height: '100%' }}>
            {/* Metrics Overview */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Flow Metrics
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">Throughput</Typography>
                    <Chip 
                      icon={<TrendingUp />} 
                      label={`${metrics.throughput} ops/sec`} 
                      color="primary" 
                      size="small" 
                    />
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(100, metrics.throughput / 10)} 
                    sx={{ mt: 1 }}
                  />
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">Latency</Typography>
                    <Chip 
                      icon={<Speed />} 
                      label={`${metrics.latency}ms`} 
                      color={metrics.latency < 100 ? 'success' : metrics.latency < 500 ? 'warning' : 'error'} 
                      size="small" 
                    />
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(100, (1000 - metrics.latency) / 10)} 
                    color={metrics.latency < 100 ? 'success' : metrics.latency < 500 ? 'warning' : 'error'}
                    sx={{ mt: 1 }}
                  />
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">Error Rate</Typography>
                    <Chip 
                      icon={metrics.errorRate < 1 ? <CheckCircle /> : <Error />} 
                      label={`${metrics.errorRate.toFixed(2)}%`} 
                      color={metrics.errorRate < 1 ? 'success' : metrics.errorRate < 5 ? 'warning' : 'error'} 
                      size="small" 
                    />
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(100, metrics.errorRate * 10)} 
                    color={metrics.errorRate < 1 ? 'success' : metrics.errorRate < 5 ? 'warning' : 'error'}
                    sx={{ mt: 1 }}
                  />
                </Box>
                
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Active Connections</Typography>
                  <Chip 
                    icon={<DataUsage />} 
                    label={metrics.activeConnections} 
                    color="info" 
                    size="small" 
                  />
                </Box>
              </Paper>
            </Grid>
            
            {/* Flow Details */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, height: '100%', overflow: 'auto' }}>
                <Typography variant="h6" gutterBottom>
                  Active Flows
                </Typography>
                
                <List dense>
                  {metrics.flows?.map((flow) => (
                    <ListItem 
                      key={flow.id}
                      button
                      selected={selectedFlow === flow.id}
                      onClick={() => setSelectedFlow(flow.id)}
                      sx={{
                        border: selectedFlow === flow.id ? 2 : 1,
                        borderColor: selectedFlow === flow.id ? 'primary.main' : 'divider',
                        borderRadius: 1,
                        mb: 1
                      }}
                    >
                      <ListItemIcon>
                        {flow.status === 'active' && <CheckCircle color="success" />}
                        {flow.status === 'idle' && <Warning color="warning" />}
                        {flow.status === 'error' && <Error color="error" />}
                      </ListItemIcon>
                      
                      <ListItemText
                        primary={`${flow.source} → ${flow.target}`}
                        secondary={
                          <Box>
                            <Chip 
                              label={flow.dataType} 
                              size="small" 
                              sx={{ 
                                bgcolor: flowColors[flow.dataType], 
                                color: 'white',
                                fontSize: '0.7rem',
                                height: 20
                              }} 
                            />
                            <Typography variant="caption" display="block">
                              Volume: {(flow.volume * 100).toFixed(1)}% | Speed: {flow.speed.toFixed(1)}x
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  )) || []}
                </List>
              </Paper>
            </Grid>
            
            {/* Selected Flow Details */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  {selectedFlowData ? 'Flow Details' : 'Select a Flow'}
                </Typography>
                
                {selectedFlowData ? (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      {selectedFlowData.source} → {selectedFlowData.target}
                    </Typography>
                    
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Card variant="outlined">
                          <CardContent sx={{ p: 1 }}>
                            <Typography variant="caption" color="textSecondary">
                              Status
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {selectedFlowData.status.toUpperCase()}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={6}>
                        <Card variant="outlined">
                          <CardContent sx={{ p: 1 }}>
                            <Typography variant="caption" color="textSecondary">
                              Data Type
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {selectedFlowData.dataType}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={6}>
                        <Card variant="outlined">
                          <CardContent sx={{ p: 1 }}>
                            <Typography variant="caption" color="textSecondary">
                              Volume
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {(selectedFlowData.volume * 100).toFixed(1)}%
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={6}>
                        <Card variant="outlined">
                          <CardContent sx={{ p: 1 }}>
                            <Typography variant="caption" color="textSecondary">
                              Speed
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {selectedFlowData.speed.toFixed(1)}x
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Card variant="outlined">
                          <CardContent sx={{ p: 1 }}>
                            <Typography variant="caption" color="textSecondary">
                              Total Data Processed
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {(flowStats.get(selectedFlowData.id) || 0).toFixed(0)} units
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>
                ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                    <Typography variant="body2" color="textSecondary" textAlign="center">
                      Click on a flow path in the visualization above to see detailed information
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Animation Controls */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          gap: 1,
          bgcolor: 'rgba(0,0,0,0.8)',
          borderRadius: 1,
          p: 1
        }}
      >
        <Tooltip title={isAnimating ? 'Pause Animation' : 'Start Animation'}>
          <IconButton 
            size="small" 
            sx={{ color: 'white' }}
            onClick={() => {/* Animation control handled by parent */}}
          >
            {isAnimating ? <Pause /> : <PlayArrow />}
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Flow Information">
          <IconButton size="small" sx={{ color: 'white' }}>
            <Info />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default DataFlowAnimation;
export { DataFlowAnimation };