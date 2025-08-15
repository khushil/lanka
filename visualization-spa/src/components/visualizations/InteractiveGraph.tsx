import React, { useEffect, useRef, useState, useMemo, useCallback, memo } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import OptimizedVisualizationWrapper, { useD3Optimization } from '../optimization/OptimizedVisualizationWrapper';
import { 
  createAdvancedDebounce,
  useOptimizedRender,
  globalPerformanceMonitor 
} from '../../utils/performanceOptimization';
import { 
  globalViewportCuller,
  globalLODRenderer,
  globalDataManager,
  optimizeD3Selection,
  batchD3Updates
} from '../../utils/d3Optimizations';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  complexity: number;
  group: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  strength: number;
  type: 'dependency' | 'similarity' | 'stakeholder';
}

interface InteractiveGraphProps {
  data: {
    nodes: Node[];
    links: Link[];
  };
  width?: number;
  height?: number;
  onNodeClick?: (nodeId: string) => void;
  selectedNode?: string | null;
}

// Memoized sub-components for better performance
const GraphNode = memo(({ node, onHover, onClick, priorityScale, statusScale, colorSchemes }: any) => (
  <g
    className="node"
    style={{ cursor: 'pointer' }}
    onMouseOver={() => onHover(node.id)}
    onClick={() => onClick(node.id)}
  >
    <circle
      className="status-ring"
      r={priorityScale(node.priority) + 4}
      fill="none"
      stroke={statusScale(node.status)}
      strokeWidth={3}
      opacity={0.8}
    />
    <circle
      className="node-circle"
      r={priorityScale(node.priority)}
      fill={colorSchemes[node.category as keyof typeof colorSchemes] || '#6b7280'}
      stroke="#ffffff"
      strokeWidth={2}
    />
    <circle
      className="complexity-indicator"
      r={(node.complexity / 10) * priorityScale(node.priority) * 0.6}
      fill="#ffffff"
      opacity={0.7}
    />
    <text
      className="node-label"
      dy={priorityScale(node.priority) + 18}
      textAnchor="middle"
      style={{ fontSize: '12px', fontWeight: '500', fill: '#374151' }}
    >
      {node.title.length > 15 ? node.title.substring(0, 15) + '...' : node.title}
    </text>
  </g>
));

const InteractiveGraphComponent: React.FC<InteractiveGraphProps> = ({
  data,
  width = 800,
  height = 600,
  onNodeClick,
  selectedNode
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [simulation, setSimulation] = useState<d3.Simulation<Node, Link> | null>(null);
  const [transform, setTransform] = useState(d3.zoomIdentity);
  
  // D3 optimizations
  const d3Optimizations = useD3Optimization();

  // Memoized color schemes and scales for performance
  const colorSchemes = useMemo(() => ({
    Security: '#ef4444',
    Infrastructure: '#3b82f6',
    Features: '#10b981',
    Performance: '#f59e0b',
    Integration: '#8b5cf6'
  }), []);

  const priorityScale = useMemo(() => 
    d3.scaleOrdinal<string, number>()
      .domain(['low', 'medium', 'high', 'critical'])
      .range([8, 12, 16, 20])
  , []);

  const statusScale = useMemo(() => 
    d3.scaleOrdinal<string, string>()
      .domain(['draft', 'review', 'approved', 'implemented'])
      .range(['#94a3b8', '#fbbf24', '#60a5fa', '#34d399'])
  , []);

  // Debounced event handlers for performance
  const debouncedNodeHover = useMemo(() => 
    createAdvancedDebounce((nodeId: string | null) => {
      setHoveredNode(nodeId);
    }, 50, { leading: true, trailing: false })
  , []);

  const debouncedNodeClick = useMemo(() => 
    createAdvancedDebounce((nodeId: string) => {
      onNodeClick?.(nodeId);
    }, 100, { leading: true, trailing: false })
  , [onNodeClick]);

  // Optimized rendering with performance monitoring
  const { cancelRender } = useOptimizedRender(
    () => {
      // Render operations will be handled in the main effect
    },
    [data, width, height],
    { fps: 60, priority: 'normal', skipWhenHidden: true }
  );

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const startTime = performance.now();
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Update viewport culler dimensions
    globalViewportCuller.updateViewport({ left: 0, top: 0, right: width, bottom: height });
    
    // Update LOD based on data complexity
    const currentLOD = globalLODRenderer.updateLOD(transform.k, data.nodes.length);

    // Create main group for zooming/panning
    const g = svg.append('g').attr('class', 'main-group');

    // Setup zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        const { transform } = event;
        g.attr('transform', transform);
        setTransform(transform);
      });

    svg.call(zoom);

    // Add arrowhead markers for directed edges
    const defs = svg.append('defs');
    
    ['dependency', 'similarity', 'stakeholder'].forEach(type => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 15)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', type === 'dependency' ? '#ef4444' : 
                     type === 'similarity' ? '#3b82f6' : '#10b981')
        .attr('opacity', 0.6);
    });

    // Create optimized force simulation with object pooling
    const simulationNodes = data.nodes.map(node => {
      const pooledNode = d3Optimizations.shouldRenderDetails() 
        ? d3Optimizations.acquireNode() 
        : { x: 0, y: 0, vx: 0, vy: 0 };
      
      return { ...node, ...pooledNode };
    });

    const newSimulation = d3.forceSimulation<Node>(simulationNodes)
      .force('link', d3.forceLink<Node, Link>(data.links)
        .id(d => d.id)
        .distance(d => 80 + (1 - d.strength) * 40)
        .strength(d => d.strength * (currentLOD === 'high' ? 0.5 : 0.3)))
      .force('charge', d3.forceManyBody()
        .strength(currentLOD === 'high' ? -300 : -200)
        .distanceMax(currentLOD === 'high' ? 400 : 300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide()
        .radius(d => priorityScale(d.priority) + (currentLOD === 'high' ? 5 : 3)))
      .alpha(currentLOD === 'high' ? 1 : 0.3)
      .alphaDecay(currentLOD === 'high' ? 0.0228 : 0.05);

    // Create links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(data.links)
      .enter().append('line')
      .attr('class', d => `link link-${d.type}`)
      .attr('stroke', d => d.type === 'dependency' ? '#ef4444' : 
                           d.type === 'similarity' ? '#3b82f6' : '#10b981')
      .attr('stroke-opacity', d => d.strength * 0.6)
      .attr('stroke-width', d => Math.max(1, d.strength * 3))
      .attr('marker-end', d => `url(#arrow-${d.type})`);

    // Use optimized data binding with caching
    const { enter: nodeEnter, update: nodeUpdate, exit: nodeExit } = globalDataManager.bindData(
      g.select('.nodes').empty() ? g.append('g').attr('class', 'nodes') : g.select('.nodes'),
      data.nodes,
      d => d.id,
      'interactive-graph-nodes'
    );

    // Handle node exit with cleanup
    nodeExit.each(function(d) {
      // Release pooled objects
      if (d3Optimizations.shouldRenderDetails()) {
        d3Optimizations.releaseNode(d);
      }
    }).remove();

    // Create new nodes
    const node = nodeEnter.append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .merge(nodeUpdate as any);

    // Add outer ring for status
    node.append('circle')
      .attr('class', 'status-ring')
      .attr('r', d => priorityScale(d.priority) + 4)
      .attr('fill', 'none')
      .attr('stroke', d => statusScale(d.status))
      .attr('stroke-width', 3)
      .attr('opacity', 0.8);

    // Add main node circle
    node.append('circle')
      .attr('class', 'node-circle')
      .attr('r', d => priorityScale(d.priority))
      .attr('fill', d => colorSchemes[d.category as keyof typeof colorSchemes] || '#6b7280')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2);

    // Add complexity indicator
    node.append('circle')
      .attr('class', 'complexity-indicator')
      .attr('r', d => (d.complexity / 10) * priorityScale(d.priority) * 0.6)
      .attr('fill', '#ffffff')
      .attr('opacity', 0.7);

    // Add node labels
    node.append('text')
      .attr('class', 'node-label')
      .attr('dy', d => priorityScale(d.priority) + 18)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '500')
      .style('fill', '#374151')
      .text(d => d.title.length > 15 ? d.title.substring(0, 15) + '...' : d.title);

    // Apply viewport culling and LOD optimizations
    const optimizedNodes = globalLODRenderer.applyLODStyles(
      d3Optimizations.cullElements(node)
    );

    // Batch DOM updates for better performance
    const domUpdateOperations = [
      () => {
        // Add status rings only for high LOD
        if (currentLOD === 'high') {
          node.selectAll('.status-ring').data([0]).enter()
            .append('circle')
            .attr('class', 'status-ring')
            .attr('r', d => priorityScale(d.priority) + 4)
            .attr('fill', 'none')
            .attr('stroke', d => statusScale(d.status))
            .attr('stroke-width', 3)
            .attr('opacity', 0.8);
        }
      },
      () => {
        // Add main circles
        node.selectAll('.node-circle').data([0]).enter()
          .append('circle')
          .attr('class', 'node-circle')
          .attr('r', d => priorityScale(d.priority))
          .attr('fill', d => colorSchemes[d.category as keyof typeof colorSchemes] || '#6b7280')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2);
      },
      () => {
        // Add complexity indicators only for high LOD
        if (currentLOD === 'high') {
          node.selectAll('.complexity-indicator').data([0]).enter()
            .append('circle')
            .attr('class', 'complexity-indicator')
            .attr('r', d => (d.complexity / 10) * priorityScale(d.priority) * 0.6)
            .attr('fill', '#ffffff')
            .attr('opacity', 0.7);
        }
      },
      () => {
        // Add labels only for medium and high LOD
        if (globalLODRenderer.shouldRenderText()) {
          node.selectAll('.node-label').data([0]).enter()
            .append('text')
            .attr('class', 'node-label')
            .attr('dy', d => priorityScale(d.priority) + 18)
            .attr('text-anchor', 'middle')
            .style('font-size', currentLOD === 'high' ? '12px' : '10px')
            .style('font-weight', '500')
            .style('fill', '#374151')
            .text(d => d.title.length > 15 ? d.title.substring(0, 15) + '...' : d.title);
        }
      }
    ];

    batchD3Updates(domUpdateOperations, 50).then(() => {
      const renderTime = performance.now() - startTime;
      globalPerformanceMonitor.getAverageMetrics().renderTime = renderTime;
    });

    // Optimized interaction handlers with debouncing
    node
      .on('mouseover', function(event, d) {
        debouncedNodeHover(d.id);
        
        // Highlight connected nodes and links
        const connectedNodeIds = new Set<string>();
        data.links.forEach(link => {
          const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
          const targetId = typeof link.target === 'string' ? link.target : link.target.id;
          if (sourceId === d.id || targetId === d.id) {
            connectedNodeIds.add(sourceId);
            connectedNodeIds.add(targetId);
          }
        });

        // Dim non-connected elements
        g.selectAll('.node')
          .style('opacity', (node: any) => 
            connectedNodeIds.has(node.id) ? 1 : 0.3);
        
        g.selectAll('.link')
          .style('opacity', (link: any) => {
            const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
            const targetId = typeof link.target === 'string' ? link.target : link.target.id;
            return (sourceId === d.id || targetId === d.id) ? 0.8 : 0.1;
          });

        // Show tooltip
        const tooltip = d3.select('body').append('div')
          .attr('class', 'graph-tooltip')
          .style('opacity', 0)
          .style('position', 'absolute')
          .style('background', 'rgba(0, 0, 0, 0.8)')
          .style('color', 'white')
          .style('padding', '8px 12px')
          .style('border-radius', '6px')
          .style('font-size', '12px')
          .style('pointer-events', 'none')
          .style('z-index', '1000');

        tooltip.transition()
          .duration(200)
          .style('opacity', 1);

        tooltip.html(`
          <strong>${d.title}</strong><br/>
          Category: ${d.category}<br/>
          Priority: ${d.priority}<br/>
          Status: ${d.status}<br/>
          Complexity: ${d.complexity}/10
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function(event, d) {
        setHoveredNode(null);
        
        // Reset opacity
        g.selectAll('.node').style('opacity', 1);
        g.selectAll('.link').style('opacity', d => d.strength * 0.6);
        
        // Remove tooltip
        d3.selectAll('.graph-tooltip').remove();
      })
      .on('click', function(event, d) {
        event.stopPropagation();
        debouncedNodeClick(d.id);
      });

    // Add drag behavior
    const drag = d3.drag<SVGGElement, Node>()
      .on('start', function(event, d) {
        if (!event.active) newSimulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', function(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', function(event, d) {
        if (!event.active) newSimulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    node.call(drag);

    // Optimized simulation tick with performance monitoring
    let tickCount = 0;
    const maxTicks = currentLOD === 'high' ? 300 : currentLOD === 'medium' ? 200 : 100;
    
    newSimulation.on('tick', () => {
      tickCount++;
      
      // Limit ticks based on LOD and performance
      if (tickCount > maxTicks) {
        newSimulation.stop();
        return;
      }

      // Batch position updates
      const positionUpdates = [
        () => {
          link
            .attr('x1', d => (d.source as Node).x!)
            .attr('y1', d => (d.source as Node).y!)
            .attr('x2', d => (d.target as Node).x!)
            .attr('y2', d => (d.target as Node).y!);
        },
        () => {
          // Use transform for better performance than individual x,y
          optimizeD3Selection(node);
        }
      ];

      // Execute updates in batches to avoid blocking
      requestAnimationFrame(() => {
        positionUpdates.forEach(update => update());
      });
    });

    setSimulation(newSimulation);

    return () => {
      newSimulation.stop();
      d3.selectAll('.graph-tooltip').remove();
      
      // Clean up pooled objects
      if (d3Optimizations.shouldRenderDetails()) {
        simulationNodes.forEach(node => {
          d3Optimizations.releaseNode(node);
        });
      }
      
      // Cancel optimized rendering
      cancelRender();
    };
  }, [data, width, height, d3Optimizations, cancelRender]);

  // Update selection highlighting
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    
    svg.selectAll('.node')
      .classed('selected', (d: any) => d.id === selectedNode)
      .select('.node-circle')
      .attr('stroke-width', (d: any) => d.id === selectedNode ? 4 : 2)
      .attr('stroke', (d: any) => d.id === selectedNode ? '#fbbf24' : '#ffffff');
  }, [selectedNode]);

  const handleReset = () => {
    if (!svgRef.current || !simulation) return;
    
    const svg = d3.select(svgRef.current);
    svg.transition()
      .duration(750)
      .call(
        d3.zoom<SVGSVGElement, unknown>().transform,
        d3.zoomIdentity
      );
    
    simulation.alpha(1).restart();
  };

  return (
    <div className="interactive-graph">
      <div className="graph-controls">
        <motion.button
          className="control-btn"
          onClick={handleReset}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          🔄 Reset View
        </motion.button>
        
        <div className="legend">
          <div className="legend-section">
            <h4>Node Categories</h4>
            {Object.entries(colorSchemes).map(([category, color]) => (
              <div key={category} className="legend-item">
                <div 
                  className="legend-color" 
                  style={{ backgroundColor: color }}
                ></div>
                <span>{category}</span>
              </div>
            ))}
          </div>
          
          <div className="legend-section">
            <h4>Link Types</h4>
            <div className="legend-item">
              <div className="legend-line dependency"></div>
              <span>Dependencies</span>
            </div>
            <div className="legend-item">
              <div className="legend-line similarity"></div>
              <span>Similarities</span>
            </div>
            <div className="legend-item">
              <div className="legend-line stakeholder"></div>
              <span>Stakeholder Overlap</span>
            </div>
          </div>
        </div>
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="graph-svg"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </svg>

      {data.nodes.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No data to visualize</h3>
          <p>Apply different filters or check your data source</p>
        </div>
      )}
    </div>
  );
};

// Wrap with optimization wrapper
const InteractiveGraph: React.FC<InteractiveGraphProps> = (props) => {
  return (
    <OptimizedVisualizationWrapper
      type="d3"
      id={`interactive-graph-${props.selectedNode || 'default'}`}
      estimatedMemoryMB={15}
      config={{
        enableLOD: true,
        enableCulling: true,
        enableObjectPooling: true,
        enableDebouncing: true,
        maxFPS: 60,
        renderPriority: 'normal'
      }}
      width={props.width}
      height={props.height}
    >
      <InteractiveGraphComponent {...props} />
    </OptimizedVisualizationWrapper>
  );
};

InteractiveGraph.displayName = 'InteractiveGraph';

export default memo(InteractiveGraph);