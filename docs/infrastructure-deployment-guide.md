# Lanka Platform Infrastructure Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Lanka Platform infrastructure using Infrastructure as Code (IaC) with Terraform and Kubernetes.

## Prerequisites

### Tools Required

- **Terraform**: Version 1.5 or higher
- **AWS CLI**: Version 2.0 or higher  
- **kubectl**: Version 1.28 or higher
- **Helm**: Version 3.0 or higher (optional)
- **Docker**: Version 20.0 or higher

### AWS Account Setup

1. **AWS Account**: Active AWS account with appropriate permissions
2. **IAM User**: User with AdministratorAccess policy (or custom policy with required permissions)
3. **AWS CLI Configuration**: Run `aws configure` to set up credentials
4. **SSH Key Pair**: For EC2 instances (Neo4j database)

### Repository Setup

```bash
# Clone the repository
git clone https://github.com/your-org/lanka-platform.git
cd lanka-platform

# Verify structure
ls -la infrastructure/ k8s/ scripts/
```

## Environment Configuration

### 1. Development Environment

```bash
# Set up Terraform backend
./scripts/setup-terraform-backend.sh dev

# Initialize Terraform
cd infrastructure/
terraform init -backend-config="environments/dev.backend.tfvars"

# Review and modify dev configuration
vim environments/dev.tfvars
```

### 2. Staging Environment  

```bash
# Set up Terraform backend
./scripts/setup-terraform-backend.sh staging

# Initialize Terraform
cd infrastructure/
terraform init -backend-config="environments/staging.backend.tfvars"

# Review and modify staging configuration
vim environments/staging.tfvars
```

### 3. Production Environment

```bash
# Set up Terraform backend (use different AWS account/region recommended)
AWS_REGION=us-east-1 ./scripts/setup-terraform-backend.sh prod

# Initialize Terraform
cd infrastructure/
terraform init -backend-config="environments/prod.backend.tfvars"

# Review and modify production configuration
vim environments/prod.tfvars
```

## Deployment Process

### Step 1: Infrastructure Deployment

#### Option A: Automated Deployment

```bash
# Deploy to development
./scripts/deploy.sh dev rolling

# Deploy to staging  
./scripts/deploy.sh staging blue-green

# Deploy to production (requires manual approval in CI/CD)
./scripts/deploy.sh prod blue-green
```

#### Option B: Manual Deployment

```bash
# 1. Plan infrastructure changes
cd infrastructure/
terraform plan -var-file="environments/dev.tfvars" -out=dev.tfplan

# 2. Review the plan carefully
terraform show dev.tfplan

# 3. Apply infrastructure changes
terraform apply dev.tfplan

# 4. Update kubeconfig
aws eks update-kubeconfig --region us-west-2 --name $(terraform output -raw cluster_name)
```

### Step 2: Kubernetes Resources Deployment

```bash
# 1. Deploy namespaces
kubectl apply -f k8s/namespace.yaml

# 2. Deploy ConfigMaps and Secrets
kubectl apply -f k8s/configmaps.yaml
kubectl apply -f k8s/secrets.yaml

# 3. Deploy applications
kubectl apply -f k8s/deployments.yaml
kubectl apply -f k8s/services.yaml
kubectl apply -f k8s/hpa.yaml

# 4. Deploy monitoring (optional)
kubectl apply -f k8s/monitoring.yaml
```

### Step 3: Verification

```bash
# Check infrastructure status
terraform output

# Check Kubernetes resources
kubectl get pods -n lanka-platform
kubectl get services -n lanka-platform
kubectl get ingress -n lanka-platform

# Check application health
curl -f http://api.lanka-platform.com/health
```

## Configuration Management

### Environment Variables

#### Development
```bash
export ENVIRONMENT=dev
export AWS_REGION=us-west-2
export CLUSTER_NAME=lanka-platform-dev
```

#### Production
```bash
export ENVIRONMENT=prod
export AWS_REGION=us-west-2
export CLUSTER_NAME=lanka-platform-prod
```

### Secrets Management

#### AWS Secrets Manager Integration

```bash
# Create secrets in AWS Secrets Manager
aws secretsmanager create-secret \
    --name "lanka-platform/neo4j" \
    --description "Neo4j database credentials" \
    --secret-string '{"username":"neo4j","password":"your-secure-password"}'

aws secretsmanager create-secret \
    --name "lanka-platform/redis" \
    --description "Redis authentication token" \
    --secret-string '{"auth_token":"your-redis-token"}'
```

#### Kubernetes Secrets (Alternative)

```bash
# Create Kubernetes secrets manually
kubectl create secret generic lanka-platform-secrets \
    --from-literal=NEO4J_PASSWORD='your-secure-password' \
    --from-literal=REDIS_PASSWORD='your-redis-token' \
    --from-literal=JWT_SECRET='your-jwt-secret' \
    -n lanka-platform
```

### SSL/TLS Certificates

#### AWS Certificate Manager

```bash
# Request certificate
aws acm request-certificate \
    --domain-name "*.lanka-platform.com" \
    --subject-alternative-names "lanka-platform.com" \
    --validation-method DNS

# Update terraform variables with certificate ARN
# certificate_arn = "arn:aws:acm:us-west-2:123456789012:certificate/12345678-1234-1234-1234-123456789012"
```

## Monitoring and Logging

### CloudWatch Integration

The infrastructure automatically sets up:
- EKS cluster logging
- Application Load Balancer access logs  
- VPC Flow Logs (configurable)
- Database monitoring

### Prometheus and Grafana

```bash
# Deploy monitoring stack
kubectl apply -f k8s/monitoring.yaml

# Access Grafana
kubectl port-forward -n monitoring svc/grafana 3000:3000

# Default credentials: admin / (check secrets)
```

### Health Checks

```bash
# Application health
curl -f https://api.lanka-platform.com/health

# Database health
kubectl exec -n lanka-platform deployment/lanka-platform-api -- \
    node scripts/db-health-check.js

# Infrastructure health
terraform plan -detailed-exitcode
```

## Scaling and Performance

### Horizontal Pod Autoscaling

HPA is configured automatically based on:
- CPU utilization (70% threshold)
- Memory utilization (80% threshold)  
- Custom metrics (response time, queue depth)

```bash
# Check HPA status
kubectl get hpa -n lanka-platform

# View scaling events
kubectl describe hpa lanka-platform-api-hpa -n lanka-platform
```

### Cluster Autoscaling

Node groups automatically scale based on demand:

```bash
# Check cluster autoscaler status
kubectl logs -n kube-system deployment/cluster-autoscaler

# View node status
kubectl get nodes --show-labels
```

### Database Scaling

#### Neo4j Scaling
- Vertical scaling: Change instance type in terraform
- Storage scaling: Increase EBS volume size

#### Redis Scaling  
- Add more cache nodes
- Upgrade to larger instance types
- Enable clustering for horizontal scaling

## Backup and Recovery

### Automated Backups

#### Database Backups
```bash
# Manual Neo4j backup
kubectl exec -n lanka-platform deployment/neo4j -- \
    neo4j-admin backup --backup-dir=/backups --name=manual-backup

# Check backup status
kubectl get cronjobs -n lanka-platform
```

#### Infrastructure Backups
```bash
# Terraform state backup
aws s3 cp s3://lanka-terraform-state/dev/terraform.tfstate \
    backups/terraform-state-backup-$(date +%Y%m%d).tfstate

# Kubernetes resource backup
kubectl get all,configmap,secret,pvc -o yaml > \
    backups/k8s-backup-$(date +%Y%m%d).yaml
```

### Disaster Recovery Testing

```bash
# Run DR test
./scripts/test-disaster-recovery.sh staging

# Validate recovery
./scripts/validate-recovery.sh staging
```

## Troubleshooting

### Common Issues

#### 1. Terraform State Lock

```bash
# If state is locked
terraform force-unlock LOCK_ID

# Check lock status
aws dynamodb get-item \
    --table-name lanka-platform-terraform-locks-dev \
    --key '{"LockID":{"S":"LOCK_ID"}}'
```

#### 2. EKS Cluster Access

```bash
# Update kubeconfig
aws eks update-kubeconfig --region us-west-2 --name cluster-name

# Check authentication
kubectl auth can-i get pods --all-namespaces
```

#### 3. Application Deployment Issues

```bash
# Check pod status
kubectl get pods -n lanka-platform
kubectl describe pod POD_NAME -n lanka-platform

# Check logs
kubectl logs -f deployment/lanka-platform-api -n lanka-platform

# Check events
kubectl get events -n lanka-platform --sort-by='.lastTimestamp'
```

#### 4. Database Connection Issues

```bash
# Check Neo4j connectivity
kubectl exec -n lanka-platform deployment/lanka-platform-api -- \
    nc -zv neo4j.lanka-platform.svc.cluster.local 7687

# Check Redis connectivity  
kubectl exec -n lanka-platform deployment/lanka-platform-api -- \
    nc -zv redis.lanka-platform.svc.cluster.local 6379
```

### Log Analysis

```bash
# Application logs
kubectl logs -f deployment/lanka-platform-api -n lanka-platform

# System logs
kubectl logs -f -n kube-system deployment/aws-load-balancer-controller

# Infrastructure logs
aws logs tail /aws/eks/cluster-name/cluster --follow
```

## Security Considerations

### Network Security
- VPC with private subnets for databases
- Security groups with minimal required access
- Network ACLs for additional layer of security
- VPC Flow Logs for monitoring

### Access Control
- RBAC for Kubernetes resources
- IAM roles for service accounts (IRSA)
- Least privilege principle
- Regular access review

### Data Security
- Encryption at rest for all data stores
- Encryption in transit using TLS
- KMS key management
- Secrets rotation

### Compliance
- Regular security scanning with Checkov
- Container image vulnerability scanning
- Infrastructure compliance monitoring
- Audit logging

## Cost Optimization

### Development Environment
- Use spot instances for worker nodes
- Single NAT gateway
- Smaller instance sizes
- Reduced backup retention

### Production Environment
- Reserved instances for predictable workloads
- Right-sizing based on metrics
- S3 lifecycle policies for logs and backups
- CloudWatch cost monitoring

### Monitoring Costs

```bash
# Get cost breakdown
aws ce get-cost-and-usage \
    --time-period Start=2024-01-01,End=2024-01-31 \
    --granularity MONTHLY \
    --metrics BlendedCost \
    --group-by Type=DIMENSION,Key=SERVICE
```

## CI/CD Integration

### GitHub Actions

The repository includes GitHub Actions workflows for:
- Infrastructure validation and deployment
- Kubernetes resource deployment
- Security scanning and compliance checks
- Automated testing and rollback

### Manual Deployment

For environments without CI/CD:

```bash
# Build and tag images
docker build -t lanka-platform/api:v1.0.0 .
docker tag lanka-platform/api:v1.0.0 YOUR_ECR_REPO/lanka-platform/api:v1.0.0

# Push to registry
aws ecr get-login-password --region us-west-2 | \
    docker login --username AWS --password-stdin YOUR_ECR_REPO

docker push YOUR_ECR_REPO/lanka-platform/api:v1.0.0

# Deploy
kubectl set image deployment/lanka-platform-api \
    api=YOUR_ECR_REPO/lanka-platform/api:v1.0.0 \
    -n lanka-platform
```

## Support and Maintenance

### Regular Tasks

#### Daily
- Monitor application health and performance
- Check for security alerts
- Review logs for errors

#### Weekly
- Update dependencies and security patches
- Review resource utilization
- Test backup restoration

#### Monthly
- Infrastructure cost review
- Security compliance scan
- Disaster recovery test

#### Quarterly
- Infrastructure optimization review
- Documentation updates
- Team training and knowledge sharing

### Getting Help

- **Documentation**: Check this guide and other docs in `/docs`
- **Logs**: Use kubectl and AWS CloudWatch for troubleshooting  
- **Community**: GitHub issues and discussions
- **Support**: Contact the platform team via Slack or email

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-01  
**Maintainer**: DevOps Team