import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ButtonGroup,
  Paper,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Rating,
  LinearProgress,
  Tabs,
  Tab,
  Divider,
  Badge
} from '@mui/material';
import {
  Search,
  FilterList,
  ViewModule,
  ViewList,
  Favorite,
  FavoriteBorder,
  Share,
  Code,
  Architecture,
  Cloud,
  Security,
  Speed,
  Storage,
  TrendingUp,
  People,
  Business,
  Star,
  Visibility,
  ThumbUp,
  BookmarkBorder,
  Bookmark
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { VisualizationTheme } from '../../types/visualizations';

// Mock type definition
interface ArchitecturePattern {
  id: string;
  name: string;
  description: string;
  category: string;
  complexity: number;
  usageCount: number;
  successRate: number;
  metrics: {
    performance: number;
    scalability: number;
    maintainability: number;
    security: number;
  };
  components: any[];
  connections: any[];
  benefits: string[];
  tradeoffs: string[];
  examples: any[];
}

interface PatternGridProps {
  patterns: ArchitecturePattern[];
  theme: VisualizationTheme;
  viewMode: 'overview' | 'detailed';
  onPatternClick: (pattern: ArchitecturePattern) => void;
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
      id={`pattern-tabpanel-${index}`}
      aria-labelledby={`pattern-tab-${index}`}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

const PatternGrid: React.FC<PatternGridProps> = ({
  patterns,
  theme,
  viewMode,
  onPatternClick
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'popularity' | 'complexity' | 'success'>('popularity');
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [selectedPattern, setSelectedPattern] = useState<ArchitecturePattern | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [favoritePatterns, setFavoritePatterns] = useState<Set<string>>(new Set());
  const [bookmarkedPatterns, setBookmarkedPatterns] = useState<Set<string>>(new Set());

  // Filter and sort patterns
  const filteredPatterns = useMemo(() => {
    if (!patterns) return [];
    
    let filtered = patterns.filter(pattern => {
      const matchesSearch = pattern.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           pattern.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           pattern.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || pattern.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Sort patterns
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'popularity':
          return (b.usageCount || 0) - (a.usageCount || 0);
        case 'complexity':
          return a.complexity - b.complexity;
        case 'success':
          return (b.successRate || 0) - (a.successRate || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [patterns, searchTerm, selectedCategory, sortBy]);

  // Get unique categories
  const categories = useMemo(() => {
    if (!patterns) return [];
    const cats = [...new Set(patterns.map(p => p.category))];
    return ['all', ...cats];
  }, [patterns]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'microservices':
        return <Architecture />;
      case 'serverless':
        return <Cloud />;
      case 'security':
        return <Security />;
      case 'performance':
        return <Speed />;
      case 'data':
        return <Storage />;
      default:
        return <Architecture />;
    }
  };

  const getMetricColor = (value: number) => {
    if (value >= 80) return 'success';
    if (value >= 60) return 'warning';
    return 'error';
  };

  const handlePatternClick = useCallback((pattern: ArchitecturePattern) => {
    setSelectedPattern(pattern);
    setDialogOpen(true);
    onPatternClick(pattern);
  }, [onPatternClick]);

  const handleFavoriteToggle = useCallback((patternId: string) => {
    setFavoritePatterns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(patternId)) {
        newSet.delete(patternId);
      } else {
        newSet.add(patternId);
      }
      return newSet;
    });
  }, []);

  const handleBookmarkToggle = useCallback((patternId: string) => {
    setBookmarkedPatterns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(patternId)) {
        newSet.delete(patternId);
      } else {
        newSet.add(patternId);
      }
      return newSet;
    });
  }, []);

  const PatternCard = ({ pattern }: { pattern: ArchitecturePattern }) => {
    const isFavorite = favoritePatterns.has(pattern.id);
    const isBookmarked = bookmarkedPatterns.has(pattern.id);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        whileHover={{ y: -4 }}
      >
        <Card 
          sx={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: 6,
              borderColor: theme.primary
            }
          }}
          onClick={() => handlePatternClick(pattern)}
        >
          <CardContent sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ bgcolor: theme.primary, width: 40, height: 40 }}>
                  {getCategoryIcon(pattern.category)}
                </Avatar>
                <Box>
                  <Typography variant="h6" component="h3">
                    {pattern.name}
                  </Typography>
                  <Chip 
                    label={pattern.category} 
                    size="small" 
                    variant="outlined"
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton 
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFavoriteToggle(pattern.id);
                  }}
                >
                  {isFavorite ? <Favorite color="error" /> : <FavoriteBorder />}
                </IconButton>
                <IconButton 
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBookmarkToggle(pattern.id);
                  }}
                >
                  {isBookmarked ? <Bookmark color="primary" /> : <BookmarkBorder />}
                </IconButton>
              </Box>
            </Box>

            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {pattern.description}
            </Typography>

            {/* Metrics */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption">Performance</Typography>
                <Typography variant="caption">{pattern.metrics.performance}%</Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={pattern.metrics.performance} 
                color={getMetricColor(pattern.metrics.performance)}
                sx={{ height: 4, borderRadius: 2, mb: 1 }}
              />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption">Scalability</Typography>
                <Typography variant="caption">{pattern.metrics.scalability}%</Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={pattern.metrics.scalability} 
                color={getMetricColor(pattern.metrics.scalability)}
                sx={{ height: 4, borderRadius: 2 }}
              />
            </Box>

            {/* Tags */}
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
              {pattern.tags.slice(0, 3).map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  variant="filled"
                  sx={{ fontSize: '0.7rem' }}
                />
              ))}
              {pattern.tags.length > 3 && (
                <Chip
                  label={`+${pattern.tags.length - 3}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              )}
            </Box>

            {/* Stats */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ThumbUp fontSize="small" color="action" />
                <Typography variant="caption">{pattern.successRate}%</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <People fontSize="small" color="action" />
                <Typography variant="caption">{pattern.usageCount} uses</Typography>
              </Box>
              <Rating 
                value={pattern.complexity / 2} 
                max={5} 
                size="small" 
                readOnly 
                precision={0.5}
              />
            </Box>
          </CardContent>

          <CardActions>
            <Button size="small" startIcon={<Visibility />}>
              View Details
            </Button>
            <Button size="small" startIcon={<Code />}>
              Examples
            </Button>
            <Button size="small" startIcon={<Share />}>
              Share
            </Button>
          </CardActions>
        </Card>
      </motion.div>
    );
  };

  const PatternListItem = ({ pattern }: { pattern: ArchitecturePattern }) => {
    const isFavorite = favoritePatterns.has(pattern.id);
    const isBookmarked = bookmarkedPatterns.has(pattern.id);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
      >
        <Card 
          sx={{ 
            mb: 2,
            cursor: 'pointer',
            '&:hover': { boxShadow: 3 }
          }}
          onClick={() => handlePatternClick(pattern)}
        >
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: theme.primary }}>
                    {getCategoryIcon(pattern.category)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{pattern.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {pattern.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                      <Chip label={pattern.category} size="small" />
                      {pattern.tags.slice(0, 2).map((tag, index) => (
                        <Chip key={index} label={tag} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  <Box>
                    <Typography variant="caption" display="block">Performance</Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={pattern.metrics.performance} 
                      color={getMetricColor(pattern.metrics.performance)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" display="block">Scalability</Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={pattern.metrics.scalability} 
                      color={getMetricColor(pattern.metrics.scalability)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6">{pattern.successRate}%</Typography>
                    <Typography variant="caption">Success</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6">{pattern.usageCount}</Typography>
                    <Typography variant="caption">Uses</Typography>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={1}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <IconButton 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFavoriteToggle(pattern.id);
                    }}
                  >
                    {isFavorite ? <Favorite color="error" /> : <FavoriteBorder />}
                  </IconButton>
                  <IconButton 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBookmarkToggle(pattern.id);
                    }}
                  >
                    {isBookmarked ? <Bookmark color="primary" /> : <BookmarkBorder />}
                  </IconButton>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <Box>
      {/* Controls */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search patterns, tags, or descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <MenuItem value="popularity">Popularity</MenuItem>
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="complexity">Complexity</MenuItem>
                <MenuItem value="success">Success Rate</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <ButtonGroup size="small">
                <Button
                  variant={viewType === 'grid' ? 'contained' : 'outlined'}
                  onClick={() => setViewType('grid')}
                  startIcon={<ViewModule />}
                >
                  Grid
                </Button>
                <Button
                  variant={viewType === 'list' ? 'contained' : 'outlined'}
                  onClick={() => setViewType('list')}
                  startIcon={<ViewList />}
                >
                  List
                </Button>
              </ButtonGroup>
              
              <Tooltip title="Favorites">
                <IconButton size="small">
                  <Badge badgeContent={favoritePatterns.size} color="error">
                    <Favorite />
                  </Badge>
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Bookmarks">
                <IconButton size="small">
                  <Badge badgeContent={bookmarkedPatterns.size} color="primary">
                    <Bookmark />
                  </Badge>
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Results Count */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredPatterns.length} of {patterns?.length || 0} patterns
        </Typography>
      </Box>

      {/* Pattern Display */}
      <AnimatePresence mode="wait">
        {viewType === 'grid' ? (
          <Grid container spacing={3}>
            {filteredPatterns.map((pattern) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={pattern.id}>
                <PatternCard pattern={pattern} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box>
            {filteredPatterns.map((pattern) => (
              <PatternListItem key={pattern.id} pattern={pattern} />
            ))}
          </Box>
        )}
      </AnimatePresence>

      {/* Pattern Detail Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: theme.primary }}>
              {selectedPattern && getCategoryIcon(selectedPattern.category)}
            </Avatar>
            <Box>
              <Typography variant="h5">{selectedPattern?.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedPattern?.category} • Complexity: {selectedPattern?.complexity}/10
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {selectedPattern && (
            <Box>
              <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                <Tab label="Overview" />
                <Tab label="Implementation" />
                <Tab label="Examples" />
                <Tab label="Metrics" />
              </Tabs>
              
              <TabPanel value={activeTab} index={0}>
                <Typography variant="body1" paragraph>
                  {selectedPattern.description}
                </Typography>
                
                <Typography variant="h6" gutterBottom>
                  Benefits
                </Typography>
                <List>
                  {selectedPattern.benefits?.map((benefit, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Star color="success" />
                      </ListItemIcon>
                      <ListItemText primary={benefit} />
                    </ListItem>
                  ))}
                </List>
                
                <Typography variant="h6" gutterBottom>
                  Trade-offs
                </Typography>
                <List>
                  {selectedPattern.tradeoffs?.map((tradeoff, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Security color="warning" />
                      </ListItemIcon>
                      <ListItemText primary={tradeoff} />
                    </ListItem>
                  ))}
                </List>
              </TabPanel>
              
              <TabPanel value={activeTab} index={1}>
                <Typography variant="h6" gutterBottom>
                  Components
                </Typography>
                <Grid container spacing={2}>
                  {selectedPattern.components?.map((component, index) => (
                    <Grid item xs={12} md={6} key={index}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1">{component.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Type: {component.type}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </TabPanel>
              
              <TabPanel value={activeTab} index={2}>
                <Typography variant="h6" gutterBottom>
                  Real-world Examples
                </Typography>
                {selectedPattern.examples?.map((example, index) => (
                  <Card key={index} sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle1">{example.company}</Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {example.useCase}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Outcome:</strong> {example.outcome}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </TabPanel>
              
              <TabPanel value={activeTab} index={3}>
                <Grid container spacing={3}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Performance
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={selectedPattern.metrics.performance}
                      color={getMetricColor(selectedPattern.metrics.performance)}
                      sx={{ height: 8, borderRadius: 4, mb: 1 }}
                    />
                    <Typography variant="body2">
                      {selectedPattern.metrics.performance}%
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Scalability
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={selectedPattern.metrics.scalability}
                      color={getMetricColor(selectedPattern.metrics.scalability)}
                      sx={{ height: 8, borderRadius: 4, mb: 1 }}
                    />
                    <Typography variant="body2">
                      {selectedPattern.metrics.scalability}%
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Maintainability
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={selectedPattern.metrics.maintainability}
                      color={getMetricColor(selectedPattern.metrics.maintainability)}
                      sx={{ height: 8, borderRadius: 4, mb: 1 }}
                    />
                    <Typography variant="body2">
                      {selectedPattern.metrics.maintainability}%
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Security
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={selectedPattern.metrics.security}
                      color={getMetricColor(selectedPattern.metrics.security)}
                      sx={{ height: 8, borderRadius: 4, mb: 1 }}
                    />
                    <Typography variant="body2">
                      {selectedPattern.metrics.security}%
                    </Typography>
                  </Grid>
                </Grid>
              </TabPanel>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
          <Button variant="contained" startIcon={<Code />}>
            View Implementation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PatternGrid;