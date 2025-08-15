import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  ButtonGroup,
  Button,
  Tooltip,
  IconButton,
  Switch,
  FormControlLabel,
  Chip,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Architecture,
  Cloud,
  DeviceHub,
  Timeline,
  GridView,
  Code,
  Visibility,
  VisibilityOff,
  Download,
  Share,
  Refresh,
  Settings
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useArchitectureData } from '../hooks/useArchitectureData';
import ArchitectureCanvas from '../components/visualizations/ArchitectureCanvas';
import CloudCostVisualizer from '../components/visualizations/CloudCostVisualizer';
import DecisionFlowDiagram from '../components/visualizations/DecisionFlowDiagram';
import PatternGrid from '../components/visualizations/PatternGrid';
import TechRadar from '../components/visualizations/TechRadar';

// Type definitions
interface VisualizationTheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
}

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
      id={`architecture-tabpanel-${index}`}
      aria-labelledby={`architecture-tab-${index}`}
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

const architectureTheme: VisualizationTheme = {
  primary: '#1976d2',
  secondary: '#dc004e',
  accent: '#00bcd4',
  background: '#fafafa',
  surface: '#ffffff',
  text: '#212121',
  textSecondary: '#757575',
  border: '#e0e0e0'
};

const ArchitectureVisual: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [showMetrics, setShowMetrics] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
  
  const {
    patterns,
    stacks,
    decisions,
    cloudRecommendations,
    loading,
    error,
    refreshData
  } = useArchitectureData();

  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);

  const handleRefresh = useCallback(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        refreshData();
      }, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshData]);

  const tabsData = [
    {
      label: 'Architecture Canvas',
      icon: <Architecture />,
      description: 'Interactive architecture design and visualization'
    },
    {
      label: 'Cloud Cost Analysis',
      icon: <Cloud />,
      description: 'Multi-cloud cost optimization and comparison'
    },
    {
      label: 'Decision Flow',
      icon: <DeviceHub />,
      description: 'Architecture decision records and flow diagrams'
    },
    {
      label: 'Pattern Library',
      icon: <GridView />,
      description: 'Visual pattern library with examples and metrics'
    },
    {
      label: 'Technology Radar',
      icon: <Timeline />,
      description: 'Technology stack analysis and recommendations'
    }
  ];

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={handleRefresh}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Architecture Visual Deep-Dive
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Interactive visualization of architectural patterns, decisions, and cost analysis
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showMetrics}
                  onChange={(e) => setShowMetrics(e.target.checked)}
                  size="small"
                />
              }
              label="Show Metrics"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  size="small"
                />
              }
              label="Auto Refresh"
            />
            
            <ButtonGroup variant="outlined" size="small">
              <Button
                variant={viewMode === 'overview' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('overview')}
              >
                Overview
              </Button>
              <Button
                variant={viewMode === 'detailed' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('detailed')}
              >
                Detailed
              </Button>
            </ButtonGroup>
            
            <Tooltip title="Refresh Data">
              <IconButton onClick={handleRefresh} disabled={loading}>
                <Refresh sx={{ transform: loading ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Export Data">
              <IconButton>
                <Download />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Share View">
              <IconButton>
                <Share />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        {loading && <LinearProgress />}
      </Paper>

      {/* Metrics Overview */}
      <AnimatePresence>
        {showMetrics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Architecture sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">Patterns</Typography>
                    </Box>
                    <Typography variant="h4" color="primary">
                      {patterns?.length || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Available patterns
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Cloud sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">Cloud Providers</Typography>
                    </Box>
                    <Typography variant="h4" color="primary">
                      {cloudRecommendations?.length || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Analyzed providers
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <DeviceHub sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">Decisions</Typography>
                    </Box>
                    <Typography variant="h4" color="primary">
                      {decisions?.length || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Architecture decisions
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Code sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">Tech Stacks</Typography>
                    </Box>
                    <Typography variant="h4" color="primary">
                      {stacks?.length || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Technology stacks
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs Navigation */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {tabsData.map((tab, index) => (
            <Tab
              key={index}
              icon={tab.icon}
              label={tab.label}
              iconPosition="start"
              sx={{ minHeight: 72, textTransform: 'none' }}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <TabPanel value={activeTab} index={0}>
            <ArchitectureCanvas
              patterns={patterns}
              theme={architectureTheme}
              viewMode={viewMode}
              onPatternSelect={(pattern) => {
                console.log('Pattern selected:', pattern);
              }}
            />
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <CloudCostVisualizer
              recommendations={cloudRecommendations}
              theme={architectureTheme}
              viewMode={viewMode}
              onProviderSelect={(provider) => {
                console.log('Provider selected:', provider);
              }}
            />
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <DecisionFlowDiagram
              decisions={decisions}
              theme={architectureTheme}
              viewMode={viewMode}
              onDecisionSelect={(decision) => {
                console.log('Decision selected:', decision);
              }}
            />
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            <PatternGrid
              patterns={patterns}
              theme={architectureTheme}
              viewMode={viewMode}
              onPatternClick={(pattern) => {
                console.log('Pattern clicked:', pattern);
              }}
            />
          </TabPanel>

          <TabPanel value={activeTab} index={4}>
            <TechRadar
              stacks={stacks}
              theme={architectureTheme}
              viewMode={viewMode}
              onTechnologySelect={(technology) => {
                console.log('Technology selected:', technology);
              }}
            />
          </TabPanel>
        </motion.div>
      </AnimatePresence>

      {/* Footer */}
      <Paper elevation={1} sx={{ mt: 4, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Last updated: {new Date().toLocaleString()}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label="Real-time"
              size="small"
              color={autoRefresh ? 'success' : 'default'}
              variant={autoRefresh ? 'filled' : 'outlined'}
            />
            <Chip
              label={`${patterns?.length || 0} Patterns`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`${stacks?.length || 0} Stacks`}
              size="small"
              variant="outlined"
            />
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default ArchitectureVisual;