# Lanka Platform - Production Deployment Guide

## Overview

This guide covers the complete Phase 3.1 Production Deployment Pipeline implementation for the Lanka Platform, featuring automated CI/CD with GitHub Actions, blue-green deployments, and zero-downtime releases.

## 🏗️ Infrastructure Components

### GitHub Actions Workflows

#### 1. Staging Deployment (`.github/workflows/staging-deployment.yml`)
- **Triggers**: Push to `develop`/`staging` branches, PRs to `staging`
- **Features**:
  - Automated testing (lint, typecheck, unit tests)
  - Container building with multi-architecture support
  - Blue-green deployment to staging
  - Smoke tests and performance testing
  - Security scanning with Trivy
  - Slack notifications

#### 2. Production Deployment (`.github/workflows/production-deployment.yml`)
- **Triggers**: Push to `main`, tags, manual dispatch
- **Features**:
  - Comprehensive test suite (unit, integration, e2e)
  - Production-grade container builds
  - Database backup and migration automation
  - Blue-green deployment with health checks
  - Automatic rollback on failure
  - Container image signing with Cosign

#### 3. Emergency Rollback (`.github/workflows/rollback.yml`)
- **Triggers**: Manual dispatch only
- **Features**:
  - Quick rollback to previous version
  - Optional database restore
  - Traffic switching with verification
  - Incident tracking and notifications

#### 4. Environment Promotion (`.github/workflows/environment-promotion.yml`)
- **Triggers**: Manual dispatch
- **Features**:
  - Promote releases between environments
  - Validation and testing pipeline
  - Blue-green deployment
  - Comprehensive reporting

#### 5. Manual Deployment (`.github/workflows/manual-deployment.yml`)
- **Triggers**: Manual dispatch
- **Features**:
  - Deploy specific image tags
  - Multiple deployment strategies
  - Configurable testing and backup options

### Deployment Scripts

#### 1. Blue-Green Deployment (`scripts/deployment/blue-green-deploy.sh`)
```bash
./scripts/deployment/blue-green-deploy.sh <namespace> <image> [version]
```
- Zero-downtime deployments
- Automatic health checks
- Traffic switching validation
- Rollback on failure

#### 2. Emergency Rollback (`scripts/deployment/rollback.sh`)
```bash
./scripts/deployment/rollback.sh [namespace] [target] [restore_db]
```
- Quick rollback capability
- Database restoration options
- Comprehensive reporting

#### 3. Health Checks (`scripts/deployment/health-check.sh`)
```bash
./scripts/deployment/health-check.sh [namespace] [base_url]
```
- Comprehensive health validation
- Performance baseline testing
- Kubernetes resource checks

#### 4. Smoke Tests (`scripts/deployment/smoke-tests.sh`)
```bash
./scripts/deployment/smoke-tests.sh [base_url]
```
- Essential functionality testing
- API endpoint validation
- Performance and security checks

#### 5. Secrets Setup (`scripts/deployment/setup-secrets.sh`)
```bash
./scripts/deployment/setup-secrets.sh <environment>
```
- Automated secret generation
- Secure credential management
- Environment-specific configuration

### Container Infrastructure

#### Production Dockerfile (`docker/Dockerfile.production`)
- Multi-stage build optimization
- Security hardening
- Non-root user execution
- Health check integration
- Minimal attack surface

#### Health Check Script (`scripts/docker/healthcheck.sh`)
- Container readiness validation
- Multiple fallback methods
- Configurable timeout and endpoints

### Kubernetes Manifests

#### Staging Environment (`k8s/staging/`)
- 2 replica minimum
- HPA scaling (2-10 pods)
- Development-friendly configuration
- Rate limiting: 1000 req/min

#### Production Environment (`k8s/production/`)
- 3 replica minimum  
- HPA scaling (3-50 pods)
- Production security policies
- Network policies and pod anti-affinity
- Rate limiting: 500 req/min
- SSL/TLS termination

### Environment Configuration

#### Staging (`config/environments/staging.yaml`)
- Debug mode enabled
- Relaxed security for testing
- Development service integrations
- Verbose logging

#### Production (`config/environments/production.yaml`)
- Optimized for performance
- Maximum security settings
- Production service integrations
- Structured logging only

## 🚀 Deployment Process

### Automated Staging Deployment

1. **Developer pushes to `develop` branch**
2. **GitHub Actions triggers staging workflow**:
   - Run test suite (lint, typecheck, unit tests)
   - Build and push container image
   - Deploy to staging with blue-green strategy
   - Run smoke tests and performance tests
   - Security scanning
   - Notify team of deployment status

### Production Deployment Options

#### Option 1: Automatic (Recommended)
1. **Merge PR to `main` branch**
2. **Automatic production deployment**:
   - Full test suite execution
   - Production container build
   - Database backup creation
   - Blue-green deployment
   - Health check validation
   - Automatic rollback on failure

#### Option 2: Manual Deployment
1. **Use GitHub Actions Manual Deployment workflow**
2. **Configure deployment parameters**:
   - Target environment
   - Image tag to deploy
   - Deployment strategy
   - Testing and backup options

#### Option 3: Environment Promotion
1. **Use Environment Promotion workflow**
2. **Promote from staging to production**:
   - Source validation
   - Pre-promotion testing
   - Blue-green deployment
   - Post-promotion validation

### Emergency Procedures

#### Emergency Rollback
```bash
# Via GitHub Actions (Recommended)
1. Go to Actions → Emergency Rollback
2. Select environment and configure options
3. Provide rollback reason
4. Execute rollback

# Via Command Line
./scripts/deployment/rollback.sh production previous false
```

#### Manual Health Check
```bash
# Check application health
./scripts/deployment/health-check.sh production https://lanka.com

# Run smoke tests
./scripts/deployment/smoke-tests.sh https://lanka.com
```

## 📋 Pre-Deployment Checklist

### First-Time Setup

1. **Create GitHub Secrets**:
   ```
   PRODUCTION_KUBECONFIG    # Production Kubernetes config
   STAGING_KUBECONFIG       # Staging Kubernetes config
   SLACK_WEBHOOK           # Deployment notifications
   CODECOV_TOKEN           # Code coverage reporting
   ```

2. **Setup Kubernetes Secrets**:
   ```bash
   # Generate secrets for each environment
   ./scripts/deployment/setup-secrets.sh staging
   ./scripts/deployment/setup-secrets.sh production
   
   # Update external service credentials
   kubectl patch secret lanka-production-secrets -n production \
     -p='{"data":{"STRIPE_SECRET_KEY":"'$(echo -n "real_key" | base64 -w 0)'"}}'
   ```

3. **Configure DNS and SSL**:
   - Point `lanka.com` → Production Load Balancer
   - Point `staging.lanka.com` → Staging Load Balancer
   - Configure cert-manager for automatic SSL certificates

4. **Setup Monitoring**:
   - Configure Prometheus metrics collection
   - Setup Grafana dashboards
   - Configure alert rules

### Regular Deployment

1. **Code Quality**:
   - [ ] All tests passing
   - [ ] Code review approved
   - [ ] Security scan clean
   - [ ] Documentation updated

2. **Infrastructure**:
   - [ ] Staging deployment successful
   - [ ] Performance tests passed
   - [ ] Database migrations tested
   - [ ] Backup strategy verified

3. **Communication**:
   - [ ] Stakeholders notified
   - [ ] Maintenance window scheduled (if needed)
   - [ ] Rollback plan confirmed

## 🔧 Configuration Management

### Environment Variables

#### Staging
- `NODE_ENV=staging`
- `LOG_LEVEL=debug`
- `ENABLE_DEBUG=true`
- Rate limits: Relaxed for testing

#### Production
- `NODE_ENV=production`
- `LOG_LEVEL=info`
- `ENABLE_DEBUG=false`
- Rate limits: Strict for protection

### Secret Management

All secrets are managed through Kubernetes secrets:
- Database credentials
- JWT signing keys
- External service API keys
- Encryption keys

### Feature Flags

Environment-specific feature flags:
- `FEATURE_ADVANCED_ANALYTICS`: On in staging, on in production
- `FEATURE_BETA_UI`: On in staging, off in production
- `FEATURE_DEBUG_MODE`: On in staging, off in production

## 📊 Monitoring and Alerting

### Metrics Collection

1. **Application Metrics** (`/metrics` endpoint):
   - Request rate and latency
   - Error rates by endpoint
   - Custom business metrics

2. **Infrastructure Metrics**:
   - Pod CPU and memory usage
   - Node resource utilization
   - Network traffic patterns

3. **Database Metrics**:
   - Connection pool status
   - Query performance
   - Transaction rates

### Health Checks

1. **Liveness Probe**: `/health`
   - Basic application health
   - Database connectivity
   - Critical service availability

2. **Readiness Probe**: `/ready`
   - Full application readiness
   - All dependencies available
   - Ready to serve traffic

3. **Startup Probe**: `/health`
   - Application startup validation
   - Prevents premature traffic routing

### Alerting Rules

1. **Critical Alerts**:
   - Application down
   - High error rates (>5%)
   - Database connectivity issues
   - SSL certificate expiration

2. **Warning Alerts**:
   - High response times (>2s)
   - Memory usage >80%
   - CPU usage >70%
   - Low disk space

## 🔐 Security Considerations

### Container Security

1. **Non-root execution**
2. **Read-only root filesystem**
3. **Minimal base image**
4. **Security scanning with Trivy**
5. **Image signing with Cosign**

### Network Security

1. **Network policies** (production only)
2. **TLS encryption** for all traffic
3. **Rate limiting** at ingress
4. **CORS configuration**

### Application Security

1. **Security headers** (HSTS, CSP, etc.)
2. **Input validation**
3. **Authentication and authorization**
4. **Secrets encryption at rest**

## 📈 Performance Optimization

### Container Optimization

1. **Multi-stage builds** for smaller images
2. **Layer caching** for faster builds
3. **Health check optimization**
4. **Resource limits and requests**

### Deployment Optimization

1. **Blue-green deployment** for zero downtime
2. **Horizontal Pod Autoscaler** for scaling
3. **Pod Disruption Budgets** for availability
4. **Affinity rules** for distribution

### Database Optimization

1. **Connection pooling**
2. **Migration automation**
3. **Backup automation**
4. **Performance monitoring**

## 🔄 Maintenance Procedures

### Regular Maintenance

1. **Weekly**:
   - Review deployment metrics
   - Check for security updates
   - Validate backup integrity

2. **Monthly**:
   - Disaster recovery testing
   - Performance review
   - Capacity planning

3. **Quarterly**:
   - Security audit
   - Cost optimization review
   - Infrastructure updates

### Troubleshooting Guide

#### Common Issues

1. **Deployment Failures**:
   ```bash
   # Check deployment status
   kubectl get deployments -n production
   
   # View pod logs
   kubectl logs -f deployment/lanka-api-blue -n production
   
   # Describe pod for events
   kubectl describe pod <pod-name> -n production
   ```

2. **Health Check Failures**:
   ```bash
   # Manual health check
   ./scripts/deployment/health-check.sh production
   
   # Check application logs
   kubectl logs -f -l app=lanka-api -n production
   ```

3. **Performance Issues**:
   ```bash
   # Check resource usage
   kubectl top pods -n production
   
   # Review metrics
   curl https://lanka.com/metrics
   ```

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Blue-Green Deployment Guide](https://martinfowler.com/bliki/BlueGreenDeployment.html)

## 🆘 Support and Contact

For deployment issues or questions:
- **Slack**: `#deployments` channel
- **Email**: devops@lanka.com
- **On-call**: Use PagerDuty for emergencies

---

**Last Updated**: $(date)
**Version**: 3.1.0
**Maintained by**: Lanka Platform DevOps Team