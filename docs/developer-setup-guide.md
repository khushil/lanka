# 🚀 LANKA Developer Setup Guide

> **Windows 11 with Docker Desktop and WSL2 Hybrid Development Environment**

This guide is optimized for Windows 11 development workstations using Docker Desktop with WSL2. It provides flexible options for developers who prefer Windows tooling, Linux tooling, or both.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Docker Desktop Setup](#docker-desktop-setup)
4. [Development Environment Options](#development-environment-options)
5. [Project Setup](#project-setup)
6. [Database Services](#database-services)
7. [IDE Configuration](#ide-configuration)
8. [Development Scripts](#development-scripts)
9. [Troubleshooting](#troubleshooting)
10. [Quick Reference](#quick-reference)

---

## Prerequisites

### System Requirements
- **Windows 11** (or Windows 10 version 2004+, Build 19041+)
- **RAM**: 16GB minimum (32GB recommended)
- **Storage**: 50GB free space
- **CPU**: 4+ cores with virtualization enabled in BIOS/UEFI
- **Docker Desktop** for Windows (licensed)

### Verify Virtualization
Open PowerShell as Administrator:
```powershell
# Check virtualization status
Get-ComputerInfo -Property "Hyper-V*"
systeminfo | findstr /C:"Virtualization"
```

---

## Quick Start

### 1-Minute Setup (For experienced developers)
```powershell
# PowerShell (Admin)
# Check if WSL2 is already installed
wsl --list --verbose 2>$null || wsl --install -d Ubuntu-22.04
wsl --set-default-version 2

# Check if Docker Desktop is installed
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Please install Docker Desktop from https://www.docker.com/products/docker-desktop/"
    Write-Host "Then enable WSL2 integration in Docker Desktop settings"
}

# Clone repository (prompts for path)
$projectPath = Read-Host "Enter project path (default: C:\Projects\lanka)"
if ([string]::IsNullOrWhiteSpace($projectPath)) { $projectPath = "C:\Projects\lanka" }

if (!(Test-Path $projectPath)) {
    git clone https://github.com/your-org/lanka.git $projectPath
}
cd $projectPath
docker compose up -d
npm install
npm run dev
```

---

## Docker Desktop Setup

### Step 1: Install Docker Desktop

1. Download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop/)
2. Run installer with default options
3. **Important**: Select "Use WSL 2 instead of Hyper-V"

### Step 2: Configure Docker Desktop

1. Open Docker Desktop Settings
2. **General Tab**:
   - ✅ Use the WSL 2 based engine
   - ✅ Start Docker Desktop when you log in
   
3. **Resources → Advanced**:
   - CPUs: 4 (or half your total)
   - Memory: 8GB
   - Swap: 2GB
   - Disk image size: 64GB

4. **Resources → WSL Integration**:
   - ✅ Enable integration with your default WSL distro
   - ✅ Enable integration with Ubuntu-22.04

5. Apply & Restart

### Step 3: Optimize Docker for Development

Create `%USERPROFILE%\.wslconfig`:
```ini
[wsl2]
memory=8GB
processors=4
localhostForwarding=true
nestedVirtualization=true
swap=4GB

[experimental]
autoMemoryReclaim=gradual
networkingMode=mirrored
dnsTunneling=true
firewall=true
autoProxy=true
```

Restart WSL:
```powershell
wsl --shutdown
```

---

## Development Environment Options

### Option A: Windows Tools with Docker in WSL2 (Recommended)

Perfect for developers who prefer Windows IDEs and tools but want Docker performance.

#### Install Windows Development Tools
```powershell
# Check and install Chocolatey if not present
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Chocolatey package manager..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
} else {
    Write-Host "Chocolatey already installed" -ForegroundColor Green
}

# Function to install if not present
function Install-IfMissing {
    param($command, $package)
    if (!(Get-Command $command -ErrorAction SilentlyContinue)) {
        Write-Host "Installing $package..." -ForegroundColor Yellow
        choco install -y $package
    } else {
        Write-Host "$package already installed" -ForegroundColor Green
    }
}

# Essential Tools
Install-IfMissing "git" "git"
Install-IfMissing "node" "nodejs-lts"
Install-IfMissing "code" "vscode"
Install-IfMissing "wt" "microsoft-windows-terminal"

# Additional tools (check individually)
Install-IfMissing "gh" "gh"
Install-IfMissing "curl" "curl"
Install-IfMissing "wget" "wget"
Install-IfMissing "jq" "jq"
Install-IfMissing "make" "make"

# Optional: Database GUIs (prompt user)
$installGuis = Read-Host "Install database GUI tools? (y/n)"
if ($installGuis -eq 'y') {
    Install-IfMissing "mongosh" "mongodb-compass"
    Install-IfMissing "neo4j" "neo4j-desktop"
}
```

#### Configure Git for Windows
```powershell
# Basic Git configuration for line endings
git config --global core.autocrlf input
git config --global core.eol lf

# Set your identity (required for commits)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# For detailed Git workflow and standards, see docs/developer-workflow-guide.md
```

### Option B: WSL2 Linux Tools

For developers who prefer Linux command-line tools.

#### Setup WSL2 Ubuntu
```bash
# In WSL2 Ubuntu terminal
sudo apt update && sudo apt upgrade -y

# Function to check and install packages
install_if_missing() {
    if ! command -v $1 &> /dev/null; then
        echo "Installing $1..."
        shift
        sudo apt install -y "$@"
    else
        echo "$1 already installed"
    fi
}

# Install development essentials
install_if_missing gcc build-essential
install_if_missing curl curl
install_if_missing wget wget
install_if_missing git git
install_if_missing vim vim
install_if_missing htop htop
install_if_missing netstat net-tools

# Install Node.js via nvm (if not present)
if ! command -v nvm &> /dev/null; then
    echo "Installing nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    source ~/.bashrc
    nvm install --lts
    nvm use --lts
else
    echo "nvm already installed"
fi

# Install global npm packages (check first)
for pkg in yarn pnpm typescript ts-node nodemon; do
    if ! npm list -g $pkg &> /dev/null; then
        echo "Installing $pkg..."
        npm install -g $pkg
    else
        echo "$pkg already installed globally"
    fi
done
```

### Option C: Hybrid Approach (Best of Both)

Use Windows for editing and WSL2 for running commands:

1. Install VS Code in Windows
2. Install "Remote - WSL" extension
3. Open projects from WSL2 in VS Code:
```bash
# In WSL2
cd ~/projects/lanka
code .  # Opens in Windows VS Code with WSL2 integration
```

---

## Project Setup

### Step 1: Clone Repository

#### From Windows (PowerShell):
```powershell
# Get or set project path
$projectPath = if (Test-Path env:LANKA_PROJECT_PATH) {
    $env:LANKA_PROJECT_PATH
} else {
    $input = Read-Host "Enter LANKA project path (or press Enter for default: C:\Projects\lanka)"
    if ([string]::IsNullOrWhiteSpace($input)) { "C:\Projects\lanka" } else { $input }
}

# Save for future use
[System.Environment]::SetEnvironmentVariable("LANKA_PROJECT_PATH", $projectPath, "User")

# Check if already cloned
if (Test-Path "$projectPath\.git") {
    Write-Host "Project already exists at $projectPath" -ForegroundColor Green
    cd $projectPath
    git pull
} else {
    # Create parent directory if needed
    $parentPath = Split-Path $projectPath -Parent
    if (!(Test-Path $parentPath)) {
        New-Item -ItemType Directory -Path $parentPath -Force
    }
    
    # Clone repository
    git clone https://github.com/your-org/lanka.git $projectPath
    cd $projectPath
}
```

#### From WSL2 (Ubuntu):
```bash
# Get or set project path
if [ -z "$LANKA_PROJECT_PATH" ]; then
    read -p "Enter LANKA project path (or press Enter for default: ~/projects/lanka): " project_path
    project_path=${project_path:-~/projects/lanka}
    echo "export LANKA_PROJECT_PATH=$project_path" >> ~/.bashrc
    export LANKA_PROJECT_PATH=$project_path
else
    project_path=$LANKA_PROJECT_PATH
fi

# Check if already cloned
if [ -d "$project_path/.git" ]; then
    echo "Project already exists at $project_path"
    cd "$project_path"
    git pull
else
    # Create parent directory if needed
    mkdir -p "$(dirname "$project_path")"
    
    # Clone repository
    git clone https://github.com/your-org/lanka.git "$project_path"
    cd "$project_path"
fi
```

### Step 2: Install Dependencies

```bash
# From project root (works in both PowerShell and WSL2)
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### Step 3: Environment Configuration

Create `.env` file in project root:
```env
# Database Connections
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=lanka2025

MONGODB_URI=mongodb://admin:lanka2025@localhost:27017/lanka?authSource=admin
REDIS_URL=redis://:lanka2025@localhost:6379

# Application Settings
NODE_ENV=development
PORT=3000
CLIENT_PORT=3001

# API Keys (Development)
JWT_SECRET=your-jwt-secret-here
OPENAI_API_KEY=your-openai-key-here

# GraphQL
GRAPHQL_ENDPOINT=http://localhost:3000/graphql
GRAPHQL_SUBSCRIPTIONS=ws://localhost:3000/graphql
```

---

## Database Services

### Using Docker Compose (Recommended)

All services are configured in `docker-compose.yml`:

```bash
# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Service URLs
- **Neo4j Browser**: http://localhost:7474 (neo4j/lanka2025)
- **MongoDB**: mongodb://localhost:27017
- **Redis**: redis://localhost:6379
- **PostgreSQL**: postgresql://localhost:5432
- **Elasticsearch**: http://localhost:9200

### Individual Service Commands

```bash
# Neo4j
docker run -d --name neo4j \
    -p 7474:7474 -p 7687:7687 \
    -e NEO4J_AUTH=neo4j/lanka2025 \
    neo4j:5-community

# MongoDB
docker run -d --name mongodb \
    -p 27017:27017 \
    -e MONGO_INITDB_ROOT_USERNAME=admin \
    -e MONGO_INITDB_ROOT_PASSWORD=lanka2025 \
    mongo:7

# Redis
docker run -d --name redis \
    -p 6379:6379 \
    redis:7-alpine redis-server --requirepass lanka2025
```

---

## IDE Configuration

### VS Code Setup

#### Essential Extensions
```bash
# Install via command line (works in both PowerShell and WSL2)
code --install-extension ms-vscode-remote.remote-wsl
code --install-extension ms-azuretools.vscode-docker
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension eamodio.gitlens
code --install-extension github.copilot
```

#### VS Code Settings (`.vscode/settings.json`)
```json
{
  "terminal.integrated.defaultProfile.windows": "PowerShell",
  "terminal.integrated.defaultProfile.linux": "bash",
  "files.eol": "\n",
  "files.encoding": "utf8",
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "typescript.updateImportsOnFileMove.enabled": "always",
  "remote.WSL.fileWatcher.polling": true,
  "docker.dockerPath": "docker",
  "docker.dockerComposePath": "docker compose"
}
```

### Windows Terminal Configuration

Add LANKA profile to Windows Terminal (`settings.json`):
```json
{
  "profiles": {
    "list": [
      {
        "name": "LANKA Dev",
        "commandline": "wsl.exe -d Ubuntu-22.04 --cd ~/projects/lanka",
        "icon": "🚀",
        "startingDirectory": "//wsl$/Ubuntu-22.04/home/%USERNAME%/projects/lanka",
        "colorScheme": "One Half Dark"
      },
      {
        "name": "LANKA PowerShell",
        "commandline": "pwsh.exe -NoExit -Command \"cd C:\\Projects\\lanka\"",
        "icon": "🪟",
        "startingDirectory": "C:\\Projects\\lanka"
      }
    ]
  }
}
```

---

## Development Scripts

### PowerShell Helper Functions

Add to your PowerShell profile (`$PROFILE`):
```powershell
# LANKA Development Functions

# Auto-detect project path
function Get-LankaPath {
    if (Test-Path env:LANKA_PROJECT_PATH) {
        return $env:LANKA_PROJECT_PATH
    } elseif (Test-Path "C:\Projects\lanka") {
        return "C:\Projects\lanka"
    } elseif (Test-Path "$PWD\package.json") {
        # Check if current directory is the project
        $pkg = Get-Content "$PWD\package.json" | ConvertFrom-Json
        if ($pkg.name -eq "lanka") {
            return $PWD.Path
        }
    }
    Write-Host "LANKA project not found. Set LANKA_PROJECT_PATH environment variable." -ForegroundColor Red
    return $null
}

function lanka-start {
    $projectPath = Get-LankaPath
    if ($projectPath) {
        cd $projectPath
        docker compose up -d
        Write-Host "✅ LANKA services started!" -ForegroundColor Green
        Write-Host "Backend: http://localhost:3000" -ForegroundColor Yellow
        Write-Host "Frontend: http://localhost:3001" -ForegroundColor Yellow
        Write-Host "Neo4j: http://localhost:7474" -ForegroundColor Yellow
    }
}

function lanka-stop {
    $projectPath = Get-LankaPath
    if ($projectPath) {
        cd $projectPath
        docker compose down
        Write-Host "⏹️ LANKA services stopped" -ForegroundColor Yellow
    }
}

function lanka-logs {
    param([string]$service)
    $projectPath = Get-LankaPath
    if ($projectPath) {
        cd $projectPath
        if ($service) {
            docker compose logs -f $service
        } else {
            docker compose logs -f
        }
    }
}

function lanka-clean {
    docker system prune -af --volumes
    Write-Host "🧹 Docker cleaned" -ForegroundColor Green
}

function lanka-path {
    $projectPath = Get-LankaPath
    if ($projectPath) {
        Write-Host "LANKA project path: $projectPath" -ForegroundColor Cyan
        cd $projectPath
    }
}
```

### Bash/WSL2 Helper Functions

Add to your `.bashrc` or `.zshrc`:
```bash
# LANKA Development Functions

# Auto-detect project path
get_lanka_path() {
    if [ -n "$LANKA_PROJECT_PATH" ]; then
        echo "$LANKA_PROJECT_PATH"
    elif [ -d "$HOME/projects/lanka" ]; then
        echo "$HOME/projects/lanka"
    elif [ -d "$HOME/Projects/lanka" ]; then
        echo "$HOME/Projects/lanka"
    elif [ -f "$PWD/package.json" ]; then
        # Check if current directory is the project
        if grep -q '"name": "lanka"' "$PWD/package.json" 2>/dev/null; then
            echo "$PWD"
        fi
    else
        echo "LANKA project not found. Set LANKA_PROJECT_PATH environment variable." >&2
        return 1
    fi
}

lanka-start() {
    local project_path=$(get_lanka_path)
    if [ $? -eq 0 ]; then
        cd "$project_path" && docker compose up -d && echo "✅ LANKA started!"
    fi
}

lanka-stop() {
    local project_path=$(get_lanka_path)
    if [ $? -eq 0 ]; then
        cd "$project_path" && docker compose down
    fi
}

lanka-logs() {
    local project_path=$(get_lanka_path)
    if [ $? -eq 0 ]; then
        cd "$project_path" && docker compose logs -f "$@"
    fi
}

lanka-clean() {
    docker system prune -af --volumes
}

lanka-test() {
    local project_path=$(get_lanka_path)
    if [ $? -eq 0 ]; then
        cd "$project_path" && npm test
    fi
}

lanka-dev() {
    local project_path=$(get_lanka_path)
    if [ $? -eq 0 ]; then
        cd "$project_path" && npm run dev
    fi
}

lanka-path() {
    local project_path=$(get_lanka_path)
    if [ $? -eq 0 ]; then
        echo "LANKA project path: $project_path"
        cd "$project_path"
    fi
}
```

### NPM Scripts (Available in both environments)
```bash
# Development
npm run dev              # Start development server
npm run build           # Build TypeScript

# Testing
npm test                # Run unit tests
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage
npm run test:integration # Integration tests
npm run test:e2e        # End-to-end tests

# Docker
npm run docker:up       # Start services
npm run docker:down     # Stop services
npm run docker:logs     # View logs

# Code Quality
npm run lint            # ESLint
npm run typecheck       # TypeScript check
```

---

## Troubleshooting

### Common Issues and Solutions

#### Docker Desktop Won't Start
```powershell
# PowerShell (Admin)
# Reset Docker Desktop
Stop-Service com.docker.service
Remove-Item "$env:APPDATA\Docker" -Recurse -Force -ErrorAction SilentlyContinue
Start-Service com.docker.service
```

#### WSL2 High Memory Usage
```powershell
# Restart WSL2
wsl --shutdown
# Adjust memory in .wslconfig (see Docker Setup section)
```

#### Port Already in Use
```powershell
# Windows: Find and kill process
netstat -ano | findstr :3000
Stop-Process -Id <PID> -Force

# WSL2: Find and kill process
sudo lsof -i :3000
sudo kill -9 <PID>
```

#### Permission Issues in WSL2
```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Fix Docker permissions
sudo usermod -aG docker $USER
newgrp docker
```

#### Slow File Access Between Windows and WSL2
- Keep code in WSL2 filesystem (`~/projects/`) for best performance
- Use `/mnt/c/` sparingly for cross-filesystem access
- Consider using VS Code Remote-WSL extension

#### Windows Defender Performance Impact
```powershell
# PowerShell (Admin)
# Add exclusions
Add-MpPreference -ExclusionPath "C:\Projects"
Add-MpPreference -ExclusionPath "\\wsl$"
Add-MpPreference -ExclusionProcess "node.exe"
Add-MpPreference -ExclusionProcess "docker.exe"
```

---

## Quick Reference

### Essential Commands

| Task | PowerShell | WSL2/Bash |
|------|------------|-----------|
| Navigate to project | `cd C:\Projects\lanka` | `cd ~/projects/lanka` |
| Start services | `docker compose up -d` | `docker compose up -d` |
| View logs | `docker compose logs -f` | `docker compose logs -f` |
| Install packages | `npm install` | `npm install` |
| Run development | `npm run dev` | `npm run dev` |
| Run tests | `npm test` | `npm test` |
| Check Docker | `docker ps` | `docker ps` |

### Service URLs
- **Backend API**: http://localhost:3000
- **Frontend**: http://localhost:3001
- **GraphQL Playground**: http://localhost:3000/graphql
- **Neo4j Browser**: http://localhost:7474
- **MongoDB**: mongodb://localhost:27017
- **Redis**: redis://localhost:6379

### File Paths

| Location | Windows Path | WSL2 Path |
|----------|--------------|-----------|
| Project | `C:\Projects\lanka` | `~/projects/lanka` |
| WSL2 files from Windows | `\\wsl$\Ubuntu-22.04\home\<user>\` | N/A |
| Windows files from WSL2 | N/A | `/mnt/c/` |

### Docker Commands Cheatsheet
```bash
# Container Management
docker ps                    # List running containers
docker ps -a                 # List all containers
docker logs <container>      # View logs
docker exec -it <container> bash  # Enter container

# Cleanup
docker system prune -af      # Clean everything
docker volume prune -f       # Clean volumes
docker network prune -f      # Clean networks

# Docker Compose
docker compose up -d         # Start in background
docker compose down          # Stop and remove
docker compose logs -f       # Follow logs
docker compose ps           # List services
docker compose restart      # Restart services
```

---

## Support

- **Project Issues**: https://github.com/your-org/lanka/issues
- **Docker Documentation**: https://docs.docker.com/desktop/windows/
- **WSL2 Documentation**: https://docs.microsoft.com/en-us/windows/wsl/
- **Node.js Documentation**: https://nodejs.org/docs/

---

**Version**: 2.0.0  
**Last Updated**: January 2025  
**Maintained by**: LANKA Development Team