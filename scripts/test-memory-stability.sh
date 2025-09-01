#!/bin/bash

# Memory Stability Testing Script
# Runs comprehensive memory leak tests and generates reports

set -e

echo "🔍 Lanka Memory Stability Test Suite"
echo "==================================="

# Configuration
TEST_DURATION=${TEST_DURATION:-300000}  # 5 minutes
TEST_CONCURRENCY=${TEST_CONCURRENCY:-50}
TEST_SUBSCRIPTIONS=${TEST_SUBSCRIPTIONS:-1000}
TEST_QUERIES=${TEST_QUERIES:-5000}
TEST_STREAM_SIZE=${TEST_STREAM_SIZE:-10000}
REPORT_DIR="./memory-test-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create report directory
mkdir -p "$REPORT_DIR"

echo "📋 Test Configuration:"
echo "  Duration: ${TEST_DURATION}ms"
echo "  Concurrency: ${TEST_CONCURRENCY}"
echo "  Subscriptions: ${TEST_SUBSCRIPTIONS}"
echo "  Queries: ${TEST_QUERIES}"
echo "  Stream Size: ${TEST_STREAM_SIZE}"
echo ""

# Function to check if Node.js process is running
check_process() {
    if pgrep -f "node.*src/index.ts" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to get memory usage of the process
get_memory_usage() {
    local pid=$(pgrep -f "node.*src/index.ts" | head -1)
    if [ ! -z "$pid" ]; then
        ps -o pid,ppid,rss,vsz,comm -p $pid | tail -1
    fi
}

# Function to make HTTP requests for monitoring
monitor_memory() {
    local url="http://localhost:4000/api/memory"
    
    echo "📊 Starting memory monitoring..."
    
    for i in {1..60}; do  # Monitor for 5 minutes with 5-second intervals
        if curl -s "${url}/stats" > "${REPORT_DIR}/memory_stats_${TIMESTAMP}_${i}.json" 2>/dev/null; then
            local heap_usage=$(cat "${REPORT_DIR}/memory_stats_${TIMESTAMP}_${i}.json" | grep -o '"percentage":[0-9.]*' | cut -d':' -f2)
            echo "  [$(date '+%H:%M:%S')] Heap usage: ${heap_usage}%"
        else
            echo "  [$(date '+%H:%M:%S')] Failed to get memory stats"
        fi
        sleep 5
    done
}

# Function to run load test
run_load_test() {
    echo "🚀 Starting memory leak load test..."
    
    export TEST_DURATION TEST_CONCURRENCY TEST_SUBSCRIPTIONS TEST_QUERIES TEST_STREAM_SIZE
    
    # Run the load test
    if npm run test:memory-leak 2>&1 | tee "${REPORT_DIR}/load_test_${TIMESTAMP}.log"; then
        echo "✅ Load test completed successfully"
        return 0
    else
        echo "❌ Load test failed"
        return 1
    fi
}

# Function to generate heap snapshot
generate_heap_snapshot() {
    echo "📸 Generating heap snapshot..."
    
    if curl -X POST http://localhost:4000/api/memory/snapshot > "${REPORT_DIR}/heap_snapshot_${TIMESTAMP}.json" 2>/dev/null; then
        echo "✅ Heap snapshot generated"
    else
        echo "❌ Failed to generate heap snapshot"
    fi
}

# Function to force garbage collection
force_gc() {
    echo "🗑️ Forcing garbage collection..."
    
    if curl -X POST http://localhost:4000/api/memory/gc > "${REPORT_DIR}/gc_result_${TIMESTAMP}.json" 2>/dev/null; then
        local freed=$(cat "${REPORT_DIR}/gc_result_${TIMESTAMP}.json" | grep -o '"freedMemory":[0-9]*' | cut -d':' -f2)
        echo "✅ GC completed, freed: ${freed} bytes"
    else
        echo "❌ Failed to force GC"
    fi
}

# Function to get leak detection report
get_leak_detection() {
    echo "🔍 Running leak detection..."
    
    if curl -s http://localhost:4000/api/memory/leak-detection > "${REPORT_DIR}/leak_detection_${TIMESTAMP}.json" 2>/dev/null; then
        local has_leak=$(cat "${REPORT_DIR}/leak_detection_${TIMESTAMP}.json" | grep -o '"hasLeak":[a-z]*' | cut -d':' -f2)
        if [ "$has_leak" = "true" ]; then
            echo "⚠️  Memory leak detected!"
        else
            echo "✅ No memory leaks detected"
        fi
    else
        echo "❌ Failed to get leak detection report"
    fi
}

# Function to generate comprehensive report
generate_report() {
    echo "📝 Generating comprehensive memory report..."
    
    if curl -s http://localhost:4000/api/memory/report > "${REPORT_DIR}/comprehensive_report_${TIMESTAMP}.json" 2>/dev/null; then
        local health_score=$(cat "${REPORT_DIR}/comprehensive_report_${TIMESTAMP}.json" | grep -o '"healthScore":[0-9]*' | cut -d':' -f2)
        local status=$(cat "${REPORT_DIR}/comprehensive_report_${TIMESTAMP}.json" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        echo "✅ Memory health score: ${health_score}/100 (${status})"
    else
        echo "❌ Failed to generate comprehensive report"
    fi
}

# Function to analyze test results
analyze_results() {
    echo ""
    echo "📊 Test Results Analysis"
    echo "======================="
    
    # Count files generated
    local file_count=$(ls -1 "${REPORT_DIR}/"*"${TIMESTAMP}"* 2>/dev/null | wc -l)
    echo "Generated ${file_count} report files in ${REPORT_DIR}/"
    
    # Check for load test success
    if grep -q "success.*true" "${REPORT_DIR}/comprehensive_report_${TIMESTAMP}.json" 2>/dev/null; then
        echo "✅ Memory stability test: PASSED"
        return 0
    else
        echo "❌ Memory stability test: FAILED"
        return 1
    fi
}

# Main execution
main() {
    echo "🏁 Starting memory stability test suite..."
    echo ""
    
    # Pre-test setup
    echo "🔧 Pre-test setup..."
    
    # Check if application is running
    if ! check_process; then
        echo "❌ Application not running. Please start with: npm run dev"
        exit 1
    fi
    
    echo "✅ Application is running"
    
    # Initial memory snapshot
    echo "📸 Taking initial memory snapshot..."
    get_memory_usage > "${REPORT_DIR}/initial_memory_${TIMESTAMP}.txt"
    generate_heap_snapshot
    
    # Run tests in parallel
    echo ""
    echo "🧪 Running parallel tests..."
    
    # Start memory monitoring in background
    monitor_memory &
    MONITOR_PID=$!
    
    # Run load test
    if run_load_test; then
        LOAD_TEST_SUCCESS=true
    else
        LOAD_TEST_SUCCESS=false
    fi
    
    # Stop monitoring
    kill $MONITOR_PID 2>/dev/null || true
    
    # Post-test analysis
    echo ""
    echo "🔬 Post-test analysis..."
    
    # Final memory snapshot
    get_memory_usage > "${REPORT_DIR}/final_memory_${TIMESTAMP}.txt"
    generate_heap_snapshot
    
    # Force GC and measure
    force_gc
    
    # Get leak detection
    get_leak_detection
    
    # Generate comprehensive report
    generate_report
    
    # Analyze results
    if analyze_results && [ "$LOAD_TEST_SUCCESS" = true ]; then
        echo ""
        echo "🎉 All memory stability tests passed!"
        echo "📁 Reports saved in: ${REPORT_DIR}/"
        exit 0
    else
        echo ""
        echo "💥 Memory stability tests failed!"
        echo "📁 Debug reports saved in: ${REPORT_DIR}/"
        exit 1
    fi
}

# Trap cleanup
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    kill $MONITOR_PID 2>/dev/null || true
}

trap cleanup EXIT

# Run main function
main "$@"