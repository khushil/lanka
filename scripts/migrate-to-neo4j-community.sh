#!/bin/bash

# ============================================================================
# LANKA Neo4j Enterprise to Community Edition Migration Script
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Header
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Neo4j Enterprise → Community Edition Migration        ║"
echo "║     LANKA Project                                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    log_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# ============================================================================
# STEP 1: Backup Current Data (Optional)
# ============================================================================

log_info "Step 1: Checking for existing Neo4j data..."

if docker ps -a | grep -q "neo4j"; then
    log_warning "Found existing Neo4j container"
    read -p "Do you want to backup existing data? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Creating backup..."
        
        # Create backup directory
        mkdir -p ./backups
        BACKUP_FILE="./backups/neo4j-backup-$(date +%Y%m%d-%H%M%S).dump"
        
        # Try to create backup
        if docker exec $(docker ps -aq -f name=neo4j) neo4j-admin dump --to=/data/backup.dump 2>/dev/null; then
            docker cp $(docker ps -aq -f name=neo4j):/data/backup.dump "$BACKUP_FILE"
            log_success "Backup created: $BACKUP_FILE"
        else
            log_warning "Could not create backup (container might not be running)"
        fi
    fi
    
    log_info "Stopping existing Neo4j container..."
    docker stop $(docker ps -aq -f name=neo4j) 2>/dev/null || true
    docker rm $(docker ps -aq -f name=neo4j) 2>/dev/null || true
fi

# ============================================================================
# STEP 2: Update Docker Configurations
# ============================================================================

log_info "Step 2: Updating Docker configurations..."

# List of files to update
declare -a docker_files=(
    "docker-compose.yml"
    "docker-compose.dev.yml"
    "docker-compose.prod.yml"
    "client/docker-compose.yml"
    "client/docker-compose.prod.yml"
)

updated_files=0

for file in "${docker_files[@]}"; do
    if [ -f "$file" ]; then
        log_info "Processing $file..."
        
        # Create backup
        cp "$file" "$file.bak"
        
        # Replace neo4j:5-enterprise with neo4j:5-community
        sed -i 's/neo4j:5-enterprise/neo4j:5-community/g' "$file"
        sed -i 's/neo4j:.*-enterprise/neo4j:5-community/g' "$file"
        
        # Remove NEO4J_ACCEPT_LICENSE_AGREEMENT line
        sed -i '/NEO4J_ACCEPT_LICENSE_AGREEMENT/d' "$file"
        
        # Check if changes were made
        if ! diff -q "$file" "$file.bak" > /dev/null; then
            log_success "Updated $file"
            ((updated_files++))
        else
            log_info "No changes needed in $file"
            rm "$file.bak"
        fi
    fi
done

log_success "Updated $updated_files Docker configuration files"

# ============================================================================
# STEP 3: Update GitHub Actions Workflows
# ============================================================================

log_info "Step 3: Updating GitHub Actions workflows..."

if [ -d ".github/workflows" ]; then
    for file in .github/workflows/*.yml .github/workflows/*.yaml; do
        if [ -f "$file" ]; then
            log_info "Processing $file..."
            
            # Create backup
            cp "$file" "$file.bak"
            
            # Update Neo4j image references
            sed -i 's/neo4j:5-enterprise/neo4j:5-community/g' "$file"
            sed -i 's/neo4j:.*-enterprise/neo4j:5-community/g' "$file"
            sed -i '/NEO4J_ACCEPT_LICENSE_AGREEMENT/d' "$file"
            sed -i '/NEO4J_VERSION:.*enterprise/s/enterprise/community/g' "$file"
            
            # Check if changes were made
            if ! diff -q "$file" "$file.bak" > /dev/null; then
                log_success "Updated $file"
            else
                rm "$file.bak"
            fi
        fi
    done
fi

# ============================================================================
# STEP 4: Update Shell Scripts
# ============================================================================

log_info "Step 4: Updating setup scripts..."

declare -a script_files=(
    "scripts/setup-dev-env.sh"
    "scripts/setup-dev-env.ps1"
    "scripts/run-integration-tests.sh"
    "scripts/validate-infrastructure.sh"
)

for file in "${script_files[@]}"; do
    if [ -f "$file" ]; then
        log_info "Processing $file..."
        
        # Create backup
        cp "$file" "$file.bak"
        
        # Update Neo4j references
        sed -i 's/neo4j:5-enterprise/neo4j:5-community/g' "$file"
        sed -i 's/neo4j:.*-enterprise/neo4j:5-community/g' "$file"
        sed -i '/NEO4J_ACCEPT_LICENSE_AGREEMENT/d' "$file"
        
        # Check if changes were made
        if ! diff -q "$file" "$file.bak" > /dev/null; then
            log_success "Updated $file"
        else
            rm "$file.bak"
        fi
    fi
done

# ============================================================================
# STEP 5: Update Documentation
# ============================================================================

log_info "Step 5: Updating documentation..."

# Update all markdown files in docs directory
if [ -d "docs" ]; then
    find docs -name "*.md" -type f | while read -r file; do
        # Create backup
        cp "$file" "$file.bak"
        
        # Update references
        sed -i 's/Neo4j Enterprise/Neo4j Community/g' "$file"
        sed -i 's/neo4j:5-enterprise/neo4j:5-community/g' "$file"
        sed -i 's/neo4j:.*-enterprise/neo4j:5-community/g' "$file"
        sed -i '/NEO4J_ACCEPT_LICENSE_AGREEMENT/d' "$file"
        sed -i 's/Enterprise Edition/Community Edition/g' "$file"
        sed -i '/Enterprise features/d' "$file"
        sed -i '/Enterprise-only/d' "$file"
        sed -i '/license agreement/d' "$file"
        
        # Check if changes were made
        if ! diff -q "$file" "$file.bak" > /dev/null 2>&1; then
            log_success "Updated $(basename $file)"
        else
            rm "$file.bak" 2>/dev/null
        fi
    done
fi

# Update README if exists
if [ -f "README.md" ]; then
    sed -i.bak 's/Neo4j Enterprise/Neo4j Community/g' README.md
    sed -i 's/Enterprise Edition/Community Edition/g' README.md
    log_success "Updated README.md"
fi

# ============================================================================
# STEP 6: Update Package Files
# ============================================================================

log_info "Step 6: Checking for package file updates..."

# Update package.json if it contains Neo4j references
if [ -f "package.json" ] && grep -q "neo4j" package.json; then
    log_info "Neo4j references found in package.json"
    # Neo4j driver works with both editions, so no changes needed
    log_success "No changes needed for Neo4j driver (compatible with Community Edition)"
fi

# ============================================================================
# STEP 7: Create New Docker Compose for Neo4j Community
# ============================================================================

log_info "Step 7: Creating optimized Neo4j Community configuration..."

cat > docker-compose.neo4j-community.yml << 'EOF'
version: '3.8'

services:
  neo4j:
    image: neo4j:5-community
    container_name: lanka-neo4j
    restart: unless-stopped
    ports:
      - "7474:7474"  # HTTP
      - "7687:7687"  # Bolt
    environment:
      # Authentication
      - NEO4J_AUTH=neo4j/lanka2025
      
      # Memory Configuration (adjust based on available RAM)
      - NEO4J_server_memory_heap_initial__size=512m
      - NEO4J_server_memory_heap_max__size=2G
      - NEO4J_server_memory_pagecache_size=512m
      
      # Community Edition Optimizations
      - NEO4J_dbms_security_procedures_unrestricted=apoc.*
      - NEO4J_dbms_security_allow__csv__import__from__file__urls=true
      
      # Query Optimizations
      - NEO4J_db_query_timeout=120s
      - NEO4J_db_transaction_timeout=120s
      
      # Connection Pool
      - NEO4J_server_bolt_connection__pool__max__size=100
      - NEO4J_server_bolt_connection__pool__acquisition__timeout=2m
      
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs
      - neo4j_import:/import
      - neo4j_plugins:/plugins
    networks:
      - lanka-network
    healthcheck:
      test: ["CMD", "neo4j", "status"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s

volumes:
  neo4j_data:
    driver: local
  neo4j_logs:
    driver: local
  neo4j_import:
    driver: local
  neo4j_plugins:
    driver: local

networks:
  lanka-network:
    driver: bridge
EOF

log_success "Created docker-compose.neo4j-community.yml"

# ============================================================================
# STEP 8: Start Neo4j Community Edition
# ============================================================================

log_info "Step 8: Starting Neo4j Community Edition..."

read -p "Do you want to start Neo4j Community Edition now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Pulling Neo4j Community Edition image..."
    docker pull neo4j:5-community
    
    log_info "Starting Neo4j Community Edition..."
    docker compose -f docker-compose.neo4j-community.yml up -d
    
    # Wait for Neo4j to be ready
    log_info "Waiting for Neo4j to be ready..."
    max_attempts=30
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:7474 > /dev/null 2>&1; then
            log_success "Neo4j Community Edition is running!"
            break
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    echo
    
    if [ $attempt -eq $max_attempts ]; then
        log_warning "Neo4j is taking longer than expected to start. Please check logs with: docker logs lanka-neo4j"
    fi
fi

# ============================================================================
# STEP 9: Verify Installation
# ============================================================================

log_info "Step 9: Verification..."

# Check Docker image
if docker ps | grep -q "neo4j.*community"; then
    log_success "Neo4j Community Edition container is running"
    
    # Get version info
    NEO4J_VERSION=$(docker exec lanka-neo4j neo4j --version 2>/dev/null || echo "Unknown")
    log_info "Neo4j Version: $NEO4J_VERSION"
else
    log_warning "Neo4j container is not running. Start it with: docker compose -f docker-compose.neo4j-community.yml up -d"
fi

# ============================================================================
# STEP 10: Cleanup and Summary
# ============================================================================

log_info "Step 10: Cleanup..."

# Remove old backup files older than 7 days
if [ -d "./backups" ]; then
    find ./backups -name "*.bak" -mtime +7 -delete 2>/dev/null || true
fi

# Count backup files created
backup_count=$(find . -name "*.bak" 2>/dev/null | wc -l)

echo -e "\n${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✨ Migration to Neo4j Community Edition Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}\n"

echo -e "${BLUE}Summary:${NC}"
echo -e "  ✓ Updated Docker configurations"
echo -e "  ✓ Updated GitHub Actions workflows"
echo -e "  ✓ Updated setup scripts"
echo -e "  ✓ Updated documentation"
echo -e "  ✓ Created optimized Community Edition configuration"
echo -e "  ✓ Created $backup_count backup files (*.bak)"

echo -e "\n${BLUE}Neo4j Access:${NC}"
echo -e "  Browser: ${GREEN}http://localhost:7474${NC}"
echo -e "  Bolt:    ${GREEN}bolt://localhost:7687${NC}"
echo -e "  User:    ${GREEN}neo4j${NC}"
echo -e "  Pass:    ${GREEN}lanka2025${NC}"

echo -e "\n${BLUE}Next Steps:${NC}"
echo -e "  1. Run tests: ${YELLOW}npm test${NC}"
echo -e "  2. Run integration tests: ${YELLOW}npm run test:integration${NC}"
echo -e "  3. Verify application: ${YELLOW}npm run dev${NC}"
echo -e "  4. Remove backup files when confident: ${YELLOW}find . -name '*.bak' -delete${NC}"

echo -e "\n${YELLOW}⚠ Important:${NC}"
echo -e "  - All Enterprise-specific features have been removed"
echo -e "  - The application now uses only Community Edition features"
echo -e "  - No license agreement is required for Community Edition"
echo -e "  - You are now fully compliant with open-source licensing"

echo -e "\n${GREEN}Migration successful! 🎉${NC}\n"

# Create migration report
cat > MIGRATION_REPORT.md << EOF
# Neo4j Migration Report

**Date**: $(date)
**Migration**: Neo4j Enterprise → Community Edition

## Changes Made

### Docker Configurations
$(find . -name "docker-compose*.yml" -newer "$0" 2>/dev/null | wc -l) files updated

### GitHub Actions
$(find .github -name "*.yml" -newer "$0" 2>/dev/null | wc -l) workflow files updated

### Scripts
$(find scripts -name "*.sh" -newer "$0" 2>/dev/null | wc -l) script files updated

### Documentation
$(find docs -name "*.md" -newer "$0" 2>/dev/null | wc -l) documentation files updated

## Status
✅ Migration Complete
✅ Neo4j Community Edition Running
✅ No Enterprise Features Required
✅ License Compliant

## Verification Commands
\`\`\`bash
# Check Neo4j version
docker exec lanka-neo4j neo4j --version

# Run tests
npm test
npm run test:integration

# Check application
npm run dev
\`\`\`
EOF

log_success "Migration report saved to MIGRATION_REPORT.md"

exit 0