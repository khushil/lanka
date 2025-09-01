#!/bin/sh

# Docker Health Check Script for Lanka Platform
# Lightweight health check for container readiness

set -e

# Configuration
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-3000}"
HEALTH_ENDPOINT="${HEALTH_ENDPOINT:-/health}"
TIMEOUT="${TIMEOUT:-10}"

# Health check function
check_health() {
    local url="http://${HOST}:${PORT}${HEALTH_ENDPOINT}"
    
    # Use curl with timeout
    if command -v curl >/dev/null 2>&1; then
        curl -f --max-time "$TIMEOUT" --silent "$url" > /dev/null
        return $?
    fi
    
    # Fallback to wget if curl is not available
    if command -v wget >/dev/null 2>&1; then
        wget -q --timeout="$TIMEOUT" --spider "$url"
        return $?
    fi
    
    # Fallback to nc (netcat) for basic connectivity
    if command -v nc >/dev/null 2>&1; then
        nc -z -w"$TIMEOUT" "$HOST" "$PORT"
        return $?
    fi
    
    # If no tools are available, assume healthy (should not happen in our image)
    echo "Warning: No health check tools available"
    return 0
}

# Run health check
if check_health; then
    echo "Health check passed"
    exit 0
else
    echo "Health check failed"
    exit 1
fi