import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  GitBranch, 
  Cloud, 
  Server, 
  Activity, 
  AlertCircle, 
  CheckCircle,
  Play,
  Pause,
  Download,
  Upload,
  Settings,
  Monitor
} from 'lucide-react';
import Editor from '@monaco-editor/react';

interface Pipeline {
  id: string;
  name: string;
  status: 'success' | 'failed' | 'running' | 'pending';
  branch: string;
  lastRun: string;
  duration: string;
  stages: PipelineStage[];
}

interface PipelineStage {
  id: string;
  name: string;
  status: 'success' | 'failed' | 'running' | 'pending';
  duration: string;
  logs?: string;
}

interface DeploymentTarget {
  id: string;
  name: string;
  environment: 'development' | 'staging' | 'production';
  status: 'healthy' | 'degraded' | 'down';
  version: string;
  lastDeployed: string;
  url: string;
}

interface InfrastructureTemplate {
  id: string;
  name: string;
  type: 'kubernetes' | 'docker' | 'terraform' | 'cloudformation';
  description: string;
  resources: string[];
  template: string;
}

interface MonitoringConfig {
  id: string;
  name: string;
  type: 'metrics' | 'logs' | 'traces' | 'alerts';
  status: 'active' | 'inactive';
  config: any;
}

const DevOpsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('pipelines');
  const [selectedPipeline, setSelectedPipeline] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [newPipelineConfig, setNewPipelineConfig] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Mock data
  const [pipelines, setPipelines] = useState<Pipeline[]>([
    {
      id: 'pipeline-1',
      name: 'Main CI/CD Pipeline',
      status: 'success',
      branch: 'main',
      lastRun: '2024-01-15 14:30:00',
      duration: '8m 45s',
      stages: [
        { id: 'stage-1', name: 'Build', status: 'success', duration: '2m 30s' },
        { id: 'stage-2', name: 'Test', status: 'success', duration: '3m 15s' },
        { id: 'stage-3', name: 'Security Scan', status: 'success', duration: '1m 45s' },
        { id: 'stage-4', name: 'Deploy', status: 'success', duration: '1m 15s' }
      ]
    },
    {
      id: 'pipeline-2',
      name: 'Feature Branch Pipeline',
      status: 'running',
      branch: 'feature/user-auth',
      lastRun: '2024-01-15 15:00:00',
      duration: 'running',
      stages: [
        { id: 'stage-1', name: 'Build', status: 'success', duration: '2m 45s' },
        { id: 'stage-2', name: 'Test', status: 'running', duration: 'running' },
        { id: 'stage-3', name: 'Security Scan', status: 'pending', duration: 'pending' },
        { id: 'stage-4', name: 'Deploy', status: 'pending', duration: 'pending' }
      ]
    }
  ]);

  const [deploymentTargets, setDeploymentTargets] = useState<DeploymentTarget[]>([
    {
      id: 'dev-1',
      name: 'Development Environment',
      environment: 'development',
      status: 'healthy',
      version: 'v1.2.3-dev',
      lastDeployed: '2024-01-15 14:35:00',
      url: 'https://dev.example.com'
    },
    {
      id: 'staging-1',
      name: 'Staging Environment',
      environment: 'staging',
      status: 'healthy',
      version: 'v1.2.2',
      lastDeployed: '2024-01-15 10:20:00',
      url: 'https://staging.example.com'
    },
    {
      id: 'prod-1',
      name: 'Production Environment',
      environment: 'production',
      status: 'degraded',
      version: 'v1.2.1',
      lastDeployed: '2024-01-14 16:45:00',
      url: 'https://example.com'
    }
  ]);

  const infrastructureTemplates: InfrastructureTemplate[] = [
    {
      id: 'k8s-webapp',
      name: 'Kubernetes Web App',
      type: 'kubernetes',
      description: 'Full-stack web application deployment',
      resources: ['Deployment', 'Service', 'Ingress', 'ConfigMap', 'Secret'],
      template: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
  labels:
    app: webapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
      - name: webapp
        image: nginx:latest
        ports:
        - containerPort: 80
        env:
        - name: NODE_ENV
          value: "production"
---
apiVersion: v1
kind: Service
metadata:
  name: webapp-service
spec:
  selector:
    app: webapp
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: LoadBalancer`
    },
    {
      id: 'docker-compose',
      name: 'Docker Compose Stack',
      type: 'docker',
      description: 'Multi-container application stack',
      resources: ['Web App', 'Database', 'Redis', 'Nginx'],
      template: `version: '3.8'
services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/mydb
    depends_on:
      - db
      - redis

  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=mydb
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf

volumes:
  postgres_data:`
    },
    {
      id: 'terraform-aws',
      name: 'AWS Infrastructure',
      type: 'terraform',
      description: 'AWS cloud infrastructure setup',
      resources: ['VPC', 'EC2', 'RDS', 'Load Balancer', 'S3'],
      template: `terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "main-vpc"
  }
}

resource "aws_instance" "web" {
  ami           = "ami-0c02fb55956c7d316"
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public.id

  tags = {
    Name = "web-server"
  }
}

resource "aws_db_instance" "default" {
  allocated_storage    = 20
  storage_type         = "gp2"
  engine               = "mysql"
  engine_version       = "8.0"
  instance_class       = "db.t3.micro"
  db_name              = "mydb"
  username             = "admin"
  password             = var.db_password
  parameter_group_name = "default.mysql8.0"
  skip_final_snapshot  = true
}`
    }
  ];

  const [monitoringConfigs, setMonitoringConfigs] = useState<MonitoringConfig[]>([
    {
      id: 'metrics-1',
      name: 'Application Metrics',
      type: 'metrics',
      status: 'active',
      config: {
        endpoint: 'https://prometheus.example.com',
        scrapeInterval: '15s',
        targets: ['app:3000', 'db:5432']
      }
    },
    {
      id: 'logs-1',
      name: 'Centralized Logging',
      type: 'logs',
      status: 'active',
      config: {
        endpoint: 'https://elasticsearch.example.com',
        logLevel: 'info',
        retention: '30d'
      }
    },
    {
      id: 'alerts-1',
      name: 'Critical Alerts',
      type: 'alerts',
      status: 'active',
      config: {
        webhookUrl: 'https://hooks.slack.com/services/...',
        thresholds: {
          cpu: 80,
          memory: 85,
          errorRate: 5
        }
      }
    }
  ]);

  const handleCreatePipeline = useCallback(() => {
    setIsCreating(true);
    setTimeout(() => {
      const newPipeline: Pipeline = {
        id: `pipeline-${Date.now()}`,
        name: 'Custom Pipeline',
        status: 'pending',
        branch: 'main',
        lastRun: new Date().toISOString(),
        duration: 'pending',
        stages: [
          { id: 'stage-1', name: 'Build', status: 'pending', duration: 'pending' },
          { id: 'stage-2', name: 'Test', status: 'pending', duration: 'pending' },
          { id: 'stage-3', name: 'Deploy', status: 'pending', duration: 'pending' }
        ]
      };
      setPipelines(prev => [...prev, newPipeline]);
      setIsCreating(false);
    }, 1000);
  }, [newPipelineConfig]);

  const handleTriggerPipeline = useCallback((pipelineId: string) => {
    setPipelines(prev => prev.map(pipeline => 
      pipeline.id === pipelineId 
        ? { ...pipeline, status: 'running' as const }
        : pipeline
    ));
    
    setTimeout(() => {
      setPipelines(prev => prev.map(pipeline => 
        pipeline.id === pipelineId 
          ? { ...pipeline, status: 'success' as const, duration: '6m 30s' }
          : pipeline
      ));
    }, 3000);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'down':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Play className="h-4 w-4 text-blue-500" />;
      case 'degraded':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Pause className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'healthy':
        return 'default';
      case 'failed':
      case 'down':
        return 'destructive';
      case 'running':
        return 'default';
      case 'degraded':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case 'production':
        return 'destructive';
      case 'staging':
        return 'default';
      case 'development':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            DevOps Automation Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pipelines" className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                CI/CD
              </TabsTrigger>
              <TabsTrigger value="deployments" className="flex items-center gap-2">
                <Cloud className="h-4 w-4" />
                Deployments
              </TabsTrigger>
              <TabsTrigger value="infrastructure" className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                Infrastructure
              </TabsTrigger>
              <TabsTrigger value="monitoring" className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Monitoring
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pipelines" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">CI/CD Pipelines</h3>
                <Button onClick={handleCreatePipeline} disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Pipeline'}
                </Button>
              </div>

              <div className="grid gap-4">
                {pipelines.map((pipeline) => (
                  <Card key={pipeline.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(pipeline.status)}
                          <div>
                            <CardTitle className="text-base">{pipeline.name}</CardTitle>
                            <p className="text-sm text-gray-600">
                              {pipeline.branch} • Last run: {pipeline.lastRun}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusColor(pipeline.status) as any}>
                            {pipeline.status}
                          </Badge>
                          <Badge variant="outline">{pipeline.duration}</Badge>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleTriggerPipeline(pipeline.id)}
                            disabled={pipeline.status === 'running'}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {pipeline.stages.map((stage) => (
                          <div key={stage.id} className="flex items-center gap-2 p-3 border rounded-lg">
                            {getStatusIcon(stage.status)}
                            <div>
                              <p className="font-medium text-sm">{stage.name}</p>
                              <p className="text-xs text-gray-600">{stage.duration}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pipeline Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>Pipeline Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Pipeline Template</label>
                        <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select template" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="node-app">Node.js Application</SelectItem>
                            <SelectItem value="react-app">React Application</SelectItem>
                            <SelectItem value="python-app">Python Application</SelectItem>
                            <SelectItem value="docker-app">Docker Application</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Target Branch</label>
                        <Input placeholder="main, develop, feature/*" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pipeline Configuration (YAML)</label>
                      <div className="border rounded-lg overflow-hidden">
                        <Editor
                          height="300px"
                          language="yaml"
                          value={newPipelineConfig}
                          onChange={(value) => setNewPipelineConfig(value || '')}
                          theme="vs-dark"
                          options={{
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            fontSize: 14
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deployments" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Deployment Environments</h3>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Deploy
                </Button>
              </div>

              <div className="grid gap-4">
                {deploymentTargets.map((target) => (
                  <Card key={target.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(target.status)}
                          <div>
                            <h4 className="font-medium">{target.name}</h4>
                            <p className="text-sm text-gray-600">
                              {target.url} • Deployed: {target.lastDeployed}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getEnvironmentColor(target.environment) as any}>
                            {target.environment}
                          </Badge>
                          <Badge variant="outline">{target.version}</Badge>
                          <Badge variant={getStatusColor(target.status) as any}>
                            {target.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Activity className="h-4 w-4 mr-2" />
                          View Logs
                        </Button>
                        <Button size="sm" variant="outline">
                          <Monitor className="h-4 w-4 mr-2" />
                          Metrics
                        </Button>
                        <Button size="sm" variant="outline">
                          <Settings className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="infrastructure" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Infrastructure as Code</h3>
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Deploy Infrastructure
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {infrastructureTemplates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:border-blue-500 transition-colors">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <Badge variant="outline">{template.type}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{template.description}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {template.resources.map((resource, index) => (
                          <Badge key={index} variant="secondary">
                            {resource}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedTemplate && (
                <Card>
                  <CardHeader>
                    <CardTitle>Template Configuration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                      <Editor
                        height="400px"
                        language="yaml"
                        value={infrastructureTemplates.find(t => t.id === selectedTemplate)?.template || ''}
                        theme="vs-dark"
                        options={{
                          readOnly: true,
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          fontSize: 14
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="monitoring" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Monitoring & Alerting</h3>
                <Button>Add Configuration</Button>
              </div>

              <div className="grid gap-4">
                {monitoringConfigs.map((config) => (
                  <Card key={config.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Activity className="h-5 w-5" />
                          <div>
                            <h4 className="font-medium">{config.name}</h4>
                            <p className="text-sm text-gray-600">Type: {config.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={config.status === 'active' ? 'default' : 'secondary'}>
                            {config.status}
                          </Badge>
                          <Button size="sm" variant="outline">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                        <pre className="text-sm">
                          {JSON.stringify(config.config, null, 2)}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Incident Response Playbooks */}
              <Card>
                <CardHeader>
                  <CardTitle>Incident Response Playbooks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">High CPU Usage</h4>
                        <p className="text-sm text-gray-600 mb-3">
                          Automated response for CPU usage above 90%
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">View</Button>
                          <Button size="sm" variant="outline">Test</Button>
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Application Crash</h4>
                        <p className="text-sm text-gray-600 mb-3">
                          Recovery procedures for application failures
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">View</Button>
                          <Button size="sm" variant="outline">Test</Button>
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Database Connection Loss</h4>
                        <p className="text-sm text-gray-600 mb-3">
                          Failover and recovery for database issues
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">View</Button>
                          <Button size="sm" variant="outline">Test</Button>
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Security Breach</h4>
                        <p className="text-sm text-gray-600 mb-3">
                          Security incident response procedures
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">View</Button>
                          <Button size="sm" variant="outline">Test</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DevOpsPanel;