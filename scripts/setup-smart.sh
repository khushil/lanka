#!/bin/bash
# LANKA Smart Setup Script for Linux/WSL2
# Detects existing installations and prompts for paths

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    LANKA Smart Setup                         ║${NC}"
echo -e "${CYAN}║         Intelligent Development Environment Setup            ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get tool version
get_version() {
    local cmd=$1
    local flag=${2:---version}
    if command_exists "$cmd"; then
        $cmd $flag 2>&1 | head -n1 || echo "Unknown"
    else
        echo "Not installed"
    fi
}

# Function to detect OS
detect_os() {
    if [[ -f /proc/version ]] && grep -qi microsoft /proc/version; then
        echo "wsl2"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    else
        echo "unknown"
    fi
}

OS_TYPE=$(detect_os)

echo -e "\n${GREEN}📊 System Check${NC}"
echo -e "═══════════════════════════════════════"
echo -e "✓ Operating System: $OS_TYPE"
echo -e "✓ Shell: $SHELL"
echo -e "✓ User: $USER"

# Check Docker
echo -e "\n${GREEN}🐳 Docker Status${NC}"
echo -e "═══════════════════════════════════════"

if command_exists docker; then
    docker_version=$(get_version docker -v)
    echo -e "${GREEN}✓ Docker: $docker_version${NC}"
    
    # Check if Docker is running
    if docker ps >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Docker is running${NC}"
    else
        echo -e "${YELLOW}⚠ Docker is installed but not running${NC}"
        if [[ "$OS_TYPE" == "wsl2" ]]; then
            echo -e "${YELLOW}  Please start Docker Desktop in Windows${NC}"
        else
            echo -e "${YELLOW}  Please start Docker service: sudo systemctl start docker${NC}"
        fi
    fi
else
    echo -e "${RED}✗ Docker not installed${NC}"
    if [[ "$OS_TYPE" == "wsl2" ]]; then
        echo -e "${YELLOW}  Install Docker Desktop in Windows and enable WSL2 integration${NC}"
    else
        read -p "Install Docker? (y/n): " install_docker
        if [[ "$install_docker" == "y" ]]; then
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo usermod -aG docker $USER
            echo -e "${GREEN}✓ Docker installed. Please log out and back in.${NC}"
        fi
    fi
fi

# Check development tools
echo -e "\n${GREEN}🛠️ Development Tools${NC}"
echo -e "═══════════════════════════════════════"

# Check Git
if command_exists git; then
    git_version=$(get_version git)
    echo -e "${GREEN}✓ Git: $git_version${NC}"
else
    echo -e "${RED}✗ Git not installed${NC}"
    read -p "Install Git? (y/n): " install_git
    if [[ "$install_git" == "y" ]]; then
        sudo apt update && sudo apt install -y git
    fi
fi

# Check Node.js
if command_exists node; then
    node_version=$(get_version node)
    echo -e "${GREEN}✓ Node.js: $node_version${NC}"
    npm_version=$(get_version npm)
    echo -e "${GREEN}✓ npm: $npm_version${NC}"
else
    echo -e "${YELLOW}✗ Node.js not installed${NC}"
    read -p "Install Node.js via nvm? (y/n): " install_node
    if [[ "$install_node" == "y" ]]; then
        # Install nvm
        if ! command_exists nvm; then
            curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
            export NVM_DIR="$HOME/.nvm"
            [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        fi
        nvm install --lts
        nvm use --lts
        nvm alias default node
        echo -e "${GREEN}✓ Node.js installed${NC}"
    fi
fi

# Check other tools
tools=("curl" "wget" "make" "jq")
missing_tools=()

for tool in "${tools[@]}"; do
    if command_exists $tool; then
        echo -e "${GREEN}✓ $tool: installed${NC}"
    else
        echo -e "${YELLOW}✗ $tool: not installed${NC}"
        missing_tools+=($tool)
    fi
done

if [ ${#missing_tools[@]} -gt 0 ]; then
    read -p "Install missing tools (${missing_tools[*]})? (y/n): " install_tools
    if [[ "$install_tools" == "y" ]]; then
        sudo apt update
        sudo apt install -y "${missing_tools[@]}"
        echo -e "${GREEN}✓ Tools installed${NC}"
    fi
fi

# Project setup
echo -e "\n${GREEN}📁 Project Setup${NC}"
echo -e "═══════════════════════════════════════"

# Try to find existing project
project_path=""
if [ -n "$LANKA_PROJECT_PATH" ] && [ -d "$LANKA_PROJECT_PATH" ]; then
    echo -e "${GREEN}✓ Found project at: $LANKA_PROJECT_PATH (from environment)${NC}"
    project_path="$LANKA_PROJECT_PATH"
elif [ -d "$HOME/projects/lanka" ]; then
    echo -e "${GREEN}✓ Found project at: $HOME/projects/lanka${NC}"
    project_path="$HOME/projects/lanka"
elif [ -d "$HOME/Projects/lanka" ]; then
    echo -e "${GREEN}✓ Found project at: $HOME/Projects/lanka${NC}"
    project_path="$HOME/Projects/lanka"
elif [ -f "$PWD/package.json" ] && grep -q '"name": "lanka"' "$PWD/package.json" 2>/dev/null; then
    echo -e "${GREEN}✓ Found project in current directory${NC}"
    project_path="$PWD"
else
    echo -e "${YELLOW}Project not found.${NC}"
    read -p "Enter project path (or press Enter for $HOME/projects/lanka): " custom_path
    project_path=${custom_path:-$HOME/projects/lanka}
    
    if [ ! -d "$project_path" ]; then
        read -p "Clone LANKA repository to $project_path? (y/n): " clone_repo
        if [[ "$clone_repo" == "y" ]]; then
            read -p "Enter repository URL (or press Enter for default): " repo_url
            repo_url=${repo_url:-https://github.com/your-org/lanka.git}
            
            mkdir -p "$(dirname "$project_path")"
            git clone "$repo_url" "$project_path"
            echo -e "${GREEN}✓ Repository cloned${NC}"
        fi
    fi
fi

# Save project path
if [ -n "$project_path" ] && [ -d "$project_path" ]; then
    echo "export LANKA_PROJECT_PATH=\"$project_path\"" >> ~/.bashrc
    export LANKA_PROJECT_PATH="$project_path"
    echo -e "${GREEN}✓ Project path saved to environment${NC}"
    
    # Install dependencies
    cd "$project_path"
    if [ -f "package.json" ]; then
        read -p "Install npm dependencies? (y/n): " install_deps
        if [[ "$install_deps" == "y" ]]; then
            echo "Installing dependencies..."
            npm install
            
            if [ -f "client/package.json" ]; then
                cd client
                npm install
                cd ..
            fi
            echo -e "${GREEN}✓ Dependencies installed${NC}"
        fi
    fi
    
    # Setup environment file
    if [ ! -f ".env" ] && [ -f ".env.example" ]; then
        echo "Creating .env file from template..."
        cp .env.example .env
        echo -e "${GREEN}✓ .env file created (please configure)${NC}"
    fi
fi

# Setup shell functions
echo -e "\n${GREEN}⚙️ Shell Configuration${NC}"
echo -e "═══════════════════════════════════════"

shell_rc="$HOME/.bashrc"
if [[ "$SHELL" == *"zsh"* ]]; then
    shell_rc="$HOME/.zshrc"
fi

if grep -q "LANKA Development Functions" "$shell_rc" 2>/dev/null; then
    echo -e "${GREEN}✓ LANKA functions already in $shell_rc${NC}"
else
    read -p "Add LANKA helper functions to $shell_rc? (y/n): " add_functions
    if [[ "$add_functions" == "y" ]]; then
        cat >> "$shell_rc" << 'EOF'

# LANKA Development Functions
export LANKA_PROJECT_PATH="PROJECT_PATH_PLACEHOLDER"

lanka-start() {
    if [ -d "$LANKA_PROJECT_PATH" ]; then
        cd "$LANKA_PROJECT_PATH" && docker compose up -d && echo "✅ LANKA started!"
    else
        echo "LANKA project not found at $LANKA_PROJECT_PATH"
    fi
}

lanka-stop() {
    if [ -d "$LANKA_PROJECT_PATH" ]; then
        cd "$LANKA_PROJECT_PATH" && docker compose down
    fi
}

lanka-logs() {
    if [ -d "$LANKA_PROJECT_PATH" ]; then
        cd "$LANKA_PROJECT_PATH" && docker compose logs -f "$@"
    fi
}

lanka-path() {
    echo "LANKA path: $LANKA_PROJECT_PATH"
    cd "$LANKA_PROJECT_PATH"
}

lanka-test() {
    if [ -d "$LANKA_PROJECT_PATH" ]; then
        cd "$LANKA_PROJECT_PATH" && npm test
    fi
}

lanka-dev() {
    if [ -d "$LANKA_PROJECT_PATH" ]; then
        cd "$LANKA_PROJECT_PATH" && npm run dev
    fi
}
EOF
        # Replace placeholder with actual path
        sed -i "s|PROJECT_PATH_PLACEHOLDER|$project_path|g" "$shell_rc"
        echo -e "${GREEN}✓ Helper functions added to $shell_rc${NC}"
        echo -e "${YELLOW}  Run: source $shell_rc${NC}"
    fi
fi

# Summary
echo -e "\n═══════════════════════════════════════"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "═══════════════════════════════════════"

echo -e "\n${CYAN}📌 Next Steps:${NC}"
echo -e "  1. Configure .env file with your settings"
echo -e "  2. Ensure Docker is running"
echo -e "  3. Run: docker compose up -d"
echo -e "  4. Run: npm run dev"

echo -e "\n${CYAN}🚀 Quick Commands:${NC}"
echo -e "  lanka-start  - Start all services"
echo -e "  lanka-stop   - Stop all services"
echo -e "  lanka-logs   - View service logs"
echo -e "  lanka-path   - Go to project directory"
echo -e "  lanka-test   - Run tests"
echo -e "  lanka-dev    - Start development server"

echo -e "\n${YELLOW}📍 Project Location: $project_path${NC}"
echo ""