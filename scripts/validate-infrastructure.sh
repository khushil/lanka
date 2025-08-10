#!/bin/bash

# LANKA Infrastructure Validation Script
# This script validates that all critical infrastructure components are properly set up

set -e

echo "🚀 LANKA Infrastructure Validation Starting..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
WARNINGS=0

# Function to print status
print_status() {
    local status=$1
    local message=$2
    case $status in
        "PASS")
            echo -e "${GREEN}✅ PASS${NC}: $message"
            ((CHECKS_PASSED++))
            ;;
        "FAIL")
            echo -e "${RED}❌ FAIL${NC}: $message"
            ((CHECKS_FAILED++))
            ;;
        "WARN")
            echo -e "${YELLOW}⚠️  WARN${NC}: $message"
            ((WARNINGS++))
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  INFO${NC}: $message"
            ;;
    esac
}

# Check Node.js version
echo -e "\n${BLUE}📦 Checking Node.js Environment${NC}"
echo "----------------------------------------"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -ge 18 ]; then
        print_status "PASS" "Node.js version $NODE_VERSION (>= 18.x required)"
    else
        print_status "FAIL" "Node.js version $NODE_VERSION is too old (>= 18.x required)"
    fi
else
    print_status "FAIL" "Node.js is not installed"
fi

# Check NPM
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_status "PASS" "NPM version $NPM_VERSION"
else
    print_status "FAIL" "NPM is not installed"
fi

# Check package.json
echo -e "\n${BLUE}📋 Checking Project Configuration${NC}"
echo "----------------------------------------"
if [ -f "package.json" ]; then
    print_status "PASS" "package.json exists"
    
    # Check required dependencies
    REQUIRED_DEPS=("express" "@apollo/server" "neo4j-driver" "graphql" "typescript")
    for dep in "${REQUIRED_DEPS[@]}"; do
        if grep -q "\"$dep\"" package.json; then
            print_status "PASS" "Dependency '$dep' found in package.json"
        else
            print_status "FAIL" "Required dependency '$dep' missing from package.json"
        fi
    done
else
    print_status "FAIL" "package.json not found"
fi

# Check TypeScript configuration
if [ -f "tsconfig.json" ]; then
    print_status "PASS" "tsconfig.json exists"
    
    # Validate TypeScript config
    if grep -q "\"strict\": true" tsconfig.json; then
        print_status "PASS" "Strict mode enabled in TypeScript"
    else
        print_status "WARN" "TypeScript strict mode not enabled"
    fi
    
    if grep -q "\"experimentalDecorators\": true" tsconfig.json; then
        print_status "PASS" "Experimental decorators enabled"
    else
        print_status "WARN" "Experimental decorators not enabled"
    fi
else
    print_status "FAIL" "tsconfig.json not found"
fi

# Check ESLint configuration
if [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ] || [ -f "eslint.config.js" ]; then
    print_status "PASS" "ESLint configuration found"
else
    print_status "WARN" "ESLint configuration not found"
fi

# Check Prettier configuration
if [ -f ".prettierrc" ] || [ -f ".prettierrc.json" ] || [ -f "prettier.config.js" ]; then
    print_status "PASS" "Prettier configuration found"
else
    print_status "WARN" "Prettier configuration not found"
fi

# Check Jest configuration
if [ -f "jest.config.js" ] || [ -f "jest.config.json" ]; then
    print_status "PASS" "Jest configuration found"
    
    # Check test coverage thresholds
    if grep -q "coverageThreshold" jest.config.js 2>/dev/null; then
        print_status "PASS" "Test coverage thresholds configured"
    else
        print_status "WARN" "Test coverage thresholds not configured"
    fi
else
    print_status "FAIL" "Jest configuration not found"
fi

# Check Docker configuration
echo -e "\n${BLUE}🐳 Checking Docker Configuration${NC}"
echo "----------------------------------------"
if [ -f "docker-compose.yml" ]; then
    print_status "PASS" "docker-compose.yml exists"
    
    # Check for required services
    REQUIRED_SERVICES=("neo4j" "mongodb" "redis")
    for service in "${REQUIRED_SERVICES[@]}"; do
        if grep -q "$service:" docker-compose.yml; then
            print_status "PASS" "Service '$service' found in docker-compose.yml"
        else
            print_status "FAIL" "Required service '$service' missing from docker-compose.yml"
        fi
    done
else
    print_status "FAIL" "docker-compose.yml not found"
fi

if [ -f "Dockerfile" ]; then
    print_status "PASS" "Dockerfile exists"
else
    print_status "WARN" "Dockerfile not found"
fi

if [ -f ".dockerignore" ]; then
    print_status "PASS" ".dockerignore exists"
else
    print_status "WARN" ".dockerignore not found"
fi

# Check environment configuration
echo -e "\n${BLUE}🔧 Checking Environment Configuration${NC}"
echo "----------------------------------------"
if [ -f ".env.example" ]; then
    print_status "PASS" ".env.example exists"
    
    # Check for required environment variables
    REQUIRED_VARS=("NODE_ENV" "PORT" "NEO4J_URI" "MONGODB_URI" "REDIS_URL")
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "$var=" .env.example; then
            print_status "PASS" "Environment variable '$var' documented in .env.example"
        else
            print_status "WARN" "Environment variable '$var' not found in .env.example"
        fi
    done
else
    print_status "FAIL" ".env.example not found"
fi

# Check project structure
echo -e "\n${BLUE}📁 Checking Project Structure${NC}"
echo "----------------------------------------"
REQUIRED_DIRS=("src" "tests" "docs")
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        print_status "PASS" "Directory '$dir' exists"
    else
        print_status "FAIL" "Required directory '$dir' missing"
    fi
done

# Check src structure
if [ -d "src" ]; then
    SRC_DIRS=("modules" "core" "api" "services" "types" "utils")
    for dir in "${SRC_DIRS[@]}"; do
        if [ -d "src/$dir" ]; then
            print_status "PASS" "Source directory 'src/$dir' exists"
        else
            print_status "WARN" "Source directory 'src/$dir' missing"
        fi
    done
fi

# Check modules structure
if [ -d "src/modules" ]; then
    MODULE_DIRS=("requirements" "architecture" "development")
    for module in "${MODULE_DIRS[@]}"; do
        if [ -d "src/modules/$module" ]; then
            print_status "PASS" "Module 'src/modules/$module' exists"
        else
            print_status "WARN" "Module 'src/modules/$module' missing"
        fi
    done
fi

# Check test structure
if [ -d "tests" ]; then
    TEST_DIRS=("unit" "integration" "e2e")
    for dir in "${TEST_DIRS[@]}"; do
        if [ -d "tests/$dir" ]; then
            print_status "PASS" "Test directory 'tests/$dir' exists"
        else
            print_status "WARN" "Test directory 'tests/$dir' missing"
        fi
    done
fi

# Check entry point
if [ -f "src/index.ts" ]; then
    print_status "PASS" "Main entry point 'src/index.ts' exists"
else
    print_status "FAIL" "Main entry point 'src/index.ts' missing"
fi

# Check Git configuration
echo -e "\n${BLUE}🔄 Checking Git Configuration${NC}"
echo "----------------------------------------"
if [ -f ".gitignore" ]; then
    print_status "PASS" ".gitignore exists"
    
    # Check for common ignores
    IGNORE_PATTERNS=("node_modules" "dist" "coverage" ".env")
    for pattern in "${IGNORE_PATTERNS[@]}"; do
        if grep -q "$pattern" .gitignore; then
            print_status "PASS" "Pattern '$pattern' found in .gitignore"
        else
            print_status "WARN" "Pattern '$pattern' not found in .gitignore"
        fi
    done
else
    print_status "FAIL" ".gitignore not found"
fi

# Check if in git repository
if [ -d ".git" ]; then
    print_status "PASS" "Git repository initialized"
else
    print_status "WARN" "Not a git repository"
fi

# Check Claude Flow configuration
echo -e "\n${BLUE}🤖 Checking Claude Flow Configuration${NC}"
echo "----------------------------------------"
if [ -f "CLAUDE.md" ]; then
    print_status "PASS" "Claude configuration file exists"
else
    print_status "WARN" "Claude configuration file not found"
fi

if [ -f "claude-flow.config.json" ]; then
    print_status "PASS" "Claude Flow configuration exists"
else
    print_status "WARN" "Claude Flow configuration not found"
fi

# Summary
echo -e "\n${BLUE}📊 Validation Summary${NC}"
echo "========================================"
echo -e "Checks Passed: ${GREEN}$CHECKS_PASSED${NC}"
echo -e "Checks Failed: ${RED}$CHECKS_FAILED${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"

TOTAL_CHECKS=$((CHECKS_PASSED + CHECKS_FAILED))
if [ $TOTAL_CHECKS -gt 0 ]; then
    SUCCESS_RATE=$((CHECKS_PASSED * 100 / TOTAL_CHECKS))
    echo -e "Success Rate: ${BLUE}$SUCCESS_RATE%${NC}"
fi

echo ""
if [ $CHECKS_FAILED -eq 0 ]; then
    print_status "PASS" "Infrastructure validation completed successfully!"
    echo -e "\n🎉 ${GREEN}LANKA infrastructure is ready for Phase 3: Development Intelligence!${NC}"
    exit 0
else
    print_status "FAIL" "Infrastructure validation failed!"
    echo -e "\n❌ ${RED}Please fix the failed checks before proceeding.${NC}"
    exit 1
fi