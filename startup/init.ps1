Write-Log "Terminal session started | User: $env:USERNAME"
Clear-Host
Write-Host "============================================" -ForegroundColor DarkCyan
Write-Host "   RISHI TERMINAL v$env:RISHI_VERSION       " -ForegroundColor Cyan
Write-Host "   User    : $env:USERNAME                  " -ForegroundColor White
Write-Host "   Time    : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
Write-Host "============================================" -ForegroundColor DarkCyan
Write-Host "
[RISHI TERMINAL READY]
" -ForegroundColor Green
Set-Location $env:RISHI_ROOT
