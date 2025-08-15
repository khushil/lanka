import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
  Autocomplete,
  Slider,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Search,
  FilterList,
  Visibility,
  VisibilityOff,
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  AccountTree,
  Warning,
  Error,
  CheckCircle,
  Timeline
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import ForceGraph3D from 'react-force-graph-3d';
import ForceGraph2D from 'react-force-graph-2d';
import * as THREE from 'three';

interface DependencyNode {
  id: string;
  name: string;
  type: 'module' | 'component' | 'service' | 'database' | 'api';
  category: 'requirements' | 'architecture' | 'development' | 'integration' | 'analytics';
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  version: string;
  size: number;
  dependencies: string[];
  dependents: string[];
  metrics: {
    stability: number;
    complexity: number;
    coupling: number;
    performance: number;
  };
  position?: { x: number; y: number; z: number };
}

interface DependencyEdge {
  source: string;
  target: string;
  type: 'depends' | 'uses' | 'implements' | 'extends' | 'calls';
  strength: number;
  isCircular: boolean;
  isCritical: boolean;
}

interface DependencyGraphData {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  clusters: Array<{
    id: string;
    name: string;
    nodes: string[];
    color: string;
  }>;
  metrics: {
    totalDependencies: number;
    circularDependencies: number;
    maxDepth: number;
    criticalPath: string[];
  };
}

interface DependencyGraphProps {
  data: DependencyGraphData | null;
  viewMode: '2d' | '3d';
  showDetails: boolean;
}

const DependencyGraph: React.FC<DependencyGraphProps> = ({
  data,
  viewMode,
  showDetails
}) => {
  const graphRef = useRef<any>(null);
  const [selectedNode, setSelectedNode] = useState<DependencyNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<DependencyNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [showCircular, setShowCircular] = useState(true);
  const [showCritical, setShowCritical] = useState(true);
  const [linkStrengthFilterList, setLinkStrengthFilter] = useState([0, 1]);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());

  // Color schemes
  const nodeColors = {
    module: '#4CAF50',
    component: '#2196F3',
    service: '#FF9800',
    database: '#9C27B0',
    api: '#F44336'
  };

  const statusColors = {
    healthy: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    unknown: '#9E9E9E'
  };

  const categoryColors = {
    requirements: '#4CAF50',
    architecture: '#2196F3',
    development: '#FF9800',
    integration: '#9C27B0',
    analytics: '#F44336'
  };

  // Filter data based on current filters
  const filteredData = useCallback(() => {
    if (!data) return { nodes: [], links: [] };

    let filteredNodes = data.nodes.filter(node => {
      const matchesSearch = node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           node.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType.length === 0 || filterType.includes(node.type);
      const matchesStatus = filterStatus.length === 0 || filterStatus.includes(node.status);
      
      return matchesSearch && matchesType && matchesStatus;
    });

    const nodeIds = new Set(filteredNodes.map(n => n.id));
    
    let filteredEdges = data.edges.filter(edge => {
      const hasValidNodes = nodeIds.has(edge.source) && nodeIds.has(edge.target);
      const matchesStrength = edge.strength >= linkStrengthFilter[0] && edge.strength <= linkStrengthFilter[1];
      const matchesCircular = showCircular || !edge.isCircular;
      const matchesCritical = showCritical || !edge.isCritical;
      
      return hasValidNodes && matchesStrength && matchesCircular && matchesCritical;
    });

    return {
      nodes: filteredNodes,
      links: filteredEdges.map(edge => ({
        source: edge.source,
        target: edge.target,
        ...edge
      }))
    };
  }, [data, searchTerm, filterType, filterStatus, linkStrengthFilterList, showCircular, showCritical]);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node);
    
    // Highlight connected nodes and links
    const connectedNodeIds = new Set([node.id]);
    const connectedLinkIds = new Set();
    
    if (data) {
      data.edges.forEach(edge => {
        if (edge.source === node.id || edge.target === node.id) {
          connectedNodeIds.add(edge.source);
          connectedNodeIds.add(edge.target);
          connectedLinkIds.add(`${edge.source}-${edge.target}`);
        }
      });
    }
    
    setHighlightNodes(connectedNodeIds);
    setHighlightLinks(connectedLinkIds);
  }, [data]);

  const handleNodeHover = useCallback((node: any) => {
    setHoveredNode(node);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
    setHighlightNodes(new Set());
    setHighlightLinks(new Set());
  }, []);

  // Node rendering functions
  const nodeThreeObject = useCallback((node: any) => {
    if (viewMode !== '3d') return undefined;
    
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(generateNodeTexture(node)),
        transparent: true
      })
    );
    sprite.scale.set(12, 12, 1);
    return sprite;
  }, [viewMode]);

  const generateNodeTexture = (node: DependencyNode) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 64;
    canvas.height = 64;
    
    // Background circle
    const radius = 30;
    const isHighlighted = highlightNodes.has(node.id);
    const isSelected = selectedNode?.id === node.id;
    
    ctx.beginPath();
    ctx.arc(32, 32, radius, 0, 2 * Math.PI);
    ctx.fillStyle = isSelected ? '#FFD700' : 
                   isHighlighted ? nodeColors[node.type] :
                   statusColors[node.status];
    ctx.fill();
    
    // Border
    ctx.strokeStyle = isSelected ? '#FF6B00' : '#ffffff';
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.stroke();
    
    // Status indicator
    ctx.beginPath();
    ctx.arc(48, 16, 6, 0, 2 * Math.PI);
    ctx.fillStyle = statusColors[node.status];
    ctx.fill();
    
    // Text (abbreviated name)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(node.name.substring(0, 8), 32, 36);
    
    return canvas;
  };

  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (viewMode !== '2d') return;
    
    const label = node.name;
    const fontSize = 12 / globalScale;
    ctx.font = `${fontSize}px Sans-Serif`;
    
    const isHighlighted = highlightNodes.has(node.id);
    const isSelected = selectedNode?.id === node.id;
    
    // Node circle
    const radius = Math.max(6, node.size * 3);
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = isSelected ? '#FFD700' : 
                   isHighlighted ? nodeColors[node.type] :
                   statusColors[node.status];
    ctx.fill();
    
    // Border
    ctx.strokeStyle = isSelected ? '#FF6B00' : '#ffffff';
    ctx.lineWidth = (isSelected ? 3 : 2) / globalScale;
    ctx.stroke();
    
    // Status indicator
    ctx.beginPath();
    ctx.arc(node.x + radius * 0.7, node.y - radius * 0.7, radius * 0.3, 0, 2 * Math.PI, false);
    ctx.fillStyle = statusColors[node.status];
    ctx.fill();
    
    // Label
    const textWidth = ctx.measureText(label).width;
    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + radius + 2, bckgDimensions[0], bckgDimensions[1]);
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, node.x, node.y + radius + fontSize / 2 + 2);
  }, [viewMode, highlightNodes, selectedNode]);

  const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isHighlighted = highlightLinks.has(`${link.source.id}-${link.target.id}`);
    
    ctx.strokeStyle = link.isCircular ? '#FF0000' :
                     link.isCritical ? '#FFD700' :
                     isHighlighted ? '#00FFFF' :
                     '#666666';
    ctx.lineWidth = (link.strength * 3 + (isHighlighted ? 2 : 0)) / globalScale;
    
    if (link.isCircular) {
      ctx.setLineDash([5, 5]);
    } else {
      ctx.setLineDash([]);
    }
    
    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.stroke();
  }, [highlightLinks]);

  const resetCamera = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400);
    }
  }, []);

  if (!data) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Typography variant="h6" color="textSecondary">
          No dependency data available
        </Typography>
      </Box>
    );
  }

  const graphData = filteredData();

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Controls Panel */}
      {showDetails && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            width: 320,
            maxHeight: 'calc(100% - 32px)',
            overflow: 'auto',
            bgcolor: 'rgba(0,0,0,0.9)',
            borderRadius: 2,
            p: 2,
            zIndex: 10
          }}
        >
          <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
            Dependency Controls
          </Typography>
          
          {/* Search */}
          <TextField
            fullWidth
            size="small"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ color: 'white', mr: 1 }} />
            }}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                '&.Mui-focused fieldset': { borderColor: 'white' }
              }
            }}
          />
          
          {/* Type Filter */}
          <Autocomplete
            multiple
            size="small"
            options={Object.keys(nodeColors)}
            value={filterType}
            onChange={(_, newValue) => setFilterType(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Filter by type"
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                    '&.Mui-focused fieldset': { borderColor: 'white' }
                  }
                }}
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  key={option}
                  label={option}
                  size="small"
                  sx={{ bgcolor: nodeColors[option as keyof typeof nodeColors], color: 'white' }}
                  {...getTagProps({ index })}
                />
              ))
            }
          />
          
          {/* Status Filter */}
          <Autocomplete
            multiple
            size="small"
            options={Object.keys(statusColors)}
            value={filterStatus}
            onChange={(_, newValue) => setFilterStatus(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Filter by status"
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                    '&.Mui-focused fieldset': { borderColor: 'white' }
                  }
                }}
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  key={option}
                  label={option}
                  size="small"
                  sx={{ bgcolor: statusColors[option as keyof typeof statusColors], color: 'white' }}
                  {...getTagProps({ index })}
                />
              ))
            }
          />
          
          {/* Link Strength Filter */}
          <Typography sx={{ color: 'white', mb: 1, fontSize: '0.875rem' }}>
            Link Strength Range
          </Typography>
          <Slider
            value={linkStrengthFilter}
            onChange={(_, newValue) => setLinkStrengthFilter(newValue as number[])}
            valueLabelDisplay="auto"
            min={0}
            max={1}
            step={0.1}
            sx={{ mb: 2, color: 'white' }}
          />
          
          {/* Toggle Options */}
          <FormControlLabel
            control={
              <Switch
                checked={showCircular}
                onChange={(e) => setShowCircular(e.target.checked)}
                sx={{ color: 'white' }}
              />
            }
            label="Show Circular Dependencies"
            sx={{ color: 'white', display: 'block', mb: 1 }}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={showCritical}
                onChange={(e) => setShowCritical(e.target.checked)}
                sx={{ color: 'white' }}
              />
            }
            label="Show Critical Path"
            sx={{ color: 'white', display: 'block', mb: 2 }}
          />
          
          {/* Graph Stats */}
          <Paper sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.1)' }}>
            <Typography variant="caption" sx={{ color: 'white', display: 'block' }}>
              Nodes: {graphData.nodes.length} | Links: {graphData.links.length}
            </Typography>
            <Typography variant="caption" sx={{ color: 'white', display: 'block' }}>
              Circular: {data.metrics.circularDependencies} | Max Depth: {data.metrics.maxDepth}
            </Typography>
          </Paper>
        </Box>
      )}
      
      {/* Graph Visualization */}
      <Box sx={{ width: '100%', height: '100%' }}>
        {viewMode === '3d' ? (
          <ForceGraph3D
            ref={graphRef}
            graphData={graphData}
            nodeThreeObject={nodeThreeObject}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            onBackgroundClick={handleBackgroundClick}
            nodeLabel={(node: any) => `${node.name} (${node.type})`}
            linkOpacity={0.6}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={0.006}
            backgroundColor="rgba(0,0,0,0)"
            controlType="orbit"
            showNavInfo={false}
          />
        ) : (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeCanvasObject={nodeCanvasObject}
            linkCanvasObject={linkCanvasObject}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            onBackgroundClick={handleBackgroundClick}
            nodeLabel={(node: any) => `${node.name} (${node.type})`}
            backgroundColor="rgba(0,0,0,0.95)"
            cooldownTicks={100}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
          />
        )}
      </Box>
      
      {/* Graph Controls */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          bgcolor: 'rgba(0,0,0,0.8)',
          borderRadius: 1,
          p: 1
        }}
      >
        <Tooltip title="Reset Camera">
          <IconButton onClick={resetCamera} size="small" sx={{ color: 'white' }}>
            <CenterFocusStrong />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Zoom In">
          <IconButton 
            onClick={() => graphRef.current?.zoom(graphRef.current.zoom() * 1.2)} 
            size="small" 
            sx={{ color: 'white' }}
          >
            <ZoomIn />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Zoom Out">
          <IconButton 
            onClick={() => graphRef.current?.zoom(graphRef.current.zoom() * 0.8)} 
            size="small" 
            sx={{ color: 'white' }}
          >
            <ZoomOut />
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Selected Node Details */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            style={{
              position: 'absolute',
              top: 16,
              right: showDetails ? 80 : 16,
              width: 320,
              maxHeight: 'calc(100% - 32px)',
              overflow: 'auto'
            }}
          >
            <Card sx={{ bgcolor: 'rgba(0,0,0,0.9)', color: 'white' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {selectedNode.name}
                </Typography>
                
                <Grid container spacing={1} sx={{ mb: 2 }}>
                  <Grid item>
                    <Chip 
                      label={selectedNode.type} 
                      size="small" 
                      sx={{ bgcolor: nodeColors[selectedNode.type], color: 'white' }}
                    />
                  </Grid>
                  <Grid item>
                    <Chip 
                      label={selectedNode.status} 
                      size="small" 
                      sx={{ bgcolor: statusColors[selectedNode.status], color: 'white' }}
                      icon={
                        selectedNode.status === 'healthy' ? <CheckCircle /> :
                        selectedNode.status === 'warning' ? <Warning /> :
                        selectedNode.status === 'error' ? <Error /> : undefined
                      }
                    />
                  </Grid>
                  <Grid item>
                    <Chip 
                      label={selectedNode.category} 
                      size="small" 
                      sx={{ bgcolor: categoryColors[selectedNode.category], color: 'white' }}
                    />
                  </Grid>
                </Grid>
                
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Version: {selectedNode.version}
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom>
                  Metrics
                </Typography>
                
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Stability"
                      secondary={`${Math.round(selectedNode.metrics.stability * 100)}%`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Complexity"
                      secondary={`${Math.round(selectedNode.metrics.complexity * 100)}%`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Coupling"
                      secondary={`${Math.round(selectedNode.metrics.coupling * 100)}%`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Performance"
                      secondary={`${Math.round(selectedNode.metrics.performance * 100)}%`}
                    />
                  </ListItem>
                </List>
                
                <Typography variant="subtitle2" gutterBottom>
                  Dependencies ({selectedNode.dependencies.length})
                </Typography>
                
                {selectedNode.dependencies.slice(0, 5).map(dep => (
                  <Chip 
                    key={dep} 
                    label={dep} 
                    size="small" 
                    sx={{ mr: 0.5, mb: 0.5, bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}
                  />
                ))}
                
                {selectedNode.dependencies.length > 5 && (
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    +{selectedNode.dependencies.length - 5} more
                  </Typography>
                )}
                
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Dependents ({selectedNode.dependents.length})
                </Typography>
                
                {selectedNode.dependents.slice(0, 5).map(dep => (
                  <Chip 
                    key={dep} 
                    label={dep} 
                    size="small" 
                    sx={{ mr: 0.5, mb: 0.5, bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}
                  />
                ))}
                
                {selectedNode.dependents.length > 5 && (
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    +{selectedNode.dependents.length - 5} more
                  </Typography>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default DependencyGraph;
export { DependencyGraph };