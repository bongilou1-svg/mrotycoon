# Añade MinGW bin al PATH del usuario y al de la sesión actual.
$mingw = "C:\Users\bongi\mingw64\bin"
$cargo = "C:\Users\bongi\.cargo\bin"

$up = [Environment]::GetEnvironmentVariable("Path", "User")
$changed = $false

foreach ($p in @($mingw, $cargo)) {
    if ($up -notlike "*$p*") {
        $up = "$p;$up"
        $changed = $true
        Write-Host "+ $p"
    } else {
        Write-Host "= $p (ya estaba)"
    }
}

if ($changed) {
    [Environment]::SetEnvironmentVariable("Path", $up, "User")
}

# Verificación final: lanzar un cmd nuevo y ver si encuentran los .exe
$env:Path = "$mingw;$cargo;$env:Path"
Write-Host ""
Write-Host "Verificación con PATH refrescado:"
foreach ($exe in "gcc.exe", "dlltool.exe", "ld.exe", "cargo.exe", "rustc.exe") {
    $cmd = Get-Command $exe -ErrorAction SilentlyContinue
    if ($cmd) {
        Write-Host "  OK   $exe -> $($cmd.Source)"
    } else {
        Write-Host "  FAIL $exe NO ENCONTRADO"
    }
}
