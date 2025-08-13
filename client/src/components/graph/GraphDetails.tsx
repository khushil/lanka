import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  IconButton,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Badge,
  Alert,
} from '@mui/material';
import {
  Info,
  Edit,
  Save,
  Cancel,
  Delete,
  Link as LinkIcon,
  ExpandMore,
  Visibility,
  Share,
  History,
  Tag,
  Person,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { GraphNode, GraphLink } from '../../types/graph';
import { getNodeColor, getLinkColor } from '../../utils/graphUtils';

interface GraphDetailsProps {
  selectedNode?: GraphNode | null;
  selectedLink?: GraphLink | null;
  connectedNodes?: GraphNode[];
  connectedLinks?: GraphLink[];
  onNodeUpdate?: (nodeId: string, updates: Partial<GraphNode>) => void;
  onLinkUpdate?: (linkId: string, updates: Partial<GraphLink>) => void;
  onNodeDelete?: (nodeId: string) => void;
  onLinkDelete?: (linkId: string) => void;
  onNavigateToNode?: (nodeId: string) => void;
  className?: string;
  readOnly?: boolean;
}

interface EditState {
  isEditing: boolean;
  editedData: Record<string, any>;
  errors: Record<string, string>;
}

export const GraphDetails: React.FC<GraphDetailsProps> = ({
  selectedNode,
  selectedLink,
  connectedNodes = [],
  connectedLinks = [],
  onNodeUpdate,
  onLinkUpdate,
  onNodeDelete,
  onLinkDelete,
  onNavigateToNode,
  className,
  readOnly = false,
}) => {
  const [editState, setEditState] = useState<EditState>({
    isEditing: false,
    editedData: {},
    errors: {},
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    properties: true,
    connections: true,
    metadata: false,
  });

  // Reset edit state when selection changes
  useEffect(() => {
    setEditState({
      isEditing: false,
      editedData: {},
      errors: {},
    });
  }, [selectedNode, selectedLink]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const startEditing = () => {
    const initialData = selectedNode ? {
      name: selectedNode.name,
      type: selectedNode.type,
      properties: { ...selectedNode.properties },
    } : selectedLink ? {
      type: selectedLink.type,
      properties: { ...selectedLink.properties },
    } : {};

    setEditState({
      isEditing: true,
      editedData: initialData,
      errors: {},
    });
  };

  const cancelEditing = () => {
    setEditState({
      isEditing: false,
      editedData: {},
      errors: {},
    });
  };

  const validateData = (): boolean => {
    const errors: Record<string, string> = {};

    if (selectedNode) {
      if (!editState.editedData.name?.trim()) {
        errors.name = 'Name is required';
      }
      if (!editState.editedData.type?.trim()) {
        errors.type = 'Type is required';
      }
    } else if (selectedLink) {
      if (!editState.editedData.type?.trim()) {
        errors.type = 'Type is required';
      }
    }

    setEditState(prev => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  };

  const saveChanges = () => {
    if (!validateData()) return;

    if (selectedNode && onNodeUpdate) {
      onNodeUpdate(selectedNode.id, editState.editedData);
    } else if (selectedLink && onLinkUpdate) {
      onLinkUpdate(selectedLink.id, editState.editedData);
    }

    setEditState({
      isEditing: false,
      editedData: {},
      errors: {},
    });
  };

  const handleDelete = () => {
    if (selectedNode && onNodeDelete) {
      onNodeDelete(selectedNode.id);
    } else if (selectedLink && onLinkDelete) {
      onLinkDelete(selectedLink.id);
    }
    setShowDeleteDialog(false);
  };

  const updateEditedData = (field: string, value: any) => {
    setEditState(prev => ({
      ...prev,
      editedData: {
        ...prev.editedData,
        [field]: value,
      },
      errors: {
        ...prev.errors,
        [field]: '',
      },
    }));
  };

  const updateProperty = (key: string, value: any) => {
    setEditState(prev => ({
      ...prev,
      editedData: {
        ...prev.editedData,
        properties: {
          ...prev.editedData.properties,
          [key]: value,
        },
      },
    }));
  };

  const removeProperty = (key: string) => {
    setEditState(prev => {
      const newProperties = { ...prev.editedData.properties };
      delete newProperties[key];
      return {
        ...prev,
        editedData: {
          ...prev.editedData,
          properties: newProperties,
        },
      };
    });
  };

  const addProperty = () => {
    const key = prompt('Property name:');
    if (key && key.trim()) {
      updateProperty(key.trim(), '');
    }
  };

  if (!selectedNode && !selectedLink) {
    return (
      <Paper className={className} sx={{ p: 2, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
          <Info sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="body1">
            Select a node or link to view details
          </Typography>
        </Box>
      </Paper>
    );
  }

  const isNode = !!selectedNode;
  const entity = selectedNode || selectedLink;
  const entityType = isNode ? 'Node' : 'Link';

  return (
    <Paper className={className} sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isNode ? (
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: getNodeColor(selectedNode.type),
              }}
            />
          ) : (
            <LinkIcon sx={{ color: getLinkColor(selectedLink!.type) }} />
          )}
          {entityType} Details
        </Typography>

        {!readOnly && (
          <Box>
            {editState.isEditing ? (
              <>
                <IconButton size="small" onClick={saveChanges} color="primary">
                  <Save />
                </IconButton>
                <IconButton size="small" onClick={cancelEditing}>
                  <Cancel />
                </IconButton>
              </>
            ) : (
              <>
                <IconButton size="small" onClick={startEditing}>
                  <Edit />
                </IconButton>
                <IconButton size="small" onClick={() => setShowDeleteDialog(true)} color="error">
                  <Delete />
                </IconButton>
              </>
            )}
          </Box>
        )}
      </Box>

      {/* Basic Information */}
      <Accordion expanded={expandedSections.basic} onChange={() => toggleSection('basic')}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle2">Basic Information</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {isNode && (
              <TextField
                label="Name"
                value={editState.isEditing ? editState.editedData.name || '' : selectedNode.name}
                onChange={(e) => updateEditedData('name', e.target.value)}
                disabled={!editState.isEditing}
                error={!!editState.errors.name}
                helperText={editState.errors.name}
                size="small"
                fullWidth
              />
            )}

            <TextField
              label="Type"
              value={editState.isEditing ? editState.editedData.type || '' : entity?.type}
              onChange={(e) => updateEditedData('type', e.target.value)}
              disabled={!editState.isEditing}
              error={!!editState.errors.type}
              helperText={editState.errors.type}
              size="small"
              fullWidth
            />

            <Box>
              <Typography variant="caption" color="textSecondary">
                ID: {entity?.id}
              </Typography>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Properties */}
      <Accordion expanded={expandedSections.properties} onChange={() => toggleSection('properties')}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle2">
            Properties
            <Badge 
              badgeContent={Object.keys(entity?.properties || {}).length} 
              color="primary" 
              sx={{ ml: 1 }} 
            />
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            {Object.entries(editState.isEditing ? editState.editedData.properties || {} : entity?.properties || {}).length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                No properties
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Key</TableCell>
                      <TableCell>Value</TableCell>
                      {editState.isEditing && <TableCell width={48}></TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(editState.isEditing ? editState.editedData.properties || {} : entity?.properties || {}).map(([key, value]) => (
                      <TableRow key={key}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {key}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {editState.isEditing ? (
                            <TextField
                              value={value}
                              onChange={(e) => updateProperty(key, e.target.value)}
                              size="small"
                              fullWidth
                              multiline={typeof value === 'string' && value.length > 50}
                            />
                          ) : (
                            <Typography variant="body2">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </Typography>
                          )}
                        </TableCell>
                        {editState.isEditing && (
                          <TableCell>
                            <IconButton size="small" onClick={() => removeProperty(key)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {editState.isEditing && (
              <Button
                size="small"
                onClick={addProperty}
                sx={{ mt: 1 }}
                startIcon={<Tag />}
              >
                Add Property
              </Button>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Connections (only for nodes) */}
      {isNode && (
        <Accordion expanded={expandedSections.connections} onChange={() => toggleSection('connections')}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle2">
              Connections
              <Badge 
                badgeContent={connectedNodes.length} 
                color="primary" 
                sx={{ ml: 1 }} 
              />
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              {connectedNodes.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                  No connections
                </Typography>
              ) : (
                <List dense>
                  {connectedNodes.map(node => {
                    const connection = connectedLinks.find(link =>
                      (typeof link.source === 'string' ? link.source : link.source.id) === node.id ||
                      (typeof link.target === 'string' ? link.target : link.target.id) === node.id
                    );
                    
                    return (
                      <ListItem key={node.id} disablePadding>
                        <ListItemButton onClick={() => onNavigateToNode?.(node.id)}>
                          <ListItemIcon>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: getNodeColor(node.type),
                              }}
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={node.name}
                            secondary={
                              <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <span>{node.type}</span>
                                {connection && (
                                  <Chip
                                    size="small"
                                    label={connection.type}
                                    sx={{
                                      backgroundColor: getLinkColor(connection.type),
                                      color: 'white',
                                      fontSize: '0.65rem',
                                      height: 16,
                                    }}
                                  />
                                )}
                              </Box>
                            }
                            primaryTypographyProps={{ fontSize: '0.875rem' }}
                            secondaryTypographyProps={{ fontSize: '0.75rem' }}
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Metadata */}
      <Accordion expanded={expandedSections.metadata} onChange={() => toggleSection('metadata')}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle2">Metadata</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: '0.875rem' }}>
            {entity && 'createdAt' in entity && entity.createdAt && (
              <Box>
                <strong>Created:</strong> {format(new Date(entity.createdAt), 'PPp')}
              </Box>
            )}
            {entity && 'updatedAt' in entity && entity.updatedAt && (
              <Box>
                <strong>Updated:</strong> {format(new Date(entity.updatedAt), 'PPp')}
              </Box>
            )}
            {entity && 'version' in entity && entity.version && (
              <Box>
                <strong>Version:</strong> {entity.version}
              </Box>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Actions */}
      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Share />}
          onClick={() => {
            const url = `${window.location.origin}${window.location.pathname}?${isNode ? 'node' : 'link'}=${entity?.id}`;
            navigator.clipboard.writeText(url);
          }}
        >
          Share
        </Button>
        
        <Button
          size="small"
          variant="outlined"
          startIcon={<History />}
          onClick={() => setShowHistory(true)}
        >
          History
        </Button>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Delete {entityType}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone.
          </Alert>
          <Typography>
            Are you sure you want to delete this {entityType.toLowerCase()}?
            {isNode && connectedNodes.length > 0 && (
              <Box sx={{ mt: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
                This will also remove {connectedNodes.length} connection(s).
              </Box>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default GraphDetails;