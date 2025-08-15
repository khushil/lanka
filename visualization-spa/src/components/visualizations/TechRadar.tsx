import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Button,
  ButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  Rating,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Remove,
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  FilterList,
  Refresh,
  Download,
  Info,
  Star,
  Warning,
  CheckCircle,
  Speed,
  Security,
  Build,
  Group,
  AttachMoney
} from '@mui/icons-material';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import { TechnologyStack, Technology } from '../../graphql/architecture';
import { VisualizationTheme } from '../../types/visualizations';

interface TechRadarProps {
  stacks: TechnologyStack[];
  theme: VisualizationTheme;
  viewMode: 'overview' | 'detailed';
  onTechnologySelect: (technology: Technology) => void;
}

interface RadarTechnology {
  id: string;
  name: string;
  ring: number; // 0-3 (Adopt, Trial, Assess, Hold)
  quadrant: number; // 0-3 (Languages & Frameworks, Tools, Platforms, Techniques)
  isNew: boolean;
  moved: number; // -1, 0, 1
  popularity: number;
  learningCurve: number;
  communitySupport: number;
  maintenance: number;
  description?: string;
  trend: 'up' | 'down' | 'stable';
  recommendation: string;
}

const RINGS = [
  { name: 'Adopt', color: '#0DBD0D', radius: 130 },
  { name: 'Trial', color: '#FFA500', radius: 220 },
  { name: 'Assess', color: '#FF4500', radius: 310 },
  { name: 'Hold', color: '#DC143C', radius: 400 }
];

const QUADRANTS = [
  { name: 'Languages & Frameworks', angle: 0 },
  { name: 'Tools', angle: 90 },
  { name: 'Platforms', angle: 180 },
  { name: 'Techniques', angle: 270 }
];

const TechRadar: React.FC<TechRadarProps> = ({
  stacks,
  theme,
  viewMode,
  onTechnologySelect
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedTechnology, setSelectedTechnology] = useState<RadarTechnology | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedQuadrant, setSelectedQuadrant] = useState<number | 'all'>('all');
  const [selectedRing, setSelectedRing] = useState<number | 'all'>('all');
  const [showTrends, setShowTrends] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Convert stacks to radar technologies
  const radarTechnologies = useMemo(() => {
    if (!stacks) return [];
    
    const technologies: RadarTechnology[] = [];
    
    stacks.forEach(stack => {
      stack.technologies?.forEach(tech => {
        // Determine ring based on popularity and community support
        let ring = 3; // Hold by default
        if (tech.popularity > 80 && tech.communitySupport > 80) ring = 0; // Adopt
        else if (tech.popularity > 60 && tech.communitySupport > 60) ring = 1; // Trial
        else if (tech.popularity > 40 || tech.communitySupport > 40) ring = 2; // Assess
        
        // Determine quadrant based on technology type
        let quadrant = 0;
        switch (tech.type.toLowerCase()) {
          case 'framework':
          case 'language':
          case 'library':
            quadrant = 0;
            break;
          case 'tool':
          case 'testing':
          case 'ci/cd':
            quadrant = 1;
            break;
          case 'platform':
          case 'cloud':
          case 'database':
            quadrant = 2;
            break;
          case 'technique':
          case 'methodology':
          case 'practice':
            quadrant = 3;
            break;
        }
        
        // Determine trend
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (tech.popularity > 70) trend = 'up';
        else if (tech.popularity < 30) trend = 'down';
        
        technologies.push({
          id: `${stack.id}-${tech.name}`,
          name: tech.name,
          ring,
          quadrant,
          isNew: tech.popularity > 75,
          moved: trend === 'up' ? 1 : trend === 'down' ? -1 : 0,
          popularity: tech.popularity,
          learningCurve: tech.learningCurve,
          communitySupport: tech.communitySupport,
          maintenance: tech.maintenance,
          trend,
          recommendation: ring === 0 ? 'Strongly recommended for adoption' :
                         ring === 1 ? 'Worth trying on a project' :
                         ring === 2 ? 'Assess for future use' :
                         'Proceed with caution'
        });
      });
    });
    
    return technologies;
  }, [stacks]);

  // Filter technologies
  const filteredTechnologies = useMemo(() => {
    return radarTechnologies.filter(tech => {
      const matchesQuadrant = selectedQuadrant === 'all' || tech.quadrant === selectedQuadrant;
      const matchesRing = selectedRing === 'all' || tech.ring === selectedRing;
      return matchesQuadrant && matchesRing;
    });
  }, [radarTechnologies, selectedQuadrant, selectedRing]);

  // Draw radar chart
  useEffect(() => {
    if (!svgRef.current || !filteredTechnologies.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const maxRadius = Math.min(centerX, centerY) - 50;

    // Create groups
    const g = svg.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    // Draw rings
    RINGS.forEach((ring, index) => {
      const radius = (ring.radius / 400) * maxRadius;
      
      g.append('circle')
        .attr('r', radius)
        .attr('fill', 'none')
        .attr('stroke', ring.color)
        .attr('stroke-width', 2)
        .attr('opacity', 0.3);
      
      // Ring labels
      g.append('text')
        .attr('x', 5)
        .attr('y', -radius + 15)
        .attr('fill', ring.color)
        .attr('font-size', 12)
        .attr('font-weight', 'bold')
        .text(ring.name);
    });

    // Draw quadrant lines
    g.append('line')
      .attr('x1', -maxRadius)
      .attr('y1', 0)
      .attr('x2', maxRadius)
      .attr('y2', 0)
      .attr('stroke', theme.border)
      .attr('stroke-width', 1);
    
    g.append('line')
      .attr('x1', 0)
      .attr('y1', -maxRadius)
      .attr('x2', 0)
      .attr('y2', maxRadius)
      .attr('stroke', theme.border)
      .attr('stroke-width', 1);

    // Quadrant labels
    QUADRANTS.forEach((quadrant, index) => {
      const angle = (quadrant.angle * Math.PI) / 180;
      const labelRadius = maxRadius + 20;
      const x = Math.cos(angle) * labelRadius;
      const y = Math.sin(angle) * labelRadius;
      
      g.append('text')
        .attr('x', x)
        .attr('y', y)
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .attr('fill', theme.text)
        .attr('font-size', 14)
        .attr('font-weight', 'bold')
        .text(quadrant.name);
    });

    // Position technologies in their quadrants
    const positionedTechnologies = filteredTechnologies.map(tech => {
      const ring = RINGS[tech.ring];
      const ringRadius = (ring.radius / 400) * maxRadius;
      const prevRingRadius = tech.ring > 0 ? (RINGS[tech.ring - 1].radius / 400) * maxRadius : 0;
      
      // Random position within ring and quadrant
      const minRadius = prevRingRadius + 10;
      const maxRingRadius = ringRadius - 10;
      const radius = minRadius + Math.random() * (maxRingRadius - minRadius);
      
      const quadrantAngle = QUADRANTS[tech.quadrant].angle;
      const angleRange = 85; // degrees
      const angle = ((quadrantAngle - angleRange / 2 + Math.random() * angleRange) * Math.PI) / 180;
      
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      return { ...tech, x, y };
    });

    // Draw technology points
    g.selectAll('.tech-point')
      .data(positionedTechnologies)
      .enter()
      .append('circle')
      .attr('class', 'tech-point')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', 6)
      .attr('fill', d => {
        if (d.isNew) return '#FFD700';
        switch (d.trend) {
          case 'up': return '#00FF00';
          case 'down': return '#FF0000';
          default: return RINGS[d.ring].color;
        }
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        setSelectedTechnology(d);
        setDialogOpen(true);
        onTechnologySelect({
          name: d.name,
          version: '1.0',
          type: 'technology',
          popularity: d.popularity,
          learningCurve: d.learningCurve,
          communitySupport: d.communitySupport,
          maintenance: d.maintenance,
          license: 'MIT'
        });
      })
      .on('mouseover', function(event, d) {
        d3.select(this).attr('r', 8);
        
        // Show tooltip
        const tooltip = g.append('g')
          .attr('class', 'tooltip')
          .attr('transform', `translate(${d.x + 10}, ${d.y - 10})`);
        
        const rect = tooltip.append('rect')
          .attr('fill', 'rgba(0, 0, 0, 0.8)')
          .attr('rx', 4)
          .attr('ry', 4);
        
        const text = tooltip.append('text')
          .attr('fill', 'white')
          .attr('font-size', 12)
          .attr('x', 5)
          .attr('y', 15)
          .text(d.name);
        
        const bbox = (text.node() as any).getBBox();
        rect.attr('width', bbox.width + 10)
            .attr('height', bbox.height + 10);
      })
      .on('mouseout', function(event, d) {
        d3.select(this).attr('r', 6);
        g.selectAll('.tooltip').remove();
      });

    // Draw trend indicators
    if (showTrends) {
      g.selectAll('.trend-indicator')
        .data(positionedTechnologies.filter(d => d.moved !== 0))
        .enter()
        .append('text')
        .attr('class', 'trend-indicator')
        .attr('x', d => d.x + 8)
        .attr('y', d => d.y - 8)
        .attr('fill', d => d.moved > 0 ? '#00FF00' : '#FF0000')
        .attr('font-size', 10)
        .text(d => d.moved > 0 ? '↑' : '↓');
    }

    // Legend for new technologies
    const legend = svg.append('g')
      .attr('transform', `translate(${dimensions.width - 150}, 30)`);
    
    legend.append('circle')
      .attr('cx', 10)
      .attr('cy', 10)
      .attr('r', 6)
      .attr('fill', '#FFD700')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);
    
    legend.append('text')
      .attr('x', 25)
      .attr('y', 15)
      .attr('fill', theme.text)
      .attr('font-size', 12)
      .text('New Technology');

  }, [filteredTechnologies, dimensions, theme, showTrends, onTechnologySelect]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current?.parentElement) {
        const rect = svgRef.current.parentElement.getBoundingClientRect();
        setDimensions({
          width: rect.width || 800,
          height: Math.min(rect.height || 600, rect.width || 800)
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp color="success" />;
      case 'down': return <TrendingDown color="error" />;
      default: return <Remove color="action" />;
    }
  };

  const getRingRecommendation = (ring: number) => {
    switch (ring) {
      case 0: return { icon: <CheckCircle color="success" />, text: 'Adopt' };
      case 1: return { icon: <Star color="warning" />, text: 'Trial' };
      case 2: return { icon: <Info color="info" />, text: 'Assess' };
      case 3: return { icon: <Warning color="error" />, text: 'Hold' };
      default: return { icon: <Info />, text: 'Unknown' };
    }
  };

  return (
    <Box>
      {/* Controls */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Quadrant</InputLabel>
              <Select
                value={selectedQuadrant}
                label="Quadrant"
                onChange={(e) => setSelectedQuadrant(e.target.value as any)}
              >
                <MenuItem value="all">All Quadrants</MenuItem>
                {QUADRANTS.map((quad, index) => (
                  <MenuItem key={index} value={index}>{quad.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Ring</InputLabel>
              <Select
                value={selectedRing}
                label="Ring"
                onChange={(e) => setSelectedRing(e.target.value as any)}
              >
                <MenuItem value="all">All Rings</MenuItem>
                {RINGS.map((ring, index) => (
                  <MenuItem key={index} value={index}>{ring.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button
                size="small"
                variant={showTrends ? 'contained' : 'outlined'}
                onClick={() => setShowTrends(!showTrends)}
                startIcon={<TrendingUp />}
              >
                Trends
              </Button>
              
              <Tooltip title="Refresh Data">
                <IconButton size="small">
                  <Refresh />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Download">
                <IconButton size="small">
                  <Download />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* Radar Chart */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={2} sx={{ p: 2, height: '600px' }}>
            <Typography variant="h6" gutterBottom>
              Technology Radar
            </Typography>
            <Box sx={{ width: '100%', height: '90%' }}>
              <svg
                ref={svgRef}
                width="100%"
                height="100%"
                viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                style={{ background: theme.background }}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Technology List */}
        <Grid item xs={12} lg={4}>
          <Paper elevation={2} sx={{ p: 2, height: '600px', overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Technologies ({filteredTechnologies.length})
            </Typography>
            
            <List>
              {filteredTechnologies.map((tech) => {
                const recommendation = getRingRecommendation(tech.ring);
                return (
                  <ListItem
                    key={tech.id}
                    button
                    onClick={() => {
                      setSelectedTechnology(tech);
                      setDialogOpen(true);
                    }}
                    sx={{ mb: 1, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    <ListItemIcon>
                      {recommendation.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {tech.name}
                          {tech.isNew && (
                            <Chip label="New" size="small" color="warning" />
                          )}
                          {getTrendIcon(tech.trend)}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            {QUADRANTS[tech.quadrant].name} • {RINGS[tech.ring].name}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={tech.popularity}
                            size="small"
                            sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          </Paper>
        </Grid>

        {/* Summary Cards */}
        {viewMode === 'detailed' && (
          <Grid item xs={12}>
            <Grid container spacing={2}>
              {RINGS.map((ring, index) => {
                const count = filteredTechnologies.filter(t => t.ring === index).length;
                return (
                  <Grid item xs={12} sm={6} md={3} key={index}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card sx={{ textAlign: 'center' }}>
                        <CardContent>
                          <Typography variant="h4" color={ring.color} gutterBottom>
                            {count}
                          </Typography>
                          <Typography variant="h6" gutterBottom>
                            {ring.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Technologies in this ring
                          </Typography>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                );
              })}
            </Grid>
          </Grid>
        )}
      </Grid>

      {/* Technology Detail Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {selectedTechnology && getRingRecommendation(selectedTechnology.ring).icon}
            <Box>
              <Typography variant="h5">{selectedTechnology?.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedTechnology && QUADRANTS[selectedTechnology.quadrant].name} • 
                {selectedTechnology && RINGS[selectedTechnology.ring].name}
              </Typography>
            </Box>
            <Box sx={{ ml: 'auto' }}>
              {selectedTechnology && getTrendIcon(selectedTechnology.trend)}
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {selectedTechnology && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Recommendation
                </Typography>
                <Typography variant="body1" paragraph>
                  {selectedTechnology.recommendation}
                </Typography>
                
                <Typography variant="h6" gutterBottom>
                  Metrics
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Popularity</Typography>
                    <Typography variant="body2">{selectedTechnology.popularity}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={selectedTechnology.popularity}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Community Support</Typography>
                    <Typography variant="body2">{selectedTechnology.communitySupport}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={selectedTechnology.communitySupport}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Learning Curve</Typography>
                    <Typography variant="body2">{selectedTechnology.learningCurve}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={100 - selectedTechnology.learningCurve}
                    color={selectedTechnology.learningCurve > 70 ? 'error' : selectedTechnology.learningCurve > 40 ? 'warning' : 'success'}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Assessment
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon><Speed color="primary" /></ListItemIcon>
                    <ListItemText 
                      primary="Performance"
                      secondary={selectedTechnology.popularity > 70 ? 'Excellent' : selectedTechnology.popularity > 40 ? 'Good' : 'Fair'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Group color="primary" /></ListItemIcon>
                    <ListItemText 
                      primary="Community"
                      secondary={selectedTechnology.communitySupport > 70 ? 'Very Active' : selectedTechnology.communitySupport > 40 ? 'Active' : 'Limited'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Build color="primary" /></ListItemIcon>
                    <ListItemText 
                      primary="Maintenance"
                      secondary={selectedTechnology.maintenance > 70 ? 'Well Maintained' : selectedTechnology.maintenance > 40 ? 'Adequate' : 'Concerns'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Security color="primary" /></ListItemIcon>
                    <ListItemText 
                      primary="Maturity"
                      secondary={selectedTechnology.ring < 2 ? 'Mature' : 'Emerging'}
                    />
                  </ListItem>
                </List>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
          <Button variant="contained" startIcon={<Info />}>
            More Details
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TechRadar;