# ============================================================================
# LANKA Test Runner for Windows
# Runs various test suites
# ============================================================================

param(
    [ValidateSet("all", "unit", "integration", "e2e", "performance")]
    [string]$Suite = "all",
    [switch]$Coverage,
    [switch]$Watch,
    [switch]$Verbose,
    [string]$Filter = ""
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

# Header
Clear-Host
Write-Host @"
╔════════════════════════════════════════════════════════════╗
║     LANKA Test Runner                                     ║
║     Running $Suite tests...                               ║
╚════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

Write-Host ""

# Navigate to project directory
$projectPath = if (Test-Path "C:\Projects\lanka") { "C:\Projects\lanka" } else { "$PSScriptRoot\..\.." }
Set-Location -Path $projectPath

# Check if node_modules exists
if (!(Test-Path "node_modules")) {
    Write-Warning "node_modules not found. Installing dependencies..."
    npm install
}

# Build test command
$testCmd = "npm run"

switch ($Suite) {
    "unit" {
        $testCmd += " test:unit"
        Write-Info "Running unit tests..."
    }
    "integration" {
        $testCmd += " test:integration"
        Write-Info "Running integration tests..."
        
        # Check if services are running
        $neo4jRunning = docker ps --filter "name=lanka-neo4j" --format "{{.Names}}" 2>$null
        if (!$neo4jRunning) {
            Write-Warning "Neo4j is not running. Starting services..."
            & "$PSScriptRoot\Start-Lanka.ps1" -Detached
            Start-Sleep -Seconds 10
        }
    }
    "e2e" {
        $testCmd += " test:e2e"
        Write-Info "Running end-to-end tests..."
        
        # Check if all services are running
        $servicesNeeded = @("lanka-neo4j", "lanka-mongodb", "lanka-backend", "lanka-frontend")
        $missingServices = @()
        
        foreach ($service in $servicesNeeded) {
            $running = docker ps --filter "name=$service" --format "{{.Names}}" 2>$null
            if (!$running) {
                $missingServices += $service
            }
        }
        
        if ($missingServices.Count -gt 0) {
            Write-Warning "Required services not running: $($missingServices -join ', ')"
            Write-Info "Starting all services..."
            & "$PSScriptRoot\Start-Lanka.ps1" -Detached
            Start-Sleep -Seconds 20
        }
    }
    "performance" {
        $testCmd += " test:performance"
        Write-Info "Running performance tests..."
    }
    default {
        $testCmd += " test"
        Write-Info "Running all tests..."
    }
}

# Add coverage flag
if ($Coverage) {
    $testCmd += ":coverage"
    Write-Info "Coverage reporting enabled"
}

# Add watch flag
if ($Watch) {
    $testCmd += " -- --watch"
    Write-Info "Watch mode enabled"
}

# Add filter
if ($Filter) {
    $testCmd += " -- --testNamePattern='$Filter'"
    Write-Info "Filter: $Filter"
}

# Add verbose flag
if ($Verbose) {
    $testCmd += " -- --verbose"
}

Write-Host ""
Write-Host "Executing: $testCmd" -ForegroundColor Gray
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""

# Run tests
$startTime = Get-Date
Invoke-Expression $testCmd
$exitCode = $LASTEXITCODE
$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($exitCode -eq 0) {
    Write-Success "Tests completed successfully!"
} else {
    Write-Error "Tests failed with exit code: $exitCode"
}

Write-Host "Duration: $($duration.ToString('mm\:ss'))" -ForegroundColor Gray

# Open coverage report if generated
if ($Coverage -and $exitCode -eq 0) {
    $coverageReport = Join-Path $projectPath "coverage\lcov-report\index.html"
    if (Test-Path $coverageReport) {
        Write-Info "Opening coverage report..."
        Start-Process $coverageReport
    }
}

exit $exitCode