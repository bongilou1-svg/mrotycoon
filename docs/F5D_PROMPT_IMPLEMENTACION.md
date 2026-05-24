# F5D — Prompt copy-paste para implementación

> Pega esto al arrancar el próximo hilo Cowork de Fase 5D. Self-contained, no necesita explicación adicional.

---

## Contexto rápido

Soy Dani, dev solo de **MRO Tycoon** (tycoon aeronáutico para Steam, single-player, vanilla HTML+JS, futuro empaque Tauri). Build actual: `builds/v0.5g-final.html` (271 KB, 803/803 tests verdes). Fases 0–5C cerradas, extras 5B-α/δ/ε/γ + 5C eventos + Stage 2 mecánica completa + WO descripciones realistas + save v7 done.

Estoy arrancando **Fase 5D — Mapa esquemático animado con Pixi v8**. Time-box: 2 semanas. Va ANTES de Fase 6 porque los screenshots/trailer de la Steam page se montan con este asset.

## Decisión cerrada (NO RE-LITIGAR)

**Mapa F5D = geometría real OSM + paleta CIC dark + elementos game superpuestos.**

- Validada el 2026-05-24 con mockup OVD aprobado tal cual.
- Detalle completo en memoria: `project_mro_tycoon_f5d_map_osm.md`
- North-star visual obligatorio: `docs/F5D_mapa_referencia_visual.svg` — abrir y mantener referenciado durante toda la implementación. Si lo que estás pintando no se parece a esto, párate.

## Pipeline en 6 bloques P-α a P-ζ

### P-α — Pixi v8 scaffolding + sync layer (3-4h)

- Añadir Pixi v8 al bundle vanilla (esbuild IIFE — ya hay precedente en el repo para libs externas, ver cómo se metió Chart.js en 5B).
- Crear `src/map/PixiMap.js`: clase con `init(canvas)`, `update(gameState)`, `destroy()`.
- Canvas montado dentro del **panel Hangar existente**, sustituyendo la visualización actual SVG.
- Sync layer: `gameState → renderState` con diff determinístico cada tick. Cero divergencia state ↔ render.
- Placeholder visual: fondo navy `#0a1428` + grid sutil + texto "F5D scaffold OK". Sin OSM aún.
- Tests: añadir ~5 tests PixiMap (mock canvas, verificar init/update/destroy lifecycle).

### P-β/γ/δ-min — Pase rico OSM + aviones + furgo (2-3h, opción 1 ya decidida)

**Descarga OSM (una sola vez, committeado como asset):**

```bash
curl -G "https://overpass-api.de/api/interpreter" \
  --data-urlencode 'data=[out:json][timeout:25];(way["aeroway"](43.554,-6.045,43.575,-6.022);way["building"](43.554,-6.045,43.575,-6.022););out geom;' \
  -o src/assets/airports/ovd.json
```

**Convertidor `scripts/osm_to_pixi.py`:**

- Lee `src/assets/airports/<icao>.json`
- Proyección equirectangular: `x = (lon - lon_min) * cos(lat_center * π/180) * SCALE`, `y = (lat_max - lat) * SCALE`
- Clasifica ways por tag: `aeroway=runway|taxiway|apron|terminal|hangar`, `building=*` como fallback de estructuras no taggeadas
- Calcula bbox, normaliza coords a viewport 680x500
- Genera `src/assets/airports/<icao>.paths.json` con arrays de paths por tipo

**Render Pixi inicial:**

- Runway tarmac `#3aa9ff` stroke 8-9 opacity 0.45 + highlight central `#a8dafc` stroke 2 + dashes centerline `#0a1428` + thresholds
- Taxiways `#3aa9ff` stroke 1 dashed `3 5` opacity 0.55
- Apron polígono `#0d1c33` stroke `#1c2d4a`
- Terminal y hangares `#13243f` fill stroke `#2c4870`
- Stands inactivos `#0d1c33`/`#2c4870`, activos `#2a1a08`/`#f5b945` + halo (circle r=6-7 fill `#f5b945` opacity 0.2 detrás)
- Aviones simples: dot cyan `#a8dafc` r=3.5 + halo `#3aa9ff` opacity 0.22 r=10 + trail decay
- Furgo recorre el **road network REAL del OSM** (taxiway service + roads `highway=service`) hacia el stand asignado, no callecitas inventadas

### P-δ completo — Polish visual avanzado (2-3h)

- Bloom WebGL sutil global (Pixi Filter, opacity controlada — NO neon, NO arcade)
- Partículas "data" schematic en taxiways activos (no fuego, no combustión)
- Burst visual al cerrar check (stand ámbar → pulso → vuelve a dim)
- Compass N, atribución OSM `(c) OpenStreetMap contributors` esquina inferior-derecha en `#3d6f9d` 11px (OBLIGATORIO — ODbL compliance)
- Paleta día/noche modulada por `gameState.timeOfDay` (mismo lenguaje, fondo más oscuro de noche `#0a1428` → más claro de día `#1a2a45`)

### P-ε — Interacción (2h)

- Click sobre stand → reusa modal stand existente
- Click sobre avión → modal avión existente
- Click sobre hangar → modal hangar
- Click sobre **plot ghost** (zonas vacías marcadas dashed donde se compran Stage 3 / Stage 4) → reusa modal compra/build hangar de F5A
- Hover: highlight sutil con `#a8dafc` outline

### P-ζ — Tests + cierre (3h)

- Suite tests existente 803/803 sigue verde
- Nuevos tests PixiMap ~30 (sync determinístico, mock canvas, interacción)
- Performance: 60fps sostenidos verificados en runtime (Pixi v8 dev tools)
- Save v7 backward compat (añadir schema v8 con map state nuevo)
- Doc `docs/CIERRE_fase5d.md`: bloques completados, screenshots before/after vs `F5D_mapa_referencia_visual.svg`, contador tests, atribución verificada
- Actualizar `STATUS.md` y `CLAUDE.md` con cierre F5D y próximo paso (Fase 6 Pre-Steam)
- Build final: `builds/v0.5d-pixi-map.html`

## Paleta exacta (hex hardcoded, NO theme classes — escena física que no debe invertir)

| Elemento | Color |
|---|---|
| Fondo | `#0a1428` |
| Grid sutil opcional | `#142543` @ opacity 0.55 |
| Field outlines lejanos | `#1c2d4a` @ opacity 0.3 |
| Runway base | `#3aa9ff` stroke 8-9 @ opacity 0.45 |
| Runway highlight central | `#a8dafc` stroke 2 sólido |
| Centerline dashes | `#0a1428` (sobre el highlight) |
| Threshold marks | `#a8dafc` segmentos cortos |
| Taxiways | `#3aa9ff` stroke 1 dashed `3 5` @ opacity 0.55 |
| Terminal / hangares fill | `#13243f` |
| Terminal / hangares stroke | `#2c4870` 0.5px |
| Apron fill | `#0d1c33` |
| Apron stroke | `#1c2d4a` 0.5px |
| Stands inactivos | fill `#0d1c33` stroke `#2c4870` |
| Stands activos | fill `#2a1a08` stroke `#f5b945` 0.6px + halo `#f5b945` @ opacity 0.2 |
| Aviones core | `#a8dafc` r=3.5 |
| Aviones halo | `#3aa9ff` @ opacity 0.22 r=10 |
| Aviones trail | `#3aa9ff` stroke 1.5 → 1 @ opacity 0.5 → 0.22 |
| Roads / access | `#2c4870` @ opacity 0.65 |
| Labels primary | `#a8dafc` |
| Labels secondary | `#5da0e0` |
| Labels dim | `#3d6f9d` |
| Alert / ámbar | `#f5b945` |

## Game overlay encima del OSM

- **Stand codes** leídos de `data/stands.json` (no del OSM). Esquema OVD: `11`, `12`, `13`, `14`, `15`. Si en etapas posteriores hay más stands disponibles, escalado a `351/451/551` etc según F5A.
- **Plots ghost dashed** para hangares Stage 3 (500k €) y Stage 4 (1.5M €) en zonas vacías reales del apron + footprints config. Click → modal compra existente.
- **Oficina mecánicos**: en edificio OSM existente si lo hay, sino footprint añadido en `data/airport_overlay.json`.
- **Furgo**: recorre vértices del road network OSM. Path A* o Dijkstra sobre grafo de roads/taxiway-service.
- **Día/noche state** F5A modula la paleta global del map.

## NO HACER (líneas rojas)

- NO usar **tiles del servidor osm.org** — TOS prohíbe uso comercial. Solo datos.
- NO inventar geometría — usar OSM real siempre. Si OSM no marca algo, está marcado como overlay en `airport_overlay.json`, no se pone "a ojo".
- NO cambiar la paleta sin enseñarme el cambio antes.
- NO romper save v7 backward compat. Bump a v8 con migración.
- NO meter el sistema multi-aeropuerto (Opción C, parqueada post-Steam, +3 semanas scope creep).
- NO empezar Tauri (sigue bloqueado por toolchain Windows, irrelevante para F5D, se ataca en F6 o cuando se instale MSVC toolchain).
- NO añadir polish que no esté en los bloques P. Anti-dispersión. Ideas brillantes al Parking de `STATUS.md`.

## Criterios de cierre F5D

1. Visual: screenshot del mapa runtime side-by-side vs `docs/F5D_mapa_referencia_visual.svg` — debe sentirse el MISMO juego (no clon pixel-perfect pero sí mismo lenguaje, misma energía).
2. Tests: 803/803 existentes verdes + ~30 nuevos PixiMap verdes.
3. Performance: 60fps sostenidos en runtime sobre el bundle.
4. Save backward compat: save v7 sigue cargando, schema map v8 funciona.
5. ODbL: atribución OSM visible en mapa + en créditos del juego.
6. Doc `CIERRE_fase5d.md` escrita con todo lo anterior + commits atómicos en branch `f5d-map-pixi-osm`.

## Cómo trabajamos

- Castellano coloquial, tono colega.
- "Por qué" corto antes del "cómo" en cada paso.
- Máximo 2-3 opciones cuando haya decisión. Recomienda una.
- MVP-first: que cada bloque P sea funcional aunque feo antes de pulir.
- Time-box agresivo: si un bloque se sale, recortar alcance, no fecha.
- Anti-dispersión: ideas brillantes nuevas → Parking de `STATUS.md`, no a este branch.
- No preguntar lo obvio: si el plan está acordado, ejecutar y reportar.

**Empieza por P-α. Reporta al final de cada bloque.**
