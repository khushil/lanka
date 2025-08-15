import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Tooltip,
  IconButton,
  Popover,
  List,
  ListItem,
  ListItemText,
  Grid
} from '@mui/material';
import { Info, ZoomIn, ZoomOut, RotateLeft, CenterFocusStrong } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface SystemModule {
  id: string;
  name: string;
  type: 'requirements' | 'architecture' | 'development' | 'integration' | 'analytics';
  status: 'active' | 'inactive' | 'processing' | 'error';
  connections: string[];
  position: { x: number; y: number; z: number };
  metrics: {
    load: number;
    health: number;
    throughput: number;
  };
}

interface SystemFlowDiagramProps {
  data: {
    modules: SystemModule[];
    connections: Array<{ from: string; to: string; type: string; weight: number }>;
  } | null;
  isAnimating: boolean;
  viewMode: '2d' | '3d';
  animationSpeed: number;
  showDetails: boolean;
}

const SystemFlowDiagram: React.FC<SystemFlowDiagramProps> = ({
  data,
  isAnimating,
  viewMode,
  animationSpeed,
  showDetails
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const moduleObjectsRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const connectionLinesRef = useRef<THREE.Line[]>([]);
  
  const [selectedModule, setSelectedModule] = useState<SystemModule | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [cameraControls, setCameraControls] = useState({
    position: { x: 0, y: 0, z: 10 },
    rotation: { x: 0, y: 0, z: 0 }
  });

  // Module colors by type
  const moduleColors = {
    requirements: 0x4CAF50,
    architecture: 0x2196F3,
    development: 0xFF9800,
    integration: 0x9C27B0,
    analytics: 0xF44336
  };

  // Status colors
  const statusColors = {
    active: 0x00FF00,
    inactive: 0x808080,
    processing: 0xFFFF00,
    error: 0xFF0000
  };

  const initializeScene = useCallback(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 10);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Point lights for dynamic effects
    const pointLight1 = new THREE.PointLight(0x00ff88, 0.5, 20);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff0088, 0.5, 20);
    pointLight2.position.set(-5, -5, 5);
    scene.add(pointLight2);

    // Add grid helper for reference
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x444444);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    return { scene, camera, renderer };
  }, []);

  const createModuleGeometry = useCallback((module: SystemModule) => {
    const geometry = viewMode === '3d' 
      ? new THREE.BoxGeometry(1, 1, 1)
      : new THREE.PlaneGeometry(1, 1);
    
    const material = new THREE.MeshPhongMaterial({
      color: moduleColors[module.type],
      transparent: true,
      opacity: 0.8,
      emissive: statusColors[module.status],
      emissiveIntensity: 0.1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(module.position.x, module.position.y, module.position.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Add module data to mesh for interaction
    mesh.userData = { module };

    // Add glow effect based on load
    const glowGeometry = new THREE.SphereGeometry(1.2, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: moduleColors[module.type],
      transparent: true,
      opacity: module.metrics.load * 0.3,
      side: THREE.BackSide
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.copy(mesh.position);
    mesh.add(glowMesh);

    return mesh;
  }, [viewMode]);

  const createConnection = useCallback((from: THREE.Vector3, to: THREE.Vector3, weight: number) => {
    const points = [];
    points.push(from);
    
    // Add curve for more interesting visualization
    const midPoint = new THREE.Vector3(
      (from.x + to.x) / 2,
      (from.y + to.y) / 2 + Math.sin(Date.now() * 0.001) * 0.5,
      (from.z + to.z) / 2
    );
    points.push(midPoint);
    points.push(to);

    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(curve, 20, 0.02 * weight, 8, false);
    
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.6 + weight * 0.4
    });

    return new THREE.Mesh(geometry, material);
  }, []);

  const updateVisualization = useCallback(() => {
    if (!data || !sceneRef.current || !rendererRef.current || !cameraRef.current) return;

    // Clear existing objects
    moduleObjectsRef.current.forEach(obj => {
      sceneRef.current?.remove(obj);
    });
    connectionLinesRef.current.forEach(line => {
      sceneRef.current?.remove(line);
    });
    moduleObjectsRef.current.clear();
    connectionLinesRef.current = [];

    // Create modules
    data.modules.forEach(module => {
      const mesh = createModuleGeometry(module);
      sceneRef.current?.add(mesh);
      moduleObjectsRef.current.set(module.id, mesh);
    });

    // Create connections
    data.connections.forEach(connection => {
      const fromModule = data.modules.find(m => m.id === connection.from);
      const toModule = data.modules.find(m => m.id === connection.to);
      
      if (fromModule && toModule) {
        const fromPos = new THREE.Vector3(
          fromModule.position.x,
          fromModule.position.y,
          fromModule.position.z
        );
        const toPos = new THREE.Vector3(
          toModule.position.x,
          toModule.position.y,
          toModule.position.z
        );
        
        const connectionMesh = createConnection(fromPos, toPos, connection.weight);
        sceneRef.current?.add(connectionMesh);
        connectionLinesRef.current.push(connectionMesh as any);
      }
    });
  }, [data, createModuleGeometry, createConnection]);

  const animate = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    if (isAnimating) {
      const time = Date.now() * 0.001 * animationSpeed;
      
      // Animate modules
      moduleObjectsRef.current.forEach((mesh, moduleId) => {
        const module = data?.modules.find(m => m.id === moduleId);
        if (module) {
          // Pulse based on load
          const scale = 1 + Math.sin(time * 2 + module.metrics.load) * 0.1;
          mesh.scale.setScalar(scale);
          
          // Rotate based on status
          if (module.status === 'processing') {
            mesh.rotation.y += 0.02 * animationSpeed;
          }
          
          // Update material opacity based on health
          if (mesh.material instanceof THREE.MeshPhongMaterial) {
            mesh.material.opacity = 0.6 + module.metrics.health * 0.4;
          }
        }
      });

      // Animate camera in auto mode
      if (viewMode === '3d') {
        cameraRef.current.position.x = Math.cos(time * 0.1) * 15;
        cameraRef.current.position.z = Math.sin(time * 0.1) * 15;
        cameraRef.current.lookAt(0, 0, 0);
      }
    }

    rendererRef.current.render(sceneRef.current, cameraRef.current);
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [isAnimating, animationSpeed, viewMode, data]);

  const handleModuleClick = useCallback((event: MouseEvent) => {
    if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;

    const rect = rendererRef.current.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    const moduleObjects = Array.from(moduleObjectsRef.current.values());
    const intersects = raycaster.intersectObjects(moduleObjects);

    if (intersects.length > 0) {
      const selectedObject = intersects[0].object;
      const module = selectedObject.userData.module as SystemModule;
      
      if (module) {
        setSelectedModule(module);
        setAnchorEl(event.target as HTMLElement);
      }
    }
  }, []);

  const resetCamera = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 0, 10);
      cameraRef.current.lookAt(0, 0, 0);
      setCameraControls({
        position: { x: 0, y: 0, z: 10 },
        rotation: { x: 0, y: 0, z: 0 }
      });
    }
  }, []);

  // Initialize scene
  useEffect(() => {
    const sceneData = initializeScene();
    if (sceneData && mountRef.current) {
      // Add click handler
      sceneData.renderer.domElement.addEventListener('click', handleModuleClick);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current && mountRef.current && mountRef.current.contains(rendererRef.current.domElement)) {
        mountRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.domElement.removeEventListener('click', handleModuleClick);
      }
    };
  }, [initializeScene, handleModuleClick]);

  // Update visualization when data changes
  useEffect(() => {
    updateVisualization();
  }, [updateVisualization]);

  // Start animation loop
  useEffect(() => {
    animate();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animate]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (mountRef.current && rendererRef.current && cameraRef.current) {
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleClosePopover = () => {
    setAnchorEl(null);
    setSelectedModule(null);
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* 3D Canvas */}
      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)'
        }}
      />

      {/* Controls */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          bgcolor: 'rgba(0,0,0,0.8)',
          borderRadius: 1,
          p: 1
        }}
      >
        <Tooltip title="Reset Camera">
          <IconButton onClick={resetCamera} size="small" sx={{ color: 'white' }}>
            <CenterFocusStrong />
          </IconButton>
        </Tooltip>
        <Tooltip title="Rotate View">
          <IconButton size="small" sx={{ color: 'white' }}>
            <RotateLeft />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Module Legend */}
      {showDetails && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            bgcolor: 'rgba(0,0,0,0.8)',
            borderRadius: 1,
            p: 2,
            maxWidth: 300
          }}
        >
          <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
            Module Types
          </Typography>
          <Grid container spacing={1}>
            {Object.entries(moduleColors).map(([type, color]) => (
              <Grid item key={type}>
                <Chip
                  label={type.charAt(0).toUpperCase() + type.slice(1)}
                  size="small"
                  sx={{
                    bgcolor: `#${color.toString(16)}`,
                    color: 'white',
                    fontSize: '0.75rem'
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Module Details Popover */}
      <Popover
        open={Boolean(anchorEl && selectedModule)}
        anchorEl={anchorEl}
        onClose={handleClosePopover}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        {selectedModule && (
          <Card sx={{ maxWidth: 300 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {selectedModule.name}
              </Typography>
              
              <Chip
                label={selectedModule.type}
                color="primary"
                size="small"
                sx={{ mb: 2 }}
              />
              
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Status"
                    secondary={
                      <Chip
                        label={selectedModule.status}
                        size="small"
                        color={selectedModule.status === 'active' ? 'success' : 'default'}
                      />
                    }
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Load"
                    secondary={`${Math.round(selectedModule.metrics.load * 100)}%`}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Health"
                    secondary={`${Math.round(selectedModule.metrics.health * 100)}%`}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Throughput"
                    secondary={`${selectedModule.metrics.throughput} ops/sec`}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Connections"
                    secondary={selectedModule.connections.length}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        )}
      </Popover>
    </Box>
  );
};

export { SystemFlowDiagram };