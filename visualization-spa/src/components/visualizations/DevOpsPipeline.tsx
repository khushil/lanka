import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Avatar
} from '@mui/material';
import {
  Timeline,
  Code,
  Build,
  Security,
  CloudUpload,
  CheckCircle,
  Error,
  Schedule,
  PlayArrow,
  Refresh,
  ArrowForward,
  BugReport,
  Storage
} from '@mui/icons-material';

interface DevOpsPipelineProps {
  viewMode?: 'overview' | 'detailed';
  isLoading?: boolean;
  autoRefresh?: boolean;
}

interface PipelineStage {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  duration?: number;
  startTime?: Date;
  endTime?: Date;
  logs?: string[];
  metrics?: {
    [key: string]: number | string;
  };
}

interface PipelineRun {
  id: string;
  branch: string;
  commit: string;
  author: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  startTime: Date;
  endTime?: Date;
  stages: PipelineStage[];
}

const DevOpsPipeline: React.FC<DevOpsPipelineProps> = ({
  viewMode = 'overview',
  isLoading = false,
  autoRefresh = true
}) => {
  const [currentRun, setCurrentRun] = useState<PipelineRun | null>(null);
  const [recentRuns, setRecentRuns] = useState<PipelineRun[]>([]);
  const [activeStage, setActiveStage] = useState<number>(0);

  // Mock data generation
  useEffect(() => {
    const generateMockRun = (): PipelineRun => {
      const stages: PipelineStage[] = [
        {
          id: 'source',
          name: 'Source Code',
          status: 'success',
          duration: 15000,
          startTime: new Date(Date.now() - 300000),
          endTime: new Date(Date.now() - 285000),
          metrics: {
            'Files Changed': 12,
            'Lines Added': 345,
            'Lines Removed': 123
          }
        },
        {
          id: 'build',
          name: 'Build & Compile',
          status: 'success',
          duration: 120000,
          startTime: new Date(Date.now() - 285000),
          endTime: new Date(Date.now() - 165000),
          metrics: {
            'Build Time': '2m 5s',
            'Artifacts': 3,
            'Size': '45.2 MB'
          }
        },
        {
          id: 'test',
          name: 'Test Suite',
          status: 'running',
          startTime: new Date(Date.now() - 165000),
          metrics: {
            'Tests Passed': 187,
            'Tests Failed': 2,
            'Coverage': '84.3%'
          }
        },
        {
          id: 'security',
          name: 'Security Scan',
          status: 'pending',
          metrics: {
            'Vulnerabilities': 'N/A',
            'License Issues': 'N/A'
          }
        },
        {
          id: 'deploy',
          name: 'Deploy',
          status: 'pending',
          metrics: {
            'Environment': 'staging',
            'Instances': 'N/A'
          }
        }
      ];

      return {
        id: 'run-' + Date.now(),
        branch: 'feature/user-dashboard',
        commit: 'a1b2c3d',
        author: 'John Doe',
        status: 'running',
        startTime: new Date(Date.now() - 300000),
        stages
      };
    };

    const generateRecentRuns = (): PipelineRun[] => {
      return [
        {
          id: 'run-1',
          branch: 'main',
          commit: 'e5f6g7h',
          author: 'Alice Smith',
          status: 'success',
          startTime: new Date(Date.now() - 3600000),
          endTime: new Date(Date.now() - 3300000),
          stages: []
        },
        {
          id: 'run-2',
          branch: 'feature/api-improvements',
          commit: 'i9j0k1l',
          author: 'Bob Johnson',
          status: 'failed',
          startTime: new Date(Date.now() - 7200000),
          endTime: new Date(Date.now() - 6900000),
          stages: []
        },
        {
          id: 'run-3',
          branch: 'hotfix/critical-bug',
          commit: 'm2n3o4p',
          author: 'Carol Wilson',
          status: 'success',
          startTime: new Date(Date.now() - 10800000),
          endTime: new Date(Date.now() - 10500000),
          stages: []
        }
      ];
    };

    setCurrentRun(generateMockRun());
    setRecentRuns(generateRecentRuns());
  }, []);

  const getStageIcon = (stage: PipelineStage) => {
    switch (stage.id) {
      case 'source':
        return <Code sx={{ fontSize: 20 }} />;
      case 'build':
        return <Build sx={{ fontSize: 20 }} />;
      case 'test':
        return <BugReport sx={{ fontSize: 20 }} />;
      case 'security':
        return <Security sx={{ fontSize: 20 }} />;
      case 'deploy':
        return <CloudUpload sx={{ fontSize: 20 }} />;
      default:
        return <Timeline sx={{ fontSize: 20 }} />;
    }
  };

  const getStatusIcon = (status: PipelineStage['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle sx={{ fontSize: 20, color: 'success.main' }} />;
      case 'failed':
        return <Error sx={{ fontSize: 20, color: 'error.main' }} />;
      case 'running':
        return <Schedule sx={{ fontSize: 20, color: 'primary.main' }} />;
      default:
        return <Schedule sx={{ fontSize: 20, color: 'grey.400' }} />;
    }
  };

  const getStatusColor = (status: PipelineStage['status']) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'primary';
      default:
        return 'default';
    }
  };

  const formatDuration = (milliseconds?: number) => {
    if (!milliseconds) return 'N/A';
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const handleRetrigger = useCallback(() => {
    // Mock retrigger logic
    console.log('Retriggering pipeline...');
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Pipeline Header */}
      {currentRun && (
        <Card>
          <CardHeader>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Timeline sx={{ fontSize: 24, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h6">
                    Pipeline Run #{currentRun.id.split('-')[1]}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {currentRun.branch} • {currentRun.commit} • by {currentRun.author}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip 
                  label={currentRun.status}
                  color={getStatusColor(currentRun.status) as any}
                  variant="outlined"
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleRetrigger}
                  startIcon={<Refresh />}
                >
                  Retrigger
                </Button>
              </Box>
            </Box>
          </CardHeader>
        </Card>
      )}

      {/* Pipeline Stages */}
      {currentRun && (
        <Card>
          <CardHeader>
            <Typography variant="h6">Pipeline Stages</Typography>
          </CardHeader>
          <CardContent>
            <Stepper orientation="vertical" activeStep={activeStage}>
              {currentRun.stages.map((stage, index) => (
                <Step key={stage.id} completed={stage.status === 'success'}>
                  <StepLabel
                    StepIconComponent={() => (
                      <Avatar sx={{ 
                        width: 32, 
                        height: 32, 
                        backgroundColor: stage.status === 'success' ? 'success.main' : 
                                       stage.status === 'failed' ? 'error.main' :
                                       stage.status === 'running' ? 'primary.main' : 'grey.300'
                      }}>
                        {getStageIcon(stage)}
                      </Avatar>
                    )}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="subtitle1">{stage.name}</Typography>
                      <Chip 
                        label={stage.status}
                        size="small"
                        color={getStatusColor(stage.status) as any}
                        variant="outlined"
                      />
                      {stage.duration && (
                        <Typography variant="caption" color="text.secondary">
                          {formatDuration(stage.duration)}
                        </Typography>
                      )}
                    </Box>
                  </StepLabel>
                  <StepContent>
                    <Box sx={{ pl: 2, pb: 2 }}>
                      {stage.status === 'running' && (
                        <LinearProgress sx={{ mb: 2 }} />
                      )}
                      
                      {stage.metrics && (
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
                          {Object.entries(stage.metrics).map(([key, value]) => (
                            <Box key={key}>
                              <Typography variant="caption" color="text.secondary">
                                {key}
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {value}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </CardContent>
        </Card>
      )}

      {/* Recent Pipeline Runs */}
      <Card>
        <CardHeader>
          <Typography variant="h6">Recent Pipeline Runs</Typography>
        </CardHeader>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {recentRuns.map((run) => (
              <Paper 
                key={run.id} 
                variant="outlined" 
                sx={{ p: 2, cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {getStatusIcon(run.status)}
                    <Box>
                      <Typography variant="subtitle2">
                        {run.branch} • {run.commit}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        by {run.author} • {run.startTime.toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label={run.status}
                      size="small"
                      color={getStatusColor(run.status) as any}
                      variant="outlined"
                    />
                    {run.endTime && (
                      <Typography variant="caption" color="text.secondary">
                        {formatDuration(run.endTime.getTime() - run.startTime.getTime())}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Pipeline Statistics */}
      <Card>
        <CardHeader>
          <Typography variant="h6">Pipeline Statistics</Typography>
        </CardHeader>
        <CardContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">98.5%</Typography>
              <Typography variant="body2" color="text.secondary">Success Rate</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main">4.2m</Typography>
              <Typography variant="body2" color="text.secondary">Avg Duration</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">24</Typography>
              <Typography variant="body2" color="text.secondary">Runs Today</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">2.1GB</Typography>
              <Typography variant="body2" color="text.secondary">Artifacts Size</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DevOpsPipeline;