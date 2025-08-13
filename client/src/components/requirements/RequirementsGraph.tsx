import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  Button,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Grid,
  Stack
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  Fullscreen as FullscreenIcon,
  Settings as SettingsIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { ForceGraph2D } from 'react-force-graph';
import { 
  GraphNode, 
  GraphEdge, 
  RequirementsGraphData,
  RelationshipType,
  RequirementCategory,
  Priority,
  RequirementStatus
} from '../../types/requirements';

interface RequirementsGraphProps {
  graphData: RequirementsGraphData;
  onNodeClick: (node: GraphNode) => void;
  onEdgeClick: (edge: GraphEdge) => void;
  loading?: boolean;
  height?: number;
}

const RequirementsGraph: React.FC<RequirementsGraphProps> = ({
  graphData,
  onNodeClick,
  onEdgeClick,
  loading = false,
  height = 600
}) => {
  const graphRef = useRef<any>();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  
  // Graph settings
  const [settings, setSettings] = useState({
    nodeSize: 6,
    linkDistance: 100,
    repelForce: -200,
    showLabels: true,
    showEdgeLabels: false,
    enableDrag: true,
    enableZoom: true,
    enableHighlight: true,
    colorByCategory: true,
    sizeByPriority: true
  });

  // Filters
  const [filters, setFilters] = useState({
    categories: [] as RequirementCategory[],
    priorities: [] as Priority[],
    statuses: [] as RequirementStatus[],
    relationshipTypes: [] as RelationshipType[],
    hideIsolatedNodes: false
  });

  // Graph styling functions
  const getNodeColor = useCallback((node: GraphNode) => {
    if (settings.colorByCategory) {
      const categoryColors = {
        [RequirementCategory.FUNCTIONAL]: '#4CAF50',
        [RequirementCategory.NON_FUNCTIONAL]: '#2196F3',
        [RequirementCategory.TECHNICAL]: '#FF9800',
        [RequirementCategory.BUSINESS]: '#9C27B0',
        [RequirementCategory.SECURITY]: '#F44336',
        [RequirementCategory.PERFORMANCE]: '#FF5722',
        [RequirementCategory.USABILITY]: '#00BCD4',
        [RequirementCategory.COMPLIANCE]: '#795548'
      };
      return categoryColors[node.category] || '#9E9E9E';
    }
    
    if (node.priority) {
      const priorityColors = {
        [Priority.CRITICAL]: '#F44336',
        [Priority.HIGH]: '#FF9800',
        [Priority.MEDIUM]: '#2196F3',
        [Priority.LOW]: '#4CAF50'
      };
      return priorityColors[node.priority] || '#9E9E9E';
    }
    
    return node.type === 'requirement' ? '#2196F3' : '#9E9E9E';
  }, [settings.colorByCategory]);

  const getNodeSize = useCallback((node: GraphNode) => {
    let size = settings.nodeSize;
    
    if (settings.sizeByPriority && node.priority) {
      const priorityMultipliers = {
        [Priority.CRITICAL]: 2,
        [Priority.HIGH]: 1.5,
        [Priority.MEDIUM]: 1,
        [Priority.LOW]: 0.8
      };
      size *= priorityMultipliers[node.priority] || 1;
    }
    
    return size;
  }, [settings.nodeSize, settings.sizeByPriority]);

  const getLinkColor = useCallback((edge: GraphEdge) => {
    const typeColors = {
      [RelationshipType.DEPENDS_ON]: '#F44336',
      [RelationshipType.BLOCKS]: '#FF9800',
      [RelationshipType.RELATED]: '#2196F3',
      [RelationshipType.CONFLICTS]: '#9C27B0',
      [RelationshipType.DUPLICATES]: '#607D8B',
      [RelationshipType.DERIVED_FROM]: '#4CAF50'
    };
    return typeColors[edge.type] || '#9E9E9E';
  }, []);

  const getLinkWidth = useCallback((edge: GraphEdge) => {
    return edge.weight ? Math.max(1, edge.weight * 3) : 2;
  }, []);

  // Filter graph data
  const filteredGraphData = useMemo(() => {
    let nodes = [...graphData.nodes];
    let edges = [...graphData.edges];

    // Apply node filters
    if (filters.categories.length > 0) {
      nodes = nodes.filter(node => 
        !node.category || filters.categories.includes(node.category)
      );
    }

    if (filters.priorities.length > 0) {
      nodes = nodes.filter(node => 
        !node.priority || filters.priorities.includes(node.priority)
      );
    }

    if (filters.statuses.length > 0) {
      nodes = nodes.filter(node => 
        !node.status || filters.statuses.includes(node.status)
      );
    }

    // Apply edge filters
    if (filters.relationshipTypes.length > 0) {
      edges = edges.filter(edge => 
        filters.relationshipTypes.includes(edge.type)
      );
    }

    // Filter edges to only include those between remaining nodes
    const nodeIds = new Set(nodes.map(n => n.id));
    edges = edges.filter(edge => 
      nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );

    // Remove isolated nodes if requested
    if (filters.hideIsolatedNodes) {
      const connectedNodeIds = new Set([
        ...edges.map(e => e.source),
        ...edges.map(e => e.target)
      ]);
      nodes = nodes.filter(node => connectedNodeIds.has(node.id));
    }

    return { nodes, edges };
  }, [graphData, filters]);

  // Graph interaction handlers
  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    onNodeClick(node);
    
    if (graphRef.current) {
      // Highlight connected nodes
      const connectedNodeIds = new Set();
      filteredGraphData.edges.forEach(edge => {
        if (edge.source === node.id) connectedNodeIds.add(edge.target);
        if (edge.target === node.id) connectedNodeIds.add(edge.source);
      });
      
      graphRef.current.centerAt(node.x, node.y, 1000);
    }
  }, [onNodeClick, filteredGraphData.edges]);

  const handleLinkClick = useCallback((edge: GraphEdge) => {
    setSelectedEdge(edge);
    onEdgeClick(edge);
  }, [onEdgeClick]);

  const handleZoomIn = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() * 1.5, 400);
    }
  };

  const handleZoomOut = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() / 1.5, 400);
    }
  };

  const handleCenter = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400);
    }
  };

  const exportGraph = () => {
    if (graphRef.current) {
      const canvas = graphRef.current.getCanvasElement();
      const link = document.createElement('a');
      link.download = 'requirements-graph.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  // Auto-center graph when data changes
  useEffect(() => {
    if (graphRef.current && filteredGraphData.nodes.length > 0) {
      setTimeout(() => {
        graphRef.current.zoomToFit(1000);
      }, 100);
    }
  }, [filteredGraphData]);

  const renderNodeTooltip = (node: GraphNode) => {
    return (
      <div style={{ 
        background: 'rgba(0,0,0,0.8)', 
        color: 'white', 
        padding: '8px', 
        borderRadius: '4px',
        fontSize: '12px',
        maxWidth: '200px'
      }}>
        <div><strong>{node.label}</strong></div>
        {node.type && <div>Type: {node.type}</div>}
        {node.category && <div>Category: {node.category.replace('_', ' ')}</div>}
        {node.priority && <div>Priority: {node.priority.toUpperCase()}</div>}
        {node.status && <div>Status: {node.status.replace('_', ' ')}</div>}
      </div>
    );
  };

  const renderLinkTooltip = (edge: GraphEdge) => {
    return (
      <div style={{ 
        background: 'rgba(0,0,0,0.8)', 
        color: 'white', 
        padding: '8px', 
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        <div><strong>{edge.type.replace('_', ' ')}</strong></div>
        {edge.label && <div>{edge.label}</div>}
        {edge.weight && <div>Weight: {edge.weight}</div>}
      </div>
    );
  };

  if (loading) {
    return (
      <Paper sx={{ p: 4, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography>Loading graph visualization...</Typography>
      </Paper>
    );
  }

  if (filteredGraphData.nodes.length === 0) {
    return (
      <Paper sx={{ p: 4, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Alert severity="info">
          No requirements data available for visualization. Add some requirements and relationships to see the graph.
        </Alert>
      </Paper>
    );
  }

  return (
    <Box sx={{ position: 'relative', height }}>
      {/* Graph Controls */}
      <Box sx={{ 
        position: 'absolute', 
        top: 10, 
        right: 10, 
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 1
      }}>
        <Paper sx={{ p: 1 }}>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Zoom In">
              <IconButton size="small" onClick={handleZoomIn}>
                <ZoomInIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom Out">
              <IconButton size="small" onClick={handleZoomOut}>
                <ZoomOutIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Center">
              <IconButton size="small" onClick={handleCenter}>
                <CenterIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Filters">
              <IconButton size="small" onClick={() => setFilterOpen(true)}>
                <FilterIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings">
              <IconButton size="small" onClick={() => setSettingsOpen(true)}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export">
              <IconButton size="small" onClick={exportGraph}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Paper>
      </Box>

      {/* Graph Legend */}
      <Box sx={{ 
        position: 'absolute', 
        bottom: 10, 
        left: 10, 
        zIndex: 1000,
        maxWidth: 300
      }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Legend
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Typography variant="caption" gutterBottom>
                Node Types:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#2196F3' }} />
                  <Typography variant="caption">Requirement</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#9E9E9E' }} />
                  <Typography variant="caption">Stakeholder</Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" gutterBottom>
                Relationships:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 16, height: 2, bgcolor: '#F44336' }} />
                  <Typography variant="caption">Depends On</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 16, height: 2, bgcolor: '#2196F3' }} />
                  <Typography variant="caption">Related</Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {/* Graph Stats */}
      <Box sx={{ 
        position: 'absolute', 
        top: 10, 
        left: 10, 
        zIndex: 1000
      }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Nodes: {filteredGraphData.nodes.length} | Edges: {filteredGraphData.edges.length}
          </Typography>
        </Paper>
      </Box>

      {/* Force Graph */}
      <ForceGraph2D
        ref={graphRef}
        graphData={filteredGraphData}
        nodeId="id"
        nodeLabel={settings.showLabels ? renderNodeTooltip : undefined}
        nodeColor={getNodeColor}
        nodeVal={getNodeSize}
        nodeCanvasObject={settings.showLabels ? (node, ctx, globalScale) => {
          const label = node.label;
          const fontSize = 12/globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#333';
          ctx.fillText(label, node.x, node.y);
        } : undefined}
        linkSource="source"
        linkTarget="target"
        linkLabel={settings.showEdgeLabels ? renderLinkTooltip : undefined}
        linkColor={getLinkColor}
        linkWidth={getLinkWidth}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkCurvature={0.25}
        onNodeClick={handleNodeClick}
        onLinkClick={handleLinkClick}
        cooldownTicks={100}
        onEngineStop={() => graphRef.current?.zoomToFit(400)}
        enableNodeDrag={settings.enableDrag}
        enableZoomPanInteraction={settings.enableZoom}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        d3Force={{
          link: { distance: settings.linkDistance },
          charge: { strength: settings.repelForce }
        }}
      />

      {/* Filter Dialog */}
      <Dialog 
        open={filterOpen} 
        onClose={() => setFilterOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Graph Filters</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Categories</InputLabel>
                <Select
                  multiple
                  value={filters.categories}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    categories: e.target.value as RequirementCategory[] 
                  }))}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value.replace('_', ' ')} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {Object.values(RequirementCategory).map((category) => (
                    <MenuItem key={category} value={category}>
                      {category.replace('_', ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Priorities</InputLabel>
                <Select
                  multiple
                  value={filters.priorities}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    priorities: e.target.value as Priority[] 
                  }))}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value.toUpperCase()} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {Object.values(Priority).map((priority) => (
                    <MenuItem key={priority} value={priority}>
                      {priority.toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Relationship Types</InputLabel>
                <Select
                  multiple
                  value={filters.relationshipTypes}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    relationshipTypes: e.target.value as RelationshipType[] 
                  }))}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value.replace('_', ' ')} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {Object.values(RelationshipType).map((type) => (
                    <MenuItem key={type} value={type}>
                      {type.replace('_', ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={filters.hideIsolatedNodes}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      hideIsolatedNodes: e.target.checked 
                    }))}
                  />
                }
                label="Hide isolated nodes"
              />
            </Grid>
          </Grid>

          <Button
            onClick={() => setFilters({
              categories: [],
              priorities: [],
              statuses: [],
              relationshipTypes: [],
              hideIsolatedNodes: false
            })}
            sx={{ mt: 2 }}
          >
            Clear All Filters
          </Button>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog 
        open={settingsOpen} 
        onClose={() => setSettingsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Graph Settings</DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography gutterBottom>Node Size</Typography>
              <Slider
                value={settings.nodeSize}
                onChange={(_, value) => setSettings(prev => ({ ...prev, nodeSize: value as number }))}
                min={2}
                max={20}
                step={1}
                marks
              />
            </Grid>

            <Grid item xs={12}>
              <Typography gutterBottom>Link Distance</Typography>
              <Slider
                value={settings.linkDistance}
                onChange={(_, value) => setSettings(prev => ({ ...prev, linkDistance: value as number }))}
                min={50}
                max={300}
                step={10}
                marks
              />
            </Grid>

            <Grid item xs={12}>
              <Typography gutterBottom>Repel Force</Typography>
              <Slider
                value={Math.abs(settings.repelForce)}
                onChange={(_, value) => setSettings(prev => ({ ...prev, repelForce: -(value as number) }))}
                min={100}
                max={500}
                step={50}
                marks
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.showLabels}
                    onChange={(e) => setSettings(prev => ({ ...prev, showLabels: e.target.checked }))}
                  />
                }
                label="Show node labels"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.showEdgeLabels}
                    onChange={(e) => setSettings(prev => ({ ...prev, showEdgeLabels: e.target.checked }))}
                  />
                }
                label="Show edge labels"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.colorByCategory}
                    onChange={(e) => setSettings(prev => ({ ...prev, colorByCategory: e.target.checked }))}
                  />
                }
                label="Color by category"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.sizeByPriority}
                    onChange={(e) => setSettings(prev => ({ ...prev, sizeByPriority: e.target.checked }))}
                  />
                }
                label="Size by priority"
              />
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default RequirementsGraph;