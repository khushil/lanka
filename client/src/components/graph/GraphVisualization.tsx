import React, { useRef, useEffect, useState, useCallback } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import ForceGraph2D from 'react-force-graph-2d';
import { Box, IconButton, Tooltip, FormControlLabel, Switch } from '@mui/material';
import { ZoomIn, ZoomOut, CenterFocusStrong, ThreeDRotation } from '@mui/icons-material';
import { GraphNode, GraphLink, GraphData, GraphLayoutConfig } from '../../types/graph';
import { getNodeColor, getLinkColor, getNodeSize, highlightConnectedNodes } from '../../utils/graphUtils';
import * as THREE from 'three';

interface GraphVisualizationProps {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  onNodeHover?: (node: GraphNode | null) => void;
  onLinkClick?: (link: GraphLink) => void;
  selectedNodeId?: string;
  highlightedNodes?: Set<string>;
  layoutConfig?: GraphLayoutConfig;
  searchHighlight?: string;
  className?: string;
}

export const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  data,
  onNodeClick,
  onNodeHover,
  onLinkClick,
  selectedNodeId,
  highlightedNodes = new Set(),
  layoutConfig,
  searchHighlight,
  className,
}) => {
  const fgRef = useRef<any>();
  const [is3D, setIs3D] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [connectedNodes, setConnectedNodes] = useState<Set<string>>(new Set());

  // Handle node hover
  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredNode(node);
    if (node) {
      const connected = highlightConnectedNodes(data, node.id, 1);
      setConnectedNodes(connected);
    } else {
      setConnectedNodes(new Set());
    }
    onNodeHover?.(node);
  }, [data, onNodeHover]);

  // Handle node click
  const handleNodeClick = useCallback((node: GraphNode) => {
    onNodeClick?.(node);
    
    // Center camera on clicked node
    if (fgRef.current) {
      const distance = is3D ? 300 : 150;
      if (is3D) {
        fgRef.current.cameraPosition(
          { x: node.x! + distance, y: node.y!, z: node.z! + distance },
          node,
          3000
        );
      } else {
        fgRef.current.centerAt(node.x, node.y, 1000);
        fgRef.current.zoom(2, 1000);
      }
    }
  }, [onNodeClick, is3D]);

  // Node styling
  const getNodeStyle = useCallback((node: GraphNode) => {
    const isSelected = node.id === selectedNodeId;
    const isHighlighted = highlightedNodes.has(node.id);
    const isConnected = connectedNodes.has(node.id);
    const isSearchHighlight = searchHighlight && 
      (node.name.toLowerCase().includes(searchHighlight.toLowerCase()) ||
       node.type.toLowerCase().includes(searchHighlight.toLowerCase()));

    let color = getNodeColor(node.type);
    let size = getNodeSize(node);

    if (isSelected) {
      color = '#FF6B6B';
      size *= 1.5;
    } else if (isHighlighted || isSearchHighlight) {
      color = '#FFD93D';
      size *= 1.3;
    } else if (isConnected) {
      size *= 1.2;
    } else if (hoveredNode && !isConnected && hoveredNode.id !== node.id) {
      color = '#9CA3AF';
      size *= 0.8;
    }

    return { color, size };
  }, [selectedNodeId, highlightedNodes, connectedNodes, hoveredNode, searchHighlight]);

  // Link styling
  const getLinkStyle = useCallback((link: GraphLink) => {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    
    const isConnected = connectedNodes.has(sourceId) || connectedNodes.has(targetId);
    const isHighlighted = highlightedNodes.has(sourceId) && highlightedNodes.has(targetId);

    let color = getLinkColor(link.type);
    let width = link.width || 1;
    let opacity = 0.6;

    if (isHighlighted) {
      color = '#FFD93D';
      width *= 2;
      opacity = 1;
    } else if (isConnected) {
      width *= 1.5;
      opacity = 0.8;
    } else if (hoveredNode && !isConnected) {
      opacity = 0.2;
    }

    return { color, width, opacity };
  }, [connectedNodes, highlightedNodes, hoveredNode]);

  // Node 3D object
  const nodeThreeObject = useCallback((node: GraphNode) => {
    const { color, size } = getNodeStyle(node);
    const geometry = new THREE.SphereGeometry(size);
    const material = new THREE.MeshLambertMaterial({ 
      color,
      transparent: true,
      opacity: 0.9
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    // Add node type icon as texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 64, 64);
    
    // Add type indicator
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(node.type.charAt(0).toUpperCase(), 32, 40);
    
    const texture = new THREE.CanvasTexture(canvas);
    material.map = texture;
    
    return mesh;
  }, [getNodeStyle]);

  // Node label
  const nodeLabel = useCallback((node: GraphNode) => {
    return `<div style="
      background: rgba(0,0,0,0.8); 
      color: white; 
      padding: 8px 12px; 
      border-radius: 4px; 
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 200px;
      word-wrap: break-word;
    ">
      <strong>${node.name}</strong><br/>
      <em>${node.type}</em><br/>
      ${Object.keys(node.properties).length > 0 ? 
        `<small>${Object.keys(node.properties).length} properties</small>` : ''
      }
    </div>`;
  }, []);

  // Link label
  const linkLabel = useCallback((link: GraphLink) => {
    return `<div style="
      background: rgba(0,0,0,0.8); 
      color: white; 
      padding: 4px 8px; 
      border-radius: 4px; 
      font-size: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    ">
      ${link.type}${link.label ? `: ${link.label}` : ''}
    </div>`;
  }, []);

  // Control functions
  const zoomIn = () => {
    if (fgRef.current) {
      if (is3D) {
        const currentPos = fgRef.current.cameraPosition();
        const distance = Math.sqrt(currentPos.x ** 2 + currentPos.y ** 2 + currentPos.z ** 2);
        const scale = 0.8;
        fgRef.current.cameraPosition({
          x: currentPos.x * scale,
          y: currentPos.y * scale,
          z: currentPos.z * scale
        });
      } else {
        fgRef.current.zoom(fgRef.current.zoom() * 1.2, 300);
      }
    }
  };

  const zoomOut = () => {
    if (fgRef.current) {
      if (is3D) {
        const currentPos = fgRef.current.cameraPosition();
        const scale = 1.2;
        fgRef.current.cameraPosition({
          x: currentPos.x * scale,
          y: currentPos.y * scale,
          z: currentPos.z * scale
        });
      } else {
        fgRef.current.zoom(fgRef.current.zoom() / 1.2, 300);
      }
    }
  };

  const centerGraph = () => {
    if (fgRef.current) {
      if (is3D) {
        fgRef.current.cameraPosition({ x: 0, y: 0, z: 400 });
      } else {
        fgRef.current.centerAt(0, 0, 1000);
        fgRef.current.zoom(1, 1000);
      }
    }
  };

  // Apply layout configuration
  useEffect(() => {
    if (fgRef.current && layoutConfig) {
      const fg = fgRef.current;
      
      if (layoutConfig.type === 'force') {
        fg.d3Force('charge').strength(-layoutConfig.repulsion || -300);
        fg.d3Force('link').distance(layoutConfig.distance || 100);
      }
      
      fg.d3ReheatSimulation();
    }
  }, [layoutConfig]);

  // Graph component props
  const graphProps = {
    ref: fgRef,
    graphData: data,
    nodeLabel,
    linkLabel,
    nodeColor: (node: GraphNode) => getNodeStyle(node).color,
    nodeVal: (node: GraphNode) => getNodeSize(node),
    linkColor: (link: GraphLink) => getLinkStyle(link).color,
    linkWidth: (link: GraphLink) => getLinkStyle(link).width,
    linkOpacity: (link: GraphLink) => getLinkStyle(link).opacity,
    onNodeClick: handleNodeClick,
    onNodeHover: handleNodeHover,
    onLinkClick,
    enableNodeDrag: true,
    enableNavigationControls: false,
    showNavInfo: false,
    controlType: 'orbit',
    backgroundColor: '#1a1a1a',
  };

  const ForceGraphComponent = is3D ? ForceGraph3D : ForceGraph2D;

  return (
    <Box className={className} sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <ForceGraphComponent
        {...graphProps}
        {...(is3D ? {
          nodeThreeObject,
          numDimensions: 3,
        } : {
          nodeCanvasObject: (node: GraphNode, ctx: CanvasRenderingContext2D) => {
            const { color, size } = getNodeStyle(node);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
            ctx.fill();
            
            // Add type indicator
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `${size}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(node.type.charAt(0).toUpperCase(), node.x!, node.y! + size/4);
          },
        })}
      />
      
      {/* Control Panel */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          background: 'rgba(0,0,0,0.8)',
          borderRadius: 2,
          p: 1,
        }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={is3D}
              onChange={(e) => setIs3D(e.target.checked)}
              size="small"
              color="primary"
            />
          }
          label="3D View"
          sx={{ color: 'white', m: 0, fontSize: '0.875rem' }}
        />
        
        <Tooltip title="Zoom In">
          <IconButton onClick={zoomIn} size="small" sx={{ color: 'white' }}>
            <ZoomIn fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Zoom Out">
          <IconButton onClick={zoomOut} size="small" sx={{ color: 'white' }}>
            <ZoomOut fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Center Graph">
          <IconButton onClick={centerGraph} size="small" sx={{ color: 'white' }}>
            <CenterFocusStrong fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Node Info Tooltip */}
      {hoveredNode && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            background: 'rgba(0,0,0,0.9)',
            color: 'white',
            p: 2,
            borderRadius: 2,
            maxWidth: 300,
          }}
        >
          <Box sx={{ fontWeight: 'bold', mb: 1 }}>{hoveredNode.name}</Box>
          <Box sx={{ color: '#ccc', fontSize: '0.875rem', mb: 1 }}>
            Type: {hoveredNode.type}
          </Box>
          {Object.keys(hoveredNode.properties).length > 0 && (
            <Box sx={{ fontSize: '0.75rem', color: '#999' }}>
              {Object.keys(hoveredNode.properties).length} properties
            </Box>
          )}
          <Box sx={{ fontSize: '0.75rem', color: '#999', mt: 1 }}>
            Connected to {connectedNodes.size - 1} nodes
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default GraphVisualization;