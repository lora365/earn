# Auto-push script for GitHub
# This script automatically commits all changes and pushes to GitHub

Write-Host "Auto-push script started..." -ForegroundColor Green

# Check if there are any changes
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "No changes to commit." -ForegroundColor Yellow
    exit 0
}

# Show current changes
Write-Host "`nCurrent changes:" -ForegroundColor Cyan
git status --short

# Stage all changes
Write-Host "`nStaging all changes..." -ForegroundColor Cyan
git add .

# Commit with timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$commitMessage = "Auto-commit: Update at $timestamp"
Write-Host "Committing changes..." -ForegroundColor Cyan
git commit -m $commitMessage

if ($LASTEXITCODE -eq 0) {
    Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
    git push origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nSuccessfully pushed to GitHub!" -ForegroundColor Green
    } else {
        Write-Host "`nError: Failed to push to GitHub" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`nError: Failed to commit changes" -ForegroundColor Red
    exit 1
}

