#!/bin/bash

# ============================================================================
# LANKA Development Environment Setup Script
# For WSL2 Ubuntu with Docker Desktop
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Configuration
LANKA_HOME="$HOME/workspace/lanka"
NODE_VERSION="20"
PYTHON_VERSION="3.11"

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

log_step() {
    echo -e "\n${MAGENTA}▶${NC} ${BOLD}$1${NC}"
}

# Header
clear
echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║     LANKA Development Environment Setup                   ║"
echo "║     WSL2 + Docker Desktop Edition                        ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Check if running in WSL2
if ! grep -q Microsoft /proc/version; then
    log_error "This script must be run in WSL2"
    exit 1
fi

# ============================================================================
# STEP 1: System Update and Essential Tools
# ============================================================================

log_step "Step 1: Updating system and installing essential tools"

log_info "Updating package lists..."
sudo apt-get update -qq

log_info "Installing essential packages..."
sudo apt-get install -y -qq \
    build-essential \
    curl \
    wget \
    git \
    vim \
    htop \
    net-tools \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    apt-transport-https \
    unzip \
    jq \
    make \
    gcc \
    g++ \
    python3 \
    python3-pip \
    python3-venv \
    zsh \
    tmux \
    fzf \
    ripgrep \
    fd-find \
    bat \
    exa \
    neovim \
    redis-tools \
    postgresql-client

log_success "Essential tools installed"

# ============================================================================
# STEP 2: Docker Verification
# ============================================================================

log_step "Step 2: Verifying Docker Desktop integration"

if command -v docker &> /dev/null; then
    log_success "Docker is available: $(docker --version)"
    
    # Test Docker
    if docker run --rm hello-world &> /dev/null; then
        log_success "Docker is working correctly"
    else
        log_warning "Docker is installed but not running properly"
        log_info "Please ensure Docker Desktop is running and WSL2 integration is enabled"
    fi
else
    log_error "Docker not found. Please install Docker Desktop and enable WSL2 integration"
    exit 1
fi

if command -v docker-compose &> /dev/null || command -v "docker compose" &> /dev/null; then
    log_success "Docker Compose is available"
else
    log_warning "Docker Compose not found"
fi

# ============================================================================
# STEP 3: Node.js Installation
# ============================================================================

log_step "Step 3: Installing Node.js and npm packages"

# Install nvm if not present
if [ ! -d "$HOME/.nvm" ]; then
    log_info "Installing Node Version Manager (nvm)..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    
    # Load nvm
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
else
    log_info "NVM already installed"
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

# Install Node.js
log_info "Installing Node.js v${NODE_VERSION}..."
nvm install ${NODE_VERSION}
nvm use ${NODE_VERSION}
nvm alias default ${NODE_VERSION}

log_success "Node.js installed: $(node --version)"
log_success "npm installed: $(npm --version)"

# Install global npm packages
log_info "Installing global npm packages..."
npm install -g --silent \
    yarn \
    pnpm \
    typescript \
    ts-node \
    nodemon \
    pm2 \
    npx \
    nx \
    lerna \
    claude-flow@alpha \
    @nestjs/cli \
    create-react-app \
    @angular/cli \
    @vue/cli

log_success "Global npm packages installed"

# ============================================================================
# STEP 4: Python Setup
# ============================================================================

log_step "Step 4: Setting up Python development environment"

log_info "Installing Python development packages..."
pip3 install --user --quiet \
    virtualenv \
    pipenv \
    poetry \
    black \
    flake8 \
    pylint \
    pytest \
    jupyterlab \
    pandas \
    numpy \
    requests

log_success "Python packages installed"

# ============================================================================
# STEP 5: Additional Development Tools
# ============================================================================

log_step "Step 5: Installing additional development tools"

# Install Rust if not present
if ! command -v rustc &> /dev/null; then
    log_info "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
    log_success "Rust installed"
else
    log_info "Rust already installed: $(rustc --version)"
fi

# Install Go if not present
if ! command -v go &> /dev/null; then
    log_info "Installing Go..."
    GO_VERSION="1.21.5"
    wget -q https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz
    sudo rm -rf /usr/local/go
    sudo tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz
    rm go${GO_VERSION}.linux-amd64.tar.gz
    export PATH=$PATH:/usr/local/go/bin
    log_success "Go installed"
else
    log_info "Go already installed: $(go version)"
fi

# ============================================================================
# STEP 6: Git Configuration
# ============================================================================

log_step "Step 6: Configuring Git"

# Check if git config is already set
if [ -z "$(git config --global user.name)" ]; then
    log_warning "Git user name not configured"
    read -p "Enter your Git username: " git_username
    git config --global user.name "$git_username"
fi

if [ -z "$(git config --global user.email)" ]; then
    log_warning "Git email not configured"
    read -p "Enter your Git email: " git_email
    git config --global user.email "$git_email"
fi

# Set git configurations
git config --global core.autocrlf input
git config --global core.eol lf
git config --global init.defaultBranch main
git config --global pull.rebase true
git config --global fetch.prune true

# Git aliases
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'

log_success "Git configured"

# ============================================================================
# STEP 7: Database Services Setup
# ============================================================================

log_step "Step 7: Setting up database services with Docker"

# Create docker network
docker network create lanka-network 2>/dev/null || log_info "Docker network already exists"

# Create data directories
mkdir -p ~/docker-data/{neo4j,mongodb,postgres,redis,elasticsearch}/{data,logs}

# Neo4j
log_info "Starting Neo4j..."
docker run -d \
    --name lanka-neo4j \
    --network lanka-network \
    --restart unless-stopped \
    -p 7474:7474 -p 7687:7687 \
    -v ~/docker-data/neo4j/data:/data \
    -v ~/docker-data/neo4j/logs:/logs \
    --env NEO4J_AUTH=neo4j/lanka2025 \
    --env NEO4J_dbms_memory_heap_max__size=2G \
    neo4j:5-community 2>/dev/null || log_info "Neo4j container already exists"

# MongoDB
log_info "Starting MongoDB..."
docker run -d \
    --name lanka-mongodb \
    --network lanka-network \
    --restart unless-stopped \
    -p 27017:27017 \
    -v ~/docker-data/mongodb/data:/data/db \
    -e MONGO_INITDB_ROOT_USERNAME=admin \
    -e MONGO_INITDB_ROOT_PASSWORD=lanka2025 \
    -e MONGO_INITDB_DATABASE=lanka \
    mongo:7 2>/dev/null || log_info "MongoDB container already exists"

# PostgreSQL
log_info "Starting PostgreSQL..."
docker run -d \
    --name lanka-postgres \
    --network lanka-network \
    --restart unless-stopped \
    -p 5432:5432 \
    -v ~/docker-data/postgres/data:/var/lib/postgresql/data \
    -e POSTGRES_USER=lanka \
    -e POSTGRES_PASSWORD=lanka2025 \
    -e POSTGRES_DB=lanka_db \
    postgres:16-alpine 2>/dev/null || log_info "PostgreSQL container already exists"

# Redis
log_info "Starting Redis..."
docker run -d \
    --name lanka-redis \
    --network lanka-network \
    --restart unless-stopped \
    -p 6379:6379 \
    -v ~/docker-data/redis/data:/data \
    redis:7-alpine \
    redis-server --appendonly yes --requirepass lanka2025 2>/dev/null || log_info "Redis container already exists"

# Elasticsearch
log_info "Starting Elasticsearch..."
docker run -d \
    --name lanka-elasticsearch \
    --network lanka-network \
    --restart unless-stopped \
    -p 9200:9200 -p 9300:9300 \
    -e "discovery.type=single-node" \
    -e "xpack.security.enabled=false" \
    -e "ES_JAVA_OPTS=-Xms512m -Xmx512m" \
    -v ~/docker-data/elasticsearch/data:/usr/share/elasticsearch/data \
    elasticsearch:8.11.3 2>/dev/null || log_info "Elasticsearch container already exists"

log_success "Database services started"

# Wait for services to be ready
log_info "Waiting for services to be ready..."
sleep 10

# ============================================================================
# STEP 8: LANKA Project Setup
# ============================================================================

log_step "Step 8: Setting up LANKA project"

# Create workspace directory
mkdir -p ~/workspace

# Check if LANKA already exists
if [ ! -d "$LANKA_HOME" ]; then
    log_info "LANKA project not found. Would you like to clone it?"
    read -p "Enter the Git repository URL (or press Enter to skip): " repo_url
    
    if [ ! -z "$repo_url" ]; then
        cd ~/workspace
        git clone "$repo_url" lanka
        cd lanka
        
        log_info "Installing LANKA dependencies..."
        npm install
        
        if [ -d "client" ]; then
            cd client
            npm install
            cd ..
        fi
        
        log_success "LANKA project cloned and dependencies installed"
    else
        log_warning "Skipping LANKA project clone"
    fi
else
    log_info "LANKA project already exists at $LANKA_HOME"
    
    cd "$LANKA_HOME"
    log_info "Updating LANKA dependencies..."
    npm install
    
    if [ -d "client" ]; then
        cd client
        npm install
        cd ..
    fi
    
    log_success "LANKA dependencies updated"
fi

# ============================================================================
# STEP 9: Shell Configuration
# ============================================================================

log_step "Step 9: Configuring shell environment"

# Add configurations to .bashrc
cat >> ~/.bashrc << 'EOF'

# LANKA Development Environment
export LANKA_HOME="$HOME/workspace/lanka"
export NODE_OPTIONS="--max-old-space-size=8192"
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Path additions
export PATH=$PATH:/usr/local/go/bin
export PATH=$PATH:$HOME/.cargo/bin
export PATH=$PATH:$HOME/.local/bin

# Aliases
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
alias ..='cd ..'
alias ...='cd ../..'
alias lanka='cd $LANKA_HOME'
alias gs='git status'
alias gp='git pull'
alias dc='docker compose'
alias dps='docker ps'
alias dlog='docker logs -f'

# Functions
lanka-start() {
    cd $LANKA_HOME
    docker compose up -d
    echo "Starting LANKA services..."
}

lanka-stop() {
    cd $LANKA_HOME
    docker compose down
    echo "Stopping LANKA services..."
}

lanka-logs() {
    cd $LANKA_HOME
    docker compose logs -f
}

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
EOF

log_success "Shell environment configured"

# ============================================================================
# STEP 10: VS Code Extensions
# ============================================================================

log_step "Step 10: VS Code configuration"

if command -v code &> /dev/null; then
    log_info "Installing recommended VS Code extensions..."
    
    code --install-extension ms-vscode-remote.remote-wsl
    code --install-extension ms-azuretools.vscode-docker
    code --install-extension ms-vscode.vscode-typescript-next
    code --install-extension dbaeumer.vscode-eslint
    code --install-extension esbenp.prettier-vscode
    code --install-extension eamodio.gitlens
    code --install-extension github.copilot
    
    log_success "VS Code extensions installed"
else
    log_warning "VS Code CLI not found. Please install extensions manually"
fi

# ============================================================================
# STEP 11: Create Helper Scripts
# ============================================================================

log_step "Step 11: Creating helper scripts"

# Create bin directory
mkdir -p ~/bin

# Start script
cat > ~/bin/lanka-start << 'EOF'
#!/bin/bash
echo "🚀 Starting LANKA Development Environment..."
cd ~/workspace/lanka
docker compose up -d
tmux new-session -d -s lanka-backend 'npm run dev'
tmux new-session -d -s lanka-frontend 'cd client && npm run dev'
echo "✅ LANKA is running!"
echo "Backend: http://localhost:3000"
echo "Frontend: http://localhost:3001"
EOF
chmod +x ~/bin/lanka-start

# Stop script
cat > ~/bin/lanka-stop << 'EOF'
#!/bin/bash
echo "🛑 Stopping LANKA Development Environment..."
tmux kill-session -t lanka-backend 2>/dev/null
tmux kill-session -t lanka-frontend 2>/dev/null
cd ~/workspace/lanka
docker compose down
echo "✅ LANKA stopped"
EOF
chmod +x ~/bin/lanka-stop

# Status script
cat > ~/bin/lanka-status << 'EOF'
#!/bin/bash
echo "📊 LANKA Environment Status"
echo "=========================="
echo ""
echo "Docker Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "Tmux Sessions:"
tmux list-sessions 2>/dev/null || echo "No tmux sessions running"
echo ""
echo "Node Processes:"
pm2 list 2>/dev/null || pgrep -f "node" | wc -l | xargs echo "Node processes:"
EOF
chmod +x ~/bin/lanka-status

log_success "Helper scripts created in ~/bin"

# ============================================================================
# STEP 12: Environment File Creation
# ============================================================================

log_step "Step 12: Creating environment configuration"

if [ -d "$LANKA_HOME" ] && [ ! -f "$LANKA_HOME/.env" ]; then
    log_info "Creating .env file..."
    
    cat > "$LANKA_HOME/.env" << 'EOF'
# LANKA Environment Configuration
NODE_ENV=development
PORT=3000
CLIENT_PORT=3001

# Database Connections
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=lanka2025

MONGODB_URI=mongodb://admin:lanka2025@localhost:27017/lanka?authSource=admin
POSTGRES_URI=postgresql://lanka:lanka2025@localhost:5432/lanka_db
REDIS_URL=redis://:lanka2025@localhost:6379
ELASTICSEARCH_NODE=http://localhost:9200

# API Configuration
JWT_SECRET=your-jwt-secret-here-change-in-production
JWT_EXPIRY=7d
REFRESH_TOKEN_EXPIRY=30d

# GraphQL
GRAPHQL_ENDPOINT=http://localhost:3000/graphql
GRAPHQL_SUBSCRIPTIONS=ws://localhost:3000/graphql

# External Services
OPENAI_API_KEY=your-openai-key-here
GITHUB_TOKEN=your-github-token-here

# Feature Flags
ENABLE_TELEMETRY=false
ENABLE_DEBUG=true
ENABLE_SWAGGER=true

# Logging
LOG_LEVEL=debug
LOG_FORMAT=json
EOF
    
    log_success ".env file created"
    log_warning "Please update the .env file with your actual API keys and secrets"
else
    log_info ".env file already exists or LANKA not found"
fi

# ============================================================================
# FINAL SUMMARY
# ============================================================================

echo -e "\n${CYAN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}✨ LANKA Development Environment Setup Complete!${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}\n"

echo -e "${BOLD}Installed Components:${NC}"
echo -e "  ${GREEN}✓${NC} System packages and tools"
echo -e "  ${GREEN}✓${NC} Docker integration verified"
echo -e "  ${GREEN}✓${NC} Node.js $(node --version)"
echo -e "  ${GREEN}✓${NC} npm $(npm --version)"
echo -e "  ${GREEN}✓${NC} Python $(python3 --version)"
echo -e "  ${GREEN}✓${NC} Git configured"
echo -e "  ${GREEN}✓${NC} Database services (Neo4j, MongoDB, PostgreSQL, Redis, Elasticsearch)"

echo -e "\n${BOLD}Services Running:${NC}"
docker ps --format "  {{.Names}}: {{.Status}}"

echo -e "\n${BOLD}Next Steps:${NC}"
echo -e "  1. ${YELLOW}Source your shell:${NC} source ~/.bashrc"
echo -e "  2. ${YELLOW}Verify services:${NC} lanka-status"
echo -e "  3. ${YELLOW}Start LANKA:${NC} lanka-start"
echo -e "  4. ${YELLOW}Open VS Code:${NC} code $LANKA_HOME"

echo -e "\n${BOLD}Quick Commands:${NC}"
echo -e "  ${CYAN}lanka-start${NC}  - Start all LANKA services"
echo -e "  ${CYAN}lanka-stop${NC}   - Stop all LANKA services"
echo -e "  ${CYAN}lanka-status${NC} - Check service status"
echo -e "  ${CYAN}lanka${NC}        - Navigate to LANKA directory"

echo -e "\n${BOLD}Service URLs:${NC}"
echo -e "  Backend:      ${BLUE}http://localhost:3000${NC}"
echo -e "  Frontend:     ${BLUE}http://localhost:3001${NC}"
echo -e "  GraphQL:      ${BLUE}http://localhost:3000/graphql${NC}"
echo -e "  Neo4j:        ${BLUE}http://localhost:7474${NC}"

echo -e "\n${YELLOW}⚠ Remember to:${NC}"
echo -e "  - Update .env file with your API keys"
echo -e "  - Configure VS Code with recommended extensions"
echo -e "  - Set up SSH keys for Git if needed"

echo -e "\n${GREEN}Happy coding! 🚀${NC}\n"

# Offer to source bashrc
read -p "Would you like to reload your shell configuration now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    source ~/.bashrc
    log_success "Shell configuration reloaded"
fi