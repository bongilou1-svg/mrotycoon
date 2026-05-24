# Descarga winlibs MinGW-w64 latest (portable, sin admin), descomprime en %USERPROFILE%\mingw64,
# y añade bin al PATH del usuario.

$ErrorActionPreference = "Stop"

$mingwDir = Join-Path $env:USERPROFILE "mingw64"
$zipPath = Join-Path $env:TEMP "winlibs.zip"

# Si ya está descomprimido, skip
if (Test-Path (Join-Path $mingwDir "bin\gcc.exe")) {
    Write-Host "MinGW ya presente en $mingwDir"
} else {
    Write-Host "Consultando GitHub API por último release de winlibs_mingw..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $rel = Invoke-RestMethod "https://api.github.com/repos/brechtsanders/winlibs_mingw/releases/latest"
    Write-Host "Release: $($rel.tag_name)"
    # Filtrar asset: 64-bit, posix-seh, ucrt, zip (no 7z, no source)
    $asset = $rel.assets | Where-Object {
        $_.name -match "x86_64-posix-seh.*ucrt.*\.zip$" -and $_.name -notmatch "source|crt-debug"
    } | Sort-Object name | Select-Object -First 1
    if (-not $asset) {
        Write-Host "No encuentro asset ucrt; probando msvcrt..."
        $asset = $rel.assets | Where-Object {
            $_.name -match "x86_64-posix-seh.*\.zip$" -and $_.name -notmatch "source|crt-debug"
        } | Sort-Object name | Select-Object -First 1
    }
    if (-not $asset) {
        throw "No encontré asset compatible. Releases disponibles: $($rel.assets.name -join ', ')"
    }
    Write-Host "Descargando $($asset.name) ($([Math]::Round($asset.size/1MB,1)) MB)..."
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zipPath -UseBasicParsing
    Write-Host "Descomprimiendo en $env:USERPROFILE\..."
    # El ZIP de winlibs contiene una carpeta raíz (típicamente "mingw64").
    Expand-Archive -Path $zipPath -DestinationPath $env:USERPROFILE -Force
    Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
    Write-Host "OK"
}

# Verificar
$gcc = Join-Path $mingwDir "bin\gcc.exe"
$dlltool = Join-Path $mingwDir "bin\dlltool.exe"
if ((Test-Path $gcc) -and (Test-Path $dlltool)) {
    & $gcc --version | Select-Object -First 1
    Write-Host "dlltool: $dlltool"
} else {
    throw "gcc.exe o dlltool.exe no presentes tras descomprimir. Contenido: $(Get-ChildItem $mingwDir | Select-Object -ExpandProperty Name)"
}

# Añadir al PATH user-scope si no está ya
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
$mingwBin = Join-Path $mingwDir "bin"
if ($userPath -notlike "*$mingwBin*") {
    [System.Environment]::SetEnvironmentVariable("Path", "$mingwBin;$userPath", "User")
    Write-Host "Añadido $mingwBin al PATH del usuario."
} else {
    Write-Host "MinGW bin ya en PATH."
}

Write-Host "Listo."
