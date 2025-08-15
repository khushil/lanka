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
  TextField,
  Autocomplete,
  Slider,
  FormControlLabel,
  Switch,
  Button,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import {
  Search,
  FilterList,
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  Share,
  BookmarkBorder,
  Timeline,
  Psychology,
  School,
  Business,
  Code,
  BugReport,
  MoreVert,
  Visibility,
  VisibilityOff,
  Warning
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import ForceGraph3D from 'react-force-graph-3d';
import ForceGraph2D from 'react-force-graph-2d';
import * as THREE from 'three';

interface KnowledgeNode {
  id: string;
  label: string;
  type: 'concept' | 'requirement' | 'component' | 'decision' | 'issue' | 'solution' | 'person' | 'document';
  category: 'requirements' | 'architecture' | 'development' | 'integration' | 'analytics' | 'process';
  importance: number;
  confidence: number;
  connections: number;
  properties: Record<string, any>;
  metadata: {
    createdAt: string;
    lastModified: string;
    author: string;
    tags: string[];
    source: string;
  };
  position?: { x: number; y: number; z: number };
}

interface KnowledgeEdge {
  source: string;
  target: string;
  relationship: 'relates_to' | 'depends_on' | 'implements' | 'conflicts_with' | 'influences' | 'derived_from';
  strength: number;
  bidirectional: boolean;
  confidence: number;
  evidence: string[];
}

interface KnowledgeCluster {
  id: string;
  name: string;
  description: string;
  nodes: string[];
  centroid: { x: number; y: number; z: number };
  color: string;
  importance: number;
}

interface KnowledgeGraphData {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  clusters: KnowledgeCluster[];
  metrics: {
    totalNodes: number;
    totalEdges: number;
    avgConnections: number;
    topConcepts: string[];
    knowledgeDensity: number;
  };
  insights: Array<{
    type: 'pattern' | 'gap' | 'opportunity' | 'risk';
    title: string;
    description: string;
    confidence: number;
    relatedNodes: string[];
  }>;
}

interface KnowledgeGraphProps {
  data: KnowledgeGraphData | null;
  viewMode: '2d' | '3d';
  showDetails: boolean;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  data,
  viewMode,
  showDetails
}) => {
  const graphRef = useRef<any>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<KnowledgeNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [importanceRange, setImportanceRange] = useState([0, 1]);
  const [confidenceRange, setConfidenceRange] = useState([0, 1]);
  const [showClusters, setShowClusters] = useState(true);
  const [showInsights, setShowInsights] = useState(true);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [pathHighlight, setPathHighlight] = useState<string[]>([]);

  // Color schemes
  const nodeTypeColors = {
    concept: '#4CAF50',
    requirement: '#2196F3',
    component: '#FF9800',
    decision: '#9C27B0',
    issue: '#F44336',
    solution: '#00BCD4',
    person: '#FFD700',
    document: '#795548'
  };

  const categoryColors = {
    requirements: '#4CAF50',
    architecture: '#2196F3',
    development: '#FF9800',
    integration: '#9C27B0',
    analytics: '#F44336',
    process: '#607D8B'
  };

  const relationshipColors = {
    relates_to: '#666666',
    depends_on: '#FF5722',
    implements: '#4CAF50',
    conflicts_with: '#F44336',
    influences: '#FF9800',
    derived_from: '#9C27B0'
  };

  // Filter data based on current filters
  const filteredData = useCallback(() => {
    if (!data) return { nodes: [], links: [] };

    let filteredNodes = data.nodes.filter(node => {
      const matchesSearch = node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           node.properties.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           node.metadata.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = filterType.length === 0 || filterType.includes(node.type);
      const matchesCategory = filterCategory.length === 0 || filterCategory.includes(node.category);
      const matchesImportance = node.importance >= importanceRange[0] && node.importance <= importanceRange[1];
      const matchesConfidence = node.confidence >= confidenceRange[0] && node.confidence <= confidenceRange[1];
      
      return matchesSearch && matchesType && matchesCategory && matchesImportance && matchesConfidence;
    });

    const nodeIds = new Set(filteredNodes.map(n => n.id));
    
    let filteredEdges = data.edges.filter(edge => 
      nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );

    return {
      nodes: filteredNodes,
      links: filteredEdges.map(edge => ({
        source: edge.source,
        target: edge.target,
        ...edge
      }))
    };
  }, [data, searchTerm, filterType, filterCategory, importanceRange, confidenceRange]);

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

  const handleNodeRightClick = useCallback((node: any, event: MouseEvent) => {
    event.preventDefault();
    setSelectedNode(node);
    setMenuAnchor(event.target as HTMLElement);
  }, []);

  const handleNodeHover = useCallback((node: any) => {
    setHoveredNode(node);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
    setHighlightNodes(new Set());
    setHighlightLinks(new Set());
    setPathHighlight([]);
  }, []);

  const findShortestPath = useCallback((sourceId: string, targetId: string) => {
    if (!data) return [];
    
    // Simple BFS implementation for shortest path
    const queue = [[sourceId]];
    const visited = new Set([sourceId]);
    
    while (queue.length > 0) {
      const path = queue.shift()!;
      const current = path[path.length - 1];
      
      if (current === targetId) {
        setPathHighlight(path);
        return path;
      }
      
      data.edges.forEach(edge => {
        let next = null;
        if (edge.source === current && !visited.has(edge.target)) {
          next = edge.target;
        } else if (edge.target === current && !visited.has(edge.source) && edge.bidirectional) {
          next = edge.source;
        }
        
        if (next) {
          visited.add(next);
          queue.push([...path, next]);
        }
      });
    }
    
    return [];
  }, [data]);

  // Node rendering functions
  const nodeThreeObject = useCallback((node: any) => {
    if (viewMode !== '3d') return undefined;
    
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(generateNodeTexture(node)),
        transparent: true
      })
    );
    sprite.scale.set(12 + node.importance * 8, 12 + node.importance * 8, 1);
    return sprite;
  }, [viewMode]);

  const generateNodeTexture = (node: KnowledgeNode) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 128;
    canvas.height = 128;
    
    const radius = 50;
    const isHighlighted = highlightNodes.has(node.id);
    const isSelected = selectedNode?.id === node.id;
    const isInPath = pathHighlight.includes(node.id);
    
    // Background circle with importance-based size
    ctx.beginPath();
    ctx.arc(64, 64, radius * (0.5 + node.importance * 0.5), 0, 2 * Math.PI);
    ctx.fillStyle = isSelected ? '#FFD700' : 
                   isInPath ? '#FF6B00' :
                   isHighlighted ? nodeTypeColors[node.type] :
                   categoryColors[node.category];
    ctx.fill();
    
    // Confidence ring
    ctx.beginPath();
    ctx.arc(64, 64, radius * 0.8, 0, 2 * Math.PI * node.confidence);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Type indicator
    const typeIcons = {
      concept: '💡',
      requirement: '📋',
      component: '🔧',
      decision: '⚖️',
      issue: '⚠️',
      solution: '✅',
      person: '👤',
      document: '📄'
    };
    
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(typeIcons[node.type] || '●', 64, 70);
    
    // Connection count
    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(node.connections.toString(), 64, 90);
    
    // Label
    ctx.font = 'bold 10px Arial';
    ctx.fillStyle = '#ffffff';
    const label = node.label.length > 12 ? node.label.substring(0, 12) + '...' : node.label;
    ctx.fillText(label, 64, 110);
    
    return canvas;
  };

  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (viewMode !== '2d') return;
    
    const label = node.label;
    const fontSize = 12 / globalScale;
    ctx.font = `${fontSize}px Sans-Serif`;
    
    const isHighlighted = highlightNodes.has(node.id);
    const isSelected = selectedNode?.id === node.id;
    const isInPath = pathHighlight.includes(node.id);
    
    // Node circle with importance-based size
    const radius = Math.max(6, 4 + node.importance * 8);
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = isSelected ? '#FFD700' : 
                   isInPath ? '#FF6B00' :
                   isHighlighted ? nodeTypeColors[node.type] :
                   categoryColors[node.category];
    ctx.fill();
    
    // Confidence ring
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius * 1.2, 0, 2 * Math.PI * node.confidence, false);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 / globalScale;
    ctx.stroke();
    
    // Connection indicator
    if (node.connections > 5) {
      ctx.beginPath();
      ctx.arc(node.x + radius * 0.7, node.y - radius * 0.7, radius * 0.3, 0, 2 * Math.PI, false);
      ctx.fillStyle = '#FFD700';
      ctx.fill();
    }
    
    // Label background
    const textWidth = ctx.measureText(label).width;
    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + radius + 2, bckgDimensions[0], bckgDimensions[1]);
    
    // Label text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, node.x, node.y + radius + fontSize / 2 + 2);
  }, [viewMode, highlightNodes, selectedNode, pathHighlight]);

  const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isHighlighted = highlightLinks.has(`${link.source.id}-${link.target.id}`);
    const isInPath = pathHighlight.includes(link.source.id) && pathHighlight.includes(link.target.id);
    
    ctx.strokeStyle = isInPath ? '#FF6B00' :
                     isHighlighted ? '#00FFFF' :
                     relationshipColors[link.relationship] || '#666666';
    ctx.lineWidth = (link.strength * 3 + (isHighlighted || isInPath ? 2 : 0)) / globalScale;
    
    // Different line styles for different relationships
    if (link.relationship === 'conflicts_with') {
      ctx.setLineDash([5, 5]);
    } else if (link.relationship === 'influences') {
      ctx.setLineDash([10, 5, 2, 5]);
    } else {
      ctx.setLineDash([]);
    }
    
    // Draw arrow for directional relationships
    const angle = Math.atan2(link.target.y - link.source.y, link.target.x - link.source.x);
    const arrowLength = 8 / globalScale;
    const arrowAngle = Math.PI / 6;
    
    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.stroke();
    
    // Arrow head
    if (!link.bidirectional) {
      ctx.beginPath();
      ctx.moveTo(link.target.x, link.target.y);
      ctx.lineTo(
        link.target.x - arrowLength * Math.cos(angle - arrowAngle),
        link.target.y - arrowLength * Math.sin(angle - arrowAngle)
      );
      ctx.moveTo(link.target.x, link.target.y);
      ctx.lineTo(
        link.target.x - arrowLength * Math.cos(angle + arrowAngle),
        link.target.y - arrowLength * Math.sin(angle + arrowAngle)
      );
      ctx.stroke();
    }
  }, [highlightLinks, pathHighlight]);

  const resetCamera = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400);
    }
  }, []);

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  if (!data) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Typography variant="h6" color="textSecondary">
          No knowledge graph data available
        </Typography>
      </Box>
    );
  }

  const graphData = filteredData();

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Search and Filter Panel */}
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
            Knowledge Explorer
          </Typography>
          
          {/* Search */}
          <TextField
            fullWidth
            size="small"
            placeholder="Search concepts, tags..."
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
            options={Object.keys(nodeTypeColors)}
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
                  sx={{ bgcolor: nodeTypeColors[option as keyof typeof nodeTypeColors], color: 'white' }}
                  {...getTagProps({ index })}
                />
              ))
            }
          />
          
          {/* Category Filter */}
          <Autocomplete
            multiple
            size="small"
            options={Object.keys(categoryColors)}
            value={filterCategory}
            onChange={(_, newValue) => setFilterCategory(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Filter by category"
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
                  sx={{ bgcolor: categoryColors[option as keyof typeof categoryColors], color: 'white' }}
                  {...getTagProps({ index })}
                />
              ))
            }
          />
          
          {/* Importance Range */}
          <Typography sx={{ color: 'white', mb: 1, fontSize: '0.875rem' }}>
            Importance Range
          </Typography>
          <Slider
            value={importanceRange}
            onChange={(_, newValue) => setImportanceRange(newValue as number[])}
            valueLabelDisplay="auto"
            min={0}
            max={1}
            step={0.1}
            sx={{ mb: 2, color: 'white' }}
          />
          
          {/* Confidence Range */}
          <Typography sx={{ color: 'white', mb: 1, fontSize: '0.875rem' }}>
            Confidence Range
          </Typography>
          <Slider
            value={confidenceRange}
            onChange={(_, newValue) => setConfidenceRange(newValue as number[])}
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
                checked={showClusters}
                onChange={(e) => setShowClusters(e.target.checked)}
                sx={{ color: 'white' }}
              />
            }
            label="Show Clusters"
            sx={{ color: 'white', display: 'block', mb: 1 }}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={showInsights}
                onChange={(e) => setShowInsights(e.target.checked)}
                sx={{ color: 'white' }}
              />
            }
            label="Show Insights"
            sx={{ color: 'white', display: 'block', mb: 2 }}
          />
          
          {/* Graph Stats */}
          <Paper sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.1)' }}>
            <Typography variant="caption" sx={{ color: 'white', display: 'block' }}>
              Nodes: {graphData.nodes.length} | Links: {graphData.links.length}
            </Typography>
            <Typography variant="caption" sx={{ color: 'white', display: 'block' }}>
              Density: {data.metrics.knowledgeDensity.toFixed(2)} | Avg Connections: {data.metrics.avgConnections.toFixed(1)}
            </Typography>
          </Paper>
          
          {/* Top Concepts */}
          {data.metrics.topConcepts.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
                Top Concepts
              </Typography>
              {data.metrics.topConcepts.slice(0, 5).map(concept => (
                <Chip
                  key={concept}
                  label={concept}
                  size="small"
                  sx={{ mr: 0.5, mb: 0.5, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  onClick={() => {
                    const node = data.nodes.find(n => n.label === concept);
                    if (node) handleNodeClick(node);
                  }}
                />
              ))}
            </Box>
          )}
        </Box>
      )}
      
      {/* Insights Panel */}
      {showInsights && data.insights.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            left: showDetails ? 352 : 16,
            width: 320,
            maxHeight: '40%',
            overflow: 'auto',
            bgcolor: 'rgba(0,0,0,0.9)',
            borderRadius: 2,
            p: 2,
            zIndex: 10
          }}
        >
          <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
            Knowledge Insights
          </Typography>
          
          {data.insights.slice(0, 3).map((insight, index) => (
            <Card key={index} sx={{ mb: 1, bgcolor: 'rgba(255,255,255,0.1)' }}>
              <CardContent sx={{ p: 1 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  {insight.type === 'pattern' && <Psychology color="primary" />}
                  {insight.type === 'gap' && <Warning color="warning" />}
                  {insight.type === 'opportunity' && <Timeline color="success" />}
                  {insight.type === 'risk' && <BugReport color="error" />}
                  
                  <Typography variant="subtitle2" sx={{ color: 'white' }}>
                    {insight.title}
                  </Typography>
                  
                  <Chip
                    label={`${Math.round(insight.confidence * 100)}%`}
                    size="small"
                    color={insight.confidence > 0.8 ? 'success' : insight.confidence > 0.6 ? 'warning' : 'error'}
                  />
                </Box>
                
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  {insight.description}
                </Typography>
                
                <Box sx={{ mt: 1 }}>
                  {insight.relatedNodes.slice(0, 3).map(nodeId => {
                    const node = data.nodes.find(n => n.id === nodeId);
                    return node ? (
                      <Chip
                        key={nodeId}
                        label={node.label}
                        size="small"
                        sx={{ mr: 0.5, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                        onClick={() => handleNodeClick(node)}
                      />
                    ) : null;
                  })}
                </Box>
              </CardContent>
            </Card>
          ))}
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
            onNodeRightClick={handleNodeRightClick}
            onNodeHover={handleNodeHover}
            onBackgroundClick={handleBackgroundClick}
            nodeLabel={(node: any) => `${node.label} (${node.type}) - ${node.connections} connections`}
            linkOpacity={0.6}
            linkDirectionalParticles={1}
            linkDirectionalParticleSpeed={0.004}
            backgroundColor="rgba(0,0,0,0)"
            controlType="orbit"
            showNavInfo={false}
            d3AlphaDecay={0.01}
            d3VelocityDecay={0.1}
          />
        ) : (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeCanvasObject={nodeCanvasObject}
            linkCanvasObject={linkCanvasObject}
            onNodeClick={handleNodeClick}
            onNodeRightClick={handleNodeRightClick}
            onNodeHover={handleNodeHover}
            onBackgroundClick={handleBackgroundClick}
            nodeLabel={(node: any) => `${node.label} (${node.type}) - ${node.connections} connections`}
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
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Typography variant="h6" gutterBottom>
                    {selectedNode.label}
                  </Typography>
                  
                  <IconButton 
                    size="small" 
                    sx={{ color: 'white' }}
                    onClick={(e) => setMenuAnchor(e.currentTarget)}
                  >
                    <MoreVert />
                  </IconButton>
                </Box>
                
                <Grid container spacing={1} sx={{ mb: 2 }}>
                  <Grid item>
                    <Chip 
                      label={selectedNode.type} 
                      size="small" 
                      sx={{ bgcolor: nodeTypeColors[selectedNode.type], color: 'white' }}
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
                
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {selectedNode.properties.description || 'No description available'}
                </Typography>
                
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Importance</Typography>
                    <Typography variant="body2">{Math.round(selectedNode.importance * 100)}%</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Confidence</Typography>
                    <Typography variant="body2">{Math.round(selectedNode.confidence * 100)}%</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Connections</Typography>
                    <Typography variant="body2">{selectedNode.connections}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Source</Typography>
                    <Typography variant="body2">{selectedNode.metadata.source}</Typography>
                  </Grid>
                </Grid>
                
                {selectedNode.metadata.tags.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                      Tags
                    </Typography>
                    {selectedNode.metadata.tags.map(tag => (
                      <Chip 
                        key={tag} 
                        label={tag} 
                        size="small" 
                        sx={{ mr: 0.5, mb: 0.5, bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}
                      />
                    ))}
                  </Box>
                )}
                
                <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.2)' }} />
                
                <Typography variant="caption" color="textSecondary" display="block">
                  Created: {new Date(selectedNode.metadata.createdAt).toLocaleDateString()}
                </Typography>
                <Typography variant="caption" color="textSecondary" display="block">
                  Author: {selectedNode.metadata.author}
                </Typography>
                <Typography variant="caption" color="textSecondary" display="block">
                  Last Modified: {new Date(selectedNode.metadata.lastModified).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { bgcolor: 'rgba(0,0,0,0.9)', color: 'white' }
        }}
      >
        <MenuItem onClick={() => {
          // Find path functionality
          handleMenuClose();
        }}>
          <Timeline sx={{ mr: 1 }} />
          Find Path To...
        </MenuItem>
        
        <MenuItem onClick={() => {
          // Bookmark functionality
          handleMenuClose();
        }}>
          <BookmarkBorder sx={{ mr: 1 }} />
          Bookmark Node
        </MenuItem>
        
        <MenuItem onClick={() => {
          // Share functionality
          handleMenuClose();
        }}>
          <Share sx={{ mr: 1 }} />
          Share Node
        </MenuItem>
        
        <MenuItem onClick={() => {
          // Hide/show connected nodes
          handleMenuClose();
        }}>
          <Visibility sx={{ mr: 1 }} />
          Focus Connections
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default KnowledgeGraph;
export { KnowledgeGraph };