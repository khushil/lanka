/**
 * D3.js Performance Optimizations
 * Specialized utilities for optimizing D3 visualizations
 */

import * as d3 from 'd3';
import { ObjectPool } from './performanceOptimization';

// ============================================================================
// VIEWPORT CULLING FOR D3 ELEMENTS
// ============================================================================

export interface ViewportBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export class D3ViewportCuller {
  private viewport: ViewportBounds;
  private margin: number;

  constructor(viewport: ViewportBounds, margin: number = 50) {
    this.viewport = viewport;
    this.margin = margin;
  }

  updateViewport(viewport: ViewportBounds): void {
    this.viewport = viewport;
  }

  isVisible(x: number, y: number, radius: number = 0): boolean {
    return (
      x + radius >= this.viewport.left - this.margin &&
      x - radius <= this.viewport.right + this.margin &&
      y + radius >= this.viewport.top - this.margin &&
      y - radius <= this.viewport.bottom + this.margin
    );
  }

  isElementVisible(element: d3.Selection<any, any, any, any>): boolean {
    const node = element.node();
    if (!node) return false;

    const bbox = node.getBBox();
    return (
      bbox.x + bbox.width >= this.viewport.left - this.margin &&
      bbox.x <= this.viewport.right + this.margin &&
      bbox.y + bbox.height >= this.viewport.top - this.margin &&
      bbox.y <= this.viewport.bottom + this.margin
    );
  }

  cullSelection(selection: d3.Selection<any, any, any, any>): d3.Selection<any, any, any, any> {
    return selection.style('display', (d: any) => {
      if (d && typeof d === 'object' && 'x' in d && 'y' in d) {
        return this.isVisible(d.x, d.y, d.r || 0) ? null : 'none';
      }
      return null;
    });
  }
}

// ============================================================================
// LEVEL OF DETAIL (LOD) RENDERING
// ============================================================================

export interface LODConfig {
  high: {
    minZoom: number;
    maxElements: number;
    renderMode: 'full';
  };
  medium: {
    minZoom: number;
    maxElements: number;
    renderMode: 'simplified';
  };
  low: {
    minZoom: number;
    maxElements: number;
    renderMode: 'minimal';
  };
}

export class D3LODRenderer {
  private config: LODConfig;
  private currentLOD: 'high' | 'medium' | 'low' = 'high';

  constructor(config: Partial<LODConfig> = {}) {
    this.config = {
      high: { minZoom: 2, maxElements: 1000, renderMode: 'full' },
      medium: { minZoom: 0.5, maxElements: 500, renderMode: 'simplified' },
      low: { minZoom: 0, maxElements: 100, renderMode: 'minimal' },
      ...config
    };
  }

  updateLOD(zoomLevel: number, elementCount: number): 'high' | 'medium' | 'low' {
    if (zoomLevel >= this.config.high.minZoom && elementCount <= this.config.high.maxElements) {
      this.currentLOD = 'high';
    } else if (zoomLevel >= this.config.medium.minZoom && elementCount <= this.config.medium.maxElements) {
      this.currentLOD = 'medium';
    } else {
      this.currentLOD = 'low';
    }
    
    return this.currentLOD;
  }

  getCurrentLOD(): 'high' | 'medium' | 'low' {
    return this.currentLOD;
  }

  applyLODStyles(selection: d3.Selection<any, any, any, any>): d3.Selection<any, any, any, any> {
    switch (this.currentLOD) {
      case 'high':
        return selection
          .style('opacity', 1)
          .attr('stroke-width', (d: any) => d.strokeWidth || 1)
          .style('display', null);

      case 'medium':
        return selection
          .style('opacity', 0.8)
          .attr('stroke-width', 0.5)
          .style('display', null);

      case 'low':
        return selection
          .style('opacity', 0.6)
          .attr('stroke-width', 0)
          .style('display', (d: any, i: number) => i % 3 === 0 ? null : 'none');

      default:
        return selection;
    }
  }

  shouldRenderDetails(): boolean {
    return this.currentLOD === 'high';
  }

  shouldRenderText(): boolean {
    return this.currentLOD !== 'low';
  }
}

// ============================================================================
// OPTIMIZED FORCE SIMULATION
// ============================================================================

export interface OptimizedForceConfig {
  maxIterations?: number;
  coolingFactor?: number;
  alphaDecay?: number;
  velocityDecay?: number;
  adaptiveStepSize?: boolean;
  spatialHashing?: boolean;
}

export class OptimizedD3Force {
  private simulation: d3.Simulation<any, any>;
  private config: Required<OptimizedForceConfig>;
  private spatialHash: Map<string, any[]> = new Map();
  private cellSize: number = 50;

  constructor(nodes: any[], config: OptimizedForceConfig = {}) {
    this.config = {
      maxIterations: 300,
      coolingFactor: 0.98,
      alphaDecay: 0.0228,
      velocityDecay: 0.4,
      adaptiveStepSize: true,
      spatialHashing: true,
      ...config
    };

    this.simulation = d3.forceSimulation(nodes)
      .alphaDecay(this.config.alphaDecay)
      .velocityDecay(this.config.velocityDecay);

    this.setupOptimizations();
  }

  private setupOptimizations(): void {
    let iterationCount = 0;

    this.simulation.on('tick', () => {
      iterationCount++;

      // Apply cooling factor
      if (iterationCount > this.config.maxIterations * 0.5) {
        const currentAlpha = this.simulation.alpha();
        this.simulation.alpha(currentAlpha * this.config.coolingFactor);
      }

      // Stop if max iterations reached
      if (iterationCount >= this.config.maxIterations) {
        this.simulation.stop();
      }

      // Update spatial hash if enabled
      if (this.config.spatialHashing) {
        this.updateSpatialHash();
      }
    });
  }

  private updateSpatialHash(): void {
    this.spatialHash.clear();
    
    this.simulation.nodes().forEach(node => {
      if (node.x !== undefined && node.y !== undefined) {
        const cellX = Math.floor(node.x / this.cellSize);
        const cellY = Math.floor(node.y / this.cellSize);
        const key = `${cellX},${cellY}`;
        
        if (!this.spatialHash.has(key)) {
          this.spatialHash.set(key, []);
        }
        this.spatialHash.get(key)!.push(node);
      }
    });
  }

  getNodesInRadius(centerX: number, centerY: number, radius: number): any[] {
    if (!this.config.spatialHashing) {
      // Fallback to linear search
      return this.simulation.nodes().filter(node => {
        const dx = node.x - centerX;
        const dy = node.y - centerY;
        return Math.sqrt(dx * dx + dy * dy) <= radius;
      });
    }

    const results: any[] = [];
    const cellRadius = Math.ceil(radius / this.cellSize);
    const centerCellX = Math.floor(centerX / this.cellSize);
    const centerCellY = Math.floor(centerY / this.cellSize);

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const key = `${centerCellX + dx},${centerCellY + dy}`;
        const cellNodes = this.spatialHash.get(key);
        
        if (cellNodes) {
          cellNodes.forEach(node => {
            const nodeDistance = Math.sqrt(
              Math.pow(node.x - centerX, 2) + Math.pow(node.y - centerY, 2)
            );
            if (nodeDistance <= radius) {
              results.push(node);
            }
          });
        }
      }
    }

    return results;
  }

  addForce(name: string, force: d3.Force<any, any>): this {
    this.simulation.force(name, force);
    return this;
  }

  restart(): this {
    this.simulation.restart();
    return this;
  }

  stop(): this {
    this.simulation.stop();
    return this;
  }

  getSimulation(): d3.Simulation<any, any> {
    return this.simulation;
  }
}

// ============================================================================
// EFFICIENT DATA BINDING AND UPDATES
// ============================================================================

export class D3DataManager {
  private dataCache: Map<string, any> = new Map();
  private bindingCache: Map<string, d3.Selection<any, any, any, any>> = new Map();

  bindData<T>(
    selection: d3.Selection<any, any, any, any>,
    data: T[],
    keyFunction?: (d: T, i: number) => string,
    cacheKey?: string
  ): {
    enter: d3.Selection<d3.EnterElement, T, any, any>;
    update: d3.Selection<any, T, any, any>;
    exit: d3.Selection<any, T, any, any>;
  } {
    // Use data caching to avoid unnecessary DOM operations
    if (cacheKey) {
      const cachedData = this.dataCache.get(cacheKey);
      if (cachedData && this.arraysEqual(cachedData, data)) {
        const cachedBinding = this.bindingCache.get(cacheKey);
        if (cachedBinding) {
          return {
            enter: cachedBinding.enter(),
            update: cachedBinding,
            exit: cachedBinding.exit()
          };
        }
      }
      this.dataCache.set(cacheKey, [...data]);
    }

    const binding = selection.selectAll('.data-element').data(data, keyFunction);
    
    if (cacheKey) {
      this.bindingCache.set(cacheKey, binding);
    }

    return {
      enter: binding.enter(),
      update: binding,
      exit: binding.exit()
    };
  }

  private arraysEqual(a: any[], b: any[]): boolean {
    if (a.length !== b.length) return false;
    
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    
    return true;
  }

  clearCache(): void {
    this.dataCache.clear();
    this.bindingCache.clear();
  }
}

// ============================================================================
// OPTIMIZED SCALES AND AXES
// ============================================================================

export class D3ScaleManager {
  private scaleCache: Map<string, d3.ScaleLinear<number, number> | d3.ScaleOrdinal<string, string>> = new Map();
  private axisCache: Map<string, d3.Axis<d3.NumberValue> | d3.Axis<string>> = new Map();

  getLinearScale(
    domain: [number, number],
    range: [number, number],
    cacheKey?: string
  ): d3.ScaleLinear<number, number> {
    if (cacheKey && this.scaleCache.has(cacheKey)) {
      const cached = this.scaleCache.get(cacheKey) as d3.ScaleLinear<number, number>;
      return cached.domain(domain).range(range);
    }

    const scale = d3.scaleLinear().domain(domain).range(range);
    
    if (cacheKey) {
      this.scaleCache.set(cacheKey, scale);
    }

    return scale;
  }

  getOrdinalScale(
    domain: string[],
    range: string[],
    cacheKey?: string
  ): d3.ScaleOrdinal<string, string> {
    if (cacheKey && this.scaleCache.has(cacheKey)) {
      const cached = this.scaleCache.get(cacheKey) as d3.ScaleOrdinal<string, string>;
      return cached.domain(domain).range(range);
    }

    const scale = d3.scaleOrdinal<string>().domain(domain).range(range);
    
    if (cacheKey) {
      this.scaleCache.set(cacheKey, scale);
    }

    return scale;
  }

  getAxis(
    scale: d3.ScaleLinear<number, number> | d3.ScaleOrdinal<string, string>,
    orientation: 'top' | 'right' | 'bottom' | 'left',
    tickCount?: number,
    cacheKey?: string
  ): d3.Axis<any> {
    if (cacheKey && this.axisCache.has(cacheKey)) {
      return this.axisCache.get(cacheKey)!;
    }

    let axis: d3.Axis<any>;
    
    switch (orientation) {
      case 'top':
        axis = d3.axisTop(scale as any);
        break;
      case 'right':
        axis = d3.axisRight(scale as any);
        break;
      case 'bottom':
        axis = d3.axisBottom(scale as any);
        break;
      case 'left':
        axis = d3.axisLeft(scale as any);
        break;
    }

    if (tickCount && 'ticks' in axis) {
      axis.ticks(tickCount);
    }

    if (cacheKey) {
      this.axisCache.set(cacheKey, axis);
    }

    return axis;
  }

  clearCache(): void {
    this.scaleCache.clear();
    this.axisCache.clear();
  }
}

// ============================================================================
// OBJECT POOLS FOR D3 ELEMENTS
// ============================================================================

// Pool for D3 node objects
export const d3NodePool = new ObjectPool(
  () => ({ x: 0, y: 0, vx: 0, vy: 0, fx: null as number | null, fy: null as number | null }),
  (node) => {
    node.x = 0;
    node.y = 0;
    node.vx = 0;
    node.vy = 0;
    node.fx = null;
    node.fy = null;
  },
  500
);

// Pool for D3 link objects
export const d3LinkPool = new ObjectPool(
  () => ({ source: null as any, target: null as any, strength: 1 }),
  (link) => {
    link.source = null;
    link.target = null;
    link.strength = 1;
  },
  1000
);

// Pool for path data objects
export const pathDataPool = new ObjectPool(
  () => ({ x: 0, y: 0, command: 'M' as 'M' | 'L' | 'Q' | 'C' | 'Z' }),
  (pathData) => {
    pathData.x = 0;
    pathData.y = 0;
    pathData.command = 'M';
  },
  2000
);

// ============================================================================
// PERFORMANCE UTILITIES
// ============================================================================

export function optimizeD3Selection(selection: d3.Selection<any, any, any, any>): void {
  // Use transform instead of individual x,y attributes for better performance
  selection.attr('transform', function(d: any) {
    return d && d.x !== undefined && d.y !== undefined 
      ? `translate(${d.x},${d.y})` 
      : null;
  });
}

export function batchD3Updates(
  operations: Array<() => void>,
  batchSize: number = 100
): Promise<void> {
  return new Promise((resolve) => {
    let index = 0;

    const processBatch = () => {
      const endIndex = Math.min(index + batchSize, operations.length);
      
      for (let i = index; i < endIndex; i++) {
        operations[i]();
      }

      index = endIndex;

      if (index < operations.length) {
        requestAnimationFrame(processBatch);
      } else {
        resolve();
      }
    };

    processBatch();
  });
}

export function createOptimizedPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  
  const pathData = pathDataPool.acquire();
  let path = `M${points[0].x},${points[0].y}`;
  
  for (let i = 1; i < points.length; i++) {
    path += `L${points[i].x},${points[i].y}`;
  }
  
  pathDataPool.release(pathData);
  return path;
}

// Global instances for reuse
export const globalViewportCuller = new D3ViewportCuller({ left: 0, top: 0, right: 800, bottom: 600 });
export const globalLODRenderer = new D3LODRenderer();
export const globalDataManager = new D3DataManager();
export const globalScaleManager = new D3ScaleManager();

export default {
  D3ViewportCuller,
  D3LODRenderer,
  OptimizedD3Force,
  D3DataManager,
  D3ScaleManager,
  d3NodePool,
  d3LinkPool,
  pathDataPool,
  optimizeD3Selection,
  batchD3Updates,
  createOptimizedPath,
  globalViewportCuller,
  globalLODRenderer,
  globalDataManager,
  globalScaleManager
};