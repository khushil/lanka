/**
 * Performance Optimization Utilities for Lanka Visual SPA
 * Provides comprehensive tools for optimizing graphics-heavy components
 */

import { RefObject, useCallback, useEffect, useRef, useState, useMemo } from 'react';

// ============================================================================
// LAZY LOADING HELPERS
// ============================================================================

/**
 * Enhanced lazy loading with intersection observer and preloading
 */
export interface LazyLoadOptions {
  rootMargin?: string;
  threshold?: number;
  preloadDistance?: number;
  priority?: 'low' | 'high';
  fallbackDelay?: number;
}

export const useLazyLoad = (options: LazyLoadOptions = {}) => {
  const {
    rootMargin = '50px',
    threshold = 0.1,
    preloadDistance = 200,
    priority = 'low',
    fallbackDelay = 2000
  } = options;

  const [isInView, setIsInView] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const targetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const current = targetRef.current;
    if (!current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(current);
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(current);

    // Preload when close to viewport
    const preloadObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isPreloading) {
          setIsPreloading(true);
        }
      },
      { rootMargin: `${preloadDistance}px` }
    );

    preloadObserver.observe(current);

    // Fallback for browsers without intersection observer
    const fallbackTimer = setTimeout(() => {
      if (!isInView) {
        setIsInView(true);
      }
    }, fallbackDelay);

    return () => {
      observer.unobserve(current);
      preloadObserver.unobserve(current);
      clearTimeout(fallbackTimer);
    };
  }, [rootMargin, threshold, preloadDistance, isPreloading, isInView, fallbackDelay]);

  return { ref: targetRef, isInView, isPreloading };
};

/**
 * Smart component lazy loader with chunking strategies
 */
export const createLazyComponent = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    chunkName?: string;
    preload?: boolean;
    retryAttempts?: number;
    fallback?: React.ComponentType;
  } = {}
) => {
  const { chunkName, preload = false, retryAttempts = 3, fallback } = options;

  let retryCount = 0;
  const loadWithRetry = (): Promise<{ default: T }> => {
    return importFn().catch((error) => {
      if (retryCount < retryAttempts) {
        retryCount++;
        return new Promise((resolve) => {
          setTimeout(() => resolve(loadWithRetry()), 1000 * retryCount);
        });
      }
      throw error;
    });
  };

  const LazyComponent = React.lazy(loadWithRetry);

  // Preload if requested
  if (preload && typeof window !== 'undefined') {
    const preloadTimer = setTimeout(() => {
      loadWithRetry().catch(() => {
        // Ignore preload errors
      });
    }, 100);
  }

  return LazyComponent;
};

// ============================================================================
// DEBOUNCE AND THROTTLE UTILITIES
// ============================================================================

/**
 * Advanced debounce with leading/trailing edge control and cancellation
 */
export function createAdvancedDebounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  options: {
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
  } = {}
): T & { cancel: () => void; flush: () => void; pending: () => boolean } {
  let timeoutId: NodeJS.Timeout | null = null;
  let maxTimeoutId: NodeJS.Timeout | null = null;
  let result: ReturnType<T>;
  let lastCallTime = 0;
  let lastInvokeTime = 0;
  let lastArgs: Parameters<T> | undefined;
  let lastThis: any;

  const { leading = false, trailing = true, maxWait } = options;

  const invokeFunc = (time: number) => {
    const args = lastArgs!;
    const thisArg = lastThis;
    
    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  };

  const leadingEdge = (time: number) => {
    lastInvokeTime = time;
    if (maxWait) {
      maxTimeoutId = setTimeout(maxDelayed, maxWait);
    }
    return leading ? invokeFunc(time) : result;
  };

  const remainingWait = (time: number) => {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = delay - timeSinceLastCall;

    return maxWait
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  };

  const shouldInvoke = (time: number) => {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === 0 ||
      timeSinceLastCall >= delay ||
      timeSinceLastCall < 0 ||
      (maxWait && timeSinceLastInvoke >= maxWait)
    );
  };

  const timerExpired = () => {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    timeoutId = setTimeout(timerExpired, remainingWait(time));
  };

  const trailingEdge = (time: number) => {
    timeoutId = null;
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = undefined;
    return result;
  };

  const maxDelayed = () => {
    maxTimeoutId = null;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    const time = Date.now();
    return trailingEdge(time);
  };

  const cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (maxTimeoutId !== null) {
      clearTimeout(maxTimeoutId);
      maxTimeoutId = null;
    }
    lastInvokeTime = lastCallTime = 0;
    lastArgs = lastThis = undefined;
  };

  const flush = () => {
    return timeoutId === null ? result : trailingEdge(Date.now());
  };

  const pending = () => {
    return timeoutId !== null || maxTimeoutId !== null;
  };

  const debounced = function(this: any, ...args: Parameters<T>) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timeoutId === null) {
        return leadingEdge(lastCallTime);
      }
      if (maxWait) {
        timeoutId = setTimeout(timerExpired, delay);
        return invokeFunc(lastCallTime);
      }
    }
    if (timeoutId === null) {
      timeoutId = setTimeout(timerExpired, delay);
    }
    return result;
  } as T & { cancel: () => void; flush: () => void; pending: () => boolean };

  debounced.cancel = cancel;
  debounced.flush = flush;
  debounced.pending = pending;

  return debounced;
}

/**
 * Enhanced throttle with adaptive timing based on performance
 */
export function createAdaptiveThrottle<T extends (...args: any[]) => any>(
  func: T,
  initialDelay: number,
  options: {
    adaptive?: boolean;
    maxDelay?: number;
    minDelay?: number;
    performanceThreshold?: number;
  } = {}
): T & { cancel: () => void } {
  const {
    adaptive = true,
    maxDelay = initialDelay * 4,
    minDelay = initialDelay / 4,
    performanceThreshold = 16.67 // 60fps
  } = options;

  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  let currentDelay = initialDelay;
  let performanceEntries: number[] = [];

  const adjustDelay = () => {
    if (!adaptive || performanceEntries.length < 5) return;

    const avgFrameTime = performanceEntries.reduce((a, b) => a + b) / performanceEntries.length;
    
    if (avgFrameTime > performanceThreshold * 1.5) {
      // Performance is poor, increase delay
      currentDelay = Math.min(maxDelay, currentDelay * 1.2);
    } else if (avgFrameTime < performanceThreshold * 0.8) {
      // Performance is good, decrease delay
      currentDelay = Math.max(minDelay, currentDelay * 0.9);
    }

    performanceEntries = [];
  };

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const throttled = function(this: any, ...args: Parameters<T>) {
    const now = performance.now();
    
    if (now - lastCall >= currentDelay) {
      const start = performance.now();
      lastCall = now;
      
      const result = func.apply(this, args);
      
      if (adaptive) {
        const frameTime = performance.now() - start;
        performanceEntries.push(frameTime);
        
        if (performanceEntries.length >= 10) {
          adjustDelay();
        }
      }
      
      return result;
    }
  } as T & { cancel: () => void };

  throttled.cancel = cancel;
  return throttled;
}

// ============================================================================
// VIRTUAL SCROLLING IMPLEMENTATION
// ============================================================================

export interface VirtualScrollOptions {
  itemHeight: number | ((index: number) => number);
  containerHeight: number;
  overscan?: number;
  threshold?: number;
  scrollingDelay?: number;
}

export interface VirtualScrollResult {
  containerProps: {
    style: React.CSSProperties;
    onScroll: (e: React.UIEvent) => void;
  };
  scrollElementProps: {
    style: React.CSSProperties;
  };
  visibleItems: Array<{
    index: number;
    style: React.CSSProperties;
  }>;
  totalHeight: number;
  isScrolling: boolean;
}

export function useVirtualScroll(
  totalItems: number,
  options: VirtualScrollOptions
): VirtualScrollResult {
  const {
    itemHeight,
    containerHeight,
    overscan = 3,
    threshold = 5,
    scrollingDelay = 150
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollingTimeoutRef = useRef<NodeJS.Timeout>();

  const getItemHeight = useCallback(
    (index: number) => {
      return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight;
    },
    [itemHeight]
  );

  const itemOffsets = useMemo(() => {
    const offsets = [0];
    for (let i = 1; i < totalItems; i++) {
      offsets[i] = offsets[i - 1] + getItemHeight(i - 1);
    }
    return offsets;
  }, [totalItems, getItemHeight]);

  const totalHeight = useMemo(() => {
    if (totalItems === 0) return 0;
    return itemOffsets[totalItems - 1] + getItemHeight(totalItems - 1);
  }, [itemOffsets, totalItems, getItemHeight]);

  const visibleRange = useMemo(() => {
    if (totalItems === 0) return { start: 0, end: 0 };

    const start = Math.max(0, findStartIndex(itemOffsets, scrollTop) - overscan);
    const end = Math.min(
      totalItems - 1,
      findEndIndex(itemOffsets, scrollTop + containerHeight, getItemHeight) + overscan
    );

    return { start, end };
  }, [scrollTop, containerHeight, totalItems, itemOffsets, overscan, getItemHeight]);

  const visibleItems = useMemo(() => {
    const items = [];
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      items.push({
        index: i,
        style: {
          position: 'absolute' as const,
          top: itemOffsets[i],
          height: getItemHeight(i),
          width: '100%',
          transform: `translateY(${scrollTop > threshold ? 0 : scrollTop}px)`
        }
      });
    }
    return items;
  }, [visibleRange, itemOffsets, getItemHeight, scrollTop, threshold]);

  const handleScroll = useCallback(
    createAdvancedDebounce(
      (e: React.UIEvent) => {
        const newScrollTop = (e.target as HTMLElement).scrollTop;
        setScrollTop(newScrollTop);
        setIsScrolling(true);

        if (scrollingTimeoutRef.current) {
          clearTimeout(scrollingTimeoutRef.current);
        }

        scrollingTimeoutRef.current = setTimeout(() => {
          setIsScrolling(false);
        }, scrollingDelay);
      },
      8,
      { leading: true, trailing: true }
    ),
    [scrollingDelay]
  );

  return {
    containerProps: {
      style: {
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      },
      onScroll: handleScroll
    },
    scrollElementProps: {
      style: {
        height: totalHeight,
        position: 'relative'
      }
    },
    visibleItems,
    totalHeight,
    isScrolling
  };
}

// Helper functions for virtual scrolling
function findStartIndex(offsets: number[], scrollTop: number): number {
  let low = 0;
  let high = offsets.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (offsets[mid] === scrollTop) {
      return mid;
    } else if (offsets[mid] < scrollTop) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return Math.max(0, high);
}

function findEndIndex(
  offsets: number[],
  scrollBottom: number,
  getItemHeight: (index: number) => number
): number {
  let low = 0;
  let high = offsets.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const itemBottom = offsets[mid] + getItemHeight(mid);
    
    if (itemBottom === scrollBottom) {
      return mid;
    } else if (itemBottom < scrollBottom) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return Math.min(offsets.length - 1, low);
}

// ============================================================================
// CANVAS RENDERING OPTIMIZATIONS
// ============================================================================

export interface CanvasPoolOptions {
  maxPoolSize?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  contextType?: '2d' | 'webgl' | 'webgl2';
}

export class CanvasPool {
  private pool: HTMLCanvasElement[] = [];
  private inUse = new Set<HTMLCanvasElement>();
  private options: Required<CanvasPoolOptions>;

  constructor(options: CanvasPoolOptions = {}) {
    this.options = {
      maxPoolSize: 10,
      canvasWidth: 800,
      canvasHeight: 600,
      contextType: '2d',
      ...options
    };
  }

  getCanvas(): HTMLCanvasElement {
    let canvas = this.pool.pop();
    
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = this.options.canvasWidth;
      canvas.height = this.options.canvasHeight;
    }

    this.inUse.add(canvas);
    return canvas;
  }

  releaseCanvas(canvas: HTMLCanvasElement): void {
    if (!this.inUse.has(canvas)) return;

    this.inUse.delete(canvas);
    
    // Clear canvas
    const ctx = canvas.getContext(this.options.contextType);
    if (ctx && this.options.contextType === '2d') {
      (ctx as CanvasRenderingContext2D).clearRect(0, 0, canvas.width, canvas.height);
    } else if (ctx && (this.options.contextType === 'webgl' || this.options.contextType === 'webgl2')) {
      (ctx as WebGLRenderingContext).clear(
        (ctx as WebGLRenderingContext).COLOR_BUFFER_BIT | 
        (ctx as WebGLRenderingContext).DEPTH_BUFFER_BIT
      );
    }

    if (this.pool.length < this.options.maxPoolSize) {
      this.pool.push(canvas);
    }
  }

  clear(): void {
    this.pool = [];
    this.inUse.clear();
  }
}

/**
 * Optimized rendering hook with frame scheduling
 */
export function useOptimizedRender(
  renderFn: () => void,
  dependencies: React.DependencyList,
  options: {
    fps?: number;
    priority?: 'low' | 'normal' | 'high';
    skipWhenHidden?: boolean;
  } = {}
) {
  const { fps = 60, priority = 'normal', skipWhenHidden = true } = options;
  const frameInterval = 1000 / fps;
  const lastFrameTime = useRef(0);
  const rafId = useRef<number>();
  const isVisible = useRef(true);

  // Track visibility
  useEffect(() => {
    if (!skipWhenHidden) return;

    const handleVisibilityChange = () => {
      isVisible.current = !document.hidden;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [skipWhenHidden]);

  const scheduledRender = useCallback(() => {
    if (skipWhenHidden && !isVisible.current) return;

    const now = performance.now();
    const elapsed = now - lastFrameTime.current;

    if (elapsed >= frameInterval) {
      renderFn();
      lastFrameTime.current = now - (elapsed % frameInterval);
    }

    rafId.current = requestAnimationFrame(scheduledRender);
  }, [renderFn, frameInterval, skipWhenHidden]);

  useEffect(() => {
    scheduledRender();
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [scheduledRender, ...dependencies]);

  const cancelRender = useCallback(() => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }
  }, []);

  return { cancelRender };
}

// ============================================================================
// WEBGL ACCELERATION HELPERS
// ============================================================================

export interface WebGLOptimizationOptions {
  antialias?: boolean;
  depth?: boolean;
  stencil?: boolean;
  preserveDrawingBuffer?: boolean;
  powerPreference?: 'default' | 'high-performance' | 'low-power';
}

export class WebGLRenderer {
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private shaderPrograms = new Map<string, WebGLProgram>();
  private buffers = new Map<string, WebGLBuffer>();

  constructor(
    canvas: HTMLCanvasElement,
    options: WebGLOptimizationOptions = {}
  ) {
    const contextOptions = {
      antialias: false,
      depth: true,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance' as const,
      ...options
    };

    this.gl = 
      canvas.getContext('webgl2', contextOptions) ||
      canvas.getContext('webgl', contextOptions) ||
      canvas.getContext('experimental-webgl', contextOptions);

    if (!this.gl) {
      throw new Error('WebGL not supported');
    }

    this.setupOptimalSettings();
  }

  private setupOptimalSettings(): void {
    if (!this.gl) return;

    // Enable optimizations
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.depthFunc(this.gl.LEQUAL);
    
    // Set clear color to transparent
    this.gl.clearColor(0, 0, 0, 0);
  }

  createShaderProgram(vertexShader: string, fragmentShader: string, id?: string): WebGLProgram | null {
    if (!this.gl) return null;

    const program = this.gl.createProgram();
    if (!program) return null;

    const vShader = this.compileShader(vertexShader, this.gl.VERTEX_SHADER);
    const fShader = this.compileShader(fragmentShader, this.gl.FRAGMENT_SHADER);

    if (!vShader || !fShader) {
      this.gl.deleteProgram(program);
      return null;
    }

    this.gl.attachShader(program, vShader);
    this.gl.attachShader(program, fShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Shader program link error:', this.gl.getProgramInfoLog(program));
      this.gl.deleteProgram(program);
      return null;
    }

    // Clean up shaders
    this.gl.deleteShader(vShader);
    this.gl.deleteShader(fShader);

    if (id) {
      this.shaderPrograms.set(id, program);
    }

    return program;
  }

  private compileShader(source: string, type: number): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  createBuffer(data: ArrayBuffer | ArrayBufferView, type: number, id?: string): WebGLBuffer | null {
    if (!this.gl) return null;

    const buffer = this.gl.createBuffer();
    if (!buffer) return null;

    this.gl.bindBuffer(type, buffer);
    this.gl.bufferData(type, data, this.gl.STATIC_DRAW);

    if (id) {
      this.buffers.set(id, buffer);
    }

    return buffer;
  }

  clear(): void {
    if (!this.gl) return;
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }

  dispose(): void {
    if (!this.gl) return;

    // Clean up programs
    this.shaderPrograms.forEach(program => {
      this.gl!.deleteProgram(program);
    });
    this.shaderPrograms.clear();

    // Clean up buffers
    this.buffers.forEach(buffer => {
      this.gl!.deleteBuffer(buffer);
    });
    this.buffers.clear();
  }
}

// ============================================================================
// OBJECT POOLING FOR FREQUENT OPERATIONS
// ============================================================================

export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn?: (obj: T) => void;
  private maxSize: number;
  private inUse = new Set<T>();

  constructor(
    createFn: () => T,
    resetFn?: (obj: T) => void,
    maxSize: number = 100
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  acquire(): T {
    let obj = this.pool.pop();
    
    if (!obj) {
      obj = this.createFn();
    }

    this.inUse.add(obj);
    return obj;
  }

  release(obj: T): void {
    if (!this.inUse.has(obj)) return;

    this.inUse.delete(obj);
    
    if (this.resetFn) {
      this.resetFn(obj);
    }

    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }

  clear(): void {
    this.pool = [];
    this.inUse.clear();
  }

  get size(): number {
    return this.pool.length;
  }

  get inUseCount(): number {
    return this.inUse.size;
  }
}

// Example usage for D3 objects
export const d3NodePool = new ObjectPool(
  () => ({ x: 0, y: 0, vx: 0, vy: 0 }),
  (node) => {
    node.x = 0;
    node.y = 0;
    node.vx = 0;
    node.vy = 0;
  }
);

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  renderTime: number;
  jsHeapSize?: number;
  domNodes: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private rafId: number | null = null;
  private startTime = 0;
  private frameCount = 0;
  private lastFrameTime = 0;
  private observers: ((metrics: PerformanceMetrics) => void)[] = [];

  start(): void {
    this.startTime = performance.now();
    this.frameCount = 0;
    this.measure();
  }

  stop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private measure = (): void => {
    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    this.lastFrameTime = now;
    this.frameCount++;

    const fps = this.frameCount / ((now - this.startTime) / 1000);
    
    // Get memory info (Chrome only)
    const memInfo = (performance as any).memory;
    const memoryUsage = memInfo ? memInfo.usedJSHeapSize / (1024 * 1024) : 0;
    const jsHeapSize = memInfo ? memInfo.totalJSHeapSize / (1024 * 1024) : undefined;

    const metrics: PerformanceMetrics = {
      fps: Math.round(fps),
      frameTime: Math.round(frameTime * 100) / 100,
      memoryUsage: Math.round(memoryUsage * 100) / 100,
      renderTime: 0, // To be set by render operations
      jsHeapSize: jsHeapSize ? Math.round(jsHeapSize * 100) / 100 : undefined,
      domNodes: document.querySelectorAll('*').length
    };

    this.metrics.push(metrics);
    
    // Keep only last 60 measurements (1 second at 60fps)
    if (this.metrics.length > 60) {
      this.metrics.shift();
    }

    // Notify observers
    this.observers.forEach(observer => observer(metrics));

    this.rafId = requestAnimationFrame(this.measure);
  };

  getAverageMetrics(): Partial<PerformanceMetrics> {
    if (this.metrics.length === 0) return {};

    const totals = this.metrics.reduce(
      (acc, metric) => ({
        fps: acc.fps + metric.fps,
        frameTime: acc.frameTime + metric.frameTime,
        memoryUsage: acc.memoryUsage + metric.memoryUsage,
        renderTime: acc.renderTime + metric.renderTime,
        domNodes: acc.domNodes + metric.domNodes
      }),
      { fps: 0, frameTime: 0, memoryUsage: 0, renderTime: 0, domNodes: 0 }
    );

    const count = this.metrics.length;
    return {
      fps: Math.round(totals.fps / count),
      frameTime: Math.round((totals.frameTime / count) * 100) / 100,
      memoryUsage: Math.round((totals.memoryUsage / count) * 100) / 100,
      renderTime: Math.round((totals.renderTime / count) * 100) / 100,
      domNodes: Math.round(totals.domNodes / count)
    };
  }

  subscribe(observer: (metrics: PerformanceMetrics) => void): () => void {
    this.observers.push(observer);
    return () => {
      const index = this.observers.indexOf(observer);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }
}

// Global performance monitor instance
export const globalPerformanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitor(): {
  metrics: Partial<PerformanceMetrics>;
  isMonitoring: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
} {
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({});
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    const unsubscribe = globalPerformanceMonitor.subscribe((newMetrics) => {
      setMetrics(globalPerformanceMonitor.getAverageMetrics());
    });

    return unsubscribe;
  }, []);

  const startMonitoring = useCallback(() => {
    globalPerformanceMonitor.start();
    setIsMonitoring(true);
  }, []);

  const stopMonitoring = useCallback(() => {
    globalPerformanceMonitor.stop();
    setIsMonitoring(false);
  }, []);

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring
  };
}

export default {
  useLazyLoad,
  createLazyComponent,
  createAdvancedDebounce,
  createAdaptiveThrottle,
  useVirtualScroll,
  CanvasPool,
  useOptimizedRender,
  WebGLRenderer,
  ObjectPool,
  d3NodePool,
  PerformanceMonitor,
  globalPerformanceMonitor,
  usePerformanceMonitor
};