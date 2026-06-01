---
name: mro-map-render
description: >
  Específico de mrotycoon: renderiza el MAPA del juego (canvas Pixi/WebGL) a PNG para verlo e
  iterar, usando el hook window.__mroDebug del bundle (saltar wizard, ir a una vista, zoom,
  sembrar furgo). Complementa al skill GLOBAL `render-page` con lo propio del juego. Úsalo al
  ajustar algo visual del mapa/UI del juego (oficina, carretera/furgo, stands, contraste) en
  vez de adivinar coords de screenshots.
---

# mro-map-render — ver e iterar el mapa de MRO Tycoon

Skill de PROYECTO (solo mrotycoon). Para la capacidad genérica "render cualquier web a PNG",
usa el skill global `render-page` (~/.claude/skills/render-page). Esto añade lo del juego.

## Pieza clave: hook `window.__mroDebug` (en el bundle)
Vive al final del APP_JS de `.scripts/build-vanilla.mjs` (tras el setInterval de perf). En scope
del IIFE → accede a game/activeTab/newGameStep/mapDriver (locales, no window). Aislado, solo
captura. Si falta, re-añadirlo. Métodos:
- `skipWizard()` · `goView("map"|"operations"|"office"|"schedule")`
- `zoomIn(n)` · `zoomOut(n)` · `fitAll()` · `focusNorm(nx,ny,zoom)` (centrar en coord OSM)
- `seedVan(simStandId)` — siembra un mecánico viajando para VER el furgo (si no, no se dibuja)
- `state()` — {activeTab, newGameStep, zoom, airplanes, mechanics}

## Scripts
- `shoot.mjs <html> <out.png> [--view map|...] [--seed-van H1-S1] [--eval "<js>"] [--w --h --wait]`
  Inyecta un <script> que llama a __mroDebug tras load y Chrome headless rasteriza. NO toca el
  build original. Ej: `shoot.mjs builds/v0.6-line-mro.html _r.png --seed-van H1-S2 --eval
  "window.__mroDebug.zoomIn(8)" --w 900 --h 620`.
- `triangulate.mjs --ref "px,py=nx,ny" (x2-3) --point "px,py"` → coord OSM normalizada por
  ajuste afín. Refs = stands conocidos. fitErrorNorm<0.01 = fiable.

## Coords OSM normalizadas OVD (refs, de ovd.paths.json)
Stands tip: 351=[0.477,0.559] 451=[0.487,0.565] 551=[0.513,0.580] 651=[0.532,0.592]
751=[0.561,0.610] 352=[0.584,0.621] 452=[0.607,0.637]. Terminal bbox x[0.479-0.566]
y[0.617-0.698] centroide [0.517,0.660]. Oficina actual OVD=[0.486,0.628].

## Flujo para afinar el mapa (fino-fino, viéndolo)
1. `node .scripts/build-vanilla.mjs v0.6-line-mro.html` (si tocaste pixi-driver/build).
2. `node .claude/skills/mro-map-render/shoot.mjs builds/v0.6-line-mro.html _r.png --view map
   --eval "window.__mroDebug.zoomIn(7)" --w 900 --h 620 --wait 7500` → Read `_r.png`.
3. Si Dani marca un punto en una foto suya → `triangulate.mjs` con refs de stands → coord.
4. Editar pixi-driver.ts (renderF5DScaffold: OFFICE_NORM, spine/ramales, furgo).
5. Rebuild + re-shoot + comparar. Enseñar PNG final a Dani antes de commitear.

## Notas
- El emoji NO se usa en canvas Pixi (da tofu/cuadrado). Todo glyph del mapa = vectores Graphics.
- Borrar los `_r.png`/`_render.png` y `_shoot_tmp.html` antes de commitear (temporales).
- `focusNorm` aún no clava el centrado perfecto (el apply() del tick puede repintar la cámara);
  como apaño usar fitAll + zoomIn y canvas pequeño para que la preview se vea grande.
