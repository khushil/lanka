/**
 * Optimized Visualization Wrapper
 * Provides comprehensive optimizations for all visualization components
 */

import React, { memo, useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Skeleton, Alert } from '@mui/material';
import { 
  useLazyLoad, 
  useOptimizedRender,
  usePerformanceMonitor,
  CanvasPool,
  ObjectPool,
  createAdvancedDebounce
} from '../../utils/performanceOptimization';
import { D3ViewportCuller, D3LODRenderer } from '../../utils/d3Optimizations';
import { FrustumCuller, ThreeLODManager } from '../../utils/threeJsOptimizations';

// ============================================================================
// OPTIMIZATION CONFIGURATION
// ============================================================================

interface OptimizationConfig {
  enableLOD: boolean;
  enableCulling: boolean;
  enableObjectPooling: boolean;
  enableDebouncing: boolean;
  maxFPS: number;
  renderPriority: 'low' | 'normal' | 'high';
  memoryLimit: number; // MB
  enablePerformanceMonitoring: boolean;
}

const DEFAULT_CONFIG: OptimizationConfig = {
  enableLOD: true,
  enableCulling: true,
  enableObjectPooling: true,
  enableDebouncing: true,
  maxFPS: 60,
  renderPriority: 'normal',
  memoryLimit: 100,
  enablePerformanceMonitoring: true
};

// ============================================================================
// VIEWPORT INTERSECTION OPTIMIZATION
// ============================================================================

interface ViewportConfig {
  rootMargin: string;
  threshold: number;
  enablePreload: boolean;
  preloadDistance: number;
}

const useViewportOptimization = (config: ViewportConfig) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsIntersecting(entry.isIntersecting);
      },
      {
        rootMargin: config.rootMargin,
        threshold: config.threshold
      }
    );

    observer.observe(element);

    // Preload observer
    const preloadObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && config.enablePreload) {
          setIsPreloading(true);
        }
      },
      {
        rootMargin: `${config.preloadDistance}px`,
        threshold: 0
      }
    );

    if (config.enablePreload) {
      preloadObserver.observe(element);
    }

    return () => {
      observer.unobserve(element);
      if (config.enablePreload) {
        preloadObserver.unobserve(element);
      }
    };
  }, [config]);

  return { ref: elementRef, isIntersecting, isPreloading };
};

// ============================================================================
// MEMORY MANAGEMENT
// ============================================================================

class VisualizationMemoryManager {
  private static instance: VisualizationMemoryManager;
  private memoryUsage = new Map<string, number>();
  private cleanupCallbacks = new Map<string, () => void>();
  private totalLimit: number;

  private constructor(totalLimit: number = 100) {
    this.totalLimit = totalLimit * 1024 * 1024; // Convert to bytes
  }

  static getInstance(totalLimit?: number): VisualizationMemoryManager {
    if (!VisualizationMemoryManager.instance) {
      VisualizationMemoryManager.instance = new VisualizationMemoryManager(totalLimit);
    }
    return VisualizationMemoryManager.instance;
  }

  registerComponent(id: string, estimatedMemoryMB: number, cleanupCallback: () => void): void {
    const memoryBytes = estimatedMemoryMB * 1024 * 1024;
    
    // Check if we're approaching memory limit
    const currentUsage = Array.from(this.memoryUsage.values()).reduce((a, b) => a + b, 0);
    
    if (currentUsage + memoryBytes > this.totalLimit * 0.8) {
      this.triggerCleanup();
    }

    this.memoryUsage.set(id, memoryBytes);
    this.cleanupCallbacks.set(id, cleanupCallback);
  }

  unregisterComponent(id: string): void {
    const cleanup = this.cleanupCallbacks.get(id);
    if (cleanup) {
      cleanup();
    }
    
    this.memoryUsage.delete(id);
    this.cleanupCallbacks.delete(id);
  }

  private triggerCleanup(): void {
    // Sort by memory usage and clean up largest consumers first
    const sorted = Array.from(this.memoryUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.ceil(this.memoryUsage.size / 3)); // Clean up top third

    sorted.forEach(([id]) => {
      const cleanup = this.cleanupCallbacks.get(id);
      if (cleanup) {
        cleanup();
        this.memoryUsage.delete(id);
        this.cleanupCallbacks.delete(id);
      }
    });
  }

  getCurrentUsage(): number {
    return Array.from(this.memoryUsage.values()).reduce((a, b) => a + b, 0);
  }

  getUsagePercentage(): number {
    return (this.getCurrentUsage() / this.totalLimit) * 100;
  }
}

// ============================================================================
// ADAPTIVE RENDERING SYSTEM
// ============================================================================

interface AdaptiveRenderingState {
  quality: 'low' | 'medium' | 'high';
  fps: number;
  memoryPressure: number;
  complexity: number;
}

const useAdaptiveRendering = (targetFPS: number = 60) => {
  const [renderState, setRenderState] = useState<AdaptiveRenderingState>({
    quality: 'high',
    fps: 60,
    memoryPressure: 0,
    complexity: 1
  });

  const { metrics } = usePerformanceMonitor();
  
  useEffect(() => {
    if (!metrics.fps) return;

    const memInfo = (performance as any).memory;
    const memoryPressure = memInfo 
      ? (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100 
      : 0;

    let newQuality: 'low' | 'medium' | 'high' = 'high';
    let complexity = 1;

    // Adjust quality based on performance metrics
    if (metrics.fps < targetFPS * 0.5) {
      newQuality = 'low';
      complexity = 0.3;
    } else if (metrics.fps < targetFPS * 0.75) {
      newQuality = 'medium';
      complexity = 0.6;
    } else if (memoryPressure > 80) {
      newQuality = 'medium';
      complexity = 0.7;
    }

    setRenderState({
      quality: newQuality,
      fps: metrics.fps,
      memoryPressure,
      complexity
    });
  }, [metrics.fps, targetFPS]);

  return renderState;
};

// ============================================================================
// MAIN WRAPPER COMPONENT
// ============================================================================

interface OptimizedVisualizationWrapperProps {
  children: React.ReactNode;
  type: 'd3' | 'three' | 'canvas' | 'svg';
  estimatedMemoryMB?: number;
  config?: Partial<OptimizationConfig>;
  viewportConfig?: Partial<ViewportConfig>;
  onRenderStateChange?: (state: AdaptiveRenderingState) => void;
  fallback?: React.ReactNode;
  id: string;
  width?: number;
  height?: number;
}

const OptimizedVisualizationWrapper: React.FC<OptimizedVisualizationWrapperProps> = memo(({
  children,
  type,
  estimatedMemoryMB = 10,
  config = {},
  viewportConfig = {},
  onRenderStateChange,
  fallback,
  id,
  width = 800,
  height = 600
}) => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const fullViewportConfig = {
    rootMargin: '50px',
    threshold: 0.1,
    enablePreload: true,
    preloadDistance: 100,
    ...viewportConfig
  };

  // Viewport optimization
  const { ref: viewportRef, isIntersecting, isPreloading } = useViewportOptimization(fullViewportConfig);
  
  // Adaptive rendering
  const renderState = useAdaptiveRendering(fullConfig.maxFPS);
  
  // Memory management
  const memoryManager = useMemo(() => VisualizationMemoryManager.getInstance(fullConfig.memoryLimit), [fullConfig.memoryLimit]);
  
  // Object pools based on visualization type
  const objectPools = useMemo(() => {
    if (!fullConfig.enableObjectPooling) return null;

    switch (type) {
      case 'd3':
        return {
          nodes: new ObjectPool(() => ({ x: 0, y: 0, vx: 0, vy: 0 }), (node) => { node.x = 0; node.y = 0; node.vx = 0; node.vy = 0; }),
          links: new ObjectPool(() => ({ source: null, target: null }), (link) => { link.source = null; link.target = null; })
        };
      case 'three':
        return {
          geometries: new ObjectPool(() => ({}), () => {}),
          materials: new ObjectPool(() => ({}), () => {})
        };
      case 'canvas':
        return {
          canvases: new CanvasPool({ maxPoolSize: 5, canvasWidth: width, canvasHeight: height })
        };
      default:
        return null;
    }
  }, [type, fullConfig.enableObjectPooling, width, height]);

  // LOD and culling managers
  const optimizationManagers = useMemo(() => {
    const managers: any = {};
    
    if (fullConfig.enableLOD) {
      if (type === 'd3') {
        managers.lod = new D3LODRenderer();
      } else if (type === 'three') {
        managers.lod = new ThreeLODManager();
      }
    }
    
    if (fullConfig.enableCulling) {
      if (type === 'd3') {
        managers.culler = new D3ViewportCuller({ left: 0, top: 0, right: width, bottom: height });
      } else if (type === 'three') {
        managers.culler = new FrustumCuller();
      }
    }
    
    return managers;
  }, [type, fullConfig.enableLOD, fullConfig.enableCulling, width, height]);

  // Debounced resize handler
  const debouncedResize = useMemo(() => {
    if (!fullConfig.enableDebouncing) return null;
    
    return createAdvancedDebounce((newWidth: number, newHeight: number) => {
      if (optimizationManagers.culler && type === 'd3') {
        optimizationManagers.culler.updateViewport({
          left: 0,
          top: 0,
          right: newWidth,
          bottom: newHeight
        });
      }
    }, 250, { leading: false, trailing: true });
  }, [fullConfig.enableDebouncing, optimizationManagers.culler, type]);

  // Register component with memory manager
  useEffect(() => {
    const cleanup = () => {
      if (objectPools) {
        Object.values(objectPools).forEach((pool: any) => {
          if (pool.clear) pool.clear();
          if (pool.dispose) pool.dispose();
        });
      }
    };

    memoryManager.registerComponent(id, estimatedMemoryMB, cleanup);

    return () => {
      memoryManager.unregisterComponent(id);
    };
  }, [id, estimatedMemoryMB, memoryManager, objectPools]);

  // Notify parent of render state changes
  useEffect(() => {
    onRenderStateChange?.(renderState);
  }, [renderState, onRenderStateChange]);

  // Optimization context for child components
  const optimizationContext = useMemo(() => ({
    renderState,
    objectPools,
    managers: optimizationManagers,
    config: fullConfig,
    isVisible: isIntersecting,
    isPreloading,
    debouncedResize
  }), [renderState, objectPools, optimizationManagers, fullConfig, isIntersecting, isPreloading, debouncedResize]);

  // Don't render if not in viewport and not preloading
  if (!isIntersecting && !isPreloading) {
    return (
      <div ref={viewportRef} style={{ width, height }}>
        {fallback || (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'background.paper',
              border: '1px dashed',
              borderColor: 'divider'
            }}
          >
            <Skeleton variant="rectangular" width="100%" height="100%" />
          </Box>
        )}
      </div>
    );
  }

  // Show memory pressure warning
  const memoryUsagePercent = memoryManager.getUsagePercentage();
  const showMemoryWarning = memoryUsagePercent > 80;

  return (
    <div 
      ref={viewportRef}
      style={{ width, height, position: 'relative' }}
      data-visualization-type={type}
      data-visualization-id={id}
      data-render-quality={renderState.quality}
    >
      {showMemoryWarning && (
        <Alert 
          severity="warning" 
          sx={{ 
            position: 'absolute', 
            top: 8, 
            right: 8, 
            zIndex: 1000,
            fontSize: '0.75rem'
          }}
        >
          High memory usage ({memoryUsagePercent.toFixed(0)}%)
        </Alert>
      )}
      
      {/* Provide optimization context to children */}
      <OptimizationContext.Provider value={optimizationContext}>
        {children}
      </OptimizationContext.Provider>
    </div>
  );
});

// ============================================================================
// CONTEXT FOR CHILD COMPONENTS
// ============================================================================

const OptimizationContext = React.createContext<any>(null);

export const useOptimizationContext = () => {
  const context = React.useContext(OptimizationContext);
  if (!context) {
    console.warn('useOptimizationContext used outside OptimizedVisualizationWrapper');
    return null;
  }
  return context;
};

// ============================================================================
// HELPER HOOKS FOR SPECIFIC OPTIMIZATIONS
// ============================================================================

export const useD3Optimization = () => {
  const context = useOptimizationContext();
  
  if (!context || !context.objectPools?.nodes) {
    return {
      acquireNode: () => ({ x: 0, y: 0, vx: 0, vy: 0 }),
      releaseNode: () => {},
      acquireLink: () => ({ source: null, target: null }),
      releaseLink: () => {},
      shouldRenderDetails: () => true,
      cullElements: (selection: any) => selection,
      applyLOD: (selection: any) => selection
    };
  }

  return {
    acquireNode: () => context.objectPools.nodes.acquire(),
    releaseNode: (node: any) => context.objectPools.nodes.release(node),
    acquireLink: () => context.objectPools.links.acquire(),
    releaseLink: (link: any) => context.objectPools.links.release(link),
    shouldRenderDetails: () => context.renderState.quality === 'high',
    cullElements: (selection: any) => context.managers.culler?.cullSelection?.(selection) || selection,
    applyLOD: (selection: any) => context.managers.lod?.applyLODStyles?.(selection) || selection
  };
};

export const useThreeOptimization = () => {
  const context = useOptimizationContext();
  
  if (!context) {
    return {
      shouldRenderShadows: () => true,
      shouldRenderReflections: () => true,
      getLODLevel: () => 'high' as const,
      cullObjects: (objects: any[]) => objects
    };
  }

  return {
    shouldRenderShadows: () => context.renderState.quality === 'high',
    shouldRenderReflections: () => context.renderState.quality !== 'low',
    getLODLevel: () => context.renderState.quality,
    cullObjects: (objects: any[]) => context.managers.culler?.cullObjects?.(objects) || objects
  };
};

export const useCanvasOptimization = () => {
  const context = useOptimizationContext();
  
  if (!context || !context.objectPools?.canvases) {
    return {
      getCanvas: () => {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        return canvas;
      },
      releaseCanvas: () => {}
    };
  }

  return {
    getCanvas: () => context.objectPools.canvases.getCanvas(),
    releaseCanvas: (canvas: HTMLCanvasElement) => context.objectPools.canvases.releaseCanvas(canvas)
  };
};

OptimizedVisualizationWrapper.displayName = 'OptimizedVisualizationWrapper';

export default OptimizedVisualizationWrapper;