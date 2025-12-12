# Watch script: Monitors file changes and automatically commits and pushes to GitHub
# This script watches for changes and automatically commits/pushes them

$ErrorActionPreference = "Stop"

Write-Host "File watcher started. Monitoring for changes..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

function Push-Changes {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $status = git status --porcelain
    
    if ([string]::IsNullOrWhiteSpace($status)) {
        return
    }
    
    Write-Host "[$timestamp] Changes detected, committing and pushing..." -ForegroundColor Cyan
    
    try {
        git add .
        git commit -m "Auto-commit: Update at $timestamp" --quiet
        git push origin main --quiet
        
        Write-Host "[$timestamp] Successfully pushed to GitHub!" -ForegroundColor Green
    } catch {
        Write-Host "[$timestamp] Error: $_" -ForegroundColor Red
    }
}

# Watch for file changes using FileSystemWatcher
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = Get-Location
$watcher.Filter = "*.*"
$watcher.IncludeSubdirectories = $false
$watcher.EnableRaisingEvents = $true

# Debounce timer to avoid multiple commits for rapid changes
$debounceTimer = $null
$debounceDelay = 5000 # 5 seconds

$action = {
    if ($debounceTimer) {
        $debounceTimer.Dispose()
    }
    
    $debounceTimer = New-Object System.Timers.Timer
    $debounceTimer.Interval = $debounceDelay
    $debounceTimer.AutoReset = $false
    $debounceTimer.Add_Elapsed({
        Push-Changes
    })
    $debounceTimer.Start()
}

Register-ObjectEvent -InputObject $watcher -EventName "Changed" -Action $action | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName "Created" -Action $action | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName "Deleted" -Action $action | Out-Null

try {
    # Keep the script running
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    $watcher.EnableRaisingEvents = $false
    $watcher.Dispose()
    if ($debounceTimer) {
        $debounceTimer.Dispose()
    }
}

