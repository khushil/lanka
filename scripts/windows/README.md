# LANKA Windows PowerShell Scripts

This directory contains PowerShell scripts optimized for Windows developers working on the LANKA project.

## 📋 Available Scripts

### 🚀 Core Scripts

#### `Install-Development-Tools.ps1`
Installs all required development tools using Chocolatey package manager.

```powershell
# Install all tools
.\Install-Development-Tools.ps1 -All

# Install only core tools
.\Install-Development-Tools.ps1 -Core

# Install extended tools
.\Install-Development-Tools.ps1 -Extended
```

**Installs:**
- Core: Git, Node.js, Python, VS Code, Windows Terminal, PowerShell Core, Docker Desktop
- Extended: Go, Make, GitHub CLI, Postman, Database GUIs, and more

---

#### `Start-Lanka.ps1`
Starts all LANKA services using Docker Compose.

```powershell
# Start all services (detached)
.\Start-Lanka.ps1 -Detached

# Start with rebuild
.\Start-Lanka.ps1 -Build -Detached

# Fresh start (clean volumes)
.\Start-Lanka.ps1 -Fresh -Detached

# Start specific services
.\Start-Lanka.ps1 -Services "neo4j mongodb" -Detached

# Start without opening browser
.\Start-Lanka.ps1 -Detached -NoBrowser
```

---

#### `Stop-Lanka.ps1`
Stops all LANKA services.

```powershell
# Stop services
.\Stop-Lanka.ps1

# Stop and clean Docker resources
.\Stop-Lanka.ps1 -Clean

# Stop and remove volumes (data loss!)
.\Stop-Lanka.ps1 -Volumes
```

---

#### `Get-LankaStatus.ps1`
Shows the status of all LANKA services.

```powershell
# Basic status
.\Get-LankaStatus.ps1

# Detailed status with logs
.\Get-LankaStatus.ps1 -Detailed

# Watch mode (refreshes every 5 seconds)
.\Get-LankaStatus.ps1 -Watch
```

---

#### `Test-Lanka.ps1`
Runs test suites with various options.

```powershell
# Run all tests
.\Test-Lanka.ps1

# Run specific suite
.\Test-Lanka.ps1 -Suite unit
.\Test-Lanka.ps1 -Suite integration
.\Test-Lanka.ps1 -Suite e2e

# Run with coverage
.\Test-Lanka.ps1 -Suite unit -Coverage

# Run in watch mode
.\Test-Lanka.ps1 -Suite unit -Watch

# Run with filter
.\Test-Lanka.ps1 -Suite unit -Filter "Neo4j"

# Verbose output
.\Test-Lanka.ps1 -Verbose
```

---

## 🔧 Setup Instructions

### Prerequisites

1. **Windows 11** or **Windows 10** (Build 19041+)
2. **PowerShell** running as Administrator
3. **Execution Policy** set to allow scripts:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

### Initial Setup

1. **Install Development Tools:**
   ```powershell
   cd C:\Projects\lanka\scripts\windows
   .\Install-Development-Tools.ps1 -All
   ```

2. **Configure Docker Desktop:**
   - Open Docker Desktop
   - Settings → General → Use the WSL 2 based engine (if using WSL2)
   - Settings → Resources → Advanced → Set CPU and Memory limits
   - Apply & Restart

3. **Clone Repository (if not done):**
   ```powershell
   git clone https://github.com/your-org/lanka.git C:\Projects\lanka
   cd C:\Projects\lanka
   npm install
   ```

4. **Start Services:**
   ```powershell
   .\scripts\windows\Start-Lanka.ps1 -Detached
   ```

---

## 🎯 Quick Commands

Add these aliases to your PowerShell profile for quick access:

```powershell
# Edit your profile
notepad $PROFILE

# Add these aliases
Set-Alias -Name lanka-start -Value "C:\Projects\lanka\scripts\windows\Start-Lanka.ps1"
Set-Alias -Name lanka-stop -Value "C:\Projects\lanka\scripts\windows\Stop-Lanka.ps1"
Set-Alias -Name lanka-status -Value "C:\Projects\lanka\scripts\windows\Get-LankaStatus.ps1"
Set-Alias -Name lanka-test -Value "C:\Projects\lanka\scripts\windows\Test-Lanka.ps1"

# Reload profile
. $PROFILE
```

Then use:
```powershell
lanka-start -Detached
lanka-status
lanka-test -Suite unit
lanka-stop
```

---

## 🐛 Troubleshooting

### Docker Issues

```powershell
# Reset Docker Desktop
Stop-Service com.docker.service
Remove-Item "$env:APPDATA\Docker" -Recurse -Force
Start-Service com.docker.service

# Clean Docker system
docker system prune -a --volumes -f
```

### Permission Issues

```powershell
# Run as Administrator
Start-Process powershell -Verb RunAs

# Fix npm permissions
npm config set prefix "$env:APPDATA\npm"
npm config set cache "$env:APPDATA\npm-cache"
```

### Port Conflicts

```powershell
# Find process using port
netstat -ano | findstr :3000

# Kill process
Stop-Process -Id <PID> -Force
```

---

## 📚 Additional Resources

- [LANKA Developer Guide](../../docs/developer-setup-guide.md)
- [PowerShell Documentation](https://docs.microsoft.com/en-us/powershell/)
- [Docker Desktop for Windows](https://docs.docker.com/desktop/windows/)

---

**Note:** All scripts must be run from PowerShell (not Command Prompt). For the best experience, use Windows Terminal with PowerShell Core.