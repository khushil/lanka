#!/bin/bash

# Lanka Platform Deployment Script
# Supports multiple environments and deployment strategies

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
ENVIRONMENT="${1:-dev}"
DEPLOYMENT_TYPE="${2:-rolling}"
DRY_RUN="${3:-false}"
SKIP_TESTS="${SKIP_TESTS:-false}"
FORCE_DEPLOY="${FORCE_DEPLOY:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check required tools
    local tools=("kubectl" "helm" "aws" "terraform" "docker")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is required but not installed"
            exit 1
        fi
    done
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured properly"
        exit 1
    fi
    
    # Check kubectl context
    local current_context=$(kubectl config current-context 2>/dev/null || echo "")
    if [[ -z "$current_context" ]]; then
        log_error "No kubectl context set"
        exit 1
    fi
    
    log_info "Current kubectl context: $current_context"
    
    # Confirm context for production
    if [[ "$ENVIRONMENT" == "prod" && "$current_context" != *"prod"* ]]; then
        if [[ "$FORCE_DEPLOY" != "true" ]]; then
            log_warn "You're deploying to production but kubectl context doesn't seem to be production"
            read -p "Are you sure you want to continue? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi
    
    log_success "Prerequisites check passed"
}

# Function to validate configuration
validate_config() {
    log_info "Validating configuration for environment: $ENVIRONMENT"
    
    # Check if environment-specific configs exist
    local config_files=(
        "$PROJECT_ROOT/k8s/overlays/$ENVIRONMENT/kustomization.yaml"
        "$PROJECT_ROOT/infrastructure/environments/$ENVIRONMENT.tfvars"
    )
    
    for config_file in "${config_files[@]}"; do
        if [[ ! -f "$config_file" ]]; then
            log_error "Configuration file not found: $config_file"
            exit 1
        fi
    done
    
    # Validate Kubernetes manifests
    if ! kubectl apply --dry-run=client -k "$PROJECT_ROOT/k8s/overlays/$ENVIRONMENT" &> /dev/null; then
        log_error "Kubernetes manifests validation failed"
        exit 1
    fi
    
    log_success "Configuration validation passed"
}

# Function to run tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_warn "Skipping tests as requested"
        return 0
    fi
    
    log_info "Running tests..."
    
    # Unit tests
    cd "$PROJECT_ROOT"
    if ! npm test; then
        log_error "Unit tests failed"
        exit 1
    fi
    
    # Integration tests
    if ! npm run test:integration; then
        log_error "Integration tests failed"
        exit 1
    fi
    
    # Security tests
    if ! npm audit --audit-level=high; then
        log_error "Security audit failed"
        exit 1
    fi
    
    log_success "All tests passed"
}

# Function to build and push images
build_and_push_images() {
    log_info "Building and pushing Docker images..."
    
    local registry_url=$(aws ecr describe-registry --query 'registryId' --output text)
    local region=$(aws configure get region)
    
    # Login to ECR
    aws ecr get-login-password --region "$region" | docker login --username AWS --password-stdin "${registry_url}.dkr.ecr.${region}.amazonaws.com"
    
    # Build and push API image
    local api_image="${registry_url}.dkr.ecr.${region}.amazonaws.com/lanka-platform/api:${GITHUB_SHA:-latest}"
    docker build -t "$api_image" -f "$PROJECT_ROOT/Dockerfile" "$PROJECT_ROOT"
    
    if [[ "$DRY_RUN" != "true" ]]; then
        docker push "$api_image"
        log_success "Pushed API image: $api_image"
    else
        log_info "DRY RUN: Would push API image: $api_image"
    fi
    
    # Build and push client image
    local client_image="${registry_url}.dkr.ecr.${region}.amazonaws.com/lanka-platform/client:${GITHUB_SHA:-latest}"
    docker build -t "$client_image" -f "$PROJECT_ROOT/client/Dockerfile" "$PROJECT_ROOT/client"
    
    if [[ "$DRY_RUN" != "true" ]]; then
        docker push "$client_image"
        log_success "Pushed client image: $client_image"
    else
        log_info "DRY RUN: Would push client image: $client_image"
    fi
}

# Function to deploy infrastructure
deploy_infrastructure() {
    log_info "Deploying infrastructure..."
    
    cd "$PROJECT_ROOT/infrastructure"
    
    # Initialize Terraform
    terraform init -backend-config="environments/$ENVIRONMENT.backend.tfvars"
    
    # Plan
    terraform plan -var-file="environments/$ENVIRONMENT.tfvars" -out="$ENVIRONMENT.tfplan"
    
    if [[ "$DRY_RUN" != "true" ]]; then
        # Apply
        terraform apply "$ENVIRONMENT.tfplan"
        log_success "Infrastructure deployment completed"
    else
        log_info "DRY RUN: Infrastructure plan completed"
    fi
    
    # Clean up plan file
    rm -f "$ENVIRONMENT.tfplan"
}

# Function to deploy applications
deploy_applications() {
    log_info "Deploying applications using $DEPLOYMENT_TYPE strategy..."
    
    # Update kubeconfig
    local cluster_name=$(terraform -chdir="$PROJECT_ROOT/infrastructure" output -raw cluster_name)
    local region=$(aws configure get region)
    aws eks update-kubeconfig --region "$region" --name "$cluster_name"
    
    # Apply base resources first
    if [[ "$DRY_RUN" != "true" ]]; then
        kubectl apply -f "$PROJECT_ROOT/k8s/namespace.yaml"
        kubectl apply -f "$PROJECT_ROOT/k8s/configmaps.yaml"
        kubectl apply -f "$PROJECT_ROOT/k8s/secrets.yaml"
    else
        log_info "DRY RUN: Would apply base resources"
    fi
    
    # Deploy applications based on strategy
    case "$DEPLOYMENT_TYPE" in
        "rolling")
            deploy_rolling
            ;;
        "blue-green")
            deploy_blue_green
            ;;
        "canary")
            deploy_canary
            ;;
        *)
            log_error "Unknown deployment type: $DEPLOYMENT_TYPE"
            exit 1
            ;;
    esac
}

# Function for rolling deployment
deploy_rolling() {
    log_info "Performing rolling deployment..."
    
    if [[ "$DRY_RUN" != "true" ]]; then
        kubectl apply -k "$PROJECT_ROOT/k8s/overlays/$ENVIRONMENT"
        kubectl rollout status deployment/lanka-platform-api -n "lanka-$ENVIRONMENT" --timeout=600s
        kubectl rollout status deployment/lanka-platform-client -n "lanka-$ENVIRONMENT" --timeout=600s
        kubectl rollout status deployment/lanka-platform-worker -n "lanka-$ENVIRONMENT" --timeout=600s
    else
        log_info "DRY RUN: Would perform rolling deployment"
    fi
}

# Function for blue-green deployment
deploy_blue_green() {
    log_info "Performing blue-green deployment..."
    
    # Implementation depends on service mesh or ingress controller capabilities
    # This is a simplified version
    
    if [[ "$DRY_RUN" != "true" ]]; then
        # Deploy to green environment
        kubectl apply -k "$PROJECT_ROOT/k8s/overlays/$ENVIRONMENT-green"
        
        # Wait for green deployment to be ready
        kubectl rollout status deployment/lanka-platform-api-green -n "lanka-$ENVIRONMENT" --timeout=600s
        
        # Run smoke tests on green environment
        if run_smoke_tests "green"; then
            # Switch traffic to green
            kubectl patch service lanka-platform-api -n "lanka-$ENVIRONMENT" -p '{"spec":{"selector":{"version":"green"}}}'
            log_success "Traffic switched to green environment"
            
            # Optionally scale down blue environment
            kubectl scale deployment/lanka-platform-api-blue -n "lanka-$ENVIRONMENT" --replicas=0
        else
            log_error "Smoke tests failed, keeping blue environment active"
            exit 1
        fi
    else
        log_info "DRY RUN: Would perform blue-green deployment"
    fi
}

# Function for canary deployment
deploy_canary() {
    log_info "Performing canary deployment..."
    
    if [[ "$DRY_RUN" != "true" ]]; then
        # Deploy canary version (10% traffic)
        kubectl apply -k "$PROJECT_ROOT/k8s/overlays/$ENVIRONMENT-canary"
        
        # Monitor metrics for 5 minutes
        log_info "Monitoring canary deployment for 5 minutes..."
        sleep 300
        
        # Check metrics and decide whether to proceed
        if check_canary_metrics; then
            # Gradually increase traffic
            for traffic in 25 50 75 100; do
                log_info "Increasing canary traffic to ${traffic}%"
                update_canary_traffic "$traffic"
                sleep 120
                
                if ! check_canary_metrics; then
                    log_error "Canary metrics degraded, rolling back"
                    rollback_canary
                    exit 1
                fi
            done
            
            # Promote canary to stable
            promote_canary
            log_success "Canary deployment promoted to stable"
        else
            log_error "Canary metrics failed, rolling back"
            rollback_canary
            exit 1
        fi
    else
        log_info "DRY RUN: Would perform canary deployment"
    fi
}

# Function to run smoke tests
run_smoke_tests() {
    local version="${1:-current}"
    log_info "Running smoke tests against $version environment..."
    
    # Get service endpoint
    local endpoint
    if [[ "$version" == "green" ]]; then
        endpoint=$(kubectl get service lanka-platform-api-green -n "lanka-$ENVIRONMENT" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    else
        endpoint=$(kubectl get service lanka-platform-api -n "lanka-$ENVIRONMENT" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    fi
    
    # Basic health check
    if curl -f "http://$endpoint/health" &> /dev/null; then
        log_success "Health check passed"
        return 0
    else
        log_error "Health check failed"
        return 1
    fi
}

# Function to check canary metrics
check_canary_metrics() {
    log_info "Checking canary metrics..."
    
    # This would typically query Prometheus or CloudWatch
    # For now, we'll simulate with a basic check
    local error_rate=$(kubectl exec -n monitoring deployment/prometheus -- \
        promtool query instant 'sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))' || echo "0.05")
    
    if (( $(echo "$error_rate < 0.01" | bc -l) )); then
        log_success "Canary metrics are healthy (error rate: $error_rate)"
        return 0
    else
        log_error "Canary metrics are unhealthy (error rate: $error_rate)"
        return 1
    fi
}

# Function to update canary traffic
update_canary_traffic() {
    local traffic_percentage="$1"
    log_info "Updating canary traffic to $traffic_percentage%"
    
    # This would update ingress controller or service mesh configuration
    # Implementation depends on the specific technology used
    kubectl annotate ingress lanka-platform-ingress -n "lanka-$ENVIRONMENT" \
        nginx.ingress.kubernetes.io/canary-weight="$traffic_percentage" --overwrite
}

# Function to rollback canary
rollback_canary() {
    log_warn "Rolling back canary deployment..."
    kubectl delete -k "$PROJECT_ROOT/k8s/overlays/$ENVIRONMENT-canary"
    kubectl annotate ingress lanka-platform-ingress -n "lanka-$ENVIRONMENT" \
        nginx.ingress.kubernetes.io/canary-weight- || true
}

# Function to promote canary
promote_canary() {
    log_info "Promoting canary to stable..."
    
    # Update stable deployment with canary configuration
    kubectl patch deployment lanka-platform-api -n "lanka-$ENVIRONMENT" \
        --patch-file="$PROJECT_ROOT/k8s/overlays/$ENVIRONMENT-canary/api-patch.yaml"
    
    # Remove canary resources
    kubectl delete -k "$PROJECT_ROOT/k8s/overlays/$ENVIRONMENT-canary"
    kubectl annotate ingress lanka-platform-ingress -n "lanka-$ENVIRONMENT" \
        nginx.ingress.kubernetes.io/canary-weight- || true
}

# Function to verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check pod status
    if ! kubectl get pods -n "lanka-$ENVIRONMENT" | grep -q "Running"; then
        log_error "Some pods are not running"
        kubectl get pods -n "lanka-$ENVIRONMENT"
        exit 1
    fi
    
    # Check service endpoints
    local endpoints=$(kubectl get endpoints -n "lanka-$ENVIRONMENT" -o json | jq -r '.items[].subsets[]?.addresses[]?.ip' | wc -l)
    if [[ "$endpoints" -lt 1 ]]; then
        log_error "No service endpoints available"
        exit 1
    fi
    
    # Run post-deployment tests
    if [[ "$SKIP_TESTS" != "true" ]]; then
        run_smoke_tests
    fi
    
    log_success "Deployment verification passed"
}

# Function to create backup before deployment
create_backup() {
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        log_info "Creating backup before production deployment..."
        
        # Database backup
        kubectl exec -n "lanka-$ENVIRONMENT" deployment/lanka-platform-api -- \
            node scripts/backup-database.js
        
        # Configuration backup
        kubectl get configmap,secret -n "lanka-$ENVIRONMENT" -o yaml > \
            "$PROJECT_ROOT/backups/config-backup-$(date +%Y%m%d-%H%M%S).yaml"
        
        log_success "Backup created"
    fi
}

# Function to send notifications
send_notifications() {
    local status="$1"
    local message="$2"
    
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"Lanka Platform Deployment $status: $message\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
    
    # Could add other notification methods (email, PagerDuty, etc.)
}

# Main deployment function
main() {
    log_info "Starting Lanka Platform deployment"
    log_info "Environment: $ENVIRONMENT"
    log_info "Deployment Type: $DEPLOYMENT_TYPE"
    log_info "Dry Run: $DRY_RUN"
    
    # Trap to handle failures
    trap 'log_error "Deployment failed"; send_notifications "FAILED" "Environment: $ENVIRONMENT"; exit 1' ERR
    
    # Pre-deployment steps
    check_prerequisites
    validate_config
    create_backup
    run_tests
    build_and_push_images
    
    # Deployment steps
    deploy_infrastructure
    deploy_applications
    verify_deployment
    
    # Post-deployment
    log_success "Lanka Platform deployment completed successfully!"
    send_notifications "SUCCESS" "Environment: $ENVIRONMENT, Type: $DEPLOYMENT_TYPE"
}

# Help function
show_help() {
    cat << EOF
Lanka Platform Deployment Script

Usage: $0 [ENVIRONMENT] [DEPLOYMENT_TYPE] [DRY_RUN]

Arguments:
  ENVIRONMENT      Target environment (dev, staging, prod) [default: dev]
  DEPLOYMENT_TYPE  Deployment strategy (rolling, blue-green, canary) [default: rolling]
  DRY_RUN         Run in dry-run mode (true, false) [default: false]

Environment Variables:
  SKIP_TESTS      Skip test execution (default: false)
  FORCE_DEPLOY    Force deployment without confirmations (default: false)
  SLACK_WEBHOOK_URL  Slack webhook for notifications

Examples:
  $0                          # Deploy to dev with rolling strategy
  $0 staging blue-green       # Deploy to staging with blue-green strategy  
  $0 prod rolling true        # Dry run production deployment
  
  SKIP_TESTS=true $0 dev      # Deploy to dev skipping tests
  FORCE_DEPLOY=true $0 prod   # Force deploy to prod without confirmations

EOF
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    "")
        main
        ;;
    *)
        main
        ;;
esac