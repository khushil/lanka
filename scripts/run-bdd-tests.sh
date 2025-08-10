#!/bin/bash

# Development Intelligence BDD Test Runner
# Comprehensive test execution script for LANKA Development Intelligence module

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_DIR="tests"
REPORTS_DIR="$TEST_DIR/reports"
FEATURES_DIR="$TEST_DIR/features"
STEP_DEFINITIONS_DIR="$TEST_DIR/step-definitions"

# Default values
PROFILE="default"
TAGS=""
PARALLEL="2"
VERBOSE=false
CLEANUP=true
GENERATE_REPORT=true

# Help function
show_help() {
    cat << EOF
Development Intelligence BDD Test Runner

Usage: $0 [OPTIONS]

Options:
    -p, --profile PROFILE       Test profile to use (default: default)
                               Available: development, integration, performance, smoke, regression, ci
    
    -t, --tags TAGS            Cucumber tags to filter tests (e.g., "@smoke and not @slow")
    
    -j, --parallel NUM         Number of parallel processes (default: 2)
    
    -f, --feature FEATURE      Run specific feature file (e.g., code-generation-engine)
    
    -v, --verbose              Enable verbose output
    
    --no-cleanup              Skip test cleanup
    
    --no-report               Skip report generation
    
    --setup-only              Only setup test environment, don't run tests
    
    --list-features           List all available feature files
    
    --list-profiles           List all available test profiles
    
    -h, --help                Show this help message

Examples:
    $0                                    # Run all tests with default profile
    $0 -p smoke -j 4                     # Run smoke tests with 4 parallel processes
    $0 -t "@development-intelligence"     # Run tests tagged with development-intelligence
    $0 -f code-generation-engine -v      # Run specific feature with verbose output
    $0 -p ci --no-report                 # Run CI profile without generating reports

EOF
}

# List available features
list_features() {
    echo -e "${BLUE}Available feature files:${NC}"
    if [ -d "$FEATURES_DIR" ]; then
        find "$FEATURES_DIR" -name "*.feature" -exec basename {} .feature \; | sort
    else
        echo "Features directory not found: $FEATURES_DIR"
        exit 1
    fi
}

# List available profiles
list_profiles() {
    echo -e "${BLUE}Available test profiles:${NC}"
    echo "  default      - All tests with default settings"
    echo "  development  - Development Intelligence specific tests"
    echo "  integration  - Cross-module integration tests"
    echo "  performance  - Performance and load tests"
    echo "  smoke        - Quick smoke tests"
    echo "  regression   - Full regression test suite"
    echo "  ci           - Continuous Integration optimized tests"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--profile)
            PROFILE="$2"
            shift 2
            ;;
        -t|--tags)
            TAGS="$2"
            shift 2
            ;;
        -j|--parallel)
            PARALLEL="$2"
            shift 2
            ;;
        -f|--feature)
            FEATURE="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --no-cleanup)
            CLEANUP=false
            shift
            ;;
        --no-report)
            GENERATE_REPORT=false
            shift
            ;;
        --setup-only)
            SETUP_ONLY=true
            shift
            ;;
        --list-features)
            list_features
            exit 0
            ;;
        --list-profiles)
            list_profiles
            exit 0
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Print configuration
print_config() {
    echo -e "${BLUE}BDD Test Configuration:${NC}"
    echo "  Profile: $PROFILE"
    echo "  Tags: ${TAGS:-'(none)'}"
    echo "  Parallel: $PARALLEL"
    echo "  Feature: ${FEATURE:-'(all)'}"
    echo "  Verbose: $VERBOSE"
    echo "  Cleanup: $CLEANUP"
    echo "  Generate Report: $GENERATE_REPORT"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Error: Node.js is not installed${NC}"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}Error: npm is not installed${NC}"
        exit 1
    fi
    
    # Check if required directories exist
    if [ ! -d "$FEATURES_DIR" ]; then
        echo -e "${RED}Error: Features directory not found: $FEATURES_DIR${NC}"
        exit 1
    fi
    
    if [ ! -d "$STEP_DEFINITIONS_DIR" ]; then
        echo -e "${RED}Error: Step definitions directory not found: $STEP_DEFINITIONS_DIR${NC}"
        exit 1
    fi
    
    # Check if Neo4j is running (for integration tests)
    if [ "$PROFILE" = "integration" ] || [ "$PROFILE" = "default" ]; then
        if ! nc -z localhost 7688 2>/dev/null; then
            echo -e "${YELLOW}Warning: Neo4j test database not accessible on localhost:7688${NC}"
            echo "Starting Neo4j test container..."
            docker-compose -f docker-compose.test.yml up -d neo4j-test || true
            sleep 10
        fi
    fi
    
    echo -e "${GREEN}Prerequisites check completed${NC}"
}

# Setup test environment
setup_environment() {
    echo -e "${YELLOW}Setting up test environment...${NC}"
    
    # Create reports directory
    mkdir -p "$REPORTS_DIR"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi
    
    # Set environment variables for testing
    export NODE_ENV=test
    export NEO4J_TEST_URI=${NEO4J_TEST_URI:-"bolt://localhost:7688"}
    export API_BASE_URL=${API_BASE_URL:-"http://localhost:3000"}
    
    echo -e "${GREEN}Test environment setup completed${NC}"
}

# Build Cucumber command
build_cucumber_command() {
    local cmd="npx cucumber-js"
    
    # Add profile
    if [ "$PROFILE" != "default" ]; then
        cmd="$cmd --profile $PROFILE"
    fi
    
    # Add tags
    if [ -n "$TAGS" ]; then
        cmd="$cmd --tags '$TAGS'"
    fi
    
    # Add specific feature
    if [ -n "$FEATURE" ]; then
        cmd="$cmd $FEATURES_DIR/$FEATURE.feature"
    fi
    
    # Add parallel execution
    cmd="$cmd --parallel $PARALLEL"
    
    # Add verbose output
    if [ "$VERBOSE" = true ]; then
        cmd="$cmd --format 'progress-bar' --format 'json:$REPORTS_DIR/detailed-report.json'"
    fi
    
    echo "$cmd"
}

# Run BDD tests
run_tests() {
    echo -e "${YELLOW}Running BDD tests...${NC}"
    
    local start_time=$(date +%s)
    local cmd=$(build_cucumber_command)
    
    echo "Command: $cmd"
    echo ""
    
    # Run the tests
    if eval "$cmd"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo -e "${GREEN}✅ All tests passed! (${duration}s)${NC}"
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo -e "${RED}❌ Some tests failed! (${duration}s)${NC}"
        return 1
    fi
}

# Generate test reports
generate_reports() {
    if [ "$GENERATE_REPORT" = false ]; then
        echo -e "${YELLOW}Skipping report generation${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}Generating test reports...${NC}"
    
    # Check if reports exist
    if [ -f "$REPORTS_DIR/cucumber-report.json" ]; then
        # Generate HTML report from JSON
        npx cucumber-html-reporter \
            --input "$REPORTS_DIR/cucumber-report.json" \
            --output "$REPORTS_DIR/cucumber-report.html" \
            --theme bootstrap \
            --reportSuiteAsScenarios true \
            --launchReport false 2>/dev/null || echo "HTML report generation skipped"
    fi
    
    # Display report locations
    echo -e "${GREEN}Reports generated:${NC}"
    [ -f "$REPORTS_DIR/cucumber-report.html" ] && echo "  HTML: $REPORTS_DIR/cucumber-report.html"
    [ -f "$REPORTS_DIR/cucumber-report.json" ] && echo "  JSON: $REPORTS_DIR/cucumber-report.json"
    [ -f "$REPORTS_DIR/cucumber-junit.xml" ] && echo "  JUnit: $REPORTS_DIR/cucumber-junit.xml"
}

# Cleanup test environment
cleanup_environment() {
    if [ "$CLEANUP" = false ]; then
        echo -e "${YELLOW}Skipping cleanup${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}Cleaning up test environment...${NC}"
    
    # Clean up test database
    if [ "$PROFILE" = "integration" ] || [ "$PROFILE" = "default" ]; then
        echo "Cleaning up test database..."
        # Add cleanup commands here
    fi
    
    # Stop test containers if they were started
    if docker-compose -f docker-compose.test.yml ps -q neo4j-test >/dev/null 2>&1; then
        docker-compose -f docker-compose.test.yml down neo4j-test || true
    fi
    
    echo -e "${GREEN}Cleanup completed${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}🧪 Development Intelligence BDD Test Runner${NC}"
    echo "================================================"
    
    print_config
    
    # Check if setup-only mode
    if [ "$SETUP_ONLY" = true ]; then
        check_prerequisites
        setup_environment
        echo -e "${GREEN}Test environment setup completed. Exiting.${NC}"
        exit 0
    fi
    
    local exit_code=0
    
    # Execute test pipeline
    check_prerequisites
    setup_environment
    
    if ! run_tests; then
        exit_code=1
    fi
    
    generate_reports
    cleanup_environment
    
    # Final status
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}🎉 BDD test execution completed successfully!${NC}"
    else
        echo -e "${RED}💥 BDD test execution completed with failures!${NC}"
    fi
    
    exit $exit_code
}

# Execute main function
main "$@"