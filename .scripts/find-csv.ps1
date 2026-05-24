# Busca we_template.csv en todo el sistema accesible.
Write-Host "=== Drives ==="
Get-PSDrive -PSProvider FileSystem | Select-Object Name, @{N='UsedGB';E={[math]::Round($_.Used/1GB,1)}}, @{N='FreeGB';E={[math]::Round($_.Free/1GB,1)}}, Root | Format-Table -AutoSize | Out-String | Write-Host

Write-Host "=== Searching we_template.csv in C:\Users\bongi ==="
$found = Get-ChildItem -Path "C:\Users\bongi" -Filter "we_template.csv" -Recurse -ErrorAction SilentlyContinue
if ($found) {
    foreach ($f in $found) { Write-Host $f.FullName }
} else {
    Write-Host "(no encontrado en C:\Users\bongi)"
}

Write-Host "=== Searching MRO_Tycoon directories ==="
$dirs = Get-ChildItem -Path "C:\Users\bongi" -Directory -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "MRO_Tycoon|mrotycoon_legacy|mro_tycoon_unity" }
if ($dirs) {
    foreach ($d in $dirs) { Write-Host $d.FullName }
} else {
    Write-Host "(no encontrado MRO_Tycoon legacy dir)"
}

Write-Host "=== Searching old_versions ==="
if (Test-Path "D:\Documents\old_versions\") { Write-Host "D:\Documents\old_versions existe" }
elseif (Test-Path "C:\Documents\old_versions\") { Write-Host "C:\Documents\old_versions existe" }
else { Write-Host "(no old_versions)" }
