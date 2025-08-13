# ============================================================================
# LANKA Development Environment Setup Script - Windows PowerShell
# Prepares Windows for WSL2 and Docker Desktop
# ============================================================================

# Requires Administrator privileges
#Requires -RunAsAdministrator

# Set execution policy for this session
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force

# Colors for output
$ErrorActionPreference = "Stop"

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

function Write-Step {
    param([string]$Message)
    Write-Host "`n▶ " -ForegroundColor Magenta -NoNewline
    Write-Host $Message -ForegroundColor White -BackgroundColor DarkGray
}

# Header
Clear-Host
Write-Host @"
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║     LANKA Development Environment Setup                   ║
║     Windows + WSL2 + Docker Desktop                      ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

Write-Host ""

# Check Windows version
Write-Step "Checking Windows Version"
$osInfo = Get-WmiObject -Class Win32_OperatingSystem
$version = [System.Environment]::OSVersion.Version

if ($version.Major -ge 10 -and $version.Build -ge 19041) {
    Write-Success "Windows version compatible: $($osInfo.Caption) Build $($version.Build)"
} else {
    Write-Error "Windows version not compatible. Requires Windows 10 Build 19041 or higher"
    exit 1
}

# ============================================================================
# STEP 1: Enable Windows Features
# ============================================================================

Write-Step "Step 1: Enabling Windows Features for WSL2"

# Check if WSL is enabled
$wslFeature = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux
if ($wslFeature.State -eq "Disabled") {
    Write-Info "Enabling Windows Subsystem for Linux..."
    Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -All -NoRestart | Out-Null
    Write-Success "WSL enabled"
} else {
    Write-Info "WSL already enabled"
}

# Check if Virtual Machine Platform is enabled
$vmFeature = Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform
if ($vmFeature.State -eq "Disabled") {
    Write-Info "Enabling Virtual Machine Platform..."
    Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -All -NoRestart | Out-Null
    Write-Success "Virtual Machine Platform enabled"
} else {
    Write-Info "Virtual Machine Platform already enabled"
}

# Check if Hyper-V is enabled (optional but recommended)
$hyperVFeature = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All
if ($hyperVFeature.State -eq "Disabled") {
    Write-Info "Enabling Hyper-V..."
    Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All -NoRestart | Out-Null
    Write-Success "Hyper-V enabled"
} else {
    Write-Info "Hyper-V already enabled"
}

# ============================================================================
# STEP 2: Install Software
# ============================================================================

Write-Step "Step 2: Installing Required Software"

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

# Install packages via Chocolatey
Write-Info "Installing packages via Chocolatey..."

$packages = @(
    "git",
    "vscode",
    "windows-terminal",
    "powershell-core",
    "nodejs-lts",
    "python3",
    "postman",
    "insomnia-rest-api-client"
)

foreach ($package in $packages) {
    if (!(choco list --local-only | Select-String $package)) {
        Write-Info "Installing $package..."
        choco install $package -y --no-progress | Out-Null
        Write-Success "$package installed"
    } else {
        Write-Info "$package already installed"
    }
}

# ============================================================================
# STEP 3: WSL2 Setup
# ============================================================================

Write-Step "Step 3: Setting up WSL2"

# Download and install WSL2 kernel update if needed
$wslKernelUrl = "https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi"
$wslKernelPath = "$env:TEMP\wsl_update_x64.msi"

if (!(Test-Path "C:\Windows\System32\lxss\tools\kernel")) {
    Write-Info "Downloading WSL2 kernel update..."
    Invoke-WebRequest -Uri $wslKernelUrl -OutFile $wslKernelPath
    Write-Info "Installing WSL2 kernel update..."
    Start-Process msiexec.exe -ArgumentList "/i", $wslKernelPath, "/quiet" -Wait
    Write-Success "WSL2 kernel update installed"
}

# Set WSL2 as default
Write-Info "Setting WSL2 as default version..."
wsl --set-default-version 2

# Check if Ubuntu is installed
$distributions = wsl --list --quiet
if ($distributions -notcontains "Ubuntu-22.04") {
    Write-Info "Installing Ubuntu 22.04..."
    wsl --install -d Ubuntu-22.04
    Write-Success "Ubuntu 22.04 installed"
    Write-Warning "Please complete Ubuntu setup and run the Linux setup script"
} else {
    Write-Info "Ubuntu 22.04 already installed"
}

# ============================================================================
# STEP 4: Docker Desktop Check
# ============================================================================

Write-Step "Step 4: Checking Docker Desktop"

$dockerDesktopPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"

if (Test-Path $dockerDesktopPath) {
    Write-Success "Docker Desktop is installed"
    
    # Check if Docker Desktop is running
    $dockerProcess = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
    if ($dockerProcess) {
        Write-Success "Docker Desktop is running"
    } else {
        Write-Warning "Docker Desktop is installed but not running"
        Write-Info "Starting Docker Desktop..."
        Start-Process $dockerDesktopPath
        Write-Info "Please wait for Docker Desktop to start and enable WSL2 integration"
    }
} else {
    Write-Warning "Docker Desktop not found"
    Write-Info "Please download and install Docker Desktop from:"
    Write-Host "https://www.docker.com/products/docker-desktop/" -ForegroundColor Blue
    
    $install = Read-Host "Would you like to open the download page now? (y/n)"
    if ($install -eq 'y') {
        Start-Process "https://www.docker.com/products/docker-desktop/"
    }
}

# ============================================================================
# STEP 5: WSL Configuration
# ============================================================================

Write-Step "Step 5: Creating WSL Configuration"

$wslConfigPath = "$env:USERPROFILE\.wslconfig"

if (!(Test-Path $wslConfigPath)) {
    Write-Info "Creating .wslconfig file..."
    
    $wslConfig = @"
[wsl2]
memory=8GB
processors=4
localhostForwarding=true
nestedVirtualization=true
swap=4GB
swapfile=C:\\temp\\wsl-swap.vhdx

[experimental]
autoMemoryReclaim=gradual
networkingMode=mirrored
dnsTunneling=true
firewall=true
autoProxy=true
"@
    
    $wslConfig | Out-File -FilePath $wslConfigPath -Encoding ASCII
    Write-Success ".wslconfig created"
} else {
    Write-Info ".wslconfig already exists"
}

# ============================================================================
# STEP 6: Windows Terminal Configuration
# ============================================================================

Write-Step "Step 6: Configuring Windows Terminal"

$terminalSettingsPath = "$env:LOCALAPPDATA\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json"

if (Test-Path $terminalSettingsPath) {
    Write-Info "Windows Terminal settings found"
    # We won't modify existing settings, just inform the user
    Write-Info "You can customize Windows Terminal settings at:"
    Write-Host $terminalSettingsPath -ForegroundColor Blue
} else {
    Write-Info "Windows Terminal settings not found. Please configure after installation"
}

# ============================================================================
# STEP 7: VS Code Extensions
# ============================================================================

Write-Step "Step 7: Installing VS Code Extensions"

if (Get-Command code -ErrorAction SilentlyContinue) {
    Write-Info "Installing VS Code extensions..."
    
    $extensions = @(
        "ms-vscode-remote.remote-wsl",
        "ms-azuretools.vscode-docker",
        "ms-vscode.vscode-typescript-next",
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "eamodio.gitlens",
        "github.copilot",
        "github.copilot-chat",
        "ms-vscode-remote.remote-containers",
        "redhat.vscode-yaml",
        "graphql.vscode-graphql"
    )
    
    foreach ($extension in $extensions) {
        Write-Info "Installing $extension..."
        code --install-extension $extension --force 2>$null
    }
    
    Write-Success "VS Code extensions installed"
} else {
    Write-Warning "VS Code CLI not found. Please install extensions manually"
}

# ============================================================================
# STEP 8: Environment Variables
# ============================================================================

Write-Step "Step 8: Setting Environment Variables"

# Add to PATH if not already present
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$pathsToAdd = @()

if ($userPath -notlike "*Git\cmd*") {
    $gitPath = "C:\Program Files\Git\cmd"
    if (Test-Path $gitPath) {
        $pathsToAdd += $gitPath
    }
}

if ($pathsToAdd.Count -gt 0) {
    $newPath = $userPath + ";" + ($pathsToAdd -join ";")
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Success "PATH environment variable updated"
}

# Set Docker environment variables
[Environment]::SetEnvironmentVariable("DOCKER_BUILDKIT", "1", "User")
[Environment]::SetEnvironmentVariable("COMPOSE_DOCKER_CLI_BUILD", "1", "User")
Write-Success "Docker environment variables set"

# ============================================================================
# STEP 9: Windows Defender Exclusions
# ============================================================================

Write-Step "Step 9: Optimizing Windows Defender for WSL2"

Write-Info "Adding Windows Defender exclusions for better performance..."

try {
    Add-MpPreference -ExclusionPath "\\wsl$" -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionProcess "node.exe" -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionProcess "docker.exe" -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionProcess "com.docker.backend.exe" -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionProcess "com.docker.service" -ErrorAction SilentlyContinue
    Write-Success "Windows Defender exclusions added"
} catch {
    Write-Warning "Could not add Windows Defender exclusions. Please add manually for better performance"
}

# ============================================================================
# STEP 10: Create Helper Scripts
# ============================================================================

Write-Step "Step 10: Creating Helper Scripts"

$scriptsPath = "$env:USERPROFILE\Documents\LANKA"
if (!(Test-Path $scriptsPath)) {
    New-Item -ItemType Directory -Path $scriptsPath | Out-Null
}

# Create start script
$startScript = @'
# Start LANKA Development Environment
Write-Host "Starting LANKA Development Environment..." -ForegroundColor Green

# Start Docker Desktop if not running
$docker = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
if (!$docker) {
    Write-Host "Starting Docker Desktop..."
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    Start-Sleep -Seconds 10
}

# Start WSL2 and services
Write-Host "Starting WSL2 services..."
wsl -d Ubuntu-22.04 -- bash -c "cd ~/workspace/lanka && docker compose up -d"

Write-Host "LANKA services started!" -ForegroundColor Green
Write-Host "Access points:" -ForegroundColor Yellow
Write-Host "  Backend:  http://localhost:3000"
Write-Host "  Frontend: http://localhost:3001"
Write-Host "  Neo4j:    http://localhost:7474"
'@

$startScript | Out-File -FilePath "$scriptsPath\Start-Lanka.ps1" -Encoding ASCII
Write-Success "Start-Lanka.ps1 created"

# Create stop script
$stopScript = @'
# Stop LANKA Development Environment
Write-Host "Stopping LANKA Development Environment..." -ForegroundColor Yellow

# Stop WSL2 services
wsl -d Ubuntu-22.04 -- bash -c "cd ~/workspace/lanka && docker compose down"

Write-Host "LANKA services stopped!" -ForegroundColor Green
'@

$stopScript | Out-File -FilePath "$scriptsPath\Stop-Lanka.ps1" -Encoding ASCII
Write-Success "Stop-Lanka.ps1 created"

# Create status script
$statusScript = @'
# Check LANKA Development Environment Status
Write-Host "LANKA Environment Status" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

# Check Docker Desktop
$docker = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
if ($docker) {
    Write-Host "✓ Docker Desktop: Running" -ForegroundColor Green
} else {
    Write-Host "✗ Docker Desktop: Not Running" -ForegroundColor Red
}

# Check WSL2
$wslStatus = wsl --list --verbose
Write-Host "`nWSL Distributions:"
Write-Host $wslStatus

# Check Docker containers
Write-Host "`nDocker Containers:"
wsl -d Ubuntu-22.04 -- docker ps --format "table {{.Names}}\t{{.Status}}"
'@

$statusScript | Out-File -FilePath "$scriptsPath\Get-LankaStatus.ps1" -Encoding ASCII
Write-Success "Get-LankaStatus.ps1 created"

# ============================================================================
# FINAL SUMMARY
# ============================================================================

Write-Host "`n" -NoNewline
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✨ Windows Setup Complete!" -ForegroundColor Green -BackgroundColor DarkGreen
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "`nInstalled/Configured:" -ForegroundColor White
Write-Success "Windows features for WSL2"
Write-Success "Development tools via Chocolatey"
Write-Success "WSL configuration"
Write-Success "VS Code extensions"
Write-Success "Environment variables"
Write-Success "Helper scripts"

Write-Host "`nHelper Scripts Location:" -ForegroundColor White
Write-Host "  $scriptsPath" -ForegroundColor Blue

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "  1. Restart your computer if this is first-time setup"
Write-Host "  2. Open Ubuntu from Windows Terminal"
Write-Host "  3. Run the Linux setup script inside WSL2:"
Write-Host "     curl -sSL https://raw.githubusercontent.com/your-org/lanka/main/scripts/setup-dev-env.sh | bash"
Write-Host "  4. Configure Docker Desktop to use WSL2 backend"
Write-Host "  5. Enable WSL integration for your Ubuntu distro in Docker Desktop settings"

Write-Host "`nQuick Commands (PowerShell):" -ForegroundColor White
Write-Host "  Start-Lanka.ps1     - Start all services"
Write-Host "  Stop-Lanka.ps1      - Stop all services"
Write-Host "  Get-LankaStatus.ps1 - Check status"

Write-Host "`nService URLs:" -ForegroundColor White
Write-Host "  Backend:  " -NoNewline
Write-Host "http://localhost:3000" -ForegroundColor Blue
Write-Host "  Frontend: " -NoNewline
Write-Host "http://localhost:3001" -ForegroundColor Blue
Write-Host "  Neo4j:    " -NoNewline
Write-Host "http://localhost:7474" -ForegroundColor Blue

$restart = Read-Host "`nRestart required for some changes. Restart now? (y/n)"
if ($restart -eq 'y') {
    Write-Warning "Saving your work and restarting in 10 seconds..."
    Start-Sleep -Seconds 10
    Restart-Computer
}