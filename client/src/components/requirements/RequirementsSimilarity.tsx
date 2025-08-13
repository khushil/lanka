import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  LinearProgress,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Badge,
  Stack
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Link as LinkIcon,
  Visibility as ViewIcon,
  Compare as CompareIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  Psychology as PsychologyIcon,
  ContentCopy as ContentCopyIcon
} from '@mui/icons-material';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  PieChart, 
  Pie, 
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer
} from 'recharts';
import { 
  Requirement, 
  RequirementSimilarity, 
  RequirementCategory,
  Priority 
} from '../../types/requirements';

interface RequirementsSimilarityProps {
  requirement: Requirement;
  similarRequirements: RequirementSimilarity[];
  onViewRequirement: (requirementId: string) => void;
  onLinkRequirement: (requirementId: string) => void;
  onCompareRequirements: (requirementIds: string[]) => void;
  loading?: boolean;
}

const RequirementsSimilarity: React.FC<RequirementsSimilarityProps> = ({
  requirement,
  similarRequirements,
  onViewRequirement,
  onLinkRequirement,
  onCompareRequirements,
  loading = false
}) => {
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>([]);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.3);
  const [projectFilter, setProjectFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  const filteredSimilarities = useMemo(() => {
    return similarRequirements.filter(similarity => {
      if (similarity.similarityScore < similarityThreshold) return false;
      if (projectFilter !== 'all' && similarity.projectName !== projectFilter) return false;
      if (categoryFilter !== 'all' && similarity.similarRequirement.category !== categoryFilter) return false;
      if (searchTerm && !similarity.similarRequirement.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !similarity.similarRequirement.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [similarRequirements, similarityThreshold, projectFilter, categoryFilter, searchTerm]);

  const uniqueProjects = useMemo(() => {
    return Array.from(new Set(similarRequirements.map(s => s.projectName)));
  }, [similarRequirements]);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(similarRequirements.map(s => s.similarRequirement.category)));
  }, [similarRequirements]);

  const getSimilarityColor = (score: number) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    if (score >= 0.4) return 'info';
    return 'default';
  };

  const getSimilarityLabel = (score: number) => {
    if (score >= 0.8) return 'High';
    if (score >= 0.6) return 'Medium';
    if (score >= 0.4) return 'Low';
    return 'Very Low';
  };

  const handleRequirementSelect = (requirementId: string) => {
    setSelectedRequirements(prev => 
      prev.includes(requirementId)
        ? prev.filter(id => id !== requirementId)
        : [...prev, requirementId]
    );
  };

  // Analytics data
  const similarityDistribution = useMemo(() => {
    const ranges = [
      { name: '90-100%', count: 0, range: [0.9, 1.0] },
      { name: '80-89%', count: 0, range: [0.8, 0.89] },
      { name: '70-79%', count: 0, range: [0.7, 0.79] },
      { name: '60-69%', count: 0, range: [0.6, 0.69] },
      { name: '50-59%', count: 0, range: [0.5, 0.59] },
      { name: '<50%', count: 0, range: [0, 0.49] }
    ];

    filteredSimilarities.forEach(similarity => {
      const score = similarity.similarityScore;
      const range = ranges.find(r => score >= r.range[0] && score <= r.range[1]);
      if (range) range.count++;
    });

    return ranges.filter(r => r.count > 0);
  }, [filteredSimilarities]);

  const projectDistribution = useMemo(() => {
    const projects = {};
    filteredSimilarities.forEach(similarity => {
      const project = similarity.projectName;
      projects[project] = (projects[project] || 0) + 1;
    });

    return Object.entries(projects).map(([name, value]) => ({ name, value }));
  }, [filteredSimilarities]);

  const fieldMatchingData = useMemo(() => {
    const fieldCounts = {};
    filteredSimilarities.forEach(similarity => {
      similarity.matchingFields.forEach(field => {
        fieldCounts[field] = (fieldCounts[field] || 0) + 1;
      });
    });

    return Object.entries(fieldCounts)
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filteredSimilarities]);

  const renderSimilarityCard = (similarity: RequirementSimilarity) => (
    <Card 
      key={similarity.id} 
      sx={{ 
        mb: 2,
        border: selectedRequirements.includes(similarity.similarRequirement.id) 
          ? '2px solid' 
          : '1px solid',
        borderColor: selectedRequirements.includes(similarity.similarRequirement.id) 
          ? 'primary.main' 
          : 'divider'
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              {similarity.similarRequirement.title}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Chip 
                label={similarity.projectName} 
                size="small" 
                color="primary" 
                variant="outlined"
              />
              <Chip 
                label={similarity.similarRequirement.category.replace('_', ' ')} 
                size="small" 
                variant="outlined"
              />
              <Chip 
                label={similarity.similarRequirement.priority.toUpperCase()} 
                size="small" 
                variant="outlined"
              />
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h5" color={`${getSimilarityColor(similarity.similarityScore)}.main`}>
              {(similarity.similarityScore * 100).toFixed(0)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {getSimilarityLabel(similarity.similarityScore)} Match
            </Typography>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }} noWrap>
          {similarity.similarRequirement.description}
        </Typography>

        {/* Matching Fields */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Matching Fields:
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
            {similarity.matchingFields.map((field) => (
              <Chip 
                key={field} 
                label={field} 
                size="small" 
                color="success"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>

        {/* Similarity Progress Bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
            Similarity:
          </Typography>
          <Box sx={{ flexGrow: 1 }}>
            <LinearProgress
              variant="determinate"
              value={similarity.similarityScore * 100}
              color={getSimilarityColor(similarity.similarityScore)}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        </Box>
      </CardContent>

      <CardActions>
        <Button 
          size="small" 
          startIcon={<ViewIcon />}
          onClick={() => onViewRequirement(similarity.similarRequirement.id)}
        >
          View
        </Button>
        <Button 
          size="small" 
          startIcon={<LinkIcon />}
          onClick={() => onLinkRequirement(similarity.similarRequirement.id)}
        >
          Link
        </Button>
        <Button 
          size="small" 
          startIcon={<ContentCopyIcon />}
        >
          Copy
        </Button>
        <Button
          size="small"
          variant={selectedRequirements.includes(similarity.similarRequirement.id) ? "contained" : "outlined"}
          onClick={() => handleRequirementSelect(similarity.similarRequirement.id)}
        >
          {selectedRequirements.includes(similarity.similarRequirement.id) ? 'Selected' : 'Select'}
        </Button>
      </CardActions>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Requirement Similarity Analysis
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Analyzing similarities for: <strong>{requirement.title}</strong>
        </Typography>
      </Box>

      {/* Filters and Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search requirements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Project</InputLabel>
              <Select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                label="Project"
              >
                <MenuItem value="all">All Projects</MenuItem>
                {uniqueProjects.map((project) => (
                  <MenuItem key={project} value={project}>
                    {project}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                label="Category"
              >
                <MenuItem value="all">All Categories</MenuItem>
                {uniqueCategories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category.replace('_', ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={3}>
            <Typography variant="body2" gutterBottom>
              Similarity Threshold: {(similarityThreshold * 100).toFixed(0)}%
            </Typography>
            <Slider
              value={similarityThreshold}
              onChange={(_, value) => setSimilarityThreshold(value as number)}
              min={0}
              max={1}
              step={0.1}
              marks={[
                { value: 0, label: '0%' },
                { value: 0.5, label: '50%' },
                { value: 1, label: '100%' }
              ]}
            />
          </Grid>

          <Grid item xs={12} sm={2}>
            {selectedRequirements.length > 0 && (
              <Button
                variant="contained"
                startIcon={<CompareIcon />}
                onClick={() => onCompareRequirements(selectedRequirements)}
                fullWidth
              >
                Compare ({selectedRequirements.length})
              </Button>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Analytics Dashboard */}
      <Accordion sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUpIcon />
            Analytics Dashboard
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            {/* Similarity Distribution */}
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" gutterBottom>
                Similarity Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={similarityDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Grid>

            {/* Project Distribution */}
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" gutterBottom>
                Project Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={projectDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {projectDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Grid>

            {/* Field Matching Analysis */}
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" gutterBottom>
                Common Matching Fields
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={fieldMatchingData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="field" />
                  <PolarRadiusAxis />
                  <Radar name="Matches" dataKey="count" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Results */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Similar Requirements ({filteredSimilarities.length})
        </Typography>
        {filteredSimilarities.length === 0 && similarRequirements.length > 0 && (
          <Alert severity="info" sx={{ flexGrow: 1, ml: 2, maxWidth: 400 }}>
            No requirements match current filters. Try adjusting the similarity threshold or filters.
          </Alert>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <Typography>Loading similar requirements...</Typography>
        </Box>
      ) : filteredSimilarities.length > 0 ? (
        <Box>
          {filteredSimilarities
            .sort((a, b) => b.similarityScore - a.similarityScore)
            .map(renderSimilarityCard)}
        </Box>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <PsychologyIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Similar Requirements Found
          </Typography>
          <Typography color="text.secondary">
            No requirements were found that match the current criteria. 
            This requirement might be unique or you may need to adjust the similarity threshold.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default RequirementsSimilarity;