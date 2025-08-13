#!/bin/bash
# Verify that commits have proper sign-off

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the commit message
if [ -z "$1" ]; then
    # If no argument, check the last commit
    COMMIT_MSG=$(git log -1 --pretty=%B)
else
    # Check the commit message file (used by commit-msg hook)
    COMMIT_MSG=$(cat "$1")
fi

# Check for sign-off
if echo "$COMMIT_MSG" | grep -q "^Signed-off-by: .* <.*@.*>"; then
    echo -e "${GREEN}✓ Commit has valid sign-off${NC}"
else
    echo -e "${RED}✗ Missing or invalid sign-off${NC}"
    echo -e "${RED}  All commits must include a sign-off line${NC}"
    echo ""
    echo "Add sign-off using:"
    echo "  git commit --amend -s"
    echo ""
    echo "Or add manually:"
    echo "  Signed-off-by: Your Name <your.email@example.com>"
    echo ""
    exit 1
fi

# Check commit message format
# Format: type(scope): subject
if echo "$COMMIT_MSG" | head -1 | grep -qE "^(feat|fix|perf|refactor|style|test|docs|build|ci|chore|revert|security)(\([a-z\-]+\))?: .{1,50}$"; then
    echo -e "${GREEN}✓ Commit message follows conventional format${NC}"
else
    echo -e "${RED}✗ Invalid commit message format${NC}"
    echo -e "${RED}  First line must follow: type(scope): subject${NC}"
    echo ""
    echo "Valid types:"
    echo "  feat, fix, perf, refactor, style, test, docs, build, ci, chore, revert, security"
    echo ""
    echo "Valid scopes:"
    echo "  core, api, db, auth, ui, cache, queue, ml, monitoring, deployment"
    echo ""
    echo "Example:"
    echo "  feat(api): add user authentication endpoint"
    echo ""
    exit 1
fi

# Check subject line length
SUBJECT_LINE=$(echo "$COMMIT_MSG" | head -1)
SUBJECT_LENGTH=${#SUBJECT_LINE}

if [ $SUBJECT_LENGTH -gt 72 ]; then
    echo -e "${YELLOW}⚠ Warning: Subject line is $SUBJECT_LENGTH characters (max recommended: 72)${NC}"
fi

# Check for issue references (optional but recommended)
if echo "$COMMIT_MSG" | grep -qE "(Fixes|Closes|Implements|Relates to):? #[0-9]+"; then
    echo -e "${GREEN}✓ Commit references an issue${NC}"
else
    echo -e "${YELLOW}ℹ Consider referencing related issues${NC}"
fi

exit 0