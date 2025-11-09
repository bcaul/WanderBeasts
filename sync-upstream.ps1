# sync-upstream.ps1 - Sync your fork with upstream repository (Windows PowerShell)

Write-Host "🔍 Checking git status..." -ForegroundColor Cyan

# Check for uncommitted changes
$status = git status --porcelain
if ($status) {
    Write-Host "⚠️  You have uncommitted changes. Please commit or stash them first." -ForegroundColor Yellow
    Write-Host "   Run: git stash  (to save changes)" -ForegroundColor Yellow
    Write-Host "   Or:  git commit -am 'Your commit message'  (to commit changes)" -ForegroundColor Yellow
    exit 1
}

Write-Host "📥 Fetching upstream changes..." -ForegroundColor Cyan
git fetch upstream

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to fetch upstream. Make sure you've added the upstream remote:" -ForegroundColor Red
    Write-Host "   git remote add upstream <UPSTREAM_REPO_URL>" -ForegroundColor Yellow
    exit 1
}

Write-Host "🔀 Merging upstream/main into main..." -ForegroundColor Cyan
git checkout main
git merge upstream/main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Merge successful!" -ForegroundColor Green
    Write-Host "📤 Pushing to origin..." -ForegroundColor Cyan
    git push origin main
    Write-Host "🎉 Sync complete!" -ForegroundColor Green
} else {
    Write-Host "❌ Merge conflicts detected. Please resolve them manually:" -ForegroundColor Red
    Write-Host "   1. Resolve conflicts in the files listed above" -ForegroundColor Yellow
    Write-Host "   2. Run: git add ." -ForegroundColor Yellow
    Write-Host "   3. Run: git commit -m 'Resolve merge conflicts'" -ForegroundColor Yellow
    Write-Host "   4. Run: git push origin main" -ForegroundColor Yellow
    exit 1
}

