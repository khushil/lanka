#!/bin/bash

# LANKA Integration Test Runner Script
# Comprehensive test execution with setup, cleanup, and reporting

set -e  # Exit on any error

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_REPORTS_DIR="$PROJECT_ROOT/test-reports"
LOG_DIR="$PROJECT_ROOT/logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

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

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
LANKA Integration Test Runner

Usage: $0 [OPTIONS] [TEST_SUITE]

OPTIONS:
    -h, --help              Show this help message
    -v, --verbose          Enable verbose logging
    -c, --coverage         Run with coverage reporting
    -p, --performance      Include performance tests
    -r, --report          Generate comprehensive reports
    -f, --force           Force cleanup of existing test data
    --skip-setup          Skip environment setup
    --skip-cleanup        Skip cleanup after tests
    --parallel            Run test suites in parallel
    --timeout SECONDS     Set test timeout (default: 300)

TEST_SUITES:
    cross-module          Cross-module integration flows
    api                  API integration tests
    database             Database integration tests
    realtime             Real-time integration tests
    performance          Performance integration tests
    error-scenarios      Error scenarios and failure recovery
    all                  Run all integration test suites (default)

Examples:
    $0                           # Run all integration tests
    $0 --coverage api           # Run API tests with coverage
    $0 --performance --report   # Run with performance tests and generate reports
    $0 cross-module database    # Run specific test suites
EOF
}

# Parse command line arguments
VERBOSE=false
COVERAGE=false
INCLUDE_PERFORMANCE=false
GENERATE_REPORT=false
FORCE_CLEANUP=false
SKIP_SETUP=false
SKIP_CLEANUP=false
PARALLEL=false
TIMEOUT=300
TEST_SUITES=()

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -c|--coverage)
            COVERAGE=true
            shift
            ;;
        -p|--performance)
            INCLUDE_PERFORMANCE=true
            shift
            ;;
        -r|--report)
            GENERATE_REPORT=true
            shift
            ;;
        -f|--force)
            FORCE_CLEANUP=true
            shift
            ;;
        --skip-setup)
            SKIP_SETUP=true
            shift
            ;;
        --skip-cleanup)
            SKIP_CLEANUP=true
            shift
            ;;
        --parallel)
            PARALLEL=true
            shift
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        cross-module|api|database|realtime|performance|error-scenarios|all)
            TEST_SUITES+=("$1")
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Default to all tests if none specified
if [[ ${#TEST_SUITES[@]} -eq 0 ]]; then
    TEST_SUITES=("all")
fi

# Setup test environment
setup_environment() {
    log_info "Setting up test environment..."
    
    # Create necessary directories
    mkdir -p "$TEST_REPORTS_DIR"
    mkdir -p "$LOG_DIR"
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Check if required services are available
    log_info "Checking required services..."
    
    # Start Neo4j test container if not running
    if ! docker ps | grep -q neo4j; then
        log_info "Starting Neo4j test container..."
        docker run -d --name neo4j-test \
            -p 7474:7474 -p 7687:7687 \
            -e NEO4J_AUTH=neo4j/testpassword \
            -e NEO4J_ACCEPT_LICENSE_AGREEMENT=yes \
            neo4j:5-enterprise
        
        # Wait for Neo4j to be ready
        log_info "Waiting for Neo4j to be ready..."
        timeout 60s bash -c 'until cypher-shell -u neo4j -p testpassword "RETURN 1" > /dev/null 2>&1; do sleep 2; done'
    fi
    
    # Set environment variables
    export NODE_ENV=test
    export NEO4J_TEST_URI=bolt://localhost:7687
    export NEO4J_TEST_USER=neo4j
    export NEO4J_TEST_PASSWORD=testpassword
    
    log_success "Test environment setup complete"
}

# Initialize test database
init_database() {
    log_info "Initializing test database..."
    
    # Create constraints and indexes
    cypher-shell -u neo4j -p testpassword << 'EOF' || log_warn "Some database initialization commands failed"
CREATE CONSTRAINT requirement_id IF NOT EXISTS FOR (r:Requirement) REQUIRE r.id IS UNIQUE;
CREATE CONSTRAINT architecture_decision_id IF NOT EXISTS FOR (a:ArchitectureDecision) REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT project_id IF NOT EXISTS FOR (p:Project) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT stakeholder_id IF NOT EXISTS FOR (s:Stakeholder) REQUIRE s.id IS UNIQUE;
CREATE INDEX requirement_type_idx IF NOT EXISTS FOR (r:Requirement) ON (r.type);
CREATE INDEX requirement_status_idx IF NOT EXISTS FOR (r:Requirement) ON (r.status);
CREATE INDEX architecture_decision_status_idx IF NOT EXISTS FOR (a:ArchitectureDecision) ON (a.status);
EOF
    
    log_success "Database initialization complete"
}

# Clean test data
cleanup_test_data() {
    if [[ "$SKIP_CLEANUP" == "true" ]]; then
        log_info "Skipping cleanup as requested"
        return
    fi
    
    log_info "Cleaning up test data..."
    
    # Clean Neo4j test data
    cypher-shell -u neo4j -p testpassword << 'EOF' || log_warn "Some cleanup commands failed"
MATCH (n) WHERE n.id STARTS WITH "test-" DETACH DELETE n;
MATCH (n) WHERE n.id STARTS WITH "perf-test-" DETACH DELETE n;
MATCH (n) WHERE n.id STARTS WITH "integration-test-" DETACH DELETE n;
EOF
    
    # Clean up Docker containers if force cleanup
    if [[ "$FORCE_CLEANUP" == "true" ]]; then
        log_info "Force cleanup: removing test containers..."
        docker stop neo4j-test 2>/dev/null || true
        docker rm neo4j-test 2>/dev/null || true
    fi
    
    log_success "Cleanup complete"
}

# Run specific test suite
run_test_suite() {
    local suite=$1
    local log_file="$LOG_DIR/test-$suite-$TIMESTAMP.log"
    
    log_info "Running $suite integration tests..."
    
    # Build test command
    local test_cmd="npm test"
    local test_file=""
    
    case $suite in
        cross-module)
            test_file="tests/integration/cross-module-flows.test.ts"
            ;;
        api)
            test_file="tests/integration/api-integration.test.ts"
            ;;
        database)
            test_file="tests/integration/database-integration.test.ts"
            ;;
        realtime)
            test_file="tests/integration/realtime-integration.test.ts"
            ;;
        performance)
            test_file="tests/integration/performance-integration.test.ts"
            ;;
        error-scenarios)
            test_file="tests/integration/error-scenarios.test.ts"
            ;;
        all)
            test_cmd="npm run test:integration"
            ;;
        *)
            log_error "Unknown test suite: $suite"
            return 1
            ;;
    esac
    
    # Add coverage if requested
    if [[ "$COVERAGE" == "true" ]]; then
        test_cmd="$test_cmd -- --coverage"
    fi
    
    # Add test file if specified
    if [[ -n "$test_file" ]]; then
        test_cmd="$test_cmd $test_file"
    fi
    
    # Add timeout
    test_cmd="$test_cmd --testTimeout=$((TIMEOUT * 1000))"
    
    # Add verbose flag if requested
    if [[ "$VERBOSE" == "true" ]]; then
        test_cmd="$test_cmd --verbose"
    fi
    
    # Run the test
    if eval "$test_cmd" 2>&1 | tee "$log_file"; then
        log_success "$suite tests passed"
        return 0
    else
        log_error "$suite tests failed"
        return 1
    fi
}

# Run performance load tests
run_performance_load_tests() {
    if [[ "$INCLUDE_PERFORMANCE" != "true" ]]; then
        return 0
    fi
    
    log_info "Running performance load tests..."
    
    # Start application in background
    log_info "Starting application for load testing..."
    npm run build
    npm run dev > "$LOG_DIR/app-$TIMESTAMP.log" 2>&1 &
    local app_pid=$!
    
    # Wait for application to be ready
    log_info "Waiting for application to be ready..."
    timeout 60s bash -c 'until curl -f http://localhost:3000/health > /dev/null 2>&1; do sleep 2; done'
    
    if [[ $? -eq 0 ]]; then
        log_success "Application is ready"
        
        # Run Artillery load tests
        local report_file="$TEST_REPORTS_DIR/performance-report-$TIMESTAMP"
        
        if artillery run tests/performance/load-test.yml --output "$report_file.json"; then
            log_success "Load tests completed"
            
            # Generate HTML report
            artillery report "$report_file.json" --output "$report_file.html"
            log_info "Performance report generated: $report_file.html"
        else
            log_error "Load tests failed"
        fi
    else
        log_error "Application failed to start within timeout"
    fi
    
    # Stop application
    kill $app_pid 2>/dev/null || true
    
    log_info "Performance load tests complete"
}

# Generate comprehensive test report
generate_test_report() {
    if [[ "$GENERATE_REPORT" != "true" ]]; then
        return 0
    fi
    
    log_info "Generating comprehensive test report..."
    
    # Run report generation script
    if node -e "
        const { testReporter } = require('./tests/integration/test-reporter.ts');
        testReporter.exportReport('$TEST_REPORTS_DIR');
        console.log('Test reports generated successfully');
    "; then
        log_success "Test reports generated in $TEST_REPORTS_DIR"
    else
        log_warn "Failed to generate some test reports"
    fi
}

# Main execution flow
main() {
    log_info "Starting LANKA Integration Test Suite"
    log_info "Configuration: Coverage=$COVERAGE, Performance=$INCLUDE_PERFORMANCE, Report=$GENERATE_REPORT"
    log_info "Test Suites: ${TEST_SUITES[*]}"
    
    # Setup environment
    if [[ "$SKIP_SETUP" != "true" ]]; then
        setup_environment
        init_database
    fi
    
    # Track test results
    local passed_suites=()
    local failed_suites=()
    
    # Run test suites
    if [[ "$PARALLEL" == "true" && ${#TEST_SUITES[@]} -gt 1 ]]; then
        log_info "Running test suites in parallel..."
        
        local pids=()
        for suite in "${TEST_SUITES[@]}"; do
            if [[ "$suite" != "all" ]]; then
                run_test_suite "$suite" &
                pids+=($!)
            fi
        done
        
        # Wait for all parallel jobs to complete
        for i in "${!pids[@]}"; do
            wait ${pids[$i]}
            if [[ $? -eq 0 ]]; then
                passed_suites+=("${TEST_SUITES[$i]}")
            else
                failed_suites+=("${TEST_SUITES[$i]}")
            fi
        done
    else
        # Run test suites sequentially
        for suite in "${TEST_SUITES[@]}"; do
            if run_test_suite "$suite"; then
                passed_suites+=("$suite")
            else
                failed_suites+=("$suite")
            fi
        done
    fi
    
    # Run performance load tests
    run_performance_load_tests
    
    # Generate reports
    generate_test_report
    
    # Print summary
    echo
    log_info "=== Integration Test Summary ==="
    log_success "Passed test suites: ${passed_suites[*]:-none}"
    if [[ ${#failed_suites[@]} -gt 0 ]]; then
        log_error "Failed test suites: ${failed_suites[*]}"
    fi
    
    # Cleanup
    cleanup_test_data
    
    # Exit with appropriate code
    if [[ ${#failed_suites[@]} -eq 0 ]]; then
        log_success "All integration tests completed successfully!"
        exit 0
    else
        log_error "Some integration tests failed!"
        exit 1
    fi
}

# Trap to ensure cleanup on exit
trap cleanup_test_data EXIT

# Run main function
main "$@"