import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Button,
  ButtonGroup,
  Chip,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Download,
  Image,
  DataObject,
  Settings,
  Refresh,
  FilterList,
  Timeline,
} from '@mui/icons-material';
import { GraphLayoutConfig, GraphFilters, GraphStatistics } from '../../types/graph';
import { exportGraphAsJSON, exportGraphAsCSV } from '../../utils/graphUtils';
import html2canvas from 'html2canvas';

interface GraphControlsProps {
  layoutConfig: GraphLayoutConfig;
  onLayoutChange: (config: GraphLayoutConfig) => void;
  filters: GraphFilters;
  onFiltersChange: (filters: GraphFilters) => void;
  statistics?: GraphStatistics;
  onReset: () => void;
  onRefresh: () => void;
  graphData: any;
  className?: string;
}

export const GraphControls: React.FC<GraphControlsProps> = ({
  layoutConfig,
  onLayoutChange,
  filters,
  onFiltersChange,
  statistics,
  onReset,
  onRefresh,
  graphData,
  className,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const nodeTypes = ['requirement', 'architecture', 'code', 'test', 'deployment'];
  const linkTypes = ['dependency', 'relationship', 'dataflow', 'implements', 'tests', 'deploys'];

  const handleLayoutTypeChange = (type: GraphLayoutConfig['type']) => {
    onLayoutChange({ ...layoutConfig, type });
  };

  const handleLayoutParamChange = (param: keyof Omit<GraphLayoutConfig, 'type'>, value: number) => {
    onLayoutChange({ ...layoutConfig, [param]: value });
  };

  const handleNodeTypeToggle = (nodeType: string) => {
    const newTypes = filters.nodeTypes.includes(nodeType)
      ? filters.nodeTypes.filter(t => t !== nodeType)
      : [...filters.nodeTypes, nodeType];
    onFiltersChange({ ...filters, nodeTypes: newTypes });
  };

  const handleLinkTypeToggle = (linkType: string) => {
    const newTypes = filters.linkTypes.includes(linkType)
      ? filters.linkTypes.filter(t => t !== linkType)
      : [...filters.linkTypes, linkType];
    onFiltersChange({ ...filters, linkTypes: newTypes });
  };

  const exportAsImage = async () => {
    const graphElement = document.querySelector('.graph-visualization') as HTMLElement;
    if (graphElement) {
      try {
        const canvas = await html2canvas(graphElement, {
          backgroundColor: '#1a1a1a',
          width: graphElement.offsetWidth,
          height: graphElement.offsetHeight,
        });
        
        const link = document.createElement('a');
        link.download = 'lanka-graph.png';
        link.href = canvas.toDataURL();
        link.click();
      } catch (error) {
        console.error('Failed to export image:', error);
      }
    }
  };

  const exportAsJSON = () => {
    const json = exportGraphAsJSON(graphData);
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = 'lanka-graph.json';
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  const exportAsCSV = () => {
    const { nodes, links } = exportGraphAsCSV(graphData);
    
    // Export nodes
    const nodesBlob = new Blob([nodes], { type: 'text/csv' });
    const nodesLink = document.createElement('a');
    nodesLink.download = 'lanka-graph-nodes.csv';
    nodesLink.href = URL.createObjectURL(nodesBlob);
    nodesLink.click();
    
    // Export links
    const linksBlob = new Blob([links], { type: 'text/csv' });
    const linksLink = document.createElement('a');
    linksLink.download = 'lanka-graph-links.csv';
    linksLink.href = URL.createObjectURL(linksBlob);
    linksLink.click();
  };

  const clearAllFilters = () => {
    onFiltersChange({
      nodeTypes: [],
      linkTypes: [],
      searchQuery: '',
      properties: {},
    });
  };

  return (
    <Paper className={className} sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Settings />
        Graph Controls
      </Typography>

      {/* Layout Controls */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>Layout</Typography>
        <ButtonGroup fullWidth size="small" sx={{ mb: 2 }}>
          <Button
            variant={layoutConfig.type === 'force' ? 'contained' : 'outlined'}
            onClick={() => handleLayoutTypeChange('force')}
          >
            Force
          </Button>
          <Button
            variant={layoutConfig.type === 'hierarchical' ? 'contained' : 'outlined'}
            onClick={() => handleLayoutTypeChange('hierarchical')}
          >
            Tree
          </Button>
          <Button
            variant={layoutConfig.type === 'circular' ? 'contained' : 'outlined'}
            onClick={() => handleLayoutTypeChange('circular')}
          >
            Circular
          </Button>
        </ButtonGroup>

        <Box sx={{ mb: 2 }}>
          <Typography variant="caption">Force Strength</Typography>
          <Slider
            size="small"
            value={layoutConfig.strength || 1}
            min={0.1}
            max={3}
            step={0.1}
            onChange={(_, value) => handleLayoutParamChange('strength', value as number)}
            valueLabelDisplay="auto"
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="caption">Link Distance</Typography>
          <Slider
            size="small"
            value={layoutConfig.distance || 100}
            min={20}
            max={300}
            step={10}
            onChange={(_, value) => handleLayoutParamChange('distance', value as number)}
            valueLabelDisplay="auto"
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="caption">Repulsion</Typography>
          <Slider
            size="small"
            value={Math.abs(layoutConfig.repulsion || 300)}
            min={50}
            max={1000}
            step={50}
            onChange={(_, value) => handleLayoutParamChange('repulsion', -(value as number))}
            valueLabelDisplay="auto"
          />
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Filters */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2">
            <FilterList fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
            Filters
          </Typography>
          <Button size="small" onClick={clearAllFilters} color="secondary">
            Clear All
          </Button>
        </Box>

        <Typography variant="caption" gutterBottom>Node Types</Typography>
        <Box sx={{ mb: 2 }}>
          {nodeTypes.map(type => (
            <Chip
              key={type}
              label={type}
              size="small"
              variant={filters.nodeTypes.includes(type) ? 'filled' : 'outlined'}
              onClick={() => handleNodeTypeToggle(type)}
              sx={{ mr: 0.5, mb: 0.5 }}
            />
          ))}
        </Box>

        <Typography variant="caption" gutterBottom>Link Types</Typography>
        <Box sx={{ mb: 2 }}>
          {linkTypes.map(type => (
            <Chip
              key={type}
              label={type}
              size="small"
              variant={filters.linkTypes.includes(type) ? 'filled' : 'outlined'}
              onClick={() => handleLinkTypeToggle(type)}
              sx={{ mr: 0.5, mb: 0.5 }}
            />
          ))}
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Statistics */}
      {statistics && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            <Timeline fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
            Statistics
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, fontSize: '0.875rem' }}>
            <Box>Nodes: {statistics.totalNodes}</Box>
            <Box>Links: {statistics.totalLinks}</Box>
            <Box>Avg Connections: {statistics.avgConnections.toFixed(1)}</Box>
            <Box>Max Depth: {statistics.maxDepth}</Box>
          </Box>
          
          <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>Node Types</Typography>
          <Box sx={{ fontSize: '0.75rem' }}>
            {Object.entries(statistics.nodeTypeCount).map(([type, count]) => (
              <Box key={type} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{type}:</span>
                <span>{count}</span>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <Divider sx={{ mb: 2 }} />

      {/* Actions */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Actions</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={onRefresh}
            size="small"
          >
            Refresh Data
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => setShowExportDialog(true)}
            size="small"
          >
            Export Graph
          </Button>
          
          <Button
            variant="outlined"
            onClick={onReset}
            size="small"
            color="secondary"
          >
            Reset View
          </Button>
        </Box>
      </Box>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onClose={() => setShowExportDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Export Graph</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Image />}
              onClick={() => {
                exportAsImage();
                setShowExportDialog(false);
              }}
            >
              Export as PNG
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<DataObject />}
              onClick={() => {
                exportAsJSON();
                setShowExportDialog(false);
              }}
            >
              Export as JSON
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => {
                exportAsCSV();
                setShowExportDialog(false);
              }}
            >
              Export as CSV
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExportDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default GraphControls;