import { gql } from '@apollo/client';

export const GET_GRAPH_DATA = gql`
  query GetGraphData($filters: GraphFiltersInput) {
    graphData(filters: $filters) {
      nodes {
        id
        name
        type
        properties
        createdAt
        updatedAt
      }
      links {
        id
        source
        target
        type
        properties
        weight
        createdAt
      }
    }
  }
`;

export const SEARCH_NODES = gql`
  query SearchNodes($query: String!, $limit: Int = 20) {
    searchNodes(query: $query, limit: $limit) {
      node {
        id
        name
        type
        properties
      }
      score
      matchedProperties
    }
  }
`;

export const GET_NODE_DETAILS = gql`
  query GetNodeDetails($id: String!) {
    node(id: $id) {
      id
      name
      type
      properties
      createdAt
      updatedAt
      connectedNodes {
        node {
          id
          name
          type
        }
        relationship {
          id
          type
          properties
        }
        direction
      }
      metadata {
        version
        tags
        description
        owner
      }
    }
  }
`;

export const UPDATE_NODE = gql`
  mutation UpdateNode($id: String!, $updates: NodeUpdateInput!) {
    updateNode(id: $id, updates: $updates) {
      id
      name
      type
      properties
      updatedAt
    }
  }
`;

export const GET_GRAPH_STATISTICS = gql`
  query GetGraphStatistics {
    graphStatistics {
      totalNodes
      totalLinks
      nodeTypeCount {
        type
        count
      }
      linkTypeCount {
        type
        count
      }
      avgConnections
      maxDepth
      clusteringCoefficient
      connectedComponents
    }
  }
`;

export const GET_NODE_NEIGHBORS = gql`
  query GetNodeNeighbors($id: String!, $depth: Int = 1) {
    nodeNeighbors(id: $id, depth: $depth) {
      nodes {
        id
        name
        type
        properties
        distance
      }
      links {
        id
        source
        target
        type
        properties
      }
    }
  }
`;

export const CREATE_NODE = gql`
  mutation CreateNode($input: CreateNodeInput!) {
    createNode(input: $input) {
      id
      name
      type
      properties
      createdAt
    }
  }
`;

export const CREATE_LINK = gql`
  mutation CreateLink($input: CreateLinkInput!) {
    createLink(input: $input) {
      id
      source
      target
      type
      properties
      createdAt
    }
  }
`;

export const DELETE_NODE = gql`
  mutation DeleteNode($id: String!) {
    deleteNode(id: $id) {
      success
      message
    }
  }
`;

export const DELETE_LINK = gql`
  mutation DeleteLink($id: String!) {
    deleteLink(id: $id) {
      success
      message
    }
  }
`;