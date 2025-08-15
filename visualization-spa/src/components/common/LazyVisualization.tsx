/**
 * Lazy Visualization Component with Code Splitting
 * Provides optimized loading for heavy visualization components
 */

import React, { Suspense } from 'react';
import { Box, CircularProgress, Typography, Skeleton } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useLazyLoad, createLazyComponent } from '../../utils/performanceOptimization';

// ============================================================================
// LAZY LOADED VISUALIZATION COMPONENTS
// ============================================================================

// Heavy D3.js visualizations
const InteractiveGraph = createLazyComponent(
  () => import('../visualizations/InteractiveGraph'),
  { chunkName: 'viz-interactive-graph', preload: false }
);

const HeatmapChart = createLazyComponent(
  () => import('../visualizations/HeatmapChart'),
  { chunkName: 'viz-heatmap', preload: false }
);

const DataFlowAnimation = createLazyComponent(
  () => import('../visualizations/DataFlowAnimation').then(m => ({ default: m.DataFlowAnimation })),
  { chunkName: 'viz-dataflow', preload: false }
);

// Three.js 3D visualizations
const KnowledgeGraph = createLazyComponent(
  () => import('../visualizations/KnowledgeGraph'),
  { chunkName: 'viz-3d-knowledge', preload: false }
);

const DependencyGraph = createLazyComponent(
  () => import('../visualizations/DependencyGraph'),
  { chunkName: 'viz-3d-dependency', preload: false }
);

// Architecture components
const ArchitectureCanvas = createLazyComponent(
  () => import('../architecture/ArchitectureCanvas'),
  { chunkName: 'viz-architecture', preload: true }
);

// Complex charts and metrics
const CodeQualityHeatmap = createLazyComponent(
  () => import('../visualizations/CodeQualityHeatmap'),
  { chunkName: 'viz-code-quality', preload: false }
);

const MetricsDisplay = createLazyComponent(
  () => import('../visualizations/MetricsDisplay'),
  { chunkName: 'viz-metrics', preload: false }
);

const TechRadar = createLazyComponent(
  () => import('../visualizations/TechRadar'),
  { chunkName: 'viz-tech-radar', preload: false }
);

// ============================================================================
// LOADING STATES AND FALLBACKS
// ============================================================================

interface LoadingFallbackProps {
  type: 'graph' | 'heatmap' | '3d' | 'chart' | 'canvas';
  height?: number | string;
  showProgress?: boolean;
}

const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  type,
  height = 400,
  showProgress = true
}) => {
  const getSkeletonConfig = () => {
    switch (type) {
      case 'graph':
        return {
          title: 'Loading Interactive Graph...',
          elements: [
            { variant: 'circular' as const, width: 40, height: 40 },
            { variant: 'rectangular' as const, width: '100%', height: 60 },
            { variant: 'text' as const, width: '80%' },
            { variant: 'text' as const, width: '60%' }
          ]
        };
      case 'heatmap':
        return {
          title: 'Loading Heatmap...',
          elements: [
            { variant: 'rectangular' as const, width: '100%', height: '80%' },
            { variant: 'text' as const, width: '40%' }
          ]
        };
      case '3d':
        return {
          title: 'Loading 3D Visualization...',
          elements: [
            { variant: 'rectangular' as const, width: '100%', height: '90%' }
          ]
        };
      case 'chart':
        return {
          title: 'Loading Chart...',
          elements: [
            { variant: 'text' as const, width: '60%' },
            { variant: 'rectangular' as const, width: '100%', height: '70%' },
            { variant: 'text' as const, width: '30%' }
          ]
        };
      case 'canvas':
        return {
          title: 'Loading Canvas...',
          elements: [
            { variant: 'rectangular' as const, width: '100%', height: '100%' }
          ]
        };
      default:
        return {
          title: 'Loading...',
          elements: [
            { variant: 'rectangular' as const, width: '100%', height: '80%' }
          ]
        };
    }
  };

  const config = getSkeletonConfig();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height,
          p: 3,
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        {showProgress && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <CircularProgress size={24} sx={{ mr: 2 }} />
            <Typography variant="body2" color="textSecondary">
              {config.title}
            </Typography>
          </Box>
        )}

        <Box sx={{ width: '100%', flex: 1 }}>
          {config.elements.map((element, index) => (
            <Skeleton
              key={index}
              variant={element.variant}
              width={element.width}
              height={element.height}
              sx={{
                mb: 1,
                bgcolor: 'action.hover',
                '&::after': {
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)'
                }
              }}
            />
          ))}
        </Box>
      </Box>
    </motion.div>
  );
};

// ============================================================================
// ERROR BOUNDARY FOR VISUALIZATIONS
// ============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class VisualizationErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Visualization Error:', error, errorInfo);
    
    // Report to performance monitoring
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark('visualization-error');
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: 300,
            p: 3,
            bgcolor: 'error.light',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'error.main'
          }}
        >
          <Typography variant="h6" color="error.main" gutterBottom>
            Visualization Failed to Load
          </Typography>
          <Typography variant="body2" color="error.dark" textAlign="center">
            {this.state.error?.message || 'An unknown error occurred while loading the visualization.'}
          </Typography>
          <Box sx={{ mt: 2 }}>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              style={{
                padding: '8px 16px',
                borderRadius: 4,
                border: 'none',
                backgroundColor: '#f44336',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// LAZY VISUALIZATION WRAPPER COMPONENT
// ============================================================================

export interface LazyVisualizationProps {
  type: 'graph' | 'heatmap' | '3d-knowledge' | '3d-dependency' | 'architecture' | 
        'code-quality' | 'metrics' | 'tech-radar' | 'dataflow';
  height?: number | string;
  priority?: 'low' | 'high';
  preload?: boolean;
  fallbackType?: 'graph' | 'heatmap' | '3d' | 'chart' | 'canvas';
  [key: string]: any; // Props to pass to the actual component
}

const LazyVisualization: React.FC<LazyVisualizationProps> = ({
  type,
  height = 400,
  priority = 'low',
  preload = false,
  fallbackType,
  ...props
}) => {
  const { ref, isInView, isPreloading } = useLazyLoad({
    rootMargin: priority === 'high' ? '200px' : '100px',
    threshold: 0.1,
    preloadDistance: priority === 'high' ? 300 : 150
  });

  const shouldLoad = isInView || preload || isPreloading;

  const getComponent = () => {
    switch (type) {
      case 'graph':
        return InteractiveGraph;
      case 'heatmap':
        return HeatmapChart;
      case 'dataflow':
        return DataFlowAnimation;
      case '3d-knowledge':
        return KnowledgeGraph;
      case '3d-dependency':
        return DependencyGraph;
      case 'architecture':
        return ArchitectureCanvas;
      case 'code-quality':
        return CodeQualityHeatmap;
      case 'metrics':
        return MetricsDisplay;
      case 'tech-radar':
        return TechRadar;
      default:
        return null;
    }
  };

  const getFallbackType = () => {
    if (fallbackType) return fallbackType;
    
    switch (type) {
      case '3d-knowledge':
      case '3d-dependency':
        return '3d';
      case 'architecture':
        return 'canvas';
      case 'heatmap':
      case 'code-quality':
        return 'heatmap';
      case 'metrics':
      case 'tech-radar':
        return 'chart';
      default:
        return 'graph';
    }
  };

  const Component = getComponent();

  if (!Component) {
    return (
      <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="error">Unknown visualization type: {type}</Typography>
      </Box>
    );
  }

  return (
    <div ref={ref} style={{ height: '100%' }}>
      <VisualizationErrorBoundary>
        <AnimatePresence mode="wait">
          {shouldLoad ? (
            <motion.div
              key="loaded"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <Suspense 
                fallback={
                  <LoadingFallback 
                    type={getFallbackType()} 
                    height={height} 
                    showProgress={true} 
                  />
                }
              >
                <Component {...props} />
              </Suspense>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <LoadingFallback 
                type={getFallbackType()} 
                height={height} 
                showProgress={false} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </VisualizationErrorBoundary>
    </div>
  );
};

export default LazyVisualization;

// ============================================================================
// EXPORT LAZY COMPONENTS FOR DIRECT USE
// ============================================================================

export {
  InteractiveGraph as LazyInteractiveGraph,
  HeatmapChart as LazyHeatmapChart,
  DataFlowAnimation as LazyDataFlowAnimation,
  KnowledgeGraph as LazyKnowledgeGraph,
  DependencyGraph as LazyDependencyGraph,
  ArchitectureCanvas as LazyArchitectureCanvas,
  CodeQualityHeatmap as LazyCodeQualityHeatmap,
  MetricsDisplay as LazyMetricsDisplay,
  TechRadar as LazyTechRadar
};