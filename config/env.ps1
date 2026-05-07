$Settings = Get-Content "C:\Users\Administrator\Desktop\rishi-terminal\config\settings.json" | ConvertFrom-Json
$env:RISHI_ROOT = "C:\Users\Administrator\Desktop\rishi-terminal"
$env:RISHI_LOGS = $Settings.paths.logs
$env:RISHI_VERSION = $Settings.terminal.version
