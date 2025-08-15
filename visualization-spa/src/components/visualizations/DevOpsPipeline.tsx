import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Play,
  Pause,
  Square,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Workflow,
  GitBranch,
  Server,
  Shield,
  Zap,
  Eye,
  Download,
  RefreshCw,
  Settings,
  ArrowRight,
  Timer,
  Activity,
} from 'lucide-react';

interface DevOpsPipelineProps {
  viewMode?: 'overview' | 'detailed';
  isLoading?: boolean;
  autoRefresh?: boolean;
}

interface PipelineStage {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  duration: number;
  startTime?: Date;
  endTime?: Date;
  progress: number;
  icon: React.ReactNode;
  dependencies: string[];
  logs: Array<{
    timestamp: Date;
    level: 'info' | 'warning' | 'error';
    message: string;
  }>;
  artifacts?: Array<{
    name: string;
    type: string;
    size: number;
    url: string;
  }>;
}

interface Pipeline {
  id: string;
  name: string;
  branch: string;
  trigger: string;
  status: 'running' | 'success' | 'failed' | 'cancelled';
  stages: PipelineStage[];
  startTime: Date;
  totalDuration: number;
  triggeredBy: string;
}

interface PipelineMetrics {
  totalRuns: number;
  successRate: number;
  avgDuration: number;
  deploymentFrequency: number;
  leadTime: number;
  mttr: number; // Mean Time To Recovery
  changeFailureRate: number;
}

const DevOpsPipeline: React.FC<DevOpsPipelineProps> = ({
  viewMode = 'overview',
  isLoading = false,
  autoRefresh = true
}) => {
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate mock pipeline data
  const generateMockPipeline = useCallback((): Pipeline => {
    const branches = ['main', 'develop', 'feature/user-auth', 'hotfix/security-patch'];
    const triggers = ['Push', 'Pull Request', 'Manual', 'Scheduled'];
    const users = ['alice@company.com', 'bob@company.com', 'charlie@company.com'];
    
    const stages: PipelineStage[] = [
      {
        id: 'source',
        name: 'Source',
        description: 'Clone repository and prepare workspace',
        status: 'success',
        duration: Math.floor(Math.random() * 30) + 10,
        progress: 100,
        icon: <GitBranch className="h-4 w-4" />,
        dependencies: [],
        logs: [
          { timestamp: new Date(), level: 'info', message: 'Cloning repository...' },
          { timestamp: new Date(), level: 'info', message: 'Checkout successful' }
        ]
      },
      {
        id: 'build',
        name: 'Build',
        description: 'Compile and package application',
        status: Math.random() > 0.1 ? 'success' : 'failed',
        duration: Math.floor(Math.random() * 120) + 60,
        progress: 100,
        icon: <Settings className="h-4 w-4" />,
        dependencies: ['source'],
        logs: [
          { timestamp: new Date(), level: 'info', message: 'Installing dependencies...' },
          { timestamp: new Date(), level: 'info', message: 'Building application...' },
          { timestamp: new Date(), level: 'info', message: 'Build completed successfully' }
        ],
        artifacts: [
          { name: 'app.tar.gz', type: 'archive', size: 1024000, url: '/artifacts/app.tar.gz' },
          { name: 'build-report.html', type: 'report', size: 5120, url: '/artifacts/build-report.html' }
        ]
      },
      {
        id: 'test',
        name: 'Test',
        description: 'Run automated tests and quality checks',
        status: Math.random() > 0.15 ? 'success' : 'failed',
        duration: Math.floor(Math.random() * 180) + 90,
        progress: 100,
        icon: <Shield className="h-4 w-4" />,
        dependencies: ['build'],
        logs: [
          { timestamp: new Date(), level: 'info', message: 'Running unit tests...' },
          { timestamp: new Date(), level: 'info', message: 'Running integration tests...' },
          { timestamp: new Date(), level: 'warning', message: 'Test coverage below 90%' },
          { timestamp: new Date(), level: 'info', message: 'All tests passed' }
        ],
        artifacts: [
          { name: 'test-results.xml', type: 'test-report', size: 2048, url: '/artifacts/test-results.xml' },
          { name: 'coverage-report.html', type: 'coverage', size: 8192, url: '/artifacts/coverage-report.html' }
        ]
      },
      {
        id: 'security',
        name: 'Security Scan',
        description: 'Vulnerability and security analysis',
        status: Math.random() > 0.2 ? 'success' : 'failed',
        duration: Math.floor(Math.random() * 90) + 30,
        progress: 100,
        icon: <Shield className="h-4 w-4" />,
        dependencies: ['test'],
        logs: [
          { timestamp: new Date(), level: 'info', message: 'Scanning for vulnerabilities...' },
          { timestamp: new Date(), level: 'warning', message: 'Found 2 low-severity issues' },
          { timestamp: new Date(), level: 'info', message: 'Security scan completed' }
        ]
      },
      {
        id: 'deploy-staging',
        name: 'Deploy to Staging',
        description: 'Deploy to staging environment',
        status: Math.random() > 0.25 ? 'success' : 'failed',
        duration: Math.floor(Math.random() * 60) + 30,
        progress: 100,
        icon: <Server className="h-4 w-4" />,
        dependencies: ['security'],
        logs: [
          { timestamp: new Date(), level: 'info', message: 'Deploying to staging...' },
          { timestamp: new Date(), level: 'info', message: 'Health checks passed' },
          { timestamp: new Date(), level: 'info', message: 'Deployment successful' }
        ]
      },
      {
        id: 'deploy-production',
        name: 'Deploy to Production',
        description: 'Deploy to production environment',
        status: Math.random() > 0.3 ? 'success' : 'pending',
        duration: Math.floor(Math.random() * 90) + 45,
        progress: Math.random() > 0.3 ? 100 : Math.floor(Math.random() * 60) + 20,
        icon: <Zap className="h-4 w-4" />,
        dependencies: ['deploy-staging'],
        logs: [
          { timestamp: new Date(), level: 'info', message: 'Waiting for approval...' },
          { timestamp: new Date(), level: 'info', message: 'Deploying to production...' }
        ]
      }
    ];

    const pipeline: Pipeline = {
      id: `pipeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `Build #${Math.floor(Math.random() * 1000) + 1}`,
      branch: branches[Math.floor(Math.random() * branches.length)],
      trigger: triggers[Math.floor(Math.random() * triggers.length)],
      status: stages.some(s => s.status === 'failed') ? 'failed' : 
              stages.every(s => s.status === 'success') ? 'success' : 'running',
      stages,
      startTime: new Date(Date.now() - Math.random() * 3600000),
      totalDuration: stages.reduce((sum, stage) => sum + stage.duration, 0),
      triggeredBy: users[Math.floor(Math.random() * users.length)]
    };

    return pipeline;
  }, []);

  const generateMockMetrics = useCallback((): PipelineMetrics => {
    return {
      totalRuns: Math.floor(Math.random() * 500) + 100,
      successRate: Math.random() * 20 + 75, // 75-95%
      avgDuration: Math.random() * 300 + 180, // 3-8 minutes
      deploymentFrequency: Math.random() * 10 + 5, // 5-15 per day
      leadTime: Math.random() * 120 + 60, // 1-3 hours
      mttr: Math.random() * 30 + 15, // 15-45 minutes
      changeFailureRate: Math.random() * 10 + 2 // 2-12%
    };
  }, []);

  useEffect(() => {
    // Generate initial data
    const initialPipelines = Array.from({ length: 3 }, generateMockPipeline);
    setPipelines(initialPipelines);
    setSelectedPipeline(initialPipelines[0]);
    setMetrics(generateMockMetrics());
  }, [generateMockPipeline, generateMockMetrics]);

  const simulateRunningPipeline = useCallback(() => {
    if (!isSimulating) return;

    setSelectedPipeline(prev => {
      if (!prev) return prev;

      const updatedStages = prev.stages.map(stage => {
        if (stage.status === 'running' && stage.progress < 100) {
          const increment = animationSpeed === 'fast' ? 5 : animationSpeed === 'slow' ? 1 : 2;
          const newProgress = Math.min(100, stage.progress + increment);
          
          if (newProgress === 100) {
            return {
              ...stage,
              progress: 100,
              status: Math.random() > 0.1 ? 'success' : 'failed' as const,
              endTime: new Date()
            };
          }
          
          return { ...stage, progress: newProgress };
        }
        
        // Start next stage if previous stages are complete
        if (stage.status === 'pending') {
          const dependencies = stage.dependencies;
          const allDepsComplete = dependencies.every(depId => {
            const depStage = prev.stages.find(s => s.id === depId);
            return depStage?.status === 'success';
          });
          
          if (dependencies.length === 0 || allDepsComplete) {
            return {
              ...stage,
              status: 'running' as const,
              startTime: new Date(),
              progress: 0
            };
          }
        }
        
        return stage;
      });

      return { ...prev, stages: updatedStages };
    });
  }, [isSimulating, animationSpeed]);

  useEffect(() => {
    if (isSimulating) {
      const speed = animationSpeed === 'fast' ? 200 : animationSpeed === 'slow' ? 1000 : 500;
      intervalRef.current = setInterval(simulateRunningPipeline, speed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isSimulating, simulateRunningPipeline, animationSpeed]);

  const startSimulation = () => {
    const newPipeline = generateMockPipeline();
    // Reset all stages to pending except the first one
    newPipeline.stages = newPipeline.stages.map((stage, index) => ({
      ...stage,
      status: index === 0 ? 'running' : 'pending',
      progress: index === 0 ? 0 : 0
    }));
    
    setSelectedPipeline(newPipeline);
    setIsSimulating(true);
  };

  const stopSimulation = () => {
    setIsSimulating(false);
  };

  const getStageStatusIcon = (status: PipelineStage['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'skipped':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStageStatusColor = (status: PipelineStage['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'failed':
        return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'running':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'skipped':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      default:
        return 'border-gray-300 bg-gray-50 dark:bg-gray-800';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Pipeline Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Success Rate',
              value: `${metrics.successRate.toFixed(1)}%`,
              icon: <CheckCircle className="h-5 w-5 text-green-500" />,
              trend: 'up'
            },
            {
              label: 'Avg Duration',
              value: formatDuration(Math.floor(metrics.avgDuration)),
              icon: <Timer className="h-5 w-5 text-blue-500" />,
              trend: 'down'
            },
            {
              label: 'Daily Deployments',
              value: metrics.deploymentFrequency.toFixed(1),
              icon: <Activity className="h-5 w-5 text-purple-500" />,
              trend: 'up'
            },
            {
              label: 'MTTR',
              value: `${metrics.mttr.toFixed(0)}m`,
              icon: <RefreshCw className="h-5 w-5 text-orange-500" />,
              trend: 'down'
            }
          ].map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      {metric.icon}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {metric.trend === 'up' ? '↗' : '↘'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{metric.label}</span>
                    <div className="text-xl font-bold">{metric.value}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pipeline Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              DevOps Pipeline Visualization
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Speed:</span>
                <select 
                  value={animationSpeed} 
                  onChange={(e) => setAnimationSpeed(e.target.value as 'slow' | 'normal' | 'fast')}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="slow">Slow</option>
                  <option value="normal">Normal</option>
                  <option value="fast">Fast</option>
                </select>
              </div>
              
              {isSimulating ? (
                <Button size="sm" onClick={stopSimulation} variant="destructive">
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              ) : (
                <Button size="sm" onClick={startSimulation}>
                  <Play className="h-4 w-4 mr-2" />
                  Simulate
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedPipeline && (
            <div className="space-y-6">
              {/* Pipeline Info */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4" />
                    <span className="font-medium">{selectedPipeline.name}</span>
                  </div>
                  
                  <Badge variant="outline">{selectedPipeline.branch}</Badge>
                  
                  <Badge 
                    variant={selectedPipeline.status === 'success' ? 'default' : 
                            selectedPipeline.status === 'failed' ? 'destructive' : 'secondary'}
                  >
                    {selectedPipeline.status}
                  </Badge>
                </div>
                
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Triggered by {selectedPipeline.triggeredBy} • {formatDuration(selectedPipeline.totalDuration)}
                </div>
              </div>

              {/* Pipeline Stages Flow */}
              <div className="relative">
                <div className="flex items-center justify-between">
                  {selectedPipeline.stages.map((stage, index) => (
                    <React.Fragment key={stage.id}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className={`relative flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                          getStageStatusColor(stage.status)
                        } ${selectedStage?.id === stage.id ? 'ring-2 ring-blue-500' : ''}`}
                        onClick={() => setSelectedStage(stage)}
                        style={{ minWidth: '140px' }}
                      >
                        {/* Stage Icon and Status */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-2 bg-white dark:bg-gray-900 rounded-lg">
                            {stage.icon}
                          </div>
                          {getStageStatusIcon(stage.status)}
                        </div>
                        
                        {/* Stage Name */}
                        <h3 className="font-medium text-sm text-center mb-2">
                          {stage.name}
                        </h3>
                        
                        {/* Progress Bar */}
                        {stage.status === 'running' && (
                          <div className="w-full mb-2">
                            <Progress value={stage.progress} className="h-2" />
                            <div className="text-xs text-center mt-1">
                              {stage.progress.toFixed(0)}%
                            </div>
                          </div>
                        )}
                        
                        {/* Duration */}
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {formatDuration(stage.duration)}
                        </div>
                        
                        {/* Animation for running stages */}
                        {stage.status === 'running' && (
                          <motion.div
                            className="absolute inset-0 border-2 border-blue-500 rounded-lg"
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          />
                        )}
                      </motion.div>
                      
                      {/* Arrow between stages */}
                      {index < selectedPipeline.stages.length - 1 && (
                        <div className="flex items-center">
                          <ArrowRight className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Stage Details Panel */}
              {selectedStage && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                >
                  {/* Stage Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        {selectedStage.icon}
                        {selectedStage.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedStage.description}
                      </p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Status</span>
                          <div className="flex items-center gap-2">
                            {getStageStatusIcon(selectedStage.status)}
                            <span className="capitalize">{selectedStage.status}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Duration</span>
                          <span>{formatDuration(selectedStage.duration)}</span>
                        </div>
                        
                        {selectedStage.status === 'running' && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Progress</span>
                              <span>{selectedStage.progress.toFixed(0)}%</span>
                            </div>
                            <Progress value={selectedStage.progress} className="h-2" />
                          </div>
                        )}
                        
                        {selectedStage.dependencies.length > 0 && (
                          <div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">Dependencies:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedStage.dependencies.map(dep => (
                                <Badge key={dep} variant="outline" className="text-xs">
                                  {dep}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Stage Logs */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Logs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {selectedStage.logs.map((log, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                              log.level === 'error' ? 'bg-red-500' :
                              log.level === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                            }`} />
                            <div className="flex-1">
                              <div className="text-xs text-gray-500 mb-1">
                                {log.timestamp.toLocaleTimeString()}
                              </div>
                              <div className={log.level === 'error' ? 'text-red-600 dark:text-red-400' :
                                            log.level === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                                            'text-gray-700 dark:text-gray-300'}>
                                {log.message}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Artifacts */}
                  {selectedStage.artifacts && selectedStage.artifacts.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Artifacts</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {selectedStage.artifacts.map((artifact, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                              <div className="flex-1">
                                <div className="font-medium text-sm">{artifact.name}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  {artifact.type} • {(artifact.size / 1024).toFixed(1)} KB
                                </div>
                              </div>
                              <Button size="sm" variant="outline">
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DevOpsPipeline;
