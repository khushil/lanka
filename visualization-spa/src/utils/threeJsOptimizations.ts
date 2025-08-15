/**
 * Three.js Performance Optimizations
 * Advanced utilities for optimizing 3D visualizations
 */

import * as THREE from 'three';
import { ObjectPool } from './performanceOptimization';

// ============================================================================
// LOD SYSTEM FOR THREE.JS
// ============================================================================

export interface ThreeLODConfig {
  levels: Array<{
    distance: number;
    object: THREE.Object3D;
  }>;
  hysteresis?: number; // Prevents flickering between LOD levels
}

export class ThreeLODManager {
  private lodObjects: Map<string, THREE.LOD> = new Map();
  private camera: THREE.Camera | null = null;
  private hysteresis: number;

  constructor(hysteresis: number = 0.1) {
    this.hysteresis = hysteresis;
  }

  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  createLODObject(id: string, config: ThreeLODConfig): THREE.LOD {
    const lod = new THREE.LOD();
    
    config.levels.forEach((level, index) => {
      lod.addLevel(level.object, level.distance);
    });

    this.lodObjects.set(id, lod);
    return lod;
  }

  updateLOD(scene: THREE.Scene): void {
    if (!this.camera) return;

    this.lodObjects.forEach((lod) => {
      lod.update(this.camera!);
    });
  }

  dispose(): void {
    this.lodObjects.forEach((lod) => {
      lod.removeFromParent();
    });
    this.lodObjects.clear();
  }
}

// ============================================================================
// FRUSTUM CULLING OPTIMIZATION
// ============================================================================

export class FrustumCuller {
  private frustum = new THREE.Frustum();
  private cameraMatrix = new THREE.Matrix4();
  private visibilityMap = new Map<THREE.Object3D, boolean>();

  updateFrustum(camera: THREE.Camera): void {
    camera.updateMatrixWorld();
    this.cameraMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.cameraMatrix);
  }

  cullObjects(objects: THREE.Object3D[]): THREE.Object3D[] {
    const visibleObjects: THREE.Object3D[] = [];

    objects.forEach((object) => {
      object.updateMatrixWorld();
      
      // Check if object has a bounding box or sphere
      let isVisible = true;
      
      if (object.geometry) {
        const geometry = object.geometry;
        
        if (!geometry.boundingBox) {
          geometry.computeBoundingBox();
        }
        
        if (geometry.boundingBox) {
          // Transform bounding box to world space
          const box = geometry.boundingBox.clone();
          box.applyMatrix4(object.matrixWorld);
          
          isVisible = this.frustum.intersectsBox(box);
        }
      }

      this.visibilityMap.set(object, isVisible);
      object.visible = isVisible;
      
      if (isVisible) {
        visibleObjects.push(object);
      }
    });

    return visibleObjects;
  }

  isObjectVisible(object: THREE.Object3D): boolean {
    return this.visibilityMap.get(object) ?? true;
  }
}

// ============================================================================
// GEOMETRY AND MATERIAL POOLING
// ============================================================================

export class GeometryPool<T extends THREE.BufferGeometry> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn?: (geometry: T) => void;
  private maxSize: number;

  constructor(createFn: () => T, resetFn?: (geometry: T) => void, maxSize: number = 50) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  acquire(): T {
    let geometry = this.pool.pop();
    
    if (!geometry) {
      geometry = this.createFn();
    }

    return geometry;
  }

  release(geometry: T): void {
    if (this.resetFn) {
      this.resetFn(geometry);
    }

    if (this.pool.length < this.maxSize) {
      this.pool.push(geometry);
    } else {
      geometry.dispose();
    }
  }

  clear(): void {
    this.pool.forEach(geometry => geometry.dispose());
    this.pool = [];
  }
}

export class MaterialPool<T extends THREE.Material> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn?: (material: T) => void;
  private maxSize: number;

  constructor(createFn: () => T, resetFn?: (material: T) => void, maxSize: number = 50) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  acquire(): T {
    let material = this.pool.pop();
    
    if (!material) {
      material = this.createFn();
    }

    return material;
  }

  release(material: T): void {
    if (this.resetFn) {
      this.resetFn(material);
    }

    if (this.pool.length < this.maxSize) {
      this.pool.push(material);
    } else {
      material.dispose();
    }
  }

  clear(): void {
    this.pool.forEach(material => material.dispose());
    this.pool = [];
  }
}

// Common geometry pools
export const sphereGeometryPool = new GeometryPool(
  () => new THREE.SphereGeometry(1, 8, 6),
  (geometry) => {
    // Reset to default size and segments
    geometry.dispose();
  }
);

export const boxGeometryPool = new GeometryPool(
  () => new THREE.BoxGeometry(1, 1, 1),
  (geometry) => {
    geometry.dispose();
  }
);

export const cylinderGeometryPool = new GeometryPool(
  () => new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
  (geometry) => {
    geometry.dispose();
  }
);

// Common material pools
export const basicMaterialPool = new MaterialPool(
  () => new THREE.MeshBasicMaterial({ color: 0xffffff }),
  (material) => {
    material.color.set(0xffffff);
    material.opacity = 1;
    material.transparent = false;
  }
);

export const lambertMaterialPool = new MaterialPool(
  () => new THREE.MeshLambertMaterial({ color: 0xffffff }),
  (material) => {
    material.color.set(0xffffff);
    material.opacity = 1;
    material.transparent = false;
  }
);

// ============================================================================
// BATCHING AND INSTANCING
// ============================================================================

export interface BatchingConfig {
  maxInstances: number;
  geometryType: 'sphere' | 'box' | 'cylinder' | 'custom';
  customGeometry?: THREE.BufferGeometry;
  material: THREE.Material;
}

export class InstancedMeshManager {
  private instancedMeshes = new Map<string, THREE.InstancedMesh>();
  private instanceCounts = new Map<string, number>();
  private maxInstances = new Map<string, number>();

  createInstancedMesh(id: string, config: BatchingConfig): THREE.InstancedMesh {
    let geometry: THREE.BufferGeometry;

    switch (config.geometryType) {
      case 'sphere':
        geometry = new THREE.SphereGeometry(1, 8, 6);
        break;
      case 'box':
        geometry = new THREE.BoxGeometry(1, 1, 1);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
        break;
      case 'custom':
        geometry = config.customGeometry!;
        break;
      default:
        geometry = new THREE.SphereGeometry(1, 8, 6);
    }

    const instancedMesh = new THREE.InstancedMesh(
      geometry,
      config.material,
      config.maxInstances
    );

    this.instancedMeshes.set(id, instancedMesh);
    this.instanceCounts.set(id, 0);
    this.maxInstances.set(id, config.maxInstances);

    return instancedMesh;
  }

  addInstance(
    id: string,
    position: THREE.Vector3,
    rotation: THREE.Euler,
    scale: THREE.Vector3
  ): number | null {
    const mesh = this.instancedMeshes.get(id);
    const currentCount = this.instanceCounts.get(id);
    const maxCount = this.maxInstances.get(id);

    if (!mesh || currentCount === undefined || maxCount === undefined) {
      return null;
    }

    if (currentCount >= maxCount) {
      return null; // No more instances available
    }

    const matrix = new THREE.Matrix4();
    matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
    
    mesh.setMatrixAt(currentCount, matrix);
    mesh.instanceMatrix.needsUpdate = true;

    this.instanceCounts.set(id, currentCount + 1);
    return currentCount;
  }

  updateInstance(
    id: string,
    instanceIndex: number,
    position: THREE.Vector3,
    rotation: THREE.Euler,
    scale: THREE.Vector3
  ): void {
    const mesh = this.instancedMeshes.get(id);
    if (!mesh) return;

    const matrix = new THREE.Matrix4();
    matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
    
    mesh.setMatrixAt(instanceIndex, matrix);
    mesh.instanceMatrix.needsUpdate = true;
  }

  resetInstances(id: string): void {
    this.instanceCounts.set(id, 0);
    const mesh = this.instancedMeshes.get(id);
    if (mesh) {
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  getInstancedMesh(id: string): THREE.InstancedMesh | undefined {
    return this.instancedMeshes.get(id);
  }

  dispose(): void {
    this.instancedMeshes.forEach((mesh) => {
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(material => material.dispose());
      } else {
        mesh.material.dispose();
      }
    });
    
    this.instancedMeshes.clear();
    this.instanceCounts.clear();
    this.maxInstances.clear();
  }
}

// ============================================================================
// TEXTURE AND MATERIAL OPTIMIZATION
// ============================================================================

export class TextureManager {
  private textureCache = new Map<string, THREE.Texture>();
  private loadingPromises = new Map<string, Promise<THREE.Texture>>();

  async loadTexture(url: string, options: {
    generateMipmaps?: boolean;
    flipY?: boolean;
    format?: THREE.PixelFormat;
    minFilter?: THREE.TextureFilter;
    magFilter?: THREE.TextureFilter;
  } = {}): Promise<THREE.Texture> {
    // Check cache first
    if (this.textureCache.has(url)) {
      return this.textureCache.get(url)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    // Load texture
    const loadPromise = new Promise<THREE.Texture>((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      const texture = loader.load(
        url,
        (loadedTexture) => {
          // Apply options
          if (options.generateMipmaps !== undefined) {
            loadedTexture.generateMipmaps = options.generateMipmaps;
          }
          if (options.flipY !== undefined) {
            loadedTexture.flipY = options.flipY;
          }
          if (options.format) {
            loadedTexture.format = options.format;
          }
          if (options.minFilter) {
            loadedTexture.minFilter = options.minFilter;
          }
          if (options.magFilter) {
            loadedTexture.magFilter = options.magFilter;
          }

          this.textureCache.set(url, loadedTexture);
          this.loadingPromises.delete(url);
          resolve(loadedTexture);
        },
        undefined,
        (error) => {
          this.loadingPromises.delete(url);
          reject(error);
        }
      );
    });

    this.loadingPromises.set(url, loadPromise);
    return loadPromise;
  }

  createDataTexture(
    data: Uint8Array | Float32Array,
    width: number,
    height: number,
    format: THREE.PixelFormat = THREE.RGBAFormat,
    type: THREE.TextureDataType = THREE.UnsignedByteType
  ): THREE.DataTexture {
    const texture = new THREE.DataTexture(data, width, height, format, type);
    texture.needsUpdate = true;
    return texture;
  }

  disposeTexture(url: string): void {
    const texture = this.textureCache.get(url);
    if (texture) {
      texture.dispose();
      this.textureCache.delete(url);
    }
  }

  clear(): void {
    this.textureCache.forEach(texture => texture.dispose());
    this.textureCache.clear();
    this.loadingPromises.clear();
  }
}

// ============================================================================
// PERFORMANCE MONITORING FOR THREE.JS
// ============================================================================

export interface ThreePerformanceMetrics {
  triangles: number;
  geometries: number;
  materials: number;
  textures: number;
  drawCalls: number;
  memoryUsage: {
    geometries: number;
    materials: number;
    textures: number;
  };
}

export class ThreePerformanceMonitor {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    this.renderer = renderer;
    this.scene = scene;
  }

  getMetrics(): ThreePerformanceMetrics {
    const info = this.renderer.info;
    
    return {
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      materials: info.memory.materials,
      textures: info.memory.textures,
      drawCalls: info.render.calls,
      memoryUsage: {
        geometries: info.memory.geometries,
        materials: info.memory.materials,
        textures: info.memory.textures
      }
    };
  }

  optimizeScene(): void {
    this.scene.traverse((object) => {
      // Merge geometries where possible
      if (object instanceof THREE.Mesh && object.geometry) {
        object.geometry.computeBoundingBox();
        object.geometry.computeBoundingSphere();
      }

      // Disable frustum culling for small objects (can be more expensive than rendering)
      if (object instanceof THREE.Mesh) {
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        if (size.length() < 0.1) {
          object.frustumCulled = false;
        }
      }
    });
  }

  analyzePerformance(): {
    recommendations: string[];
    issues: string[];
  } {
    const metrics = this.getMetrics();
    const recommendations: string[] = [];
    const issues: string[] = [];

    // Analyze triangle count
    if (metrics.triangles > 1000000) {
      issues.push('High triangle count detected');
      recommendations.push('Consider using LOD or reducing geometry complexity');
    }

    // Analyze draw calls
    if (metrics.drawCalls > 1000) {
      issues.push('High number of draw calls');
      recommendations.push('Use instanced meshes or merge geometries');
    }

    // Analyze material count
    if (metrics.materials > 100) {
      issues.push('High number of materials');
      recommendations.push('Share materials between objects where possible');
    }

    // Analyze texture count
    if (metrics.textures > 50) {
      issues.push('High number of textures');
      recommendations.push('Use texture atlases or reduce texture resolution');
    }

    return { recommendations, issues };
  }
}

// ============================================================================
// RENDER OPTIMIZATION UTILITIES
// ============================================================================

export function optimizeRenderer(renderer: THREE.WebGLRenderer): void {
  // Enable extensions that improve performance
  const gl = renderer.getContext();
  
  // Enable instanced arrays if available
  const instancedArrays = gl.getExtension('ANGLE_instanced_arrays');
  if (instancedArrays) {
    console.log('Instanced arrays supported');
  }

  // Set optimal renderer settings
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio
  renderer.shadowMap.enabled = false; // Disable shadows for better performance
  renderer.shadowMap.type = THREE.PCFShadowMap; // Use faster shadow mapping
  
  // Enable hardware acceleration
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping; // Disable tone mapping for performance
  
  // Optimize for mobile
  if (/Mobi|Android/i.test(navigator.userAgent)) {
    renderer.setPixelRatio(1);
    renderer.antialias = false;
  }
}

export function createOptimizedScene(): THREE.Scene {
  const scene = new THREE.Scene();
  
  // Optimize fog for better performance
  scene.fog = new THREE.Fog(0x000000, 1, 1000);
  
  // Disable automatic matrix updates for static objects
  scene.autoUpdate = false;
  
  return scene;
}

export function createOptimizedCamera(
  aspect: number,
  near: number = 0.1,
  far: number = 1000
): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(75, aspect, near, far);
  
  // Optimize near/far planes for better depth precision
  camera.near = Math.max(0.1, near);
  camera.far = Math.min(10000, far);
  
  return camera;
}

// Global instances
export const globalLODManager = new ThreeLODManager();
export const globalFrustumCuller = new FrustumCuller();
export const globalInstancedMeshManager = new InstancedMeshManager();
export const globalTextureManager = new TextureManager();

export default {
  ThreeLODManager,
  FrustumCuller,
  GeometryPool,
  MaterialPool,
  InstancedMeshManager,
  TextureManager,
  ThreePerformanceMonitor,
  sphereGeometryPool,
  boxGeometryPool,
  cylinderGeometryPool,
  basicMaterialPool,
  lambertMaterialPool,
  optimizeRenderer,
  createOptimizedScene,
  createOptimizedCamera,
  globalLODManager,
  globalFrustumCuller,
  globalInstancedMeshManager,
  globalTextureManager
};