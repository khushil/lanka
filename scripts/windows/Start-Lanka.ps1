# ============================================================================
# LANKA Start Script for Windows
# Starts all LANKA services using Docker Compose
# ============================================================================

param(
    [switch]$Build,
    [switch]$Detached,
    [switch]$Fresh,
    [string]$Services = "",
    [switch]$NoBrowser
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
║     Starting Services...                                  ║
╚════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

Write-Host ""

# Check if Docker Desktop is running
$docker = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
if (!$docker) {
    Write-Info "Starting Docker Desktop..."
    $dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerPath) {
        Start-Process $dockerPath
        Write-Info "Waiting for Docker to start (30 seconds)..."
        Start-Sleep -Seconds 30
    } else {
        Write-Error "Docker Desktop not found. Please install Docker Desktop first."
        exit 1
    }
}

# Verify Docker is running
try {
    docker version | Out-Null
} catch {
    Write-Error "Docker is not running properly. Please check Docker Desktop."
    exit 1
}

# Navigate to project directory
$projectPath = if (Test-Path "C:\Projects\lanka") { "C:\Projects\lanka" } else { "$PSScriptRoot\..\.." }
Set-Location -Path $projectPath
Write-Info "Working directory: $projectPath"

# Fresh start if requested
if ($Fresh) {
    Write-Warning "Performing fresh start..."
    Write-Info "Stopping existing containers..."
    docker-compose down -v
    Write-Info "Removing old data..."
    docker system prune -af --volumes
    Write-Success "Clean slate ready"
}

# Build if requested
if ($Build) {
    Write-Info "Building Docker images..."
    $buildCmd = "docker-compose build"
    if ($Services) { $buildCmd += " $Services" }
    Invoke-Expression $buildCmd
    Write-Success "Build complete"
}

# Start services
Write-Info "Starting LANKA services..."
$startCmd = "docker-compose up"
if ($Detached) { $startCmd += " -d" }
if ($Services) { $startCmd += " $Services" }

if ($Detached) {
    Invoke-Expression $startCmd
    
    # Wait for services to be healthy
    Write-Info "Waiting for services to be healthy..."
    $attempts = 0
    $maxAttempts = 30
    
    while ($attempts -lt $maxAttempts) {
        Start-Sleep -Seconds 2
        $neo4jHealth = docker inspect lanka-neo4j --format='{{.State.Health.Status}}' 2>$null
        $backendHealth = docker inspect lanka-backend --format='{{.State.Health.Status}}' 2>$null
        
        if ($neo4jHealth -eq "healthy" -and $backendHealth -eq "healthy") {
            Write-Success "All services are healthy!"
            break
        }
        
        $attempts++
        Write-Host "." -NoNewline
    }
    
    Write-Host ""
    
    # Display service URLs
    Write-Host "`n" -NoNewline
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "✨ LANKA Services Started Successfully!" -ForegroundColor Green
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
    
    Write-Host "`nService URLs:" -ForegroundColor Yellow
    Write-Host "  Backend API:    " -NoNewline
    Write-Host "http://localhost:3000" -ForegroundColor Cyan
    Write-Host "  Frontend:       " -NoNewline
    Write-Host "http://localhost:3001" -ForegroundColor Cyan
    Write-Host "  Neo4j Browser:  " -NoNewline
    Write-Host "http://localhost:7474" -ForegroundColor Cyan
    Write-Host "  GraphQL:        " -NoNewline
    Write-Host "http://localhost:3000/graphql" -ForegroundColor Cyan
    
    Write-Host "`nCredentials:" -ForegroundColor Yellow
    Write-Host "  Neo4j:     neo4j / lanka2025"
    Write-Host "  MongoDB:   lanka / lanka2025"
    
    Write-Host "`nUseful Commands:" -ForegroundColor Gray
    Write-Host "  View logs:        docker-compose logs -f"
    Write-Host "  Stop services:    .\Stop-Lanka.ps1"
    Write-Host "  Service status:   .\Get-LankaStatus.ps1"
    
    # Open browser if not disabled
    if (!$NoBrowser) {
        Start-Sleep -Seconds 2
        Start-Process "http://localhost:3001"
    }
} else {
    # Run in foreground
    Invoke-Expression $startCmd
}