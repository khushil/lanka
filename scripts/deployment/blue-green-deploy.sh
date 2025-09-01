#!/bin/bash

# Blue-Green Deployment Script for Lanka Platform
# This script implements zero-downtime deployments using blue-green strategy

set -euo pipefail

# Configuration
NAMESPACE="${1:-production}"
IMAGE="${2:-}"
VERSION="${3:-$(date +%Y%m%d-%H%M%S)}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}"
ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-true}"
SKIP_BACKUP="${SKIP_BACKUP:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Validation
validate_inputs() {
    if [[ -z "$IMAGE" ]]; then
        log_error "Image parameter is required"
        echo "Usage: $0 <namespace> <image> [version]"
        exit 1
    fi

    if ! kubectl get namespace "$NAMESPACE" &>/dev/null; then
        log_error "Namespace '$NAMESPACE' does not exist"
        exit 1
    fi

    log_info "Validated inputs: namespace=$NAMESPACE, image=$IMAGE, version=$VERSION"
}

# Get current deployment color
get_current_color() {
    local current_color
    current_color=$(kubectl get service lanka-api -n "$NAMESPACE" -o jsonpath='{.spec.selector.color}' 2>/dev/null || echo "blue")
    echo "$current_color"
}

# Get new deployment color
get_new_color() {
    local current_color="$1"
    if [[ "$current_color" == "blue" ]]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Create backup before deployment
create_backup() {
    if [[ "$SKIP_BACKUP" == "true" ]]; then
        log_warning "Skipping backup creation"
        return 0
    fi

    local backup_name="pre-deploy-$(date +%Y%m%d-%H%M%S)"
    log_info "Creating backup: $backup_name"

    kubectl create job --from=cronjob/db-backup "backup-$backup_name" -n "$NAMESPACE"
    kubectl wait --for=condition=complete --timeout=600s "job/backup-$backup_name" -n "$NAMESPACE"

    log_success "Backup created: $backup_name"
    echo "$backup_name"
}

# Apply database migrations
apply_migrations() {
    local migration_job="migration-$VERSION"
    log_info "Applying database migrations: $migration_job"

    if kubectl get job "$migration_job" -n "$NAMESPACE" &>/dev/null; then
        log_warning "Migration job already exists, skipping"
        return 0
    fi

    kubectl create job --from=cronjob/db-migration "$migration_job" -n "$NAMESPACE"
    kubectl wait --for=condition=complete --timeout=600s "job/$migration_job" -n "$NAMESPACE"

    log_success "Database migrations applied successfully"
}

# Deploy new version
deploy_new_version() {
    local new_color="$1"
    local deployment_name="lanka-api-$new_color"

    log_info "Deploying new version to $new_color environment"

    # Create deployment manifest
    cat > "/tmp/deployment-$new_color.yaml" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $deployment_name
  namespace: $NAMESPACE
  labels:
    app: lanka-api
    color: $new_color
    version: $VERSION
  annotations:
    deployment.kubernetes.io/revision-timestamp: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: lanka-api
      color: $new_color
  template:
    metadata:
      labels:
        app: lanka-api
        color: $new_color
        version: $VERSION
    spec:
      containers:
      - name: lanka-api
        image: $IMAGE
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: $NAMESPACE
        - name: VERSION
          value: $VERSION
        - name: COLOR
          value: $new_color
        envFrom:
        - configMapRef:
            name: lanka-$NAMESPACE-config
        - secretRef:
            name: lanka-$NAMESPACE-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        securityContext:
          allowPrivilegeEscalation: false
          runAsNonRoot: true
          runAsUser: 1000
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
      securityContext:
        fsGroup: 1000
      restartPolicy: Always
      terminationGracePeriodSeconds: 30
EOF

    # Apply deployment
    kubectl apply -f "/tmp/deployment-$new_color.yaml"
    kubectl rollout status "deployment/$deployment_name" -n "$NAMESPACE" --timeout=600s

    log_success "New version deployed successfully to $new_color"
}

# Run health checks
run_health_checks() {
    local new_color="$1"
    local service_name="lanka-api-$new_color"
    local start_time=$(date +%s)

    log_info "Running health checks on $new_color deployment"

    # Create temporary service for health checks
    cat > "/tmp/health-service-$new_color.yaml" << EOF
apiVersion: v1
kind: Service
metadata:
  name: $service_name-health
  namespace: $NAMESPACE
spec:
  selector:
    app: lanka-api
    color: $new_color
  ports:
  - port: 3000
    targetPort: 3000
  type: ClusterIP
EOF

    kubectl apply -f "/tmp/health-service-$new_color.yaml"

    # Wait for pods to be ready
    sleep 30

    # Run health checks
    local attempts=0
    local max_attempts=$((HEALTH_CHECK_TIMEOUT / 10))

    while [[ $attempts -lt $max_attempts ]]; do
        if kubectl run "health-check-$(date +%s)" \
            --image=curlimages/curl:latest \
            --restart=Never \
            --rm -i \
            --namespace="$NAMESPACE" \
            --timeout=30s \
            -- curl -f "http://$service_name-health:3000/health" &>/dev/null; then
            
            local elapsed=$(($(date +%s) - start_time))
            log_success "Health checks passed in ${elapsed}s"
            
            # Cleanup temporary service
            kubectl delete service "$service_name-health" -n "$NAMESPACE" --ignore-not-found=true
            return 0
        fi

        ((attempts++))
        log_warning "Health check attempt $attempts failed, retrying in 10s..."
        sleep 10
    done

    log_error "Health checks failed after $HEALTH_CHECK_TIMEOUT seconds"
    kubectl delete service "$service_name-health" -n "$NAMESPACE" --ignore-not-found=true
    return 1
}

# Run smoke tests
run_smoke_tests() {
    local new_color="$1"
    local service_name="lanka-api-$new_color-health"

    log_info "Running smoke tests on $new_color deployment"

    # Basic API endpoint checks
    local endpoints=("/health" "/api/version" "/api/status")

    for endpoint in "${endpoints[@]}"; do
        if ! kubectl run "smoke-test-$(date +%s)" \
            --image=curlimages/curl:latest \
            --restart=Never \
            --rm -i \
            --namespace="$NAMESPACE" \
            --timeout=30s \
            -- curl -f "http://$service_name:3000$endpoint" &>/dev/null; then
            
            log_error "Smoke test failed for endpoint: $endpoint"
            return 1
        fi
        log_info "✓ Endpoint $endpoint is healthy"
    done

    log_success "All smoke tests passed"
}

# Switch traffic to new deployment
switch_traffic() {
    local new_color="$1"
    log_info "Switching traffic to $new_color deployment"

    # Update main service selector
    kubectl patch service lanka-api -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"color\":\"$new_color\"}}}"

    # Wait for traffic switch to take effect
    sleep 30

    # Verify traffic is flowing to new deployment
    if kubectl run "traffic-check-$(date +%s)" \
        --image=curlimages/curl:latest \
        --restart=Never \
        --rm -i \
        --namespace="$NAMESPACE" \
        --timeout=30s \
        -- curl -f "http://lanka-api:3000/health" &>/dev/null; then
        
        log_success "Traffic successfully switched to $new_color"
    else
        log_error "Traffic switch verification failed"
        return 1
    fi
}

# Scale down old deployment
scale_down_old_deployment() {
    local old_color="$1"
    local old_deployment="lanka-api-$old_color"

    log_info "Scaling down old deployment: $old_deployment"

    # Scale to 1 replica first (for potential quick rollback)
    kubectl scale deployment "$old_deployment" --replicas=1 -n "$NAMESPACE" 2>/dev/null || true

    # Add annotations for tracking
    kubectl annotate deployment "$old_deployment" \
        deployment.kubernetes.io/scaled-down-at="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        deployment.kubernetes.io/previous-version="$VERSION" \
        -n "$NAMESPACE" 2>/dev/null || true

    log_success "Old deployment scaled down"
}

# Rollback function
rollback() {
    local old_color="$1"
    local new_color="$2"
    local backup_name="$3"

    log_error "Initiating rollback procedure"

    # Switch traffic back to old deployment
    log_info "Switching traffic back to $old_color"
    kubectl scale deployment "lanka-api-$old_color" --replicas=3 -n "$NAMESPACE" || true
    kubectl rollout status "deployment/lanka-api-$old_color" -n "$NAMESPACE" --timeout=300s || true
    kubectl patch service lanka-api -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"color\":\"$old_color\"}}}" || true

    # Scale down failed deployment
    log_info "Scaling down failed deployment: $new_color"
    kubectl scale deployment "lanka-api-$new_color" --replicas=0 -n "$NAMESPACE" || true

    # Restore database if backup was created
    if [[ -n "$backup_name" && "$backup_name" != "" ]]; then
        log_info "Restoring database from backup: $backup_name"
        kubectl create job --from="job/backup-$backup_name" "restore-rollback-$(date +%s)" -n "$NAMESPACE" || true
        kubectl wait --for=condition=complete --timeout=600s "job/restore-rollback-$(date +%s)" -n "$NAMESPACE" || true
    fi

    log_error "Rollback completed. Please investigate the deployment failure."
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files"
    rm -f /tmp/deployment-*.yaml /tmp/health-service-*.yaml
    
    # Remove completed jobs older than 1 hour
    kubectl get jobs -n "$NAMESPACE" -o name | \
        xargs -I {} sh -c 'kubectl get {} -n "$NAMESPACE" -o jsonpath="{.metadata.creationTimestamp}" | \
        xargs -I timestamp sh -c "if [ \$(date -d \"timestamp\" +%s) -lt \$(date -d \"1 hour ago\" +%s) ]; then kubectl delete {} -n \"$NAMESPACE\" --ignore-not-found=true; fi"' 2>/dev/null || true
}

# Main deployment function
main() {
    local current_color new_color backup_name

    log_info "Starting blue-green deployment for Lanka Platform"
    log_info "Namespace: $NAMESPACE, Image: $IMAGE, Version: $VERSION"

    # Validate inputs
    validate_inputs

    # Get deployment colors
    current_color=$(get_current_color)
    new_color=$(get_new_color "$current_color")

    log_info "Current deployment color: $current_color"
    log_info "New deployment color: $new_color"

    # Create backup
    backup_name=$(create_backup)

    # Deploy new version
    if ! apply_migrations; then
        log_error "Database migration failed"
        exit 1
    fi

    if ! deploy_new_version "$new_color"; then
        log_error "Deployment failed"
        [[ "$ROLLBACK_ON_FAILURE" == "true" ]] && rollback "$current_color" "$new_color" "$backup_name"
        exit 1
    fi

    # Run health checks
    if ! run_health_checks "$new_color"; then
        log_error "Health checks failed"
        [[ "$ROLLBACK_ON_FAILURE" == "true" ]] && rollback "$current_color" "$new_color" "$backup_name"
        exit 1
    fi

    # Run smoke tests
    if ! run_smoke_tests "$new_color"; then
        log_error "Smoke tests failed"
        [[ "$ROLLBACK_ON_FAILURE" == "true" ]] && rollback "$current_color" "$new_color" "$backup_name"
        exit 1
    fi

    # Switch traffic
    if ! switch_traffic "$new_color"; then
        log_error "Traffic switch failed"
        [[ "$ROLLBACK_ON_FAILURE" == "true" ]] && rollback "$current_color" "$new_color" "$backup_name"
        exit 1
    fi

    # Scale down old deployment
    scale_down_old_deployment "$current_color"

    # Final verification
    sleep 30
    if kubectl run "final-check-$(date +%s)" \
        --image=curlimages/curl:latest \
        --restart=Never \
        --rm -i \
        --namespace="$NAMESPACE" \
        --timeout=30s \
        -- curl -f "http://lanka-api:3000/health" &>/dev/null; then
        
        log_success "🎉 Blue-green deployment completed successfully!"
        log_success "Version $VERSION is now live on $new_color deployment"
    else
        log_error "Final verification failed"
        [[ "$ROLLBACK_ON_FAILURE" == "true" ]] && rollback "$current_color" "$new_color" "$backup_name"
        exit 1
    fi

    cleanup
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Run main function
main "$@"