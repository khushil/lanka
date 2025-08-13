#!/bin/bash
# Check if CHANGELOG.md has been updated in the current branch

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the base branch (usually main or develop)
BASE_BRANCH=${1:-develop}

# Check if CHANGELOG.md exists
if [ ! -f "CHANGELOG.md" ]; then
    echo -e "${YELLOW}Warning: CHANGELOG.md not found${NC}"
    exit 0
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

# Get the current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Skip check for main/develop branches
if [[ "$CURRENT_BRANCH" == "main" ]] || [[ "$CURRENT_BRANCH" == "develop" ]]; then
    echo -e "${GREEN}Skipping CHANGELOG check for $CURRENT_BRANCH branch${NC}"
    exit 0
fi

# Check if CHANGELOG.md has been modified
if git diff "$BASE_BRANCH"...HEAD --name-only | grep -q "^CHANGELOG.md$"; then
    echo -e "${GREEN}✓ CHANGELOG.md has been updated${NC}"
    
    # Check if the update is in the Unreleased section
    if git diff "$BASE_BRANCH"...HEAD -- CHANGELOG.md | grep -q "^\+.*\[Unreleased\]"; then
        echo -e "${GREEN}✓ Changes added to Unreleased section${NC}"
    else
        echo -e "${YELLOW}⚠ Warning: Changes might not be in Unreleased section${NC}"
        echo -e "${YELLOW}  Please ensure your changes are documented under [Unreleased]${NC}"
    fi
else
    echo -e "${RED}✗ CHANGELOG.md has not been updated${NC}"
    echo -e "${RED}  Every PR must update CHANGELOG.md${NC}"
    echo -e "${YELLOW}  Add your changes under the [Unreleased] section${NC}"
    echo ""
    echo "Example entry:"
    echo "  ### Added"
    echo "  - Your new feature description (#PR-number)"
    echo ""
    exit 1
fi

exit 0