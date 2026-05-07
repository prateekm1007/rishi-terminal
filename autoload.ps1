$TerminalRoot = "C:\Users\Administrator\Desktop\rishi-terminal"
$AutoFiles = @("config\settings.json","config\env.ps1","modules\functions.ps1","modules\aliases.ps1","modules\prompt.ps1","startup\init.ps1")
foreach ($file in $AutoFiles) {
    $fullPath = Join-Path $TerminalRoot $file
    if (Test-Path $fullPath) { . $fullPath }
}
