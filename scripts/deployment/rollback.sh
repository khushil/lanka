#!/bin/bash

# Rollback Script for Lanka Platform
# Quickly rollback to previous deployment in case of issues

set -euo pipefail

# Configuration
NAMESPACE="${1:-production}"
ROLLBACK_TO="${2:-previous}"
RESTORE_DATABASE="${3:-false}"
DRY_RUN="${DRY_RUN:-false}"

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

log_dry_run() {
    echo -e "${YELLOW}[DRY-RUN]${NC} Would execute: $1" >&2
}

# Execute command with dry-run support
execute_cmd() {
    local cmd="$1"
    if [[ "$DRY_RUN" == "true" ]]; then
        log_dry_run "$cmd"
        return 0
    else
        eval "$cmd"
    fi
}

# Validation
validate_inputs() {
    if ! kubectl get namespace "$NAMESPACE" &>/dev/null; then
        log_error "Namespace '$NAMESPACE' does not exist"
        exit 1
    fi

    log_info "Validated inputs: namespace=$NAMESPACE, rollback_to=$ROLLBACK_TO"
}

# Get current deployment information
get_deployment_info() {
    local current_color
    current_color=$(kubectl get service lanka-api -n "$NAMESPACE" -o jsonpath='{.spec.selector.color}' 2>/dev/null || echo "")
    
    if [[ -z "$current_color" ]]; then
        log_error "Could not determine current deployment color"
        exit 1
    fi

    local rollback_color
    if [[ "$current_color" == "blue" ]]; then
        rollback_color="green"
    else
        rollback_color="blue"
    fi

    echo "$current_color $rollback_color"
}

# Check if rollback target exists
check_rollback_target() {
    local rollback_color="$1"
    local rollback_deployment="lanka-api-$rollback_color"

    if ! kubectl get deployment "$rollback_deployment" -n "$NAMESPACE" &>/dev/null; then
        log_error "Rollback target deployment '$rollback_deployment' does not exist"
        exit 1
    fi

    local replicas
    replicas=$(kubectl get deployment "$rollback_deployment" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
    
    if [[ "$replicas" == "0" ]]; then
        log_warning "Rollback target has 0 replicas, will need to scale up"
    fi

    log_info "Rollback target '$rollback_deployment' exists with $replicas replicas"
}

# Create pre-rollback snapshot
create_snapshot() {
    local snapshot_name="pre-rollback-$(date +%Y%m%d-%H%M%S)"
    
    log_info "Creating pre-rollback snapshot: $snapshot_name"
    
    # Create configuration snapshot
    execute_cmd "kubectl get all -n '$NAMESPACE' -o yaml > '/tmp/snapshot-$snapshot_name.yaml'"
    
    # Create database backup if requested
    if [[ "$RESTORE_DATABASE" == "true" ]]; then
        execute_cmd "kubectl create job --from=cronjob/db-backup 'backup-$snapshot_name' -n '$NAMESPACE'"
        if [[ "$DRY_RUN" != "true" ]]; then
            kubectl wait --for=condition=complete --timeout=600s "job/backup-$snapshot_name" -n "$NAMESPACE"
        fi
    fi
    
    log_success "Snapshot created: $snapshot_name"
    echo "$snapshot_name"
}

# Scale up rollback target
scale_up_rollback_target() {
    local rollback_color="$1"
    local rollback_deployment="lanka-api-$rollback_color"
    
    log_info "Scaling up rollback target: $rollback_deployment"
    
    local current_replicas
    current_replicas=$(kubectl get deployment "$rollback_deployment" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
    
    if [[ "$current_replicas" == "0" ]]; then
        execute_cmd "kubectl scale deployment '$rollback_deployment' --replicas=3 -n '$NAMESPACE'"
        if [[ "$DRY_RUN" != "true" ]]; then
            kubectl rollout status "deployment/$rollback_deployment" -n "$NAMESPACE" --timeout=300s
        fi
    else
        log_info "Rollback target already has $current_replicas replicas"
    fi
}

# Run health checks on rollback target
health_check_rollback_target() {
    local rollback_color="$1"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_dry_run "Health check on lanka-api-$rollback_color"
        return 0
    fi
    
    log_info "Running health checks on rollback target"
    
    # Wait for pods to be ready
    sleep 30
    
    # Create temporary service for health checks
    cat > "/tmp/rollback-health-service.yaml" << EOF
apiVersion: v1
kind: Service
metadata:
  name: lanka-api-$rollback_color-health
  namespace: $NAMESPACE
spec:
  selector:
    app: lanka-api
    color: $rollback_color
  ports:
  - port: 3000
    targetPort: 3000
  type: ClusterIP
EOF

    kubectl apply -f "/tmp/rollback-health-service.yaml"
    
    # Run health check
    local attempts=0
    local max_attempts=30
    
    while [[ $attempts -lt $max_attempts ]]; do
        if kubectl run "rollback-health-check-$(date +%s)" \
            --image=curlimages/curl:latest \
            --restart=Never \
            --rm -i \
            --namespace="$NAMESPACE" \
            --timeout=30s \
            -- curl -f "http://lanka-api-$rollback_color-health:3000/health" &>/dev/null; then
            
            log_success "Health check passed on rollback target"
            kubectl delete service "lanka-api-$rollback_color-health" -n "$NAMESPACE" --ignore-not-found=true
            rm -f "/tmp/rollback-health-service.yaml"
            return 0
        fi

        ((attempts++))
        log_warning "Health check attempt $attempts failed, retrying in 10s..."
        sleep 10
    done

    log_error "Health checks failed on rollback target"
    kubectl delete service "lanka-api-$rollback_color-health" -n "$NAMESPACE" --ignore-not-found=true
    rm -f "/tmp/rollback-health-service.yaml"
    return 1
}

# Switch traffic to rollback target
switch_traffic() {
    local rollback_color="$1"
    
    log_info "Switching traffic to rollback deployment: $rollback_color"
    
    execute_cmd "kubectl patch service lanka-api -n '$NAMESPACE' -p '{\"spec\":{\"selector\":{\"color\":\"$rollback_color\"}}}'"
    
    if [[ "$DRY_RUN" != "true" ]]; then
        # Wait for traffic switch
        sleep 30
        
        # Verify traffic switch
        if kubectl run "traffic-verify-$(date +%s)" \
            --image=curlimages/curl:latest \
            --restart=Never \
            --rm -i \
            --namespace="$NAMESPACE" \
            --timeout=30s \
            -- curl -f "http://lanka-api:3000/health" &>/dev/null; then
            
            log_success "Traffic successfully switched to $rollback_color"
        else
            log_error "Traffic switch verification failed"
            return 1
        fi
    fi
}

# Scale down failed deployment
scale_down_failed_deployment() {
    local failed_color="$1"
    local failed_deployment="lanka-api-$failed_color"
    
    log_info "Scaling down failed deployment: $failed_deployment"
    
    execute_cmd "kubectl scale deployment '$failed_deployment' --replicas=0 -n '$NAMESPACE'"
    
    # Add rollback annotations
    execute_cmd "kubectl annotate deployment '$failed_deployment' \
        deployment.kubernetes.io/rollback-timestamp='$(date -u +%Y-%m-%dT%H:%M:%SZ)' \
        deployment.kubernetes.io/rollback-reason='Emergency rollback' \
        -n '$NAMESPACE'"
}

# Restore database from backup
restore_database() {
    local backup_name="$1"
    
    if [[ "$RESTORE_DATABASE" != "true" ]]; then
        log_info "Database restore not requested, skipping"
        return 0
    fi
    
    if [[ -z "$backup_name" ]]; then
        log_warning "No backup name provided, attempting to use latest backup"
        backup_name=$(kubectl get jobs -n "$NAMESPACE" -l app=backup --sort-by=.metadata.creationTimestamp -o jsonpath='{.items[-1].metadata.name}' | sed 's/backup-//')
    fi
    
    if [[ -z "$backup_name" ]]; then
        log_error "No backup available for database restore"
        return 1
    fi
    
    log_info "Restoring database from backup: $backup_name"
    
    execute_cmd "kubectl create job --from=job/backup-$backup_name restore-rollback-$(date +%s) -n '$NAMESPACE'"
    
    if [[ "$DRY_RUN" != "true" ]]; then
        kubectl wait --for=condition=complete --timeout=600s "job/restore-rollback-$(date +%s)" -n "$NAMESPACE"
    fi
    
    log_success "Database restore completed"
}

# Generate rollback report
generate_report() {
    local current_color="$1"
    local rollback_color="$2"
    local snapshot_name="$3"
    
    local report_file="rollback-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# Rollback Report - Lanka Platform

**Date:** $(date)
**Namespace:** $NAMESPACE
**Rollback From:** $current_color
**Rollback To:** $rollback_color
**Database Restored:** $RESTORE_DATABASE
**Snapshot Created:** $snapshot_name

## Rollback Summary

The system was successfully rolled back from the $current_color deployment to the $rollback_color deployment.

## Actions Taken

1. ✅ Pre-rollback snapshot created
2. ✅ Rollback target scaled up
3. ✅ Health checks passed on rollback target
4. ✅ Traffic switched to rollback deployment
5. ✅ Failed deployment scaled down
6. $(if [[ "$RESTORE_DATABASE" == "true" ]]; then echo "✅ Database restored from backup"; else echo "⏭️ Database restore skipped"; fi)

## Current State

- **Active Deployment:** lanka-api-$rollback_color
- **Traffic Routing:** 100% to $rollback_color
- **Failed Deployment:** lanka-api-$current_color (scaled to 0)
- **Database:** $(if [[ "$RESTORE_DATABASE" == "true" ]]; then echo "Restored from backup"; else echo "No changes made"; fi)

## Next Steps

1. Monitor system stability for the next 30 minutes
2. Investigate the root cause of the deployment failure
3. Plan remediation for the failed deployment
4. Consider scaling down the failed deployment completely after monitoring period
5. Update incident documentation

## Commands Used

\`\`\`bash
# Scale up rollback target
kubectl scale deployment lanka-api-$rollback_color --replicas=3 -n $NAMESPACE

# Switch traffic
kubectl patch service lanka-api -n $NAMESPACE -p '{"spec":{"selector":{"color":"$rollback_color"}}}'

# Scale down failed deployment
kubectl scale deployment lanka-api-$current_color --replicas=0 -n $NAMESPACE
\`\`\`

## Monitoring Commands

\`\`\`bash
# Check deployment status
kubectl get deployments -n $NAMESPACE -l app=lanka-api

# Check pod status
kubectl get pods -n $NAMESPACE -l app=lanka-api

# Check service routing
kubectl get service lanka-api -n $NAMESPACE -o yaml

# Check recent events
kubectl get events -n $NAMESPACE --sort-by=.metadata.creationTimestamp
\`\`\`

EOF

    log_success "Rollback report generated: $report_file"
}

# Send notification
send_notification() {
    local current_color="$1"
    local rollback_color="$2"
    local status="$3"
    
    local webhook_url="${SLACK_WEBHOOK_URL:-}"
    
    if [[ -z "$webhook_url" ]]; then
        log_warning "No Slack webhook URL configured, skipping notification"
        return 0
    fi
    
    local color="danger"
    local emoji="🚨"
    local title="Rollback Initiated"
    
    if [[ "$status" == "success" ]]; then
        color="good"
        emoji="✅"
        title="Rollback Completed Successfully"
    fi
    
    local payload=$(cat << EOF
{
    "text": "$emoji $title",
    "attachments": [{
        "color": "$color",
        "fields": [{
            "title": "Environment",
            "value": "$NAMESPACE",
            "short": true
        }, {
            "title": "From → To",
            "value": "$current_color → $rollback_color",
            "short": true
        }, {
            "title": "Database Restored",
            "value": "$RESTORE_DATABASE",
            "short": true
        }, {
            "title": "Executed By",
            "value": "$(whoami)",
            "short": true
        }, {
            "title": "Timestamp",
            "value": "$(date)",
            "short": false
        }]
    }]
}
EOF
)
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_dry_run "Send notification: $payload"
    else
        curl -X POST -H 'Content-type: application/json' --data "$payload" "$webhook_url" || true
    fi
}

# Main rollback function
main() {
    local current_color rollback_color snapshot_name
    
    log_info "🚨 Starting emergency rollback for Lanka Platform"
    log_info "Namespace: $NAMESPACE, Target: $ROLLBACK_TO, Restore DB: $RESTORE_DATABASE"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY RUN MODE - No actual changes will be made"
    fi
    
    # Validate inputs
    validate_inputs
    
    # Get deployment information
    read -r current_color rollback_color <<< "$(get_deployment_info)"
    log_info "Current deployment: $current_color, Rolling back to: $rollback_color"
    
    # Check rollback target
    check_rollback_target "$rollback_color"
    
    # Send initial notification
    send_notification "$current_color" "$rollback_color" "initiated"
    
    # Create snapshot
    snapshot_name=$(create_snapshot)
    
    # Scale up rollback target
    scale_up_rollback_target "$rollback_color"
    
    # Run health checks
    if ! health_check_rollback_target "$rollback_color"; then
        log_error "Rollback target is not healthy, aborting"
        send_notification "$current_color" "$rollback_color" "failed"
        exit 1
    fi
    
    # Switch traffic
    if ! switch_traffic "$rollback_color"; then
        log_error "Traffic switch failed, aborting"
        send_notification "$current_color" "$rollback_color" "failed"
        exit 1
    fi
    
    # Scale down failed deployment
    scale_down_failed_deployment "$current_color"
    
    # Restore database if requested
    restore_database "$snapshot_name"
    
    # Generate report
    generate_report "$current_color" "$rollback_color" "$snapshot_name"
    
    # Send success notification
    send_notification "$current_color" "$rollback_color" "success"
    
    log_success "🎉 Rollback completed successfully!"
    log_success "System is now running on $rollback_color deployment"
    log_info "Please monitor the system and investigate the original deployment issue"
}

# Show usage
show_usage() {
    cat << EOF
Lanka Platform Rollback Script

Usage: $0 [namespace] [rollback_to] [restore_database]

Arguments:
  namespace         Target namespace (default: production)
  rollback_to       Target to rollback to (default: previous)
  restore_database  Restore database from backup (default: false)

Environment Variables:
  DRY_RUN           Set to 'true' to show what would be done (default: false)
  SLACK_WEBHOOK_URL Slack webhook URL for notifications

Examples:
  # Basic rollback in production
  $0

  # Rollback with database restore
  $0 production previous true

  # Dry run to see what would happen
  DRY_RUN=true $0 staging

  # Rollback in staging environment
  $0 staging previous false
EOF
}

# Handle help flag
if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    show_usage
    exit 0
fi

# Cleanup function
cleanup() {
    rm -f /tmp/rollback-health-service.yaml /tmp/snapshot-*.yaml
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Run main function
main "$@"