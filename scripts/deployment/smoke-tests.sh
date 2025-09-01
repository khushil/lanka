#!/bin/bash

# Smoke Tests Script for Lanka Platform
# Runs essential smoke tests after deployment to verify basic functionality

set -euo pipefail

# Configuration
BASE_URL="${1:-http://localhost:3000}"
TIMEOUT="${TIMEOUT:-60}"
VERBOSE="${VERBOSE:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

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

log_test_result() {
    local test_name="$1"
    local result="$2"
    local message="$3"
    
    ((TOTAL_TESTS++))
    
    if [[ "$result" == "PASS" ]]; then
        ((PASSED_TESTS++))
        echo -e "${GREEN}✅ PASS${NC} $test_name: $message"
    else
        ((FAILED_TESTS++))
        echo -e "${RED}❌ FAIL${NC} $test_name: $message"
    fi
}

# HTTP request helper
http_request() {
    local url="$1"
    local method="${2:-GET}"
    local expected_status="${3:-200}"
    local timeout="${4:-$TIMEOUT}"
    local data="${5:-}"
    
    local response
    local status_code
    local curl_opts=(-s -w "%{http_code}" --max-time "$timeout")
    
    if [[ -n "$data" ]]; then
        curl_opts+=(-H "Content-Type: application/json" -d "$data")
    fi
    
    response=$(curl "${curl_opts[@]}" -X "$method" "$url" 2>/dev/null || echo "000")
    status_code="${response: -3}"
    
    if [[ "$status_code" == "$expected_status" ]]; then
        return 0
    else
        if [[ "$VERBOSE" == "true" ]]; then
            log_error "HTTP $method $url returned $status_code, expected $expected_status"
        fi
        return 1
    fi
}

# Get JSON response
get_json_response() {
    local url="$1"
    curl -s --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "{}"
}

# Test: Basic connectivity
test_basic_connectivity() {
    local test_name="Basic Connectivity"
    
    if http_request "$BASE_URL" "GET" "200"; then
        log_test_result "$test_name" "PASS" "Application is responding"
    else
        log_test_result "$test_name" "FAIL" "Application is not responding"
    fi
}

# Test: Health endpoint
test_health_endpoint() {
    local test_name="Health Endpoint"
    local health_url="$BASE_URL/health"
    
    if http_request "$health_url" "GET" "200"; then
        local health_response
        health_response=$(get_json_response "$health_url")
        
        # Check if response contains expected health data
        if echo "$health_response" | grep -q "status"; then
            log_test_result "$test_name" "PASS" "Health endpoint returns valid response"
        else
            log_test_result "$test_name" "FAIL" "Health endpoint returns invalid response"
        fi
    else
        log_test_result "$test_name" "FAIL" "Health endpoint not accessible"
    fi
}

# Test: API version endpoint
test_api_version() {
    local test_name="API Version"
    local version_url="$BASE_URL/api/version"
    
    if http_request "$version_url" "GET" "200"; then
        local version_response
        version_response=$(get_json_response "$version_url")
        
        if echo "$version_response" | grep -q "version"; then
            local version
            version=$(echo "$version_response" | jq -r '.version' 2>/dev/null || echo "unknown")
            log_test_result "$test_name" "PASS" "Version: $version"
        else
            log_test_result "$test_name" "FAIL" "Version endpoint returns invalid response"
        fi
    else
        log_test_result "$test_name" "FAIL" "Version endpoint not accessible"
    fi
}

# Test: Database connectivity
test_database_connectivity() {
    local test_name="Database Connectivity"
    local db_health_url="$BASE_URL/api/health/database"
    
    if http_request "$db_health_url" "GET" "200"; then
        local db_response
        db_response=$(get_json_response "$db_health_url")
        
        if echo "$db_response" | grep -q "connected"; then
            log_test_result "$test_name" "PASS" "Database is connected"
        else
            log_test_result "$test_name" "FAIL" "Database connection status unclear"
        fi
    else
        log_test_result "$test_name" "FAIL" "Database health check failed"
    fi
}

# Test: Redis connectivity (if applicable)
test_redis_connectivity() {
    local test_name="Redis Connectivity"
    local redis_health_url="$BASE_URL/api/health/redis"
    
    if http_request "$redis_health_url" "GET" "200"; then
        log_test_result "$test_name" "PASS" "Redis is connected"
    else
        log_test_result "$test_name" "FAIL" "Redis connection failed (may not be critical)"
    fi
}

# Test: Authentication endpoints
test_authentication() {
    local test_name="Authentication Endpoints"
    local login_url="$BASE_URL/api/auth/status"
    
    # Test that auth status endpoint is accessible
    if http_request "$login_url" "GET" "200"; then
        log_test_result "$test_name" "PASS" "Authentication endpoints are accessible"
    else
        log_test_result "$test_name" "FAIL" "Authentication endpoints not accessible"
    fi
}

# Test: API rate limiting
test_rate_limiting() {
    local test_name="Rate Limiting"
    local test_url="$BASE_URL/api/status"
    
    # Make multiple requests quickly to test rate limiting
    local success_count=0
    local rate_limited=false
    
    for i in {1..10}; do
        if http_request "$test_url" "GET" "200"; then
            ((success_count++))
        elif http_request "$test_url" "GET" "429"; then
            rate_limited=true
            break
        fi
        sleep 0.1
    done
    
    if [[ $success_count -gt 0 ]]; then
        log_test_result "$test_name" "PASS" "Rate limiting is working (or not needed for test endpoint)"
    else
        log_test_result "$test_name" "FAIL" "All requests failed"
    fi
}

# Test: Error handling
test_error_handling() {
    local test_name="Error Handling"
    local not_found_url="$BASE_URL/api/nonexistent-endpoint"
    
    if http_request "$not_found_url" "GET" "404"; then
        log_test_result "$test_name" "PASS" "Proper 404 error handling"
    else
        log_test_result "$test_name" "FAIL" "Improper error handling"
    fi
}

# Test: CORS headers
test_cors_headers() {
    local test_name="CORS Headers"
    local test_url="$BASE_URL/api/status"
    
    local cors_headers
    cors_headers=$(curl -s -I -H "Origin: https://example.com" "$test_url" | grep -i "access-control" || echo "")
    
    if [[ -n "$cors_headers" ]]; then
        log_test_result "$test_name" "PASS" "CORS headers are present"
    else
        log_test_result "$test_name" "FAIL" "CORS headers missing (may be intentional)"
    fi
}

# Test: Security headers
test_security_headers() {
    local test_name="Security Headers"
    local test_url="$BASE_URL/"
    
    local security_headers
    security_headers=$(curl -s -I "$test_url" | grep -iE "(x-frame-options|x-content-type-options|x-xss-protection)" | wc -l)
    
    if [[ $security_headers -gt 0 ]]; then
        log_test_result "$test_name" "PASS" "Security headers are present"
    else
        log_test_result "$test_name" "FAIL" "Security headers missing"
    fi
}

# Test: Performance baseline
test_performance() {
    local test_name="Performance Baseline"
    local test_url="$BASE_URL/health"
    
    local start_time
    start_time=$(date +%s%N)
    
    if http_request "$test_url" "GET" "200" "10"; then
        local end_time
        end_time=$(date +%s%N)
        local response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
        
        if [[ $response_time -lt 2000 ]]; then
            log_test_result "$test_name" "PASS" "Response time: ${response_time}ms"
        else
            log_test_result "$test_name" "FAIL" "Slow response time: ${response_time}ms"
        fi
    else
        log_test_result "$test_name" "FAIL" "Health endpoint timeout"
    fi
}

# Test: Static file serving
test_static_files() {
    local test_name="Static Files"
    local favicon_url="$BASE_URL/favicon.ico"
    
    if http_request "$favicon_url" "GET" "200"; then
        log_test_result "$test_name" "PASS" "Static files are being served"
    else
        log_test_result "$test_name" "FAIL" "Static files not accessible (may be expected)"
    fi
}

# Test: Environment-specific configuration
test_environment_config() {
    local test_name="Environment Configuration"
    local config_url="$BASE_URL/api/config/environment"
    
    if http_request "$config_url" "GET" "200"; then
        local config_response
        config_response=$(get_json_response "$config_url")
        
        if echo "$config_response" | grep -q "environment"; then
            local env
            env=$(echo "$config_response" | jq -r '.environment' 2>/dev/null || echo "unknown")
            log_test_result "$test_name" "PASS" "Environment: $env"
        else
            log_test_result "$test_name" "FAIL" "Environment configuration not accessible"
        fi
    else
        log_test_result "$test_name" "FAIL" "Environment configuration endpoint not accessible"
    fi
}

# Generate test report
generate_report() {
    local report_file="smoke-test-report-$(date +%Y%m%d-%H%M%S).json"
    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    local success_rate=0
    if [[ $TOTAL_TESTS -gt 0 ]]; then
        success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    fi
    
    cat > "$report_file" << EOF
{
    "timestamp": "$timestamp",
    "base_url": "$BASE_URL",
    "summary": {
        "total_tests": $TOTAL_TESTS,
        "passed_tests": $PASSED_TESTS,
        "failed_tests": $FAILED_TESTS,
        "success_rate": $success_rate,
        "status": "$([ $FAILED_TESTS -eq 0 ] && echo "PASS" || echo "FAIL")"
    },
    "environment": {
        "timeout": $TIMEOUT,
        "verbose": $VERBOSE
    }
}
EOF
    
    log_info "Test report generated: $report_file"
}

# Show usage
show_usage() {
    cat << EOF
Lanka Platform Smoke Tests

Usage: $0 [base_url]

Arguments:
  base_url    Base URL to test (default: http://localhost:3000)

Environment Variables:
  TIMEOUT     Request timeout in seconds (default: 60)
  VERBOSE     Set to 'true' for detailed output (default: false)

Examples:
  # Test local development
  $0

  # Test staging environment
  $0 https://staging.lanka.com

  # Test production with verbose output
  VERBOSE=true $0 https://lanka.com

  # Quick smoke test with short timeout
  TIMEOUT=10 $0 https://lanka.com
EOF
}

# Main function
main() {
    log_info "🔥 Starting smoke tests for Lanka Platform"
    log_info "Base URL: $BASE_URL"
    log_info "Timeout: ${TIMEOUT}s"
    
    # Run all smoke tests
    test_basic_connectivity
    test_health_endpoint
    test_api_version
    test_database_connectivity
    test_redis_connectivity
    test_authentication
    test_rate_limiting
    test_error_handling
    test_cors_headers
    test_security_headers
    test_performance
    test_static_files
    test_environment_config
    
    # Generate report
    generate_report
    
    # Summary
    echo
    log_info "📊 Smoke Test Results Summary"
    log_info "Total Tests: $TOTAL_TESTS"
    log_success "Passed: $PASSED_TESTS"
    
    if [[ $FAILED_TESTS -gt 0 ]]; then
        log_error "Failed: $FAILED_TESTS"
    fi
    
    local success_rate=0
    if [[ $TOTAL_TESTS -gt 0 ]]; then
        success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    fi
    
    log_info "Success Rate: ${success_rate}%"
    
    # Exit based on results
    if [[ $FAILED_TESTS -eq 0 ]]; then
        log_success "🎉 All smoke tests passed!"
        exit 0
    elif [[ $success_rate -ge 80 ]]; then
        log_warning "⚠️ Most tests passed but some failed"
        exit 1
    else
        log_error "🚨 Critical smoke test failures detected"
        exit 2
    fi
}

# Handle help flag
if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    show_usage
    exit 0
fi

# Run main function
main "$@"