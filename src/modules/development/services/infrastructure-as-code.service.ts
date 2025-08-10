import { Injectable } from '@nestjs/common';
import { InfrastructureRequirements, CloudProvider, IaCTemplate } from '../../../types';

@Injectable()
export class InfrastructureAsCodeService {

  async generateTerraformConfiguration(requirements: InfrastructureRequirements): Promise<any> {
    const provider = requirements.provider;
    
    const terraform = {
      provider,
      files: await this.generateTerraformFiles(requirements),
      modules: await this.generateTerraformModules(requirements),
      variables: await this.generateTerraformVariables(requirements),
      outputs: await this.generateTerraformOutputs(requirements)
    };

    return terraform;
  }

  async generateKubernetesManifests(appConfig: any): Promise<any> {
    const manifests = {
      deployment: await this.generateDeployment(appConfig),
      service: await this.generateService(appConfig),
      configmap: await this.generateConfigMap(appConfig),
      secret: await this.generateSecret(appConfig),
      ingress: await this.generateIngress(appConfig),
      hpa: await this.generateHPA(appConfig),
      networkPolicy: await this.generateNetworkPolicy(appConfig),
      serviceMonitor: await this.generateServiceMonitor(appConfig)
    };

    if (appConfig.stateful) {
      manifests['statefulset'] = await this.generateStatefulSet(appConfig);
      manifests['volumeClaimTemplate'] = await this.generateVolumeClaimTemplate(appConfig);
    }

    return manifests;
  }

  async generateDockerConfiguration(appConfig: any): Promise<any> {
    return {
      dockerfile: await this.generateDockerfile(appConfig),
      dockerignore: await this.generateDockerignore(appConfig),
      composefile: await this.generateDockerCompose(appConfig),
      buildScript: await this.generateBuildScript(appConfig),
      optimizations: await this.generateDockerOptimizations(appConfig)
    };
  }

  async generateHelmChart(chartConfig: any): Promise<any> {
    return {
      'Chart.yaml': await this.generateChartYaml(chartConfig),
      'values.yaml': await this.generateValuesYaml(chartConfig),
      'templates/deployment.yaml': await this.generateHelmDeployment(chartConfig),
      'templates/service.yaml': await this.generateHelmService(chartConfig),
      'templates/ingress.yaml': await this.generateHelmIngress(chartConfig),
      'templates/configmap.yaml': await this.generateHelmConfigMap(chartConfig),
      'templates/secret.yaml': await this.generateHelmSecret(chartConfig),
      'templates/hpa.yaml': await this.generateHelmHPA(chartConfig),
      'templates/_helpers.tpl': await this.generateHelmHelpers(chartConfig),
      '.helmignore': await this.generateHelmIgnore()
    };
  }

  async generateCloudFormationTemplate(config: any): Promise<any> {
    const template = {
      AWSTemplateFormatVersion: '2010-09-09',
      Description: config.description,
      Parameters: this.generateCFParameters(config),
      Resources: this.generateCFResources(config),
      Outputs: this.generateCFOutputs(config)
    };

    return {
      template: JSON.stringify(template, null, 2),
      parameters: this.generateCFParameters(config),
      resources: this.generateCFResources(config),
      outputs: this.generateCFOutputs(config)
    };
  }

  async optimizeInfrastructure(currentInfrastructure: any): Promise<any> {
    const recommendations = await this.analyzeInfrastructure(currentInfrastructure);
    
    return {
      recommendations,
      costOptimization: await this.calculateCostOptimization(currentInfrastructure, recommendations),
      performanceImpact: await this.analyzePerformanceImpact(recommendations),
      implementation: await this.generateOptimizationImplementation(recommendations)
    };
  }

  // Private methods for Terraform generation
  private async generateTerraformFiles(requirements: InfrastructureRequirements): Promise<any> {
    const files: any = {};

    files['main.tf'] = this.generateMainTf(requirements);
    files['variables.tf'] = this.generateVariablesTf(requirements);
    files['outputs.tf'] = this.generateOutputsTf(requirements);

    if (requirements.components.networking) {
      files['vpc.tf'] = this.generateVpcTf(requirements);
    }

    if (requirements.components.compute) {
      files[`${requirements.provider === 'azure' ? 'vm' : 'ec2'}.tf`] = 
        this.generateComputeTf(requirements);
    }

    if (requirements.components.database) {
      files[`${requirements.provider === 'azure' ? 'sql' : 'rds'}.tf`] = 
        this.generateDatabaseTf(requirements);
    }

    files['security.tf'] = this.generateSecurityTf(requirements);

    return files;
  }

  private generateMainTf(requirements: InfrastructureRequirements): string {
    const provider = requirements.provider;
    let content = `terraform {
  required_version = ">= 1.0"
  required_providers {
`;

    switch (provider) {
      case 'aws':
        content += `    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }`;
        break;
      case 'azure':
        content += `    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }`;
        break;
      case 'gcp':
        content += `    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }`;
        break;
    }

    content += `
  }
}

`;

    switch (provider) {
      case 'aws':
        content += `provider "aws" {
  region = var.region
  
  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
    }
  }
}`;
        break;
      case 'azure':
        content += `provider "azurerm" {
  features {}
}`;
        break;
      case 'gcp':
        content += `provider "google" {
  project = var.project_id
  region  = var.region
}`;
        break;
    }

    return content;
  }

  private generateVpcTf(requirements: InfrastructureRequirements): string {
    const provider = requirements.provider;
    let content = '';

    switch (provider) {
      case 'aws':
        content = `resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "\${var.project_name}-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "\${var.project_name}-igw"
  }
}`;

        if (requirements.components.networking?.subnets) {
          requirements.components.networking.subnets.forEach((subnet, index) => {
            content += `

resource "aws_subnet" "${subnet.name}" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "${subnet.cidr}"
  availability_zone       = "${subnet.az || requirements.region + 'a'}"
  map_public_ip_on_launch = ${subnet.name.includes('public')}

  tags = {
    Name = "\${var.project_name}-${subnet.name}"
  }
}`;
          });
        }

        if (requirements.components.networking?.loadBalancer) {
          content += `

resource "aws_lb" "main" {
  name               = "\${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public-1.id, aws_subnet.public-2.id]

  enable_deletion_protection = false
}`;
        }
        break;

      case 'azure':
        content = `resource "azurerm_resource_group" "main" {
  name     = "\${var.project_name}-rg"
  location = var.region
}

resource "azurerm_virtual_network" "main" {
  name                = "\${var.project_name}-vnet"
  address_space       = [var.vpc_cidr]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}`;
        break;
    }

    return content;
  }

  private generateComputeTf(requirements: InfrastructureRequirements): string {
    const provider = requirements.provider;
    const compute = requirements.components.compute;
    let content = '';

    if (!compute || !compute.instances) return content;

    switch (provider) {
      case 'aws':
        compute.instances.forEach((instance) => {
          content += `
resource "aws_instance" "${instance.name}" {
  count         = ${instance.count}
  ami           = data.aws_ami.ubuntu.id
  instance_type = "${instance.type}"
  subnet_id     = aws_subnet.private-1.id
  security_groups = [aws_security_group.ec2.id]

  user_data = file("user-data.sh")

  tags = {
    Name = "\${var.project_name}-${instance.name}-\${count.index + 1}"
  }
}`;
        });
        
        content = `data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"]
  }
}
` + content;
        break;

      case 'azure':
        compute.instances.forEach((instance) => {
          content += `
resource "azurerm_virtual_machine" "${instance.name}" {
  count               = ${instance.count}
  name                = "\${var.project_name}-${instance.name}-\${count.index + 1}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  vm_size             = "${instance.type}"

  storage_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-focal"
    sku       = "20_04-lts"
    version   = "latest"
  }

  storage_os_disk {
    name              = "\${var.project_name}-${instance.name}-osdisk-\${count.index + 1}"
    caching           = "ReadWrite"
    create_option     = "FromImage"
    managed_disk_type = "Premium_LRS"
  }
}`;
        });
        break;
    }

    return content;
  }

  private generateDatabaseTf(requirements: InfrastructureRequirements): string {
    const provider = requirements.provider;
    const database = requirements.components.database;
    let content = '';

    if (!database) return content;

    switch (provider) {
      case 'aws':
        content = `resource "aws_db_instance" "main" {
  identifier = "\${var.project_name}-db"
  
  engine         = "${database.engine || 'postgres'}"
  engine_version = "${database.version || '14.9'}"
  instance_class = "${database.instanceClass || 'db.t3.micro'}"
  
  allocated_storage     = ${database.storage || 20}
  max_allocated_storage = ${(database.storage || 20) * 2}
  storage_type          = "gp2"
  storage_encrypted     = ${requirements.security?.encryption || false}
  
  db_name  = var.db_name
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = ${database.multiAZ ? 7 : 0}
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  multi_az = ${database.multiAZ || false}
  
  skip_final_snapshot = true
  deletion_protection = ${requirements.security?.backups || false}
}

resource "aws_db_subnet_group" "main" {
  name       = "\${var.project_name}-db-subnet-group"
  subnet_ids = [aws_subnet.private-1.id, aws_subnet.private-2.id]
}`;
        break;

      case 'azure':
        content = `resource "azurerm_postgresql_server" "main" {
  name                = "\${var.project_name}-psql"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  administrator_login          = var.db_username
  administrator_login_password = var.db_password

  sku_name   = "${database.tier || 'B_Gen5_1'}"
  version    = "${database.version || '11'}"
  storage_mb = ${(database.capacity || 10) * 1024}

  backup_retention_days        = 7
  geo_redundant_backup_enabled = false
  auto_grow_enabled            = true

  public_network_access_enabled    = false
  ssl_enforcement_enabled          = true
  ssl_minimal_tls_version_enforced = "TLS1_2"
}`;
        break;
    }

    return content;
  }

  private generateSecurityTf(requirements: InfrastructureRequirements): string {
    const provider = requirements.provider;
    let content = '';

    switch (provider) {
      case 'aws':
        content = `resource "aws_security_group" "ec2" {
  name        = "\${var.project_name}-ec2-sg"
  description = "Security group for EC2 instances"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "rds" {
  name        = "\${var.project_name}-rds-sg"
  description = "Security group for RDS database"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }
}

resource "aws_security_group" "alb" {
  name        = "\${var.project_name}-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}`;
        break;

      case 'azure':
        content = `resource "azurerm_network_security_group" "main" {
  name                = "\${var.project_name}-nsg"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  security_rule {
    name                       = "HTTP"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "HTTPS"
    priority                   = 1002
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}`;
        break;
    }

    return content;
  }

  private generateVariablesTf(requirements: InfrastructureRequirements): string {
    return `variable "region" {
  description = "The AWS region to deploy resources in"
  type        = string
  default     = "${requirements.region || 'us-west-2'}"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "lanka-project"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "${requirements.components.networking?.vpc?.cidr || '10.0.0.0/16'}"
}

variable "instance_types" {
  description = "EC2 instance types for different environments"
  type        = map(string)
  default = {
    dev  = "t3.micro"
    prod = "t3.medium"
  }
}

variable "db_username" {
  description = "Database username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "lanka_db"
}`;
  }

  private generateOutputsTf(requirements: InfrastructureRequirements): string {
    let outputs = `output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "region" {
  description = "AWS region"
  value       = var.region
}
`;

    if (requirements.components.networking?.loadBalancer) {
      outputs += `
output "load_balancer_dns" {
  description = "Load balancer DNS name"
  value       = aws_lb.main.dns_name
}`;
    }

    if (requirements.components.database) {
      outputs += `
output "database_endpoint" {
  description = "Database endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}`;
    }

    return outputs;
  }

  private async generateTerraformModules(requirements: InfrastructureRequirements): Promise<any[]> {
    return [
      {
        name: 'vpc',
        source: `terraform-aws-modules/vpc/aws`,
        version: '~> 3.0'
      },
      {
        name: 'security-group',
        source: 'terraform-aws-modules/security-group/aws',
        version: '~> 4.0'
      }
    ];
  }

  private async generateTerraformVariables(requirements: InfrastructureRequirements): Promise<any> {
    return {
      region: {
        description: 'AWS region',
        type: 'string',
        default: requirements.region
      },
      environment: {
        description: 'Environment name',
        type: 'string',
        default: 'dev'
      },
      instance_types: {
        description: 'Instance types by environment',
        type: 'map(string)',
        default: {
          dev: 't3.micro',
          prod: 't3.medium'
        }
      }
    };
  }

  private async generateTerraformOutputs(requirements: InfrastructureRequirements): Promise<any> {
    return {
      vpc_id: {
        description: 'VPC ID',
        value: '${aws_vpc.main.id}'
      },
      load_balancer_dns: {
        description: 'Load balancer DNS',
        value: '${aws_lb.main.dns_name}'
      }
    };
  }

  // Kubernetes manifest generation methods
  private async generateDeployment(appConfig: any): Promise<string> {
    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${appConfig.name}
  labels:
    app: ${appConfig.name}
spec:
  replicas: ${appConfig.replicas || 3}
  selector:
    matchLabels:
      app: ${appConfig.name}
  template:
    metadata:
      labels:
        app: ${appConfig.name}
    spec:
      containers:
      - name: ${appConfig.name}
        image: ${appConfig.image}${appConfig.tag ? ':' + appConfig.tag : ''}
        ports:${appConfig.ports?.map((port: any) => `
        - containerPort: ${typeof port === 'object' ? port.port : port}
          name: ${typeof port === 'object' ? port.name : 'http'}`).join('') || `
        - containerPort: 8080
          name: http`}${appConfig.environment ? `
        env:${Object.entries(appConfig.environment).map(([key, value]: [string, any]) => `
        - name: ${key}
          ${typeof value === 'object' && value.secretRef ? 
            `valueFrom:
            secretKeyRef:
              name: ${value.secretRef}
              key: ${value.key}` : 
            `value: "${value}"`}`).join('')}` : ''}${appConfig.resources ? `
        resources:
          requests:
            cpu: ${appConfig.resources.requests?.cpu || '100m'}
            memory: ${appConfig.resources.requests?.memory || '128Mi'}
          limits:
            cpu: ${appConfig.resources.limits?.cpu || '500m'}
            memory: ${appConfig.resources.limits?.memory || '512Mi'}` : ''}${appConfig.healthCheck ? `
        livenessProbe:
          httpGet:
            path: ${appConfig.healthCheck.path}
            port: ${appConfig.healthCheck.port}
          initialDelaySeconds: ${appConfig.healthCheck.initialDelay || 30}
          timeoutSeconds: ${appConfig.healthCheck.timeout || 5}
        readinessProbe:
          httpGet:
            path: ${appConfig.healthCheck.path}
            port: ${appConfig.healthCheck.port}
          initialDelaySeconds: ${appConfig.healthCheck.initialDelay || 30}
          timeoutSeconds: ${appConfig.healthCheck.timeout || 5}` : ''}`;
  }

  private async generateService(appConfig: any): Promise<string> {
    return `apiVersion: v1
kind: Service
metadata:
  name: ${appConfig.name}
  labels:
    app: ${appConfig.name}
spec:${appConfig.service?.headless ? `
  clusterIP: None` : ''}
  selector:
    app: ${appConfig.name}
  ports:${appConfig.ports?.map((port: any) => `
  - port: ${typeof port === 'object' ? port.port : port}
    targetPort: ${typeof port === 'object' ? port.port : port}
    name: ${typeof port === 'object' ? port.name : 'http'}`).join('') || `
  - port: 8080
    targetPort: 8080
    name: http`}`;
  }

  private async generateConfigMap(appConfig: any): Promise<string> {
    return `apiVersion: v1
kind: ConfigMap
metadata:
  name: ${appConfig.name}-config
data:
  app.properties: |
    server.port=8080
    logging.level.root=INFO`;
  }

  private async generateSecret(appConfig: any): Promise<string> {
    return `apiVersion: v1
kind: Secret
metadata:
  name: ${appConfig.name}-secrets
type: Opaque
data:
  # Base64 encoded secrets
  database-password: cGFzc3dvcmQ=`;
  }

  private async generateIngress(appConfig: any): Promise<string> {
    return `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${appConfig.name}-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: ${appConfig.name}.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ${appConfig.name}
            port:
              number: 8080`;
  }

  private async generateHPA(appConfig: any): Promise<string> {
    return `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${appConfig.name}-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${appConfig.name}
  minReplicas: ${appConfig.replicas || 3}
  maxReplicas: ${(appConfig.replicas || 3) * 3}
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80`;
  }

  private async generateNetworkPolicy(appConfig: any): Promise<string> {
    return `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ${appConfig.name}-netpol
spec:
  podSelector:
    matchLabels:
      app: ${appConfig.name}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: database
    ports:
    - protocol: TCP
      port: 5432`;
  }

  private async generateServiceMonitor(appConfig: any): Promise<string> {
    return `apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: ${appConfig.name}-metrics
spec:
  selector:
    matchLabels:
      app: ${appConfig.name}
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics`;
  }

  private async generateStatefulSet(appConfig: any): Promise<string> {
    return `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: ${appConfig.name}
spec:
  serviceName: ${appConfig.name}
  replicas: ${appConfig.replicas || 3}
  selector:
    matchLabels:
      app: ${appConfig.name}
  template:
    metadata:
      labels:
        app: ${appConfig.name}
    spec:
      containers:
      - name: ${appConfig.name}
        image: ${appConfig.image}
        ports:
        - containerPort: 6379
          name: redis`;
  }

  private async generateVolumeClaimTemplate(appConfig: any): Promise<string> {
    return `  volumeClaimTemplates:
  - metadata:
      name: ${appConfig.name}-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: ${appConfig.storage?.storageClass || 'default'}
      resources:
        requests:
          storage: ${appConfig.storage?.size || '10Gi'}`;
  }

  // Docker configuration methods
  private async generateDockerfile(appConfig: any): Promise<string> {
    const runtime = appConfig.runtime;
    const version = appConfig.version || 'latest';
    const isMultiStage = appConfig.optimization?.multiStage;

    let dockerfile = '';

    if (runtime === 'node.js') {
      dockerfile = `# Build stage
FROM node:${version}-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Runtime stage
FROM node:${version}-alpine AS runtime

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD node healthcheck.js

# Start application
CMD ["node", "dist/index.js"]`;
    } else if (runtime === 'python') {
      dockerfile = `FROM python:${version}-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    build-essential \\
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser
USER appuser

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]`;
    }

    return dockerfile;
  }

  private async generateDockerignore(appConfig: any): Promise<string> {
    return `node_modules
npm-debug.log
Dockerfile
.dockerignore
.git
.gitignore
README.md
.env
.nyc_output
coverage
.coverage
.pytest_cache
__pycache__
*.pyc
*.pyo
*.pyd
.Python
.venv
venv/
*.tmp
*.log`;
  }

  private async generateDockerCompose(appConfig: any): Promise<string> {
    return `version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://postgres:password@db:5432/app
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=app
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  postgres_data:`;
  }

  private async generateBuildScript(appConfig: any): Promise<string> {
    return `#!/bin/bash
set -e

# Build Docker image
docker build -t ${appConfig.runtime === 'node.js' ? 'node-app' : 'python-app'}:latest .

# Tag for registry
docker tag ${appConfig.runtime === 'node.js' ? 'node-app' : 'python-app'}:latest registry.example.com/${appConfig.runtime === 'node.js' ? 'node-app' : 'python-app'}:latest

# Push to registry
docker push registry.example.com/${appConfig.runtime === 'node.js' ? 'node-app' : 'python-app'}:latest

echo "Build and push completed successfully"`;
  }

  private async generateDockerOptimizations(appConfig: any): Promise<any[]> {
    return [
      {
        type: 'multi-stage',
        description: 'Use multi-stage builds to reduce final image size by excluding build dependencies'
      },
      {
        type: 'layer-caching',
        description: 'Order Dockerfile instructions to maximize layer caching efficiency'
      },
      {
        type: 'security',
        description: 'Run as non-root user and use minimal base images'
      },
      {
        type: 'health-check',
        description: 'Include health checks for container orchestration'
      }
    ];
  }

  // Helm chart generation methods
  private async generateChartYaml(chartConfig: any): Promise<string> {
    return `apiVersion: v2
name: ${chartConfig.name}
description: ${chartConfig.description}
type: application
version: ${chartConfig.version}
appVersion: "${chartConfig.application?.tag || 'latest'}"${chartConfig.dependencies ? `

dependencies:${chartConfig.dependencies.map((dep: any) => `
- name: ${dep.name}
  version: "${dep.version}"
  repository: https://charts.bitnami.com/bitnami`).join('')}` : ''}`;
  }

  private async generateValuesYaml(chartConfig: any): Promise<string> {
    return `replicaCount: ${chartConfig.application?.replicas || 2}

image:
  repository: ${chartConfig.application?.image || 'nginx'}
  pullPolicy: IfNotPresent
  tag: "${chartConfig.application?.tag || 'latest'}"

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: ${chartConfig.ingress?.enabled || false}${chartConfig.ingress?.host ? `
  hosts:
    - host: ${chartConfig.ingress.host}
      paths:
        - path: /
          pathType: Prefix` : ''}

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi

autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80

nodeSelector: {}

tolerations: []

affinity: {}`;
  }

  private async generateHelmDeployment(chartConfig: any): Promise<string> {
    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "${chartConfig.name}.fullname" . }}
  labels:
    {{- include "${chartConfig.name}.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "${chartConfig.name}.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "${chartConfig.name}.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: 8080
              protocol: TCP
          livenessProbe:
            httpGet:
              path: /health
              port: http
          readinessProbe:
            httpGet:
              path: /ready
              port: http
          resources:
            {{- toYaml .Values.resources | nindent 12 }}`;
  }

  private async generateHelmService(chartConfig: any): Promise<string> {
    return `apiVersion: v1
kind: Service
metadata:
  name: {{ include "${chartConfig.name}.fullname" . }}
  labels:
    {{- include "${chartConfig.name}.labels" . | nindent 4 }}
spec:
  type: {{ .Values.service.type }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: http
      protocol: TCP
      name: http
  selector:
    {{- include "${chartConfig.name}.selectorLabels" . | nindent 4 }}`;
  }

  private async generateHelmIngress(chartConfig: any): Promise<string> {
    return `{{- if .Values.ingress.enabled -}}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "${chartConfig.name}.fullname" . }}
  labels:
    {{- include "${chartConfig.name}.labels" . | nindent 4 }}
spec:
  {{- if .Values.ingress.tls }}
  tls:
    {{- range .Values.ingress.tls }}
    - hosts:
        {{- range .hosts }}
        - {{ . | quote }}
        {{- end }}
      secretName: {{ .secretName }}
    {{- end }}
  {{- end }}
  rules:
    {{- range .Values.ingress.hosts }}
    - host: {{ .host | quote }}
      http:
        paths:
          {{- range .paths }}
          - path: {{ .path }}
            pathType: {{ .pathType }}
            backend:
              service:
                name: {{ include "${chartConfig.name}.fullname" $ }}
                port:
                  number: {{ $.Values.service.port }}
          {{- end }}
    {{- end }}
{{- end }}`;
  }

  private async generateHelmConfigMap(chartConfig: any): Promise<string> {
    return `{{- if .Values.configMap }}
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "${chartConfig.name}.fullname" . }}
  labels:
    {{- include "${chartConfig.name}.labels" . | nindent 4 }}
data:
  {{- toYaml .Values.configMap | nindent 2 }}
{{- end }}`;
  }

  private async generateHelmSecret(chartConfig: any): Promise<string> {
    return `{{- if .Values.secrets }}
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "${chartConfig.name}.fullname" . }}
  labels:
    {{- include "${chartConfig.name}.labels" . | nindent 4 }}
type: Opaque
data:
  {{- range $key, $value := .Values.secrets }}
  {{ $key }}: {{ $value | b64enc | quote }}
  {{- end }}
{{- end }}`;
  }

  private async generateHelmHPA(chartConfig: any): Promise<string> {
    return `{{- if .Values.autoscaling.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "${chartConfig.name}.fullname" . }}
  labels:
    {{- include "${chartConfig.name}.labels" . | nindent 4 }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ include "${chartConfig.name}.fullname" . }}
  minReplicas: {{ .Values.autoscaling.minReplicas }}
  maxReplicas: {{ .Values.autoscaling.maxReplicas }}
  metrics:
    {{- if .Values.autoscaling.targetCPUUtilizationPercentage }}
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ .Values.autoscaling.targetCPUUtilizationPercentage }}
    {{- end }}
    {{- if .Values.autoscaling.targetMemoryUtilizationPercentage }}
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: {{ .Values.autoscaling.targetMemoryUtilizationPercentage }}
    {{- end }}
{{- end }}`;
  }

  private async generateHelmHelpers(chartConfig: any): Promise<string> {
    return `{{/*
Expand the name of the chart.
*/}}
{{- define "${chartConfig.name}.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "${chartConfig.name}.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "${chartConfig.name}.labels" -}}
helm.sh/chart: {{ include "${chartConfig.name}.chart" . }}
{{ include "${chartConfig.name}.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "${chartConfig.name}.selectorLabels" -}}
app.kubernetes.io/name: {{ include "${chartConfig.name}.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}`;
  }

  private async generateHelmIgnore(): Promise<string> {
    return `# Patterns to ignore when building packages.
# This supports shell glob matching, relative path matching, and
# negation (prefixed with !). Only one pattern per line.
.DS_Store
# Common VCS dirs
.git/
.gitignore
.bzr/
.bzrignore
.hg/
.hgignore
.svn/
# Common backup files
*.swp
*.bak
*.tmp
*.orig
*~
# Various IDEs
.project
.idea/
*.tmproj
.vscode/`;
  }

  // CloudFormation generation methods
  private generateCFParameters(config: any): any {
    return {
      Environment: {
        Type: 'String',
        Default: 'dev',
        Description: 'Environment name'
      },
      InstanceType: {
        Type: 'String',
        Default: 't3.micro',
        Description: 'EC2 instance type'
      }
    };
  }

  private generateCFResources(config: any): any {
    const resources: any = {};

    if (config.resources.vpc) {
      resources.VPC = {
        Type: 'AWS::EC2::VPC',
        Properties: {
          CidrBlock: config.resources.vpc.cidr,
          EnableDnsHostnames: true,
          EnableDnsSupport: true,
          Tags: [
            { Key: 'Name', Value: { 'Fn::Sub': '${AWS::StackName}-vpc' } }
          ]
        }
      };
    }

    if (config.resources.ec2) {
      resources.EC2Instance = {
        Type: 'AWS::EC2::Instance',
        Properties: {
          InstanceType: { Ref: 'InstanceType' },
          ImageId: 'ami-0abcdef1234567890', // Amazon Linux 2
          Tags: [
            { Key: 'Name', Value: { 'Fn::Sub': '${AWS::StackName}-instance' } }
          ]
        }
      };
    }

    if (config.resources.rds) {
      resources.RDSInstance = {
        Type: 'AWS::RDS::DBInstance',
        Properties: {
          DBInstanceClass: 'db.t3.micro',
          Engine: config.resources.rds.engine,
          MultiAZ: config.resources.rds.multiAZ,
          AllocatedStorage: '20',
          DBName: 'lanka',
          MasterUsername: 'admin',
          MasterUserPassword: '{{resolve:secretsmanager:rds-password:SecretString:password}}'
        }
      };
    }

    return resources;
  }

  private generateCFOutputs(config: any): any {
    return {
      VpcId: {
        Description: 'VPC ID',
        Value: { Ref: 'VPC' },
        Export: { Name: { 'Fn::Sub': '${AWS::StackName}-VpcId' } }
      },
      DatabaseEndpoint: {
        Description: 'RDS instance endpoint',
        Value: { 'Fn::GetAtt': ['RDSInstance', 'Endpoint.Address'] },
        Export: { Name: { 'Fn::Sub': '${AWS::StackName}-DatabaseEndpoint' } }
      }
    };
  }

  // Infrastructure optimization methods
  private async analyzeInfrastructure(infrastructure: any): Promise<any[]> {
    const recommendations = [];

    // Analyze compute resources
    infrastructure.resources?.ec2?.forEach((instance: any) => {
      if (instance.utilization < 30) {
        recommendations.push({
          type: 'rightsizing',
          resource: `EC2 instance ${instance.type}`,
          current: { type: instance.type, cost: instance.cost },
          recommended: { type: this.suggestSmallerInstance(instance.type), cost: instance.cost * 0.5 },
          savings: instance.cost * 0.5,
          impact: 'medium'
        });
      }
    });

    // Analyze database resources
    if (infrastructure.resources?.rds?.utilization < 50) {
      recommendations.push({
        type: 'rightsizing',
        resource: 'RDS instance',
        current: { type: infrastructure.resources.rds.type, cost: infrastructure.resources.rds.cost },
        recommended: { type: this.suggestSmallerDatabase(infrastructure.resources.rds.type), cost: infrastructure.resources.rds.cost * 0.6 },
        savings: infrastructure.resources.rds.cost * 0.4,
        impact: 'high'
      });
    }

    return recommendations;
  }

  private async calculateCostOptimization(infrastructure: any, recommendations: any[]): Promise<any> {
    const totalSavings = recommendations.reduce((sum, rec) => sum + rec.savings, 0);
    const currentCost = infrastructure.metrics.totalCost;
    
    return {
      currentCost,
      projectedCost: currentCost - totalSavings,
      savings: totalSavings,
      savingsPercentage: (totalSavings / currentCost) * 100
    };
  }

  private async analyzePerformanceImpact(recommendations: any[]): Promise<any> {
    return {
      improvements: [
        'Better resource utilization',
        'Reduced over-provisioning',
        'Optimized cost-performance ratio'
      ],
      risks: [
        'Potential performance degradation under peak load',
        'Need for more aggressive auto-scaling'
      ]
    };
  }

  private async generateOptimizationImplementation(recommendations: any[]): Promise<any> {
    return {
      terraform: `# Generated optimization terraform
resource "aws_instance" "optimized" {
  instance_type = "t3.small" # Downsized from t3.large
  # ... other configuration
}`,
      migration: [
        'Create new optimized resources',
        'Test performance under load',
        'Migrate traffic gradually',
        'Decommission old resources'
      ],
      timeline: '2-3 weeks'
    };
  }

  private suggestSmallerInstance(currentType: string): string {
    const mapping: { [key: string]: string } = {
      't3.large': 't3.medium',
      't3.medium': 't3.small',
      't3.small': 't3.micro'
    };
    return mapping[currentType] || currentType;
  }

  private suggestSmallerDatabase(currentType: string): string {
    const mapping: { [key: string]: string } = {
      'db.t3.medium': 'db.t3.small',
      'db.t3.small': 'db.t3.micro'
    };
    return mapping[currentType] || currentType;
  }
}