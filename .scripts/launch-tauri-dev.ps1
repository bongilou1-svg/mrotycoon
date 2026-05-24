# Lanza `npm run tauri dev` en background con cargo + mingw en PATH.
# IMPORTANTE: usamos junction C:\Users\bongi\mrotycoon (sin espacios) en lugar
# del path original "MRO tycoon" porque lld se rompe con espacios en paths.
# Logs en %TEMP%\tauri-dev-{out,err}.log.

$projDir = "C:\Users\bongi\mrotycoon"
$cargoBin = "C:\Users\bongi\.cargo\bin"
$mingwBin = "C:\Users\bongi\mingw64\bin"
$outLog = Join-Path $env:TEMP "tauri-dev-out.log"
$errLog = Join-Path $env:TEMP "tauri-dev-err.log"

# Limpiar logs previos
foreach ($f in @($outLog, $errLog)) {
    if (Test-Path $f) { Remove-Item $f -Force -ErrorAction SilentlyContinue }
}

# Forzar PATH local con cargo y mingw al frente
$env:Path = "$mingwBin;$cargoBin;$env:Path"

# Sanity checks rápidos
foreach ($exe in "cargo.exe", "rustc.exe", "gcc.exe", "ld.lld.exe", "npm.cmd") {
    $cmd = Get-Command $exe -ErrorAction SilentlyContinue
    if (-not $cmd) { Write-Host "  WARN $exe no encontrado en PATH actual" }
}

# Lanzamos en background desde la junction (sin espacios)
Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "npm run tauri dev" `
    -WorkingDirectory $projDir `
    -RedirectStandardOutput $outLog `
    -RedirectStandardError $errLog `
    -WindowStyle Hidden

Start-Sleep -Seconds 3

$any = Get-Process -Name node, cmd, cargo, rustc -ErrorAction SilentlyContinue
if ($any) {
    Write-Host "Procesos activos:"
    $any | Select-Object ProcessName, Id | Format-Table -AutoSize | Out-String | Write-Host
} else {
    Write-Host "Sin procesos esperados. Logs iniciales:"
    if (Test-Path $errLog) { Get-Content $errLog -Tail 20 }
    if (Test-Path $outLog) { Get-Content $outLog -Tail 20 }
}
