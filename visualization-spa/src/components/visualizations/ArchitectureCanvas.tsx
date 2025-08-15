import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  ButtonGroup,
  Button,
  Tooltip,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Card,
  CardContent,
  Divider,
  TextField,
  InputAdornment,
  Badge
} from '@mui/material';
import {
  Add,
  Remove,
  CenterFocusStrong,
  GridOn,
  GridOff,
  Save,
  Undo,
  Redo,
  Search,
  FilterList,
  Architecture,
  Cloud,
  Storage,
  Security,
  Speed
} from '@mui/icons-material';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  EdgeChange,
  NodeChange,
  ReactFlowProvider,
  ReactFlowInstance,
  MiniMap,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { ArchitecturePattern } from '../../graphql/architecture';
import { VisualizationTheme } from '../../types/visualizations';

interface ArchitectureCanvasProps {
  patterns: ArchitecturePattern[];
  theme: VisualizationTheme;
  viewMode: 'overview' | 'detailed';
  onPatternSelect: (pattern: ArchitecturePattern) => void;
}

// Custom node types
const CustomNode = ({ data }: { data: any }) => {
  return (
    <Card sx={{ minWidth: 180, maxWidth: 220 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          {data.icon}
          <Typography variant="subtitle2" sx={{ ml: 1, fontWeight: 'bold' }}>
            {data.label}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {data.description}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {data.tags?.slice(0, 2).map((tag: string, index: number) => (
            <Chip key={index} label={tag} size="small" variant="outlined" />
          ))}
        </Box>
        {data.metrics && (
          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
            <Chip
              label={`${data.metrics.performance}%`}
              size="small"
              color="primary"
              variant="filled"
            />
            <Chip
              label={`${data.metrics.scalability}%`}
              size="small"
              color="secondary"
              variant="filled"
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const ArchitectureCanvas: React.FC<ArchitectureCanvasProps> = ({
  patterns,
  theme,
  viewMode,
  onPatternSelect
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showGrid, setShowGrid] = useState(true);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Generate initial nodes and edges from patterns
  const initialNodes: Node[] = useMemo(() => {
    if (!patterns) return [];
    
    return patterns.map((pattern, index) => ({
      id: pattern.id,
      type: 'custom',
      position: { 
        x: (index % 4) * 300 + 100, 
        y: Math.floor(index / 4) * 200 + 100 
      },
      data: {
        label: pattern.name,
        description: pattern.description,
        category: pattern.category,
        tags: pattern.tags,
        metrics: pattern.metrics,
        icon: getCategoryIcon(pattern.category),
        pattern
      },
      style: {
        background: theme.surface,
        border: `2px solid ${theme.border}`,
        borderRadius: 8,
      },
    }));
  }, [patterns, theme]);

  const initialEdges: Edge[] = useMemo(() => {
    if (!patterns) return [];
    
    const edges: Edge[] = [];
    patterns.forEach((pattern, index) => {
      // Create connections based on similar categories or technologies
      patterns.slice(index + 1).forEach((otherPattern) => {
        const similarity = calculateSimilarity(pattern, otherPattern);
        if (similarity > 0.3) {
          edges.push({
            id: `${pattern.id}-${otherPattern.id}`,
            source: pattern.id,
            target: otherPattern.id,
            type: 'smoothstep',
            style: {
              strokeWidth: similarity * 3,
              stroke: theme.primary,
              opacity: 0.6,
            },
            label: `${Math.round(similarity * 100)}% similar`,
            labelStyle: { fontSize: 12, color: theme.text },
          });
        }
      });
    });
    return edges;
  }, [patterns, theme]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when patterns change
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    onPatternSelect(node.data.pattern);
  }, [onPatternSelect]);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);
  }, []);

  const onFitView = useCallback(() => {
    reactFlowInstance?.fitView({ padding: 0.2 });
  }, [reactFlowInstance]);

  const filteredPatterns = useMemo(() => {
    if (!patterns) return [];
    
    return patterns.filter(pattern => {
      const matchesSearch = pattern.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           pattern.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || pattern.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [patterns, searchTerm, selectedCategory]);

  const categories = useMemo(() => {
    if (!patterns) return [];
    const cats = [...new Set(patterns.map(p => p.category))];
    return ['all', ...cats];
  }, [patterns]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const patternData = event.dataTransfer.getData('application/reactflow');

      if (patternData && reactFlowBounds && reactFlowInstance) {
        const pattern = JSON.parse(patternData);
        const position = reactFlowInstance.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        const newNode: Node = {
          id: `${pattern.id}-${Date.now()}`,
          type: 'custom',
          position,
          data: {
            label: pattern.name,
            description: pattern.description,
            category: pattern.category,
            tags: pattern.tags,
            metrics: pattern.metrics,
            icon: getCategoryIcon(pattern.category),
            pattern
          },
        };

        setNodes((nds) => nds.concat(newNode));
      }
    },
    [reactFlowInstance, setNodes]
  );

  const onDragStart = (event: React.DragEvent, pattern: ArchitecturePattern) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(pattern));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <Box sx={{ height: '800px', position: 'relative' }}>
      {/* Toolbar */}
      <Paper
        elevation={2}
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 1000,
          p: 1,
          display: 'flex',
          gap: 1,
          alignItems: 'center'
        }}
      >
        <Tooltip title="Pattern Library">
          <IconButton onClick={() => setIsDrawerOpen(true)}>
            <Badge badgeContent={filteredPatterns.length} color="primary">
              <Architecture />
            </Badge>
          </IconButton>
        </Tooltip>
        
        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        
        <Tooltip title="Fit View">
          <IconButton onClick={onFitView}>
            <CenterFocusStrong />
          </IconButton>
        </Tooltip>
        
        <Tooltip title={showGrid ? 'Hide Grid' : 'Show Grid'}>
          <IconButton onClick={() => setShowGrid(!showGrid)}>
            {showGrid ? <GridOff /> : <GridOn />}
          </IconButton>
        </Tooltip>
        
        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        
        <Tooltip title="Save Layout">
          <IconButton>
            <Save />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Undo">
          <IconButton>
            <Undo />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Redo">
          <IconButton>
            <Redo />
          </IconButton>
        </Tooltip>
      </Paper>

      {/* ReactFlow Canvas */}
      <ReactFlowProvider>
        <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={onInit}
            onNodeClick={onNodeClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            style={{ background: theme.background }}
          >
            <Controls position="bottom-right" />
            <MiniMap
              nodeColor={(node) => {
                switch (node.data.category) {
                  case 'microservices': return '#1976d2';
                  case 'serverless': return '#2e7d32';
                  case 'event-driven': return '#ed6c02';
                  case 'monolithic': return '#9c27b0';
                  default: return '#757575';
                }
              }}
              nodeStrokeWidth={3}
              position="bottom-left"
            />
            {showGrid && (
              <Background
                variant="dots"
                gap={20}
                size={1}
                color={theme.border}
              />
            )}
            
            {/* Custom Panel for Node Info */}
            {selectedNode && (
              <Panel position="top-right">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Card sx={{ width: 300, maxHeight: 400, overflow: 'auto' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {selectedNode.data.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {selectedNode.data.description}
                      </Typography>
                      
                      {selectedNode.data.pattern.benefits && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Benefits:
                          </Typography>
                          {selectedNode.data.pattern.benefits.slice(0, 3).map((benefit: string, index: number) => (
                            <Chip
                              key={index}
                              label={benefit}
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))}
                        </Box>
                      )}
                      
                      {selectedNode.data.metrics && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            Metrics:
                          </Typography>
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                            <Chip
                              label={`Performance: ${selectedNode.data.metrics.performance}%`}
                              size="small"
                              color="primary"
                            />
                            <Chip
                              label={`Security: ${selectedNode.data.metrics.security}%`}
                              size="small"
                              color="error"
                            />
                            <Chip
                              label={`Scalability: ${selectedNode.data.metrics.scalability}%`}
                              size="small"
                              color="secondary"
                            />
                            <Chip
                              label={`Maintainability: ${selectedNode.data.metrics.maintainability}%`}
                              size="small"
                              color="info"
                            />
                          </Box>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </Panel>
            )}
          </ReactFlow>
        </div>
      </ReactFlowProvider>

      {/* Pattern Library Drawer */}
      <Drawer
        anchor="left"
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        PaperProps={{ sx: { width: 360 } }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Pattern Library
          </Typography>
          
          <TextField
            fullWidth
            size="small"
            placeholder="Search patterns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          
          <ButtonGroup fullWidth size="small" sx={{ mb: 2 }}>
            {categories.slice(0, 4).map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'contained' : 'outlined'}
                onClick={() => setSelectedCategory(category)}
                size="small"
              >
                {category === 'all' ? 'All' : category}
              </Button>
            ))}
          </ButtonGroup>
        </Box>
        
        <List>
          {filteredPatterns.map((pattern) => (
            <ListItem
              key={pattern.id}
              draggable
              onDragStart={(e) => onDragStart(e, pattern)}
              sx={{
                cursor: 'grab',
                '&:hover': { backgroundColor: 'action.hover' },
                '&:active': { cursor: 'grabbing' }
              }}
            >
              <ListItemIcon>
                {getCategoryIcon(pattern.category)}
              </ListItemIcon>
              <ListItemText
                primary={pattern.name}
                secondary={pattern.description}
                secondaryTypographyProps={{
                  sx: {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }
                }}
              />
            </ListItem>
          ))}
        </List>
      </Drawer>
    </Box>
  );
};

// Helper functions
function getCategoryIcon(category: string) {
  switch (category) {
    case 'microservices':
      return <Architecture color="primary" />;
    case 'serverless':
      return <Cloud color="primary" />;
    case 'event-driven':
      return <Speed color="primary" />;
    case 'data':
      return <Storage color="primary" />;
    case 'security':
      return <Security color="primary" />;
    default:
      return <Architecture color="primary" />;
  }
}

function calculateSimilarity(pattern1: ArchitecturePattern, pattern2: ArchitecturePattern): number {
  // Simple similarity calculation based on shared tags and category
  const sharedTags = pattern1.tags.filter(tag => pattern2.tags.includes(tag)).length;
  const totalTags = new Set([...pattern1.tags, ...pattern2.tags]).size;
  const tagSimilarity = totalTags > 0 ? sharedTags / totalTags : 0;
  
  const categorySimilarity = pattern1.category === pattern2.category ? 0.3 : 0;
  
  return Math.min(tagSimilarity + categorySimilarity, 1);
}

export default ArchitectureCanvas;