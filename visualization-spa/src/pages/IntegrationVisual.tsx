import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  IconButton,
  Switch,
  FormControlLabel,
  Tooltip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  AccountTree,
  DeviceHub,
  Timeline,
  Dashboard,
  Memory,
  Refresh,
  Fullscreen,
  Settings,
  PlayArrow,
  Pause,
  Speed,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import SystemFlowDiagram from '../components/visualizations/SystemFlowDiagram';
import DataFlowAnimation from '../components/visualizations/DataFlowAnimation';
import DependencyGraph from '../components/visualizations/DependencyGraph';
import IntegrationHealth from '../components/visualizations/IntegrationHealth';
import KnowledgeGraph from '../components/visualizations/KnowledgeGraph';
import VisualNavigation from '../components/navigation/VisualNavigation';
import { useVisualizationData } from '../hooks/useVisualizationData';

// Mock WebSocket hook
const useWebSocket = (endpoint: string) => {
  const [isConnected, setIsConnected] = React.useState(false);
  const [lastMessage, setLastMessage] = React.useState<any>(null);

  React.useEffect(() => {
    // Simulate connection
    const timer = setTimeout(() => setIsConnected(true), 1000);
    const messageTimer = setInterval(() => {
      setLastMessage({ timestamp: Date.now(), data: 'mock update' });
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearInterval(messageTimer);
    };
  }, []);

  return { isConnected, lastMessage };
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`integration-tabpanel-${index}`}
      aria-labelledby={`integration-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const IntegrationVisual: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [showDetails, setShowDetails] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    systemData,
    dataFlowMetrics,
    dependencyData,
    healthMetrics,
    knowledgeGraphData,
    loading,
    error,
    refetch
  } = useVisualizationData();

  const { isConnected, lastMessage } = useWebSocket('/integration-updates');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const toggleAnimation = () => {
    setIsAnimating(!isAnimating);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Real-time updates
  useEffect(() => {
    if (lastMessage) {
      // Handle real-time updates from WebSocket
      console.log('Real-time integration update:', lastMessage);
    }
  }, [lastMessage]);

  const tabsConfig = [
    {
      label: 'System Flow',
      icon: <AccountTree />,
      component: (
        <SystemFlowDiagram
          data={systemData}
          isAnimating={isAnimating}
          viewMode={viewMode}
          animationSpeed={animationSpeed}
          showDetails={showDetails}
        />
      )
    },
    {
      label: 'Data Flow',
      icon: <Timeline />,
      component: (
        <DataFlowAnimation
          metrics={dataFlowMetrics}
          isAnimating={isAnimating}
          animationSpeed={animationSpeed}
          showDetails={showDetails}
        />
      )
    },
    {
      label: 'Dependencies',
      icon: <DeviceHub />,
      component: (
        <DependencyGraph
          data={dependencyData}
          viewMode={viewMode}
          showDetails={showDetails}
        />
      )
    },
    {
      label: 'Health Monitor',
      icon: <Dashboard />,
      component: (
        <IntegrationHealth
          metrics={healthMetrics}
          isConnected={isConnected}
          showDetails={showDetails}
        />
      )
    },
    {
      label: 'Knowledge Graph',
      icon: <Memory />,
      component: (
        <KnowledgeGraph
          data={knowledgeGraphData}
          viewMode={viewMode}
          showDetails={showDetails}
        />
      )
    }
  ];

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
        flexDirection="column"
        gap={2}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="textSecondary">
          Loading Integration Visualizations...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" action={
          <IconButton onClick={handleRefresh} size="small">
            <Refresh />
          </IconButton>
        }>
          Failed to load visualization data: {error.message}
        </Alert>
      </Container>
    );
  }

  return (
    <Container 
      ref={containerRef}
      maxWidth={fullscreen ? false : "xl"} 
      sx={{ 
        py: fullscreen ? 0 : 4,
        height: fullscreen ? '100vh' : 'auto',
        overflow: fullscreen ? 'hidden' : 'auto'
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h4" component="h1" gutterBottom>
                System Integration Visualizations
              </Typography>
              <Typography variant="subtitle1" color="textSecondary">
                Interactive 3D visualization of Lanka platform system architecture
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box display="flex" justifyContent="flex-end" gap={1} flexWrap="wrap">
                <Chip
                  icon={isConnected ? <DeviceHub /> : <DeviceHub color="disabled" />}
                  label={isConnected ? 'Real-time Connected' : 'Offline'}
                  color={isConnected ? 'success' : 'default'}
                  variant="outlined"
                />
                
                <Tooltip title="Toggle Animation">
                  <IconButton onClick={toggleAnimation} color={isAnimating ? 'primary' : 'default'}>
                    {isAnimating ? <Pause /> : <PlayArrow />}
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Refresh Data">
                  <IconButton onClick={handleRefresh}>
                    <Refresh />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title={fullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}>
                  <IconButton onClick={toggleFullscreen}>
                    <Fullscreen />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Settings">
                  <IconButton 
                    onClick={() => setShowSettings(!showSettings)}
                    color={showSettings ? 'primary' : 'default'}
                  >
                    <Settings />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Visualization Settings
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={viewMode === '3d'}
                          onChange={(e) => setViewMode(e.target.checked ? '3d' : '2d')}
                        />
                      }
                      label="3D View Mode"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={showDetails}
                          onChange={(e) => setShowDetails(e.target.checked)}
                          icon={<VisibilityOff />}
                          checkedIcon={<Visibility />}
                        />
                      }
                      label="Show Details"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="body2" gutterBottom>
                        Animation Speed
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Speed fontSize="small" />
                        <input
                          type="range"
                          min="0.1"
                          max="3"
                          step="0.1"
                          value={animationSpeed}
                          onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                          style={{ flex: 1 }}
                        />
                        <Typography variant="body2">
                          {animationSpeed}x
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Visual Navigation */}
        <VisualNavigation
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          fullscreen={fullscreen}
        />

        {/* Main Visualization Tabs */}
        <Paper sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  minHeight: 72,
                  textTransform: 'none',
                  fontSize: '1rem'
                }
              }}
            >
              {tabsConfig.map((tab, index) => (
                <Tab
                  key={index}
                  icon={tab.icon}
                  label={tab.label}
                  iconPosition="start"
                  sx={{ gap: 1 }}
                />
              ))}
            </Tabs>
          </Box>

          {/* Tab Panels */}
          {tabsConfig.map((tab, index) => (
            <TabPanel key={index} value={currentTab} index={index}>
              <Box
                sx={{
                  height: fullscreen ? 'calc(100vh - 200px)' : '70vh',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 1
                }}
              >
                {tab.component}
              </Box>
            </TabPanel>
          ))}
        </Paper>

        {/* Footer Stats */}
        {!fullscreen && (
          <Box sx={{ mt: 4 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="primary">
                      {systemData?.modules?.length || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Active Modules
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="success.main">
                      {dependencyData?.edges?.length || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Dependencies
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="info.main">
                      {Math.round(healthMetrics?.overallHealth || 0)}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      System Health
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="warning.main">
                      {dataFlowMetrics?.throughput || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Data Throughput
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </motion.div>
    </Container>
  );
};

export default IntegrationVisual;