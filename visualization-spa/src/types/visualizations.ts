// Type definitions for visualization components

export interface BaseNode {
  id: string;
  title: string;
  category: string;
}

export interface GraphNode extends BaseNode {
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'review' | 'approved' | 'implemented';
  complexity: number;
  group: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  strength: number;
  type: 'dependency' | 'similarity' | 'stakeholder';
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface MetricData {
  label: string;
  value: number | string;
  trend: 'up' | 'down' | 'stable';
  change?: number;
  unit?: string;
  icon?: string;
}

export interface HeatmapData {
  matrix: number[][];
  labels: string[];
}

export interface AnimatedCardProps {
  title: string;
  description: string;
  icon: string;
  metrics: {
    value: number;
    label: string;
    trend: 'up' | 'down' | 'stable';
  };
  color: string;
  isSelected?: boolean;
  onClick?: () => void;
}

export interface VisualizationTheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
}

export interface AnimationConfig {
  duration: number;
  ease: string;
  delay?: number;
  stagger?: number;
}

export interface FilterState {
  category: string;
  search: string;
  priority?: string;
  status?: string;
}

export interface VisualizationSettings {
  showLabels: boolean;
  showValues: boolean;
  colorScheme: 'blues' | 'reds' | 'greens' | 'viridis' | 'plasma';
  animationSpeed: 'slow' | 'normal' | 'fast';
  theme: 'light' | 'dark' | 'auto';
}

export type ViewMode = 'graph' | 'heatmap' | 'patterns' | 'timeline' | 'matrix';

export type LayoutType = 'horizontal' | 'vertical' | 'grid' | 'masonry';

export type ChartType = 
  | 'line' 
  | 'bar' 
  | 'scatter' 
  | 'heatmap' 
  | 'network' 
  | 'treemap' 
  | 'sankey' 
  | 'force-directed';

// Event types for interactive components
export interface NodeClickEvent {
  nodeId: string;
  node: GraphNode;
  position: { x: number; y: number };
}

export interface CellClickEvent {
  row: number;
  col: number;
  value: number;
  label?: string;
}

export interface MetricUpdateEvent {
  metric: MetricData;
  timestamp: number;
  source: string;
}

// Component state interfaces
export interface InteractiveGraphState {
  selectedNode: string | null;
  hoveredNode: string | null;
  zoomLevel: number;
  panOffset: { x: number; y: number };
  isSimulationRunning: boolean;
}

export interface HeatmapState {
  selectedCell: { row: number; col: number } | null;
  hoveredCell: { row: number; col: number; value: number } | null;
  colorScale: string;
  showValues: boolean;
}

export interface DashboardState {
  activeModule: string | null;
  metrics: MetricData[];
  lastUpdate: number;
  isLoading: boolean;
  error: string | null;
}

// API response types
export interface VisualizationDataResponse<T = any> {
  data: T;
  metadata: {
    timestamp: number;
    version: string;
    source: string;
    count: number;
  };
  success: boolean;
  error?: string;
}

export interface RequirementsDataResponse extends VisualizationDataResponse<{
  nodes: GraphNode[];
  links: GraphLink[];
  categories: string[];
  metrics: MetricData[];
}> {}

export interface PerformanceMetricsResponse extends VisualizationDataResponse<{
  metrics: MetricData[];
  trends: Array<{
    label: string;
    data: Array<{ timestamp: number; value: number }>;
  }>;
  benchmarks: Array<{
    name: string;
    current: number;
    target: number;
    trend: 'up' | 'down' | 'stable';
  }>;
}> {}

// Configuration types
export interface D3Config {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  colors: string[];
  animation: {
    duration: number;
    ease: string;
  };
}

export interface FramerMotionConfig {
  initial: object;
  animate: object;
  exit?: object;
  transition: {
    duration: number;
    ease: string;
    delay?: number;
  };
}

// Utility types
export type ColorScheme = 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'teal';

export type ResponsiveBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface ResponsiveConfig {
  [key: string]: {
    columns: number;
    gap: string;
    padding: string;
  };
}

// Export helper type for component props
export type WithVisualizationProps<T = {}> = T & {
  theme?: VisualizationTheme;
  animation?: AnimationConfig;
  responsive?: boolean;
  className?: string;
};