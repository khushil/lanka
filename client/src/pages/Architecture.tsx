import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  Typography,
  Box,
  Paper,
  Grid,
  Drawer,
  AppBar,
  Toolbar,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tabs,
  Tab,
  Button,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Menu as MenuIcon,
  Architecture as ArchitectureIcon,
  Category as PatternIcon,
  Build as TechStackIcon,
  Cloud as CloudIcon,
  Assignment as DecisionIcon,
  Dashboard as OverviewIcon
} from '@mui/icons-material';
import { useQuery } from '@apollo/client';
import ArchitectureCanvas from '../components/architecture/ArchitectureCanvas';
import PatternLibrary from '../components/architecture/PatternLibrary';
import TechnologyStack from '../components/architecture/TechnologyStack';
import CloudOptimizer from '../components/architecture/CloudOptimizer';
import DecisionRecords from '../components/architecture/DecisionRecords';
import type { ArchitecturePattern } from '../graphql/architecture';

const ArchitectureOverview: React.FC<{
  architecture: any;
  onArchitectureChange: (architecture: any) => void;
}> = ({ architecture, onArchitectureChange }) => {
  const [selectedTool, setSelectedTool] = useState('canvas');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [appliedPattern, setAppliedPattern] = useState<ArchitecturePattern | null>(null);
  const [notification, setNotification] = useState<{ message: string; severity: 'success' | 'info' | 'warning' | 'error' } | null>(null);

  const tools = [
    { id: 'canvas', name: 'Architecture Canvas', icon: <ArchitectureIcon /> },
    { id: 'patterns', name: 'Pattern Library', icon: <PatternIcon /> },
    { id: 'technology', name: 'Technology Stack', icon: <TechStackIcon /> },
    { id: 'cloud', name: 'Cloud Optimizer', icon: <CloudIcon /> },
  ];

  const handlePatternApply = (pattern: ArchitecturePattern) => {
    // Apply pattern to the current architecture
    const updatedArchitecture = {
      ...architecture,
      nodes: [...(architecture?.nodes || []), ...pattern.components.map(comp => ({
        id: `pattern_${comp.id}_${Date.now()}`,
        type: comp.type,
        position: comp.position,
        data: { ...comp.properties, label: comp.name }
      }))],
      edges: [...(architecture?.edges || []), ...pattern.connections.map(conn => ({
        id: `pattern_edge_${conn.id}_${Date.now()}`,
        source: `pattern_${conn.source}_${Date.now()}`,
        target: `pattern_${conn.target}_${Date.now()}`,
        type: conn.type
      }))]
    };
    
    onArchitectureChange(updatedArchitecture);
    setAppliedPattern(pattern);
    setNotification({
      message: `Applied pattern: ${pattern.name}`,
      severity: 'success'
    });
  };

  const handleArchitectureSave = (savedArchitecture: any) => {
    onArchitectureChange(savedArchitecture);
    setNotification({
      message: 'Architecture saved successfully',
      severity: 'success'
    });
  };

  const renderTool = () => {
    switch (selectedTool) {
      case 'canvas':
        return (
          <ArchitectureCanvas
            onSave={handleArchitectureSave}
            initialArchitecture={architecture}
          />
        );
      case 'patterns':
        return (
          <PatternLibrary
            onApplyPattern={handlePatternApply}
          />
        );
      case 'technology':
        return (
          <TechnologyStack
            requirements={{
              projectType: 'web',
              budget: 50000,
              timeline: 6,
              teamSize: 5
            }}
          />
        );
      case 'cloud':
        return (
          <CloudOptimizer
            architecture={architecture}
            onDeploymentGenerated={(deployment) => {
              setNotification({
                message: 'Infrastructure code generated successfully',
                severity: 'success'
              });
            }}
          />
        );
      default:
        return <Alert severity="info">Select a tool from the sidebar</Alert>;
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex' }}>
      {/* Sidebar */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={sidebarOpen}
        sx={{
          width: sidebarOpen ? 280 : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
            position: 'relative'
          }
        }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Architecture Tools
          </Typography>
          <IconButton onClick={() => setSidebarOpen(false)}>
            <MenuIcon />
          </IconButton>
        </Toolbar>
        <Divider />
        <List>
          {tools.map((tool) => (
            <ListItem
              key={tool.id}
              button
              selected={selectedTool === tool.id}
              onClick={() => setSelectedTool(tool.id)}
            >
              <ListItemIcon>{tool.icon}</ListItemIcon>
              <ListItemText primary={tool.name} />
            </ListItem>
          ))}
        </List>
        <Divider />
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Current Architecture
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Nodes: {architecture?.nodes?.length || 0}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Connections: {architecture?.edges?.length || 0}
          </Typography>
          {appliedPattern && (
            <Alert severity="info" sx={{ mt: 1, fontSize: '0.75rem' }}>
              Last applied: {appliedPattern.name}
            </Alert>
          )}
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Bar */}
        {!sidebarOpen && (
          <AppBar position="static" color="default" elevation={1}>
            <Toolbar variant="dense">
              <IconButton
                edge="start"
                onClick={() => setSidebarOpen(true)}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                Architecture Workbench
              </Typography>
            </Toolbar>
          </AppBar>
        )}

        {/* Tool Content */}
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          {renderTool()}
        </Box>
      </Box>

      {/* Notifications */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {notification && (
          <Alert
            onClose={() => setNotification(null)}
            severity={notification.severity}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
};

const ArchitecturePatterns: React.FC = () => {
  return (
    <Box sx={{ height: '100vh' }}>
      <PatternLibrary
        onApplyPattern={(pattern) => {
          console.log('Pattern applied:', pattern);
        }}
      />
    </Box>
  );
};

const ArchitectureDecisions: React.FC = () => {
  // In a real app, this would come from routing or props
  const projectId = 'default-project';

  return (
    <Box sx={{ height: '100vh' }}>
      <DecisionRecords
        projectId={projectId}
        onDecisionCreated={(decision) => {
          console.log('Decision created:', decision);
        }}
      />
    </Box>
  );
};

const ArchitectureMain: React.FC = () => {
  const [architecture, setArchitecture] = useState({
    nodes: [],
    edges: [],
    metadata: {
      version: '1.0',
      created: new Date().toISOString()
    }
  });

  return (
    <ArchitectureOverview
      architecture={architecture}
      onArchitectureChange={setArchitecture}
    />
  );
};

const TechnologyStackPage: React.FC = () => {
  return (
    <Box sx={{ height: '100vh' }}>
      <TechnologyStack
        requirements={{
          projectType: 'web',
          budget: 100000,
          timeline: 12,
          teamSize: 8,
          scalability: 4,
          security: 4
        }}
      />
    </Box>
  );
};

const CloudOptimizerPage: React.FC = () => {
  const [architecture] = useState({
    components: [
      { id: 'web', type: 'service', name: 'Web Application' },
      { id: 'api', type: 'service', name: 'API Gateway' },
      { id: 'db', type: 'database', name: 'Database' }
    ],
    connections: [
      { source: 'web', target: 'api' },
      { source: 'api', target: 'db' }
    ]
  });

  return (
    <Box sx={{ height: '100vh' }}>
      <CloudOptimizer
        architecture={architecture}
        onDeploymentGenerated={(deployment) => {
          console.log('Deployment generated:', deployment);
        }}
      />
    </Box>
  );
};

export const Architecture: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<ArchitectureMain />} />
      <Route path="/overview" element={<ArchitectureMain />} />
      <Route path="/patterns" element={<ArchitecturePatterns />} />
      <Route path="/decisions" element={<ArchitectureDecisions />} />
      <Route path="/technology" element={<TechnologyStackPage />} />
      <Route path="/cloud" element={<CloudOptimizerPage />} />
    </Routes>
  );
};