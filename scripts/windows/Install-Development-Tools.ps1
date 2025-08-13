#Requires -RunAsAdministrator
# ============================================================================
# LANKA Development Tools Installation Script for Windows
# ============================================================================

param(
    [switch]$Core,
    [switch]$Extended,
    [switch]$All
)

# Set default if no params
if (!$Core -and !$Extended -and !$All) {
    $All = $true
}

# Colors for output
function Write-Success {
    param([string]$Message)
    Write-Host "✓ " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ " -ForegroundColor Blue -NoNewline
    Write-Host $Message
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

# Header
Clear-Host
Write-Host @"
╔════════════════════════════════════════════════════════════╗
║     LANKA Development Tools Installation                  ║
║     Windows Native Development Environment               ║
╚════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

Write-Host ""

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "This script must be run as Administrator"
    Write-Host "Please right-click and select 'Run as Administrator'"
    exit 1
}

# Check if Chocolatey is installed
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Info "Installing Chocolatey package manager..."
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    Write-Success "Chocolatey installed"
} else {
    Write-Info "Chocolatey already installed"
}

# Refresh environment
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Core tools installation
if ($Core -or $All) {
    Write-Host "`n▶ Installing Core Development Tools" -ForegroundColor Magenta
    
    $coreTools = @(
        @{name="git"; description="Git version control"},
        @{name="nodejs-lts"; description="Node.js LTS"},
        @{name="python3"; description="Python 3"},
        @{name="vscode"; description="Visual Studio Code"},
        @{name="microsoft-windows-terminal"; description="Windows Terminal"},
        @{name="powershell-core"; description="PowerShell Core"},
        @{name="docker-desktop"; description="Docker Desktop"}
    )
    
    foreach ($tool in $coreTools) {
        Write-Info "Installing $($tool.description)..."
        choco install $tool.name -y --no-progress | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "$($tool.description) installed"
        } else {
            Write-Warning "$($tool.description) may already be installed"
        }
    }
}

# Extended tools installation
if ($Extended -or $All) {
    Write-Host "`n▶ Installing Extended Development Tools" -ForegroundColor Magenta
    
    $extendedTools = @(
        @{name="golang"; description="Go programming language"},
        @{name="make"; description="GNU Make"},
        @{name="gh"; description="GitHub CLI"},
        @{name="curl"; description="cURL"},
        @{name="wget"; description="wget"},
        @{name="jq"; description="JSON processor"},
        @{name="postman"; description="Postman API client"},
        @{name="insomnia-rest-api-client"; description="Insomnia REST client"},
        @{name="mongodb-compass"; description="MongoDB Compass"},
        @{name="redis-desktop-manager"; description="Redis Desktop Manager"},
        @{name="neo4j-desktop"; description="Neo4j Desktop"}
    )
    
    foreach ($tool in $extendedTools) {
        Write-Info "Installing $($tool.description)..."
        choco install $tool.name -y --no-progress | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "$($tool.description) installed"
        } else {
            Write-Warning "$($tool.description) may already be installed"
        }
    }
}

# Configure NPM
Write-Host "`n▶ Configuring NPM" -ForegroundColor Magenta
npm config set prefix "$env:APPDATA\npm"
npm config set cache "$env:APPDATA\npm-cache"
Write-Success "NPM configured"

# Install global NPM packages
Write-Host "`n▶ Installing Global NPM Packages" -ForegroundColor Magenta
$npmPackages = @(
    "typescript",
    "ts-node",
    "nodemon",
    "pm2",
    "eslint",
    "prettier"
)

foreach ($package in $npmPackages) {
    Write-Info "Installing $package..."
    npm install -g $package --silent
    Write-Success "$package installed"
}

# VS Code Extensions
Write-Host "`n▶ Installing VS Code Extensions" -ForegroundColor Magenta
if (Get-Command code -ErrorAction SilentlyContinue) {
    $extensions = @(
        "ms-vscode-remote.remote-wsl",
        "ms-azuretools.vscode-docker",
        "ms-vscode.vscode-typescript-next",
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "eamodio.gitlens",
        "github.copilot",
        "github.copilot-chat",
        "ms-vscode.powershell",
        "graphql.vscode-graphql",
        "redhat.vscode-yaml"
    )
    
    foreach ($ext in $extensions) {
        Write-Info "Installing $ext..."
        code --install-extension $ext --force 2>$null
    }
    Write-Success "VS Code extensions installed"
} else {
    Write-Warning "VS Code not found, skipping extensions"
}

# Windows Defender Exclusions
Write-Host "`n▶ Optimizing Windows Defender" -ForegroundColor Magenta
try {
    Add-MpPreference -ExclusionPath "C:\Projects" -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionProcess "node.exe" -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionProcess "docker.exe" -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionProcess "code.exe" -ErrorAction SilentlyContinue
    Write-Success "Windows Defender exclusions added"
} catch {
    Write-Warning "Could not add Windows Defender exclusions"
}

# Enable Windows Features
Write-Host "`n▶ Checking Windows Features" -ForegroundColor Magenta
$features = @(
    @{name="Microsoft-Windows-Subsystem-Linux"; description="WSL"},
    @{name="VirtualMachinePlatform"; description="Virtual Machine Platform"},
    @{name="Microsoft-Hyper-V"; description="Hyper-V"}
)

$needsRestart = $false
foreach ($feature in $features) {
    $state = Get-WindowsOptionalFeature -Online -FeatureName $feature.name
    if ($state.State -eq "Disabled") {
        Write-Info "Enabling $($feature.description)..."
        Enable-WindowsOptionalFeature -Online -FeatureName $feature.name -All -NoRestart | Out-Null
        Write-Success "$($feature.description) enabled"
        $needsRestart = $true
    } else {
        Write-Info "$($feature.description) already enabled"
    }
}

# Create project structure
Write-Host "`n▶ Creating Project Structure" -ForegroundColor Magenta
$dirs = @(
    "C:\Projects",
    "C:\Projects\lanka",
    "$env:USERPROFILE\Documents\LANKA",
    "$env:USERPROFILE\Documents\LANKA\scripts"
)

foreach ($dir in $dirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Success "Created $dir"
    } else {
        Write-Info "$dir already exists"
    }
}

# Summary
Write-Host "`n" -NoNewline
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✨ Installation Complete!" -ForegroundColor Green -BackgroundColor DarkGreen
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "  1. Clone the LANKA repository to C:\Projects\lanka"
Write-Host "  2. Configure Docker Desktop for Windows containers or WSL2"
Write-Host "  3. Run Install-Lanka-Environment.ps1 to set up LANKA"

if ($needsRestart) {
    Write-Host "`n" -NoNewline
    Write-Warning "A restart is required to enable Windows features"
    $restart = Read-Host "Restart now? (y/n)"
    if ($restart -eq 'y') {
        Restart-Computer
    }
}