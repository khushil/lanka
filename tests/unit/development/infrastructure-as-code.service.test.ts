import { InfrastructureAsCodeService } from '../../../src/modules/development/services/infrastructure-as-code.service';
import { InfrastructureRequirements, CloudProvider, IaCTemplate } from '../../../src/types';

describe('InfrastructureAsCodeService', () => {
  let service: InfrastructureAsCodeService;
  
  beforeEach(() => {
    service = new InfrastructureAsCodeService();
  });

  describe('generateTerraformConfiguration', () => {
    it('should generate Terraform configuration for AWS infrastructure', async () => {
      const requirements: InfrastructureRequirements = {
        provider: 'aws',
        region: 'us-west-2',
        components: {
          compute: {
            type: 'ec2',
            instances: [
              { name: 'web-server', type: 't3.medium', count: 2 },
              { name: 'api-server', type: 't3.large', count: 3 }
            ]
          },
          database: {
            type: 'rds',
            engine: 'postgresql',
            version: '14.9',
            instanceClass: 'db.t3.micro',
            storage: 100,
            multiAZ: true
          },
          networking: {
            vpc: { cidr: '10.0.0.0/16' },
            subnets: [
              { name: 'public-1', cidr: '10.0.1.0/24', az: 'us-west-2a' },
              { name: 'private-1', cidr: '10.0.2.0/24', az: 'us-west-2b' }
            ],
            loadBalancer: {
              type: 'application',
              scheme: 'internet-facing'
            }
          },
          storage: {
            s3Buckets: [
              { name: 'app-assets', versioning: true },
              { name: 'backups', lifecycle: true }
            ]
          }
        },
        security: {
          encryption: true,
          backups: true,
          monitoring: true
        }
      };

      const terraform = await service.generateTerraformConfiguration(requirements);

      expect(terraform).toEqual({
        provider: 'aws',
        files: expect.objectContaining({
          'main.tf': expect.stringContaining('terraform {'),
          'variables.tf': expect.stringContaining('variable '),
          'outputs.tf': expect.stringContaining('output '),
          'vpc.tf': expect.stringContaining('resource "aws_vpc"'),
          'ec2.tf': expect.stringContaining('resource "aws_instance"'),
          'rds.tf': expect.stringContaining('resource "aws_db_instance"'),
          'security.tf': expect.stringContaining('resource "aws_security_group"')
        }),
        modules: expect.arrayContaining([
          expect.objectContaining({
            name: 'vpc',
            source: expect.any(String)
          })
        ]),
        variables: expect.objectContaining({
          region: expect.any(Object),
          environment: expect.any(Object),
          instance_types: expect.any(Object)
        }),
        outputs: expect.objectContaining({
          vpc_id: expect.any(Object),
          load_balancer_dns: expect.any(Object)
        })
      });

      // Verify Terraform syntax
      expect(terraform.files['main.tf']).toMatch(/provider "aws" \{/);
      expect(terraform.files['vpc.tf']).toMatch(/resource "aws_vpc" "main"/);
    });

    it('should generate Terraform configuration for Azure infrastructure', async () => {
      const requirements: InfrastructureRequirements = {
        provider: 'azure',
        region: 'East US',
        components: {
          compute: {
            type: 'vm',
            instances: [
              { name: 'app-server', type: 'Standard_B2s', count: 2 }
            ]
          },
          database: {
            type: 'azure-sql',
            tier: 'Standard',
            capacity: 10
          }
        }
      };

      const terraform = await service.generateTerraformConfiguration(requirements);

      expect(terraform.provider).toBe('azure');
      expect(terraform.files['main.tf']).toMatch(/provider "azurerm"/);
      expect(terraform.files).toHaveProperty('resource-group.tf');
      expect(terraform.files).toHaveProperty('vm.tf');
    });
  });

  describe('generateKubernetesManifests', () => {
    it('should generate comprehensive Kubernetes manifests', async () => {
      const appConfig = {
        name: 'lanka-api',
        image: 'lanka/api:v1.2.0',
        replicas: 3,
        ports: [{ name: 'http', port: 8080 }],
        environment: {
          NODE_ENV: 'production',
          DATABASE_URL: { secretRef: 'db-credentials', key: 'url' }
        },
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        },
        healthCheck: {
          path: '/health',
          port: 8080,
          initialDelay: 30,
          timeout: 5
        }
      };

      const manifests = await service.generateKubernetesManifests(appConfig);

      expect(manifests).toEqual({
        deployment: expect.stringContaining('kind: Deployment'),
        service: expect.stringContaining('kind: Service'),
        configmap: expect.stringContaining('kind: ConfigMap'),
        secret: expect.stringContaining('kind: Secret'),
        ingress: expect.stringContaining('kind: Ingress'),
        hpa: expect.stringContaining('kind: HorizontalPodAutoscaler'),
        networkPolicy: expect.stringContaining('kind: NetworkPolicy'),
        serviceMonitor: expect.stringContaining('kind: ServiceMonitor')
      });

      // Verify YAML structure
      const deployment = manifests.deployment;
      expect(deployment).toMatch(/apiVersion: apps\/v1/);
      expect(deployment).toMatch(/metadata:\s*\n\s*name: lanka-api/);
      expect(deployment).toMatch(/spec:\s*\n\s*replicas: 3/);
      expect(deployment).toMatch(/livenessProbe:/);
      expect(deployment).toMatch(/readinessProbe:/);
    });

    it('should generate StatefulSet for stateful applications', async () => {
      const appConfig = {
        name: 'redis-cluster',
        image: 'redis:7-alpine',
        stateful: true,
        replicas: 3,
        storage: {
          size: '10Gi',
          storageClass: 'ssd'
        },
        service: {
          headless: true
        }
      };

      const manifests = await service.generateKubernetesManifests(appConfig);

      expect(manifests.statefulset).toContain('kind: StatefulSet');
      expect(manifests.service).toMatch(/clusterIP: None/);
      expect(manifests).toHaveProperty('volumeClaimTemplate');
    });
  });

  describe('generateDockerConfiguration', () => {
    it('should generate optimized Dockerfile for Node.js application', async () => {
      const appConfig = {
        runtime: 'node.js',
        version: '18',
        packageManager: 'npm',
        buildSteps: [
          'install dependencies',
          'run tests',
          'build application'
        ],
        optimization: {
          multiStage: true,
          caching: true,
          securityScanning: true
        }
      };

      const dockerConfig = await service.generateDockerConfiguration(appConfig);

      expect(dockerConfig).toEqual({
        dockerfile: expect.stringContaining('FROM node:18-alpine'),
        dockerignore: expect.stringContaining('node_modules'),
        composefile: expect.stringContaining('version: '),
        buildScript: expect.stringContaining('docker build'),
        optimizations: expect.arrayContaining([
          expect.objectContaining({
            type: 'multi-stage',
            description: expect.any(String)
          }),
          expect.objectContaining({
            type: 'layer-caching',
            description: expect.any(String)
          })
        ])
      });

      // Verify Dockerfile structure
      const dockerfile = dockerConfig.dockerfile;
      expect(dockerfile).toMatch(/FROM node:18-alpine AS builder/);
      expect(dockerfile).toMatch(/COPY package.*\.json/);
      expect(dockerfile).toMatch(/RUN npm ci --only=production/);
      expect(dockerfile).toMatch(/FROM node:18-alpine AS runtime/);
      expect(dockerfile).toMatch(/USER node/);
    });

    it('should generate Dockerfile for Python application', async () => {
      const appConfig = {
        runtime: 'python',
        version: '3.11',
        framework: 'fastapi',
        requirements: 'requirements.txt'
      };

      const dockerConfig = await service.generateDockerConfiguration(appConfig);

      expect(dockerConfig.dockerfile).toMatch(/FROM python:3.11-slim/);
      expect(dockerConfig.dockerfile).toMatch(/COPY requirements.txt/);
      expect(dockerConfig.dockerfile).toMatch(/RUN pip install/);
    });
  });

  describe('generateHelmChart', () => {
    it('should generate comprehensive Helm chart', async () => {
      const chartConfig = {
        name: 'lanka-microservice',
        version: '1.0.0',
        description: 'Lanka microservice Helm chart',
        application: {
          image: 'lanka/service',
          tag: 'latest',
          replicas: 2
        },
        dependencies: [
          { name: 'postgresql', version: '11.9.13' },
          { name: 'redis', version: '17.3.7' }
        ],
        ingress: {
          enabled: true,
          host: 'api.lanka.dev'
        }
      };

      const helmChart = await service.generateHelmChart(chartConfig);

      expect(helmChart).toEqual({
        'Chart.yaml': expect.stringContaining('apiVersion: v2'),
        'values.yaml': expect.stringContaining('replicaCount: 2'),
        'templates/deployment.yaml': expect.stringContaining('{{- if .Values.autoscaling.enabled }}'),
        'templates/service.yaml': expect.stringContaining('{{- range .Values.service.ports }}'),
        'templates/ingress.yaml': expect.stringContaining('{{- if .Values.ingress.enabled }}'),
        'templates/configmap.yaml': expect.stringContaining('{{- if .Values.configMap }}'),
        'templates/secret.yaml': expect.stringContaining('{{- if .Values.secrets }}'),
        'templates/hpa.yaml': expect.stringContaining('{{- if .Values.autoscaling.enabled }}'),
        'templates/_helpers.tpl': expect.stringContaining('{{- define "'),
        '.helmignore': expect.stringContaining('*.tmp')
      });

      // Verify Chart.yaml structure
      const chartYaml = helmChart['Chart.yaml'];
      expect(chartYaml).toMatch(/name: lanka-microservice/);
      expect(chartYaml).toMatch(/version: 1.0.0/);
      expect(chartYaml).toMatch(/dependencies:/);
    });
  });

  describe('generateCloudFormationTemplate', () => {
    it('should generate CloudFormation template for AWS resources', async () => {
      const config = {
        description: 'Lanka application infrastructure',
        resources: {
          vpc: { cidr: '10.0.0.0/16' },
          ec2: { type: 't3.medium', count: 2 },
          rds: { engine: 'postgres', multiAZ: true },
          s3: { buckets: ['assets', 'backups'] }
        }
      };

      const template = await service.generateCloudFormationTemplate(config);

      expect(template).toEqual({
        template: expect.stringContaining('AWSTemplateFormatVersion'),
        parameters: expect.objectContaining({
          Environment: expect.any(Object),
          InstanceType: expect.any(Object)
        }),
        resources: expect.objectContaining({
          VPC: expect.any(Object),
          EC2Instance: expect.any(Object),
          RDSInstance: expect.any(Object)
        }),
        outputs: expect.objectContaining({
          VpcId: expect.any(Object),
          DatabaseEndpoint: expect.any(Object)
        })
      });

      // Verify JSON structure
      const templateObj = JSON.parse(template.template);
      expect(templateObj).toHaveProperty('AWSTemplateFormatVersion');
      expect(templateObj).toHaveProperty('Resources');
      expect(templateObj.Resources).toHaveProperty('VPC');
    });
  });

  describe('optimizeInfrastructure', () => {
    it('should provide infrastructure optimization recommendations', async () => {
      const currentInfrastructure = {
        provider: 'aws',
        resources: {
          ec2: [
            { type: 't3.large', utilization: 25, cost: 67.2 },
            { type: 't3.xlarge', utilization: 45, cost: 134.4 }
          ],
          rds: { type: 'db.t3.medium', utilization: 60, cost: 45.6 },
          s3: { storage: 500, cost: 11.5 }
        },
        metrics: {
          totalCost: 258.7,
          efficiency: 42
        }
      };

      const optimization = await service.optimizeInfrastructure(currentInfrastructure);

      expect(optimization).toEqual({
        recommendations: expect.arrayContaining([
          expect.objectContaining({
            type: 'rightsizing',
            resource: expect.any(String),
            current: expect.any(Object),
            recommended: expect.any(Object),
            savings: expect.any(Number),
            impact: expect.stringMatching(/high|medium|low/)
          })
        ]),
        costOptimization: expect.objectContaining({
          currentCost: 258.7,
          projectedCost: expect.any(Number),
          savings: expect.any(Number),
          savingsPercentage: expect.any(Number)
        }),
        performanceImpact: expect.objectContaining({
          improvements: expect.any(Array),
          risks: expect.any(Array)
        }),
        implementation: expect.objectContaining({
          terraform: expect.any(String),
          migration: expect.any(Array),
          timeline: expect.any(String)
        })
      });

      expect(optimization.costOptimization.projectedCost).toBeLessThan(optimization.costOptimization.currentCost);
    });
  });
});