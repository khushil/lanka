import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Snackbar,
  Fab,
  Drawer,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Menu,
  Close,
  Fullscreen,
  FullscreenExit,
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import GraphVisualization from '../components/graph/GraphVisualization';
import GraphControls from '../components/graph/GraphControls';
import GraphLegend from '../components/graph/GraphLegend';
import GraphSearch from '../components/graph/GraphSearch';
import GraphDetails from '../components/graph/GraphDetails';
import {
  GET_GRAPH_DATA,
  GET_NODE_DETAILS,
  GET_GRAPH_STATISTICS,
  UPDATE_NODE,
  GET_NODE_NEIGHBORS,
} from '../graphql/graph';
import {
  GraphData,
  GraphNode,
  GraphLink,
  GraphLayoutConfig,
  GraphFilters,
  GraphStatistics,
} from '../types/graph';
import { filterGraphData, highlightConnectedNodes } from '../utils/graphUtils';

const GraphExplorer: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State management
  const [layoutConfig, setLayoutConfig] = useState<GraphLayoutConfig>({
    type: 'force',
    strength: 1,
    distance: 100,
    repulsion: -300,
  });
  
  const [filters, setFilters] = useState<GraphFilters>({
    nodeTypes: [],
    linkTypes: [],
    searchQuery: '',
    properties: {},
  });
  
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<GraphLink | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [connectedNodes, setConnectedNodes] = useState<GraphNode[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // GraphQL queries and mutations
  const {
    data: graphData,
    loading: graphLoading,
    error: graphError,
    refetch: refetchGraph,
  } = useQuery(GET_GRAPH_DATA, {
    variables: { filters },
    errorPolicy: 'partial',
  });

  const {
    data: statisticsData,
    loading: statsLoading,
  } = useQuery(GET_GRAPH_STATISTICS);

  const {
    data: nodeDetailsData,
    loading: nodeDetailsLoading,
  } = useQuery(GET_NODE_DETAILS, {
    variables: { id: selectedNodeId },
    skip: !selectedNodeId,
  });

  const {
    data: neighborsData,
  } = useQuery(GET_NODE_NEIGHBORS, {
    variables: { id: selectedNodeId, depth: 1 },
    skip: !selectedNodeId,
  });

  const [updateNodeMutation] = useMutation(UPDATE_NODE, {
    onCompleted: () => {
      showNotification('Node updated successfully', 'success');
      refetchGraph();
    },
    onError: (error) => {
      showNotification(`Error updating node: ${error.message}`, 'error');
    },
  });

  // Process graph data
  const processedGraphData: GraphData = useMemo(() => {
    if (!graphData?.graphData) {
      return { nodes: [], links: [] };
    }

    const nodes: GraphNode[] = graphData.graphData.nodes.map((node: any) => ({
      id: node.id,
      name: node.name,
      type: node.type,
      properties: node.properties || {},
      color: '#3B82F6', // Will be calculated by utils
      size: 8, // Will be calculated by utils
    }));

    const links: GraphLink[] = graphData.graphData.links.map((link: any) => ({
      id: link.id,
      source: link.source,
      target: link.target,
      type: link.type,
      properties: link.properties || {},
      color: '#6B7280', // Will be calculated by utils
      width: link.weight || 1,
    }));

    return filterGraphData({ nodes, links }, filters);
  }, [graphData, filters]);

  // Update selected node details
  useEffect(() => {
    if (nodeDetailsData?.node) {
      setSelectedNode({
        id: nodeDetailsData.node.id,
        name: nodeDetailsData.node.name,
        type: nodeDetailsData.node.type,
        properties: nodeDetailsData.node.properties || {},
        color: '#3B82F6',
        size: 8,
      });
    }
  }, [nodeDetailsData]);

  // Update connected nodes
  useEffect(() => {
    if (neighborsData?.nodeNeighbors?.nodes) {
      setConnectedNodes(neighborsData.nodeNeighbors.nodes.map((node: any) => ({
        id: node.id,
        name: node.name,
        type: node.type,
        properties: node.properties || {},
        color: '#3B82F6',
        size: 8,
      })));
    }
  }, [neighborsData]);

  // Event handlers
  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNodeId(node.id);
    setSelectedNode(node);
    setSelectedLink(null);
    
    // Highlight connected nodes
    const connected = highlightConnectedNodes(processedGraphData, node.id, 1);
    setHighlightedNodes(connected);
  }, [processedGraphData]);

  const handleLinkClick = useCallback((link: GraphLink) => {
    setSelectedLink(link);
    setSelectedNode(null);
    setSelectedNodeId('');
    setHighlightedNodes(new Set());
  }, []);

  const handleNodeUpdate = useCallback(async (nodeId: string, updates: Partial<GraphNode>) => {
    try {
      await updateNodeMutation({
        variables: {
          id: nodeId,
          updates,
        },
      });
    } catch (error) {
      console.error('Failed to update node:', error);
    }
  }, [updateNodeMutation]);

  const handleSearchHighlight = useCallback((nodeIds: string[]) => {
    setHighlightedNodes(new Set(nodeIds));
  }, []);

  const handleReset = useCallback(() => {
    setSelectedNodeId('');
    setSelectedNode(null);
    setSelectedLink(null);
    setHighlightedNodes(new Set());
    setFilters({
      nodeTypes: [],
      linkTypes: [],
      searchQuery: '',
      properties: {},
    });
    setSearchQuery('');
  }, []);

  const showNotification = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setNotification({ open: true, message, severity });
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Error handling
  if (graphError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load graph data: {graphError.message}
        </Alert>
      </Box>
    );
  }

  // Loading state
  if (graphLoading) {
    return (
      <Box sx={{ 
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2,
      }}>
        <CircularProgress size={60} />
        <Typography>Loading graph data...</Typography>
      </Box>
    );
  }

  const statistics: GraphStatistics | undefined = statisticsData?.graphStatistics;

  return (
    <Box sx={{ height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {/* Main Grid Layout */}
      <Grid container sx={{ height: '100%' }}>
        {/* Sidebar */}
        <Grid
          item
          xs={12}
          md={4}
          lg={3}
          sx={{
            display: { xs: 'none', md: drawerOpen ? 'block' : 'none' },
            borderRight: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ height: '100%', overflow: 'hidden' }}>
            <Grid container direction="column" sx={{ height: '100%' }}>
              {/* Search */}
              <Grid item sx={{ height: '40%', minHeight: 300 }}>
                <GraphSearch
                  nodes={processedGraphData.nodes}
                  onNodeSelect={handleNodeClick}
                  onHighlightNodes={handleSearchHighlight}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  className="graph-search"
                />
              </Grid>

              {/* Details */}
              <Grid item sx={{ flex: 1, minHeight: 0 }}>
                <GraphDetails
                  selectedNode={selectedNode}
                  selectedLink={selectedLink}
                  connectedNodes={connectedNodes}
                  onNodeUpdate={handleNodeUpdate}
                  onNavigateToNode={(nodeId) => {
                    const node = processedGraphData.nodes.find(n => n.id === nodeId);
                    if (node) handleNodeClick(node);
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        </Grid>

        {/* Main Graph Area */}
        <Grid item xs={12} md={drawerOpen ? 8 : 12} lg={drawerOpen ? 9 : 12}>
          <Box sx={{ position: 'relative', height: '100%' }}>
            <GraphVisualization
              data={processedGraphData}
              onNodeClick={handleNodeClick}
              onLinkClick={handleLinkClick}
              selectedNodeId={selectedNodeId}
              highlightedNodes={highlightedNodes}
              layoutConfig={layoutConfig}
              searchHighlight={searchQuery}
              className="graph-visualization"
            />

            {/* Controls Overlay */}
            <Box
              sx={{
                position: 'absolute',
                top: 16,
                left: 16,
                zIndex: 1000,
                width: { xs: '90%', sm: 320 },
                maxHeight: '60vh',
              }}
            >
              <GraphControls
                layoutConfig={layoutConfig}
                onLayoutChange={setLayoutConfig}
                filters={filters}
                onFiltersChange={setFilters}
                statistics={statistics}
                onReset={handleReset}
                onRefresh={() => refetchGraph()}
                graphData={processedGraphData}
              />
            </Box>

            {/* Legend Overlay */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                zIndex: 1000,
                width: { xs: '90%', sm: 280 },
                maxHeight: '50vh',
              }}
            >
              <GraphLegend
                visibleNodeTypes={filters.nodeTypes.length > 0 ? filters.nodeTypes : ['requirement', 'architecture', 'code', 'test', 'deployment']}
                visibleLinkTypes={filters.linkTypes.length > 0 ? filters.linkTypes : ['dependency', 'relationship', 'dataflow', 'implements', 'tests', 'deploys']}
                onNodeTypeToggle={(type) => {
                  const newTypes = filters.nodeTypes.includes(type)
                    ? filters.nodeTypes.filter(t => t !== type)
                    : [...filters.nodeTypes, type];
                  setFilters(prev => ({ ...prev, nodeTypes: newTypes }));
                }}
                onLinkTypeToggle={(type) => {
                  const newTypes = filters.linkTypes.includes(type)
                    ? filters.linkTypes.filter(t => t !== type)
                    : [...filters.linkTypes, type];
                  setFilters(prev => ({ ...prev, linkTypes: newTypes }));
                }}
                onShowAll={() => {
                  setFilters(prev => ({ ...prev, nodeTypes: [], linkTypes: [] }));
                }}
                onHideAll={() => {
                  setFilters(prev => ({
                    ...prev,
                    nodeTypes: ['requirement', 'architecture', 'code', 'test', 'deployment'],
                    linkTypes: ['dependency', 'relationship', 'dataflow', 'implements', 'tests', 'deploys'],
                  }));
                }}
              />
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={drawerOpen && isMobile}
        onClose={() => setDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: '90%',
            maxWidth: 400,
          },
        }}
      >
        <Box sx={{ height: '100%', overflow: 'hidden' }}>
          <Grid container direction="column" sx={{ height: '100%' }}>
            <Grid item sx={{ height: '40%', minHeight: 300 }}>
              <GraphSearch
                nodes={processedGraphData.nodes}
                onNodeSelect={handleNodeClick}
                onHighlightNodes={handleSearchHighlight}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </Grid>
            <Grid item sx={{ flex: 1, minHeight: 0 }}>
              <GraphDetails
                selectedNode={selectedNode}
                selectedLink={selectedLink}
                connectedNodes={connectedNodes}
                onNodeUpdate={handleNodeUpdate}
                onNavigateToNode={(nodeId) => {
                  const node = processedGraphData.nodes.find(n => n.id === nodeId);
                  if (node) handleNodeClick(node);
                }}
              />
            </Grid>
          </Grid>
        </Box>
      </Drawer>

      {/* Floating Action Buttons */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          zIndex: 1200,
        }}
      >
        {isMobile && (
          <Fab
            size="small"
            onClick={() => setDrawerOpen(!drawerOpen)}
            color="primary"
          >
            {drawerOpen ? <Close /> : <Menu />}
          </Fab>
        )}
        
        <Fab
          size="small"
          onClick={toggleFullscreen}
          color="secondary"
        >
          {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
        </Fab>
      </Box>

      {/* Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      >
        <Alert
          severity={notification.severity}
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GraphExplorer;