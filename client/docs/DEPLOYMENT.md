# LANKA UI - Deployment Guide

This guide covers deployment strategies and configurations for the LANKA UI across different environments.

## 🏗️ Deployment Overview

### Supported Environments
- **Development**: Local development with hot reloading
- **Staging**: Pre-production testing environment
- **Production**: Live production environment
- **Docker**: Containerized deployment for any environment

### Deployment Methods
1. **Docker Containerization** (Recommended)
2. **Static File Hosting** (Netlify, Vercel, S3)
3. **Kubernetes Deployment**
4. **Traditional Server Deployment**

## 🐳 Docker Deployment (Recommended)

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- 2GB+ available memory

### Quick Start
```bash
# Clone repository
git clone <repository-url>
cd lanka/client

# Build and run with Docker Compose
docker-compose up --build
```

### Production Docker Deployment
```bash
# Build production image
npm run docker:build

# Tag for registry
docker tag lanka-ui:latest your-registry.com/lanka-ui:v1.0.0

# Push to registry
docker push your-registry.com/lanka-ui:v1.0.0

# Deploy on production server
docker run -d \
  --name lanka-ui \
  -p 80:3000 \
  -e NODE_ENV=production \
  --restart unless-stopped \
  your-registry.com/lanka-ui:v1.0.0
```

### Docker Compose Configuration

#### Development (docker-compose.yml)
```yaml
version: '3.8'
services:
  lanka-ui:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - REACT_APP_API_URL=http://localhost:4000
    volumes:
      - .:/app
      - /app/node_modules
    command: npm start
```

#### Production (docker-compose.prod.yml)
```yaml
version: '3.8'
services:
  lanka-ui:
    build: 
      context: .
      dockerfile: Dockerfile
    ports:
      - "80:3000"
    environment:
      - NODE_ENV=production
      - REACT_APP_API_URL=https://api.lanka.com
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## ☁️ Cloud Platform Deployments

### AWS Deployment

#### S3 + CloudFront (Static Hosting)
```bash
# Build for production
npm run build:production

# Install AWS CLI
aws configure

# Deploy to S3
aws s3 sync build/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

#### ECS Deployment
```bash
# Build and push to ECR
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin your-account.dkr.ecr.us-west-2.amazonaws.com

docker build -t lanka-ui .
docker tag lanka-ui:latest your-account.dkr.ecr.us-west-2.amazonaws.com/lanka-ui:latest
docker push your-account.dkr.ecr.us-west-2.amazonaws.com/lanka-ui:latest

# Deploy using ECS task definition
aws ecs update-service --cluster lanka-cluster --service lanka-ui --force-new-deployment
```

### Google Cloud Platform

#### Cloud Run Deployment
```bash
# Build and deploy to Cloud Run
gcloud builds submit --tag gcr.io/your-project/lanka-ui
gcloud run deploy lanka-ui --image gcr.io/your-project/lanka-ui --platform managed --region us-central1
```

#### Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Initialize Firebase
firebase init hosting

# Build and deploy
npm run build:production
firebase deploy
```

### Azure Deployment

#### Azure Container Instances
```bash
# Build and push to Azure Container Registry
az acr build --registry yourregistry --image lanka-ui:v1 .

# Deploy to Container Instances
az container create \
  --resource-group lanka-rg \
  --name lanka-ui \
  --image yourregistry.azurecr.io/lanka-ui:v1 \
  --ports 3000 \
  --dns-name-label lanka-ui-app
```

## 🚀 Static Hosting Platforms

### Netlify Deployment
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build application
npm run build:production

# Deploy to Netlify
netlify deploy --prod --dir=build
```

#### netlify.toml Configuration
```toml
[build]
  publish = "build"
  command = "npm run build:production"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  REACT_APP_API_URL = "https://api.lanka.com"
  REACT_APP_ENVIRONMENT = "production"
```

### Vercel Deployment
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
vercel --prod
```

#### vercel.json Configuration
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    }
  ],
  "routes": [
    {
      "src": "/static/(.*)",
      "headers": {
        "cache-control": "s-maxage=31536000,immutable"
      },
      "dest": "/static/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

## ⚓ Kubernetes Deployment

### Kubernetes Manifests

#### Deployment (k8s/deployment.yaml)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lanka-ui
  labels:
    app: lanka-ui
spec:
  replicas: 3
  selector:
    matchLabels:
      app: lanka-ui
  template:
    metadata:
      labels:
        app: lanka-ui
    spec:
      containers:
      - name: lanka-ui
        image: your-registry.com/lanka-ui:v1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: REACT_APP_API_URL
          value: "https://api.lanka.com"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

#### Service (k8s/service.yaml)
```yaml
apiVersion: v1
kind: Service
metadata:
  name: lanka-ui-service
spec:
  selector:
    app: lanka-ui
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
```

#### Ingress (k8s/ingress.yaml)
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: lanka-ui-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - app.lanka.com
    secretName: lanka-ui-tls
  rules:
  - host: app.lanka.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: lanka-ui-service
            port:
              number: 80
```

### Deploy to Kubernetes
```bash
# Apply manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -l app=lanka-ui
kubectl get services lanka-ui-service

# Scale deployment
kubectl scale deployment lanka-ui --replicas=5
```

## 🔧 Environment Configuration

### Environment Variables by Deployment Type

#### Development
```bash
NODE_ENV=development
REACT_APP_API_URL=http://localhost:4000
REACT_APP_WEBSOCKET_URL=ws://localhost:4000
REACT_APP_ENABLE_DEBUG_MODE=true
REACT_APP_ENABLE_DEVELOPMENT_TOOLS=true
```

#### Staging
```bash
NODE_ENV=staging
REACT_APP_API_URL=https://staging-api.lanka.com
REACT_APP_WEBSOCKET_URL=wss://staging-api.lanka.com
REACT_APP_ENABLE_DEBUG_MODE=false
REACT_APP_ENABLE_DEVELOPMENT_TOOLS=true
REACT_APP_SENTRY_DSN=https://staging-sentry-dsn@sentry.io/project-id
```

#### Production
```bash
NODE_ENV=production
REACT_APP_API_URL=https://api.lanka.com
REACT_APP_WEBSOCKET_URL=wss://api.lanka.com
REACT_APP_ENABLE_DEBUG_MODE=false
REACT_APP_ENABLE_DEVELOPMENT_TOOLS=false
REACT_APP_SENTRY_DSN=https://production-sentry-dsn@sentry.io/project-id
REACT_APP_GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
```

### Secrets Management

#### Docker Secrets
```bash
# Create secrets
echo "super-secret-api-key" | docker secret create api_key -

# Use in docker-compose
version: '3.8'
services:
  lanka-ui:
    image: lanka-ui:latest
    secrets:
      - api_key
    environment:
      - API_KEY_FILE=/run/secrets/api_key
secrets:
  api_key:
    external: true
```

#### Kubernetes Secrets
```bash
# Create secret
kubectl create secret generic lanka-ui-secrets \
  --from-literal=api-key=super-secret-api-key

# Reference in deployment
env:
- name: API_KEY
  valueFrom:
    secretKeyRef:
      name: lanka-ui-secrets
      key: api-key
```

## 📊 Monitoring & Logging

### Health Checks
All deployment methods include health check endpoints:
- `/health` - Basic health status
- `/ready` - Readiness probe
- `/metrics` - Prometheus metrics (if enabled)

### Logging Configuration
```bash
# Docker logging
docker run -d \
  --log-driver=json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  lanka-ui:latest

# Kubernetes logging
kubectl logs -f deployment/lanka-ui
kubectl logs -f deployment/lanka-ui --previous
```

### Monitoring Setup
```bash
# Prometheus metrics
REACT_APP_ENABLE_PROMETHEUS=true

# Sentry error tracking
REACT_APP_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Google Analytics
REACT_APP_GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
```

## 🛡️ Security Configuration

### Production Security Checklist
- [ ] HTTPS enabled with valid SSL certificates
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options)
- [ ] Secrets managed securely (not in environment variables)
- [ ] Regular security updates applied
- [ ] Access logs monitored
- [ ] Rate limiting configured
- [ ] CORS properly configured

### Nginx Security Headers
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

## 🔄 CI/CD Integration

### GitHub Actions Deployment
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm run test:ci
    
    - name: Build application
      run: npm run build:production
    
    - name: Build Docker image
      run: docker build -t lanka-ui:${{ github.sha }} .
    
    - name: Deploy to production
      run: |
        docker tag lanka-ui:${{ github.sha }} registry.com/lanka-ui:latest
        docker push registry.com/lanka-ui:latest
```

### GitLab CI/CD
```yaml
stages:
  - build
  - test
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: "/certs"

build:
  stage: build
  image: node:18
  script:
    - npm ci
    - npm run build:production
  artifacts:
    paths:
      - build/
    expire_in: 1 hour

test:
  stage: test
  image: node:18
  script:
    - npm ci
    - npm run test:ci
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'

deploy:
  stage: deploy
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t lanka-ui:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  only:
    - main
```

## 🚨 Troubleshooting

### Common Deployment Issues

#### Build Failures
```bash
# Clear cache and rebuild
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build:production
```

#### Docker Issues
```bash
# Check container logs
docker logs lanka-ui

# Inspect container
docker inspect lanka-ui

# Shell into container
docker exec -it lanka-ui /bin/sh
```

#### Kubernetes Issues
```bash
# Check pod status
kubectl describe pod lanka-ui-pod-id

# Check events
kubectl get events --sort-by=.metadata.creationTimestamp

# Check resource usage
kubectl top pods
```

### Performance Troubleshooting
- Monitor bundle size: `npm run analyze`
- Check memory usage in production
- Enable performance profiling
- Review network requests and API response times

### Rollback Procedures
```bash
# Docker rollback
docker service update --rollback lanka-ui-service

# Kubernetes rollback
kubectl rollout undo deployment/lanka-ui
kubectl rollout status deployment/lanka-ui

# Static hosting rollback
# Restore previous build from backup
```

## 📋 Post-Deployment Checklist

### Verification Steps
- [ ] Application loads successfully
- [ ] All routes are accessible
- [ ] API connectivity works
- [ ] Authentication functions correctly
- [ ] Real-time features work (WebSocket)
- [ ] File uploads work
- [ ] Error handling works
- [ ] Performance is acceptable
- [ ] Security headers are present
- [ ] Monitoring is active
- [ ] Backup procedures are in place

### Performance Validation
- [ ] Load time < 3 seconds
- [ ] First Contentful Paint < 1.5 seconds
- [ ] Largest Contentful Paint < 2.5 seconds
- [ ] Cumulative Layout Shift < 0.1
- [ ] Bundle size optimized
- [ ] Images optimized

This deployment guide provides comprehensive instructions for deploying the LANKA UI across different environments and platforms. Choose the deployment method that best fits your infrastructure and requirements.