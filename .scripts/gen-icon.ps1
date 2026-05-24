# Genera un PNG 1024x1024 placeholder (fondo azul aeronáutico + "MRO" blanco)
# y luego ejecuta `npx tauri icon` para producir toda la suite (ico, icns, png varios).

$projDir = "C:\Users\bongi\Documents\Claude\Projects\MROTYC~1"
$tauriIconsDir = Join-Path $projDir "src-tauri\icons"
$sourcePng = Join-Path $tauriIconsDir "_source-1024.png"

# Crear directorio si no existe
New-Item -ItemType Directory -Force -Path $tauriIconsDir | Out-Null

Add-Type -AssemblyName System.Drawing

# Bitmap 1024x1024
$size = 1024
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)

# Fondo (gradiente simple: azul oscuro a azul aeronáutico)
$rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    [System.Drawing.Color]::FromArgb(255, 13, 17, 23),     # --bg
    [System.Drawing.Color]::FromArgb(255, 22, 90, 160),    # azul aeronáutico oscuro
    [System.Drawing.Drawing2D.LinearGradientMode]::Diagonal
)
$g.FillRectangle($brush, $rect)

# Texto "MRO"
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$font = New-Object System.Drawing.Font("Arial Black", 280, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 230, 233, 239))  # --text

$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center

$g.DrawString("MRO", $font, $textBrush, [System.Drawing.RectangleF]::new(0, 0, $size, $size), $sf)

# Detalle: barra de "scan line" abajo, color acento
$accentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 77, 163, 255))
$g.FillRectangle($accentBrush, 80, $size - 120, $size - 160, 24)

# Guardar
$bmp.Save($sourcePng, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
$brush.Dispose()
$textBrush.Dispose()
$accentBrush.Dispose()
$font.Dispose()

Write-Host "PNG fuente generado: $sourcePng"

# Ahora ejecutar tauri icon para producir toda la suite
Push-Location $projDir
try {
    & npx --yes @tauri-apps/cli icon $sourcePng 2>&1 | ForEach-Object {
        Write-Host "  $_"
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Iconos generados:"
Get-ChildItem $tauriIconsDir | ForEach-Object {
    Write-Host "  $($_.Name) ($([Math]::Round($_.Length/1KB,1)) KB)"
}
