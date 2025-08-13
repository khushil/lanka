#!/bin/bash
# Check for security vulnerabilities and outdated dependencies

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Checking dependencies..."

# Check for security vulnerabilities
echo -e "\n${YELLOW}Running security audit...${NC}"
if npm audit --audit-level=high > /dev/null 2>&1; then
    echo -e "${GREEN}✓ No high or critical vulnerabilities found${NC}"
else
    echo -e "${RED}✗ Security vulnerabilities detected${NC}"
    echo -e "${YELLOW}  Run 'npm audit' for details${NC}"
    echo -e "${YELLOW}  Run 'npm audit fix' to fix automatically${NC}"
    exit 1
fi

# Check for outdated dependencies (informational only)
echo -e "\n${YELLOW}Checking for outdated packages...${NC}"
OUTDATED=$(npm outdated --json 2>/dev/null || echo "{}")
OUTDATED_COUNT=$(echo "$OUTDATED" | jq 'length')

if [ "$OUTDATED_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}ℹ $OUTDATED_COUNT packages are outdated${NC}"
    echo -e "${YELLOW}  Run 'npm outdated' for details${NC}"
else
    echo -e "${GREEN}✓ All packages are up to date${NC}"
fi

# Check package-lock.json is in sync
if [ -f "package-lock.json" ]; then
    if npm ls > /dev/null 2>&1; then
        echo -e "${GREEN}✓ package-lock.json is in sync${NC}"
    else
        echo -e "${RED}✗ package-lock.json is out of sync${NC}"
        echo -e "${YELLOW}  Run 'npm install' to update${NC}"
        exit 1
    fi
fi

echo -e "\n${GREEN}✓ Dependency check complete${NC}"
exit 0