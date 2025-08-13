import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Collapse,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Circle,
  Remove,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { NODE_COLORS, LINK_COLORS, NODE_SIZES } from '../../utils/graphUtils';

interface GraphLegendProps {
  visibleNodeTypes: string[];
  visibleLinkTypes: string[];
  onNodeTypeToggle: (type: string) => void;
  onLinkTypeToggle: (type: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  className?: string;
}

interface LegendItemProps {
  type: string;
  color: string;
  isVisible: boolean;
  count?: number;
  onToggle: (type: string) => void;
  icon?: React.ReactNode;
}

const LegendItem: React.FC<LegendItemProps> = ({
  type,
  color,
  isVisible,
  count,
  onToggle,
  icon,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 0.5,
        px: 1,
        borderRadius: 1,
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        opacity: isVisible ? 1 : 0.5,
        '&:hover': {
          backgroundColor: 'rgba(0,0,0,0.05)',
        },
      }}
      onClick={() => onToggle(type)}
    >
      <Box
        sx={{
          width: 16,
          height: 16,
          borderRadius: icon ? 0 : '50%',
          backgroundColor: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: 'white',
        }}
      >
        {icon}
      </Box>
      
      <Typography
        variant="body2"
        sx={{
          flex: 1,
          textTransform: 'capitalize',
          textDecoration: isVisible ? 'none' : 'line-through',
        }}
      >
        {type.replace(/([A-Z])/g, ' $1').trim()}
      </Typography>
      
      {count !== undefined && (
        <Typography variant="caption" color="textSecondary">
          ({count})
        </Typography>
      )}
      
      <IconButton size="small" sx={{ p: 0.5 }}>
        {isVisible ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
      </IconButton>
    </Box>
  );
};

export const GraphLegend: React.FC<GraphLegendProps> = ({
  visibleNodeTypes,
  visibleLinkTypes,
  onNodeTypeToggle,
  onLinkTypeToggle,
  onShowAll,
  onHideAll,
  className,
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    nodes: true,
    links: true,
    sizes: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const nodeTypes = Object.keys(NODE_COLORS);
  const linkTypes = Object.keys(LINK_COLORS);

  const nodeTypeIcons = {
    requirement: 'R',
    architecture: 'A',
    code: 'C',
    test: 'T',
    deployment: 'D',
  };

  const linkTypeIcons = {
    dependency: '→',
    relationship: '↔',
    dataflow: '⟶',
    implements: '⇒',
    tests: '⟿',
    deploys: '⇈',
  };

  return (
    <Paper className={className} sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Legend</Typography>
        <Box>
          <Button size="small" onClick={onShowAll} sx={{ mr: 1 }}>
            Show All
          </Button>
          <Button size="small" onClick={onHideAll} color="secondary">
            Hide All
          </Button>
        </Box>
      </Box>

      {/* Node Types Section */}
      <Box sx={{ mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            mb: 1,
          }}
          onClick={() => toggleSection('nodes')}
        >
          <Typography variant="subtitle2" sx={{ flex: 1 }}>
            Node Types
          </Typography>
          {expandedSections.nodes ? <ExpandLess /> : <ExpandMore />}
        </Box>
        
        <Collapse in={expandedSections.nodes}>
          <Box sx={{ ml: 1 }}>
            {nodeTypes.map(type => (
              <LegendItem
                key={type}
                type={type}
                color={NODE_COLORS[type as keyof typeof NODE_COLORS]}
                isVisible={visibleNodeTypes.includes(type)}
                onToggle={onNodeTypeToggle}
                icon={nodeTypeIcons[type as keyof typeof nodeTypeIcons]}
              />
            ))}
          </Box>
        </Collapse>
      </Box>

      {/* Link Types Section */}
      <Box sx={{ mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            mb: 1,
          }}
          onClick={() => toggleSection('links')}
        >
          <Typography variant="subtitle2" sx={{ flex: 1 }}>
            Link Types
          </Typography>
          {expandedSections.links ? <ExpandLess /> : <ExpandMore />}
        </Box>
        
        <Collapse in={expandedSections.links}>
          <Box sx={{ ml: 1 }}>
            {linkTypes.map(type => (
              <LegendItem
                key={type}
                type={type}
                color={LINK_COLORS[type as keyof typeof LINK_COLORS]}
                isVisible={visibleLinkTypes.includes(type)}
                onToggle={onLinkTypeToggle}
                icon={
                  <Remove 
                    sx={{ 
                      transform: type === 'dataflow' ? 'rotate(45deg)' : 'none',
                      fontSize: 12 
                    }} 
                  />
                }
              />
            ))}
          </Box>
        </Collapse>
      </Box>

      {/* Node Sizes Section */}
      <Box sx={{ mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            mb: 1,
          }}
          onClick={() => toggleSection('sizes')}
        >
          <Typography variant="subtitle2" sx={{ flex: 1 }}>
            Node Sizes
          </Typography>
          {expandedSections.sizes ? <ExpandLess /> : <ExpandMore />}
        </Box>
        
        <Collapse in={expandedSections.sizes}>
          <Box sx={{ ml: 1 }}>
            {Object.entries(NODE_SIZES).map(([size, value]) => (
              <Box
                key={size}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 0.5,
                  px: 1,
                }}
              >
                <Circle sx={{ fontSize: value * 2, color: '#666' }} />
                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                  {size} - {size === 'small' ? 'Few connections' : 
                           size === 'medium' ? 'Some connections' : 
                           'Many connections'}
                </Typography>
              </Box>
            ))}
          </Box>
        </Collapse>
      </Box>

      {/* Graph Interaction Guide */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Interaction Guide
        </Typography>
        <Box sx={{ fontSize: '0.75rem', lineHeight: 1.4 }}>
          <Box sx={{ mb: 1 }}>
            <strong>Click:</strong> Select node/link
          </Box>
          <Box sx={{ mb: 1 }}>
            <strong>Hover:</strong> Highlight connections
          </Box>
          <Box sx={{ mb: 1 }}>
            <strong>Drag:</strong> Move nodes
          </Box>
          <Box sx={{ mb: 1 }}>
            <strong>Scroll:</strong> Zoom in/out
          </Box>
          <Box sx={{ mb: 1 }}>
            <strong>Right-click:</strong> Context menu
          </Box>
        </Box>
      </Box>

      {/* Color Scheme Info */}
      <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Color Meanings
        </Typography>
        <Box sx={{ fontSize: '0.75rem', lineHeight: 1.4 }}>
          <Box sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Circle sx={{ fontSize: 8, color: '#FF6B6B' }} />
            <span>Selected</span>
          </Box>
          <Box sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Circle sx={{ fontSize: 8, color: '#FFD93D' }} />
            <span>Highlighted/Search</span>
          </Box>
          <Box sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Circle sx={{ fontSize: 8, color: '#9CA3AF' }} />
            <span>Dimmed</span>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default GraphLegend;