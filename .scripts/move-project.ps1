# Mueve físicamente el proyecto a un path sin espacios (C:\Users\bongi\mrotycoon)
# y deja una junction en el path original para preservar Write tools.
#
# Estado esperado al arrancar:
#   - C:\Users\bongi\mrotycoon              -> NO existe (o es junction antigua)
#   - "C:\Users\bongi\Documents\Claude\Projects\MRO tycoon" -> carpeta REAL del proyecto
# Estado final:
#   - C:\Users\bongi\mrotycoon              -> carpeta REAL del proyecto
#   - "C:\Users\bongi\Documents\Claude\Projects\MRO tycoon" -> junction al real

$origPath = "C:\Users\bongi\Documents\Claude\Projects\MRO tycoon"
$newPath  = "C:\Users\bongi\mrotycoon"

Write-Host "Pre-checks:"
Write-Host "  newPath exists?  $(Test-Path $newPath)"
Write-Host "  origPath exists? $(Test-Path $origPath)"

# Paso 1: si mrotycoon existe (junction vieja), borrarla
if (Test-Path $newPath) {
    $item = Get-Item $newPath -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
        Write-Host "Borrando junction vieja en $newPath"
        cmd /c "rmdir `"$newPath`""
    } else {
        Write-Host "ERROR: $newPath ya existe y NO es junction. Aborto."
        exit 1
    }
}

# Paso 2: comprobar que origPath es carpeta real (no junction)
if (-not (Test-Path $origPath)) {
    Write-Host "ERROR: $origPath no existe. Aborto."
    exit 1
}
$origItem = Get-Item $origPath -Force
if ($origItem.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    Write-Host "ERROR: $origPath es junction, no carpeta real. Aborto."
    exit 1
}

# Paso 3: move físico
Write-Host "Moviendo $origPath -> $newPath"
Move-Item -LiteralPath $origPath -Destination $newPath -Force
Write-Host "  OK"

# Paso 4: crear junction en el path original
Write-Host "Creando junction $origPath -> $newPath"
cmd /c "mklink /J `"$origPath`" `"$newPath`""

# Verificar
Write-Host ""
Write-Host "Verificacion final:"
Write-Host "  CLAUDE.md via nuevo path:    $(Test-Path (Join-Path $newPath 'CLAUDE.md'))"
Write-Host "  CLAUDE.md via junction:      $(Test-Path (Join-Path $origPath 'CLAUDE.md'))"
$origCheck = Get-Item $origPath -Force
$isJunction = [bool]($origCheck.Attributes -band [IO.FileAttributes]::ReparsePoint)
Write-Host "  origPath es junction?        $isJunction"
