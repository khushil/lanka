import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  Grid,
  ButtonGroup
} from '@mui/material';
import {
  AccountTree,
  CheckCircle,
  RadioButtonUnchecked,
  AccessTime,
  Person,
  Assignment,
  TrendingUp,
  Warning,
  Info,
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  FilterList,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  ReactFlowInstance,
  Position,
  MarkerType,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { VisualizationTheme } from '../../types/visualizations';

// Mock type definitions
type DecisionStatus = 'DRAFT' | 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface ArchitectureDecision {
  id: string;
  title: string;
  status: DecisionStatus;
  priority: Priority;
  context: string;
  decision: string;
  consequences: string;
  alternatives: any[];
  stakeholders: any[];
  createdAt: string;
}

interface DecisionFlowDiagramProps {
  decisions: ArchitectureDecision[];
  theme: VisualizationTheme;
  viewMode: 'overview' | 'detailed';
  onDecisionSelect: (decision: ArchitectureDecision) => void;
}

// Custom Decision Node Component
const DecisionNode = ({ data }: { data: any }) => {
  const getStatusColor = (status: DecisionStatus) => {
    switch (status) {
      case 'APPROVED': return '#4caf50';
      case 'PROPOSED': return '#2196f3';
      case 'REJECTED': return '#f44336';
      case 'SUPERSEDED': return '#9e9e9e';
      default: return '#757575';
    }
  };

  const getPriorityIcon = (priority: Priority) => {
    switch (priority) {
      case 'CRITICAL': return <Warning color="error" />;
      case 'HIGH': return <TrendingUp color="warning" />;
      case 'MEDIUM': return <Info color="info" />;
      case 'LOW': return <RadioButtonUnchecked color="action" />;
      default: return <Info />;
    }
  };

  return (
    <Card 
      sx={{ 
        minWidth: 200, 
        maxWidth: 250,
        border: `2px solid ${getStatusColor(data.decision.status)}`,
        cursor: 'pointer',
        '&:hover': {
          transform: 'scale(1.02)',
          boxShadow: 3
        },
        transition: 'all 0.2s ease-in-out'
      }}
      onClick={() => data.onSelect(data.decision)}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ flex: 1 }}>
            {data.decision.title}
          </Typography>
          {getPriorityIcon(data.decision.priority)}
        </Box>
        
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            mb: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {data.decision.context}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
          <Chip
            label={data.decision.status.replace('_', ' ')}
            size="small"
            sx={{ 
              backgroundColor: getStatusColor(data.decision.status),
              color: 'white',
              fontSize: '0.7rem'
            }}
          />
          {data.decision.tags?.slice(0, 2).map((tag: string, index: number) => (
            <Chip
              key={index}
              label={tag}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          ))}
        </Box>
        
        {data.decision.impact && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
            <Typography variant="caption">Technical: {data.decision.impact.technical}/5</Typography>
            <Typography variant="caption">Business: {data.decision.impact.business}/5</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Alternative Option Node
const AlternativeNode = ({ data }: { data: any }) => {
  return (
    <Card sx={{ minWidth: 180, maxWidth: 200, opacity: 0.8 }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="body2" fontWeight="medium" gutterBottom>
          {data.label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {data.description}
        </Typography>
        {data.impact && (
          <Chip
            label={`Impact: ${data.impact}`}
            size="small"
            variant="outlined"
            sx={{ mt: 0.5, fontSize: '0.6rem' }}
          />
        )}
      </CardContent>
    </Card>
  );
};

const nodeTypes = {
  decision: DecisionNode,
  alternative: AlternativeNode,
};

const DecisionFlowDiagram: React.FC<DecisionFlowDiagramProps> = ({
  decisions,
  theme,
  viewMode,
  onDecisionSelect
}) => {
  const [selectedDecision, setSelectedDecision] = useState<ArchitectureDecision | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [flowLayout, setFlowLayout] = useState<'horizontal' | 'vertical'>('horizontal');
  const [showAlternatives, setShowAlternatives] = useState(true);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // Generate nodes and edges from decisions
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!decisions) return { nodes: [], edges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    let yOffset = 0;
    let xOffset = 0;
    
    decisions.forEach((decision, index) => {
      // Main decision node
      const decisionNode: Node = {
        id: decision.id,
        type: 'decision',
        position: {
          x: flowLayout === 'horizontal' ? index * 350 : xOffset,
          y: flowLayout === 'horizontal' ? yOffset : index * 250
        },
        data: {
          decision,
          onSelect: (selectedDecision: ArchitectureDecision) => {
            setSelectedDecision(selectedDecision);
            setDialogOpen(true);
            onDecisionSelect(selectedDecision);
          }
        },
        sourcePosition: flowLayout === 'horizontal' ? Position.Right : Position.Bottom,
        targetPosition: flowLayout === 'horizontal' ? Position.Left : Position.Top,
      };
      
      nodes.push(decisionNode);

      // Add alternative nodes if enabled
      if (showAlternatives && decision.alternatives) {
        decision.alternatives.forEach((alt, altIndex) => {
          const altNode: Node = {
            id: `${decision.id}-alt-${altIndex}`,
            type: 'alternative',
            position: {
              x: flowLayout === 'horizontal' ? index * 350 + 50 : xOffset + (altIndex + 1) * 200,
              y: flowLayout === 'horizontal' ? yOffset + (altIndex + 1) * 120 : index * 250 + 150
            },
            data: {
              label: alt.option,
              description: alt.pros.slice(0, 2).join(', '),
              impact: alt.impact
            },
          };
          
          nodes.push(altNode);
          
          // Connect alternative to main decision
          edges.push({
            id: `${decision.id}-to-alt-${altIndex}`,
            source: decision.id,
            target: `${decision.id}-alt-${altIndex}`,
            type: 'smoothstep',
            style: {
              stroke: theme.accent,
              strokeWidth: 1,
              strokeDasharray: '5,5',
            },
            label: 'Alternative',
            labelStyle: { fontSize: 10, color: theme.textSecondary },
          });
        });
      }

      // Connect to next decision if sequential relationship exists
      if (index < decisions.length - 1) {
        const nextDecision = decisions[index + 1];
        // Simple heuristic: connect if they share tags or are chronologically related
        const hasRelation = decision.tags?.some(tag => nextDecision.tags?.includes(tag)) ||
                           new Date(decision.createdAt) < new Date(nextDecision.createdAt);
        
        if (hasRelation) {
          edges.push({
            id: `${decision.id}-to-${nextDecision.id}`,
            source: decision.id,
            target: nextDecision.id,
            type: 'smoothstep',
            style: {
              stroke: theme.primary,
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: theme.primary,
            },
            label: 'Influences',
            labelStyle: { fontSize: 12, color: theme.text },
          });
        }
      }
    });

    return { nodes, edges };
  }, [decisions, theme, flowLayout, showAlternatives, onDecisionSelect]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when initial data changes
  React.useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  React.useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);
  }, []);

  const onFitView = useCallback(() => {
    reactFlowInstance?.fitView({ padding: 0.2 });
  }, [reactFlowInstance]);

  const handleLayoutChange = useCallback((layout: 'horizontal' | 'vertical') => {
    setFlowLayout(layout);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setSelectedDecision(null);
  }, []);

  const getStatusIcon = (status: DecisionStatus) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle color="success" />;
      case 'PROPOSED':
        return <Assignment color="info" />;
      case 'REJECTED':
        return <RadioButtonUnchecked color="error" />;
      case 'SUPERSEDED':
        return <RadioButtonUnchecked color="disabled" />;
      default:
        return <RadioButtonUnchecked />;
    }
  };

  return (
    <Box sx={{ height: '800px', position: 'relative' }}>
      {/* Controls */}
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
        <ButtonGroup size="small">
          <Button
            variant={flowLayout === 'horizontal' ? 'contained' : 'outlined'}
            onClick={() => handleLayoutChange('horizontal')}
          >
            Horizontal
          </Button>
          <Button
            variant={flowLayout === 'vertical' ? 'contained' : 'outlined'}
            onClick={() => handleLayoutChange('vertical')}
          >
            Vertical
          </Button>
        </ButtonGroup>
        
        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        
        <Button
          size="small"
          variant={showAlternatives ? 'contained' : 'outlined'}
          onClick={() => setShowAlternatives(!showAlternatives)}
        >
          Alternatives
        </Button>
        
        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        
        <Tooltip title="Fit View">
          <IconButton size="small" onClick={onFitView}>
            <CenterFocusStrong />
          </IconButton>
        </Tooltip>
      </Paper>

      {/* Decision Flow */}
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onInit={onInit}
          nodeTypes={nodeTypes}
          fitView
          style={{ background: theme.background }}
        >
          <Controls position="bottom-right" />
          <Background
            variant="dots"
            gap={20}
            size={1}
            color={theme.border}
          />
          
          {/* Legend Panel */}
          <Panel position="top-right">
            <Card sx={{ width: 200 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2" gutterBottom>
                  Decision Status
                </Typography>
                <List dense>
                  <ListItem sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      <CheckCircle color="success" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Approved" 
                      primaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                  <ListItem sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      <AccessTime color="warning" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Under Review" 
                      primaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                  <ListItem sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      <Assignment color="info" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Proposed" 
                      primaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Panel>
        </ReactFlow>
      </ReactFlowProvider>

      {/* Decision Detail Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {selectedDecision && getStatusIcon(selectedDecision.status)}
            {selectedDecision?.title}
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {selectedDecision && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Context
                </Typography>
                <Typography variant="body2" paragraph>
                  {selectedDecision.context}
                </Typography>
                
                <Typography variant="h6" gutterBottom>
                  Decision
                </Typography>
                <Typography variant="body2" paragraph>
                  {selectedDecision.decision}
                </Typography>
                
                <Typography variant="h6" gutterBottom>
                  Consequences
                </Typography>
                <Typography variant="body2">
                  {selectedDecision.consequences}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                {selectedDecision.alternatives && selectedDecision.alternatives.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Alternatives Considered
                    </Typography>
                    {selectedDecision.alternatives.map((alt, index) => (
                      <Card key={index} sx={{ mb: 2 }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            {alt.option}
                          </Typography>
                          <Typography variant="caption" color="success.main" display="block">
                            Pros: {alt.pros.join(', ')}
                          </Typography>
                          <Typography variant="caption" color="error.main" display="block">
                            Cons: {alt.cons.join(', ')}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
                
                {selectedDecision.stakeholders && selectedDecision.stakeholders.length > 0 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Stakeholders
                    </Typography>
                    <List dense>
                      {selectedDecision.stakeholders.map((stakeholder, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <Person fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={`${stakeholder.name} (${stakeholder.role})`}
                            secondary={stakeholder.approval ? 'Approved' : 'Pending'}
                          />
                          {stakeholder.approval && (
                            <CheckCircle color="success" fontSize="small" />
                          )}
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DecisionFlowDiagram;