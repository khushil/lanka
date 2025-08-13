import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Avatar,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Badge,
  Tooltip,
  LinearProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Rating,
  Divider,
  Stack,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  HourglassEmpty as PendingIcon,
  Visibility as ViewIcon,
  Comment as CommentIcon,
  TrendingUp as ImpactIcon,
  MonetizationOn as CostIcon,
  Schedule as TimelineIcon,
  Business as BusinessIcon,
  Computer as TechnicalIcon,
  ExpandMore as ExpandMoreIcon,
  Assessment as AnalyticsIcon,
  People as StakeholdersIcon,
  Lightbulb as AlternativeIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckBox as TaskIcon,
  Assignment as DecisionIcon,
  History as HistoryIcon,
  Compare as CompareIcon
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_ARCHITECTURE_DECISIONS,
  CREATE_ARCHITECTURE_DECISION,
  UPDATE_ARCHITECTURE_DECISION
} from '../../graphql/architecture';
import type { ArchitectureDecision, DecisionStatus, Priority } from '../../graphql/architecture';

interface DecisionRecordsProps {
  projectId: string;
  onDecisionCreated?: (decision: ArchitectureDecision) => void;
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

const DecisionCard: React.FC<{
  decision: ArchitectureDecision;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ decision, onView, onEdit, onDelete }) => {
  const getStatusIcon = (status: DecisionStatus) => {
    switch (status) {
      case DecisionStatus.APPROVED:
        return <ApprovedIcon color="success" />;
      case DecisionStatus.REJECTED:
        return <RejectedIcon color="error" />;
      case DecisionStatus.UNDER_REVIEW:
        return <PendingIcon color="warning" />;
      case DecisionStatus.PROPOSED:
        return <PendingIcon color="info" />;
      default:
        return <PendingIcon />;
    }
  };

  const getStatusColor = (status: DecisionStatus) => {
    switch (status) {
      case DecisionStatus.APPROVED: return 'success';
      case DecisionStatus.REJECTED: return 'error';
      case DecisionStatus.UNDER_REVIEW: return 'warning';
      case DecisionStatus.PROPOSED: return 'info';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.CRITICAL: return 'error';
      case Priority.HIGH: return 'warning';
      case Priority.MEDIUM: return 'info';
      case Priority.LOW: return 'default';
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
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          <Avatar sx={{ mr: 2, bgcolor: `${getStatusColor(decision.status)}.main` }}>
            {getStatusIcon(decision.status)}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              {decision.title}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              <Chip
                label={decision.status}
                size="small"
                color={getStatusColor(decision.status) as any}
              />
              <Chip
                label={decision.priority}
                size="small"
                color={getPriorityColor(decision.priority) as any}
                variant="outlined"
              />
            </Box>
          </Box>
        </Box>

        <Typography variant="body2" color="textSecondary" paragraph>
          {decision.context.length > 150 
            ? `${decision.context.substring(0, 150)}...`
            : decision.context
          }
        </Typography>

        {decision.decision && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Decision:
            </Typography>
            <Typography variant="body2">
              {decision.decision.length > 100 
                ? `${decision.decision.substring(0, 100)}...`
                : decision.decision
              }
            </Typography>
          </Box>
        )}

        {/* Impact Metrics */}
        <Grid container spacing={1} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TechnicalIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="caption">
                Technical: {decision.impact.technical}/5
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <BusinessIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="caption">
                Business: {decision.impact.business}/5
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TimelineIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="caption">
                Timeline: {decision.impact.timeline}/5
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CostIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="caption">
                Cost: {decision.impact.cost}/5
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Tags */}
        <Box sx={{ mb: 2 }}>
          {decision.tags.slice(0, 3).map((tag, index) => (
            <Chip
              key={index}
              label={tag}
              size="small"
              variant="outlined"
              sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }}
            />
          ))}
          {decision.tags.length > 3 && (
            <Typography variant="caption" color="textSecondary">
              +{decision.tags.length - 3} more
            </Typography>
          )}
        </Box>

        {/* Stakeholders */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <StakeholdersIcon fontSize="small" sx={{ mr: 1 }} />
          <Typography variant="caption" color="textSecondary">
            {decision.stakeholders.length} stakeholders
          </Typography>
          {decision.stakeholders.filter(s => s.approval).length > 0 && (
            <Chip
              label={`${decision.stakeholders.filter(s => s.approval).length} approved`}
              size="small"
              color="success"
              variant="outlined"
              sx={{ ml: 1 }}
            />
          )}
        </Box>

        {/* Dates */}
        <Typography variant="caption" color="textSecondary" display="block">
          Created: {new Date(decision.createdAt).toLocaleDateString()}
        </Typography>
        {decision.decidedAt && (
          <Typography variant="caption" color="textSecondary" display="block">
            Decided: {new Date(decision.decidedAt).toLocaleDateString()}
          </Typography>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Button
          startIcon={<ViewIcon />}
          onClick={onView}
          size="small"
        >
          View Details
        </Button>
        <Box>
          <IconButton onClick={onEdit} size="small">
            <EditIcon />
          </IconButton>
          <IconButton onClick={onDelete} size="small" color="error">
            <DeleteIcon />
          </IconButton>
        </Box>
      </CardActions>
    </Card>
  );
};

const DecisionForm: React.FC<{
  decision?: ArchitectureDecision;
  onSubmit: (decision: any) => void;
  onCancel: () => void;
}> = ({ decision, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: decision?.title || '',
    context: decision?.context || '',
    decision: decision?.decision || '',
    consequences: decision?.consequences || '',
    status: decision?.status || DecisionStatus.PROPOSED,
    priority: decision?.priority || Priority.MEDIUM,
    tags: decision?.tags || [],
    alternatives: decision?.alternatives || [],
    stakeholders: decision?.stakeholders || [],
    impact: decision?.impact || {
      technical: 3,
      business: 3,
      timeline: 3,
      cost: 3
    }
  });

  const [newTag, setNewTag] = useState('');
  const [newAlternative, setNewAlternative] = useState({
    option: '',
    pros: '',
    cons: '',
    impact: 3
  });
  const [newStakeholder, setNewStakeholder] = useState({
    name: '',
    role: '',
    approval: false,
    comments: ''
  });

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const addTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag]
      });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const addAlternative = () => {
    if (newAlternative.option) {
      setFormData({
        ...formData,
        alternatives: [...formData.alternatives, newAlternative]
      });
      setNewAlternative({
        option: '',
        pros: '',
        cons: '',
        impact: 3
      });
    }
  };

  const addStakeholder = () => {
    if (newStakeholder.name && newStakeholder.role) {
      setFormData({
        ...formData,
        stakeholders: [...formData.stakeholders, newStakeholder]
      });
      setNewStakeholder({
        name: '',
        role: '',
        approval: false,
        comments: ''
      });
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Decision Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as DecisionStatus })}
            >
              <MenuItem value={DecisionStatus.PROPOSED}>Proposed</MenuItem>
              <MenuItem value={DecisionStatus.UNDER_REVIEW}>Under Review</MenuItem>
              <MenuItem value={DecisionStatus.APPROVED}>Approved</MenuItem>
              <MenuItem value={DecisionStatus.REJECTED}>Rejected</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
            >
              <MenuItem value={Priority.LOW}>Low</MenuItem>
              <MenuItem value={Priority.MEDIUM}>Medium</MenuItem>
              <MenuItem value={Priority.HIGH}>High</MenuItem>
              <MenuItem value={Priority.CRITICAL}>Critical</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Context"
            multiline
            rows={4}
            value={formData.context}
            onChange={(e) => setFormData({ ...formData, context: e.target.value })}
            helperText="Describe the situation that requires a decision"
            required
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Decision"
            multiline
            rows={3}
            value={formData.decision}
            onChange={(e) => setFormData({ ...formData, decision: e.target.value })}
            helperText="What decision has been made?"
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Consequences"
            multiline
            rows={3}
            value={formData.consequences}
            onChange={(e) => setFormData({ ...formData, consequences: e.target.value })}
            helperText="What are the expected outcomes and implications?"
          />
        </Grid>

        {/* Impact Assessment */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Impact Assessment
          </Typography>
        </Grid>

        <Grid item xs={6} md={3}>
          <Typography gutterBottom>Technical Impact</Typography>
          <Rating
            value={formData.impact.technical}
            onChange={(_, value) => setFormData({
              ...formData,
              impact: { ...formData.impact, technical: value || 0 }
            })}
            max={5}
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <Typography gutterBottom>Business Impact</Typography>
          <Rating
            value={formData.impact.business}
            onChange={(_, value) => setFormData({
              ...formData,
              impact: { ...formData.impact, business: value || 0 }
            })}
            max={5}
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <Typography gutterBottom>Timeline Impact</Typography>
          <Rating
            value={formData.impact.timeline}
            onChange={(_, value) => setFormData({
              ...formData,
              impact: { ...formData.impact, timeline: value || 0 }
            })}
            max={5}
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <Typography gutterBottom>Cost Impact</Typography>
          <Rating
            value={formData.impact.cost}
            onChange={(_, value) => setFormData({
              ...formData,
              impact: { ...formData.impact, cost: value || 0 }
            })}
            max={5}
          />
        </Grid>

        {/* Tags */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Tags
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TextField
              size="small"
              label="Add Tag"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTag()}
            />
            <Button onClick={addTag} variant="outlined" size="small">
              Add
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {formData.tags.map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                onDelete={() => removeTag(tag)}
                size="small"
              />
            ))}
          </Box>
        </Grid>

        {/* Alternatives */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                Alternatives ({formData.alternatives.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Option"
                    value={newAlternative.option}
                    onChange={(e) => setNewAlternative({ ...newAlternative, option: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Pros"
                    value={newAlternative.pros}
                    onChange={(e) => setNewAlternative({ ...newAlternative, pros: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Cons"
                    value={newAlternative.cons}
                    onChange={(e) => setNewAlternative({ ...newAlternative, cons: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button onClick={addAlternative} variant="outlined" size="small" fullWidth>
                    Add
                  </Button>
                </Grid>
              </Grid>
              
              {formData.alternatives.map((alt, index) => (
                <Paper key={index} sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {alt.option}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="success.main">
                        Pros: {alt.pros}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="error.main">
                        Cons: {alt.cons}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Stakeholders */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                Stakeholders ({formData.stakeholders.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Name"
                    value={newStakeholder.name}
                    onChange={(e) => setNewStakeholder({ ...newStakeholder, name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Role"
                    value={newStakeholder.role}
                    onChange={(e) => setNewStakeholder({ ...newStakeholder, role: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Comments"
                    value={newStakeholder.comments}
                    onChange={(e) => setNewStakeholder({ ...newStakeholder, comments: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button onClick={addStakeholder} variant="outlined" size="small" fullWidth>
                    Add
                  </Button>
                </Grid>
              </Grid>
              
              {formData.stakeholders.map((stakeholder, index) => (
                <Paper key={index} sx={{ p: 2, mb: 1 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={3}>
                      <Typography variant="subtitle2">
                        {stakeholder.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {stakeholder.role}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        {stakeholder.comments}
                      </Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Chip
                        label={stakeholder.approval ? 'Approved' : 'Pending'}
                        color={stakeholder.approval ? 'success' : 'warning'}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        <Button onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!formData.title || !formData.context}
        >
          {decision ? 'Update Decision' : 'Create Decision'}
        </Button>
      </Box>
    </Box>
  );
};

export const DecisionRecords: React.FC<DecisionRecordsProps> = ({
  projectId,
  onDecisionCreated
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedDecision, setSelectedDecision] = useState<ArchitectureDecision | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingDecision, setEditingDecision] = useState<ArchitectureDecision | null>(null);
  const [statusFilter, setStatusFilter] = useState<DecisionStatus | 'all'>('all');

  const { data, loading, error, refetch } = useQuery(GET_ARCHITECTURE_DECISIONS, {
    variables: {
      projectId,
      status: statusFilter === 'all' ? undefined : statusFilter
    }
  });

  const [createDecision] = useMutation(CREATE_ARCHITECTURE_DECISION, {
    onCompleted: (data) => {
      setFormOpen(false);
      setEditingDecision(null);
      refetch();
      if (onDecisionCreated) {
        onDecisionCreated(data.createArchitectureDecision);
      }
    }
  });

  const [updateDecision] = useMutation(UPDATE_ARCHITECTURE_DECISION, {
    onCompleted: () => {
      setFormOpen(false);
      setEditingDecision(null);
      refetch();
    }
  });

  const decisions: ArchitectureDecision[] = data?.architectureDecisions || [];
  const decisionsByStatus = {
    [DecisionStatus.PROPOSED]: decisions.filter(d => d.status === DecisionStatus.PROPOSED),
    [DecisionStatus.UNDER_REVIEW]: decisions.filter(d => d.status === DecisionStatus.UNDER_REVIEW),
    [DecisionStatus.APPROVED]: decisions.filter(d => d.status === DecisionStatus.APPROVED),
    [DecisionStatus.REJECTED]: decisions.filter(d => d.status === DecisionStatus.REJECTED)
  };

  const handleCreateDecision = (decisionData: any) => {
    createDecision({
      variables: {
        input: {
          ...decisionData,
          projectId
        }
      }
    });
  };

  const handleUpdateDecision = (decisionData: any) => {
    if (editingDecision) {
      updateDecision({
        variables: {
          id: editingDecision.id,
          input: decisionData
        }
      });
    }
  };

  const handleViewDecision = (decision: ArchitectureDecision) => {
    setSelectedDecision(decision);
    setDetailsOpen(true);
  };

  const handleEditDecision = (decision: ArchitectureDecision) => {
    setEditingDecision(decision);
    setFormOpen(true);
  };

  const handleDeleteDecision = (decision: ArchitectureDecision) => {
    // Implement delete functionality
    console.log('Delete decision:', decision.id);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading architecture decisions...</Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error loading architecture decisions: {error.message}
      </Alert>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(_, value) => setTabValue(value)}>
          <Tab label={`All Decisions (${decisions.length})`} />
          <Tab label="Timeline View" />
          <Tab label="Analytics" />
        </Tabs>
      </Box>

      {/* Action Bar */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setFormOpen(true)}
            >
              New Decision
            </Button>
          </Grid>
          <Grid item>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status Filter</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as DecisionStatus | 'all')}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value={DecisionStatus.PROPOSED}>Proposed</MenuItem>
                <MenuItem value={DecisionStatus.UNDER_REVIEW}>Under Review</MenuItem>
                <MenuItem value={DecisionStatus.APPROVED}>Approved</MenuItem>
                <MenuItem value={DecisionStatus.REJECTED}>Rejected</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Chip
                label={`${decisionsByStatus[DecisionStatus.PROPOSED].length} Proposed`}
                color="info"
                size="small"
              />
              <Chip
                label={`${decisionsByStatus[DecisionStatus.UNDER_REVIEW].length} Under Review`}
                color="warning"
                size="small"
              />
              <Chip
                label={`${decisionsByStatus[DecisionStatus.APPROVED].length} Approved`}
                color="success"
                size="small"
              />
              <Chip
                label={`${decisionsByStatus[DecisionStatus.REJECTED].length} Rejected`}
                color="error"
                size="small"
              />
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Tab Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={2}>
            {decisions.map((decision) => (
              <Grid item xs={12} sm={6} md={4} key={decision.id}>
                <DecisionCard
                  decision={decision}
                  onView={() => handleViewDecision(decision)}
                  onEdit={() => handleEditDecision(decision)}
                  onDelete={() => handleDeleteDecision(decision)}
                />
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Timeline position="alternate">
            {decisions
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((decision, index) => (
                <TimelineItem key={decision.id}>
                  <TimelineOppositeContent
                    sx={{ m: 'auto 0' }}
                    align={index % 2 === 0 ? 'right' : 'left'}
                    variant="body2"
                    color="text.secondary"
                  >
                    {new Date(decision.createdAt).toLocaleDateString()}
                  </TimelineOppositeContent>
                  <TimelineSeparator>
                    <TimelineConnector />
                    <TimelineDot color={
                      decision.status === DecisionStatus.APPROVED ? 'success' :
                      decision.status === DecisionStatus.REJECTED ? 'error' :
                      decision.status === DecisionStatus.UNDER_REVIEW ? 'warning' : 'primary'
                    }>
                      <DecisionIcon />
                    </TimelineDot>
                    <TimelineConnector />
                  </TimelineSeparator>
                  <TimelineContent sx={{ py: '12px', px: 2 }}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="h6" component="h2">
                        {decision.title}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {decision.context.substring(0, 100)}...
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip
                          label={decision.status}
                          size="small"
                          color={
                            decision.status === DecisionStatus.APPROVED ? 'success' :
                            decision.status === DecisionStatus.REJECTED ? 'error' :
                            decision.status === DecisionStatus.UNDER_REVIEW ? 'warning' : 'primary'
                          }
                        />
                      </Box>
                    </Paper>
                  </TimelineContent>
                </TimelineItem>
              ))}
          </Timeline>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Decision Status Distribution
                </Typography>
                <Box sx={{ mb: 2 }}>
                  {Object.entries(decisionsByStatus).map(([status, decisions]) => {
                    const percentage = (decisions.length / decisions.length) * 100;
                    return (
                      <Box key={status} sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2">{status}</Typography>
                          <Typography variant="body2">{decisions.length}</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={percentage}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    );
                  })}
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Decision Impact Analysis
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Decision</TableCell>
                        <TableCell>Technical</TableCell>
                        <TableCell>Business</TableCell>
                        <TableCell>Overall</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {decisions.slice(0, 5).map((decision) => {
                        const avgImpact = (decision.impact.technical + decision.impact.business +
                                         decision.impact.timeline + decision.impact.cost) / 4;
                        return (
                          <TableRow key={decision.id}>
                            <TableCell>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 100 }}>
                                {decision.title}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Rating
                                value={decision.impact.technical}
                                size="small"
                                readOnly
                              />
                            </TableCell>
                            <TableCell>
                              <Rating
                                value={decision.impact.business}
                                size="small"
                                readOnly
                              />
                            </TableCell>
                            <TableCell>
                              <Rating
                                value={avgImpact}
                                size="small"
                                readOnly
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
      </Box>

      {/* Decision Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h5">
              {selectedDecision?.title}
            </Typography>
            <Chip
              label={selectedDecision?.status}
              color={
                selectedDecision?.status === DecisionStatus.APPROVED ? 'success' :
                selectedDecision?.status === DecisionStatus.REJECTED ? 'error' :
                selectedDecision?.status === DecisionStatus.UNDER_REVIEW ? 'warning' : 'primary'
              }
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedDecision && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Context</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body1">
                      {selectedDecision.context}
                    </Typography>
                  </AccordionDetails>
                </Accordion>

                {selectedDecision.decision && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="h6">Decision</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body1">
                        {selectedDecision.decision}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                )}

                {selectedDecision.consequences && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="h6">Consequences</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body1">
                        {selectedDecision.consequences}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                )}

                {selectedDecision.alternatives.length > 0 && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="h6">Alternatives Considered</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {selectedDecision.alternatives.map((alt, index) => (
                        <Paper key={index} variant="outlined" sx={{ p: 2, mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            {alt.option}
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="success.main">
                                <strong>Pros:</strong> {alt.pros}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="error.main">
                                <strong>Cons:</strong> {alt.cons}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Paper>
                      ))}
                    </AccordionDetails>
                  </Accordion>
                )}
              </Grid>

              <Grid item xs={12} md={4}>
                <Stack spacing={2}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Impact Assessment
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2">Technical</Typography>
                        <Rating value={selectedDecision.impact.technical} readOnly />
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">Business</Typography>
                        <Rating value={selectedDecision.impact.business} readOnly />
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">Timeline</Typography>
                        <Rating value={selectedDecision.impact.timeline} readOnly />
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">Cost</Typography>
                        <Rating value={selectedDecision.impact.cost} readOnly />
                      </Grid>
                    </Grid>
                  </Paper>

                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Stakeholders
                    </Typography>
                    <List dense>
                      {selectedDecision.stakeholders.map((stakeholder, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <Avatar sx={{ width: 32, height: 32 }}>
                              {stakeholder.name.charAt(0)}
                            </Avatar>
                          </ListItemIcon>
                          <ListItemText
                            primary={stakeholder.name}
                            secondary={stakeholder.role}
                          />
                          <ListItemSecondaryAction>
                            <Chip
                              label={stakeholder.approval ? 'Approved' : 'Pending'}
                              color={stakeholder.approval ? 'success' : 'warning'}
                              size="small"
                            />
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  </Paper>

                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Metadata
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="Created"
                          secondary={new Date(selectedDecision.createdAt).toLocaleString()}
                        />
                      </ListItem>
                      {selectedDecision.decidedAt && (
                        <ListItem>
                          <ListItemText
                            primary="Decided"
                            secondary={new Date(selectedDecision.decidedAt).toLocaleString()}
                          />
                        </ListItem>
                      )}
                      <ListItem>
                        <ListItemText
                          primary="Priority"
                          secondary={selectedDecision.priority}
                        />
                      </ListItem>
                    </List>
                  </Paper>
                </Stack>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Close
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              if (selectedDecision) {
                handleEditDecision(selectedDecision);
                setDetailsOpen(false);
              }
            }}
          >
            Edit Decision
          </Button>
        </DialogActions>
      </Dialog>

      {/* Decision Form Dialog */}
      <Dialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingDecision(null);
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {editingDecision ? 'Edit Architecture Decision' : 'Create Architecture Decision'}
        </DialogTitle>
        <DialogContent>
          <DecisionForm
            decision={editingDecision || undefined}
            onSubmit={editingDecision ? handleUpdateDecision : handleCreateDecision}
            onCancel={() => {
              setFormOpen(false);
              setEditingDecision(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default DecisionRecords;