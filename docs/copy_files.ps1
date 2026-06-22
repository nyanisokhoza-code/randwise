# ═══════════════════════════════════════════════════════════════
# MyRandWise — Copy supporting files into the project
# Run this from anywhere in PowerShell
# ═══════════════════════════════════════════════════════════════

# ── Paths ──────────────────────────────────────────────────────
$Source = "C:\Users\Bongane Khoza\Documents\Projects\randwise-local\MRW Github pages and files"
$Dest   = "C:\Users\Bongane Khoza\Downloads\BusinessOS clean\Systems\Kasi Digital\randwise_organised\randwise"

Write-Host ""
Write-Host "Copying from: $Source" -ForegroundColor Cyan
Write-Host "Copying to:   $Dest" -ForegroundColor Cyan
Write-Host ""

# ── Files to copy ──────────────────────────────────────────────
$Files = @(
    "sw.js",
    "manifest.json",
    "CNAME",
    "404.html",
    "reset-password.html",
    "about.html",
    "icon_192.png"
)

foreach ($f in $Files) {
    $src = Join-Path $Source $f
    if (Test-Path $src) {
        Copy-Item $src -Destination $Dest -Force
        Write-Host "  OK  $f" -ForegroundColor Green
    } else {
        Write-Host "  ??  $f  (not found at source — copy manually)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Done! Your project folder now contains:" -ForegroundColor Cyan
Get-ChildItem $Dest | Select-Object Name, Length | Format-Table -AutoSize
