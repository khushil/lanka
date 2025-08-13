import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_GRAPH_DATA,
  GET_NODE_DETAILS,
  GET_GRAPH_STATISTICS,
  UPDATE_NODE,
  DELETE_NODE,
  CREATE_NODE,
  CREATE_LINK,
} from '../graphql/graph';
import {
  GraphData,
  GraphNode,
  GraphLink,
  GraphFilters,
  GraphLayoutConfig,
} from '../types/graph';
import { filterGraphData } from '../utils/graphUtils';

interface UseGraphProps {
  initialFilters?: GraphFilters;
  initialLayout?: GraphLayoutConfig;
}

interface UseGraphReturn {
  // Data
  graphData: GraphData;
  statistics: any;
  selectedNode: GraphNode | null;
  
  // Loading states
  loading: boolean;
  nodeDetailsLoading: boolean;
  
  // Error states
  error: any;
  
  // Filters and layout
  filters: GraphFilters;
  layoutConfig: GraphLayoutConfig;
  
  // Actions
  setFilters: (filters: GraphFilters) => void;
  setLayoutConfig: (config: GraphLayoutConfig) => void;
  selectNode: (nodeId: string) => void;
  clearSelection: () => void;
  refetch: () => void;
  
  // Mutations
  updateNode: (nodeId: string, updates: Partial<GraphNode>) => Promise<any>;
  deleteNode: (nodeId: string) => Promise<any>;
  createNode: (node: Omit<GraphNode, 'id'>) => Promise<any>;
  createLink: (link: Omit<GraphLink, 'id'>) => Promise<any>;
}

export const useGraph = ({
  initialFilters = {
    nodeTypes: [],
    linkTypes: [],
    searchQuery: '',
    properties: {},
  },
  initialLayout = {
    type: 'force',
    strength: 1,
    distance: 100,
    repulsion: -300,
  },
}: UseGraphProps = {}): UseGraphReturn => {
  // State
  const [filters, setFilters] = useState<GraphFilters>(initialFilters);
  const [layoutConfig, setLayoutConfig] = useState<GraphLayoutConfig>(initialLayout);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');

  // Queries
  const {
    data: rawGraphData,
    loading,
    error,
    refetch,
  } = useQuery(GET_GRAPH_DATA, {
    variables: { filters },
    errorPolicy: 'partial',
  });

  const {
    data: statisticsData,
  } = useQuery(GET_GRAPH_STATISTICS);

  const {
    data: nodeDetailsData,
    loading: nodeDetailsLoading,
  } = useQuery(GET_NODE_DETAILS, {
    variables: { id: selectedNodeId },
    skip: !selectedNodeId,
  });

  // Mutations
  const [updateNodeMutation] = useMutation(UPDATE_NODE, {
    refetchQueries: ['GetGraphData'],
  });

  const [deleteNodeMutation] = useMutation(DELETE_NODE, {
    refetchQueries: ['GetGraphData', 'GetGraphStatistics'],
  });

  const [createNodeMutation] = useMutation(CREATE_NODE, {
    refetchQueries: ['GetGraphData', 'GetGraphStatistics'],
  });

  const [createLinkMutation] = useMutation(CREATE_LINK, {
    refetchQueries: ['GetGraphData', 'GetGraphStatistics'],
  });

  // Process graph data
  const graphData: GraphData = useMemo(() => {
    if (!rawGraphData?.graphData) {
      return { nodes: [], links: [] };
    }

    const nodes: GraphNode[] = rawGraphData.graphData.nodes.map((node: any) => ({
      id: node.id,
      name: node.name,
      type: node.type,
      properties: node.properties || {},
      color: '#3B82F6', // Will be calculated by utils
      size: 8, // Will be calculated by utils
    }));

    const links: GraphLink[] = rawGraphData.graphData.links.map((link: any) => ({
      id: link.id,
      source: link.source,
      target: link.target,
      type: link.type,
      properties: link.properties || {},
      color: '#6B7280', // Will be calculated by utils
      width: link.weight || 1,
    }));

    return filterGraphData({ nodes, links }, filters);
  }, [rawGraphData, filters]);

  // Selected node
  const selectedNode: GraphNode | null = useMemo(() => {
    if (!nodeDetailsData?.node) return null;

    return {
      id: nodeDetailsData.node.id,
      name: nodeDetailsData.node.name,
      type: nodeDetailsData.node.type,
      properties: nodeDetailsData.node.properties || {},
      color: '#3B82F6',
      size: 8,
    };
  }, [nodeDetailsData]);

  // Actions
  const selectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNodeId('');
  }, []);

  const updateNode = useCallback(async (nodeId: string, updates: Partial<GraphNode>) => {
    return updateNodeMutation({
      variables: {
        id: nodeId,
        updates,
      },
    });
  }, [updateNodeMutation]);

  const deleteNode = useCallback(async (nodeId: string) => {
    return deleteNodeMutation({
      variables: { id: nodeId },
    });
  }, [deleteNodeMutation]);

  const createNode = useCallback(async (node: Omit<GraphNode, 'id'>) => {
    return createNodeMutation({
      variables: {
        input: {
          name: node.name,
          type: node.type,
          properties: node.properties,
        },
      },
    });
  }, [createNodeMutation]);

  const createLink = useCallback(async (link: Omit<GraphLink, 'id'>) => {
    return createLinkMutation({
      variables: {
        input: {
          source: typeof link.source === 'string' ? link.source : link.source.id,
          target: typeof link.target === 'string' ? link.target : link.target.id,
          type: link.type,
          properties: link.properties,
        },
      },
    });
  }, [createLinkMutation]);

  return {
    // Data
    graphData,
    statistics: statisticsData?.graphStatistics,
    selectedNode,
    
    // Loading states
    loading,
    nodeDetailsLoading,
    
    // Error states
    error,
    
    // Filters and layout
    filters,
    layoutConfig,
    
    // Actions
    setFilters,
    setLayoutConfig,
    selectNode,
    clearSelection,
    refetch,
    
    // Mutations
    updateNode,
    deleteNode,
    createNode,
    createLink,
  };
};