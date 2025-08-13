import { GraphNode, GraphLink, GraphData, GraphFilters } from '../types/graph';
import * as d3 from 'd3-force';

export const NODE_COLORS = {
  requirement: '#3B82F6', // Blue
  architecture: '#10B981', // Green
  code: '#F59E0B', // Yellow
  test: '#EF4444', // Red
  deployment: '#8B5CF6', // Purple
} as const;

export const LINK_COLORS = {
  dependency: '#6B7280', // Gray
  relationship: '#059669', // Emerald
  dataflow: '#DC2626', // Red
  implements: '#7C3AED', // Violet
  tests: '#F97316', // Orange
  deploys: '#06B6D4', // Cyan
} as const;

export const NODE_SIZES = {
  small: 4,
  medium: 8,
  large: 12,
} as const;

export const getNodeColor = (type: string): string => {
  return NODE_COLORS[type as keyof typeof NODE_COLORS] || '#6B7280';
};

export const getLinkColor = (type: string): string => {
  return LINK_COLORS[type as keyof typeof LINK_COLORS] || '#6B7280';
};

export const getNodeSize = (node: GraphNode): number => {
  const baseSize = NODE_SIZES.medium;
  const connectionsMultiplier = Math.min((node.properties?.connections || 1) / 10, 2);
  return baseSize * (1 + connectionsMultiplier);
};

export const filterGraphData = (data: GraphData, filters: GraphFilters): GraphData => {
  let filteredNodes = data.nodes;
  let filteredLinks = data.links;

  // Filter by node types
  if (filters.nodeTypes.length > 0) {
    filteredNodes = filteredNodes.filter(node => filters.nodeTypes.includes(node.type));
  }

  // Filter by search query
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filteredNodes = filteredNodes.filter(node =>
      node.name.toLowerCase().includes(query) ||
      node.type.toLowerCase().includes(query) ||
      Object.values(node.properties).some(value =>
        String(value).toLowerCase().includes(query)
      )
    );
  }

  // Filter by properties
  if (Object.keys(filters.properties).length > 0) {
    filteredNodes = filteredNodes.filter(node => {
      return Object.entries(filters.properties).every(([key, value]) =>
        node.properties[key] === value
      );
    });
  }

  // Filter links to only include those between filtered nodes
  const nodeIds = new Set(filteredNodes.map(node => node.id));
  filteredLinks = filteredLinks.filter(link => {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    return nodeIds.has(sourceId) && nodeIds.has(targetId);
  });

  // Filter by link types
  if (filters.linkTypes.length > 0) {
    filteredLinks = filteredLinks.filter(link => filters.linkTypes.includes(link.type));
  }

  return {
    nodes: filteredNodes,
    links: filteredLinks,
  };
};

export const searchNodes = (nodes: GraphNode[], query: string): GraphNode[] => {
  if (!query.trim()) return nodes;

  const searchTerms = query.toLowerCase().split(' ');
  
  return nodes.filter(node => {
    const searchableText = [
      node.name,
      node.type,
      ...Object.values(node.properties).map(v => String(v))
    ].join(' ').toLowerCase();

    return searchTerms.every(term => searchableText.includes(term));
  });
};

export const calculateNodePositions = (data: GraphData, layoutType: string = 'force'): GraphData => {
  const simulation = d3.forceSimulation(data.nodes)
    .force('link', d3.forceLink(data.links).id((d: any) => d.id).distance(100))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(0, 0))
    .stop();

  // Run simulation
  for (let i = 0; i < 300; ++i) simulation.tick();

  return {
    ...data,
    nodes: data.nodes.map(node => ({
      ...node,
      x: node.x || 0,
      y: node.y || 0,
      z: node.z || 0,
    })),
  };
};

export const exportGraphAsJSON = (data: GraphData): string => {
  return JSON.stringify(data, null, 2);
};

export const exportGraphAsCSV = (data: GraphData): { nodes: string; links: string } => {
  const nodeHeaders = ['id', 'name', 'type', 'properties'];
  const nodeRows = data.nodes.map(node => [
    node.id,
    node.name,
    node.type,
    JSON.stringify(node.properties),
  ]);

  const linkHeaders = ['id', 'source', 'target', 'type', 'properties'];
  const linkRows = data.links.map(link => [
    link.id,
    typeof link.source === 'string' ? link.source : link.source.id,
    typeof link.target === 'string' ? link.target : link.target.id,
    link.type,
    JSON.stringify(link.properties),
  ]);

  const csvNodes = [nodeHeaders, ...nodeRows].map(row => row.join(',')).join('\n');
  const csvLinks = [linkHeaders, ...linkRows].map(row => row.join(',')).join('\n');

  return { nodes: csvNodes, links: csvLinks };
};

export const highlightConnectedNodes = (
  data: GraphData,
  selectedNodeId: string,
  depth: number = 1
): Set<string> => {
  const connected = new Set<string>([selectedNodeId]);
  const linkMap = new Map<string, GraphLink[]>();

  // Build adjacency map
  data.links.forEach(link => {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;

    if (!linkMap.has(sourceId)) linkMap.set(sourceId, []);
    if (!linkMap.has(targetId)) linkMap.set(targetId, []);

    linkMap.get(sourceId)!.push(link);
    linkMap.get(targetId)!.push(link);
  });

  // BFS to find connected nodes within depth
  const queue: Array<{ id: string; currentDepth: number }> = [{ id: selectedNodeId, currentDepth: 0 }];
  const visited = new Set<string>([selectedNodeId]);

  while (queue.length > 0) {
    const { id, currentDepth } = queue.shift()!;

    if (currentDepth < depth) {
      const neighbors = linkMap.get(id) || [];
      neighbors.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        const neighborId = sourceId === id ? targetId : sourceId;

        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          connected.add(neighborId);
          queue.push({ id: neighborId, currentDepth: currentDepth + 1 });
        }
      });
    }
  }

  return connected;
};