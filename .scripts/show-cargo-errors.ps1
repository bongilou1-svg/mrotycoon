# Filtra los errores del log de tauri dev.
$log = Get-Content (Join-Path $env:TEMP "tauri-dev-err.log") -ErrorAction SilentlyContinue
if (-not $log) { Write-Host "Sin log"; return }

# Quitar códigos ANSI
$clean = $log | ForEach-Object { ($_ -replace "\x1b\[[0-9;]*m", "") }

# Mostrar líneas con "error" o "note" o "could not"
$clean | Where-Object {
    $_ -match "error" -or $_ -match "could not" -or $_ -match "ld\.lld" -or $_ -match "fatal"
} | ForEach-Object { Write-Host $_ }
