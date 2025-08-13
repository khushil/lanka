# LANKA Smart Setup Script for Windows
# Detects existing installations and prompts for paths

param(
    [switch]$SkipDocker,
    [switch]$SkipTools,
    [switch]$Minimal
)

$ErrorActionPreference = "Stop"

Write-Host @"
╔══════════════════════════════════════════════════════════════╗
║                    LANKA Smart Setup                         ║
║         Intelligent Development Environment Setup            ║
╚══════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# Function to test if running as admin
function Test-Admin {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Function to check if a command exists
function Test-CommandExists {
    param($Command)
    try {
        if (Get-Command $Command -ErrorAction SilentlyContinue) {
            return $true
        }
    } catch {}
    return $false
}

# Function to get version of installed tool
function Get-ToolVersion {
    param($Command, $VersionFlag = "--version")
    try {
        $version = & $Command $VersionFlag 2>&1 | Select-Object -First 1
        return $version
    } catch {
        return "Unknown"
    }
}

# Check admin privileges
if (-not (Test-Admin)) {
    Write-Host "⚠️  This script requires Administrator privileges" -ForegroundColor Yellow
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host "`n📊 System Check" -ForegroundColor Green
Write-Host "═══════════════════════════════════════" -ForegroundColor Gray

# Check Windows version
$winVer = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion").DisplayVersion
Write-Host "✓ Windows Version: $winVer" -ForegroundColor Green

# Check virtualization
$hyperV = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All
if ($hyperV.State -eq "Enabled") {
    Write-Host "✓ Hyper-V: Enabled" -ForegroundColor Green
} else {
    Write-Host "⚠ Hyper-V: Not enabled (required for Docker)" -ForegroundColor Yellow
}

# Check WSL2
Write-Host "`n🐧 WSL2 Status" -ForegroundColor Green
Write-Host "═══════════════════════════════════════" -ForegroundColor Gray

$wslInstalled = Test-CommandExists "wsl"
if ($wslInstalled) {
    $wslVersion = wsl --list --verbose 2>$null
    Write-Host "✓ WSL2 is installed" -ForegroundColor Green
    if ($wslVersion) {
        Write-Host $wslVersion
    }
} else {
    Write-Host "✗ WSL2 not installed" -ForegroundColor Yellow
    $installWSL = Read-Host "Install WSL2 with Ubuntu? (y/n)"
    if ($installWSL -eq 'y') {
        Write-Host "Installing WSL2..." -ForegroundColor Yellow
        wsl --install -d Ubuntu-22.04
        wsl --set-default-version 2
        Write-Host "✓ WSL2 installed. Please restart and run this script again." -ForegroundColor Green
        exit 0
    }
}

# Check Docker
if (-not $SkipDocker) {
    Write-Host "`n🐳 Docker Status" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════" -ForegroundColor Gray
    
    if (Test-CommandExists "docker") {
        $dockerVersion = Get-ToolVersion "docker" "-v"
        Write-Host "✓ Docker installed: $dockerVersion" -ForegroundColor Green
        
        # Check if Docker is running
        try {
            docker ps 2>&1 | Out-Null
            Write-Host "✓ Docker is running" -ForegroundColor Green
        } catch {
            Write-Host "⚠ Docker is installed but not running" -ForegroundColor Yellow
            Write-Host "  Please start Docker Desktop" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✗ Docker not installed" -ForegroundColor Red
        Write-Host "  Please install Docker Desktop from:" -ForegroundColor Yellow
        Write-Host "  https://www.docker.com/products/docker-desktop/" -ForegroundColor Cyan
        $openUrl = Read-Host "Open Docker download page? (y/n)"
        if ($openUrl -eq 'y') {
            Start-Process "https://www.docker.com/products/docker-desktop/"
        }
    }
}

# Check development tools
if (-not $SkipTools) {
    Write-Host "`n🛠️  Development Tools" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════" -ForegroundColor Gray
    
    $tools = @(
        @{Name="Git"; Command="git"; Package="git"; Required=$true},
        @{Name="Node.js"; Command="node"; Package="nodejs-lts"; Required=$true},
        @{Name="VS Code"; Command="code"; Package="vscode"; Required=$false},
        @{Name="Windows Terminal"; Command="wt"; Package="microsoft-windows-terminal"; Required=$false},
        @{Name="GitHub CLI"; Command="gh"; Package="gh"; Required=$false},
        @{Name="Make"; Command="make"; Package="make"; Required=$false}
    )
    
    $missingTools = @()
    
    foreach ($tool in $tools) {
        if (Test-CommandExists $tool.Command) {
            $version = Get-ToolVersion $tool.Command
            Write-Host "✓ $($tool.Name): $version" -ForegroundColor Green
        } else {
            Write-Host "✗ $($tool.Name): Not installed" -ForegroundColor $(if ($tool.Required) {"Red"} else {"Yellow"})
            $missingTools += $tool
        }
    }
    
    if ($missingTools.Count -gt 0) {
        Write-Host "`n📦 Missing Tools Installation" -ForegroundColor Yellow
        
        # Check for Chocolatey
        if (-not (Test-CommandExists "choco")) {
            Write-Host "Chocolatey package manager not found." -ForegroundColor Yellow
            $installChoco = Read-Host "Install Chocolatey? (y/n)"
            if ($installChoco -eq 'y') {
                Write-Host "Installing Chocolatey..." -ForegroundColor Yellow
                Set-ExecutionPolicy Bypass -Scope Process -Force
                [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
                iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
                Write-Host "✓ Chocolatey installed" -ForegroundColor Green
            }
        }
        
        if (Test-CommandExists "choco") {
            Write-Host "`nTools to install:" -ForegroundColor Yellow
            foreach ($tool in $missingTools) {
                $marker = if ($tool.Required) {"[Required]"} else {"[Optional]"}
                Write-Host "  - $($tool.Name) $marker" -ForegroundColor $(if ($tool.Required) {"Red"} else {"Yellow"})
            }
            
            $installTools = Read-Host "`nInstall missing tools? (y/n)"
            if ($installTools -eq 'y') {
                foreach ($tool in $missingTools) {
                    if ($tool.Required -or !$Minimal) {
                        Write-Host "Installing $($tool.Name)..." -ForegroundColor Yellow
                        choco install -y $tool.Package
                    }
                }
                Write-Host "✓ Tools installed" -ForegroundColor Green
            }
        }
    }
}

# Project setup
Write-Host "`n📁 Project Setup" -ForegroundColor Green
Write-Host "═══════════════════════════════════════" -ForegroundColor Gray

# Check for existing project
$defaultPath = "C:\Projects\lanka"
$envPath = $env:LANKA_PROJECT_PATH

if ($envPath -and (Test-Path $envPath)) {
    Write-Host "✓ Found project at: $envPath (from environment)" -ForegroundColor Green
    $projectPath = $envPath
} elseif (Test-Path $defaultPath) {
    Write-Host "✓ Found project at: $defaultPath" -ForegroundColor Green
    $projectPath = $defaultPath
} elseif (Test-Path "$PWD\package.json") {
    $pkg = Get-Content "$PWD\package.json" | ConvertFrom-Json
    if ($pkg.name -eq "lanka") {
        Write-Host "✓ Found project in current directory" -ForegroundColor Green
        $projectPath = $PWD.Path
    }
} else {
    Write-Host "Project not found." -ForegroundColor Yellow
    $customPath = Read-Host "Enter project path (or press Enter for $defaultPath)"
    $projectPath = if ([string]::IsNullOrWhiteSpace($customPath)) { $defaultPath } else { $customPath }
    
    if (-not (Test-Path $projectPath)) {
        $cloneProject = Read-Host "Clone LANKA repository to $projectPath? (y/n)"
        if ($cloneProject -eq 'y') {
            $repoUrl = Read-Host "Enter repository URL (or press Enter for default)"
            if ([string]::IsNullOrWhiteSpace($repoUrl)) {
                $repoUrl = "https://github.com/your-org/lanka.git"
            }
            
            $parentPath = Split-Path $projectPath -Parent
            if (-not (Test-Path $parentPath)) {
                New-Item -ItemType Directory -Path $parentPath -Force | Out-Null
            }
            
            Write-Host "Cloning repository..." -ForegroundColor Yellow
            git clone $repoUrl $projectPath
            Write-Host "✓ Repository cloned" -ForegroundColor Green
        }
    }
}

# Save project path for future use
if ($projectPath -and (Test-Path $projectPath)) {
    [System.Environment]::SetEnvironmentVariable("LANKA_PROJECT_PATH", $projectPath, "User")
    Write-Host "✓ Project path saved to environment" -ForegroundColor Green
    
    # Install dependencies
    Set-Location $projectPath
    if (Test-Path "package.json") {
        $installDeps = Read-Host "Install npm dependencies? (y/n)"
        if ($installDeps -eq 'y') {
            Write-Host "Installing dependencies..." -ForegroundColor Yellow
            npm install
            
            if (Test-Path "client\package.json") {
                Set-Location "client"
                npm install
                Set-Location ..
            }
            Write-Host "✓ Dependencies installed" -ForegroundColor Green
        }
    }
    
    # Setup environment file
    if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
        Write-Host "Creating .env file from template..." -ForegroundColor Yellow
        Copy-Item ".env.example" ".env"
        Write-Host "✓ .env file created (please configure)" -ForegroundColor Green
    }
}

# Create PowerShell profile functions
Write-Host "`n⚙️  PowerShell Profile Setup" -ForegroundColor Green
Write-Host "═══════════════════════════════════════" -ForegroundColor Gray

$profileExists = Test-Path $PROFILE
if ($profileExists) {
    $profileContent = Get-Content $PROFILE -Raw
    if ($profileContent -match "LANKA Development Functions") {
        Write-Host "✓ LANKA functions already in profile" -ForegroundColor Green
    } else {
        $addToProfile = Read-Host "Add LANKA helper functions to PowerShell profile? (y/n)"
        if ($addToProfile -eq 'y') {
            Add-Content $PROFILE -Value @"

# LANKA Development Functions
`$env:LANKA_PROJECT_PATH = "$projectPath"

function lanka-start {
    if (Test-Path `$env:LANKA_PROJECT_PATH) {
        Set-Location `$env:LANKA_PROJECT_PATH
        docker compose up -d
        Write-Host "✅ LANKA started!" -ForegroundColor Green
    }
}

function lanka-stop {
    if (Test-Path `$env:LANKA_PROJECT_PATH) {
        Set-Location `$env:LANKA_PROJECT_PATH
        docker compose down
        Write-Host "⏹️ LANKA stopped" -ForegroundColor Yellow
    }
}

function lanka-path {
    Write-Host "LANKA path: `$env:LANKA_PROJECT_PATH" -ForegroundColor Cyan
    Set-Location `$env:LANKA_PROJECT_PATH
}
"@
            Write-Host "✓ Helper functions added to profile" -ForegroundColor Green
        }
    }
} else {
    Write-Host "PowerShell profile not found. Run: notepad `$PROFILE" -ForegroundColor Yellow
}

# Summary
Write-Host "`n═══════════════════════════════════════" -ForegroundColor Gray
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════" -ForegroundColor Gray

Write-Host "`n📌 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Configure .env file with your settings" -ForegroundColor White
Write-Host "  2. Start Docker Desktop" -ForegroundColor White
Write-Host "  3. Run: docker compose up -d" -ForegroundColor White
Write-Host "  4. Run: npm run dev" -ForegroundColor White

Write-Host "`n🚀 Quick Commands:" -ForegroundColor Cyan
Write-Host "  lanka-start  - Start all services" -ForegroundColor White
Write-Host "  lanka-stop   - Stop all services" -ForegroundColor White
Write-Host "  lanka-path   - Go to project directory" -ForegroundColor White

Write-Host "`n📍 Project Location: $projectPath" -ForegroundColor Yellow
Write-Host ""