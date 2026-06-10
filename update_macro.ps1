# ============================================================================
# MACRO DATA REFRESH HELPER
# ============================================================================
# Usage: Edit the values below, then run this script to update all 6 language files
# Run from: C:\Users\Administrator\Desktop\rishi-terminal
# ============================================================================

Set-Location "C:\Users\Administrator\Desktop\rishi-terminal"

Write-Host "`n========== MACRO DATA REFRESH HELPER ==========" -ForegroundColor Cyan
Write-Host "This script updates macro indicators across all 6 language files" -ForegroundColor Yellow
Write-Host "Only English narrative changes need manual editing in individual files`n" -ForegroundColor Yellow

# ── STEP 1: EDIT THESE VALUES ──────────────────────────────────────────────
Write-Host "STEP 1: Review and update these values from latest RBI/MOSPI releases:" -ForegroundColor Green

$newValues = @{
    # Inflation Indicators
    CPI_Value = "4.85"
    CPI_Trend = "-0.22% from last month"
    
    CoreCPI_Value = "3.42"
    CoreCPI_Trend = "-0.08% MoM"
    
    WPI_Value = "2.68"
    WPI_Trend = "+0.18% from May"
    
    # Monetary Policy
    RepoRate_Value = "6.25"
    RepoRate_Trend = "Cut by 25bps - data-driven normalization"
    
    Yield10Y_Value = "6.92"
    Yield10Y_Trend = "+8bps in 30 days"
    
    # Growth & Money
    GDP_Value = "6.7"
    GDP_Trend = "vs 6.4% prior year"
    
    M3_Value = "10.8"
    M3_Trend = "+0.6% from Q1"
    
    # Fiscal & External
    DebtGDP_Value = "85.2"
    DebtGDP_Trend = "+1.2% from FY25"
    
    CurrentAccount_Value = "-0.9"
    CurrentAccount_Trend = "Improving from -1.2%"
    
    ForexReserves_Value = "658"
    ForexReserves_Trend = "+34Bn from Jan 2025"
    
    # Dates
    AsOfMonth = "Jun 2026"  # Most recent data month
}

# Show current values
Write-Host "`nValues to be applied:" -ForegroundColor Cyan
$newValues.GetEnumerator() | Sort-Object Name | ForEach-Object {
    Write-Host "  $($_.Key) = $($_.Value)" -ForegroundColor White
}

# ── STEP 2: CONFIRMATION ───────────────────────────────────────────────────
Write-Host "`n" -NoNewline
$confirm = Read-Host "Apply these values to all 6 language files? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Aborted. No changes made." -ForegroundColor Red
    exit
}

# ── STEP 3: BACKUP ─────────────────────────────────────────────────────────
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$backupDir = "C:\Users\Administrator\Desktop\rishi-backups\macro_refresh_$timestamp"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

$files = @(
    "data\economyPlus\macroData.ts",
    "data\economyPlus\macroData.hi.ts",
    "data\economyPlus\macroData.bn.ts",
    "data\economyPlus\macroData.mr.ts",
    "data\economyPlus\macroData.te.ts",
    "data\economyPlus\macroData.ta.ts"
)

foreach ($f in $files) {
    if (Test-Path $f) {
        Copy-Item $f "$backupDir\$(Split-Path $f -Leaf)" -Force
    }
}
Write-Host "✓ Backup created at $backupDir" -ForegroundColor Green

# ── STEP 4: APPLY UPDATES ──────────────────────────────────────────────────
$utf8 = New-Object System.Text.UTF8Encoding $false

function Update-MacroIndicator {
    param(
        [string]$Content,
        [string]$Label,
        [string]$NewValue,
        [string]$NewTrend
    )
    
    # Update value - match the exact pattern
    $valuePattern = "(label: '$Label'[\s\S]*?value: )'[^']*'"
    $Content = $Content -replace $valuePattern, "`${1}'$NewValue'"
    
    # Update trend
    $trendPattern = "(label: '$Label'[\s\S]*?trendValue: )'[^']*'"
    $Content = $Content -replace $trendPattern, "`${1}'$NewTrend'"
    
    return $Content
}

foreach ($file in $files) {
    if (-not (Test-Path $file)) {
        Write-Host "  ⚠ Skipping $file (not found)" -ForegroundColor Yellow
        continue
    }
    
    $content = [System.IO.File]::ReadAllText((Resolve-Path $file).Path)
    
    # Update each indicator
    $content = Update-MacroIndicator $content "CPI Inflation" $newValues.CPI_Value $newValues.CPI_Trend
    $content = Update-MacroIndicator $content "Core CPI" $newValues.CoreCPI_Value $newValues.CoreCPI_Trend
    $content = Update-MacroIndicator $content "WPI Inflation" $newValues.WPI_Value $newValues.WPI_Trend
    $content = Update-MacroIndicator $content "RBI Repo Rate" $newValues.RepoRate_Value $newValues.RepoRate_Trend
    $content = Update-MacroIndicator $content "10Y Govt Bond" $newValues.Yield10Y_Value $newValues.Yield10Y_Trend
    $content = Update-MacroIndicator $content "GDP Growth" $newValues.GDP_Value $newValues.GDP_Trend
    $content = Update-MacroIndicator $content "M3 Money Supply" $newValues.M3_Value $newValues.M3_Trend
    $content = Update-MacroIndicator $content "Govt Debt / GDP" $newValues.DebtGDP_Value $newValues.DebtGDP_Trend
    $content = Update-MacroIndicator $content "Current Account" $newValues.CurrentAccount_Value $newValues.CurrentAccount_Trend
    $content = Update-MacroIndicator $content "Forex Reserves" $newValues.ForexReserves_Value $newValues.ForexReserves_Trend
    
    # Update asOf dates
    $content = $content -replace "asOf: '[A-Za-z]+ [0-9]{4}'", "asOf: '$($newValues.AsOfMonth)'"
    
    [System.IO.File]::WriteAllText((Resolve-Path $file).Path, $content, $utf8)
    Write-Host "  ✓ Updated $(Split-Path $file -Leaf)" -ForegroundColor Green
}

# ── STEP 5: BUILD TEST ─────────────────────────────────────────────────────
Write-Host "`nBuilding to verify..." -ForegroundColor Cyan
Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
Remove-Item -Force "*.tsbuildinfo" -Recurse -ErrorAction SilentlyContinue
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ Build successful" -ForegroundColor Green
    
    # Show git status
    Write-Host "`nGit status:" -ForegroundColor Yellow
    git status --short
    
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "  1. Review changes: git diff data/economyPlus/" -ForegroundColor White
    Write-Host "  2. Commit: git add -A && git commit -m 'chore(macro): update to [Month Year] data'" -ForegroundColor White
    Write-Host "  3. Push: git push origin main" -ForegroundColor White
    Write-Host "`n  Backup location: $backupDir" -ForegroundColor Gray
} else {
    Write-Host "`n✗ Build failed - review errors above" -ForegroundColor Red
    Write-Host "  Backup available at: $backupDir" -ForegroundColor Yellow
}