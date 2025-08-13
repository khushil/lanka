# ============================================================================
# LANKA Stop Script for Windows
# Stops all LANKA services
# ============================================================================

param(
    [switch]$Clean,
    [switch]$Volumes
)

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

# Header
Clear-Host
Write-Host @"
╔════════════════════════════════════════════════════════════╗
║     LANKA Development Environment                         ║
║     Stopping Services...                                  ║
╚════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Yellow

Write-Host ""

# Navigate to project directory
$projectPath = if (Test-Path "C:\Projects\lanka") { "C:\Projects\lanka" } else { "$PSScriptRoot\..\.." }
Set-Location -Path $projectPath

# Stop services
Write-Info "Stopping LANKA services..."
$stopCmd = "docker-compose down"
if ($Volumes) {
    $stopCmd += " -v"
    Write-Warning "Removing volumes (data will be deleted)..."
}

Invoke-Expression $stopCmd
Write-Success "Services stopped"

# Clean up if requested
if ($Clean) {
    Write-Warning "Cleaning up Docker resources..."
    docker system prune -af
    Write-Success "Docker cleanup complete"
}

Write-Host "`nLANKA services have been stopped." -ForegroundColor Green