# Lanza rustup-init.exe en background, redirige a logs en TEMP.
$rustup = Join-Path $env:TEMP "rustup-init.exe"
$out    = Join-Path $env:TEMP "rustup-out.log"
$err    = Join-Path $env:TEMP "rustup-err.log"

Start-Process -FilePath $rustup `
    -ArgumentList @(
        "-y",
        "--default-host", "x86_64-pc-windows-gnu",
        "--default-toolchain", "stable",
        "--profile", "minimal",
        "--no-modify-path"
    ) `
    -RedirectStandardOutput $out `
    -RedirectStandardError  $err `
    -WindowStyle Hidden

Start-Sleep -Seconds 1
$proc = Get-Process rustup-init -ErrorAction SilentlyContinue
if ($proc) {
    Write-Host "Lanzado. PID=$($proc.Id)"
} else {
    Write-Host "ERROR: rustup-init no aparece en process list."
    if (Test-Path $err) { Get-Content $err -Tail 20 }
}
