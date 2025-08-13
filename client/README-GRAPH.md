# LANKA Graph Visualization

## Overview

The LANKA Graph Visualization component provides an interactive 3D/2D Neo4j graph visualization for exploring the relationships between requirements, architecture, code, tests, and deployments in the LANKA knowledge graph.

## Features

### 🎯 Core Visualization
- **3D/2D Toggle**: Switch between 3D force-directed graph and 2D view
- **Interactive Navigation**: Pan, zoom, rotate with mouse/touch controls
- **Force-Directed Layout**: Automatic positioning with customizable physics
- **Real-time Updates**: Live synchronization with Neo4j database

### 🔍 Search & Filter
- **Advanced Search**: Full-text search across node names, types, and properties
- **Smart Filters**: Filter by node types, link types, and custom properties
- **Search History**: Recent searches with quick replay
- **Saved Searches**: Save complex search queries for reuse

### 🎨 Visual Design
- **Color-Coded Nodes**: Different colors for each entity type
- **Interactive Legend**: Click to toggle visibility of node/link types
- **Highlighting**: Visual emphasis on selected and connected nodes
- **Responsive Design**: Optimized for desktop, tablet, and mobile

### 📊 Node Types
- **Requirements** (Blue): Business and functional requirements
- **Architecture** (Green): System architecture decisions and components  
- **Code** (Yellow): Implementation artifacts and source code
- **Tests** (Red): Test cases and validation artifacts
- **Deployments** (Purple): Deployment configurations and environments

### 🔗 Relationship Types
- **Dependencies**: Direct dependencies between entities
- **Relationships**: General associations and connections
- **Data Flow**: Information flow between components
- **Implements**: Implementation relationships (code → requirements)
- **Tests**: Testing relationships (tests → code/requirements)
- **Deploys**: Deployment relationships (deployments → code)

## Components

### GraphVisualization
Main 3D/2D graph rendering component with:
- React Force Graph 3D/2D integration
- Interactive node and link handling
- Camera controls and animations
- Custom styling and theming

### GraphControls
Control panel for graph interaction:
- Layout algorithm selection (Force, Hierarchical, Circular)
- Physics parameters (strength, distance, repulsion)
- Filter controls for nodes and links
- Export functionality (PNG, JSON, CSV)

### GraphLegend
Interactive legend component:
- Visual representation of node/link types
- Click-to-filter functionality
- Usage statistics and counts
- Interaction help guide

### GraphSearch
Advanced search interface:
- Real-time search with debouncing
- Advanced query builder
- Search history management
- Saved search functionality

### GraphDetails
Entity details panel:
- Node/link property display
- Connected entities navigation
- Inline editing capabilities
- Relationship visualization

## Usage

### Basic Setup

```tsx
import GraphExplorer from './pages/GraphExplorer';

// Add to your routing
<Route path="/graph" element={<GraphExplorer />} />
```

### Custom Integration

```tsx
import { GraphVisualization, GraphControls } from './components/graph';
import { useGraph } from './hooks/useGraph';

const CustomGraph = () => {
  const {
    graphData,
    filters,
    setFilters,
    layoutConfig,
    setLayoutConfig,
    selectNode,
    selectedNode,
  } = useGraph({
    initialFilters: {
      nodeTypes: ['requirement', 'code'],
      linkTypes: ['implements'],
      searchQuery: '',
      properties: {},
    },
  });

  return (
    <div style={{ height: '100vh', display: 'flex' }}>
      <GraphVisualization
        data={graphData}
        onNodeClick={selectNode}
        selectedNode={selectedNode}
        layoutConfig={layoutConfig}
      />
      <GraphControls
        filters={filters}
        onFiltersChange={setFilters}
        layoutConfig={layoutConfig}
        onLayoutChange={setLayoutConfig}
      />
    </div>
  );
};
```

### GraphQL Integration

```graphql
# Get graph data with filters
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
    }
  }
}

# Search nodes
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
```

## Configuration

### Layout Options

```typescript
const layoutConfig: GraphLayoutConfig = {
  type: 'force', // 'force' | 'hierarchical' | 'circular'
  strength: 1,    // Force strength (0.1 - 3.0)
  distance: 100,  // Link distance (20 - 300)
  repulsion: -300, // Node repulsion (-1000 to -50)
};
```

### Filter Configuration

```typescript
const filters: GraphFilters = {
  nodeTypes: ['requirement', 'code'], // Filter by node types
  linkTypes: ['implements'],          // Filter by link types
  searchQuery: 'authentication',      // Text search
  properties: {                       // Property filters
    status: 'active',
    priority: 'high',
  },
};
```

## Styling

### CSS Custom Properties

```css
:root {
  --graph-node-requirement: #3B82F6;
  --graph-node-architecture: #10B981;
  --graph-node-code: #F59E0B;
  --graph-node-test: #EF4444;
  --graph-node-deployment: #8B5CF6;
  
  --graph-link-dependency: #6B7280;
  --graph-link-relationship: #059669;
  --graph-link-dataflow: #DC2626;
  --graph-link-implements: #7C3AED;
  --graph-link-tests: #F97316;
  --graph-link-deploys: #06B6D4;
}
```

### Custom Node Styling

```tsx
const customNodeStyle = (node: GraphNode) => ({
  color: node.type === 'critical' ? '#FF0000' : getNodeColor(node.type),
  size: node.properties.importance * 10,
  opacity: node.properties.active ? 1.0 : 0.5,
});
```

## Performance

### Optimization Features
- **Lazy Loading**: Components loaded on demand
- **Virtual Rendering**: Efficient handling of large graphs
- **Debounced Search**: Optimized search performance
- **Memoized Calculations**: Cached expensive computations
- **Progressive Loading**: Incremental data fetching

### Performance Limits
- **Recommended**: < 1000 nodes for smooth interaction
- **Maximum**: < 5000 nodes (may experience slowdown)
- **Links**: Up to 10,000 links supported

### Memory Management
- Automatic cleanup of WebGL resources
- Efficient force simulation algorithms
- Optimized React re-renders

## Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: ARIA labels and descriptions
- **High Contrast**: Support for high contrast modes
- **Reduced Motion**: Respects prefers-reduced-motion
- **Focus Management**: Clear focus indicators

## Browser Support

- **Chrome**: 80+ (recommended)
- **Firefox**: 75+
- **Safari**: 14+
- **Edge**: 80+
- **Mobile**: iOS 12+, Android 8+

## Troubleshooting

### Common Issues

1. **Graph Not Loading**
   - Check GraphQL endpoint connectivity
   - Verify authentication tokens
   - Check browser console for errors

2. **Performance Issues**
   - Reduce number of visible nodes with filters
   - Switch to 2D mode for better performance
   - Clear browser cache and reload

3. **3D Rendering Issues**
   - Update graphics drivers
   - Try different browser
   - Disable browser extensions

### Debug Mode

```tsx
<GraphVisualization
  data={graphData}
  debug={true} // Enables debug logging
  showStats={true} // Shows performance statistics
/>
```

## API Reference

### Types

```typescript
interface GraphNode {
  id: string;
  name: string;
  type: 'requirement' | 'architecture' | 'code' | 'test' | 'deployment';
  properties: Record<string, any>;
  color: string;
  size: number;
}

interface GraphLink {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'dependency' | 'relationship' | 'dataflow' | 'implements' | 'tests' | 'deploys';
  properties: Record<string, any>;
  color: string;
  width: number;
}
```

### Hooks

```typescript
const {
  graphData,
  loading,
  error,
  filters,
  setFilters,
  selectedNode,
  selectNode,
} = useGraph(options);
```

## Contributing

1. Follow the existing code style and patterns
2. Add tests for new functionality
3. Update documentation for API changes
4. Test on multiple browsers and devices
5. Consider performance implications

## License

Copyright © 2025 LANKA. All rights reserved.