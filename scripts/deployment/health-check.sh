#!/bin/bash

# Health Check Script for Lanka Platform
# Comprehensive health and readiness checks for deployed applications

set -euo pipefail

# Configuration
NAMESPACE="${1:-production}"
BASE_URL="${2:-}"
TIMEOUT="${TIMEOUT:-300}"
RETRY_INTERVAL="${RETRY_INTERVAL:-10}"
VERBOSE="${VERBOSE:-false}"

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

log_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${BLUE}[VERBOSE]${NC} $1" >&2
    fi
}

# Determine base URL if not provided
determine_base_url() {
    if [[ -n "$BASE_URL" ]]; then
        echo "$BASE_URL"
        return
    fi
    
    case "$NAMESPACE" in
        "production")
            echo "https://lanka.com"
            ;;
        "staging")
            echo "https://staging.lanka.com"
            ;;
        "development")
            echo "https://dev.lanka.com"
            ;;
        *)
            echo "http://localhost:3000"
            ;;
    esac
}

# Check if running in cluster
is_in_cluster() {
    [[ -f "/var/run/secrets/kubernetes.io/serviceaccount/token" ]]
}

# Make HTTP request with retry
http_request() {
    local url="$1"
    local method="${2:-GET}"
    local expected_status="${3:-200}"
    local max_attempts=$((TIMEOUT / RETRY_INTERVAL))
    local attempts=0
    
    while [[ $attempts -lt $max_attempts ]]; do
        local status_code
        
        if is_in_cluster; then
            # Use kubectl run for in-cluster requests
            if kubectl run "health-check-$(date +%s)" \
                --image=curlimages/curl:latest \
                --restart=Never \
                --rm -i \
                --namespace="$NAMESPACE" \
                --timeout=30s \
                -- curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" 2>/dev/null | grep -q "$expected_status"; then
                return 0
            fi
        else
            # Direct curl for external requests
            status_code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" 2>/dev/null || echo "000")
            if [[ "$status_code" == "$expected_status" ]]; then
                return 0
            fi
        fi
        
        ((attempts++))
        log_verbose "HTTP request attempt $attempts failed for $url (expected: $expected_status)"
        
        if [[ $attempts -lt $max_attempts ]]; then
            sleep "$RETRY_INTERVAL"
        fi
    done
    
    return 1
}

# Get JSON response
get_json_response() {
    local url="$1"
    
    if is_in_cluster; then
        kubectl run "json-check-$(date +%s)" \
            --image=curlimages/curl:latest \
            --restart=Never \
            --rm -i \
            --namespace="$NAMESPACE" \
            --timeout=30s \
            -- curl -s "$url" 2>/dev/null
    else
        curl -s "$url" 2>/dev/null || echo "{}"
    fi
}

# Check basic connectivity
check_connectivity() {
    local base_url="$1"
    
    log_info "Checking basic connectivity to $base_url"
    
    if http_request "$base_url" "GET" "200"; then
        log_success "Basic connectivity check passed"
        return 0
    else
        log_error "Basic connectivity check failed"
        return 1
    fi
}

# Check health endpoint
check_health_endpoint() {
    local base_url="$1"
    local health_url="$base_url/health"
    
    log_info "Checking health endpoint: $health_url"
    
    if http_request "$health_url" "GET" "200"; then
        log_success "Health endpoint check passed"
        
        # Get detailed health information
        local health_response
        health_response=$(get_json_response "$health_url")
        
        if [[ "$VERBOSE" == "true" ]]; then
            echo "Health Response: $health_response" | jq . 2>/dev/null || echo "Health Response: $health_response"
        fi
        
        return 0
    else
        log_error "Health endpoint check failed"
        return 1
    fi
}

# Check readiness endpoint
check_readiness_endpoint() {
    local base_url="$1"
    local ready_url="$base_url/ready"
    
    log_info "Checking readiness endpoint: $ready_url"
    
    if http_request "$ready_url" "GET" "200"; then
        log_success "Readiness endpoint check passed"
        return 0
    else
        log_warning "Readiness endpoint check failed (this may be expected during startup)"
        return 1
    fi
}

# Check API version endpoint
check_api_version() {
    local base_url="$1"
    local version_url="$base_url/api/version"
    
    log_info "Checking API version endpoint: $version_url"
    
    if http_request "$version_url" "GET" "200"; then
        local version_response
        version_response=$(get_json_response "$version_url")
        
        log_success "API version check passed"
        
        if [[ "$VERBOSE" == "true" ]]; then
            echo "Version Response: $version_response" | jq . 2>/dev/null || echo "Version Response: $version_response"
        fi
        
        return 0
    else
        log_error "API version check failed"
        return 1
    fi
}

# Check API status endpoint
check_api_status() {
    local base_url="$1"
    local status_url="$base_url/api/status"
    
    log_info "Checking API status endpoint: $status_url"
    
    if http_request "$status_url" "GET" "200"; then
        local status_response
        status_response=$(get_json_response "$status_url")
        
        log_success "API status check passed"
        
        if [[ "$VERBOSE" == "true" ]]; then
            echo "Status Response: $status_response" | jq . 2>/dev/null || echo "Status Response: $status_response"
        fi
        
        return 0
    else
        log_error "API status check failed"
        return 1
    fi
}

# Check database connectivity
check_database_connectivity() {
    local base_url="$1"
    local db_health_url="$base_url/api/health/database"
    
    log_info "Checking database connectivity"
    
    if http_request "$db_health_url" "GET" "200"; then
        log_success "Database connectivity check passed"
        return 0
    else
        log_error "Database connectivity check failed"
        return 1
    fi
}

# Check Redis connectivity
check_redis_connectivity() {
    local base_url="$1"
    local redis_health_url="$base_url/api/health/redis"
    
    log_info "Checking Redis connectivity"
    
    if http_request "$redis_health_url" "GET" "200"; then
        log_success "Redis connectivity check passed"
        return 0
    else
        log_warning "Redis connectivity check failed (may not be critical)"
        return 1
    fi
}

# Check metrics endpoint
check_metrics_endpoint() {
    local base_url="$1"
    local metrics_url="$base_url/metrics"
    
    log_info "Checking metrics endpoint: $metrics_url"
    
    if http_request "$metrics_url" "GET" "200"; then
        log_success "Metrics endpoint check passed"
        return 0
    else
        log_warning "Metrics endpoint check failed (may be restricted)"
        return 1
    fi
}

# Check Kubernetes deployment status
check_k8s_deployment() {
    if ! command -v kubectl &> /dev/null; then
        log_warning "kubectl not available, skipping Kubernetes checks"
        return 0
    fi
    
    log_info "Checking Kubernetes deployment status"
    
    # Check if deployments exist and are ready
    local deployments
    deployments=$(kubectl get deployments -n "$NAMESPACE" -l app=lanka-api -o name 2>/dev/null || echo "")
    
    if [[ -z "$deployments" ]]; then
        log_warning "No Lanka API deployments found in namespace $NAMESPACE"
        return 1
    fi
    
    local all_ready=true
    
    for deployment in $deployments; do
        local deployment_name
        deployment_name=$(basename "$deployment")
        
        local ready_replicas
        ready_replicas=$(kubectl get deployment "$deployment_name" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        
        local desired_replicas
        desired_replicas=$(kubectl get deployment "$deployment_name" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
        
        if [[ "$ready_replicas" == "$desired_replicas" ]] && [[ "$ready_replicas" -gt 0 ]]; then
            log_success "Deployment $deployment_name: $ready_replicas/$desired_replicas replicas ready"
        else
            log_error "Deployment $deployment_name: $ready_replicas/$desired_replicas replicas ready"
            all_ready=false
        fi
    done
    
    return $([ "$all_ready" = true ] && echo 0 || echo 1)
}

# Check pod status
check_pod_status() {
    if ! command -v kubectl &> /dev/null; then
        log_warning "kubectl not available, skipping pod checks"
        return 0
    fi
    
    log_info "Checking pod status"
    
    local pods
    pods=$(kubectl get pods -n "$NAMESPACE" -l app=lanka-api -o json 2>/dev/null || echo '{"items":[]}')
    
    local pod_count
    pod_count=$(echo "$pods" | jq '.items | length' 2>/dev/null || echo "0")
    
    if [[ "$pod_count" == "0" ]]; then
        log_warning "No Lanka API pods found in namespace $NAMESPACE"
        return 1
    fi
    
    local healthy_pods=0
    
    for i in $(seq 0 $((pod_count - 1))); do
        local pod_name
        pod_name=$(echo "$pods" | jq -r ".items[$i].metadata.name" 2>/dev/null || echo "unknown")
        
        local pod_phase
        pod_phase=$(echo "$pods" | jq -r ".items[$i].status.phase" 2>/dev/null || echo "Unknown")
        
        local ready_condition
        ready_condition=$(echo "$pods" | jq -r ".items[$i].status.conditions[]? | select(.type==\"Ready\") | .status" 2>/dev/null || echo "False")
        
        if [[ "$pod_phase" == "Running" ]] && [[ "$ready_condition" == "True" ]]; then
            log_success "Pod $pod_name: Running and Ready"
            ((healthy_pods++))
        else
            log_error "Pod $pod_name: Phase=$pod_phase, Ready=$ready_condition"
        fi
    done
    
    log_info "Healthy pods: $healthy_pods/$pod_count"
    
    return $([ "$healthy_pods" -gt 0 ] && echo 0 || echo 1)
}

# Check service status
check_service_status() {
    if ! command -v kubectl &> /dev/null; then
        log_warning "kubectl not available, skipping service checks"
        return 0
    fi
    
    log_info "Checking service status"
    
    local service_exists
    service_exists=$(kubectl get service lanka-api -n "$NAMESPACE" -o name 2>/dev/null || echo "")
    
    if [[ -z "$service_exists" ]]; then
        log_error "Lanka API service not found in namespace $NAMESPACE"
        return 1
    fi
    
    local service_type
    service_type=$(kubectl get service lanka-api -n "$NAMESPACE" -o jsonpath='{.spec.type}' 2>/dev/null || echo "Unknown")
    
    local endpoints
    endpoints=$(kubectl get endpoints lanka-api -n "$NAMESPACE" -o jsonpath='{.subsets[*].addresses[*].ip}' 2>/dev/null || echo "")
    
    if [[ -n "$endpoints" ]]; then
        local endpoint_count
        endpoint_count=$(echo "$endpoints" | wc -w)
        log_success "Service lanka-api: Type=$service_type, Endpoints=$endpoint_count"
        return 0
    else
        log_error "Service lanka-api: Type=$service_type, No endpoints available"
        return 1
    fi
}

# Run performance test
check_performance() {
    local base_url="$1"
    
    log_info "Running basic performance check"
    
    local start_time
    start_time=$(date +%s%N)
    
    if http_request "$base_url/health" "GET" "200"; then
        local end_time
        end_time=$(date +%s%N)
        local response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
        
        if [[ $response_time -lt 1000 ]]; then
            log_success "Performance check passed: ${response_time}ms response time"
            return 0
        elif [[ $response_time -lt 5000 ]]; then
            log_warning "Performance check warning: ${response_time}ms response time (acceptable but slow)"
            return 0
        else
            log_error "Performance check failed: ${response_time}ms response time (too slow)"
            return 1
        fi
    else
        log_error "Performance check failed: Health endpoint not responding"
        return 1
    fi
}

# Generate health report
generate_health_report() {
    local base_url="$1"
    local overall_status="$2"
    
    local report_file="health-check-report-$(date +%Y%m%d-%H%M%S).json"
    
    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    cat > "$report_file" << EOF
{
    "timestamp": "$timestamp",
    "namespace": "$NAMESPACE",
    "base_url": "$base_url",
    "overall_status": "$overall_status",
    "checks": {
        "connectivity": $(check_connectivity "$base_url" &>/dev/null && echo "true" || echo "false"),
        "health_endpoint": $(check_health_endpoint "$base_url" &>/dev/null && echo "true" || echo "false"),
        "readiness_endpoint": $(check_readiness_endpoint "$base_url" &>/dev/null && echo "true" || echo "false"),
        "api_version": $(check_api_version "$base_url" &>/dev/null && echo "true" || echo "false"),
        "api_status": $(check_api_status "$base_url" &>/dev/null && echo "true" || echo "false"),
        "database_connectivity": $(check_database_connectivity "$base_url" &>/dev/null && echo "true" || echo "false"),
        "redis_connectivity": $(check_redis_connectivity "$base_url" &>/dev/null && echo "true" || echo "false"),
        "metrics_endpoint": $(check_metrics_endpoint "$base_url" &>/dev/null && echo "true" || echo "false"),
        "kubernetes_deployment": $(check_k8s_deployment &>/dev/null && echo "true" || echo "false"),
        "pod_status": $(check_pod_status &>/dev/null && echo "true" || echo "false"),
        "service_status": $(check_service_status &>/dev/null && echo "true" || echo "false")
    },
    "environment": {
        "timeout": $TIMEOUT,
        "retry_interval": $RETRY_INTERVAL,
        "in_cluster": $(is_in_cluster && echo "true" || echo "false")
    }
}
EOF
    
    log_info "Health report generated: $report_file"
}

# Show usage
show_usage() {
    cat << EOF
Lanka Platform Health Check Script

Usage: $0 [namespace] [base_url]

Arguments:
  namespace   Target namespace (default: production)
  base_url    Base URL to check (auto-detected if not provided)

Environment Variables:
  TIMEOUT         Maximum time to wait for checks in seconds (default: 300)
  RETRY_INTERVAL  Time between retry attempts in seconds (default: 10)
  VERBOSE         Set to 'true' for detailed output (default: false)

Examples:
  # Check production environment
  $0

  # Check staging environment
  $0 staging

  # Check with custom URL
  $0 production https://api.lanka.com

  # Verbose output
  VERBOSE=true $0 staging

  # Quick check with shorter timeout
  TIMEOUT=60 $0 production
EOF
}

# Main health check function
main() {
    local base_url
    base_url=$(determine_base_url)
    
    log_info "🏥 Starting health check for Lanka Platform"
    log_info "Namespace: $NAMESPACE, Base URL: $base_url"
    log_info "Timeout: ${TIMEOUT}s, Retry Interval: ${RETRY_INTERVAL}s"
    
    local failed_checks=0
    local total_checks=0
    
    # Basic connectivity
    ((total_checks++))
    if ! check_connectivity "$base_url"; then
        ((failed_checks++))
    fi
    
    # Health endpoint
    ((total_checks++))
    if ! check_health_endpoint "$base_url"; then
        ((failed_checks++))
    fi
    
    # Readiness endpoint (not critical)
    ((total_checks++))
    check_readiness_endpoint "$base_url" || true
    
    # API endpoints
    ((total_checks++))
    if ! check_api_version "$base_url"; then
        ((failed_checks++))
    fi
    
    ((total_checks++))
    if ! check_api_status "$base_url"; then
        ((failed_checks++))
    fi
    
    # Database connectivity
    ((total_checks++))
    if ! check_database_connectivity "$base_url"; then
        ((failed_checks++))
    fi
    
    # Redis connectivity (not critical)
    ((total_checks++))
    check_redis_connectivity "$base_url" || true
    
    # Metrics endpoint (not critical)
    ((total_checks++))
    check_metrics_endpoint "$base_url" || true
    
    # Kubernetes checks
    ((total_checks++))
    if ! check_k8s_deployment; then
        ((failed_checks++))
    fi
    
    ((total_checks++))
    if ! check_pod_status; then
        ((failed_checks++))
    fi
    
    ((total_checks++))
    if ! check_service_status; then
        ((failed_checks++))
    fi
    
    # Performance check
    ((total_checks++))
    check_performance "$base_url" || true
    
    # Determine overall status
    local overall_status="healthy"
    if [[ $failed_checks -gt 0 ]]; then
        if [[ $failed_checks -gt $((total_checks / 2)) ]]; then
            overall_status="unhealthy"
        else
            overall_status="degraded"
        fi
    fi
    
    # Generate report
    generate_health_report "$base_url" "$overall_status"
    
    # Final status
    log_info "Health check completed: $((total_checks - failed_checks))/$total_checks checks passed"
    
    case "$overall_status" in
        "healthy")
            log_success "🎉 System is healthy!"
            exit 0
            ;;
        "degraded")
            log_warning "⚠️ System is degraded but functional"
            exit 1
            ;;
        "unhealthy")
            log_error "🚨 System is unhealthy!"
            exit 2
            ;;
    esac
}

# Handle help flag
if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    show_usage
    exit 0
fi

# Run main function
main "$@"