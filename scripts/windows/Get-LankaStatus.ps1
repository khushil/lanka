# ============================================================================
# LANKA Status Script for Windows
# Shows status of all LANKA services
# ============================================================================

param(
    [switch]$Detailed,
    [switch]$Watch
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

function Write-Error {
    param([string]$Message)
    Write-Host "✗ " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

function Get-ServiceStatus {
    Clear-Host
    Write-Host @"
╔════════════════════════════════════════════════════════════╗
║     LANKA Development Environment Status                  ║
╚════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan
    
    Write-Host ""
    
    # Check Docker Desktop
    Write-Host "▶ Docker Desktop" -ForegroundColor Magenta
    $docker = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
    if ($docker) {
        Write-Success "Docker Desktop is running (PID: $($docker.Id))"
        
        # Get Docker info
        $dockerVersion = docker version --format '{{.Server.Version}}' 2>$null
        if ($dockerVersion) {
            Write-Info "Docker version: $dockerVersion"
        }
    } else {
        Write-Error "Docker Desktop is not running"
        return
    }
    
    Write-Host ""
    
    # Check LANKA containers
    Write-Host "▶ LANKA Services" -ForegroundColor Magenta
    
    $services = @(
        @{name="lanka-neo4j"; port="7474"; description="Neo4j Graph Database"},
        @{name="lanka-mongodb"; port="27017"; description="MongoDB"},
        @{name="lanka-redis"; port="6379"; description="Redis Cache"},
        @{name="lanka-backend"; port="3000"; description="Backend API"},
        @{name="lanka-frontend"; port="3001"; description="Frontend UI"}
    )
    
    foreach ($service in $services) {
        $container = docker ps --filter "name=$($service.name)" --format "table {{.Status}}" 2>$null | Select-Object -Skip 1
        
        if ($container) {
            $health = docker inspect $service.name --format='{{.State.Health.Status}}' 2>$null
            if ($health -eq "healthy") {
                Write-Success "$($service.description): Running (Healthy) - Port $($service.port)"
            } elseif ($health -eq "unhealthy") {
                Write-Error "$($service.description): Running (Unhealthy) - Port $($service.port)"
            } else {
                Write-Info "$($service.description): Running - Port $($service.port)"
            }
            
            if ($Detailed) {
                $stats = docker stats $service.name --no-stream --format "  CPU: {{.CPUPerc}} | Memory: {{.MemUsage}}" 2>$null
                Write-Host $stats -ForegroundColor Gray
            }
        } else {
            Write-Warning "$($service.description): Not running"
        }
    }
    
    Write-Host ""
    
    # Check network connectivity
    Write-Host "▶ Network Connectivity" -ForegroundColor Magenta
    
    $endpoints = @(
        @{url="http://localhost:3000/health"; name="Backend API"},
        @{url="http://localhost:3001"; name="Frontend"},
        @{url="http://localhost:7474"; name="Neo4j Browser"}
    )
    
    foreach ($endpoint in $endpoints) {
        try {
            $response = Invoke-WebRequest -Uri $endpoint.url -Method HEAD -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Success "$($endpoint.name): Accessible"
            } else {
                Write-Warning "$($endpoint.name): Responding with status $($response.StatusCode)"
            }
        } catch {
            Write-Error "$($endpoint.name): Not accessible"
        }
    }
    
    if ($Detailed) {
        Write-Host ""
        Write-Host "▶ Resource Usage" -ForegroundColor Magenta
        
        # Docker disk usage
        $diskUsage = docker system df --format "TYPE {{.Type}}\nSIZE {{.Size}}\nRECLAIMABLE {{.Reclaimable}}" 2>$null
        Write-Host "Docker Disk Usage:" -ForegroundColor Yellow
        Write-Host $diskUsage -ForegroundColor Gray
        
        Write-Host ""
        Write-Host "▶ Container Logs (last 5 lines)" -ForegroundColor Magenta
        
        foreach ($service in $services) {
            $container = docker ps --filter "name=$($service.name)" --format "{{.Names}}" 2>$null
            if ($container) {
                Write-Host "$($service.description):" -ForegroundColor Yellow
                $logs = docker logs $service.name --tail 5 2>&1 | Out-String
                Write-Host $logs -ForegroundColor Gray
            }
        }
    }
    
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "Last checked: $timestamp" -ForegroundColor Gray
    
    if ($Watch) {
        Write-Host "Refreshing in 5 seconds... (Press Ctrl+C to stop)" -ForegroundColor Gray
    }
}

# Main execution
if ($Watch) {
    while ($true) {
        Get-ServiceStatus
        Start-Sleep -Seconds 5
    }
} else {
    Get-ServiceStatus
}