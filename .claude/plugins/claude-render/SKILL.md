---
name: claude-render
description: >
  Renderiza el juego MRO Tycoon a PNG (Chrome headless, incluido el canvas Pixi WebGL) para
  que el agente PUEDA VER el resultado real y iterar visualmente (render → leo → corrijo →
  render). Incluye triangulación foto→coordenadas normalizadas OSM. Usar SIEMPRE que haya que
  ajustar algo VISUAL del mapa/UI (posición de oficina, carretera, furgo, stands, contraste,
  layout) en vez de adivinar coordenadas a ojo desde un screenshot.
---

# claude-render — ver el render del juego, no adivinarlo

## Por qué existe
El mapa del juego es un canvas **Pixi/WebGL**. El agente no puede "ver" WebGL con sus gates
normales (node --check solo dice si carga, no CÓMO se ve). Sin esto, ajustar posiciones del
mapa = adivinar coords de fotos del usuario y fallar una y otra vez. Este plugin cierra el
bucle: **rasteriza la vista real a PNG y el agente lo lee**.

## Requisitos (verificados en esta máquina)
- **Google Chrome instalado** (`C:/Program Files/Google/Chrome/Application/chrome.exe`). Se usa
  `chrome --headless=new --screenshot` — NO hace falta puppeteer/playwright/canvas/sharp.
- El bundle (`builds/v0.6-line-mro.html`) expone `window.__mroDebug` (hook de debug añadido en
  `.scripts/build-vanilla.mjs`, al final del APP_JS). Si el hook no está, re-añadirlo.

## Hook del juego: `window.__mroDebug`
- `skipWizard()` — quita el wizard de nueva partida (tapa el mapa al arrancar).
- `goView(tab)` — salta wizard + cambia de vista: "map" | "operations" | "office" | "schedule".
- `zoomIn(n)` / `zoomOut(n)` / `fitAll()` — cámara del mapa (n = nº de pasos).
- `seedVan(simStandId)` — siembra un mecánico viajando a un stand para VER EL FURGO en el mapa
  (si no, el furgo no se dibuja porque nadie viaja). Ej: `seedVan("H1-S1")`.
- `state()` — devuelve {activeTab, newGameStep, zoom, airplanes, mechanics}.

## Uso

### 1. Renderizar una vista a PNG y verla
```
node .claude/plugins/claude-render/scripts/shoot.mjs builds/v0.6-line-mro.html _render.png --view map --wait 7000
```
Luego `Read _render.png`. Flags:
- `--view map|operations|office|schedule` (default map)
- `--seed-van H1-S1` → siembra furgo viajando a ese stand y captura el mapa
- `--eval "window.__mroDebug.zoomIn(5)"` → ejecuta JS arbitrario tras cargar (zoom, etc.)
- `--w 1600 --h 1000` tamaño · `--wait 7000` ms para que Pixi monte (subir si sale negro)

Ejemplo: mapa acercado al apron →
`shoot.mjs builds/v0.6-line-mro.html _r.png --view map --eval "window.__mroDebug.zoomIn(5)"`

Ejemplo: ver el furgo moviéndose →
`shoot.mjs builds/v0.6-line-mro.html _r.png --seed-van H1-S2 --eval "window.__mroDebug.zoomIn(5)"`

### 2. Triangular un punto de una foto → coordenada OSM normalizada
Cuando el usuario marca algo en una foto (ej. "la oficina va aquí"), conviértelo a coord real
del juego usando 2-3 puntos de referencia conocidos (stands, cuyas coords OSM sabemos):
```
node .claude/plugins/claude-render/scripts/triangulate.mjs \
  --ref "PXx,PXy=NORMx,NORMy" --ref "..." --ref "..." --point "PXx,PXy"
```
Devuelve `{normalized:[nx,ny], fitErrorNorm}`. fitError bajo (<0.01) = fiable.

Coords OSM normalizadas conocidas de OVD (de ovd.paths.json, para usar como refs):
- Stands (tip): 351=[0.477,0.559] 451=[0.487,0.565] 551=[0.513,0.580] 651=[0.532,0.592]
  751=[0.561,0.610] 352=[0.584,0.621] 452=[0.607,0.637]
- Terminal bbox: x[0.479–0.566] y[0.617–0.698], centroide [0.517,0.660]

## Flujo recomendado para ajustar el mapa (fino-fino)
1. `shoot.mjs --view map --eval "window.__mroDebug.zoomIn(5)"` → Read PNG → ver estado actual.
2. Si el usuario marca posiciones en una foto suya: `triangulate.mjs` con refs de stands → coords.
3. Editar `pixi-driver.ts` (renderF5DScaffold: OFFICE_NORM, spine/ramales, furgo).
4. `node .scripts/build-vanilla.mjs v0.6-line-mro.html` (rebuild).
5. Volver a 1 y comparar. Repetir hasta que coincida con lo que pide el usuario.
6. Mostrar el PNG final al usuario para validación antes de commitear.

## Limpieza
Los PNG `_render.png` / `_r.png` y `_shoot_tmp.html` son temporales — borrarlos antes de
commitear (no van al repo). El plugin (`.claude/plugins/claude-render/`) sí se versiona.

## Notas / límites honestos
- Headless WebGL: en esta máquina Chrome rasteriza el canvas Pixi OK con `--disable-gpu`
  (SwiftShader). Si algún día sale el mapa en negro, subir `--wait` o quitar `--disable-gpu`.
- El render arranca una partida LIMPIA (Día 1, apron casi vacío). Para tráfico/furgo usar
  `--seed-van` o `--eval` que avance el reloj.
- Reusable en otros aeropuertos: cambia el OSM activo; las coords de refs salen de su .paths.json.
