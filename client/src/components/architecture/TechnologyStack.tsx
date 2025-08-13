import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Rating,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Tooltip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Slider,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  FormLabel,
  Avatar,
  Badge,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Compare as CompareIcon,
  Star as StarIcon,
  MonetizationOn as CostIcon,
  Speed as PerformanceIcon,
  Security as SecurityIcon,
  Support as SupportIcon,
  School as LearningIcon,
  Code as CodeIcon,
  Cloud as CloudIcon,
  Storage as DatabaseIcon,
  Api as ApiIcon,
  Build as BuildIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Lightbulb as RecommendationIcon,
  Assessment as AnalyticsIcon
} from '@mui/icons-material';
import { useQuery, useLazyQuery } from '@apollo/client';
import { GET_TECHNOLOGY_STACKS, COMPARE_TECHNOLOGY_STACKS } from '../../graphql/architecture';
import type { TechnologyStack, Technology } from '../../graphql/architecture';

interface TechnologyStackProps {
  onStackSelect?: (stack: TechnologyStack) => void;
  requirements?: any;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index} style={{ height: '100%' }}>
      {value === index && <Box sx={{ height: '100%', p: 2 }}>{children}</Box>}
    </div>
  );
};

const TechnologyStackCard: React.FC<{
  stack: TechnologyStack;
  onSelect: () => void;
  onCompare: () => void;
  isSelected: boolean;
  isComparing: boolean;
}> = ({ stack, onSelect, onCompare, isSelected, isComparing }) => {
  const getTrendIcon = (trend: string) => {
    switch (trend.toLowerCase()) {
      case 'rising':
        return <TrendingUpIcon color="success" />;
      case 'declining':
        return <TrendingDownIcon color="error" />;
      default:
        return <TrendingUpIcon color="action" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend.toLowerCase()) {
      case 'rising': return 'success';
      case 'declining': return 'error';
      default: return 'warning';
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: isSelected ? '2px solid' : '1px solid',
        borderColor: isSelected ? 'primary.main' : 'divider',
        '&:hover': {
          boxShadow: 4,
          transform: 'translateY(-2px)'
        },
        transition: 'all 0.3s ease'
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
            <CodeIcon />
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              {stack.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={stack.category}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Chip
                icon={getTrendIcon(stack.trend)}
                label={stack.trend}
                size="small"
                color={getTrendColor(stack.trend) as any}
                variant="outlined"
              />
            </Box>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Rating
              value={stack.recommendation.score / 20}
              precision={0.1}
              size="small"
              readOnly
            />
            <Typography variant="caption" display="block">
              Score: {stack.recommendation.score}
            </Typography>
          </Box>
        </Box>

        <Typography variant="body2" color="textSecondary" paragraph>
          {stack.description}
        </Typography>

        {/* Technology Stack */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Technologies:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {stack.technologies.slice(0, 6).map((tech, index) => (
              <Chip
                key={index}
                label={tech.name}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            ))}
            {stack.technologies.length > 6 && (
              <Chip
                label={`+${stack.technologies.length - 6} more`}
                size="small"
                color="secondary"
              />
            )}
          </Box>
        </Box>

        {/* Metrics */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <PerformanceIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="body2">Performance</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={stack.performance.throughput}
              color="primary"
              sx={{ height: 4, borderRadius: 2 }}
            />
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <SecurityIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="body2">Security</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={stack.performance.reliability}
              color="error"
              sx={{ height: 4, borderRadius: 2 }}
            />
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <CostIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="body2">Cost Efficiency</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={100 - (stack.totalCost.development / 1000)}
              color="success"
              sx={{ height: 4, borderRadius: 2 }}
            />
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <LearningIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="body2">Learning Curve</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={stack.technologies.reduce((acc, tech) => acc + tech.learningCurve, 0) / stack.technologies.length * 20}
              color="warning"
              sx={{ height: 4, borderRadius: 2 }}
            />
          </Grid>
        </Grid>

        {/* Cost Summary */}
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" gutterBottom>
            Estimated Costs (Monthly):
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">
                Development: ${stack.totalCost.development.toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">
                Hosting: ${stack.totalCost.hosting.toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">
                Maintenance: ${stack.totalCost.maintenance.toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">
                Licensing: ${stack.totalCost.licensing.toLocaleString()}
              </Typography>
            </Grid>
          </Grid>
          <Divider sx={{ my: 1 }} />
          <Typography variant="body2" fontWeight="bold">
            Total: ${(stack.totalCost.development + stack.totalCost.hosting + 
                     stack.totalCost.maintenance + stack.totalCost.licensing).toLocaleString()}
          </Typography>
        </Paper>

        {/* Companies Using */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Used by: {stack.companies.slice(0, 3).join(', ')}
            {stack.companies.length > 3 && ` +${stack.companies.length - 3} more`}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Market Share: {stack.marketShare}%
          </Typography>
        </Box>

        {/* Recommendation Reasoning */}
        <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
          <Typography variant="caption">
            {stack.recommendation.reasoning}
          </Typography>
        </Alert>
      </CardContent>

      <Box sx={{ p: 2, pt: 0 }}>
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Button
              fullWidth
              variant={isSelected ? 'contained' : 'outlined'}
              onClick={onSelect}
              size="small"
            >
              {isSelected ? 'Selected' : 'Select'}
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button
              fullWidth
              variant="outlined"
              onClick={onCompare}
              disabled={isComparing}
              size="small"
              startIcon={<CompareIcon />}
            >
              Compare
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Card>
  );
};

export const TechnologyStack: React.FC<TechnologyStackProps> = ({
  onStackSelect,
  requirements: initialRequirements
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [requirements, setRequirements] = useState({
    projectType: 'web',
    scalability: 3,
    security: 3,
    budget: 50000,
    timeline: 6,
    teamSize: 5,
    experienceLevel: 'intermediate',
    ...initialRequirements
  });
  const [selectedStacks, setSelectedStacks] = useState<string[]>([]);
  const [comparingStacks, setComparingStacks] = useState<string[]>([]);
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [recommendationStep, setRecommendationStep] = useState(0);

  const { data, loading, error, refetch } = useQuery(GET_TECHNOLOGY_STACKS, {
    variables: { requirements },
    skip: !requirements
  });

  const [compareStacks, { data: comparisonData, loading: comparisonLoading }] = useLazyQuery(
    COMPARE_TECHNOLOGY_STACKS
  );

  const stacks: TechnologyStack[] = data?.technologyStacks || [];

  const handleStackSelect = (stack: TechnologyStack) => {
    setSelectedStacks(prev => 
      prev.includes(stack.id) 
        ? prev.filter(id => id !== stack.id)
        : [...prev, stack.id]
    );
    if (onStackSelect) {
      onStackSelect(stack);
    }
  };

  const handleCompareStack = (stackId: string) => {
    if (comparingStacks.length >= 3) {
      // Remove first one if we have 3 already
      setComparingStacks(prev => [...prev.slice(1), stackId]);
    } else {
      setComparingStacks(prev => [...prev, stackId]);
    }
  };

  const handleCompare = () => {
    if (comparingStacks.length >= 2) {
      compareStacks({ variables: { stackIds: comparingStacks } });
      setComparisonOpen(true);
    }
  };

  const updateRequirements = () => {
    refetch();
    setRequirementsOpen(false);
  };

  const getRecommendationSteps = () => [
    {
      label: 'Project Requirements',
      description: 'Define your project needs and constraints'
    },
    {
      label: 'Technology Analysis',
      description: 'AI analyzes suitable technology combinations'
    },
    {
      label: 'Stack Recommendations',
      description: 'Get ranked recommendations with reasoning'
    },
    {
      label: 'Cost & Performance',
      description: 'Review estimated costs and performance metrics'
    }
  ];

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading technology stacks...</Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error loading technology stacks: {error.message}
      </Alert>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(_, value) => setTabValue(value)}>
          <Tab label="Recommendations" />
          <Tab label="All Stacks" />
          <Tab label="Comparison" />
          <Tab label="Analytics" />
        </Tabs>
      </Box>

      {/* Action Bar */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <Button
              variant="outlined"
              onClick={() => setRequirementsOpen(true)}
              startIcon={<BuildIcon />}
            >
              Update Requirements
            </Button>
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              variant="outlined"
              onClick={handleCompare}
              disabled={comparingStacks.length < 2}
              startIcon={<CompareIcon />}
            >
              Compare ({comparingStacks.length})
            </Button>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="textSecondary">
              {stacks.length} stacks found | {selectedStacks.length} selected
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Tab Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={2}>
            <Grid item xs={12} lg={4}>
              <Paper sx={{ p: 2, height: 'fit-content' }}>
                <Typography variant="h6" gutterBottom>
                  Recommendation Process
                </Typography>
                <Stepper activeStep={recommendationStep} orientation="vertical">
                  {getRecommendationSteps().map((step, index) => (
                    <Step key={step.label}>
                      <StepLabel>{step.label}</StepLabel>
                      <StepContent>
                        <Typography variant="body2" color="textSecondary">
                          {step.description}
                        </Typography>
                      </StepContent>
                    </Step>
                  ))}
                </Stepper>
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Current Requirements:
                  </Typography>
                  <Chip label={`Project: ${requirements.projectType}`} size="small" sx={{ mr: 1, mb: 1 }} />
                  <Chip label={`Budget: $${requirements.budget.toLocaleString()}`} size="small" sx={{ mr: 1, mb: 1 }} />
                  <Chip label={`Team: ${requirements.teamSize} people`} size="small" sx={{ mr: 1, mb: 1 }} />
                  <Chip label={`Timeline: ${requirements.timeline} months`} size="small" sx={{ mr: 1, mb: 1 }} />
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} lg={8}>
              <Grid container spacing={2}>
                {stacks
                  .sort((a, b) => b.recommendation.score - a.recommendation.score)
                  .slice(0, 6)
                  .map((stack) => (
                    <Grid item xs={12} md={6} key={stack.id}>
                      <TechnologyStackCard
                        stack={stack}
                        onSelect={() => handleStackSelect(stack)}
                        onCompare={() => handleCompareStack(stack.id)}
                        isSelected={selectedStacks.includes(stack.id)}
                        isComparing={comparingStacks.includes(stack.id)}
                      />
                    </Grid>
                  ))}
              </Grid>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={2}>
            {stacks.map((stack) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={stack.id}>
                <TechnologyStackCard
                  stack={stack}
                  onSelect={() => handleStackSelect(stack)}
                  onCompare={() => handleCompareStack(stack.id)}
                  isSelected={selectedStacks.includes(stack.id)}
                  isComparing={comparingStacks.includes(stack.id)}
                />
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {comparingStacks.length === 0 ? (
            <Alert severity="info">
              Select stacks to compare by clicking the "Compare" button on stack cards.
            </Alert>
          ) : (
            <Box>
              <Typography variant="h6" gutterBottom>
                Comparing {comparingStacks.length} Stacks
              </Typography>
              <Grid container spacing={2}>
                {comparingStacks.map(stackId => {
                  const stack = stacks.find(s => s.id === stackId);
                  return stack ? (
                    <Grid item xs={12} md={4} key={stackId}>
                      <TechnologyStackCard
                        stack={stack}
                        onSelect={() => handleStackSelect(stack)}
                        onCompare={() => {}}
                        isSelected={selectedStacks.includes(stack.id)}
                        isComparing={true}
                      />
                    </Grid>
                  ) : null;
                })}
              </Grid>
              
              {comparisonData && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Detailed Comparison
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Criteria</TableCell>
                          {comparisonData.compareTechnologyStacks.stacks.map((stack: any) => (
                            <TableCell key={stack.id}>{stack.name}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell><strong>Overall Score</strong></TableCell>
                          {comparisonData.compareTechnologyStacks.comparison.scores.map((score: number, index: number) => (
                            <TableCell key={index}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Rating value={score / 20} precision={0.1} size="small" readOnly />
                                <Typography variant="body2" sx={{ ml: 1 }}>
                                  {score}
                                </Typography>
                              </Box>
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell><strong>Development Cost</strong></TableCell>
                          {comparisonData.compareTechnologyStacks.costAnalysis.development.map((cost: number, index: number) => (
                            <TableCell key={index}>${cost.toLocaleString()}</TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell><strong>Hosting Cost</strong></TableCell>
                          {comparisonData.compareTechnologyStacks.costAnalysis.hosting.map((cost: number, index: number) => (
                            <TableCell key={index}>${cost.toLocaleString()}</TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell><strong>Performance</strong></TableCell>
                          {comparisonData.compareTechnologyStacks.performanceMetrics.throughput.map((perf: number, index: number) => (
                            <TableCell key={index}>
                              <LinearProgress
                                variant="determinate"
                                value={perf}
                                sx={{ width: 100 }}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Technology Trends
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Technology</TableCell>
                        <TableCell>Trend</TableCell>
                        <TableCell>Market Share</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stacks.slice(0, 10).map((stack) => (
                        <TableRow key={stack.id}>
                          <TableCell>{stack.name}</TableCell>
                          <TableCell>
                            <Chip
                              icon={stack.trend === 'rising' ? <TrendingUpIcon /> : <TrendingDownIcon />}
                              label={stack.trend}
                              size="small"
                              color={stack.trend === 'rising' ? 'success' : 'error'}
                            />
                          </TableCell>
                          <TableCell>{stack.marketShare}%</TableCell>
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
                  Cost Distribution
                </Typography>
                {stacks.slice(0, 5).map((stack) => {
                  const totalCost = stack.totalCost.development + stack.totalCost.hosting + 
                                  stack.totalCost.maintenance + stack.totalCost.licensing;
                  return (
                    <Box key={stack.id} sx={{ mb: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        {stack.name} - ${totalCost.toLocaleString()}
                      </Typography>
                      <Box sx={{ display: 'flex', height: 20, borderRadius: 1, overflow: 'hidden' }}>
                        <Box
                          sx={{
                            width: `${(stack.totalCost.development / totalCost) * 100}%`,
                            bgcolor: 'primary.main'
                          }}
                        />
                        <Box
                          sx={{
                            width: `${(stack.totalCost.hosting / totalCost) * 100}%`,
                            bgcolor: 'secondary.main'
                          }}
                        />
                        <Box
                          sx={{
                            width: `${(stack.totalCost.maintenance / totalCost) * 100}%`,
                            bgcolor: 'warning.main'
                          }}
                        />
                        <Box
                          sx={{
                            width: `${(stack.totalCost.licensing / totalCost) * 100}%`,
                            bgcolor: 'error.main'
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip label="Dev" size="small" color="primary" />
                        <Chip label="Host" size="small" color="secondary" />
                        <Chip label="Maint" size="small" color="warning" />
                        <Chip label="License" size="small" color="error" />
                      </Box>
                    </Box>
                  );
                })}
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
      </Box>

      {/* Requirements Dialog */}
      <Dialog
        open={requirementsOpen}
        onClose={() => setRequirementsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Update Project Requirements</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Project Type</InputLabel>
                <Select
                  value={requirements.projectType}
                  onChange={(e) => setRequirements({...requirements, projectType: e.target.value})}
                >
                  <MenuItem value="web">Web Application</MenuItem>
                  <MenuItem value="mobile">Mobile Application</MenuItem>
                  <MenuItem value="api">API Service</MenuItem>
                  <MenuItem value="desktop">Desktop Application</MenuItem>
                  <MenuItem value="embedded">Embedded System</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Experience Level</InputLabel>
                <Select
                  value={requirements.experienceLevel}
                  onChange={(e) => setRequirements({...requirements, experienceLevel: e.target.value})}
                >
                  <MenuItem value="beginner">Beginner</MenuItem>
                  <MenuItem value="intermediate">Intermediate</MenuItem>
                  <MenuItem value="expert">Expert</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography gutterBottom>Scalability Requirements</Typography>
              <Slider
                value={requirements.scalability}
                onChange={(_, value) => setRequirements({...requirements, scalability: value as number})}
                min={1}
                max={5}
                step={1}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography gutterBottom>Security Requirements</Typography>
              <Slider
                value={requirements.security}
                onChange={(_, value) => setRequirements({...requirements, security: value as number})}
                min={1}
                max={5}
                step={1}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Budget ($)"
                type="number"
                value={requirements.budget}
                onChange={(e) => setRequirements({...requirements, budget: parseInt(e.target.value) || 0})}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Timeline (months)"
                type="number"
                value={requirements.timeline}
                onChange={(e) => setRequirements({...requirements, timeline: parseInt(e.target.value) || 0})}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Team Size"
                type="number"
                value={requirements.teamSize}
                onChange={(e) => setRequirements({...requirements, teamSize: parseInt(e.target.value) || 0})}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequirementsOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={updateRequirements}>
            Update & Get Recommendations
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TechnologyStack;