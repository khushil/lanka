export interface GraphNode {
  id: string;
  name: string;
  type: 'requirement' | 'architecture' | 'code' | 'test' | 'deployment';
  properties: Record<string, any>;
  color: string;
  size: number;
  x?: number;
  y?: number;
  z?: number;
  fx?: number;
  fy?: number;
  fz?: number;
}

export interface GraphLink {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'dependency' | 'relationship' | 'dataflow' | 'implements' | 'tests' | 'deploys';
  properties: Record<string, any>;
  color: string;
  width: number;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface GraphLayoutConfig {
  type: 'force' | 'hierarchical' | 'circular';
  strength: number;
  distance: number;
  repulsion: number;
}

export interface GraphFilters {
  nodeTypes: string[];
  linkTypes: string[];
  searchQuery: string;
  properties: Record<string, any>;
}

export interface GraphStatistics {
  totalNodes: number;
  totalLinks: number;
  nodeTypeCount: Record<string, number>;
  linkTypeCount: Record<string, number>;
  avgConnections: number;
  maxDepth: number;
}

export interface GraphSearchResult {
  node: GraphNode;
  score: number;
  matchedProperties: string[];
}