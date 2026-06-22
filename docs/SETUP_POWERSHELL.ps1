# ═══════════════════════════════════════════════════════════════
# MyRandWise — Local Setup & GitHub Push Script
# Run this from: C:\Users\Bongane Khoza\Documents\Projects\randwise
# ═══════════════════════════════════════════════════════════════

# ── STEP 1: Create the folder structure ────────────────────────
$ProjectRoot = "C:\Users\Bongane Khoza\Documents\Projects\randwise"
New-Item -ItemType Directory -Force -Path "$ProjectRoot\css"
New-Item -ItemType Directory -Force -Path "$ProjectRoot\js"
New-Item -ItemType Directory -Force -Path "$ProjectRoot\assets\icons"
New-Item -ItemType Directory -Force -Path "$ProjectRoot\docs"
Write-Host "✅ Folder structure created" -ForegroundColor Green

# ── STEP 2: Copy files from Downloads (your original source) ───
# Adjust these source paths to where your files actually are
$SourceRoot = "C:\Users\Bongane Khoza\Downloads\BusinessOS mess\Systems\RandWise_ South African personal finance app"

# Copy supporting files from your original repo location
# (Update these paths if your files are somewhere else)
$FilesToCopy = @("sw.js", "manifest.json", "404.html", "reset-password.html", "about.html", "CNAME")
foreach ($f in $FilesToCopy) {
    $src = Join-Path $SourceRoot $f
    if (Test-Path $src) {
        Copy-Item $src -Destination $ProjectRoot -Force
        Write-Host "✅ Copied: $f" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Not found (copy manually): $f" -ForegroundColor Yellow
    }
}

# Copy icon
$iconSrc = Join-Path $SourceRoot "icon_192.png"
if (Test-Path $iconSrc) {
    Copy-Item $iconSrc -Destination "$ProjectRoot\assets\icons\" -Force
    # Also copy to root (manifest.json may reference /icon_192.png)
    Copy-Item $iconSrc -Destination $ProjectRoot -Force
    Write-Host "✅ Copied: icon_192.png" -ForegroundColor Green
}

Write-Host ""
Write-Host "═══ FILES COPIED — now drop in the split files from Claude ═══" -ForegroundColor Cyan
Write-Host "Place these in $ProjectRoot :"
Write-Host "  app.html → root"
Write-Host "  css\app.css"
Write-Host "  js\auth-redirect.js"
Write-Host "  js\sw-init.js"
Write-Host "  js\main.js"
Write-Host "  js\features.js"
Write-Host "  js\init.js"
Write-Host "  docs\PROGRESS.md"
Write-Host ""

# ── STEP 3: Test locally before pushing ────────────────────────
# Uncomment ONE of these to start a local server:

# Option A — Node (if installed):
# npx serve $ProjectRoot

# Option B — Python (if installed):
# python -m http.server 8080 --directory $ProjectRoot

# Option C — VS Code Live Server extension (no command needed, just open folder)

Write-Host "📋 To test locally, run ONE of:" -ForegroundColor Cyan
Write-Host "   npx serve ."
Write-Host "   python -m http.server 8080"
Write-Host "   (or use VS Code Live Server extension)"
Write-Host ""

# ── STEP 4: Git init and push ──────────────────────────────────
# Only run this AFTER you've tested locally and confirmed it works!

<#  --- UNCOMMENT WHEN READY TO PUSH ---

Set-Location $ProjectRoot

# Initialise git (skip if already a repo)
git init
git remote add origin https://github.com/nyanisokhoza-code/randwise.git

# Or if remote already exists:
# git remote set-url origin https://github.com/nyanisokhoza-code/randwise.git

git add .
git commit -m "Refactor: split monolithic app.html into css/ + js/ modules

- css/app.css: all styles (228 lines)
- js/auth-redirect.js: pre-paint auth/OTP handler
- js/sw-init.js: service worker registration
- js/main.js: core app logic, Supabase, budget, transactions
- js/features.js: upgrade wall, tier management, refresh
- js/init.js: intro tour, tab bar setup, final init
- docs/PROGRESS.md: project tracker
- app.html: clean HTML shell (2293 lines, was 10468)"

git push -u origin main

Write-Host "✅ Pushed to GitHub!" -ForegroundColor Green
#>

Write-Host "Done! Check PROGRESS.md for next steps." -ForegroundColor Cyan
