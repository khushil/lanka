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
  Switch,
  FormControlLabel,
  LinearProgress,
  Avatar,
  Badge,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  ToggleButton,
  ToggleButtonGroup,
  Stack
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Cloud as CloudIcon,
  CloudQueue as AWSIcon,
  Storage as AzureIcon,
  Speed as GCPIcon,
  MonetizationOn as CostIcon,
  TrendingUp as OptimizationIcon,
  Security as SecurityIcon,
  CompareArrows as CompareIcon,
  GetApp as DeployIcon,
  Code as CodeIcon,
  Assessment as AnalyticsIcon,
  Lightbulb as RecommendationIcon,
  Map as RegionIcon,
  NetworkCheck as NetworkIcon,
  Build as ConfigIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client';
import {
  GET_CLOUD_RECOMMENDATIONS,
  GENERATE_INFRASTRUCTURE_CODE
} from '../../graphql/architecture';
import type { CloudRecommendation, ArchitectureDecision } from '../../graphql/architecture';

interface CloudOptimizerProps {
  architecture?: any;
  onDeploymentGenerated?: (deployment: any) => void;
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

const CloudProviderCard: React.FC<{
  provider: string;
  recommendation: CloudRecommendation;
  isSelected: boolean;
  onSelect: () => void;
  onCompare: () => void;
  isComparing: boolean;
}> = ({ provider, recommendation, isSelected, onSelect, onCompare, isComparing }) => {
  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'aws':
        return <AWSIcon sx={{ color: '#FF9900' }} />;
      case 'azure':
        return <AzureIcon sx={{ color: '#0078D4' }} />;
      case 'gcp':
        return <GCPIcon sx={{ color: '#4285F4' }} />;
      default:
        return <CloudIcon />;
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'aws': return '#FF9900';
      case 'azure': return '#0078D4';
      case 'gcp': return '#4285F4';
      default: return '#666';
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
          <Avatar sx={{ mr: 2, bgcolor: getProviderColor(provider) }}>
            {getProviderIcon(provider)}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              {provider.toUpperCase()}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {recommendation.services.length} services configured
            </Typography>
          </Box>
        </Box>

        {/* Cost Summary */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" gutterBottom>
            Monthly Cost Estimate
          </Typography>
          <Typography variant="h4" color="primary" gutterBottom>
            ${recommendation.totalCost.monthly.toLocaleString()}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" color="textSecondary">
              Compute: ${recommendation.totalCost.breakdown.compute.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Storage: ${recommendation.totalCost.breakdown.storage.toLocaleString()}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="textSecondary">
              Network: ${recommendation.totalCost.breakdown.network.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Services: ${recommendation.totalCost.breakdown.services.toLocaleString()}
            </Typography>
          </Box>
        </Paper>

        {/* Key Services */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Key Services:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {recommendation.services.slice(0, 4).map((service, index) => (
              <Chip
                key={index}
                label={service.service}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            ))}
            {recommendation.services.length > 4 && (
              <Chip
                label={`+${recommendation.services.length - 4} more`}
                size="small"
                color="secondary"
              />
            )}
          </Box>
        </Box>

        {/* Optimization Suggestions */}
        {recommendation.optimization.suggestions.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Optimization Opportunities:
            </Typography>
            <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
              <Typography variant="caption">
                {recommendation.optimization.suggestions[0]}
              </Typography>
              {recommendation.optimization.potentialSavings > 0 && (
                <Typography variant="caption" display="block" sx={{ mt: 0.5, fontWeight: 'bold' }}>
                  Potential Savings: ${recommendation.optimization.potentialSavings.toLocaleString()}/month
                </Typography>
              )}
            </Alert>
          </Box>
        )}

        {/* Deployment Info */}
        <Box sx={{ mb: 2 }}>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">
                Regions: {recommendation.deployment.regions.length}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">
                AZs: {recommendation.deployment.availabilityZones.length}
              </Typography>
            </Grid>
          </Grid>
        </Box>
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

const ServiceConfigurationCard: React.FC<{
  service: any;
  onConfigChange: (config: any) => void;
}> = ({ service, onConfigChange }) => {
  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            {service.component} → {service.service}
          </Typography>
          <Chip
            label={`$${service.cost.monthly.toLocaleString()}/mo`}
            size="small"
            color="primary"
            sx={{ mr: 2 }}
          />
          <Chip
            label={service.tier}
            size="small"
            variant="outlined"
          />
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Performance Configuration
            </Typography>
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption">CPU: {service.performance.cpu}</Typography>
            </Box>
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption">Memory: {service.performance.memory}</Typography>
            </Box>
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption">Storage: {service.performance.storage}</Typography>
            </Box>
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption">Bandwidth: {service.performance.bandwidth}</Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Cost Breakdown
            </Typography>
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption">
                Monthly: ${service.cost.monthly.toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption">
                Yearly: ${service.cost.yearly.toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption">
                Pay-as-you-go: ${service.cost.payAsYouGo.toLocaleString()}
              </Typography>
            </Box>
          </Grid>

          {service.alternatives && service.alternatives.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Alternative Services
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Service</TableCell>
                      <TableCell>Cost Difference</TableCell>
                      <TableCell>Performance Impact</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {service.alternatives.map((alt: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{alt.service}</TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            color={alt.costDifference < 0 ? 'success.main' : 'error.main'}
                          >
                            {alt.costDifference > 0 ? '+' : ''}${alt.costDifference.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            color={alt.performanceDifference > 0 ? 'success.main' : 'warning.main'}
                          >
                            {alt.performanceDifference > 0 ? '+' : ''}{alt.performanceDifference}%
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          )}
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};

export const CloudOptimizer: React.FC<CloudOptimizerProps> = ({
  architecture,
  onDeploymentGenerated
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [comparingProviders, setComparingProviders] = useState<string[]>([]);
  const [requirements, setRequirements] = useState({
    region: 'us-east-1',
    highAvailability: true,
    autoScaling: true,
    securityCompliance: 'standard',
    budget: 10000,
    performance: 'balanced'
  });
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [deploymentStep, setDeploymentStep] = useState(0);
  const [generatedCode, setGeneratedCode] = useState<any>(null);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [deploymentFormat, setDeploymentFormat] = useState('terraform');

  const { data, loading, error, refetch } = useQuery(GET_CLOUD_RECOMMENDATIONS, {
    variables: {
      architecture: architecture || { components: [], connections: [] },
      requirements
    },
    skip: !architecture
  });

  const [generateCode] = useMutation(GENERATE_INFRASTRUCTURE_CODE, {
    onCompleted: (data) => {
      setGeneratedCode(data.generateInfrastructureCode);
      setCodeDialogOpen(true);
      if (onDeploymentGenerated) {
        onDeploymentGenerated(data.generateInfrastructureCode);
      }
    }
  });

  const recommendations: CloudRecommendation[] = data?.cloudRecommendations || [];

  const handleProviderSelect = (provider: string) => {
    setSelectedProvider(provider === selectedProvider ? '' : provider);
  };

  const handleCompareProvider = (provider: string) => {
    if (comparingProviders.length >= 3) {
      setComparingProviders(prev => [...prev.slice(1), provider]);
    } else {
      setComparingProviders(prev => [...prev, provider]);
    }
  };

  const handleGenerateDeployment = () => {
    const selectedRec = recommendations.find(r => r.provider.toLowerCase() === selectedProvider.toLowerCase());
    if (!selectedRec) return;

    generateCode({
      variables: {
        input: {
          provider: selectedProvider.toLowerCase(),
          architecture: architecture,
          requirements: requirements,
          format: deploymentFormat,
          services: selectedRec.services,
          deployment: selectedRec.deployment
        }
      }
    });
  };

  const downloadCode = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getDeploymentSteps = () => [
    {
      label: 'Configure Requirements',
      description: 'Set your cloud deployment preferences'
    },
    {
      label: 'Compare Providers',
      description: 'Review recommendations from multiple cloud providers'
    },
    {
      label: 'Select Provider',
      description: 'Choose the best cloud provider for your needs'
    },
    {
      label: 'Generate Infrastructure',
      description: 'Create deployment scripts and configurations'
    }
  ];

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading cloud recommendations...</Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error loading cloud recommendations: {error.message}
      </Alert>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(_, value) => setTabValue(value)}>
          <Tab label="Recommendations" />
          <Tab label="Service Configuration" />
          <Tab label="Cost Analysis" />
          <Tab label="Deployment" />
        </Tabs>
      </Box>

      {/* Action Bar */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <Button
              variant="outlined"
              onClick={() => setRequirementsOpen(true)}
              startIcon={<ConfigIcon />}
              fullWidth
            >
              Configure Requirements
            </Button>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              variant="outlined"
              onClick={handleGenerateDeployment}
              disabled={!selectedProvider}
              startIcon={<DeployIcon />}
              fullWidth
            >
              Generate Deployment
            </Button>
          </Grid>
          <Grid item xs={12} md={3}>
            <ToggleButtonGroup
              value={deploymentFormat}
              exclusive
              onChange={(_, value) => value && setDeploymentFormat(value)}
              size="small"
            >
              <ToggleButton value="terraform">Terraform</ToggleButton>
              <ToggleButton value="kubernetes">K8s</ToggleButton>
              <ToggleButton value="cloudFormation">CloudFormation</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="body2" color="textSecondary">
              {recommendations.length} providers | {selectedProvider && `Selected: ${selectedProvider.toUpperCase()}`}
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
                  Deployment Process
                </Typography>
                <Stepper activeStep={deploymentStep} orientation="vertical">
                  {getDeploymentSteps().map((step, index) => (
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
              </Paper>
            </Grid>
            
            <Grid item xs={12} lg={8}>
              <Grid container spacing={2}>
                {recommendations.map((recommendation) => (
                  <Grid item xs={12} md={6} key={recommendation.provider}>
                    <CloudProviderCard
                      provider={recommendation.provider}
                      recommendation={recommendation}
                      isSelected={selectedProvider === recommendation.provider}
                      onSelect={() => handleProviderSelect(recommendation.provider)}
                      onCompare={() => handleCompareProvider(recommendation.provider)}
                      isComparing={comparingProviders.includes(recommendation.provider)}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {selectedProvider ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                Service Configuration for {selectedProvider.toUpperCase()}
              </Typography>
              {recommendations
                .find(r => r.provider === selectedProvider)
                ?.services.map((service, index) => (
                  <ServiceConfigurationCard
                    key={index}
                    service={service}
                    onConfigChange={(config) => {
                      // Handle configuration changes
                      console.log('Config changed:', config);
                    }}
                  />
                ))}
            </Box>
          ) : (
            <Alert severity="info">
              Please select a cloud provider from the Recommendations tab to configure services.
            </Alert>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Cost Comparison
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Provider</TableCell>
                        <TableCell>Monthly Cost</TableCell>
                        <TableCell>Yearly Cost</TableCell>
                        <TableCell>Compute</TableCell>
                        <TableCell>Storage</TableCell>
                        <TableCell>Network</TableCell>
                        <TableCell>Services</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recommendations.map((rec) => (
                        <TableRow
                          key={rec.provider}
                          selected={selectedProvider === rec.provider}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar sx={{ mr: 1, width: 24, height: 24 }}>
                                {rec.provider === 'aws' && <AWSIcon />}
                                {rec.provider === 'azure' && <AzureIcon />}
                                {rec.provider === 'gcp' && <GCPIcon />}
                              </Avatar>
                              {rec.provider.toUpperCase()}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              ${rec.totalCost.monthly.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            ${rec.totalCost.yearly.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            ${rec.totalCost.breakdown.compute.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            ${rec.totalCost.breakdown.storage.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            ${rec.totalCost.breakdown.network.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            ${rec.totalCost.breakdown.services.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Stack spacing={2}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Cost Optimization
                  </Typography>
                  {recommendations.map((rec) => (
                    <Box key={rec.provider} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {rec.provider.toUpperCase()}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" paragraph>
                        {rec.optimization.suggestions[0] || 'No optimizations available'}
                      </Typography>
                      {rec.optimization.potentialSavings > 0 && (
                        <Chip
                          icon={<CostIcon />}
                          label={`Save $${rec.optimization.potentialSavings.toLocaleString()}/mo`}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  ))}
                </Paper>

                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Requirements
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="Region" 
                        secondary={requirements.region} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="High Availability" 
                        secondary={requirements.highAvailability ? 'Enabled' : 'Disabled'} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Auto Scaling" 
                        secondary={requirements.autoScaling ? 'Enabled' : 'Disabled'} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Budget" 
                        secondary={`$${requirements.budget.toLocaleString()}/month`} 
                      />
                    </ListItem>
                  </List>
                </Paper>
              </Stack>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {generatedCode ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                Generated Infrastructure Code
              </Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item>
                  <Button
                    startIcon={<DownloadIcon />}
                    onClick={() => downloadCode(generatedCode.terraform?.main || '', 'main.tf')}
                    disabled={!generatedCode.terraform?.main}
                  >
                    Download Terraform
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    startIcon={<DownloadIcon />}
                    onClick={() => downloadCode(generatedCode.kubernetes?.deployments || '', 'deployment.yaml')}
                    disabled={!generatedCode.kubernetes?.deployments}
                  >
                    Download Kubernetes
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    startIcon={<DownloadIcon />}
                    onClick={() => downloadCode(generatedCode.docker?.dockerCompose || '', 'docker-compose.yml')}
                    disabled={!generatedCode.docker?.dockerCompose}
                  >
                    Download Docker
                  </Button>
                </Grid>
              </Grid>

              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Terraform Configuration</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box component="pre" sx={{ 
                    bgcolor: 'grey.100', 
                    p: 2, 
                    borderRadius: 1, 
                    overflow: 'auto',
                    fontSize: '0.875rem',
                    fontFamily: 'monospace'
                  }}>
                    {generatedCode.terraform?.main || 'No Terraform configuration generated'}
                  </Box>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Kubernetes Manifests</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box component="pre" sx={{ 
                    bgcolor: 'grey.100', 
                    p: 2, 
                    borderRadius: 1, 
                    overflow: 'auto',
                    fontSize: '0.875rem',
                    fontFamily: 'monospace'
                  }}>
                    {generatedCode.kubernetes?.deployments || 'No Kubernetes manifests generated'}
                  </Box>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Docker Compose</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box component="pre" sx={{ 
                    bgcolor: 'grey.100', 
                    p: 2, 
                    borderRadius: 1, 
                    overflow: 'auto',
                    fontSize: '0.875rem',
                    fontFamily: 'monospace'
                  }}>
                    {generatedCode.docker?.dockerCompose || 'No Docker Compose file generated'}
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          ) : (
            <Alert severity="info">
              Select a cloud provider and generate deployment to view infrastructure code.
            </Alert>
          )}
        </TabPanel>
      </Box>

      {/* Requirements Dialog */}
      <Dialog
        open={requirementsOpen}
        onClose={() => setRequirementsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Cloud Requirements</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Primary Region</InputLabel>
                <Select
                  value={requirements.region}
                  onChange={(e) => setRequirements({...requirements, region: e.target.value})}
                >
                  <MenuItem value="us-east-1">US East (Virginia)</MenuItem>
                  <MenuItem value="us-west-2">US West (Oregon)</MenuItem>
                  <MenuItem value="eu-west-1">Europe (Ireland)</MenuItem>
                  <MenuItem value="ap-southeast-1">Asia Pacific (Singapore)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Performance Profile</InputLabel>
                <Select
                  value={requirements.performance}
                  onChange={(e) => setRequirements({...requirements, performance: e.target.value})}
                >
                  <MenuItem value="cost-optimized">Cost Optimized</MenuItem>
                  <MenuItem value="balanced">Balanced</MenuItem>
                  <MenuItem value="performance-optimized">Performance Optimized</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Security Compliance</InputLabel>
                <Select
                  value={requirements.securityCompliance}
                  onChange={(e) => setRequirements({...requirements, securityCompliance: e.target.value})}
                >
                  <MenuItem value="standard">Standard</MenuItem>
                  <MenuItem value="hipaa">HIPAA</MenuItem>
                  <MenuItem value="pci-dss">PCI-DSS</MenuItem>
                  <MenuItem value="gdpr">GDPR</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Monthly Budget ($)"
                type="number"
                value={requirements.budget}
                onChange={(e) => setRequirements({...requirements, budget: parseInt(e.target.value) || 0})}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={requirements.highAvailability}
                    onChange={(e) => setRequirements({...requirements, highAvailability: e.target.checked})}
                  />
                }
                label="High Availability"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={requirements.autoScaling}
                    onChange={(e) => setRequirements({...requirements, autoScaling: e.target.checked})}
                  />
                }
                label="Auto Scaling"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequirementsOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => {
            refetch();
            setRequirementsOpen(false);
          }}>
            Update Recommendations
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CloudOptimizer;