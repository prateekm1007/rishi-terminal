function prompt {
    Write-Host "
[$(Get-Date -Format 'HH:mm:ss')] " -NoNewline -ForegroundColor DarkGray
    Write-Host "$env:USERNAME " -NoNewline -ForegroundColor Cyan
    Write-Host "@ " -NoNewline -ForegroundColor White
    Write-Host "$((Get-Location).Path) " -NoNewline -ForegroundColor Yellow
    Write-Host ">" -NoNewline -ForegroundColor Green
    return " "
}
