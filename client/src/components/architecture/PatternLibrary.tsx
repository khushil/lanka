import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  TextField,
  Button,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tabs,
  Tab,
  Rating,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Divider,
  Avatar,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemIcon,
  Tooltip,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Apply as ApplyIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Visibility as VisibilityIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  FilterList as FilterIcon,
  Architecture as ArchitectureIcon,
  Security as SecurityIcon,
  Speed as PerformanceIcon,
  Storage as DataIcon,
  Cloud as CloudIcon,
  Api as ApiIcon,
  Business as BusinessIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import { GET_ARCHITECTURE_PATTERNS, CREATE_ARCHITECTURE_PATTERN } from '../../graphql/architecture';
import type { ArchitecturePattern } from '../../graphql/architecture';

interface PatternLibraryProps {
  onApplyPattern: (pattern: ArchitecturePattern) => void;
  onPatternSelect?: (pattern: ArchitecturePattern) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index} style={{ height: '100%' }}>
      {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
    </div>
  );
};

const PatternCard: React.FC<{
  pattern: ArchitecturePattern;
  onApply: () => void;
  onView: () => void;
  onFavorite: () => void;
  isFavorited: boolean;
}> = ({ pattern, onApply, onView, onFavorite, isFavorited }) => {
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'microservices': return <ApiIcon />;
      case 'security': return <SecurityIcon />;
      case 'data': return <DataIcon />;
      case 'cloud': return <CloudIcon />;
      case 'performance': return <PerformanceIcon />;
      default: return <ArchitectureIcon />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'microservices': return 'primary';
      case 'security': return 'error';
      case 'data': return 'info';
      case 'cloud': return 'success';
      case 'performance': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          boxShadow: 4,
          transform: 'translateY(-2px)'
        },
        transition: 'all 0.3s ease'
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: `${getCategoryColor(pattern.category)}.main`,
              mr: 2,
              width: 40,
              height: 40
            }}
          >
            {getCategoryIcon(pattern.category)}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              {pattern.name}
            </Typography>
            <Chip
              label={pattern.category}
              size="small"
              color={getCategoryColor(pattern.category) as any}
            />
          </Box>
          <IconButton onClick={onFavorite} size="small">
            {isFavorited ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
          </IconButton>
        </Box>

        <Typography variant="body2" color="textSecondary" paragraph>
          {pattern.description}
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" sx={{ mr: 1 }}>
              Success Rate:
            </Typography>
            <Rating
              value={pattern.successRate / 20}
              precision={0.1}
              size="small"
              readOnly
            />
            <Typography variant="body2" sx={{ ml: 1 }}>
              {pattern.successRate}%
            </Typography>
          </Box>
          
          <LinearProgress
            variant="determinate"
            value={pattern.successRate}
            sx={{ mb: 1, height: 6, borderRadius: 3 }}
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="textSecondary">
              Used {pattern.usageCount} times
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Complexity: {pattern.complexity}/5
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          {pattern.tags.slice(0, 3).map((tag, index) => (
            <Chip
              key={index}
              label={tag}
              size="small"
              variant="outlined"
              sx={{ mr: 0.5, mb: 0.5 }}
            />
          ))}
          {pattern.tags.length > 3 && (
            <Typography variant="caption" color="textSecondary">
              +{pattern.tags.length - 3} more
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            icon={<PerformanceIcon />}
            label={pattern.metrics.performance}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip
            icon={<TrendingUpIcon />}
            label={pattern.metrics.scalability}
            size="small"
            color="success"
            variant="outlined"
          />
          <Chip
            icon={<SecurityIcon />}
            label={pattern.metrics.security}
            size="small"
            color="error"
            variant="outlined"
          />
        </Box>
      </CardContent>
      
      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Button
          startIcon={<VisibilityIcon />}
          onClick={onView}
          size="small"
        >
          View Details
        </Button>
        <Button
          variant="contained"
          startIcon={<ApplyIcon />}
          onClick={onApply}
          size="small"
        >
          Apply Pattern
        </Button>
      </CardActions>
    </Card>
  );
};

export const PatternLibrary: React.FC<PatternLibraryProps> = ({
  onApplyPattern,
  onPatternSelect
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('popularity');
  const [selectedPattern, setSelectedPattern] = useState<ArchitecturePattern | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [createPatternOpen, setCreatePatternOpen] = useState(false);
  const [newPattern, setNewPattern] = useState({
    name: '',
    description: '',
    category: 'microservices',
    tags: [] as string[],
    components: [],
    connections: []
  });

  const { data, loading, error, refetch } = useQuery(GET_ARCHITECTURE_PATTERNS, {
    variables: {
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      tags: selectedTags.length > 0 ? selectedTags : undefined
    }
  });

  const [createPattern] = useMutation(CREATE_ARCHITECTURE_PATTERN, {
    onCompleted: () => {
      setCreatePatternOpen(false);
      setNewPattern({
        name: '',
        description: '',
        category: 'microservices',
        tags: [],
        components: [],
        connections: []
      });
      refetch();
    }
  });

  const patterns: ArchitecturePattern[] = data?.architecturePatterns || [];
  const categories = ['all', ...Array.from(new Set(patterns.map(p => p.category)))];
  const allTags = Array.from(new Set(patterns.flatMap(p => p.tags)));

  const filteredPatterns = patterns.filter(pattern => {
    const matchesSearch = pattern.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pattern.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || pattern.category === selectedCategory;
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.some(tag => pattern.tags.includes(tag));
    return matchesSearch && matchesCategory && matchesTags;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'popularity':
        return b.usageCount - a.usageCount;
      case 'success':
        return b.successRate - a.successRate;
      case 'name':
        return a.name.localeCompare(b.name);
      case 'complexity':
        return a.complexity - b.complexity;
      default:
        return 0;
    }
  });

  const favoritePatterns = patterns.filter(p => favorites.includes(p.id));

  const handleApplyPattern = (pattern: ArchitecturePattern) => {
    onApplyPattern(pattern);
    if (onPatternSelect) {
      onPatternSelect(pattern);
    }
  };

  const handleViewDetails = (pattern: ArchitecturePattern) => {
    setSelectedPattern(pattern);
    setDetailsOpen(true);
  };

  const handleFavorite = (patternId: string) => {
    setFavorites(prev => 
      prev.includes(patternId) 
        ? prev.filter(id => id !== patternId)
        : [...prev, patternId]
    );
  };

  const handleCreatePattern = () => {
    createPattern({
      variables: {
        input: {
          ...newPattern,
          complexity: 1,
          components: [],
          connections: [],
          benefits: [],
          tradeoffs: [],
          examples: []
        }
      }
    });
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading patterns...</Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error loading patterns: {error.message}
      </Alert>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(_, value) => setTabValue(value)}>
          <Tab label={`All Patterns (${patterns.length})`} />
          <Tab label={`Favorites (${favoritePatterns.length})`} />
          <Tab label="Browse by Category" />
          <Tab label="Metrics & Analytics" />
        </Tabs>
      </Box>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, m: 2, mb: 0 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search patterns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
              }}
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                input={<OutlinedInput label="Category" />}
              >
                {categories.map(category => (
                  <MenuItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Tags</InputLabel>
              <Select
                multiple
                value={selectedTags}
                onChange={(e) => setSelectedTags(e.target.value as string[])}
                input={<OutlinedInput label="Tags" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {allTags.map((tag) => (
                  <MenuItem key={tag} value={tag}>
                    <Checkbox checked={selectedTags.indexOf(tag) > -1} />
                    <ListItemText primary={tag} />
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
                onChange={(e) => setSortBy(e.target.value)}
                input={<OutlinedInput label="Sort By" />}
              >
                <MenuItem value="popularity">Popularity</MenuItem>
                <MenuItem value="success">Success Rate</MenuItem>
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="complexity">Complexity</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={1}>
            <Button
              variant="contained"
              onClick={() => setCreatePatternOpen(true)}
              size="small"
              fullWidth
            >
              Create
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tab Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              {filteredPatterns.map((pattern) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={pattern.id}>
                  <PatternCard
                    pattern={pattern}
                    onApply={() => handleApplyPattern(pattern)}
                    onView={() => handleViewDetails(pattern)}
                    onFavorite={() => handleFavorite(pattern.id)}
                    isFavorited={favorites.includes(pattern.id)}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              {favoritePatterns.map((pattern) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={pattern.id}>
                  <PatternCard
                    pattern={pattern}
                    onApply={() => handleApplyPattern(pattern)}
                    onView={() => handleViewDetails(pattern)}
                    onFavorite={() => handleFavorite(pattern.id)}
                    isFavorited={true}
                  />
                </Grid>
              ))}
            </Grid>
            {favoritePatterns.length === 0 && (
              <Alert severity="info">
                No favorite patterns yet. Start by favoriting some patterns from the "All Patterns" tab.
              </Alert>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 2 }}>
            {categories.filter(c => c !== 'all').map(category => {
              const categoryPatterns = patterns.filter(p => p.category === category);
              return (
                <Accordion key={category} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Typography>
                    <Badge badgeContent={categoryPatterns.length} color="primary" sx={{ mr: 2 }}>
                      <Typography variant="body2" color="textSecondary">
                        patterns
                      </Typography>
                    </Badge>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      {categoryPatterns.slice(0, 6).map((pattern) => (
                        <Grid item xs={12} sm={6} md={4} key={pattern.id}>
                          <PatternCard
                            pattern={pattern}
                            onApply={() => handleApplyPattern(pattern)}
                            onView={() => handleViewDetails(pattern)}
                            onFavorite={() => handleFavorite(pattern.id)}
                            isFavorited={favorites.includes(pattern.id)}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Top Performing Patterns
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Pattern</TableCell>
                          <TableCell>Success Rate</TableCell>
                          <TableCell>Usage</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {patterns
                          .sort((a, b) => b.successRate - a.successRate)
                          .slice(0, 5)
                          .map((pattern) => (
                            <TableRow key={pattern.id}>
                              <TableCell>{pattern.name}</TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={pattern.successRate}
                                    sx={{ width: 60, mr: 1 }}
                                  />
                                  {pattern.successRate}%
                                </Box>
                              </TableCell>
                              <TableCell>{pattern.usageCount}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Most Popular Tags
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {allTags.slice(0, 20).map((tag) => {
                      const count = patterns.filter(p => p.tags.includes(tag)).length;
                      return (
                        <Chip
                          key={tag}
                          label={`${tag} (${count})`}
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            if (!selectedTags.includes(tag)) {
                              setSelectedTags([...selectedTags, tag]);
                              setTabValue(0);
                            }
                          }}
                          sx={{ cursor: 'pointer' }}
                        />
                      );
                    })}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Box>

      {/* Pattern Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {selectedPattern?.name}
          <Typography variant="subtitle2" color="textSecondary">
            {selectedPattern?.category} Pattern
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedPattern && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Typography variant="body1" paragraph>
                  {selectedPattern.description}
                </Typography>

                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                  Benefits
                </Typography>
                <List dense>
                  {selectedPattern.benefits.map((benefit, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={benefit} />
                    </ListItem>
                  ))}
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                  Trade-offs
                </Typography>
                <List dense>
                  {selectedPattern.tradeoffs.map((tradeoff, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={tradeoff} />
                    </ListItem>
                  ))}
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                  Real-world Examples
                </Typography>
                {selectedPattern.examples.map((example, index) => (
                  <Paper key={index} variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {example.company}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" paragraph>
                      {example.useCase}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Outcome:</strong> {example.outcome}
                    </Typography>
                  </Paper>
                ))}
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Metrics
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">Performance</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={selectedPattern.metrics.performance * 20}
                      sx={{ mb: 1 }}
                    />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">Scalability</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={selectedPattern.metrics.scalability * 20}
                      sx={{ mb: 1 }}
                    />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">Maintainability</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={selectedPattern.metrics.maintainability * 20}
                      sx={{ mb: 1 }}
                    />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">Security</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={selectedPattern.metrics.security * 20}
                    />
                  </Box>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Tags
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selectedPattern.tags.map((tag, index) => (
                      <Chip key={index} label={tag} size="small" />
                    ))}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (selectedPattern) {
                handleApplyPattern(selectedPattern);
                setDetailsOpen(false);
              }
            }}
          >
            Apply Pattern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Pattern Dialog */}
      <Dialog
        open={createPatternOpen}
        onClose={() => setCreatePatternOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Pattern</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Pattern Name"
                value={newPattern.name}
                onChange={(e) => setNewPattern({...newPattern, name: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={newPattern.description}
                onChange={(e) => setNewPattern({...newPattern, description: e.target.value})}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={newPattern.category}
                  onChange={(e) => setNewPattern({...newPattern, category: e.target.value})}
                >
                  <MenuItem value="microservices">Microservices</MenuItem>
                  <MenuItem value="security">Security</MenuItem>
                  <MenuItem value="data">Data</MenuItem>
                  <MenuItem value="cloud">Cloud</MenuItem>
                  <MenuItem value="performance">Performance</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreatePatternOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreatePattern}
            disabled={!newPattern.name || !newPattern.description}
          >
            Create Pattern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PatternLibrary;