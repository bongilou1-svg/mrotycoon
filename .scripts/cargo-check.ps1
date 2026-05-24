# Cargo check para validar Tauri toolchain. Limpia target/ + Cargo.lock antes.

$env:Path = "C:\Users\bongi\mingw64\bin;C:\Users\bongi\.cargo\bin;" + $env:Path
Set-Location "C:\Users\bongi\mrotycoon\src-tauri"

Write-Host "=== cargo update -p yoke ==="
cargo update -p yoke 2>&1 | Select-Object -Last 10

Write-Host "=== cargo check ==="
cargo check --message-format=short 2>&1 | Select-Object -Last 40
$exitCode = $LASTEXITCODE
Write-Host "=== exit code: $exitCode ==="
exit $exitCode
