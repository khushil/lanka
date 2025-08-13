import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Tab,
  Tabs,
  Button,
  Paper,
  Toolbar,
  Dialog,
  DialogTitle,
  DialogContent,
  Alert,
  Snackbar,
  Backdrop,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import RequirementsList from '../components/requirements/RequirementsList';
import RequirementForm from '../components/requirements/RequirementForm';
import RequirementDetail from '../components/requirements/RequirementDetail';
import RequirementsSimilarity from '../components/requirements/RequirementsSimilarity';
import RequirementsGraph from '../components/requirements/RequirementsGraph';
import {
  GET_REQUIREMENTS,
  GET_REQUIREMENT_BY_ID,
  CREATE_REQUIREMENT,
  UPDATE_REQUIREMENT,
  DELETE_REQUIREMENT,
  FIND_SIMILAR_REQUIREMENTS,
  GET_REQUIREMENTS_GRAPH,
  ADD_REQUIREMENT_COMMENT,
  UPDATE_REQUIREMENT_STATUS,
  BULK_UPDATE_REQUIREMENTS,
  GET_REQUIREMENTS_ANALYTICS,
  EXPORT_REQUIREMENTS,
  REQUIREMENT_UPDATED
} from '../graphql/requirements';
import {
  Requirement,
  RequirementFormData,
  RequirementFilter,
  RequirementSort,
  RequirementStatus,
  RequirementSimilarity,
  RequirementsGraphData,
  RequirementComment,
  RequirementRelationship
} from '../types/requirements';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`requirements-tabpanel-${index}`}
      aria-labelledby={`requirements-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
};

const Requirements: React.FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [filter, setFilter] = useState<RequirementFilter>({});
  const [sort, setSort] = useState<RequirementSort>({ field: 'createdAt', direction: 'desc' });
  const [notification, setNotification] = useState<{ message: string; severity: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  // GraphQL queries and mutations
  const { data: requirementsData, loading: requirementsLoading, refetch: refetchRequirements } = useQuery(GET_REQUIREMENTS, {
    variables: { filter, sort, pagination: { page: 1, limit: 100 } },
    fetchPolicy: 'cache-and-network'
  });

  const { data: selectedRequirementData, loading: selectedRequirementLoading } = useQuery(GET_REQUIREMENT_BY_ID, {
    variables: { id: selectedRequirement?.id },
    skip: !selectedRequirement?.id,
    fetchPolicy: 'cache-and-network'
  });

  const { data: similarRequirementsData } = useQuery(FIND_SIMILAR_REQUIREMENTS, {
    variables: { requirementId: selectedRequirement?.id, threshold: 0.3 },
    skip: !selectedRequirement?.id
  });

  const { data: graphData, loading: graphLoading } = useQuery(GET_REQUIREMENTS_GRAPH, {
    variables: { filter },
    fetchPolicy: 'cache-and-network'
  });

  const { data: analyticsData } = useQuery(GET_REQUIREMENTS_ANALYTICS, {
    variables: { timeRange: { from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), to: new Date().toISOString() } }
  });

  // Mutations
  const [createRequirement, { loading: createLoading }] = useMutation(CREATE_REQUIREMENT, {
    onCompleted: () => {
      setNotification({ message: 'Requirement created successfully', severity: 'success' });
      setFormOpen(false);
      refetchRequirements();
    },
    onError: (error) => {
      setNotification({ message: `Failed to create requirement: ${error.message}`, severity: 'error' });
    }
  });

  const [updateRequirement, { loading: updateLoading }] = useMutation(UPDATE_REQUIREMENT, {
    onCompleted: () => {
      setNotification({ message: 'Requirement updated successfully', severity: 'success' });
      setFormOpen(false);
      refetchRequirements();
    },
    onError: (error) => {
      setNotification({ message: `Failed to update requirement: ${error.message}`, severity: 'error' });
    }
  });

  const [deleteRequirement] = useMutation(DELETE_REQUIREMENT, {
    onCompleted: () => {
      setNotification({ message: 'Requirement deleted successfully', severity: 'success' });
      setSelectedRequirement(null);
      refetchRequirements();
    },
    onError: (error) => {
      setNotification({ message: `Failed to delete requirement: ${error.message}`, severity: 'error' });
    }
  });

  const [addComment] = useMutation(ADD_REQUIREMENT_COMMENT, {
    onCompleted: () => {
      setNotification({ message: 'Comment added successfully', severity: 'success' });
    },
    onError: (error) => {
      setNotification({ message: `Failed to add comment: ${error.message}`, severity: 'error' });
    }
  });

  const [updateStatus] = useMutation(UPDATE_REQUIREMENT_STATUS, {
    onCompleted: () => {
      setNotification({ message: 'Status updated successfully', severity: 'success' });
      refetchRequirements();
    },
    onError: (error) => {
      setNotification({ message: `Failed to update status: ${error.message}`, severity: 'error' });
    }
  });

  const [exportRequirements] = useMutation(EXPORT_REQUIREMENTS, {
    onCompleted: (data) => {
      if (data.exportRequirements.url) {
        window.open(data.exportRequirements.url, '_blank');
      }
      setNotification({ message: 'Export completed successfully', severity: 'success' });
    },
    onError: (error) => {
      setNotification({ message: `Failed to export requirements: ${error.message}`, severity: 'error' });
    }
  });

  // Subscriptions for real-time updates
  useSubscription(REQUIREMENT_UPDATED, {
    variables: { projectId: 'current-project' }, // Replace with actual project ID
    onSubscriptionData: ({ subscriptionData }) => {
      if (subscriptionData.data) {
        setNotification({ 
          message: `Requirement "${subscriptionData.data.requirementUpdated.title}" was updated`, 
          severity: 'info' 
        });
        refetchRequirements();
      }
    }
  });

  // Event handlers
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleCreateRequirement = () => {
    setFormMode('create');
    setSelectedRequirement(null);
    setFormOpen(true);
  };

  const handleEditRequirement = (requirement: Requirement) => {
    setFormMode('edit');
    setSelectedRequirement(requirement);
    setFormOpen(true);
  };

  const handleViewRequirement = (requirement: Requirement) => {
    setSelectedRequirement(requirement);
    setActiveTab(3); // Switch to detail tab
  };

  const handleDeleteRequirement = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this requirement?')) {
      await deleteRequirement({ variables: { id } });
    }
  };

  const handleFormSave = async (data: RequirementFormData) => {
    try {
      if (formMode === 'create') {
        await createRequirement({
          variables: {
            input: {
              ...data,
              projectId: 'current-project' // Replace with actual project ID
            }
          }
        });
      } else if (selectedRequirement) {
        await updateRequirement({
          variables: {
            id: selectedRequirement.id,
            input: data
          }
        });
      }
    } catch (error) {
      console.error('Form save error:', error);
    }
  };

  const handleStatusUpdate = async (status: RequirementStatus) => {
    if (selectedRequirement) {
      await updateStatus({
        variables: {
          id: selectedRequirement.id,
          status
        }
      });
    }
  };

  const handleAddComment = async (content: string, parentId?: string) => {
    if (selectedRequirement) {
      await addComment({
        variables: {
          input: {
            requirementId: selectedRequirement.id,
            content,
            parentId
          }
        }
      });
    }
  };

  const handleReactToComment = async (commentId: string, type: 'like' | 'dislike') => {
    // Implementation would depend on your GraphQL schema
    console.log('React to comment:', commentId, type);
  };

  const handleExport = async () => {
    await exportRequirements({
      variables: {
        filter,
        format: 'CSV' // or 'PDF', 'XLSX' depending on your backend
      }
    });
  };

  const handleNodeClick = (node: any) => {
    if (node.type === 'requirement') {
      // Find the requirement and view it
      const requirement = requirementsData?.requirements.data.find((req: Requirement) => req.id === node.id);
      if (requirement) {
        handleViewRequirement(requirement);
      }
    }
  };

  const handleEdgeClick = (edge: any) => {
    console.log('Edge clicked:', edge);
    // Handle edge click if needed
  };

  const handleLinkRequirement = (requirementId: string) => {
    console.log('Link requirement:', requirementId);
    // Implementation for linking requirements
  };

  const handleCompareRequirements = (requirementIds: string[]) => {
    console.log('Compare requirements:', requirementIds);
    // Implementation for comparing requirements
  };

  // Mock data for development (replace with actual data from queries)
  const requirements = requirementsData?.requirements.data || [];
  const selectedRequirementDetail = selectedRequirementData?.requirement;
  const similarRequirements: RequirementSimilarity[] = similarRequirementsData?.findSimilarRequirements || [];
  const requirementsGraph: RequirementsGraphData = graphData?.requirementsGraph || { nodes: [], edges: [] };
  const comments: RequirementComment[] = selectedRequirementDetail?.comments || [];
  const relationships: RequirementRelationship[] = selectedRequirementDetail?.relationships || [];

  // Mock stakeholders and available requirements for the form
  const availableStakeholders = ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Wilson'];
  const availableRequirements = requirements.filter(req => req.id !== selectedRequirement?.id);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Requirements Intelligence
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Comprehensive requirements management with AI-powered analysis and insights
        </Typography>
      </Box>

      {/* Action Toolbar */}
      <Paper sx={{ mb: 3 }}>
        <Toolbar>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateRequirement}
            sx={{ mr: 2 }}
          >
            New Requirement
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            sx={{ mr: 2 }}
          >
            Export
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            sx={{ mr: 2 }}
          >
            Import
          </Button>
          <Button
            variant="outlined"
            startIcon={<AnalyticsIcon />}
          >
            Analytics
          </Button>
        </Toolbar>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="requirements tabs">
          <Tab label={`List (${requirements.length})`} />
          <Tab label="Graph" />
          <Tab label="Analytics" />
          <Tab label="Details" disabled={!selectedRequirement} />
          <Tab label="Similarity" disabled={!selectedRequirement} />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        <RequirementsList
          requirements={requirements}
          loading={requirementsLoading}
          onEdit={handleEditRequirement}
          onDelete={handleDeleteRequirement}
          onView={handleViewRequirement}
          filter={filter}
          onFilterChange={setFilter}
          sort={sort}
          onSortChange={setSort}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <RequirementsGraph
          graphData={requirementsGraph}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          loading={graphLoading}
          height={600}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Requirements Analytics
          </Typography>
          <Typography color="text.secondary">
            Analytics dashboard coming soon...
          </Typography>
          {analyticsData && (
            <pre>{JSON.stringify(analyticsData, null, 2)}</pre>
          )}
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        {selectedRequirement && selectedRequirementDetail && (
          <RequirementDetail
            requirement={selectedRequirementDetail}
            similarRequirements={similarRequirements}
            relationships={relationships}
            comments={comments}
            onEdit={() => handleEditRequirement(selectedRequirement)}
            onDelete={() => handleDeleteRequirement(selectedRequirement.id)}
            onStatusUpdate={handleStatusUpdate}
            onAddComment={handleAddComment}
            onReactToComment={handleReactToComment}
            loading={selectedRequirementLoading}
          />
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={4}>
        {selectedRequirement && (
          <RequirementsSimilarity
            requirement={selectedRequirement}
            similarRequirements={similarRequirements}
            onViewRequirement={(id) => {
              const req = requirements.find(r => r.id === id);
              if (req) handleViewRequirement(req);
            }}
            onLinkRequirement={handleLinkRequirement}
            onCompareRequirements={handleCompareRequirements}
          />
        )}
      </TabPanel>

      {/* Form Dialog */}
      <Dialog 
        open={formOpen} 
        onClose={() => setFormOpen(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          {formMode === 'create' ? 'Create New Requirement' : 'Edit Requirement'}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <RequirementForm
            requirement={selectedRequirement || undefined}
            onSave={handleFormSave}
            onCancel={() => setFormOpen(false)}
            loading={createLoading || updateLoading}
            availableStakeholders={availableStakeholders}
            availableRequirements={availableRequirements}
            mode={formMode}
          />
        </DialogContent>
      </Dialog>

      {/* Loading Backdrop */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={createLoading || updateLoading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

      {/* Notification Snackbar */}
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
            variant="filled"
          >
            {notification.message}
          </Alert>
        )}
      </Snackbar>
    </Container>
  );
};

export default Requirements;