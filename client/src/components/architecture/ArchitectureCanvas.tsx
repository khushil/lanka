import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Toolbar,
  IconButton,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  Divider,
  Menu,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  Tooltip,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Settings as SettingsIcon,
  Storage as DatabaseIcon,
  Cloud as ServiceIcon,
  Queue as QueueIcon,
  Security as SecurityIcon,
  Api as ApiIcon,
  Web as WebIcon,
  ExpandMore as ExpandMoreIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ContentCopy as CopyIcon,
  Undo as UndoIcon,
  Redo as RedoIcon
} from '@mui/icons-material';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlowProvider,
  ReactFlowInstance,
  useReactFlow,
  NodeTypes,
  EdgeTypes
} from 'reactflow';
import 'reactflow/dist/style.css';

// Custom Node Components
const ServiceNode = ({ data, selected }: { data: any; selected: boolean }) => (
  <Box
    sx={{
      padding: 2,
      border: selected ? '2px solid #1976d2' : '1px solid #ccc',
      borderRadius: 2,
      backgroundColor: '#fff',
      minWidth: 120,
      textAlign: 'center',
      boxShadow: selected ? 3 : 1,
      '&:hover': { boxShadow: 2 }
    }}
  >
    <ServiceIcon color="primary" sx={{ mb: 1 }} />
    <Typography variant="body2" fontWeight="bold">
      {data.label}
    </Typography>
    {data.description && (
      <Typography variant="caption" color="textSecondary">
        {data.description}
      </Typography>
    )}
  </Box>
);

const DatabaseNode = ({ data, selected }: { data: any; selected: boolean }) => (
  <Box
    sx={{
      padding: 2,
      border: selected ? '2px solid #1976d2' : '1px solid #ccc',
      borderRadius: 2,
      backgroundColor: '#fff',
      minWidth: 120,
      textAlign: 'center',
      boxShadow: selected ? 3 : 1,
      '&:hover': { boxShadow: 2 }
    }}
  >
    <DatabaseIcon color="secondary" sx={{ mb: 1 }} />
    <Typography variant="body2" fontWeight="bold">
      {data.label}
    </Typography>
    {data.type && (
      <Chip label={data.type} size="small" sx={{ mt: 0.5 }} />
    )}
  </Box>
);

const QueueNode = ({ data, selected }: { data: any; selected: boolean }) => (
  <Box
    sx={{
      padding: 2,
      border: selected ? '2px solid #1976d2' : '1px solid #ccc',
      borderRadius: 2,
      backgroundColor: '#fff',
      minWidth: 120,
      textAlign: 'center',
      boxShadow: selected ? 3 : 1,
      '&:hover': { boxShadow: 2 }
    }}
  >
    <QueueIcon color="warning" sx={{ mb: 1 }} />
    <Typography variant="body2" fontWeight="bold">
      {data.label}
    </Typography>
    {data.protocol && (
      <Chip label={data.protocol} size="small" sx={{ mt: 0.5 }} />
    )}
  </Box>
);

const nodeTypes: NodeTypes = {
  service: ServiceNode,
  database: DatabaseNode,
  queue: QueueNode,
};

interface ComponentTemplate {
  type: string;
  label: string;
  icon: React.ReactNode;
  defaultData: any;
}

const componentTemplates: ComponentTemplate[] = [
  {
    type: 'service',
    label: 'Service',
    icon: <ServiceIcon />,
    defaultData: { label: 'New Service', description: 'Microservice component' }
  },
  {
    type: 'database',
    label: 'Database',
    icon: <DatabaseIcon />,
    defaultData: { label: 'Database', type: 'PostgreSQL' }
  },
  {
    type: 'queue',
    label: 'Queue',
    icon: <QueueIcon />,
    defaultData: { label: 'Message Queue', protocol: 'AMQP' }
  },
  {
    type: 'service',
    label: 'API Gateway',
    icon: <ApiIcon />,
    defaultData: { label: 'API Gateway', description: 'Request routing and auth' }
  },
  {
    type: 'service',
    label: 'Load Balancer',
    icon: <WebIcon />,
    defaultData: { label: 'Load Balancer', description: 'Traffic distribution' }
  },
  {
    type: 'service',
    label: 'Security Service',
    icon: <SecurityIcon />,
    defaultData: { label: 'Security', description: 'Authentication & authorization' }
  }
];

interface ArchitectureCanvasProps {
  onSave?: (architecture: any) => void;
  onLoad?: () => any;
  initialArchitecture?: any;
}

const ArchitectureCanvasContent: React.FC<ArchitectureCanvasProps> = ({
  onSave,
  onLoad,
  initialArchitecture
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [nodeIdCounter, setNodeIdCounter] = useState(1);
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const reactFlow = useReactFlow();

  // Initialize with sample architecture if provided
  useEffect(() => {
    if (initialArchitecture) {
      setNodes(initialArchitecture.nodes || []);
      setEdges(initialArchitecture.edges || []);
    }
  }, [initialArchitecture, setNodes, setEdges]);

  // Save to history for undo/redo
  const saveToHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: [...nodes], edges: [...edges] });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [nodes, edges, history, historyIndex]);

  const onConnect = useCallback((params: Connection) => {
    const edge = addEdge(params, edges);
    setEdges(edge);
    saveToHistory();
  }, [edges, setEdges, saveToHistory]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setPropertiesOpen(true);
  }, []);

  const addComponent = useCallback((template: ComponentTemplate) => {
    const newNode: Node = {
      id: `node_${nodeIdCounter}`,
      type: template.type,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { ...template.defaultData },
    };
    
    setNodes((nds) => [...nds, newNode]);
    setNodeIdCounter((prev) => prev + 1);
    saveToHistory();
  }, [nodeIdCounter, setNodes, saveToHistory]);

  const updateNodeData = useCallback((nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
      )
    );
    saveToHistory();
  }, [setNodes, saveToHistory]);

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode) return;
    
    setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
    setEdges((eds) => eds.filter((edge) => 
      edge.source !== selectedNode.id && edge.target !== selectedNode.id
    ));
    setSelectedNode(null);
    setPropertiesOpen(false);
    saveToHistory();
  }, [selectedNode, setNodes, setEdges, saveToHistory]);

  const duplicateNode = useCallback(() => {
    if (!selectedNode) return;
    
    const newNode: Node = {
      ...selectedNode,
      id: `node_${nodeIdCounter}`,
      position: {
        x: selectedNode.position.x + 50,
        y: selectedNode.position.y + 50
      }
    };
    
    setNodes((nds) => [...nds, newNode]);
    setNodeIdCounter((prev) => prev + 1);
    saveToHistory();
  }, [selectedNode, nodeIdCounter, setNodes, saveToHistory]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex(historyIndex - 1);
    }
  }, [historyIndex, history, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex(historyIndex + 1);
    }
  }, [historyIndex, history, setNodes, setEdges]);

  const exportArchitecture = useCallback((format: string) => {
    const architecture = {
      nodes: nodes.map(node => ({
        ...node,
        position: { ...node.position }
      })),
      edges: edges.map(edge => ({ ...edge })),
      metadata: {
        version: '1.0',
        created: new Date().toISOString(),
        format
      }
    };

    switch (format) {
      case 'json':
        downloadFile(JSON.stringify(architecture, null, 2), 'architecture.json', 'application/json');
        break;
      case 'png':
        if (reactFlowInstance) {
          reactFlowInstance.toObject();
          // Implementation would require additional libraries for image generation
        }
        break;
      case 'svg':
        // SVG export implementation
        break;
      case 'terraform':
        // Generate Terraform configuration
        const terraformConfig = generateTerraformConfig(architecture);
        downloadFile(terraformConfig, 'main.tf', 'text/plain');
        break;
    }
    
    setExportMenuAnchor(null);
  }, [nodes, edges, reactFlowInstance]);

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateTerraformConfig = (architecture: any): string => {
    // Simplified Terraform generation
    let terraform = `# Generated Terraform Configuration\n\n`;
    
    architecture.nodes.forEach((node: Node) => {
      switch (node.type) {
        case 'service':
          terraform += `resource "aws_ecs_service" "${node.id}" {\n`;
          terraform += `  name = "${node.data.label}"\n`;
          terraform += `  # Additional configuration\n`;
          terraform += `}\n\n`;
          break;
        case 'database':
          terraform += `resource "aws_rds_instance" "${node.id}" {\n`;
          terraform += `  identifier = "${node.data.label}"\n`;
          terraform += `  engine = "${node.data.type?.toLowerCase() || 'postgres'}"\n`;
          terraform += `  # Additional configuration\n`;
          terraform += `}\n\n`;
          break;
      }
    });
    
    return terraform;
  };

  const handleSave = useCallback(() => {
    const architecture = {
      nodes,
      edges,
      metadata: {
        saved: new Date().toISOString(),
        nodeCount: nodes.length,
        edgeCount: edges.length
      }
    };
    
    if (onSave) {
      onSave(architecture);
    }
  }, [nodes, edges, onSave]);

  return (
    <Box sx={{ height: '100%', display: 'flex' }}>
      {/* Component Library Drawer */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={drawerOpen}
        sx={{
          width: drawerOpen ? 280 : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
            position: 'relative'
          }
        }}
      >
        <Toolbar>
          <Typography variant="h6">Components</Typography>
        </Toolbar>
        <Divider />
        <List>
          {componentTemplates.map((template, index) => (
            <ListItem
              key={index}
              button
              onClick={() => addComponent(template)}
              sx={{
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
            >
              <ListItemIcon>{template.icon}</ListItemIcon>
              <ListItemText primary={template.label} />
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main Canvas */}
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        <Paper
          elevation={0}
          sx={{
            height: '100%',
            borderRadius: 0
          }}
        >
          {/* Toolbar */}
          <Toolbar
            variant="dense"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              backgroundColor: 'background.paper'
            }}
          >
            <Button
              startIcon={<AddIcon />}
              onClick={() => setDrawerOpen(!drawerOpen)}
              size="small"
            >
              Components
            </Button>
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            
            <Tooltip title="Undo">
              <IconButton
                onClick={undo}
                disabled={historyIndex <= 0}
                size="small"
              >
                <UndoIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Redo">
              <IconButton
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                size="small"
              >
                <RedoIcon />
              </IconButton>
            </Tooltip>
            
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            
            <Button
              startIcon={<SaveIcon />}
              onClick={handleSave}
              size="small"
            >
              Save
            </Button>
            <Button
              startIcon={<DownloadIcon />}
              onClick={(e) => setExportMenuAnchor(e.currentTarget)}
              size="small"
            >
              Export
            </Button>
            
            <Box sx={{ flexGrow: 1 }} />
            
            {selectedNode && (
              <>
                <Tooltip title="Edit Properties">
                  <IconButton
                    onClick={() => setPropertiesOpen(true)}
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Duplicate">
                  <IconButton onClick={duplicateNode} size="small">
                    <CopyIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton
                    onClick={deleteSelectedNode}
                    size="small"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Toolbar>

          {/* ReactFlow Canvas */}
          <Box sx={{ height: 'calc(100% - 48px)' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onInit={setReactFlowInstance}
              nodeTypes={nodeTypes}
              fitView
              attributionPosition="bottom-left"
            >
              <Background variant={BackgroundVariant.Dots} />
              <Controls />
              <MiniMap
                nodeColor={(node) => {
                  switch (node.type) {
                    case 'service': return '#1976d2';
                    case 'database': return '#9c27b0';
                    case 'queue': return '#f57c00';
                    default: return '#666';
                  }
                }}
                position="top-right"
              />
            </ReactFlow>
          </Box>
        </Paper>
      </Box>

      {/* Export Menu */}
      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={() => setExportMenuAnchor(null)}
      >
        <MenuItem onClick={() => exportArchitecture('json')}>
          Export as JSON
        </MenuItem>
        <MenuItem onClick={() => exportArchitecture('png')}>
          Export as PNG
        </MenuItem>
        <MenuItem onClick={() => exportArchitecture('svg')}>
          Export as SVG
        </MenuItem>
        <MenuItem onClick={() => exportArchitecture('terraform')}>
          Generate Terraform
        </MenuItem>
      </Menu>

      {/* Node Properties Panel */}
      <Dialog
        open={propertiesOpen}
        onClose={() => setPropertiesOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Component Properties
          {selectedNode && (
            <Typography variant="subtitle2" color="textSecondary">
              {selectedNode.type} - {selectedNode.id}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedNode && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  value={selectedNode.data.label || ''}
                  onChange={(e) =>
                    updateNodeData(selectedNode.id, { label: e.target.value })
                  }
                />
              </Grid>
              
              {selectedNode.type === 'service' && (
                <>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Description"
                      multiline
                      rows={3}
                      value={selectedNode.data.description || ''}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, { description: e.target.value })
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Port"
                      type="number"
                      value={selectedNode.data.port || ''}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, { port: e.target.value })
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Protocol</InputLabel>
                      <Select
                        value={selectedNode.data.protocol || 'HTTP'}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, { protocol: e.target.value })
                        }
                      >
                        <MenuItem value="HTTP">HTTP</MenuItem>
                        <MenuItem value="HTTPS">HTTPS</MenuItem>
                        <MenuItem value="gRPC">gRPC</MenuItem>
                        <MenuItem value="TCP">TCP</MenuItem>
                        <MenuItem value="UDP">UDP</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </>
              )}
              
              {selectedNode.type === 'database' && (
                <>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={selectedNode.data.type || 'PostgreSQL'}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, { type: e.target.value })
                        }
                      >
                        <MenuItem value="PostgreSQL">PostgreSQL</MenuItem>
                        <MenuItem value="MySQL">MySQL</MenuItem>
                        <MenuItem value="MongoDB">MongoDB</MenuItem>
                        <MenuItem value="Redis">Redis</MenuItem>
                        <MenuItem value="Elasticsearch">Elasticsearch</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Version"
                      value={selectedNode.data.version || ''}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, { version: e.target.value })
                      }
                    />
                  </Grid>
                </>
              )}
              
              {selectedNode.type === 'queue' && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Protocol</InputLabel>
                    <Select
                      value={selectedNode.data.protocol || 'AMQP'}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, { protocol: e.target.value })
                      }
                    >
                      <MenuItem value="AMQP">AMQP</MenuItem>
                      <MenuItem value="MQTT">MQTT</MenuItem>
                      <MenuItem value="Kafka">Apache Kafka</MenuItem>
                      <MenuItem value="Redis">Redis Pub/Sub</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={selectedNode.data.highAvailability || false}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, { highAvailability: e.target.checked })
                      }
                    />
                  }
                  label="High Availability"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export const ArchitectureCanvas: React.FC<ArchitectureCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <ArchitectureCanvasContent {...props} />
    </ReactFlowProvider>
  );
};

export default ArchitectureCanvas;